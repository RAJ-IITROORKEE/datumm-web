import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as jsx from 'react/jsx-runtime';
import * as projectSources from '../src/lib/project-sources.mjs';
import ts from 'typescript';
import {answerHasCompletionProof,legacyAnswerOutputState,answerCompletionCandidate,verifyAnswerCompletionHash} from '../src/lib/conversation-turns.mjs';

const source=readFileSync(new URL('../src/components/workspace/conversation-answer.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
runInNewContext(code,{exports,require(name){if(name==='react/jsx-runtime')return jsx;if(name==='react')return {};if(name==='@/lib/conversation-turns.mjs')return {answerCompletionCandidate,verifyAnswerCompletionHash};if(name==='./output-workspace')return {AnswerContent:'answer-content'};if(name==='./chat-composition')return {ChatCompositionView:'chat-composition'};if(name==='@/lib/project-sources.mjs')return projectSources;if(name==='./project-citations')return {ProjectCitations:'project-citations'};throw Error(name);}});

test('answer remains scoped to its saved presentation without interactive suggestions',()=>{
 const presentation={summary:'Done',nextPrompts:['Compare alternatives']};
 const source={key:'answer-a',taskId:'task-a',conversationIndex:1,state:'saved'};
 const answer=exports.ConversationAnswer({text:'Done',source,turnId:'turn-a',presentation,completed:true});
 assert.equal(answer.type,'answer-content');assert.equal(answer.props.presentation,presentation);assert.equal(answer.props.turnId,'turn-a');
 const partial=exports.ConversationAnswer({text:'Working',source:{...source,state:'streaming'},turnId:'turn-a',presentation,completed:false});
 assert.equal(partial.props.presentation,undefined);assert.equal(partial.props.turnId,undefined);
});

test('only completed optional composition wraps the same answer fallback',()=>{
 const source={key:'answer-a',taskId:'task-a',conversationIndex:1,state:'saved'},composition={schemaVersion:1};
 const result=exports.ConversationAnswer({text:'Done',source,turnId:'turn-a',presentation:{composition},completed:true});
 assert.equal(result.type,'chat-composition');assert.equal(result.props.value,composition);
 assert.equal(result.props.children.type,'answer-content');assert.equal(result.props.children.props.text,'Done');
 const streaming=exports.ConversationAnswer({text:'Done',source,turnId:'turn-a',presentation:{composition},completed:false});
 assert.equal(streaming.type,'answer-content');
});

test('a long historical table remains saved while unproven composition is withheld',()=>{
 const text='| Name |\n| --- |\n| '+ 'A'.repeat(2001)+' |';
 const turn={turnId:'turn-a',answer:text}, scope={taskId:'task-a',turnId:'turn-a',executionId:'execution-a'};
 const events=[{...scope,stage:'answer',detail:text.slice(0,2000),sequence:1},{...scope,stage:'completed',sequence:2}];
 const completed=answerHasCompletionProof({turn,turns:[turn],taskId:'task-a',events});
 const state=legacyAnswerOutputState({last:false,executing:false,taskStatus:'completed',historicalStatus:'completed'});
 const result=exports.ConversationAnswer({text,turnId:turn.turnId,source:{key:'answer-a',taskId:'task-a',conversationIndex:0,state},presentation:{composition:{schemaVersion:1}},completed});
 assert.equal(result.type,'answer-content');
 assert.equal(result.props.source.state,'saved');
 assert.equal(result.props.text,text);
 assert.equal(result.props.presentation,undefined);
});
