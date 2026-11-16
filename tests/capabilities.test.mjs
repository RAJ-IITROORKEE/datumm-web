import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPABILITY_FEATURES, featureState, parseCapabilities, planningGoalsVisible} from '../src/lib/capabilities.mjs';

const allUnknown = {version: null, features: Object.fromEntries(CAPABILITY_FEATURES.map(name => [name, 'unknown']))};
const v1 = features => ({capabilities: {version: 1, features}});

// @lat: [[contracts#Hosted contract tests#Capability parsing]]
test('a config without a usable capabilities object reports every feature unknown', () => {
  for (const config of [undefined, null, 'x', [], {}, {capabilities: null}, {capabilities: 'on'}, {capabilities: []},
    {capabilities: {version: 2, features: {adminConfig: true}}}, {capabilities: {features: {adminConfig: true}}},
    {capabilities: {version: '1', features: {adminConfig: true}}}, {capabilities: {version: 1}},
    {capabilities: {version: 1, features: []}}, {capabilities: {version: 1, features: 'x'}}]) {
    assert.deepEqual(parseCapabilities(config), allUnknown, JSON.stringify(config));
  }
});

test('a valid v1 object maps booleans and leaves missing or malformed features unknown', () => {
  const parsed = parseCapabilities(v1({adminConfig: true, adminAudit: false, adminOverview: 'yes', adminKnowledge: 1, extra: true}));
  assert.deepEqual(parsed, {version: 1, features: {adminConfig: 'on', adminAudit: 'off', adminOverview: 'unknown', adminKnowledge: 'unknown', planningGoals: 'unknown'}});
  assert.equal(featureState(parsed, 'adminAudit'), 'off');
  assert.equal(featureState(null, 'adminAudit'), 'unknown');
});

test('planning goals fall back to today\'s gate only while the backend is silent', () => {
  const on = parseCapabilities(v1({planningGoals: true}));
  const off = parseCapabilities(v1({planningGoals: false}));
  const unknown = parseCapabilities({});
  for (const [capabilities, liveRuntime, desktopPreview, expected] of [
    [unknown, false, false, false], [unknown, true, false, true], [unknown, false, true, true],
    [on, false, false, true], [on, true, false, true],
    [off, true, false, false], [off, false, false, false], [off, false, true, true],
    [null, true, false, true],
  ]) assert.equal(planningGoalsVisible(capabilities, {liveRuntime, desktopPreview}), expected, `${capabilities?.features.planningGoals} ${liveRuntime} ${desktopPreview}`);
});
