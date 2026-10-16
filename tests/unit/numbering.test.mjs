import test from 'node:test';
import assert from 'node:assert/strict';
import { nextNumber, idForNumber } from '../../shared/numbering.mjs';

test('next number is max+1 including archived', () => assert.equal(nextNumber([{ mapNumber: 1 }, { mapNumber: 31 }, { mapNumber: 7 }]), 32));
test('empty starts at 1', () => assert.equal(nextNumber([]), 1));
test('ids are padded stop-NN', () => {
  assert.equal(idForNumber(5), 'stop-05');
  assert.equal(idForNumber(46), 'stop-46');
  assert.equal(idForNumber(100), 'stop-100');
});
