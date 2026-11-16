import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {validateChatComposition} from '../src/lib/chat-composition.mjs';

// Captured outcomes from the Python producer validator; both runtimes must agree.
const vectors=JSON.parse(readFileSync(new URL('./fixtures/chat-composition-vectors.json',import.meta.url),'utf8'));
// The producer appends v2 (evidence) vectors with resolved display; any count at or above the v1 set works.
test('the shared vector file keeps the twelve v1 vectors',()=>{assert.ok(vectors.length>=12);});
// serverOnly vectors are rejected against the saved row, which the browser never sees; skip them here.
for(const vector of vectors.filter(item=>!item.serverOnly))test(`producer/client conformance: ${vector.name}`,async()=>{
 const spec={...vector.composition,taskId:'conformance-task',turnId:'conformance-turn'};
 const value=await validateChatComposition(spec,{taskId:spec.taskId,turnId:spec.turnId,text:vector.answer,state:'saved'},webcrypto.subtle);
 assert.equal(value!==null,vector.valid);
});
