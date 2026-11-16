import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';

const code=ts.transpileModule(readFileSync(new URL('../src/components/workspace/composer.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
function harness() {
 const slots=[];let cursor=0,scope={key:'account-a:project-a',epoch:1};
 const calls={prompt:[],mode:[],context:[],submit:[],dialog:[],focus:0};
 const hooks={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};}};
 const exports={};
 runInNewContext(code,{exports,require(name){
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;
  if(name==='./output-workspace')return {useOutputWorkspace:()=>({scope})};
  if(name==='../prompt-content')return {hasPromptContent:value=>Boolean(value?.trim()),withViewportReferences:(text,refs)=>[text,...refs.map(ref=>ref.context)].join('\n\n'),ViewportReferences:()=>null,PromptContent:()=>null};
  if(name==='@/lib/plugin-setup.mjs')return {needsPluginSetup:()=>false};
  if(name==='@/lib/utils')return {cn:(...values)=>values.filter(Boolean).join(' ')};
  return new Proxy({},{get:(_,key)=>Object.assign(()=>null,{displayName:key})});
 }});
 const props={prompt:'',visiblePrompt:{text:'',references:[]},mode:'ask',useCurrentModel:false,liveRuntime:true,workspaceReady:true,connected:true,hasContent:false,draftReferences:[],devices:[],promptQueue:[],chatModels:[],sources:[],sourceKey:'new:project-a',commandMatches:[],commandIndex:0,sendShortcut:'enter',dialogTrigger:{current:null},setDeviceDialog:value=>calls.dialog.push(value),setPrompt:value=>calls.prompt.push(value),setMode:value=>calls.mode.push(value),setUseCurrentModel:value=>calls.context.push(value),submit:(...value)=>calls.submit.push(value)};
 function render(change={}){Object.assign(props,change);cursor=0;const tree=exports.Composer(props),nodes=[];const visit=node=>{if(!React.isValidElement(node))return;nodes.push(node);React.Children.forEach(node.props.children,visit);};visit(tree);const textarea=nodes.find(node=>node.type==='textarea');if(textarea?.props.ref)textarea.props.ref.current={focus:()=>calls.focus++};return {nodes,button(label){return nodes.find(node=>node.type==='button'&&React.Children.toArray(node.props.children).some(child=>child===label));}};}
 return {props,calls,render,setScope(value){scope=value;}};
}

test('first-use starters preserve drafts until deliberate confirmation and never send',()=>{
 const h=harness();let tree=h.render({prompt:'  ',visiblePrompt:{text:'  ',references:[]},mode:'build',useCurrentModel:true});
 tree.button('Plan a concept').props.onClick();tree=h.render();
 assert.ok(tree.button('Replace draft'));assert.deepEqual(h.calls.prompt,[]);assert.deepEqual(h.calls.mode,[]);assert.deepEqual(h.calls.context,[]);
 tree.button('Keep draft').props.onClick();tree=h.render();assert.equal(tree.button('Replace draft'),undefined);assert.equal(h.calls.focus,1);
 tree.button('Plan a concept').props.onClick();tree=h.render();const replace=tree.button('Replace draft');replace.props.onClick();replace.props.onClick();
 assert.equal(h.calls.prompt.length,1);assert.match(h.calls.prompt[0],/building footprint dimensions, entrance direction and room requirements together/);assert.match(h.calls.prompt[0],/Keep parcel dimensions separate; do not inspect or change Revit/);assert.deepEqual(h.calls.mode,['plan']);assert.deepEqual(h.calls.context,[false]);assert.deepEqual(h.calls.submit,[]);
});

test('changed draft, mode, context, attachments, availability, or workspace invalidates old confirmation',()=>{
 const cases=[{prompt:'changed'},{mode:'plan'},{useCurrentModel:true},{sources:[{id:'new'}]},{draftReferences:[{target:{kind:'element',key:'r'},fingerprint:'a',intent:'question'}]},{visiblePrompt:{text:'existing',references:[{context:'view'}]}},{busy:true},{workspaceReady:false},{scene:'submitting'},{selectedDevice:{id:'a',online:true}}];
 for(const change of cases){const h=harness();let tree=h.render({prompt:'existing'});tree.button('Plan a concept').props.onClick();tree=h.render();const old=tree.button('Replace draft');h.render(change);old.props.onClick();assert.deepEqual(h.calls.prompt,[],JSON.stringify(change));}
 const h=harness();let tree=h.render({prompt:'existing'});tree.button('Plan a concept').props.onClick();tree=h.render();const old=tree.button('Replace draft');h.setScope({key:'account-a:project-b',epoch:2});h.render();h.setScope({key:'account-a:project-a',epoch:3});h.render();old.props.onClick();assert.deepEqual(h.calls.prompt,[]);
});

test('replaced confirmation and stale or repeated starter callbacks cannot change a draft',()=>{
 const h=harness();let tree=h.render({prompt:'existing'});const first=tree.button('Plan a concept'),second=tree.button('Ask a Revit question');first.props.onClick();tree=h.render();const old=tree.button('Replace draft');second.props.onClick();tree=h.render();old.props.onClick();assert.deepEqual(h.calls.prompt,[]);tree.button('Replace draft').props.onClick();first.props.onClick();assert.equal(h.calls.prompt.length,1);assert.equal(h.calls.prompt[0],'Explain the difference between Revit levels and grids. Keep it to general software guidance.');assert.deepEqual(h.calls.submit,[]);
});

test('confirmed replacement keeps viewport and design references',()=>{
 const h=harness(),ref={target:{kind:'element',key:'room'},fingerprint:'abc',intent:'question'},viewport={context:'Viewport context: existing'};
 let tree=h.render({prompt:'existing',draftReferences:[ref],visiblePrompt:{text:'existing',references:[viewport]}});tree.button('Plan a concept').props.onClick();tree=h.render();tree.button('Replace draft').props.onClick();
 assert.ok(h.calls.prompt[0].includes(JSON.stringify(ref)));assert.ok(h.calls.prompt[0].includes(viewport.context));
});

test('Revit connections opens existing dialog without changing the draft, mode or model context',()=>{
 const h=harness();const tree=h.render({prompt:'existing',selectedDevice:{id:'online',online:true}});const opener={};tree.button('Revit connections').props.onClick({currentTarget:opener});assert.equal(h.props.dialogTrigger.current,opener);assert.deepEqual(h.calls.dialog,[true]);assert.deepEqual(h.calls.prompt,[]);assert.deepEqual(h.calls.mode,[]);assert.deepEqual(h.calls.context,[]);assert.deepEqual(h.calls.submit,[]);
});

test('composer shows the ready indicator only for an online device with one Revit session',()=>{
 const h=harness();
 for(const [change,label,ready] of [
  [{selectedDevice:{id:'a',online:true},revitSessions:1,offlineFixture:false,liveRuntime:false},'Revit ready',true],
  [{selectedDevice:{id:'a',online:true},revitSessions:1,offlineFixture:false,liveRuntime:true},'Revit ready',false],
  [{selectedDevice:{id:'a',online:true},revitSessions:null,offlineFixture:false,liveRuntime:false},'Checking Revit',false],
  [{selectedDevice:{id:'a',online:true},revitSessions:0,offlineFixture:false,liveRuntime:false},'Enable Revit bridge',false],
  [{selectedDevice:{id:'a',online:true},revitSessions:2,offlineFixture:false,liveRuntime:false},'Checking Revit',false],
  [{selectedDevice:{id:'a',online:false},revitSessions:1,offlineFixture:false,liveRuntime:false},'Connect Revit',false],
  [{selectedDevice:{id:'a',online:true},revitSessions:1,offlineFixture:true,liveRuntime:false},'Revit unavailable',false],
 ]){
  const tree=h.render(change);
  const button=tree.nodes.find(node=>node.type==='button'&&node.props.className==='composer-tray-link device-status');
  const children=React.Children.toArray(button.props.children);
  assert.ok(children.some(child=>React.isValidElement(child)&&child.type==='span'&&child.props.children===label));
  const dot=children.find(child=>React.isValidElement(child)&&child.props.className==='composer-ready-dot');
  assert.equal(Boolean(dot),ready,label);
  if(dot)assert.equal(dot.props['aria-hidden'],'true');
 }
});
