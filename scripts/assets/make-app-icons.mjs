// App icon master (SVG) -> PNGs. Colors come from tokens.css. Run: node scripts/assets/make-app-icons.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readTokens } from '../map/build-style.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'assets/app');
await mkdir(out, { recursive: true });
const t = await readTokens();

// scale = fraction of the canvas used by the artwork (maskable keeps a 20% safe padding).
const svg = (scale, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="${t['rb-sky']}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="40" y="40" width="432" height="432" rx="96" fill="none" stroke="${t['rb-cream']}" stroke-width="10"/>
    <g transform="translate(86 118) scale(2.9)" filter="none">
      <path fill="${t['rb-cardinal-deep']}" d="M34 76 4 98l5 5 36-18z"/>
      <path fill="${t['rb-cardinal']}" d="M30 78C28 52 52 36 78 40c14 2 20 14 12 26-12 18-42 26-60 12z"/>
      <circle fill="${t['rb-cardinal']}" cx="84" cy="36" r="15"/>
      <path fill="${t['rb-cardinal']}" d="M72 30 80 3l14 24z"/>
      <path fill="${t['rb-panel']}" d="M92 30c4 0 8 2 10 6-3 5-8 8-14 7z"/>
      <path fill="${t['rb-neon-orange']}" d="M97 33l16 7-17 6z"/>
      <path fill="none" stroke="${t['rb-cardinal-deep']}" stroke-width="3" stroke-linecap="round" d="M42 64c14-9 30-6 38 6"/>
      <circle fill="${t['rb-cream']}" cx="87" cy="34" r="2.4"/>
    </g>
    <path transform="translate(380 70) scale(1.5)" fill="${t['rb-gold']}" d="M12 0c.7 6.8 3.5 10.3 12 12-8.5 1.7-11.3 5.2-12 12-.7-6.8-3.5-10.3-12-12C8.5 10.3 11.3 6.8 12 0z"/>
  </g>
</svg>`;

await writeFile(path.join(out, 'icon.svg'), svg(1, true));
const png = (name, size, markup) => sharp(Buffer.from(markup)).resize(size, size).png().toFile(path.join(out, name));
await png('icon-192.png', 192, svg(1, true));
await png('icon-512.png', 512, svg(1, true));
await png('icon-maskable-512.png', 512, svg(0.8, false));
await png('apple-touch-icon.png', 180, svg(1, false));
console.log('app icons written');
