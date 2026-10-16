// Address normalization for the Red Bird neighborhood (Miami 33155). No DOM, no Node APIs.
export const NEIGHBORHOOD_ZIP = '33155';

const SUFFIXES = new Map([
  ['st', 'Street'], ['street', 'Street'], ['ave', 'Avenue'], ['av', 'Avenue'], ['avenue', 'Avenue'],
  ['ct', 'Court'], ['court', 'Court'], ['pl', 'Place'], ['place', 'Place'], ['dr', 'Drive'], ['drive', 'Drive'],
  ['ter', 'Terrace'], ['terr', 'Terrace'], ['terrace', 'Terrace'], ['ln', 'Lane'], ['lane', 'Lane'],
  ['rd', 'Road'], ['road', 'Road'], ['blvd', 'Boulevard'], ['boulevard', 'Boulevard'], ['way', 'Way']
]);
const DIRECTIONS = new Map([['sw', 'SW'], ['southwest', 'SW'], ['s', 'S'], ['south', 'S'], ['se', 'SE'], ['southeast', 'SE'], ['nw', 'NW'], ['northwest', 'NW'], ['ne', 'NE'], ['northeast', 'NE'], ['n', 'N'], ['north', 'N']]);
const TRAILING = /^(usa|us|fl|florida|miami|\d{5}(-\d{4})?)$/i;

export function ordinal(n) {
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th';
  return `${n}${suffix}`;
}

const titleCase = word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export function normalizeAddress(input) {
  const unparsed = { display: '', key: '', zip: null, warnings: ['unparsed'] };
  if (typeof input !== 'string') return unparsed;
  const tokens = input.replace(/[.,]/g, ' ').trim().split(/\s+/).filter(Boolean);
  let zip = null;
  while (tokens.length > 2 && TRAILING.test(tokens.at(-1))) {
    const last = tokens.pop();
    if (/^\d{5}/.test(last)) zip = last.slice(0, 5);
  }
  if (tokens.length < 3 || !/^\d+$/.test(tokens[0])) return unparsed;
  const number = tokens.shift();
  const suffix = SUFFIXES.get(tokens.pop().toLowerCase());
  const direction = DIRECTIONS.get(tokens[0]?.toLowerCase());
  if (!suffix || !direction || tokens.length < 2) return unparsed;
  tokens.shift();
  const street = tokens.map(word => {
    const numeric = word.match(/^(\d+)(st|nd|rd|th)?$/i);
    return numeric ? ordinal(Number(numeric[1])) : titleCase(word);
  }).join(' ');
  const display = `${number} ${direction} ${street} ${suffix}`;
  const key = `${number}|${direction}|${street.toUpperCase().replace(/ /g, '|')}|${suffix.toUpperCase()}`;
  const warnings = zip && zip !== NEIGHBORHOOD_ZIP ? ['zip_mismatch'] : [];
  return { display, key, zip, warnings };
}
