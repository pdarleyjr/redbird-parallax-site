import { beforeEach, describe, expect, it } from 'vitest';
import { api, env, publicGet, resetDatabase, token } from './helpers.js';
import { handleApi } from '../src/admin.js';

beforeEach(resetDatabase);

// ---- tiny image builders -------------------------------------------------------------------------------------------
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const be32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const ascii = s => [...s].map(c => c.charCodeAt(0));
const chunk = (type, data) => { const body = new Uint8Array([...ascii(type), ...data]); return new Uint8Array([...be32(data.length), ...body, ...be32(crc32(body))]); };
async function deflate(bytes) { return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()); }

/** A PNG made from a pixel function (x, y) => [r, g, b, a]. colorType 6 = RGBA, 2 = RGB without alpha. */
async function png(width, height, pixel, colorType = 6) {
  const channels = colorType === 6 ? 4 : 3, stride = width * channels + 1;
  const raw = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const p = pixel(x, y); for (let c = 0; c < channels; c++) raw[y * stride + 1 + x * channels + c] = p[c]; }
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', [...be32(width), ...be32(height), 8, colorType, 0, 0, 0]), chunk('IDAT', await deflate(raw)), chunk('IEND', [])];
  return new Blob(parts, { type: 'image/png' });
}
/** Header-only WebP (what the Worker reads): VP8X with the alpha flag. */
const webp = (side, alpha = true) => new Blob([new Uint8Array([...ascii('RIFF'), ...[22, 0, 0, 0], ...ascii('WEBP'), ...ascii('VP8X'), 10, 0, 0, 0, alpha ? 0x10 : 0, 0, 0, 0, (side - 1) & 255, ((side - 1) >> 8) & 255, 0, (side - 1) & 255, ((side - 1) >> 8) & 255, 0])], { type: 'image/webp' });

const disc = (size, radiusShare, rgb = [250, 160, 60]) => (x, y) => {
  const d = Math.hypot(x - size / 2, y - size / 2);
  return d <= size * radiusShare ? [...rgb, 255] : [255, 255, 255, 0];
};

async function upload({ original, label = 'Test Pumpkin', icon256 = webp(256), icon128 = webp(128) } = {}) {
  const form = new FormData();
  form.set('label', label);
  form.set('original', original, 'icon.png'); form.set('icon256', icon256, 'a.webp'); form.set('icon128', icon128, 'b.webp');
  const res = await handleApi(new Request('https://admin.test/api/icons', { method: 'POST', headers: { 'Cf-Access-Jwt-Assertion': await token(), Origin: 'https://admin.test', 'CF-Connecting-IP': '203.0.113.9' }, body: form }), env);
  return { status: res.status, body: await res.json() };
}

describe('icon catalogue', () => {
  it('lists the built-in icons from the seed', async () => {
    const res = await api('/api/icons');
    expect(res.status).toBe(200);
    expect(res.body.data.icons.length).toBeGreaterThanOrEqual(39);
    expect(res.body.data.icons.every(i => i.source === 'builtin' && i.status === 'active')).toBe(true);
  });
});

describe('icon upload', () => {
  it('accepts a good transparent square PNG, stores it, lists it, audits it and serves it publicly with long cache headers', async () => {
    const res = await upload({ original: await png(1024, 1024, disc(1024, 0.42)) });
    expect(res.status).toBe(201);
    const { key } = res.body.data;
    expect(key).toMatch(/^up-test-pumpkin-[0-9a-f]{8}$/);
    expect((await api('/api/icons')).body.data.icons.find(i => i.key === key)).toMatchObject({ source: 'upload', status: 'active', uses: 0 });
    expect(await env.ICONS.head(`icons/${key}.webp`)).toBeTruthy();
    expect(await env.ICONS.head(`originals/${key}.png`)).toBeTruthy();
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action = 'icon.upload' AND entity_id = ?").bind(key).first()).n).toBe(1);
    const served = await publicGet(`/v1/icons/${key}.webp`);
    expect(served.status).toBe(200);
    expect(served.headers.get('Content-Type')).toBe('image/webp');
    expect(served.headers.get('Cache-Control')).toContain('immutable');
    expect(served.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect((await publicGet(`/v1/icons/128/${key}.webp`)).status).toBe(200);
    expect((await publicGet('/v1/icons/up-missing-00000000.webp')).status).toBe(404);
  });

  it('rejects a picture with a background (corners are not transparent)', async () => {
    const res = await upload({ original: await png(1024, 1024, (x, y) => (Math.hypot(x - 512, y - 512) <= 430 ? [250, 160, 60, 255] : [255, 255, 255, 255])) });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe('This image has a background. Please upload a PNG with a transparent background.');
  });

  it('rejects a subject that fills less than half of the image', async () => {
    const res = await upload({ original: await png(1024, 1024, disc(1024, 0.3)) });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/too small inside the image/);
  });

  it('rejects an almost entirely dark picture', async () => {
    const res = await upload({ original: await png(1024, 1024, disc(1024, 0.42, [10, 10, 14])) });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/too dark for the map/);
  });

  it('rejects images without an alpha channel, non-square and too-small images, and other file types', async () => {
    expect((await upload({ original: await png(600, 600, () => [200, 100, 50], 2) })).body.error.message).toMatch(/no transparency/);
    expect((await upload({ original: await png(1024, 900, disc(1024, 0.42)) })).body.error.message).toMatch(/square/);
    expect((await upload({ original: await png(256, 256, disc(256, 0.42)) })).body.error.message).toMatch(/512 × 512/);
    expect((await upload({ original: new Blob(['not an image at all, just text']) })).body.error.message).toMatch(/PNG or WebP/);
  });

  it('checks the processed 256 and 128 px files', async () => {
    const original = await png(1024, 1024, disc(1024, 0.42));
    expect((await upload({ original, icon256: webp(200) })).status).toBe(422);
    expect((await upload({ original, icon128: webp(128, false) })).status).toBe(422);
  });

  it('refuses the same picture twice and needs the admin check like every API route', async () => {
    const original = await png(1024, 1024, disc(1024, 0.42));
    expect((await upload({ original })).status).toBe(201);
    expect((await upload({ original })).status).toBe(409);
    expect((await api('/api/icons', { auth: false })).status).toBe(401);
  });
});

describe('using and archiving icons', () => {
  it('lets a house use an uploaded icon, refuses to archive it while used, and refuses archived icons for houses', async () => {
    const { body } = await upload({ original: await png(1024, 1024, disc(1024, 0.42)) });
    const key = body.data.key;
    const house = (await api('/api/houses', { method: 'POST', body: { name: 'Icon House', address: '3700 SW 61st Avenue', icon: key, lat: 25.7365, lng: -80.2925 } })).body.data;
    expect(house.icon).toBe(key);
    const blocked = await api(`/api/icons/${key}/archive`, { method: 'POST', body: {} });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.message).toMatch(/A house uses this icon/);
    await api(`/api/houses/${house.id}`, { method: 'PATCH', body: { icon: 'ghost' }, headers: { 'If-Match': String(house.version) } });
    expect((await api(`/api/icons/${key}/archive`, { method: 'POST', body: {} })).status).toBe(200);
    const again = await api('/api/houses', { method: 'POST', body: { name: 'Another', address: '3701 SW 61st Avenue', icon: key, lat: 25.7365, lng: -80.2925 } });
    expect(again.status).toBe(422);
    expect((await api('/api/houses', { method: 'POST', body: { name: 'Third', address: '3702 SW 61st Avenue', icon: 'up-never-uploaded', lat: 25.7365, lng: -80.2925 } })).status).toBe(422);
    expect((await api(`/api/icons/${key}/restore`, { method: 'POST', body: {} })).status).toBe(200);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action IN ('icon.archive','icon.restore')").first()).n).toBe(2);
  });
});
