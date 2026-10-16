// Icons: the catalogue tab and the upload dialog (with a live preview on the real pin badge before anything is saved).
import { h, api, notify, guarded, confirmDialog, badge } from './lib.js';
import { processIcon } from './icon-process.js';
import { ICON_SPEC_TEXT } from './shared/icon-check.mjs';

/** Where an icon's picture is shown from in the admin (uploads come through the admin API; built-ins are bundled). */
export const iconSrc = (key, small = false) => (key.startsWith('up-') ? `/api/icons/file/${small ? '128/' : ''}${key}.webp` : `assets/img/markers/${key}.webp`);

export async function loadIcons() { return (await api('/api/icons')).icons; }

async function postIcon(form) {
  let response;
  try { response = await fetch('/api/icons', { method: 'POST', credentials: 'same-origin', body: form }); } catch { throw new Error('Could not reach the server. Check your connection and try again.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error?.message || 'The upload did not work. Please try again.');
  return data.data;
}

/** The badge exactly as visitors see it, at map size (40 px), compact size (28 px) and in the directory row (36 px). */
function previewBadge(src, size, number) {
  return h('span', { class: 'pin-preview', style: `--d:${size}px` }, h('span', { class: 'pin-disc' }, h('img', { src, alt: '' })), size > 28 ? h('span', { class: 'pin-num' }, number) : null);
}

/** Opens the upload dialog. `onDone(icon)` runs after a successful save. */
export function openUploadDialog(onDone) {
  const dialog = document.querySelector('#icon-upload');
  let result = null;
  const message = h('p', { role: 'alert', class: 'icon-msg' });
  const preview = h('div', { class: 'icon-previews', 'aria-live': 'polite' }, h('p', { class: 'muted' }, 'Choose a picture to see how it will look.'));
  const label = h('input', { type: 'text', id: 'icon-label', maxlength: 40, required: true, placeholder: 'For example, Pumpkin Patch' });
  const save = h('button', { type: 'button', class: 'primary', disabled: true }, 'Save icon');
  const close = () => { if (result?.preview256) URL.revokeObjectURL(result.preview256); dialog.close(); dialog.replaceChildren(); };

  const choose = async event => {
    const file = event.target.files[0];
    result = null; save.disabled = true; message.textContent = '';
    if (!file) return;
    message.textContent = 'Checking the picture…';
    const checked = await processIcon(file);
    if (checked.error) { message.textContent = checked.error; preview.replaceChildren(h('p', { class: 'muted' }, 'No preview for this file.')); return; }
    message.textContent = '';
    result = checked;
    if (!label.value) label.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 40);
    preview.replaceChildren(
      h('figure', {}, previewBadge(checked.preview256, 40, '12'), h('figcaption', {}, 'Map pin, 40 px')),
      h('figure', {}, previewBadge(checked.preview256, 28, ''), h('figcaption', {}, 'Compact, 28 px')),
      h('figure', { class: 'dir-row' }, h('img', { src: checked.preview256, alt: '', width: 36, height: 36 }), h('figcaption', {}, 'Directory row')));
    save.disabled = false;
  };
  const file = h('input', { type: 'file', id: 'icon-file', accept: 'image/png,image/webp', onChange: choose });

  save.addEventListener('click', async () => {
    if (!result) return;
    if (!label.value.trim()) { message.textContent = 'Give the icon a name first.'; label.focus(); return; }
    save.disabled = true; message.textContent = 'Saving…';
    const form = new FormData();
    form.set('label', label.value); form.set('original', result.original, result.original.name);
    form.set('icon256', result.icon256, 'icon-256.webp'); form.set('icon128', result.icon128, 'icon-128.webp');
    try {
      const icon = await postIcon(form);
      notify(`Saved the icon “${icon.label}”.`);
      close(); await onDone?.(icon);
    } catch (error) { message.textContent = error.message; save.disabled = false; }
  });

  dialog.replaceChildren(h('form', { method: 'dialog', onSubmit: e => e.preventDefault() },
    h('h2', { id: 'icon-upload-title' }, 'Upload an icon'),
    h('p', { class: 'spec' }, ICON_SPEC_TEXT),
    h('p', { class: 'muted' }, 'PNG or WebP, at most 8 MB, at least 512 × 512 pixels. The picture is trimmed, centred and saved at 256 and 128 px.'),
    h('label', { for: 'icon-file' }, 'Picture'), file,
    h('label', { for: 'icon-label' }, 'Name'), label,
    message, preview,
    h('div', { class: 'row' }, h('button', { type: 'button', onClick: close }, 'Cancel'), save)));
  dialog.showModal();
  file.focus();
}

export async function renderIcons(view) {
  const icons = await guarded(loadIcons);
  if (!icons) return;
  const refresh = () => renderIcons(view);
  const act = (icon, action) => async () => {
    if (!(await confirmDialog(action === 'archive' ? 'Archive icon' : 'Restore icon', action === 'archive' ? `“${icon.label}” will no longer be offered for houses.` : `“${icon.label}” can be chosen for houses again.`, action === 'archive' ? 'Archive' : 'Restore'))) return;
    const done = await guarded(() => api(`/api/icons/${icon.key}/${action}`, { method: 'POST', body: {} }));
    if (done) { notify(action === 'archive' ? 'Icon archived.' : 'Icon restored.'); await refresh(); }
  };
  const rows = icons.map(i => h('tr', {},
    h('td', {}, h('img', { src: iconSrc(i.key, true), alt: '', width: 36, height: 36 })),
    h('td', {}, i.label), h('td', {}, h('code', {}, i.key)),
    h('td', {}, badge(i.source === 'upload' ? 'Uploaded' : 'Built in', i.source === 'upload' ? 'verified' : 'draft')),
    h('td', {}, badge(i.status === 'active' ? 'Active' : 'Archived', i.status === 'active' ? 'published' : 'archived')),
    h('td', {}, i.uses === 0 ? 'Not used' : `${i.uses} ${i.uses === 1 ? 'house' : 'houses'}`),
    h('td', {}, i.status === 'active'
      ? h('button', { type: 'button', disabled: i.uses > 0, title: i.uses > 0 ? 'Choose another icon for the houses that use it first.' : null, onClick: act(i, 'archive') }, 'Archive', h('span', { class: 'sr-only' }, ` ${i.label}`))
      : h('button', { type: 'button', onClick: act(i, 'restore') }, 'Restore', h('span', { class: 'sr-only' }, ` ${i.label}`)))));
  view.replaceChildren(h('h2', {}, 'Icons'),
    h('p', { class: 'muted' }, 'Built-in icons come with the site. Upload your own for any house. Every upload is recorded in Activity.'),
    h('div', { class: 'toolbar' }, h('button', { type: 'button', class: 'primary', onClick: () => openUploadDialog(refresh) }, 'Upload an icon')),
    h('table', {}, h('thead', {}, h('tr', {}, ['Icon', 'Name', 'Key', 'Source', 'Status', 'Used by', ''].map(t => h('th', { scope: 'col' }, t)))), h('tbody', {}, rows)));
}
