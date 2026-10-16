import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAddress } from '../../shared/address.mjs';

const cases = [
  ['5790 sw 35th st', '5790 SW 35th Street', '5790|SW|35TH|STREET'],
  ['3930 Southwest 60th Place, Miami, FL, USA', '3930 SW 60th Place', '3930|SW|60TH|PLACE'],
  ['3725 Sw 59 Avenue', '3725 SW 59th Avenue', '3725|SW|59TH|AVENUE'],
  ['5800 SW. 35th St.', '5800 SW 35th Street', '5800|SW|35TH|STREET'],
  ['6258 SW 39th St Miami, FL 33155', '6258 SW 39th Street', '6258|SW|39TH|STREET'],
  ['3615 SW 59 ave', '3615 SW 59th Avenue', '3615|SW|59TH|AVENUE'],
  ['3910 sw 60 pl', '3910 SW 60th Place', '3910|SW|60TH|PLACE'],
  ['3611 SW 60th Ct', '3611 SW 60th Court', '3611|SW|60TH|COURT'],
  ['3825 SW 58 Ave.', '3825 SW 58th Avenue', '3825|SW|58TH|AVENUE'],
  ['3810 sw 61st Avenue', '3810 SW 61st Avenue', '3810|SW|61ST|AVENUE'],
  ['3825 SW 62nd Ave', '3825 SW 62nd Avenue', '3825|SW|62ND|AVENUE'],
  ['5777 SW 40 St', '5777 SW 40th Street', '5777|SW|40TH|STREET'],
  ['6212 South Waterway Drive', '6212 S Waterway Drive', '6212|S|WATERWAY|DRIVE'],
  ['6078 S Waterway Drive', '6078 S Waterway Drive', '6078|S|WATERWAY|DRIVE'],
  ['3624 Southwest 58th Avenue', '3624 SW 58th Avenue', '3624|SW|58TH|AVENUE'],
  ['3700 SW 60th Avenue, Miami 33155', '3700 SW 60th Avenue', '3700|SW|60TH|AVENUE'],
  ['3821 SW 60th Avenue Miami fl 33155', '3821 SW 60th Avenue', '3821|SW|60TH|AVENUE'],
  ['1234 SW 63 Terrace', '1234 SW 63rd Terrace', '1234|SW|63RD|TERRACE'],
  ['1234 SW 11 Street', '1234 SW 11th Street', '1234|SW|11TH|STREET']
];
for (const [input, display, key] of cases) {
  test(`normalizes "${input}"`, () => {
    const r = normalizeAddress(input);
    assert.equal(r.display, display);
    assert.equal(r.key, key);
    assert.deepEqual(r.warnings, []);
  });
}
test('wrong zip warns zip_mismatch, correct zip does not', () => {
  assert.deepEqual(normalizeAddress('5778 SW 35th St, Miami, FL 33154').warnings, ['zip_mismatch']);
  assert.deepEqual(normalizeAddress('5778 SW 35th St, Miami, FL 33155').warnings, []);
});
test('unparsable input warns', () => {
  assert.deepEqual(normalizeAddress('the corner house').warnings, ['unparsed']);
  assert.deepEqual(normalizeAddress('').warnings, ['unparsed']);
  assert.deepEqual(normalizeAddress(null).warnings, ['unparsed']);
});
