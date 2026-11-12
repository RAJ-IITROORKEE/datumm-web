import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as profileModule from '../src/lib/onboarding-profile.mjs';
import {validateProfileInput,readOnboardingProfile,nextOnboardingProfile,handleProfileRequest} from '../src/lib/onboarding-profile.mjs';

const valid={name:'  Priya Rao  ',domain:'architecture',useCases:['floor-plans','drawing-review'],step:'connector'};
const request=(body,origin='https://datumm.example')=>new Request('https://datumm.example/api/account/profile',{method:'PUT',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
function store() {
  const records={accountA:{firstName:'Priya',privateMetadata:{adminData:{keep:true}}},accountB:{firstName:'Mira',privateMetadata:{}}};
  const calls=[];
  return {records,calls,dependencies(userId='accountA'){return {userId,loadUser:async id=>{calls.push(['read',id]);return records[id];},saveMetadata:async(id,value)=>{calls.push(['write',id]);records[id].privateMetadata={...records[id].privateMetadata,...value.privateMetadata};}};}};
}

test('profile validation normalizes values and bounds required fields',()=>{
  assert.equal(validateProfileInput(valid).name,'Priya Rao');
  assert.deepEqual(validateProfileInput({...valid,useCases:['other','other']}).useCases,['other']);
  assert.doesNotThrow(()=>validateProfileInput({name:'',domain:'',useCases:[],step:'profile'}));
  for(const fields of [{name:''},{name:'x'.repeat(101)},{name:'A\nB'},{domain:'admin'},{useCases:[]},{useCases:['unknown']},{step:'unexpected'},{userId:'accountB'},{role:'admin'},{completedAt:'forged'}]) assert.throws(()=>validateProfileInput({...valid,...fields}));
});

test('resume and completion remain durable across later profile edits',()=>{
  const pending=nextOnboardingProfile(valid,null,'2026-11-12T09:00:00Z');
  assert.equal(readOnboardingProfile({datummOnboarding:pending}).step,'connector');
  assert.equal(pending.completedAt,null);
  const completed=nextOnboardingProfile({...valid,step:'complete'},pending,'2026-11-12T09:01:00Z');
  const edited=nextOnboardingProfile({...valid,name:'New Name',step:'use-cases'},completed,'2026-11-12T09:02:00Z');
  assert.equal(edited.completedAt,completed.completedAt);
  assert.equal(edited.step,'complete');
  assert.throws(()=>nextOnboardingProfile({name:'',domain:'',useCases:[],step:'profile'},completed));
  assert.equal(readOnboardingProfile({datummOnboarding:{...completed,version:99}}),null);
  assert.equal(readOnboardingProfile({datummOnboarding:{...completed,useCases:['bad']}}),null);
});

test('unauthenticated and cross-origin mutations never reach the account store',async()=>{
  const fixture=store();
  assert.equal((await handleProfileRequest(request(valid),fixture.dependencies(null))).status,401);
  assert.equal((await handleProfileRequest(request(valid,'https://evil.example'),fixture.dependencies())).status,403);
  assert.equal((await handleProfileRequest(request(valid,''),fixture.dependencies())).status,403);
  assert.deepEqual(fixture.calls,[]);
});

test('server-authenticated account owns reads and writes; other account and metadata stay intact',async()=>{
  const fixture=store();
  const spoof=await handleProfileRequest(request({...valid,userId:'accountB'}),fixture.dependencies());
  assert.equal(spoof.status,400);
  assert.deepEqual(fixture.calls,[]);
  const saved=await handleProfileRequest(request({...valid,step:'complete'}),fixture.dependencies());
  assert.equal(saved.status,200);
  assert.equal(saved.headers.get('cache-control'),'private, no-store');
  assert.deepEqual(fixture.calls,[['read','accountA'],['write','accountA']]);
  assert.deepEqual(fixture.records.accountA.privateMetadata.adminData,{keep:true});
  assert.deepEqual(fixture.records.accountB.privateMetadata,{});
  const other=await handleProfileRequest(new Request('https://datumm.example/api/account/profile'),fixture.dependencies('accountB'));
  assert.equal((await other.json()).profile,null);
  const own=await handleProfileRequest(new Request('https://datumm.example/api/account/profile'),fixture.dependencies());
  assert.equal((await own.json()).profile.name,'Priya Rao');
});

test('invalid, oversized and failed saves return recoverable errors without invented completion',async()=>{
  const fixture=store();
  const oversized=new Request('https://datumm.example/api/account/profile',{method:'PUT',headers:{origin:'https://datumm.example','content-type':'application/json'},body:' '.repeat(4097)});
  assert.equal((await handleProfileRequest(oversized,fixture.dependencies())).status,413);
  assert.equal((await handleProfileRequest(request({...valid,useCases:[]}),fixture.dependencies())).status,400);
  const failed=await handleProfileRequest(request(valid),{userId:'accountA',loadUser:async()=>{throw Error('secret backend failure');},saveMetadata:async()=>{throw Error('must not save');}});
  assert.equal(failed.status,503);
  assert.doesNotMatch(JSON.stringify(await failed.json()),/secret backend/);
  assert.deepEqual(fixture.calls,[]);
});

// Exercise the actual component handlers with persistent hook state; no DOM or live account is needed.
function onboardingHarness(props) {
  const slots=[];
  let cursor=0;
  const hooks={...React,useEffect:()=>{},useRef:initial=>{
    const slot=cursor++;return slots[slot]??=( {current:initial} );
  },useState:initial=>{
    const slot=cursor++;
    if(!(slot in slots))slots[slot]=typeof initial==='function'?initial():initial;
    return [slots[slot],next=>{slots[slot]=typeof next==='function'?next(slots[slot]):next;}];
  }};
  const exports={};
  const source=readFileSync(new URL('../src/components/onboarding/account-onboarding.tsx',import.meta.url),'utf8');
  const context={exports,Error,require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsxRuntime;
    if(name==='@/lib/onboarding-profile.mjs')return profileModule;
    if(name.endsWith('.module.css'))return {default:{}};
    if(name.endsWith('.json'))return {default:{}};
    return new Proxy({},{get:()=>()=>null});
  }};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,context);
  return {render(){cursor=0;return exports.AccountOnboarding({accountControl:null,...props});}};
}
function elements(tree) {
  if(!React.isValidElement(tree))return [];
  if(typeof tree.type==='function'&&['ProfileFields','UseCaseFields'].includes(tree.type.name))return elements(tree.type(tree.props));
  return [tree,...React.Children.toArray(tree.props.children).flatMap(elements)];
}
const submit=tree=>elements(tree).find(element=>element.type==='form').props.onSubmit({preventDefault(){}});

test('onboarding explains invalid profile and required interests without writing progress',()=>{
  let writes=0;
  const profile=onboardingHarness({initial:{name:'  ',domain:'',useCases:[],step:'profile'},onComplete(){},saveProfile:async()=>{writes++;}});
  submit(profile.render());
  const profileElements=elements(profile.render());
  const name=profileElements.find(element=>element.props.id==='datumm-profile-name');
  assert.equal(name.props['aria-invalid'],true);
  assert.equal(name.props['aria-describedby'],'datumm-name-error');
  assert.equal(profileElements.some(element=>element.props.id==='datumm-domain-error'),true);
  const interests=onboardingHarness({initial:{...valid,useCases:[],step:'use-cases'},onComplete(){},saveProfile:async()=>{writes++;}});
  submit(interests.render());
  const group=elements(interests.render()).find(element=>element.props.role==='group');
  assert.equal(group.props['aria-invalid'],true);
  assert.match(group.props['aria-describedby'],/datumm-interests-error/);
  assert.equal(group.props.tabIndex,-1);
  assert.equal(writes,0);
});

test('onboarding prevents duplicate saves before rerender and retains Unicode edits after failure',async()=>{
  let resolve,reject,writes=0;
  const inputs=[];
  const initial={...valid,name:'میرا‌ احمد 李 🏛️',step:'profile'};
  const harness=onboardingHarness({initial,onComplete(){},saveProfile:input=>{
    writes++;inputs.push(input);return new Promise((yes,no)=>{resolve=yes;reject=no;});
  }});
  const before=harness.render();
  submit(before);submit(before);
  assert.equal(writes,1,'A synchronous guard prevents a second request before React rerenders');
  const pending=elements(harness.render());
  assert.equal(pending.find(element=>element.type==='fieldset').props.disabled,true);
  assert.equal(pending.find(element=>element.props.type==='submit').props.disabled,true);
  reject(Error('Connection unavailable.'));
  await new Promise(setImmediate);
  const failed=elements(harness.render());
  assert.equal(failed.find(element=>element.props.id==='datumm-profile-name').props.value,initial.name);
  assert.equal(failed.find(element=>element.props.role==='alert').props.children.join(' ').includes('Your entries are still here'),true);
  submit(harness.render());
  assert.equal(writes,2);
  assert.equal(inputs[1].name,initial.name);
  assert.equal(inputs[1].step,'use-cases');
  resolve({});
  await new Promise(setImmediate);
  assert.equal(elements(harness.render()).some(element=>element.props.role==='group'),true,'Only an acknowledged save advances the step');
});

test('Skip and Open workspace share one pending completion and disable Back',async()=>{
  let resolve,writes=0,completed=0;
  const harness=onboardingHarness({initial:{...valid,step:'connector'},onComplete(){completed++;},saveProfile:()=>{
    writes++;return new Promise(yes=>{resolve=yes;});
  }});
  const initial=elements(harness.render());
  initial.find(element=>element.type==='button'&&element.props.children==='Skip for now').props.onClick();
  submit(harness.render());
  assert.equal(writes,1);
  assert.equal(completed,0);
  assert.equal(elements(harness.render()).filter(element=>element.type==='button').every(element=>element.props.disabled),true);
  resolve({});await new Promise(setImmediate);
  assert.equal(completed,1);
});
