import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import * as layout from '../src/lib/workspace-layout.mjs';
import * as geometry from '../src/lib/plan-geometry.mjs';
import * as settingsNavigation from '../src/lib/settings-navigation.mjs';
import * as chatSeen from '../src/lib/chat-seen.mjs';
import {stopRequested} from '../src/lib/stop-requested.mjs';
import {featureEnabled,parseCapabilities} from '../src/lib/capabilities.mjs';
import {alternateModel,retryableFailure} from '../src/lib/model-retry.mjs';
import {queueAllowed} from '../src/lib/prompt-queue.mjs';
import {buildFrontendContext} from '../src/lib/agui/frontend-context.mjs';
import * as selectionMarker from '../src/lib/selection-uncertainty.mjs';
import * as conversationResult from '../src/lib/conversation-result.mjs';

const compile=source=>ts.transpileModule(source,{reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const scope=(id,epoch=1)=>({key:JSON.stringify(['account-a','task',id]),accountKey:'account-a',taskId:id,sourceKey:id,epoch});
const answer=(taskId,id='table')=>({id,kind:'table',title:id,markdown:'|A|\n|-|\n|1|',complete:true,source:{taskId,key:id,conversationIndex:0,state:'saved'}});
function harness(path,modules={},globals={}) {
 const slots=[],frames=[];let cursor=0,changed=false;
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;changed=true;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useMemo:fn=>fn(),useCallback:fn=>fn,useEffect(){},useLayoutEffect(){},useId:()=> 'work-area-test'};
 const exports={};const document={activeElement:null,querySelector:()=>null,querySelectorAll:()=>[]};const HTMLElement=class HTMLElement{};
 runInNewContext(compile(source(path)).outputText,{exports,document,HTMLElement,getComputedStyle:()=>({visibility:'visible'}),requestAnimationFrame:fn=>frames.push(fn),...globals,require(name){if(name==='react')return {...hooks,...modules.react};if(name==='react/jsx-runtime')return jsx;if(name==='@/lib/conversation-result.mjs')return conversationResult;if(name.endsWith('.module.css'))return {default:{}};return modules[name]??{};}});
 return {exports,document,HTMLElement,render(name,props){let tree,count=0;do{changed=false;cursor=0;tree=exports[name](props);if(++count>10)throw Error('render loop');}while(changed);return tree;},frames(){while(frames.length)frames.shift()();}};
}
function elements(tree){return React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(elements)]:[];}

test('M3 files parse and retain one production composer, viewer and controlled slot host',()=>{
 for(const path of ['src/components/workspace.tsx','src/components/workspace/use-workspace-state.ts','src/components/workspace/conversation.tsx','src/components/workspace/inspector.tsx','src/components/workspace/output-workspace.tsx','src/lib/work-area-contract.ts'])assert.equal(compile(source(path)).diagnostics.length,0,path);
 const workspace=source('src/components/workspace.tsx');assert.equal((workspace.match(/<ConversationPanel /g)??[]).length,1);assert.equal((workspace.match(/<PlanCanvas/g)??[]).length,1);
 assert.equal((source('src/components/workspace/conversation.tsx').match(/<Composer /g)??[]).length,1);
 assert.equal(workspace.includes("scopeKey={w.run?.id"),false);assert.equal(source('src/components/workspace/output-workspace.tsx').includes('key={scopeKey}'),false);
});

test('provider changes scope before children render, preserves child identity and rejects A1 callbacks in A3',()=>{
 const h=harness('src/components/workspace/output-workspace.tsx'),child=React.createElement('stable-child');
 const render=id=>{const input=scope(id);delete input.epoch;return h.render('OutputWorkspaceProvider',{scopeKey:input.key,scopeInput:input,children:child});};
 let tree=render('a'),first=tree.props.value;first.register('answer',[answer('a')]);tree=render('a');assert.equal(tree.props.value.outputs.length,1);assert.equal(tree.props.children,child);
 const second=render('b').props.value;assert.equal(second.scope.epoch,2);assert.equal(second.outputs.length,0);assert.equal(second.activeOutput,null);
 const third=render('a').props.value;assert.equal(third.scope.epoch,3);third.register('answer',[answer('a','new')]);
 first.register('answer',[]);first.register('late',[answer('a','old')]);first.openOutput('old');
 tree=render('a');assert.deepEqual([...tree.props.value.outputs.map(item=>item.id)],['new']);assert.equal(tree.props.value.activeOutput,null);assert.equal(tree.props.children,child);
 tree.props.value.register('foreign',[answer('b','foreign')]);assert.equal(render('a').props.value.outputs.length,1);
});

test('output/report exclusivity callback runs before selecting an output; removed outputs fall back permanently',()=>{
 const h=harness('src/components/workspace/output-workspace.tsx');let opened=0;const input=scope('a');delete input.epoch;
 const render=()=>h.render('OutputWorkspaceProvider',{scopeKey:input.key,scopeInput:input,onOpen:()=>opened++}).props.value;
 let value=render();value.register('answer',[answer('a')]);value=render();value.openOutput('table');assert.equal(opened,1);assert.equal(render().activeOutput.id,'table');
 value=render();value.register('answer',[]);assert.equal(render().activeOutput,null);render().register('answer',[answer('a')]);assert.equal(render().activeOutput,null);
});

test('queued output focus restoration cannot return to a previous A epoch',()=>{
 let focused=0;class Element{constructor(){this.isConnected=true;}closest(){return null;}getClientRects(){return [{}];}focus(){focused++;}}
 const opener=new Element(),h=harness('src/components/workspace/output-workspace.tsx',{}, {HTMLElement:Element});h.document.activeElement=opener;
 const render=id=>{const input=scope(id);delete input.epoch;return h.render('OutputWorkspaceProvider',{scopeKey:input.key,scopeInput:input}).props.value;};
 let value=render('a');value.register('answer',[answer('a')]);value=render('a');value.openOutput('table',opener);value=render('a');value.closeOutput();render('b');render('a');h.frames();assert.equal(focused,0);
});

test('the work area has no section tabs; the header leads with the mode switch and Design keeps its slot',()=>{
 const h=harness('src/components/workspace/inspector.tsx'),calls=[],design=React.createElement('viewer');
 const grip=React.createElement('header-action',{type:'button'}),lead=React.createElement('mode-switch');
 const props={scope:scope('a'),section:'design',preview:{kind:'drawing',scope:scope('a')},propertiesOpen:false,actions:{selectSection:value=>calls.push(value),closePreview(){}},headerLead:lead,headerAction:grip,slots:{design,properties:null,review:React.createElement('review-screen'),activity:'activity',assets:'assets',exports:'exports',page:null}};
 const panelOf=tree=>elements(tree).find(node=>node.props.hidden!==undefined&&elements(node).some(child=>child.type==='viewer'));
 let tree=h.render('Inspector',props);
 assert.equal(elements(tree).filter(node=>node.props.role==='tab'||node.props.role==='tablist').length,0,'Activity, Assets and Exports are no longer work-area tabs');
 assert.ok(elements(tree).some(node=>node.type==='mode-switch'));assert.ok(elements(tree).some(node=>node.type==='header-action'));
 assert.equal(panelOf(tree).props.hidden,false);assert.equal(elements(tree).some(node=>node.type==='review-screen'),false,'Review mounts only in Review mode');
 for(const section of ['activity','assets','exports'])assert.equal(panelOf(h.render('Inspector',{...props,section})).props.hidden,false,section+' opens the drawer over Design, which stays put');
 tree=h.render('Inspector',{...props,mode:'review'});assert.equal(panelOf(tree).props.hidden,true);assert.equal(panelOf(tree).props.inert,true);assert.ok(elements(tree).some(node=>node.type==='review-screen'));
 assert.equal(elements(tree).filter(node=>node.type==='viewer').length,1,'The drawing stays mounted behind Review');
 tree=h.render('Inspector',{...props,slots:{...props.slots,page:React.createElement('studio-page')}});assert.equal(panelOf(tree).props.hidden,true);assert.ok(elements(tree).some(node=>node.type==='studio-page'));
 assert.equal(elements(h.render('Inspector',{...props,headerLead:undefined,headerAction:undefined})).some(node=>node.type==='mode-switch'),false);
});

test('an open answer or report replaces Design in place and Back returns to the drawing',()=>{
 const h=harness('src/components/workspace/inspector.tsx'),closed=[],drawingMarker={},reportMarker={},drawing=React.createElement('viewer',{marker:drawingMarker}),report=React.createElement('report',{revision:1,marker:reportMarker});
 const base={scope:scope('a'),preview:{kind:'saved-report',scope:scope('a'),taskId:'a',openId:7},propertiesOpen:false,actions:{selectSection(){},closePreview:()=>closed.push('close')},slots:{design:drawing,properties:null,activity:'activity',assets:'assets',exports:'exports',assetPreview:report}};
 for(const mode of ['design','review'])for(const section of ['design','assets','exports']){
  const all=elements(h.render('Inspector',{...base,section,mode}));
  assert.equal(all.filter(node=>node.type==='viewer').length,1);assert.equal(all.find(node=>node.type==='viewer').props.marker,drawingMarker);
  assert.equal(all.filter(node=>node.type==='report').length,1);assert.equal(all.find(node=>node.type==='report').props.marker,reportMarker);
  const panel=all.find(node=>node.props.hidden===false&&elements(node).some(child=>child.type==='report'));assert.ok(panel,'the preview panel is visible');
  const back=elements(panel).find(node=>node.type==='button'&&React.Children.toArray(node.props.children).join('')==='Back to drawing');back.props.onClick();
 }
 assert.deepEqual(closed.length,6);
});

function selectionHarness(){
 const text=source('src/components/workspace/use-workspace-state.ts'),ast=ts.createSourceFile('hook.ts',text,ts.ScriptTarget.Latest,true);let initializer;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='selectAlternative')initializer=node.initializer.getText(ast);ts.forEachChild(node,visit);};visit(ast);assert.ok(initializer);
 const pending=[],calls=[],record={scope:scope('a'),generation:1,run:{id:'a',data:{agent_design:{briefId:'brief-a',candidates:[{planId:'plan-a',version:1,fingerprint:'fp-a'}]}}}};
 const context={exports:{},runId:'a',run:record.run,currentRun:{current:record.run},workspaceGuard:{current:{key:record.scope.key,generation:1}},actionScope:{key:record.scope.key,generation:1},scopeCurrent:token=>token.key===context.workspaceGuard.current.key&&token.generation===context.workspaceGuard.current.generation,withSelectionMutation:async operation=>operation(),reviewEpoch:{current:0},selectionLocks:{current:new Map()},selectionBlocked:()=>false,selectionStorage:()=>null,selectionWebLocks:()=>null,workspaceAccountKey:'account-a',claimSelectionMarker:async()=>true,releaseSelectionMarker:async()=>true,selectionKey:'a',setUncertainSelections(){},setSelectionIssue(){},drawingIdentity:value=>value?JSON.stringify([value.planId,value.version,value.fingerprint]):'',setActionBusy:value=>calls.push(['busy',value]),setDrawingError:value=>calls.push(['error',value]),setDesignVersion:value=>calls.push(['drawing',value]),setDrawingStyle(){},setCompareVersion(){},setRun:value=>calls.push(['run',value]),api:(path,method,body)=>{calls.push([path,method,body]);return new Promise(resolve=>pending.push(resolve));}};
 context.designVersion=null;context.currentDrawing={current:null};
 runInNewContext(compile('exports.select='+initializer).outputText,context);
 const selection={scope:record.scope,taskId:'a',briefId:'brief-a',plan:record.run.data.agent_design.candidates[0]};
 return {context,calls,pending,selection,select:context.exports.select,switchScope(){context.workspaceGuard.current={key:scope('b').key,generation:2};context.currentRun.current=null;},returnA(){context.workspaceGuard.current={key:scope('a').key,generation:3};context.currentRun.current=record.run;}};
}
const tick=async()=>{await new Promise(setImmediate);};
test('explicit alternative selection preserves the exact tuple and revision; wrong geometry never POSTs',async()=>{
 const h=selectionHarness(),done=h.select(h.selection);h.pending.shift()({planId:'plan-a',version:1,fingerprint:'fp-a'});await tick();h.pending.shift()({selectionRevision:8});await tick();
 const write=h.calls.find(row=>row[1]==='POST');assert.deepEqual({...write[2]},{planId:'plan-a',version:1,fingerprint:'fp-a',expectedSelectionRevision:8});h.pending.shift()({selected:h.selection.plan});await tick();h.pending.shift()({id:'a',currentPlanRef:h.selection.plan,data:{agent_design:{briefId:'brief-a',candidates:[h.selection.plan]}}});await done;assert.equal(h.calls.filter(row=>row[0]==='drawing').length,1);
 const bad=selectionHarness(),failed=bad.select(bad.selection);bad.pending.shift()({planId:'foreign-plan',version:1,fingerprint:'fp-a'});await failed;assert.equal(bad.calls.some(row=>row[1]==='POST'),false);
});
test('A to B to A, changed brief and removed candidates at either GET boundary prevent alternative mutation',async()=>{
 for(const boundary of [1,2])for(const change of ['scope','brief','candidate']){
  const h=selectionHarness(),done=h.select(h.selection);
  if(boundary===2){h.pending.shift()({...h.selection.plan});await tick();}
  if(change==='scope'){h.switchScope();h.returnA();}else if(change==='brief')h.context.currentRun.current.data.agent_design.briefId='changed';else h.context.currentRun.current.data.agent_design.candidates=[];
  h.pending.shift()(boundary===1?{...h.selection.plan}:{selectionRevision:4});await done;assert.equal(h.calls.some(row=>row[1]==='POST'),false,boundary+':'+change);
  if(change!=='scope')assert.deepEqual(h.calls.filter(row=>row[0]==='busy').at(-1),['busy',false],'Same-scope invalidation releases its own busy state');
 }
});


function fakeLocks(){const tails=new Map();return {request(name,options,callback){assert.equal(options.mode,'exclusive');let result;try{result=tails.has(name)?tails.get(name).then(callback):Promise.resolve(callback());}catch(error){result=Promise.reject(error);}const tail=result.then(()=>{},()=>{});tails.set(name,tail);void tail.then(()=>{if(tails.get(name)===tail)tails.delete(name);});return result;}};}
const queueEnv={current:null};
function workspaceHarness(sharedStorage,sharedLocks){
 const effects=[],requests=[],chat={messages:[],status:'ready',options:null,sent:[]};
 const chatStart={};runInNewContext(compile(source('src/lib/chat-start.ts')).outputText,{exports:chatStart,Response,Error});
 const projection={};runInNewContext(compile(source('src/lib/task-projection.ts')).outputText,{exports:projection,require:()=>chatStart});
 const workflow={};runInNewContext(compile(source('src/lib/workflow-state.ts')).outputText,{exports:workflow});
 const promptContent={};runInNewContext(compile(source('src/components/prompt-content.tsx')).outputText,{exports:promptContent,require:name=>name==='react/jsx-runtime'?jsx:{}});
 const draft={get:()=>'',status:()=> 'memory',revision:()=> 'rev',set:()=> 'memory',move(){},confirm:()=> 'memory'};
 const modules={
  react:{useEffect:fn=>effects.push(fn)},
  '@/lib/workspace-layout.mjs':layout,'@/lib/plan-geometry.mjs':geometry,'@/lib/task-projection':projection,
  '@/lib/settings-navigation.mjs':settingsNavigation,
  '@/lib/chat-seen.mjs':chatSeen,
  '@/lib/stop-requested.mjs':{stopRequested},
  '@/lib/capabilities.mjs':{parseCapabilities,featureEnabled},
  '@/lib/model-retry.mjs':{alternateModel,retryableFailure},
  '@/lib/prompt-queue.mjs':{queueAllowed},
  './use-prompt-queue':{usePromptQueue:env=>{queueEnv.current=env;return {active:false,items:[]};}},
  './use-plan-edit':{usePlanEdit:()=>({busy:false,notice:null,apply:async()=>{},open:async()=>{},dismiss(){}})},
  '@/lib/agui/frontend-context.mjs':{buildFrontendContext},
  '@/lib/task-command':{replaceTerminalCommand:(type,state)=>state==='applied'||state==='rejected'||(state==='interrupted'&&['compare_result','inspect_result'].includes(type))},
  '@/lib/chat-start':{chatStartFailure:()=>null,savedTaskConnectionNotice:()=>'',admissionMessage:message=>message},
  '@/lib/prompt-drafts.mjs':{createPromptDraftStore:()=>draft},
  '@/lib/selection-uncertainty.mjs':selectionMarker,
  '../account-admission':{accountAdmissionState:()=>({localTest:false,admittedSubject:null,needsAccountAdmission:false,workspaceLoading:false})},
  '../agent-activity':{activityTurns:()=>[],latestTaskActivity:()=>({active:false})},
  '../prompt-content':{splitViewportPrompt:text=>({text,references:[]}),hasPromptContent:text=>Boolean(text.trim()),appendViewportPrompt:promptContent.appendViewportPrompt},
  '@/lib/workflow-state':{workflowState:()=>({label:'Saved'}),hasPendingQuestion:workflow.hasPendingQuestion},
  '@/lib/plan-build-flow':{planBuildStep:()=>null},
  '@/lib/settled-poll.mjs':{openChatPollMs:()=>null,settledPoll:update=>{void update();return ()=>{};}},
  '@/lib/agui-chat-transport':{AguiChatTransport:class{
   resumeQuestion(props,questionId,version,payload,clientSubmissionId){return new Promise((resolve,reject)=>requests.push({path:'/api/agui',init:{body:JSON.stringify({forwardedProps:props,resume:[{interruptId:`${questionId}:${version}`,status:'resolved',payload}]})},reject,resolve:()=>resolve(new ReadableStream({start(c){c.enqueue({type:'data-run',data:{id:props.taskId,clientSubmissionId}});c.close();}}))}));}
  }},
  '@ai-sdk/react':{useChat(options){chat.options=options;return {messages:chat.messages,status:chat.status,error:chat.error,setMessages(value){chat.messages=typeof value==='function'?value(chat.messages):value;},stop:async()=>{},sendMessage:(...args)=>{chat.sent.push(args);return new Promise((resolve,reject)=>{chat.finish=resolve;chat.reject=reject;});}};}},
 };
 const storage=sharedStorage??(()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};})();
 const listeners=new Map(),window={location:{href:'https://datumm.test/'},history:{replaceState(){}},matchMedia:()=>({matches:false}),desktop:null,localStorage:storage,navigator:{locks:sharedLocks??fakeLocks()},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 let uuid=0;
 const h=harness('src/components/workspace/use-workspace-state.ts',modules,{window,URL,URLSearchParams,Error,AbortController,ReadableStream,crypto:{randomUUID:()=> `submission-${++uuid}`},fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,reject,resolve:value=>resolve({ok:true,text:async()=>JSON.stringify(value)})}))});
 return {...h,window,storage,listeners,effects,requests,chat,render:accountKey=>h.render('useWorkspaceState',{authConfigured:true,accountKey:accountKey??'account-a'})};
}
const task=(id,more={})=>({id,title:id,status:'completed',mode:'ask',model:'model',events:[],data:{},...more});

test('navigation keeps its desktop choice while the narrow drawer starts closed',()=>{
 for(const desktopOpen of [false,true]){
  const h=workspaceHarness();let listener;
  const media={matches:false,addEventListener:(_name,fn)=>{listener=fn;},removeEventListener(){}};
  h.window.matchMedia=()=>media;
  let w=h.render();
  h.effects.findLast(fn=>fn.toString().includes('setNavigationNarrow(narrow.matches)'))();
  w=h.render();w.setLeft(desktopOpen);w=h.render();
  media.matches=true;listener();w=h.render();assert.equal(w.left,false);
  w.setLeft(true);w=h.render();assert.equal(w.left,true);
  media.matches=false;listener();w=h.render();assert.equal(w.left,desktopOpen);
  media.matches=true;listener();assert.equal(h.render().left,false,'Returning to narrow starts with a closed drawer');
 }
});

test('Settings restores the desktop navigation choice across a breakpoint change',()=>{
 const h=workspaceHarness();let listener;
 const media={matches:false,addEventListener:(_name,fn)=>{listener=fn;},removeEventListener(){}};
 h.window.matchMedia=()=>media;
 let w=h.render();h.effects.findLast(fn=>fn.toString().includes('setNavigationNarrow(narrow.matches)'))();
 w=h.render();w.setLeft(false);w=h.render();w.changeSettingsOpen(true);w=h.render();
 const settle=()=>h.effects.findLast(fn=>fn.toString().includes('settingsPreviousLeft.current = {'))();
 settle();w=h.render();media.matches=true;listener();w=h.render();
 w.changeSettingsOpen(false);w=h.render();settle();w=h.render();
 media.matches=false;listener();assert.equal(h.render().left,false);
});

test('Escape closes the actual narrow drawer and restores focus to its opener',()=>{
 const h=workspaceHarness();let mediaListener,escape;
 const media={matches:false,addEventListener:(_name,fn)=>{mediaListener=fn;},removeEventListener(){}};
 h.window.matchMedia=()=>media;
 const opener={getClientRects:()=>[{}],closest:()=>null,focus(){focused=true;}};let focused=false;
 const drawer={id:'workspace-navigation',getClientRects:()=>[{}]};
 h.document.querySelectorAll=selector=>selector==='[role="dialog"],[role="menu"]'?[drawer]:[opener];
 h.document.addEventListener=(name,fn)=>{if(name==='keydown')escape=fn;};
 let w=h.render();h.effects.findLast(fn=>fn.toString().includes('setNavigationNarrow(narrow.matches)'))();
 w=h.render();w.setLeft(false);w=h.render();media.matches=true;mediaListener();w=h.render();
 w.setLeft(true);w=h.render();assert.equal(w.left,true);
 h.effects.findLast(fn=>fn.toString().includes('const closeDrawer'))();
 let prevented=false;escape({key:'Escape',defaultPrevented:false,preventDefault(){prevented=true;}});h.frames();
 assert.equal(h.render().left,false);assert.equal(prevented,true);assert.equal(focused,true);
});

test('drawer initial focus does not open an Escape-consuming tooltip',()=>{
 const ast=ts.createSourceFile('sidebar.tsx',source('src/components/workspace/sidebar.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let collapse;
 function visit(node){
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='IconButton'&&node.attributes.properties.some(attr=>attr.name?.getText(ast)==='label'&&attr.initializer?.text==='Collapse navigation'))collapse=node;
  ts.forEachChild(node,visit);
 }
 visit(ast);assert.ok(collapse);
 assert.ok(collapse.attributes.properties.some(attr=>attr.name?.getText(ast)==='title'&&attr.initializer?.text==='Collapse navigation'));
 for(let node=collapse.parent;node;node=node.parent)if(ts.isJsxElement(node))assert.notEqual(node.openingElement.tagName.getText(ast),'Tooltip');
});

test('session readiness is bound to device and account before effects and ignores stale completions',async()=>{
 const h=workspaceHarness();let w=h.render();
 const refresh=w.refresh();
 for(const request of h.requests.splice(0)){
  if(request.path.endsWith('/config'))request.resolve({runtime:'hosted',models:[]});
  else if(request.path.endsWith('/devices'))request.resolve([{id:'a',online:true},{id:'b',online:true}]);
  else if(request.path.endsWith('/runs')||request.path.endsWith('/projects'))request.resolve([]);
  else throw Error(request.path);
 }
 await refresh;w=h.render();assert.equal(w.selectedDevice.id,'a');assert.equal(w.revitSessions,null);
 const check=()=>{const effect=h.effects.findLast(fn=>fn.toString().includes('list_revit_sessions'));assert.ok(effect);return effect();};
 const cleanupA=check();let request=h.requests.findLast(item=>item.path.includes('/a/tools'));request.resolve([{sessionId:'a-session'}]);await new Promise(resolve=>setImmediate(resolve));w=h.render();assert.equal(w.revitSessions,1);
 w.setDeviceId('b');w=h.render();assert.equal(w.revitSessions,null,'B cannot inherit A readiness before effect cleanup');
 const cleanupB=check();const b=h.requests.findLast(item=>item.path.includes('/b/tools'));
 w.setDeviceId('a');w=h.render();assert.equal(w.revitSessions,null,'A to B to A needs a fresh observation');
 const cleanupA2=check();const a2=h.requests.findLast(item=>item.path.includes('/a/tools'));
 b.resolve([{sessionId:'b-session'}]);await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().revitSessions,null);
 a2.resolve([{sessionId:'new-a'}]);await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().revitSessions,1);
 w=h.render();w.setDeviceId('b');w=h.render();const cleanupB2=check();const b2=h.requests.findLast(item=>item.path.includes('/b/tools'));
 w.setDeviceId('a');w=h.render();const cleanupA3=check();const a3=h.requests.findLast(item=>item.path.includes('/a/tools'));
 a3.resolve([{sessionId:'newer-a'}]);await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().revitSessions,1);
 b2.reject(new Error('late failure'));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().revitSessions,1,'stale failure cannot clear current readiness');
 const cleanupMalformed=check();h.requests.findLast(item=>item.path.includes('/a/tools')).resolve([{sessionId:''}]);await new Promise(resolve=>setImmediate(resolve));assert.equal(h.render().revitSessions,null,'malformed sessions cannot establish readiness');
 const offline=h.render().refresh();
 for(const pending of h.requests.splice(0)){
  if(pending.path.endsWith('/config'))pending.resolve({runtime:'hosted',models:[]});
  else if(pending.path.endsWith('/devices'))pending.resolve([{id:'a',online:false},{id:'b',online:true}]);
  else if(pending.path.endsWith('/runs'))pending.resolve([]);
  else if(pending.path.endsWith('/projects'))pending.resolve([]);
 }
 await offline;w=h.render();assert.equal(w.selectedDevice.online,false);assert.equal(w.revitSessions,null,'offline state invalidates readiness immediately');
 w=h.render('account-b');assert.equal(w.revitSessions,null,'account change invalidates before effects');
 w=h.render('account-a');assert.equal(w.revitSessions,null,'returning to A cannot reuse earlier account observation');
 cleanupA();cleanupB();cleanupA2();cleanupB2();cleanupA3();cleanupMalformed();
});

test('brief update appends to the current draft without sending and rejects stale task and account callbacks',()=>{
 const h=workspaceHarness(),owner=()=>{const effect=h.effects.findLast(fn=>fn.toString().includes('draftOwner.current ='));assert.ok(effect);effect();};
 let w=h.render();owner();w=h.render();assert.equal(w.prepareBriefUpdate(),false,'No selected task');
 w.selectRun(task('a'));w=h.render();assert.equal(w.prepareBriefUpdate(),false,'The source owner has not switched yet');
 owner();w=h.render();w.setPrompt('Keep the courtyard.');w.setMode('ask');w=h.render();
 const original=w.prepareBriefUpdate,requestsBefore=h.requests.length;
 assert.equal(original(),true);w=h.render();assert.equal(w.mode,'ask');
 assert.match(w.prompt,/^Keep the courtyard\./);assert.match(w.prompt,/Revise the task brief/);assert.match(w.prompt,/Do not change Revit/);
 assert.equal(h.requests.length,requestsBefore);assert.equal(h.chat.sent.length,0);
 w.selectRun(task('b'));w=h.render();assert.equal(w.prepareBriefUpdate(),false,'New task cannot write the previous task draft before its owner effect');
 owner();w=h.render();w.selectRun(task('a'));w=h.render();assert.equal(original(),false,'An A1 callback cannot edit A3');
 assert.equal(w.prepareBriefUpdate(),false,'Returned task waits for its own owner effect');
 owner();w=h.render();assert.equal(w.prepareBriefUpdate(),true);
 const accountCallback=w.prepareBriefUpdate;w=h.render('account-b');assert.equal(accountCallback(),false,'Old account callback is invalid');assert.equal(w.prepareBriefUpdate(),false,'New account has no selected task');
 w.selectRun(task('a'));w=h.render('account-b');assert.equal(w.prepareBriefUpdate(),false,'New account cannot write before its owner effect');
 owner();w=h.render('account-b');assert.equal(w.prepareBriefUpdate(),true);assert.equal(h.chat.sent.length,0);
});

test('brief update preserves modes and refuses active tasks or pending questions without modifying drafts',()=>{
 const h=workspaceHarness(),owner=()=>{const effect=h.effects.findLast(fn=>fn.toString().includes('draftOwner.current ='));assert.ok(effect);effect();};
 let w=h.render();owner();w=h.render();
 const cases=[
  ...['queued','running','needs_input','waiting','waiting_for_input','awaiting_approval','paused_limit','paused_recovery','reconciling','blocked'].map(status=>({status,data:{},allowed:false})),
  {status:'needs_input',data:{agent_question:{id:'q'}},allowed:false},
  {status:'needs_input',data:{opencode_questions:[{id:'q'}]},allowed:false},
  {status:'completed',data:{opencode_questions:[{id:'q'}]},allowed:false},
  {status:'completed',data:{agent_question:{id:'stale'}},allowed:true},
  ...['failed','cancelled','interrupted'].map(status=>({status,data:{},allowed:true})),
 ];
 for(const [index,row] of cases.entries()){
  const mode=index%2?'build':'ask';w.selectRun(task(`case-${index}`,{status:row.status,data:row.data,mode}));w=h.render();owner();w=h.render();
  w.setPrompt('Existing draft');w=h.render();const before=h.requests.length;
  assert.equal(w.prepareBriefUpdate(),row.allowed,JSON.stringify(row));w=h.render();
  assert.equal(w.mode,mode,`Mode stays ${mode} for ${row.status}`);
  assert.equal(h.requests.length,before);assert.equal(h.chat.sent.length,0);
  if(row.allowed)assert.match(w.prompt,/^Existing draft[\s\S]*Revise the task brief/);
  else assert.equal(w.prompt,'Existing draft');
 }
});

test('lost answer response recovers only from the same task and question version receipt',async()=>{
 for(const receiptCase of ['matching','wrong-version','wrong-question','wrong-task','wrong-command','missing-command']){
  const h=workspaceHarness(),question={id:'q',version:4,question:'Width?'};
  const saved=task('a',{status:'needs_input',taskVersion:1,data:{agent_question:question}});
  let w=h.render();w.selectRun(saved);h.requests.at(-1).resolve(saved);await new Promise(setImmediate);w=h.render();
  const reply=w.replyToQuestion({question_id:'q',question_version:4,answers:[{question_id:'width',value:'12'}]});
  const post=h.requests.findLast(row=>row.path==='/api/agui');assert.ok(post);
  assert.equal(JSON.parse(post.init.body).resume[0].payload.questionVersion,4);
  const original=Error('Answer response lost');post.reject(original);await new Promise(setImmediate);
  const recovery=h.requests.findLast(row=>row.path==='/api/service/runs/a');assert.ok(recovery);
  const receipt={questionId:receiptCase==='wrong-question'?'other':'q',version:receiptCase==='wrong-version'?3:4};
  const commandId=JSON.parse(post.init.body).forwardedProps.idempotencyKey;
  recovery.resolve(task(receiptCase==='wrong-task'?'b':'a',{status:'queued',data:{agent_reply_receipt:receipt},commandReceipts:receiptCase==='missing-command'?[]:[{commandId:receiptCase==='wrong-command'?'other':commandId,state:'applied'}]}));
  if(receiptCase==='matching'){
   await new Promise(setImmediate);
   const refresh=h.requests.findLast(row=>row.path==='/api/service/runs/a');assert.notEqual(refresh,recovery);
   refresh.resolve(task('a',{status:'queued',taskVersion:2,data:{agent_reply_receipt:receipt}}));
   await reply;assert.equal(h.render().run.status,'queued');
  }else{
   await assert.rejects(reply,error=>error===original);
   assert.equal(h.render().run.data.agent_question.version,4,'The unanswered question remains available for retry');
  }
  assert.equal(h.requests.filter(row=>row.path==='/api/agui').length,1,'Recovery never sends another command');
 }
});

test('late question receipt after switching tasks cannot replace the new task',async()=>{
 const h=workspaceHarness(),question={id:'q',version:4,question:'Width?'};
 const saved=task('a',{status:'needs_input',taskVersion:1,data:{agent_question:question}});
 let w=h.render();w.selectRun(saved);h.requests.at(-1).resolve(saved);await new Promise(setImmediate);w=h.render();
 const reply=w.replyToQuestion({question_id:'q',question_version:4,answers:[{question_id:'width',value:'12'}]});
 const post=h.requests.findLast(row=>row.path==='/api/agui'),commandId=JSON.parse(post.init.body).forwardedProps.idempotencyKey;
 post.reject(Error('Lost response'));await new Promise(setImmediate);
 const recovery=h.requests.findLast(row=>row.path==='/api/service/runs/a');
 w=h.render();w.selectRun(task('b'));w=h.render();
 recovery.resolve(task('a',{status:'queued',data:{agent_reply_receipt:{questionId:'q',version:4}},commandReceipts:[{commandId,state:'applied'}]}));
 await reply;w=h.render();assert.equal(w.runId,'b');assert.equal(w.run.id,'b');
});

test('opening a settled history row reads the task and rejects stale selection and account completions',async()=>{
 const h=workspaceHarness();let w=h.render();const saved=task('a',{taskVersion:1});w.selectRun(saved);w=h.render();
 assert.equal(w.run.taskVersion,1);assert.equal(h.requests.at(-1).path,'/api/service/tasks/a');
 h.requests.at(-1).resolve(task('a',{taskVersion:2,status:'running',data:{usage:{rootTaskId:'a'}}}));await new Promise(setImmediate);
 w=h.render();assert.equal(w.run.status,'running');assert.equal(w.run.taskVersion,2);
 w.selectRun(saved);w=h.render();const stale=h.requests.at(-1);w.selectRun(task('b'));w=h.render();w.selectRun(saved);w=h.render();
 stale.resolve(task('a',{taskVersion:10,title:'Stale A1'}));await new Promise(setImmediate);assert.equal(h.render().run.title,'a');
 const beforeAccount=h.requests.at(-1);h.render('account-b');beforeAccount.resolve(task('a',{taskVersion:11}));await new Promise(setImmediate);
 assert.equal(h.render('account-b').run,null);
});

test('failed authoritative reopen preserves the saved chat with an honest refresh notice',async()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a'));w=h.render();h.requests.at(-1).reject(Error('offline'));await new Promise(setImmediate);
 w=h.render();assert.equal(w.run.id,'a');assert.match(w.connectionNotice,/latest updates could not be checked/);
 w.selectRun(task('b'));h.requests.at(-1).resolve(task('foreign'));await new Promise(setImmediate);assert.equal(h.render().run.id,'b');
});

test('a late reopen read cannot replace a newer same-task stream or poll snapshot',async()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a',{taskVersion:1,eventCursor:0}));w=h.render();const read=h.requests.at(-1);
 w.setRun(task('a',{taskVersion:3,eventCursor:4,status:'running',events:[{index:3,stage:'running',detail:'Current work'}]}));w=h.render();
 read.resolve(task('a',{taskVersion:2,eventCursor:2,status:'completed'}));await new Promise(setImmediate);
 w=h.render();assert.equal(w.run.taskVersion,3);assert.equal(w.run.status,'running');assert.equal(w.run.events[0].detail,'Current work');
});

test('a newer selected history revision refreshes the complete task without replacing it with a list row',async()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a',{taskVersion:1}));h.requests.at(-1).resolve(task('a',{taskVersion:1}));await new Promise(setImmediate);w=h.render();
 const refresh=w.refresh();h.requests.findLast(row=>row.path==='/api/service/config').resolve({models:[]});h.requests.findLast(row=>row.path==='/api/service/devices').resolve([]);h.requests.findLast(row=>row.path==='/api/service/runs').resolve([task('a',{taskVersion:2,status:'running'})]);await refresh;w=h.render();
 const effect=h.effects.findLast(fn=>fn.toString().includes('selectedListVersion'));assert.ok(effect);effect();
 assert.equal(h.requests.at(-1).path,'/api/service/tasks/a');assert.equal(h.render().run.status,'completed','List rows do not overwrite full task data');
 h.requests.at(-1).resolve(task('a',{taskVersion:2,status:'running'}));await new Promise(setImmediate);w=h.render();assert.equal(w.run.status,'running');
 const count=h.requests.length;h.effects.findLast(fn=>fn.toString().includes('selectedListVersion'))();assert.equal(h.requests.length,count,'An equal revision does not refetch');
});

test('actual Settings, dialog and drawer focus return to the current visible web controls',()=>{
 const h=workspaceHarness(),focused=[];
 const element=(name,visible=true,inert=false)=>Object.assign(new h.HTMLElement(),{isConnected:true,getClientRects:()=>visible?[{}]:[],closest:selector=>inert&&selector==='[hidden],[inert]'?{}:null,focus:()=>focused.push(name)});
 const header=element('DATUMM workspace menu'),hidden=element('hidden rail',false),inert=element('inert control',true,true),web=element('Open workspace navigation');
 h.document.querySelectorAll=selector=>selector.includes('data-state="open"')?[header]:[hidden,inert,web];
 const settleSettings=()=>{h.effects.findLast(fn=>fn.toString().includes('settingsFocusTransition.current'))();h.frames();};
 h.document.activeElement=Object.assign(element('menu item'),{closest:selector=>selector==='[role="menu"]'?{}:null});
 h.document.querySelector=selector=>selector==='.studio-settings-embedded main h1'?element('Settings heading'):null;
 const settleNavigation=()=>h.effects.findLast(fn=>fn.toString().includes('settingsPreviousLeft.current = {'))();
 let w=h.render();w.changeSettingsOpen(true);w=h.render();assert.equal(w.settingsOpen,true);settleNavigation();w=h.render();assert.equal(w.left,false);settleSettings();assert.deepEqual(focused,['Settings heading']);
 w.changeSettingsOpen(false);w=h.render();settleSettings();assert.deepEqual(focused,['Settings heading'],'Wait until the previous sidebar state is restored before choosing a focus target');settleNavigation();w=h.render();assert.equal(w.left,true);settleSettings();assert.equal(focused.at(-1),'DATUMM workspace menu');
 header.isConnected=false;w.changeSettingsOpen(false);h.render();settleSettings();assert.equal(focused.at(-1),'Open workspace navigation');
 h.document.body=element('body');h.document.activeElement=h.document.body;w.changeSettingsOpen(true);h.render();w.changeSettingsOpen(false);h.render();settleSettings();assert.equal(focused.at(-1),'Open workspace navigation','Direct /#settings entry must not restore focus to body');
 w.changeSettingsOpen(true);h.render();h.effects.findLast(fn=>fn.toString().includes('settingsFocusTransition.current'))();w.changeSettingsOpen(false);h.render();h.frames();assert.notEqual(focused.at(-1),'Settings heading','A queued opening cannot steal focus after Settings closes');settleSettings();
 w.dialogTrigger.current=inert;w.restoreDialogFocus({preventDefault(){}});assert.equal(focused.at(-1),'Open workspace navigation');
 let closeDrawer;h.document.addEventListener=(name,listener)=>{if(name==='keydown')closeDrawer=listener;};h.window.matchMedia=()=>({matches:true});
 w.setLeft(true);w=h.render();h.effects.findLast(fn=>fn.toString().includes('const closeDrawer'))();
 const drawer={id:'workspace-navigation',getClientRects:()=>[{}]},higherSurface={id:'account-menu',getClientRects:()=>[{}]};
 let higherOpen=true;
 h.document.querySelectorAll=selector=>selector==='[role="dialog"],[role="menu"]'?[drawer,...higherOpen?[higherSurface]:[]]:[hidden,inert,web];
 closeDrawer({key:'Escape',defaultPrevented:false,preventDefault(){assert.fail('A higher dialog or menu owns Escape');}});assert.equal(h.render().left,true);
 higherOpen=false;
 closeDrawer({key:'Escape',defaultPrevented:false,preventDefault(){}});h.frames();assert.equal(h.render().left,false);assert.equal(focused.at(-1),'Open workspace navigation');
});

test('actual narrow navigation mount focuses the rail, contains Tab and returns focus on dismissal',()=>{
 const ast=ts.createSourceFile('workspace.tsx',source('src/components/workspace.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler,effect;
 function visit(node){
  if(ts.isJsxOpeningElement(node)&&node.tagName.getText(ast)==='button'&&node.attributes.properties.some(attr=>attr.name?.getText(ast)==='aria-label'&&attr.initializer?.text==='Open workspace navigation'))handler=node.attributes.properties.find(attr=>attr.name?.getText(ast)==='onClick').initializer.expression.getText(ast);
  if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('const shell = navigation.current'))effect=node.arguments[0].getText(ast);
  ts.forEachChild(node,visit);
 }visit(ast);assert.ok(handler);assert.ok(effect);
 const events=[],frames=[],exports={},listeners=new Map();
 class Element{constructor(name){this.name=name;this.isConnected=true;}getClientRects(){return[{}];}closest(){return null;}focus(){doc.activeElement=this;events.push(this.name);}}
 const opener=new Element('opener'),first=new Element('Collapse navigation'),last=new Element('last control');
 const shell={querySelector:selector=>{assert.equal(selector,'[aria-label="Collapse navigation"]');return first;},querySelectorAll:()=>[first,last],contains:element=>[first,last].includes(element),getClientRects:()=>[{}]};
 let higherOpen=false;
 const doc={activeElement:opener,body:{},querySelectorAll:()=>[shell,...higherOpen?[{getClientRects:()=>[{}]}]:[]],addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name,fn)=>{assert.equal(listeners.get(name),fn);listeners.delete(name);}};
 const context={exports,HTMLElement:Element,document:doc,navigationNarrow:true,left:false,settingsOpen:false,canvasOpen:false,navigation:{current:shell},toggleLeft:()=>{context.left=true;events.push('open');},requestAnimationFrame:fn=>frames.push(fn),cancelAnimationFrame(){}};
 runInNewContext(compile(`exports.open=${handler};exports.mount=${effect}`).outputText,context);
 assert.equal(exports.mount(),undefined);assert.equal(frames.length,0,'A closed drawer cannot take focus');
 exports.open();assert.deepEqual(events,['open']);const cleanup=exports.mount();frames.shift()();assert.equal(doc.activeElement,first);
 const tab=shiftKey=>({key:'Tab',shiftKey,defaultPrevented:false,preventDefault(){events.push('tab contained');}});
 doc.activeElement=last;listeners.get('keydown')(tab(false));assert.equal(doc.activeElement,first);
 listeners.get('keydown')(tab(true));assert.equal(doc.activeElement,last);
 higherOpen=true;listeners.get('keydown')(tab(false));assert.equal(doc.activeElement,last,'A portal dialog or menu owns its own focus');higherOpen=false;
 cleanup();assert.equal(listeners.size,0);frames.shift()();assert.equal(doc.activeElement,opener);
});

test('actual empty work-area tabs stay visible after navigating from Activity, and New chat returns Home',()=>{
 const h=workspaceHarness();let w=h.render();w.openStudioView('activity');w=h.render();assert.equal(w.studioView,'activity');
 for(const section of ['assets','exports','design']){w.selectWorkAreaSection(section);w=h.render();assert.equal(w.studioView,'activity');assert.equal(w.workAreaSection,section);assert.equal(w.workspacePane,'drawing');}
 w.openProperties();w=h.render();assert.equal(w.studioView,'activity');assert.equal(w.propertiesOpen,true);
 w.newTask();w=h.render();assert.equal(w.studioView,'workspace');assert.equal(w.scene,'home');
});
test('actual hook exposes B task-loading while A snapshot remains and synchronously clears cross-account data',()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a'));w=h.render();assert.equal(w.run.id,'a');
 h.window.location.href='https://datumm.test/?task=b';const restore=h.effects.find(fn=>fn.toString().includes("searchParams.get('task')"));assert.ok(restore);restore();
 w=h.render();w.submit('Must not admit a different task');assert.equal(h.chat.finish,undefined);assert.equal(w.busy,true);assert.equal(w.runId,'b');assert.equal(w.run,null);assert.equal(w.scene,'task-loading');assert.equal(w.activeDrawing,null);assert.equal(w.savedSources.length,0);assert.equal(w.workspaceScopeInput.taskId,'b');
 w=h.render('account-b');assert.equal(w.run,null);assert.equal(w.runs.length,0);assert.equal(w.sources.length,0);assert.equal(w.workspaceScopeInput.accountKey,'account-b');assert.equal(w.workspaceScopeInput.taskId,null);
});
test('actual hook remains centered during first admission and binds streamed messages only to its admitted task',async()=>{
 const h=workspaceHarness();let w=h.render();const pending=w.submit('Read the rooms');w=h.render();assert.equal(w.scene,'submitting');assert.equal(w.hasContent,false);
 h.chat.messages=[{id:'answer',role:'assistant',parts:[{type:'text',text:'First table'}]}];h.chat.options.onData({type:'data-run',data:{id:'admitted',clientSubmissionId:h.chat.sent.at(-1)[1].body.clientSubmissionId}});w=h.render();assert.equal(w.scene,'task-loading');assert.equal(w.runId,'admitted');assert.equal(w.run,null);assert.equal(w.messages.length,1);
 w.newTask('project-two');w=h.render();assert.equal(w.scene,'home');assert.equal(w.workspaceScopeInput.sourceKey,'new:project-two');assert.equal(w.messages.length,0);h.chat.finish();await pending;
});
test('late activity from an earlier submission cannot claim the new task or draft',async()=>{
 const h=workspaceHarness();let w=h.render();const first=w.submit('First');const firstId=h.chat.sent.at(-1)[1].body.clientSubmissionId,finishFirst=h.chat.finish;
 w=h.render();w.newTask();w=h.render();const second=w.submit('Second');const secondId=h.chat.sent.at(-1)[1].body.clientSubmissionId,finishSecond=h.chat.finish;assert.notEqual(firstId,secondId);
 w=h.render();h.chat.options.onData({type:'data-run',data:{id:'old',clientSubmissionId:firstId}});w=h.render();assert.equal(w.runId,'');assert.equal(w.scene,'submitting');
 h.chat.options.onData({type:'data-run',data:{id:'new',clientSubmissionId:secondId}});w=h.render();assert.equal(w.runId,'new');
 h.chat.options.onData({type:'data-progress',data:{clientSubmissionId:firstId,record:{index:0,stage:'snapshot',run:task('old')}}});w=h.render();assert.equal(w.runId,'new');assert.equal(w.run,null);
 finishFirst();finishSecond();await Promise.all([first,second]);
});
test('actual drawing/source loader completions from A1 cannot populate A3',async()=>{
 const h=workspaceHarness(),plan={planId:'plan-a',version:1,fingerprint:'fp-a'};
 h.window.desktop={previewAttachment:id=>new Promise(resolve=>{h.sourceFinish=()=>resolve({attachment:{id,name:'Saved A',mime:'image/png'},image:'data:image/png;base64,AA'});})};
 let w=h.render();const a=task('a',{currentPlanRef:{...plan,source:'variable',briefId:'brief-a'},conversation:[{attachmentIds:['attachment-a']}],data:{agent_design:{briefId:'brief-a',candidates:[plan],assumptions:[]}}});w.selectRun(a);w=h.render();
 const sourceEffect=h.effects.findLast(fn=>fn.toString().includes('requestedIds')&&fn.toString().includes('previewAttachment'));
 const drawingEffect=h.effects.findLast(fn=>fn.toString().includes('Saved drawing identity changed'));assert.ok(sourceEffect);assert.ok(drawingEffect);sourceEffect();drawingEffect();
 w.selectRun(task('b'));w=h.render();w.selectRun(a);w=h.render();h.sourceFinish();h.requests.find(row=>row.path.includes('variable/plans/')).resolve({...plan,graph:{rooms:[],assumptions:[]}});await new Promise(resolve=>setImmediate(resolve));
 w=h.render();assert.equal(w.savedSources.length,0);assert.equal(w.designVersion,null);assert.equal(w.activeDrawing,null);
});

test('actual drawing style starts with Hidden line and same-identity retry retains the selected export style',async()=>{
 const h=workspaceHarness(),plan={planId:'plan-style',version:1,fingerprint:'fp-style'};
 let w=h.render();assert.equal(w.drawingStyle,'linework');
 const saved=task('style-task',{currentPlanRef:{...plan,source:'variable',briefId:'brief-style'},data:{agent_design:{briefId:'brief-style',candidates:[plan],assumptions:[]}}});
 w.selectRun(saved);w=h.render();h.effects.findLast(fn=>fn.toString().includes('Saved drawing identity changed'))();
 h.requests.findLast(row=>row.path.includes('variable/plans/')).resolve({...plan,graph:{rooms:[],assumptions:[]}});await new Promise(resolve=>setImmediate(resolve));
 w=h.render();w.setDrawingStyle('presentation');w=h.render();w.setDrawingRetry(value=>value+1);w=h.render();
 h.effects.findLast(fn=>fn.toString().includes('Saved drawing identity changed'))();h.requests.findLast(row=>row.path.includes('variable/plans/')).resolve({...plan,graph:{rooms:[],assumptions:[]}});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.render().drawingStyle,'presentation');
});

test('actual hosted pause coalesces rapid clicks and ignores the old A completion across A-B-A',async()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a',{status:'running'}));w=h.render();
 const first=w.act('pause'),duplicate=w.act('pause');
 const preflight=h.requests.filter(row=>row.path==='/api/service/tasks/a');assert.equal(preflight.length,2,'One reopen read and one pause preflight');
 preflight.at(-1).resolve(task('a',{status:'running',taskVersion:7}));await new Promise(setImmediate);
 const posts=h.requests.filter(row=>row.path==='/api/service/tasks/a/commands');assert.equal(posts.length,1);assert.equal(JSON.parse(posts[0].init.body).command.type,'pause');assert.equal(JSON.parse(posts[0].init.body).expectedTaskVersion,7);
 posts[0].resolve({state:'applied',taskVersion:2});await new Promise(setImmediate);
 const oldRead=h.requests.findLast(row=>row.path==='/api/service/runs/a');assert.ok(oldRead);
 w=h.render();w.selectRun(task('b'));w=h.render();w.selectRun(task('a',{status:'running'}));w=h.render();
 const fresh=w.act('pause');const freshPreflight=h.requests.findLast(row=>row.path==='/api/service/tasks/a');freshPreflight.resolve(task('a',{status:'running',taskVersion:8}));await new Promise(setImmediate);const commands=h.requests.filter(row=>row.path==='/api/service/tasks/a/commands');assert.equal(commands.length,2);w=h.render();assert.equal(w.actionBusy,true);
 oldRead.resolve(task('a',{status:'paused_recovery',title:'old A'}));await first;await duplicate;w=h.render();assert.equal(w.run.title,'a');assert.equal(w.run.status,'running');assert.equal(w.actionBusy,true,'Old finally must not unlock the current action');
 commands[1].reject(Error('offline'));await fresh;w=h.render();assert.equal(w.actionBusy,false);assert.match(w.error,/offline/);
});

test('actual native stop and edit ignore late response, errors and prompt updates after scope or account changes',async()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a',{status:'running'}));w=h.render();
 const stop=w.queueAction('stop'),duplicate=w.queueAction('stop');const posts=h.requests.filter(row=>row.path==='/api/service/tasks/a/cancel');assert.equal(posts.length,1);
 w.selectRun(task('b'));w=h.render();posts[0].resolve({ok:true});await stop;await duplicate;w=h.render();assert.equal(w.run.id,'b');assert.equal(h.requests.filter(row=>row.path==='/api/service/tasks/a').length,1,'No stale post-action read is launched');
 w.selectRun(task('a',{status:'running'}));w=h.render();const edit=w.queueAction('edit',{id:'queued',prompt:'Old queued prompt',mode:'plan',model:'old-model',reasoningEffort:'low'});const request=h.requests.findLast(row=>row.path==='/api/service/tasks/a/queue/queued');
 h.render('account-b');request.resolve({ok:true});await edit;w=h.render('account-b');assert.equal(w.run,null);assert.notEqual(w.prompt,'Old queued prompt');assert.notEqual(w.model,'old-model');assert.equal(w.error,'');
});

test('admitted hosted followup is active despite the preceding terminal snapshot, until its own terminal event',async()=>{
 const h=workspaceHarness(),prior=task('a',{status:'failed',taskVersion:1,eventCursor:1,events:[{index:0,sequence:1,stage:'failed',detail:'Earlier failure'}]});
 let w=h.render();w.selectRun(prior);w=h.render();h.requests.at(-1).resolve(prior);await new Promise(setImmediate);w=h.render();
 const pending=w.submit('Try a focused read');const preflight=h.requests.findLast(row=>row.path==='/api/service/tasks/a');preflight.resolve({...prior,taskVersion:2,eventCursor:2,events:[...prior.events,{index:1,sequence:2,stage:'failed',detail:'Saved failure update'}]});await new Promise(setImmediate);
 h.chat.status='submitted';w=h.render();assert.equal(w.executing,false,'Do not treat a transport submission as admitted');
 const clientSubmissionId=h.chat.sent.at(-1)[1].body.clientSubmissionId;
 h.chat.options.onData({type:'data-run',data:{id:'a',clientSubmissionId}});w=h.render();assert.equal(w.executing,true,'The admitted followup supersedes the preceding failed turn');
 h.chat.options.onData({type:'data-progress',data:{clientSubmissionId,record:{index:2,sequence:3,taskId:'a',stage:'command_accepted',detail:'Accepted chat followup in this task.'}}});w=h.render();assert.equal(w.executing,true);
 h.chat.options.onData({type:'data-progress',data:{clientSubmissionId,record:{index:3,sequence:4,taskId:'a',stage:'needs_input',detail:'Question required'}}});w=h.render();assert.equal(w.executing,false,'A terminal event from this admitted turn takes precedence');
 h.chat.finish();await pending;
});

test('lifecycle preflight refuses stale or foreign snapshots before sending a command',async()=>{
 for(const scenario of ['other-task','foreign-response','same-task-new-epoch','newer-snapshot','account']){
  const h=workspaceHarness();let w=h.render();w.selectRun(task('a',{status:'running'}));w=h.render();const operation=w.act('pause');const read=h.requests.findLast(row=>row.path==='/api/service/tasks/a');
  if(scenario==='other-task'){w.selectRun(task('b'));h.render();}
  if(scenario==='same-task-new-epoch'){w.selectRun(task('b'));w=h.render();w.selectRun(task('a',{status:'running'}));h.render();}
  if(scenario==='newer-snapshot'){w.setRun(task('a',{status:'running',taskVersion:10,eventCursor:3}));h.render();}
  if(scenario==='account')h.render('account-b');
  read.resolve(task(scenario==='foreign-response'?'foreign':'a',{status:'running',taskVersion:9}));await operation;
  assert.equal(h.requests.filter(row=>row.path==='/api/service/tasks/a/commands').length,0,scenario);
 }
});

test('an uncertain lifecycle command retry retains the original envelope without another preflight',async()=>{
 const h=workspaceHarness();let w=h.render();w.selectRun(task('a',{status:'running'}));w=h.render();
 const first=w.taskCommand({type:'pause'});let read=h.requests.findLast(row=>row.path==='/api/service/tasks/a');read.resolve(task('a',{status:'running',taskVersion:8,currentPlanRef:{version:3}}));await new Promise(setImmediate);
 let posts=h.requests.filter(row=>row.path==='/api/service/tasks/a/commands');assert.equal(posts.length,1);const body=posts[0].init.body;posts[0].reject(Error('response lost'));await assert.rejects(first,/response lost/);
 const count=h.requests.filter(row=>row.path==='/api/service/tasks/a').length;const retry=w.taskCommand({type:'pause'});posts=h.requests.filter(row=>row.path==='/api/service/tasks/a/commands');assert.equal(posts.length,2);assert.equal(posts[1].init.body,body);assert.equal(h.requests.filter(row=>row.path==='/api/service/tasks/a').length,count);
 posts[1].resolve({state:'applied',taskVersion:9});await retry;
});

test('existing-task followup locks admission synchronously, preserves a later draft and unlocks after failure',async()=>{
 const h=workspaceHarness(),saved=task('a',{taskVersion:1,eventCursor:0});let w=h.render();w.selectRun(saved);w=h.render();h.requests.at(-1).resolve(saved);await new Promise(setImmediate);w=h.render();
 w.setPrompt('First followup');w=h.render();const first=w.submit();const duplicate=w.submit('Second attempt');
 assert.equal(h.requests.filter(row=>row.path==='/api/service/tasks/a').length,2,'One reopen and one submission preflight');w=h.render();assert.equal(w.busy,true);
 w.setPrompt('Typed while waiting');w=h.render();await w.submit();assert.equal(w.prompt,'Typed while waiting');
 h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve(saved);await new Promise(setImmediate);assert.equal(h.chat.sent.length,1);assert.equal(h.chat.sent[0][0].text,'First followup');
 h.chat.reject(Error('network unavailable'));await first;await duplicate;w=h.render();assert.equal(w.prompt,'Typed while waiting');assert.equal(w.busy,false);assert.match(w.error,/network unavailable/);
});

test('unadmitted followup unlocks on task switch and old failure cannot alter the new account',async()=>{
 const h=workspaceHarness(),saved=task('a',{taskVersion:1,eventCursor:0});let w=h.render();w.selectRun(saved);w=h.render();h.requests.at(-1).resolve(saved);await new Promise(setImmediate);w=h.render();
 const first=w.submit('First followup');h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve(saved);await new Promise(setImmediate);assert.equal(h.chat.sent.length,1);
 w=h.render();w.newTask();w=h.render();assert.equal(w.busy,false);w.setPrompt('New task draft');w=h.render();
 h.chat.reject(Error('old failure'));await first;w=h.render();assert.equal(w.prompt,'New task draft');assert.equal(w.error,'');assert.equal(w.busy,false);
 const second=w.submit('New task prompt');w=h.render();assert.equal(w.busy,true);h.render('account-b');h.chat.reject(Error('previous account failure'));await second;w=h.render('account-b');assert.equal(w.run,null);assert.equal(w.error,'');assert.equal(w.busy,false);
});

test('known fetch failure has plain connection guidance and preserves the draft',async()=>{
 const h=workspaceHarness();let w=h.render();w.setPrompt('Ask a question');w=h.render();const first=w.submit();assert.equal(h.chat.sent.length,1);h.chat.reject(Error('Failed to fetch'));await first;w=h.render();
 assert.equal(w.prompt,'Ask a question');assert.equal(w.error,'DATUMM could not be reached. Your prompt is preserved; check the saved task before retrying.');assert.equal(w.busy,false);
});

test('followup stream starts after fresh preflight cursor and an uncertain retry reuses the original cursor',async()=>{
 const h=workspaceHarness(),old=task('a',{status:'completed',taskVersion:1,eventCursor:1,events:[{index:0,sequence:1,stage:'answer',detail:'Earlier answer'}]});
 const latest=task('a',{status:'completed',taskVersion:2,eventCursor:2,events:[...old.events,{index:1,sequence:2,stage:'failed',detail:'Earlier failure'}]});
 let w=h.render();w.selectRun(old);w=h.render();h.requests.at(-1).resolve(old);await new Promise(setImmediate);w=h.render();
 const first=w.submit('New followup');h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve(latest);await new Promise(setImmediate);
 assert.equal(h.chat.sent.length,1);const original=JSON.parse(JSON.stringify(h.chat.sent[0][1].body));assert.equal(original.eventCursor,2,'The stream must not replay events preceding the preflight snapshot');assert.equal(original.expectedTaskVersion,2);
 h.chat.reject(Error('response lost'));await first;w=h.render();w.setRun({...latest,taskVersion:3,eventCursor:3,events:[...latest.events,{index:2,sequence:3,stage:'completed',detail:'Later event'}]});w=h.render();
 const reads=h.requests.filter(row=>row.path==='/api/service/tasks/a').length;const retry=w.submit('New followup');await new Promise(setImmediate);
 assert.equal(h.chat.sent.length,2);const retryBody=JSON.parse(JSON.stringify(h.chat.sent[1][1].body));assert.notEqual(retryBody.clientSubmissionId,original.clientSubmissionId);delete retryBody.clientSubmissionId;delete original.clientSubmissionId;assert.deepEqual(retryBody,original);assert.equal(h.requests.filter(row=>row.path==='/api/service/tasks/a').length,reads,'An uncertain retry retains its original request without a new preflight');
 h.chat.finish();await retry;
});

test('pending stop is task-scoped, blocks duplicate actions and clears on reconciliation or a new turn',async()=>{
 const h=workspaceHarness(),events=[{index:0,sequence:1,stage:'command_accepted',detail:'Accepted cancel in this task.',taskId:'a'},{index:1,sequence:2,stage:'cancel_requested',detail:'Stop requested',taskId:'a'}];
 let w=h.render();w.selectRun(task('a',{status:'paused_recovery',eventCursor:2,events}));w=h.render();assert.equal(w.cancelPending,true);assert.equal(w.busy,true);
 const count=h.requests.length;await w.act('cancel');await w.queueAction('stop');await w.submit('Do not send');assert.equal(h.requests.length,count);assert.equal(h.chat.sent.length,0);
 w.setRun(task('a',{status:'reconciling',eventCursor:3,events:[...events,{index:2,sequence:3,stage:'reconciling',detail:'Checking'}]}));w=h.render();assert.equal(w.cancelPending,false);
 w.selectRun(task('b',{status:'running',eventCursor:3,events:[...events,{index:2,sequence:3,taskId:'b',stage:'running',detail:'Working'}]}));w=h.render();assert.equal(w.cancelPending,false);
});

test('queue edit transfers to an empty draft before removal and preserves later typing or uncertain removal',async()=>{
 const h=workspaceHarness(),item={id:'q1',prompt:'Queued text',mode:'plan',model:'model',reasoningEffort:'high'};let w=h.render();w.selectRun(task('a',{status:'running'}));w=h.render();
 w.setPrompt('Existing text');w=h.render();const count=h.requests.length;await w.queueAction('edit',item);w=h.render();assert.equal(h.requests.length,count);assert.equal(w.prompt,'Existing text');
 w.setPrompt('');w=h.render();const edit=w.queueAction('edit',item);w=h.render();assert.equal(w.prompt,'Queued text');const removal=h.requests.findLast(row=>row.path==='/api/service/tasks/a/queue/q1');assert.ok(removal);
 w.setPrompt('Queued text plus new typing');w=h.render();removal.reject(Error('lost response'));await edit;w=h.render();assert.equal(w.prompt,'Queued text plus new typing');assert.match(w.error,/removal could not be confirmed/i);
});

async function workspaceDrawing(h, id='a'){
 const plan={planId:`plan-${id}`,version:2,fingerprint:`fp-${id}`};
 const saved=task(id,{taskVersion:1,eventCursor:0,currentPlanRef:{...plan,source:'variable',briefId:`brief-${id}`},data:{agent_design:{briefId:`brief-${id}`,candidates:[plan],assumptions:[]}}});
 let w=h.render();w.selectRun(saved);w=h.render();
 const loader=h.effects.findLast(fn=>fn.toString().includes('Saved drawing identity changed'));assert.ok(loader);loader();
 h.requests.findLast(row=>row.path.includes(`variable/plans/${plan.planId}/versions/2`)).resolve({...plan,graph:{rooms:[],assumptions:[]}});await new Promise(setImmediate);
 w=h.render();assert.equal(w.drawingCurrent,true);return {w,saved,plan};
}

test('comparison keeps its successful pair and geometry when a later explicit comparison fails',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const other={planId:'alt',version:1,fingerprint:'alt-fp'};
 w.setRun({...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}});w=h.render();
 const first=w.compareDrawing('previous');assert.equal(h.render().comparisonLoading,true);
 h.requests.findLast(row=>row.path.endsWith('/plan-a/versions/1')).resolve({planId:'plan-a',version:1,fingerprint:'prior',graph:{rooms:[]}});await new Promise(setImmediate);
 h.requests.findLast(row=>row.path.includes('/variable/diff?')).resolve({changedRooms:[{key:'r'}],siteChanged:false});await first;w=h.render();
 assert.equal(w.comparisonKind,'previous');assert.equal(w.compareVersion.version,1);assert.equal(w.designDiff,'1 rooms changed.');
 const next=w.compareDrawing('alternative');const candidate=h.requests.findLast(row=>row.path.endsWith('/alt/versions/1'));
 candidate.resolve({...other,fingerprint:'wrong'});await next;w=h.render();
 assert.match(w.comparisonError,/identity changed/);assert.equal(w.comparisonLoading,false);assert.equal(w.comparisonKind,'previous');assert.equal(w.compareVersion.fingerprint,'prior');assert.equal(w.drawingError,'');assert.equal(w.drawingCurrent,true);
 w.setRun({...saved,taskVersion:3,currentPlanRef:{...saved.currentPlanRef,version:3,fingerprint:'new'}});w=h.render();assert.equal(w.compareVersion,null);assert.equal(w.comparisonError,'');
});

test('uncertain alternative selection blocks approval until read-only exact task reconciliation',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const other={planId:'alt',version:1,fingerprint:'alt-fp'},next={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}};
 w.setRun(next);w=h.render();const selection={scope:{...w.workspaceScopeInput,epoch:1},taskId:'a',briefId:'brief-a',plan:other};
 const operation=w.selectAlternative(selection);h.requests.findLast(row=>row.path.endsWith('/alt/versions/1')).resolve({...other,graph:{rooms:[],assumptions:[]}});await new Promise(setImmediate);
 h.requests.findLast(row=>row.path.endsWith('/brief-a/alternatives')).resolve({selectionRevision:4});await new Promise(setImmediate);
 h.requests.findLast(row=>row.path.endsWith('/brief-a/selection')).reject(Error('Lost reply'));await operation;w=h.render();
 assert.equal(w.selectionUncertain,true);assert.equal(w.drawingCurrent,false);assert.equal(w.drawingError,'');assert.ok(w.designVersion);assert.match(w.selectionError,/confirm/i);
 const count=h.requests.length;await w.acceptDrawing();assert.equal(h.requests.length,count,'No approval sent while selection is uncertain');
 let reconcile=w.reconcilePlanSelection();h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve(next);await reconcile;w=h.render();assert.equal(w.selectionUncertain,true,'Old task reference cannot confirm the requested selection');
 reconcile=w.reconcilePlanSelection();h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve({...next,taskVersion:1,currentPlanRef:{...other,source:'variable',briefId:'brief-a'}});await reconcile;w=h.render();assert.equal(w.selectionUncertain,true,'Stale task revisions cannot confirm selection');
 reconcile=w.reconcilePlanSelection();h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve({...next,taskVersion:3,currentPlanRef:{...other,source:'variable',briefId:'brief-a'}});await reconcile;w=h.render();
 assert.equal(w.selectionUncertain,false);assert.equal(w.designVersion.fingerprint,'alt-fp');assert.equal(w.drawingCurrent,true);
 assert.equal(h.requests.filter(row=>row.path.endsWith('/brief-a/selection')).length,1,'Reconciliation never repeats selection mutation');
});

test('selection marker survives remount and task switches, is account isolated, and blocks stale Build callbacks',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const other={planId:'alt',version:1,fingerprint:'alt-fp'},next={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}};
 w.setRun(next);w=h.render();const staleBuild=w.switchDrawingToBuild,selection={scope:{...w.workspaceScopeInput,epoch:1},taskId:'a',briefId:'brief-a',plan:other};
 const operation=w.selectAlternative(selection);h.requests.findLast(row=>row.path.endsWith('/alt/versions/1')).resolve({...other,graph:{rooms:[],assumptions:[]}});await new Promise(setImmediate);
 h.requests.findLast(row=>row.path.endsWith('/brief-a/alternatives')).resolve({selectionRevision:4});await new Promise(setImmediate);
 const post=h.requests.findLast(row=>row.path.endsWith('/brief-a/selection'));assert.ok(post);
 const count=h.requests.length;await staleBuild();assert.equal(h.requests.length,count,'Captured Build closure cannot issue a command after marker creation');
 post.reject(Error('Lost reply'));await operation;w=h.render();assert.equal(w.selectionUncertain,true);
 w.selectRun(task('b'));w=h.render();w.selectRun(next);w=h.render();assert.equal(w.selectionUncertain,true,'A-B-A retains the marker');
 const fresh=workspaceHarness(h.storage);let a=fresh.render();a.selectRun(next);a=fresh.render();assert.equal(a.selectionUncertain,true,'Remount restores marker before approval can be exposed');
 let b=fresh.render('account-b');b.selectRun(next);b=fresh.render('account-b');assert.equal(b.selectionUncertain,false,'Another account does not inherit the marker');
 const check=workspaceHarness(h.storage);let c=check.render();c.selectRun(next);c=check.render();const reconcile=c.reconcilePlanSelection();
 check.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve({...next,taskVersion:3,currentPlanRef:{...other,source:'variable',briefId:'brief-a'}});await new Promise(setImmediate);
 check.requests.findLast(row=>row.path.endsWith('/alt/versions/1')).resolve({...other,graph:{rooms:[],assumptions:[]}});await reconcile;c=check.render();assert.equal(c.selectionUncertain,false);assert.equal(c.drawingCurrent,true);
 const after=workspaceHarness(h.storage);let reopened=after.render();reopened.selectRun(next);reopened=after.render();assert.equal(reopened.selectionUncertain,false,'Confirmed selection clears the stored marker');
});

test('failed durable marker write prevents alternative selection POST',async()=>{
 const storage={getItem:()=>null,setItem(){throw Error('storage disabled');},removeItem(){}};
 const h=workspaceHarness(storage);let {w,saved}=await workspaceDrawing(h);const other={planId:'alt',version:1,fingerprint:'alt-fp'},next={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}};
 w.setRun(next);w=h.render();const operation=w.selectAlternative({scope:{...w.workspaceScopeInput,epoch:1},taskId:'a',briefId:'brief-a',plan:other});
 h.requests.findLast(row=>row.path.endsWith('/alt/versions/1')).resolve({...other,graph:{rooms:[],assumptions:[]}});await new Promise(setImmediate);h.requests.findLast(row=>row.path.endsWith('/brief-a/alternatives')).resolve({selectionRevision:4});await operation;w=h.render();
 assert.equal(h.requests.some(row=>row.path.endsWith('/brief-a/selection')),false);assert.match(w.selectionError,/not sent.*browser storage/i);
});

test('exclusive marker claims serialize competing tabs and reject a different clear',async()=>{
 const h=workspaceHarness(),locks=fakeLocks(),a={planId:'a',version:1,fingerprint:'a-fp'},b={planId:'b',version:1,fingerprint:'b-fp'};
 const claims=await Promise.all([selectionMarker.claimSelectionMarker(h.storage,locks,'account-a','task','brief',a),selectionMarker.claimSelectionMarker(h.storage,locks,'account-a','task','brief',b)]);
 assert.deepEqual(claims,[true,false]);assert.equal(await selectionMarker.releaseSelectionMarker(h.storage,locks,'account-a','task','brief',b),false);
 assert.deepEqual(selectionMarker.readSelectionMarker(h.storage,'account-a','task','brief').plan,a);
 assert.equal(await selectionMarker.releaseSelectionMarker(h.storage,locks,'account-a','task','brief',a,()=>false),false);
 assert.equal(await selectionMarker.releaseSelectionMarker(h.storage,locks,'account-a','task','brief',a),true);
});

test('unavailable browser locks prevent the alternative selection POST',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const other={planId:'alt',version:1,fingerprint:'alt-fp'},next={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}};
 w.setRun(next);w=h.render();h.window.navigator.locks=null;const operation=w.selectAlternative({scope:{...w.workspaceScopeInput,epoch:1},taskId:'a',briefId:'brief-a',plan:other});
 await operation;w=h.render();
 assert.equal(h.requests.some(row=>row.path.endsWith('/brief-a/selection')),false);assert.match(w.selectionError,/locking is unavailable/i);
});

test('selection waits for an in-flight binding and the mutation lock releases on failure or stale scope',async()=>{
 for(const stale of [false,true]){
  const locks=fakeLocks(),first=workspaceHarness(undefined,locks),second=workspaceHarness(first.storage,locks);
  let {w:owner}=await workspaceDrawing(first),{w:contender,saved}=await workspaceDrawing(second);
  const other={planId:'alt',version:1,fingerprint:'alt-fp'},next={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}};
  contender.setRun(next);contender=second.render();const selection={scope:{...contender.workspaceScopeInput,epoch:1},taskId:'a',briefId:'brief-a',plan:other};
  const binding=owner.acceptDrawing(),preflight=first.requests.findLast(row=>row.path.endsWith('/brief-a/alternatives'));assert.ok(preflight);
  const queued=contender.selectAlternative(selection);assert.equal(second.requests.some(row=>row.path.endsWith('/alt/versions/1')),false,'No selection read or write starts while binding holds the lock');
  if(stale){contender.selectRun(task('b'));second.render();}
  preflight.reject(Error('binding unavailable'));await binding;await new Promise(setImmediate);
  const candidate=second.requests.findLast(row=>row.path.endsWith('/alt/versions/1'));
  if(stale){assert.equal(candidate,undefined,'A queued stale scope performs no mutation');await queued;}
  else{assert.ok(candidate,'Failure releases the lock for the waiting operation');candidate.reject(Error('selection unavailable'));await queued;
   contender=second.render();const again=contender.selectAlternative(selection);const retry=second.requests.findLast(row=>row.path.endsWith('/alt/versions/1'));assert.notEqual(retry,candidate,'Failed selection also releases the lock');retry.reject(Error('still unavailable'));await again;
  }
  assert.equal(first.requests.some(row=>row.path.endsWith('/brief-a/selection')),false);assert.equal(second.requests.some(row=>row.path.endsWith('/brief-a/selection')),false);
 }
});

test('Build and reconciliation wait for the original selection POST and recheck its marker',async()=>{
 const locks=fakeLocks(),first=workspaceHarness(undefined,locks),second=workspaceHarness(first.storage,locks),third=workspaceHarness(first.storage,locks);let {w:owner,saved}=await workspaceDrawing(first),{w:contender}=await workspaceDrawing(second),{w:continuing}=await workspaceDrawing(third);
 const other={planId:'alt',version:1,fingerprint:'alt-fp'},next={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[...saved.data.agent_design.candidates,other]}}};
 owner.setRun(next);owner=first.render();contender.setRun(next);contender=second.render();continuing.setRun(next);continuing=third.render();const staleBuild=contender.switchDrawingToBuild;
 const selection=owner.selectAlternative({scope:{...owner.workspaceScopeInput,epoch:1},taskId:'a',briefId:'brief-a',plan:other});
 const queuedBuild=staleBuild(),queuedContinue=continuing.continueDesignBuild(),thirdBefore=third.requests.length,readsBefore=second.requests.filter(row=>row.path==='/api/service/tasks/a').length;
 first.requests.findLast(row=>row.path.endsWith('/alt/versions/1')).resolve({...other,graph:{rooms:[],assumptions:[]}});await new Promise(setImmediate);
 first.requests.findLast(row=>row.path.endsWith('/brief-a/alternatives')).resolve({selectionRevision:4});await new Promise(setImmediate);
 const post=first.requests.findLast(row=>row.path.endsWith('/brief-a/selection'));assert.ok(post);contender=second.render();assert.equal(contender.selectionUncertain,true);
 const reconcile=contender.reconcilePlanSelection();assert.equal(second.requests.filter(row=>row.path==='/api/service/tasks/a').length,readsBefore,'Reconciliation waits while POST is in flight');
 post.reject(Error('Lost response'));await selection;await queuedBuild;await queuedContinue;await new Promise(setImmediate);
 assert.equal(second.requests.some(row=>row.path==='/api/service/tasks/a/commands'),false,'Queued Build rechecks the marker before admission');
 assert.equal(third.requests.length,thirdBefore,'Queued continue also rechecks the marker');
 assert.equal(second.requests.filter(row=>row.path==='/api/service/tasks/a').length,readsBefore+1);
 second.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve(next);await reconcile;assert.equal(second.render().selectionUncertain,true);
});

test('invalid or inaccessible selection markers fail closed instead of permitting approval',async()=>{
 const h=workspaceHarness();let {w}=await workspaceDrawing(h);
 selectionMarker.writeSelectionMarker(h.storage,'account-a','a','brief-a',{planId:'alt',version:1,fingerprint:'fp'});
 const recorded={getItem:()=>'{invalid',setItem(){},removeItem(){}};h.window.localStorage=recorded;
 w=h.render();assert.equal(w.selectionUncertain,true);assert.match(w.selectionError,/unavailable or invalid/);const before=h.requests.length;await w.switchDrawingToBuild();assert.equal(h.requests.length,before);
 const inaccessible={getItem(){throw Error('denied');},setItem(){throw Error('denied');},removeItem(){throw Error('denied');}};h.window.localStorage=inaccessible;w=h.render();assert.equal(w.selectionUncertain,true);assert.equal(selectionMarker.readSelectionMarker(inaccessible,'account-a','a','brief-a').status,'unavailable');
});

test('another tab marker blocks a stale action immediately and its storage event updates the view',async()=>{
 const first=workspaceHarness();const second=workspaceHarness(first.storage);let {w}=await workspaceDrawing(second);
 const effect=second.effects.findLast(fn=>fn.toString().includes('datumm-selection-uncertain:'));assert.ok(effect);effect();
 const stale=w.switchDrawingToBuild,plan={planId:'alt',version:1,fingerprint:'fp'};
 assert.equal(selectionMarker.writeSelectionMarker(first.storage,'account-a','a','brief-a',plan),true);
 assert.equal(selectionMarker.writeSelectionMarker(first.storage,'account-a','a','brief-a',{...plan,planId:'other'}),false,'An unresolved marker is not overwritten');
 assert.equal(selectionMarker.clearSelectionMarker(first.storage,'account-a','a','brief-a',{...plan,planId:'other'}),false,'A different pending tuple cannot be cleared');
 const before=second.requests.length;await stale();assert.equal(second.requests.length,before,'Storage is checked before the cross-tab event arrives');
 second.listeners.get('storage')({key:'datumm-selection-uncertain:changed'});w=second.render();assert.equal(w.selectionUncertain,true);
});

test('reconciliation cannot clear the marker after the current task changes during drawing read',async()=>{
 const h=workspaceHarness(),other={planId:'alt',version:1,fingerprint:'fp'};selectionMarker.writeSelectionMarker(h.storage,'account-a','a','brief-a',other);
 const saved=task('a',{taskVersion:2,eventCursor:1,currentPlanRef:{planId:'old',version:1,fingerprint:'old',source:'variable',briefId:'brief-a'},data:{agent_design:{briefId:'brief-a',candidates:[other],assumptions:[]}}});
 let w=h.render();w.selectRun(saved);w=h.render();assert.equal(w.selectionUncertain,true);
 const pending=w.reconcilePlanSelection();h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve({...saved,taskVersion:3,currentPlanRef:{...other,source:'variable',briefId:'brief-a'}});await new Promise(setImmediate);
 const drawing=h.requests.findLast(row=>row.path.endsWith('/alt/versions/1'));assert.ok(drawing);
 w=h.render();w.setRun({...saved,taskVersion:4,eventCursor:2,currentPlanRef:{planId:'new',version:1,fingerprint:'new',source:'variable',briefId:'brief-a'}});w=h.render();
 drawing.resolve({...other,graph:{rooms:[],assumptions:[]}});await pending;w=h.render();assert.equal(w.selectionUncertain,true);assert.equal(w.actionBusy,false);assert.ok(selectionMarker.readSelectionMarker(h.storage,'account-a','a','brief-a').plan);
});

test('plan revision requires the exact current drawing and never changes mode or sends',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const owner=h.effects.findLast(fn=>fn.toString().includes('draftOwner.current ='));owner();w=h.render();w.setMode('build');w.setPrompt('Existing');w=h.render();
 const stale=w.preparePlanRevision,count=h.requests.length;assert.equal(stale(),true);w=h.render();assert.equal(w.mode,'build');assert.match(w.prompt,/^Existing[\s\S]*Revise the task brief/);assert.equal(h.requests.length,count);assert.equal(h.chat.sent.length,0);
 w.setRun({...saved,taskVersion:2,status:'needs_input',data:{...saved.data,agent_question:{id:'q',question:'Need input'}}});w=h.render();assert.equal(stale(),false);assert.equal(w.preparePlanRevision(),false);assert.match(w.planRevisionBlockedReason,/pending question/i);
 w.setRun({...saved,taskVersion:3,currentPlanRef:{...saved.currentPlanRef,version:3,fingerprint:'changed'}});w=h.render();assert.equal(stale(),false);assert.equal(w.preparePlanRevision(),false);assert.match(w.planRevisionBlockedReason,/current drawing/i);
});

test('same-task drawing replacement discards a deferred comparison before it can request or show a diff',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const comparing=w.compareDrawing();
 const prior=h.requests.findLast(row=>row.path==='/api/service/variable/plans/plan-a/versions/1');assert.ok(prior);
 w.setRun({...saved,taskVersion:2,currentPlanRef:{...saved.currentPlanRef,version:3,fingerprint:'fp-new'}});w=h.render();
 prior.resolve({planId:'plan-a',version:1,fingerprint:'fp-old',graph:{rooms:[]}});await comparing;w=h.render();
 assert.equal(w.compareVersion,null);assert.equal(w.designDiff,'');assert.equal(w.drawingError,'');assert.equal(w.actionBusy,false);
 assert.equal(h.requests.some(row=>row.path.includes('/variable/diff?')),false);
});

test('old comparison finally cannot unlock a newer placement read',async()=>{
 const h=workspaceHarness();let {w}=await workspaceDrawing(h);w.setDeviceId('device-a');w=h.render();const comparing=w.compareDrawing();
 const prior=h.requests.findLast(row=>row.path==='/api/service/variable/plans/plan-a/versions/1');w=h.render();const placement=w.reviewPlacement();w=h.render();assert.equal(w.actionBusy,true);
 prior.resolve({planId:'plan-a',version:1,fingerprint:'old'});await comparing;w=h.render();assert.equal(w.actionBusy,true);
 h.requests.findLast(row=>row.path.includes('/build-context?')).resolve({sessionId:'s',documentId:'d',revision:1,plans:[]});await placement;assert.equal(h.render().actionBusy,false);
});

test('delayed selection binding never posts an old plan after task or exact drawing change',async()=>{
 for(const change of ['task','aba','plan']){
  const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const accepting=w.acceptDrawing();const read=h.requests.findLast(row=>row.path==='/api/service/variable/briefs/brief-a/alternatives');assert.ok(read);
  if(change==='task'){w.selectRun(task('b'));h.render();}
  if(change==='aba'){w.selectRun(task('b'));w=h.render();w.selectRun(saved);h.render();}
  if(change==='plan'){w.setRun({...saved,taskVersion:2,currentPlanRef:{...saved.currentPlanRef,version:3,fingerprint:'new'}});h.render();}
  read.resolve({selectionRevision:1});await accepting;
  assert.equal(h.requests.some(row=>row.path==='/api/service/variable/briefs/brief-a/selection'),false,change);
 }
});

test('placement read rejects an old task or device without clearing a newer action',async()=>{
 for(const change of ['task','aba','device']){
  const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);w.setDeviceId('device-a');w=h.render();const first=w.reviewPlacement();const old=h.requests.findLast(row=>row.path.includes('/build-context?'));
  if(change==='task'){w.selectRun(task('b'));w=h.render();}
  if(change==='aba'){w.selectRun(task('b'));w=h.render();w.selectRun(saved);w=h.render();}
  if(change==='device'){w.setDeviceId('device-b');w=h.render();}
  const next=w.reviewPlacement();w=h.render();old.resolve({sessionId:'old',documentId:'old-document',revision:1,plans:[]});await first;w=h.render();assert.notEqual(w.placementContext?.documentId,'old-document');assert.equal(w.actionBusy,true,change);
  h.requests.findLast(row=>row.path.includes('/build-context?')).resolve({sessionId:'new',documentId:'new-document',revision:2,plans:[]});await next;w=h.render();assert.equal(w.placementContext.documentId,'new-document');assert.equal(w.actionBusy,false);
 }
});

test('stale comparison diff and stale selection response never update the new drawing or send acceptance',async()=>{
 for(const action of ['compare','accept']){
  const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const operation=action==='compare'?w.compareDrawing():w.acceptDrawing();
  if(action==='compare')h.requests.findLast(row=>row.path==='/api/service/variable/plans/plan-a/versions/1').resolve({planId:'plan-a',version:1,fingerprint:'old'});
  else h.requests.findLast(row=>row.path==='/api/service/variable/briefs/brief-a/alternatives').resolve({selectionRevision:1});
  await new Promise(setImmediate);const pending=h.requests.findLast(row=>action==='compare'?row.path.includes('/variable/diff?'):row.path==='/api/service/variable/briefs/brief-a/selection');assert.ok(pending);
  w=h.render();w.setRun({...saved,taskVersion:2,currentPlanRef:{...saved.currentPlanRef,version:3,fingerprint:'new'}});h.render();
  pending.resolve(action==='compare'?{changedRooms:[{key:'old'}],siteChanged:true}:{selectionRevision:2,selected:{planId:'plan-a',version:2,fingerprint:'fp-a'}});await operation;w=h.render();
  assert.equal(w.compareVersion,null);assert.equal(w.designDiff,'');assert.equal(h.requests.some(row=>row.path==='/api/service/tasks/a/commands'),false);
 }
});

test('retained placement context is invalidated by device A-B-A and task A-B-A',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);w.setDeviceId('device-a');w=h.render();const read=w.reviewPlacement();
 h.requests.findLast(row=>row.path.includes('/build-context?')).resolve({sessionId:'s',documentId:'old-document',revision:1,plans:[]});await read;w=h.render();assert.equal(w.placementContext.documentId,'old-document');
 w.setDeviceId('device-b');w=h.render();assert.equal(w.placementContext,null);w.setDeviceId('device-a');w=h.render();assert.equal(w.placementContext,null,'Returning to a device requires a fresh read');
 const fresh=w.reviewPlacement();h.requests.findLast(row=>row.path.includes('/build-context?')).resolve({sessionId:'s2',documentId:'fresh-document',revision:2,plans:[]});await fresh;w=h.render();assert.equal(w.placementContext.documentId,'fresh-document');
 w.selectRun(task('b'));w=h.render();w.selectRun(saved);w=h.render();assert.equal(w.placementContext,null,'Returning to a task must not restore the earlier model context');
});

test('a candidate with a different fingerprint cannot be selected behind the displayed drawing',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);const altered={...saved,taskVersion:2,data:{...saved.data,agent_design:{...saved.data.agent_design,candidates:[{planId:'plan-a',version:2,fingerprint:'other'}]}}};
 w.setRun(altered);w=h.render();await w.acceptDrawing();w=h.render();assert.match(w.drawingError,/differs from the displayed drawing/);assert.equal(h.requests.some(row=>row.path==='/api/service/variable/briefs/brief-a/alternatives'),false);
});

test('accepting the exact drawing without a device does not start Build or placement',async()=>{
 const h=workspaceHarness();let {w,saved}=await workspaceDrawing(h);w.setMode('build');w=h.render();const accepting=w.acceptDrawing();
 h.requests.findLast(row=>row.path==='/api/service/variable/briefs/brief-a/alternatives').resolve({selectionRevision:4});await new Promise(setImmediate);
 const selection=h.requests.findLast(row=>row.path==='/api/service/variable/briefs/brief-a/selection');assert.ok(selection);selection.resolve({selectionRevision:5,selected:{planId:'plan-a',version:2,fingerprint:'fp-a'}});await new Promise(setImmediate);
 const command=h.requests.findLast(row=>row.path==='/api/service/tasks/a/commands');assert.ok(command);const body=JSON.parse(command.init.body);assert.equal(body.command.type,'accept_plan');assert.equal(body.command.plan.fingerprint,'fp-a');
 command.resolve({state:'applied',taskVersion:2});await new Promise(setImmediate);
 h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve({...saved,taskVersion:2});await accepting;w=h.render();assert.equal(w.actionBusy,false);assert.equal(w.drawingError,'');
 assert.equal(h.requests.filter(row=>row.path==='/api/service/tasks/a/commands').length,1,'Acceptance is the only task command');
 assert.equal(h.requests.some(row=>row.path.includes('/build-context?')),false,'Acceptance does not inspect native placement');
 assert.equal(w.buildSetupOpen,false);
});

// @lat: [[contracts#Hosted contract tests#Frontend context and display actions]]
test('the browser sends the frontend context only when the backend reports the capability on', async()=>{
 const config=features=>({runtime:'opencode',models:['m'],defaultModel:'m',nativeAvailable:true,...(features?{capabilities:{version:1,features}}:{})});
 const sentContext=async features=>{
  const h=workspaceHarness();let w=h.render();
  const refreshing=w.refresh();
  for(const request of h.requests.splice(0)){
   if(request.path.endsWith('/config'))request.resolve(config(features));
   else request.resolve(request.path.endsWith('/devices')||request.path.includes('/runs')?[]:{});
  }
  await refreshing;w=h.render();w.setPrompt('Ask a question');w=h.render();
  const sending=w.submit();await tick();
  const body=h.chat.sent[0][1].body;h.chat.finish?.();await sending.catch(()=>{});
  return body.frontendContext;
 };
 assert.equal(await sentContext(undefined),undefined,'unknown is off');
 assert.equal(await sentContext({frontendContext:false}),undefined);
 const envelope=await sentContext({frontendContext:true,displayActions:false});
 assert.deepEqual(Object.keys(envelope),['v','viewport','workArea','selection','actions']);
 assert.deepEqual(envelope.actions,[],'no actions are advertised while displayActions is off');
 assert.equal(envelope.selection,null);
 assert.deepEqual((await sentContext({frontendContext:true,displayActions:true})).actions,['open_work_area','expand_process','scroll_to_turn','suggest_followup']);
});

test('a chat_followup sends the envelope; the live submission is keyed by its command key and dropped on failure',async()=>{
 const prior=task('a',{taskVersion:1,eventCursor:1});
 const config={runtime:'opencode',models:['m'],defaultModel:'m',nativeAvailable:true,
  capabilities:{version:1,features:{frontendContext:true,displayActions:true}}};
 for(const failure of ['rejected','chatError']){
  const h=workspaceHarness();let w=h.render();
  const refreshing=w.refresh();
  for(const request of h.requests.splice(0)){
   if(request.path.endsWith('/config'))request.resolve(config);
   else request.resolve(request.path.endsWith('/devices')||request.path.includes('/runs')?[]:{});
  }
  await refreshing;w=h.render();
  w.selectRun(prior);h.requests.at(-1).resolve(prior);await tick();w=h.render();
  const sending=w.submit('Follow up on the rooms');
  h.requests.findLast(row=>row.path==='/api/service/tasks/a').resolve(prior);await tick();
  const body=h.chat.sent.at(-1)[1].body;
  assert.equal(body.taskId,'a');assert.equal(body.frontendContext.v,1,'a follow-up carries the envelope');
  // The idempotency key is the command id, which the backend reports as the turn id.
  assert.equal(w.liveSubmission.current.key,body.idempotencyKey);
  assert.deepEqual(w.liveSubmission.current.scope,w.displayScope());
  if(failure==='rejected'){h.chat.reject(Error('offline'));await sending;}
  else{h.chat.error=Error('refused');w=h.render();h.effects.findLast(fn=>fn.toString().includes('dropOptimistic(pending.text)'))();}
  assert.equal(w.liveSubmission.current,null,failure);
 }
});

test('N4 workspace keeps provider inputs and the context value stable across re-renders',()=>{
 // Memoizing hooks, one slot list per component, so useCallback/useMemo identity is observable.
 const memoHooks=()=>{const slots=[];let cursor=0;const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const memo=(make,deps)=>{const i=cursor++;if(slots[i]&&same(slots[i].deps,deps))return slots[i].value;slots[i]={deps,value:make()};return slots[i].value;};
  return {reset(){cursor=0;},hooks:{...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),useEffect(){},useLayoutEffect(){}}};};
 const text=source('src/components/workspace.tsx'),ast=ts.createSourceFile('workspace.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='WorkspaceContent');
 const content=memoHooks(),feedback={votes:null},exports={};
 runInNewContext(compile(fn.getText(ast)+'\nexports.WorkspaceContent=WorkspaceContent;').outputText,{exports,...content.hooks,useAnswerFeedback:()=>feedback,featureEnabled:()=>true,OutputWorkspaceProvider:'provider',WorkspacePanels:'panels',require:name=>name==='react/jsx-runtime'?jsx:{}});
 const input=scope('a');delete input.epoch;const calls=[];
 const workspace=n=>({workspaceScopeInput:input,capabilities:{},setConnectionNotice(){},closeProperties(){calls.push(n);},setCanvasOpen(){},selectWorkAreaSection(){},workAreaSection:'assets'});
 const props=n=>{content.reset();return exports.WorkspaceContent({w:workspace(n)}).props;};
 const first=props(1),second=props(2);
 assert.equal(second.onOpenReport,first.onOpenReport);assert.equal(second.onOpen,first.onOpen);
 second.onOpen();assert.deepEqual(calls,[2],'the stable callback still reads the latest workspace state');
 const provider=memoHooks(),api={};
 runInNewContext(compile(source('src/components/workspace/output-workspace.tsx')).outputText,{exports:api,document:{activeElement:null},HTMLElement:class{},require(name){if(name==='react')return provider.hooks;if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.module.css'))return {default:{}};return {};}});
 const value=p=>{provider.reset();const {children:_children,...rest}=p;return api.OutputWorkspaceProvider(rest).props.value;};
 const before=value(first);props(3);assert.equal(value(props(4)),before);
});

test('queue send reports only a turn this call started, and Build tasks never queue',async()=>{
 const h=workspaceHarness();let w=h.render();const first=w.submit('Same text');
 h.chat.options.onData({type:'data-run',data:{id:'admitted',clientSubmissionId:h.chat.sent.at(-1)[1].body.clientSubmissionId}});
 h.chat.finish();await first;w=h.render();
 // The task is still loading, so this send returns early without starting anything.
 assert.equal(await queueEnv.current.send('Same text','model','ask'),false);
 assert.equal(h.chat.sent.length,1);
 for(const [run,active] of [[task('a',{mode:'ask'}),true],[task('a',{mode:'build'}),false],[task('a',{mode:'plan',data:{native_build:{state:'proposed'}}}),false]]){
  const other=workspaceHarness();const view=other.render();view.selectRun(run);other.render();
  assert.equal(queueEnv.current.active,active,run.mode);
 }
});

test('retry chooses the alternate against the failed run model, not the picker',async()=>{
 const h=workspaceHarness();let w=h.render();const refresh=w.refresh();
 for(const request of h.requests.splice(0)){
  if(request.path.endsWith('/config'))request.resolve({runtime:'hosted',models:['a/one','b/two','c/three'],defaultModel:'a/one'});
  else request.resolve([]);
 }
 await refresh;w=h.render();
 w.selectRun(task('a',{status:'failed',model:'a/one',conversation:[{prompt:'Hi'}],data:{failure:{code:'provider_timeout'}}}));w=h.render();
 w.setModel('b/two');w=h.render();
 assert.equal(w.retryModel,'b/two');
});
