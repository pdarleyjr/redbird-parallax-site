// House-name comparison: ignore emoji, case, curly quotes and spacing.
export function normalizeName(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
    .replace(/[‘’‚′`]/g, "'").replace(/[“”„″]/g, '"')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

export function compareNames(published, submitted) {
  return normalizeName(published) === normalizeName(submitted) ? 'cosmetic' : 'name_changed';
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const held = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = held;
    }
  }
  return row[b.length];
}

export function similarNames(a, b) {
  const strip = value => normalizeName(value).replace(/^the /, '');
  const [x, y] = [strip(a), strip(b)];
  if (!x || !y) return false;
  if (x === y) return true;
  return levenshtein(x, y) / Math.max(x.length, y.length) <= 0.25;
}
