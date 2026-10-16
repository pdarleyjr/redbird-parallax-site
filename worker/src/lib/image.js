// Reading just enough of PNG and WebP files to validate an upload: type, size and transparency from the headers, and the full
// pixels of PNG (decoded with the platform's inflate). No dependencies.
const u32 = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const le24 = (b, o) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function sniff(bytes) {
  if (bytes.length > 12 && PNG_SIG.every((v, i) => bytes[i] === v)) return 'png';
  if (bytes.length > 16 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  return null;
}

/** WebP header: {width, height, alpha} from the first chunk (VP8X, VP8L or VP8). */
export function webpInfo(bytes) {
  const kind = ascii(bytes, 12, 4);
  if (kind === 'VP8X') return { width: le24(bytes, 24) + 1, height: le24(bytes, 27) + 1, alpha: (bytes[20] & 0x10) !== 0 };
  if (kind === 'VP8L' && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, alpha: ((bits >> 28) & 1) === 1 };
  }
  if (kind === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff, alpha: false };
  return null;
}

function chunks(bytes) {
  const out = [];
  for (let o = 8; o + 12 <= bytes.length;) {
    const len = u32(bytes, o), type = ascii(bytes, o + 4, 4);
    if (o + 12 + len > bytes.length) break;
    out.push({ type, data: bytes.subarray(o + 8, o + 8 + len) });
    o += 12 + len;
    if (type === 'IEND') break;
  }
  return out;
}

/** PNG header: {width, height, alpha (colour type carries transparency, or a tRNS chunk exists), interlaced}. */
export function pngInfo(bytes) {
  const list = chunks(bytes), ihdr = list.find(c => c.type === 'IHDR');
  if (!ihdr || ihdr.data.length < 13) return null;
  const d = ihdr.data, colorType = d[9];
  return { width: u32(d, 0), height: u32(d, 4), bitDepth: d[8], colorType, interlaced: d[12] === 1, alpha: colorType === 4 || colorType === 6 || list.some(c => c.type === 'tRNS') };
}

async function inflate(parts) {
  const stream = new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Decode a non-interlaced PNG to 8-bit RGBA. Throws Error('unsupported') for what it cannot read. */
export async function decodePng(bytes) {
  const list = chunks(bytes), info = pngInfo(bytes);
  if (!info || info.interlaced) throw new Error('unsupported');
  const { width, height, bitDepth, colorType } = info;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels || ![1, 2, 4, 8, 16].includes(bitDepth)) throw new Error('unsupported');
  const raw = await inflate(list.filter(c => c.type === 'IDAT').map(c => c.data));
  const bpp = Math.max(1, (channels * bitDepth) >> 3), stride = Math.ceil((width * channels * bitDepth) / 8);
  if (raw.length < (stride + 1) * height) throw new Error('unsupported');
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride, prev = dst - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[prev + x] : 0, c = x >= bpp && y ? px[prev + x - bpp] : 0;
      let v = raw[src + x];
      if (filter === 1) v += a; else if (filter === 2) v += b; else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (filter > 4) throw new Error('unsupported');
      px[dst + x] = v & 255;
    }
  }
  const palette = list.find(c => c.type === 'PLTE')?.data, trns = list.find(c => c.type === 'tRNS')?.data;
  const data = new Uint8Array(width * height * 4);
  const sample = (row, i) => {            // i-th sample of a row at any bit depth (16-bit keeps the high byte; palette indexes stay raw)
    if (bitDepth === 8) return px[row + i];
    if (bitDepth === 16) return px[row + i * 2];
    const per = 8 / bitDepth, byte = px[row + Math.floor(i / per)], shift = 8 - bitDepth * ((i % per) + 1);
    return (byte >> shift) & ((1 << bitDepth) - 1);
  };
  const scale = bitDepth < 8 && colorType !== 3 ? 255 / ((1 << bitDepth) - 1) : 1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const row = y * stride, o = (y * width + x) * 4, i = x * channels;
    if (colorType === 3) {
      const k = sample(row, x);
      data[o] = palette?.[k * 3] ?? 0; data[o + 1] = palette?.[k * 3 + 1] ?? 0; data[o + 2] = palette?.[k * 3 + 2] ?? 0; data[o + 3] = trns && k < trns.length ? trns[k] : 255;
    } else if (colorType === 0) { const g = sample(row, i) * scale; data[o] = data[o + 1] = data[o + 2] = g; data[o + 3] = 255; }
    else if (colorType === 4) { const g = sample(row, i) * scale; data[o] = data[o + 1] = data[o + 2] = g; data[o + 3] = sample(row, i + 1) * scale; }
    else if (colorType === 2) { data[o] = sample(row, i) * scale; data[o + 1] = sample(row, i + 1) * scale; data[o + 2] = sample(row, i + 2) * scale; data[o + 3] = 255; }
    else { data[o] = sample(row, i) * scale; data[o + 1] = sample(row, i + 1) * scale; data[o + 2] = sample(row, i + 2) * scale; data[o + 3] = sample(row, i + 3) * scale; }
  }
  return { width, height, data };
}
