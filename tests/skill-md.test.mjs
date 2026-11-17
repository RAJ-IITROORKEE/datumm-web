import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILL_LIMITS, editedSkill, formatSkillMd, hasUseWhen, parseSkillMd, skillMdCounts,
} from '../src/lib/skill-md.mjs';

const file = (head = 'name: nbc-egress\ndescription: Use when checking exits.', body = 'Check the exit width.') =>
  `---\n${head}\n---\n${body}\n`;
const fields = result => result.errors.map(error => error.field);

// @lat: [[contracts#Hosted contract tests#Skill SKILL.md format]]
test('a valid file maps name to id, title to name, description and body', () => {
  const result = parseSkillMd(file('name: nbc-egress\ntitle: NBC egress\ndescription: Use when checking exits.'));
  assert.deepEqual(result, { ok: true, skill: {
    id: 'nbc-egress', name: 'NBC egress', description: 'Use when checking exits.',
    instructions: 'Check the exit width.' } });
});

test('title is optional and the name falls back to the id', () => {
  assert.equal(parseSkillMd(file()).skill.name, 'nbc-egress');
});

test('CRLF files and a BOM parse like LF files', () => {
  const crlf = '﻿' + file().replace(/\n/g, '\r\n');
  assert.deepEqual(parseSkillMd(crlf), parseSkillMd(file()));
});

test('quoted values lose their quotes and unknown keys are ignored', () => {
  const result = parseSkillMd(file('name: a\ndescription: "Use when: a colon"\nlicense: MIT'));
  assert.equal(result.skill.description, 'Use when: a colon');
});

test('every error is reported with its field', () => {
  const cases = [
    ['', ['file']],
    ['no frontmatter\nbody', ['file']],
    ['---\nname: a\ndescription: d\nbody without close', ['file']],
    [file('description: Use when x'), ['name']],
    [file('name: a'), ['description']],
    [file('name: Bad_Id\ndescription: d'), ['name']],
    [file('name: ' + 'a'.repeat(41) + '\ndescription: d'), ['name']],
    [file('name: a\ntitle: ' + 'x'.repeat(121) + '\ndescription: d'), ['title']],
    [file('name: a\ndescription: ' + 'x'.repeat(301)), ['description']],
    [file('name: a\ndescription: d', ''), ['body']],
    [file('name: a\ndescription: d', 'x'.repeat(4001)), ['body']],
    [file('name: a\ndescription: d', 'bad\u0007char'), ['file']],
    [file('name: a\ndescription: d', 'x'.repeat(7000)), ['file']],
  ];
  for (const [text, expected] of cases) {
    const result = parseSkillMd(text);
    assert.equal(result.ok, false, text.slice(0, 40));
    assert.deepEqual([...new Set(fields(result))], expected, text.slice(0, 40));
    assert.ok(result.errors.every(error => error.message.length > 5));
  }
});

test('limits are 300 for the description and 4000 for the body, inclusive', () => {
  assert.deepEqual([SKILL_LIMITS.description, SKILL_LIMITS.instructions], [300, 4000]);
  const edge = parseSkillMd(file('name: a\ndescription: ' + 'x'.repeat(300), 'y'.repeat(4000)));
  assert.equal(edge.ok, true);
});

test('tabs and newlines in the body are allowed, other control characters are not', () => {
  assert.equal(parseSkillMd(file('name: a\ndescription: d', 'a\tb\n\nc')).ok, true);
  assert.equal(parseSkillMd(file('name: a\ndescription: d', 'a\u0000b')).ok, false);
});

test('format and parse round trip, and the title is written only when it differs', () => {
  const skill = { id: 'nbc-egress', name: 'NBC egress', description: 'Use when: exits.',
    instructions: 'Line one.\n\nLine two.' };
  assert.deepEqual(parseSkillMd(formatSkillMd(skill)).skill, skill);
  const plain = { ...skill, name: 'nbc-egress' };
  assert.ok(!formatSkillMd(plain).includes('title:'));
  assert.deepEqual(parseSkillMd(formatSkillMd(plain)).skill, plain);
  assert.ok(!formatSkillMd(plain).includes('\r'));
});

test('format keeps the description on one line', () => {
  const text = formatSkillMd({ id: 'a', name: 'a', description: 'one\ntwo', instructions: 'b' });
  assert.equal(parseSkillMd(text).skill.description, 'one two');
});

test('hasUseWhen detects the trigger clause', () => {
  assert.equal(hasUseWhen('Use when checking exits.'), true);
  assert.equal(hasUseWhen('Cites NBC. Use for egress.'), true);
  assert.equal(hasUseWhen('Checks exits.'), false);
  assert.equal(hasUseWhen(''), false);
});

test('counts report the description and body lengths even when the file is invalid', () => {
  assert.deepEqual(skillMdCounts(file('name: BAD\ndescription: abc', 'hello')), { description: 3, body: 5 });
  assert.deepEqual(skillMdCounts('nothing here'), { description: 0, body: 0 });
});

test('Apply with no edits leaves a legacy skill byte-identical; a real edit is written', () => {
  const legacy = { id: 'old', name: 'old', description: 'Use  when\n exits.',
    instructions: '  Step one.\n' };
  const untouched = parseSkillMd(formatSkillMd(legacy)).skill;
  assert.notDeepEqual(untouched, { id: 'old', name: 'old', description: legacy.description,
    instructions: legacy.instructions });                     // the round trip alone would rewrite it
  assert.equal(editedSkill(legacy, untouched), null);
  assert.deepEqual(editedSkill(legacy, { ...untouched, instructions: 'Step two.' }),
    { ...untouched, instructions: 'Step two.' });
  assert.deepEqual(editedSkill(undefined, untouched), untouched);   // a new skill is always written
});
