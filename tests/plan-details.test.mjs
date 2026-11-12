import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/plan-details.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports,
  require(name) {
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name.endsWith('.module.css')) return { default: {} };
    return { Button: 'Button', PlanCanvas: 'PlanCanvas' };
  },
});
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}
function content(node) {
  if (!React.isValidElement(node)) return node == null ? '' : String(node);
  return React.Children.toArray(node.props.children).map(content).join(' ').replace(/\s+/g, ' ');
}
function fixture(overrides = {}) {
  const drawing = { planId: 'plan-a', version: 4, fingerprint: 'exact-4', svg: '', graph: { rooms: [] } };
  return { run: { id: 'task-9', currentPlanRef: { planId: 'plan-a' }, data: { agent_design: {
    candidates: [{ planId: 'plan-a', version: 4, fingerprint: 'exact-4' }, { planId: 'plan-b', version: 2, fingerprint: 'exact-b2' }], diagnostics: ['Concept only'],
  } } }, busy: false, drawingLoading: false, drawingError: '', drawingMissing: false,
    designVersion: drawing, drawingCurrent: true, compareVersion: { ...drawing, version: 3, fingerprint: 'exact-3' },
    canvasInputEnabled: true, persistentProperties: true, drawingStyle: 'linework', reviewAssumptions: ['Walls are proposed'],
    designDiff: 'Source-defined version comparison', reviewAlternative() {}, compareDrawing() {}, setCompareVersion() {}, setDrawingRetry() {}, askFromCanvas() {}, ...overrides };
}

test('plan details retain exact export scope, read-only viewers and source version comparison', () => {
  const state = fixture(), nodes = elements(exports.PlanDetails(state));
  assert.deepEqual(nodes.filter(n => n.type === 'a').map(n => n.props.href), [
    '/api/service/runs/task-9/export/svg?planId=plan-a&version=4&style=linework',
    '/api/service/runs/task-9/export/preview-png?planId=plan-a&version=4&style=linework',
    '/api/service/runs/task-9/export/plan-pdf?planId=plan-a&version=4&style=linework',
  ]);
  const viewers = nodes.filter(n => n.type === 'PlanCanvas');
  assert.equal(viewers.length, 2);
  assert.equal(viewers[0].props.drawing, state.compareVersion);
  assert.equal(viewers[1].props.drawing, state.designVersion);
  for (const viewer of viewers) {
    assert.equal(viewer.props.readOnly, true);
    assert.equal(viewer.props.canvasInputEnabled, true);
    assert.equal(viewer.props.persistentProperties, true);
  }
  assert.equal(viewers[1].props.onAsk, state.askFromCanvas);
  assert.ok(content(nodes[0]).includes(state.designDiff));
});

test('alternative, compare, close and retry actions preserve their callbacks and loading gates', () => {
  const calls = [], state = fixture({
    reviewAlternative: candidate => calls.push(candidate), compareDrawing: () => calls.push('compare'),
    setCompareVersion: value => calls.push(value), setDrawingRetry: fn => calls.push(fn(3)),
  });
  let nodes = elements(exports.PlanDetails(state));
  const button = label => nodes.find(n => n.type === 'Button' && content(n).includes(label));
  button('Alternative 2').props.onClick();
  assert.equal(calls[0], state.run.data.agent_design.candidates[1]);
  button('Compare saved versions').props.onClick(); button('Close comparison').props.onClick();
  assert.deepEqual(calls.slice(1), ['compare', null]);
  state.drawingError = 'Read failed'; state.drawingLoading = true; state.drawingCurrent = false;
  nodes = elements(exports.PlanDetails(state));
  assert.equal(button('Retry exact drawing').props.disabled, true);
  assert.equal(button('Compare saved versions').props.disabled, true);
  state.drawingLoading = false;
  nodes = elements(exports.PlanDetails(state));
  button('Retry exact drawing').props.onClick();
  assert.equal(calls.at(-1), 4);
  assert.match(content(nodes[0]), /Older drawing v 4 retained/);
});
