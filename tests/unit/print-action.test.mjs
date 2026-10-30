import test from 'node:test';
import assert from 'node:assert/strict';
import { printBlockedReason } from '../../assets/js/print/print-action.js';

const win = { print() {} };
const ua = s => ({ userAgent: s });

test('normal browsers can print', () => {
  assert.equal(printBlockedReason(ua('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), win), '');
  assert.equal(printBlockedReason(ua('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'), win), '');
  assert.equal(printBlockedReason(ua('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0'), win), '');
});

test('iPhone home-screen app and in-app browsers cannot print', () => {
  assert.equal(printBlockedReason({ ...ua('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148'), standalone: true }, win), 'ios-app');
  assert.equal(printBlockedReason(ua('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/FBIOS;FBAV/480.0]'), win), 'in-app');
  assert.equal(printBlockedReason(ua('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0'), win), 'in-app');
  assert.equal(printBlockedReason(ua('Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'), win), 'in-app');
  assert.equal(printBlockedReason(ua('Mozilla/5.0'), {}), 'unsupported');
});
