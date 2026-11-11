import test from 'node:test';
import assert from 'node:assert/strict';
import {hostedCommand,postHostedCommand} from '../src/lib/hosted-command.mjs';

// @lat: [[contracts#Hosted contract tests#Strict envelope]]
test('strict hosted envelope retains command identity and omits empty local metadata',()=>{
  const command={schemaVersion:2,type:'chat_followup',prompt:'Keep the accepted drawing',visiblePlan:{planId:'saved'},acceptedAssumptions:['entry'],deviceId:'revit-device'};
  const envelope=hostedCommand({idempotencyKey:'stable-retry-key',expectedTaskVersion:4,expectedPlanVersion:2,projectId:null,attachmentIds:[]},command);
  assert.deepEqual(envelope,{schemaVersion:2,idempotencyKey:'stable-retry-key',expectedTaskVersion:4,expectedPlanVersion:2,command});
  assert.equal(envelope.command,command);
});

// @lat: [[contracts#Hosted contract tests#Reject unsupported sources]]
test('rejects unsupported source data before dispatch and forwards a project id',()=>{
  for(const metadata of [{attachmentIds:['source-1']},{attachmentIds:'source-1'}])assert.throws(()=>hostedCommand(metadata,{type:'submit'}),/file attachments/i);
  assert.equal(hostedCommand({idempotencyKey:'k',projectId:'project-1'},{}).projectId,'project-1');
  assert.equal(hostedCommand({idempotencyKey:'new-request'},{}).expectedTaskVersion,0);
});

// @lat: [[contracts#Hosted contract tests#Blocked new chat]]
test('an existing approval blocks new chat creation without posting or changing the prompt',async()=>{
  const calls=[];
  const envelope=hostedCommand({idempotencyKey:'new-chat'},{type:'submit',prompt:'Web connection verified.'});
  const request=async(path,init)=>{calls.push({path,init});return Response.json([{id:'active-build',title:'Saved Build',status:'awaiting_approval'}]);};
  const response=await postHostedCommand(request,undefined,envelope);
  assert.equal(response.status,409);
  const {detail}=await response.json();
  assert.deepEqual(detail.blockingTask,{id:'active-build',title:'Saved Build',status:'awaiting_approval'});
  assert.match(detail.error,/Saved Build.*awaiting approval/);
  assert.deepEqual(calls,[{path:'/v2/tasks?active=true',init:undefined}]);
  assert.equal(envelope.command.prompt,'Web connection verified.');
});

// @lat: [[contracts#Hosted contract tests#Parallel Ask and Plan]]
test('independent Ask and Plan overlap below three running chats and are refused at three',async()=>{
  for (const mode of ['ask','plan']) {
    const calls=[];
    const request=async(path)=>{calls.push(path);return path.includes('?')?Response.json([{id:'build',title:'Pending',status:'awaiting_approval'},{id:'r1',title:'One',status:'running'},{id:'r2',title:'Two',status:'queued'}]):Response.json({id:'new'});};
    const result=await postHostedCommand(request,undefined,{command:{type:'submit',mode,modelContextRequirement:'auto'}});
    assert.equal(result.status,200);
    assert.deepEqual(calls,['/v2/tasks?active=true','/v2/tasks']);
  }
  const request=async()=>Response.json([1,2,3].map(n=>({id:'run-'+n,title:'Run '+n,status:'running'})));
  const result=await postHostedCommand(request,undefined,{command:{type:'submit',mode:'ask',modelContextRequirement:'auto'}});
  assert.equal(result.status,409);
  const {detail}=await result.json();
  assert.equal(detail.blockingTask.id,'run-1');
  assert.match(detail.error,/3 chats running/);
});

test('Revit-context and Build requests stay blocked by any running chat',async()=>{
  for(const command of [{type:'submit',mode:'ask',modelContextRequirement:'read'},{type:'submit',mode:'build',modelContextRequirement:'auto'}]){
    const request=async()=>Response.json([{id:'ask',title:'Ask',status:'running'}]);
    assert.equal((await postHostedCommand(request,undefined,{command})).status,409);
  }
});

test('Revit-context and Build requests remain blocked by a pending proposal',async()=>{
  for(const command of [{type:'submit',mode:'ask',modelContextRequirement:'read'},{type:'submit',mode:'build',modelContextRequirement:'auto'}]){
    const calls=[];
    const request=async(path)=>{calls.push(path);return Response.json([{id:'build',title:'Pending',status:'awaiting_approval'}]);};
    const result=await postHostedCommand(request,undefined,{command});
    assert.equal(result.status,409);
    assert.deepEqual(calls,['/v2/tasks?active=true']);
  }
});
