// Password login with a signed session cookie. Fail closed: missing secrets, bad cookies and rate limits all deny.
// The password lives only in the ADMIN_PASSWORD Worker secret; the cookie is HMAC-signed with SESSION_SECRET.
import { HttpError } from './http.js';

const enc = new TextEncoder();
export const COOKIE = 'rb_admin';
export const SESSION_SECONDS = 12 * 60 * 60;
export const LIMITS = { perIpFailures: 5, perIpWindowMs: 15 * 60_000, globalFailures: 20, globalWindowMs: 60 * 60_000 };

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

export async function sha256(text) { return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text))); }

/** Constant-time comparison of two equal-length byte arrays. */
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function passwordMatches(candidate, expected) {
  const [x, y] = await Promise.all([sha256(String(candidate ?? '')), sha256(String(expected))]);
  return timingSafeEqual(x, y);
}

const hmacKey = (secret, usage) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);

export async function signSession(secret, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

/** Returns the payload for a valid, unexpired cookie value; otherwise null. */
export async function readSession(secret, value, now = Date.now()) {
  if (typeof value !== 'string' || value.length > 400) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), unb64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(unb64url(body)));
    if (!Number.isFinite(payload.exp) || !Number.isFinite(payload.iat) || payload.exp * 1000 <= now || payload.iat * 1000 > now + 60_000) return null;
    return payload;
  } catch { return null; }
}

export const sessionCookie = (value, maxAge = SESSION_SECONDS) => `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
export const clearedCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

function cookieValue(request, name) {
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export const configured = env => Boolean(env.ADMIN_PASSWORD && env.SESSION_SECRET && String(env.SESSION_SECRET).length >= 32);

/** Who is calling: a short, non-reversible IP hash and a truncated user agent (for the audit log). */
export async function callerMeta(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const hash = await sha256(`${env.SESSION_SECRET || ''}|${ip}`);
  return { ipHash: [...hash.slice(0, 6)].map(b => b.toString(16).padStart(2, '0')).join(''), ua: (request.headers.get('User-Agent') || '').slice(0, 80) };
}

/** Throws 401/503 unless the request carries a valid session cookie. */
export async function requireAdmin(request, env) {
  if (!configured(env)) throw new HttpError(503, 'The admin is not set up yet.');
  const session = await readSession(env.SESSION_SECRET, cookieValue(request, COOKIE));
  if (!session) throw new HttpError(401, 'Please sign in.');
  return { actor: 'admin', meta: await callerMeta(request, env) };
}

/** Mutating requests must come from our own origin. */
export function requireSameOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'Requests must come from the admin page.');
}

async function countFailures(db, since, ipHash) {
  const sql = `SELECT COUNT(*) AS n FROM login_attempts WHERE ok = 0 AND at >= ?${ipHash ? ' AND ip_hash = ?' : ''}`;
  const stmt = db.prepare(sql).bind(...(ipHash ? [since, ipHash] : [since]));
  return (await stmt.first()).n;
}

/** POST /api/login. Rate limited per IP and globally; the error message never says which part was wrong. */
export async function login(request, env, body) {
  if (!configured(env)) throw new HttpError(503, 'The admin is not set up yet.');
  const now = Date.now();
  const { ipHash } = await callerMeta(request, env);
  const [perIp, global] = await Promise.all([
    countFailures(env.DB, now - LIMITS.perIpWindowMs, ipHash), countFailures(env.DB, now - LIMITS.globalWindowMs, null)
  ]);
  if (perIp >= LIMITS.perIpFailures || global >= LIMITS.globalFailures) throw new HttpError(429, 'Too many sign-in attempts. Please wait a while and try again.');
  const ok = await passwordMatches(body?.password, env.ADMIN_PASSWORD);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO login_attempts (at, ip_hash, ok) VALUES (?, ?, ?)').bind(now, ipHash, ok ? 1 : 0),
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(now - 24 * 3600_000)
  ]);
  if (!ok) throw new HttpError(401, 'That password did not work.');
  const iat = Math.floor(now / 1000);
  return sessionCookie(await signSession(env.SESSION_SECRET, { iat, exp: iat + SESSION_SECONDS }));
}
