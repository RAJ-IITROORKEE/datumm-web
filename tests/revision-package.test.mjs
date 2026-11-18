import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeLog, graphsByVersion, isAccepted, packageAssumptions, packageRequest, parsePackage, savedOn, summariseChecks,
} from '../src/lib/revision-package.mjs';

const finding = (severity, message) => (
  { code: 'brief.area-band', category: 'brief', severity, message, refs: {} });
const checks = (status, findings = []) => (
  { schema: 'datumm.findings.v1', ruleSet: 'plan-rules@1', status, summary: {}, findings });
const entry = (version, over = {}) => ({
  version, parentVersion: version === 1 ? null : version - 1, fingerprint: `fp${version}`,
  createdAt: '2026-11-18T10:00:00Z', findings: checks('pass'), assumptions: [], edit: null, diff: null, ...over,
});
const pkg = (versions, over = {}) => (
  { schema: 'datumm.revision-package.v1', planId: 'plan-1', version: versions.at(-1)?.version, versions, ...over });
const graph = {
  rooms: [{ key: 'bed2', name: 'Bedroom 2' }, { key: 'wc', name: 'WC' }],
  openings: [{ key: 'd1', kind: 'door' }, { key: 'w1', kind: 'window' }, { key: 'x', kind: 'arch' }],
};
const noChanges = { changes: { rooms: [], walls: [], openings: [] } };

test('packageRequest needs a well formed plan and version, and ignores a bad task id', () => {
  assert.deepEqual(packageRequest({ task: 't-1', plan: 'p-1', version: '3' }),
    { planId: 'p-1', version: 3, taskId: 't-1' });
  assert.deepEqual(packageRequest({ plan: 'p-1', version: '3', task: '../x' }),
    { planId: 'p-1', version: 3, taskId: null });
  for (const bad of [null, {}, { plan: 'p-1' }, { plan: 'p-1', version: '0' }, { plan: 'p-1', version: '1x' },
    { plan: 'a/b', version: '1' }, { plan: ['p'], version: '1' }, { plan: 'p-1', version: '1234567' }]) {
    assert.equal(packageRequest(bad), null);
  }
});

test('parsePackage accepts a lineage that ends at the requested version', () => {
  const parsed = parsePackage(pkg([entry(1), entry(2, { edit: noChanges })]));
  assert.deepEqual(parsed.versions.map((row) => row.version), [1, 2]);
  assert.equal(parsed.versions[0].findings.status, 'pass');
});

test('parsePackage rejects unknown or broken shapes', () => {
  const ok = [entry(1), entry(2)];
  const badRoom = { changes: { rooms: [{ key: 'a' }], walls: [], openings: [] } };
  const bad = [null, [], 'x', pkg(ok, { schema: 'datumm.revision-package.v2' }), pkg(ok, { planId: '' }),
    pkg(ok, { version: 1 }), pkg([], { version: 1 }), pkg([entry(2), entry(3)]), pkg([entry(1), entry(3)]),
    pkg([entry(1), entry(2, { parentVersion: 5 })]), pkg([entry(1), entry(2, { fingerprint: '' })]),
    pkg([entry(1), entry(2, { assumptions: [1] })]), pkg([entry(1), entry(2, { edit: badRoom })]),
    pkg([entry(1), entry(2, { edit: 'x' })]), pkg([entry(1), entry(2, { diff: 'x' })]),
    pkg([entry(1), entry(2, { diff: { addedRooms: 'a' } })]),
    pkg(Array.from({ length: 51 }, (_, index) => entry(index + 1)))];
  for (const raw of bad) assert.equal(parsePackage(raw), null);
});

test('an unreadable checks report only blanks that version, not the package', () => {
  const parsed = parsePackage(pkg([entry(1), entry(2, { findings: { schema: 'nope' } })]));
  assert.equal(parsed.versions[1].findings, null);
  assert.equal(summariseChecks(parsed.versions[1]), null);
});

test('changeLog words an edit with room names and opening kinds', () => {
  const edit = { changes: {
    rooms: [{ key: 'bed2', fields: ['rect', 'area'] }, { key: 'wc', fields: ['name'] }],
    walls: ['w9', 'w10'], openings: ['d1', 'w1', 'x'] } };
  const log = changeLog(parsePackage(pkg([entry(1), entry(2, { edit })])), { 2: graph });
  assert.deepEqual(log, [{ version: 1, text: 'Version 1: first generated' }, { version: 2, text:
    'Version 2: Bedroom 2 resized; WC renamed; 2 walls adjusted; 1 door changed; 1 window changed; 1 opening changed' }]);
});

test('changeLog does not invent room names when no graph was supplied', () => {
  const edit = { changes: { rooms: [{ key: 'bed2', fields: ['rect'] }], walls: [], openings: ['d1'] } };
  const log = changeLog(parsePackage(pkg([entry(1), entry(2, { edit })])));
  assert.equal(log[1].text, 'Version 2: A room resized; 1 opening changed');
});

test('changeLog uses the diff when no edit was recorded', () => {
  const diff = {
    addedRooms: ['wc'], removedRooms: ['old'], siteChanged: true, openingCounts: { from: 4, to: 5 },
    changedRooms: [{ key: 'bed2', from: { kind: 'bedroom' }, to: { kind: 'study' } },
      { key: 'wc', from: { kind: 'wc' }, to: { kind: 'wc' } }],
  };
  const log = changeLog(parsePackage(pkg([entry(1), entry(2, { diff })])),
    { 1: { rooms: [{ key: 'old', name: 'Store' }] }, 2: graph });
  assert.equal(log[1].text, 'Version 2: WC added; Store removed; Bedroom 2 changed use; WC resized; '
    + 'site outline changed; openings changed from 4 to 5');
});

test('changeLog says so when nothing was recorded or nothing changed', () => {
  const empty = { addedRooms: [], removedRooms: [], changedRooms: [], siteChanged: false, openingCounts: { from: 3, to: 3 } };
  const log = changeLog(parsePackage(pkg([entry(1), entry(2), entry(3, { diff: empty })])));
  assert.equal(log[1].text, 'Version 2: changes not recorded');
  assert.equal(log[2].text, 'Version 3: no layout changes recorded');
});

test('summariseChecks gives the status, counts line and the wording of each note', () => {
  const findings = checks('fail', [finding('blocking', 'Door too close.'), finding('advisory', 'Kitchen is small.')]);
  const [, second] = parsePackage(pkg([entry(1), entry(2, { findings })])).versions;
  assert.deepEqual(summariseChecks(second),
    { status: 'fail', line: '1 problem · 1 advice note', problems: ['Door too close.'], advice: ['Kitchen is small.'] });
  assert.equal(summariseChecks(parsePackage(pkg([entry(1)])).versions[0]).line, 'All checks pass');
  assert.equal(summariseChecks(null), null);
});

test('savedOn formats a date and ignores a bad one', () => {
  assert.match(savedOn('2026-11-18T12:00:00Z'), /2026/);
  assert.equal(savedOn('later'), '');
  assert.equal(savedOn(''), '');
});

test('graphsByVersion lends names to the versions in between, preferring the last version', () => {
  const parsed = parsePackage(pkg([entry(1), entry(2), entry(3)]));
  const first = { rooms: [{ key: 'a', name: 'Old A' }, { key: 'gone', name: 'Store' }] };
  const last = { rooms: [{ key: 'a', name: 'New A' }] };
  const graphs = graphsByVersion(parsed, first, last);
  assert.equal(graphs[1], first);
  assert.equal(graphs[3], last);
  assert.deepEqual(graphs[2].rooms.map((room) => room.name), ['New A', 'Old A', 'Store']);
});

test('isAccepted compares the exact plan identity and stays silent without a readable task', () => {
  const plan = { planId: 'p', version: 2, fingerprint: 'f' };
  assert.equal(isAccepted({ acceptance: { plan: { ...plan } } }, plan), true);
  assert.equal(isAccepted({ acceptance: { plan: { ...plan, version: 1 } } }, plan), false);
  assert.equal(isAccepted({ acceptance: { plan: { ...plan, fingerprint: 'g' } } }, plan), false);
  assert.equal(isAccepted({ acceptance: null }, plan), false);
  for (const task of [null, undefined, 'x', []]) assert.equal(isAccepted(task, plan), null);
});

test('packageAssumptions puts the run assumptions first, only for its own plan, without repeats', () => {
  const pkg = { planId: 'p', version: 2, versions: [
    { version: 1, assumptions: ['old'] }, { version: 2, assumptions: ['Walls 200 mm.', 'Shared'] }] };
  const task = { data: { agent_design: { candidates: [{ planId: 'p' }],
    assumptions: ['One bathroom assumed.', 'Shared'] } } };
  assert.deepEqual(packageAssumptions(task, pkg), ['One bathroom assumed.', 'Shared', 'Walls 200 mm.']);
  const other = { data: { agent_design: { candidates: [{ planId: 'q' }], assumptions: ['x'] } } };
  assert.deepEqual(packageAssumptions(other, pkg), ['Walls 200 mm.', 'Shared']);
  for (const bad of [null, {}, { data: { agent_design: { candidates: [{ planId: 'p' }], assumptions: [1] } } }])
    assert.deepEqual(packageAssumptions(bad, pkg), ['Walls 200 mm.', 'Shared']);
});

test('changeLog uses the stored edit wording when the server saved one', () => {
  const changes = { rooms: [], walls: [], openings: ['d1'] };
  const parsed = parsePackage(pkg([entry(1), entry(2, { edit: { changes,
    summary: 'Widen the door between Bedroom 2 and Circulation to 1000 mm' } }),
    entry(3, { parentVersion: 2, edit: { changes, summary: 'x'.repeat(301) } })]));
  assert.deepEqual(changeLog(parsed).map((row) => row.text), ['Version 1: first generated',
    'Version 2: Widen the door between Bedroom 2 and Circulation to 1000 mm', 'Version 3: 1 opening changed']);
});
