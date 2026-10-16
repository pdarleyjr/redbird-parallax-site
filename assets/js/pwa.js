// Service worker registration, update toast and install affordances. Never auto-reloads.
import { siteRoot } from './data.js';

const flag = document.querySelector('meta[name="rb-sw"]')?.content === 'on';
const $ = selector => document.querySelector(selector);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const DISMISS_KEY = 'rbht:install-dismissed';

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

function initInstall() {
  const row = $('#install-row'), button = $('#install-button');
  if (!row || !button || standalone()) return;
  let deferred = null;
  const dismissed = () => { try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 864e5; } catch { return false; } };
  addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferred = event; row.hidden = false; });
  addEventListener('appinstalled', () => { row.hidden = true; });
  button.addEventListener('click', async () => {
    if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; row.hidden = true; return; }
    const sheet = document.createElement('section');
    sheet.className = 'sheet'; sheet.setAttribute('aria-label', 'Add to Home Screen');
    const title = document.createElement('h3'); title.textContent = 'Add Red Bird Trails to your Home Screen';
    const steps = document.createElement('ol');
    for (const s of ['Tap Share ⬆︎ in Safari.', 'Tap Add to Home Screen.', 'Keep “Open as Web App” on.']) { const li = document.createElement('li'); li.textContent = s; steps.append(li); }
    const close = document.createElement('button'); close.type = 'button'; close.className = 'button button-secondary'; close.textContent = 'Got it';
    close.addEventListener('click', () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage blocked */ } sheet.remove(); });
    sheet.append(title, steps, close); document.body.append(sheet);
  });
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !navigator.standalone;
  if (ios && !dismissed()) row.hidden = false;
}

// Save images for offline use a little after the page has settled (skipped when the visitor asked to save data).
function saveImagesLater() {
  if (navigator.connection?.saveData) return;
  const send = () => setTimeout(() => navigator.serviceWorker.ready.then(r => r.active?.postMessage({ type: 'warm-extras' })), 8000);
  if (document.readyState === 'complete') send(); else addEventListener('load', send, { once: true });
}

export function initPwa() {
  initInstall();
  if (!flag || !('serviceWorker' in navigator)) return;
  const hadController = !!navigator.serviceWorker.controller;   // is this an already-installed visitor? (read before anything registers)
  // Register after the page has finished loading so the worker's downloads never compete with what the visitor is waiting for.
  const register = () => setTimeout(() => navigator.serviceWorker.register(new URL('sw.js', siteRoot), { scope: siteRoot.href }).then(registration => { watchForUpdates(registration, hadController); saveImagesLater(); }).catch(error => console.warn('Offline mode unavailable:', error.message)), 2000);
  if (document.readyState === 'complete') register(); else addEventListener('load', register, { once: true });
}
