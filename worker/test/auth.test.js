import { beforeEach, describe, expect, it } from 'vitest';
import { call, env, forgedCookie, freshIp, nowSec, resetDatabase, signIn, SESSION_SECONDS } from './helpers.js';
import { LIMITS, passwordMatches, readSession, signSession, timingSafeEqual } from '../src/lib/auth.js';

beforeEach(resetDatabase);

const PROTECTED = [['GET', '/api/me'], ['GET', '/api/houses'], ['POST', '/api/houses'], ['PATCH', '/api/houses/stop-01'], ['POST', '/api/houses/stop-01/publish'], ['POST', '/api/houses/renumber'],
  ['POST', '/api/geocode'], ['GET', '/api/imports'], ['POST', '/api/imports/preview'], ['POST', '/api/imports/x/apply'], ['POST', '/api/imports/x/rollback'],
  ['GET', '/api/snapshots'], ['POST', '/api/snapshots/halloween-2026/2/restore'], ['GET', '/api/events'], ['PATCH', '/api/events/halloween-2026'], ['GET', '/api/audit'], ['GET', '/api/export.csv']];

describe('password sign-in', () => {
  it('signs in with the right password and sets a hardened session cookie', async () => {
    const { res, set } = await signIn();
    expect(res.status).toBe(200);
    expect(set).toMatch(/^rb_admin=[\w-]+\.[\w-]+;/);
    for (const attr of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', `Max-Age=${SESSION_SECONDS}`]) expect(set).toContain(attr);
    expect(SESSION_SECONDS).toBe(12 * 3600);
  });
  it('rejects a wrong password with a generic message and no cookie', async () => {
    const { res, set } = await signIn('definitely wrong');
    expect(res.status).toBe(401);
    expect(set).toBeNull();
    expect(res.body.error.message).toBe('That password did not work.');
    expect(JSON.stringify(res.body)).not.toMatch(/correct horse|ADMIN_PASSWORD/);
  });
  it('treats missing, empty and non-string passwords as wrong', async () => {
    for (const body of [{}, { password: '' }, { password: 12345 }, { password: null }, { password: ['x'] }]) {
      const res = await call('/api/login', { method: 'POST', body, ip: freshIp() });
      expect(res.status).toBe(401);
    }
  });
  it('compares in constant time over SHA-256 digests', async () => {
    expect(await passwordMatches('a', 'a')).toBe(true);
    expect(await passwordMatches('a', 'b')).toBe(false);
    expect(await passwordMatches('a'.repeat(1000), 'a')).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
  it('rate limits to 5 failures per 15 minutes per IP, then answers 429 even for the right password', async () => {
    const ip = freshIp();
    for (let i = 0; i < LIMITS.perIpFailures; i++) expect((await call('/api/login', { method: 'POST', body: { password: 'nope' }, ip })).status).toBe(401);
    expect((await call('/api/login', { method: 'POST', body: { password: 'nope' }, ip })).status).toBe(429);
    expect((await call('/api/login', { method: 'POST', body: { password: env.ADMIN_PASSWORD }, ip })).status).toBe(429);
    expect((await signIn(env.ADMIN_PASSWORD, { ip: freshIp() })).res.status).toBe(200); // another address is unaffected
  });
  it('limits failures globally to 20 per hour across addresses', async () => {
    for (let i = 0; i < LIMITS.globalFailures; i++) await call('/api/login', { method: 'POST', body: { password: 'nope' }, ip: freshIp() });
    const res = await call('/api/login', { method: 'POST', body: { password: env.ADMIN_PASSWORD }, ip: freshIp() });
    expect(res.status).toBe(429);
  });
  it('ignores failures older than the window', async () => {
    const ip = freshIp();
    for (let i = 0; i < LIMITS.perIpFailures; i++) await call('/api/login', { method: 'POST', body: { password: 'nope' }, ip });
    await env.DB.prepare('UPDATE login_attempts SET at = at - ?').bind(LIMITS.globalWindowMs + 1000).run();
    expect((await signIn(env.ADMIN_PASSWORD, { ip })).res.status).toBe(200);
  });
  it('stores no password material, only a hashed address and the outcome', async () => {
    await call('/api/login', { method: 'POST', body: { password: 'secret-attempt-123' }, ip: '198.51.100.7' });
    const rows = (await env.DB.prepare('SELECT * FROM login_attempts').all()).results;
    expect(JSON.stringify(rows)).not.toMatch(/secret-attempt|198\.51\.100\.7/);
    expect(Object.keys(rows[0]).sort()).toEqual(['at', 'id', 'ip_hash', 'ok']);
  });
  it('fails closed with 503 when the secrets are not configured', async () => {
    const { handleApi } = await import('../src/admin.js');
    const res = await handleApi(new Request('https://admin.test/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://admin.test' }, body: JSON.stringify({ password: 'x' }) }), { DB: env.DB });
    expect(res.status).toBe(503);
    const me = await handleApi(new Request('https://admin.test/api/me'), { DB: env.DB, SESSION_SECRET: 'short' });
    expect(me.status).toBe(503);
  });
});

describe('session cookie', () => {
  it('rejects every protected route without a cookie', async () => {
    for (const [method, path] of PROTECTED) expect((await call(path, { method, body: method === 'GET' ? undefined : {} })).status, `${method} ${path}`).toBe(401);
  });
  it('accepts a valid cookie and sees the admin role', async () => {
    const { cookie } = await signIn();
    const me = await call('/api/me', { cookie });
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe('admin');
  });
  it('rejects a tampered payload, a tampered signature and a cookie signed with another secret', async () => {
    const { cookie } = await signIn();
    const [name, value] = cookie.split('=');
    const [body, sig] = value.split('.');
    const forgedBody = btoa(JSON.stringify({ iat: nowSec(), exp: nowSec() + 999999 })).replace(/=+$/, '');
    for (const bad of [`${name}=${forgedBody}.${sig}`, `${name}=${body}.${sig.slice(0, -2)}AA`, `${name}=${body}`, `${name}=.`, `${name}=x.y`, await forgedCookie({ iat: nowSec(), exp: nowSec() + 600 }, 'another-secret-another-secret-another-secret!')]) {
      expect((await call('/api/me', { cookie: bad })).status).toBe(401);
    }
  });
  it('rejects an expired cookie and one issued in the future', async () => {
    expect((await call('/api/me', { cookie: await forgedCookie({ iat: nowSec() - 7200, exp: nowSec() - 3600 }) })).status).toBe(401);
    expect((await call('/api/me', { cookie: await forgedCookie({ iat: nowSec() + 3600, exp: nowSec() + 7200 }) })).status).toBe(401);
    expect((await call('/api/me', { cookie: await forgedCookie({ iat: nowSec(), exp: nowSec() + 600 }) })).status).toBe(200);
    expect(await readSession(env.SESSION_SECRET, await signSession(env.SESSION_SECRET, { iat: 1, exp: 2 }))).toBeNull();
  });
  it('rotating SESSION_SECRET signs everyone out', async () => {
    const { cookie } = await signIn();
    const { handleApi } = await import('../src/admin.js');
    const res = await handleApi(new Request('https://admin.test/api/me', { headers: { Cookie: cookie } }), { ...env, SESSION_SECRET: 'rotated-secret-rotated-secret-rotated-secret' });
    expect(res.status).toBe(401);
  });
  it('logout clears the cookie', async () => {
    const { cookie } = await signIn();
    const out = await call('/api/logout', { method: 'POST', cookie, body: {} });
    expect(out.status).toBe(200);
    expect(out.headers.get('Set-Cookie')).toMatch(/rb_admin=;.*Max-Age=0/);
  });
});

describe('CSRF protections', () => {
  it('refuses mutations without an Origin header or from another origin', async () => {
    const { cookie } = await signIn();
    expect((await call('/api/houses', { method: 'POST', cookie, body: {}, origin: false })).status).toBe(403);
    expect((await call('/api/houses', { method: 'POST', cookie, body: {}, origin: false, headers: { Origin: 'https://evil.example.invalid' } })).status).toBe(403);
    expect((await call('/api/login', { method: 'POST', body: { password: env.ADMIN_PASSWORD }, origin: false })).status).toBe(403);
  });
  it('requires a JSON content type for mutations', async () => {
    const { cookie } = await signIn();
    const { handleApi } = await import('../src/admin.js');
    const res = await handleApi(new Request('https://admin.test/api/houses', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://admin.test', 'Content-Type': 'text/plain' }, body: 'x' }), env);
    expect(res.status).toBe(415);
  });
  it('records who and where in the audit log (hashed address, truncated user agent), never the raw address', async () => {
    const { cookie } = await signIn(env.ADMIN_PASSWORD, { ip: '198.51.100.44' });
    await call('/api/houses', { method: 'POST', cookie, ip: '198.51.100.44', body: { name: 'Audit Fixture', address: '3700 SW 61st Avenue', icon: 'ghost' } });
    const row = await env.DB.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').first();
    expect(row.actor).toBe('admin');
    expect(row.ua).toBe('vitest-agent');
    expect(row.ip_hash).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(row)).not.toContain('198.51.100.44');
  });
});
