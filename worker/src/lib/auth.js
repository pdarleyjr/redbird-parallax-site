// Cloudflare Access verification. Fail closed: any missing config or invalid token is a 401/403.
import { createRemoteJWKSet, createLocalJWKSet, jwtVerify } from 'jose';
import { HttpError } from './http.js';

const remoteSets = new Map();

function keySet(env) {
  // Tests supply ACCESS_JWKS_JSON (a locally signed JWKS). Production never sets it.
  if (env.ACCESS_JWKS_JSON) return createLocalJWKSet(JSON.parse(env.ACCESS_JWKS_JSON));
  const url = `https://${env.ACCESS_TEAM}/cdn-cgi/access/certs`;
  if (!remoteSets.has(url)) remoteSets.set(url, createRemoteJWKSet(new URL(url)));
  return remoteSets.get(url);
}

export function allowedEmails(env) {
  return String(env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/** Returns the verified admin's email, or throws HttpError(401|403|503). */
export async function requireAdmin(request, env) {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD || allowedEmails(env).length === 0) throw new HttpError(503, 'Admin access is not configured yet.');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(401, 'Sign in through Cloudflare Access to use the admin.');
  let payload;
  try {
    ({ payload } = await jwtVerify(token, keySet(env), { issuer: `https://${env.ACCESS_TEAM}`, audience: env.ACCESS_AUD }));
  } catch {
    throw new HttpError(401, 'Your sign-in could not be verified. Please sign in again.');
  }
  const email = String(payload.email || '').toLowerCase();
  if (!email || !allowedEmails(env).includes(email)) throw new HttpError(403, 'This account is not allowed to use the admin.');
  return email;
}

/** Mutating requests must come from our own origin and be JSON. */
export function requireSameOrigin(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) throw new HttpError(403, 'Requests must come from the admin page.');
}
