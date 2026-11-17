import test from 'node:test';
import assert from 'node:assert/strict';
import {groupModels, modelFacts, modelName, modelProvider, parseModelInfo}
  from '../src/lib/model-display.mjs';

test('names and providers come from the id', () => {
  assert.equal(modelName('openai/gpt-5-mini'), 'GPT-5 Mini');
  assert.equal(modelProvider('anthropic/claude-sonnet-5'), 'Anthropic');
  assert.equal(modelProvider('acme/x'), 'Acme');
  assert.equal(modelProvider('plain'), 'Plain');
});

test('parseModelInfo keeps only served ids and valid fields', () => {
  const info = parseModelInfo({
    'a/one': {promptPerM: '3', completionPerM: '15', contextLength: 200000, imageInput: true},
    'a/two': {promptPerM: 'free', completionPerM: '-1', contextLength: -5, imageInput: 'yes'},
    'a/gone': {promptPerM: '1', completionPerM: '2'},
    'a/three': 'nope',
  }, ['a/one', 'a/two', 'a/three']);
  assert.deepEqual(info,
    {'a/one': {promptPerM: 3, completionPerM: 15, contextLength: 200000, imageInput: true}});
  assert.deepEqual(parseModelInfo(null, ['a/one']), {});
  assert.deepEqual(parseModelInfo([], ['a/one']), {});
});

test('modelFacts labels only what is known', () => {
  const full = {promptPerM: 3, completionPerM: 15, contextLength: 200000, imageInput: true};
  assert.deepEqual(modelFacts(full),
    ['$3 / $15 per M', '200K context', 'Reads images']);
  assert.deepEqual(modelFacts({promptPerM: 0.15, completionPerM: 0.6}), ['$0.15 / $0.6 per M']);
  assert.deepEqual(modelFacts({promptPerM: 3}), []);
  assert.deepEqual(modelFacts(undefined), []);
});

test('tiny and large prices never use scientific notation', () => {
  assert.deepEqual(modelFacts({promptPerM: 1e-8, completionPerM: 1.23e-7}),
    ['$0.00000001 / $0.000000123 per M']);
  assert.deepEqual(modelFacts({promptPerM: 1e21, completionPerM: 0}),
    ['$1000000000000000000000 / $0 per M']);
});

test('groupModels groups by provider, default first, server order kept', () => {
  const groups = groupModels(['a/x', 'b/y', 'a/z', 'b/w'], 'a/z');
  assert.deepEqual(groups,
    [{provider: 'A', models: ['a/z', 'a/x']}, {provider: 'B', models: ['b/y', 'b/w']}]);
  assert.deepEqual(groupModels(['a/x'], undefined), [{provider: 'A', models: ['a/x']}]);
  assert.deepEqual(groupModels([], 'a/x'), []);
});
