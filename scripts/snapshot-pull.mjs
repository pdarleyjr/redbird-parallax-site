// Refresh the bundled offline snapshot from the live public API (used by .github/workflows/snapshot.yml).
// Validates strictly; refuses to move backwards. Usage: node scripts/snapshot-pull.mjs [apiBase]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSnapshot } from '../shared/snapshot-schema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(await readFile(path.join(root, 'data/site.json'), 'utf8'));
const base = (process.argv[2] || site.api?.publicBase || '').replace(/\/$/, '');
if (!base) throw new Error('No public API base configured (data/site.json api.publicBase).');
const file = path.join(root, 'data/halloween-2026.public.json');
const current = JSON.parse(await readFile(file, 'utf8'));

const res = await fetch(`${base}/v1/events/${current.eventId}/public`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
const body = await res.json();
const live = body?.ok ? body.data : null;
const errors = validateSnapshot(live);
if (errors.length) throw new Error(`Live snapshot is invalid: ${errors.slice(0, 3).join('; ')}`);
if (live.version < current.version) throw new Error(`Live version ${live.version} is older than the bundled version ${current.version}.`);
if (live.version === current.version) { console.log(`Already current at version ${live.version}.`); process.exit(0); }
await writeFile(file, JSON.stringify(live, null, 2) + '\n');
console.log(`Bundled snapshot updated: version ${current.version} -> ${live.version} (${live.houses.length} houses).`);
