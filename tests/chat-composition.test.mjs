import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {validateChatComposition} from '../src/lib/chat-composition.mjs';

const tableText='| Step | minutes |\n| --- | ---: |\n| Brief | 5 |\n| Concept | 15 |';
const flowText='Brief -> Concept';
const text=`Example allocation\n\n${tableText}\n\n${flowText}\n\nIllustrative only.`;
const span=word=>({start:text.indexOf(word),end:text.indexOf(word)+word.length});
const scope={taskId:'task',turnId:'turn',text,state:'saved'};
const envelope=root=>({schemaVersion:1,taskId:'task',turnId:'turn',answerHash:createHash('sha256').update(text).digest('hex'),kind:'illustrative-explanation',root});
const validate=(value,context=scope)=>validateChatComposition(value,context,webcrypto.subtle);
const table={type:'table',source:span(tableText)};
const bars={type:'bars',source:span(tableText)};
const flow={type:'flow',source:span(flowText)};

test('composition resolves a bounded agent-selected tree into literal source content',async()=>{
 const spec=envelope({type:'stack',children:[{type:'grid',children:[table,bars]},{type:'details',label:span('Illustrative only.'),children:[flow]}]});
 const result=await validate(spec);
 assert.equal(result.root.children[0].children[0].rows[1][1],'15');
 assert.deepEqual(result.root.children[0].children[1].items[0],{label:'Brief',value:5,display:'5'});
 assert.deepEqual(result.root.children[1].children[0].edges[0],{from:'node-0',to:'node-1'});
});

test('foreign, stale, partial, unbound and altered answers never acquire composed UI',async()=>{
 const good=envelope({type:'text',text:span('Illustrative only.')});
 for(const context of [{...scope,taskId:'other'},{...scope,turnId:'other'},{...scope,state:'streaming'},{...scope,state:'partial'},{...scope,text:text+' '},{...scope,turnId:undefined},{...scope,taskId:undefined}])assert.equal(await validate(good,context),null);
 for(const patch of [{answerHash:'0'.repeat(64)},{kind:'measured'},{schemaVersion:2},{taskId:'other'},{action:'execute'},{root:{type:'script',code:'alert(1)'}}])assert.equal(await validate({...good,...patch}),null);
});

test('unknown actions, style, executable markup and URLs cannot become active primitives',async()=>{
 for(const root of [{...table,onClick:'build'},{...bars,style:{color:'red'}},{type:'html',html:'<script>alert(1)</script>'},{type:'image',src:'javascript:alert(1)'},{type:'form',action:'approve'}])assert.equal(await validate(envelope(root)),null);
 // Text remains literal; React, not a markup interpreter, renders it.
 const raw='<img src=x onerror=alert(1)>';
 const result=await validateChatComposition({...envelope({type:'text',text:{start:0,end:raw.length}}),answerHash:createHash('sha256').update(raw).digest('hex')},{...scope,text:raw},webcrypto.subtle);
 assert.equal(result.root.text,raw);
});

test('freely paired table/graph/number/source data falls back instead of inventing content',async()=>{
 const bad=[{...table,rows:[[span('Brief')]]},{...flow,nodes:[{id:'invented',label:span('Brief')}]},{...flow,edges:[{from:'Concept',to:'Brief'}]},{...bars,items:[{label:span('Concept'),value:span('5')}]},{...flow,source:span('Brief')},{...table,source:{start:table.source.start+1,end:table.source.end}},{type:'text',text:{start:3,end:3}},{type:'text',text:{start:0,end:99999}}];
 for(const root of bad)assert.equal(await validate(envelope(root)),null);
});

test('malformed source tables, oversized numbers and implicit relationships cannot chart',async()=>{
 for(const raw of ['| A | B |\n| --- | --- |\n| one |','| A | B |\n| --- | --- |\n| one | NaN |','| A | B |\n| --- | --- |\n| one | -3 |','| A | B |\n| --- | --- |\n| one | 9999999999999 |','Brief, then maybe Concept']){
  const spec=envelope({type:raw.startsWith('|')?'bars':'flow',source:{start:0,end:raw.length}});
  spec.answerHash=createHash('sha256').update(raw).digest('hex');
  assert.equal(await validateChatComposition(spec,{...scope,text:raw},webcrypto.subtle),null);
 }
});

test('tables and flow blocks cannot silently omit adjacent evidence or invent titles',async()=>{
 const shortened={...table,source:{start:table.source.start,end:table.source.end-'\n| Concept | 15 |'.length}};
 assert.equal(await validate(envelope(shortened)),null);
 assert.equal(await validate(envelope({...table,title:span('Illustrative only')})),null);
 const raw='A -> B\nB -> C';
 const spec=envelope({type:'flow',source:{start:0,end:6}});spec.answerHash=createHash('sha256').update(raw).digest('hex');
 assert.equal(await validateChatComposition(spec,{...scope,text:raw},webcrypto.subtle),null);
});

test('text and disclosure labels cannot remove a negation within a source sentence',async()=>{
 const raw='Do not approve this design.';
 const spec=envelope({type:'text',text:{start:7,end:raw.length}});spec.answerHash=createHash('sha256').update(raw).digest('hex');
 assert.equal(await validateChatComposition(spec,{...scope,text:raw},webcrypto.subtle),null);
 spec.root={type:'details',label:{start:7,end:raw.length},children:[{type:'text',text:{start:0,end:raw.length}}]};
 assert.equal(await validateChatComposition(spec,{...scope,text:raw},webcrypto.subtle),null);
});

test('deep, huge, circular and excessive payloads are rejected before recursive parsing',async()=>{
 let root={type:'text',text:span('Brief')};
 for(let i=0;i<50;i++)root={type:'stack',children:[root]};
 assert.equal(await validate(envelope(root)),null);
 assert.equal(await validate({...envelope(table),extra:'x'.repeat(25000)}),null);
 assert.equal(await validate(envelope({type:'stack',children:Array(9).fill(table)})),null);
 const circular={type:'stack',children:[]};circular.children.push(circular);
 assert.equal(await validate(envelope(circular)),null);
 let tree={type:'grid',children:[table,bars]};
 for(let i=0;i<3;i++)tree={type:'grid',children:[tree,tree]};
 assert.equal(await validate(envelope(tree)),null);
});

test('UTF-16 span boundaries cannot cut a source character',async()=>{
 const raw='😀 label';
 const spec=envelope({type:'text',text:{start:1,end:2}});spec.answerHash=createHash('sha256').update(raw).digest('hex');
 assert.equal(await validateChatComposition(spec,{...scope,text:raw},webcrypto.subtle),null);
 spec.root.text={start:0,end:raw.length};
 assert.equal((await validateChatComposition(spec,{...scope,text:raw},webcrypto.subtle)).root.text,raw);
});
