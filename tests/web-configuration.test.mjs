import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';

function load(path,imports={},globals={}) {
  const exports={};
  const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
    exports,URL,Response,AbortSignal,...globals,require(name){
      if(name==='server-only')return {};
      if(name==='react/jsx-runtime')return jsxRuntime;
      if(name in imports)return imports[name];
      if(name.endsWith('.css'))return {default:{}};
      if(name==='@fontsource-variable/inter')return {};
      throw Error('Unexpected import: '+name);
    },
  });
  return exports;
}
const configuration=load('src/lib/web-configuration.ts');
const {getWebConfiguration}=configuration;
const accountEnv={NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value',CLERK_SECRET_KEY:'server-test-value'};
const safe=value=>JSON.parse(JSON.stringify(value));

test('safe account configuration requires both nonblank keys and returns no values',()=>{
  for(const [env,reason] of [[{},'missing'],[{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'  ',CLERK_SECRET_KEY:'\n'},'missing'],[{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value'},'partial'],[{CLERK_SECRET_KEY:'server-test-value'},'partial'],[{...accountEnv,CLERK_SECRET_KEY:' '},'partial'],[accountEnv,'configured']]) {
    const result=safe(getWebConfiguration(env));
    assert.deepEqual(result.account,{configured:reason==='configured',reason});
    assert.deepEqual(result.service,{configured:false,reason:'missing'});
    assert.doesNotMatch(JSON.stringify(result),/public-test-value|server-test-value/);
  }
});

test('service configuration is separate and accepts only HTTPS root origins',()=>{
  for(const origin of [undefined,'',' \n '])assert.deepEqual(safe(getWebConfiguration({ORCHESTRATOR_URL:origin}).service),{configured:false,reason:'missing'});
  for(const origin of ['not a URL','http://service.example','https://user:pass@service.example','https://service.example/api','https://service.example/?q=x','https://service.example/#x','file:///tmp'])assert.deepEqual(safe(getWebConfiguration({ORCHESTRATOR_URL:origin}).service),{configured:false,reason:'invalid'},origin);
  for(const origin of ['https://service.example','https://service.example/','https://service.example:8443/']) {
    const result=safe(getWebConfiguration({ORCHESTRATOR_URL:origin}));
    assert.deepEqual(result.service,{configured:true,reason:'configured'});
    assert.equal(result.account.configured,false);
  }
  assert.equal(getWebConfiguration(accountEnv).account.configured,true);
});

test('all seven server callers consume the shared decision and clients never import the helper',()=>{
  for(const file of ['src/app/page.tsx','src/app/layout.tsx','src/proxy.ts','src/app/connect/page.tsx','src/app/admin/layout.tsx','src/lib/backend.ts','src/app/api/account/profile/route.ts']) {
    const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.match(source,/from ['"]@\/lib\/web-configuration['"]/);
    assert.match(source,/getWebConfiguration\(\)/);
    assert.doesNotMatch(source,/process\.env\.(NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY)/);
  }
  for(const file of ['src/components/workspace-entry.tsx','src/components/onboarding/account-onboarding.tsx','src/components/connections/device-authorization.tsx'])assert.doesNotMatch(readFileSync(new URL('../'+file,import.meta.url),'utf8'),/web-configuration|CLERK_SECRET_KEY/);
});

test('root and provider agree on partial configuration without mounting account hooks',()=>{
  for(const env of [{},{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value'},accountEnv]) {
    const imports={'@/lib/web-configuration':{getWebConfiguration:()=>getWebConfiguration(env)}};
    const Page=load('src/app/page.tsx',{'@/components/workspace-entry':{WorkspaceEntry:'entry'},...imports}).default;
    const Layout=load('src/app/layout.tsx',{'@clerk/nextjs':{ClerkProvider:'provider'},'@/components/admin/admin-draft-root':{AdminDraftRoot:'admin-root'},'@/components/host-provider':{HostProvider:'host-root'},'@/lib/appearance':{appearanceBootstrap:''},...imports}).default;
    assert.equal(Page().props.authConfigured,getWebConfiguration(env).account.configured);
    assert.equal(Layout({children:'content'}).type,getWebConfiguration(env).account.configured?'provider':'html');
  }
  const entry=load('src/components/workspace-entry.tsx',{'@clerk/nextjs':{useAuth(){throw Error('Clerk hook mounted');}},'@/lib/auth-gate.mjs':{},'./workspace':{Workspace(){throw Error('Workspace mounted');}},'./onboarding/account-onboarding':{}}).WorkspaceEntry({authConfigured:false,accountReason:'partial'});
  assert.equal(entry.props['data-account-configuration'],'unavailable');
});

test('admin draft root keys in-memory ownership to the loaded account',()=>{
  let auth={isLoaded:true,userId:'account-a'};
  const accountRef={current:null};
  const Root=load('src/components/admin/admin-draft-root.tsx',{'react':{useRef:()=>accountRef},'@clerk/nextjs':{useAuth:()=>auth},'./form':{AdminConfigProvider:'draft-provider'}}).AdminDraftRoot;
  const a=Root({children:'page'});assert.equal(a.key,'account-a');assert.equal(a.props.deferred,true);
  auth={isLoaded:false,userId:undefined};assert.equal(Root({children:'page'}).key,'account-a','Transient auth loading keeps the current owner inert');
  auth={isLoaded:true,userId:'account-a'};assert.equal(Root({children:'page'}).key,'account-a');
  auth={isLoaded:true,userId:'account-b'};assert.equal(Root({children:'page'}).key,'account-b');
  auth={isLoaded:true,userId:null};assert.equal(Root({children:'page'}).key,'signed-out');
  auth={isLoaded:false,userId:undefined};assert.equal(Root({children:'page'}).key,'signed-out');
  auth={isLoaded:true,userId:'account-a'};assert.equal(Root({children:'page'}).key,'account-a');
});

test('unconfigured backend/profile/admin return their original denials before account lookups',async()=>{
  for(const env of [{},{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value'},{CLERK_SECRET_KEY:'server-test-value'}]) {
    const unavailable=()=>{throw Error('Account lookup must not run');};
    const imports={'@/lib/web-configuration':{getWebConfiguration:()=>getWebConfiguration(env)},'@clerk/nextjs/server':{auth:unavailable,clerkClient:unavailable,currentUser:unavailable}};
    const backend=load('src/lib/backend.ts',imports).backend;
    assert.equal((await backend('/v2/tasks')).status,503);
    const profile=load('src/app/api/account/profile/route.ts',{'@/lib/onboarding-profile.mjs':{},...imports});
    const response=await profile.GET(new Request('https://web.example/api/account/profile'));
    assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'private, no-store');
    const Admin=load('src/app/admin/layout.tsx',{'next/navigation':{notFound(){throw Error('404');}},'@/components/admin/admin-shell':{},'@/lib/admin-access.mjs':{},...imports}).default;
    await assert.rejects(Admin({children:null}),/404/);
  }
});

test('configured backend still requires a token and validates fetch origin and path',async()=>{
  let fetches=0;
  const context={process:{env:{...accountEnv,ORCHESTRATOR_URL:'https://service.example/api'}},fetch:()=>{fetches++;throw Error('Unexpected fetch');}};
  const configured={'@/lib/web-configuration':{getWebConfiguration:()=>getWebConfiguration(accountEnv)}};
  const noToken=load('src/lib/backend.ts',{'@clerk/nextjs/server':{auth:async()=>({getToken:async()=>null})},...configured},context).backend;
  assert.equal((await noToken('/v2/tasks')).status,401);
  const backend=load('src/lib/backend.ts',{'@clerk/nextjs/server':{auth:async()=>({getToken:async()=>'token'})},...configured},context).backend;
  await assert.rejects(backend('/v2/tasks'),/Invalid hosted service origin/);
  context.process.env.ORCHESTRATOR_URL='https://service.example';
  await assert.rejects(backend('/unapproved'),/Invalid hosted service origin/);
  assert.equal(fetches,0);
});

test('proxy rejects cross-origin writes first, preserves public share and skips unavailable Clerk',async()=>{
  for(const env of [{},{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'public-test-value'},accountEnv]) {
    let calls=0;
    const proxy=load('src/proxy.ts',{'@/lib/web-configuration':{getWebConfiguration:()=>getWebConfiguration(env)},'@clerk/nextjs/server':{clerkMiddleware:()=>async()=>{calls++;return new Response();}},'next/server':{NextResponse:{json:Response.json,next:()=>new Response(null,{status:200})}}}).default;
    const request=(path,method='GET',origin)=>({method,nextUrl:new URL('https://web.example'+path),url:'https://web.example'+path,headers:new Headers({host:'web.example',...(origin?{origin}:{})})});
    assert.equal((await proxy(request('/api/agui','POST','https://other.example'),{})).status,403);
    assert.equal(calls,0);
    assert.equal((await proxy(request('/share/token'),{})).status,200);
    assert.equal(calls,0);
    await proxy(request('/'),{});
    assert.equal(calls,getWebConfiguration(env).account.configured?1:0);
  }
});
