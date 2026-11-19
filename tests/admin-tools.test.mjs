import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  effectiveModes, groupToolRows, lockKind, modeDisabled, parseToolCatalog, toggleToolMode, toolsErrors,
} from '../src/lib/admin-tools.mjs';

const entry = (over = {}) => ({
  id: 'web_search', label: 'Web search', description: 'Searches the web.', group: 'research',
  runsOn: 'Server', risk: 'read', required: false, allowedModes: ['ask', 'plan'],
  defaultModes: ['ask', 'plan'], toolNames: ['web_search'], ...over,
});
const catalog = [
  entry({ id: 'core', label: 'Core', group: 'core', required: true, allowedModes: ['ask', 'plan', 'build'], defaultModes: ['ask', 'plan', 'build'] }),
  entry(),
  entry({ id: 'revit_write', label: 'Revit changes', group: 'revit', risk: 'device', locked: true, allowedModes: ['build'], defaultModes: ['build'] }),
  entry({ id: 'propose_changes', group: 'design', allowedModes: ['plan', 'build'], defaultModes: ['plan', 'build'] }),
];
const rows = parseToolCatalog(catalog);
const row = id => rows.find(r => r.id === id);

// @lat: [[contracts#Hosted contract tests#Admin tools rows]]
test('catalog parsing keeps valid rows and drops malformed ones', () => {
  assert.deepEqual(parseToolCatalog(undefined), []);
  assert.deepEqual(parseToolCatalog('x'), []);
  const parsed = parseToolCatalog([...catalog, null, { id: 'x' }, entry({ id: 'Bad Id' }),
    entry({ id: 'dup' }), entry({ id: 'dup' }), entry({ id: 'm', allowedModes: ['ask', 'zzz'] }),
    entry({ id: 'n', defaultModes: ['build'] })]);
  assert.deepEqual(parsed.map(r => r.id), ['core', 'web_search', 'revit_write', 'propose_changes', 'dup']);
  assert.equal(row('web_search').risk, 'read');
});

test('rows are grouped Core, Research, Revit, Design and unknown groups come last', () => {
  const grouped = groupToolRows([...rows, ...parseToolCatalog([entry({ id: 'odd', group: 'zeta' })])]);
  assert.deepEqual(grouped.map(g => g.id), ['core', 'research', 'revit', 'design', 'zeta']);
  assert.deepEqual(grouped.map(g => g.label).slice(0, 4), ['Core', 'Research', 'Revit', 'Design']);
});

test('modes come from the saved map, else the catalog default', () => {
  assert.deepEqual(effectiveModes(row('web_search'), undefined), ['ask', 'plan']);
  assert.deepEqual(effectiveModes(row('web_search'), { web_search: { modes: ['ask'] } }), ['ask']);
  assert.deepEqual(effectiveModes(row('web_search'), { web_search: { modes: [] } }), []);
});

test('a risk class alone never locks a row; the server `locked` flag does', () => {
  assert.equal(lockKind(parseToolCatalog([entry({ id: 'x', risk: 'device' })])[0]), null);
});

test('required and Revit-write rows are locked; switches stay inside the server ceiling', () => {
  assert.equal(lockKind(row('core')), 'required');
  assert.equal(lockKind(row('revit_write')), 'device');
  assert.equal(lockKind(row('web_search')), null);
  assert.equal(modeDisabled(row('web_search'), 'build'), true);
  assert.equal(modeDisabled(row('web_search'), 'plan'), false);
  assert.equal(modeDisabled(row('core'), 'ask'), true);
  assert.equal(modeDisabled(row('revit_write'), 'build'), true);
});

test('toggling narrows only within the ceiling and drops entries equal to the default', () => {
  const off = toggleToolMode({}, row('web_search'), 'plan', false);
  assert.deepEqual(off, { web_search: { modes: ['ask'] } });
  assert.deepEqual(toggleToolMode(off, row('web_search'), 'plan', true), {});
  assert.deepEqual(toggleToolMode({}, row('web_search'), 'build', true), {}, 'above the ceiling');
  assert.deepEqual(toggleToolMode({}, row('core'), 'ask', false), {}, 'required');
  assert.deepEqual(toggleToolMode({}, row('revit_write'), 'build', false), {}, 'locked');
  const none = toggleToolMode(off, row('web_search'), 'ask', false);
  assert.deepEqual(none, { web_search: { modes: [] } });
  assert.deepEqual(toggleToolMode({ other: { modes: ['ask'] } }, row('web_search'), 'plan', false),
    { other: { modes: ['ask'] }, web_search: { modes: ['ask'] } });
});

test('tool errors name unknown ids, modes above the ceiling and locked rows', () => {
  assert.deepEqual(toolsErrors({ web_search: { modes: ['ask'] } }, rows), {});
  const errors = toolsErrors({ ghost: { modes: [] }, web_search: { modes: ['build'] },
    core: { modes: [] }, revit_write: { modes: [] } }, rows);
  for (const id of ['ghost', 'web_search', 'core', 'revit_write']) assert.ok(errors[`tools.${id}`], id);
});

test('the server group labels (Core, Research, Revit, Design) match the known groups case-insensitively', () => {
  const grouped = groupToolRows(parseToolCatalog([entry({ id: 'core', group: 'Core' }), entry({ group: 'Research' }),
    entry({ id: 'revit_read', group: 'Revit' }), entry({ id: 'generate_concept_image', group: 'Design' }),
    entry({ id: 'odd', group: 'Zeta' })]));
  assert.deepEqual(grouped.map(g => [g.id, g.label, g.rows.length]),
    [['core', 'Core', 1], ['research', 'Research', 1], ['revit', 'Revit', 1], ['design', 'Design', 1], ['Zeta', 'Zeta', 1]]);
});

test('the dev fixture uses the server group casing', () => {
  const fixture = readFileSync(new URL('../src/components/dev/admin-preview.tsx', import.meta.url), 'utf8');
  const groups = [...fixture.matchAll(/entry\('[a-z_]+','[^']+','([^']+)'/g)].map(m => m[1]);
  assert.ok(groups.length >= 9);
  for (const group of groups) assert.ok(['Core', 'Research', 'Revit', 'Design'].includes(group), group);
});

test('catalog rows keep model-facing toolNames and tolerate their absence', () => {
  assert.deepEqual(row('web_search').toolNames, ['web_search']);
  const [odd] = parseToolCatalog([entry({ id: 'odd', toolNames: ['ok_name', 'Bad', 3, 'ok_name'] })]);
  assert.deepEqual(odd.toolNames, ['ok_name']);
  assert.deepEqual(parseToolCatalog([entry({ id: 'none', toolNames: undefined })])[0].toolNames, []);
});
