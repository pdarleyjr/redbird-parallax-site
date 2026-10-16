import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toRegistrations } from '../../shared/csv.mjs';

test('parses RFC 4180 quoting, BOM, CRLF and embedded newlines', () => {
  const text = '﻿"a","b ","c"\r\n"1","x,y","line1\nline2"\r\n"2","say ""hi""",""\r\n';
  const { header, rows } = parseCsv(text);
  assert.deepEqual(header, ['a', 'b ', 'c']);
  assert.deepEqual(rows, [['1', 'x,y', 'line1\nline2'], ['2', 'say "hi"', '']]);
});
test('toRegistrations keeps only submittedOn, address, houseName and aliases headers', () => {
  const text = '"Submission Date","Your Name","Address ","Give Your House a Halloween Name","Contact Email","Contact Phone Number"\n"Oct 9, 2026","N","1 SW 1st St","Boo","e@example.invalid","000"\n';
  const out = toRegistrations(parseCsv(text));
  assert.deepEqual(out.registrations, [{ rowIndex: 0, submittedOn: '2026-10-09', address: '1 SW 1st St', houseName: 'Boo' }]);
  assert.deepEqual([...out.ignoredColumns].sort(), ['Contact Email', 'Contact Phone Number', 'Your Name']);
  assert.ok(!JSON.stringify(out.registrations).includes('example.invalid'));
});
test('missing required columns throw', () => assert.throws(() => toRegistrations(parseCsv('"x"\n"1"\n')), /Address/));
