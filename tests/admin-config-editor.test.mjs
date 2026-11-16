import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as config from '../src/lib/admin-config.mjs';
import * as capabilities from '../src/lib/capabilities.mjs';
import * as history from '../src/lib/admin-history.mjs';

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
    render(enabled) { cursor = 0; const value = exports.useAdminConfig(enabled); pendingEffects.splice(0).forEach(fn => fn()); return value; },
    resource(path, pollMs) { cursor = 0; const value = exports.useAdminResource(path, pollMs); pendingEffects.splice(0).forEach(fn => fn()); return value; },
    tick() { [...timers.values()].forEach(fn => fn()); },
    replaceClient(next) { client = next; },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
    replayEffects() { slots.filter(slot => slot?.setup).forEach(slot => { slot.cleanup?.(); slot.cleanup = slot.setup(); }); },
    async loaded() { this.render(); await new Promise(setImmediate); this.render(); return this.render(); },
  };
}

test('admin config fetch is lazy and retained while the activated owner stays mounted', async () => {
  let reads=0,finish;const writes=[];
  const h=harness((_path,init)=>{if(init){writes.push(init);return new Promise(resolve=>{finish=resolve;});}reads++;return Promise.resolve({ok:true,data:envelope(3)});});
  h.render(false);await new Promise(setImmediate);h.render(false);assert.equal(reads,0);
  h.render(true);await new Promise(setImmediate);h.render(true);h.render(true);assert.equal(reads,1);
  h.render(true).update({parallelChats:4});h.render(true);h.render(true);
  assert.equal(reads,1);assert.equal(h.render(true).draft.parallelChats,4);
  const pending=h.render(true).save();assert.equal(writes[0].body.expectedRevision,3);
  h.render(true); // The root owner stays mounted as the admin route exits.
  finish({ok:true,data:{...envelope(4),config:{...config.emptyConfig(),parallelChats:4}}});await pending;
  assert.equal(h.render(true).base.revision,4);assert.equal(h.render(true).dirty,false);assert.equal(reads,1);
});
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

test('a save completion from an old admin client cannot update the new owner', async () => {
  let finishSave;
  const h = harness((_path, init) => init ? new Promise(resolve => { finishSave = resolve; }) : Promise.resolve({ ok: true, data: envelope(3) }));
  (await h.loaded()).update({ parallelChats: 4 });
  const pending = h.render().save();
  h.replaceClient(() => Promise.resolve({ ok: true, data: envelope(7) }));
  h.render();
  finishSave({ ok: true, data: { ...envelope(4), config: { ...config.emptyConfig(), parallelChats: 4 } } });
  await pending;
  await new Promise(setImmediate); h.render();
  assert.equal(h.render().base.revision, 7);
  assert.equal(h.render().draft.parallelChats, 3);
  assert.equal(h.render().saved, false);
  assert.equal(h.render().saving, false);
});
function formHarness(configState = {}) {
  const slots = [], cleanups = [];
  let cursor = 0;
  const hooks = { ...React,
    useId: () => 'field-id',
    useContext: () => configState,
    useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
  };
  const exports = {};
  const source = readFileSync(new URL('../src/components/admin/form.tsx', import.meta.url), 'utf8');
  const useAdminConfig = () => configState;
  const ResultState = () => null;
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, window: { confirm: () => false },
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === './use-admin') return { useAdminConfig, ResultState };
      if (name === './capabilities-context') return { useCapabilities: () => configState.caps ?? null };
      if (name === '@/lib/capabilities.mjs') return capabilities;
      if (name === 'next/link') return { default: 'Link' };
      if (name.endsWith('.module.css')) return { default: {} };
      return new Proxy({}, { get: (_target, key) => key });
    },
  });
  return { render(name, props) { cursor = 0; return exports[name](props); }, unmount() { cleanups.forEach(fn=>fn()); }, ResultState };
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

test('settings groups mount the licensed noninteractive section without changing labels or children', () => {
  const child=React.createElement('input',{id:'actual-setting',defaultValue:'unsaved value'});
  const group=formHarness().render('SettingsGroup',{title:'Models',description:'Reported models',children:child});
  assert.equal(group.type,'Card');
  assert.equal(group.props.as,'section');
  assert.equal(group.props['aria-labelledby'],'field-id');
  assert.equal(group.props.interactive,undefined);
  assert.equal(group.props.onClick,undefined);
  const nodes=elements(group);
  assert.equal(nodes.find(node=>node.type==='h2').props.id,'field-id');
  assert.equal(group.props.children[1].props.children,child);
});

test('admin shell retains one config owner and offers stay or leave with focus return', () => {
  const calls=[], slots=[], configState={dirty:true,saving:false,knowledge:{url:'',title:'',corpus:'other'},discardAll:()=>calls.push(['discard'])}, auth={isLoaded:true,userId:'account-a'};let cursor=0;
  const hooks={...React,
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    useRef(value){const i=cursor++;return slots[i]??={current:value};}, useEffect:()=>{}, useContext:()=>configState};
  const exports={};
  const source=readFileSync(new URL('../src/components/admin/admin-shell.tsx',import.meta.url),'utf8');
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,require(name){
      if(name==='react')return hooks;
      if(name==='react/jsx-runtime')return jsxRuntime;
      if(name==='next/navigation')return {usePathname:()=>'/admin/agent',useRouter:()=>({refresh(){},push:href=>calls.push(['push',href])})};
      if(name==='@clerk/nextjs')return {useAuth:()=>auth};
      if(name==='./form')return {AdminConfigProvider:'AdminConfigProvider',useOptionalAdminConfig:()=>null,useSharedAdminConfig:()=>configState};
      if(name==='@/lib/utils')return {cn:(...parts)=>parts.filter(Boolean).join(' ')};
      if(name==='next/link')return {default:'Link'};
      if(name==='./use-admin')return {useAdminResource:()=>({data:null}),ResultState:'ResultState'};
      if(name==='@/lib/capabilities.mjs')return capabilities;
      return new Proxy({}, {get:(_target,key)=>key});
    }});
  const shell=exports.AdminShell({email:'a@example.test',children:'section'});
  assert.equal(shell.type,'AdminConfigProvider');
  const render=()=>{cursor=0;return shell.props.children.type(shell.props.children.props);};
  const content=render();
  const nodes=elements(content);
  const nav=nodes.find(node=>typeof node.type==='function'&&node.type.name==='Nav');
  const footer=nodes.find(node=>typeof node.type==='function'&&node.type.name==='SidebarFooter');
  let prevented=0;
  const trigger={focus:()=>calls.push(['focus'])};
  const event={button:0,currentTarget:trigger,preventDefault(){prevented++;}};
  nav.props.onNavigate(event,'/admin/skills');
  assert.equal(prevented,0,'Admin navigation retains the shared draft');
  configState.pendingChipCount=1;
  nav.props.onNavigate(event,'/admin/skills');
  assert.equal(prevented,0,'Unadded list text remains in the shared owner between sections');
  configState.pendingChipCount=0;calls.length=0;prevented=0;
  footer.props.onNavigate(event,'/');
  assert.equal(prevented,1,'Stay cancels workspace navigation');
  let dialog=elements(render()).find(node=>node.type==='DialogContent');
  assert.match(elements(dialog).find(node=>node.type==='DialogDescription').props.children,/unsaved/);
  elements(dialog).find(node=>node.type==='Button'&&node.props.children==='Stay').props.onClick();
  dialog.props.onCloseAutoFocus({preventDefault(){}});assert.deepEqual(calls.pop(),['focus']);
  footer.props.onNavigate(event,'/');dialog=elements(render()).find(node=>node.type==='DialogContent');
  elements(dialog).find(node=>node.type==='Button'&&node.props.children==='Leave').props.onClick();
  assert.deepEqual(calls.pop(),['push','/']);
  assert.deepEqual(calls.pop(),['discard']);
  let preventedFocus=0;dialog.props.onCloseAutoFocus({preventDefault(){preventedFocus++;}});
  assert.equal(preventedFocus,0,'Leaving does not focus an element being unmounted');
  configState.dirty=false;configState.saving=true;
  footer.props.onNavigate(event,'/');assert.equal(prevented,3);
  dialog=elements(render()).find(node=>node.type==='DialogContent');
  assert.match(elements(dialog).find(node=>node.type==='DialogDescription').props.children,/request is in progress/);
  const newTab={button:0,ctrlKey:true,preventDefault(){throw Error('New tab must not be blocked');}};
  footer.props.onNavigate(newTab,'/');
  const gated=exports.AdminShell({email:'same@example.test',accountId:'account-a',children:'private'});
  const authorized=gated.type(gated.props);
  assert.equal(authorized.type,'AdminConfigProvider');
  assert.match(authorized.key,/account-a/);
  auth.userId='account-b';
  const denied=gated.type(gated.props);
  assert.equal(denied.type,'p');assert.equal(denied.props.role,'status');
  assert.notEqual(denied.props.children,'private','A different subject cannot retain the old config owner');
});

// The real ResultState copy is needed to prove the missing-backend text, not just the reason code.
function loadResultState() {
  const exports = {};
  const source = readFileSync(new URL('../src/components/admin/use-admin.tsx', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, fetch() { throw Error('Tests must use the injected client'); }, document: { hidden: false },
    require(name) {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === '@/lib/admin-config.mjs') return config;
      if (name.endsWith('.module.css')) return { default: {} };
      return new Proxy({}, { get: () => () => null });
    },
  });
  return exports.ResultState;
}

test('admin shell hides nav items the backend reports off and shows the missing state on their route', () => {
  const ResultState = loadResultState();
  const calls = [], slots = [], configState = { dirty: false, saving: false, knowledge: { url: '', title: '', corpus: 'other' } };
  let cursor = 0, resourceData = null;
  const hooks = { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; }, useEffect: () => {}, useContext: () => configState };
  const exports = {};
  const source = readFileSync(new URL('../src/components/admin/admin-shell.tsx', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'next/navigation') return { usePathname: () => '/admin', useRouter: () => ({ refresh() {}, push: href => calls.push(['push', href]) }) };
      if (name === '@clerk/nextjs') return { useAuth: () => ({ isLoaded: true, userId: 'account-a' }) };
      if (name === './form') return { AdminConfigProvider: 'AdminConfigProvider', useOptionalAdminConfig: () => null, useSharedAdminConfig: () => configState };
      if (name === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
      if (name === 'next/link') return { default: 'Link' };
      if (name === './use-admin') return { useAdminResource: () => ({ data: resourceData }), ResultState };
      if (name === '@/lib/capabilities.mjs') return capabilities;
      return new Proxy({}, { get: (_target, key) => key });
    }});
  const render = activePath => {
    const shell = exports.AdminShell({ email: 'a@example.test', children: 'section', activePath });
    cursor = 0;
    return elements(shell.props.children.type(shell.props.children.props));
  };
  const navLinks = nodes => {
    const nav = nodes.find(node => typeof node.type === 'function' && node.type.name === 'Nav');
    return elements(nav.type(nav.props)).filter(node => node.type === 'Link').map(node => node.props.href);
  };
  const text = node => typeof node === 'string' ? [node] : React.isValidElement(node) ? text(node.props.children) : Array.isArray(node) ? node.flatMap(text) : [];

  resourceData = { capabilities: { version: 1, features: { adminConfig: true, adminAudit: false, adminOverview: true, adminKnowledge: true, planningGoals: false } } };
  assert.ok(navLinks(render('/admin')).includes('/admin'), 'Overview stays visible when adminOverview is on');
  assert.ok(!navLinks(render('/admin')).includes('/admin/audit'), 'Audit nav is hidden when adminAudit is off');
  const missing = render('/admin/audit').find(node => node.type === ResultState);
  assert.ok(missing, 'Audit route renders the missing-backend state');
  assert.equal(missing.props.result.reason, 'missing');
  assert.match(text(missing.type(missing.props)).join(''), /Not provided by this backend/);
  resourceData = null;
  assert.ok(navLinks(render('/admin')).includes('/admin/audit'), 'Without capabilities every nav item stays visible');
});

test('the Traces nav item and page need adminTraces on; unknown counts as off', () => {
  const ResultState = loadResultState();
  const slots = [], configState = { dirty: false, saving: false };
  let cursor = 0, resource = {};
  const hooks = { ...React, useEffect: () => {}, useContext: () => configState,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], () => {}];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; } };
  const exports = {};
  const url = new URL('../src/components/admin/admin-shell.tsx', import.meta.url);
  const source = readFileSync(url, 'utf8');
  const options = {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  };
  runInNewContext(ts.transpileModule(source, { compilerOptions: options }).outputText, {
    exports, require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'next/navigation') return { usePathname: () => '/admin', useRouter: () => ({}) };
      if (name === './form') {
        return { AdminConfigProvider: 'Provider', useSharedAdminConfig: () => configState };
      }
      if (name === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
      if (name === 'next/link') return { default: 'Link' };
      if (name === './use-admin') return { useAdminResource: () => resource, ResultState };
      if (name === '@/lib/capabilities.mjs') return capabilities;
      return new Proxy({}, { get: (_target, key) => key });
    } });
  const render = activePath => {
    const props = { email: 'a@example.test', children: 'traces page', activePath };
    const shell = exports.AdminShell(props);
    cursor = 0;
    return elements(shell.props.children.type(shell.props.children.props));
  };
  const links = () => {
    const nav = render('/admin').find(node => node.type?.name === 'Nav');
    return elements(nav.type(nav.props)).filter(node => node.type === 'Link')
      .map(node => node.props.href);
  };
  const text = node => typeof node === 'string' ? [node]
    : React.isValidElement(node) ? text(node.props.children)
      : Array.isArray(node) ? node.flatMap(text) : [];
  const page = () => render('/admin/traces').find(node => node.type === ResultState);
  const features = extra => ({ capabilities: { version: 1,
    features: { adminAudit: true, ...extra } } });
  const loaded = data => { resource = { data, result: { ok: true, data } }; };

  resource = { data: null };
  assert.equal(page().props.result, null, 'a strict page waits for the config');
  for (const data of [null, features({}), features({ adminTraces: false })]) {
    loaded(data);
    assert.ok(!links().includes('/admin/traces'), JSON.stringify(data));
    assert.ok(links().includes('/admin/audit'), 'other items keep unknown-is-visible');
    const missing = page();
    assert.equal(missing.props.result.reason, 'missing');
    assert.match(text(missing.type(missing.props)).join(''), /Not provided by this backend/);
  }
  loaded(features({ adminTraces: true }));
  assert.ok(links().includes('/admin/traces'));
  assert.equal(render('/admin/traces').find(node => node.type === ResultState), undefined);
  assert.ok(render('/admin/traces').some(node => text(node).includes('traces page')));
});

test('unadded chip text is registered until added, cleared or the section unmounts', () => {
  const pending=new Map(),h=formHarness({setPendingChip:(id,value)=>value?pending.set(id,value):pending.delete(id)});
  const changes=[],props={label:'Allowed models',values:[],max:20,onChange:value=>changes.push(value)};
  const controls=()=>{const field=h.render('ChipList',props);return elements(field.props.children({id:'models'}));};
  controls().find(node=>node.type==='Input').props.onChange({target:{value:'model/example'}});
  assert.equal(pending.get('field-id'),'model/example');
  assert.equal(controls().find(node=>node.type==='Input').props.value,'model/example','Staying retains the entry');
  controls().find(node=>node.type==='Button').props.onClick();
  assert.equal(pending.size,0);assert.deepEqual(Array.from(changes[0]),['model/example']);
  controls().find(node=>node.type==='Input').props.onChange({target:{value:'unfinished'}});
  h.unmount();assert.equal(pending.size,0,'Explicitly leaving removes the unmounted entry');
});

test('stable chip keys restore the exact unadded text after the page remounts', () => {
  const pending={},state={pendingChips:pending,setPendingChip:(id,value)=>{if(value)pending[id]=value;else delete pending[id];}};
  const props={draftKey:'mcp:2',label:'Tool allow-list',values:[],max:50,onChange:()=>{}};
  const read=h=>{const field=h.render('ChipList',props);return elements(field.props.children({id:'tool'})).find(node=>node.type==='Input');};
  const first=formHarness(state);read(first).props.onChange({target:{value:'  tool_name  '}});first.unmount();
  assert.equal(pending['mcp:2'],'  tool_name  ');
  const second=formHarness(state);assert.equal(read(second).props.value,'  tool_name  ');
});

test('collapsed items retain local entries and deletion waits until they are resolved', () => {
  const h=formHarness({pendingChipCount:1});
  const nodes=elements(h.render('ItemCard',{title:'Server',subtitle:'Configured',open:false,onToggle:()=>{},onRemove:()=>{},children:'retained input'}));
  const body=nodes.find(node=>node.props.id==='field-id');
  assert.equal(body.props.hidden,true);assert.equal(body.props.children,'retained input');
  assert.equal(nodes.find(node=>node.type==='Button'&&node.props['aria-label']==='Delete Server').props.disabled,true);
});

test('admin provider registers reload protection only while edits or a save are pending', () => {
  const listeners=new Map(),cleanups=[];let state={dirty:false,saving:false};
  const hooks={...React,useEffect:fn=>cleanups.push(fn()),useContext:()=>state,useState:initial=>[initial,()=>{}],useCallback:fn=>fn,useRef:initial=>({current:initial})};
  const exports={},window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
  const source=readFileSync(new URL('../src/components/admin/form.tsx',import.meta.url),'utf8');
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,window,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;if(name==='./use-admin')return {useAdminConfig:()=>state,useAdminClient:()=>async()=>({ok:true})};if(name.endsWith('.module.css'))return {default:{}};return new Proxy({}, {get:(_target,key)=>key});}});
  exports.AdminConfigProvider({children:'page'});assert.equal(listeners.size,0);
  state={dirty:true,saving:false};exports.AdminConfigProvider({children:'page'});
  let prevented=0;const event={preventDefault(){prevented++;},returnValue:undefined};listeners.get('beforeunload')(event);
  assert.equal(prevented,1);assert.equal(event.returnValue,'');
  cleanups.at(-1)();assert.equal(listeners.size,0);
});

test('root admin owner lazily activates and retains exact drafts and in-flight Knowledge across route unmounts', async () => {
  const slots=[], effects=[], listeners=new Map(), calls=[];let cursor=0,finish;
  const changed=(old,next)=>!old||next.some((value,i)=>!Object.is(value,old[i]));
  const hooks={...React,
    useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    useCallback(fn,deps){const i=cursor++;if(changed(slots[i]?.deps,deps))slots[i]={deps,value:fn};return slots[i].value;},
    useEffect(fn,deps){const i=cursor++;if(changed(slots[i]?.deps,deps)){const old=slots[i],next=slots[i]={deps};effects.push(()=>{old?.cleanup?.();next.cleanup=fn();});}}};
  const exports={}, window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{if(listeners.get(name)===fn)listeners.delete(name);}};
  const state={dirty:false,saving:false,discard(){calls.push('discard');}};
  const source=readFileSync(new URL('../src/components/admin/form.tsx',import.meta.url),'utf8');
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,window,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;if(name==='./use-admin')return {useAdminConfig:enabled=>{calls.push(['enabled',enabled]);return state;},useAdminClient:()=>async(path,init)=>{calls.push(['request',path,init]);return new Promise(resolve=>{finish=resolve;});}};if(name.endsWith('.module.css'))return {default:{}};return new Proxy({}, {get:(_target,key)=>key});}});
  const render=()=>{cursor=0;const element=exports.AdminConfigProvider({children:'current route',accountId:'a',deferred:true});effects.splice(0).forEach(fn=>fn());return element.props.value;};
  let owner=render();assert.equal(calls.at(-1)[1],false,'Ordinary routes do not enable admin config');
  owner.activate('other');owner=render();assert.equal(calls.at(-1)[1],false);
  owner.activate('a');owner=render();assert.equal(calls.at(-1)[1],true);
  owner.setPendingChip('models','model/example');owner.setKnowledge({url:'https://example.invalid/a',title:'Draft',corpus:'revit'});
  owner=render();assert.equal(owner.pendingChips.models,'model/example');assert.equal(owner.knowledge.title,'Draft');assert.ok(listeners.has('beforeunload'));
  // Navigating away and back changes children, not this root owner's hooks.
  owner=render();assert.equal(owner.pendingChips.models,'model/example');assert.equal(owner.knowledge.url,'https://example.invalid/a');
  const first=owner.submitKnowledge();owner=render();assert.equal(owner.knowledgePending,true);
  assert.equal(await owner.submitKnowledge(),false,'A route remount cannot submit a second request');
  owner.setKnowledge({url:'https://example.invalid/b',title:'New draft',corpus:'other'});
  finish({ok:true,data:null});assert.equal(await first,true);owner=render();
  assert.equal(owner.knowledge.url,'https://example.invalid/b','A late success cannot clear a newer draft');
  const pending=owner.submitKnowledge();owner=render();owner.discardAll();owner=render();
  assert.equal(owner.knowledgePending,true,'A discarded in-flight request still blocks duplicate submission');
  assert.equal(listeners.has('beforeunload'),false,'Explicit discard suppresses the pending-request unload warning');
  assert.equal(await owner.submitKnowledge(),false);
  finish({ok:true,data:null});assert.equal(await pending,false);owner=render();
  assert.equal(owner.knowledge.url,'');assert.equal(owner.pendingChipCount,0);assert.equal(owner.knowledgePending,false);
  assert.equal(listeners.has('beforeunload'),false,'Explicit discard clears the unload warning');
  assert.equal(calls.filter(row=>Array.isArray(row)&&row[0]==='request').length,2);
  owner.activate('a');owner=render();owner.setKnowledge({url:'https://example.invalid/c',title:'',corpus:'other'});owner=render();
  const uncertain=owner.submitKnowledge();finish({ok:false,reason:'error',message:'offline'});assert.equal(await uncertain,false);
  owner=render();assert.equal(owner.knowledgeUnknown,true);assert.equal(await owner.submitKnowledge(),false);
  owner.allowKnowledgeRetry();owner=render();assert.equal(owner.knowledgeUnknown,false);
});

const textOf = node => typeof node === 'string' || typeof node === 'number' ? [String(node)]
  : React.isValidElement(node) ? textOf(node.props.children)
    : Array.isArray(node) ? node.flatMap(textOf) : [];

// @lat: [[contracts#Hosted contract tests#Admin history gating]]
test('the Config history nav item and page need adminHistory on; unknown counts as off', () => {
  const ResultState = loadResultState();
  const slots = [], configState = { dirty: false, saving: false };
  let cursor = 0, resource = {};
  const hooks = { ...React, useEffect: () => {}, useContext: () => configState,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], () => {}]; },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; } };
  const exports = {};
  const source = readFileSync(new URL('../src/components/admin/admin-shell.tsx', import.meta.url), 'utf8');
  const options = { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 };
  runInNewContext(ts.transpileModule(source, { compilerOptions: options }).outputText, {
    exports, require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === 'next/navigation') return { usePathname: () => '/admin', useRouter: () => ({}) };
      if (name === './form') return { AdminConfigProvider: 'Provider', useSharedAdminConfig: () => configState };
      if (name === '@/lib/utils') return { cn: (...parts) => parts.filter(Boolean).join(' ') };
      if (name === 'next/link') return { default: 'Link' };
      if (name === './use-admin') return { useAdminResource: () => resource, ResultState };
      if (name === '@/lib/capabilities.mjs') return capabilities;
      return new Proxy({}, { get: (_target, key) => key });
    } });
  const render = activePath => {
    const shell = exports.AdminShell({ email: 'a@example.test', children: 'history page', activePath });
    cursor = 0;
    return elements(shell.props.children.type(shell.props.children.props));
  };
  const links = () => {
    const nav = render('/admin').find(node => node.type?.name === 'Nav');
    return elements(nav.type(nav.props)).filter(node => node.type === 'Link').map(node => node.props.href);
  };
  const features = extra => ({ capabilities: { version: 1, features: { adminAudit: true, ...extra } } });
  const loaded = data => { resource = { data, result: { ok: true, data } }; };
  const page = () => render('/admin/history').find(node => node.type === ResultState);

  resource = { data: null };
  assert.equal(page().props.result, null, 'a strict page waits for the config');
  for (const data of [null, features({}), features({ adminHistory: false })]) {
    loaded(data);
    assert.ok(!links().includes('/admin/history'), JSON.stringify(data));
    assert.ok(links().includes('/admin/audit'), 'other items keep unknown-is-visible');
    const missing = page();
    assert.equal(missing.props.result.reason, 'missing');
    assert.match(textOf(missing.type(missing.props)).join(''), /Not provided by this backend/);
  }
  loaded(features({ adminHistory: true }));
  assert.ok(links().includes('/admin/history'));
  assert.equal(page(), undefined);
  assert.ok(render('/admin/history').some(node => textOf(node).includes('history page')));
});

test('the save bar revision links to Config history only when adminHistory is on', () => {
  const state = { result: { ok: true, data: envelope(3) }, draft: config.emptyConfig(), base: { ...envelope(3), updatedBy: 'boss' },
    errors: {}, dirty: false, saving: false, saved: false, saveResult: null, pendingChipCount: 0 };
  const history = featureOn => ({ ...state, caps: capabilities.parseCapabilities(
    { capabilities: { version: 1, features: { adminHistory: featureOn } } }) });
  const bar = value => elements(formHarness(value).render('ConfigPage',
    { title: 'Agent', description: 'x', children: () => null }));
  const link = bar(history(true)).find(node => node.type === 'Link');
  assert.equal(link.props.href, '/admin/history');
  assert.equal(textOf(link).join(''), 'Revision 3');
  for (const value of [history(false), state]) {
    assert.equal(bar(value).find(node => node.type === 'Link'), undefined);
    assert.ok(bar(value).some(node => textOf(node).join('').includes('Revision 3')));
  }
});

function restoreHarness(shared, client) {
  const slots = [];
  let cursor = 0;
  const hooks = { ...React,
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    } };
  const exports = {};
  const ResultState = function ResultState() { return null; };
  const source = readFileSync(new URL('../src/components/admin/restore-dialog.tsx', import.meta.url), 'utf8');
  const options = { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 };
  runInNewContext(ts.transpileModule(source, { compilerOptions: options }).outputText, {
    exports, require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name === './form') return { Field: 'Field', useSharedAdminConfig: () => shared };
      if (name === './use-admin') return { useAdminClient: () => client, ResultState };
      if (name === '@/lib/admin-history.mjs') return history;
      if (name.endsWith('.module.css')) return { default: {} };
      return new Proxy({}, { get: (_target, key) => key });
    } });
  return { ResultState, render(props) { cursor = 0; return elements(exports.RestoreAction(props)); } };
}

// @lat: [[contracts#Config restore binding]]
test('Restore is disabled with its reason while the shared draft is dirty or saving', () => {
  const detail = history.parseHistoryDetail({ revision: 1, action: 'update', restorable: true,
    changesFromCurrent: [{ path: 'parallelChats', beforeHash: 'abcdef012345', afterHash: 'abcdef012345', before: 4, after: 2 }] });
  const props = { detail, current: 3, onRestored() {}, onReload() {} };
  const trigger = (shared, override = props) => {
    const nodes = restoreHarness(shared, async () => ({ ok: true, data: {} })).render(override);
    return { button: nodes.find(node => node.type === 'Button'), why: nodes.find(node => node.type === 'span') };
  };
  assert.equal(trigger({ dirty: false, saving: false }).button.props.disabled, false);
  for (const shared of [{ dirty: true, saving: false }, { dirty: false, saving: true }]) {
    const { button, why } = trigger(shared);
    assert.equal(button.props.disabled, true);
    assert.equal(textOf(why).join(''), 'Save or discard your edits first');
    assert.equal(button.props['aria-describedby'], why.props.id);
  }
  const redacted = { ...props, detail: { ...detail, restorable: false } };
  const { button, why } = trigger({ dirty: false, saving: false }, redacted);
  assert.equal(button.props.disabled, true);
  assert.equal(textOf(why).join(''), 'Contains data that cannot be restored');
});

test('confirming a restore sends the bound body, then reloads the shared config', async () => {
  const detail = history.parseHistoryDetail({ revision: 1, action: 'update', restorable: true });
  const calls = [], events = [];
  const shared = { dirty: false, saving: false, reload: () => events.push('reload') };
  const client = async (path, init) => { calls.push({ path, init }); return { ok: true, data: { revision: 4 } }; };
  const h = restoreHarness(shared, client);
  const props = { detail, current: 3, onRestored: (...args) => events.push(args), onReload() {} };
  const confirmButton = () => h.render(props).filter(node => node.type === 'Button').at(-1);
  const nodes = h.render(props);
  assert.match(textOf(nodes.find(node => node.type === 'DialogDescription')).join(''),
    /^Saves as revision 4; running chats may pick up skills and web-search changes within 30 seconds$/);
  assert.match(textOf(confirmButton()).join(''), /Restore as revision 4/);
  const field = elements(nodes.find(node => node.type === 'Field').props.children({ id: 'note' }));
  field.find(node => node.type === 'Textarea').props.onChange({ target: { value: '  rollback  ' } });
  confirmButton().props.onClick();
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{ path: 'admin/config/restore',
    init: { method: 'POST', body: { fromRevision: 1, expectedRevision: 3, note: 'rollback' } } }]);
  assert.deepEqual(JSON.parse(JSON.stringify(events)), ['reload', [1, 4]]);
});

test('a stale restore keeps the dialog, shows the stale state and offers Reload history', async () => {
  const detail = history.parseHistoryDetail({ revision: 1, action: 'update', restorable: true });
  const events = [];
  const shared = { dirty: false, saving: false, reload: () => events.push('reload') };
  const client = async () => ({ ok: false, reason: 'stale', message: 'Stale revision.' });
  const h = restoreHarness(shared, client);
  const props = { detail, current: 3, onRestored: () => events.push('restored'), onReload: () => events.push('history') };
  h.render(props).filter(node => node.type === 'Button').at(-1).props.onClick();
  await new Promise(setImmediate);
  const nodes = h.render(props);
  assert.equal(nodes.find(node => node.type === h.ResultState).props.result.reason, 'stale');
  nodes.find(node => node.type === 'Button' && textOf(node).join('') === 'Reload history').props.onClick();
  assert.deepEqual(events, ['history'], 'no shared reload and no success status on a conflict');
});

test('Restore is disabled for a revision with the live settings or an unfinished list entry', () => {
  const change = { path: 'parallelChats', beforeHash: 'abcdef012345', afterHash: 'abcdef012345' };
  const detail = extra => history.parseHistoryDetail({ revision: 1, action: 'update',
    restorable: true, changesFromCurrent: [change], ...extra });
  const why = (shared, value) => {
    const nodes = restoreHarness(shared, async () => ({ ok: true, data: {} }))
      .render({ detail: value, current: 3, onRestored() {}, onReload() {} });
    const button = nodes.find(node => node.type === 'Button');
    const reason = nodes.find(node => node.type === 'span');
    return button.props.disabled ? textOf(reason).join('') : null;
  };
  const idle = { dirty: false, saving: false, pendingChipCount: 0 };
  assert.equal(why(idle, detail()), null);
  assert.equal(why(idle, detail({ identical: true })), 'Same settings as the live revision');
  assert.equal(why(idle, detail({ changesFromCurrent: [] })), 'Same settings as the live revision');
  assert.equal(why({ ...idle, pendingChipCount: 1 }, detail()), 'Save or discard your edits first');
});

// @lat: [[contracts#Admin history parsing]]
test('the history detail keeps only the parsed diff in state, never the snapshot', async () => {
  const slots = [];
  let cursor = 0;
  const changed = (old, next) => !old || next.some((value, i) => !Object.is(value, old[i]));
  const effects = [];
  const raw = { revision: 2, action: 'update', restorable: true,
    config: { skills: [{ instructions: 'CANARY-SKILL' }],
      mcpServers: [{ url: 'https://canary.example.invalid/mcp' }] },
    changesFromCurrent: [{ path: 'skills[a].instructions', beforeHash: 'abcdef012345',
      afterHash: 'abcdef012345' }] };
  const client = async () => ({ ok: true, data: structuredClone(raw) });
  const hooks = { ...React,
    useContext: () => client,
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn, deps };
      return slots[i].value;
    },
    useMemo(fn, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) slots[i] = { value: fn(), deps };
      return slots[i].value;
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (changed(slots[i]?.deps, deps)) {
        const old = slots[i], next = slots[i] = { deps };
        effects.push(() => { old?.cleanup?.(); next.cleanup = fn(); });
      }
    } };
  const options = { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 };
  const load = (file, require) => {
    const exports = {};
    const source = readFileSync(new URL(`../src/components/admin/${file}`, import.meta.url), 'utf8');
    runInNewContext(ts.transpileModule(source, { compilerOptions: options }).outputText,
      { exports, document: { hidden: false }, require });
    return exports;
  };
  const base = name => (name === 'react' ? hooks : name === 'react/jsx-runtime' ? jsxRuntime
    : name.endsWith('.module.css') ? { default: {} } : null);
  const admin = load('use-admin.tsx', name => base(name)
    ?? (name === '@/lib/admin-config.mjs' ? config : new Proxy({}, { get: () => () => null })));
  const section = load('history-section.tsx', name => base(name)
    ?? (name === './use-admin' ? admin : name === '@/lib/admin-history.mjs' ? history
      : new Proxy({}, { get: (_target, key) => key })));
  const row = history.parseHistoryDetail(raw);
  const render = () => {
    cursor = 0;
    const tree = section.Detail({ row, current: 3, onRestored() {}, onReload() {} });
    effects.splice(0).forEach(fn => fn());
    return tree;
  };
  render(); await new Promise(setImmediate);
  const tree = render();
  const restore = elements(tree).find(node => node.type === 'RestoreAction');
  assert.equal(restore.props.detail.changesFromCurrent[0].path, 'skills[a].instructions');
  const held = JSON.stringify(slots, (_key, value) => (typeof value === 'function' ? undefined : value));
  assert.ok(!held.includes('CANARY'), 'no skill text or MCP URL is held');
  assert.ok(!held.includes('"config"'), 'no snapshot is held');
});
