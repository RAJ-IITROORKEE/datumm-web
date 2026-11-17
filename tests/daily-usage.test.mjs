import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyLimitMessage, dailyStatus, isDailyLimitMessage, parseDailyUsage} from '../src/lib/daily-usage.mjs';
import {emptyConfig, validateConfig} from '../src/lib/admin-config.mjs';

const body = (runs, modelCalls) => ({runs, modelCalls, resetsAt: '2026-11-19T00:00:00Z'});
const free = {used: 3, limit: null, left: null};

// @lat: [[contracts#Daily limits]]
test('parseDailyUsage accepts the route body and rejects anything malformed', () => {
  assert.deepEqual(parseDailyUsage(body({used: 2, limit: 5, left: 3}, free)),
    {runs: {used: 2, limit: 5, left: 3}, modelCalls: free, resetsAt: '2026-11-19T00:00:00Z'});
  for (const bad of [null, 'x', {}, body(free, null), body({used: -1, limit: null, left: null}, free),
    body({used: 1, limit: 5, left: null}, free), body({used: 1, limit: 5.5, left: 1}, free),
    body({used: '1', limit: null, left: null}, free), {...body(free, free), resetsAt: 7}]) {
    assert.equal(parseDailyUsage(bad), null, JSON.stringify(bad));
  }
});

test('the status line shows "N left today" only when a limit exists', () => {
  assert.equal(dailyStatus(parseDailyUsage(body(free, free))), null);
  assert.equal(dailyStatus(null), null);
  assert.equal(dailyStatus(parseDailyUsage(body({used: 2, limit: 5, left: 3}, free))), '3 left today');
  assert.equal(dailyStatus(parseDailyUsage(body({used: 4, limit: 5, left: 1}, free))), '1 left today');
  assert.equal(dailyStatus(parseDailyUsage(body(free, {used: 9, limit: 10, left: 1}))), '1 model call left today');
  // The tighter limit wins.
  assert.equal(dailyStatus(parseDailyUsage(body({used: 0, limit: 5, left: 5}, {used: 8, limit: 10, left: 2}))), '2 model calls left today');
});

test('a reached limit or a refused send shows the plain message', () => {
  const reached = parseDailyUsage(body({used: 5, limit: 5, left: 0}, free));
  assert.equal(dailyStatus(reached), "You've reached today's limit of 5 tasks. It resets at 00:00 UTC.");
  assert.equal(dailyStatus(parseDailyUsage(body(free, {used: 10, limit: 10, left: 0}))), "You've reached today's limit of 10 model calls. It resets at 00:00 UTC.");
  const refusal = dailyLimitMessage(3);
  assert.equal(dailyStatus(parseDailyUsage(body(free, free)), refusal), refusal);
  assert.equal(isDailyLimitMessage(refusal), true);
  for (const other of ['', undefined, 'Model is not enabled.', "You've reached today's limit of x tasks. It resets at 00:00 UTC."]) {
    assert.equal(isDailyLimitMessage(other), false);
    assert.equal(dailyStatus(parseDailyUsage(body(free, free)), other), null);
  }
});

test('dailyLimits are validated only when present and emptyConfig never adds them', () => {
  assert.equal('dailyLimits' in emptyConfig(), false);
  assert.deepEqual(validateConfig({...emptyConfig(), dailyLimits: {runs: null, modelCalls: 10000}}), {});
  assert.deepEqual(validateConfig({...emptyConfig(), dailyLimits: {runs: 1, modelCalls: null}}), {});
  for (const [field, value] of [['runs', 0], ['runs', 10001], ['modelCalls', 1.5], ['modelCalls', '5'], ['runs', -1]]) {
    const errors = validateConfig({...emptyConfig(), dailyLimits: {runs: null, modelCalls: null, [field]: value}});
    assert.ok(errors[`dailyLimits.${field}`], `${field} ${value}`);
  }
  assert.ok(validateConfig({...emptyConfig(), dailyLimits: []}).dailyLimits);
});
