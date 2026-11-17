import test from 'node:test';
import assert from 'node:assert/strict';
import {contextPercent, formatTokens, meterReading, meterTone, ringDash, usageBelongsTo}
  from '../src/lib/context-meter.mjs';

const usage = (context = {}, extra = {}) => ({
  rootTaskId: 't1',
  context: {
    modelCapacityTokens: 200000, estimatedInputTokens: 9000, lastProviderCallState: 'completed',
    lastProviderInputTokens: 10000, lastProviderOutputTokens: 2000,
    lastProviderReportedUsd: '0.0123',
    ...context,
  },
  cumulative: {modelCalls: 4},
  ...extra,
});

test('completed call uses provider input plus output', () => {
  const reading = meterReading(usage());
  assert.deepEqual(reading, {used: 12000, max: 200000, percent: 6, estimated: false,
    input: 10000, output: 2000, usd: 0.0123, calls: 4});
});

test('running call falls back to the labelled estimate', () => {
  const reading = meterReading(usage({lastProviderCallState: 'running'}));
  assert.equal(reading.used, 9000);
  assert.equal(reading.estimated, true);
  assert.equal(reading.input, null);
});

test('unknown window gives no percent; bad numbers never become 0%', () => {
  assert.equal(meterReading(usage({modelCapacityTokens: null})).percent, null);
  assert.equal(meterReading(usage({modelCapacityTokens: 0})).max, null);
  assert.equal(meterReading(usage({lastProviderInputTokens: -1})).estimated, true);
  assert.equal(meterReading(usage({lastProviderInputTokens: NaN})).used, 9000);
  const none = usage({lastProviderInputTokens: undefined, estimatedInputTokens: undefined});
  assert.equal(meterReading(none), null);
  assert.equal(meterReading(undefined), null);
  const negative = usage({estimatedInputTokens: -5, lastProviderCallState: 'running'});
  assert.equal(meterReading(negative), null);
});

test('usage of another task or owner is rejected', () => {
  assert.equal(usageBelongsTo(usage(), 't1'), true);
  assert.equal(usageBelongsTo(usage(), 't2'), false);
  assert.equal(usageBelongsTo(usage({}, {ownerTaskId: 'other'}), 't1'), false);
  const ledger = usage({}, {scope: 'execution_ledger', ownerTaskId: 't1', ledgerExecutionId: 'e'});
  assert.equal(usageBelongsTo(ledger, 't1'), true);
  assert.equal(usageBelongsTo({...ledger, ledgerExecutionId: ''}, 't1'), false);
  assert.equal(usageBelongsTo(undefined, 't1'), false);
});

test('cost accepts only finite numbers or numeric strings', () => {
  const usd = value => meterReading(usage({lastProviderReportedUsd: value})).usd;
  assert.equal(usd('0.5'), 0.5);
  assert.equal(usd(0.25), 0.25);
  for (const bad of ['', '  ', true, false, [], null, undefined, 'abc', '-1', Infinity]) {
    assert.equal(usd(bad), null, String(bad));
  }
});

test('tone thresholds', () => {
  assert.equal(meterTone(69.9), 'neutral');
  assert.equal(meterTone(70), 'warning');
  assert.equal(meterTone(90), 'warning');
  assert.equal(meterTone(90.1), 'danger');
  assert.equal(meterTone(null), 'neutral');
});

test('ring dash clamps and percent needs a window', () => {
  assert.equal(ringDash(-5, 100).dash, 0);
  assert.equal(ringDash(50, 100).dash, 50);
  assert.equal(ringDash(250, 100).dash, 100);
  assert.equal(contextPercent(1, 0), null);
  assert.equal(contextPercent(50, 200), 25);
});

test('token formatting', () => {
  assert.equal(formatTokens(999), '999');
  assert.equal(formatTokens(1200), '1.2K');
  assert.equal(formatTokens(200000), '200K');
  assert.equal(formatTokens(1000000), '1M');
  assert.equal(formatTokens(999999), '1M');
});
