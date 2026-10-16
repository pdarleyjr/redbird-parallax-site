// Snapshot loading: bundled file first (works offline and before any backend exists), then the live API.
// Whichever valid snapshot has the higher version wins. Invalid data is ignored.
import { pickNewest, validateSnapshot } from '../../shared/snapshot-schema.mjs';

export const siteRoot = new URL('../../', import.meta.url);
const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

async function getJSON(url, ms = 6000) {
  const response = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), ms);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function loadBundled(path) {
  const data = await getJSON(new URL(path, siteRoot));
  const errors = validateSnapshot(data);
  if (errors.length) throw new Error(`Bundled snapshot invalid: ${errors[0]}`);
  return data;
}

export async function loadLive(apiBase, eventId) {
  if (!apiBase) return null;
  try {
    const body = await getJSON(`${apiBase.replace(/\/$/, '')}/v1/events/${encodeURIComponent(eventId)}/public`, 5000);
    const data = body && 'ok' in body ? body.data : body;
    const errors = validateSnapshot(data);
    if (errors.length) { console.error('Live snapshot ignored:', errors[0]); return null; }
    return data;
  } catch (error) {
    console.info('Live data unavailable, showing saved list.', error.message);
    return null;
  }
}

/** Returns { bundled, newest, source } and calls onLive(snapshot) if the live data is newer. */
export async function loadSnapshots({ snapshotPath, apiBase, eventId, onLive }) {
  const bundled = await loadBundled(snapshotPath);
  const livePromise = loadLive(apiBase, eventId).then(live => {
    const newest = pickNewest(bundled, live);
    if (live && newest === live && live.version > bundled.version) onLive?.(live);
    return live;
  });
  return { bundled, livePromise };
}
