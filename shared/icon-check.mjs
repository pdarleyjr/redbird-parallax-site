// Rules for an uploaded house icon, checked on decoded pixels. Used in the admin page (canvas pixels) and in the Worker (decoded PNG)
// so both say the same thing. Pure: no DOM, no network.

export const ICON_RULES = Object.freeze({
  maxBytes: 8 * 1024 * 1024, minSide: 512, maxSide: 2048, squareTolerance: 0.02,
  cornerSize: 16, cornerTransparent: 0.95, alphaSeen: 10, alphaOpaque: 200, minSubjectArea: 0.5, minLuminance: 0.18
});
export const ICON_SPEC_TEXT = 'PNG with transparent background · square · 1024×1024 recommended · one centred subject · no text';
export const ICON_MESSAGES = Object.freeze({
  type: 'Upload a PNG or WebP image.',
  size: 'That file is too large. The most is 8 MB.',
  dimensions: 'The image must be square (within 2%) and at least 512 × 512 pixels.',
  tooBig: 'The image is larger than 2048 × 2048 pixels. Please resize it (1024 × 1024 is ideal).',
  noAlpha: 'This image has no transparency. Please upload a PNG with a transparent background.',
  background: 'This image has a background. Please upload a PNG with a transparent background.',
  subject: 'The picture is too small inside the image. The subject should fill at least half of it.',
  dark: 'This image is too dark for the map. Please use a brighter picture.'
});

/** Dimension rules shared by every format. Returns an error code or null. */
export function checkDimensions(width, height) {
  const { minSide, maxSide, squareTolerance } = ICON_RULES;
  if (!(width >= minSide && height >= minSide) || Math.abs(width - height) / Math.max(width, height) > squareTolerance) return 'dimensions';
  if (width > maxSide || height > maxSide) return 'tooBig';
  return null;
}

/**
 * @param {{width:number, height:number, data:ArrayLike<number>}} rgba  8-bit RGBA, row by row
 * @returns {{code:string, message:string}|null} the first problem found, or null when the picture is fine
 */
export function checkPixels({ width, height, data }) {
  const { cornerSize: c, cornerTransparent, alphaSeen, alphaOpaque, minSubjectArea, minLuminance } = ICON_RULES;
  const alphaAt = (x, y) => data[(y * width + x) * 4 + 3];
  for (const [x0, y0] of [[0, 0], [width - c, 0], [0, height - c], [width - c, height - c]]) {
    let clear = 0;
    for (let y = y0; y < y0 + c; y++) for (let x = x0; x < x0 + c; x++) if (alphaAt(x, y) <= alphaSeen) clear++;
    if (clear / (c * c) < cornerTransparent) return fail('background');
  }
  let minX = width, minY = height, maxX = -1, maxY = -1, lumSum = 0, lumCount = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, a = data[i + 3];
    if (a > alphaSeen) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    if (a >= alphaOpaque) { lumSum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255; lumCount++; }
  }
  if (maxX < 0) return fail('subject');
  if (((maxX - minX + 1) * (maxY - minY + 1)) / (width * height) < minSubjectArea) return fail('subject');
  if (lumCount && lumSum / lumCount < minLuminance) return fail('dark');
  return null;
}
const fail = code => ({ code, message: ICON_MESSAGES[code] });

/** Trim the transparent margin and report the square (with the given margin share on each side) to cut the subject into. */
export function squareCrop({ width, height, data }, margin = 0.06) {
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[(y * width + x) * 4 + 3] > ICON_RULES.alphaSeen) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const w = maxX - minX + 1, h = maxY - minY + 1, side = Math.ceil(Math.max(w, h) / (1 - 2 * margin));
  return { sx: minX, sy: minY, sw: w, sh: h, side, dx: Math.round((side - w) / 2), dy: Math.round((side - h) / 2) };
}
