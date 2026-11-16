import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {validateChatComposition} from '../src/lib/chat-composition.mjs';

// Captured outcomes from the Python producer validator; both runtimes must agree.
const vectors=JSON.parse(readFileSync(new URL('./fixtures/chat-composition-vectors.json',import.meta.url),'utf8'));
for(const vector of vectors)test(`producer/client conformance: ${vector.name}`,async()=>{
 const spec={...vector.composition,taskId:'conformance-task',turnId:'conformance-turn'};
 const value=await validateChatComposition(spec,{taskId:spec.taskId,turnId:spec.turnId,text:vector.answer,state:'saved'},webcrypto.subtle);
 assert.equal(value!==null,vector.valid);
});
