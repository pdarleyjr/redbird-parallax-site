// Turns an uploaded picture into the two files the site uses (256 px and 128 px WebP with transparency), after checking it against the
// same rules the Worker enforces. Runs in the browser with a canvas; nothing leaves the page until the admin presses Save.
import { checkDimensions, checkPixels, ICON_MESSAGES, ICON_RULES, squareCrop } from './shared/icon-check.mjs';

const SIZES = [256, 128];
const MARGIN = 0.06;                       // empty margin on each side of the trimmed subject

const toBlob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));

/** @returns {Promise<{error: string} | {original: File, icon256: Blob, icon128: Blob, preview256: string}>} */
export async function processIcon(file) {
  if (!['image/png', 'image/webp'].includes(file.type)) return { error: ICON_MESSAGES.type };
  if (file.size > ICON_RULES.maxBytes) return { error: ICON_MESSAGES.size };
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { return { error: 'That image could not be opened. Try saving it again as a PNG.' }; }
  const { width, height } = bitmap;
  const dimension = checkDimensions(width, height);
  if (dimension) { bitmap.close?.(); return { error: ICON_MESSAGES[dimension] }; }

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, width, height);
  const problem = checkPixels({ width, height, data: pixels.data });
  if (problem) { bitmap.close?.(); return { error: problem.message }; }

  const crop = squareCrop({ width, height, data: pixels.data }, MARGIN);
  const outputs = {};
  for (const size of SIZES) {
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const octx = out.getContext('2d');
    octx.imageSmoothingQuality = 'high';
    const k = size / crop.side;
    octx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, crop.dx * k, crop.dy * k, crop.sw * k, crop.sh * k);
    const blob = await toBlob(out, 'image/webp', 0.92);
    if (!blob || blob.type !== 'image/webp') { bitmap.close?.(); return { error: 'This browser cannot make WebP images. Please use Chrome, Edge or Firefox.' }; }
    outputs[size] = blob;
  }
  bitmap.close?.();
  return { original: file, icon256: outputs[256], icon128: outputs[128], preview256: URL.createObjectURL(outputs[256]) };
}
