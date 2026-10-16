// Service worker registration, update toast and install affordances. Never auto-reloads.
import { siteRoot } from './data.js';

const flag = document.querySelector('meta[name="rb-sw"]')?.content === 'on';

function toast(message, actionLabel, onAction) {
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status');
  const text = document.createElement('span'); text.textContent = message;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'button button-primary'; button.textContent = actionLabel;
  button.addEventListener('click', () => { onAction(); el.remove(); });
  el.append(text, button);
  document.body.append(el);
  return el;
}

// Only visitors who already had the app installed before this page loaded are ever told about an update, and never in the first 10 seconds.
function watchForUpdates(registration, hadController) {
  let shown = false;
  const offer = worker => {
    if (shown || !hadController) return; shown = true;
    const show = () => toast('A new version of Red Bird Trails is ready.', 'Refresh', () => {
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
    const wait = () => {
      if (performance.now() < 10000) setTimeout(wait, 10000 - performance.now());
      else if (document.documentElement.dataset.tracking === '1') setTimeout(wait, 15000);
      else show();
    };
    wait();
  };
  if (registration.waiting) offer(registration.waiting);
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    worker?.addEventListener('statechange', () => { if (worker.state === 'installed') offer(worker); });
  });
}

// Save images for offline use a little after the page has settled (skipped when the visitor asked to save data).
function saveImagesLater() {
  if (navigator.connection?.saveData) return;
  const send = () => setTimeout(() => navigator.serviceWorker.ready.then(r => r.active?.postMessage({ type: 'warm-extras' })), 8000);
  if (document.readyState === 'complete') send(); else addEventListener('load', send, { once: true });
}

export function initPwa() {
  if (!flag || !('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;   // is this an already-installed visitor? (read before anything registers)
  // Register after the page has finished loading so the worker's downloads never compete with what the visitor is waiting for.
  const register = () => setTimeout(() => navigator.serviceWorker.register(new URL('sw.js', siteRoot), { scope: siteRoot.href }).then(registration => { watchForUpdates(registration, hadController); saveImagesLater(); }).catch(error => console.warn('Offline mode unavailable:', error.message)), 2000);
  if (document.readyState === 'complete') register(); else addEventListener('load', register, { once: true });
}
