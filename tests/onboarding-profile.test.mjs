import test from 'node:test';
import assert from 'node:assert/strict';
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
