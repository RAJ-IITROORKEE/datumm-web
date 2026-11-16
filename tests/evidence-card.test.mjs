// @lat: [[contracts#Hosted contract tests#Evidence-backed composition]]
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash, webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import {validateChatComposition} from '../src/lib/chat-composition.mjs';
import {parseReviewReport} from '../src/lib/review-report.mjs';

const text = 'Revision 3 is the saved concept report.\n\nIt lists six proposed rooms.';
const intro = {start: 0, end: 'Revision 3 is the saved concept report.'.length};
const scope = {taskId: 'task', turnId: 'turn', text, state: 'saved'};
const hash = createHash('sha256').update(text).digest('hex');
const ids = ['a', 'b', 'c', 'd', 'e'].map(char => char.repeat(64));
const display = {revisionNumber: 3, createdAt: '2026-11-16T10:00:00+00:00',
  planTitle: 'Studio concept A', planVersion: 2, rowCount: 6, proposedRoomCount: 6,
  proposedAreaM2: 104.5};
const card = (n = 0, patch = {}) => ({type: 'evidence',
  ref: {kind: 'report-revision', revisionId: ids[n], contentHash: '9'.repeat(64)},
  display, ...patch});
const v2 = root => ({schemaVersion: 2, taskId: 'task', turnId: 'turn', answerHash: hash,
  kind: 'evidence-backed-explanation', root});
const validate = (value, context = scope) =>
  validateChatComposition(value, context, webcrypto.subtle);
const stack = (...children) => ({type: 'stack', children});

test('a v2 card validates alone and beside text, keeping the server display', async () => {
  const alone = await validate(v2(card()));
  assert.equal(alone.schemaVersion, 2);
  assert.deepEqual(alone.root, card());
  const mixed = await validate(v2(stack({type: 'text', text: intro}, card(), card(1))));
  assert.equal(mixed.root.children[0].text, 'Revision 3 is the saved concept report.');
  assert.equal(mixed.root.children[2].ref.revisionId, ids[1]);
  const v1 = {...v2({type: 'text', text: intro}), schemaVersion: 1,
    kind: 'illustrative-explanation'};
  assert.equal((await validate(v1)).schemaVersion, 1);
});

test('malformed or tampered references fall back to the full answer', async () => {
  const ref = patch => card(0, {ref: {...card().ref, ...patch}});
  const bad = ['A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), ''];
  for (const value of bad) {
    assert.equal(await validate(v2(ref({contentHash: value}))), null, `contentHash ${value}`);
    assert.equal(await validate(v2(ref({revisionId: value}))), null, `revisionId ${value}`);
  }
  for (const patch of [{kind: 'plan-version'}, {url: 'https://example.invalid'}, {extra: 1}]) {
    assert.equal(await validate(v2(ref(patch))), null);
  }
  const noHash = card(0, {ref: {kind: 'report-revision', revisionId: ids[0]}});
  assert.equal(await validate(v2(noHash)), null);
});

test('display is strict: extra keys, bounds, non-finite numbers and dates reject', async () => {
  const shown = patch => card(0, {display: {...display, ...patch}});
  const bad = [{extra: 'x'}, {href: 'https://example.invalid'},
    {revisionNumber: 0}, {revisionNumber: 1.5},
    {planVersion: 0}, {rowCount: -1}, {proposedRoomCount: 0.5}, {proposedAreaM2: -1},
    {proposedAreaM2: Number.NaN}, {proposedAreaM2: Infinity}, {proposedAreaM2: '104.5'},
    {planTitle: 'x'.repeat(121)}, {planTitle: 7}, {createdAt: 'yesterday'}, {createdAt: ''},
    {createdAt: '2026-13-45T99:00:00Z'}, {createdAt: 'x'.repeat(41)}];
  for (const patch of bad) {
    assert.equal(await validate(v2(shown(patch))), null, JSON.stringify(patch));
  }
  for (const key of Object.keys(display)) {
    const {[key]: _omitted, ...rest} = display;
    assert.equal(await validate(v2(card(0, {display: rest}))), null, `missing ${key}`);
  }
  assert.equal(await validate(v2(card(0, {display: undefined}))), null);
  const edge = shown({planTitle: 'x'.repeat(120), proposedAreaM2: 0, rowCount: 0});
  assert.ok(await validate(v2(edge)));
  assert.equal(await validate(v2(card(0, {children: [card(1)]}))), null, 'evidence is a leaf');
});

test('v1 cannot carry evidence, and the count and uniqueness limits hold', async () => {
  const v1 = {...v2(card()), schemaVersion: 1, kind: 'illustrative-explanation'};
  assert.equal(await validate(v1), null);
  assert.equal(await validate({...v2(card()), kind: 'illustrative-explanation'}), null);
  assert.equal(await validate({...v2({type: 'text', text: intro}), schemaVersion: 3}), null);
  const four = await validate(v2(stack(card(0), card(1), card(2), card(3))));
  assert.equal(four.root.children.length, 4);
  assert.equal(await validate(v2(stack(card(0), card(1), card(2), card(3), card(4)))), null);
  assert.equal(await validate(v2(stack(card(0), card(0)))), null);
  assert.equal(await validate(v2(stack(card(0), {type: 'stack', children: [card(0)]}))), null);
});

test('v2 without any evidence leaf falls back to the full answer', async () => {
  // The server rejects the same shape (vector v2-without-evidence).
  assert.equal(await validate(v2({type: 'text', text: intro})), null);
  assert.equal(await validate(v2(stack({type: 'text', text: intro}))), null);
  assert.ok(await validate(v2(stack({type: 'text', text: intro}, card()))));
});

test('evidence stays inside the existing node and depth limits', async () => {
  let deep = card();
  for (let i = 0; i < 4; i++) deep = stack(deep);
  assert.ok(await validate(v2(deep)));
  assert.equal(await validate(v2(stack(deep))), null, 'depth 5');
  const prose = Array(5).fill({type: 'text', text: intro});
  const wide = stack(...Array.from({length: 4}, (_, i) => stack(card(i), ...prose)));
  assert.equal(await validate(v2(stack(wide, wide, wide))), null, 'more than 24 nodes');
});

test('foreign task or turn, a changed answer and unsaved state never produce a card', async () => {
  const good = v2(card());
  for (const context of [{...scope, taskId: 'other'}, {...scope, turnId: 'other'},
    {...scope, text: text + ' '},
    {...scope, state: 'streaming'}, {...scope, taskId: undefined}, {...scope, turnId: undefined}]) {
    assert.equal(await validate(good, context), null);
  }
  assert.equal(await validate({...good, taskId: 'other'}), null);
  assert.equal(await validate({...good, answerHash: '0'.repeat(64)}), null);
});

// Mirrors tests/chat-composition-view.test.mjs: hooks run in order, effects flush by hand.
function compile(file, hooks, extra, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'),
    {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022}});
  runInNewContext(code.outputText, {exports, ...globals, require(name) {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return jsx;
    if (name.endsWith('.module.css')) return {default: {}};
    return extra[name] ?? {};
  }});
  return exports;
}
const textOf = tree => React.isValidElement(tree)
  ? React.Children.toArray(tree.props.children).map(textOf).join(' ')
  : Array.isArray(tree) ? tree.map(textOf).join(' ') : String(tree ?? '');
const elementsOf = tree => React.isValidElement(tree)
  ? [tree, ...React.Children.toArray(tree.props.children).flatMap(elementsOf)] : [];

test('the composed view shows the v2 notice; an invalid card renders the full answer', async () => {
  const slots = [], effects = [];
  let cursor = 0;
  const hooks = {...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = value; }];
    },
    useEffect(effect, deps) {
      const i = cursor++;
      const row = slots[i] ??= {deps: null, cleanup: null};
      if (row.deps && deps.every((value, j) => Object.is(value, row.deps[j]))) return;
      effects.push(() => { row.cleanup?.(); row.cleanup = effect(); row.deps = deps; });
    }};
  const view = compile('../src/components/workspace/chat-composition.tsx', hooks, {
    './output-workspace': {
      useOutputWorkspace: () => ({scope: {key: 'k', epoch: 1, taskId: 'task'}})},
    '@/lib/chat-composition.mjs': {validateChatComposition: validate},
  });
  const full = React.createElement('full-answer');
  const show = async value => {
    slots.length = 0; effects.length = 0; cursor = 0;
    const props = {value, text, source: {taskId: 'task', state: 'saved'}, turnId: 'turn',
      children: full};
    view.ChatCompositionView(props);
    while (effects.length) effects.shift()();
    await new Promise(resolve => setTimeout(resolve, 40));
    cursor = 0;
    return view.ChatCompositionView(props);
  };
  const ok = await show(v2(stack({type: 'text', text: intro}, card())));
  assert.equal(ok.props['aria-label'], 'Answer view with saved report evidence');
  assert.match(textOf(ok.props.children[0]),
    /^Answer view with saved report evidence · concept geometry, not Revit measurements$/);
  assert.match(JSON.stringify(ok.props.children[1].props.node), /"type":"evidence"/);
  const tampered = card(0, {ref: {...card().ref, contentHash: 'f'.repeat(63)}});
  assert.equal(await show(v2(tampered)), full);
  assert.equal(await show(v2(stack(card(0), card(0)))), full);
  const v1 = {...v2(card()), schemaVersion: 1, kind: 'illustrative-explanation'};
  assert.equal(await show(v1), full);
});

test('the card is a figure of plain text and opens only the cited revision on click', () => {
  const opened = [];
  const hooks = {...React};
  const api = compile('../src/components/workspace/evidence-card.tsx', hooks, {
    './output-workspace': {
      useOutputWorkspace: () => ({openSavedReport: (...args) => opened.push(args)})},
    '@/components/ui/button': {Button: 'button'},
  });
  const hostile = '<img src=x onerror=alert(1)>';
  const node = card(0, {display: {...display, planTitle: hostile}});
  const tree = api.EvidenceCard({node});
  assert.equal(tree.type, 'figure');
  const flat = textOf(tree).replace(/\s+/g, ' ');
  const labels = ['Saved report revision 3', 'Source plan', hostile + ' · version 2', 'Rows', '6',
    'Proposed rooms', 'Proposed area', '104.5 m²',
    'Proposed concept geometry · not measured Revit quantities', 'Open revision'];
  for (const label of labels) assert.ok(flat.includes(label), label);
  const nodes = elementsOf(tree);
  const unsafe = item => item.type === 'a' || 'href' in item.props
    || 'dangerouslySetInnerHTML' in item.props;
  assert.equal(nodes.some(unsafe), false);
  const button = nodes.find(item => item.type === 'button');
  const opener = {name: 'opener'};
  button.props.onClick({currentTarget: opener});
  assert.equal(opened.length, 1);
  assert.equal(JSON.stringify(opened[0][0]),
    JSON.stringify({revisionId: ids[0], contentHash: '9'.repeat(64)}));
  assert.equal(opened[0][1], opener);
  const idle = compile('../src/components/workspace/evidence-card.tsx', hooks, {
    './output-workspace': {useOutputWorkspace: () => ({})},
    '@/components/ui/button': {Button: 'button'}});
  assert.equal(elementsOf(idle.EvidenceCard({node})).some(item => item.type === 'button'), false);
});

test('card and validator modules import no command, API or draft setter', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
  const imports = source =>
    [...source.matchAll(/^\s*import\b[^'"]*['"]([^'"]+)['"]/gm)].map(match => match[1]);
  assert.deepEqual(imports(read('../src/lib/chat-composition.mjs')).sort(),
    ['./answer-outputs.mjs', 'zod']);
  assert.deepEqual(imports(read('../src/components/workspace/evidence-card.tsx')).sort(),
    ['./evidence-card.module.css', './output-workspace', '@/components/ui/button',
      '@/lib/chat-composition.mjs'].sort());
  assert.deepEqual(imports(read('../src/components/workspace/chat-composition.tsx')).sort(), [
    './chat-composition.module.css', './evidence-card', './output-workspace',
    '@/lib/answer-outputs.mjs', '@/lib/chat-composition.mjs', 'lucide-react', 'react'].sort());
  const forbidden = new RegExp(['\\bfetch\\b', '\\bsetPrompt\\b', '\\bsendMessage\\b',
    '\\bpostHostedCommand\\b', '/api/', '\\bXMLHttpRequest\\b', 'dangerouslySetInnerHTML',
    '\\beval\\b'].join('|'));
  for (const path of ['../src/lib/chat-composition.mjs',
    '../src/components/workspace/evidence-card.tsx',
    '../src/components/workspace/chat-composition.tsx']) {
    assert.equal(forbidden.test(read(path)), false, path);
  }
});

// The review panel, driven like tests/review-report.test.mjs.
function panelHarness() {
  const slots = [], pending = [];
  let cursor = 0;
  const slot = initial => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = initial();
    return i;
  };
  const apply = (i, next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; };
  const hooks = {...React,
    useState(initial) {
      const i = slot(() => typeof initial === 'function' ? initial() : initial);
      return [slots[i], next => apply(i, next)];
    },
    useRef(value) { return slots[slot(() => ({current: value}))]; },
    useId() { return 'cited'; },
    useEffect(effect, deps) {
      const row = slots[slot(() => ({}))];
      if (row.deps && deps.every((dep, i) => Object.is(dep, row.deps[i]))) return;
      pending.push(() => { row.cleanup?.(); row.cleanup = effect(); row.deps = deps; });
    }};
  const api = compile('../src/components/workspace/review-report.tsx', hooks, {
    '@/lib/review-report.mjs': {parseReviewReport, reportTableCsv() { return ''; },
      MAX_REPORT_BYTES: 2 * 1024 * 1024}},
    {AbortController, TextDecoder, Uint8Array, setTimeout, clearTimeout});
  return {
    render(props) {
      cursor = 0;
      const child = api.ReviewReportPanel(props);
      cursor = 0;
      return child.type(child.props);
    },
    flush() { while (pending.length) pending.shift()(); },
    dispose() { for (const row of slots) row?.cleanup?.(); },
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const planScope = {key: 'task-scope', epoch: 1, accountKey: 'account', taskId: 'root-task',
  sourceKey: 'new'};
const rev = n => ({revisionId: `rev-${n}`, reportId: 'report', revisionNumber: n,
  sourceExecutionId: 'run', createdAt: '2026-11-15', contentHash: `hash-${n}`,
  sourcePlan: {planId: 'plan', version: n, fingerprint: `fp-${n}`},
  sourceModel: null, changeSummary: {previousRowCount: 1, rowCount: n, previousSourceKind: null,
    sourceKind: 'proposed', sourceChanged: false, planChanged: false}});
const history = {schemaVersion: 1, currentRevisionId: 'rev-3', revisions: [rev(3), rev(2), rev(1)],
  nextCursor: null};
const dataset = n => ({schemaVersion: 1, runId: 'run', planVersion: n, sourceKind: 'proposed',
  summary: `Revision ${n}`,
  boqRows: [{recordType: 'room', name: 'Study', count: 1, unit: 'm2', value: 12.5}]});
const notFound = /The cited revision was not found in the loaded report history/;
const mismatch = /This saved report no longer matches the cited revision/;
// The first history page holds rev-3 and rev-2; rev-1 sits on the next page behind cursor c1.
const paged = {first: {...history, revisions: [rev(3), rev(2)], nextCursor: 'c1'},
  older: {schemaVersion: 1, currentRevisionId: 'rev-3', revisions: [rev(1)], nextCursor: null}};
async function openWith(cited, pages = {first: history}) {
  const harness = panelHarness(), urls = [], reports = [];
  const fetcher = async url => {
    urls.push(url);
    if (url.includes('before=c1')) return Response.json(pages.older);
    if (url.includes('?limit=20')) return Response.json(pages.first);
    const n = Number(url.match(/rev-(\d+)/)[1]);
    return Response.json({schemaVersion: 1, revision: rev(n), dataset: dataset(n)});
  };
  const props = {scope: planScope, taskId: 'root-task', openId: 1, cited, onClose() {}, fetcher,
    onReport: (_scope, report) => reports.push(report)};
  const settle = async () => {
    harness.render(props); harness.flush(); await tick(); await tick();
  };
  await settle();
  const tree = harness.render(props);
  return {tree, urls, reports, harness, props, settle};
}

test('a cited revision opens when its hash matches and shows no notice', async () => {
  const cited = {revisionId: 'rev-1', contentHash: 'hash-1'};
  const {tree, urls, reports, harness} = await openWith(cited);
  harness.dispose();
  assert.equal(reports.at(-1).savedRevision.revisionId, 'rev-1');
  assert.ok(urls.some(url => url.endsWith('/reports/rev-1')));
  assert.doesNotMatch(JSON.stringify(tree), mismatch);
  assert.match(JSON.stringify(tree), /historical report/);
});

test('a cited revision with another hash shows the notice and keeps the current one', async () => {
  const cited = {revisionId: 'rev-1', contentHash: 'hash-9'};
  const {tree, urls, reports, harness} = await openWith(cited);
  harness.dispose();
  assert.match(JSON.stringify(tree), mismatch);
  assert.equal(reports.at(-1).savedRevision.revisionId, 'rev-3');
  assert.equal(urls.some(url => url.endsWith('/reports/rev-1')), false);
  const plain = await openWith(undefined);
  plain.harness.dispose();
  assert.equal(plain.reports.at(-1).savedRevision.revisionId, 'rev-3');
  assert.doesNotMatch(JSON.stringify(plain.tree), mismatch);
  assert.doesNotMatch(JSON.stringify(plain.tree), notFound);
});

test('a cited revision missing from history is not found, never a hash mismatch', async () => {
  const cited = {revisionId: 'rev-404', contentHash: 'hash-1'};
  const {tree, urls, reports, harness} = await openWith(cited);
  harness.dispose();
  assert.match(JSON.stringify(tree), notFound);
  assert.doesNotMatch(JSON.stringify(tree), mismatch);
  assert.equal(reports.at(-1).savedRevision.revisionId, 'rev-3');
  assert.equal(urls.some(url => url.includes('rev-404')), false);
});

test('a cited revision older than the first history page is found through the cursor', async () => {
  const found = await openWith({revisionId: 'rev-1', contentHash: 'hash-1'}, paged);
  found.harness.dispose();
  assert.ok(found.urls.some(url => url.includes('?limit=20&before=c1')));
  assert.equal(found.reports.at(-1).savedRevision.revisionId, 'rev-1');
  assert.doesNotMatch(JSON.stringify(found.tree), mismatch);
  assert.doesNotMatch(JSON.stringify(found.tree), notFound);
  const changed = await openWith({revisionId: 'rev-1', contentHash: 'hash-9'}, paged);
  changed.harness.dispose();
  assert.match(JSON.stringify(changed.tree), mismatch);
  assert.equal(changed.reports.at(-1).savedRevision.revisionId, 'rev-3');
  const missing = await openWith({revisionId: 'rev-404', contentHash: 'hash-1'}, paged);
  missing.harness.dispose();
  assert.match(JSON.stringify(missing.tree), notFound);
  const pagesRead = missing.urls.filter(url => url.includes('before=')).length;
  assert.equal(pagesRead, 1, 'stops when the cursor ends');
});

test('choosing another revision clears the cite notice', async () => {
  const cited = {revisionId: 'rev-1', contentHash: 'hash-9'};
  const {tree, reports, harness, props, settle} = await openWith(cited);
  assert.match(JSON.stringify(tree), mismatch);
  elementsOf(tree).find(item => item.type === 'select').props.onChange({target: {value: 'rev-2'}});
  assert.doesNotMatch(JSON.stringify(harness.render(props)), mismatch);
  await settle();
  const after = harness.render(props);
  harness.dispose();
  assert.equal(reports.at(-1).savedRevision.revisionId, 'rev-2');
  assert.doesNotMatch(JSON.stringify(after), mismatch);
  assert.doesNotMatch(JSON.stringify(after), notFound);
});
