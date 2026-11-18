import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {readUIMessageStream} from 'ai';
import {EventSchema} from '@ag-ui/core/schemas';
import {
  REPLACE_EVENT, REPLACE_PART, answerView, draftStep, draftSuffix, extendsDraft, finishPlan,
  liveDraft,
} from '../src/lib/agui/answer-draft.mjs';
import {openAgui} from '../src/lib/agui/adapter.mjs';
import {replayRecordedTask} from '../src/lib/agui/recorded-replay.mjs';

const fixture = new URL('./fixtures/agui-answer-draft.json', import.meta.url);
const recorded = JSON.parse(readFileSync(fixture, 'utf8'));
const unpaced = snapshot => ({
  ...snapshot,
  answerDraftFrames: (snapshot.answerDraftFrames ?? []).map(row => ({...row, delayMs: 0})),
});
const asks = snapshot => ({
  threadId: snapshot.id, runId: 'run-1', messages: [{id: 'm', role: 'user', content: 'Ask'}],
  forwardedProps: {taskId: snapshot.id, idempotencyKey: snapshot.commandReceipts[0].commandId,
    expectedTaskVersion: 2, expectedPlanVersion: 0, mode: 'ask'},
});
const parse = async response => (await response.text()).split('\n\n').filter(Boolean)
  .map(row => EventSchema.parse(JSON.parse(row.slice(6))));
const play = async snapshot => {
  const response = await replayRecordedTask(asks(snapshot), unpaced(snapshot));
  assert.equal(response.status, 200);
  return parse(response);
};
const text = events => events.filter(row => row.type === 'TEXT_MESSAGE_CONTENT')
  .map(row => row.delta).join('');
const types = events => events.map(row => row.type);

// @lat: [[contracts#Answer draft streaming]]
test('suffix and extend checks only accept a draft that continues the sent text', () => {
  assert.equal(extendsDraft('The', 'The wall'), true);
  assert.equal(extendsDraft('The', 'The'), true);
  assert.equal(extendsDraft('The', 'A wall'), false);
  assert.equal(extendsDraft('The', 7), false);
  assert.equal(draftSuffix('The', 'The wall'), ' wall');
  assert.equal(draftSuffix('The', 'A wall'), null);
});

test('a draft starts once, sends suffixes, ignores old frames and stops when it diverges', () => {
  const first = draftStep(null, 'The');
  assert.deepEqual(first, {state: {text: 'The', dead: false}, start: true, delta: 'The'});
  const second = draftStep(first.state, 'The wall');
  assert.deepEqual([second.start, second.delta, second.state.text], [false, ' wall', 'The wall']);
  assert.equal(draftStep(second.state, 'The').delta, '', 'an older frame is not a divergence');
  assert.equal(draftStep(second.state, 'The').state.dead, false);
  assert.equal(draftStep(second.state, 'The wall').delta, '');
  const split = draftStep(second.state, 'A different start');
  assert.deepEqual([split.delta, split.state.dead, split.state.text], ['', true, 'The wall']);
  const later = draftStep(split.state, 'The wall and more');
  assert.equal(later.delta, '', 'nothing more once it diverged');
  for (const bad of [undefined, '', 5, 'x'.repeat(12001)]) {
    assert.equal(draftStep(null, bad).start, false);
  }
});

test('the checked answer closes a draft with its suffix, or replaces it', () => {
  assert.deepEqual(finishPlan(undefined, 'Answer'), {delta: 'Answer', replace: false});
  assert.deepEqual(finishPlan('The wall', 'The wall is 3 m.'), {delta: ' is 3 m.', replace: false});
  assert.deepEqual(finishPlan('The wall', 'The wall'), {delta: '', replace: false});
  assert.deepEqual(finishPlan('The wall', 'The fence'), {delta: '', replace: true});
  assert.deepEqual(finishPlan('The wall', ''), {delta: '', replace: true});
});

test('a message shows the checked replacement, and a draft only while its text streams', () => {
  const streaming = {role: 'assistant', parts: [{type: 'text', text: 'Draft', state: 'streaming'}]};
  assert.equal(liveDraft([streaming]), 'Draft');
  assert.equal(liveDraft([{role: 'user', parts: streaming.parts}]), '');
  const done = {role: 'assistant', parts: [{type: 'text', text: 'Draft', state: 'done'},
    {type: REPLACE_PART, id: 'a', data: {text: 'Checked'}}]};
  assert.deepEqual(answerView(done.parts), [{text: 'Checked', draft: false}]);
  assert.equal(liveDraft([done]), '');
  const parts = [{type: 'step-start'}, {type: 'text', text: 'Hi'}];
  assert.deepEqual(answerView(parts), [{text: 'Hi', draft: false}]);
});

test('draft frames that continue the checked answer send suffixes, then the rest', async () => {
  const snapshot = recorded.extend, events = await play(snapshot);
  assert.equal(types(events).filter(type => type === 'TEXT_MESSAGE_START').length, 1);
  assert.equal(types(events).includes('CUSTOM'), false);
  assert.equal(text(events), snapshot.data.answer, 'the deltas add up to the checked answer');
  const deltas = events.filter(row => row.type === 'TEXT_MESSAGE_CONTENT').length;
  assert.ok(deltas > snapshot.answerDraftFrames.length);
  const texts = events.filter(row => row.type.startsWith('TEXT_MESSAGE'));
  assert.equal(new Set(texts.map(row => row.messageId)).size, 1);
  const start = events.find(row => row.type === 'TEXT_MESSAGE_START');
  assert.equal(start.messageId, 'datumm-answer:run-1');
  assert.equal(events.at(-2).type, 'TEXT_MESSAGE_END');
  assert.equal(events.at(-1).outcome.type, 'success');
});

test('a checked answer that differs sends one replace event before the message ends', async () => {
  const snapshot = recorded.replace, events = await play(snapshot);
  const at = types(events).indexOf('CUSTOM'), custom = events[at];
  assert.equal(custom.name, REPLACE_EVENT);
  assert.deepEqual(custom.value, {messageId: 'datumm-answer:run-1', text: snapshot.data.answer});
  assert.equal(events[at + 1].type, 'TEXT_MESSAGE_END');
  assert.equal(text(events), snapshot.answerDraftFrames.at(-1).text, 'only the draft was streamed');
  assert.equal(types(events).filter(type => type === 'CUSTOM').length, 1);
});

test('a paced replay delivers the draft word by word before the answer events', async () => {
  const snapshot = {...recorded.replace,
    answerDraftFrames: recorded.replace.answerDraftFrames.map(row => ({...row, delayMs: 5}))};
  const response = await replayRecordedTask(asks(snapshot), snapshot);
  const started = Date.now(), events = await parse(response);
  assert.ok(Date.now() - started >= 30, 'the frames were paced');
  const first = types(events).indexOf('TEXT_MESSAGE_CONTENT');
  const stages = events.flatMap(row => row.content?.event?.stage ?? []);
  assert.ok(first > 0 && text(events).startsWith('I would put the kitchen'));
  const activity = events.slice(0, first).flatMap(row => row.content?.event?.stage ?? []);
  assert.equal(activity.includes('answer') || activity.includes('completed'), false,
    'no answer or completed event before the first draft text');
  assert.ok(stages.includes('completed'), 'they still arrive after the draft');
  assert.equal(events.filter(row => row.type === 'CUSTOM').length, 1);
});

test('draft frames never become activity rows', async () => {
  const withDrafts = await play(recorded.extend);
  const without = await play({...recorded.extend, answerDraftFrames: []});
  const count = events => types(events).filter(type => type === 'ACTIVITY_SNAPSHOT').length;
  assert.equal(count(withDrafts), count(without));
  assert.ok(withDrafts.every(row => row.content?.event?.stage !== 'answer_draft'));
});

test('without draft frames the events are exactly the single answer message of today', async () => {
  const events = await play({...recorded.extend, answerDraftFrames: []});
  const start = types(events).indexOf('TEXT_MESSAGE_START');
  assert.deepEqual(types(events).slice(start), ['TEXT_MESSAGE_START', 'TEXT_MESSAGE_CONTENT',
    'TEXT_MESSAGE_END', 'RUN_FINISHED']);
  assert.equal(events[start + 1].delta, recorded.extend.data.answer);
});

const stream = body => new Response(new ReadableStream({start(controller) {
  controller.enqueue(new TextEncoder().encode(body)); controller.close();
}}), {headers: {'Content-Type': 'text/event-stream'}});
const frame = value => `data: ${JSON.stringify(value)}\n\n`;
const task = (status, data = {}) => ({
  id: 'task-1', status, data, taskVersion: 1, executionId: 'e1',
  commandReceipts: [{commandId: 'k', state: 'applied'}], events: [{turnId: 'k', executionId: 'e1'}],
});
const open = async (frames, run) => {
  const receipt = {id: 'task-1', commandId: 'k', taskVersion: 1, state: 'applied'};
  const backend = async path => {
    if (path.includes('active=true')) return Response.json([]);
    if (path === '/v2/tasks') return Response.json(receipt);
    return stream(frames.map(frame).join('') + frame({stage: 'snapshot', run}));
  };
  const input = {threadId: 'thread', runId: 'run',
    messages: [{id: 'm', role: 'user', content: 'Go'}],
    forwardedProps: {idempotencyKey: 'k', expectedTaskVersion: 0, expectedPlanVersion: 0}};
  return parse(await openAgui(input, backend, async reply => (reply.ok ? reply.json() : reply)));
};
const draft = (value, seq) => ({stage: 'answer_draft', text: value, seq});

test('a frame that does not continue the draft sends nothing until the answer', async () => {
  const frames = [draft('The wall', 1), draft('A fence', 2), draft('A fence and more', 3)];
  const events = await open(frames,
    task('completed', {answer: 'The wall is 3 m.'}));
  const deltas = events.filter(row => row.type === 'TEXT_MESSAGE_CONTENT').map(row => row.delta);
  assert.deepEqual(deltas, ['The wall', ' is 3 m.']);
  assert.equal(types(events).includes('CUSTOM'), false);
});

test('an unfinished draft is cleared when the run does not complete', async () => {
  for (const status of ['cancelled', 'needs_input']) {
    const question = {id: 'q', version: 1, question: 'Which level?'};
    const run = status === 'needs_input' ? task(status, {agent_question: question}) : task(status);
    const events = await open([draft('Maybe the', 1)], run);
    const at = types(events).indexOf('CUSTOM');
    assert.deepEqual(events[at].value, {messageId: 'datumm-answer:run', text: ''}, status);
    assert.equal(events[at + 1].type, 'TEXT_MESSAGE_END');
    assert.equal(events.at(-1).type, 'RUN_FINISHED');
  }
});

// The transport tests load the compiled source alone, so its two names are compared here.
const source = readFileSync(new URL('../src/lib/agui-chat-transport.ts', import.meta.url), 'utf8');
test('the transport uses the same names as the draft module', () => {
  assert.ok(source.includes(`'${REPLACE_EVENT}'`));
  assert.ok(source.includes(`'${REPLACE_PART}'`));
});

const messagesFor = async snapshot => {
  const require = createRequire(import.meta.url), exports = {};
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(js, {exports, require: name => (name === './chat-start' ? {} : require(name)),
    crypto: webcrypto, ReadableStream, TextDecoder, Error, JSON, Number, RegExp,
    fetch: async (url, options) => replayRecordedTask(JSON.parse(options.body), unpaced(snapshot)),
  });
  const chunks = await new exports.AguiChatTransport('/api/dev/agui-replay').sendMessages({
    trigger: 'submit-message', chatId: 'c', messageId: undefined,
    messages: [{id: 'p', role: 'user', parts: [{type: 'text', text: 'Ask'}]}],
    body: {taskId: snapshot.id, idempotencyKey: snapshot.commandReceipts[0].commandId,
      clientSubmissionId: 'client', expectedTaskVersion: 2, expectedPlanVersion: 0, mode: 'ask'},
  });
  const seen = [];
  for await (const message of readUIMessageStream({stream: chunks})) {
    seen.push(structuredClone(message));
  }
  return seen;
};

test('the client marks the text as a draft while it streams, then shows the answer', async () => {
  const seen = await messagesFor(recorded.extend), last = seen.at(-1);
  const drafts = seen.map(message => liveDraft([message])).filter(Boolean);
  assert.ok(drafts.length >= 3, 'the draft grows in several updates');
  assert.ok(drafts.every((value, i) => i === 0 || value.startsWith(drafts[i - 1])));
  assert.deepEqual(answerView(last.parts), [{text: recorded.extend.data.answer, draft: false}]);
});

test('the client replaces the draft with the checked answer when they differ', async () => {
  const seen = await messagesFor(recorded.replace), last = seen.at(-1);
  assert.deepEqual(answerView(last.parts), [{text: recorded.replace.data.answer, draft: false}]);
  assert.ok(seen.some(message => liveDraft([message]).startsWith('I would put the kitchen')));
  assert.equal(last.parts.filter(part => part.type === REPLACE_PART).length, 1);
});
