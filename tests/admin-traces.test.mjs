import test from 'node:test';
import assert from 'node:assert/strict';
import {
  feedbackLabel, formatDuration, formatTokens, formatUsd, parseTraces, stepsSummary, traceQuery,
} from '../src/lib/admin-traces.mjs';

const TURN = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const steps = (extra = {}) => ({
  total: 5, succeeded: 4, failed: 1, skipped: 0, stopped: 0, retried: 1, unconfirmed: 0, ...extra,
});
const row = (extra = {}) => ({
  traceId: '0f8c3a52-1b1c-4a8e-9d0f-111111111111', taskId: 'task-1', turnId: TURN,
  at: '2026-11-16T09:00:00Z', ownerHash: '0123456789abcdef', mode: 'ask', reasoningEffort: 'high',
  requestedModel: 'openai/gpt-6-luna', servedModels: ['openai/gpt-6-luna'],
  status: 'completed', outcome: 'completed', failureCode: null, recoveryAction: null,
  durationMs: 4200, modelMs: 3100, steps: steps(),
  tools: [{ name: 'web.search', calls: 2, failed: 1 }],
  specialists: [{ role: 'structure', outcome: 'completed', durationMs: 900 }],
  calls: [{ role: 'planner', modelId: 'openai/gpt-6-luna', status: 'settled', finishReason: 'stop',
    inputTokens: 1200, outputTokens: 300, reasoningTokens: 50, durationMs: 3100, usd: '0.0123',
    failureCode: null }],
  callsTruncated: false, tokens: { input: 1200, output: 300, reasoning: 50 }, usd: '0.0123',
  signals: ['retried'],
  feedback: { rating: 'down', reason: 'too_long', at: '2026-11-16T09:05:00Z' },
  ...extra,
});
const doc = (rows = [row()], extra = {}) => ({
  schemaVersion: 1, from: '2026-11-09T09:00:00Z', to: '2026-11-16T09:00:00Z',
  nextCursor: 'abc_123-XYZ',
  stats: { turns: 1, scanned: 1, truncated: false, failed: 0, p50Ms: 4200, p95Ms: 4200,
    inputTokens: 1200, outputTokens: 300, usd: '0.0123',
    feedback: { up: 0, down: 1, reasons: { too_long: 1 } } },
  rows, ...extra,
});

// @lat: [[contracts#Hosted contract tests#Admin traces parsing]]
test('rows keep only allowlisted keys, at every nesting level', () => {
  const keys = Object.keys(parseTraces(doc()).rows[0]).sort();
  const parsed = parseTraces(doc([row({
    question: 'CANARY-7f3 question', answer: 'CANARY-7f3', detail: 'CANARY-7f3', note: 'CANARY-7f3',
    owner: 'user_2abc', steps: { total: 1, prompt: 'CANARY-7f3' },
    tools: [{ name: 'web.search', calls: 1, failed: 0, args: 'CANARY-7f3' }],
    calls: [{ role: 'planner', modelId: 'm', title: 'CANARY-7f3' }],
    feedback: { rating: 'up', reason: null, at: null, note: 'CANARY-7f3' },
  })], { debug: 'CANARY-7f3', stats: { ...doc().stats, prompt: 'CANARY-7f3' } }));
  assert.deepEqual(Object.keys(parsed.rows[0]).sort(), keys);
  assert.ok(!JSON.stringify(parsed).includes('CANARY'), 'no unknown value survives');
  assert.deepEqual(Object.keys(parsed).sort(), ['from', 'nextCursor', 'rows', 'stats', 'to']);
  assert.deepEqual(Object.keys(parsed.rows[0].calls[0]).sort(), ['durationMs', 'failureCode',
    'finishReason', 'inputTokens', 'modelId', 'outputTokens', 'reasoningTokens', 'role', 'status',
    'usd']);
});

test('a turn id is kept only in the UUID form the web client generates', () => {
  const turnOf = turnId => parseTraces(doc([row({ turnId })])).rows[0].turnId;
  assert.equal(turnOf(TURN), TURN);
  const hostile = ['patient.john-doe:ssn-123-45-6789', 'turn-0001', TURN.toUpperCase(),
    `${TURN}x`, 7, null];
  for (const value of hostile) assert.equal(turnOf(value), null, String(value));
});

test('hostile strings and numbers are dropped or clamped, not displayed', () => {
  const parsed = parseTraces(doc([row({
    requestedModel: 'bad model <script>', servedModels: ['ok/model', 'x y', 7],
    ownerHash: 'user_2abcdefghijk', at: 'not a date', outcome: 'exploded', durationMs: -5,
    modelMs: 'slow', usd: 'free', signals: ['retried', 'made_up', 7],
    tokens: { input: -1, output: 1.9, reasoning: NaN }, tools: [{ name: 'has space', calls: 1 }],
    feedback: { rating: 'sideways' },
  })], { nextCursor: '<script>' }));
  const [first] = parsed.rows;
  assert.equal(first.requestedModel, null);
  assert.deepEqual(first.servedModels, ['ok/model']);
  assert.equal(first.ownerHash, null);
  assert.equal(first.at, null);
  assert.equal(first.outcome, 'other');
  assert.equal(first.durationMs, null);
  assert.equal(first.modelMs, null);
  assert.equal(first.usd, null);
  assert.deepEqual(first.signals, ['retried']);
  assert.deepEqual(first.tokens, { input: 0, output: 1, reasoning: 0 });
  assert.deepEqual(first.tools, []);
  assert.equal(first.feedback, null);
  assert.equal(parsed.nextCursor, null);
});

test('usd matches the backend quantized form: up to 10 digits and 12 decimals', () => {
  const usdOf = usd => parseTraces(doc([row({ usd })])).rows[0].usd;
  for (const ok of ['0', '0.5', '0.000000000001', '1234567890.123456789012']) {
    assert.equal(usdOf(ok), ok);
  }
  const bad = ['0.0000000000001', '12345678901', '1.', '.5', '-1', '1e-7', '0E-12',
    1e-7, -1, Infinity];
  for (const value of bad) assert.equal(usdOf(value), null, String(value));
  assert.equal(usdOf(0.25), '0.25');
});

test('rows are bounded and malformed documents are rejected', () => {
  const many = Array.from({ length: 50 }, (_, i) => ({ role: 'planner', modelId: `m${i}` }));
  assert.equal(parseTraces(doc([row({ calls: many })])).rows[0].calls.length, 40);
  const sparse = parseTraces(doc([row({ calls: [{ role: 'planner', modelId: 'bad model',
    status: 'failed', finishReason: null, inputTokens: null, outputTokens: null,
    reasoningTokens: null, durationMs: 10, usd: null, failureCode: 'provider_timeout' }] })]))
    .rows[0].calls[0];
  assert.deepEqual([sparse.modelId, sparse.inputTokens, sparse.outputTokens, sparse.reasoningTokens,
    sparse.usd], [null, null, null, null, null]);
  assert.equal(parseTraces(doc([{ nope: 1 }, null, 'x', row()])).rows.length, 1,
    'a row without a trace id is dropped');
  const malformed = [null, 'x', [], {}, { schemaVersion: 2, rows: [] }, { schemaVersion: 1 },
    { schemaVersion: 1, rows: 'x' }];
  for (const bad of malformed) assert.equal(parseTraces(bad), null);
  assert.equal(parseTraces({ schemaVersion: 1, rows: [] }).stats.turns, 0,
    'missing stats become zeros');
  const unknownTimes = { stats: { ...doc().stats, p50Ms: null, p95Ms: null, usd: null } };
  assert.equal(parseTraces(doc([], unknownTimes)).stats.p95Ms, null);
});

test('the query builder always sends a valid period and drops invalid filters', () => {
  assert.equal(traceQuery(), '?period=7d');
  assert.equal(traceQuery({ period: '30d', outcome: 'failed', feedback: 'down', signal: 'retried',
    owner: '0123456789abcdef', mode: 'ask', model: 'openai/gpt-6-luna', cursor: 'abc_1' }),
  '?period=30d&mode=ask&model=openai%2Fgpt-6-luna&outcome=failed&feedback=down'
    + '&owner=0123456789abcdef&signal=retried&cursor=abc_1');
  assert.equal(traceQuery({ period: '1y', outcome: 'exploded', feedback: 'maybe',
    owner: 'user_2abc', signal: 'x', mode: 'a b', cursor: '<x>' }), '?period=7d');
});

test('formatters never claim a value they do not have', () => {
  assert.equal(formatTokens({ input: null, output: 5 }), '— in · 5 out');
  assert.equal(formatDuration(null), '—');
  assert.equal(formatDuration(850), '850 ms');
  assert.equal(formatDuration(4200), '4.2 s');
  assert.equal(formatDuration(125000), '2 min 5 s');
  assert.equal(formatUsd(null), '—');
  assert.equal(formatUsd('0.0123'), '$0.0123');
  assert.equal(formatUsd('12.5'), '$12.50');
  assert.equal(feedbackLabel(null), 'None');
  assert.equal(feedbackLabel({ rating: 'up', reason: null }), 'Up');
  assert.equal(feedbackLabel({ rating: 'down', reason: 'inaccurate' }), 'Down · Inaccurate');
  assert.equal(feedbackLabel({ rating: 'down', reason: null }), 'Down');
  assert.equal(stepsSummary(steps()), '5 steps · 1 failed · 1 retried');
  const one = steps({ total: 1, succeeded: 1, failed: 0, retried: 0 });
  assert.equal(stepsSummary(one), '1 step');
});

test('durations round to whole seconds before splitting minutes', () => {
  assert.equal(formatDuration(119600), '2 min 0 s');
  assert.equal(formatDuration(119400), '1 min 59 s');
  assert.equal(formatDuration(60000), '1 min 0 s');
  assert.equal(formatDuration(59960), '1 min 0 s');
  assert.equal(formatDuration(59940), '59.9 s');
});
