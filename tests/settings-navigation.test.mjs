import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSettingsSections, modelIdentity, settingsSections } from '../src/components/settings-navigation.mjs';

test('settings search retains actual section order and filters by all entered terms', () => {
  assert.deepEqual(filterSettingsSections('  '), settingsSections);
  assert.deepEqual(filterSettingsSections(' PERSONAL ').map(item => item.id), ['account', 'general', 'appearance']);
  assert.deepEqual(filterSettingsSections('workspace model').map(item => item.id), ['models']);
  assert.deepEqual(filterSettingsSections('sign in security').map(item => item.id), ['account']);
  assert.deepEqual(filterSettingsSections('model security'), []);
  assert.deepEqual(filterSettingsSections('team invitations'), []);
});

test('settings groups contain only the supported individual sections', () => {
  assert.deepEqual(settingsSections.map(item => [item.id, item.group]), [
    ['account', 'Personal'], ['general', 'Personal'], ['appearance', 'Personal'],
    ['models', 'Workspace'], ['revit', 'Workspace'], ['usage', 'Workspace'], ['billing', 'Workspace'], ['capabilities', 'Workspace'],
  ]);
});

test('model identity preserves reported names and never guesses a provider', () => {
  assert.deepEqual(modelIdentity('openai/gpt-5.1'), { provider: 'openai', name: 'gpt-5.1' });
  assert.deepEqual(modelIdentity('hosted/vendor/model'), { provider: 'hosted', name: 'vendor/model' });
  for (const name of ['gpt-5.1', '/unnamed', 'provider/', '']) assert.deepEqual(modelIdentity(name), { provider: null, name });
});
