import { h, api, notify, badge, confirmDialog, guarded } from './lib.js';
import { createPinMap } from './pin-map.js';
import { iconSrc, loadIcons, openUploadDialog } from './icons.js';

let state = { houses: [], counts: {}, filter: 'all', query: '', boundary: null, snapshotVersion: 0, icons: [] };

const LOCATION_LABEL = { none: 'No pin', suggested: 'Approximate', verified: 'Verified' };

async function reload() {
  const [data, icons] = await Promise.all([api('/api/houses'), loadIcons()]);
  state = { ...state, ...data, icons };
}

function visible() {
  const q = state.query.trim().toLowerCase();
  return state.houses.filter(x => {
    if (state.filter === 'review' && !(x.status === 'review' || x.flags.length)) return false;
    if (['draft', 'archived'].includes(state.filter) && x.status !== state.filter) return false;
    return !q || `${x.mapNumber} ${x.name} ${x.address}`.toLowerCase().includes(q);
  });
}

function stats() {
  const c = state.counts;
  const needs = state.houses.filter(x => x.status === 'review' || x.flags.length).length;
  return h('div', { class: 'chips', role: 'list' }, [['Published', c.published], ['Drafts', c.draft], ['Needs review', needs], ['Approximate pins', c.approximate], ['Snapshot version', state.snapshotVersion]].map(([label, n]) => h('span', { class: 'chip', role: 'listitem' }, `${label} `, h('b', {}, n))));
}

function table(refresh) {
  const rows = visible().map(x => h('tr', {},
    h('td', {}, x.mapNumber),
    h('td', {}, h('img', { src: iconSrc(x.icon, true), alt: '', width: 36, height: 36 })),
    h('td', {}, x.name, x.flags.map(f => h('span', { class: 'badge review', title: f.code }, ` ${f.code.replace('_', ' ')}`))),
    h('td', {}, x.address),
    h('td', {}, badge(LOCATION_LABEL[x.locationStatus], x.locationStatus)),
    h('td', {}, badge(x.status)),
    h('td', {}, h('button', { type: 'button', onClick: () => openEditor(x, refresh) }, 'Edit', h('span', { class: 'sr-only' }, ` ${x.name}`)))));
  return h('table', {}, h('thead', {}, h('tr', {}, ['#', 'Icon', 'Name', 'Address', 'Pin', 'Status', ''].map(t => h('th', { scope: 'col' }, t)))), h('tbody', {}, rows));
}

export async function renderHouses(view) {
  await reload();
  const refresh = () => renderHouses(view);
  const search = h('input', { type: 'search', 'aria-label': 'Search houses', placeholder: 'Search number, name or address', value: state.query, onInput: e => { state.query = e.target.value; renderList(); } });
  const holder = h('div');
  const renderList = () => holder.replaceChildren(table(refresh));
  const chips = ['all', 'review', 'draft', 'archived'].map(f => h('button', { type: 'button', 'aria-pressed': String(state.filter === f), onClick: () => { state.filter = f; refresh(); } }, { all: 'All', review: 'Needs review', draft: 'Drafts', archived: 'Archived' }[f]));
  view.replaceChildren(h('h2', {}, 'Manage houses'), stats(), h('div', { class: 'toolbar' }, search, ...chips, h('button', { type: 'button', class: 'primary', onClick: () => openEditor(null, refresh) }, 'Add a house'), h('a', { href: '/api/export.csv', download: '' }, 'Export CSV')), holder);
  renderList();
}

function iconGrid(selected) {
  const offered = state.icons.filter(i => i.status === 'active' || i.key === selected);
  return h('div', { class: 'icons', role: 'radiogroup', 'aria-label': 'Icon' }, offered.map(i => h('label', { title: i.label }, h('input', { type: 'radio', name: 'icon', value: i.key, checked: i.key === selected }), h('img', { src: iconSrc(i.key, true), alt: '', width: 44, height: 44 }), i.label)));
}

export async function openEditor(house, refresh) {
  const dialog = document.querySelector('#editor');
  const isNew = !house;
  const draft = { lat: house?.lat ?? null, lng: house?.lng ?? null, verified: house?.locationStatus === 'verified' };
  let pinMap = null;
  const name = h('input', { type: 'text', id: 'f-name', maxlength: 80, value: house?.name || '', required: true });
  const address = h('input', { type: 'text', id: 'f-address', value: house?.address || '', required: true });
  const description = h('textarea', { id: 'f-desc', maxlength: 280 }, house?.description || '');
  const coords = h('p', { class: 'muted', id: 'f-coords', 'aria-live': 'polite' });
  const verified = h('input', { type: 'checkbox', id: 'f-verified', checked: draft.verified, onChange: e => { draft.verified = e.target.checked; } });
  const showCoords = () => { coords.textContent = draft.lat == null ? 'No pin yet. Click the map or use “Suggest from address”.' : `Pin at ${draft.lat.toFixed(6)}, ${draft.lng.toFixed(6)}`; };
  showCoords();
  const iconHolder = h('div');
  const chosen = () => dialog.querySelector('input[name=icon]:checked')?.value || house?.icon || 'candy-pumpkin';
  iconHolder.append(iconGrid(chosen()));
  const uploadOwn = () => openUploadDialog(async icon => { state.icons = await loadIcons(); iconHolder.replaceChildren(iconGrid(icon.key)); });
  const mapBox = h('div', { class: 'pinmap', role: 'application', 'aria-label': 'Map. Click to place the pin.' });
  const message = h('p', { role: 'alert' });
  const close = () => { pinMap?.destroy(); dialog.close(); dialog.replaceChildren(); };
  const payload = () => ({ name: name.value, address: address.value, description: description.value || null, icon: dialog.querySelector('input[name=icon]:checked')?.value, ...(draft.lat != null ? { lat: draft.lat, lng: draft.lng, verified: draft.verified } : {}) });
  const done = async (task, okText) => { const result = await guarded(task); if (result !== null) { notify(okText); close(); await refresh(); } else message.textContent = document.querySelector('#notice').textContent; };

  const save = () => done(() => isNew ? api('/api/houses', { method: 'POST', body: payload() }) : api(`/api/houses/${house.id}`, { method: 'PATCH', body: payload(), headers: { 'If-Match': String(house.version) } }), 'Saved.');
  const act = (action, title, body) => async () => { if (!(await confirmDialog(title, body, title))) return; const patch = isNew ? null : await guarded(() => api(`/api/houses/${house.id}`, { method: 'PATCH', body: payload(), headers: { 'If-Match': String(house.version) } })); if (!isNew && !patch) return; const id = isNew ? null : house.id; if (id) await done(() => api(`/api/houses/${id}/${action}`, { method: 'POST', body: {} }), `${title} done.`); };
  const createAndPublish = async () => { if (!(await confirmDialog('Publish', 'This updates the public map immediately.', 'Publish'))) return; const made = await guarded(() => api('/api/houses', { method: 'POST', body: payload() })); if (made) await done(() => api(`/api/houses/${made.id}/publish`, { method: 'POST', body: {} }), 'Published.'); };

  const suggest = h('button', { type: 'button', onClick: async () => {
    const r = await guarded(() => api('/api/geocode', { method: 'POST', body: { address: address.value } }));
    if (!r) return;
    if (!r.suggestions.length) { notify('No location found for that address. Click the map to place the pin.', { error: true }); return; }
    draft.lat = r.suggestions[0].lat; draft.lng = r.suggestions[0].lng; draft.verified = false; verified.checked = false; showCoords(); pinMap?.place(draft.lat, draft.lng);
    notify(r.inBoundary ? 'Suggested location found. Drag the pin onto the correct house, then confirm it.' : 'That suggestion is outside the trail area. Place the pin by hand.');
  } }, 'Suggest from address');

  dialog.replaceChildren(h('h2', { id: 'editor-title' }, isNew ? 'Add a house' : `Edit #${house.mapNumber} ${house.name}`),
    h('div', { class: 'grid2' }, h('div', {}, h('label', { for: 'f-name' }, 'House name (what the public sees)'), name, h('label', { for: 'f-address' }, 'Address'), address, h('label', { for: 'f-desc' }, 'Short description (optional, up to 280 characters)'), description),
      h('div', {}, h('h3', {}, 'Icon'), iconHolder, h('p', {}, h('button', { type: 'button', onClick: uploadOwn }, 'Upload your own icon')))),
    h('h3', {}, 'Location'), h('div', { class: 'row' }, suggest), mapBox, coords,
    h('label', { for: 'f-verified' }, verified, ' The pin is on the correct house front'),
    message,
    h('div', { class: 'row' },
      h('button', { type: 'button', onClick: close }, 'Cancel'), h('button', { type: 'button', class: 'primary', onClick: save }, 'Save draft'),
      isNew ? h('button', { type: 'button', onClick: createAndPublish }, 'Publish') : null,
      !isNew && house.status !== 'published' && house.status !== 'archived' ? h('button', { type: 'button', onClick: act('publish', 'Publish', 'This updates the public map immediately.') }, 'Publish') : null,
      !isNew && house.status === 'published' ? h('button', { type: 'button', onClick: act('unpublish', 'Unpublish', 'This removes the house from the public map immediately.') }, 'Unpublish') : null,
      !isNew && house.status !== 'archived' ? h('button', { type: 'button', class: 'danger', onClick: act('archive', 'Archive', 'The house is hidden and its number stays reserved.') }, 'Archive') : null,
      !isNew && house.status === 'archived' ? h('button', { type: 'button', onClick: act('restore', 'Restore', 'The house returns as a draft with its old number.') }, 'Restore') : null),
    house?.status === 'published' ? h('p', { class: 'muted' }, 'Saving a published house updates the public map immediately.') : null);
  dialog.showModal();
  pinMap = await createPinMap(mapBox, { boundary: state.boundary, point: draft.lat == null ? null : { lat: draft.lat, lng: draft.lng }, onMove: p => { draft.lat = p.lat; draft.lng = p.lng; showCoords(); } }).catch(() => { mapBox.textContent = 'The map could not load. You can still save without a pin.'; return null; });
  dialog.addEventListener('cancel', () => pinMap?.destroy(), { once: true });
  name.focus();
}
