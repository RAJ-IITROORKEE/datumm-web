import test from 'node:test';
import assert from 'node:assert/strict';
import { projectBrief } from '../src/lib/project-brief.mjs';
const run = (data = {}, extra = {}) => ({ id: 'task-a', title: 'Concept', projectId: 'project-a', status:'completed', data, ...extra });
const project = { id: 'project-a', title: 'Studio', isDefault: true };

test('binds selected task and known project before exposing any task data', () => {
 const value = run({agent_memory:{originalGoal:'Private goal'}});
 assert.equal(projectBrief(value, 'task-b', project).state, 'no-task');
 assert.equal(projectBrief(value, 'task-a', {id:'other'}).state, 'project-mismatch');
 assert.deepEqual(projectBrief(null, 'task-a', project).sections, []);
 assert.equal(projectBrief(value, 'task-a', project).association, 'matched');
 assert.equal(projectBrief(value, 'task-a', null).association, 'unavailable');
 assert.equal(projectBrief(run({}, {projectId:undefined}), 'task-a', project).association, 'unknown');
});

test('keeps interpretations and handoff separate without promoting provenance or unknown answers', () => {
 const projection = projectBrief(run({ agent_interpreted_brief:{ status:'confirmed', values:{width:{value:12,provenance:'user'}, entry:{value:'north',provenance:'proposed'}}, assumptions:['Single floor'], unresolved:['Height'] }, agent_memory:{version:3, schemaVersion:1, originalGoal:'Make a plan', answers:[{secret:'DO_NOT_SHOW'}], nextAction:'ask_user', unresolvedOperationIds:['op-1']} }), 'task-a', project);
 assert.deepEqual(projection.sections.map(x => x.kind), ['interpretation','handoff']);
 assert.deepEqual(projection.sections[0].values.map(x => x.value), ['12','north']);
 assert.deepEqual(projection.sections[0].assumptions, ['Single floor']);
 assert.deepEqual(projection.sections[0].unresolved, ['Height']);
 assert.ok(!JSON.stringify(projection).includes('DO_NOT_SHOW'));
});

test('retains conflicting records separately and binds accepted assumptions to exact plan identity', () => {
 const data = { agent_interpreted_brief:{values:{entry:{value:'north',provenance:'source'}}}, agent_memory:{originalGoal:'Entry south'} };
 const acceptance = {plan:{planId:'p',version:1,fingerprint:'abc'},acceptedAssumptions:['Entry east']};
 const projection = projectBrief(run(data,{acceptance,currentPlanRef:{planId:'p',version:2,fingerprint:'def'}}),'task-a',project);
 assert.deepEqual(projection.sections.map(s=>s.kind), ['interpretation','handoff','accepted']);
 assert.equal(projection.sections[2].relation,'different');
 assert.equal(projectBrief(run(data,{acceptance,currentPlanRef:acceptance.plan}),'task-a',project).sections[2].relation,'current');
 assert.equal(projectBrief(run(data,{acceptance}),'task-a',project).sections[2].relation,'unknown');
 for (const currentPlanRef of [{planId:'p'}, {planId:'p',version:1}, {planId:'p',version:1,fingerprint:''}, {planId:'p',version:NaN,fingerprint:'abc'}]) assert.equal(projectBrief(run(data,{acceptance,currentPlanRef}),'task-a',project).sections[2].relation,'unknown');
 assert.equal(projectBrief(run(data,{acceptance:{...acceptance,plan:{...acceptance.plan,fingerprint:''}}}),'task-a',project).sections.length,2);
});

test('empty and partial records never create invented decisions and switching tasks replaces content', () => {
 assert.deepEqual(projectBrief(run(), 'task-a', project).sections, []);
 assert.deepEqual(projectBrief(run({agent_memory:{answers:['untyped']}}), 'task-a', project).sections, []);
 const first = projectBrief(run({agent_memory:{originalGoal:'First'}}), 'task-a', project);
 const second = projectBrief(run({agent_memory:{originalGoal:'Second'}},{id:'task-b'}), 'task-b', project);
 assert.equal(first.sections[0].goal,'First'); assert.equal(second.sections[0].goal,'Second');
 assert.equal(projectBrief(run({agent_memory:{originalGoal:'First'}}), 'task-b', project).state,'no-task');
});

test('draft action closes only after the caller accepts; missing task has no action', async () => {
 const {readFileSync} = await import('node:fs');
 const {runInNewContext} = await import('node:vm');
 const React = await import('react');
 const jsx = await import('react/jsx-runtime');
 const ts = (await import('typescript')).default;
 const js = ts.transpileModule(readFileSync(new URL('../src/components/project-context.tsx', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const workflow = {};
 const workflowJs = ts.transpileModule(readFileSync(new URL('../src/lib/workflow-state.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 runInNewContext(workflowJs,{exports:workflow});
 const requireModule = name => name === 'react' ? React : name === 'react/jsx-runtime' ? jsx : name === '@/lib/project-brief.mjs' ? {projectBrief} : name === './project-brief-editor' ? {useProjectBriefEditor:()=>({}),ProjectBriefEditor:'ProjectBriefEditor'} : name === '@/lib/workflow-state' ? workflow : name.endsWith('.module.css') ? {default:new Proxy({}, {get:(_,key)=>key})} : new Proxy({}, {get:(_,key)=>String(key)});
 // Stub the one ref; the interaction does not need a DOM renderer.
 const hooks = {...React,useRef:()=>({current:false})};
 class Element { constructor() { this.isConnected = true; this.focused = false; } getClientRects(){return [1];} closest(){return null;} focus(){this.focused = true;} }
 const opener = new Element(), composer = new Element();
 const document = {activeElement:opener,querySelector:()=>composer};
 const out = {}; runInNewContext(js,{exports:out,require:name => name === 'react' ? hooks : requireModule(name),document,HTMLElement:Element});
 const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' ? [node,...flatten(node.props?.children)] : [];
 let closed = 0, attempts = 0;
 const props = {open:true,onOpenChange:()=>closed++,run:run(),selectedTaskId:'task-a',project,onAmendDraft:()=>{attempts++;return false;}};
 let tree = out.ProjectContext(props);
 flatten(tree).find(node=>node.type==='button').props.onClick();
 assert.equal(attempts,1); assert.equal(closed,0);
 tree = out.ProjectContext({...props,onAmendDraft:()=>true});
 flatten(tree).find(node=>node.type==='button').props.onClick();
 assert.equal(closed,1);
 tree = out.ProjectContext({...props,selectedTaskId:'task-b'});
 assert.equal(flatten(tree).some(node=>node.type==='button'),false);
 for (const task of [run({}, {status:'running'}), run({agent_question:{id:'q'}},{status:'needs_input'}), run({opencode_questions:[{id:'q'}]},{status:'completed'})]) {
   tree = out.ProjectContext({...props,run:task,onAmendDraft:()=>{attempts++;}});
   const button = flatten(tree).find(node=>node.type==='button');
   assert.equal(button.props.disabled,true); button.props.onClick();
 }
 assert.equal(attempts,1); assert.equal(closed,1);
 tree = out.ProjectContext(props);
 const dialog = flatten(tree).find(node=>node.type==='DialogContent');
 let prevented = 0;
 dialog.props.onOpenAutoFocus();
 dialog.props.onCloseAutoFocus({preventDefault:()=>prevented++});
 assert.equal(opener.focused,true); assert.equal(prevented,1);
 opener.isConnected = false;
 dialog.props.onCloseAutoFocus({preventDefault:()=>prevented++});
 assert.equal(composer.focused,true);
 let used=0;const useTree=out.ProjectContext({...props,onUseBrief:()=>{used++;return true;}});
 const editor=flatten(useTree).find(node=>node.type==='ProjectBriefEditor');
 assert.equal(editor.props.onUseBrief('reference'),true);assert.equal(editor.props.onUseBrief('reference'),false);assert.equal(used,1);assert.equal(closed,2);
 const rejected=out.ProjectContext({...props,onUseBrief:()=> 'Draft too long'});const rejectedEditor=flatten(rejected).find(node=>node.type==='ProjectBriefEditor');
 assert.equal(rejectedEditor.props.onUseBrief('reference'),'Draft too long');assert.equal(closed,2);
});


test('labels known fields and camel case for readers', () => {
 const result = projectBrief(run({agent_interpreted_brief:{values:{dimensionRole:{value:'site'},entry:{value:'north'},wallHeightMm:{value:3000}}}}),'task-a',project);
 assert.deepEqual(result.sections[0].values.map(row=>row.label), ['Dimensions describe','Entrance direction','Wall Height Mm']);
});

test('captured initial and read-only follow-up distinguish proposed geometry and interpreted assumptions', async () => {
 const {readFileSync} = await import('node:fs');
 const {briefChips} = await import('../src/lib/project-brief.mjs');
 const snapshots = JSON.parse(readFileSync(new URL('./fixtures/progress-usage-briefs.json', import.meta.url),'utf8'));
 for (const snapshot of snapshots) {
  const chips = briefChips(snapshot);
  assert.ok(chips.includes('Proposed footprint: 10,000 × 8,000 mm'));
  assert.ok(chips.includes('Proposed entry: south'));
  assert.ok(chips.includes('1 bathroom · Assumed'));
  const interpreted = projectBrief(snapshot,snapshot.id,project).sections[0];
  const dimension = interpreted.values.find(row=>row.label === 'Footprint');
  assert.equal(dimension.provenance, 'explicit');
  assert.equal(dimension.sourceText, '10 m wide by 8 m deep');
  assert.equal(interpreted.values.find(row=>row.label === 'Bathrooms').provenance, 'assumed');
 }
 assert.deepEqual(briefChips(snapshots[0]),briefChips(snapshots[1]));
});

test('site and parcel remain their recorded roles; unknown provenance is not confirmed', async () => {
 const {briefChips} = await import('../src/lib/project-brief.mjs');
 const task = run({agent_interpreted_brief:{dimensions:[{role:'site',widthMm:'20000',depthMm:'15000',provenance:'explicit'},{role:'parcel',widthMm:'22000',depthMm:'18000',provenance:'explicit'},{role:'footprint',widthMm:'10000',depthMm:'8000'}],values:{bathrooms:{value:2}},unresolved:[]}});
 const values = projectBrief(task,'task-a',project).sections[0].values;
 assert.deepEqual(values.map(row=>row.label),['Bathrooms','Site','Parcel','Footprint']);
 assert.deepEqual(briefChips(task),['2 bathrooms · Source not established']);
});

test('multiple recorded dimension roles stay distinct and deferred issues are not required questions', async () => {
 const {briefChips} = await import('../src/lib/project-brief.mjs');
 const data = {agent_interpreted_brief:{status:'ready',dimensions:[
  {role:'parcel',widthMm:'18000',depthMm:'14000',provenance:'explicit',sourceText:'18 m wide by 14 m deep'},
  {role:'footprint',widthMm:'10000',depthMm:'8000',provenance:'explicit',sourceText:'10 m wide by 8 m deep'},
 ],values:{dimensionRole:{value:'footprint',provenance:'explicit'},bathrooms:{value:1,provenance:'explicit'}},unresolved:['jurisdiction','setbacks','height'],deferred:['jurisdiction','setbacks'],assumptions:[]}};
 const interpreted = projectBrief(run(data),'task-a',project).sections[0];
 assert.deepEqual(interpreted.values.map(row=>row.label),['Bathrooms','Parcel','Footprint']);
 assert.equal(interpreted.sourceOnly[0].value,'footprint');
 assert.equal(interpreted.sourceOnly[0].provenance,'explicit');
 assert.deepEqual(interpreted.unresolved,['height']);
 assert.deepEqual(interpreted.deferred,['jurisdiction','setbacks']);
 assert.deepEqual(briefChips(run(data)),['1 bathroom · Explicitly supplied','1 to confirm']);
 const unknown = structuredClone(data);
 unknown.agent_interpreted_brief.dimensions[0].role = 'unknown';
 const values = projectBrief(run(unknown),'task-a',project).sections[0].values;
 assert.equal(values[1].label,'Unknown');
 assert.equal(values[1].sourceText,'18 m wide by 14 m deep');
 assert.equal(projectBrief(run(unknown),'task-a',project).sections[0].sourceOnly[0].value,'footprint');
 const deferredOnly = run({agent_interpreted_brief:{deferred:['setbacks'],unresolved:['setbacks']}});
 assert.deepEqual(projectBrief(deferredOnly,'task-a',project).sections[0].deferred,['setbacks']);
 assert.deepEqual(briefChips(deferredOnly),[]);
});

test('captured multi-role successful concept keeps deferred issues separate', async () => {
 const {readFileSync} = await import('node:fs');
 const {briefChips} = await import('../src/lib/project-brief.mjs');
 const task = JSON.parse(readFileSync(new URL('./fixtures/brief-success-initial.json', import.meta.url),'utf8'));
 const section = projectBrief(task,task.id,project).sections[0];
 assert.equal(section.status,'fallback');
 assert.deepEqual(section.values.filter(row=>['Parcel','Footprint'].includes(row.label)).map(row=>[row.label,row.value]),[['Parcel','Width 18000 mm · Depth 14000 mm'],['Footprint','Width 10000 mm · Depth 8000 mm']]);
 assert.ok(!section.values.some(row=>row.label==='Dimensions describe'));
 assert.equal(section.sourceOnly[0].value,'footprint');
 assert.deepEqual(section.unresolved,[]);
 assert.deepEqual(section.deferred,['jurisdiction','setbacks']);
 assert.ok(!briefChips(task).some(chip=>chip.includes('to confirm')));
 assert.ok(briefChips(task).includes('1 bathroom · Explicitly supplied'));
});


test('captured revision role conflict stays in source details without relabeling the dimension', () => {
 // Extracted from the saved revision task: its role field and dimension disagree.
 const task = run({agent_interpreted_brief:{status:'ready',values:{dimensionRole:{value:'parcel',provenance:'explicit'}},dimensions:[{role:'footprint',widthMm:'11000',depthMm:'8000',sourceText:'11 m wide by 8 m deep',provenance:'explicit'}]}});
 const section = projectBrief(task,'task-a',project).sections[0];
 assert.deepEqual(section.values.map(row=>[row.label,row.value]),[['Footprint','Width 11000 mm · Depth 8000 mm']]);
 assert.equal(section.sourceOnly[0].value,'parcel');
 assert.equal(section.sourceOnly[0].provenance,'explicit');
 const matching = structuredClone(task); matching.data.agent_interpreted_brief.values.dimensionRole.value='footprint';
 assert.equal(projectBrief(matching,'task-a',project).sections[0].values[0].label,'Dimensions describe');
 const unknown = structuredClone(task); unknown.data.agent_interpreted_brief.dimensions[0].role='unknown';
 assert.equal(projectBrief(unknown,'task-a',project).sections[0].values[0].label,'Dimensions describe');
});
