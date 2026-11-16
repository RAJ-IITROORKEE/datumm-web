'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './project-context.module.css';

type Source = {kind:'user'|'task';taskId?:string;taskTitle?:string;note?:string};
type Entry = {id:string;label:string;value:string;status:'proposed'|'confirmed';source:Source;archived?:boolean};
type Snapshot = {revision:number;updatedAt:string|null;entries:Entry[]};
type Brief = Snapshot & {projectId:string;history:Snapshot[]};
type State = {key:string;phase:'loading'|'ready'|'saving'|'conflict'|'error';base:Brief|null;entries:Entry[];message:string};
const same = (a:Entry[], b:Entry[]) => JSON.stringify(a) === JSON.stringify(b);
const validBrief = (value:unknown, projectId:string): value is Brief => {
 const row = value as Brief;
 const validEntries = (entries:unknown): entries is Entry[] => Array.isArray(entries) && entries.every(entry => entry && typeof entry.id === 'string' && typeof entry.label === 'string' && typeof entry.value === 'string' && ['proposed','confirmed'].includes(entry.status) && entry.source && ['user','task'].includes(entry.source.kind));
 return !!row && row.projectId === projectId && Number.isInteger(row.revision) && row.revision >= 0 && validEntries(row.entries) && Array.isArray(row.history) && row.history.every(item=>item && Number.isInteger(item.revision) && validEntries(item.entries));
};
const empty = (key:string):State => ({key,phase:'loading',base:null,entries:[],message:''});

/** State remains in ProjectContext while the dialog closes, scoped to account and project. */
export function useProjectBriefEditor(accountKey:string, projectId:string|undefined, open:boolean) {
 const key = JSON.stringify([accountKey,projectId]);
 const [,setRevision] = useState(0);
 const store = useRef<{account:string;key:string;serial:number;states:Map<string,State>;saves:Map<string,object>}>({account:accountKey,key,serial:0,states:new Map(),saves:new Map()});
 if (store.current.account !== accountKey) store.current = {account:accountKey,key,serial:store.current.serial+1,states:new Map(),saves:new Map()};
 else if (store.current.key !== key) {store.current.key=key;store.current.serial++;}
 const owner = store.current;
 const mounted = useRef(true);
 const state = owner.states.get(key) ?? empty(key);
 const commit = (fn:(previous:State)=>State) => {
  if (!mounted.current || store.current !== owner) return;
  const previous=store.current.states.get(key) ?? empty(key);
  store.current.states.set(key,fn(previous));
  if(store.current.key===key) setRevision(value=>value+1);
 };
 const load = async (replace:boolean) => {
  if (!mounted.current || store.current!==owner || !accountKey || !projectId || store.current.key !== key || store.current.saves.has(key)) return;
  const serial=++store.current.serial;
  const alive=()=>mounted.current && store.current===owner && store.current.key===key && store.current.serial===serial;
  if (replace || !state.base) commit(previous=>({...previous,phase:'loading',message:''}));
  try {
   const response = await fetch(`/api/service/projects/${encodeURIComponent(projectId)}/brief`,{cache:'no-store',credentials:'same-origin'});
   if (!response.ok) throw new Error(response.status===404?'This project is unavailable.': 'Could not load the project brief. Try again.');
   const result:unknown=await response.json();
   if (!alive()) return;
   if (!validBrief(result,projectId)) throw new Error('The project brief response could not be read.');
   commit(prior=>{
    if (!replace && prior.base && !same(prior.entries,prior.base.entries)) {
     return result.revision !== prior.base.revision ? {...prior,phase:'conflict',message:'This brief changed elsewhere. Your draft is still here.'} : {...prior,phase:'ready',message:'Unsaved changes.'};
    }
    return {key,phase:'ready',base:result,entries:result.entries,message:''};
   });
  } catch(error) {if(alive()) commit(prior=>({...prior,phase:'error',message:error instanceof Error?error.message:'Could not load the project brief.'}));}
 };
 useEffect(()=>{if(open && accountKey && projectId && !store.current.saves.has(key)) void load(false);},[key,open]);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;store.current.serial++;};},[]);
 const edit = (entries:Entry[]) => {if(store.current.key!==key)return;commit(previous=>['loading','saving'].includes(previous.phase)?previous:{...previous,entries,message:previous.phase==='conflict'?previous.message:'Unsaved changes.'});};
 const save = async () => {
  const start=store.current.states.get(key);
  if (!mounted.current || store.current!==owner || store.current.key!==key || !accountKey || !projectId || store.current.saves.has(key) || !start || start.phase!=='ready' || !start.base || same(start.entries,start.base.entries)) return;
  if (start.entries.length > 40 || start.entries.some(entry=>!entry.label.trim() || !entry.value.trim() || entry.label.length>80 || entry.value.length>1000 || (entry.source.note?.length??0)>500)) {commit(previous=>({...previous,message:'Each entry needs a label and value within the stated limits.'}));return;}
  const revision=start.base.revision, entries=start.entries;
  const body=JSON.stringify({expectedRevision:revision,entries});
  if (new TextEncoder().encode(body).byteLength > 65536) {commit(previous=>({...previous,message:'Brief is too large to save in one request. Shorten the entries or notes; your draft is preserved.'}));return;}
  const token={}, serial=++store.current.serial;
  store.current.saves.set(key,token);
  const alive=()=>mounted.current && store.current===owner && store.current.key===key && store.current.serial===serial;
  commit(previous=>({...previous,phase:'saving',message:'Saving…'}));
  try {
   const response=await fetch(`/api/service/projects/${encodeURIComponent(projectId)}/brief`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body});
   if (!alive()) return;
   if (response.status===409) {commit(previous=>({...previous,phase:'conflict',message:'This brief changed elsewhere. Your draft is still here.'}));return;}
   if (!response.ok) throw new Error(response.status===422?'Check the entry fields and try again.':'Could not save the brief. Your draft is still here.');
   const result:unknown=await response.json();
   if (!alive()) return;
   if (!validBrief(result,projectId)) throw new Error('The save response could not be read. Reload before saving again.');
   commit(()=>({key,phase:'ready',base:result,entries:result.entries,message:'Project brief saved.'}));
  } catch(error) {if(alive()) commit(previous=>({...previous,phase:'error',message:error instanceof Error?error.message:'Could not save the brief.'}));}
  finally {
   if(mounted.current && store.current===owner && store.current.saves.get(key)===token) {
    store.current.saves.delete(key);
    if(!alive()) commit(previous=>previous.phase==='saving'?{...previous,phase:'error',message:'Save outcome could not be confirmed. Retry loading before saving.'}:previous);
   }
  }
 };
 return {state,available:Boolean(accountKey),edit,save,reload:()=>void load(true),retry:()=>void load(false)};
}

type Editor = ReturnType<typeof useProjectBriefEditor>;
export function ProjectBriefEditor({editor,projectId,projectTitle,task,onUseBrief,useBlocked}:{editor:Editor;projectId?:string;projectTitle?:string;task:{id:string;title:string;projectId?:string}|null;onUseBrief?:(text:string)=>boolean|string|void;useBlocked:boolean}) {
 const {state,edit,save,reload,retry}=editor;
 const [handoffError,setHandoffError] = useState('');
 const live = useRef({editor,projectId,onUseBrief,useBlocked});
 live.current = {editor,projectId,onUseBrief,useBlocked};
 if(!projectId) return <section className={styles.section}><h3>Project brief &amp; decisions</h3><p>Select a project to edit its brief.</p></section>;
 if(!editor.available) return <section className={styles.section}><h3>Project brief &amp; decisions</h3><p>Sign in to view the project brief.</p></section>;
 const update=(index:number,patch:Partial<Entry>)=>edit(state.entries.map((entry,i)=>i===index?{...entry,...patch}:entry));
 const locked=state.phase==='loading'||state.phase==='saving';
 const dirty=!!state.base&&!same(state.entries,state.base.entries);
 return <section className={styles.section} aria-label="Project brief and decisions">
  <h3>Project brief &amp; decisions</h3>
  <p className={styles.projectName}>{projectTitle || 'Untitled project'}</p>
  <p className={styles.hint}>A saved project reference. Changes do not automatically update existing chats or plans.</p>
  {state.phase==='loading'&&!state.base && <p role="status">Loading project brief…</p>}
  {state.base && <>
   <p className={styles.hint}>Revision {state.base.revision}{dirty?' · Unsaved changes':''}</p>
   <div className={styles.entries}>{state.entries.map((entry,index)=><fieldset key={entry.id} className={styles.entry} disabled={locked}>
    <legend>{entry.archived?'Archived entry':`Entry ${index+1}`}</legend>
    <label>Label <small>Up to 80 characters</small><input value={entry.label} maxLength={80} onChange={event=>update(index,{label:event.target.value})}/></label>
    <label>Value <small>Up to 1,000 characters</small><textarea value={entry.value} maxLength={1000} rows={2} onChange={event=>update(index,{value:event.target.value})}/></label>
    <label>Status<select value={entry.status} onChange={event=>update(index,{status:event.target.value as Entry['status']})}><option value="proposed">Proposed</option><option value="confirmed">Confirmed</option></select></label>
    <label>Source<select value={entry.source.kind} onChange={event=>{const kind=event.target.value;if(kind==='task'&&task?.projectId===projectId) update(index,{source:{kind:'task',taskId:task.id,taskTitle:task.title,note:entry.source.note}});else if(kind==='user')update(index,{source:{kind:'user',note:entry.source.note}});}}><option value="user">Added by me</option><option value="task" disabled={entry.source.kind!=='task'&&(!task||task.projectId!==projectId)}>Chat source</option></select></label>
    {entry.source.kind==='task' && <p>Source chat: {entry.source.taskTitle || 'Untitled chat'}</p>}
    {entry.source.kind==='task' && task?.projectId===projectId && task.id!==entry.source.taskId && <button type="button" className={styles.action} onClick={()=>update(index,{source:{kind:'task',taskId:task.id,taskTitle:task.title,note:entry.source.note}})}>Use selected chat as source</button>}
    <label>Source note <small>Optional · up to 500 characters</small><input value={entry.source.note??''} maxLength={500} onChange={event=>update(index,{source:{...entry.source,note:event.target.value}})}/></label>
    {state.base?.entries.some(saved=>saved.id===entry.id) ? <button type="button" className={styles.action} onClick={()=>update(index,{archived:!entry.archived})}>{entry.archived?'Restore entry':'Archive entry'}</button> : <button type="button" className={styles.action} onClick={()=>edit(state.entries.filter(row=>row.id!==entry.id))}>Remove unsaved entry</button>}
   </fieldset>)}</div>
   <p className={styles.hint}>Up to 40 entries, including archived entries.</p>
   <div className={styles.editorActions}><button type="button" className={styles.action} disabled={locked||state.entries.length>=40} onClick={()=>edit([...state.entries,{id:crypto.randomUUID(),label:'',value:'',status:'proposed',source:{kind:'user'}}])}>Add entry</button><button type="button" className={styles.action} disabled={locked||state.phase!=='ready'||!dirty} onClick={()=>void save()}>Save project brief</button>{onUseBrief && <button type="button" className={styles.action} disabled={locked||state.phase!=='ready'||dirty||useBlocked||!state.base.entries.some(entry=>!entry.archived)} onClick={()=>{const current=live.current, latest=current.editor.state;if(current.projectId!==projectId||current.onUseBrief!==onUseBrief||current.useBlocked||latest.key!==state.key||latest.phase!=='ready'||!latest.base||!same(latest.entries,latest.base.entries))return;const active=latest.base.entries.filter(entry=>!entry.archived);if(!active.length)return;const text=['Saved project brief · revision '+latest.base.revision,'Review alongside the current request; proposed entries need confirmation.',...active.map(entry=>`${JSON.stringify(entry.label)}: ${JSON.stringify(entry.value)} · ${entry.status} · source: ${entry.source.kind === 'task' ? `task ${JSON.stringify(entry.source.taskTitle || 'Untitled task')} (${JSON.stringify(entry.source.taskId || 'ID not recorded')})` : 'user'}${entry.source.note ? ` · note: ${JSON.stringify(entry.source.note)}` : ''}`)].join('\n');const result=current.onUseBrief?.(text);setHandoffError(typeof result==='string'?result:result===false?'The chat changed. Reopen this brief and try again.':'');}}>Use in chat</button>}</div>
   <details className={styles.details}><summary>Recent history · up to 20 revisions</summary>{state.base.history.length ? state.base.history.map(row=><div key={row.revision} className={styles.history}><strong>Revision {row.revision}</strong>{row.updatedAt&&<span> · {row.updatedAt}</span>}<ul>{row.entries.map(entry=><li key={entry.id}>{entry.label}: {entry.value} · {entry.status}{entry.archived?' · archived':''} · {entry.source.kind === 'task' ? `chat ${entry.source.taskTitle || 'Untitled chat'}` : 'user'}{entry.source.note ? ` · ${entry.source.note}` : ''}</li>)}</ul></div>):<p>No earlier revisions recorded.</p>}</details>
  </>}
  {handoffError && <p role="status" className={styles.editorMessage}>{handoffError}</p>}
  {state.message && <p role="status" className={styles.editorMessage}>{state.message}</p>}
  {state.phase==='conflict' && <button type="button" className={styles.action} onClick={reload}>Discard draft and load latest</button>}
  {state.phase==='error' && <button type="button" className={styles.action} onClick={retry}>Retry loading</button>}
 </section>;
}
