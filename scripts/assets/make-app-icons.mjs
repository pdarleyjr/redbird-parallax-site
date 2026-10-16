// App icons from the owner's artwork (tools/app-icon/redbird-app-icon-source.png, 1254x1254 RGBA, rounded square, transparent corners).
// Run: node scripts/assets/make-app-icons.mjs
//   apple-touch-icon.png 180  OPAQUE (iOS paints transparency black): inner artwork on the art's own edge navy; iOS applies its corner mask
//   icon-192.png, icon-512.png  purpose "any": the artwork with its transparent rounded corners
//   icon-maskable-512.png       artwork at 80% on a solid navy square so Android's mask never clips the cardinal
//   favicon-32.png, favicon-96.png (assets/img/)
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'tools/app-icon/redbird-app-icon-source.png');
const out = path.join(root, 'assets/app');
await mkdir(out, { recursive: true });

// The artwork without the transparent margin.
const trimmed = await sharp(source).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }).toBuffer({ resolveWithObject: true });
const art = sharp(trimmed.data);
const { width: W, height: H } = trimmed.info;

// Edge navy, sampled from the artwork's own night-sky rim (opaque pixels in the band 4-7% below the top edge, middle 40% across).
const raw = await sharp(trimmed.data).raw().toBuffer();
let r = 0, g = 0, b = 0, n = 0;
for (let y = Math.round(H * 0.04); y <= Math.round(H * 0.07); y++) for (let x = Math.round(W * 0.3); x <= Math.round(W * 0.7); x++) {
  const i = (y * W + x) * 4;
  if (raw[i + 3] > 250) { r += raw[i]; g += raw[i + 1]; b += raw[i + 2]; n++; }
}
const navy = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), alpha: 1 };
console.log('edge navy', '#' + [navy.r, navy.g, navy.b].map(v => v.toString(16).padStart(2, '0')).join(''));

const crop = (fraction) => {            // the centre `fraction` of the artwork (drops the rounded corners and the glowing rim)
  const w = Math.round(W * fraction), h = Math.round(H * fraction);
  return { left: Math.round((W - w) / 2), top: Math.round((H - h) / 2), width: w, height: h };
};

// iOS: opaque. Cut a square from inside the artwork, then flatten onto the navy so no corner can be transparent.
await sharp(await art.clone().extract(crop(0.9)).toBuffer()).resize(180, 180).flatten({ background: navy }).png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 }).toFile(path.join(out, 'apple-touch-icon.png'));

// "any": the whole artwork, transparent corners kept.
for (const size of [192, 512]) await art.clone().resize(size, size).png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 }).toFile(path.join(out, `icon-${size}.png`));

// maskable: 80% artwork centred on solid navy.
const inner = Math.round(512 * 0.8);
await sharp({ create: { width: 512, height: 512, channels: 4, background: navy } })
  .composite([{ input: await art.clone().resize(inner, inner).toBuffer(), left: Math.round((512 - inner) / 2), top: Math.round((512 - inner) / 2) }])
  .flatten({ background: navy }).png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 }).toFile(path.join(out, 'icon-maskable-512.png'));

// favicons keep the rounded shape.
for (const size of [32, 96]) await art.clone().resize(size, size).png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 }).toFile(path.join(root, `assets/img/favicon-${size}.png`));
await art.clone().resize(96, 96).png({ palette: true, quality: 85, compressionLevel: 9, effort: 10 }).toFile(path.join(root, 'assets/img/favicon.png'));
console.log('app icons written');
