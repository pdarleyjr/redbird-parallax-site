import { env } from 'cloudflare:workers';
import { SignJWT, importJWK } from 'jose';
import init from '../migrations/0001_init.sql?raw';
import seed from '../migrations/0002_seed_2026.sql?raw';
import audit from '../migrations/0003_password_login.sql?raw';
import dropLogin from '../migrations/0004_drop_login_attempts.sql?raw';
import iconsSql from '../migrations/0005_icons.sql?raw';
import { handleApi } from '../src/admin.js';
import { handlePublic } from '../src/public.js';

const statements = sql => sql.replace(/^--.*$/gm, '').split(/;\s*\n/).map(s => s.trim()).filter(Boolean);

export async function resetDatabase() {
  const drop = ['icons', 'login_attempts', 'import_rows', 'import_batches', 'house_flags', 'houses', 'snapshots', 'audit_log', 'events'];
  for (const t of drop) await env.DB.prepare(`DROP TABLE IF EXISTS ${t}`).run();
  await env.DB.batch([...statements(init), ...statements(seed), ...statements(audit), ...statements(dropLogin), ...statements(iconsSql)].map(s => env.DB.prepare(s)));
}

/** A locally signed Cloudflare Access token. Override claims or the signing key to build bad tokens. */
export async function token(overrides = {}, { aud = 'test-audience', iss = 'https://team.example.invalid', email = 'admin@example.invalid', key } = {}) {
  const jwk = JSON.parse(env.TEST_PRIVATE_JWK);
  return new SignJWT({ email, ...overrides }).setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
    .setIssuer(iss).setAudience(aud).setIssuedAt().setExpirationTime('10m').sign(key || await importJWK(jwk, 'ES256'));
}

export async function call(path, { method = 'GET', body, headers = {}, auth = true, origin = true, ip = '203.0.113.9' } = {}) {
  const h = { 'CF-Connecting-IP': ip, 'User-Agent': 'vitest-agent', ...headers };
  if (auth) h['Cf-Access-Jwt-Assertion'] = typeof auth === 'string' ? auth : await token();
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (origin && method !== 'GET') h.Origin = 'https://admin.test';
  const res = await handleApi(new Request(`https://admin.test${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }), env);
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* csv */ }
  return { status: res.status, body: parsed, text, headers: res.headers };
}

export const api = call;
export const startSession = async () => {};
export const publicGet = (path, headers = {}, method = 'GET') => handlePublic(new Request(`https://public.test${path}`, { method, headers }), env);
export { env };
