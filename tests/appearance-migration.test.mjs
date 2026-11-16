import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

const key = 'datumm-appearance';
const backupKey = key + ':before-affectui-v2';
const theme = JSON.parse(readFileSync(new URL('../src/lib/themes/affectui.json', import.meta.url), 'utf8'));
const v2 = mode => ({ version: 2, palette: 'affectui', mode });
const plain = value => JSON.parse(JSON.stringify(value));
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;

function storage(initial = {}, failure = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return { values, writes,
    getItem(name) { if (failure.read === true || failure.read === name) throw Error('read denied'); return values.get(name) ?? null; },
    setItem(name, value) { if (failure.write === true || failure.write === name) throw Error('write denied'); writes.push([name, value]); values.set(name, value); },
  };
}
function environment(store, systemDark = false) {
  const properties = new Map(), classes = new Set(), listeners = new Map(), windowListeners = new Map();
  const root = { dataset: {}, style: { setProperty: (name, value) => properties.set(name, value) },
    classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } } };
  const media = { matches: systemDark,
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name, callback) { if (listeners.get(name) === callback) listeners.delete(name); },
  };
  const context = { document: { documentElement: root }, localStorage: store, TextEncoder, Event,
    matchMedia: () => media, window: { localStorage: store,
      addEventListener(name, callback) { windowListeners.set(name, callback); },
      removeEventListener(name, callback) { if (windowListeners.get(name) === callback) windowListeners.delete(name); },
      dispatchEvent(event) { windowListeners.get(event.type)?.(event); },
    } };
  const exports = {};
  runInNewContext(compile(readFileSync(new URL('../src/lib/appearance.ts', import.meta.url), 'utf8')), {
    ...context, exports, require(name) { assert.equal(name, './themes/affectui.json'); return { default: theme }; },
  });
  return { context, exports, root, properties, classes, media, listeners, windowListeners,
    bootstrap() { runInNewContext(exports.appearanceBootstrap, context); },
  };
}

function settingsHarness(env) {
  const slots = [], pending = [];
  let cursor = 0;
  const hooks = { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(setup, deps) { const i = cursor++; if (!slots[i] || deps.some((value, j) => !Object.is(value, slots[i].deps[j]))) {
      const previous = slots[i]; slots[i] = { deps }; pending.push(() => { previous?.cleanup?.(); slots[i].cleanup = setup(); });
    } },
  };
  const exports = {};
  runInNewContext(compile(readFileSync(new URL('../src/components/theme-settings.tsx', import.meta.url), 'utf8')), {
    ...env.context, exports, require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === '@/lib/appearance') return env.exports;
      if (name === './ui/button') return { Button: 'button' };
      if (name.endsWith('.module.css')) return { default: {} };
      throw Error('Unexpected import ' + name);
    },
  });
  return {
    render(slots = {}) { cursor = 0; const tree = exports.ThemeSettings({ motionRow: null, advancedControl: null, ...slots }); pending.splice(0).forEach(fn => fn()); return tree; },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
function elements(tree, predicate) {
  const found = [];
  function visit(node) { if (!React.isValidElement(node)) return; if (predicate(node)) found.push(node); React.Children.forEach(node.props.children, visit); }
  visit(tree); return found;
}
const byText = (tree, text) => elements(tree, node => node.type === 'button' && node.props.children === text)[0];
const modeSelect = tree => elements(tree, node => node.props['aria-label'] === 'Color theme')[0];

// Execute the exact effect from the production hook, with its actual appearance imports.
function mountWorkspaceAppearance(env) {
  const source = readFileSync(new URL('../src/components/workspace/use-workspace-state.ts', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('use-workspace-state.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.getText(ast).includes('applyAppearance')) effect = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(effect, 'Production workspace appearance effect exists');
  assert.match(effect, /readAppearance\s*\(/, 'The actual hook uses the migration reader');
  let cleanup;
  runInNewContext(compile(effect), { ...env.context, ...env.exports, useEffect(setup) { cleanup = setup(); } });
  return cleanup;
}

test('v2 parsing accepts only fixed affectUI modes and rejects imported/custom CSS or legacy shapes', () => {
  const { exports: api } = environment(storage());
  for (const mode of ['dark', 'light', 'system']) assert.deepEqual(plain(api.parseAppearance(v2(mode))), v2(mode));
  for (const value of [null, [], {}, { palette: 'affectui', mode: 'light' }, { ...v2('dark'), palette: 'nord' },
    { ...v2('dark'), version: 3 }, { ...v2('light'), mode: 'sepia' }, { ...v2('dark'), custom: {} },
    { ...v2('dark'), color: 'url(https://example.invalid)' }]) assert.throws(() => api.parseAppearance(value));
});

test('legacy palettes and custom overrides contribute only mode and get one exact recoverable backup', () => {
  for (const mode of ['dark', 'light', 'system']) {
    const raw = JSON.stringify({ palette: 'nord', mode, custom: { light: { background: '#ff0000' } } });
    const store = storage({ [key]: raw });
    const env = environment(store);
    assert.deepEqual(plain(env.exports.readAppearance()), v2(mode));
    assert.equal(store.values.get(backupKey), raw);
    assert.deepEqual(JSON.parse(store.values.get(key)), v2(mode));
    assert.deepEqual(plain(env.exports.readAppearance()), v2(mode));
    assert.equal(store.writes.filter(([name]) => name === backupKey).length, 1);
    assert.equal(store.writes.length, 2, 'A valid v2 read performs no writes');
  }
});

test('the shared reader accepts explicit storage and keeps readable mode when backup reads are denied', () => {
  const env = environment(storage({}, { read: true }));
  const raw = JSON.stringify({ mode: 'system', palette: 'nord' });
  const explicit = storage({ [key]: raw }, { read: backupKey });
  assert.deepEqual(plain(env.exports.readAppearance(explicit)), v2('system'));
  assert.equal(explicit.values.get(key), raw);
  assert.equal(explicit.writes.length, 0);
});

test('readable legacy Light/System survive independent backup/new-write failures in reader and first paint', () => {
  for (const mode of ['light', 'system']) for (const failedWrite of [backupKey, key]) for (const systemDark of [true, false]) {
    const raw = JSON.stringify({ palette: 'tokyonight', mode });
    const store = storage({ [key]: raw }, { write: failedWrite });
    const env = environment(store, systemDark);
    assert.deepEqual(plain(env.exports.readAppearance()), v2(mode));
    env.bootstrap();
    assert.equal(env.root.dataset.theme, mode === 'system' && systemDark ? 'dark' : 'light');
    assert.equal(env.properties.get('--page'), theme[env.root.dataset.theme].page);
    assert.equal(store.values.get(key), raw, 'Failed migration leaves legacy record untouched');
    assert.equal(store.values.get(backupKey), failedWrite === backupKey ? undefined : raw);
  }
});

test('malformed, unsupported and denied storage choose Dark without reactivating legacy colors', () => {
  for (const raw of ['{bad', 'null', '[]', JSON.stringify({ version: 1, mode: 'light' }), JSON.stringify({ palette: 'nord', mode: 'invalid' }), JSON.stringify({ ...v2('light'), custom: {} })]) {
    const store = storage({ [key]: raw }); const env = environment(store);
    assert.deepEqual(plain(env.exports.readAppearance()), v2('dark'));
    env.bootstrap(); assert.equal(env.root.dataset.theme, 'dark'); assert.equal(store.writes.length, 0);
  }
  const env = environment(storage({}, { read: true }));
  assert.deepEqual(plain(env.exports.readAppearance()), v2('dark'));
  env.bootstrap(); assert.equal(env.properties.get('--panel'), '#141416');
  Object.defineProperty(env.context.window, 'localStorage', { get() { throw Error('access denied'); } });
  assert.deepEqual(plain(env.exports.readAppearance()), v2('dark'));
  env.bootstrap(); assert.equal(env.root.dataset.theme, 'dark');
});

test('the backup limit counts UTF-8 bytes, preserves an existing backup, and never truncates oversized legacy data', () => {
  const base = JSON.stringify({ mode: 'light', custom: '' });
  const exact = JSON.stringify({ mode: 'light', custom: 'x'.repeat(16384 - Buffer.byteLength(base)) });
  assert.equal(Buffer.byteLength(exact), 16384);
  const accepted = storage({ [key]: exact });
  assert.equal(environment(accepted).exports.readAppearance().mode, 'light');
  assert.equal(accepted.values.get(backupKey), exact);
  const unicode = JSON.stringify({ mode: 'system', custom: 'é'.repeat(9000) });
  assert.ok(unicode.length < 16384 && Buffer.byteLength(unicode) > 16384);
  const denied = storage({ [key]: unicode }); const env = environment(denied);
  assert.equal(env.exports.readAppearance().mode, 'system'); env.bootstrap();
  assert.equal(denied.values.get(key), unicode); assert.equal(denied.writes.length, 0);
  const existing = storage({ [key]: JSON.stringify({ mode: 'light' }), [backupKey]: '{"previous":"retained"}' });
  environment(existing).exports.readAppearance();
  assert.equal(existing.values.get(backupKey), '{"previous":"retained"}');
  assert.equal(existing.writes.some(([name]) => name === backupKey), false);
});

test('save refuses to replace unbacked legacy/malformed data and allows retry after storage recovery', () => {
  for (const raw of [JSON.stringify({ mode: 'light', palette: 'nord' }), '{malformed']) for (const write of [backupKey, key]) {
    const failure = { write }; const store = storage({ [key]: raw }, failure); const env = environment(store);
    assert.throws(() => env.exports.saveAppearance(v2('dark')), /write denied/);
    assert.equal(store.values.get(key), raw);
    failure.write = undefined;
    env.exports.saveAppearance(v2('dark'));
    assert.equal(store.values.get(backupKey), raw);
    assert.deepEqual(JSON.parse(store.values.get(key)), v2('dark'));
  }
  const oversized = JSON.stringify({ mode: 'light', custom: 'x'.repeat(17000) });
  const store = storage({ [key]: oversized }); const env = environment(store);
  assert.throws(() => env.exports.saveAppearance(v2('dark')), /too large/);
  assert.equal(store.values.get(key), oversized); assert.equal(store.writes.length, 0);
});

test('first paint restores app motion on every route independently of denied appearance reads, without rewriting accessibility', () => {
  for (const motion of ['reduce', 'full', 'unexpected', null]) {
    const initial = { 'datumm-contrast': 'high' }; if (motion !== null) initial['datumm-motion'] = motion;
    const store = storage(initial, { read: key }); const env = environment(store);
    env.bootstrap();
    assert.equal(env.root.dataset.motion, motion === 'reduce' ? 'reduce' : 'full');
    assert.equal(env.root.dataset.contrast, 'high'); assert.equal(env.properties.get('--text'), '#ffffff');
    assert.equal(store.writes.length, 0);
    assert.equal(store.values.get('datumm-motion'), motion === null ? undefined : motion);
  }
});

test('trusted frozen alpha roles, state colors and vendor bridges match boot/runtime without readability rewrites', () => {
  for (const mode of ['dark', 'light']) {
    const env = environment(storage({ [key]: JSON.stringify(v2(mode)) }));
    env.bootstrap();
    for (const [name, value] of Object.entries(theme[mode])) assert.equal(env.properties.get('--' + name), value, mode + ':' + name);
    const firstPaint = new Map(env.properties);
    env.exports.applyAppearance(v2(mode));
    assert.deepEqual(env.properties, firstPaint);
    assert.equal(env.properties.get('--aui-text'), 'var(--text)');
    assert.equal(env.properties.get('--aui-muted'), 'var(--muted)');
    assert.equal(env.properties.get('--aui-shadow-ink'), 'var(--shadow-ink)');
    const tokens = env.exports.appearanceTokens({ ...v2(mode), palette: 'nord', custom: { [mode]: { background: '#ff0000' } } }, mode === 'dark');
    assert.equal(tokens.background, theme[mode].page);
    tokens.ink = 'changed'; assert.equal(env.exports.appearanceTokens(v2(mode), mode === 'dark').ink, theme[mode].ink);
    env.root.dataset.contrast = 'high'; env.exports.applyAppearance(v2(mode));
    assert.equal(env.properties.get('--text'), mode === 'dark' ? '#ffffff' : '#000000');
    env.root.dataset.contrast = 'normal'; env.exports.applyAppearance(v2(mode));
    assert.equal(env.properties.get('--text'), theme[mode].text);
  }
});

test('actual workspace hydration and system-change effect preserve legacy Light/System with each write failure', () => {
  for (const mode of ['light', 'system']) for (const write of [backupKey, key]) {
    const raw = JSON.stringify({ palette: 'nord', mode });
    const env = environment(storage({ [key]: raw }, { write }), false);
    const cleanup = mountWorkspaceAppearance(env);
    assert.equal(env.root.dataset.theme, 'light');
    env.media.matches = true; env.listeners.get('change')();
    assert.equal(env.root.dataset.theme, mode === 'system' ? 'dark' : 'light');
    assert.equal(env.context.localStorage.values.get(key), raw);
    cleanup(); assert.equal(env.listeners.size, 0);
  }
});

test('actual workspace accessibility hydration tolerates denied reads and retains readable preferences', () => {
  const source = readFileSync(new URL('../src/components/workspace/use-workspace-state.ts', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('use-workspace-state.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let effect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.getText(ast).includes('dataset[name]')) effect = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(effect, 'Production preference hydration effect exists');
  const denied = environment(storage({}, { read: true }));
  denied.root.dataset.motion = 'reduce';
  assert.doesNotThrow(() => runInNewContext(compile(effect), { ...denied.context, useEffect: setup => setup() }));
  assert.equal(denied.root.dataset.motion, 'reduce', 'Failed hydration keeps the pre-render setting');
  const readable = environment(storage({ 'datumm-motion': 'reduce', 'datumm-contrast': 'high', 'datumm-density': 'compact', 'datumm-scale': '115' }));
  runInNewContext(compile(effect), { ...readable.context, useEffect: setup => setup() });
  assert.deepEqual(readable.root.dataset, { motion: 'reduce', contrast: 'high', density: 'compact', scale: '115' });
});

test('Appearance hydration, cancel and cleanup use the migration reader; failed save retains preview and retry', () => {
  const raw = JSON.stringify({ palette: 'nord', mode: 'light' });
  const failure = { write: backupKey }; const store = storage({ [key]: raw }, failure); const env = environment(store);
  env.bootstrap(); const h = settingsHarness(env); h.render(); let tree = h.render();
  assert.equal(modeSelect(tree).props.value, 'light');
  modeSelect(tree).props.onChange({ target: { value: 'dark' } }); tree = h.render();
  assert.equal(env.root.dataset.theme, 'dark');
  byText(tree, 'Apply appearance').props.onClick(); tree = h.render();
  assert.equal(modeSelect(tree).props.value, 'dark'); assert.equal(env.root.dataset.theme, 'dark');
  assert.equal(byText(tree, 'Apply appearance').props.disabled, false, 'Storage failure remains retryable');
  assert.equal(elements(tree, node => node.props.role === 'alert').length, 1);
  byText(tree, 'Cancel preview').props.onClick(); tree = h.render();
  assert.equal(modeSelect(tree).props.value, 'light'); assert.equal(env.root.dataset.theme, 'light');
  modeSelect(tree).props.onChange({ target: { value: 'system' } }); tree = h.render();
  failure.write = undefined; byText(tree, 'Apply appearance').props.onClick(); tree = h.render();
  const download = elements(tree, node => node.type === 'a' && node.props.download)[0];
  assert.equal(decodeURIComponent(download.props.href.split(',')[1]), raw);
  assert.equal(elements(tree, node => node.props.type === 'color' || node.props.type === 'file' || node.props['aria-label'] === 'Color palette').length, 0);
  modeSelect(tree).props.onChange({ target: { value: 'dark' } }); h.render(); h.unmount();
  assert.equal(env.root.dataset.theme, 'light', 'Cleanup restores saved System on light OS');
  assert.equal(env.listeners.size, 0); assert.equal(env.windowListeners.size, 0);
});

test('Appearance still hydrates and tears down when all storage access is denied', () => {
  const env = environment(storage({}, { read: true, write: true }));
  env.bootstrap(); const h = settingsHarness(env);
  assert.doesNotThrow(() => { h.render(); h.render(); h.unmount(); });
  assert.equal(env.root.dataset.theme, 'dark');
});

test('actual Appearance provides motion/contrast controls on unchanged keys and honors caller slots', () => {
  const store = storage({ [key]: JSON.stringify(v2('light')), 'datumm-motion': 'reduce', 'datumm-contrast': 'high' });
  const env = environment(store); env.bootstrap(); const h = settingsHarness(env); h.render(); let tree = h.render();
  const select = label => elements(tree, node => node.props['aria-label'] === label)[0];
  assert.equal(select('Motion preference').props.value, 'reduce');
  assert.equal(select('Contrast preference').props.value, 'high');
  select('Contrast preference').props.onChange({ target: { value: 'normal' } }); tree = h.render();
  assert.equal(env.root.dataset.contrast, 'normal');
  assert.equal(env.properties.get('--text'), theme.light.text);
  assert.equal(store.values.get('datumm-contrast'), 'normal');
  select('Motion preference').props.onChange({ target: { value: 'full' } }); tree = h.render();
  assert.equal(env.root.dataset.motion, 'full'); assert.equal(store.values.get('datumm-motion'), 'full');
  tree = h.render({ motionRow: 'Provided motion control', advancedControl: 'Provided contrast control' });
  assert.equal(elements(tree, node => ['Motion preference', 'Contrast preference'].includes(node.props['aria-label'])).length, 0);
  h.unmount();
});
