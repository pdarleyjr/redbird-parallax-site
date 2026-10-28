// The map dock: a bottom sheet on phones (peek / half / full), a side sheet on tablets and the sidebar on desktop.
// Drag the handle (or anywhere on the top card), or use the handle button: Enter/Space cycles, Up/Down move one step, Escape collapses.
const STATES = ['peek', 'half', 'full'];

export function initDock({ onState } = {}) {
  const dock = document.getElementById('dock'), grab = document.getElementById('dock-grab'), handle = document.getElementById('dock-handle');
  const body = document.getElementById('dock-body'), card = document.getElementById('house-sheet'), views = document.getElementById('main');
  const wide = matchMedia('(min-width: 768px)');
  let state = 'peek', heights = { peek: 168, half: 360, full: 560 };

  const measure = () => {
    const avail = views.clientHeight || 640;
    const peek = Math.min(Math.max(28 + card.offsetHeight + 4, 128), Math.round(avail * 0.42));
    heights = { peek, half: Math.max(peek + 120, Math.round(avail * 0.58)), full: Math.max(peek + 160, avail - 8) };
    document.documentElement.style.setProperty('--dock-peek', `${peek}px`);
    if (!dock.hasAttribute('data-dragging')) dock.style.setProperty('--dock-h', `${heights[state]}px`);
  };
  const label = () => {
    handle.setAttribute('aria-expanded', String(state !== 'peek'));
    handle.querySelector('.sr-only').textContent = state === 'full' ? 'Show fewer houses' : 'Show more houses';
  };
  const paint = () => {
    dock.dataset.state = state; document.body.dataset.dock = state;
    body.inert = !wide.matches && state === 'peek';
    label(); measure();
  };
  const set = (next, notify = true) => {
    if (!STATES.includes(next)) return;
    state = next; paint();
    if (notify) onState?.(state, insets());
  };
  /** Space the dock takes from the map, in px: lets pins and camera moves keep clear of it. */
  const insets = () => {
    if (!dock.offsetParent && getComputedStyle(dock).display === 'none') return { bottom: 0, right: 0 };
    const r = dock.getBoundingClientRect(), v = views.getBoundingClientRect();
    if (matchMedia('(min-width: 1024px)').matches) return { bottom: 0, right: 0 };
    return wide.matches ? { bottom: 0, right: Math.max(0, Math.round(v.right - r.left)) } : { bottom: Math.max(0, Math.round(v.bottom - r.top)), right: 0 };
  };

  // dragging
  let drag = null, justDragged = false;
  const startDrag = event => {
    if (wide.matches || event.button > 0) return;
    if (event.target.closest('button:not(.dock-handle), a, input, select, textarea, label')) return;
    drag = { y: event.clientY, h: dock.getBoundingClientRect().height, t: event.timeStamp, last: event.clientY, v: 0, id: event.pointerId, active: false };
    addEventListener('pointermove', moveDrag); addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);   // follow the finger even when it leaves the sheet
  };
  const moveDrag = event => {
    if (!drag) return;
    if (!drag.active) {            // capture the pointer only once it really is a drag, so a plain tap still reaches the handle button as a click
      if (Math.abs(event.clientY - drag.y) < 4) return;
      drag.active = true; dock.setAttribute('data-dragging', '');
    }
    const dt = Math.max(1, event.timeStamp - drag.t);
    drag.v = (drag.last - event.clientY) / dt;       // px per ms, positive = moving up
    drag.last = event.clientY; drag.t = event.timeStamp;
    const h = Math.min(heights.full, Math.max(heights.peek, drag.h + (drag.y - event.clientY)));
    dock.style.setProperty('--dock-h', `${h}px`);
  };
  const endDrag = event => {
    if (!drag) return;
    const h = dock.getBoundingClientRect().height, projected = h + drag.v * 180;
    const moved = drag.active;
    drag = null;
    removeEventListener('pointermove', moveDrag); removeEventListener('pointerup', endDrag); removeEventListener('pointercancel', endDrag);
    dock.removeAttribute('data-dragging');
    if (!moved) return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 0);   // the click that follows a drag is not a tap on the handle
    const next = STATES.reduce((best, s) => (Math.abs(heights[s] - projected) < Math.abs(heights[best] - projected) ? s : best), 'peek');
    set(next);
  };
  dock.addEventListener('pointerdown', startDrag);

  // keyboard and screen readers
  const step = dir => set(STATES[Math.min(2, Math.max(0, STATES.indexOf(state) + dir))]);
  handle.addEventListener('click', () => { if (!justDragged) set(STATES[(STATES.indexOf(state) + 1) % 3]); });
  handle.addEventListener('keydown', event => {
    if (event.key === 'ArrowUp') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowDown') { event.preventDefault(); step(-1); }
  });
  dock.addEventListener('keydown', event => { if (event.key === 'Escape' && state !== 'peek' && !wide.matches) { set('peek'); handle.focus(); } });

  new ResizeObserver(measure).observe(views);
  new ResizeObserver(measure).observe(card);
  wide.addEventListener('change', paint);
  paint();
  return { set, get: () => state, insets, measure };
}
