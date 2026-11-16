import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_REASONS, FEEDBACK_REASON_LABELS, applyFeedback, feedbackBody, feedbackFailureMessage,
  feedbackPath, feedbackVotes,
} from '../src/lib/answer-feedback.mjs';

const hash = 'a'.repeat(64);
const bound = { turnId: 'turn-0001', answerHash: hash };

// @lat: [[contracts#Hosted contract tests#Answer feedback binding]]
test('every reason label maps to the service enum and none is the free-text "Other"', () => {
  assert.deepEqual(FEEDBACK_REASONS.map(([, id]) => id).sort(),
    ['ignored_instructions', 'inaccurate', 'incomplete', 'other', 'too_long']);
  assert.equal(FEEDBACK_REASON_LABELS.at(-1), 'Something else');
  assert.ok(!FEEDBACK_REASON_LABELS.includes('Other'));
  for (const [label, id] of FEEDBACK_REASONS) {
    assert.deepEqual(feedbackBody({ ...bound, kind: 'down', reason: label }),
      { ...bound, rating: 'down', reason: id });
  }
});

test('the body builder refuses without a turn id and a 64-hex answer hash', () => {
  const unbound = [{}, { turnId: 'turn-0001' }, { answerHash: hash },
    { turnId: '', answerHash: hash }, { turnId: 'turn-0001', answerHash: 'abc' },
    { turnId: 'turn-0001', answerHash: 'A'.repeat(64) }, { turnId: 7, answerHash: hash }];
  for (const input of unbound) {
    assert.equal(feedbackBody({ ...input, kind: 'up' }), null, JSON.stringify(input));
  }
});

test('thumbs map to up, down, down with a reason, and cleared; bad combinations fail', () => {
  assert.deepEqual(feedbackBody({ ...bound, kind: 'up' }), { ...bound, rating: 'up' });
  assert.deepEqual(feedbackBody({ ...bound, kind: 'down' }), { ...bound, rating: 'down' });
  assert.deepEqual(feedbackBody({ ...bound, kind: null }), { ...bound, rating: 'cleared' });
  assert.equal(feedbackBody({ ...bound, kind: 'up', reason: 'Too long' }), null,
    'a reason only goes with down');
  assert.equal(feedbackBody({ ...bound, kind: 'down', reason: 'free text from a user' }), null);
  assert.equal(feedbackBody({ ...bound, kind: 'sideways' }), null);
  const extra = feedbackBody({ ...bound, kind: 'down', reason: 'Too long', text: 'x' });
  assert.deepEqual(Object.keys(extra), ['turnId', 'answerHash', 'rating', 'reason']);
});

test('saved votes parse defensively and update after a successful save', () => {
  const votes = feedbackVotes([{ turnId: 't1', rating: 'up', reason: null },
    { turnId: 't2', rating: 'down', reason: 'too_long' }, { turnId: 't3', rating: 'cleared' },
    { rating: 'up' }, null, 'x', { turnId: 4, rating: 'up' }]);
  assert.deepEqual(votes, { t1: 'up', t2: 'down' });
  assert.deepEqual(feedbackVotes({ turnId: 't1', rating: 'up' }), {});
  assert.deepEqual(applyFeedback(votes, { turnId: 't1', answerHash: hash, rating: 'cleared' }),
    { t2: 'down' });
  assert.deepEqual(applyFeedback(votes, { turnId: 't3', answerHash: hash, rating: 'up' }),
    { t1: 'up', t2: 'down', t3: 'up' });
  assert.deepEqual(votes, { t1: 'up', t2: 'down' }, 'the input is not mutated');
});

test('the path is task scoped and failures never claim a save', () => {
  assert.equal(feedbackPath('task-1'), 'tasks/task-1/feedback');
  assert.equal(feedbackPath('a/b'), 'tasks/a%2Fb/feedback');
  for (const status of [409, 429, 500, undefined]) {
    assert.match(feedbackFailureMessage(status), /not saved/);
  }
});
