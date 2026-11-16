import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
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

test('actual resumed onboarding and profile editor submit editable fields without stored timestamps',async()=>{
 for(const component of ['AccountOnboarding','AccountProfileEditor']){
  const fixture=store(),stored=nextOnboardingProfile(valid,null,'2026-11-13T09:00:00Z');fixture.records.accountA.privateMetadata.datummOnboarding=stored;
  const initial=readOnboardingProfile(fixture.records.accountA.privateMetadata),bodies=[];let completed=0;
  const props=component==='AccountOnboarding'?{initial,onComplete(){completed++;}}:{profile:initial};
  const h=onboardingHarness(props,{component,effects:component==='AccountProfileEditor',fetch:async(_path,init)=>{
   if(init.method==='GET')return Response.json({profile:initial});
   const body=JSON.parse(init.body);bodies.push(body);return handleProfileRequest(request(body),fixture.dependencies());
  }});
  h.render();await new Promise(setImmediate);const tree=h.render();if(component==='AccountOnboarding')elements(tree).find(element=>element.type==='button'&&element.props.children==='Skip for now').props.onClick();else submit(tree);
  await new Promise(setImmediate);
  assert.deepEqual(Object.keys(bodies[0]).sort(),['domain','name','step','useCases']);
  assert.equal(fixture.records.accountA.privateMetadata.datummOnboarding.step,'complete');
  assert.ok(fixture.records.accountA.privateMetadata.datummOnboarding.completedAt);
  if(component==='AccountOnboarding')assert.equal(completed,1);
 }
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
function onboardingHarness(props,{component='AccountOnboarding',fetch,effects=false}={}) {
  const slots=[];
  const pending=[];
  let cursor=0,unmounted=false,updatesAfterUnmount=0;
  const hooks={...React,useEffect:(callback,deps)=>{
    if(!effects)return;
    const slot=cursor++,previous=slots[slot];
    if(previous&&deps.every((value,index)=>Object.is(value,previous.deps[index])))return;
    pending.push(()=>{previous?.cleanup?.();slots[slot]={deps,cleanup:callback()};});
  },useRef:initial=>{
    const slot=cursor++;return slots[slot]??=( {current:initial} );
  },useState:initial=>{
    const slot=cursor++;
    if(!(slot in slots))slots[slot]=typeof initial==='function'?initial():initial;
    return [slots[slot],next=>{if(unmounted)updatesAfterUnmount++;slots[slot]=typeof next==='function'?next(slots[slot]):next;}];
  }};
  const exports={};
  const source=readFileSync(new URL('../src/components/onboarding/account-onboarding.tsx',import.meta.url),'utf8');
  const context={exports,Error,AbortController,fetch,require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsxRuntime;
    if(name==='@/lib/onboarding-profile.mjs')return profileModule;
    if(name.endsWith('.module.css'))return {default:{}};
    if(name.endsWith('.json'))return {default:{}};
    return new Proxy({},{get:()=>()=>null});
  }};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText+`\nexports.testComponent = ${component};`,context);
  return {render(){cursor=0;const tree=exports.testComponent({accountControl:null,...props});pending.splice(0).forEach(run=>run());return tree;},unmount(){unmounted=true;slots.forEach(value=>value?.cleanup?.());},get updatesAfterUnmount(){return updatesAfterUnmount;}};
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

test('connector recheck clears an earlier online confirmation and coalesces duplicate clicks',async()=>{
  let resolve,reads=0;
  const harness=onboardingHarness({}, {component:'ConnectorStep',fetch:()=>{
    reads++;return new Promise(yes=>{resolve=yes;});
  }});
  const check=tree=>elements(tree).find(element=>element.type==='button').props.onClick();
  const hasOnline=tree=>elements(tree).some(element=>React.Children.toArray(element.props.children).includes('Device online'));
  const first=harness.render();
  check(first);check(first);
  assert.equal(reads,1,'One read starts even before React rerenders');
  resolve({ok:true,json:async()=>[{online:true}]});await new Promise(setImmediate);
  assert.equal(hasOnline(harness.render()),true);
  check(harness.render());
  const pending=harness.render();
  assert.equal(reads,2);
  assert.equal(hasOnline(pending),false,'The earlier observation cannot confirm the pending read');
  assert.equal(elements(pending).find(element=>element.type==='button').props.disabled,true);
  assert.equal(elements(pending).find(element=>element.props.role==='status').props.children,'Checking your Revit devices…');
  resolve({ok:false});await new Promise(setImmediate);
  const failed=harness.render();
  assert.equal(hasOnline(failed),false);
  assert.match(elements(failed).find(element=>element.props.role==='status').props.children,/unavailable.*Try again/);
  assert.equal(elements(failed).find(element=>element.type==='button').props.disabled,false);
  check(failed);
  resolve({ok:true,json:async()=>[{online:false}]});await new Promise(setImmediate);
  assert.match(elements(harness.render()).find(element=>element.props.role==='status').props.children,/No Revit device is online/);
});

test('connector checks ignore invalid device records before an actual online device',async()=>{
  const harness=onboardingHarness({}, {component:'ConnectorStep',fetch:async()=>({ok:true,json:async()=>[null,{},'invalid',{online:true}]})});
  elements(harness.render()).find(element=>element.type==='button').props.onClick();
  await new Promise(setImmediate);
  assert.match(elements(harness.render()).find(element=>element.props.role==='status').props.children,/A Revit device is online/);
});

const content=tree=>React.isValidElement(tree)?React.Children.toArray(tree.props.children).map(content).join(' '):typeof tree==='string'?tree:'';

test('completed profiles open normally; history compatibility offers real setup without inventing completion',async()=>{
  const completed=onboardingHarness({children:'Actual workspace'},{component:'AccountOnboardingGate',effects:true,fetch:async()=>Response.json({profile:{...valid,completedAt:'2026-11-12T09:00:00Z'}})});
  completed.render();await new Promise(setImmediate);
  assert.equal(completed.render(),'Actual workspace');
  const calls=[];
  const returning=onboardingHarness({children:'Actual saved workspace'},{component:'AccountOnboardingGate',effects:true,fetch:async(url,init)=>{calls.push([url,init]);return Response.json(url==='/api/account/profile'?{profile:null,name:'Returning architect'}:[{id:'saved-task'}]);}});
  returning.render();await new Promise(setImmediate);
  const recovery=returning.render();
  assert.match(content(recovery),/Account setup is unconfirmed/);
  assert.match(content(recovery),/Actual saved workspace/);
  assert.match(content(recovery),/hasn’t been marked complete/);
  elements(recovery).find(element=>element.type==='button').props.onClick();
  const setup=returning.render();
  assert.equal(setup.type.name,'AccountOnboarding');
  assert.equal(setup.props.initial.name,'Returning architect');
  assert.equal(setup.props.initial.step,'profile');
  assert.equal(calls.every(([,init])=>init.method===undefined||init.method==='GET'),true,'Compatibility admission does not save completion');
});

test('profile failure recovery retains the failure explanation and retries the actual profile gate',async()=>{
  let reads=0;
  const gate=onboardingHarness({children:'Authenticated workspace'},{component:'AccountOnboardingGate',effects:true,fetch:async()=>{reads++;if(reads===1)throw Error('Profile connection unavailable.');return Response.json({profile:{...valid,step:'use-cases'}});}});
  gate.render();await new Promise(setImmediate);
  const failed=gate.render();
  elements(failed).find(element=>element.type==='button'&&element.props.children==='Continue to workspace').props.onClick();
  const admitted=gate.render();
  assert.match(content(admitted),/Authenticated workspace/);
  assert.match(content(admitted),/Profile connection unavailable/);
  assert.match(content(admitted),/hasn’t been marked complete/);
  elements(admitted).find(element=>element.type==='button').props.onClick();
  gate.render();await new Promise(setImmediate);
  const resumed=gate.render();
  assert.equal(resumed.type.name,'AccountOnboarding');
  assert.equal(resumed.props.initial.step,'use-cases');
  assert.equal(reads,2);
});

test('profile editor keeps unsaved fields after a failed save',async()=>{
  const editor=onboardingHarness({}, {component:'AccountProfileEditor',effects:true,fetch:async(_url,init)=>{
    if(init.method==='GET')return Response.json({profile:{...valid,step:'complete'}});
    return new Response(JSON.stringify({detail:'Save unavailable.'}),{status:503,headers:{'Content-Type':'application/json'}});
  }});
  editor.render();await new Promise(setImmediate);
  let tree=editor.render();
  elements(tree).find(element=>element.props.id==='datumm-profile-name').props.onChange({target:{value:'Unsaved architect'}});
  tree=editor.render();submit(tree);await new Promise(setImmediate);
  tree=editor.render();
  assert.equal(elements(tree).find(element=>element.props.id==='datumm-profile-name').props.value,'Unsaved architect');
  assert.match(content(tree),/Save unavailable/);
  assert.match(content(tree),/Your entries are still here/);
});

test('history must be an authoritative array before choosing first-visit onboarding',async()=>{
  for (const history of [new Response('',{status:401}),new Response('',{status:503}),Response.json({runs:[]}),new Response('not json',{status:200})]) {
    let reads=0;
    const gate=onboardingHarness({children:'Saved workspace'},{component:'AccountOnboardingGate',effects:true,fetch:async(url)=>{
      if(url==='/api/account/profile')return Response.json({profile:null,name:'Architect'});
      reads++;return reads===1?history:Response.json([{id:'saved'}]);
    }});
    gate.render();await new Promise(setImmediate);
    const failed=gate.render();
    assert.match(content(failed),/saved work could not be checked/i);
    assert.notEqual(failed.type.name,'AccountOnboarding');
    elements(failed).find(element=>element.type==='button'&&element.props.children==='Continue to workspace').props.onClick();
    assert.match(content(gate.render()),/Setup hasn’t been marked complete/);
    elements(gate.render()).find(element=>element.type==='button').props.onClick();
    gate.render();await new Promise(setImmediate);
    assert.match(content(gate.render()),/Account setup is unconfirmed/);
    assert.equal(reads,2);
  }
  const first=onboardingHarness({children:'Workspace'},{component:'AccountOnboardingGate',effects:true,fetch:async(url)=>Response.json(url==='/api/account/profile'?{profile:null,name:'New architect'}:[])});
  first.render();await new Promise(setImmediate);
  assert.equal(first.render().type.name,'AccountOnboarding');
});

test('obsolete account profile and history responses are discarded even when a fetch ignores abort',async()=>{
  for(const pendingHistory of [false,true]) {
    let resolve;
    const gate=onboardingHarness({children:'Must stay closed'},{component:'AccountOnboardingGate',effects:true,fetch:async(url)=>{
      if(pendingHistory&&url==='/api/account/profile')return Response.json({profile:null});
      return new Promise(yes=>{resolve=yes;});
    }});
    gate.render();await new Promise(setImmediate);
    gate.unmount();
    resolve(Response.json(pendingHistory?[{id:'old-account-task'}]:{profile:{...valid,completedAt:'2026-11-12T09:00:00Z'}}));
    await new Promise(setImmediate);
    assert.equal(gate.updatesAfterUnmount,0);
  }
});

test('Back from a resumed interests step preserves Unicode profile fields and all interests',()=>{
  const initial={...valid,name:'میرا 李',step:'use-cases'};
  const harness=onboardingHarness({initial,onComplete(){},saveProfile:async()=>{throw Error('Back must not save');}});
  const current=harness.render();
  elements(current).find(element=>element.type==='button'&&content(element).includes('Back')).props.onClick();
  const previous=elements(harness.render());
  assert.equal(previous.find(element=>element.props.id==='datumm-profile-name').props.value,initial.name);
  assert.equal(previous.find(element=>element.props.id==='datumm-profile-domain').props.value,initial.domain);
});

test('the real interests caller preserves multiple controlled selections, false and error association',()=>{
  const props={value:{...valid,useCases:[]},error:'Choose at least one interest',onChange(value){props.value=value;}};
  const harness=onboardingHarness(props,{component:'UseCaseFields'});
  const options=()=>elements(harness.render()).filter(element=>element.props.variant==='card');
  assert.equal(options().length>2,true);
  assert.equal(options().every(element=>element.props.checked===false),true);
  assert.equal(options().every(element=>element.props['aria-describedby']==='datumm-interests-error'),true);
  options()[0].props.onChange({target:{checked:true}});
  options()[1].props.onChange({target:{checked:true}});
  assert.equal(props.value.useCases.length,2);
  options()[0].props.onChange({target:{checked:false}});
  assert.equal(props.value.useCases.length,1);
});

test('adopted checkbox has one native input and label; pending skeletons have one readable status',()=>{
  function vendor(file) {
    const exports={};
    runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/vendor/affectui/'+file+'-clean.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='react')return React;if(name==='react/jsx-runtime')return jsxRuntime;throw Error(name);}});
    return exports;
  }
  const {Checkbox}=vendor('checkbox');
  const {Loading,Skeleton}=vendor('skeleton');
  const input=renderToStaticMarkup(React.createElement(Checkbox,{variant:'card',label:'Drawing review',checked:false,onChange(){}}));
  assert.equal((input.match(/<input\b/g)??[]).length,1);
  assert.equal((input.match(/<label\b/g)??[]).length,1);
  assert.match(input,/type="checkbox"/);
  assert.doesNotMatch(input,/ checked=""/);
  const loading=renderToStaticMarkup(React.createElement(Loading,{label:'Opening your workspace…'},React.createElement(Skeleton,{width:180}),React.createElement('p',{},'Opening your workspace…')));
  assert.equal((loading.match(/role="status"/g)??[]).length,1);
  assert.match(loading,/aria-hidden="true"/);
  assert.match(loading,/aria-busy="true"/);
  assert.match(loading,/>Opening your workspace…<\/p>/);
});
