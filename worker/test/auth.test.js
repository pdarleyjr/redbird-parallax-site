import { beforeEach, describe, expect, it } from 'vitest';
import { SignJWT, generateKeyPair } from 'jose';
import { call, env, resetDatabase, token } from './helpers.js';

beforeEach(resetDatabase);

const PROTECTED = [['GET', '/api/me'], ['GET', '/api/houses'], ['POST', '/api/houses'], ['PATCH', '/api/houses/stop-01'], ['POST', '/api/houses/stop-01/publish'], ['POST', '/api/houses/renumber'],
  ['POST', '/api/geocode'], ['GET', '/api/imports'], ['POST', '/api/imports/preview'], ['POST', '/api/imports/x/apply'], ['POST', '/api/imports/x/rollback'],
  ['GET', '/api/snapshots'], ['POST', '/api/snapshots/halloween-2026/2/restore'], ['GET', '/api/events'], ['PATCH', '/api/events/halloween-2026'], ['GET', '/api/audit'], ['GET', '/api/export.csv']];

describe('Cloudflare Access verification (fail closed)', () => {
  it('rejects requests without a token on every protected route', async () => {
    for (const [method, path] of PROTECTED) expect((await call(path, { method, body: method === 'GET' ? undefined : {}, auth: false })).status, `${method} ${path}`).toBe(401);
  });
  it('there is no password login or cookie path any more', async () => {
    expect((await call('/api/login', { method: 'POST', body: { password: env.ADMIN_PASSWORD ?? 'x' }, auth: false })).status).toBe(401);
    expect((await call('/api/logout', { method: 'POST', body: {}, auth: false })).status).toBe(401);
    const res = await call('/api/me', { auth: false, headers: { Cookie: 'rb_admin=anything' } });
    expect(res.status).toBe(401);
  });
  it('rejects a wrong audience, wrong issuer, an unknown signing key and an expired token', async () => {
    const other = await generateKeyPair('ES256');
    const expired = await new SignJWT({ email: 'admin@example.invalid' }).setProtectedHeader({ alg: 'ES256', kid: 'test-key' }).setIssuer('https://team.example.invalid').setAudience('test-audience').setExpirationTime('-1m').sign(other.privateKey);
    const bad = [await token({}, { aud: 'someone-else' }), await token({}, { iss: 'https://evil.example.invalid' }), await token({}, { key: other.privateKey }), expired, 'not.a.jwt'];
    for (const t of bad) expect((await call('/api/me', { auth: t })).status).toBe(401);
  });
  it('accepts every allowlisted address and reports the email', async () => {
    for (const email of ['admin@example.invalid', 'second@example.invalid', 'ADMIN@Example.Invalid']) {
      const res = await call('/api/me', { auth: await token({}, { email }) });
      expect(res.status, email).toBe(200);
      expect(res.body.data.email).toBe(email.toLowerCase());
    }
  });
  it('rejects a valid token for an address that is not on the allowlist (403), and tokens without an email', async () => {
    expect((await call('/api/me', { auth: await token({}, { email: 'stranger@example.invalid' }) })).status).toBe(403);
    expect((await call('/api/me', { auth: await token({ email: undefined }, { email: undefined }) })).status).toBe(403);
    expect((await call('/api/me', { auth: await token({}, { email: ['admin', '@example.invalid', '.evil.test'].join('') }) })).status).toBe(403);
  });
  it('fails closed with 503 when Access settings or the allowlist are missing', async () => {
    const { handleApi } = await import('../src/admin.js');
    const t = await token();
    for (const patch of [{ ACCESS_TEAM: '' }, { ACCESS_AUD: '' }, { ADMIN_EMAILS: '' }]) {
      const res = await handleApi(new Request('https://admin.test/api/me', { headers: { 'Cf-Access-Jwt-Assertion': t } }), { ...env, ...patch });
      expect(res.status, JSON.stringify(patch)).toBe(503);
    }
  });
});

describe('CSRF protections and audit', () => {
  it('refuses mutations without an Origin header or from another origin', async () => {
    expect((await call('/api/houses', { method: 'POST', body: {}, origin: false })).status).toBe(403);
    expect((await call('/api/houses', { method: 'POST', body: {}, origin: false, headers: { Origin: 'https://evil.example.invalid' } })).status).toBe(403);
  });
  it('requires a JSON content type for mutations', async () => {
    const { handleApi } = await import('../src/admin.js');
    const res = await handleApi(new Request('https://admin.test/api/houses', { method: 'POST', headers: { 'Cf-Access-Jwt-Assertion': await token(), Origin: 'https://admin.test', 'Content-Type': 'text/plain' }, body: 'x' }), env);
    expect(res.status).toBe(415);
  });
  it('records the signed-in email, a truncated user agent and a hashed address (never the raw address)', async () => {
    await call('/api/houses', { method: 'POST', ip: '198.51.100.44', auth: await token({}, { email: 'second@example.invalid' }), body: { name: 'Audit Fixture', address: '3700 SW 61st Avenue', icon: 'fluent-ghost' } });
    const row = await env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').first();
    expect(row.actor).toBe('second@example.invalid');
    expect(row.ua).toBe('vitest-agent');
    expect(row.ip_hash).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(row)).not.toContain('198.51.100.44');
  });
});
