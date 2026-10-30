// window.print() silently does nothing in an iPhone home-screen app and in most in-app browsers
// (Facebook, Instagram, Messenger, TikTok, Android WebViews). Detect those, and when print() returns
// without a print window opening, show a way out instead of a dead button.

const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|Snapchat|TikTok|musical_ly|BytedanceWebview|MicroMessenger|; wv\)/i;

/** Why printing cannot work here, or '' when it should. */
export function printBlockedReason(nav = navigator, win = window) {
  if (typeof win.print !== 'function') return 'unsupported';
  if (nav.standalone === true) return 'ios-app';
  if (IN_APP.test(nav.userAgent || '')) return 'in-app';
  return '';
}

const MESSAGES = {
  'ios-app': 'Printing isn’t available inside the home-screen app on iPhone.',
  'in-app': 'This app’s built-in browser can’t print.',
  unsupported: 'This browser can’t print.',
  silent: 'If no print window opened, your browser may not allow printing here.'
};

function button(label, onClick, primary = false) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = `button ${primary ? 'button-primary' : 'button-secondary'}`; b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Fills `help` (an element with the .print-help class) with the reason and the ways out:
 * share/open the page in Safari or Chrome, copy the link, or download the ready-made PDF flyer.
 */
export function showPrintHelp(help, reason, { url = location.href, pdfUrl } = {}) {
  if (!help) return;
  const text = document.createElement('p');
  text.textContent = `${MESSAGES[reason] || MESSAGES.silent} Open this page in Safari or Chrome to print, or download the PDF and print that.`;
  const actions = document.createElement('div');
  actions.className = 'actions';
  if (typeof navigator.share === 'function') actions.append(button('Share or open in browser', () => navigator.share({ title: document.title, url }).catch(() => {}), true));
  if (navigator.clipboard?.writeText) {
    const copy = button('Copy link', async () => { try { await navigator.clipboard.writeText(url); copy.textContent = 'Link copied ✓'; } catch { copy.textContent = 'Copy failed'; } });
    actions.append(copy);
  }
  if (pdfUrl) {
    const a = document.createElement('a');
    a.className = 'button button-secondary'; a.href = pdfUrl; a.textContent = 'Download PDF flyer';
    actions.append(a);
  }
  actions.append(button('Close', () => { help.hidden = true; }));
  help.replaceChildren(text, actions);
  help.hidden = false;
}

/** Prints the page, or explains how to print when this browser cannot. Returns true when a print window was requested. */
export function printPage({ help, url, pdfUrl } = {}) {
  const reason = printBlockedReason();
  if (reason) { showPrintHelp(help, reason, { url, pdfUrl }); return false; }
  if (help) help.hidden = true;
  let opened = false;
  const mark = () => { opened = true; };
  addEventListener('beforeprint', mark, { once: true });
  const started = performance.now();
  try { window.print(); } catch { removeEventListener('beforeprint', mark); showPrintHelp(help, 'unsupported', { url, pdfUrl }); return false; }
  // Desktop browsers block inside print() while the dialog is open; others fire beforeprint. Neither = ignored.
  setTimeout(() => {
    removeEventListener('beforeprint', mark);
    if (!opened && performance.now() - started < 2500) showPrintHelp(help, 'silent', { url, pdfUrl });
  }, 1200);
  return true;
}
