import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const exports={};
const source=readFileSync(new URL('../src/lib/chat-start.ts',import.meta.url),'utf8');
runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Response,Error,JSON,Number});

async function rejected(detail,status=409){
 const result=await exports.chatStartResult(Response.json({detail},{status}));
 assert.equal(result.status,status===200?409:status);
 const body=await result.json();
 assert.equal(exports.chatStartFailure(new Error(JSON.stringify(body))).message,body.message);
 return body;
}

test('shared task allowance rejection is readable and retains the durable receipt',async()=>{
 const body=await rejected({state:'rejected',id:'task-1',taskVersion:4,error:'BUDGET_EXHAUSTED: the shared agent_model_calls allowance is exhausted.'},200);
 assert.equal(body.message,'This chat has reached its usage limit. You can review your saved work or start a new chat.');
 assert.equal(body.state,'rejected');assert.equal(body.taskId,'task-1');assert.equal(body.taskVersion,4);
});

test('known codes handle both service strings and structured errors without inventing scope',async()=>{
 const shared=await rejected('admission BUDGET_EXHAUSTED: the shared input-token allowance is exhausted.');
 assert.match(shared.message,/start a new chat/);
 const generic=await rejected({code:'BUDGET_EXHAUSTED',message:'limit'});
 assert.equal(generic.message,'This task has reached a usage limit. You can review your saved work.');
 const unavailable=await rejected('BUDGET_UNAVAILABLE: the shared task ledger is unavailable.');
 assert.match(unavailable.message,/could not check the usage allowance/);
});

test('unrelated and unknown errors are not classified as usage limits',async()=>{
 for(const message of ['Provider quota exceeded.','Unable to parse BUDGET_EXHAUSTED: test','BUDGET_UNKNOWN: check configuration']){
  assert.equal((await rejected(message)).message,message);
 }
});

test('upstream HTML is not shown in chat failures or saved task notices',async()=>{
 const html='<!DOCTYPE html><html><body>CloudFront internal error</body></html>';
 const response=await exports.chatStartResult(new Response(html,{status:502,headers:{'content-type':'text/html'}}));
 const body=await response.json();
 assert.equal(response.status,502);
 assert.equal(body.message,'DATUMM service is temporarily unavailable. Check your saved task before trying again.');
 assert.doesNotMatch(exports.savedTaskConnectionNotice({status:'failed',data:{error:html}}),/CloudFront|<!DOCTYPE/);
 assert.equal(exports.serviceErrorMessage(html,401,'text/plain'),'Your session could not be verified. Sign in again and retry.');
 assert.equal(exports.serviceErrorMessage('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>Gateway</body></html>',502,'text/plain'),'DATUMM service is temporarily unavailable. Check your saved task before trying again.');
 assert.match(exports.serviceErrorMessage(html,403,'text/plain'),/permission/);
 assert.equal(exports.serviceErrorMessage('Please reconnect your account.',401,'application/json'),'Please reconnect your account.');
 assert.equal(exports.serviceErrorMessage('Permission denied for this project.',403),'Permission denied for this project.');
 assert.equal(exports.serviceErrorMessage('The device is offline.',502,'text/plain'),'The device is offline.');
 const plain=await exports.chatStartResult(new Response('Permission denied for this project.',{status:403,headers:{'content-type':'text/plain'}}));
 assert.equal((await plain.json()).message,'Permission denied for this project.');
 const structured=await exports.chatStartResult(Response.json({detail:'Sign in to connect your workspace.'},{status:401}));
 assert.equal((await structured.json()).message,'Sign in to connect your workspace.');
});

test('workspace API normalizes HTML and preserves structured and plain errors',async()=>{
 const workspace=readFileSync(new URL('../src/components/workspace/use-workspace-state.ts',import.meta.url),'utf8');
 const ast=ts.createSourceFile('workspace.ts',workspace,ts.ScriptTarget.Latest,true);
 const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='api');
 assert.ok(fn);
 const apiExports={};let response;
 const js=ts.transpileModule(fn.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(js,{exports:apiExports,fetch:async()=>response,serviceErrorMessage:exports.serviceErrorMessage,Error,JSON,Object});
 const cases=[
  [new Response('<!DOCTYPE html><body>CloudFront</body>',{status:502,headers:{'content-type':'text/html'}}),'temporarily unavailable'],
  [new Response('Bad Gateway',{status:502}),'temporarily unavailable'],
  [Response.json({detail:'Sign in to connect your workspace.'},{status:401}),'Sign in to connect your workspace.'],
  [Response.json({message:'Permission denied.'},{status:403}),'Permission denied.'],
  [Response.json({detail:{code:'BUDGET_EXHAUSTED',message:'Allowance exhausted.'}},{status:409}),'Allowance exhausted.'],
  [new Response('Specific plain error',{status:400}),'Specific plain error'],
 ];
 for(const [value,expected] of cases){response=value;await assert.rejects(apiExports.api('tasks'),error=>error.message.includes(expected)&&error.status===value.status);}
});

test('a follow-up on a model an admin turned off asks for another model and keeps the draft',async()=>{
 const copy='This model was turned off by an admin; pick another model.';
 assert.equal(exports.serviceErrorMessage('Model is not enabled.',400),copy);
 assert.equal(exports.serviceErrorMessage('Model is not enabled',400),copy);
 assert.equal(exports.serviceErrorMessage('The model is not enabled for this device.',400),'The model is not enabled for this device.');
 const response=await exports.chatStartResult(Response.json({detail:'Model is not enabled.'},{status:400}));
 assert.equal((await response.json()).message,copy);
});
