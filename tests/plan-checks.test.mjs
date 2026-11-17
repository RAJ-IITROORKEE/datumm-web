import test from 'node:test';
import assert from 'node:assert/strict';
import { alternativeChecks, checksLine, groupFindings, parseCandidateChecks, parseFindings, parseRecommended, refsSummary, refsToHighlights, statusLabel } from '../src/lib/plan-checks.mjs';

const finding = (over = {}) => ({
  code: 'circulation.clear-width', category: 'circulation', severity: 'blocking', message: 'The hallway is too narrow.',
  why: 'People need room to pass.', fix: 'Widen it.', expected: 'at least 1200 mm', actual: '1100 mm',
  refs: { rooms: ['hall'], walls: ['w1'], openings: [] }, ruleVersion: 1, ...over,
});
const report = (findings, status = 'fail') => ({ schema: 'datumm.findings.v1', ruleSet: 'plan-rules@1', status, summary: { blocking: 0, advisory: 0 }, findings });

test('parseFindings accepts the v1 shape and counts severities from the findings', () => {
  const parsed = parseFindings(report([finding(), finding({ code: 'brief.area-band', category: 'brief', severity: 'advisory' })]));
  assert.equal(parsed.ruleSet, 'plan-rules@1');
  assert.equal(parsed.status, 'fail');
  assert.deepEqual([parsed.blocking, parsed.advisory], [1, 1]);
  assert.deepEqual(parsed.findings[0].refs, { rooms: ['hall'], walls: ['w1'], openings: [] });
  assert.deepEqual(parseFindings(report([], 'pass')).findings, []);
});

test('parseFindings rejects unknown or malformed input with null', () => {
  for (const bad of [null, undefined, 'x', [], {}, { ...report([]), schema: 'datumm.findings.v2' }, { ...report([]), status: 'maybe' },
    { ...report([]), ruleSet: '' }, { ...report([]), findings: 'no' }, report([finding({ category: 'other' })]),
    report([finding({ severity: 'info' })]), report([finding({ message: '' })]), report([finding({ refs: { rooms: [1] } })]),
    report([finding({ refs: 'x' })]), report([null])]) assert.equal(parseFindings(bad), null);
});

test('missing optional text and refs default to empty', () => {
  const [row] = parseFindings(report([{ code: 'geometry.overlap', category: 'geometry', severity: 'blocking', message: 'Rooms overlap.' }])).findings;
  assert.deepEqual([row.why, row.fix, row.expected, row.actual], ['', '', '', '']);
  assert.deepEqual(row.refs, { rooms: [], walls: [], openings: [] });
});

test('groupFindings orders categories and puts blocking first, dropping empty groups', () => {
  const rows = parseFindings(report([
    finding({ category: 'code', code: 'code.a' }), finding({ category: 'openings', code: 'openings.a' }),
    finding({ category: 'geometry', code: 'geometry.adv', severity: 'advisory' }), finding({ category: 'geometry', code: 'geometry.blk' }),
    finding({ category: 'brief', code: 'brief.a' }),
  ])).findings;
  const groups = groupFindings(rows);
  assert.deepEqual(groups.map((group) => group.label), ['Geometry', 'Brief', 'Openings', 'Code']);
  assert.deepEqual(groups[0].findings.map((row) => row.code), ['geometry.blk', 'geometry.adv']);
  assert.deepEqual(groupFindings([]), []);
});

test('statusLabel uses plain words', () => {
  assert.equal(statusLabel('pass'), 'No problems found');
  assert.equal(statusLabel('warn'), 'Needs attention');
  assert.equal(statusLabel('fail'), 'Problems to fix');
  assert.equal(statusLabel('???'), 'Not checked');
});

test('refsToHighlights flattens rooms, walls and openings without duplicates', () => {
  assert.deepEqual(refsToHighlights({ refs: { rooms: ['a', 'b'], walls: ['w', 'a'], openings: ['o'] } }), ['a', 'b', 'w', 'o']);
  assert.deepEqual(refsToHighlights({ refs: {} }), []);
  assert.deepEqual(refsToHighlights(null), []);
});

test('refsSummary names rooms, counts the rest and never prints ids', () => {
  const row = { refs: { rooms: ['living', 'kitchen', 'ghost'], walls: ['w1', 'w2'], openings: ['d1'] } };
  assert.equal(refsSummary(row, { living: 'Living', kitchen: 'Kitchen' }), 'Living, Kitchen · 1 room · 2 walls · 1 opening');
  assert.equal(refsSummary({ refs: { rooms: [], walls: [], openings: [] } }), '');
});

test('candidate checks and recommendation are read defensively', () => {
  assert.deepEqual(parseCandidateChecks({ status: 'warn', blocking: 0, advisory: 2, codes: ['a'] }), { status: 'warn', blocking: 0, advisory: 2 });
  assert.deepEqual(parseCandidateChecks({ status: 'fail', blocking: -1 }), { status: 'fail', blocking: 0, advisory: 0 });
  for (const bad of [null, undefined, {}, { status: 'x' }, 'pass']) assert.equal(parseCandidateChecks(bad), null);
  assert.deepEqual(parseRecommended({ planId: 'p', version: 2, reason: 'Fewest problems.' }), { planId: 'p', version: 2, reason: 'Fewest problems.' });
  assert.equal(parseRecommended({ planId: 'p', version: '2' }), null);
  assert.equal(parseRecommended(null), null);
});

test('checksLine is short plain wording', () => {
  assert.equal(checksLine(null), '');
  assert.equal(checksLine({ status: 'pass', blocking: 0, advisory: 0 }), 'All checks pass');
  assert.equal(checksLine({ status: 'fail', blocking: 1, advisory: 2 }), '1 problem · 2 advice notes');
  assert.equal(checksLine({ status: 'warn', blocking: 0, advisory: 1 }), '1 advice note');
});

test('alternativeChecks reads checks and the recommendation, and shows nothing when both are absent', () => {
  const candidates = [{ planId: 'a', version: 1 }, { planId: 'b', version: 1, checks: { status: 'pass', blocking: 0, advisory: 0 } }];
  const { rows, reason } = alternativeChecks(candidates, { planId: 'b', version: 1, reason: 'Fewest problems.' });
  assert.deepEqual(rows.map((row) => [row.index, row.checks?.status ?? null, row.recommended]), [[0, null, false], [1, 'pass', true]]);
  assert.equal(reason, 'Fewest problems.');
  assert.deepEqual(alternativeChecks(candidates.map(({ checks, ...rest }) => rest), undefined), { rows: [], reason: '' });
  assert.deepEqual(alternativeChecks(undefined, 'bad'), { rows: [], reason: '' });
});
