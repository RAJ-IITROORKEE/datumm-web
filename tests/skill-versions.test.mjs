import test from 'node:test';
import assert from 'node:assert/strict';
import { activeModes, skillFromSnapshot, skillVersions, toggleSkillMode, withSkill } from '../src/lib/skill-versions.mjs';

const row = (revision, changes, extra = {}) => ({
  revision, at: '2026-11-12T06:00:00Z', by: 'a@example.invalid', action: 'update',
  restoredFrom: null, restorable: true, changes, ...extra,
});
const change = (path, extra = {}) => ({ path, beforeHash: 'aaaaaaaa', afterHash: 'bbbbbbbb', ...extra });
const item = (over = {}) => ({ id: 'a', name: 'A', description: 'Use when x.',
  instructions: 'Body.', modes: ['ask'], enabled: true, ...over });

// @lat: [[contracts#Hosted contract tests#Skill versions]]
test('versions keep only rows that touch the skill and name the changed fields', () => {
  const rows = [
    row(5, [change('skills[a].modes'), change('skills[a].instructions'), change('parallelChats')]),
    row(4, [change('skills[b].name')]),
    row(3, [change('skills[ab].name')]),
    row(2, [change('skills[a]', { beforeHash: null })]),
    row(1, []),
  ];
  const versions = skillVersions(rows, 'a');
  assert.deepEqual(versions.map(v => v.revision), [5, 2]);
  assert.deepEqual(versions[0].fields, ['modes', 'instructions']);
  assert.equal(versions[0].kind, 'changed');
  assert.equal(versions[1].kind, 'added');
  assert.equal(skillVersions(rows, 'b').length, 1);
});

test('a removed skill is marked removed and a row without changes is skipped', () => {
  const versions = skillVersions([row(7, [change('skills[a]', { afterHash: null })]), { revision: 8 }], 'a');
  assert.deepEqual(versions.map(v => [v.revision, v.kind]), [[7, 'removed']]);
  assert.deepEqual(skillVersions(null, 'a'), []);
});

test('the restore flag follows the row', () => {
  const [v] = skillVersions([row(5, [change('skills[a].name')], { restorable: false })], 'a');
  assert.equal(v.restorable, false);
});

test('the snapshot item is picked, trimmed to the six fields and validated', () => {
  const detail = { config: { skills: [item({ id: 'b' }), { ...item(), extra: 'x' }] } };
  assert.deepEqual(skillFromSnapshot(detail, 'a'), item());
  assert.equal(skillFromSnapshot(detail, 'zz'), null);
  assert.equal(skillFromSnapshot({ config: { skills: [item({ instructions: '' })] } }, 'a'), null);
  assert.equal(skillFromSnapshot({ config: { skills: [item({ modes: ['dev'] })] } }, 'a'), null);
  assert.equal(skillFromSnapshot({ config: null }, 'a'), null);
  assert.equal(skillFromSnapshot(null, 'a'), null);
});

test('withSkill replaces the same id in place or appends, and refuses a 31st skill', () => {
  const list = [item({ id: 'a', name: 'Old' }), item({ id: 'b' })];
  assert.deepEqual(withSkill(list, item({ id: 'a' })).map(s => s.name), ['A', 'A']);
  assert.equal(withSkill(list, item({ id: 'a' }))[0].id, 'a');
  assert.deepEqual(withSkill(list, item({ id: 'c' })).map(s => s.id), ['a', 'b', 'c']);
  const full = Array.from({ length: 30 }, (_, i) => item({ id: `s${i}` }));
  assert.equal(withSkill(full, item({ id: 'new' })), null);
  assert.equal(withSkill(full, item({ id: 's3' })).length, 30);
});

test('a mode switch is on only for an enabled skill that lists the mode', () => {
  const s = item({ modes: ['ask', 'plan'] });
  assert.deepEqual(activeModes(s), ['ask', 'plan']);
  assert.deepEqual(activeModes({ ...s, enabled: false }), []);
});

test('switching modes keeps at least one stored mode and uses enabled for "all off"', () => {
  const s = item({ modes: ['ask', 'plan'] });
  assert.deepEqual(toggleSkillMode(s, 'build', true).modes, ['ask', 'plan', 'build']);
  assert.deepEqual(toggleSkillMode(s, 'ask', false).modes, ['plan']);
  const last = toggleSkillMode(item({ modes: ['ask'] }), 'ask', false);
  assert.deepEqual([last.modes, last.enabled], [['ask'], false]);
  const back = toggleSkillMode(last, 'build', true);
  assert.deepEqual([back.modes, back.enabled], [['build'], true]);
});
