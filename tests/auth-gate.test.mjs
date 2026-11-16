import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {authGateState} from '../src/lib/auth-gate.mjs';

// @lat: [[contracts#Hosted contract tests#Sign-in gate]]
test('workspace opens only for signed-in visitors and missing account configuration stays unavailable',()=>{
  assert.equal(authGateState(true,false,null),'loading');
  assert.equal(authGateState(true,true,null),'signed-out');
  assert.equal(authGateState(true,true,'user_1'),'open');
  assert.equal(authGateState(false,true,null),'unavailable');
  assert.equal(authGateState(false,false,'user_1'),'unavailable');
  const entry=readFileSync(new URL('../src/components/workspace-entry.tsx',import.meta.url),'utf8');
  assert.match(entry,/gate==='open'\?<AccountOnboardingGate key=\{userId\}/);
  assert.match(entry,/if\(authConfigured\)return <AccountWorkspace\/>/);
  assert.match(entry,/data-account-configuration="unavailable"/);
  assert.match(entry,/Account sign-in is unavailable/);
  assert.doesNotMatch(entry,/<Workspace authConfigured=\{false\}/);
});
