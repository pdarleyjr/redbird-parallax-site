// App icons from the owner's artwork and icon pack (tools/app-icon/). Run: node scripts/assets/make-app-icons.mjs [--previews]
//   apple-touch-icon-{180,167,152,120}.png  OPAQUE, full bleed (iOS paints transparency black and applies its own mask): the inner crop of the
//                                           artwork flattened on the art's own edge navy. apple-touch-icon.png is the 180 (default, no sizes).
//   icon-192.png, icon-512.png   purpose "any": the pack's Android launcher (192) and Play Store (512) art, transparent rounded corners as shipped
//   icon-maskable-512.png        purpose "maskable": one continuous scene (blurred, darkened enlargement of the art behind a feathered centre crop),
//                                with the whole cardinal inside the central 80% safe circle, so no mask shows a frame or ring
//   favicon-32.png, favicon-96.png (assets/img/) from the pack's 48 px and 96 px launcher icons; favicon.png is the 96
// --previews writes the icons under circle, squircle and teardrop masks to docs/qa/2026-holiday-trails/round4/.
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pack = path.join(root, 'tools/app-icon/pack');
const out = path.join(root, 'assets/app');
await mkdir(out, { recursive: true });
const PNG = { palette: true, quality: 85, compressionLevel: 9, effort: 10 };

// The master without its transparent margin.
const trimmed = await sharp(path.join(pack, 'AppIcon.icon/Assets/icon.png')).ensureAlpha().trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }).toBuffer({ resolveWithObject: true });
const { width: W, height: H } = trimmed.info;
const raw = await sharp(trimmed.data).raw().toBuffer();

// Edge navy: the artwork's own night-sky rim (opaque pixels 4-7% below the top edge, middle 40% across).
let r = 0, g = 0, b = 0, n = 0;
for (let y = Math.round(H * 0.04); y <= Math.round(H * 0.07); y++) for (let x = Math.round(W * 0.3); x <= Math.round(W * 0.7); x++) {
  const i = (y * W + x) * 4;
  if (raw[i + 3] > 250) { r += raw[i]; g += raw[i + 1]; b += raw[i + 2]; n++; }
}
const navy = { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n), alpha: 1 };

const cropSide = Math.round(W * 0.87), cropLeft = Math.round((W - cropSide) / 2), cropTop = Math.round((H - cropSide) / 2);
const inner = await sharp(trimmed.data).extract({ left: cropLeft, top: cropTop, width: cropSide, height: cropSide }).toBuffer();

// ---- iOS: full-bleed opaque, one file per device size ----
for (const size of [180, 167, 152, 120]) await sharp(inner).resize(size, size).flatten({ background: navy }).png(PNG).toFile(path.join(out, `apple-touch-icon-${size}.png`));
await sharp(inner).resize(180, 180).flatten({ background: navy }).png(PNG).toFile(path.join(out, 'apple-touch-icon.png'));

// ---- Android / Chrome "any": the pack's own launcher and Play Store art ----
await sharp(path.join(pack, 'android/mipmap-xxxhdpi/ic_launcher.png')).resize(192, 192).png(PNG).toFile(path.join(out, 'icon-192.png'));
await sharp(path.join(pack, 'playstore.png')).resize(512, 512).png(PNG).toFile(path.join(out, 'icon-512.png'));

// ---- maskable: one continuous scene ----
// Find the cardinal: the largest connected blob of saturated red pixels (the red sign and sunset are separate, smaller blobs).
const step = 2, gw = Math.ceil(W / step), gh = Math.ceil(H / step);
const redMask = new Uint8Array(gw * gh);
for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
  const i = ((gy * step) * W + gx * step) * 4;
  if (raw[i + 3] > 250 && raw[i] > 190 && raw[i + 1] < 110 && raw[i + 2] < 90) redMask[gy * gw + gx] = 1;
}
let best = [];
const seen = new Uint8Array(gw * gh);
for (let start = 0; start < redMask.length; start++) {
  if (!redMask[start] || seen[start]) continue;
  const stack = [start], blob = [];
  seen[start] = 1;
  while (stack.length) {
    const p = stack.pop(); blob.push(p);
    const x = p % gw, y = (p - x) / gw;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
      const q = ny * gw + nx;
      if (redMask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
    }
  }
  if (blob.length > best.length) best = blob;
}
const pts = best.map(p => [(p % gw) * step, Math.floor(p / gw) * step]);
const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
const reach = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)));
const SIZE = 512, SAFE = SIZE * 0.4 * 0.97;
const k = SAFE / reach;                         // master px -> icon px
// background: the art enlarged to 140% of the icon, blurred (radius about 40 px) and slightly darkened
const bgSide = Math.round(SIZE * 1.4);
const background = await sharp(inner).resize(bgSide, bgSide).blur(40).modulate({ brightness: 0.82 })
  .extract({ left: Math.round((bgSide - SIZE) / 2), top: Math.round((bgSide - SIZE) / 2), width: SIZE, height: SIZE }).flatten({ background: navy }).toBuffer();
// foreground: the art scaled by k with the cardinal centred, its edges feathered into the background
const fgSide = Math.round(cropSide * k);
const fgMaster = await sharp(inner).resize(fgSide, fgSide).toBuffer();
const left = Math.round(SIZE / 2 - (cx - cropLeft) * k), top = Math.round(SIZE / 2 - (cy - cropTop) * k);
const feather = Math.round(fgSide * 0.1);
const mask = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${fgSide}" height="${fgSide}"><rect x="${feather * 1.5}" y="${feather * 1.5}" width="${fgSide - feather * 3}" height="${fgSide - feather * 3}" rx="${fgSide * 0.2}" fill="white"/></svg>`)).blur(feather * 0.7).toBuffer();
const feathered = await sharp(fgMaster).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
const maskable = await sharp(background).composite([{ input: feathered, left, top }]).flatten({ background: navy }).png().toBuffer();
await sharp(maskable).png(PNG).toFile(path.join(out, 'icon-maskable-512.png'));

// ---- favicons ----
await sharp(path.join(pack, 'android/mipmap-mdpi/ic_launcher.png')).resize(32, 32).png(PNG).toFile(path.join(root, 'assets/img/favicon-32.png'));
await sharp(path.join(pack, 'android/mipmap-xhdpi/ic_launcher.png')).resize(96, 96).png(PNG).toFile(path.join(root, 'assets/img/favicon-96.png'));
await sharp(path.join(pack, 'android/mipmap-xhdpi/ic_launcher.png')).resize(96, 96).png(PNG).toFile(path.join(root, 'assets/img/favicon.png'));
console.log('edge navy', '#' + [navy.r, navy.g, navy.b].map(v => v.toString(16).padStart(2, '0')).join(''), '| cardinal reach', Math.round(reach), 'px of master, scale', k.toFixed(3), '| app icons written');

// ---- previews under the three Android masks, plus the iOS squircle ----
if (process.argv.includes('--previews')) {
  const dir = path.join(root, 'docs/qa/2026-holiday-trails/round4');
  await mkdir(dir, { recursive: true });
  const S = 256;
  const shapes = {
    circle: `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}"/>`,
    squircle: `<rect width="${S}" height="${S}" rx="${S * 0.2237}"/>`,
    teardrop: `<path d="M${S / 2} 0 A${S / 2} ${S / 2} 0 0 1 ${S} ${S / 2} L${S} ${S} L${S / 2} ${S} A${S / 2} ${S / 2} 0 0 1 0 ${S / 2} A${S / 2} ${S / 2} 0 0 1 ${S / 2} 0Z"/>`
  };
  const masked = async (file, shape) => sharp(file).resize(S, S).ensureAlpha().composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${shape}</svg>`), blend: 'dest-in' }]).png().toBuffer();
  const cells = [
    ['iOS 180 (squircle mask)', await masked(path.join(out, 'apple-touch-icon.png'), shapes.squircle)],
    ['Maskable: circle', await masked(path.join(out, 'icon-maskable-512.png'), shapes.circle)],
    ['Maskable: squircle', await masked(path.join(out, 'icon-maskable-512.png'), shapes.squircle)],
    ['Maskable: teardrop', await masked(path.join(out, 'icon-maskable-512.png'), shapes.teardrop)],
    ['Android any 192', await sharp(path.join(out, 'icon-192.png')).resize(S, S).toBuffer()],
    ['Favicon 96 and 32', await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp(path.join(root, 'assets/img/favicon-96.png')).toBuffer(), left: 30, top: 80 }, { input: await sharp(path.join(root, 'assets/img/favicon-32.png')).toBuffer(), left: 150, top: 112 }]).png().toBuffer()]
  ];
  const label = t => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="26"><text x="${S / 2}" y="19" font-family="Arial" font-size="15" text-anchor="middle" fill="white">${t}</text></svg>`);
  await sharp({ create: { width: cells.length * (S + 16) + 16, height: S + 70, channels: 4, background: { r: 120, g: 120, b: 120, alpha: 1 } } })
    .composite(cells.flatMap(([title, buf], i) => [{ input: buf, left: 16 + i * (S + 16), top: 16 }, { input: label(title), left: 16 + i * (S + 16), top: S + 28 }])).png().toFile(path.join(dir, 'icon-previews.png'));
  console.log('previews written');
}
