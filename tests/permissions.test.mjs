import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as permissions from '../src/lib/permissions.mjs';
import * as adminTools from '../src/lib/admin-tools.mjs';

const {
  ALWAYS_ASKS, APPROVAL_CARDS, APPROVAL_MODES, approvalAnnouncement, approvalAnswers, approvalStatus, parseApproval,
  parsePermissions, permissionsBody,
} = permissions;

// @lat: [[contracts#Hosted contract tests#Approval modes]]
test('the stored mode fails closed to ask', () => {
  assert.deepEqual(APPROVAL_MODES, ['ask', 'safe', 'auto']);
  for (const raw of [undefined, null, 'auto', [], {}, { approvalMode: 'AUTO' }, { approvalMode: 'full' }, { approvalMode: 3 }]) {
    assert.equal(parsePermissions(raw).approvalMode, 'ask', JSON.stringify(raw));
  }
  for (const mode of APPROVAL_MODES) assert.equal(parsePermissions({ approvalMode: mode }).approvalMode, mode);
});

test('the save body carries only a known mode', () => {
  assert.deepEqual(permissionsBody('safe'), { approvalMode: 'safe' });
  for (const bad of ['', 'full', null, undefined, 1]) assert.equal(permissionsBody(bad), null);
});

test('the three cards say what each mode does and Full auto keeps Revit approval', () => {
  assert.deepEqual(APPROVAL_CARDS.map(c => c.id), ['ask', 'safe', 'auto']);
  const auto = APPROVAL_CARDS.find(c => c.id === 'auto');
  assert.match(auto.description, /Revit changes still need your approval of the exact proposal/);
  assert.ok(ALWAYS_ASKS.some(item => /Revit model changes/.test(item.title)));
  assert.ok(ALWAYS_ASKS.some(item => /New kinds of tools/.test(item.title)));
});

const card = (over = {}) => ({ id: 'q1', version: 1, question: 'Allow?', kind: 'tool_approval',
  risk: 'external', expiresAt: '2026-11-17T10:15:00Z', call: { name: 'generate_concept_image' },
  questions: [{ id: 'approval', question: 'Allow?', options: [
    { id: 'allow_once', label: 'Allow once' }, { id: 'deny', label: "Don't allow" }] }], ...over });
const T0 = Date.parse('2026-11-17T10:00:00Z');

test('an approval card is recognised only for tool_approval records with both answers', () => {
  assert.equal(parseApproval({ id: 'q', question: 'x' }), null);
  assert.equal(parseApproval(card({ kind: 'other' })), null);
  assert.equal(parseApproval(card({ questions: undefined })), null);
  assert.equal(parseApproval(card({ questions: [{ id: 'approval', options: [{ id: 'deny', label: 'No' }] }] })), null);
  const a = parseApproval(card());
  assert.equal(a.risk, 'external');
  assert.equal(a.expiresAt, Date.parse('2026-11-17T10:15:00Z'));
  assert.deepEqual([a.itemId, a.allowId, a.denyId, a.toolName], ['approval', 'allow_once', 'deny', 'generate_concept_image']);
  assert.equal(parseApproval(card({ risk: 'zzz' })).risk, null);
  assert.equal(parseApproval(card({ risk: undefined })).risk, null);
  assert.equal(parseApproval(card({ call: undefined })).toolName, null);
  assert.equal(parseApproval(card({ expiresAt: 'soon' })).expiresAt, null);
});

test('the reply names the question item and option ids it was sent, never positions', () => {
  const q = card({ questions: [{ id: 'approval', options: [{ id: 'deny', label: 'No' }, { id: 'allow_once', label: 'Yes' }] }] });
  const a = parseApproval(q);
  assert.deepEqual(approvalAnswers(a, 'allow'), [{ question_id: 'approval', option_id: 'allow_once' }]);
  assert.deepEqual(approvalAnswers(a, 'deny'), [{ question_id: 'approval', option_id: 'deny' }]);
});

test('expiry is shown as time left, then as expired', () => {
  const a = parseApproval(card());
  assert.deepEqual(approvalStatus(a, T0, true), { expired: true, label: 'Expired' }, 'server says expired');
  assert.deepEqual(approvalStatus(a, T0), { expired: false, label: 'Expires in 15 min' });
  assert.equal(approvalStatus(a, T0 + 14 * 60000 + 30000).label, 'Expires in 30 s');
  assert.deepEqual(approvalStatus(a, T0 + 15 * 60000), { expired: true, label: 'Expired' });
  assert.deepEqual(approvalStatus(parseApproval(card({ expiresAt: undefined })), T0), { expired: false, label: '' });
});

test('the screen-reader announcement changes only at 5 min, 1 min and expiry', () => {
  const a = parseApproval(card());
  const at = left => approvalAnnouncement(a, Date.parse('2026-11-17T10:15:00Z') - left);
  assert.equal(at(14 * 60000), '');
  assert.equal(at(5 * 60000 + 1000), '');
  assert.equal(at(5 * 60000), 'This approval expires in 5 minutes.');
  assert.equal(at(2 * 60000 + 17000), 'This approval expires in 5 minutes.', 'steady between thresholds');
  assert.equal(at(60000), 'This approval expires in 1 minute.');
  assert.equal(at(12000), 'This approval expires in 1 minute.');
  assert.equal(at(0), 'This approval expired.');
  assert.equal(approvalAnnouncement(a, T0, true), 'This approval expired.', 'server flag');
  assert.equal(approvalAnnouncement(parseApproval(card({ expiresAt: undefined })), T0), '');
});

const transpile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const walk = tree => (React.isValidElement(tree)
  ? [tree, ...React.Children.toArray(tree.props.children).flatMap(walk)] : []);
const text = node => (typeof node === 'string' ? [node] : React.isValidElement(node)
  ? text(node.props.children) : Array.isArray(node) ? node.flatMap(text) : []);

// Slot-based hooks: effects are collected, state survives re-renders.
function harness(file, extra = {}) {
  const slots = [], effects = [];
  let cursor = 0;
  const hooks = { ...React, useEffect: fn => { effects.push(fn); },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    } };
  const exports = {};
  runInNewContext(transpile(file), { exports, require(name) {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === '@/lib/permissions.mjs') return permissions;
    if (name === '@/lib/admin-tools.mjs') return adminTools;
    if (name.endsWith('.module.css')) return { default: {} };
    if (name in extra) return extra[name];
    return new Proxy({}, { get: (_target, key) => key });
  } });
  return { exports, effects, render: (Component, props) => { cursor = 0; effects.length = 0; return walk(Component(props)); } };
}

test('the approval card stays expired from the server flag even when the client clock is behind', () => {
  const h = harness('../src/components/tool-approval-card.tsx');
  const question = card({ expiresAt: new Date(Date.now() + 10 * 60000).toISOString() });
  const nodes = h.render(h.exports.ToolApprovalCard, { question, approval: parseApproval(question), expired: true, onReply() {} });
  const buttons = nodes.filter(n => n.type === 'Button');
  assert.equal(buttons.length, 2);
  assert.ok(buttons.every(b => b.props.disabled === true));
  assert.deepEqual(nodes.filter(n => n.props.role).map(n => [n.props.role, text(n).join('')]),
    [['status', 'This approval expired.']], 'announced once, through the status region');
});

test('the ticking countdown is not a live region; only the threshold text is', () => {
  const h = harness('../src/components/tool-approval-card.tsx');
  const question = card({ expiresAt: new Date(Date.now() + 3 * 60000).toISOString() });
  const nodes = h.render(h.exports.ToolApprovalCard, { question, approval: parseApproval(question), onReply() {} });
  const live = nodes.filter(n => n.props.role === 'status' || n.props['aria-live']);
  assert.deepEqual(live.map(n => text(n).join('')), ['This approval expires in 5 minutes.']);
  assert.ok(nodes.some(n => /^Expires in \d+ min$/.test(text(n).join('')) && !n.props.role), 'the visible countdown stays');
});

test('changing the approval mode keeps focus: no disabled fieldset, busy panel, extra changes ignored', async () => {
  const calls = [];
  let finish;
  const client = (path, init) => {
    calls.push([path, init?.method ?? 'GET']);
    if (!init) return Promise.resolve({ ok: true, data: { approvalMode: 'ask' } });
    return new Promise(resolve => { finish = () => resolve({ ok: true, data: init.body }); });
  };
  const h = harness('../src/components/permissions-settings.tsx', {
    './admin/use-admin': { useAdminClient: () => client, ResultState: 'ResultState' } });
  const { PermissionsSettings } = h.exports;
  h.render(PermissionsSettings, {});
  h.effects.forEach(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  const radio = id => h.render(PermissionsSettings, {}).find(n => n.type === 'input' && n.props.value === id);
  radio('safe').props.onChange();
  radio('auto').props.onChange();  // ignored while the first save is in flight
  const nodes = h.render(PermissionsSettings, {});
  assert.notEqual(nodes.find(n => n.type === 'fieldset').props.disabled, true);
  assert.equal(nodes.find(n => n.type === 'section').props['aria-busy'], true);
  assert.deepEqual(calls, [['me/permissions', 'GET'], ['me/permissions', 'PUT']]);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(radio('safe').props.checked, true);
  assert.equal(h.render(PermissionsSettings, {}).find(n => n.type === 'section').props['aria-busy'], false);
});
