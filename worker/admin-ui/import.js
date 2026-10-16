// CSV import. The file is parsed here, in the browser; only date, address and house name are ever sent.
import { parseCsv, toRegistrations } from './shared/csv.mjs';
import { h, api, notify, guarded, confirmDialog } from './lib.js';

const SECTIONS = [
  ['new', 'New houses', 'Added as “needs review” drafts. Nothing goes public until you publish.'],
  ['name_changed', 'Name changes', 'Published names are never overwritten unless you choose the name below.'],
  ['duplicate_conflict', 'Duplicates and conflicts', 'Two submissions for one address disagree. Type the name to use.'],
  ['incomplete_name', 'Incomplete (no house name)', 'Type a name to accept, or reject.'],
  ['cosmetic', 'Unchanged (emoji or case only)', 'Nothing to do.'],
  ['unchanged', 'Unchanged', 'Nothing to do.'],
  ['known_fingerprint', 'Already imported', 'These rows were imported before.'],
  ['unparsed_address', 'Unreadable addresses', 'Fix these in the source file.']
];
const ACTIONABLE = new Set(['new', 'name_changed', 'duplicate_conflict', 'incomplete_name']);

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function groupView(g, decisions) {
  const accept = h('input', { type: 'checkbox', id: `acc-${g.rowIndexes[0]}`, checked: g.class === 'new' && !g.flags.includes('missing_name') });
  const name = h('input', { type: 'text', maxlength: 80, 'aria-label': `Name to use for ${g.address}`, value: g.class === 'new' ? (g.submittedName || '') : '', placeholder: g.class === 'new' ? '' : 'Name to use' });
  decisions.push(() => ({ rows: g.rowIndexes, accepted: ACTIONABLE.has(g.class) && accept.checked, name: name.value.trim() || undefined }));
  return h('div', { class: 'group' },
    h('h3', {}, h('span', {}, g.address, g.mapNumber ? ` (#${g.mapNumber})` : ''), h('span', { class: 'muted' }, g.submittedOn || '')),
    g.publishedName ? h('p', { class: 'muted' }, `Published name: ${g.publishedName}`) : null,
    g.submittedName != null ? h('p', {}, `Submitted name: ${g.submittedName || '(blank)'}`) : null,
    g.flags.length ? h('p', {}, g.flags.map(f => h('span', { class: 'badge review' }, f.replace('_', ' ')))) : null,
    ACTIONABLE.has(g.class) ? h('div', { class: 'decide' }, h('label', {}, accept, ' Accept'), name) : null);
}

export async function renderImport(view) {
  const result = h('div'), history = h('div');
  const file = h('input', { type: 'file', accept: '.csv,text/csv', id: 'csv-file', 'aria-label': 'Registration CSV file' });
  const loadHistory = async () => {
    const batches = await guarded(() => api('/api/imports'));
    if (!batches) return;
    history.replaceChildren(h('h3', {}, 'Import history'), batches.length ? null : h('p', { class: 'muted' }, 'No imports yet.'), batches.map(b => h('div', { class: 'group' },
      h('strong', {}, new Date(b.created_at).toLocaleString()), ` · ${b.status} · ${b.row_count} rows `,
      b.status === 'applied' ? h('button', { type: 'button', onClick: async () => { if (await confirmDialog('Undo import', 'This removes houses created by this import. It is refused if they were edited afterwards.', 'Undo')) { const r = await guarded(() => api(`/api/imports/${b.id}/rollback`, { method: 'POST', body: {} })); if (r) { notify('Import undone.'); loadHistory(); } } } }, 'Undo batch') : null)));
  };
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (!f) return;
    if (f.size > 1_000_000) { notify('That file is too large for a registration list.', { error: true }); return; }
    const text = await f.text();
    let parsed;
    try { parsed = toRegistrations(parseCsv(text)); } catch (error) { notify(error.message, { error: true }); return; }
    const preview = await guarded(async () => api('/api/imports/preview', { method: 'POST', body: { eventId: 'halloween-2026', fileSha256: await sha256(text), rows: parsed.registrations } }));
    if (!preview) return;
    const decisions = [];
    const sections = SECTIONS.map(([cls, title, help]) => {
      const groups = preview.groups.filter(g => g.class === cls);
      return groups.length ? h('section', {}, h('h3', {}, `${title} (${groups.length})`), h('p', { class: 'muted' }, help), groups.map(g => groupView(g, decisions))) : null;
    });
    const apply = h('button', { type: 'button', class: 'primary', onClick: async () => {
      const chosen = decisions.map(d => d()).flatMap(d => d.rows.map((rowIndex, i) => ({ rowIndex, decision: d.accepted ? 'accepted' : 'rejected', ...(i === 0 && d.name ? { override: { name: d.name } } : {}) })));
      const n = decisions.map(d => d()).filter(d => d.accepted).length;
      if (!(await confirmDialog('Apply import', `${n} accepted. New houses are added as drafts to review.`, 'Apply'))) return;
      const r = await guarded(() => api(`/api/imports/${preview.batchId}/apply`, { method: 'POST', body: { decisions: chosen } }));
      if (r) { notify(`Import applied (${r.accepted} rows accepted).`); result.replaceChildren(); loadHistory(); }
    } }, `Apply accepted`);
    result.replaceChildren(
      preview.alreadyImportedOn ? h('p', { class: 'notice' }, `This file was already imported on ${new Date(preview.alreadyImportedOn).toLocaleString()}.`) : null,
      h('p', { class: 'notice' }, `Columns that are ignored and never sent: ${parsed.ignoredColumns.join(', ') || 'none'}.`),
      h('p', {}, `${preview.summary.rows} rows, ${preview.summary.addresses} addresses: ${preview.summary.matched} already on the trail, ${preview.summary.new} new.`),
      sections, apply);
  });
  view.replaceChildren(h('h2', {}, 'Import registrations'), h('p', { class: 'muted' }, 'Choose the registration CSV. Names, emails and phone numbers stay in your browser and are never uploaded.'), file, result, history);
  loadHistory();
}
