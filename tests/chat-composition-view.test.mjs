import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import {answerCompletionCandidate} from '../src/lib/conversation-turns.mjs';

// Exercise delayed validation and React effect cleanup across an A–B–A scope switch.
test('late composition validation cannot cross an account or scope epoch',async()=>{
 const slots=[],effects=[],pending=[];let cursor=0,scope;
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=value;}];},useEffect(effect,deps){const i=cursor++;const row=slots[i]??={deps:null,cleanup:null};if(!row.deps||deps.some((value,j)=>!Object.is(value,row.deps[j])))effects.push(()=>{row.cleanup?.();row.cleanup=effect();row.deps=deps;});}};
 const exports={};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/chat-composition.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='./output-workspace')return {useOutputWorkspace:()=>({scope})};if(name==='@/lib/chat-composition.mjs')return {validateChatComposition:()=>new Promise(resolve=>pending.push(resolve))};if(name.endsWith('.module.css'))return {default:{}};return {};}});
 const original=React.createElement('original-answer');const value={spec:'same'},source={taskId:'task',state:'saved'},props={value,text:'same answer',source,turnId:'turn',children:original};
 const render=(key,epoch,taskId='task')=>{scope={key,epoch,taskId};cursor=0;return exports.ChatCompositionView(props);};
 const flush=()=>{while(effects.length)effects.shift()();};
 assert.equal(render('account-a/task',1),original);flush();
 assert.equal(render('account-b/task',2),original);flush();
 pending[0]({root:{type:'text',text:'old'}});await Promise.resolve();
 assert.equal(render('account-a/task',3),original);flush();
 pending[1]({root:{type:'text',text:'foreign'}});await Promise.resolve();
 assert.equal(render('account-a/task',3),original);
 pending[2]({root:{type:'text',text:'current'}});await Promise.resolve();
 assert.equal(render('account-a/task',3).props['aria-label'],'Illustrative answer view');
 assert.equal(render('account-a/task',4),original,'new epoch hides prior result before effect cleanup');
 assert.equal(render('account-a/other',5,'other'),original,'foreign task cannot render matching text');
});


test('late durable answer proof cannot cross account or task epochs',async()=>{
 const slots=[],effects=[],pending=[];let cursor=0,scope;
 const hooks={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=value;}];},useEffect(effect,deps){const i=cursor++;const row=slots[i]??={deps:null,cleanup:null};if(!row.deps||deps.some((value,j)=>!Object.is(value,row.deps[j])))effects.push(()=>{row.cleanup?.();row.cleanup=effect();row.deps=deps;});}};
 const exports={};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/conversation-answer.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='./output-workspace')return {AnswerContent:'answer-content',useOutputWorkspace:()=>({scope})};if(name==='@/lib/conversation-turns.mjs')return {answerCompletionCandidate:({turn,taskId})=>turn.completion?.taskId===taskId&&turn.completion?.turnId===turn.turnId,verifyAnswerCompletionHash:()=>new Promise(resolve=>pending.push(resolve))};if(name==='./chat-composition')return {ChatCompositionView:'composition'};if(name==='@/lib/project-sources.mjs'||name==='./project-citations')return {};throw Error(name);}});
 const props={text:'saved answer',source:{taskId:'task',state:'partial'},turnId:'turn',completion:{taskId:'task',turnId:'turn',answerHash:'hash'},presentation:{composition:{}}};
 const Bound=exports.ConversationAnswer(props).type;
 const render=(key,epoch,taskId='task')=>{scope={key,epoch,taskId};cursor=0;return Bound(props);};
 const flush=()=>{while(effects.length)effects.shift()();};
 assert.equal(render('a',1).props.completed,false);flush();
 assert.equal(render('b',2).props.completed,false);flush();
 pending[0](true);await Promise.resolve();
 assert.equal(render('a',3).props.completed,false);flush();
 pending[1](true);await Promise.resolve();assert.equal(render('a',3).props.completed,false);
 pending[2](true);await Promise.resolve();
 assert.equal(render('a',3).props.completed,true);assert.equal(render('a',3).props.source.state,'saved');
 assert.equal(render('a',4).props.completed,false);
 assert.equal(render('foreign',5,'other').props.completed,false);
});


test('direct answer component rejects foreign or malformed completion before hashing',async()=>{
 const effects=[];let digestCalls=0;
 const hooks={...React,useState(initial){return [initial,()=>{}];},useEffect(effect){effects.push(effect);}};
 const exports={};runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/conversation-answer.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='./output-workspace')return {AnswerContent:'answer-content',useOutputWorkspace:()=>({scope:{key:'a',epoch:1,taskId:'task'}})};if(name==='@/lib/conversation-turns.mjs')return {answerCompletionCandidate,verifyAnswerCompletionHash:()=>{digestCalls++;return Promise.resolve(true);}};if(name==='./chat-composition'||name==='@/lib/project-sources.mjs'||name==='./project-citations')return {};throw Error(name);}});
 const valid={schemaVersion:1,taskId:'task',turnId:'turn',executionId:'exec',answerHash:'a'.repeat(64),status:'completed',completionSequence:5};
 for(const completion of [{...valid,taskId:'foreign'},{...valid,turnId:'foreign'},{...valid,status:'failed'},{...valid,completionSequence:0},{...valid,extra:true}]){
  const props={text:'answer',source:{taskId:'task',state:'saved'},turnId:'turn',completion};
  const Bound=exports.ConversationAnswer(props).type;assert.equal(Bound(props).props.completed,false);effects.shift()();await Promise.resolve();
 }
 assert.equal(digestCalls,0);
});
