// Emergency PWA rollback: replace sw.js with a stub that deletes every rbht-* cache and unregisters itself.
// Never delete sw.js (a 404 leaves an installed service worker running). Usage: node scripts/sw-rollback.mjs
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rollbackSource = () => `// ROLLBACK STUB written by scripts/sw-rollback.mjs
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('rbht-')) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  await writeFile(path.join(root, 'sw.js'), rollbackSource());
  console.log('sw.js replaced with the rollback stub. Commit and push it, then fix forward.');
}
