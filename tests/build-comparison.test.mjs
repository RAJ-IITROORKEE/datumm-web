import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function harness(onCommand, overrides = {}) {
  const slots = [];
  let cursor = 0;
  const hooks = { ...React,
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  };
  const exports = {};
  const source = readFileSync(new URL('../src/components/build-comparison.tsx', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Error,
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name.endsWith('.module.css')) return { default: {} };
      return { Button: 'Button' };
    },
  });
  const props = { comparison: comparison(), feedback: [{ id: 'feedback-2', version: 2, prompt: 'Move the kitchen wall' }], revisions: 0, active: false, onCommand, ...overrides };
  return {
    props,
    nodes() { cursor = 0; return elements(exports.BuildComparisonCard(props)); },
    control(label) { return this.nodes().find(node => node.props['aria-label'] === label); },
    change(label, value) { this.control(label).props.onChange({ target: { value } }); },
    button(label) { return this.nodes().find(node => node.type === 'Button' && content(node).includes(label)); },
    submit(index) { return this.nodes().filter(node => node.type === 'form')[index].props.onSubmit({ preventDefault() {} }); },
  };
}
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}
function content(node) {
  if (!React.isValidElement(node)) return node == null ? '' : String(node);
  return React.Children.toArray(node.props.children).map(content).join(' ');
}
const comparison = (overrides = {}) => ({ comparisonId: 'comparison-7', goalVersion: 2, documentId: 'doc-1', revision: 7,
  native_verified: true, goal_satisfied: true, user_review: 'pending', overlaySvg: null,
  image: { base64: '', contentType: 'image/png', viewName: 'Ground floor' },
  checks: [{ key: 'wall-east', kind: 'wall', status: 'pass', expected: { lengthMm: 3200 }, actual: { lengthMm: 3200 } }],
  targets: [{ key: 'wall-east', id: 'native-wall-42', kind: 'wall' }], ...overrides });
const settle = () => new Promise(setImmediate);
const plain = value => JSON.parse(JSON.stringify(value));

test('result acceptance retains the exact native verification and goal/feedback gate', async () => {
  for (const [changes, enabled] of [
    [{}, true], [{ native_verified: false }, false], [{ goal_satisfied: null }, false],
    [{ goal_satisfied: false }, false], [{ goal_satisfied: false, feedbackImplemented: true }, true],
    [{ native_verified: false, feedbackImplemented: true }, false], [{ user_review: 'accepted' }, false],
  ]) {
    const writes = [], h = harness(async command => writes.push(command), { comparison: comparison(changes) });
    const accept = h.button(changes.user_review === 'accepted' ? 'Result accepted' : 'accept this result');
    assert.equal(accept.props.disabled, !enabled);
    accept.props.onClick(); await settle();
    assert.deepEqual(plain(writes), enabled ? [{ type: 'review_result', comparisonId: 'comparison-7' }] : []);
  }
  const writes = [], h = harness(async command => writes.push(command), { active: true });
  h.button('accept this result').props.onClick(); await settle();
  assert.equal(writes.length, 0);
});

test('same-render commands are serialized and comparison refresh does not grant approval', async () => {
  let finish;
  const writes = [], h = harness(command => { writes.push(command); return new Promise(resolve => { finish = resolve; }); });
  const refresh = h.button('Refresh measured comparison');
  refresh.props.onClick(); refresh.props.onClick(); h.button('accept this result').props.onClick();
  assert.deepEqual(plain(writes), [{ type: 'compare_result' }]);
  assert.equal(h.button('Reading Revit').props.disabled, true);
  finish(); await settle();
  assert.equal(h.button('Refresh measured comparison').props.disabled, false);
  assert.match(content(h.nodes()[0]), /Review pending/);
});

test('feedback is locked during save, retained after failure and cleared only on success', async () => {
  let finish, fail;
  const writes = [], h = harness(command => { writes.push(command); return new Promise((resolve, reject) => { finish = resolve; fail = reject; }); });
  h.change('Post-build feedback', '  Keep the kitchen larger  ');
  h.submit(0); h.submit(0);
  assert.deepEqual(plain(writes), [{ type: 'build_feedback', prompt: 'Keep the kitchen larger' }]);
  assert.equal(h.control('Post-build feedback').props.disabled, true);
  h.change('Post-build feedback', 'Unexpected in-flight edit');
  assert.equal(h.control('Post-build feedback').props.value, '  Keep the kitchen larger  ');
  fail(new Error('Service unavailable')); await settle();
  assert.equal(h.nodes().find(node => node.props.role === 'alert').props.children, 'Service unavailable');
  assert.equal(h.control('Post-build feedback').props.value, '  Keep the kitchen larger  ');
  assert.equal(h.control('Post-build feedback').props.disabled, false);
  h.submit(0); finish(); await settle();
  assert.equal(writes.length, 2);
  assert.equal(h.control('Post-build feedback').props.value, '');
});

test('preparation rejects absent/stale targets, exhausted attempts and invalid displacement', async () => {
  const writes = [], h = harness(async command => writes.push(command));
  h.submit(1); await settle(); assert.equal(writes.length, 0);
  h.change('Revision target', 'wall-east');
  for (const value of ['', ' ', 'Infinity', 'NaN', '2000.01', '-2001']) {
    h.change('X displacement in millimetres', value);
    assert.equal(h.button('Prepare minimal revision').props.disabled, true, value);
    h.submit(1); await settle();
  }
  h.change('X displacement in millimetres', '100');
  h.change('Y displacement in millimetres', '');
  h.submit(1); await settle();
  h.change('Y displacement in millimetres', '0');
  h.props.revisions = 3;
  h.submit(1); await settle();
  h.props.revisions = 0;
  h.props.comparison = comparison({ comparisonId: 'comparison-8' });
  assert.equal(h.control('Revision target').props.value, '', 'A target must be chosen again for the new comparison');
  h.submit(1); await settle();
  h.change('Revision target', 'unknown-target');
  h.submit(1); await settle();
  assert.equal(writes.length, 0);
});

test('revision preparation carries exact feedback/comparison/target/action and bounded move values', async () => {
  const writes = [], h = harness(async command => writes.push(command));
  h.change('Revision target', 'wall-east');
  h.change('X displacement in millimetres', '-2000');
  h.change('Y displacement in millimetres', '2000');
  h.submit(1); await settle();
  assert.deepEqual(plain(writes[0]), { type: 'prepare_revision', feedbackId: 'feedback-2', comparisonId: 'comparison-7', targetKey: 'wall-east', action: 'move', deltaXmm: -2000, deltaYmm: 2000 });
  h.change('Revision action', 'delete');
  h.submit(1); await settle();
  assert.deepEqual(plain(writes[1]), { ...plain(writes[0]), action: 'delete', deltaXmm: 0, deltaYmm: 0 });
  assert.match(content(h.nodes()[0]), /fresh exact proposal/);
  assert.equal(writes.some(command => command.type === 'review_result'), false);
});

test('unknown, mismatch, pass and pending review remain separately visible', () => {
  const h = harness(async () => {}, { comparison: comparison({ goal_satisfied: null, checks: [
    { key: 'a', kind: 'wall', status: 'pass' }, { key: 'b', kind: 'wall', status: 'mismatch' }, { key: 'c', kind: 'wall', status: 'unknown' },
  ] }) });
  const text = content(h.nodes()[0]);
  for (const label of ['Review pending', 'Unknown', 'Pass', 'Mismatch', 'Document', 'doc-1', 'Model revision', '7', 'Expected', 'Actual']) assert.ok(text.includes(label), label);
});
