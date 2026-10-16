import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
// BASE=/ simulates a root-domain deployment; the default mirrors GitHub Pages.
const prefix = (process.env.BASE || '/redbird-parallax-site/').replace(/\/?$/, '/');
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.pbf': 'application/x-protobuf', '.geojson': 'application/geo+json'
};
const blocked = /^(node_modules|tests|scripts|docs|worker|private|templates|\.git)(\/|$)/i;
const hostOK = host => /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host || '');

export function createPreviewServer() {
  return createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (prefix !== '/' && pathname === prefix.slice(0, -1)) { res.writeHead(301, { Location: prefix }); res.end(); return; }
      if (!hostOK(req.headers.host) || pathname.includes('\\') || /\.csv$/i.test(pathname)) throw new Error('Blocked');
      if (!pathname.startsWith(prefix)) throw new Error('Outside base path');
      pathname = pathname.slice(prefix.length);
      if (!pathname || pathname.endsWith('/')) pathname += 'index.html';
      const target = path.resolve(root, pathname);
      if (!target.startsWith(root + path.sep) || pathname.split('/').some(p => p.startsWith('.') && p !== '.nojekyll') || blocked.test(path.relative(root, target).split(path.sep).join('/'))) throw new Error('Blocked');
      const info = await stat(target);
      if (!info.isFile()) throw new Error('Not a file');
      res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
      if (req.method === 'HEAD') res.end(); else createReadStream(target).on('error', () => res.destroy()).pipe(res);
    } catch {
      let body = 'Not found';
      try { body = await readFile(path.join(root, '404.html')); } catch { /* no 404 page yet */ }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(body);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createPreviewServer().listen(port, '127.0.0.1', () => console.log(`Red Bird preview: http://127.0.0.1:${port}${prefix}`));
}
