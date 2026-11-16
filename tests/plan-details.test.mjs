import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import {exactConceptName} from '../src/lib/drawing-export-identity.mjs';
import {drawingTitle} from '../src/lib/drawing-presentation.mjs';

const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/plan-details.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports,
  URLSearchParams,
  require(name) {
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === '@/lib/drawing-export-identity.mjs') return {exactConceptName};
    if (name === '@/lib/drawing-presentation.mjs') return {drawingTitle};
    if (name.endsWith('.module.css')) return { default: {} };
    return { Button: 'Button', PlanCanvas: 'PlanCanvas' };
  },
});
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}
function content(node) {
  if (!React.isValidElement(node)) return node == null ? '' : String(node);
  return React.Children.toArray(node.props.children).map(content).join(' ').replace(/\s+/g, ' ');
}
function visibleContent(node) {
  if (!React.isValidElement(node)) return node == null ? '' : String(node);
  const children = React.Children.toArray(node.props.children);
  return (node.type === 'details' && !node.props.open ? children.slice(0, 1) : children).map(visibleContent).join(' ').replace(/\s+/g, ' ');
}
function fixture(overrides = {}) {
  const drawing = { planId: 'plan-a', version: 4, fingerprint: 'exact-4', svg: '', graph: { rooms: [] } };
  return { surface: 'design', run: { id: 'task-9', currentPlanRef: { planId: 'plan-a' }, data: { agent_design: {briefId:'brief-9',
    candidates: [{ planId: 'plan-a', version: 4, fingerprint: 'exact-4' }, { planId: 'plan-b', version: 2, fingerprint: 'exact-b2' }], diagnostics: ['Concept only'],
  } } }, busy: false, drawingLoading: false, drawingError: '', drawingMissing: false,
    designVersion: drawing, drawingCurrent: true, compareVersion: { ...drawing, version: 3, fingerprint: 'exact-3' },
    canvasInputEnabled: true, persistentProperties: true, drawingStyle: 'linework', reviewAssumptions: ['Walls are proposed'],
    designDiff: 'Source-defined version comparison', scope:{key:'scope-task-9',epoch:1,accountKey:'account-a',taskId:'task-9',sourceKey:'task-9'}, onSelectAlternative:async()=>{}, compareDrawing() {}, setCompareVersion() {}, setDrawingRetry() {}, askFromCanvas() {}, ...overrides };
}

test('plan details retain exact export scope, read-only viewers and source version comparison', () => {
  const state = fixture(), exportsNodes = elements(exports.PlanDetails({...state,surface:'exports'})), nodes = elements(exports.PlanDetails(state));
  assert.deepEqual(exportsNodes.filter(n => n.type === 'a').map(n => n.props.href), [
    '/api/service/runs/task-9/export/svg?planId=plan-a&version=4&style=linework',
    '/api/service/runs/task-9/export/preview-png?planId=plan-a&version=4&style=linework',
    '/api/service/runs/task-9/export/plan-pdf?planId=plan-a&version=4&style=linework',
  ]);
  const viewers = nodes.filter(n => n.type === 'PlanCanvas');
  assert.equal(viewers.length, 2);
  assert.equal(viewers[0].props.drawing, state.compareVersion);
  assert.equal(viewers[1].props.drawing, state.designVersion);
  for (const viewer of viewers) {
    assert.equal(viewer.props.readOnly, true);
    assert.equal(viewer.props.canvasInputEnabled, true);
    assert.equal(viewer.props.persistentProperties, true);
  }
  assert.equal(viewers[1].props.onAsk, state.askFromCanvas);
  assert.ok(content(nodes[0]).includes(state.designDiff));
});

test('alternative, compare, close and retry actions preserve their callbacks and loading gates', () => {
  const calls = [], state = fixture({
    onSelectAlternative: selection => calls.push(selection), compareDrawing: kind => calls.push(kind),
    setCompareVersion: value => calls.push(value), setDrawingRetry: fn => calls.push(fn(3)),
  });
  let nodes = elements(exports.PlanDetails(state));
  const button = label => nodes.find(n => n.type === 'Button' && content(n).includes(label));
  button('Review/select Concept 2').props.onClick();
  assert.equal(calls[0].scope,state.scope); assert.equal(calls[0].taskId,'task-9'); assert.equal(calls[0].briefId,'brief-9'); assert.deepEqual({...calls[0].plan},state.run.data.agent_design.candidates[1]);
  button('Compare previous version').props.onClick(); button('Compare alternative').props.onClick(); button('Close comparison').props.onClick();
  assert.deepEqual(calls.slice(1), ['previous', 'alternative', null]);
  state.drawingError = 'Read failed'; state.drawingLoading = true; state.drawingCurrent = false;
  nodes = elements(exports.PlanDetails(state));
  assert.equal(button('Retry exact drawing').props.disabled, true);
  assert.equal(button('Compare previous version').props.disabled, true);
  state.drawingLoading = false;
  nodes = elements(exports.PlanDetails(state));
  button('Retry exact drawing').props.onClick();
  assert.equal(calls.at(-1), 4);
  assert.match(content(nodes[0]), /Retained reference/);
  assert.doesNotMatch(content(nodes[0]), /Older drawing/);
});


test('exports never create a comparison canvas or select an alternative, and capabilities exclude formats', () => {
  const calls = [];
  const state = fixture({surface:'exports',runtimeConfig:{supportedExports:['plan-pdf']},onSelectAlternative:value=>calls.push(value)});
  const nodes = elements(exports.PlanDetails(state));
  assert.equal(nodes.some(node=>node.type==='PlanCanvas'),false);
  assert.equal(nodes.some(node=>node.type==='Button'),false);
  assert.equal(calls.length,0);
  assert.deepEqual(nodes.filter(node=>node.type==='a').map(node=>node.props.href),['/api/service/runs/task-9/export/plan-pdf?planId=plan-a&version=4&style=linework']);
  assert.equal(exports.PlanDetails({...state,scope:{...state.scope,taskId:'foreign'}}),null);
  state.run.id='task /?'; state.scope.taskId=state.run.id; state.designVersion.planId='plan &/?';
  assert.equal(elements(exports.PlanDetails(state)).find(node=>node.type==='a').props.href,'/api/service/runs/task%20%2F%3F/export/plan-pdf?planId=plan+%26%2F%3F&version=4&style=linework');
});

test('Design and Exports use stable concept names and keep exact drawing identity behind collapsed technical details', () => {
  const state=fixture();
  for(const surface of ['design','exports']) {
    const tree=exports.PlanDetails({...state,surface}), all=elements(tree), visible=visibleContent(tree);
    assert.match(visible,/Concept 1 · Version 4/);
    assert.doesNotMatch(visible,/plan-a|exact-4|exact-3/);
    const technical=all.filter(node=>node.type==='details'&&content(node).includes('Drawing technical details'));
    assert.ok(technical.length);
    assert.ok(technical.every(node=>!node.props.open));
    assert.match(content(technical[0]),/Plan ID plan-a Version 4 Fingerprint exact-4/);
  }
  const selected=state.run.data.agent_design.candidates[1];
  const tree=exports.PlanDetails({...state,surface:'exports',designVersion:selected,run:{...state.run,currentPlanRef:selected}});
  assert.match(visibleContent(tree),/Concept 2 · Version 2/);
  assert.equal(elements(tree).find(node=>node.type==='a').props.href,'/api/service/runs/task-9/export/svg?planId=plan-b&version=2&style=linework');
});

test('alternative comparisons are not revision history and a failed comparison preserves its usable pair',()=>{
 const state=fixture({comparisonKind:'alternative',comparisonError:'Comparison service unavailable'});
 let tree=exports.PlanDetails(state),text=visibleContent(tree);
 assert.match(text,/Alternative concept/);assert.match(text,/Concept comparison/);
 assert.match(text,/Comparison unavailable/);assert.doesNotMatch(text,/drawing could not be loaded/);
 assert.equal(elements(tree).filter(node=>node.type==='PlanCanvas').length,2);
 assert.equal(elements(tree).find(node=>node.type==='PlanCanvas').props.drawing,state.compareVersion);
 const v1={...state.designVersion,version:1};
 tree=exports.PlanDetails({...state,designVersion:v1,compareVersion:null,comparisonError:'',designDiff:''});
 assert.ok(elements(tree).some(node=>node.type==='Button'&&content(node)==='Compare alternative'));
 assert.equal(elements(tree).some(node=>node.type==='Button'&&content(node)==='Compare previous version'),false);
 const exported=exports.PlanDetails({...state,surface:'exports'});
 assert.match(content(exported),/response fingerprint is not independently verified/);
 assert.doesNotMatch(content(exported),/exact saved drawing/);
});

test('uncertain selection keeps the drawing as a reference and offers read-only recovery',()=>{
 const calls=[],state=fixture({drawingCurrent:false,selectionUncertain:true,selectionError:'Selection could not be confirmed.',reconcilePlanSelection:()=>calls.push('check'),newTask:()=>calls.push('new')});
 const tree=exports.PlanDetails(state),nodes=elements(tree),text=visibleContent(tree);
 assert.match(text,/saved selection must be confirmed/);assert.doesNotMatch(text,/identity does not match/);
 assert.ok(nodes.filter(node=>node.type==='Button'&&content(node).startsWith('Review/select')).every(node=>node.props.disabled));
 nodes.find(node=>node.type==='Button'&&content(node)==='Check saved selection').props.onClick();
 assert.deepEqual(calls,['check']);
 assert.equal(nodes.filter(node=>node.type==='PlanCanvas').length,2);
});

test('recorded versions share a concept name and previous versions have no rollback selection action',()=>{
 const state=fixture(),current=state.designVersion;
 state.run.currentPlanRef=current;
 state.run.data.agent_design.candidates=[current,{...current,version:3,fingerprint:'exact-3'},state.run.data.agent_design.candidates[1]];
 const buttons=elements(exports.PlanDetails(state)).filter(node=>node.type==='Button'&&content(node).startsWith('Review/select'));
 assert.deepEqual(buttons.map(content),['Review/select Concept 1 · Version 4','Review/select Concept 1 · Version 3','Review/select Concept 2 · Version 2']);
 assert.equal(buttons[0].props.disabled,true);assert.equal(buttons[1].props.disabled,true);assert.equal(Boolean(buttons[2].props.disabled),false);
});


test('saved drawing exports disclose the loaded selected-style area basis without changing targets',()=>{
 const state=fixture({surface:'exports'}), svg='<svg data-renderer="dimensioned-v1"></svg>';
 const known=exports.PlanDetails({...state,designVersion:{...state.designVersion,lineworkSvg:svg}});
 assert.match(visibleContent(known),/Saved exports retain their recorded area labels/);
 assert.match(visibleContent(known),/loaded vector’s room areas include a wall allowance/);
 const expected=['/api/service/runs/task-9/export/svg?planId=plan-a&version=4&style=linework','/api/service/runs/task-9/export/preview-png?planId=plan-a&version=4&style=linework','/api/service/runs/task-9/export/plan-pdf?planId=plan-a&version=4&style=linework'];
 assert.deepEqual(elements(known).filter(node=>node.type==='a').map(node=>node.props.href),expected);
 const unknown=exports.PlanDetails({...state,designVersion:{...state.designVersion,svg,lineworkSvg:'<svg/>'}});
 assert.match(visibleContent(unknown),/room area basis is not specified/);
 assert.doesNotMatch(visibleContent(unknown),/include a wall allowance/);
 assert.deepEqual(elements(unknown).filter(node=>node.type==='a').map(node=>node.props.href),expected);
});
