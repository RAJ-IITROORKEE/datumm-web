'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createQuestionBodyState, questionAnswers, questionConfirm, questionInfo, questionInput, questionSave, questionSelect, questionSetSelected, questionSetSubmitting, questionSetTab, questionSingle, questionStoreCustom, questionSubmit, type QuestionStep } from './vendor/opencode-question';

export type OpenCodeQuestion={id:string;annotationRevisionAvailable?:boolean;questions:{header:string;question:string;options:{label:string;description:string}[];multiple?:boolean;custom?:boolean}[]};
export function OpenCodeQuestions({question,onAnswer}:{question:OpenCodeQuestion;onAnswer:(answers:string[][],annotationIntent?:'revise')=>Promise<void>}){
 const [state,setState]=useState(()=>createQuestionBodyState(question.id)),[error,setError]=useState('');
 const [requestRevision,setRequestRevision]=useState(false);
 const sending=useRef(false),heading=useRef<HTMLLegendElement>(null);
 const item=questionInfo(question,state),confirm=questionConfirm(question,state),answers=questionAnswers(state,question.questions.length);
 const valid=answers.every((values,i)=>values.length>0&&(question.questions[i].multiple||values.length===1));
 useEffect(()=>{heading.current?.focus();},[state.tab]);
 const send=async(values:string[][])=>{
  if(sending.current)return;sending.current=true;setError('');setState(previous=>questionSetSubmitting(previous,true));
  try{await onAnswer(values,question.annotationRevisionAvailable&&requestRevision?'revise':undefined);}catch(failure){sending.current=false;setState(previous=>questionSetSubmitting(previous,false));setError(failure instanceof Error?failure.message:'Could not send answers. Your input is preserved.');}
 };
 const apply=(step:QuestionStep)=>{if(sending.current)return;setState(step.state);if(step.reply)void send(step.reply.answers);};
 const continueStep=()=>{
  if(state.submitting)return;
  if(confirm){if(valid)void send(questionSubmit(question,state).answers);return;}
  if(questionInput(state).trim()){apply(questionSave(state,question));return;}
  if(answers[state.tab]?.length){if(questionSingle(question))void send(questionSubmit(question,state).answers);else setState(questionSetTab(state,state.tab+1));}
 };
 return <form className="agent-question question-group orchestration-gate" aria-label="OpenCode needs your input" onSubmit={event=>{event.preventDefault();continueStep();}}>
  <div className="orchestration-gate-heading"><CircleHelp size={15} aria-hidden="true"/><strong>Input required</strong><span>{confirm?'Review answers':`Question ${state.tab+1} of ${question.questions.length}`}</span></div>
  {!questionSingle(question)&&<nav className="question-tabs" aria-label="Question steps">{question.questions.map((value,i)=><button type="button" key={i} aria-pressed={state.tab===i} disabled={state.submitting} onClick={()=>setState(questionSetTab(state,i))}>{i+1}. {value.header}{answers[i]?.length?' ✓':''}</button>)}<button type="button" aria-pressed={confirm} disabled={state.submitting} onClick={()=>setState(questionSetTab(state,question.questions.length))}>Review</button></nav>}
  {confirm?<div className="question-review"><strong>Review before submitting</strong>{question.questions.map((value,i)=><div key={i}><span>{value.header}</span><p>{answers[i]?.join(', ')||'Not answered'}</p><button type="button" disabled={state.submitting} onClick={()=>setState(questionSetTab(state,i))}>Edit answer</button></div>)}</div>:item&&<fieldset key={state.tab} disabled={state.submitting} className="question-item"><legend ref={heading} tabIndex={-1}>{item.header}: {item.question}</legend>
   <div className="question-choices">{item.options.map((option,i)=><label key={option.label} className="question-choice" data-state={answers[state.tab]?.includes(option.label)?'checked':'unchecked'}><input type={item.multiple?'checkbox':'radio'} name={`question-${question.id}-${state.tab}`} checked={answers[state.tab]?.includes(option.label)??false} onChange={()=>{const step=questionSelect(questionSetSelected(item.multiple?state:questionStoreCustom(state,state.tab,''),i),question);setState(questionSetTab(step.state,state.tab));}}/><span className="choice-copy"><span>{i+1}. {option.label}</span><small>{option.description}</small></span></label>)}</div>
   {item.custom!==false&&<div className="question-custom"><label htmlFor={`native-answer-${question.id}-${state.tab}`}>Type your own answer</label><textarea id={`native-answer-${question.id}-${state.tab}`} rows={2} maxLength={1000} value={questionInput(state)} onChange={event=>setState(questionStoreCustom(state,state.tab,event.target.value))}/></div>}
  </fieldset>}
  {error&&<p className="question-error" role="alert">{error}</p>}
  {question.annotationRevisionAvailable&&<label className="question-choice"><input type="checkbox" checked={requestRevision} disabled={state.submitting} onChange={event=>setRequestRevision(event.target.checked)}/><span className="choice-copy"><span>Request a plan revision with these answers</span><small>Treat all attached notes as edit requests. Revit approval remains separate.</small></span></label>}
  <div className="question-submit"><span role="status">{state.submitting?'Continuing the same OpenCode turn…':item?.multiple?'Select one or more answers, then continue.':'Select an option or enter your own answer.'} Answers do not authorize Revit changes.</span>{state.tab>0&&<Button type="button" variant="ghost" disabled={state.submitting} onClick={()=>setState(questionSetTab(state,state.tab-1))}>Back</Button>}<Button type="submit" disabled={state.submitting||(confirm?!valid:!questionInput(state).trim()&&!answers[state.tab]?.length)}>{state.submitting?'Sending…':confirm?'Submit answers':questionSingle(question)?'Submit answer':'Continue'}</Button></div>
 </form>;
}
