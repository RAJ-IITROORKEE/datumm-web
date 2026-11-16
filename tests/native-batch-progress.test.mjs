import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeBatchProgress } from '../src/lib/conversation-result.mjs';

test('only verified native batch history in active Build produces native progress', () => {
  const web = {mode:'plan',status:'running',data:{agent_result:{status:'in_progress'}}};
  assert.equal(nativeBatchProgress(web),0);
  const build = {mode:'build',status:'running',data:{agent_result:{status:'in_progress',batchHistory:[
    {operationId:'op-1',state:'verified',nativeStatus:'verified'},
    {operationId:'op-2',state:'committed',nativeStatus:'unknown'},
  ]}}};
  assert.equal(nativeBatchProgress(build),1);
  assert.equal(nativeBatchProgress({...build,mode:'plan'}),0);
  assert.equal(nativeBatchProgress({...build,status:'completed'}),0);
  assert.equal(nativeBatchProgress({...build,data:{agent_result:{status:'in_progress',batchHistory:[]}}}),0);
  assert.equal(nativeBatchProgress({...build,data:{agent_result:{status:'in_progress',batchHistory:[{state:'verified',nativeStatus:'verified'}]}}}),0);
});
