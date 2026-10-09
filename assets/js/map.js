export function initMap() {
  const preview = document.querySelector('#map-preview');
  const empty = document.querySelector('#map-unavailable');
  const actions = document.querySelector('#map-actions');
  if (!preview) return;
  const failed = () => {
    preview.closest('figure').hidden = true;
    if (actions) actions.hidden = true;
    document.querySelectorAll('[data-direct-map]').forEach(link => { link.href = '#map'; link.textContent = 'Trail map'; });
    empty.hidden = false;
    empty.querySelector('h3').textContent = 'The map is temporarily unavailable';
    empty.querySelector('p').textContent = 'Please try refreshing this page. Map downloads will return when the files are available.';
  };
  preview.addEventListener('error', failed, { once: true });
  if (preview.complete && preview.naturalWidth === 0) failed();
  // Check downloads without transferring the full-resolution masters.
  const groups = new Map();
  for (const link of document.querySelectorAll('[data-map-file]')) {
    if (!groups.has(link.href)) groups.set(link.href, []);
    groups.get(link.href).push(link);
  }
  for (const [url, links] of groups) {
    fetch(url, { method: 'HEAD' }).then(response => {
      if (!response.ok) throw new Error('Map file unavailable');
    }).catch(() => {
      if (links.some(link => link.hasAttribute('download'))) { failed(); return; }
      links.forEach(link => { link.hidden = true; });
      const notice = document.querySelector('#map-file-notice');
      notice.hidden = false;
    });
  }
}
