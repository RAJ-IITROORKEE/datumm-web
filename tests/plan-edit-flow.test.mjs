import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import ts from 'typescript';
import * as edits from '../src/lib/plan-edits.mjs';

// Runs the real hook with a minimal useState/useRef so the request order and refusals can be checked.
function hook() {
  const slots = [];let cursor = 0;
  const hooks = {useState(initial) {const i = cursor++;if (!(i in slots)) slots[i] = initial;return [slots[i], next => {slots[i] = typeof next === 'function' ? next(slots[i]) : next;}];}, useRef(initial) {const i = cursor++;return slots[i] ??= {current: initial};}};
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../src/components/workspace/use-plan-edit.ts', import.meta.url), 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(code, {exports, Object, Number, Error, encodeURIComponent, require: name => name === 'react' ? hooks : name === '@/lib/plan-edits.mjs' ? edits : {}});
  return {render: ctx => {cursor = 0;return exports.usePlanEdit(ctx);}};
}

const graph = {rooms: [{key: 'a', name: 'Kitchen'}, {key: 'b', name: 'Dining'}], walls: [], openings: []};
const base = {planId: 'p', version: 2, fingerprint: 'f2', svg: '', graph};
const saved = {planId: 'p', version: 3, fingerprint: 'f3', svg: '', graph};
const run = {id: 't', taskVersion: 4, data: {agent_design: {briefId: 'b1'}}, currentPlanRef: {planId: 'p', version: 3, fingerprint: 'f3'}};

function setup({allowed = true, fail = {}} = {}) {
  const calls = [], state = {design: null, run: null, busy: [], cleared: 0};
  const failure = (status, message) => Object.assign(new Error(message), {status});
  const api = async (path, method = 'GET', body) => {
    calls.push([method, path, body]);
    if (fail[path]) throw fail[path];
    if (path.endsWith('/edits')) return {planId: 'p', version: 3, fingerprint: 'f3', changes: {rooms: [{key: 'a'}, {key: 'b'}]}, findings: {schema: 'datumm.findings.v1', ruleSet: 'r', status: 'pass', findings: []}};
    if (path === 'variable/plans/p/versions/3') return saved;
    if (path === 'variable/briefs/b1/alternatives') return {selectionRevision: 7};
    if (path === 'variable/briefs/b1/selection') return {};
    if (path === 'tasks/t') return run;
    throw failure(500, 'unexpected ' + path);
  };
  const guard = {current: {key: 'k', generation: 1}};
  const h = hook();
  const ctx = {allowed, designVersion: base, run: {id: 't', taskVersion: 3, data: {agent_design: {briefId: 'b1'}}}, runId: 't', guard, scopeCurrent: token => token.key === guard.current.key && token.generation === guard.current.generation,
    withSelectionMutation: operation => operation(), api, currentRun: {current: {id: 't', taskVersion: 3}}, setRun: value => {state.run = value;}, setActionBusy: value => state.busy.push(value),
    setDesignVersion: value => {state.design = value;}, clearComparison: () => {state.cleared++;}, clearSelection: () => {}};
  return {calls, state, failure, current: () => h.render(ctx), ctx};
}
const plain = value => JSON.parse(JSON.stringify(value)); // the hook runs in a vm realm
const rename = {kind: 'rename', roomKey: 'a', name: 'Pantry'};

test('a saved edit becomes the current version through selection and a task reload, then reports plainly', async () => {
  const t = setup();
  await t.current().apply(rename);
  assert.deepEqual(t.calls.map(([method, path]) => `${method} ${path}`), ['POST variable/plans/p/versions/2/edits', 'GET variable/plans/p/versions/3', 'GET variable/briefs/b1/alternatives', 'POST variable/briefs/b1/selection', 'GET tasks/t']);
  assert.deepEqual(plain(t.calls[0][2]), {fingerprint: 'f2', edit: rename});
  assert.deepEqual(plain(t.calls[3][2]), {planId: 'p', version: 3, fingerprint: 'f3', expectedSelectionRevision: 7});
  assert.equal(t.state.design.version, 3);assert.equal(t.state.run.id, 't');assert.equal(t.state.cleared, 1);
  assert.deepEqual(plain(t.state.busy), [true, false]);
  const view = t.current();
  assert.equal(view.busy, false);
  assert.deepEqual(plain(view.notice), {tone: 'ok', text: 'Saved as Version 3 · 2 rooms changed: Kitchen, Dining · Checks: no problems', back: 2});
});

test('an accepted version tells the person the new one must be accepted again', async () => {
  const t = setup();
  t.ctx.run = {...t.ctx.run, acceptance: {plan: {planId: 'p', version: 2, fingerprint: 'f2'}}};
  await t.current().apply(rename);
  assert.match(t.current().notice.text, /Version 3 needs to be accepted again\.$/);
});

test('a stale fingerprint shows the reload message and leaves the plan alone', async () => {
  const t = setup();
  t.ctx.api = async (path, method, body) => {t.calls.push([method, path, body]);throw Object.assign(t.failure(409, 'Plan has a newer version'), {serviceCode: 'edit.stale'});};
  await t.current().apply(rename);
  assert.equal(t.calls.length, 1);assert.equal(t.state.design, null);assert.equal(t.state.run, null);
  assert.deepEqual(plain(t.current().notice), {tone: 'error', text: 'This plan changed elsewhere. Reload to edit the latest version'});
  assert.deepEqual(plain(t.state.busy), [true, false]);
});

test('a 422 shows the server detail', async () => {
  const t = setup({fail: {'variable/plans/p/versions/2/edits': Object.assign(new Error('Requested wall offset would collapse or invert a room.'), {status: 422})}});
  await t.current().apply(rename);
  assert.equal(t.current().notice.text, 'Requested wall offset would collapse or invert a room.');
  assert.equal(t.state.design, null);
});

test('when the edit saved but the task cannot open it, the person is told the version exists', async () => {
  const t = setup({fail: {'variable/briefs/b1/alternatives': new Error('network')}});
  await t.current().apply(rename);
  assert.equal(t.current().notice.text, 'Version 3 was saved, but it could not be opened here. Reload the chat to see it.');
  assert.equal(t.state.design, null);
});

test('a second click while one edit runs sends nothing, and a blocked panel sends nothing', async () => {
  const t = setup();
  const view = t.current(), first = view.apply(rename), second = view.apply(rename);
  await Promise.all([first, second]);
  assert.equal(t.calls.filter(([, path]) => path.endsWith('/edits')).length, 1);
  const blocked = setup({allowed: false});
  await blocked.current().apply(rename);
  assert.equal(blocked.calls.length, 0);
});

test('going back to an earlier version only reads it', async () => {
  const t = setup();
  t.ctx.api = async (path, method = 'GET') => {t.calls.push([method, path]);return {planId: 'p', version: 1, fingerprint: 'f1', svg: '', graph};};
  await t.current().open(1);
  assert.deepEqual(t.calls, [['GET', 'variable/plans/p/versions/1']]);
  assert.equal(t.state.design.version, 1);assert.equal(t.state.run, null);
  await t.current().open(0);
  assert.equal(t.calls.length, 1);
});
