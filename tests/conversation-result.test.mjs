import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationResult,failedTurnRecovery} from '../src/lib/conversation-result.mjs';

test('settled Plan without geometry describes availability and offers draft-only recovery text',()=>{
 const value=conversationResult({mode:'plan',status:'completed',hasConcept:false});
 assert.equal(value.label,'Response finished');
 assert.match(value.note,/No current drawing is available/);
 assert.equal(value.prompts.length,2);
 assert.ok(value.prompts.every(text=>text.length<=180));
});
test('recovery is limited to the latest empty failed turn with recorded progress guidance',()=>{
 const base={status:'failed',answer:'  ',current:true,recoveryAction:'review_progress',hasConcept:true};
 assert.equal(failedTurnRecovery(base).hasConcept,true);
 assert.equal(failedTurnRecovery({...base,hasConcept:false}).hasConcept,false);
 for(const change of [{answer:'Partial response'}, {current:false}, {status:'completed'}, {recoveryAction:'check_operation'}])
  assert.equal(failedTurnRecovery({...base,...change}),null);
});
test('an existing concept does not prove this response generated or revised it',()=>{
 const value=conversationResult({mode:'plan',status:'completed',hasConcept:true});
 assert.equal(value.label,'Response finished');assert.equal(value.note,null);assert.equal(value.prompts,null);
});
test('loading does not present temporary drawing absence as a settled recovery condition',()=>{
 const value=conversationResult({mode:'plan',status:'completed',hasConcept:false,loading:true});
 assert.equal(value.note,null);assert.equal(value.prompts,null);
});
test('Ask, pending questions, failures and historical rows retain their own lifecycle',()=>{
 for(const input of [{mode:'ask',status:'completed'},{mode:'plan',status:'needs_input'},{mode:'plan',status:'failed'},{mode:'plan',status:'running'},{mode:'plan',status:'completed',current:false}])
  assert.equal(conversationResult({...input,hasConcept:false}),null);
});
