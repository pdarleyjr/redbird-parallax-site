import { initHouses } from './houses.js';
import { initMap } from './map.js';

const toggle = document.querySelector('#menu-toggle');
const nav = document.querySelector('#site-nav');
const close = document.querySelector('#menu-close');
const mobile = window.matchMedia('(max-width: 959px)');
let open = false;
function setMenu(value, restore = false) {
  open = value && mobile.matches;
  toggle.setAttribute('aria-expanded', String(open));
  nav.hidden = mobile.matches && !open;
  if (restore && mobile.matches) toggle.focus();
}
function resized() {
  toggle.hidden = !mobile.matches;
  close.hidden = !mobile.matches;
  setMenu(false);
}
toggle.addEventListener('click', () => {
  setMenu(!open);
  if (open) nav.querySelector('a').focus();
});
close.addEventListener('click', () => setMenu(false, true));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && open) setMenu(false, true);
});
document.addEventListener('click', e => {
  if (open && !e.target.closest('.site-header')) setMenu(false);
});
nav.addEventListener('click', e => {
  const link = e.target.closest('a');
  if (!link) return;
  setMenu(false);
  const target = link.hash && document.getElementById(link.hash.slice(1));
  if (target) requestAnimationFrame(() => target.focus({ preventScroll: true }));
});
nav.addEventListener('focusout', () => {
  setTimeout(() => { if (open && !nav.contains(document.activeElement) && document.activeElement !== toggle) setMenu(false); }, 0);
});
mobile.addEventListener('change', resized);
resized();
document.documentElement.classList.add('menu-ready');
initMap();
try {
  const event = JSON.parse(document.querySelector('#event-config').textContent);
  initHouses(event);
} catch {
  document.querySelector('#house-status').textContent = 'Please use the house directory on the trail map.';
}
