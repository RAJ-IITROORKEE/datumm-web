import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {RunAgentInputSchema} from '@ag-ui/core/schemas';
import {prepareInput} from '../src/lib/agui/adapter.mjs';
import {
  buildFrontendContext, parseFrontendContext, serializeFrontendContext, validateFrontendContext,
  viewportClass,
} from '../src/lib/agui/frontend-context.mjs';

const base = {
  viewportWidth: 1400, workAreaOpen: true, section: 'activity', preview: 'drawing',
  selectedKey: 'r-12', roomKeys: ['r-11', 'r-12'],
};
const envelope = {
  v: 1, viewport: 'wide', workArea: {open: true, section: 'activity', preview: 'drawing'},
  selection: {roomKey: 'r-12'},
  actions: ['open_work_area', 'expand_process', 'scroll_to_turn', 'suggest_followup'],
};
const entry = value => ({
  description: 'datumm.frontend.v1',
  value: typeof value === 'string' ? value : JSON.stringify(value),
});
const input = (context, extra = {}) => ({
  threadId: 'thread', runId: 'run', messages: [{id: 'm', role: 'user', content: 'Make a plan'}],
  context,
  forwardedProps: {idempotencyKey: 'stable-key', expectedTaskVersion: 0, expectedPlanVersion: 0},
  ...extra,
});
const followupProps = {
  taskId: 'task-1', idempotencyKey: 'k', expectedTaskVersion: 1, expectedPlanVersion: 0,
};

// @lat: [[contracts#Hosted contract tests#Frontend context and display actions]]
test('the envelope has the contract shape and never carries ids, prompt text, DOM or URLs', () => {
  assert.deepEqual(buildFrontendContext(base), envelope);
  const text = serializeFrontendContext(buildFrontendContext(base));
  assert.ok(Buffer.byteLength(text) <= 1024);
  const visible = JSON.stringify({...JSON.parse(text), actions: []});
  assert.doesNotMatch(visible, /task|turn|owner|device|prompt|answer|http|<|log/i);
  const keys = ['v', 'viewport', 'workArea', 'selection', 'actions'];
  assert.deepEqual(Object.keys(JSON.parse(text)), keys);
});

test('viewport classes follow the 768 and 1,180 px splits', () => {
  const classes = [767, 768, 1179, 1180].map(viewportClass);
  assert.deepEqual(classes, ['narrow', 'medium', 'medium', 'wide']);
});

test('selection is null unless the selected room exists in the current plan', () => {
  assert.equal(buildFrontendContext({...base, selectedKey: ''}).selection, null);
  assert.equal(buildFrontendContext({...base, selectedKey: 'r-99'}).selection, null);
  assert.equal(buildFrontendContext({...base, roomKeys: undefined}).selection, null);
  const longest = 'r'.repeat(128), tooLong = 'r'.repeat(129);
  const kept = buildFrontendContext({...base, selectedKey: longest, roomKeys: [longest]});
  assert.deepEqual(kept.selection, {roomKey: longest});
  assert.equal(buildFrontendContext({...base, selectedKey: tooLong, roomKeys: [tooLong]}), null,
    'rejected, not trimmed');
});

test('enums, extra keys, duplicates and oversize are rejected rather than repaired', () => {
  const area = envelope.workArea;
  const bad = [
    {...envelope, v: 2}, {...envelope, viewport: 'huge'}, {...envelope, extra: 1},
    {...envelope, workArea: {...area, section: 'settings'}},
    {...envelope, workArea: {...area, preview: 'web'}},
    {...envelope, workArea: {...area, open: 'yes'}},
    {...envelope, workArea: {open: true, section: 'design'}},
    {...envelope, selection: {roomKey: 'r', url: 'x'}}, {...envelope, selection: {roomKey: ''}},
    {...envelope, actions: ['open_work_area', 'open_work_area']},
    {...envelope, actions: ['send_message']},
    {...envelope, actions: [...envelope.actions, 'open_work_area']}, null, [], 'text',
  ];
  for (const value of bad) {
    assert.equal(validateFrontendContext(value), null, JSON.stringify(value));
  }
  assert.equal(validateFrontendContext({...envelope, actions: []}).actions.length, 0);
  const oversized = JSON.stringify(envelope) + ' '.repeat(1100);
  assert.equal(parseFrontendContext(oversized), null, 'oversized raw text');
  assert.equal(parseFrontendContext('{not json'), null);
  assert.deepEqual(parseFrontendContext(JSON.stringify(envelope)), envelope);
  assert.equal(serializeFrontendContext({...envelope, viewport: 'x'}), null);
});

test('the adapter accepts one known context entry and maps it to clientContext', () => {
  const {envelope: command} = prepareInput(input([entry(envelope)]));
  assert.deepEqual(command.clientContext, envelope);
  assert.equal(command.command.type, 'submit');
  const followup = prepareInput(input([entry(envelope)], {forwardedProps: followupProps}));
  assert.equal(followup.envelope.command.type, 'chat_followup');
  const plain = prepareInput(input([])).envelope;
  assert.equal(Object.hasOwn(plain, 'clientContext'), false, 'no context, no field');
});

test(
  'the adapter rejects unknown descriptions, two entries, bad values, tools and a resume context',
  () => {
  const tools = [{name: 'ui', description: 'x', parameters: {}}];
  const other = {description: 'other', value: JSON.stringify(envelope)};
  assert.throws(() => prepareInput(input([other])));
  assert.throws(() => prepareInput(input([entry(envelope), entry(envelope)])));
  assert.throws(() => prepareInput(input([entry('{"v":1}')])));
  assert.throws(() => prepareInput(input([entry({...envelope, viewport: 'huge'})])));
  assert.throws(() => prepareInput(input([entry(envelope)], {tools})));
  assert.throws(() => prepareInput(input([], {tools})));
  const payload = {questionId: 'q', questionVersion: 1, answer: 'a'};
  const resume = {
    threadId: 'task-1', runId: 'run', messages: [], context: [entry(envelope)],
    resume: [{interruptId: 'q:1', status: 'resolved', payload}], forwardedProps: followupProps,
  };
  assert.throws(() => prepareInput(resume));
  assert.doesNotThrow(() => prepareInput({...resume, context: []}));
});

const require = createRequire(import.meta.url);
const compile = (path, options = {}) => ts.transpileModule(
  readFileSync(new URL(path, import.meta.url), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS, ...options}},
).outputText;
function transport() {
  const exports = {}, seen = [];
  const chatStart = {};
  runInNewContext(compile('../src/lib/chat-start.ts'), {exports: chatStart, Response, Error});
  const fetch = async (_url, request) => {
    seen.push(JSON.parse(request.body));
    return new Response('x', {status: 400});
  };
  const code = compile('../src/lib/agui-chat-transport.ts', {target: ts.ScriptTarget.ES2022});
  runInNewContext(code, {
    exports, require: name => name === './chat-start' ? chatStart : require(name),
    crypto: webcrypto, ReadableStream, TextDecoder, Error, JSON, Number, RegExp, fetch,
  });
  return {client: new exports.AguiChatTransport(), seen};
}
const send = (client, body) => client.sendMessages({
  trigger: 'submit-message', chatId: 'c', messageId: undefined,
  messages: [{id: 'new', role: 'user', parts: [{type: 'text', text: 'hello'}]}],
  body: {idempotencyKey: 'k', clientSubmissionId: 'client', ...body},
}).catch(() => null);

test('the transport moves the envelope from the body into one context entry', async () => {
  const withContext = transport(), without = transport();
  await send(withContext.client, {frontendContext: envelope});
  await send(without.client, {});
  const [sent] = withContext.seen;
  assert.equal(RunAgentInputSchema.safeParse(sent).success, true);
  const expected = {description: 'datumm.frontend.v1', value: JSON.stringify(envelope)};
  assert.deepEqual(sent.context, [expected]);
  assert.equal('frontendContext' in sent.forwardedProps, false);
  assert.deepEqual(sent.tools, []);
  assert.deepEqual(without.seen[0].context, [], 'no flag, no context');
});

test('a room key with U+FEFF is rejected like any other control character', () => {
  const key = 'r' + String.fromCharCode(0xfeff);
  assert.equal(validateFrontendContext({...envelope, selection: {roomKey: key}}), null);
  assert.equal(buildFrontendContext({...base, selectedKey: key, roomKeys: [key]}), null);
});

test(
  'a chat_followup carries the same validated clientContext beside the unchanged command',
  () => {
  const props = {
    taskId: 'task-1', idempotencyKey: 'turn-key', expectedTaskVersion: 2, expectedPlanVersion: 1,
  };
  const followup = input([entry(envelope)], {threadId: 'task-1', forwardedProps: props});
  const plain = prepareInput({...followup, context: []}).envelope;
  const sent = prepareInput(followup).envelope;
  assert.equal(sent.command.type, 'chat_followup');
  assert.deepEqual(sent.clientContext, envelope);
  assert.equal(sent.idempotencyKey, 'turn-key');
  const {clientContext, ...rest} = sent;
  assert.ok(clientContext);
  assert.deepEqual(rest, plain, 'the command and its idempotency are unchanged by the context');
});
