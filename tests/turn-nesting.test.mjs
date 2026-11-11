import test from 'node:test';
import assert from 'node:assert/strict';
import {latestNote,nestProcess,stageSpans} from '../src/lib/turn-nesting.mjs';

// @lat: [[contracts#Hosted contract tests#Process nesting]]
test('events with parentStepId nest step, agent, tool calls; others stay flat',()=>{
  const lead={id:'a1',role:'lead',name:'DATUMM'},plan={id:'a2',role:'planner',name:'Planner'};
  const events=[
    {index:3,stage:'tool_running',parentStepId:'s1',agent:plan},
    {index:1,stage:'model_turn'},
    {index:2,stage:'tool_running',parentStepId:'s1',agent:lead},
    {index:4,stage:'tool_completed',parentStepId:'s1',agent:plan},
    {index:5,stage:'tool_running',parentStepId:'s2'},
  ];
  const {steps,rest}=nestProcess(events);
  assert.deepEqual(rest.map(e=>e.index),[1]);
  assert.deepEqual(steps.map(s=>s.id),['s1','s2']);
  assert.deepEqual(steps[0].agents.map(a=>[a.id,a.events.map(e=>e.index)]),[['a1',[2]],['a2',[3,4]]]);
  assert.equal(steps[1].agents[0].name,'DATUMM');
});

test('without the new fields everything falls back to the flat list',()=>{
  const events=[{index:0,stage:'a'},{index:1,stage:'b'}];
  const {steps,rest}=nestProcess(events);
  assert.equal(steps.length,0);
  assert.equal(rest.length,2);
});

// @lat: [[contracts#Hosted contract tests#Stage spans]]
test('hosted lead stages become flat spans with child rows',()=>{
  const seq=['command_accepted','agent_stage_start','context_packet','agent_action','intent_repair','agent_stage_complete','agent_stage_start','context_packet','agent_action','research','agent_stage_complete','agent_stage_start','context_compacted','context_packet','agent_action','needs_input','agent_stage_complete','needs_input'];
  const events=seq.map((stage,index)=>({index,stage,detail:stage==='agent_stage_start'?`Planning ${index}`:stage,agent:{name:'Lead'}}));
  const spans=stageSpans(events);
  assert.deepEqual(spans.map(s=>[s.title,s.done,s.children.map(c=>c.stage)]),[['Planning 1',true,['agent_action']],['Planning 6',true,['agent_action','research']],['Planning 11',true,['agent_action']]]);
});

test('an unclosed stage is still running and no stages gives no spans',()=>{
  assert.equal(stageSpans([{index:0,stage:'agent_stage_start',detail:''}])[0].done,false);
  assert.deepEqual(stageSpans([{index:0,stage:'agent_action'}]),[]);
});

// @lat: [[contracts#Hosted contract tests#Step notes]]
test('span titles come from the first note, summaries from the last',()=>{
  const long='n'.repeat(100);
  const events=[
    {index:0,stage:'agent_stage_start',detail:'Planning the next step'},
    {index:1,stage:'agent_action',note:`  ${long} `},
    {index:2,stage:'agent_action',note:'Found the walls; next I will draft'},
    {index:3,stage:'agent_stage_complete'},
    {index:4,stage:'agent_stage_start',detail:'Planning the next step'},
    {index:5,stage:'agent_action'},
  ];
  const [a,b]=stageSpans(events);
  assert.equal(a.title.length,80);
  assert.equal(a.summary,'Found the walls; next I will draft');
  assert.equal(a.done,true);
  assert.equal(b.title,'Planning the next step');
  assert.equal(b.summary,'');
  assert.equal(latestNote(events),'Found the walls; next I will draft');
  assert.equal(latestNote(events.slice(4)),'Planning the next step');
  assert.equal(latestNote([]),'');
});
