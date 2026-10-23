'use client';

import { useEffect, useRef, useState } from 'react';
import { RadioGroup } from 'radix-ui';
import { Button } from '@/components/ui/button';

export type QuestionItem={id:string;question:string;reason:string;required:boolean;inputKind:'text'|'number';unit:string;options:{id:string;label:string;recommended:boolean;rationale:string}[]};
export type AgentQuestion={id:string;version?:number;schemaVersion?:number;question:string;reason?:string;options?:string[];questions?:QuestionItem[]};
export type ReplyPayload={question_id:string;question_version:number;answers:{question_id:string;option_id?:string;value?:string}[]};
type Draft=Record<string,{choice:string;custom:string}>;

export function questionItems(question:AgentQuestion):QuestionItem[]{
 return question.questions??[{id:'input',question:question.question,reason:question.reason??'',required:true,inputKind:'text',unit:'',options:(question.options??[]).slice(0,3).map((label,i)=>({id:`option_${i+1}`,label,recommended:false,rationale:''}))}];
}

export function AgentQuestions({question,runId,onReply}:{question:AgentQuestion;runId:string;onReply:(payload:ReplyPayload|{question_id:string;answer:string})=>Promise<void>}){
 const items=questionItems(question),key=`datumm-question:${runId}:${question.id}:${question.version??1}`;
 const [draft,setDraft]=useState<Draft>({}),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const sending=useRef(false),fields=useRef<Record<string,HTMLTextAreaElement|HTMLInputElement|null>>({});
 const errorRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{
  try{const value=JSON.parse(sessionStorage.getItem(key)??'{}');if(value&&typeof value==='object')setDraft(value);}catch{/* Draft persistence is optional in private browsing. */}
  setReady(true);
 },[key]);
 const update=(id:string,change:Partial<Draft[string]>)=>{
  setDraft(previous=>{const next={...previous,[id]:{...(previous[id]??{choice:'',custom:''}),...change}};
   try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}
   return next;});setError('');
 };
 const valueFor=(item:QuestionItem)=>{
  const value=draft[item.id];return value?.choice==='custom'||!item.options.length?value?.custom.trim():item.options.find(option=>option.id===value?.choice)?.label;
 };
 const valid=items.every(item=>!item.required||Boolean(valueFor(item)))&&items.some(item=>Boolean(valueFor(item)));
 const submit=async()=>{
  if(sending.current||!valid)return;
  sending.current=true;setPending(true);setError('');
  try{
   const answers=items.filter(item=>valueFor(item)).map(item=>({question_id:item.id,
    ...(draft[item.id]?.choice!=='custom'&&item.options.length?{option_id:draft[item.id].choice}:{value:draft[item.id]?.custom.trim()})}));
   const payload=question.version?{question_id:question.id,question_version:question.version,answers}:{question_id:question.id,answer:valueFor(items[0])!};
   await onReply(payload);
   try{sessionStorage.removeItem(key);}catch{}
  }catch(failure){setError(failure instanceof Error?failure.message:'Unable to send. Your answers are saved; try again.');}
  finally{sending.current=false;setPending(false);}
 };
 return <form className="agent-question question-group" aria-label="DATUMM needs your input" onSubmit={event=>{event.preventDefault();void submit();}}>
  <div className="section-caption">DATUMM NEEDS YOUR INPUT · {items.length===1?'ONE QUESTION':`${items.length} QUESTIONS`}</div>
  {items.map((item,i)=>{
   const selected=draft[item.id]?.choice??'',custom=selected==='custom'||!item.options.length,inputId=`answer-${question.id}-${item.id}`;
   return <fieldset key={item.id} disabled={pending||!ready} className="question-item">
    <legend>{items.length>1&&<span className="question-number">{i+1}</span>}{item.question}{!item.required&&<small>Optional</small>}</legend>
    {item.reason&&<p id={`${inputId}-reason`}>{item.reason}</p>}
    {item.options.length>0&&<RadioGroup.Root className="question-choices" aria-label={item.question} value={selected} onValueChange={choice=>{
      update(item.id,{choice});if(choice==='custom')requestAnimationFrame(()=>fields.current[item.id]?.focus());
     }}>{[...item.options,{id:'custom',label:'Custom input',recommended:false,rationale:'Enter your own answer'}].map(option=>
      <RadioGroup.Item key={option.id} value={option.id} className="question-choice">
       <span className="choice-dot"><RadioGroup.Indicator/></span>
       <span className="choice-copy"><span>{option.label}</span>{option.recommended&&<small className="recommended">Recommended</small>}{option.rationale&&<small>{option.rationale}</small>}</span>
      </RadioGroup.Item>)}</RadioGroup.Root>}
    {custom&&<div className="question-custom"><label htmlFor={inputId}>{item.options.length?'Your answer':'Answer'}{item.unit&&` (${item.unit})`}</label>
     {item.inputKind==='number'?<input ref={node=>{fields.current[item.id]=node;}} id={inputId} type="number" step="any" required={item.required} value={draft[item.id]?.custom??''} onChange={event=>update(item.id,{custom:event.target.value,choice:'custom'})}/>:
      <textarea ref={node=>{fields.current[item.id]=node;}} id={inputId} rows={2} maxLength={1000} required={item.required} aria-describedby={item.reason?`${inputId}-reason`:undefined} value={draft[item.id]?.custom??''} onChange={event=>update(item.id,{custom:event.target.value,choice:'custom'})}/>}
    </div>}
   </fieldset>;
  })}
  {error&&<p ref={errorRef} tabIndex={-1} className="question-error" role="alert">{error}</p>}
  <div className="question-submit"><span role="status">{pending?'Sending your answers…':'Answers continue this task. Model changes still require authorization.'}</span><Button type="submit" disabled={!ready||!valid||pending}>{pending?'Sending…':items.length===1?'Submit answer':'Submit answers'}</Button></div>
 </form>;
}
