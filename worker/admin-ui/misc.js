import { h, api, notify, guarded, confirmDialog } from './lib.js';

export async function renderVersions(view) {
  const list = await guarded(() => api('/api/snapshots'));
  if (!list) return;
  view.replaceChildren(h('h2', {}, 'Published versions'), h('p', { class: 'muted' }, 'Every public change is a version. Restoring creates a new version.'),
    h('table', {}, h('thead', {}, h('tr', {}, ['Version', 'When', 'By', 'Houses', 'With pins', ''].map(t => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, list.map((v, i) => h('tr', {}, h('td', {}, v.version, i === 0 ? ' (live)' : ''), h('td', {}, new Date(v.createdAt).toLocaleString()), h('td', {}, v.createdBy), h('td', {}, v.houseCount), h('td', {}, v.located),
        h('td', {}, i === 0 ? '' : h('button', { type: 'button', onClick: async () => { if (!(await confirmDialog('Restore version', `Version ${v.version} becomes live again as a new version.`, 'Restore'))) return; const r = await guarded(() => api(`/api/snapshots/halloween-2026/${v.version}/restore`, { method: 'POST', body: {} })); if (r) { notify(`Restored version ${v.version} as version ${r.version}.`); renderVersions(view); } } }, 'Restore')))))));
}

const STATUS_HELP = { draft: 'Hidden everywhere.', updating: 'Card shows “Updating for this year’s event”.', published: 'Live with full details.', archived: 'Card stays visible and says the trail has ended.' };

export async function renderEvents(view) {
  const events = await guarded(() => api('/api/events'));
  if (!events) return;
  view.replaceChildren(h('h2', {}, 'Events'), events.map(ev => {
    const status = h('select', { id: `st-${ev.id}`, 'aria-label': `Status for ${ev.title}` }, ['draft', 'updating', 'published', 'archived'].map(s => h('option', { value: s, selected: s === ev.status }, s)));
    const f = (id, label, type, value, extra = {}) => [h('label', { for: `${id}-${ev.id}` }, label), h('input', { id: `${id}-${ev.id}`, type, value: value || '', ...extra })];
    const title = f('title', 'Title', 'text', ev.title, { maxlength: 120 }), date = f('date', 'Date', 'date', ev.date), start = f('start', 'Start (24h)', 'time', ev.start), end = f('end', 'End (24h)', 'time', ev.end);
    const desc = h('textarea', { id: `desc-${ev.id}`, maxlength: 500 }, ev.details.description || '');
    const val = id => document.querySelector(`#${id}-${ev.id}`).value || null;
    return h('section', { class: 'group' }, h('h3', {}, ev.title, h('span', { class: 'badge' }, ev.status)),
      h('label', { for: `st-${ev.id}` }, 'Status'), status, h('p', { class: 'muted' }, STATUS_HELP[ev.status]),
      ev.kind === 'christmas' ? h('div', {}, title, date, start, end, h('label', { for: `desc-${ev.id}` }, 'Description (required to publish)'), desc) : null,
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'primary', onClick: async () => {
        const body = { status: status.value, confirm: true };
        if (ev.kind === 'christmas') Object.assign(body, { title: val('title'), date: val('date'), start: val('start'), end: val('end'), description: desc.value || null });
        if (status.value !== ev.status && !(await confirmDialog('Change status', `Set “${ev.title}” to ${status.value}? ${STATUS_HELP[status.value]}`, 'Change status'))) return;
        const r = await guarded(() => api(`/api/events/${ev.id}`, { method: 'PATCH', body }));
        if (r) { notify('Event updated.'); renderEvents(view); }
      } }, 'Save event')));
  }));
}

export async function renderActivity(view) {
  const rows = await guarded(() => api('/api/audit?limit=100'));
  if (!rows) return;
  view.replaceChildren(h('h2', {}, 'Recent activity'), h('table', {}, h('thead', {}, h('tr', {}, ['When', 'Who', 'What', 'Item'].map(t => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, rows.map(r => h('tr', {}, h('td', {}, new Date(r.at).toLocaleString()), h('td', {}, r.actor), h('td', {}, r.action), h('td', {}, r.entity_id || ''))))));
}
