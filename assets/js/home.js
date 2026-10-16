// Homepage: cards come from the build-time registry; when the live events API says Christmas is published, activate its card.
import { initPwa } from './pwa.js';

initPwa();

function activate(card) {
  const link = document.createElement('a');
  link.className = 'event-card neon'; link.href = 'christmas/'; link.dataset.event = card.dataset.event;
  link.append(...[...card.children].filter(n => !n.classList.contains('card-badge')));
  const cta = document.createElement('span'); cta.className = 'button button-primary card-cta'; cta.textContent = 'Explore the trail →';
  link.querySelector('.card-body')?.append(cta);
  link.querySelector('.card-eyebrow')?.classList.remove('muted');
  card.replaceWith(link);
}

const config = (() => { try { return JSON.parse(document.querySelector('#site-config')?.textContent || '{}'); } catch { return {}; } })();
if (config.apiBase) {
  fetch(`${config.apiBase.replace(/\/$/, '')}/v1/events`, { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then(body => {
      const live = (body && 'ok' in body ? body.data : body) || [];
      const christmas = live.find(e => e.id === 'christmas-2026');
      const card = document.querySelector('.event-card.is-updating[data-event="christmas-2026"]');
      if (christmas?.status === 'published' && card) activate(card);
    })
    .catch(() => { /* keep the build-time cards */ });
}
