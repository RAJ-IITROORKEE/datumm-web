import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import * as rules from '../src/lib/question-stepper.mjs';

function harness(file){
 let slots=[],cursor=0,effects=[]; const storage=new Map();
 const hooks={...React,useId(){const i=cursor++;return slots[i]??=`test-id-${i}`;},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},useRef(initial){const i=cursor++;return slots[i]??=( {current:initial} );},useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||!deps||deps.some((v,j)=>v!==old[j])){slots[i]=deps;effects.push(fn);}}};
 const exports={}; const src=ts.transpileModule(readFileSync(new URL(`../src/components/${file}`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(src,{exports,Error,sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='@/lib/question-stepper.mjs')return rules;if(name==='@/components/ui/button')return {Button:'button'};if(name.endsWith('.module.css'))return {default:{}};return new Proxy({}, {get:()=> 'icon'});}});
 return {storage,outer(component,props){return exports[component](props);},render(component,props){cursor=0;effects=[];const outer=exports[component](props);const tree=outer.type(outer.props);const run=effects;effects=[];run.forEach(fn=>fn());return tree;},reset(){slots=[];}};
}
function nodes(tree){if(!React.isValidElement(tree))return [];return [tree,...React.Children.toArray(tree.props.children).flatMap(nodes)];}
const find=(tree,predicate)=>nodes(tree).find(predicate), all=(tree,predicate)=>nodes(tree).filter(predicate);
const submit=tree=>tree.props.onSubmit({preventDefault(){}});
const option=(tree,label)=>find(tree,n=>n.type==='label'&&nodes(n).some(c=>c.type==='span'&&React.Children.toArray(c.props.children).includes(label)));
const item=(id,question,options=[])=>({id,question,reason:'',required:true,inputKind:'text',unit:'',options});

test('hosted grouped answers keep ids, version, draft, validation and exactly one send on failure',async()=>{
 const h=harness('agent-questions.tsx'),calls=[];let reject;
 const question={id:'group',version:4,question:'Details',questions:[item('level','Which level?',[{id:'l1',label:'Level 1',recommended:true,rationale:''}]),{...item('width','Width?'),inputKind:'number',unit:'m'}]};
 const props={question,runId:'task-a',onReply:p=>{calls.push(p);return new Promise((_,r)=>{reject=r;});}};
 let tree=h.render('AgentQuestions',props);tree=h.render('AgentQuestions',props);
 assert.equal(all(tree,n=>n.type==='fieldset').length,2);assert.equal(all(tree,n=>n.type==='input'&&n.props.type==='radio'&&n.props.checked).length,0);
 find(option(tree,'Level 1'),n=>n.type==='input').props.onChange();tree=h.render('AgentQuestions',props);
 find(tree,n=>n.type==='input'&&n.props.type==='number').props.onChange({target:{value:'12'}});tree=h.render('AgentQuestions',props);
 submit(tree);submit(tree);assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{question_id:'group',question_version:4,answers:[{question_id:'level',option_id:'l1'},{question_id:'width',value:'12'}]});
 reject(Error('Changed question; refresh'));await new Promise(resolve=>setImmediate(resolve));tree=h.render('AgentQuestions',props);
 assert.equal(find(tree,n=>n.props.role==='alert').props.children,'Changed question; refresh');assert.equal(find(tree,n=>n.type==='input'&&n.props.type==='number').props.value,'12');assert.ok(h.storage.has('datumm-question:task-a:group:4'));
 h.reset();let other=h.render('AgentQuestions',{...props,runId:'task-b'});other=h.render('AgentQuestions',{...props,runId:'task-b'});assert.equal(find(other,n=>n.type==='input'&&n.props.type==='number').props.value,'');
});

test('native grouped multi and custom answers submit exact arrays once and retain input after failure',async()=>{
 const h=harness('opencode-questions.tsx'),calls=[];let reject;
 const props={question:{id:'q',questions:[{header:'Rooms',question:'Which?',multiple:true,options:[{label:'A',description:''},{label:'B',description:''}]},{header:'Level',question:'Where?',options:[{label:'L1',description:''}]}]},onAnswer:(a,intent)=>{calls.push([a,intent]);return new Promise((_,r)=>{reject=r;});}};
 let tree=h.render('OpenCodeQuestions',props);assert.equal(all(tree,n=>n.type==='fieldset').length,2);
 find(option(tree,'A'),n=>n.type==='input').props.onChange();tree=h.render('OpenCodeQuestions',props);
 const areas=all(tree,n=>n.type==='textarea');areas[0].props.onChange({target:{value:'C'}});tree=h.render('OpenCodeQuestions',props);
 find(option(tree,'L1'),n=>n.type==='input').props.onChange();tree=h.render('OpenCodeQuestions',props);
 submit(tree);submit(tree);assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0][0])),[['A','C'],['L1']]);
 reject(Error('Retry'));await new Promise(resolve=>setImmediate(resolve));tree=h.render('OpenCodeQuestions',props);
 assert.equal(find(tree,n=>n.props.role==='alert').props.children,'Retry');assert.equal(all(tree,n=>n.type==='textarea')[0].props.value,'C');
});


test('both question docks preserve answers and pending failures while hidden, then restore focus',async()=>{
 for(const [file,component,props,edit] of [
  ['agent-questions.tsx','AgentQuestions',{question:{id:'hosted',version:2,question:'Width',questions:[item('width','Width?')]},runId:'run'},'hosted'],
  ['opencode-questions.tsx','OpenCodeQuestions',{question:{id:'native',questions:[{header:'Width',question:'Width?',options:[]}] }},'native'],
 ]){
  const h=harness(file),calls=[];let reject;
  const send=(...args)=>{calls.push(args);return new Promise((_,r)=>{reject=r;});};
  const inputProps={...props,...(edit==='hosted'?{onReply:send}:{onAnswer:send})};
  let tree=h.render(component,inputProps);tree=h.render(component,inputProps);
  let field=find(tree,n=>n.type==='textarea');field.props.onChange({target:{value:'12'}});tree=h.render(component,inputProps);
  const toggle=()=>find(tree,n=>n.type==='button'&&n.props['aria-controls']);
  let details=find(tree,n=>n.props.id===toggle().props['aria-controls']);
  let focused=0;const target={isConnected:true,matches:()=>false,focus:()=>focused++};details.props.onFocusCapture({target});
  toggle().props.onClick();tree=h.render(component,inputProps);
  assert.equal(toggle().props['aria-expanded'],false);assert.equal(toggle().props.children,'Show');
  details=find(tree,n=>n.props.id===toggle().props['aria-controls']);assert.equal(details.props.hidden,true);
  assert.equal(find(tree,n=>n.type==='textarea').props.value,'12');assert.equal(calls.length,0);
  toggle().props.onClick();tree=h.render(component,inputProps);
  assert.equal(toggle().props['aria-expanded'],true);assert.equal(focused,1);
  submit(tree);tree=h.render(component,inputProps);assert.equal(calls.length,1);
  assert.equal(find(tree,n=>n.type==='fieldset').props.disabled,true);
  toggle().props.onClick();tree=h.render(component,inputProps);
  reject(Error('Try again'));await new Promise(resolve=>setImmediate(resolve));tree=h.render(component,inputProps);
  assert.equal(find(tree,n=>n.props.role==='alert').props.children,'Try again');
  assert.equal(find(tree,n=>n.props.id===toggle().props['aria-controls']).props.hidden,true);
  toggle().props.onClick();tree=h.render(component,inputProps);
  assert.equal(find(tree,n=>n.type==='textarea').props.value,'12');assert.equal(focused,2);
  submit(tree);assert.equal(calls.length,2);
 }
});

test('question identity changes remount the dock for a new question or hosted version',()=>{
 const hosted=harness('agent-questions.tsx');
 const p={runId:'a',question:{id:'q',version:1,question:'Question'},onReply:async()=>{}};
 const key=hosted.outer('AgentQuestions',p).key;
 assert.notEqual(hosted.outer('AgentQuestions',{...p,runId:'b'}).key,key);
 assert.notEqual(hosted.outer('AgentQuestions',{...p,question:{...p.question,version:2}}).key,key);
 const native=harness('opencode-questions.tsx');
 const n={question:{id:'q1',questions:[]},onAnswer:async()=>{}};
 assert.notEqual(native.outer('OpenCodeQuestions',n).key,native.outer('OpenCodeQuestions',{...n,question:{...n.question,id:'q2'}}).key);
});
