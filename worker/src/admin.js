// redbird-admin: serves the admin UI (static assets) and the /api/* routes. Every /api/* request is verified.
import { HttpError, fail, json, log, readJSON } from './lib/http.js';
import { requireAdmin, requireSameOrigin, login, clearedCookie } from './lib/auth.js';
import * as houses from './handlers/houses.js';
import * as imports from './handlers/imports.js';
import * as snapshots from './handlers/snapshots.js';
import * as events from './handlers/events.js';
import { geocode } from './handlers/geocode.js';

const ROUTES = [
  ['GET', /^\/api\/me$/, ctx => json({ role: ctx.actor })],
  ['GET', /^\/api\/houses$/, ctx => houses.listHouses(ctx)],
  ['POST', /^\/api\/houses$/, ctx => houses.createHouse(ctx)],
  ['POST', /^\/api\/houses\/renumber$/, ctx => houses.renumber(ctx)],
  ['GET', /^\/api\/houses\/([\w-]+)$/, (ctx, m) => houses.getHouse(ctx, m[1])],
  ['PATCH', /^\/api\/houses\/([\w-]+)$/, (ctx, m) => houses.patchHouse(ctx, m[1])],
  ['POST', /^\/api\/houses\/([\w-]+)\/(publish|unpublish|archive|restore)$/, (ctx, m) => houses.transition(ctx, m[1], m[2])],
  ['POST', /^\/api\/geocode$/, ctx => geocode(ctx)],
  ['GET', /^\/api\/imports$/, ctx => imports.listBatches(ctx)],
  ['POST', /^\/api\/imports\/preview$/, ctx => imports.preview(ctx)],
  ['POST', /^\/api\/imports\/([\w-]+)\/apply$/, (ctx, m) => imports.apply(ctx, m[1])],
  ['POST', /^\/api\/imports\/([\w-]+)\/rollback$/, (ctx, m) => imports.rollback(ctx, m[1])],
  ['GET', /^\/api\/snapshots$/, ctx => snapshots.list(ctx)],
  ['POST', /^\/api\/snapshots\/([\w-]+)\/(\d+)\/restore$/, (ctx, m) => snapshots.restore(ctx, m[1], m[2])],
  ['GET', /^\/api\/events$/, ctx => events.listEvents(ctx)],
  ['GET', /^\/api\/events\/([\w-]+)$/, (ctx, m) => events.getEvent(ctx, m[1])],
  ['PATCH', /^\/api\/events\/([\w-]+)$/, (ctx, m) => events.patchEvent(ctx, m[1])],
  ['GET', /^\/api\/audit$/, ctx => events.audit(ctx)],
  ['GET', /^\/api\/export\.csv$/, ctx => events.exportCSV(ctx)]
];

export async function handleApi(request, env) {
  const url = new URL(request.url);
  let actor = 'anonymous';
  try {
    requireSameOrigin(request);
    if (url.pathname === '/api/login' && request.method === 'POST') {
      const cookie = await login(request, env, await readJSON(request, 2_000));
      return json({ signedIn: true }, { headers: { 'Set-Cookie': cookie, 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/api/logout' && request.method === 'POST') return json({ signedIn: false }, { headers: { 'Set-Cookie': clearedCookie(), 'Cache-Control': 'no-store' } });
    const auth = await requireAdmin(request, env);
    actor = auth.actor;
    const ctx = { request, env, db: env.DB, url, actor, meta: auth.meta };
    for (const [method, pattern, handler] of ROUTES) {
      const m = url.pathname.match(pattern);
      if (m && request.method === method) return await handler(ctx, m);
    }
    if (ROUTES.some(([, pattern]) => pattern.test(url.pathname))) throw new HttpError(405, 'That method is not allowed here.');
    throw new HttpError(404, 'Not found.');
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    log('error', { route: url.pathname, actor, err: String(error?.message || error) });
    return fail(500, 'Something went wrong on our side. Please try again.');
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env);
    if (!env.ASSETS) return fail(404, 'Not found.');
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    return new Response(response.body, { status: response.status, headers });
  }
};
