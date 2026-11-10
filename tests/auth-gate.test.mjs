import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authGateState} from '../src/lib/auth-gate.mjs';

// @lat: [[contracts#Hosted contract tests#Sign-in gate]]
test('workspace renders only for signed-in visitors or when auth is unconfigured',()=>{
  assert.equal(authGateState(true,false,null),'loading');
  assert.equal(authGateState(true,true,null),'signed-out');
  assert.equal(authGateState(true,true,'user_1'),'open');
  assert.equal(authGateState(false,true,null),'open');
  const entry=readFileSync(new URL('../src/components/workspace-entry.tsx',import.meta.url),'utf8');
  assert.match(entry,/gate==='open'\?<Workspace/);
});
