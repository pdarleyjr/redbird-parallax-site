// Homepage: cards come from the build-time registry; when the live events API says Christmas is published, activate its card.
import { initPwa } from './pwa.js';
import { initInstallSection, isStandalone } from './install.js';
import { eventStatus } from '../../shared/event-status.mjs';

// An installed app opens straight into the one live event (the home page stays one tap away: "Red Bird home" is ?home).
const siteConfig = (() => { try { return JSON.parse(document.querySelector('#site-config')?.textContent || '{}'); } catch { return {}; } })();
const liveEvents = (siteConfig.events || []).filter(e => e.status === 'published' && !(e.date && e.end && eventStatus({ date: e.date, start: e.start, end: e.end, tz: e.timeZone }).kind === 'ended'));
if (isStandalone() && !new URLSearchParams(location.search).has('home') && liveEvents.length === 1) location.replace(new URL(`${liveEvents[0].slug}/`, document.baseURI));

initPwa();
initInstallSection();

// Status chips on the event cards: "In 3 days", "Happening now", "Ended" (in the event's own time zone).
const paintStatus = () => {
  for (const chip of document.querySelectorAll('[data-status]')) {
    const { kind, label } = eventStatus({ date: chip.dataset.date, start: chip.dataset.start, end: chip.dataset.end, tz: chip.dataset.tz });
    chip.textContent = label; chip.dataset.kind = kind;
  }
};
paintStatus();
setInterval(paintStatus, 60000);

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
