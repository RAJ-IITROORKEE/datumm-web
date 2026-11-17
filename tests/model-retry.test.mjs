import test from 'node:test';
import assert from 'node:assert/strict';
import {alternateModel, retryableFailure} from '../src/lib/model-retry.mjs';

const failed = (code, extra = {}) =>
  ({status: 'failed', mode: 'ask', data: {failure: {code}}, ...extra});

// @lat: [[contracts#Hosted contract tests#Composer queue, steer and retry]]
test('retry is offered only for a failed ask or plan turn with a provider code', () => {
  for (const code of ['provider_timeout', 'provider_unavailable', 'provider_schema_invalid']) {
    assert.equal(retryableFailure(failed(code)), true);
    assert.equal(retryableFailure(failed(code, {mode: 'plan'})), true);
    assert.equal(retryableFailure(failed(code, {mode: 'build'})), false);
    assert.equal(retryableFailure(failed(code, {status: 'needs_input'})), false);
  }
  const others = ['workflow_error', 'CANCELLED', 'native_busy', 'connection_error', undefined];
  for (const code of others) {
    assert.equal(retryableFailure(failed(code)), false);
  }
  assert.equal(retryableFailure(null), false);
  assert.equal(retryableFailure({status: 'failed'}), false);
});

test('retry is not offered on a run another owner holds', () => {
  const code = 'provider_timeout';
  assert.equal(retryableFailure(failed(code, {ownerId: 'user-b'}), 'user-a'), false);
  assert.equal(retryableFailure(failed(code, {ownerId: 'user-a'}), 'user-a'), true);
  // Task rows without an owner come from the owner-scoped task list.
  assert.equal(retryableFailure(failed(code), 'user-a'), true);
});

test('alternateModel prefers the default, never the current model', () => {
  const models = ['a/one', 'b/two', 'c/three'];
  assert.equal(alternateModel(models, 'b/two', 'a/one'), 'a/one');
  assert.equal(alternateModel(models, 'a/one', 'a/one'), 'b/two');
  assert.equal(alternateModel(models, 'c/three', 'z/unserved'), 'a/one');
  assert.equal(alternateModel(models, 'a/one', undefined), 'b/two');
  assert.equal(alternateModel(['a/one'], 'a/one', 'a/one'), null);
  assert.equal(alternateModel([], 'a/one', 'a/one'), null);
  assert.equal(alternateModel(undefined, 'a/one', 'a/one'), null);
});
