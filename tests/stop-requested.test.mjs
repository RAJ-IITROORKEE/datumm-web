import test from 'node:test';
import assert from 'node:assert/strict';
import {stopRequested} from '../src/lib/stop-requested.mjs';
const event=(index,stage,detail='',taskId='a')=>({index,sequence:index+1,stage,detail,taskId});
const task=(status,eventCursor)=>({id:'a',status,eventCursor});
test('pending stop follows scoped recorded events and clears on later outcome or new turn',()=>{
 const pending=[event(0,'paused_recovery'),event(1,'command_accepted','Accepted cancel in this task.'),event(2,'cancel_requested')];
 assert.equal(stopRequested(task('paused_recovery',3),pending),true);
 for(const status of ['cancelled','completed','failed','interrupted','reconciling'])assert.equal(stopRequested(task(status,3),pending),false,status);
 for(const stage of ['cancelled','completed','failed','interrupted','reconciling'])assert.equal(stopRequested(task('running',4),[...pending,event(3,stage)]),false,stage);
 assert.equal(stopRequested(task('running',4),[...pending,event(3,'command_accepted','Accepted chat followup in this task.')]),false);
 assert.equal(stopRequested(task('running',4),[event(3,'cancel_requested','','foreign')]),false);
});
test('an older terminal snapshot does not mask a newer stop event, even if the new turn start is absent',()=>{
 assert.equal(stopRequested(task('completed',3),[event(3,'cancel_requested')]),true);
 assert.equal(stopRequested(task('failed',3),[event(3,'cancel_requested')]),true);
 assert.equal(stopRequested(task('completed',4),[event(3,'cancel_requested')]),false);
 assert.equal(stopRequested(task('running',5),[event(1,'cancel_requested'),event(4,'command_accepted','Accepted continue in this task.')]),false);
});
