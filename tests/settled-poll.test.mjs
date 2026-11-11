import test from 'node:test';
import assert from 'node:assert/strict';
import {openChatPollMs,listPollMs,settledPoll} from '../src/lib/settled-poll.mjs';

// @lat: [[contracts#Hosted contract tests#Poll intervals]]
test('open chat polls fast only while active, slowly while waiting, never when settled',()=>{
  for(const s of ['queued','running','reconciling'])assert.equal(openChatPollMs(s),1500);
  for(const s of ['needs_input','awaiting_approval','paused_limit'])assert.equal(openChatPollMs(s),20000);
  for(const s of ['completed','failed','cancelled'])assert.equal(openChatPollMs(s),null);
});

test('chat list polls every 6 s while any chat runs, else 30 s',()=>{
  assert.equal(listPollMs([{status:'completed'},{status:'running'}]),6000);
  assert.equal(listPollMs([{status:'completed'}]),30000);
  assert.equal(listPollMs([]),30000);
});

test('hidden pages skip ticks, visibility runs one, errors back off to the cap',async()=>{
  const queue=[];const timers={setTimeout:(f,ms)=>{queue.push([f,ms]);return queue.length;},clearTimeout:()=>{}};
  let hidden=true,calls=0,onVis;const doc={get hidden(){return hidden;},addEventListener:(_,f)=>{onVis=f;},removeEventListener:()=>{}};
  const stop=settledPoll(()=>{calls++;throw new Error('x');},10000,timers,doc);
  await Promise.resolve();assert.equal(calls,0);
  hidden=false;onVis();await new Promise(r=>setImmediate(r));assert.equal(calls,1);
  assert.equal(queue.at(-1)[1],20000);
  for(let i=0;i<8;i++){queue.at(-1)[0]();await new Promise(r=>setImmediate(r));}
  assert.equal(queue.at(-1)[1],60000);
  stop();
});
