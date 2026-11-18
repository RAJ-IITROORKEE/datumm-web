import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseDevice } from '../src/lib/device-choice.mjs';

const a = { id: 'a', online: false }, b = { id: 'b', online: true }, c = { id: 'c', online: true };

test('chooseDevice keeps an online choice and never overrides it with another device', () => {
  assert.equal(chooseDevice('c', [a, b, c]), 'c');
});

test('chooseDevice picks the first online device when there is no choice or it went offline', () => {
  assert.equal(chooseDevice('', [a, b, c]), 'b');
  assert.equal(chooseDevice('a', [a, b]), 'b');
  assert.equal(chooseDevice('gone', [a, b]), 'b');
});

test('chooseDevice keeps the previous choice when nothing is online', () => {
  assert.equal(chooseDevice('a', [a]), 'a');
  assert.equal(chooseDevice(undefined, [a]), '');
});
