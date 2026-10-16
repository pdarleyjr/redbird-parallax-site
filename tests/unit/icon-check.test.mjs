import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDimensions, checkPixels, squareCrop, ICON_MESSAGES, ICON_SPEC_TEXT } from '../../shared/icon-check.mjs';
import { configureIcons, iconURL, isUploadedIcon } from '../../shared/icon-url.mjs';

/** size x size RGBA with a disc: inside colour `rgb`, outside transparent (or opaque white when `opaqueBackground`). */
function image(size, radius, rgb = [250, 160, 60], opaqueBackground = false) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, inside = Math.hypot(x - size / 2, y - size / 2) <= radius;
    if (inside) data.set([...rgb, 255], i); else data.set(opaqueBackground ? [255, 255, 255, 255] : [0, 0, 0, 0], i);
  }
  return { width: size, height: size, data };
}

test('dimensions: square within 2%, at least 512, at most 2048', () => {
  assert.equal(checkDimensions(1024, 1024), null);
  assert.equal(checkDimensions(1024, 1010), null);
  assert.equal(checkDimensions(1024, 900), 'dimensions');
  assert.equal(checkDimensions(256, 256), 'dimensions');
  assert.equal(checkDimensions(4096, 4096), 'tooBig');
});

test('a transparent picture with a big bright subject passes', () => assert.equal(checkPixels(image(600, 250)), null));

test('opaque corners are a background, with the exact message', () => {
  const problem = checkPixels(image(600, 250, [250, 160, 60], true));
  assert.equal(problem.code, 'background');
  assert.equal(problem.message, 'This image has a background. Please upload a PNG with a transparent background.');
});

test('a subject covering less than half of the canvas is refused', () => assert.equal(checkPixels(image(600, 150)).code, 'subject'));

test('an almost entirely dark picture is too dark for the map', () => assert.equal(checkPixels(image(600, 250, [12, 12, 18])).code, 'dark'));

test('trimming and centring: the subject gets a 6% margin on a square canvas', () => {
  const { width, height, data } = image(600, 200);
  const crop = squareCrop({ width, height, data }, 0.06);
  assert.ok(Math.abs(crop.sw - 401) <= 2 && Math.abs(crop.sh - 401) <= 2);
  assert.ok(Math.abs(crop.side - crop.sw / 0.88) <= 2);
  assert.ok(Math.abs(crop.dx - (crop.side - crop.sw) / 2) <= 1);
});

test('the spec text matches the one given to the owner', () => assert.equal(ICON_SPEC_TEXT, 'PNG with transparent background · square · 1024×1024 recommended · one centred subject · no text'));
test('every refusal has a human message', () => { for (const m of Object.values(ICON_MESSAGES)) assert.ok(m.length > 20); });

test('icon URLs: built-in icons are site files; uploads come from the API by versioned key', () => {
  configureIcons(null);
  assert.equal(iconURL('ghost', 'https://x.test/'), 'https://x.test/assets/img/markers/ghost.webp');
  assert.equal(iconURL('up-pumpkin-0a1b2c3d', 'https://x.test/'), 'https://x.test/assets/img/markers/up-pumpkin-0a1b2c3d.webp', 'no API configured yet: falls back to a file path');
  configureIcons('https://api.test/');
  assert.equal(iconURL('up-pumpkin-0a1b2c3d', 'https://x.test/'), 'https://api.test/v1/icons/up-pumpkin-0a1b2c3d.webp');
  assert.equal(iconURL('up-pumpkin-0a1b2c3d', 'https://x.test/', { small: true }), 'https://api.test/v1/icons/128/up-pumpkin-0a1b2c3d.webp');
  assert.equal(iconURL('ghost', 'https://x.test/'), 'https://x.test/assets/img/markers/ghost.webp');
  assert.equal(isUploadedIcon('ghost'), false);
  configureIcons(null);
});
