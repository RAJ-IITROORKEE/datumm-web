'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './question-card.module.css';

export type OpenCodeQuestion={id:string;annotationRevisionAvailable?:boolean;questions:{header:string;question:string;options:{label:string;description:string}[];multiple?:boolean;custom?:boolean}[]};
type Draft={selected:string[];custom:string;useCustom:boolean}[];
export function OpenCodeQuestions(props:{question:OpenCodeQuestion;onAnswer:(answers:string[][],annotationIntent?:'revise')=>Promise<void>}){
 return <NativeQuestionCard key={props.question.id} {...props}/>;
}
function NativeQuestionCard({question,onAnswer}:{question:OpenCodeQuestion;onAnswer:(answers:string[][],annotationIntent?:'revise')=>Promise<void>}){
 const [draft,setDraft]=useState<Draft>(()=>question.questions.map(()=>({selected:[],custom:'',useCustom:false})));
 const [pending,setPending]=useState(false),[error,setError]=useState(''),[requestRevision,setRequestRevision]=useState(false);
 const sending=useRef(false),heading=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [expanded,setExpanded]=useState(true);
 const detailsId=useId(),lastFocused=useRef<HTMLElement|null>(null),expandedRef=useRef(expanded),wasCollapsed=useRef(false);
 expandedRef.current=expanded;
 useEffect(()=>{if(!expanded){wasCollapsed.current=true;return;}if(wasCollapsed.current){wasCollapsed.current=false;const target=lastFocused.current;if(target?.isConnected&&!target.matches(':disabled'))target.focus();else heading.current?.focus();}},[expanded]);
 useEffect(()=>{heading.current?.focus();},[]);useEffect(()=>{if(error&&expandedRef.current)errorRef.current?.focus();},[error]);
 const update=(index:number,change:Partial<Draft[number]>)=>{setDraft(previous=>previous.map((entry,i)=>i===index?{...entry,...change}:entry));setError('');};
 const answers=question.questions.map((item,i)=>{const row=draft[i],custom=row?.useCustom?row.custom.trim():'';return item.multiple?[...new Set([...(row?.selected??[]),...(custom?[custom]:[])])]:custom?[custom]:row?.selected??[];});
 const valid=answers.length>0&&answers.every((values,i)=>values.length>0&&(question.questions[i].multiple||values.length===1));
 const send=async()=>{if(sending.current||!valid)return;sending.current=true;setPending(true);setError('');try{await onAnswer(answers,question.annotationRevisionAvailable&&requestRevision?'revise':undefined);}catch(failure){sending.current=false;setPending(false);setError(failure instanceof Error?failure.message:'Could not send answers. Your input is preserved.');}};
 return <form className={styles.card} aria-label="OpenCode needs your input" onSubmit={event=>{event.preventDefault();void send();}}>
  <header className={styles.heading}><CircleHelp size={16} aria-hidden="true"/><h3 ref={heading} tabIndex={-1}>Input required</h3><button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={detailsId} onClick={()=>setExpanded(value=>!value)}>{expanded?'Later':'Show'}</button></header>
  <div id={detailsId} className={styles.details} hidden={!expanded} onFocusCapture={event=>{lastFocused.current=event.target as HTMLElement;}}>
  <div className={styles.body}>{question.questions.map((item,i)=>{const row=draft[i],inputId=`native-answer-${question.id}-${i}`;return <fieldset key={i} className={styles.group} disabled={pending}>
   <legend>{item.header}: {item.question} <span className={styles.optional}>Required</span></legend>
   <div className={styles.choices}>{item.options.map(option=><label key={option.label} className={styles.choice}><input type={item.multiple?'checkbox':'radio'} name={`question-${question.id}-${i}`} checked={row.selected.includes(option.label)&&(!row.useCustom||Boolean(item.multiple))} onChange={()=>{const selected=item.multiple?(row.selected.includes(option.label)?row.selected.filter(value=>value!==option.label):[...row.selected,option.label]):[option.label];update(i,{selected,...(!item.multiple?{useCustom:false}:{})});}}/><span>{option.label}{option.description&&<small>{option.description}</small>}</span></label>)}</div>
   {item.custom!==false&&<label htmlFor={inputId} className={styles.custom}><span>Type your own answer{item.multiple?' (optional)':''}</span><textarea id={inputId} rows={2} maxLength={1000} value={row.custom} onChange={event=>update(i,{custom:event.target.value,useCustom:Boolean(event.target.value.trim()),...(!item.multiple?{selected:[]}: {})})}/></label>}
  </fieldset>;})}</div>
  {question.annotationRevisionAvailable&&<label className={styles.choice}><input type="checkbox" checked={requestRevision} disabled={pending} onChange={event=>setRequestRevision(event.target.checked)}/><span>Request a plan revision with these answers<small>Treat attached notes as edit requests. Revit approval remains separate.</small></span></label>}
  {error&&<p ref={errorRef} tabIndex={-1} className={styles.error} role="alert">{error}</p>}
  <footer className={styles.footer}><small>{pending?'Sending your answers…':'Answers do not authorize Revit changes.'}</small><Button type="submit" disabled={pending||!valid}>{pending?'Sending…':question.questions.length===1?'Submit answer':'Submit answers'}</Button></footer>
  </div>
 </form>;
}
