import test from 'node:test';
import assert from 'node:assert/strict';
import {HOST_CAPABILITY_FLAGS, HOST_SURFACES, missingHostMembers} from '../src/lib/host/contract.mjs';
import {createWebHost} from '../src/lib/host/web.mjs';

test('the web host implements every contract surface', () => {
  const host = createWebHost();
  assert.deepEqual(Object.keys(host).sort(), [...HOST_SURFACES].sort());
  assert.deepEqual(missingHostMembers(host), []);
  assert.ok(missingHostMembers({}).length > 0);
});

test('tasks.request keeps the same-origin, no-store proxy call the UI makes today', async () => {
  const calls = [];
  const host = createWebHost({fetcher: async (...args) => { calls.push(args); return new Response('{}'); }});
  await host.tasks.request('projects/p1/brief', {method: 'PUT'});
  assert.deepEqual(calls[0], ['/api/service/projects/p1/brief', {cache: 'no-store', credentials: 'same-origin', method: 'PUT'}]);
  assert.equal(host.tasks.url('runs/r1/export/concept'), '/api/service/runs/r1/export/concept');
});

test('native, settings and window report honest unavailability, and native cannot approve', () => {
  const host = createWebHost();
  for (const surface of ['native', 'settings', 'window']) {
    const status = host[surface].status();
    assert.equal(status.available, false);
    assert.match(status.reason, /\w/);
  }
  assert.deepEqual(Object.keys(host.native), ['status']);
});

test('capabilities: web hides desktop-only features and an unknown flag is off', () => {
  const {capabilities} = createWebHost();
  assert.deepEqual(HOST_CAPABILITY_FLAGS.filter(flag => capabilities.has(flag)), ['hostedTasks', 'attachments']);
  assert.equal(capabilities.has('somethingNew'), false);
});

test('attachments delegate to the existing composer rules', () => {
  const {attachments} = createWebHost();
  assert.equal(attachments.kindOf({type: 'image/png'}), 'image');
  const result = attachments.validate([], [{name: 'a.txt', type: 'text/plain', size: 1}]);
  assert.equal(result.errors[0].reason, 'unsupported');
});
