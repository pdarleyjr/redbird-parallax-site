// KILL-SWITCH for the retired Red Bird Holiday Trail (Christmas 2025) site, which was served from this domain with a cache-first
// service worker registered at THIS exact URL. Returning visitors' browsers re-check this file, install it, and are moved to the
// current app. It deletes only the old site's caches, unregisters itself and reloads open pages. The current app's worker is /sw.js.
// Keep this file in place for at least 60 days after the domain move (until 2026-12-31).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (/^red-bird-holiday-trail-/.test(key)) await caches.delete(key);
    }
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) {
      try { await client.navigate(client.url); } catch (error) { /* the page will pick up the new site on its next load */ }
    }
  })());
});
