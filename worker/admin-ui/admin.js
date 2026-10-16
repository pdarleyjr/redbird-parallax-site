import { h, api, notify, guarded } from './lib.js';
import { renderHouses } from './houses.js';
import { renderImport } from './import.js';
import { renderVersions, renderEvents, renderActivity } from './misc.js';

const VIEWS = { houses: renderHouses, import: renderImport, versions: renderVersions, events: renderEvents, activity: renderActivity };
const view = document.querySelector('#view');
const tabs = document.querySelector('#tabs');
const who = document.querySelector('#who');

function showLogin(message = '') {
  tabs.hidden = true; who.replaceChildren();
  const password = h('input', { type: 'password', id: 'password', name: 'password', autocomplete: 'current-password', required: true, 'aria-describedby': 'login-msg' });
  const error = h('p', { id: 'login-msg', role: 'alert' }, message);
  const form = h('form', { class: 'login', onSubmit: async event => {
    event.preventDefault();
    error.textContent = '';
    try {
      await api('/api/login', { method: 'POST', body: { password: password.value } });
      password.value = '';
      await start();
    } catch (err) { error.textContent = err.message; password.value = ''; password.focus(); }
  } }, h('h2', {}, 'Sign in'), h('label', { for: 'password' }, 'Admin password'), password,
  h('div', { class: 'row' }, h('button', { type: 'submit', class: 'primary' }, 'Sign in')), error);
  view.replaceChildren(form);
  password.focus();
}

async function show(tab) {
  notify('');
  for (const b of tabs.querySelectorAll('button[data-tab]')) b.dataset.tab === tab ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
  history.replaceState(null, '', `#${tab}`);
  await guarded(() => VIEWS[tab](view));
}

async function start() {
  try { await api('/api/me'); } catch (error) { showLogin(error.status === 401 ? '' : error.message); return; }
  tabs.hidden = false;
  who.replaceChildren(h('button', { type: 'button', id: 'sign-out', onClick: async () => { await guarded(() => api('/api/logout', { method: 'POST', body: {} })); showLogin('You are signed out.'); } }, 'Sign out'));
  await show(VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'houses');
}

tabs.addEventListener('click', event => { const b = event.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); });
document.addEventListener('rb:signed-out', () => showLogin('Your session ended. Please sign in again.'));
await start();
