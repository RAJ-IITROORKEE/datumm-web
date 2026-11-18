import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

test('the proxy forwards the plan edit route and nothing next to it', async () => {
  const calls = [];
  const backend = async (path, init) => { calls.push({path, init}); return Response.json({ok: true}); };
  const source = readFileSync(new URL('../src/app/api/service/[...path]/route.ts', import.meta.url), 'utf8');
  const context = {exports: {}, Response, Headers, URL, Buffer, console, require: name => {
    if (name === '@/lib/backend') return {backend};
    if (name === '@/lib/request-body') return {requestBody: request => request.text()};
    if (name === '@/lib/plan-pdf') return {};
    throw Error(`Unexpected import: ${name}`);
  }};
  runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, context);
  const send = (path, method = 'POST') => context.exports[method](new Request(`https://preview.example/api/service/${path}`, {method, body: method === 'GET' ? undefined : '{"edit":{}}'}), {params: Promise.resolve({path: path.split('/')})});
  assert.equal((await send('variable/plans/plan-1/versions/3/edits')).status, 200);
  assert.equal(calls[0].path, '/v1/variable/plans/plan-1/versions/3/edits');
  assert.equal(calls[0].init.method, 'POST');
  calls.length = 0;
  for (const path of ['variable/plans/plan-1/versions/3/edits/extra', 'variable/plans/plan-1/versions/x/edits', 'variable/plans/plan-1/edits', 'variable/plans/a/b/versions/3/edits']) {
    assert.equal((await send(path)).status, 404, path);
  }
  assert.equal(calls.length, 0);
  assert.equal((await send('variable/plans/plan-1/versions/3', 'GET')).status, 200, 'reading a version still works');
  assert.equal((await send('variable/plans/plan-1/versions/3/package', 'GET')).status, 200, 'the revision package is readable');
  assert.equal(calls.at(-1).path, '/v1/variable/plans/plan-1/versions/3/package');
  for (const path of ['variable/plans/plan-1/versions/3/package/x', 'variable/plans/plan-1/versions/x/package', 'variable/plans/plan-1/package']) {
    assert.equal((await send(path, 'GET')).status, 404, path);
  }
});

// @lat: [[contracts#Redline intake]]
test('the proxy forwards the redline read with a larger body limit for that route alone', async () => {
  const calls = [];
  const limits = [];
  const backend = async (path, init) => { calls.push({path, init}); return Response.json({ok: true}); };
  const source = readFileSync(new URL('../src/app/api/service/[...path]/route.ts', import.meta.url), 'utf8');
  const context = {exports: {}, Response, Headers, URL, Buffer, console, require: name => {
    if (name === '@/lib/backend') return {backend};
    if (name === '@/lib/request-body') return {requestBody: (request, limit) => { limits.push(limit); return request.text(); }};
    if (name === '@/lib/plan-pdf') return {};
    throw Error(`Unexpected import: ${name}`);
  }};
  runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText, context);
  const send = path => context.exports.POST(new Request(`https://preview.example/api/service/${path}`, {method: 'POST', body: '{}'}), {params: Promise.resolve({path: path.split('/')})});
  assert.equal((await send('variable/plans/plan-1/versions/3/redlines')).status, 200);
  assert.equal(calls[0].path, '/v1/variable/plans/plan-1/versions/3/redlines');
  assert.equal(limits[0], 3_500_000);
  assert.equal((await send('variable/plans/plan-1/versions/3/edits')).status, 200);
  assert.equal(limits[1], undefined, 'other routes keep the default limit');
  calls.length = 0;
  for (const path of ['variable/plans/plan-1/versions/3/redlines/x', 'variable/plans/plan-1/versions/x/redlines', 'variable/plans/plan-1/redlines']) {
    assert.equal((await send(path)).status, 404, path);
  }
  assert.equal(calls.length, 0);
});
