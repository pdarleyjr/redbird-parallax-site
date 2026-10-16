// House icons: the catalogue (built-in set plus uploads), upload validation, archiving and file serving for the admin page.
// Uploaded pictures are stored in R2 under versioned keys (`up-<name>-<hash>`), so a key's picture never changes.
import { HttpError, json } from '../lib/http.js';
import { auditStatement, nowISO } from '../lib/db.js';
import { checkDimensions, checkPixels, ICON_MESSAGES, ICON_RULES } from '../../../shared/icon-check.mjs';
import { decodePng, pngInfo, sniff, webpInfo } from '../lib/image.js';

const KEY = /^[a-z0-9-]{1,60}$/;
const bad = code => new HttpError(422, ICON_MESSAGES[code]);

export async function listIcons(ctx) {
  const rows = await ctx.db.prepare('SELECT i.key, i.label, i.source, i.status, i.created_at, i.created_by, (SELECT COUNT(*) FROM houses h WHERE h.icon = i.key) AS uses FROM icons i ORDER BY i.source DESC, i.label').all();
  return json({ icons: rows.results.map(r => ({ key: r.key, label: r.label, source: r.source, status: r.status, createdAt: r.created_at, createdBy: r.created_by, uses: r.uses })) });
}

/** Keys a house may use right now (active icons). */
export async function activeIconKeys(db) {
  const rows = await db.prepare("SELECT key FROM icons WHERE status = 'active'").all();
  return new Set(rows.results.map(r => r.key));
}

const slug = label => label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28) || 'icon';
async function hash8(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest.subarray(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function file(form, name, max) {
  const value = form.get(name);
  if (!value || typeof value === 'string' || typeof value.arrayBuffer !== 'function') throw new HttpError(400, `The ${name} file is missing.`);
  if (value.size > max) throw new HttpError(413, ICON_MESSAGES.size);
  return new Uint8Array(await value.arrayBuffer());
}

/** The original upload: type, size, squareness, real transparency and (for PNG) the pixel rules. WebP pixels are checked in the browser. */
async function validateOriginal(bytes) {
  const kind = sniff(bytes);
  if (!kind) throw bad('type');
  const info = kind === 'png' ? pngInfo(bytes) : webpInfo(bytes);
  if (!info) throw bad('type');
  const dimension = checkDimensions(info.width, info.height);
  if (dimension) throw bad(dimension);
  if (!info.alpha) throw bad('noAlpha');
  if (kind === 'png') {
    let image;
    try { image = await decodePng(bytes); } catch { throw new HttpError(422, 'That PNG could not be read. Save it again as a standard (non-interlaced) PNG.'); }
    const problem = checkPixels(image);
    if (problem) throw new HttpError(422, problem.message);
  }
  return kind;
}

function validateOutput(bytes, side) {
  const info = sniff(bytes) === 'webp' ? webpInfo(bytes) : null;
  if (!info || info.width !== side || info.height !== side || !info.alpha) throw new HttpError(422, `The processed ${side} px icon is not a transparent ${side} × ${side} WebP.`);
}

export async function uploadIcon(ctx) {
  if (!ctx.env.ICONS) throw new HttpError(503, 'Icon storage is not set up yet.');
  const contentType = ctx.request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) throw new HttpError(415, 'Send the icon as a form upload.');
  if (Number(ctx.request.headers.get('Content-Length')) > ICON_RULES.maxBytes + 700_000) throw new HttpError(413, ICON_MESSAGES.size);
  const form = await ctx.request.formData();
  const label = String(form.get('label') || '').replace(/\s+/g, ' ').trim();
  if (label.length < 1 || label.length > 40) throw new HttpError(422, 'Give the icon a name of 1 to 40 characters.');
  const original = await file(form, 'original', ICON_RULES.maxBytes);
  const big = await file(form, 'icon256', 400_000), small = await file(form, 'icon128', 150_000);
  const kind = await validateOriginal(original);
  validateOutput(big, 256); validateOutput(small, 128);

  const key = `up-${slug(label)}-${await hash8(big)}`;
  if (!KEY.test(key)) throw new HttpError(422, 'That name cannot be used. Try a simpler one.');
  if (await ctx.db.prepare('SELECT 1 FROM icons WHERE key = ?').bind(key).first()) throw new HttpError(409, 'That exact picture was already uploaded.');

  const meta = { httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } };
  await ctx.env.ICONS.put(`icons/${key}.webp`, big, meta);
  await ctx.env.ICONS.put(`icons/128/${key}.webp`, small, meta);
  await ctx.env.ICONS.put(`originals/${key}.${kind}`, original, { httpMetadata: { contentType: kind === 'png' ? 'image/png' : 'image/webp' }, customMetadata: { uploadedBy: ctx.actor } });
  const now = nowISO();
  try {
    await ctx.db.batch([
      ctx.db.prepare("INSERT INTO icons (key, label, source, status, created_at, created_by) VALUES (?, ?, 'upload', 'active', ?, ?)").bind(key, label, now, ctx.actor),
      auditStatement(ctx.db, { actor: ctx.actor, meta: ctx.meta, action: 'icon.upload', entity: 'icon', entityId: key, after: { label, bytes: original.length, kind } })
    ]);
  } catch (error) {
    await Promise.all([`icons/${key}.webp`, `icons/128/${key}.webp`, `originals/${key}.${kind}`].map(k => ctx.env.ICONS.delete(k)));
    throw error;
  }
  return json({ key, label, source: 'upload', status: 'active', createdAt: now, createdBy: ctx.actor, uses: 0 }, { status: 201 });
}

export async function setIconStatus(ctx, key, action) {
  const icon = await ctx.db.prepare('SELECT * FROM icons WHERE key = ?').bind(key).first();
  if (!icon) throw new HttpError(404, 'That icon was not found.');
  const next = action === 'archive' ? 'archived' : 'active';
  if (icon.status === next) return json({ key, status: next });
  if (action === 'archive') {
    const { n } = await ctx.db.prepare('SELECT COUNT(*) AS n FROM houses WHERE icon = ?').bind(key).first();
    if (n) throw new HttpError(409, `${n === 1 ? 'A house uses' : `${n} houses use`} this icon. Choose a different icon for ${n === 1 ? 'it' : 'them'} first.`);
  }
  await ctx.db.batch([
    ctx.db.prepare('UPDATE icons SET status = ? WHERE key = ?').bind(next, key),
    auditStatement(ctx.db, { actor: ctx.actor, meta: ctx.meta, action: `icon.${action}`, entity: 'icon', entityId: key, before: { status: icon.status }, after: { status: next } })
  ]);
  return json({ key, status: next });
}

/** Admin preview of an uploaded picture (the admin page's CSP allows only its own origin). */
export async function iconFile(ctx, size, key) {
  if (!ctx.env.ICONS) throw new HttpError(404, 'Not found.');
  const object = await ctx.env.ICONS.get(size === '128' ? `icons/128/${key}.webp` : `icons/${key}.webp`);
  if (!object) throw new HttpError(404, 'That icon was not found.');
  return new Response(object.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
}
