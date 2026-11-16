'use client';

import {useEffect,useState,type ReactNode} from 'react';
import {ArrowRight} from 'lucide-react';
import {validateChatComposition,type ChatComposition,type CompositionNode} from '@/lib/chat-composition.mjs';
import type {AnswerSource} from '@/lib/answer-outputs.mjs';
import {useOutputWorkspace} from './output-workspace';
import styles from './chat-composition.module.css';

function Node({node}:{node:CompositionNode}) {
  if(node.type==='text')return <p className={styles.text}>{node.text}</p>;
  if(node.type==='stack'||node.type==='grid')return <div className={node.type==='grid'?styles.grid:styles.stack}>{node.children.map((child,i)=><Node key={i} node={child}/>)}</div>;
  if(node.type==='details')return <details className={styles.details}><summary>{node.label}</summary><div className={styles.stack}>{node.children.map((child,i)=><Node key={i} node={child}/>)}</div></details>;
  if(node.type==='table')return <div className={styles.scroll} tabIndex={0} role="region" aria-label={node.title}><table className={styles.table}><caption>{node.title}</caption><thead><tr>{node.columns.map((label,i)=><th scope="col" key={i}>{label}</th>)}</tr></thead><tbody>{node.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
  if(node.type==='bars'){
    const max=Math.max(...node.items.map(row=>row.value),1);
    return <figure className={styles.figure}><figcaption>{node.title} <span>({node.unit})</span></figcaption><dl className={styles.bars}>{node.items.map((item,i)=><div key={i}><dt>{item.label}</dt><dd><span className={styles.track} aria-hidden="true"><span style={{width:`${item.value/max*100}%`}}/></span><span>{item.display}</span></dd></div>)}</dl></figure>;
  }
  if(node.type!=='flow')return null;
  return <figure className={styles.figure}><figcaption>{node.title}</figcaption><ul className={styles.nodes}>{node.nodes.map(item=><li key={item.id}>{item.label}</li>)}</ul>{node.edges.length>0&&<ul className={styles.edges} aria-label="Illustrative connections">{node.edges.map((edge,i)=><li key={i}><span>{node.nodes.find(item=>item.id===edge.from)?.label}</span><ArrowRight size={14} aria-hidden="true"/><span className="sr-only">leads to</span><span>{node.nodes.find(item=>item.id===edge.to)?.label}</span></li>)}</ul>}</figure>;
}

export function ChatCompositionView({value,text,source,turnId,children}:{value:unknown;text:string;source:AnswerSource;turnId?:string;children?:ReactNode}) {
  const {scope}=useOutputWorkspace();
  const [validated,setValidated]=useState<{value:unknown;text:string;taskId?:string;turnId?:string;scopeKey:string;epoch:number;result:ChatComposition}|null>(null);
  useEffect(()=>{
    let current=true;
    void validateChatComposition(value,{taskId:source.taskId,turnId,text,state:source.state}).then(result=>{if(current)setValidated(result?{value,text,taskId:source.taskId,turnId,scopeKey:scope.key,epoch:scope.epoch,result}:null);});
    return ()=>{current=false;};
  },[value,text,source.taskId,source.state,turnId,scope.key,scope.epoch]);
  if(source.state!=='saved'||scope.taskId!==source.taskId||!validated||validated.value!==value||validated.text!==text||validated.taskId!==source.taskId||validated.turnId!==turnId||validated.scopeKey!==scope.key||validated.epoch!==scope.epoch)return children??null;
  return <section className={styles.root} aria-label="Illustrative answer view"><p className={styles.notice}>Illustrative explanation · not model measurements or execution evidence</p><Node node={validated.result.root}/>{children&&<details className={styles.details}><summary>Answer preview and actions</summary>{children}</details>}</section>;
}
