import test from 'node:test';
import assert from 'node:assert/strict';
import {needsPluginSetup} from '../src/lib/plugin-setup.mjs';

// @lat: [[contracts#Hosted contract tests#Plugin setup guide]]
test('plugin setup guide shows only for Build without an online device',()=>{
  assert.equal(needsPluginSetup('build',[]),true);
  assert.equal(needsPluginSetup('build',[{online:false}]),true);
  assert.equal(needsPluginSetup('build',[{online:false},{online:true}]),false);
  for(const mode of ['ask','plan'])assert.equal(needsPluginSetup(mode,[]),false);
});
