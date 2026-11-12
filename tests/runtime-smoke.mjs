const origin=new URL(process.argv[2]??'http://127.0.0.1:3000').origin;
const localOrigin=['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname);

// @lat: [[contracts#Hosted contract tests#Browser request boundaries]]
const checks=[
 ['studio',origin,{},200],
 ['config',origin+'/api/service/config',{},localOrigin?[401,503]:401],
 ['unsupported-project-route',origin+'/api/service/projects/canary/workspace',{},404],
 ['pricing',origin+'/pricing',{},200],
 ['profile-auth-gate',origin+'/api/account/profile',{},[401,503]],
 ['connect-invalid',origin+'/connect?request=invalid',{},200],
 ['connector-auth-gate',origin+'/api/service/device-authorizations/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',{},[401,503]],
 ['cross-origin-write',origin+'/api/chat',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({messages:[]})},403],
 ['missing-origin-write',origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[]})},403],
 ['unsupported-attachment',origin+'/api/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({messages:[],attachmentIds:['source-1']})},422]
];
if(process.argv.includes('--production'))checks.push(['development-fixture-blocked',origin+'/dev/ux',{},404]);
for(const [name,url,init,expected] of checks){
 const response=await fetch(url,init),body=await response.text();
 if(!(Array.isArray(expected)?expected:[expected]).includes(response.status))throw Error(name+' returned '+response.status);
 if(name==='studio'&&(!body.includes('desktop-workspace')&&!body.includes('Loading your DATUMM account...')||body.includes('aria-label="Window controls"')))throw Error('Studio account entry/layout mismatch');
 if(name==='pricing'){
  const text=body.replace(/<!--[\s\S]*?-->/g,'');
  if(!text.includes('Choose your plan')||!text.includes('$20')||!text.includes('$99')||!text.includes('Planned monthly price'))throw Error('Pricing plan content mismatch');
 }
 if(name==='connect-invalid'&&!body.includes('Start a new connection from Revit'))throw Error('Invalid connector request did not show recovery');
 console.log(name+': '+response.status);
}
