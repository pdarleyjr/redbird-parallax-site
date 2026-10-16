// Tiny helpers for the admin UI: DOM builder (textContent only), API client, notices, confirm dialog.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'hidden') el[key] = Boolean(value);
    else if (key === 'value') el.value = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) if (child != null && child !== false) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return el;
}

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(path, { method, credentials: 'same-origin', headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new Error('Could not reach the server. Check your connection and try again.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    const error = new Error(data?.error?.message || `Something went wrong (${response.status}).`);
    error.status = response.status;
    if (response.status === 401) document.dispatchEvent(new CustomEvent('rb:signed-out'));
    throw error;
  }
  return data.data;
}

export function notify(message, { error = false } = {}) {
  const el = document.querySelector('#notice');
  el.textContent = message; el.hidden = !message; el.classList.toggle('error', error);
  if (message) el.scrollIntoView({ block: 'nearest' });
}

export function confirmDialog(title, body, okLabel = 'Confirm') {
  const dialog = document.querySelector('#confirm');
  dialog.querySelector('#confirm-title').textContent = title;
  dialog.querySelector('#confirm-body').textContent = body;
  dialog.querySelector('#confirm-ok').textContent = okLabel;
  return new Promise(resolve => { dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true }); dialog.showModal(); });
}

export const badge = (value, kind = value) => h('span', { class: `badge ${kind}` }, value);

export async function guarded(task) {
  try { return await task(); } catch (error) { notify(error.message, { error: true }); return null; }
}
