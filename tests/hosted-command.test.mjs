import test from 'node:test';
import assert from 'node:assert/strict';
import {hostedCommand} from '../src/lib/hosted-command.mjs';

// @lat: [[contracts#Hosted contract tests#Strict envelope]]
test('strict hosted envelope retains command identity and omits empty local metadata',()=>{
  const command={schemaVersion:2,type:'chat_followup',prompt:'Keep the accepted drawing',visiblePlan:{planId:'saved'},acceptedAssumptions:['entry'],deviceId:'revit-device'};
  const envelope=hostedCommand({idempotencyKey:'stable-retry-key',expectedTaskVersion:4,expectedPlanVersion:2,projectId:null,attachmentIds:[]},command);
  assert.deepEqual(envelope,{schemaVersion:2,idempotencyKey:'stable-retry-key',expectedTaskVersion:4,expectedPlanVersion:2,command});
  assert.equal(envelope.command,command);
});

// @lat: [[contracts#Hosted contract tests#Reject unsupported sources]]
test('rejects unsupported project and source data before dispatch',()=>{
  for(const metadata of [{projectId:'project-1'},{attachmentIds:['source-1']},{attachmentIds:'source-1'}])assert.throws(()=>hostedCommand(metadata,{type:'submit'}),/Projects and file attachments/);
  assert.equal(hostedCommand({idempotencyKey:'new-request'},{}).expectedTaskVersion,0);
});
