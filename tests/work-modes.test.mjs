import test from 'node:test';
import assert from 'node:assert/strict';
import {
  markReviewOpened, resetReviewOpened, reviewOpened, reviewVersionOf, sectionForDrawerTab,
  subscribeReviewOpened, workStateFromSection,
} from '../src/lib/work-modes.mjs';

// @lat: [[contracts#Work modes and the review gate]]
test('old work-area sections map to Design with the drawer on Activity, Files or Exports', () => {
  assert.deepEqual(workStateFromSection('design'), { mode: 'design', drawer: null });
  assert.deepEqual(workStateFromSection('activity'), { mode: 'design', drawer: 'activity' });
  assert.deepEqual(workStateFromSection('assets'), { mode: 'design', drawer: 'files' });
  assert.deepEqual(workStateFromSection('exports'), { mode: 'design', drawer: 'exports' });
  assert.deepEqual(workStateFromSection('unknown'), { mode: 'design', drawer: null }, 'old stored values still parse');
});

test('drawer tabs map back to the stored sections; Technical has none', () => {
  assert.equal(sectionForDrawerTab('activity'), 'activity');
  assert.equal(sectionForDrawerTab('files'), 'assets');
  assert.equal(sectionForDrawerTab('exports'), 'exports');
  assert.equal(sectionForDrawerTab('technical'), null);
});

test('the review key changes with the plan version and with a new exact proposal', () => {
  assert.equal(reviewVersionOf({ planVersion: 3 }), 'p3');
  assert.equal(reviewVersionOf(), 'p0');
  assert.notEqual(reviewVersionOf({ planVersion: 3, proposalHash: 'h1' }), reviewVersionOf({ planVersion: 3, proposalHash: 'h2' }));
  assert.notEqual(reviewVersionOf({ planVersion: 3 }), reviewVersionOf({ planVersion: 3, proposalHash: 'h1' }));
});

test('review gate: locked until opened, per task and version, and never for a missing task', () => {
  resetReviewOpened();
  assert.equal(reviewOpened('task-a', 'p1'), false);
  markReviewOpened('task-a', 'p1');
  assert.equal(reviewOpened('task-a', 'p1'), true);
  assert.equal(reviewOpened('task-a', 'p2'), false, 'a new version must be opened again');
  assert.equal(reviewOpened('task-b', 'p1'), false, 'another task stays locked');
  markReviewOpened(null, 'p1');
  assert.equal(reviewOpened(null, 'p1'), false);
  assert.equal(reviewOpened('task-a', 1), reviewOpened('task-a', '1'), 'numeric and string versions share a key');
});

test('review gate notifies once per new opening, supports unsubscribe, and reset locks again', () => {
  resetReviewOpened();
  let calls = 0;
  const stop = subscribeReviewOpened(() => { calls++; });
  markReviewOpened('task-a', 'p1');
  markReviewOpened('task-a', 'p1');
  assert.equal(calls, 1);
  stop();
  markReviewOpened('task-a', 'p2');
  assert.equal(calls, 1);
  resetReviewOpened();
  assert.equal(reviewOpened('task-a', 'p1'), false);
});
