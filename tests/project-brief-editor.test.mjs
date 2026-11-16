import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';

function harness(){
 let slots=[],cursor=0,effects=[],requests=[];
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots)) slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,index)=>!Object.is(value,old.deps[index]))){effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}}};
 const out={},code=ts.transpileModule(readFileSync(new URL('../src/components/project-brief-editor.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports:out,TextEncoder,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.module.css'))return {default:{}};throw Error(name);},fetch:(url,init)=>new Promise(resolve=>requests.push({url,init,resolve})),crypto:{randomUUID:()=> 'new-id'}});
 return {requests,render(account='account-a',project='project-a',open=true){cursor=0;const value=out.useProjectBriefEditor(account,project,open);const pending=effects;effects=[];pending.forEach(fn=>fn());return value;}};
}
const brief=(projectId='project-a',revision=0,entries=[])=>({projectId,revision,entries,history:[],updatedAt:null});
const reply=(request,value,status=200)=>request.resolve({ok:status>=200&&status<300,status,json:async()=>value});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const entry={id:'entry-a',label:'Footprint',value:'10 × 8 m',status:'proposed',source:{kind:'user'}};

test('draft survives dialog reopening and a changed revision requires explicit discard',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();
 let editor=h.render();editor.edit([{...entry,value:'11 × 8 m'}]);editor=h.render();assert.equal(editor.state.entries[0].value,'11 × 8 m');
 h.render('account-a','project-a',false);h.render();reply(h.requests[1],brief('project-a',2,[entry]));await tick();editor=h.render();
 assert.equal(editor.state.phase,'conflict');assert.equal(editor.state.entries[0].value,'11 × 8 m');
 editor.reload();reply(h.requests[2],brief('project-a',2,[entry]));await tick();editor=h.render();assert.equal(editor.state.phase,'ready');assert.equal(editor.state.entries[0].value,'10 × 8 m');
});

test('account and project switches reject delayed responses and do not expose prior drafts',async()=>{
 const h=harness();h.render();h.render('account-b','project-b');reply(h.requests[0],brief('project-a',1,[entry]));await tick();
 let editor=h.render('account-b','project-b');assert.equal(editor.state.entries.length,0);
 reply(h.requests[1],brief('project-b',0,[]));await tick();editor=h.render('account-b','project-b');assert.equal(editor.state.base.projectId,'project-b');
});

test('revision-bound save preserves draft on conflict and submits full archived snapshot',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();let editor=h.render();
 editor.edit([{...entry,archived:true}]);editor=h.render();const saving=editor.save();
 const request=h.requests[1],body=JSON.parse(request.init.body);assert.equal(body.expectedRevision,1);assert.equal(body.entries[0].archived,true);
 reply(request,{},409);await saving;editor=h.render();assert.equal(editor.state.phase,'conflict');assert.equal(editor.state.entries[0].archived,true);
});


test('use in chat includes only saved active entries and stale controls cannot act',()=>{
 let ref,feedback='';const hooks={...React,useRef(initial){return ref??={current:initial};},useState(){return [feedback,value=>{feedback=value;}];}};const out={};
 const code=ts.transpileModule(readFileSync(new URL('../src/components/project-brief-editor.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports:out,TextEncoder,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.module.css'))return {default:{}};throw Error(name);}});
 const flatten=node=>Array.isArray(node)?node.flatMap(flatten):node&&typeof node==='object'?[node,...flatten(node.props?.children)]:[];
 const active={...entry,source:{kind:'task',taskId:'task-1',taskTitle:'Study',note:'Request'}};
 const archived={...entry,id:'old',label:'Old value',archived:true};
 const base=brief('project-a',4,[active,archived]);let calls=[];
 const editor={available:true,state:{key:'a',phase:'ready',base,entries:base.entries,message:''},edit(){},save(){},reload(){},retry(){}};
 const props={editor,projectId:'project-a',task:null,onUseBrief:value=>calls.push(value),useBlocked:false};
 let tree=out.ProjectBriefEditor(props);let use=flatten(tree).find(node=>node.type==='button'&&node.props.children==='Use in chat');
 assert.equal(use.props.disabled,false);use.props.onClick();assert.match(calls[0],/revision 4/);assert.match(calls[0],/proposed entries need confirmation/);assert.match(calls[0],/Study/);assert.match(calls[0],/task-1/);assert.doesNotMatch(calls[0],/Old value/);
 out.ProjectBriefEditor({...props,useBlocked:true});use.props.onClick();assert.equal(calls.length,1);
 tree=out.ProjectBriefEditor({...props,onUseBrief:()=> 'Draft too long'});use=flatten(tree).find(node=>node.type==='button'&&node.props.children==='Use in chat');use.props.onClick();tree=out.ProjectBriefEditor({...props,onUseBrief:()=> 'Draft too long'});assert.ok(flatten(tree).some(node=>node.props?.role==='status'&&node.props.children==='Draft too long'));
 tree=out.ProjectBriefEditor({...props,editor:{...editor,state:{...editor.state,entries:[{...active,value:'unsaved'},archived]}}});use=flatten(tree).find(node=>node.type==='button'&&node.props.children==='Use in chat');assert.equal(use.props.disabled,true);use.props.onClick();assert.equal(calls.length,1);
});

test('closing and reopening during a save does not invalidate its receipt or start another request',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();let editor=h.render();
 const edited={...entry,value:'11 × 8 m'};editor.edit([edited]);editor=h.render();const saving=editor.save();h.render();
 h.render('account-a','project-a',false);h.render();assert.equal(h.requests.length,2);
 reply(h.requests[1],brief('project-a',2,[edited]));await saving;editor=h.render();assert.equal(editor.state.phase,'ready');assert.equal(editor.state.base.revision,2);assert.equal(editor.state.entries[0].value,'11 × 8 m');
});

test('project drafts survive A to B to A but account switches clear them',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();let editor=h.render();editor.edit([{...entry,value:'Draft A'}]);h.render();
 h.render('account-a','project-b');reply(h.requests[1],brief('project-b',0,[]));await tick();h.render('account-a','project-b');
 editor=h.render('account-a','project-a');assert.equal(editor.state.entries[0].value,'Draft A');reply(h.requests[2],brief('project-a',1,[entry]));await tick();editor=h.render();assert.equal(editor.state.entries[0].value,'Draft A');
 h.render('account-b','project-a');reply(h.requests[3],brief('project-a',0,[]));await tick();h.render('account-b','project-a');
 editor=h.render('account-a','project-a');assert.equal(editor.state.entries.length,0);
});

test('synchronous save lock rejects duplicate clicks before rerender',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();let editor=h.render();editor.edit([{...entry,value:'Changed'}]);editor=h.render();
 const first=editor.save();await editor.save();assert.equal(h.requests.length,2);reply(h.requests[1],brief('project-a',2,[{...entry,value:'Changed'}]));await first;
 editor=h.render();assert.equal(editor.state.base.revision,2);
});

test('save completing after project switches preserves draft and requires a fresh read',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();let editor=h.render();editor.edit([{...entry,value:'Changed'}]);editor=h.render();const pending=editor.save();h.render();
 h.render('account-a','project-b');reply(h.requests[2],brief('project-b',0,[]));await tick();h.render('account-a','project-b');
 editor=h.render('account-a','project-a');assert.equal(editor.state.phase,'saving');assert.equal(h.requests.length,3);
 reply(h.requests[1],brief('project-a',2,[{...entry,value:'Changed'}]));await pending;editor=h.render();assert.equal(editor.state.phase,'error');assert.equal(editor.state.entries[0].value,'Changed');assert.match(editor.state.message,/could not be confirmed/i);
 editor.retry();reply(h.requests[3],brief('project-a',2,[{...entry,value:'Changed'}]));await tick();editor=h.render();assert.equal(editor.state.phase,'conflict');
});

test('old account-epoch controls cannot save after account A to B to A',async()=>{
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[entry]));await tick();let old=h.render();old.edit([{...entry,value:'old draft'}]);old=h.render();
 h.render('account-b','project-a');reply(h.requests[1],brief('project-a',0,[]));await tick();h.render('account-b','project-a');
 h.render('account-a','project-a');reply(h.requests[2],brief('project-a',1,[entry]));await tick();let fresh=h.render();fresh.edit([{...entry,value:'new draft'}]);fresh=h.render();
 await old.save();assert.equal(h.requests.length,3);const pending=fresh.save();assert.equal(h.requests.length,4);reply(h.requests[3],brief('project-a',2,[{...entry,value:'new draft'}]));await pending;
});

test('save checks the exact UTF-8 request size without trimming the draft',async()=>{
 const makeEntries = target => {
  const rows=Array.from({length:40},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,label:'Label',value:'a'.repeat(1000),status:'proposed',source:{kind:'user',note:'n'.repeat(500)}}));
  let remaining=target-new TextEncoder().encode(JSON.stringify({expectedRevision:1,entries:rows})).length;
  assert.ok(remaining>=0 && remaining<=40000);
  for(const row of rows){const n=Math.min(1000,remaining);row.value='é'.repeat(n)+'a'.repeat(1000-n);remaining-=n;}
  assert.equal(remaining,0);assert.equal(new TextEncoder().encode(JSON.stringify({expectedRevision:1,entries:rows})).length,target);return rows;
 };
 const h=harness();h.render();reply(h.requests[0],brief('project-a',1,[]));await tick();let editor=h.render();const accepted=makeEntries(65536);editor.edit(accepted);editor=h.render();let pending=editor.save();assert.equal(h.requests.length,2);reply(h.requests[1],brief('project-a',2,accepted));await pending;
 editor=h.render();const oversized=makeEntries(65537);editor.edit(oversized);editor=h.render();await editor.save();editor=h.render();assert.equal(h.requests.length,2);assert.match(editor.state.message,/too large/i);assert.equal(editor.state.entries[0].value,oversized[0].value);
});

test('chat reference uses the exact combined length and rejects stale scope',()=>{
 const file=readFileSync(new URL('../src/components/workspace/use-workspace-state.ts',import.meta.url),'utf8');
 const start=file.indexOf('const prepareProjectBriefReference=');const end=file.indexOf('\n const prepareBriefUpdate=',start);assert.ok(start>=0&&end>start);
 const fragment=file.slice(start,end).replace('const prepareProjectBriefReference=', 'exports.prepareProjectBriefReference=');
 const code=ts.transpileModule(fragment,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const promptModule={};const promptCode=ts.transpileModule(readFileSync(new URL('../src/components/prompt-content.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 runInNewContext(promptCode,{exports:promptModule,require:name=>name==='react/jsx-runtime'?jsx:{}});
 const out={},promptValue={current:'a'.repeat(11997)},draftOwner={current:{account:'account-a',source:'source-a'}};let valid=true;
 runInNewContext(code,{exports:out,briefDraftScope:{},scopeCurrent:()=>valid,draftOwner,draftAccountKey:'account-a',sourceKey:'source-a',promptValue,appendViewportPrompt:promptModule.appendViewportPrompt,setPrompt:value=>{promptValue.current=value;}});
 assert.equal(out.prepareProjectBriefReference('x'),true);assert.equal(promptValue.current.length,12000);
 promptValue.current='a'.repeat(11998);const rejected=out.prepareProjectBriefReference('x');assert.equal(typeof rejected,'string');assert.equal(promptValue.current.length,11998);
 valid=false;assert.equal(out.prepareProjectBriefReference('x'),false);assert.equal(promptValue.current.length,11998);
});
