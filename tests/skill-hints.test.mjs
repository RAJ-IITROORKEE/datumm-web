import test from 'node:test';
import assert from 'node:assert/strict';
import { parseToolCatalog } from '../src/lib/admin-tools.mjs';
import { HINT_MAX, toggleHint, toolHintOptions, validHints } from '../src/lib/skill-hints.mjs';

const entry = (id, toolNames, over = {}) => ({
  id, label: id, description: 'Synthetic.', group: 'research', runsOn: 'Server', risk: 'read',
  required: false, allowedModes: ['ask'], defaultModes: ['ask'], toolNames, ...over,
});

// @lat: [[contracts#Hosted contract tests#Skill tool hints]]
test('hint options are the catalog tool names only, each listed once, in catalog order', () => {
  const rows = parseToolCatalog([
    entry('core', ['finish_answer', 'lookup_evidence'], { required: true }),
    entry('web_search', ['web_search']),
    entry('revit_read', ['inspect_rooms', 'inspect_rooms', 'Bad Name', 'query_elements']),
    entry('revit_write', [], { risk: 'device', locked: true }),
    entry('dup', ['web_search']),
    entry('none', undefined),
  ]);
  assert.deepEqual(toolHintOptions(rows).map(o => [o.id, o.names]), [
    ['core', ['finish_answer', 'lookup_evidence']], ['web_search', ['web_search']],
    ['revit_read', ['inspect_rooms', 'query_elements']]]);
  assert.deepEqual(toolHintOptions(undefined), []);
});

test('toggling adds once, stops at the cap and removes', () => {
  assert.deepEqual(toggleHint(['a'], 'a', true), ['a']);
  assert.deepEqual(toggleHint(['a'], 'b', true), ['a', 'b']);
  const full = Array.from({ length: HINT_MAX }, (_, i) => `t${i}`);
  assert.equal(toggleHint(full, 'extra', true), full);
  assert.deepEqual(toggleHint(['a', 'b'], 'a', false), ['b']);
});

test('a hint list is valid with at most 6 distinct tool ids', () => {
  assert.equal(validHints([]), true);
  assert.equal(validHints(['web_search']), true);
  assert.equal(validHints(['a', 'a']), false);
  assert.equal(validHints(Array.from({ length: 7 }, (_, i) => `t${i}`)), false);
  assert.equal(validHints(['Web Search']), false);
  assert.equal(validHints('web_search'), false);
});
