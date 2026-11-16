import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';

function harness(){
 let slots=[],cursor=0,effects=[];
 const hooks={...React,useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old[j])){slots[i]=deps;effects.push(fn);}}};
 const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const workflow={};runInNewContext(compile('../src/lib/workflow-state.ts'),{exports:workflow});
 const exports={};runInNewContext(compile('../src/components/workspace/project-overview.tsx'),{exports,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='@/lib/workflow-state')return workflow;if(name==='@/components/ui/dialog')return {Dialog:'dialog',DialogContent:'content',DialogDescription:'description',DialogHeader:'header',DialogTitle:'title'};if(name==='@/components/ui/button')return {Button:'action'};if(name.endsWith('.css'))return {default:{}};throw Error(name);}});
 return {render(props){cursor=0;effects=[];const tree=exports.ProjectOverview(props);effects.forEach(fn=>fn());return tree;}};
}
function nodes(tree){if(!React.isValidElement(tree))return [];return [tree,...React.Children.toArray(tree.props.children).flatMap(nodes)];}
const find=(tree,predicate)=>nodes(tree).find(predicate);
const filter=(tree,label)=>find(tree,n=>n.type==='button'&&n.props['aria-pressed']!==undefined&&n.props.children[0]===label);
const rows=tree=>nodes(find(tree,n=>n.props['aria-label']==='Project chats')).filter(n=>n.type==='button').map(n=>n.props.children);
const chat=(id,status,data={},projectId='a')=>({id,title:id,status,data,projectId,mode:'ask'});

test('filters loaded project chats by real lifecycle and pending question, resetting on project change',()=>{
 const h=harness(),chats=[chat('queued','queued'),chat('running','running'),chat('waiting','needs_input',{agent_question:{id:'q'}}),chat('native','needs_input',{opencode_questions:[{id:'n'}]}),chat('stale','completed',{agent_question:{id:'old'}}),chat('failed','failed'),chat('no question','needs_input'),chat('foreign','running',{},'b')];
 const props={project:{id:'a',title:'A'},chats,historyView:'recent',busy:false,opener:{current:null},onClose(){},onSelect(){},onNewChat(){}};
 let tree=h.render(props);tree=h.render(props);
 assert.equal(filter(tree,'All').props['aria-pressed'],true);assert.equal(filter(tree,'All').props.children[2].props.children,7);
 filter(tree,'Running').props.onClick();tree=h.render(props);assert.deepEqual(rows(tree),['queued','running']);
 filter(tree,'Needs your input').props.onClick();tree=h.render(props);assert.deepEqual(rows(tree),['waiting','native']);
 assert.equal(filter(tree,'Needs your input').props.children[2].props.children,2);
 tree=h.render({...props,project:{id:'b',title:'B'}});assert.equal(filter(tree,'All').props['aria-pressed'],true);assert.deepEqual(rows(tree),['foreign']);
 tree=h.render({...props,project:{id:'b',title:'B'}});filter(tree,'Needs your input').props.onClick();tree=h.render({...props,project:{id:'b',title:'B'}});
 assert.deepEqual(rows(tree),[]);assert.match(find(tree,n=>n.type==='p').props.children,/No loaded chats need your input/);
});

test('selection uses the latest matching loaded record and preserves new-chat action',()=>{
 const h=harness(),selected=[],created=[];let closed=0;
 const props={project:{id:'a',title:'A'},chats:[chat('one','running')],historyView:'recent',busy:false,opener:{current:null},onClose(){closed++;},onSelect:value=>selected.push(value),onNewChat:id=>created.push(id)};
 let tree=h.render(props);const click=find(tree,n=>n.type==='button'&&n.props.children==='one');click.props.onClick();assert.equal(closed,1);
 const updated=chat('one','completed');tree=h.render({...props,chats:[updated]});find(tree,n=>n.type==='content').props.onCloseAutoFocus({preventDefault(){}});assert.equal(selected[0],updated);
 find(tree,n=>n.type==='action').props.onClick();find(tree,n=>n.type==='content').props.onCloseAutoFocus({preventDefault(){}});assert.deepEqual(created,['a']);
});
