// Small HTTP helpers: JSON envelope {ok, data, error}, structured logging, error type.
export class HttpError extends Error {
  constructor(status, message, extra) { super(message); this.status = status; this.extra = extra; }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};

export function json(data, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify({ ok: true, data, error: null }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...headers } });
}

export function fail(status, message, headers = {}) {
  return new Response(JSON.stringify({ ok: false, data: null, error: { message } }), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...headers } });
}

export function log(level, fields) {
  console.log(JSON.stringify({ level, ...fields }));
}

/** Parse a JSON body with a size cap; throws 400/413/415 as appropriate. */
export async function readJSON(request, maxBytes = 200_000) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'Send JSON (Content-Type: application/json).');
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'That request is too large.');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'The request was not valid JSON.'); }
}
