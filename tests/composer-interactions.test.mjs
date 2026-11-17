import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as modelDisplay from '../src/lib/model-display.mjs';
import {acceptSuggestion} from '../src/lib/display-actions.mjs';
import {featureEnabled} from '../src/lib/capabilities.mjs';
import * as queueLib from '../src/lib/prompt-queue.mjs';

const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const promptContent={};
runInNewContext(compile('../src/components/prompt-content.tsx'),{exports:promptContent,require(name){if(name==='react/jsx-runtime')return jsxRuntime;return {};}});
const code=compile('../src/components/workspace/composer.tsx');

function harness(input={}) {
 const calls={submitted:[],dismissed:[],focused:0,chosen:[]};
 const slots=[];let cursor=0;
 const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};}};
 const exports={};
 runInNewContext(code,{exports,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;if(name==='../prompt-content')return promptContent;if(name==='./output-workspace')return {useOutputWorkspace:()=>({scope:{key:'test',epoch:1}})};if(name==='@/lib/plugin-setup.mjs')return {needsPluginSetup:()=>false};if(name==='@/lib/utils')return {cn:(...values)=>values.filter(Boolean).join(' ')};if(name==='@/lib/display-actions.mjs')return {acceptSuggestion};if(name==='@/lib/capabilities.mjs')return {featureEnabled};if(name==='@/lib/prompt-queue.mjs')return queueLib;return new Proxy({},{get:(_,key)=>Object.assign(()=>null,{displayName:key})});}});
 const props={prompt:'Keep this draft',visiblePrompt:{text:'Keep this draft',references:[]},mode:'plan',liveRuntime:true,workspaceReady:true,connected:true,hasContent:true,draftReferences:[],devices:[],promptQueue:[],chatModels:['openai/actual-model'],model:'openai/actual-model',reasoningEffort:'high',sources:[],commandMatches:['inspect','plan'],commandIndex:0,commandsOpen:false,sendShortcut:'enter',submit:(...args)=>calls.submitted.push(args),setCommandsDismissed:value=>calls.dismissed.push(value),chooseCommand:value=>calls.chosen.push(value),...input};
 const tree=exports.Composer(props),elements=[];
 const visit=node=>{if(!React.isValidElement(node))return;elements.push(node);React.Children.forEach(node.props.children,visit);};visit(tree);
 const find=predicate=>elements.find(predicate);
 const textarea=find(e=>e.type==='textarea');
 if(textarea.props.ref)textarea.props.ref.current={focus:()=>calls.focused++};
 const form=find(e=>e.type==='form');
 return {calls,textarea,form,find,enter(overrides={}){let prevented=false;textarea.props.onKeyDown({key:'Enter',shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){prevented=true;},currentTarget:{form:{requestSubmit:()=>form.props.onSubmit({preventDefault(){}})}},...overrides});return prevented;}};
}

test('one contextual placeholder never fills the draft or intercepts Tab',()=>{
 for(const [state, expected] of [[{hasContent:false},'Describe your project or ask anything…'],[{hasContent:true,drawingCurrent:false},'Ask a follow-up or describe your task…'],[{hasContent:true,drawingCurrent:true,run:{data:{agent_design:{candidates:[{}]}}}},'Ask about this plan or describe a change…']]){
  const h=harness({...state,prompt:'',visiblePrompt:{text:'',references:[]}});
  assert.equal(h.textarea.props.placeholder,expected);assert.equal(h.textarea.props['aria-label'],'Message DATUMM');assert.equal(h.textarea.props.value,'');
  let prevented=false;h.textarea.props.onKeyDown({key:'Tab',nativeEvent:{isComposing:false},preventDefault(){prevented=true;},currentTarget:{}});
  assert.equal(prevented,false);assert.equal(h.calls.submitted.length,0);
 }
 const draft=harness({drawingCurrent:true,prompt:'My draft',visiblePrompt:{text:'My draft',references:[]}});
 assert.equal(draft.textarea.props.value,'My draft');
});

test('keyboard send respects the same unavailable states as the Send button and preserves the draft',()=>{
 for(const state of [{scene:'task-loading'},{scene:'submitting'},{workspaceReady:false},{connected:false},{actionBusy:true},{mediaBusy:true},{prompt:'  '},{executing:true,run:null},{executing:true,liveRuntime:false,run:{id:'task-1'}}]){
  const h=harness(state);
  h.enter();
  assert.equal(h.calls.submitted.length,0,JSON.stringify(state));
  h.form.props.onSubmit({preventDefault(){}});
  assert.equal(h.calls.submitted.length,0,'Form submission also respects '+JSON.stringify(state));
 }
 const h=harness();h.enter();assert.deepEqual(h.calls.submitted,[['Keep this draft',false]]);
 const queued=harness({executing:true,queueMessage:true,run:{id:'task-1'}});queued.enter();assert.equal(queued.calls.submitted.length,1,'Hosted queuing remains available');
});

test('send shortcuts preserve multiline and IME input, and command selection takes precedence',()=>{
 for(const state of [{shiftKey:true},{nativeEvent:{isComposing:true}}]){const h=harness();assert.equal(h.enter(state),false);assert.equal(h.calls.submitted.length,0);}
 const shortcut=harness({sendShortcut:'ctrl-enter'});assert.equal(shortcut.enter(),false);shortcut.enter({ctrlKey:true});assert.equal(shortcut.calls.submitted.length,1);
 const command=harness({commandsOpen:true});command.enter();assert.deepEqual(command.calls.chosen,['inspect']);assert.equal(command.calls.submitted.length,0);
});

test('Escape from a keyboard-focused command option dismisses the menu before pane shortcuts and restores the composer',()=>{
 const h=harness({commandsOpen:true});
 const menu=h.find(e=>e.props.id==='workflow-commands');
 let prevented=false;
 assert.equal(typeof menu.props.onKeyDown,'function');
 menu.props.onKeyDown({key:'Escape',nativeEvent:{isComposing:false},preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.deepEqual(h.calls.dismissed,[true]);assert.equal(h.calls.focused,1);assert.equal(h.calls.submitted.length,0);
});

test('model configuration keeps actual runtime model IDs, effort events and one Radix owner per layer',()=>{
 const module={};
 runInNewContext(compile('../src/components/model-picker.tsx'),{exports:module,require(name){
  if(name==='react')return {useId:()=> 'picker-test'};if(name==='react/jsx-runtime')return jsxRuntime;
  if(name==='radix-ui')return {Popover:{Root:'popover-root',Trigger:'popover-trigger',Portal:'popover-portal',Content:'popover-content'}};
  if(name==='@/components/ui/button')return {Button:'button'};if(name==='@/lib/model-display.mjs')return modelDisplay;
  if(name==='@/components/ui/dropdown-menu')return Object.fromEntries(['DropdownMenu','DropdownMenuContent','DropdownMenuGroup','DropdownMenuLabel','DropdownMenuRadioGroup','DropdownMenuRadioItem','DropdownMenuSeparator','DropdownMenuTrigger'].map(key=>[key,key]));
  if(name==='./vendor/affectui/popover-clean')return {PopoverStyles:'popover-styles',popoverClasses:{content:'aui-popover-content'}};
  if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,key)=>key})};if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});throw Error(name);
 }});
 const calls=[];const tree=module.ModelPicker({model:'openai/actual-model',models:['openai/actual-model','provider/unicode-model'],reasoningEffort:'low',onModelChange:value=>calls.push(['model',value]),onReasoningEffortChange:value=>calls.push(['effort',value])});
 const all=[];const visit=node=>{if(!React.isValidElement(node))return;all.push(node);React.Children.forEach(node.props.children,visit);};visit(tree);
 assert.equal(all.filter(node=>node.type==='popover-root').length,1);assert.equal(all.filter(node=>node.type==='DropdownMenu').length,1);
 assert.equal(all.filter(node=>node.type==='popover-styles').length,1);
 const content=all.find(node=>node.type==='popover-content');assert.equal(content.props.side,'top');assert.equal(content.props.align,'end');assert.equal(content.props.sideOffset,10);assert.match(content.props.className,/aui-popover-content/);
 const group=all.find(node=>node.type==='DropdownMenuRadioGroup');assert.equal(group.props.value,'openai/actual-model');
 assert.deepEqual(all.filter(node=>node.type==='DropdownMenuRadioItem').map(node=>node.props.value),['openai/actual-model','provider/unicode-model']);
 group.props.onValueChange('provider/unicode-model');all.find(node=>node.type==='input').props.onChange({currentTarget:{value:'1'}});
 assert.deepEqual(calls,[['model','provider/unicode-model'],['effort','medium']]);
 const trigger=all.find(node=>node.type==='button'&&node.props['aria-label']?.startsWith('Configure model'));assert.match(trigger.props['aria-label'],/Actual Model.*Low reasoning/);
 assert.equal(all.some(node=>/latency|price|speed|quality|web search/i.test(String(node.props['aria-label']??''))),false);
 const rich=module.ModelPicker({model:'openai/actual-model',models:['openai/actual-model'],modelInfo:{'openai/actual-model':{promptPerM:3,completionPerM:15,contextLength:200000}},reasoningEffort:'low',onModelChange(){},onReasoningEffortChange(){}});
 const richAll=[];const walk=node=>{if(!React.isValidElement(node))return;richAll.push(node);React.Children.forEach(node.props.children,walk);};walk(rich);
 assert.match(richAll.find(node=>node.type==='button'&&node.props['aria-label']?.startsWith('Configure model')).props['aria-label'],/\$3 \/ \$15 per M/);
 assert.ok(richAll.some(node=>node.type==='small'&&node.props.children==='$3 / $15 per M · 200K context'));
});


test('single current-mode menu preserves named choices and the exact accepted-drawing Build guard',()=>{
 const changes=[],builds=[];
 const setup={setMode:value=>changes.push(value),switchDrawingToBuild:async()=>builds.push('exact-drawing'),run:{id:'task-a',data:{agent_design:{}}},drawingCurrent:true};
 let h=harness(setup),group=h.find(row=>row.type.displayName==='DropdownMenuRadioGroup');
 assert.equal(group.props.value,'plan');assert.equal(h.find(row=>row.props['aria-label']==='Task mode: Plan').type,'button');
 assert.equal(h.find(row=>row.props.className==='studio-mode-segments'),undefined);
 for(const mode of ['ask','plan'])group.props.onValueChange(mode);
 group.props.onValueChange('build');assert.deepEqual(changes,['ask','plan']);assert.deepEqual(builds,['exact-drawing']);
 group.props.onValueChange('invented');assert.equal(changes.length,2);
 for(const state of [{busy:true},{mediaBusy:true},{workspaceReady:false},{buildUnavailable:true}]){
  h=harness({...setup,...state});h.find(row=>row.type.displayName==='DropdownMenuRadioGroup').props.onValueChange('build');
 }
 assert.equal(builds.length,1);
 h=harness({...setup,drawingCurrent:false});h.find(row=>row.type.displayName==='DropdownMenuRadioGroup').props.onValueChange('build');assert.equal(changes.at(-1),'build');assert.equal(builds.length,1);
});

test('composer tray preserves project context, measured-context toggle and exact connection opener without native authorization',()=>{
 const calls=[],trigger={current:null};let context=false;
 const h=harness({useCurrentModel:false,setProjectContextOpen:value=>calls.push(['project',value]),setUseCurrentModel:update=>{context=update(context);},dialogTrigger:trigger,setDeviceDialog:value=>calls.push(['device',value])});
 const project=h.find(row=>row.props.title==='Open project context');project.props.onClick();
 const toggle=h.find(row=>row.props['aria-label']==='Revit context');assert.equal(toggle.props['aria-pressed'],false);toggle.props.onClick();assert.equal(context,true);
 const connect=h.find(row=>row.props.className==='composer-tray-link device-status'),opener={id:'connection-opener'};assert.equal(connect.props.type,'button');connect.props.onClick({currentTarget:opener});
 assert.equal(trigger.current,opener);assert.deepEqual(calls,[['project',true],['device',true]]);
 assert.equal(h.find(row=>row.props.className==='workspace-controls'),undefined);assert.equal(h.find(row=>row.props.className==='studio-new-chat-context'),undefined);assert.equal(h.find(row=>row.props.className==='studio-composer-meta'),undefined);
 const input=h.find(row=>row.props.className==='composer-input'),tray=h.find(row=>row.props.className==='composer-tray');assert.ok(input&&tray);assert.ok(React.Children.toArray(h.form.props.children).some(row=>row.props.className==='composer-input'));assert.ok(React.Children.toArray(h.form.props.children).some(row=>row.props.className==='composer-tray'));
});

test('Add menu exposes only actual context/capabilities actions and truthfully disables unavailable media',()=>{
 const exports={},calls=[];
 runInNewContext(compile('../src/components/composer-media.tsx'),{exports,require(name){
  if(name==='react/jsx-runtime')return jsxRuntime;if(name==='radix-ui')return {DropdownMenu:{Item:'add-item'}};
  if(name==='./ui/dropdown-menu')return Object.fromEntries(['DropdownMenu','DropdownMenuTrigger','DropdownMenuContent','DropdownMenuLabel','DropdownMenuSeparator'].map(key=>[key,key]));
  if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,key)=>key})};if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});throw Error(name);
 }});
 const all=tree=>{if(!React.isValidElement(tree))return [];return [tree,...React.Children.toArray(tree.props.children).flatMap(all)];};
 const tree=all(exports.ComposerMedia({attachmentOnly:true,onContext:()=>calls.push('context'),onSettings:()=>calls.push('capabilities')}));
 assert.equal(tree.filter(row=>row.type==='button').length,1);assert.equal(tree.find(row=>row.type==='button').props['aria-label'],'Add');
 const items=tree.filter(row=>row.type==='add-item');assert.equal(items.length,3);assert.equal(items[0].props.disabled,true);assert.match(items[0].props.textValue,/require DATUMM Desktop/);assert.equal(items[0].props.onSelect,undefined);
 items[1].props.onSelect();items[2].props.onSelect();assert.deepEqual(calls,['context','capabilities']);
 const voice=all(exports.ComposerMedia({voiceOnly:true}));assert.equal(voice.filter(row=>row.type==='button').length,1);assert.equal(voice.find(row=>row.type==='button').props.disabled,true);assert.match(voice.find(row=>row.type==='button').props['aria-label'],/Dictation requires DATUMM Desktop/);
});

const hosted=(over={},state={})=>{
 const calls={added:[],now:[],prompts:[]};
 const hostedQueue={active:true,canSendNow:true,items:[],max:3,full:false,paused:null,stopping:false,notice:'',add:text=>{calls.added.push(text);return true;},remove(){},take(){return null;},sendNow:async(source,done)=>{calls.now.push(source);done?.();}, ...over};
 const h=harness({liveRuntime:false,executing:true,run:{id:'task-1',mode:'ask'},mode:'ask',hostedQueue,setPrompt:value=>calls.prompts.push(value),...state});
 return {h,calls};
};
const sendButton=h=>h.find(e=>e.type==='button'&&e.props.type==='submit');

test('hosted Ask/Plan queues while a turn runs and labels the button Add to queue',()=>{
 const {h,calls}=hosted();
 assert.equal(sendButton(h).props['aria-label'],'Add to queue');assert.equal(sendButton(h).props.disabled,false);
 h.enter();assert.deepEqual(calls.added,['Keep this draft']);assert.deepEqual(calls.prompts,['']);assert.equal(h.calls.submitted.length,0);
 for(const [state,label] of [[{executing:false},'Send message'],[{mode:'build'},undefined]]){
  const other=hosted({},state).h;assert.equal(sendButton(other)?.props['aria-label'],label);
 }
 const full=hosted({full:true}).h;assert.equal(sendButton(full).props.disabled,true);assert.match(sendButton(full).props.title,/Queue is full \(3\)/);
 full.enter();assert.equal(full.calls.submitted.length,0);
 const idle=harness({liveRuntime:false,executing:false});assert.equal(sendButton(idle).props['aria-label'],'Send message');
 const noQueue=hosted({active:false}).h;noQueue.enter();assert.equal(noQueue.calls.submitted.length,0);
});

test('Alt+Enter sends now only while queueing, using the draft or the first queued prompt',()=>{
 const {h,calls}=hosted();
 let prevented=false;
 h.textarea.props.onKeyDown({key:'Enter',altKey:true,shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){prevented=true;},currentTarget:{form:null}});
 assert.equal(prevented,true);assert.deepEqual(JSON.parse(JSON.stringify(calls.now)),[{text:'Keep this draft'}]);assert.deepEqual(calls.prompts,['']);
 const empty=hosted({items:[{id:'q1',prompt:'next',mode:'ask',model:'m'}]},{prompt:'',visiblePrompt:{text:'',references:[]}});
 empty.h.textarea.props.onKeyDown({key:'Enter',altKey:true,nativeEvent:{isComposing:false},preventDefault(){},currentTarget:{}});
 assert.deepEqual(JSON.parse(JSON.stringify(empty.calls.now)),[{id:'q1'}]);
 const idle=harness({executing:false});idle.textarea.props.onKeyDown({key:'Enter',altKey:true,shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){},currentTarget:{form:null}});
 assert.equal(idle.calls.submitted.length,0);
});

test('Tab accepts the suggested follow-up into an empty box and never traps focus otherwise',()=>{
 const set=[];
 const withSuggestion=(state={})=>harness({prompt:'',visiblePrompt:{text:'',references:[]},setPrompt:value=>set.push(value),displayActions:{placeholder:'Compare the two',dismissPlaceholder(){set.push('dismissed');}},...state});
 const h=withSuggestion();
 assert.equal(h.textarea.props.placeholder,'Compare the two');assert.equal(h.textarea.props['data-suggestion'],'');
 assert.equal(h.textarea.props['aria-describedby'],'composer-suggestion-hint');
 assert.match(JSON.stringify(h.find(e=>e.props.id==='composer-suggestion-hint').props.children),/press Tab/);
 let prevented=false;h.textarea.props.onKeyDown({key:'Tab',shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){prevented=true;},currentTarget:{}});
 assert.equal(prevented,true);assert.deepEqual(set,['Compare the two','dismissed']);
 for(const event of [{shiftKey:true},{nativeEvent:{isComposing:true}}]){
  const other=withSuggestion();prevented=false;other.textarea.props.onKeyDown({key:'Tab',shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){prevented=true;},currentTarget:{},...event});assert.equal(prevented,false);
 }
 const typed=withSuggestion({prompt:'typed',visiblePrompt:{text:'typed',references:[]},displayActions:{placeholder:'Compare the two'}});
 assert.equal(typed.textarea.props['data-suggestion'],undefined);assert.equal(typed.textarea.props['aria-describedby'],undefined);
 prevented=false;typed.textarea.props.onKeyDown({key:'Tab',shiftKey:false,nativeEvent:{isComposing:false},preventDefault(){prevented=true;},currentTarget:{}});assert.equal(prevented,false);
 const plain=harness({prompt:'',visiblePrompt:{text:'',references:[]}});assert.equal(plain.find(e=>e.props.id==='composer-suggestion-hint'),undefined);
});

test('attachment chips need the attachments capability and a send path, which none has yet',()=>{
 const chips=h=>h.find(e=>e.type?.displayName==='AttachmentChips');
 assert.equal(chips(harness()).props.enabled,false);
 assert.equal(chips(harness({capabilities:{version:1,features:{attachments:'unknown'}}})).props.enabled,false);
 const on=chips(harness({capabilities:{version:1,features:{attachments:'on'}}}));
 assert.equal(on.props.enabled,true);assert.equal(on.props.canSend,false);
});

test('a running Build task never queues, steers or sends now, whatever the picker says',()=>{
 for(const run of [{id:'task-1',mode:'build'},{id:'task-1',mode:'ask',data:{native_build:{state:'proposed'}}}]){
  const {h,calls}=hosted({},{run,mode:'ask'});
  assert.equal(sendButton(h),undefined);
  h.enter();assert.deepEqual(calls.added,[]);
  h.textarea.props.onKeyDown({key:'Enter',altKey:true,nativeEvent:{isComposing:false},preventDefault(){},currentTarget:{}});
  assert.deepEqual(calls.now,[]);
 }
});

test('send now is offered only when the queue may send now; Edit returns focus to the box',()=>{
 const row={id:'q1',prompt:'next',mode:'ask',model:'m'};
 const panel=h=>h.find(e=>e.type?.displayName==='QueuePanel'&&e.props.max===3);
 const held=hosted({canSendNow:false,items:[row]},{prompt:'',visiblePrompt:{text:'',references:[]}});
 assert.equal(panel(held.h).props.onSendNow,undefined);
 held.h.textarea.props.onKeyDown({key:'Enter',altKey:true,nativeEvent:{isComposing:false},preventDefault(){},currentTarget:{}});
 assert.deepEqual(held.calls.now,[]);
 const open=hosted({items:[row],take:()=>row},{prompt:'',visiblePrompt:{text:'',references:[]},setMode(){}});
 assert.equal(typeof panel(open.h).props.onSendNow,'function');
 panel(open.h).props.onEdit(row);
 assert.deepEqual(open.calls.prompts,['next']);assert.equal(open.h.calls.focused,1);
 panel(open.h).props.focusComposer();assert.equal(open.h.calls.focused,2);
});

const panelCode=compile('../src/components/workspace/queue-panel.tsx');
function queuePanel(props){
 const list={current:null},exports={};
 runInNewContext(panelCode,{exports,require(name){if(name==='react')return {useRef:()=>list};if(name==='react/jsx-runtime')return jsxRuntime;return new Proxy({},{get:(_,key)=>Object.assign(()=>null,{displayName:key})});}});
 const tree=exports.QueuePanel(props),elements=[];
 const visit=node=>{if(!React.isValidElement(node))return;elements.push(node);React.Children.forEach(node.props.children,visit);};visit(tree);
 return {tree,list,elements};
}

test('the queue is a labelled region and Remove moves focus to the next row or the box',()=>{
 const rows=['a','b'].map(id=>({id,prompt:id,mode:'ask'}));
 let composer=0,removed=[],focused='';
 const p=queuePanel({rows,max:3,onEdit(){},onRemove:row=>removed.push(row.id),focusComposer:()=>composer++});
 assert.equal(p.tree.props.role,'region');assert.equal(p.tree.props['aria-label'],'Queued prompts');
 const button=(id,visible=true)=>({disabled:false,offsetParent:visible?{}:null,focus:()=>{focused=id;}});
 p.list.current={children:[{},{querySelectorAll:()=>[button('hidden',false),button('b-send')]}]};
 const remove=id=>p.elements.find(e=>e.props['aria-label']===`Remove queued prompt: ${id}`);
 remove('a').props.onClick();
 assert.deepEqual(removed,['a']);assert.equal(focused,'b-send');assert.equal(composer,0);
 remove('b').props.onClick();
 assert.deepEqual(removed,['a','b']);assert.equal(composer,1);
});
