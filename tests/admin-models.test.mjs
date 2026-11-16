import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as models from '../src/lib/admin-models.mjs';
import * as traces from '../src/lib/admin-traces.mjs';
import * as capabilities from '../src/lib/capabilities.mjs';

const {
  canEnable, checkItems, currentDefault, daysFor, disableBlock, enabledIds, modelTotals, nextModels,
  parseModels, parseTest, parseTests, parseUsage, priceLabel, statusCounts, sumUsd, testLabel,
  testsPath, usagePath,
} = models;

const passed = (extra = {}) => ({
  id: 't-1', kind: 'test', at: '2026-11-17T09:12:03Z', passed: true,
  checks: { listed: true, priced: true, context: true, tools: true, imageInput: false,
    toolCall: true, finishReason: 'tool_calls' },
  latencyMs: 2140, inputTokens: 212, outputTokens: 18, usd: '0.0011', failureCode: null, ...extra,
});
const row = (extra = {}) => ({
  id: 'openai/gpt-6-luna', status: 'ready', enabled: false, isDefault: false, inAllowlist: true,
  latestTest: passed(), price: { promptPerM: '0.40', completionPerM: '1.60' },
  contextLength: 400000, imageInput: true, ...extra,
});
const doc = (rows = [row()], extra = {}) => ({
  schemaVersion: 1, catalogAt: '2026-11-17T09:00:00Z', catalogError: false, rows, ...extra,
});
const day = (extra = {}) => ({
  day: '2026-11-16', modelId: 'openai/gpt-6-luna', role: 'planner', calls: 10, failed: 1,
  inputTokens: 1000, outputTokens: 100, reasoningTokens: 10, usd: '0.1', p50Ms: 2000, p95Ms: 5000,
  ...extra,
});

// @lat: [[contracts#Hosted contract tests#Admin model registry parsing]]
test('rows, tests and usage keep only allowlisted keys, at every level', () => {
  const canary = 'CANARY-7f3';
  const parsed = parseModels(doc([row({
    secret: canary, by: canary,
    latestTest: passed({ by: canary, estimateUsd: canary, price: canary,
      checks: { ...passed().checks, prompt: canary }, note: canary }),
    price: { promptPerM: '1.00', completionPerM: '2.00', fetchedAt: canary },
  })], { key: canary }));
  assert.ok(!JSON.stringify(parsed).includes('CANARY'));
  assert.deepEqual(Object.keys(parsed).sort(), ['catalogAt', 'catalogError', 'rows']);
  assert.deepEqual(Object.keys(parsed.rows[0]).sort(), ['contextLength', 'enabled', 'id',
    'imageInput', 'inAllowlist', 'isDefault', 'latestTest', 'listed', 'price', 'status']);
  assert.deepEqual(Object.keys(parsed.rows[0].latestTest.checks).sort(), ['context',
    'finishReason', 'imageInput', 'listed', 'priced', 'toolCall', 'tools']);
  assert.deepEqual(Object.keys(parsed.rows[0].price).sort(), ['completionPerM', 'promptPerM']);
  const usage = parseUsage({ from: null, to: null, scanned: 3, truncated: false, extra: canary,
    days: [day({ owner: canary, text: canary })] });
  assert.ok(!JSON.stringify(usage).includes('CANARY'));
  assert.deepEqual(Object.keys(usage.days[0]).sort(), ['calls', 'day', 'failed', 'inputTokens',
    'modelId', 'outputTokens', 'p50Ms', 'p95Ms', 'reasoningTokens', 'role', 'usd']);
  assert.deepEqual(Object.keys(parseTest(passed({ by: canary }))).sort(), ['at', 'checks',
    'failureCode', 'id', 'inputTokens', 'kind', 'latencyMs', 'outputTokens', 'passed', 'usd']);
  const list = parseTests({ schemaVersion: 1, modelId: 'a/b', rows: [passed({ by: canary })] });
  assert.equal(list.length, 1);
  assert.ok(!JSON.stringify(list).includes('CANARY'));
});

test('unknown statuses, hostile ids and wrong shapes are refused', () => {
  const parsed = parseModels(doc([row(), row({ id: 'a/b', status: 'retired' }),
    row({ id: 'bad id with spaces' }), row({ id: '<script>' }), row({ id: 'x'.repeat(161) }),
    null, 'text', row({ id: 'a/c', status: undefined })]));
  assert.deepEqual(parsed.rows.map(r => r.id), ['openai/gpt-6-luna']);
  for (const value of [null, [], 'x', { schemaVersion: 2, rows: [] }, { schemaVersion: 1 },
    { schemaVersion: 1, rows: {} }]) assert.equal(parseModels(value), null);
  assert.equal(parseTests({}), null);
  assert.equal(parseUsage({ days: 'x' }), null);
  assert.equal(parseTest({ passed: 'yes', kind: 'test' }), null, 'passed must be a boolean');
  assert.equal(parseTest(passed({ kind: 'other' })), null);
  const odd = parseModels(doc([row({ enabled: 'true', isDefault: 1, inAllowlist: 'yes',
    price: { promptPerM: '1e9', completionPerM: '2' }, contextLength: -5, imageInput: 'x' })]));
  assert.deepEqual(odd.rows[0], { ...odd.rows[0], enabled: false, isDefault: false,
    inAllowlist: false, price: null, contextLength: null, imageInput: null });
  const limits = parseTest(passed({ latencyMs: 1e12, inputTokens: -1, outputTokens: 1.5,
    usd: '1e-5', failureCode: 'has space' }));
  assert.deepEqual([limits.latencyMs, limits.inputTokens, limits.outputTokens, limits.usd,
    limits.failureCode], [null, null, null, null, null]);
  assert.equal(parseModels(doc(Array.from({ length: 80 }, (_, i) => row({ id: `p/m${i}` }))))
    .rows.length, 60);
});

test('a null price reads unavailable only when the catalog failed', () => {
  const [priced] = parseModels(doc()).rows;
  assert.equal(priceLabel(priced), '$0.40 in · $1.60 out');
  assert.equal(priceLabel({ ...priced, price: null }, true), 'Price unavailable');
  assert.equal(priceLabel({ ...priced, price: null }, false), 'No price listed');
  assert.equal(parseModels(doc([], { catalogError: true })).catalogError, true);
});

test('legacy rows read "Legacy · not tested" and measured fields stay null', () => {
  const legacy = parseTest({ kind: 'legacy', passed: true, at: '2026-11-01T00:00:00Z',
    checks: {}, latencyMs: null, inputTokens: null, outputTokens: null, usd: null });
  assert.equal(testLabel(legacy), 'Legacy · not tested');
  assert.equal(legacy.latencyMs, null);
  assert.equal(testLabel(null), 'Never tested');
  assert.equal(testLabel(passed()), 'Passed');
  assert.equal(testLabel(parseTest(passed({ passed: false, failureCode: 'no_tool_call' }))),
    'Failed · no_tool_call');
  assert.ok(checkItems(legacy).every(item => item.state === 'na' || item.state === 'info'));
  assert.equal(checkItems(parseTest(passed())).find(i => i.key === 'toolCall').state, 'pass');
});

test('totals per model come from the daily rows, and dollars add exactly', () => {
  const days = parseUsage({ days: [day(),
    day({ day: '2026-11-15', calls: 5, failed: 0, usd: '0.2' }),
    day({ role: 'specialist', usd: '0.0000001' }),
    day({ modelId: '__proto__', calls: 2, usd: '0.3' }),
    day({ modelId: 'google/gemini-3-pro', calls: 7, usd: null })] }).days;
  const totals = modelTotals(days);
  assert.deepEqual(totals.get('openai/gpt-6-luna'), { calls: 25, failed: 2, inputTokens: 3000,
    outputTokens: 300, usd: '0.3000001' });
  assert.equal(totals.get('__proto__').calls, 2, 'a hostile id cannot reach a prototype');
  assert.equal(totals.get('google/gemini-3-pro').usd, '0');
  assert.equal(sumUsd(['0.1', '0.2']), '0.3', 'no floating point drift');
  assert.equal(sumUsd([]), '0');
  assert.equal(sumUsd(['1234567890.123456789012', 'x', null]), '1234567890.123456789012');
  assert.deepEqual(daysFor(days, 'openai/gpt-6-luna').map(d => d.day),
    ['2026-11-16', '2026-11-16', '2026-11-15']);
  assert.deepEqual(statusCounts(parseModels(doc([row(), row({ id: 'a/b', status: 'failed' })]))
    .rows), { enabled: 0, ready: 1, failed: 1, untested: 0, needs_allowlist: 0 });
});

// @lat: [[contracts#Hosted contract tests#Admin model gating]]
test('Enable gives the reason an untested, failed or outside-allowlist model cannot be added',
  () => {
  const of = extra => parseModels(doc([row(extra)])).rows[0];
  assert.equal(canEnable(of({ status: 'untested', latestTest: null })), 'Test this model first');
  assert.equal(canEnable(of({ status: 'failed' })), 'Last test failed');
  assert.equal(canEnable(of({ status: 'needs_allowlist' })),
    'Add it to the server allowlist first');
  assert.equal(canEnable(of({ status: 'untested', inAllowlist: false })),
    'Add it to the server allowlist first', 'the server checks the allowlist first');
  assert.equal(canEnable(of({ status: 'ready' })), null);
  assert.equal(canEnable(of({ status: 'enabled', enabled: true })), null);
});

test('draft helpers: an empty list stands for the server list, and the default cannot be '
  + 'disabled', () => {
  const rows = parseModels(doc([row({ id: 'a/one', enabled: true, status: 'enabled',
    isDefault: true }), row({ id: 'a/two', enabled: true, status: 'enabled' }),
  row({ id: 'a/three' })])).rows;
  assert.deepEqual(enabledIds([], rows), ['a/one', 'a/two']);
  assert.deepEqual(enabledIds(['a/two'], rows), ['a/two']);
  assert.equal(currentDefault('', rows), 'a/one');
  assert.equal(currentDefault('a/two', rows), 'a/two');
  const draft = { models: [], defaultModel: '' };
  assert.equal(disableBlock(draft, rows, 'a/one'), 'Choose another default first.');
  assert.equal(disableBlock(draft, rows, 'a/two'), null);
  assert.equal(disableBlock({ models: [], defaultModel: 'a/two' }, rows, 'a/one'), null);
  assert.deepEqual(nextModels(draft, rows, 'a/two', false), ['a/one']);
  assert.deepEqual(nextModels(draft, rows, 'a/three', true), ['a/one', 'a/two', 'a/three']);
});

test('request paths: a two-segment tests path, a bounded usage query', () => {
  assert.equal(testsPath('openai/gpt-6-luna'), 'admin/models/openai/gpt-6-luna/tests?limit=10');
  assert.equal(testsPath('anthropic/claude-sonnet-5:beta', 99),
    'admin/models/anthropic/claude-sonnet-5:beta/tests?limit=50');
  for (const id of ['nomodel', 'a/b/c', '../x', 'a/..', '', 'a/b c', `a/${'x'.repeat(81)}`]) {
    assert.equal(testsPath(id), null, id);
  }
  assert.equal(usagePath(), 'admin/models/usage?period=7d');
  assert.equal(usagePath({ period: '30d', model: 'openai/gpt-6-luna' }),
    'admin/models/usage?period=30d&model=openai%2Fgpt-6-luna');
  assert.equal(usagePath({ period: '1y', model: 'bad id' }), 'admin/models/usage?period=7d');
  assert.deepEqual(models.testBody('a/b'), { modelId: 'a/b' });
  assert.equal(models.testBody('a b'), null);
});

const transpile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022 } }).outputText;
function load(file, hooks = React, extra = {}) {
  const exports = {};
  runInNewContext(transpile(file), { exports, Map, Set, URL, require(name) {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === '@/lib/admin-models.mjs') return models;
    if (name === '@/lib/admin-traces.mjs') return traces;
    if (name.endsWith('.module.css')) return { default: {} };
    if (name in extra) return extra[name];
    return new Proxy({}, { get: (_target, key) => key });
  } });
  return exports;
}
const walk = tree => (React.isValidElement(tree)
  ? [tree, ...React.Children.toArray(tree.props.children).flatMap(walk)] : []);
const text = node => (typeof node === 'string' ? [node] : React.isValidElement(node)
  ? text(node.props.children) : Array.isArray(node) ? node.flatMap(text) : []);

function renderRows(rows, extra = {}) {
  const { ModelRows } = load('../src/components/admin/model-rows.tsx');
  const props = { rows, enabled: [], defaultId: '', catalogError: false, period: '7 days',
    totals: new Map(), days: [], onToggle() {}, onDefault() {}, onTested() {}, ...extra };
  return ModelRows(props).props.children.flatMap(rowEl => {
    const out = rowEl.type(rowEl.props);
    return walk(out);
  });
}
const buttons = nodes => nodes.filter(n => n.type === 'Button');

test('Enable is disabled, with its reason, for untested, failed and outside-allowlist rows', () => {
  const rows = parseModels(doc([
    row({ id: 'a/ready', status: 'ready' }),
    row({ id: 'a/untested', status: 'untested', latestTest: null }),
    row({ id: 'a/failed', status: 'failed' }),
    row({ id: 'a/outside', status: 'needs_allowlist' }),
    row({ id: 'a/on', status: 'enabled', enabled: true }),
  ])).rows;
  const nodes = renderRows(rows, { enabled: ['a/on'], defaultId: 'a/on' });
  const by = label => buttons(nodes).find(b => b.props['aria-label'] === label);
  assert.equal(by('Enable a/ready').props.disabled, false);
  for (const id of ['untested', 'failed', 'outside']) {
    const button = by(`Enable a/${id}`);
    assert.equal(button.props.disabled, true, id);
    assert.ok(button.props['aria-describedby'], 'the reason is attached to the button');
  }
  assert.equal(by('Disable a/on').props.disabled, false);
  assert.equal(by('Make a/on the default').props.disabled, true, 'it is already the default');
  assert.equal(by('Make a/ready the default').props.disabled, true, 'enable it first');
  const why = nodes.filter(n => n.type === 'span' && n.props.id?.startsWith('model-why-'));
  assert.deepEqual(why.map(n => text(n).join('')), ['Test this model first', 'Last test failed',
    'Add it to the server allowlist first']);
  const status = nodes.find(n => n.type === 'Badge' && text(n).includes('Legacy · not tested'));
  assert.equal(status, undefined, 'the badge is the status; the legacy text is in Last test');
});

test('the Last test cell reads "Legacy · not tested" for legacy rows', () => {
  const legacy = row({ latestTest: { ...passed(), kind: 'legacy', latencyMs: null } });
  const rows = parseModels(doc([legacy])).rows;
  assert.ok(renderRows(rows).some(n => n.type === 'td'
    && text(n).join('').includes('Legacy · not tested')));
});

function modelsPage(state) {
  const slots = [];
  let cursor = 0;
  const hooks = { ...React, useMemo: fn => fn(), useEffect: () => {},
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => {
        slots[i] = typeof value === 'function' ? value(slots[i]) : value;
      }];
    } };
  const resource = path => ({ load() {}, result: { ok: true },
    data: path.startsWith('admin/models/usage') ? { days: [] } : state.registry });
  const { ModelsSection } = load('../src/components/admin/models-section.tsx', hooks, {
    './use-admin': { useAdminResource: resource, ResultState: 'ResultState' },
    './model-rows': { HEAD: () => [], ModelRows: 'ModelRows' },
    './form': { ConfigPage: 'ConfigPage', Field: 'Field',
      useSharedAdminConfig: () => ({ base: { revision: 1 } }) },
  });
  const update = patch => Object.assign(state.draft, patch);
  const page = ModelsSection();
  const render = () => {
    cursor = 0;
    const body = page.props.children({ draft: state.draft, update, errors: {} });
    return walk(body.type(body.props));
  };
  return { render, state };
}

test('disabling the default model shows an inline error until another default is chosen', () => {
  const registry = doc([
    row({ id: 'a/one', status: 'enabled', enabled: true, isDefault: true }),
    row({ id: 'a/two', status: 'enabled', enabled: true }),
  ]);
  const page = modelsPage({ registry,
    draft: { models: ['a/one', 'a/two'], defaultModel: 'a/one' } });
  const rows = () => page.render().find(n => n.props?.onToggle);
  const alert = () => text(page.render()
    .find(n => n.type === 'p' && n.props.role === 'alert')).join('');
  assert.equal(alert(), '');
  const [one, two] = registry.rows.map(r => parseModels(doc([r])).rows[0]);
  rows().props.onToggle(one, false, {});
  assert.match(alert(), /a\/one is the default model\. Choose another default first\./);
  assert.deepEqual(page.state.draft.models, ['a/one', 'a/two'], 'the draft is untouched');
  assert.equal(page.render().find(n => n.type === 'Dialog').props.open, false, 'no confirmation');
  rows().props.onDefault(two);
  assert.equal(alert(), '');
  assert.equal(page.state.draft.defaultModel, 'a/two');
  rows().props.onToggle(one, false, {});
  assert.equal(page.render().find(n => n.type === 'Dialog').props.open, true);
  const confirm = text(page.render().find(n => n.type === 'DialogDescription')).join('');
  assert.match(confirm, /next turn of chats using it will ask users to pick another model/);
});

test('Models is hidden from the nav unless adminModels is on', () => {
  const exports = {}, slots = [];
  let cursor = 0, resource = { data: null };
  const hooks = { ...React, useEffect: () => {},
    useContext: () => ({ dirty: false, saving: false }),
    useState(initial) {
      const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], () => {}];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; } };
  runInNewContext(transpile('../src/components/admin/admin-shell.tsx'), { exports, require(name) {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === 'next/navigation') return { usePathname: () => '/admin', useRouter: () => ({}) };
    if (name === './form') {
      return { AdminConfigProvider: 'Provider', useSharedAdminConfig: () => ({ dirty: false }) };
    }
    if (name === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
    if (name === 'next/link') return { default: 'Link' };
    if (name === './use-admin') {
      return { useAdminResource: () => resource, ResultState: 'ResultState' };
    }
    if (name === '@/lib/capabilities.mjs') return capabilities;
    return new Proxy({}, { get: (_target, key) => key });
  } });
  const render = activePath => {
    const shell = exports.AdminShell({ email: 'a@example.test', children: 'page', activePath });
    cursor = 0;
    return walk(shell.props.children.type(shell.props.children.props));
  };
  const links = () => {
    const nav = render('/admin').find(n => n.type?.name === 'Nav');
    return walk(nav.type(nav.props)).filter(n => n.type === 'Link').map(n => n.props.href);
  };
  const features = extra => ({ capabilities: { version: 1, features: extra } });
  const loaded = data => { resource = { data, result: { ok: true, data } }; };
  resource = { data: null };
  assert.equal(render('/admin/models').find(n => n.type === 'ResultState').props.result, null,
    'a strict page waits for the config');
  for (const data of [null, features({}), features({ adminModels: false })]) {
    loaded(data);
    assert.ok(!links().includes('/admin/models'), JSON.stringify(data));
    const missing = render('/admin/models').find(n => n.type === 'ResultState');
    assert.equal(missing.props.result.reason, 'missing');
  }
  loaded(features({ adminModels: true }));
  assert.ok(links().includes('/admin/models'));
  assert.equal(render('/admin/models').find(n => n.type === 'ResultState'), undefined);
});

test('the tests list is the backend document, and legacy ids keep their slash', () => {
  const legacy = { id: 'legacy:openai/gpt-6-luna', kind: 'legacy', passed: true,
    at: '2026-11-01T00:00:00Z', checks: {}, latencyMs: null, inputTokens: null,
    outputTokens: null, usd: null, failureCode: null };
  const list = parseTests({ schemaVersion: 1, modelId: 'openai/gpt-6-luna',
    rows: [passed(), legacy] });
  assert.deepEqual(list.map(t => t.id), ['t-1', 'legacy:openai/gpt-6-luna']);
  for (const value of [[passed()], { rows: [passed()] }, { schemaVersion: 2, rows: [] },
    { schemaVersion: 1, rows: {} }]) assert.equal(parseTests(value), null);
  assert.equal(parseTest(passed({ id: 'has space' })).id, null);
  assert.equal(parseTest(passed({ id: `x/${'y'.repeat(200)}` })).id, null);
});

const served = (id, extra = {}) => row({ id, status: 'enabled', enabled: true, listed: true,
  ...extra });
const failedTest = passed({ passed: false, failureCode: 'no_tool_call' });

test('a listed model the server does not serve reads "Listed, not served", with the reason', () => {
  const rows = parseModels(doc([
    row({ id: 'a/sol', listed: true, status: 'failed', latestTest: failedTest }),
    served('a/luna', { isDefault: true }),
  ])).rows;
  const nodes = renderRows(rows, { enabled: ['a/sol', 'a/luna'], defaultId: 'a/luna' });
  const badges = nodes.filter(n => n.type === 'Badge').map(n => text(n).join(''));
  assert.deepEqual(badges, ['Listed, not served', 'Enabled', 'Default']);
  const notes = nodes.filter(n => n.type === 'span').map(n => text(n).join(''));
  assert.ok(notes.includes('Not served: last test failed'));
  assert.ok(!notes.includes('Unsaved change'), 'it is in the stored list, so nothing changed');
});

test('the default is the server-reported one when the stored default is not served', () => {
  const registry = () => doc([
    row({ id: 'a/sol', listed: true, status: 'failed', latestTest: failedTest }),
    served('a/luna', { isDefault: true }),
  ]);
  const rows = parseModels(registry()).rows;
  const draft = { models: ['a/sol', 'a/luna'], defaultModel: 'a/sol' };
  assert.equal(currentDefault(draft.defaultModel, rows), 'a/luna');
  assert.equal(disableBlock(draft, rows, 'a/luna'), models.DEFAULT_BLOCK);
  assert.equal(currentDefault('a/new', rows), 'a/new', 'a default picked in the draft counts');
  const page = modelsPage({ registry: registry(), draft: { ...draft } });
  const list = () => page.render().find(n => n.props?.onToggle);
  assert.equal(list().props.defaultId, 'a/luna');
  list().props.onToggle(rows[1], false, {});
  const alert = text(page.render().find(n => n.type === 'p' && n.props.role === 'alert'));
  assert.match(alert.join(''), /a\/luna is the default model\. Choose another default first\./);
  assert.deepEqual(page.state.draft.models, ['a/sol', 'a/luna']);
});

test('an empty served list shows the fail-closed banner', () => {
  const banner = 'No models are enabled. Test a model, then enable it.';
  const none = modelsPage({ registry: doc([row({ id: 'a/sol', listed: true, status: 'failed' })]),
    draft: { models: ['a/sol'], defaultModel: 'a/sol' } });
  assert.ok(none.render().some(n => text(n).join('') === banner));
  const some = modelsPage({ registry: doc([served('a/luna')]),
    draft: { models: ['a/luna'], defaultModel: 'a/luna' } });
  assert.ok(!some.render().some(n => text(n).join('') === banner));
});

test('the first edit of an empty admin list writes only served ids', () => {
  const registry = doc([served('a/luna', { listed: false, isDefault: true }),
    row({ id: 'a/env', status: 'untested', latestTest: null }),
    row({ id: 'a/ready', status: 'ready' })]);
  const rows = parseModels(registry).rows;
  const page = modelsPage({ registry, draft: { models: [], defaultModel: '' } });
  page.render().find(n => n.props?.onToggle).props.onToggle(rows[2], true, {});
  assert.deepEqual(page.state.draft.models, ['a/luna', 'a/ready'], 'never the untested env model');
  const off = modelsPage({ registry, draft: { models: [], defaultModel: '' } });
  off.render().find(n => n.props?.onToggle).props.onToggle(rows[0], false, {});
  assert.deepEqual(off.state.draft.models, [], 'the default is blocked, so nothing is written');
});

test('the fixture reports listed and served rows, and models-none serves nothing', () => {
  const exports = {};
  runInNewContext(transpile('../src/components/dev/admin-models-fixture.ts'),
    { exports, structuredClone });
  const config = { models: ['openai/gpt-6.1-sol', 'openai/gpt-6-luna', 'google/gemini-3-pro'],
    defaultModel: 'openai/gpt-6-luna' };
  const ready = parseModels(exports.createModelsFixture(() => config).list()).rows;
  const by = id => ready.find(r => r.id === id);
  const gemini = by('google/gemini-3-pro'), sol = by('openai/gpt-6.1-sol');
  assert.deepEqual([gemini.listed, gemini.enabled, gemini.status], [true, false, 'failed']);
  assert.deepEqual([sol.listed, sol.enabled], [true, false]);
  assert.deepEqual([by('openai/gpt-6-luna').enabled, by('openai/gpt-6-luna').isDefault],
    [true, true]);
  assert.equal(by('anthropic/claude-sonnet-5').listed, false);
  const fixture = exports.createModelsFixture(() => config, { none: true });
  assert.equal(parseModels(fixture.list()).rows.filter(r => r.enabled).length, 0);
  assert.ok(fixture.test('anthropic/claude-sonnet-5').ok);
  assert.equal(parseTests(fixture.tests('anthropic/claude-sonnet-5', 10)).length, 1);
  const preview = readFileSync(new URL('../src/components/dev/admin-preview.tsx',
    import.meta.url), 'utf8');
  assert.match(preview, /<option value="models-none">/);
});
