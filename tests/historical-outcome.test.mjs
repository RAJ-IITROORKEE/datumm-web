import test from 'node:test';
import assert from 'node:assert/strict';
import {conversationTurns,historicalOutcome,processTurnStatus,answerHasCompletionProof,legacyAnswerOutputState,answerCompletionCandidate,verifyAnswerCompletionHash} from '../src/lib/conversation-turns.mjs';
const outcome={schemaVersion:1,taskId:'task',turnId:'turn',executionId:'execution',status:'needs_connection'};
const records=[{prompt:'Question',turnId:'turn'},{answer:'Answer',turnId:'turn',recordedOutcome:outcome}];
test('historical outcome follows its exact answer and survives split pairing',()=>{
 const turns=conversationTurns(records); assert.equal(turns[0].answer,'Answer'); assert.equal(turns[0].answerIndex,1);
 assert.equal(historicalOutcome(turns[0],turns,'task',[{stage:'completed',executionId:'execution'}]),'needs_connection');
});
test('question continuation cannot lend a later task completion to an ambiguous turn',()=>{
 const turn={prompt:'Question',turnId:'turn',index:0,endIndex:0}, scoped=stage=>({stage,taskId:'task',turnId:'turn',executionId:'execution'});
 const base={turn,turns:[turn],taskId:'task',last:false,taskStatus:'completed'};
 assert.equal(processTurnStatus({...base,events:[scoped('needs_input'),scoped('completed')]}),'unknown');
 assert.equal(processTurnStatus({...base,last:true,events:[scoped('needs_input'),scoped('completed')]}),'unknown');
 assert.equal(processTurnStatus({...base,last:true,events:[]}),'unknown');
 assert.equal(processTurnStatus({...base,last:true,events:[scoped('completed')]}),'completed');
 assert.equal(processTurnStatus({...base,events:[scoped('needs_input')]}),'unknown');
 assert.equal(processTurnStatus({...base,events:[scoped('completed')]}),'completed');
 assert.equal(processTurnStatus({...base,events:[{stage:'completed',turnId:'turn'}]}),'unknown');
 assert.equal(processTurnStatus({...base,turns:[turn,{...turn,index:1}],events:[scoped('completed')]}),'unknown');
 assert.equal(processTurnStatus({...base,last:true,taskStatus:'running',events:[scoped('needs_input')]}),'running');
});
test('an ambiguous historical question cannot borrow a later answer completion',()=>{
 const question={turnId:'turn',answer:'Which size?',index:0,endIndex:0},answer={turnId:'turn',answer:'Use metric.',index:1,endIndex:1},scope={taskId:'task',turnId:'turn',executionId:'execution'};
 const events=[{...scope,stage:'needs_input',detail:'Which size?',sequence:3},{...scope,stage:'answer',detail:'Use metric.',sequence:8},{...scope,stage:'completed',detail:'',sequence:9}],input={turns:[question,answer],taskId:'task',events};
 assert.equal(answerHasCompletionProof({...input,turn:question}),false);assert.equal(answerHasCompletionProof({...input,turn:answer}),true);
 assert.equal(answerHasCompletionProof({...input,turn:answer,events:events.map(event=>({...event,taskId:'other'}))}),false);
 assert.equal(answerHasCompletionProof({...input,turn:answer,events:events.slice(0,2)}),false);
 assert.equal(answerHasCompletionProof({...input,turn:answer,turns:[question,answer,{...answer,index:2}]}),false);
});
test('missing, contradictory and ambiguous identities cannot claim an outcome',()=>{
 const turns=conversationTurns(records),turn=turns[0];
 for(const [row,all,task,events,error] of [[turn,turns,'other',[],null],[{...turn,turnId:'other'},turns,'task',[],null],[{...turn,recordedOutcome:{...outcome,schemaVersion:2}},turns,'task',[],null],[{...turn,recordedOutcome:{...outcome,executionId:''}},turns,'task',[],null],[turn,[turn,turn],'task',[],null],[turn,turns,'task',[{stage:'failed'}],null],[turn,turns,'task',[{stage:'paused_limit'}],null],[turn,turns,'task',[{stage:'needs_input'}],null],[turn,turns,'task',[{stage:'completed',executionId:'other'}],null],[turn,turns,'task',[],'failure']]) assert.equal(historicalOutcome(row,all,task,events,error),'rejected');
});
test('absent metadata differs from rejected metadata and repeated turn identities are rejected',()=>{
 const turns=conversationTurns(records),turn=turns[0];
 assert.equal(historicalOutcome({...turn,recordedOutcome:undefined},turns,'task',[]),null);
 assert.equal(historicalOutcome(turn,[turn,{prompt:'Different turn',turnId:'turn'}],'task',[]),'rejected');
 assert.equal(historicalOutcome(turn,turns,'task',[{stage:'failed'},{stage:'completed'}]),'rejected');
});
test('truncated long answer cannot prove a historical completion',()=>{
 const answer='A'.repeat(2001),turn={turnId:'turn',answer},scope={taskId:'task',turnId:'turn',executionId:'execution'};
 const events=[{...scope,stage:'answer',detail:answer.slice(0,2000),sequence:8},{...scope,stage:'completed',sequence:9}];
 assert.equal(answerHasCompletionProof({turn,turns:[turn],taskId:'task',events}),false);
});
test('long retained answer keeps legacy output eligibility without composition proof',()=>{
 const answer='| Column |\n| --- |\n| '+ 'A'.repeat(2001)+' |',turn={turnId:'turn',answer},scope={taskId:'task',turnId:'turn',executionId:'execution'};
 const events=[{...scope,stage:'answer',detail:answer.slice(0,2000),sequence:8},{...scope,stage:'completed',sequence:9}];
 assert.equal(legacyAnswerOutputState({last:false,executing:false,taskStatus:'completed',historicalStatus:'completed'}),'saved');
 assert.equal(answerHasCompletionProof({turn,turns:[turn],taskId:'task',events}),false);
 assert.equal(legacyAnswerOutputState({last:true,executing:true,taskStatus:'completed',historicalStatus:'completed'}),'streaming');
 assert.equal(legacyAnswerOutputState({last:false,executing:false,taskStatus:'completed',historicalStatus:'failed'}),'partial');
});
test('durable answer binding validates full identity and rejects contradictory later outcomes',async()=>{
 const {webcrypto}=await import('node:crypto');
 const text='A'.repeat(2500)+' \u03a9',bytes=await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(text)),answerHash=Buffer.from(bytes).toString('hex');
 const completion={schemaVersion:1,taskId:'task',turnId:'turn',executionId:'exec',answerHash,status:'completed',completionSequence:42},turn={turnId:'turn',answer:text,completion},input={turn,turns:[turn],taskId:'task',events:[]};
 assert.equal(answerCompletionCandidate(input),true);assert.equal(await verifyAnswerCompletionHash(completion,text,webcrypto.subtle),true);assert.equal(await verifyAnswerCompletionHash(completion,text+'!',webcrypto.subtle),false);
 assert.equal(answerCompletionCandidate({...input,taskId:'other'}),false);assert.equal(answerCompletionCandidate({...input,turn:{...turn,turnId:'other'}}),false);
 assert.equal(answerCompletionCandidate({...input,turns:[turn,{...turn}]}),false);assert.equal(answerCompletionCandidate({...input,turn:{...turn,completion:{...completion,extra:true}}}),false);
 for(const stage of ['failed','awaiting_approval','waiting','waiting_for_input','reconciling','superseded'])
  assert.equal(answerCompletionCandidate({...input,events:[{taskId:'task',turnId:'turn',executionId:'exec',stage,sequence:42}]}),false,stage);
 assert.equal(answerCompletionCandidate({...input,events:[{taskId:'task',turnId:'turn',executionId:'exec',stage:'failed',sequence:41}]}),true);
 assert.equal(answerCompletionCandidate({...input,events:[{taskId:'task',turnId:'turn',executionId:'other',stage:'failed',sequence:43}]}),true);
 assert.equal(conversationTurns([{prompt:'Q',turnId:'turn'},turn])[0].completion,completion);
});
