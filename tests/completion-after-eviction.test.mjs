import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {
  conversationTurns,
  answerCompletionCandidate,
  answerHasCompletionProof,
  verifyAnswerCompletionHash,
} from '../src/lib/conversation-turns.mjs';
import {validateChatComposition} from '../src/lib/chat-composition.mjs';

// @lat: [[contracts#Hosted contract tests#Durable completion proof]]
const subtle = webcrypto.subtle;
const fixture = new URL('./fixtures/agui-produced-task.json', import.meta.url);
const captured = JSON.parse(readFileSync(fixture, 'utf8'));
const turns = conversationTurns(captured.conversation);
const turn = turns.find(row => row.completion);
const {executionId, completionSequence} = turn.completion;

// Later events from another execution: the answer and completed events have left the tail.
const evicted = [4, 5, 6].map(sequence => ({
  schemaVersion: 2, taskId: captured.id, sequence, stage: 'agent_stage_complete', type: 'activity',
  executionId: 'later-run', turnId: 'later-turn', detail: 'Unrelated later event',
}));
const later = stage => ({
  schemaVersion: 2, taskId: captured.id, sequence: completionSequence, stage, type: 'activity',
  executionId, turnId: turn.turnId, detail: 'Later event',
});
const candidate = input => answerCompletionCandidate(
  {turn, turns, taskId: captured.id, events: evicted, ...input});
const legacy = events => answerHasCompletionProof({turn, turns, taskId: captured.id, events});
const hashOk = (completion, text) => verifyAnswerCompletionHash(completion, text, subtle);

test('completion proof and composition survive eviction of the answer events', async () => {
  assert.equal(legacy(captured.events), true, 'control: legacy proof with answer events');
  assert.equal(candidate({}), true);
  assert.equal(await hashOk(turn.completion, turn.answer), true);
  const view = {taskId: captured.id, turnId: turn.turnId, text: turn.answer, state: 'saved'};
  assert.ok(await validateChatComposition(turn.presentation.composition, view, subtle));
  assert.equal(legacy(evicted), false, 'legacy event proof is lost after eviction');
});

test('tampered answerHash fails hash verification', async () => {
  assert.equal(await hashOk({...turn.completion, answerHash: '0'.repeat(64)}, turn.answer), false);
});

test('foreign taskId denies the evicted candidate', () => {
  assert.equal(candidate({taskId: 'foreign'}), false);
});

test('a visible later contradiction at or after completionSequence denies the candidate', () => {
  assert.equal(candidate({events: [...evicted, later('failed')]}), false);
  assert.equal(candidate({events: [...evicted, later('agent_stage_complete')]}), true, 'control');
});

test('a duplicated completion denies the candidate', () => {
  assert.equal(candidate({turns: [turn, {...turn, index: 9, endIndex: 9}]}), false);
});

test('completion hash vector (astral, combining, CRLF) pins Python and JavaScript', async () => {
  // Python: hashlib.sha256('A\U0001F3E0e\u0301\r\nB'.encode('utf-8')).hexdigest()
  const pythonHex = '5525e8e753662dc090802653acb1e8d55d8c712076c74db84d5df7b925b5e96b';
  const text = 'A\u{1F3E0}e\u0301\r\nB';
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  assert.equal(Buffer.from(digest).toString('hex'), pythonHex);
  assert.equal(await hashOk({answerHash: pythonHex}, text), true);
  assert.equal(await hashOk({answerHash: pythonHex}, text.replace('\r\n', '\n')), false, 'CRLF');
});
