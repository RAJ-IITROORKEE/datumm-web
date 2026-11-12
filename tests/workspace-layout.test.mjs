import assert from 'node:assert/strict';
import test from 'node:test';
import {isRenderablePlan,reviewFocus,openWorkspaceView} from '../src/lib/workspace-layout.mjs';

test('conversation content cannot open a studio without renderable geometry',()=>{
 for(const executing of [false,true])assert.equal(isRenderablePlan(null,null),false,'a conversation alone is never a plan (executing='+executing+')');
 assert.equal(isRenderablePlan({graph:{rooms:[{}]}},null),true);
 assert.equal(isRenderablePlan(null,'<svg/>'),true);
});

test('an empty plan is not renderable: no rooms and a blank svg',()=>{
 assert.equal(isRenderablePlan({graph:{rooms:[]}},'  '),false);
 assert.equal(isRenderablePlan({graph:{rooms:[{key:'a'}]}},''),true);
 assert.equal(isRenderablePlan(undefined,'<svg/>'),true);
});

test('review always exposes the stable chat without moving it into the drawing pane',()=>{
 const seen={};
 reviewFocus('[aria-label="Validated design preview"]',{setStudioView:value=>seen.view=value,setWorkspacePane:value=>seen.pane=value,setRight:value=>seen.right=value,
  requestFrame:callback=>callback(),reviewScroll:{current:{stopScroll:()=>seen.stopped=true}},doc:{querySelector:selector=>({scrollIntoView:()=>seen.selector=selector})}});
 assert.equal(seen.view,'workspace');
 assert.equal(seen.pane,'chat');
 assert.equal(seen.right,false);
 assert.equal(seen.stopped,true);
 assert.equal(seen.selector,'[aria-label="Validated design preview"]');
});

test('review falls back to the conversation when the exact card is unavailable',()=>{
 let scrolled=false;
 reviewFocus('.missing-card',{setStudioView:()=>{},setWorkspacePane:()=>{},setRight:()=>{},requestFrame:callback=>callback(),reviewScroll:{current:null},
  doc:{querySelector:selector=>selector==='.conversation'?{scrollIntoView:()=>scrolled=true}:null}});
 assert.equal(scrolled,true);
});

test('activity and scheduling navigation expose the work area and close only mobile navigation',()=>{
 for(const view of ['activity','schedules'])for(const narrow of [false,true]){
  const state={left:true,pane:'chat',view:'workspace'};
  openWorkspaceView(view,{narrow,setStudioView:value=>state.view=value,setWorkspacePane:value=>state.pane=value,setLeft:value=>state.left=value});
  assert.equal(state.view,view);
  assert.equal(state.pane,'drawing');
  assert.equal(state.left,!narrow);
 }
});
