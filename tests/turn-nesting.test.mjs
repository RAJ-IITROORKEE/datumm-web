import test from 'node:test';
import assert from 'node:assert/strict';
import {nestProcess} from '../src/lib/turn-nesting.mjs';

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
