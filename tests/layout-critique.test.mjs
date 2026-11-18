import test from 'node:test';
import assert from 'node:assert/strict';
import { critiqueFor } from '../src/lib/layout-critique.mjs';

const plan = { planId: 'p1', version: 2, fingerprint: 'fp2' };
const binding = (over = {}) => ({ planId: 'p1', planVersion: 2, fingerprint: 'fp2', ...over });
const critic = (over = {}) => ({
  role: 'layout_critic', status: 'completed', binding: binding(),
  findings: [{ severity: 'concern', message: 'The kitchen has no daylight.', evidenceRefs: [] },
    { severity: 'info', message: 'The hall is generous.', evidenceRefs: [] },
    { severity: 'unknown', message: 'Outlook is unclear.', evidenceRefs: [] }], ...over,
});

test('a completed critic bound to this plan version shows its advice with plain labels', () => {
  const result = critiqueFor([{ role: 'report_preparer' }, critic()], plan);
  assert.equal(result.state, 'ready');
  assert.deepEqual(result.findings.map((row) => row.label), ['Concern', 'Note', 'Not sure']);
});

test('no critic result shows nothing', () => {
  for (const results of [undefined, null, [], 'x', [{ role: 'report_preparer', status: 'failed' }]]) assert.equal(critiqueFor(results, plan), null);
});

test('advice for another plan, version or fingerprint is never shown', () => {
  for (const other of [{ planId: 'p2' }, { planVersion: 1 }, { fingerprint: 'old' }, null])
    assert.equal(critiqueFor([critic({ binding: other ? binding(other) : undefined })], plan), null);
  assert.equal(critiqueFor([critic()], null), null);
});

test('a partial or failed review says it was not available', () => {
  for (const status of ['partial', 'failed']) {
    assert.deepEqual(critiqueFor([critic({ status, findings: [] })], plan), { state: 'unavailable' });
    assert.deepEqual(critiqueFor([critic({ status, binding: binding({ planVersion: 1 }) })], plan), { state: 'unavailable' });
  }
});

test('cancelled and stale reviews show nothing', () => {
  for (const status of ['cancelled', 'stale']) assert.equal(critiqueFor([critic({ status })], plan), null);
});

test('a matching completed review wins over an older failed one', () => {
  const failed = critic({ status: 'failed', binding: binding({ planVersion: 1 }) });
  assert.equal(critiqueFor([failed, critic()], plan).state, 'ready');
});

test('malformed findings are rejected as unavailable', () => {
  for (const findings of [null, 'x', [null], [{ severity: 'high', message: 'x' }], [{ severity: 'info', message: '' }], [{ severity: 'info' }]])
    assert.deepEqual(critiqueFor([critic({ findings })], plan), { state: 'unavailable' });
});

test('a completed review with no findings is ready and empty', () => {
  assert.deepEqual(critiqueFor([critic({ findings: [] })], plan), { state: 'ready', findings: [] });
});
