import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
const source=readFileSync(new URL('../src/components/agent-memory.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};runInNewContext(code,{exports,require(name){if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.module.css'))return {default:{}};return {Button:'button'};}});
const fixture=JSON.parse(readFileSync(new URL('./fixtures/revision-flow-v4-progress-usage.json',import.meta.url),'utf8'));
test('actual hosted usage keeps estimated context separate from shared ledger totals',()=>{
 const usage={...fixture.data.usage,rootTaskId:'task',ownerTaskId:'task',ledgerExecutionId:'ledger',ledgerShared:true,scope:'execution_ledger'};
 const html=renderToStaticMarkup(React.createElement(exports.ContextUsage,{usage}));
 assert.match(html,/Estimated input · latest main request/);assert.match(html,/7,108 input tokens · estimated/);assert.match(html,/4,990 \/ 633/);assert.match(html,/Shared execution ledger total/);assert.match(html,/42,628 input · 11,571 output/);assert.match(html,/Context compaction/);assert.doesNotMatch(html,/OpenCode compaction|included in output/);
});
test('missing usage and partial totals do not become zero or a fabricated percentage',()=>{
 const absent=renderToStaticMarkup(React.createElement(exports.ContextUsage,{}));assert.match(absent,/Unavailable/);assert.doesNotMatch(absent,/progressbar/);
 const usage=structuredClone(fixture.data.usage);usage.context.estimatedWindowUtilization=null;usage.cumulative.inputTokens=null;usage.cumulative.outputTokens=0;usage.cumulative.usageCoverage='partial';
 const html=renderToStaticMarkup(React.createElement(exports.ContextUsage,{usage}));assert.doesNotMatch(html,/progressbar/);assert.match(html,/partial/);assert.match(html,/Unavailable input · 0 output/);
});

test('a non-reducing attempt reports retained context without inventing savings or erasing prior successes',()=>{
 for(const successful of [0,2]){
  const usage=structuredClone(fixture.data.usage);
  usage.context.applicationPressure='compact_before_next_step';
  usage.compaction={state:'not_reduced',count:successful,lastCompletedAt:successful?'2026-11-14T19:00:00Z':null,beforeEstimatedTokens:6807,afterEstimatedTokens:6878};
  const html=renderToStaticMarkup(React.createElement(exports.ContextUsage,{usage}));
  assert.match(html,/No safe reduction/);assert.match(html,/Exact context was retained; this attempt saved no tokens/);
  assert.match(html,/near the application limit; exact context is retained/);assert.doesNotMatch(html,/will be compacted before the next step/);
  assert.match(html,/Input \/ proposed input/);assert.match(html,/6,807 \/ 6,878 estimated tokens/);
  assert.doesNotMatch(html,/not_reduced|failed|Before \/ after/);
  if(successful){assert.match(html,/2 summaries/);assert.match(html,/Last successful compaction/);}
  else {assert.match(html,/Exact context retained/);assert.doesNotMatch(html,/Last successful compaction|0 summaries/);}
 }
 const usage=structuredClone(fixture.data.usage);usage.compaction={...usage.compaction,state:'failed',count:0};
 const failed=renderToStaticMarkup(React.createElement(exports.ContextUsage,{usage}));
 assert.match(failed,/failed/);assert.doesNotMatch(failed,/No safe reduction|saved no tokens/);
});
test('compact usage keeps scope, partial totals and unknown values visible with details available',()=>{
 const usage=structuredClone(fixture.data.usage);usage.scope='execution_ledger';usage.ledgerShared=true;usage.cumulative.usageCoverage='partial';usage.cumulative.inputTokens=null;
 const html=renderToStaticMarkup(React.createElement(exports.ContextUsage,{usage,compact:true}));
 assert.match(html,/Estimated input · latest main request/);assert.match(html,/Shared execution ledger total · partial: Unavailable input/);assert.match(html,/aria-label="Estimated input context window used"/);
 assert.ok(html.indexOf('OpenCode&#x27;s native context reading')>html.indexOf('<summary>Usage details</summary>'));
 const nativeUsage={contextPercent:null,contextTokens:120,contextCapacityTokens:null,updatedAt:'2026-11-15T00:00:00Z',tokens:{input:10,output:4,reasoning:1,cache:{read:0,write:0}}};
 const native=renderToStaticMarkup(React.createElement(exports.ContextUsage,{nativeUsage,usage,compact:true}));
 assert.match(native,/OpenCode context · root session/);assert.match(native,/Unavailable/);assert.doesNotMatch(native,/role="progressbar"/);assert.match(native,/child sessions excluded/);assert.match(native,/Shared execution ledger total · partial/);assert.match(native,/<summary>Usage details<\/summary>/);
});
