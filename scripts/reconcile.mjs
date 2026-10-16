// Reconcile a registration export (date, address, house name only are read) against the published roster.
//   node scripts/reconcile.mjs --csv <path>            print counts and write the private report (private/, gitignored)
//   node scripts/reconcile.mjs --csv <path> --write    also write the public-safe decisions file and the sanitized fixture
// Contact columns (name, email, phone) are never read into any output.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, toRegistrations } from '../shared/csv.mjs';
import { reconcile } from '../shared/reconcile.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const csvPath = arg('--csv') || process.env.RB_CSV;
if (!csvPath) throw new Error('Usage: node scripts/reconcile.mjs --csv <path> [--write]');

const roster = JSON.parse(await readFile(path.join(root, 'data/reconcile/roster-2026-10-09.json'), 'utf8')).houses;
const decisionsFile = path.join(root, 'data/reconcile/2026-10-16.decisions.json');
const decisions = JSON.parse(await readFile(decisionsFile, 'utf8'));
const { registrations, ignoredColumns } = toRegistrations(parseCsv(await readFile(csvPath, 'utf8')));
const result = reconcile(registrations, roster);
console.log(JSON.stringify({ ...result.summary, ignoredColumns: ignoredColumns.length }));

const lines = ['# Reconciliation report (private, not committed)', '', JSON.stringify(result.summary), ''];
for (const m of result.matched) lines.push(`- #${m.mapNumber} ${m.address}: ${m.class}${m.flags.length ? ` [${m.flags.join(', ')}]` : ''}`);
for (const a of result.added) lines.push(`- NEW #${a.mapNumber} ${a.address}: ${a.class}${a.flags.length ? ` [${a.flags.join(', ')}]` : ''}`);
await mkdir(path.join(root, 'private'), { recursive: true });
await writeFile(path.join(root, 'private/reconcile-2026-10-16.md'), lines.join('\n') + '\n');

if (process.argv.includes('--write')) {
  const icons = decisions.iconByStop || {};
  decisions.approvedNew = result.added.map(a => ({
    id: a.houseId, mapNumber: a.mapNumber, name: decisions.nameOverrides?.[a.houseId] ?? a.submittedName.trim(), address: a.address, submittedOn: a.submittedOn,
    icon: icons[a.houseId] || 'haunted-generic', flags: a.flags.filter(f => !(decisions.resolvedFlags?.[a.houseId] || []).includes(f))
  }));
  await writeFile(decisionsFile, JSON.stringify(decisions, null, 2) + '\n');
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  const sanitized = ['"Submission Date","Address","Give Your House a Halloween Name"', ...registrations.map(r => [r.submittedOn, r.address, r.houseName].map(q).join(','))];
  await mkdir(path.join(root, 'tests/fixtures'), { recursive: true });
  await writeFile(path.join(root, 'tests/fixtures/registrations-2026-10-16.sanitized.csv'), sanitized.join('\n') + '\n');
  console.log(`decisions: ${decisions.approvedNew.length} approved new houses; sanitized fixture written (${registrations.length} rows).`);
}
