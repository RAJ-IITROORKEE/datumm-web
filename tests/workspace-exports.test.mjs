import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

function load(file){const exports={};runInNewContext(ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='react/jsx-runtime')return jsxRuntime;if(name==='react')return {...React,useState:value=>[value,()=>{}]};if(name.endsWith('.module.css'))return {default:{}};if(name==='./plan-details')return {PlanDetails:'PlanDetails'};return {};}});return exports;}
function nodes(tree){return React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(nodes)]:[];}
const exportsPanel=load('../src/components/workspace/exports-panel.tsx');
const assetsPanel=load('../src/components/workspace/assets-panel.tsx');
const scope={key:'a',epoch:1,accountKey:'a',taskId:'task /?',sourceKey:'new'};

function shellCallback(name, context, hookArgument=false) {
 const file=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8');
 const ast=ts.createSourceFile('workspace.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let initializer;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)initializer=node.initializer;ts.forEachChild(node,visit);}visit(ast);
 assert.ok(initializer,`${name} is the actual production callback`);
 const expression=hookArgument?initializer.arguments[0]:initializer;
 const exports={};runInNewContext(ts.transpileModule(`exports.callback=${expression.getText(ast)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{exports,...context});return exports.callback;
}

test('actual Assets disables alternative selection during uncertainty without disabling ordinary viewing',()=>{
 const file=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8');
 const ast=ts.createSourceFile('workspace.tsx',file,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let initializer;
 function visit(node){if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='AssetsPanel')initializer=node;ts.forEachChild(node,visit);}visit(ast);
 assert.ok(initializer);
 const result={};const activate=()=>{},select=()=>{};
 runInNewContext(ts.transpileModule(`exports.panel=${initializer.getText(ast)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{exports:result,require:()=>jsxRuntime,AssetsPanel:'AssetsPanel',assetRows:[],activateAsset:activate,onSelectAlternative:select,w:{busy:false,actionBusy:false,selectionUncertain:true}});
 assert.equal(result.panel.props.selectionBusy,true);assert.equal(result.panel.props.onActivate,activate);assert.equal(result.panel.props.onSelectAlternative,select);
 assert.match(file,/Confirm the saved selection in Design → Properties/);
});

test('actual shell resolves current asset destinations and rejects stale epochs without mutation',()=>{
 const calls=[],notices=[],current={...scope};const rows=[];
 const activate=shellCallback('activateAsset',{
  scope:current,matches:token=>token.key===current.key&&token.epoch===current.epoch,
  liveAssets:{current:{scope:current,rows}},setAssetNotice:value=>notices.push(value),
  actions:Object.fromEntries(['openDrawing','openAnswerOutput','openSavedReport'].map(name=>[name,(...args)=>calls.push([name,...args])])),
  w:{setSelectedSourceId:id=>calls.push(['source',id])},api(){throw Error('Ordinary asset activation must never send a task/native mutation');},
  document:{createElement(){const anchor={click(){calls.push(['download',anchor.href]);}};return anchor;}},
 });
 const add=(id,destination)=>{const row={id,scope:{...scope},destination};rows.push(row);return row;};
 activate(add('drawing',{kind:'drawing',plan:{planId:'p',version:1,fingerprint:'fp'}}),'draw');
 activate(add('answer',{kind:'answer-output',outputId:'answer-a'}),'answer');
 activate(add('report',{kind:'saved-report',taskId:scope.taskId}),'report');
 activate(add('source',{kind:'saved-source',sourceId:'source-a',plan:{planId:'p',version:1,fingerprint:'fp'}}),'source');
 activate(add('download',{kind:'specialist-download',taskId:scope.taskId,sha256:'a'.repeat(64)}),'download');
 const unavailable=add('unavailable',{kind:'unavailable',reason:'Preview not loaded'});activate(unavailable,null);
 assert.equal(notices.at(-1).text,'Preview not loaded');
 assert.deepEqual(calls.map(row=>row[0]),['openDrawing','openAnswerOutput','openSavedReport','source','openDrawing','download']);
 assert.equal(calls.at(-1)[1],`/api/service/tasks/task%20%2F%3F/specialist-artifacts/${'a'.repeat(64)}`);
 const before=calls.length;current.epoch=3;activate({...rows[0],scope:{...scope,epoch:1}},null);assert.equal(calls.length,before);
 const changed={...rows[0],scope:{...current},destination:{kind:'specialist-download',taskId:scope.taskId,sha256:'https://foreign.invalid'}};
 activate(changed,null);assert.equal(calls.at(-1)[0],'openDrawing','Forged destination is replaced by the currently projected row');
});

test('actual report callback rejects prior open identities and closed or foreign epochs',()=>{
 const writes=[],live={current:{scope,openId:1}};
 const onReport=shellCallback('onReport',{report:{scope,openId:1},liveReport:live,matches:token=>token.key===scope.key&&token.epoch===scope.epoch,setReportRecord:value=>writes.push(value)},true);
 const report={kind:'retained-report'};onReport(scope,report);assert.equal(writes[0].value,report);
 live.current={scope,openId:2};onReport(scope,report);assert.equal(writes.length,1);
 live.current={scope,openId:1};onReport({...scope,epoch:3},report);assert.equal(writes.length,1);
 live.current=null;onReport(scope,report);assert.equal(writes.length,1);
});

test('work area collapse stays scoped and stale A1 controls cannot hide a returned A3 viewer',()=>{
 let current={...scope},visibility={key:scope.key,epoch:scope.epoch,open:true};
 const control=token=>shellCallback('setWorkAreaOpen',{scope:token,matches:value=>value.key===current.key&&value.epoch===current.epoch,setWorkAreaVisibility:value=>visibility=value});
 const open=(token,automaticWorkAreaOpen=true)=>shellCallback('workAreaOpen',{scope:token,workAreaVisibility:visibility,automaticWorkAreaOpen});
 const old=control({...current});old(false);assert.equal(open(current),false);
 current={...scope,key:'account-b-task-a',accountKey:'account-b',epoch:2};assert.equal(open(current),true);
 old(false);assert.equal(open(current),true,'An old task callback cannot close a new account/task');
 current={...scope,epoch:3};assert.equal(open(current),true);old(false);assert.equal(open(current),true);
 control(current)(false);assert.equal(open(current),false);control(current)(true);assert.equal(open(current),true);
 const text=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8');
 assert.equal((text.match(/<PlanCanvas/g)??[]).length,1);assert.doesNotMatch(text,/workAreaOpen\s*&&\s*<PlanCanvas/,'Collapsing preserves the mounted viewer');
});

test('empty Ask defaults to chat while artifacts reveal the work area without overriding a manual choice',()=>{
 let visibility=null;
 const open=automaticWorkAreaOpen=>shellCallback('workAreaOpen',{scope,workAreaVisibility:visibility,automaticWorkAreaOpen});
 assert.equal(open(false),false,'A plain answer does not require an empty drawing pane');
 assert.equal(open(true),true,'An available artifact can reveal the pane before a manual choice');
 visibility={key:scope.key,epoch:scope.epoch,open:false};assert.equal(open(true),false,'Manual close survives incoming geometry');
 visibility={key:scope.key,epoch:scope.epoch,open:true};assert.equal(open(false),true,'Manual open remains available for empty states');
});

test('drawing, reports, outputs and properties explicitly reopen the controlled work area',()=>{
 let reveals=0;const calls=[];
 const actions=shellCallback('actions',{scope,matches:()=>true,showWorkArea:()=>reveals++,modes:{setMode(){}},dismissOutput(){},setReportSelection(){},setReportRecord(){},reportTrigger:{current:null},nextReportOpenId:{current:0},activeOutput:null,report:null,
  document:{activeElement:null},HTMLElement:class{},w:{run:{id:scope.taskId},runtimeConfig:null,selectWorkAreaSection:section=>calls.push(section),openProperties:()=>calls.push('properties'),closeProperties(){},setCanvasOpen(){}},
  outputWorkspace:{openOutput:id=>calls.push(id)},closeOutput(){},closeReport(){}});
 actions.openDrawing();actions.openSavedReport('report');actions.openAnswerOutput('answer');actions.openProperties();actions.returnToDrawing();
 assert.equal(reveals,5);assert.ok(calls.includes('answer'));assert.ok(calls.includes('properties'));
 const effects=[];const text=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('workspace.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('outputOpenId > 0'))effects.push(node.arguments[0].getText(ast));ts.forEachChild(node,visit);}visit(ast);assert.equal(effects.length,1);
 const exports={};runInNewContext(ts.transpileModule('exports.reveal='+effects[0],{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{exports,outputOpenId:2,setWorkAreaOpen:value=>calls.push(value)});exports.reveal();assert.equal(calls.at(-1),true,'Selecting a direct answer-output pill also reopens the viewer');
});

test('narrow work-area actions wait for visible tabs and reject stale queued focus',()=>{
 const frames=[],focused=[];let current=true,visible=false,focusDrawing=false;
 class Element{closest(){return true;}}
 const tab={getClientRects:()=>visible?[{}]:[],closest:()=>null,focus:()=>focused.push('tab')};
 const reveal=shellCallback('showWorkArea',{scope,matches:()=>current,setWorkAreaOpen(){},w:{effectiveLayout:{split:false},workAreaSection:'design'},HTMLElement:Element,
  requestAnimationFrame:fn=>frames.push(fn),document:{activeElement:new Element(),getElementById:()=>({classList:{contains:()=>focusDrawing}}),querySelector:()=>tab}});
 reveal();assert.deepEqual(focused,[]);visible=true;frames.shift()();assert.deepEqual(focused,['tab']);
 reveal();current=false;frames.shift()();assert.equal(focused.length,1,'A previous task cannot steal focus after navigation');
 current=true;reveal();visible=false;frames.shift()();assert.equal(focused.length,1,'A hidden tab cannot receive focus');
 visible=true;reveal();focusDrawing=true;frames.shift()();assert.equal(focused.length,1,'Focus drawing owns its own focus movement');
});

test('Exports consumes exact scoped records, capability filters and supplied open actions with no loading or mutation',()=>{
 const calls=[];
 const workspace={run:{id:scope.taskId,data:{}},designVersion:{planId:'p',version:2,fingerprint:'fp'},runtimeConfig:{supportedExports:['json','report-json']},exportItems:[{ext:'json',name:'Task evidence',detail:'Saved state'},{ext:'csv',name:'BOQ CSV',detail:'Quantities'}]};
 const actions={openDrawing:opener=>calls.push(['drawing',opener]),openAnswerOutput:(id,opener)=>calls.push(['answer',id,opener]),openSavedReport:opener=>calls.push(['report',opener])};
 const tree=exportsPanel.ExportsPanel({workspace,scope,outputs:[{id:'output-a',title:'Table',source:{conversationIndex:0,state:'partial'},complete:false,kind:'table'}],report:null,actions});
 const all=nodes(tree),links=all.filter(node=>node.type==='a');
 assert.deepEqual(links.map(node=>node.props.href),['/api/service/runs/task%20%2F%3F/export/json']);
 const click=label=>all.find(node=>node.type==='button'&&JSON.stringify(node.props.children).includes(label)).props.onClick({currentTarget:label});
 click('Preview drawing');click('Open saved BOQ');all.find(node=>node.type==='button'&&node.props.children?.[1]?.props?.children?.[0]?.props?.children==='Table').props.onClick({currentTarget:'table'});
 assert.deepEqual(calls,[['drawing','Preview drawing'],['report','Open saved BOQ'],['answer','output-a','table']]);
 assert.equal(all.find(node=>node.type==='PlanDetails').props.surface,'exports');
 assert.match(JSON.stringify(tree),/Older tasks may provide legacy evidence without revision history/);
 const foreign=exportsPanel.ExportsPanel({workspace:{...workspace,run:{id:'foreign'}},scope,outputs:[],report:null,actions});
 assert.equal(nodes(foreign).some(node=>node.type==='a'),false);
 const revisionView=exportsPanel.ExportsPanel({workspace:{...workspace,runtimeConfig:{supportedExports:['json','csv','report-json']}},scope,outputs:[],report:{sourceKind:'proposed',savedRevision:{revisionNumber:2}},actions});
 assert.deepEqual(nodes(revisionView).filter(node=>node.type==='a').map(node=>node.props.href),['/api/service/runs/task%20%2F%3F/export/json','/api/service/runs/task%20%2F%3F/export/csv'],'Latest-task downloads remain available and clearly separate from revision downloads');
 assert.match(JSON.stringify(revisionView),/Viewed report revision 2/);
});

test('report format preview opens the scoped dataset and downloads retain their exact task route',()=>{
 const calls=[],workspace={run:{id:scope.taskId,data:{}},designVersion:null,runtimeConfig:{supportedExports:['report-json','pdf']},exportItems:[{ext:'pdf',name:'Report PDF',detail:'Latest task evidence'}]};
 const tree=exportsPanel.ExportsPanel({workspace,scope,outputs:[],report:null,actions:{openSavedReport:opener=>calls.push(opener),openDrawing(){},openAnswerOutput(){}}});
 const all=nodes(tree),preview=all.find(node=>node.type==='button'&&JSON.stringify(node.props.children).includes('Open saved BOQ'));
 assert.ok(preview);preview.props.onClick({currentTarget:'preview'});assert.deepEqual(calls,['preview']);
 assert.equal(all.find(node=>node.type==='a').props.href,'/api/service/runs/task%20%2F%3F/export/pdf');
 assert.match(JSON.stringify(tree),/downloads use latest task evidence and may differ from a saved report revision/);
 assert.equal(all.filter(node=>node.type==='button'&&JSON.stringify(node.props.children).includes('Open saved BOQ')).length,1);
 assert.equal(all.find(node=>node.type==='details'&&JSON.stringify(node.props.children).includes('Latest task evidence downloads')).props.open,undefined);
 assert.match(JSON.stringify(tree),/not a formatted file preview/);assert.match(JSON.stringify(tree),/saved revision may differ/);
});

test('answer export labels use display ordinal and preserve raw source record and action identity',()=>{
 const calls=[],workspace={run:{id:scope.taskId,data:{}},runtimeConfig:{supportedExports:[]},exportItems:[]};
 const outputs=[{id:'task:answer:3:report',title:'Full answer',source:{taskId:scope.taskId,conversationIndex:3,answerNumber:2,state:'saved'},complete:true,kind:'report'},{id:'legacy',title:'Legacy answer',source:{taskId:scope.taskId,conversationIndex:5,state:'partial'},complete:false,kind:'report'}];
 const tree=exportsPanel.ExportsPanel({workspace,scope,outputs,report:null,actions:{openSavedReport(){},openDrawing(){},openAnswerOutput:(id)=>calls.push(id)}}),all=nodes(tree);
 const buttons=all.filter(node=>node.type==='button'&&JSON.stringify(node.props.children).includes('answer'));
 const text=JSON.stringify(tree);assert.match(text,/Answer ",2/);assert.match(text,/Answer ",6/);assert.match(text,/conversation record ",4/);
 buttons[0].props.onClick({currentTarget:null});assert.deepEqual(calls,['task:answer:3:report']);assert.equal(outputs[0].source.conversationIndex,3);
});

test('Assets ordinary activation is separate from the explicit alternative selection action',async()=>{
 const calls=[],selection={scope,taskId:scope.taskId,briefId:'brief',plan:{planId:'p',version:1,fingerprint:'fp'}};
 const row={id:'a',scope,kind:'saved-drawing',title:'Plan p',provenance:'Retained drawing',metadata:{},destination:{kind:'unavailable',reason:'Saved drawing preview is not loaded'},alternativeSelection:selection};
 const tree=assetsPanel.AssetsPanel({rows:[row],selectionBusy:false,onActivate:(...args)=>calls.push(['activate',...args]),onSelectAlternative:async value=>calls.push(['select',value])});
 const buttons=nodes(tree).filter(node=>node.type==='button');
 buttons[0].props.onClick({currentTarget:'opener'});
 assert.deepEqual(calls,[['activate',row,'opener']]);
 assert.equal(buttons[0].props['aria-disabled'],true);
 await buttons[1].props.onClick();assert.deepEqual(calls[1],['select',selection]);
});

test('Specialist artifact links guard role, completion and hash, encoding only the authoritative task route',()=>{
 const {AgentSpecialists}=load('../src/components/agent-specialists.tsx');
 const result=(role,status,ref)=>({role,status,artifactRefs:[ref],findings:[]});
 const hash='a'.repeat(64),tree=AgentSpecialists({taskId:'task /?',results:[result('report_preparer','completed',hash),result('report_preparer','partial','b'.repeat(64)),result('other','completed','c'.repeat(64)),result('report_preparer','completed','https://bad.invalid')]});
 assert.deepEqual(nodes(tree).filter(node=>node.type==='a').map(node=>node.props.href),[`/api/service/tasks/task%20%2F%3F/specialist-artifacts/${hash}`]);
 const sources=nodes(tree).filter(node=>node.type==='details');
 assert.equal(sources.length,3);assert.ok(sources.every(node=>!node.props.open));
 assert.ok(sources.every(node=>nodes(node).some(child=>child.type==='summary'&&child.props.children==='Source details')));
 const calls=[],callbackTree=AgentSpecialists({taskId:'task',results:[result('report_preparer','completed',hash)],onOpenArtifact:(...args)=>calls.push(args)});
 nodes(callbackTree).find(node=>node.type==='button').props.onClick({currentTarget:'opener'});
 assert.deepEqual({...calls[0][0]},{taskId:'task',sha256:hash});assert.equal(calls[0][1],'opener');
});
