import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDuration, formatTokens, formatUsd, initialExpanded, nodeMeta, parseRunSteps, treeKey, treeRows, visibleRows} from '../src/lib/run-steps.mjs';

const node = (label, extra = {}) => ({kind: 'stage', label, startedAt: '2026-11-18T10:00:00+00:00', durationMs: 1500, status: 'succeeded',
  model: null, tokens: null, usd: null, children: [], ...extra});
const body = {schemaVersion: 1, runs: [{runId: 'run-1', startedAt: '2026-11-18T10:00:00+00:00', status: 'completed', truncated: false, children: [
  node('Model call · gpt-6-luna', {kind: 'model', model: 'openai/gpt-6-luna', tokens: {input: 1200, output: 300}, usd: '0.012300000000',
    children: [node('Agent step', {children: [node('Tool · Revit read: rooms', {kind: 'tool', durationMs: 420})]})]}),
  node('Question asked', {kind: 'question', status: 'waiting', durationMs: null})]}]};

// @lat: [[contracts#Run steps tree]]
test('parseRunSteps keeps a valid v1 body and drops what it cannot trust', () => {
  const parsed = parseRunSteps(body);
  assert.equal(parsed.runs[0].children[0].children[0].children[0].label, 'Tool · Revit read: rooms');
  for (const bad of [null, 'x', {}, {schemaVersion: 2, runs: []}, {schemaVersion: 1, runs: 'x'}]) assert.equal(parseRunSteps(bad), null);
  const messy = parseRunSteps({schemaVersion: 1, runs: [{runId: ''}, null, {runId: 'r', startedAt: 5, status: 7, children: [
    {kind: 'weird', label: 'x'}, {kind: 'tool', label: ''}, node('ok', {status: 'bogus', durationMs: -1, usd: '1e3', tokens: {input: 'x', output: 1}}), 'x']}]});
  assert.equal(messy.runs.length, 1);
  assert.deepEqual(messy.runs[0].children.map(child => [child.label, child.status, child.durationMs, child.usd, child.tokens]), [['ok', 'unknown', null, null, null]]);
  assert.equal(messy.runs[0].startedAt, null);
  assert.equal(messy.runs[0].status, 'other');
});

test('nesting deeper than the contract allows is cut instead of recursed', () => {
  let deep = node('leaf');
  for (let i = 0; i < 20; i += 1) deep = node(`n${i}`, {children: [deep]});
  const depth = nodes => nodes.length ? 1 + depth(nodes[0].children) : 0;
  assert.ok(depth(parseRunSteps({schemaVersion: 1, runs: [{runId: 'r', children: [deep]}]}).runs[0].children) <= 6);
});

test('durations, tokens and cost read plainly and show nothing when missing', () => {
  assert.deepEqual([420, 1500, 61_000, null, -1].map(formatDuration), ['420 ms', '1.5 s', '1 min 1 s', '', '']);
  assert.deepEqual(['0.012300000000', '0', '2.5', null, 'x'].map(formatUsd), ['$0.0123', '$0', '$2.50', '', '']);
  assert.equal(formatTokens({input: 1200, output: 300}), '1,200 in · 300 out');
  assert.equal(nodeMeta(node('x', {tokens: {input: 1, output: 2}, usd: '0.5'})), '1.5 s · 1 in · 2 out · $0.5000');
  assert.equal(nodeMeta(node('x', {status: 'failed', durationMs: null})), 'Failed');
});

test('the tree flattens with levels, expands small trees fully and hides collapsed children', () => {
  const {runs} = parseRunSteps(body);
  const rows = treeRows(runs);
  assert.deepEqual(rows.map(row => [row.id, row.level, row.hasChildren]), [['r0', 1, true], ['r0.0', 2, true], ['r0.0.0', 3, true],
    ['r0.0.0.0', 4, false], ['r0.1', 2, false]]);
  assert.deepEqual(rows.map(row => row.node.label)[0], 'Run 1');
  assert.equal(visibleRows(rows, initialExpanded(runs)).length, 5);
  assert.deepEqual(visibleRows(rows, new Set(['r0'])).map(row => row.id), ['r0', 'r0.0', 'r0.1']);
  const big = [{runId: 'r', startedAt: null, status: 'completed', truncated: false, children: Array.from({length: 45}, (_, i) => node(`s${i}`, {children: [node('c')]}))}];
  assert.deepEqual([...initialExpanded(big)], ['r0']);
});

// @lat: [[contracts#Run steps keyboard]]
test('arrow keys follow the WAI-ARIA tree pattern and leave other keys alone', () => {
  const {runs} = parseRunSteps(body);
  const rows = treeRows(runs);
  let open = new Set(['r0']);
  const visible = () => visibleRows(rows, open);
  assert.deepEqual(treeKey(visible(), 'r0', 'ArrowDown', open), {focus: 'r0.0'});
  assert.deepEqual(treeKey(visible(), 'r0.0', 'ArrowRight', open), {toggle: ['r0.0', true]});
  open = new Set(['r0', 'r0.0']);
  assert.deepEqual(treeKey(visible(), 'r0.0', 'ArrowRight', open), {focus: 'r0.0.0'});
  assert.deepEqual(treeKey(visible(), 'r0.0.0', 'ArrowLeft', open), {focus: 'r0.0'});
  assert.deepEqual(treeKey(visible(), 'r0.0', 'ArrowLeft', open), {toggle: ['r0.0', false]});
  assert.deepEqual(treeKey(visible(), 'r0.1', 'ArrowRight', open), null);
  assert.deepEqual(treeKey(visible(), 'r0.1', 'ArrowDown', open), null);
  assert.deepEqual(treeKey(visible(), 'r0.1', 'Home', open), {focus: 'r0'});
  assert.deepEqual(treeKey(visible(), 'r0', 'End', open), {focus: 'r0.1'});
  assert.deepEqual(treeKey(visible(), 'r0.0', 'Enter', open), {toggle: ['r0.0', false]});
  assert.deepEqual(treeKey(visible(), 'r0.0', ' ', new Set(['r0'])), {toggle: ['r0.0', true]});
  assert.equal(treeKey(visible(), 'r0.1', 'Enter', open), null);
  assert.equal(treeKey(visible(), 'r0', 'Tab', open), null);
  assert.equal(treeKey(visible(), 'missing', 'ArrowDown', open), null);
});

test('a model node shows its first word time when the backend sent one, and only then', () => {
  const run = nodes =>
    parseRunSteps({schemaVersion: 1, runs: [{runId: 'r', children: nodes}]}).runs[0].children;
  const [timed, bad, tool, plain] = run([
    node('a', {kind: 'model', firstTokenMs: 640}), node('b', {kind: 'model', firstTokenMs: -2}),
    node('c', {kind: 'tool', firstTokenMs: 5}), node('d', {kind: 'model'})]);
  assert.deepEqual([timed, bad, tool, plain].map(row => row.firstTokenMs), [640, null, null, null]);
  assert.equal(nodeMeta(timed), '1.5 s · first word 640 ms');
  assert.equal(nodeMeta(plain), '1.5 s');
});
