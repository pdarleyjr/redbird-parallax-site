import test from 'node:test';
import assert from 'node:assert/strict';
import { compareNames, normalizeName, similarNames } from '../../shared/names.mjs';

test('emoji, curly quotes and case are cosmetic', () => {
  assert.equal(compareNames('Mickey & Minnie’s Halloween Party', "Mickey & Minnie's Halloween Party 🎃👻"), 'cosmetic');
  assert.equal(compareNames('The Haunted Spider House', 'the haunted spider house'), 'cosmetic');
  assert.equal(compareNames('Jurassic House', 'Jurassic House 🦖🦴'), 'cosmetic');
});
test('different names are name_changed', () => assert.equal(compareNames('Corner House of Horrors', 'The House of Screams'), 'name_changed'));
test('blank names normalize to empty', () => assert.equal(normalizeName('  🎃 '), ''));
test('similar names ignore a leading The and tolerate small edits', () => {
  assert.equal(similarNames('The Skeleton House', 'Skeleton House'), true);
  assert.equal(similarNames('The Skeleton House', 'Skeleton Houze'), true);
  assert.equal(similarNames('Skeleton Dog', 'Jurassic House'), false);
});
