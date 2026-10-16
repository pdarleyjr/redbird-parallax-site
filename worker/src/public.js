// redbird-public: read-only, no auth, no cookies. Serves the latest snapshot per event.
import { fail, json, log } from './lib/http.js';
import { latestSnapshot } from './lib/db.js';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS', 'Access-Control-Allow-Headers': 'If-None-Match', 'Access-Control-Expose-Headers': 'ETag', 'Vary': 'Origin' };
const CACHE = 'public, max-age=30, stale-while-revalidate=300';

export async function handlePublic(request, env) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Read only.', { ...CORS, Allow: 'GET, HEAD, OPTIONS' });
  try {
    if (url.pathname === '/v1/health') return json({ status: 'ok' }, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
    if (url.pathname === '/v1/events') {
      const rows = await env.DB.prepare("SELECT id, kind, year, slug, title, status, date, start_time, end_time, details_json FROM events WHERE status <> 'draft' ORDER BY year DESC, kind").all();
      const data = rows.results.map(e => {
        const details = JSON.parse(e.details_json || '{}');
        return { id: e.id, kind: e.kind, year: e.year, slug: e.slug, title: e.title, status: e.status, date: e.date, start: e.start_time, end: e.end_time, card: { art: details.art || e.kind, blurb: details.description || null } };
      });
      return json(data, { headers: { ...CORS, 'Cache-Control': CACHE } });
    }
    const m = url.pathname.match(/^\/v1\/events\/([\w-]+)\/public$/);
    if (m) {
      const event = await env.DB.prepare("SELECT status FROM events WHERE id = ? AND status <> 'draft'").bind(m[1]).first();
      const snap = event && await latestSnapshot(env.DB, m[1]);
      if (!snap) return fail(404, 'No published data for that event.', CORS);
      const etag = `"${m[1]}-${snap.version}"`;
      if (request.headers.get('If-None-Match') === etag) return new Response(null, { status: 304, headers: { ...CORS, ETag: etag, 'Cache-Control': CACHE } });
      return new Response(`{"ok":true,"data":${snap.payload_json},"error":null}`, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...CORS, ETag: etag, 'Cache-Control': CACHE } });
    }
    return fail(404, 'Not found.', CORS);
  } catch (error) {
    log('error', { route: url.pathname, err: String(error?.message || error) });
    return fail(500, 'Something went wrong. Please try again.', CORS);
  }
}

export default { fetch: handlePublic };
