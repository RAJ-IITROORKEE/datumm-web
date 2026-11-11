import assert from 'node:assert/strict';
import test from 'node:test';
import {answerValue,backStep,buildPayload,canAdvance,canSubmit,firstOpenStep,nextStep,reviewStep} from '../src/lib/question-stepper.mjs';

const items=[
 {id:'q1',required:true,options:[{id:'option_1',label:'North'},{id:'option_2',label:'South'}]},
 {id:'q2',required:false,options:[]},
 {id:'q3',required:true,options:[]},
];

// @lat: [[contracts#Hosted contract tests#Question stepper]]
test('required question blocks next until answered; optional does not',()=>{
 assert.equal(nextStep(items,{},0),0);
 const draft={q1:{choice:'option_2',custom:''}};
 assert.equal(nextStep(items,draft,0),1);
 assert.equal(nextStep(items,draft,1),2,'optional question can be skipped');
 assert.equal(nextStep(items,draft,2),2,'required free-text question blocks');
 assert.equal(nextStep(items,{...draft,q3:{choice:'',custom:' 12 '}},2),3,'last answered question reaches the review step');
});

test('back never goes below the first question; review step exists only for several questions',()=>{
 assert.equal(backStep(0),0);assert.equal(backStep(3),2);
 assert.equal(reviewStep(items),3);assert.equal(reviewStep([items[0]]),-1);
 assert.equal(nextStep([items[0]],{q1:{choice:'option_1',custom:''}},0),0,'single question stays put and submits');
});

test('custom text overrides the chosen option and empty custom is unanswered',()=>{
 assert.equal(answerValue(items[0],{q1:{choice:'custom',custom:' 7 m '}}),'7 m');
 assert.equal(answerValue(items[0],{q1:{choice:'custom',custom:'  '}}),undefined);
 assert.equal(canAdvance(items,{},1),true);
});

test('submit requires every required answer and resumes at the first open step',()=>{
 const partial={q1:{choice:'option_1',custom:''}};
 assert.equal(canSubmit(items,partial),false);
 assert.equal(firstOpenStep(items,partial),2);
 assert.equal(canSubmit(items,{...partial,q3:{choice:'custom',custom:'x'}}),true);
});

test('payload is the exact replyToQuestion shape',()=>{
 const draft={q1:{choice:'option_2',custom:''},q3:{choice:'custom',custom:' 12 '}};
 assert.deepEqual(buildPayload({id:'Q',version:2},items,draft),{question_id:'Q',question_version:2,answers:[{question_id:'q1',option_id:'option_2'},{question_id:'q3',value:'12'}]});
 assert.deepEqual(buildPayload({id:'Q'},[items[0]],{q1:{choice:'option_1',custom:''}}),{question_id:'Q',answer:'North'});
});
