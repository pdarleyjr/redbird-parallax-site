import { env } from 'cloudflare:workers';
import init from '../migrations/0001_init.sql?raw';
import seed from '../migrations/0002_seed_2026.sql?raw';
import auth from '../migrations/0003_password_login.sql?raw';
import { handleApi } from '../src/admin.js';
import { handlePublic } from '../src/public.js';
import { signSession, SESSION_SECONDS } from '../src/lib/auth.js';

const statements = sql => sql.replace(/^--.*$/gm, '').split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

export async function resetDatabase() {
  const drop = ['login_attempts', 'import_rows', 'import_batches', 'house_flags', 'houses', 'snapshots', 'audit_log', 'events'];
  for (const t of drop) await env.DB.prepare(`DROP TABLE IF EXISTS ${t}`).run();
  await env.DB.batch([...statements(init), ...statements(seed), ...statements(auth)].map(s => env.DB.prepare(s)));
}

let ipCounter = 0;
export const freshIp = () => `203.0.113.${(++ipCounter % 250) + 1}`;

export async function call(path, { method = 'GET', body, headers = {}, cookie, origin = true, ip = '203.0.113.9' } = {}) {
  const h = { 'CF-Connecting-IP': ip, 'User-Agent': 'vitest-agent', ...headers };
  if (cookie) h.Cookie = cookie;
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (origin && method !== 'GET') h.Origin = 'https://admin.test';
  const res = await handleApi(new Request(`https://admin.test${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env);
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* csv */ }
  return { status: res.status, body: parsed, text, headers: res.headers };
}

export async function signIn(password = env.ADMIN_PASSWORD, opts = {}) {
  const res = await call('/api/login', { method: 'POST', body: { password }, ...opts });
  const set = res.headers.get('Set-Cookie');
  return { res, cookie: set ? set.split(';')[0] : null, set };
}

let sessionCookie = null;
export async function startSession() { sessionCookie = (await signIn()).cookie; return sessionCookie; }
/** Authenticated API call using the session started in beforeEach. */
export async function api(path, opts = {}) { return call(path, { cookie: opts.auth === false ? undefined : (typeof opts.auth === 'string' ? opts.auth : sessionCookie), ...opts }); }

export async function forgedCookie(payload, secret = env.SESSION_SECRET) { return `rb_admin=${await signSession(secret, payload)}`; }
export const nowSec = () => Math.floor(Date.now() / 1000);
export { SESSION_SECONDS };

export const publicGet = (path, headers = {}, method = 'GET') => handlePublic(new Request(`https://public.test${path}`, { method, headers }), env);
export { env };
