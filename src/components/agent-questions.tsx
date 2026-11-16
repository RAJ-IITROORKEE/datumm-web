'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildPayload, canSubmit } from '@/lib/question-stepper.mjs';
import styles from './question-card.module.css';

export type QuestionItem={id:string;question:string;reason:string;required:boolean;inputKind:'text'|'number';unit:string;options:{id:string;label:string;recommended:boolean;rationale:string}[]};
export type AgentQuestion={id:string;version?:number;schemaVersion?:number;question:string;reason?:string;options?:string[];questions?:QuestionItem[]};
export type ReplyPayload={question_id:string;question_version:number;answers:{question_id:string;option_id?:string;value?:string}[]};
type Draft=Record<string,{choice:string;custom:string}>;
export function questionItems(question:AgentQuestion):QuestionItem[]{
 return question.questions??[{id:'input',question:question.question,reason:question.reason??'',required:true,inputKind:'text',unit:'',options:(question.options??[]).slice(0,3).map((label,i)=>({id:`option_${i+1}`,label,recommended:false,rationale:''}))}];
}

export function AgentQuestions(props:{question:AgentQuestion;runId:string;onReply:(payload:ReplyPayload|{question_id:string;answer:string})=>Promise<void>}){
 return <HostedQuestionCard key={JSON.stringify([props.runId,props.question.id,props.question.version??1])} {...props}/>;
}
function HostedQuestionCard({question,runId,onReply}:{question:AgentQuestion;runId:string;onReply:(payload:ReplyPayload|{question_id:string;answer:string})=>Promise<void>}){
 const items=questionItems(question),key=`datumm-question:${runId}:${question.id}:${question.version??1}`;
 const [draft,setDraft]=useState<Draft>({}),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const sending=useRef(false),heading=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [expanded,setExpanded]=useState(true);
 const detailsId=useId(),lastFocused=useRef<HTMLElement|null>(null),expandedRef=useRef(expanded),wasCollapsed=useRef(false);
 expandedRef.current=expanded;
 useEffect(()=>{if(!expanded){wasCollapsed.current=true;return;}if(wasCollapsed.current){wasCollapsed.current=false;const target=lastFocused.current;if(target?.isConnected&&!target.matches(':disabled'))target.focus();else heading.current?.focus();}},[expanded]);
 useEffect(()=>{try{const value=JSON.parse(sessionStorage.getItem(key)??'{}');if(value&&typeof value==='object'&&!Array.isArray(value)){const restored:Draft={};for(const item of items){const row=value[item.id];if(row&&typeof row.choice==='string'&&typeof row.custom==='string')restored[item.id]={choice:row.choice,custom:row.custom};}setDraft(restored);}}catch{}setReady(true);},[key]);
 useEffect(()=>{if(ready&&expandedRef.current)heading.current?.focus();},[ready]);
 useEffect(()=>{if(error&&expandedRef.current)errorRef.current?.focus();},[error]);
 const update=(id:string,change:Partial<Draft[string]>)=>{setDraft(previous=>{const next={...previous,[id]:{...(previous[id]??{choice:'',custom:''}),...change}};try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}return next;});setError('');};
 const submit=async()=>{if(sending.current||!ready||!canSubmit(items,draft))return;sending.current=true;setPending(true);setError('');try{await onReply(buildPayload(question,items,draft) as ReplyPayload);try{sessionStorage.removeItem(key);}catch{}}catch(failure){setError(failure instanceof Error?failure.message:'Unable to send. Your answers are saved; try again.');sending.current=false;setPending(false);}};
 return <form className={styles.card} aria-label="DATUMM needs your input" onSubmit={event=>{event.preventDefault();void submit();}}>
  <header className={styles.heading}><CircleHelp size={16} aria-hidden="true"/><h3 ref={heading} tabIndex={-1}>DATUMM needs your input</h3><button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(value=>!value)}>{expanded?'Later':'Show'}</button></header>
  <div id={detailsId} className={styles.details} hidden={!expanded} onFocusCapture={event=>{lastFocused.current=event.target as HTMLElement;}}>
  <div className={styles.body}>
   {items.map(item=>{const selected=draft[item.id]?.choice??'',inputId=`answer-${question.id}-${item.id}`,custom=selected==='custom'||!item.options.length;return <fieldset key={item.id} className={styles.group} disabled={pending||!ready}>
    <legend>{item.question} <span className={styles.optional}>{item.required?'Required':'Optional'}</span></legend>
    {item.reason&&<p className={styles.reason} id={`${inputId}-reason`}>{item.reason}</p>}
    {item.options.length>0&&<div className={styles.choices}>{[...item.options,{id:'custom',label:'Other',recommended:false,rationale:''}].map(option=><label key={option.id} className={styles.choice}>
     <input type="radio" name={inputId} value={option.id} checked={selected===option.id} onChange={()=>update(item.id,{choice:option.id})}/><span>{option.label}{option.recommended&&<small className={styles.recommended}>Recommended</small>}{option.rationale&&<small>{option.rationale}</small>}</span>
    </label>)}</div>}
    {custom&&<label className={styles.custom} htmlFor={inputId}><span>{item.options.length?'Your answer':'Answer'}{item.unit&&` (${item.unit})`}</span>{item.inputKind==='number'?<input id={inputId} type="number" step="any" aria-describedby={item.reason?`${inputId}-reason`:undefined} value={draft[item.id]?.custom??''} onChange={event=>update(item.id,{custom:event.target.value,choice:'custom'})}/>:<textarea id={inputId} rows={2} maxLength={1000} aria-describedby={item.reason?`${inputId}-reason`:undefined} value={draft[item.id]?.custom??''} onChange={event=>update(item.id,{custom:event.target.value,choice:'custom'})}/>}</label>}
   </fieldset>;})}
  </div>
  {error&&<p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}</p>}
  <footer className={styles.footer}><small>{pending?'Sending your answers…':'Answers do not authorize Revit changes.'}</small><Button type="submit" disabled={!ready||pending||!canSubmit(items,draft)}>{pending?'Sending…':items.length===1?'Submit answer':'Submit answers'}</Button></footer>
  </div>
 </form>;
}
