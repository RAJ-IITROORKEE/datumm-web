const origin=new URL(process.argv[2]??'http://127.0.0.1:3000').origin;
const localOrigin=['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname);

const projectSources=origin+'/api/service/projects/00000000-0000-4000-8000-000000000001/sources';

// @lat: [[contracts#Hosted contract tests#Browser request boundaries]]
const checks=[
 ['studio',origin,{},200],
 ['config',origin+'/api/service/config',{},localOrigin?[401,503]:401],
 ['unsupported-project-route',origin+'/api/service/projects/canary/workspace',{},404],
 ['project-source-list-auth',projectSources,{},localOrigin?[401,503]:401],
 ['project-source-write-origin',projectSources,{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'},403],
 ['project-source-write-auth',projectSources,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'},localOrigin?[401,503]:401],
 ['pricing',origin+'/pricing',{},200],
 ['admin-entry-gate',origin+'/admin',{},404],
 ['admin-config-auth-gate',origin+'/api/service/admin/config',{},localOrigin?[401,503]:401],
 ['profile-auth-gate',origin+'/api/account/profile',{},[401,503]],
 ['connect-invalid',origin+'/connect?request=invalid',{},200],
 ['connector-auth-gate',origin+'/api/service/device-authorizations/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',{},[401,503]],
 ['agui-cross-origin-write',origin+'/api/agui',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'},403],
 ['agui-missing-origin-write',origin+'/api/agui',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},403],
 ['agui-replay-cross-origin-write',origin+'/api/dev/agui-replay',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'},403],
 ['agui-replay-missing-origin-write',origin+'/api/dev/agui-replay',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'},403],
 ['agui-auth-gate',origin+'/api/agui',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({threadId:'runtime-thread',runId:'runtime-run',messages:[{id:'message',role:'user',content:'Runtime authentication boundary check'}],tools:[],context:[],forwardedProps:{idempotencyKey:'runtime-auth-check',expectedTaskVersion:0,expectedPlanVersion:0,mode:'ask'}})},[401,503]],
 ['agui-resume-auth-gate',origin+'/api/agui',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({threadId:'runtime-task',runId:'runtime-resume',messages:[],tools:[],context:[],resume:[{interruptId:'question:1',status:'resolved',payload:{questionId:'question',questionVersion:1,answer:'Metric'}}],forwardedProps:{taskId:'runtime-task',idempotencyKey:'runtime-resume-auth',expectedTaskVersion:1,expectedPlanVersion:0}})},[401,503]]
];
if(process.argv.includes('--production'))checks.push(
 ['development-fixture-blocked',origin+'/dev/ux',{},404],
 ['work-area-fixture-blocked',origin+'/dev/ux?surface=work-area',{},404],
 ['chat-composition-fixture-blocked',origin+'/dev/chat-composition',{},404],
 ['agui-replay-production-blocked',origin+'/api/dev/agui-replay',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'},404],
);
for(const [name,url,init,expected] of checks){
 const response=await fetch(url,init),body=await response.text();
 if(!(Array.isArray(expected)?expected:[expected]).includes(response.status))throw Error(name+' returned '+response.status);
 if(name==='studio'){
  const unavailable=body.includes('data-account-configuration="unavailable"')&&body.includes('Account sign-in is unavailable');
  const configured=body.includes('desktop-workspace')||body.includes('Loading your DATUMM account...')||body.includes('A workspace for your next idea.')||body.includes('Opening your workspace…')||body.includes('Let’s make this your workspace.');
  if((!unavailable&&!configured)||body.includes('aria-label="Window controls"'))throw Error('Studio account entry/layout mismatch');
 }
 if(name==='pricing'){
  const text=body.replace(/<!--[\s\S]*?-->/g,'');
  if(!text.includes('Choose your plan')||!text.includes('$20')||!text.includes('$99')||!text.includes('Planned monthly price'))throw Error('Pricing plan content mismatch');
 }
 if(name==='connect-invalid'&&!body.includes('Start a new connection from Revit'))throw Error('Invalid connector request did not show recovery');
 console.log(name+': '+response.status);
}
