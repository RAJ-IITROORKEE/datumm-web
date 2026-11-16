import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
function load(){const exports={};const file=readFileSync(new URL('../src/components/workspace/exports-panel.tsx',import.meta.url),'utf8');runInNewContext(ts.transpileModule(file,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require(name){if(name==='react/jsx-runtime')return jsx;if(name.endsWith('.module.css'))return {default:{}};if(name==='./plan-details')return {PlanDetails:'PlanDetails'};return {};}});return exports.ExportsPanel;}
const nodes=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(nodes)]:[];
const text=tree=>React.isValidElement(tree)?React.Children.toArray(tree.props.children).map(text).join(' '):tree==null?'':String(tree);
const scope={taskId:'task',key:'key',epoch:1,accountKey:'account',sourceKey:'source'};
const actions={openDrawing(){},openAnswerOutput(){},openSavedReport(){}};
test('exports identify browser capture, server fingerprint limits, report model revision and streaming state',()=>{
 const Panel=load(),workspace={run:{id:'task',data:{agent_design:{}}},designVersion:{planId:'plan',version:2,fingerprint:'fingerprint'},drawingStyle:'linework',runtimeConfig:{supportedExports:[]},exportItems:[]};
 const output=(id,taskId,state,complete)=>({id,title:id,source:{taskId,state,conversationIndex:0},complete,kind:'table'});
 const report={sourceKind:'measured',source:'model',modelRevision:7,planVersion:2,documentId:'document'};
 const tree=Panel({workspace,scope,actions,report,outputs:[output('stream','task','streaming',false),output('foreign','other','saved',true)]});
 const body=text(tree);assert.match(body,/white 2D sheet/);assert.match(body,/3D viewport/);assert.doesNotMatch(body,/Saved drawing export source/);assert.match(body,/Source model revision/);assert.match(body,/not a saved report revision/);assert.match(body,/export awaits completion/);assert.doesNotMatch(body,/foreign/);
 const legacy=Panel({workspace:{...workspace,run:{id:'task',data:{}}},scope,actions,report:null,outputs:[]});assert.ok(nodes(legacy).some(node=>node.type==='summary'&&text(node)==='Loaded drawing source'));assert.match(text(legacy),/not passed to that request/);
 const foreign=Panel({workspace:{...workspace,run:{id:'other',data:{}}},scope,actions,report,outputs:[]});assert.doesNotMatch(text(foreign),/fingerprint/);
});
