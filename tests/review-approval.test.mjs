import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';

function harness(file,name){
  const slots=[];let cursor=0,clock=Date.parse('2026-11-12T12:00:00Z');
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useEffect(){}};
  const exports={};class Clock extends Date{static now(){return clock;}}
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/review/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date:Clock,Error,require(module){if(module==='react')return hooks;if(module==='react/jsx-runtime')return jsx;if(module==='../ui/button')return {Button:'button'};if(module.endsWith('.module.css'))return {default:{}};return new Proxy({},{get:()=>()=>null});}});
  return{render(props){cursor=0;return elements(exports[name](props));},advance(ms){clock+=ms;}};
}
function elements(tree){if(!React.isValidElement(tree))return[];return[tree,...React.Children.toArray(tree.props.children).flatMap(elements)];}
function words(tree){return tree.map(el=>React.Children.toArray(el.props.children).filter(child=>typeof child==='string'||typeof child==='number').join('')).join(' ');}
const button=(tree,label)=>tree.find(el=>el.type==='button'&&words([el]).includes(label));
const proposal={proposalId:'proposal-a',approvalHash:'exact-hash-a',documentId:'document-a',revision:12,expiresAt:'2026-11-12T12:01:00Z'};
const settle=()=>new Promise(setImmediate);

test('hosted exact approval dispatches once and never derives completion from a successful callback',async()=>{
  const h=harness('proposal-approval.tsx','ProposalApprovalPanel'),calls=[];let finish;
  const props={proposal,pending:false,canRefresh:true,onAction:action=>{calls.push(action);return new Promise(resolve=>{finish=resolve;});}};
  const approve=button(h.render(props),'Approve exact proposal and build');
  approve.props.onClick();approve.props.onClick();
  assert.deepEqual(calls,['resume']);
  assert.equal(h.render(props).filter(el=>el.type==='button').every(el=>el.props.disabled),true);
  finish();await settle();
  const ready=h.render(props);
  assert.match(words(ready),/Awaiting your approval/);
  assert.equal(button(ready,'Approve exact proposal and build').props.disabled,false);
});

test('hosted approval fails closed for incomplete or elapsed identity including expiry between render and click',async()=>{
  const invalid=[undefined,{...proposal,approvalHash:''},{...proposal,documentId:''},{...proposal,revision:-1},{...proposal,expiresAt:'invalid'}];
  for(const row of invalid){const h=harness('proposal-approval.tsx','ProposalApprovalPanel');let calls=0;const props={proposal:row,pending:false,canRefresh:true,onAction:async()=>{calls++;}};const approve=button(h.render(props),'Approve exact proposal and build');assert.equal(approve.props.disabled,true);approve.props.onClick();await settle();assert.equal(calls,0);}
  const h=harness('proposal-approval.tsx','ProposalApprovalPanel');let calls=0;const props={proposal,pending:false,canRefresh:true,onAction:async()=>{calls++;}};
  const approve=button(h.render(props),'Approve exact proposal and build');h.advance(61000);approve.props.onClick();await settle();assert.equal(calls,0);assert.match(words(h.render(props)),/expired/);
});

test('refresh and scoped-access navigation do not approve, and rejected approval remains reviewable',async()=>{
  const h=harness('proposal-approval.tsx','ProposalApprovalPanel'),calls=[];const trigger={};let captured;
  let props={proposal:{...proposal,expiresAt:'2026-11-12T11:00:00Z'},pending:false,canRefresh:true,onAction:async action=>{calls.push(action);},onConfigureAccess:element=>{captured=element;}};
  button(h.render(props),'Refresh expired review').props.onClick();await settle();assert.deepEqual(calls,['refresh-proposal']);
  button(h.render(props),'Configure task Full Access').props.onClick({currentTarget:trigger});assert.equal(captured,trigger);assert.equal(calls.length,1);
  props={...props,proposal,onAction:async()=>{throw Error('Saved proposal changed.');}};
  button(h.render(props),'Approve exact proposal and build').props.onClick();await settle();const failed=h.render(props);assert.match(words(failed),/Saved proposal changed/);assert.equal(button(failed,'Approve exact proposal and build').props.disabled,false);
});

test('plan acceptance is separate from native preparation and stale or pending drawings cannot prepare',async()=>{
  const h=harness('plan-review-card.tsx','PlanReviewCard'),calls=[];let finish;
  const props={alternatives:2,planVersion:2,planId:'plan-a',fingerprint:'fingerprint-a',accepted:false,mode:'plan',busy:false,drawingLoading:false,drawingCurrent:true,buildReady:false,showPlacement:false,onRequestChanges(){},onDetails(){},onAccept:()=>{calls.push('accept');return new Promise(resolve=>{finish=resolve;});},onSwitchToBuild:async()=>{calls.push('mode');},onPrepare:async()=>{calls.push('prepare');},onPlacement(){}};
  const accept=button(h.render(props),'Accept this plan');accept.props.onClick();accept.props.onClick();assert.deepEqual(calls,['accept']);finish();await settle();
  for(const changes of [{drawingCurrent:false},{drawingLoading:true},{drawingError:'Unavailable'},{busy:true}]){const unavailable={...props,accepted:true,mode:'build',buildReady:true,...changes};const prepare=button(h.render(unavailable),'Prepare accepted plan');assert.equal(prepare.props.disabled,true);prepare.props.onClick();await settle();}
  assert.deepEqual(calls,['accept']);
});
