import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as config from '../src/lib/admin-config.mjs';

// Run the real hooks with persistent state and effect dependencies, without network access.
function harness(client) {
  const slots = [], pendingEffects = [];
  const timers = new Map();
  let cursor = 0;
  const changed = (old, next) => !old || next.some((value, i) => !Object.is(value, old[i]));
  const hooks = { ...React,
    useContext: () => client,
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useCallback(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn, deps }; return slots[i].value; },
    useMemo(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; },
    useEffect(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) { const old = slots[i]; const next = slots[i] = { deps, setup: fn }; pendingEffects.push(() => { old?.cleanup?.(); next.cleanup = fn(); }); } },
  };
  const exports = {};
  const source = readFileSync(new URL('../src/components/admin/use-admin.tsx', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, fetch() { throw Error('Tests must use the injected client'); }, document: { hidden: false },
    setInterval(fn) { const timer = {}; timers.set(timer, fn); return timer; }, clearInterval(timer) { timers.delete(timer); },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === '@/lib/admin-config.mjs') return config;
      if (name.endsWith('.module.css')) return { default: {} };
      return new Proxy({}, { get: () => () => null });
    },
  });
  return {
    render() { cursor = 0; const value = exports.useAdminConfig(); pendingEffects.splice(0).forEach(fn => fn()); return value; },
    resource(path, pollMs) { cursor = 0; const value = exports.useAdminResource(path, pollMs); pendingEffects.splice(0).forEach(fn => fn()); return value; },
    tick() { [...timers.values()].forEach(fn => fn()); },
    replaceClient(next) { client = next; },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
    replayEffects() { slots.filter(slot => slot?.setup).forEach(slot => { slot.cleanup?.(); slot.cleanup = slot.setup(); }); },
    async loaded() { this.render(); await new Promise(setImmediate); this.render(); return this.render(); },
  };
}
const envelope = (revision = 4) => ({ config: config.emptyConfig(), effective: {}, revision });

test('a slow polling response can settle without newer timer ticks invalidating it', async () => {
  const reads = [];
  const h = harness(() => new Promise(resolve => reads.push(resolve)));
  const polling = () => 4000;
  h.resource('admin/knowledge/sources', polling);
  reads[0]({ ok: true, data: [{ id: 'source', status: 'indexing', progress: 1 }] });
  await new Promise(setImmediate); h.resource('admin/knowledge/sources', polling);
  h.tick();
  assert.equal(reads.length, 2);
  h.tick(); h.tick();
  assert.equal(reads.length, 2, 'Polling skips every tick while a read remains in flight');
  reads[1]({ ok: true, data: [{ id: 'source', status: 'indexing', progress: 2 }] });
  await new Promise(setImmediate);
  assert.equal(h.resource('admin/knowledge/sources', polling).data[0].progress, 2);
  h.tick();
  assert.equal(reads.length, 3, 'Polling resumes after the slow request settles');
  h.unmount();
  reads[2]({ ok: true, data: [] });
});

test('an obsolete initial config load cannot replace edits after development effect replay', async () => {
  const reads = [];
  const h = harness(() => new Promise(resolve => reads.push(resolve)));
  h.render(); h.replayEffects();
  assert.equal(reads.length, 2);
  reads[1]({ ok: true, data: envelope(8) });
  await new Promise(setImmediate); h.render();
  h.render().update({ parallelChats: 5 });
  reads[0]({ ok: true, data: envelope(7) });
  await new Promise(setImmediate); h.render();
  const edited = h.render();
  assert.equal(edited.base.revision, 8);
  assert.equal(edited.draft.parallelChats, 5);
  assert.equal(edited.dirty, true);
});

test('a late knowledge poll cannot resurrect a row removed by a newer refresh', async () => {
  const reads = [];
  const h = harness(() => new Promise(resolve => reads.push(resolve)));
  h.resource('admin/knowledge/sources');
  reads.shift()({ ok: true, data: [{ id: 'deleted-later' }] });
  await new Promise(setImmediate);
  const loaded = h.resource('admin/knowledge/sources');
  assert.equal(loaded.data.length, 1);
  const oldPoll = loaded.load();
  const afterDelete = loaded.load();
  reads[1]({ ok: true, data: [] });
  await afterDelete;
  assert.equal(h.resource('admin/knowledge/sources').data.length, 0);
  reads[0]({ ok: true, data: [{ id: 'deleted-later' }] });
  await oldPoll;
  assert.equal(h.resource('admin/knowledge/sources').data.length, 0);
});

test('resource path, client changes and unmount invalidate outstanding reads and old refresh handlers', async () => {
  const oldReads = [], newReads = [];
  const h = harness(() => new Promise(resolve => oldReads.push(resolve)));
  const oldPath = h.resource('admin/knowledge/sources');
  h.resource('admin/audit');
  oldReads[1]({ ok: true, data: [{ summary: 'Current audit' }] });
  await new Promise(setImmediate);
  oldReads[0]({ ok: true, data: [{ id: 'Obsolete knowledge' }] });
  await new Promise(setImmediate);
  assert.equal(h.resource('admin/audit').data[0].summary, 'Current audit');
  await oldPath.load();
  assert.equal(oldReads.length, 2, 'The obsolete path cannot start another read');
  const oldClientRefresh = h.resource('admin/audit').load();
  h.replaceClient(() => new Promise(resolve => newReads.push(resolve)));
  h.resource('admin/audit');
  assert.equal(h.resource('admin/audit').result, null, 'The previous client data is cleared');
  newReads[0]({ ok: true, data: [{ summary: 'New client' }] });
  await new Promise(setImmediate);
  oldReads[2]({ ok: true, data: [{ summary: 'Obsolete client' }] });
  await oldClientRefresh;
  const current = h.resource('admin/audit');
  assert.equal(current.data[0].summary, 'New client');
  const pendingAtUnmount = current.load();
  h.unmount();
  newReads[1]({ ok: true, data: [{ summary: 'After unmount' }] });
  await pendingAtUnmount;
  await current.load();
  assert.equal(newReads.length, 2, 'An unmounted owner cannot start another read');
  assert.equal(h.resource('admin/audit').data[0].summary, 'New client', 'An unmounted response was discarded');
});

test('admin config saves one captured revision and blocks duplicate saves and edits while pending', async () => {
  let finish;
  const writes = [];
  const h = harness(async (path, init) => {
    assert.equal(path, 'admin/config');
    if (!init) return { ok: true, data: envelope() };
    writes.push(init);
    return new Promise(resolve => { finish = resolve; });
  });
  (await h.loaded()).update({ parallelChats: 5 });
  const edited = h.render();
  assert.equal(edited.dirty, true);
  const first = edited.save(), duplicate = edited.save();
  assert.equal(writes.length, 1, 'The second submit is blocked before React rerenders');
  assert.equal(writes[0].body.expectedRevision, 4);
  assert.equal(writes[0].body.config.parallelChats, 5);
  const pending = h.render();
  assert.equal(pending.saving, true);
  pending.update({ parallelChats: 2 }); pending.reload();
  assert.equal(h.render().draft.parallelChats, 5);
  finish({ ok: true, data: { ...envelope(5), config: writes[0].body.config } });
  await Promise.all([first, duplicate]);
  const saved = h.render();
  assert.equal(saved.saving, false);
  assert.equal(saved.base.revision, 5);
  assert.equal(saved.draft.parallelChats, 5);
  assert.equal(saved.dirty, false);
  assert.equal(saved.saved, true);
  await saved.save();
  assert.equal(writes.length, 1, 'An unchanged revision is not written again');
});

test('admin config keeps invalid, failed and stale edits until an explicit reload', async () => {
  let reads = 0;
  const writes = [];
  const h = harness(async (_path, init) => {
    if (!init) return { ok: true, data: envelope(++reads === 1 ? 7 : 9) };
    writes.push(init);
    return { ok: false, reason: writes.length === 1 ? 'error' : 'stale', message: 'Try again' };
  });
  (await h.loaded()).update({ parallelChats: 0 });
  const invalid = h.render();
  assert.ok(invalid.errors.parallelChats);
  await invalid.save();
  assert.equal(writes.length, 0);
  invalid.update({ parallelChats: 4 });
  await h.render().save();
  const failure = h.render();
  assert.equal(failure.saveResult.reason, 'error');
  assert.equal(failure.saving, false);
  assert.equal(failure.draft.parallelChats, 4);
  await failure.save();
  const stale = h.render();
  assert.equal(stale.saveResult.reason, 'stale');
  assert.equal(stale.base.revision, 7);
  assert.equal(stale.draft.parallelChats, 4);
  assert.equal(writes[1].body.expectedRevision, 7, 'A conflict never silently adopts a newer revision');
  stale.reload();
  assert.equal(h.render().draft, null);
  await new Promise(setImmediate); h.render();
  const refreshed = h.render();
  assert.equal(refreshed.base.revision, 9);
  assert.equal(refreshed.draft.parallelChats, 3);
  assert.equal(refreshed.saveResult, null);
});
function formHarness(configState = {}) {
  const slots = [];
  let cursor = 0;
  const hooks = { ...React,
    useId: () => 'field-id',
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  };
  const exports = {};
  const source = readFileSync(new URL('../src/components/admin/form.tsx', import.meta.url), 'utf8');
  const useAdminConfig = () => configState;
  const ResultState = () => null;
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === './use-admin') return { useAdminConfig, ResultState };
      if (name.endsWith('.module.css')) return { default: {} };
      return new Proxy({}, { get: (_target, key) => key });
    },
  });
  return { render(name, props) { cursor = 0; return exports[name](props); }, ResultState };
}
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}

test('config form only announces actual loading and disables the editable group while saving', () => {
  const state = { result: { ok: true, data: envelope() }, draft: config.emptyConfig(), base: envelope(), errors: {}, dirty: true, saving: true, saveResult: null };
  const h = formHarness(state);
  const tree = elements(h.render('ConfigPage', { title: 'Agent', description: 'Configuration', children: () => null }));
  assert.equal(tree.find(e => e.type === 'fieldset').props.disabled, true);
  assert.equal(tree.find(e => e.type === 'form').props['aria-busy'], true);
  const notices = tree.filter(e => e.type === h.ResultState);
  assert.equal(notices.length, 1, 'An idle save result does not render a second Loading state');
  assert.equal(notices[0].props.result.ok, true);
  assert.equal(tree.filter(e => e.type === 'Button').every(e => e.props.disabled), true);
});

test('fields associate both helper and validation text with their control', () => {
  const h = formHarness();
  const tree = elements(h.render('Field', { label: 'URL', hint: 'HTTPS only', error: 'Enter a URL', children: props => React.createElement('input', props) }));
  const control = tree.find(e => e.type === 'input');
  assert.equal(control.props['aria-invalid'], true);
  assert.equal(control.props['aria-describedby'], 'field-id-note field-id-error');
  assert.equal(tree.find(e => e.type === 'label').props.htmlFor, control.props.id);
  assert.equal(tree.find(e => e.props.id === 'field-id-note').props.children, 'HTTPS only');
  assert.equal(tree.find(e => e.props.id === 'field-id-error').props.children, 'Enter a URL');
});

test('chip entry respects text composition and explains a duplicate without clearing the draft', () => {
  const h = formHarness(), changes = [];
  const props = { label: 'Domains', values: ['example.org'], max: 30, onChange: next => changes.push(next) };
  const controls = () => {
    const field = h.render('ChipList', props);
    return { field, nodes: elements(field.props.children({ id: 'domains' })) };
  };
  controls().nodes.find(e => e.type === 'Input').props.onChange({ target: { value: 'example.org' } });
  let prevented = 0;
  controls().nodes.find(e => e.type === 'Input').props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: true }, preventDefault() { prevented++; } });
  assert.equal(prevented, 0);
  assert.equal(changes.length, 0);
  controls().nodes.find(e => e.type === 'Input').props.onKeyDown({ key: 'Enter', nativeEvent: { isComposing: false }, preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  assert.equal(changes.length, 0);
  assert.match(controls().field.props.error, /already in the list/);
  assert.equal(controls().nodes.find(e => e.type === 'Input').props.value, 'example.org');
  controls().nodes.find(e => e.type === 'Input').props.onChange({ target: { value: 'other.org' } });
  controls().nodes.find(e => e.type === 'Button').props.onClick();
  assert.deepEqual(Array.from(changes[0]), ['example.org', 'other.org']);
  assert.equal(controls().nodes.find(e => e.type === 'Input').props.value, '');
});
