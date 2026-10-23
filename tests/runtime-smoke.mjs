const origin=new URL(process.argv[2]??'http://127.0.0.1:3000').origin;
const localOrigin=['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname);

// @lat: [[contracts#Hosted contract tests#Browser request boundaries]]
const checks=[
 ['studio',origin,{},200],
 ['config',origin+'/api/service/config',{},localOrigin?[401,503]:401],
 ['unsupported-project-route',origin+'/api/service/projects',{},404],
 ['cross-origin-write',origin+'/api/chat',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({messages:[]})},403],
 ['missing-origin-write',origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[]})},403],
 ['unsupported-attachment',origin+'/api/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({messages:[],attachmentIds:['source-1']})},422]
];
for(const [name,url,init,expected] of checks){
 const response=await fetch(url,init),body=await response.text();
 if(!(Array.isArray(expected)?expected:[expected]).includes(response.status))throw Error(name+' returned '+response.status);
 if(name==='studio'&&(!body.includes('desktop-workspace')||body.includes('aria-label="Window controls"')))throw Error('Studio browser layout mismatch');
 console.log(name+': '+response.status);
}
