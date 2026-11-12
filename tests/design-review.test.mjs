import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const code=compile('../src/components/design-review.tsx');
const workflow={};
runInNewContext(compile('../src/lib/workflow-state.ts'),{exports:workflow});
const candidate={fingerprint:'exact-reviewed-fingerprint',svg:'<svg/>',score:0,graph:{planId:'plan-1',version:3,site:{widthMm:12000,depthMm:9000},wallHeightMm:3000,wallThicknessMm:150,rooms:[{key:'room-1',name:'Studio',rect:[0,0,6000,6000]}],walls:[],openings:[{key:'door-1',kind:'door',widthMm:900,heightMm:2100},{key:'window-1',kind:'window',widthMm:1200,heightMm:1200}],assumptions:['Check site access']}};
const value={brief:{briefId:'brief-1',version:3},selected:null,candidates:[candidate],diagnostics:[]};
const reference={source:{id:'source-1',sha256:'source-hash',name:'Ground plan.pdf'},confirmed:false,stale:false,observations:[]};
const context={activeViewId:'view-1',views:[{id:'view-1',levelId:'level-1',name:'Ground floor'}],catalog:{documentId:'document-1',revision:'revision-8',levels:[{id:'level-1',name:'Ground floor'}],types:[{id:'wall-1',kind:'wall',name:'Wall',sizes:{widthMm:150}},{id:'floor-1',kind:'floor',name:'Floor',sizes:{thicknessMm:150}},{id:'door-type-1',kind:'door',name:'Door',placement:'OneLevelBasedHosted',sizes:{widthMm:900,heightMm:2100}},{id:'window-type-1',kind:'window',name:'Window',placement:'OneLevelBasedHosted',sizes:{widthMm:1200,heightMm:1200}}]}};
const draft={context,session:'session-1',view:'view-1',x:'4000',y:'5000',rotation:'90',door:'door-type-1',windowType:'window-type-1',wallType:'wall-1',floorType:'floor-1'};

// Exercise the real component handlers; effects and native/network children stay out of this local harness.
function harness(input={}) {
 const slots=[];let cursor=0;
 const hooks={...React,useEffect(){},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];}};
 const exports={};
 runInNewContext(code,{exports,Date,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;if(name==='@/lib/workflow-state')return workflow;if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,key)=>key})};return new Proxy({},{get:(_,key)=>Object.assign(()=>null,{displayName:key})});}});
 let props={taskId:'task-1',value,pending:false,sessions:[{id:'session-1',name:'Revit'}],mode:'build',model:'actual-model',onBuild:async()=>{},onAction:async()=>{},onReview:async()=>{},...input};
 return {render(next={}){props={...props,...next};cursor=0;return exports.DesignReview(props);}};
}
function elements(tree){if(!React.isValidElement(tree))return [];return [tree,...React.Children.toArray(tree.props.children).flatMap(elements)];}
function text(tree){if(typeof tree==='string'||typeof tree==='number')return String(tree);if(!React.isValidElement(tree))return '';return React.Children.toArray(tree.props.children).map(text).join('');}
const find=(tree,predicate)=>elements(tree).find(predicate);
const button=(tree,label)=>find(tree,e=>e.props.onClick&&text(e)===label);
const flush=()=>new Promise(setImmediate);
const plain=data=>JSON.parse(JSON.stringify(data));

test('design build captures the exact proposal once and blocks simultaneous review before rerender',async()=>{
 let fail;const actions=[],reviews=[];
 const h=harness({onAction:(action,input)=>{actions.push([action,input]);return new Promise((_,reject)=>{fail=reject;});},onReview:async input=>reviews.push(input)});
 const tree=h.render(),build=button(tree,'Approve plan & build in Revit');
 build.props.onClick();build.props.onClick();button(tree,'Generate geometry walkthrough').props.onClick();
 assert.equal(actions.length,1);assert.equal(reviews.length,0);
 assert.deepEqual(plain(actions[0]),['design_build',{fingerprint:candidate.fingerprint,sessionId:'session-1'}]);
 assert.equal(find(h.render(),e=>e.type==='fieldset').props.disabled,true);
 assert.equal(h.render().props['aria-busy'],true);
 fail(Error('Revit is busy'));await flush();
 assert.equal(find(h.render(),e=>e.type==='fieldset').props.disabled,false);
 const progress=find(h.render(),e=>e.type?.displayName==='NativeBuildProgress');
 assert.equal(progress.props.error,'Revit is busy');
 button(h.render(),'Approve plan & build in Revit').props.onClick();
 assert.equal(actions.length,2,'A failed attempt releases the duplicate guard for an explicit retry');
 fail(Error('Still busy'));await flush();
});

test('feedback is submitted once, locks editable controls, and preserves the note after failure',async()=>{
 let fail;const requests=[],actions=[];
 const h=harness({onReview:input=>{requests.push(input);return new Promise((_,reject)=>{fail=reject;});},onAction:async(...args)=>actions.push(args)});
 find(h.render(),e=>e.props['aria-label']==='Design feedback note').props.onChange({target:{value:'Preserve this façade note'}});
 const tree=h.render(),save=button(tree,'Save reference to composer');
 assert.equal(save.props.disabled,false);save.props.onClick();save.props.onClick();button(tree,'Approve plan & build in Revit').props.onClick();
 assert.equal(requests.length,1);assert.equal(actions.length,0);
 assert.deepEqual(plain(requests[0]),{action:'feedback',fingerprint:candidate.fingerprint,intent:'question',note:'Preserve this façade note',target:{kind:'element',key:'site'}});
 assert.equal(find(h.render(),e=>e.type==='fieldset').props.disabled,true);
 fail(Error('Feedback could not be saved'));await flush();
 assert.equal(find(h.render(),e=>e.props['aria-label']==='Design feedback note').props.value,'Preserve this façade note');
 assert.equal(text(find(h.render(),e=>e.props.role==='alert')),'Feedback could not be saved');
 assert.equal(find(h.render(),e=>e.type==='fieldset').props.disabled,false);
});

test('reference acceptance preserves source binding, confirmation, stale-source and revision gates',()=>{
 const h=harness({value:{...value,reference},source:reference.source});
 assert.equal(button(h.render(),'Approve plan & build in Revit').props.disabled,true);
 find(h.render(),e=>e.type==='input'&&e.props.type==='checkbox').props.onChange({target:{checked:true}});
 assert.equal(button(h.render(),'Approve plan & build in Revit').props.disabled,false);
 assert.equal(button(h.render(),'Accept this exact design').props.disabled,false);
 const mismatch=h.render({source:{...reference.source,sha256:'replacement-hash'}});
 assert.equal(button(mismatch,'Approve plan & build in Revit').props.disabled,true);
 assert.equal(button(mismatch,'Accept this exact design').props.disabled,true);
 assert.equal(find(mismatch,e=>e.type==='input'&&e.props.type==='checkbox').props.disabled,true);
 const stale=h.render({source:reference.source,value:{...value,reference:{...reference,stale:true}}});
 assert.equal(button(stale,'Approve plan & build in Revit').props.disabled,true);
 const revision=h.render({value:{...value,revisionRequested:true}});
 assert.equal(button(revision,'Approve plan & build in Revit').props.disabled,true);
 assert.equal(button(revision,'Accept this exact design').props.disabled,true);
});

test('reviewing an alternative changes the inspected fingerprint without granting acceptance or building',()=>{
 const inspected=[],actions=[];
 const other={...candidate,fingerprint:'second-fingerprint',graph:{...candidate.graph,version:4}};
 const h=harness({value:{...value,selected:candidate.fingerprint,candidates:[candidate,other]},onInspect:f=>inspected.push(f),onAction:async(...args)=>actions.push(args)});
 button(h.render(),'Alternative 2').props.onClick();
 button(h.render(),'Review plan').props.onClick();
 assert.deepEqual(inspected,['second-fingerprint','second-fingerprint']);assert.equal(actions.length,0);
 assert.ok(button(h.render(),'Approve plan & build in Revit'));
 assert.equal(button(h.render(),'Alternative 2').props['aria-pressed'],true);
});

test('preparation keeps exact measured placement, blocks duplicates, and preserves origin after stale context error',async()=>{
 let fail;const actions=[];
 const h=harness({value:{...value,selected:candidate.fingerprint},draft,onAction:(action,input)=>{actions.push([action,input]);return new Promise((_,reject)=>{fail=reject;});}});
 const prepare=button(h.render(),'Prepare exact native proposal');assert.equal(prepare.props.disabled,false);
 prepare.props.onClick();prepare.props.onClick();
 assert.equal(actions.length,1);
 assert.deepEqual(plain(actions[0]),['design_prepare',{fingerprint:candidate.fingerprint,placement:{schemaVersion:2,sessionId:'session-1',documentId:'document-1',revision:'revision-8',levelId:'level-1',viewId:'view-1',originXmm:4000,originYmm:5000,rotationDegrees:90}}]);
 assert.equal(find(h.render(),e=>e.type==='fieldset').props.disabled,true);
 fail(Error('PLACEMENT_CHANGED'));await flush();
 assert.equal(button(h.render(),'Prepare exact native proposal'),undefined,'The obsolete measured context is discarded');
 assert.match(text(find(h.render(),e=>e.props.role==='alert')),/Inspect placement & loaded types again/);
 // A successful re-inspection exposes the unchanged origin, rather than resetting user placement.
 const inspecting=button(h.render({onAction:async()=>context}),'Inspect placement & loaded types');await inspecting.props.onClick();
 assert.equal(find(h.render(),e=>e.props['aria-label']==='Design origin X').props.value,'4000');
 assert.equal(find(h.render(),e=>e.props['aria-label']==='Design origin Y').props.value,'5000');
 assert.equal(find(h.render(),e=>e.props['aria-label']==='Design rotation').props.value,'90');
});

test('pending turn and unavailable native controls keep their separate authority gates',async()=>{
 const calls=[];const h=harness({pending:true,onAction:async(...args)=>calls.push(args),onReview:async(...args)=>calls.push(args)});
 const tree=h.render();assert.equal(find(tree,e=>e.type==='fieldset').props.disabled,true);
 button(tree,'Approve plan & build in Revit').props.onClick();button(tree,'Generate geometry walkthrough').props.onClick();await flush();assert.equal(calls.length,0);
 const unavailable=h.render({pending:false,nativeControlsAvailable:false});
 assert.equal(button(unavailable,'Approve plan & build in Revit').props.disabled,true);
 assert.equal(button(unavailable,'Accept this exact design').props.disabled,true);
 assert.equal(button(unavailable,'Review plan').props.disabled,undefined,'Read-only plan inspection remains available');
});

test('layout acceptance keeps its exact source confirmation payload and never calls the build action',async()=>{
 const actions=[];
 const h=harness({value:{...value,reference},source:reference.source,onAction:async(action,input)=>actions.push([action,input])});
 find(h.render(),e=>e.type==='input'&&e.props.type==='checkbox').props.onChange({target:{checked:true}});
 button(h.render(),'Accept this exact design').props.onClick();await flush();
 assert.deepEqual(plain(actions),[['design_select',{planId:'plan-1',version:3,fingerprint:candidate.fingerprint,referenceConfirmation:{sourceId:'source-1',sha256:'source-hash',widthMm:12000,depthMm:9000}}]]);
 assert.equal(h.render().props['aria-label'],'Validated design preview');
 const accepted=h.render({value:{...value,selected:candidate.fingerprint}});
 assert.equal(button(accepted,'Accepted design').props.disabled,true);
 assert.equal(find(accepted,e=>e.props['aria-label']==='Accepted design placement').props.tabIndex,-1);
});
