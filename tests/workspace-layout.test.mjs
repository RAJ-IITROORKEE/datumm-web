import assert from 'node:assert/strict';
import test from 'node:test';
import {isRenderablePlan,reviewFocus} from '../src/lib/workspace-layout.mjs';

test('conversation content cannot open a studio without renderable geometry',()=>{
 for(const executing of [false,true])assert.equal(isRenderablePlan(null,null),false,'a conversation alone is never a plan (executing='+executing+')');
 assert.equal(isRenderablePlan({graph:{}},null),true);
 assert.equal(isRenderablePlan(null,'<svg/>'),true);
});

test('review focuses the sole primary conversation before a plan exists',()=>{
 for(const hasRenderablePlan of [false,true]){
  const seen={};
  reviewFocus('[aria-label="Validated design preview"]',{hasRenderablePlan,setStudioView:value=>seen.view=value,setRight:value=>seen.right=value,setTab:value=>seen.tab=value,
   requestFrame:callback=>callback(),reviewScroll:{current:{stopScroll:()=>{}}},doc:{querySelector:selector=>({scrollIntoView:()=>seen.selector=selector})}});
  assert.equal(seen.right,hasRenderablePlan);
  assert.equal(seen.tab,hasRenderablePlan?'assistant':'preview');
  assert.equal(seen.selector,hasRenderablePlan?'[aria-label="Validated design preview"]':'.conversation');
 }
});
