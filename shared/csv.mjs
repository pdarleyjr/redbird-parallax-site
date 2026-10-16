// RFC 4180 parser plus a privacy-minimizing mapper: only date, address and house name survive.
export function parseCsv(input) {
  const text = String(input).replace(/^﻿/, '');
  const records = [];
  let row = [], field = '', quoted = false, any = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; any = true; }
    else if (c === ',') { row.push(field); field = ''; any = true; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (any || field) { row.push(field); records.push(row); }
      row = []; field = ''; any = false;
    } else { field += c; any = true; }
  }
  if (any || field) { row.push(field); records.push(row); }
  const [header = [], ...rows] = records;
  return { header, rows };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function parseSubmissionDate(value) {
  const text = String(value || '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = text.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})/);
  const month = named && MONTHS.indexOf(named[1].toLowerCase());
  if (!named || month < 0) return null;
  return `${named[3]}-${String(month + 1).padStart(2, '0')}-${named[2].padStart(2, '0')}`;
}

const ALIASES = {
  submittedOn: [/^submission date$/i, /^submitted( on)?$/i, /^date$/i],
  address: [/^address$/i, /^house address$/i],
  houseName: [/halloween name/i, /^house name$/i, /^name of house$/i]
};

export function toRegistrations({ header, rows }) {
  const index = {};
  for (const [field, patterns] of Object.entries(ALIASES)) {
    index[field] = header.findIndex(h => patterns.some(p => p.test(h.trim())));
  }
  if (index.address < 0) throw new Error('Could not find an Address column.');
  if (index.houseName < 0) throw new Error('Could not find a house name column.');
  const used = new Set(Object.values(index));
  const ignoredColumns = header.filter((_, i) => !used.has(i)).map(h => h.trim());
  const registrations = rows.map((row, rowIndex) => ({
    rowIndex,
    submittedOn: index.submittedOn >= 0 ? parseSubmissionDate(row[index.submittedOn]) : null,
    address: (row[index.address] || '').trim(),
    houseName: (row[index.houseName] || '').trim()
  }));
  return { registrations, ignoredColumns };
}
