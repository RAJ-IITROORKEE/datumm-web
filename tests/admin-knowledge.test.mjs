import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import {CORPORA} from '../src/lib/admin-config.mjs';

// Exercise actual mutation handlers with a controlled service response.
function harness(client, data=[]) {
  const slots=[];let cursor=0,reads=0;
  const shared={knowledge:{url:'',title:'',corpus:'other'},knowledgePending:false,knowledgeUnknown:false,knowledgeResult:null,knowledgeNotice:'',
    setKnowledge(value){shared.knowledge=value;},allowKnowledgeRetry(){shared.knowledgeUnknown=false;},
    async submitKnowledge(){if(shared.knowledgePending||shared.knowledgeUnknown)return false;shared.knowledgePending=true;const form=shared.knowledge;
      const result=await client('admin/knowledge/sources',{method:'POST',body:{url:form.url.trim(),corpus:form.corpus,...(form.title.trim()&&{title:form.title.trim()})}});
      shared.knowledgePending=false;if(result.ok){shared.knowledge={url:'',title:'',corpus:form.corpus};return true;}shared.knowledgeResult=result;if(result.reason==='error')shared.knowledgeUnknown=true;return false;}};
  const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},useRef(initial){const i=cursor++;return slots[i]??={current:initial};}};
  const exports={};
  function Field({label,children}){return jsx.jsx('div',{children:children({'aria-label':label})});}
  function ResultState(){return null;}
  const source=readFileSync(new URL('../src/components/admin/data-sections.tsx',import.meta.url),'utf8');
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsx;
    if(name==='./form')return {Field,PageHeader:()=>null,useSharedAdminConfig:()=>shared};
    if(name==='./use-admin')return {useAdminClient:()=>client,useAdminResource:()=>({data,result:{ok:true,data},load:async()=>{reads++;}}),ResultState};
    if(name==='@/lib/admin-config.mjs')return {CORPORA};
    if(name==='@/components/ui/button')return {Button:'button'};
    if(name==='@/components/ui/input')return {Input:'input',Select:'select'};
    if(name.endsWith('.module.css'))return {default:{}};
    return new Proxy({},{get:()=>()=>null});
  }});
  return {render(){cursor=0;return elements(exports.KnowledgeSection());},get reads(){return reads;}};
}
function elements(tree){
  if(!React.isValidElement(tree))return [];
  if(typeof tree.type==='function'&&['Field','Table','RecordSearch','EmptyState'].includes(tree.type.name))return elements(tree.type(tree.props));
  return [tree,...React.Children.toArray(tree.props.children).flatMap(elements)];
}
const control=(h,label)=>h.render().find(el=>el.props['aria-label']===label);
const submit=h=>h.render().find(el=>el.type==='form').props.onSubmit({preventDefault(){}});

test('knowledge admission prevents duplicate mutations and preserves failed source inputs before retry',async()=>{
  const writes=[];let finish;
  const h=harness((path,init)=>{writes.push({path,...init});return new Promise(resolve=>{finish=resolve;});});
  control(h,'Source URL').props.onChange({target:{value:'https://example.invalid/review'}});
  control(h,'Title (optional)').props.onChange({target:{value:'設計 · Zoë'}});
  const first=submit(h),duplicate=submit(h);
  assert.equal(writes.length,1);
  assert.equal(h.render().find(el=>el.type==='fieldset').props.disabled,true);
  finish({ok:false,reason:'error',message:'Synthetic save failed'});
  await Promise.all([first,duplicate]);
  assert.equal(control(h,'Source URL').props.value,'https://example.invalid/review');
  assert.equal(control(h,'Title (optional)').props.value,'設計 · Zoë');
  assert.equal(h.reads,0);
  await submit(h);assert.equal(writes.length,1,'Unknown outcome cannot be retried without explicit review');
  h.render().find(el=>el.type==='button'&&el.props.children==='Refresh sources').props.onClick();
  assert.equal(h.reads,1,'The user can refresh the source list before allowing a retry');
  h.render().find(el=>el.type==='button'&&el.props.children==='I checked; allow retry').props.onClick();
  const retry=submit(h);
  assert.equal(writes.length,2);
  assert.equal(writes[1].method,'POST');
  assert.equal(writes[1].body.title,'設計 · Zoë');
  finish({ok:true,data:null});await retry;
  assert.equal(h.reads,2);
  assert.equal(control(h,'Source URL').props.value,'');
  assert.equal(control(h,'Title (optional)').props.value,'');
});

test('knowledge deletion requires confirmation and is bound to the selected source',async()=>{
  const writes=[];let finish;
  const h=harness((path,init)=>{writes.push({path,...init});return new Promise(resolve=>{finish=resolve;});},[{id:'source-a',url:'https://example.invalid/a',title:'Guide A',corpus:'revit',status:'ready',chunks:2},{id:'source-b',url:'https://example.invalid/b',title:'Guide B',corpus:'other',status:'ready',chunks:4}]);
  control(h,'Delete Guide B').props.onClick();
  assert.equal(writes.length,0);
  h.render().find(el=>el.type==='button'&&el.props.children==='Cancel').props.onClick();
  assert.equal(writes.length,0);
  control(h,'Delete Guide B').props.onClick();
  const confirm=h.render().find(el=>el.type==='button'&&el.props.children==='Confirm delete');
  confirm.props.onClick();confirm.props.onClick();
  assert.equal(writes.length,1);
  assert.equal(writes[0].path,'admin/knowledge/sources/source-b');
  assert.equal(writes[0].method,'DELETE');
  finish({ok:true,data:null});await new Promise(setImmediate);
  assert.equal(h.reads,1);
});
