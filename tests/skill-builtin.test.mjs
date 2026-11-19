import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig, emptyConfig } from '../src/lib/admin-config.mjs';
import { builtinModes, parseBuiltinCatalog, toggleBuiltinMode } from '../src/lib/skill-builtin.mjs';

const item = (over = {}) => ({ id: 'datumm-brief-writing', name: 'Brief writing',
  description: 'Use when a request is rough.', instructions: 'Advice only.',
  toolHints: ['knowledge_search'], ...over });

// @lat: [[contracts#Hosted contract tests#Starter skills]]
test('the starter catalog keeps valid entries and drops the rest', () => {
  assert.deepEqual(parseBuiltinCatalog(undefined), []);
  assert.deepEqual(parseBuiltinCatalog('x'), []);
  const parsed = parseBuiltinCatalog([item(), item(), null, 'x', item({ id: 'my-skill' }),
    item({ id: 'datumm-b', name: '' }), item({ id: 'datumm-c', instructions: 'x'.repeat(4001) }),
    item({ id: 'datumm-d', description: 'x'.repeat(301) }),
    item({ id: 'datumm-e', toolHints: ['web_search', 'Bad Name', 'web_search', 7] }),
    item({ id: 'datumm-f', toolHints: undefined })]);
  assert.deepEqual(parsed.map(s => s.id), ['datumm-brief-writing', 'datumm-e', 'datumm-f']);
  assert.deepEqual(parsed[1].toolHints, ['web_search']);
  assert.deepEqual(parsed[2].toolHints, []);
  assert.deepEqual(Object.keys(parsed[0]).sort(),
    ['description', 'id', 'instructions', 'name', 'toolHints']);
});

test('a mode switch writes builtinSkills; off everywhere removes the entry', () => {
  const id = 'datumm-brief-writing';
  assert.deepEqual(toggleBuiltinMode(undefined, id, 'plan', true), [{ id, modes: ['plan'] }]);
  const both = toggleBuiltinMode([{ id, modes: ['plan'] }], id, 'ask', true);
  assert.deepEqual(both, [{ id, modes: ['ask', 'plan'] }]);
  assert.deepEqual(builtinModes(both, id), ['ask', 'plan']);
  assert.deepEqual(toggleBuiltinMode(both, id, 'ask', false), [{ id, modes: ['plan'] }]);
  assert.deepEqual(toggleBuiltinMode([{ id, modes: ['plan'] }], id, 'plan', false), []);
  assert.deepEqual(builtinModes([], id), []);
  const other = { id: 'datumm-other', modes: ['build'] };
  assert.deepEqual(toggleBuiltinMode([other], id, 'ask', true), [other, { id, modes: ['ask'] }]);
  assert.deepEqual(toggleBuiltinMode([other], 'my-skill', 'ask', true), [other]);
});

test('config validation checks builtinSkills, toolHints and the reserved prefix', () => {
  const skill = (over = {}) => ({ id: 'mine', name: 'Mine', description: '', instructions: 'x',
    modes: ['ask'], enabled: true, ...over });
  const ok = { ...emptyConfig(), builtinSkills: [{ id: 'datumm-a', modes: ['ask', 'build'] }],
    skills: [skill({ toolHints: ['web_search'] })] };
  assert.deepEqual(validateConfig(ok), {});
  assert.deepEqual(validateConfig(emptyConfig()), {});
  const errors = validateConfig({ ...emptyConfig(),
    builtinSkills: [{ id: 'mine', modes: ['ask'] }, { id: 'datumm-a', modes: [] },
      { id: 'datumm-b', modes: ['ask', 'zzz'] }, { id: 'datumm-b', modes: ['ask'] }, null],
    skills: [skill({ id: 'datumm-mine' }), skill({ id: 'a', toolHints: ['x', 'x'] }),
      skill({ id: 'b', toolHints: Array.from({ length: 7 }, (_, i) => `t${i}`) }),
      skill({ id: 'c', toolHints: 'web_search' })] });
  for (const key of ['builtinSkills.0.id', 'builtinSkills.1.modes', 'builtinSkills.2.modes',
    'builtinSkills.3.id', 'builtinSkills.4.id', 'skills.0.id', 'skills.1.toolHints',
    'skills.2.toolHints', 'skills.3.toolHints']) assert.ok(errors[key], key);
  assert.ok(validateConfig({ ...emptyConfig(), builtinSkills: 'x' }).builtinSkills);
});
