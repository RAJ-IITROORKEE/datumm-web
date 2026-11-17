import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checksLine, describeChanges, editBody, editPath, interiorWalls, moveDirectionHint, moveWallEdit, movePreview,
  acceptAgainNote, editablePlan, openingEdit, parseEditResult, parseMm, refusalMessage, renameEdit, STALE_MESSAGE, successMessage, swapEdit,
} from '../src/lib/plan-edits.mjs';

const graph = {
  rooms: [{ key: 'kitchen', name: 'Kitchen' }, { key: 'dining', name: 'Dining' }, { key: 'hall', name: 'Hall', kind: 'circulation' }, { key: 'bed', name: 'Bedroom' }],
  walls: [
    { key: 'w-kd', start: [4000, 0], end: [4000, 3000], roomKeys: ['kitchen', 'dining'] },
    { key: 'w-kd2', start: [4000, 3000], end: [4000, 5000], roomKeys: ['kitchen', 'dining'] },
    { key: 'w-kb', start: [0, 3000], end: [4000, 3000], roomKeys: ['kitchen', 'bed'] },
    { key: 'w-out', start: [0, 0], end: [4000, 0], roomKeys: ['kitchen'] },
    { key: 'w-arc', start: [0, 0], end: [0, 4000], roomKeys: ['kitchen', 'bed'], curve: { kind: 'arc', mid: [-500, 2000] } },
  ],
  openings: [{ key: 'door-1', wallKey: 'w-kb', kind: 'door', offsetMm: 300, widthMm: 900, heightMm: 2100, sillMm: 0 }],
};

test('rename trims, keeps 1 to 80 characters, no control characters, and refuses a no-op', () => {
  assert.deepEqual(renameEdit('kitchen', '  Pantry  ', graph), { ok: true, edit: { kind: 'rename', roomKey: 'kitchen', name: 'Pantry' } });
  assert.equal(renameEdit('kitchen', '   ', graph).ok, false);
  assert.equal(renameEdit('kitchen', 'x'.repeat(80), graph).ok, true);
  assert.equal(renameEdit('kitchen', 'x'.repeat(81), graph).ok, false);
  assert.equal(renameEdit('kitchen', 'Pantry', graph).ok, false);
  assert.equal(renameEdit('kitchen', 'Kitchen', graph).ok, false);
  assert.equal(renameEdit('nope', 'A', graph).ok, false);
  assert.equal(renameEdit('kitchen', 7).ok, false);
});

test('swap needs two different rooms and never a circulation room', () => {
  assert.deepEqual(swapEdit('kitchen', 'dining', graph), { ok: true, edit: { kind: 'swap', roomKeys: ['kitchen', 'dining'] } });
  assert.equal(swapEdit('kitchen', 'kitchen', graph).ok, false);
  assert.equal(swapEdit('kitchen', '', graph).ok, false);
  assert.equal(swapEdit('kitchen', 'hall', graph).ok, false);
  assert.equal(swapEdit('kitchen', 'ghost', graph).ok, false);
});

test('move-wall takes a non-zero whole number within 5000 mm on a straight shared wall', () => {
  assert.deepEqual(moveWallEdit('w-kd', '300', graph), { ok: true, edit: { kind: 'move-wall', wallKey: 'w-kd', offsetMm: 300 } });
  assert.equal(moveWallEdit('w-kd', -5000, graph).ok, true);
  for (const bad of [0, '0', '', '12.5', 'abc', 5001, -5001, NaN]) assert.equal(moveWallEdit('w-kd', bad, graph).ok, false, String(bad));
  assert.equal(moveWallEdit('w-out', 100, graph).ok, false, 'outer wall');
  assert.equal(moveWallEdit('w-arc', 100, graph).ok, false, 'curved wall');
  assert.equal(moveWallEdit('missing', 100, graph).ok, false);
  assert.equal(parseMm(' -40 '), -40);
  assert.ok(Number.isNaN(parseMm('1e3')));
});

test('opening update keeps the untouched fields, and checks width, offset and wall length', () => {
  const edit = openingEdit(graph, 'door-1', 'update', { widthMm: '1000', offsetMm: 300 });
  assert.deepEqual(edit, { ok: true, edit: { kind: 'opening', opening: { kind: 'update', openingKey: 'door-1', wallKey: 'w-kb', offsetMm: 300, widthMm: 1000, heightMm: 2100, sillMm: 0 } } });
  assert.equal(openingEdit(graph, 'door-1', 'update', { widthMm: 900, offsetMm: 300 }).ok, false, 'no change');
  assert.equal(openingEdit(graph, 'door-1', 'update', { widthMm: 0 }).ok, false);
  assert.equal(openingEdit(graph, 'door-1', 'update', { offsetMm: -1 }).ok, false);
  assert.equal(openingEdit(graph, 'door-1', 'update', { offsetMm: 3500 }).ok, false, 'past the wall end');
  assert.deepEqual(openingEdit(graph, 'door-1', 'delete'), { ok: true, edit: { kind: 'opening', opening: { kind: 'delete', openingKey: 'door-1' } } });
  assert.equal(openingEdit(graph, 'ghost', 'delete').ok, false);
  assert.equal(openingEdit(graph, 'door-1', 'explode').ok, false);
});

test('the request names the exact saved version and carries its fingerprint', () => {
  const drawing = { planId: 'plan-1', version: 3, fingerprint: 'abc' };
  const edit = { kind: 'rename', roomKey: 'kitchen', name: 'Pantry' };
  assert.equal(editPath(drawing), 'variable/plans/plan-1/versions/3/edits');
  assert.deepEqual(editBody(drawing, edit), { fingerprint: 'abc', edit });
});

test('wall choices are named by the room on the other side, and the preview names both rooms', () => {
  assert.deepEqual(interiorWalls(graph, 'kitchen'), [
    { key: 'w-kd', label: 'With Dining (wall 1)' }, { key: 'w-kd2', label: 'With Dining (wall 2)' }, { key: 'w-kb', label: 'With Bedroom' },
  ]);
  assert.equal(movePreview(graph, 'w-kd', '300'), 'Moves the wall between Kitchen and Dining by 300 mm.');
  assert.equal(movePreview(graph, 'w-kd', '-1250'), 'Moves the wall between Kitchen and Dining by -1,250 mm.');
  assert.equal(movePreview(graph, 'w-kd', '0'), '');
  assert.equal(movePreview(graph, 'w-out', '300'), '');
  assert.match(moveDirectionHint(graph, 'w-kd'), /east/);
  assert.match(moveDirectionHint(graph, 'w-kb'), /north/);
});

test('describeChanges says what changed in plain words, with names from the plan', () => {
  assert.equal(describeChanges({ rooms: [{ key: 'kitchen' }, { key: 'dining' }], walls: [], openings: [] }, graph), '2 rooms changed: Kitchen, Dining');
  assert.equal(describeChanges({ rooms: [{ key: 'kitchen', fields: ['rect'] }], walls: ['w-kd', 'w-kd2'], openings: ['door-1'] }, graph), '1 room changed: Kitchen; 2 walls moved; 1 opening changed');
  assert.equal(describeChanges({ rooms: [{ key: 'kitchen' }, { key: 'kitchen' }] }, graph), '1 room changed: Kitchen');
  assert.equal(describeChanges({ rooms: ['a', 'b', 'c', 'd', 'e'].map((key) => ({ key })) }), '5 rooms changed: a, b, c and 2 more');
  assert.equal(describeChanges({ rooms: [], walls: [], openings: [] }, graph), 'No geometry changed');
  assert.equal(describeChanges(null, graph), '');
});

const report = (status, findings = []) => ({ schema: 'datumm.findings.v1', ruleSet: 'plan-rules@1', status, findings });
const finding = (severity) => ({ code: 'x', category: 'geometry', severity, message: 'm' });

test('the saved message joins version, changes and checks', () => {
  const result = parseEditResult({ planId: 'p', version: 4, fingerprint: 'f', changes: { rooms: [{ key: 'kitchen' }, { key: 'dining' }] }, findings: report('pass') }, { planId: 'p', version: 3 });
  assert.equal(successMessage(result, graph), 'Saved as Version 4 · 2 rooms changed: Kitchen, Dining · Checks: no problems');
  assert.equal(checksLine(report('warn', [finding('advisory'), finding('advisory')])), 'Checks: 2 items to review');
  assert.equal(checksLine(report('fail', [finding('blocking')])), 'Checks: 1 blocking problem');
  assert.equal(checksLine(undefined), 'Checks: not available');
});

test('a result that is not a newer version of the same plan is rejected', () => {
  const drawing = { planId: 'p', version: 3 };
  assert.equal(parseEditResult({ planId: 'p', version: 3, fingerprint: 'f' }, drawing), null);
  assert.equal(parseEditResult({ planId: 'other', version: 4, fingerprint: 'f' }, drawing), null);
  assert.equal(parseEditResult({ planId: 'p', version: 4 }, drawing), null);
  assert.equal(parseEditResult('x', drawing), null);
  assert.deepEqual(parseEditResult({ planId: 'p', version: 4, fingerprint: 'f' }, drawing).changes, {});
});

test('refusals use plain words and keep the server detail for 422', () => {
  assert.equal(refusalMessage({ status: 409, message: 'whatever' }), 'whatever', 'a different 409 keeps its own message');
  assert.equal(refusalMessage({ status: 409, message: 'Plan has a newer version', code: 'edit.stale' }), STALE_MESSAGE);
  assert.equal(refusalMessage({ status: 409 }), STALE_MESSAGE);
  assert.equal(STALE_MESSAGE, 'This plan changed elsewhere. Reload to edit the latest version');
  assert.equal(refusalMessage({ status: 422, message: 'Requested wall offset would collapse a room.' }), 'Requested wall offset would collapse a room.');
  assert.match(refusalMessage({ status: 422, message: 'DATUMM could not complete the request. Check', code: 'edit.unintended-change' }), /parts of the plan you did not select/);
  assert.equal(refusalMessage({ status: 422, message: 'Choose a shared interior wall.', code: 'edit.refused' }), 'Choose a shared interior wall.');
  assert.match(refusalMessage({ status: 404 }), /not available/);
  assert.match(refusalMessage({ status: 503 }), /plan is unchanged/);
  assert.match(refusalMessage(), /plan is unchanged/);
});

test('only generated schema 3 or 4 plans offer edits; an unlabelled graph is not blocked', () => {
  assert.equal(editablePlan({ schemaVersion: 3, provenance: { source: 'deterministic' } }), true);
  assert.equal(editablePlan({ schemaVersion: 4, provenance: { source: 'deterministic' } }), true);
  assert.equal(editablePlan({ schemaVersion: 2 }), false);
  assert.equal(editablePlan({ schemaVersion: 3, provenance: { source: 'reconstructed' } }), false);
  assert.equal(editablePlan({}), true);
  assert.equal(acceptAgainNote(3), 'Version 3 needs to be accepted again.');
});
