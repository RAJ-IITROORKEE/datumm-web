import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePreview, previewBody } from '../src/lib/skill-preview.mjs';

const skill = { id: 'a', name: 'A', description: 'd', instructions: 'i', modes: ['ask'], enabled: true,
  extra: 'dropped' };

// @lat: [[contracts#Hosted contract tests#Skill preview]]
test('the body carries prompt, mode and the six skill fields only', () => {
  assert.deepEqual(previewBody({ prompt: '  exits  ', mode: 'plan', skills: [skill] }), {
    prompt: 'exits', mode: 'plan', skills: [{ id: 'a', name: 'A', description: 'd',
      instructions: 'i', modes: ['ask'], enabled: true }] });
});

test('an empty prompt, unknown mode or more than 30 skills gives no body', () => {
  assert.equal(previewBody({ prompt: '  ', mode: 'ask', skills: [] }), null);
  assert.equal(previewBody({ prompt: 'x', mode: 'dev', skills: [] }), null);
  assert.equal(previewBody({ prompt: 'x'.repeat(2001), mode: 'ask', skills: [] }), null);
  assert.equal(previewBody({ prompt: 'x', mode: 'ask', skills: Array(31).fill(skill) }), null);
});

test('the response is read defensively: ids only, attached is a string or null', () => {
  assert.deepEqual(parsePreview({ listed: ['a', 'b'], attached: 'a', other: 1 }),
    { listed: ['a', 'b'], attached: 'a' });
  assert.deepEqual(parsePreview({ listed: [], attached: null }), { listed: [], attached: null });
  assert.deepEqual(parsePreview({ listed: ['a', 3, {}, 'Bad Id'] }), { listed: ['a'], attached: null });
  assert.deepEqual(parsePreview({ listed: ['a'], attached: 7 }), { listed: ['a'], attached: null });
  assert.equal(parsePreview({ attached: 'a' }), null);
  assert.equal(parsePreview(null), null);
  assert.equal(parsePreview([]), null);
});
