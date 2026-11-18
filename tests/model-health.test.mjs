import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {
  groupChecks, healthPath, imageLabel, MAX_IMAGE_BASE64, onlySession, parseModelHealth,
  parsePlanImage, parseViews, planImageRequest, revitFailureMessage, showElementsRequest,
  toolsPath, viewsRequest,
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
});
