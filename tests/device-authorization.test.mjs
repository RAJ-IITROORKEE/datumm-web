import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as authorizationModule from '../src/lib/device-authorization.mjs';
import {authorizationGate,authorizationRequest,authorizationReturnUrl,reviewAuthorization,approveAuthorization} from '../src/lib/device-authorization.mjs';

const id='A'.repeat(42)+'_';
const json=(body,status=200)=>Response.json(body,{status});

test('actual connect page uses the shared account decision and invalid request recovery precedes it',async()=>{
  function load(file,imports) {
    const exports={};
    runInNewContext(ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,URL,require(name){
      if(name==='react/jsx-runtime')return jsxRuntime;
      if(name in imports)return imports[name];
      if(name.endsWith('.css'))return {default:{}};
      if(name==='server-only')return {};
      throw Error('Unexpected import: '+name);
    }});
    return exports;
  }
  const {getWebConfiguration}=load('src/lib/web-configuration.ts',{});
  let hooks=0,requests=0;
  const fail=()=>{hooks++;throw Error('Clerk hooks must not mount');};
  const {DeviceAuthorization}=load('src/components/connections/device-authorization.tsx',{'react':{},'@clerk/nextjs':{useAuth:fail,useUser:fail},'lucide-react':{},'@/lib/device-authorization.mjs':{...authorizationModule,reviewAuthorization(){requests++;},approveAuthorization(){requests++;}}});
  for(const env of [{},{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value'},{CLERK_SECRET_KEY:'server-test-value'},{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value',CLERK_SECRET_KEY:'server-test-value'}]) {
    const Page=load('src/app/connect/page.tsx',{'@/components/connections/device-authorization':{DeviceAuthorization},'@/lib/device-authorization.mjs':authorizationModule,'@/lib/web-configuration':{getWebConfiguration:()=>getWebConfiguration(env)}}).default;
    const invalid=await Page({searchParams:Promise.resolve({request:'invalid'})});
    const body=renderToStaticMarkup(invalid);
    assert.match(body,/Start a new connection from Revit/);
    assert.doesNotMatch(body,/Account sign-in is unavailable/);
    if(!getWebConfiguration(env).account.configured) {
      const valid=await Page({searchParams:Promise.resolve({request:'A'.repeat(32)})});
      assert.equal(valid.props.request,'A'.repeat(32));
      assert.equal(valid.props.authConfigured,false);
      assert.match(renderToStaticMarkup(valid),/Account sign-in is unavailable/);
    }
  }
  assert.equal(hooks,0);assert.equal(requests,0);
});

test('authorization accepts only one bounded URL-safe request and a local return path',()=>{
  assert.equal(authorizationRequest(id),id);
  for(const value of [null,undefined,'',[],[id,id],'../devices','x'.repeat(129),'x'.repeat(31),`${id}/approve`,`${id}?next=https://example.com`,`${id}\n`]) assert.equal(authorizationRequest(value),null);
  assert.equal(authorizationReturnUrl(id),`/connect?request=${id}`);
  assert.equal(authorizationReturnUrl('//example.com'),'/connect');
});

test('authorization requires a configured, loaded, signed-in account',()=>{
  assert.equal(authorizationGate(false,true,'user'),'unconfigured');
  assert.equal(authorizationGate(true,false,'user'),'loading');
  assert.equal(authorizationGate(true,true,null),'signed-out');
  assert.equal(authorizationGate(true,true,'user'),'signed-in');
});

test('review is a same-origin GET and never approves or claims a connector token',async()=>{
  const calls=[];
  const fetcher=async(url,init)=>{calls.push({url,init});return json({name:'Studio Revit',approved:false});};
  assert.deepEqual(await reviewAuthorization(id,{fetcher}),{status:'ready',name:'Studio Revit'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,`/api/service/device-authorizations/${id}`);
  assert.equal(calls[0].init.method,'GET');
  assert.equal(calls[0].init.credentials,'same-origin');
  assert.equal(calls[0].init.redirect,'error');
  assert.equal(calls[0].init.body,undefined);
  assert.deepEqual(await reviewAuthorization(id,{fetcher:async()=>json({name:'Studio Revit',approved:true})}),{status:'already-approved',name:'Studio Revit'});
});

test('approval makes one bodyless same-origin POST and requires an affirmative response',async()=>{
  const calls=[];
  assert.deepEqual(await approveAuthorization(id,{fetcher:async(url,init)=>{calls.push({url,init});return json({approved:true});}}),{status:'approved'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,`/api/service/device-authorizations/${id}/approve`);
  assert.equal(calls[0].init.method,'POST');
  assert.equal(calls[0].init.credentials,'same-origin');
  assert.equal(calls[0].init.body,undefined);
  assert.deepEqual(await approveAuthorization(id,{fetcher:async()=>json({approved:false})}),{status:'unavailable'});
});

test('expiry, conflict, expired session and service failures remain distinct',async()=>{
  for(const operation of [reviewAuthorization,approveAuthorization]) {
    for(const [code,status] of [[401,'signed-out'],[404,'expired'],[409,'conflict'],[403,'unavailable'],[503,'unavailable']]) {
      assert.deepEqual(await operation(id,{fetcher:async()=>json({detail:'raw upstream detail'},code)}),{status});
    }
    assert.deepEqual(await operation(id,{fetcher:async()=>{throw Error('offline');}}),{status:'unavailable'});
  }
});

test('invalid requests never reach the service; malformed successful responses do not grant access',async()=>{
  let calls=0;
  const fetcher=async()=>{calls++;return json({approved:true});};
  assert.deepEqual(await reviewAuthorization('../devices',{fetcher}),{status:'invalid'});
  assert.deepEqual(await approveAuthorization([id,id],{fetcher}),{status:'invalid'});
  assert.equal(calls,0);
  for(const data of [{name:'Studio',approved:'true'},{name:'',approved:false},{name:'x'.repeat(81),approved:false},{name:'Studio\nInjected',approved:false},null]) {
    assert.deepEqual(await reviewAuthorization(id,{fetcher:async()=>json(data)}),{status:'unavailable'});
  }
  assert.deepEqual(await reviewAuthorization(id,{fetcher:async()=>new Response('<html>error</html>')}),{status:'unavailable'});
});

test('a cancelled account/request view can discard its pending result',async()=>{
  const controller=new AbortController();
  const failure=new DOMException('Aborted','AbortError');
  controller.abort();
  await assert.rejects(reviewAuthorization(id,{signal:controller.signal,fetcher:async(_url,init)=>{
    assert.equal(init.signal,controller.signal);throw failure;
  }}),{name:'AbortError'});
});
