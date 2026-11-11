'use client';

import { useEffect, useRef, useState } from 'react';
import { RadioGroup } from 'radix-ui';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { answerValue, backStep, buildPayload, canAdvance, canSubmit, firstOpenStep, nextStep, reviewStep } from '@/lib/question-stepper.mjs';

export type QuestionItem={id:string;question:string;reason:string;required:boolean;inputKind:'text'|'number';unit:string;options:{id:string;label:string;recommended:boolean;rationale:string}[]};
export type AgentQuestion={id:string;version?:number;schemaVersion?:number;question:string;reason?:string;options?:string[];questions?:QuestionItem[]};
export type ReplyPayload={question_id:string;question_version:number;answers:{question_id:string;option_id?:string;value?:string}[]};
type Draft=Record<string,{choice:string;custom:string}>;

export function questionItems(question:AgentQuestion):QuestionItem[]{
 return question.questions??[{id:'input',question:question.question,reason:question.reason??'',required:true,inputKind:'text',unit:'',options:(question.options??[]).slice(0,3).map((label,i)=>({id:`option_${i+1}`,label,recommended:false,rationale:''}))}];
}

/** Highlighted dock above the composer: one question at a time, then a review and a single submit. */
export function AgentQuestions({question,runId,onReply}:{question:AgentQuestion;runId:string;onReply:(payload:ReplyPayload|{question_id:string;answer:string})=>Promise<void>}){
 const items=questionItems(question),key=`datumm-question:${runId}:${question.id}:${question.version??1}`,review=reviewStep(items);
 const [draft,setDraft]=useState<Draft>({}),[step,setStep]=useState(0),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const sending=useRef(false),field=useRef<HTMLTextAreaElement|HTMLInputElement|null>(null),heading=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{
  try{const value=JSON.parse(sessionStorage.getItem(key)??'{}');if(value&&typeof value==='object'){setDraft(value);setStep(firstOpenStep(items,value));}}catch{/* Draft persistence is optional in private browsing. */}
  setReady(true);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key]);
 useEffect(()=>{if(ready)heading.current?.focus();},[step,ready]);
 const update=(id:string,change:Partial<Draft[string]>)=>{
  setDraft(previous=>{const next={...previous,[id]:{...(previous[id]??{choice:'',custom:''}),...change}};
   try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}
   return next;});setError('');
 };
 const choose=(item:QuestionItem,choice:string)=>{update(item.id,{choice});if(choice==='custom')requestAnimationFrame(()=>field.current?.focus());};
 const submit=async()=>{
  if(sending.current||!canSubmit(items,draft))return;
  sending.current=true;setPending(true);setError('');
  try{await onReply(buildPayload(question,items,draft) as ReplyPayload);try{sessionStorage.removeItem(key);}catch{}}
  catch(failure){setError(failure instanceof Error?failure.message:'Unable to send. Your answers are saved; try again.');}
  finally{sending.current=false;setPending(false);}
 };
 const onReview=step===review,last=review===-1&&step===items.length-1,item=items[step];
 const advance=()=>{if(onReview||last)void submit();else setStep(nextStep(items,draft,step));};
 const selected=item?draft[item.id]?.choice??'':'',custom=item&&(selected==='custom'||!item.options.length),inputId=`answer-${question.id}-${item?.id}`;
 return <form className="question-dock" aria-label="DATUMM needs your input" onSubmit={event=>{event.preventDefault();advance();}}
  onKeyDown={event=>{
   if(event.key==='Enter'&&(event.target as HTMLElement).getAttribute('role')==='radio'){event.preventDefault();event.currentTarget.requestSubmit();return;}
   if(!item||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.metaKey||event.ctrlKey||event.altKey)return;
   const n=Number(event.key);if(!Number.isInteger(n)||n<1||n>item.options.length+1)return;
   event.preventDefault();choose(item,n<=item.options.length?item.options[n-1].id:'custom');
  }}>
  <header><CircleHelp size={15} aria-hidden="true"/><strong>DATUMM needs your input</strong>
   <span role="status">{onReview?'Review answers':items.length>1?`${step+1} of ${items.length}`:'One question'}</span></header>
  {items.length>1&&<div className="question-dock-progress" role="progressbar" aria-label="Question progress" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={Math.min(step,items.length)}><span style={{width:`${Math.min(step,items.length)/items.length*100}%`}}/></div>}
  <fieldset disabled={pending||!ready}>
   {onReview?<>
    <h3 ref={heading} tabIndex={-1}>Review your answers</h3>
    <ol className="question-dock-review">{items.map((value,i)=><li key={value.id}><span>{value.question}</span><strong>{answerValue(value,draft)??'Skipped'}</strong><button type="button" onClick={()=>setStep(i)}>Edit</button></li>)}</ol>
   </>:<>
    <h3 ref={heading} tabIndex={-1} id={`${inputId}-q`}>{item.question}{!item.required&&<small>Optional</small>}</h3>
    {item.reason&&<p id={`${inputId}-reason`}>{item.reason}</p>}
    {item.options.length>0&&<RadioGroup.Root className="question-dock-choices" aria-labelledby={`${inputId}-q`} value={selected} onValueChange={value=>choose(item,value)}>
     {[...item.options,{id:'custom',label:'Other',recommended:false,rationale:''}].map((option,i)=>
      <RadioGroup.Item key={option.id} value={option.id} className="question-choice" title={option.rationale||undefined}>
       <kbd aria-hidden="true">{i+1}</kbd><span>{option.label}</span>{option.recommended&&<small className="recommended">Recommended</small>}
      </RadioGroup.Item>)}
    </RadioGroup.Root>}
    {custom&&<div className="question-custom"><label htmlFor={inputId}>{item.options.length?'Your answer':'Answer'}{item.unit&&` (${item.unit})`}</label>
     {item.inputKind==='number'?<input ref={node=>{field.current=node;}} id={inputId} type="number" step="any" value={draft[item.id]?.custom??''} onChange={event=>update(item.id,{custom:event.target.value,choice:'custom'})}/>:
      <textarea ref={node=>{field.current=node;}} id={inputId} rows={2} maxLength={1000} aria-describedby={item.reason?`${inputId}-reason`:undefined} value={draft[item.id]?.custom??''}
       onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}
       onChange={event=>update(item.id,{custom:event.target.value,choice:'custom'})}/>}
    </div>}
   </>}
  </fieldset>
  {error&&<p ref={errorRef} tabIndex={-1} className="question-error" role="alert">{error}</p>}
  <footer>
   <small>{pending?'Sending your answers…':'Enter continues · number keys pick an option. Model changes still require authorization.'}</small>
   {step>0&&<Button type="button" variant="ghost" disabled={pending} onClick={()=>setStep(backStep(step))}>Back</Button>}
   <Button type="submit" disabled={!ready||pending||(onReview||last?!canSubmit(items,draft):!canAdvance(items,draft,step))}>
    {pending?'Sending…':onReview||last?(items.length===1?'Submit answer':'Submit answers'):!item.required&&!answerValue(item,draft)?'Skip':'Next'}
   </Button>
  </footer>
 </form>;
}
