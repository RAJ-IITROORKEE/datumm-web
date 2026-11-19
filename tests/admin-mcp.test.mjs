import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditRowsFor, blankForm, createBody, enableBlock, formFrom, hintsOf, mcpFailure, parseMcpList,
  parseMcpServer, resetsTools, serverPath, serverStatus, testSummary, toolModeBody, toolPath,
  unavailableCopy, updateBody, validateForm, versionBody,
} from '../src/lib/admin-mcp.mjs';
import { parseAuditRows, auditPath, kindLabel, actionLabel } from '../src/lib/admin-history.mjs';
import { parseCapabilities } from '../src/lib/capabilities.mjs';

const view = over => ({
  id: 'docs', name: 'Docs', url: 'https://docs.example.com/mcp', authHeader: 'Authorization', hasKey: true,
  enabled: false, version: 3, lastTest: { at: '2026-11-19T10:00:00Z', ok: true, error: null, toolCount: 1, protocol: '2025-06-18' },
  tools: [{ name: 'search', description: 'Find\u0007pages', annotations: { read_only: true, destructive: false, extra: true }, hash: 'abc', mode: 'allow' }],
  calls: 2, lastCalledAt: null, updatedAt: '2026-11-19T10:00:00Z', updatedBy: 'a@example.com', ...over,
});

// @lat: [[contracts#Hosted contract tests#Admin MCP registry]]
test('a parsed server never carries a key, sealed text or unknown fields', () => {
  const server = parseMcpServer({ ...view(), key: 'CANARY-KEY', sealed: 'CANARY-SEALED', extra: 1 });
  assert.equal(JSON.stringify(server).includes('CANARY'), false);
  assert.deepEqual(Object.keys(server).sort(), ['authHeader', 'calls', 'enabled', 'hasKey', 'id', 'lastCalledAt', 'lastTest', 'name', 'tools', 'updatedAt', 'updatedBy', 'url', 'version']);
  assert.deepEqual(server.tools[0].annotations, { read_only: true });
  assert.equal(server.tools[0].description, 'Find pages');
  assert.deepEqual(hintsOf(server.tools[0]), ['The server says it only reads']);
});

test('unreadable servers and modes fail closed', () => {
  for (const bad of [null, [], {}, view({ id: 'Bad Id' }), view({ version: -1 }), view({ url: 4 })]) assert.equal(parseMcpServer(bad), null);
  assert.equal(parseMcpServer(view({ tools: [{ name: 'a', mode: 'always' }, { name: 'bad name' }] })).tools[0].mode, 'never');
  assert.equal(parseMcpServer(view({ tools: [{ name: 'bad name' }] })).tools.length, 0);
  assert.equal(parseMcpList({ servers: 'x' }), null);
  const list = parseMcpList({ servers: [view(), { id: '!' }], secretsAvailable: true, reason: null, maxServers: 20 });
  assert.equal(list.servers.length, 1);
  assert.equal(parseMcpList({ servers: [] }).secretsAvailable, false);
});

test('status, enable block and test wording', () => {
  assert.equal(serverStatus(view()).id, 'ready');
  assert.equal(serverStatus(view({ enabled: true })).id, 'enabled');
  assert.equal(serverStatus(view({ lastTest: null })).id, 'untested');
  assert.equal(serverStatus(view({ lastTest: { ok: false, error: 'timed out' } })).id, 'failed');
  assert.equal(enableBlock(view()), null);
  assert.match(enableBlock(view({ lastTest: null })), /Test connection/);
  assert.equal(enableBlock(view({ enabled: true, lastTest: null })), null, 'turning off is always allowed');
  assert.equal(testSummary({ ok: true, toolCount: 1, protocol: 'p', error: null }), 'Passed, 1 tool, protocol p');
  assert.equal(testSummary({ ok: false, error: 'timed out', toolCount: 0, protocol: null }), 'Failed: timed out');
});

test('the editor mirrors the backend rules', () => {
  const add = over => validateForm({ ...blankForm(), id: 'docs', name: 'Docs', url: 'https://x.example.com/mcp', ...over }, { ids: ['maps'] });
  assert.deepEqual(add({}), {});
  assert.ok(add({ id: 'Docs' }).id);
  assert.ok(add({ id: 'maps' }).id);
  assert.ok(add({ name: ' ' }).name);
  for (const url of ['http://x.example.com/mcp', 'https://', 'https://u:p@x.example.com/mcp', 'https://x.example.com/mcp?k=1', 'https://x.example.com:8443/m', 'not a url']) assert.ok(add({ url }).url, url);
  assert.ok(add({ authHeader: 'Authorization' }).key, 'header without key');
  assert.ok(add({ key: 'k' }).authHeader, 'key without header');
  assert.ok(add({ authHeader: '1bad', key: 'k' }).authHeader);
  assert.deepEqual(add({ authHeader: 'Authorization', key: 'k' }), {});
  assert.ok(add({ authHeader: 'A', key: 'a\nb' }).key);
  assert.ok(validateForm({ ...blankForm(), id: 'a', name: 'A', url: 'https://x.example.com/m', authHeader: 'A', key: 'k' }, { secretsAvailable: false }).key);
});

test('editing keeps the key only when the header is unchanged', () => {
  const server = parseMcpServer(view());
  const edit = over => ({ ...formFrom(server), ...over });
  assert.deepEqual(validateForm(edit({}), { server }), {});
  assert.deepEqual(updateBody(edit({}), server), { expectedVersion: 3, name: 'Docs', url: server.url, authHeader: 'Authorization', keepKey: true });
  assert.match(validateForm(edit({ authHeader: 'X-Key' }), { server }).key, /entered again/);
  assert.deepEqual(updateBody(edit({ authHeader: 'X-Key', key: 'new' }), server).key, 'new');
  assert.equal('keepKey' in updateBody(edit({ authHeader: 'X-Key', key: 'new' }), server), false);
  const removed = updateBody(edit({ authHeader: '' }), server);
  assert.deepEqual([removed.authHeader, 'key' in removed, 'keepKey' in removed], [null, false, false]);
  assert.equal(resetsTools(edit({}), server), false);
  for (const over of [{ url: 'https://other.example.com/mcp' }, { authHeader: '' }, { key: 'k', authHeader: 'Authorization' }]) assert.equal(resetsTools(edit(over), server), true);
  assert.equal(resetsTools(edit({ name: 'New name' }), server), false);
});

test('request bodies are strict and carry the key only when typed', () => {
  assert.deepEqual(createBody({ id: 'a', name: ' A ', url: ' https://x.example.com/m ', authHeader: '', key: '' }), { id: 'a', name: 'A', url: 'https://x.example.com/m' });
  assert.deepEqual(createBody({ id: 'a', name: 'A', url: 'https://x.example.com/m', authHeader: 'Authorization', key: 'k' }), { id: 'a', name: 'A', url: 'https://x.example.com/m', authHeader: 'Authorization', key: 'k' });
  const server = parseMcpServer(view());
  assert.deepEqual(versionBody(server), { expectedVersion: 3 });
  assert.deepEqual(toolModeBody(server, 'ask'), { mode: 'ask', expectedVersion: 3 });
  assert.equal(toolModeBody(server, 'always'), null);
});

test('paths are strict', () => {
  assert.equal(serverPath('docs'), 'admin/mcp/docs');
  assert.equal(serverPath('docs', 'test'), 'admin/mcp/docs/test');
  assert.equal(serverPath('../config'), null);
  assert.equal(toolPath('docs', 'search_docs'), 'admin/mcp/docs/tools/search_docs');
  assert.equal(toolPath('docs', 'a/b'), null);
  assert.equal(toolPath('docs', '..'), null);
});

test('failures are worded plainly and never echo input', () => {
  const issue = { ok: false, reason: 'error', message: 'Request failed (422).', issues: [{ loc: ['body', 'url'], msg: 'String should match pattern' }] };
  assert.deepEqual(mcpFailure(issue, 'create').fields, { url: 'String should match pattern' });
  assert.match(mcpFailure({ ok: false, reason: 'error', message: 'Run a passing test first.' }, 'enable').message, /passing test/);
  const clash = mcpFailure({ ok: false, reason: 'stale', message: '' }, 'create');
  assert.ok(clash.fields.id && !clash.stale);
  const stale = mcpFailure({ ok: false, reason: 'stale', message: '' }, 'tool');
  assert.ok(stale.stale && /changed this server first/.test(stale.message));
  assert.match(mcpFailure({ ok: false, reason: 'forbidden', message: '' }, 'test').message, /administrator/);
  assert.match(mcpFailure({ ok: false, reason: 'blocked', message: '' }, 'test').message, /does not provide/);
  assert.deepEqual(mcpFailure({ ok: true }, 'test'), { message: '', fields: {}, stale: false });
});

test('audit: the mcp kind and actions parse, and rows filter by server id', () => {
  assert.equal(auditPath({ kind: 'mcp' }), 'admin/audit?limit=25&kind=mcp');
  assert.equal(kindLabel('mcp'), 'MCP server');
  assert.equal(actionLabel('mcp_tool_mode'), 'Tool mode set');
  const rows = parseAuditRows([
    { at: '2026-11-19T10:00:00Z', by: 'a', summary: 'Set search to allow on docs', kind: 'mcp', action: 'mcp_tool_mode' },
    { at: '2026-11-19T09:00:00Z', by: 'a', summary: 'Added server docs-two', kind: 'mcp', action: 'mcp_create' },
    { at: '2026-11-19T08:00:00Z', by: 'a', summary: 'Edit docs', kind: 'config', action: 'update' },
  ]);
  assert.deepEqual(rows.map(r => r.action), ['mcp_tool_mode', 'mcp_create', 'update']);
  assert.deepEqual(auditRowsFor(rows, 'docs').map(r => r.action), ['mcp_tool_mode']);
});

test('the service key reason is shown in plain words', () => {
  const caps = parseCapabilities({ capabilities: { version: 1, features: { mcpRegistry: false }, reasons: { mcpRegistry: 'MCP_SECRET_KEY not configured', adminConfig: 'x' } } });
  assert.equal(caps.features.mcpRegistry, 'off');
  assert.deepEqual(caps.reasons, { mcpRegistry: 'MCP_SECRET_KEY not configured' });
  const copy = unavailableCopy(caps.reasons.mcpRegistry);
  assert.match(copy.lead, /need a server key that is not set up yet/);
  assert.equal(parseCapabilities({ capabilities: { version: 1, features: { mcpRegistry: true }, reasons: { mcpRegistry: 'x' } } }).reasons.mcpRegistry, undefined);
});
