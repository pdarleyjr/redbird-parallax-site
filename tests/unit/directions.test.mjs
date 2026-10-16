import test from 'node:test';
import assert from 'node:assert/strict';
import { directionsURL, isApplePlatform } from '../../shared/directions.mjs';

test('Apple and Google links contain only the destination', () => {
  assert.equal(directionsURL({ lat: 25.7, lng: -80.2 }, true), 'https://maps.apple.com/?daddr=25.7,-80.2&dirflg=w');
  assert.equal(directionsURL({ lat: 25.7, lng: -80.2 }, false), 'https://www.google.com/maps/dir/?api=1&destination=25.7,-80.2&travelmode=walking');
});
test('non-finite coordinates throw', () => assert.throws(() => directionsURL({ lat: null, lng: 1 }, false)));
test('platform detection', () => {
  assert.equal(isApplePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), true);
  assert.equal(isApplePlatform('Mozilla/5.0 (Linux; Android 14)'), false);
});
