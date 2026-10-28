// "Get the Red Bird app" section: picks the right steps for the device, offers the native install prompt where the browser has one,
// and says so when the app is already installed. Nothing pops up by itself.
const $ = selector => document.querySelector(selector);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const PLATFORMS = ['ios', 'android', 'desktop'];

export function detectPlatform(ua = navigator.userAgent, touchPoints = navigator.maxTouchPoints || 0) {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

let deferred = null;
addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferred = event; $('#app-install-button') && ($('#app-install-button').hidden = false); });

export function initInstallSection() {
  const section = $('#get-app');
  if (!section) return;
  if (isStandalone()) { $('#app-installed').hidden = false; $('#app-steps').hidden = true; return; }
  const tabs = PLATFORMS.map(id => ({ id, tab: $(`#tab-${id}`), panel: $(`#panel-${id}`) }));
  $('.app-tabs').hidden = false;
  const show = (id, focus = false) => {
    for (const t of tabs) {
      const on = t.id === id;
      t.tab.setAttribute('aria-selected', String(on)); t.tab.tabIndex = on ? 0 : -1; t.panel.hidden = !on;
      if (on && focus) t.tab.focus();
    }
  };
  for (const t of tabs) {
    t.tab.addEventListener('click', () => show(t.id));
    t.tab.addEventListener('keydown', event => {
      const i = tabs.indexOf(t), step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (step) { event.preventDefault(); show(tabs[(i + step + tabs.length) % tabs.length].id, true); }
      if (event.key === 'Home') { event.preventDefault(); show(tabs[0].id, true); }
      if (event.key === 'End') { event.preventDefault(); show(tabs[tabs.length - 1].id, true); }
    });
  }
  show(detectPlatform());
  const install = $('#app-install-button');
  install.hidden = !deferred;
  install.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null; install.hidden = true;
  });
  addEventListener('appinstalled', () => { $('#app-installed').hidden = false; $('#app-steps').hidden = true; });
  matchMedia('(display-mode: standalone)').addEventListener('change', () => { if (isStandalone()) { $('#app-installed').hidden = false; $('#app-steps').hidden = true; } });
}
