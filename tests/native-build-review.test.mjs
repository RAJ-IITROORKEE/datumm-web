import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function componentHarness(file, initialTime=Date.parse('2026-11-12T10:00:00Z')) {
 const slots=[],effects=[];
 let cursor=0,time=initialTime,trace;
 const hooks={...React,
  useRef(initial){const i=cursor++;return slots[i]??={current:initial};},
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useEffect(setup,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>!Object.is(v,slots[i].deps[j]))){const previous=slots[i];slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=setup();});}},
 };
 const exports={};
 const Button=()=>null;
 class Clock extends Date {static now(){return time;}}
 const source=readFileSync(new URL(`../src/components/${file}.tsx`,import.meta.url),'utf8');
 runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,Date:Clock,Error,setInterval(){return 1;},clearInterval(){},
  window:{desktop:{readTrace:async()=>trace}},
  require(name){
   if(name==='react')return hooks;
   if(name==='react/jsx-runtime')return jsxRuntime;
   if(name==='@/components/ui/button')return {Button};
   if(name.endsWith('.module.css'))return {default:{}};
   if(name==='@/lib/settled-poll.mjs')return {settledPoll(update){void update();return ()=>{};}};
   return new Proxy({},{get:()=>()=>null});
  },
 });
 return {exports,render(props){cursor=0;const tree=(exports.NativeBuildReview??exports.NativeBuildProgress)(props);effects.splice(0).forEach(fn=>fn());return tree;},setTime(next){time=next;},setTrace(value){trace=value;}};
}
const children=node=>Array.isArray(node)?node:node?.props?.children??[];
const flatten=node=>Array.isArray(node)?node.flatMap(flatten):node&&typeof node==='object'?[node,...flatten(children(node))]:[];
const content=node=>Array.isArray(node)?node.map(content).join(''):node===null||node===undefined||typeof node==='boolean'?'':typeof node==='object'?content(children(node)):String(node);
const button=(tree,label)=>flatten(tree).find(node=>node.props?.onClick&&content(node)===label);
const value=(overrides={})=>({state:'preview',changes:{title:'Rename meeting room',documentId:'document-1',levelId:'level-1',expectedRevision:12,operations:[{key:'room-1',kind:'set_room_metadata',elementId:'101',name:'Meeting room',number:'1.02'}]},proposal:{proposalId:'proposal-1',approvalHash:'exact-hash-1',expiresAt:'2026-11-12T10:05:00Z',deletions:[]},originalElements:[{id:'101',roomName:'Office',roomNumber:'1.01'}],...overrides});
const props=overrides=>({value:value(),pending:false,onAction:async()=>{},...overrides});
const settle=()=>new Promise(setImmediate);

test('native approval shows before/after changes and exact binding beside explicit actions',()=>{
 const h=componentHarness('native-build-review'),tree=h.render(props());
 const text=content(tree);
 for(const field of ['Office → Meeting room','Number: 1.01 → 1.02','document-1','proposal-1','exact-hash-1','Reviewed revision12','Expires'])assert.ok(text.includes(field),field);
 assert.ok(text.indexOf('exact-hash-1')<text.indexOf('Approve exact proposal and build'));
 assert.equal(button(tree,'Approve exact proposal and build').props.disabled,false);
 assert.ok(text.includes('No Revit changes have been applied'));
});

test('native action mutex blocks same-tick duplicates and refresh races until the callback settles',async()=>{
 const h=componentHarness('native-build-review');
 let finish,actions=[],refreshes=0;
 const p=props({onAction:action=>{actions.push(action);return new Promise(resolve=>{finish=resolve;});},onRefresh:async()=>{refreshes++;}});
 const tree=h.render(p),approve=button(tree,'Approve exact proposal and build');
 approve.props.onClick();approve.props.onClick();button(tree,'Refresh exact proposal').props.onClick();
 assert.deepEqual(actions,['approve']);assert.equal(refreshes,0);
 assert.equal(button(h.render(p),'Working…').props.disabled,true);
 finish();await settle();
 assert.equal(button(h.render(p),'Approve exact proposal and build').props.disabled,false);
 assert.ok(content(h.render(p)).includes('Awaiting your review'),'a fulfilled request does not fabricate committed state');
});

test('approval rechecks expiry at click and fails closed for malformed expiry',async()=>{
 const h=componentHarness('native-build-review');let calls=0;
 const p=props({onAction:async()=>{calls++;}}),tree=h.render(p);
 h.setTime(Date.parse('2026-11-12T10:05:00Z'));
 button(tree,'Approve exact proposal and build').props.onClick();await settle();
 assert.equal(calls,0);assert.ok(content(h.render(p)).includes('Refresh the review before approving'));
 const malformed=props({value:value({proposal:{proposalId:'bad',approvalHash:'hash',expiresAt:'invalid'}}),onAction:async()=>{calls++;}});
 const invalidTree=h.render(malformed);
 assert.equal(button(invalidTree,'Approve exact proposal and build').props.disabled,true);
 button(invalidTree,'Approve exact proposal and build').props.onClick();await settle();assert.equal(calls,0);
});

test('unavailable native and parent pending block handlers as well as buttons',async()=>{
 for(const state of [{nativeAvailable:false},{pending:true}]){
  const h=componentHarness('native-build-review');let calls=0;
  const tree=h.render(props({...state,onAction:async()=>{calls++;},onRefresh:async()=>{calls++;}}));
  for(const label of ['Approve exact proposal and build','Refresh exact proposal']){const control=button(tree,label);assert.equal(control.props.disabled,true);control.props.onClick();}
  await settle();assert.equal(calls,0);
 }
});

test('refresh retains exact callback and errors permit recovery without claiming completion',async()=>{
 const h=componentHarness('native-build-review');let refreshes=0;
 const p=props({onAction:async()=>{throw Error('Original operation unavailable');},onRefresh:async()=>{refreshes++;}});
 button(h.render(p),'Approve exact proposal and build').props.onClick();await settle();
 assert.ok(content(h.render(p)).includes('Original operation unavailable'));
 button(h.render(p),'Refresh exact proposal').props.onClick();await settle();assert.equal(refreshes,1);
 assert.ok(!content(h.render(p)).includes('Original operation unavailable'));
});

test('native committed, verified, stale and unknown evidence remain distinct with original operation controls',()=>{
 const h=componentHarness('native-build-review');
 const receipt=status=>({status,coverage:{},identity:{documentId:'document-1',operationId:'operation-1',expectedRevision:12},evidence:{sameDocument:null}});
 const cases=[
  [{state:'committed'},'Verification incomplete','Native changes are recorded'],
  [{state:'committed',outcomeReceipt:receipt('verified')},'Verified','Changes applied and checked in Revit'],
  [{state:'committed',outcomeReceipt:receipt('stale')},'Evidence stale','Saved evidence is stale'],
  [{state:'committed',outcomeReceipt:receipt('unknown')},'Status unknown','does not confirm the native result'],
  [{state:'unknown'},'Needs checking','another build could duplicate elements'],
 ];
 for(const [overrides,status,message]of cases){
  const tree=h.render(props({value:value({...overrides,operationId:'operation-1',nativeSelectionAvailable:true})})),text=content(tree);
  assert.ok(text.includes(status));assert.ok(text.includes(message));assert.ok(text.includes('operation-1'));
  assert.ok(button(tree,'Refresh original operation status'));assert.equal(button(tree,'Approve exact proposal and build'),undefined);
  assert.equal(Boolean(button(tree,'Show in Revit')),overrides.state==='committed');
 }
});

test('native trace summary distinguishes request completion from result verification and unreported stages',async()=>{
 const h=componentHarness('native-build-progress');
 const p={taskId:'task-1',fingerprint:'fp-1',startedAt:100,working:false,error:''};
 h.setTrace({spans:[{spanId:'root',traceId:'trace-1',name:'demo.build',startedAt:100,status:'completed'}]});
 h.render(p);await settle();const finished=content(h.render(p));
 assert.ok(finished.includes('Build request finished'));assert.ok(finished.includes('Not reported'));
 assert.ok(!finished.includes('Changes applied and checked'));
 h.setTrace({spans:[{spanId:'root',traceId:'trace-1',name:'demo.build',startedAt:100,status:'running'}]});
 h.render({...p,working:true});await settle();h.render(p);await settle();
 assert.ok(content(h.render(p)).includes('Build status needs checking'));
 const other=h.render({...p,taskId:'task-2'});
 assert.equal(other,null,'the preceding task trace cannot appear on a different task');
});

test('native progress only associates stage spans with the selected root trace',()=>{
 const {exports:{buildProgress}}=componentHarness('native-build-progress');
 const spans=[
  {name:'demo.build',spanId:'old',traceId:'old',startedAt:10,status:'completed',attributes:{target:{fingerprint:'other'}}},
  {name:'demo.inspect-target',spanId:'old-stage',traceId:'old',startedAt:11,status:'completed'},
  {name:'demo.build',spanId:'current',traceId:'current',startedAt:100,status:'running',attributes:{target:{fingerprint:'fp'}}},
  {name:'demo.preview',spanId:'preview',traceId:'current',startedAt:103,status:'completed'},
 ];
 const progress=buildProgress(spans,'fp',null);
 assert.equal(progress.root.spanId,'current');assert.equal(progress.stages[0].span,undefined);assert.equal(progress.stages[3].span.spanId,'preview');
 assert.equal(buildProgress(spans,'missing',null),null);
});
