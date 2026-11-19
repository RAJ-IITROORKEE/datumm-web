import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {
  comparePath, deltaText, differsFromPlan, groupChecks, groupWarnings, healthPath, imageLabel, MAX_IMAGE_BASE64, onlySession, parseModelHealth,
  parsePlanImage, parsePlanModelCompare, parsePlanSnapshot, parseViews, planImageRequest, planSnapshotRequest, revitFailureMessage, showElementsRequest,
  toolsPath, viewsRequest, warningDelta,
} from '../src/lib/model-health.mjs';

const check = (over = {}) => ({
  code: 'rooms.unplaced', severity: 'warn', message: 'Two rooms are not placed.', count: 2,
  elementIds: ['a', 'b'], ...over,
});
const health = (over = {}) => ({
  schema: 'datumm.model-health.v1', documentId: 'doc-1', revision: 7, title: 'House',
  coverage: 'complete', counts: {rooms: 4, levels: 2},
  checks: [check(), check({code: 'levels.empty', severity: 'info', count: 1, elementIds: [12]})],
  limitations: ['Revit warnings and room boundaries need the DATUMM add-in update.'], ...over,
});
// The first bytes are the real PNG signature, so the base64 starts with the PNG prefix.
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const image = (over = {}) => ({
  documentId: 'doc-1', revision: 7, viewId: 'v1', viewName: 'Level 1', viewType: 'FloorPlan',
  scale: 100, width: 800, height: 600, contentType: 'image/png', base64: png, ...over,
});

// @lat: [[contracts#Revit checks]]
test('parses the health schema and groups warnings and notes', () => {
  const parsed = parseModelHealth(health());
  assert.equal(parsed.documentId, 'doc-1');
  assert.equal(parsed.revision, 7);
  const {problems, notes} = groupChecks(parsed);
  assert.deepEqual(problems.map((row) => row.code), ['rooms.unplaced']);
  assert.deepEqual(notes.map((row) => row.code), ['levels.empty']);
});

// @lat: [[contracts#Revit checks]]
test('rejects a wrong schema, shape, severity or id list instead of showing half a report', () => {
  for (const bad of [
    null, [], {}, health({schema: 'datumm.model-health.v2'}), health({documentId: ''}),
    health({revision: -1}), health({revision: 1.5}), health({coverage: 'full'}),
    health({counts: {rooms: -1}}), health({counts: {rooms: '4'}}), health({checks: 'x'}),
    health({limitations: [3]}), health({checks: [check({severity: 'error'})]}),
    health({checks: [check({message: ''})]}), health({checks: [check({count: -1})]}),
    health({checks: [check({elementIds: ['a', 'a']})]}),
    health({checks: [check({elementIds: [{}]})]}),
    health({checks: [check({elementIds: Array.from({length: 51}, (_, i) => `e${i}`)})]}),
  ]) assert.equal(parseModelHealth(bad), null, JSON.stringify(bad)?.slice(0, 80));
});

test('keeps text plain: control characters are removed', () => {
  const parsed = parseModelHealth(health({checks: [check({message: 'Two\u0000rooms\nopen'})]}));
  assert.equal(parsed.checks[0].message, 'Two rooms open');
});

// @lat: [[contracts#Revit checks]]
test('the show-elements request carries the exact document, revision and ids, with no session', () => {
  const parsed = parseModelHealth(health());
  const request = showElementsRequest(parsed, parsed.checks[0]);
  assert.deepEqual(request, {
    name: 'show_model_elements',
    arguments: {
      documentId: 'doc-1', expectedRevision: 7, elementIds: ['a', 'b'],
      action: 'select',
    },
  });
  assert.equal(showElementsRequest(parsed, parsed.checks[0], 'show').arguments.action, 'show');
  assert.equal(showElementsRequest(parsed, check({elementIds: []})), null);
  assert.equal(showElementsRequest(parsed, parsed.checks[0], 'delete'), null);
  assert.equal(showElementsRequest(null, parsed.checks[0]), null);
});

test('reads the one open session from a bare array or a data wrapper, never a guess', () => {
  assert.equal(onlySession([{sessionId: 's1'}]), 's1');
  assert.equal(onlySession({ok: true, data: [{sessionId: 's1'}]}), 's1');
  assert.equal(onlySession([]), null);
  assert.equal(onlySession([{sessionId: 's1'}, {sessionId: 's2'}]), null);
  assert.equal(onlySession([{sessionId: ' '}]), null);
  assert.equal(onlySession('x'), null);
});

test('builds the view and image reads with the add-in argument names', () => {
  assert.deepEqual(viewsRequest('s1').arguments, {sessionId: 's1', kind: 'plans', offset: 0, limit: 100});
  assert.deepEqual(planImageRequest('s1', 'v1').arguments, {sessionId: 's1', viewId: 'v1', pixelSize: 1200});
  assert.equal(healthPath('dev-1'), 'devices/dev-1/health');
  assert.equal(toolsPath('dev-1'), 'devices/dev-1/tools');
});

test('parses floor-plan views and drops rows that do not fit', () => {
  const page = parseViews({ok: true, data: {total: 3, nextOffset: 2, plans: [
    {id: 'v1', name: 'Level 1', viewType: 'FloorPlan', scale: 100},
    {id: '', name: 'No id', scale: 100}, {id: 'v3', name: 'Bad scale', scale: 0},
  ]}});
  assert.deepEqual(page, {views: [{id: 'v1', name: 'Level 1', scale: 100}], total: 3, more: true});
  assert.equal(parseViews({data: {plans: 'x', total: 1}}), null);
  assert.equal(parseViews(null), null);
});

// @lat: [[contracts#Revit checks]]
test('accepts only a bounded real PNG', () => {
  const ok = parsePlanImage({ok: true, data: image()});
  assert.equal(ok.src, `data:image/png;base64,${png}`);
  assert.equal(imageLabel(ok), 'Level 1 · scale 1:100 · model revision 7');
  for (const bad of [
    image({contentType: 'image/jpeg'}), image({contentType: 'image/svg+xml'}),
    image({base64: 'PHN2Zz48L3N2Zz4='}), image({base64: `${png}"onerror="x`}),
    image({base64: png.padEnd(MAX_IMAGE_BASE64 + 1, 'A')}), image({base64: 3}),
    image({width: 0}), image({height: 2049}), image({revision: -1}), image({scale: 0}),
  ]) assert.equal(parsePlanImage({data: bad}), null);
  assert.equal(parsePlanImage(null), null);
});

test('explains each failure in plain words', () => {
  const said = (status, message) => revitFailureMessage({status, message});
  assert.match(said(503, 'DEVICE_OFFLINE: connect'), /not connected/);
  assert.match(said(409, 'STALE_REVISION: Document or revision changed'), /model changed/);
  assert.match(said(409, 'No document is open.'), /Open a model in Revit/);
  assert.match(said(404, 'Not found'), /does not offer Revit checks/);
  assert.match(said(409, 'REVIT_BUSY: finish'), /busy/);
  assert.equal(said(409, 'TOO_MANY: Wait a moment.'), 'Wait a moment.');
  assert.match(said(422, 'bad shape'), /Check the model again/);
  assert.match(said(500, ''), /try again/i);
});

// @lat: [[contracts#Revit checks]]
test('the proxy forwards the health read and nothing next to it', async () => {
  const calls = [];
  const backend = async (path, init) => { calls.push({path, init}); return Response.json({ok: true}); };
  const source = readFileSync(new URL('../src/app/api/service/[...path]/route.ts', import.meta.url), 'utf8');
  const context = {exports: {}, Response, Headers, URL, Buffer, console, require: (name) => {
    if (name === '@/lib/backend') return {backend};
    if (name === '@/lib/request-body') return {requestBody: (request) => request.text()};
    if (name === '@/lib/plan-pdf') return {};
    throw Error(`Unexpected import: ${name}`);
  }};
  runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, context);
  const get = (path) => context.exports.GET(new Request(`https://preview.example/api/service/${path}`), {params: Promise.resolve({path: path.split('/')})});
  assert.equal((await get('devices/dev-1/health')).status, 200);
  assert.equal(calls[0].path, '/v1/devices/dev-1/health');
  calls.length = 0;
  for (const path of ['devices/dev-1/health/x', 'devices/dev-1/healthz', 'devices/a/b/health']) {
    assert.equal((await get(path)).status, 404, path);
  }
  assert.equal(calls.length, 0);
  const post = (path) => context.exports.POST(new Request(`https://preview.example/api/service/${path}`, {method: 'POST', body: '{}'}), {params: Promise.resolve({path: path.split('/')})});
  assert.equal((await post('devices/dev-1/compare-plan')).status, 200);
  assert.equal(calls[0].path, '/v1/devices/dev-1/compare-plan');
  for (const path of ['devices/dev-1/compare-plan/x', 'devices/dev-1/compare']) {
    assert.equal((await post(path)).status, 404, path);
  }
  assert.equal(calls.length, 1);
});

test('parsePlanSnapshot shows the measured drawing and refuses active or odd SVG', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect fill="#fafafa"/><text>Kitchen</text></svg>';
  const ok = parsePlanSnapshot({ data: { svg, revision: 3, viewName: 'L1 - Architectural', documentId: 'd' } });
  assert.ok(ok.src.startsWith('data:image/svg+xml;charset=utf-8,%3Csvg'));
  assert.equal(ok.scale, 0);
  assert.equal(imageLabel(ok), 'L1 - Architectural · model revision 3');
  for (const bad of ['<svg><script>x</script></svg>', '<svg onload="x"></svg>', '<svg><a href="x"/></svg>',
    '<html></html>', 'x'.repeat(10)]) {
    assert.equal(parsePlanSnapshot({ data: { svg: bad, revision: 3, viewName: 'v' } }), null, bad);
  }
  assert.equal(parsePlanSnapshot({ data: { svg, revision: -1, viewName: 'v' } }), null);
  assert.deepEqual(planSnapshotRequest('s', 'v'),
    { name: 'get_plan_snapshot', arguments: { sessionId: 's', viewId: 'v' } });
});

const warning = (key, description, elementIds = [1]) => ({
  key, failureDefinitionId: 'f-1', severity: 'Warning', description, elementIds,
});
const withWarnings = (items, over = {}, revision = 7) => parseModelHealth(health({
  revision, warnings: {coverage: 'complete', total: items.length, items, ...over},
}));

// @lat: [[contracts#Revit checks]]
test('a missing or unavailable warnings block reads as unavailable; a bad one rejects the report', () => {
  assert.equal(parseModelHealth(health()).warnings.coverage, 'unavailable');
  assert.equal(parseModelHealth(health({warnings: {coverage: 'unavailable'}})).warnings.items.length, 0);
  const ok = withWarnings([warning('k1', 'Walls overlap')]);
  assert.equal(ok.warnings.items[0].key, 'k1');
  for (const bad of [
    'x', {coverage: 'full', total: 0, items: []}, {coverage: 'complete', items: []},
    {coverage: 'complete', total: 1, items: [warning('', 'x')]},
    {coverage: 'complete', total: 1, items: [warning('k', '')]},
    {coverage: 'complete', total: 1, items: [warning('k', 'x', Array.from({length: 21}, (_, i) => i))]},
    {coverage: 'complete', total: 1, items: [warning('k', 'x', [{}])]},
    {coverage: 'complete', total: 201, items: Array.from({length: 201}, (_, i) => warning(`k${i}`, 'x'))},
  ]) assert.equal(parseModelHealth(health({warnings: bad})), null, JSON.stringify(bad)?.slice(0, 60));
});

test('warnings group by description, and the service REVIT_WARNING checks are not listed twice', () => {
  const parsed = withWarnings([warning('a', 'Walls overlap', [1, 2]), warning('b', 'Walls overlap', [2, 3]), warning('c', 'Room not enclosed', [9])]);
  const groups = groupWarnings(parsed.warnings);
  assert.deepEqual(groups.map((g) => [g.message, g.count, g.elementIds]),
    [['Walls overlap', 2, [1, 2, 3]], ['Room not enclosed', 1, [9]]]);
  assert.equal(showElementsRequest(parsed, groups[0], 'show').arguments.elementIds.length, 3);
  const withChecks = parseModelHealth(health({checks: [check({code: 'REVIT_WARNING', message: 'Walls overlap'}), check()]}));
  assert.deepEqual(groupChecks(withChecks).problems.map((row) => row.code), ['rooms.unplaced']);
});

// @lat: [[contracts#Revit checks]]
test('the delta counts new and resolved warnings only between two complete checks of one model', () => {
  const a = withWarnings([warning('k1', 'x'), warning('k2', 'x')], {}, 7);
  const b = withWarnings([warning('k2', 'x'), warning('k3', 'y'), warning('k4', 'y')], {}, 8);
  assert.deepEqual(warningDelta(a, b), {added: 2, resolved: 1});
  assert.equal(deltaText({added: 1, resolved: 0}), 'Since the last check: 1 new warning, 0 resolved');
  assert.equal(deltaText({added: 2, resolved: 3}), 'Since the last check: 2 new warnings, 3 resolved');
  const other = parseModelHealth(health({documentId: 'doc-2', revision: 8, warnings: {coverage: 'complete', total: 0, items: []}}));
  const partial = withWarnings([warning('k1', 'x')], {coverage: 'partial'}, 8);
  const capped = withWarnings([warning('k1', 'x')], {total: 5}, 8);
  const same = withWarnings([warning('k1', 'x')], {}, 7);
  for (const next of [other, partial, capped, same, parseModelHealth(health({revision: 8}))]) {
    assert.equal(warningDelta(a, next), null);
  }
  assert.equal(warningDelta(null, b), null);
  assert.equal(warningDelta(a, null), null);
});

const compare = (over = {}) => ({
  schema: 'datumm.plan-model-compare.v1', documentId: 'doc-1', revision: 7, planId: 'p1', version: 2,
  matched: [{name: 'Living', planAreaM2: 24, revitAreaM2: 25, differencePct: 4.2, revitElementId: 11},
    {name: 'Bedroom', planAreaM2: 18, revitAreaM2: 12, differencePct: -33.3, revitElementId: '12'}],
  onlyInPlan: ['Bath'], onlyInRevit: [{name: 'Store', elementId: 13}],
  limitations: ['Rooms are matched by name and area only.'], ...over,
});
const ask = {planId: 'p1', version: 2};

// @lat: [[contracts#Revit checks]]
test('parses the plan comparison strictly, flags area gaps over 10 %, and checks the plan asked about', () => {
  const parsed = parsePlanModelCompare(compare(), ask);
  assert.equal(comparePath('dev-1'), 'devices/dev-1/compare-plan');
  assert.deepEqual(parsed.matched.map(differsFromPlan), [false, true]);
  assert.equal(differsFromPlan({differencePct: 10}), false);
  assert.equal(differsFromPlan({differencePct: -10.1}), true);
  for (const bad of [
    null, [], {}, compare({schema: 'datumm.plan-model-compare.v2'}), compare({documentId: ''}),
    compare({revision: -1}), compare({planId: 'other'}), compare({version: 3}),
    compare({matched: 'x'}), compare({onlyInPlan: [3]}), compare({onlyInRevit: [{name: 'A'}]}),
    compare({limitations: [1]}),
    compare({matched: [{name: 'A', planAreaM2: -1, revitAreaM2: 1, differencePct: 0, revitElementId: 1}]}),
    compare({matched: [{name: 'A', planAreaM2: 1, revitAreaM2: 1, differencePct: '3', revitElementId: 1}]}),
    compare({matched: [{name: 'A', planAreaM2: 1, revitAreaM2: 1, differencePct: 0}]}),
    compare({onlyInPlan: Array.from({length: 501}, (_, i) => `r${i}`)}),
  ]) assert.equal(parsePlanModelCompare(bad, ask), null, JSON.stringify(bad)?.slice(0, 60));
});

// @lat: [[contracts#Revit checks]]
test('select in Revit for a room only in the model uses the comparison document and revision', () => {
  const parsed = parsePlanModelCompare(compare(), ask);
  assert.deepEqual(showElementsRequest(parsed, {elementIds: [parsed.onlyInRevit[0].elementId]}), {
    name: 'show_model_elements',
    arguments: {documentId: 'doc-1', expectedRevision: 7, elementIds: [13], action: 'select'},
  });
});
