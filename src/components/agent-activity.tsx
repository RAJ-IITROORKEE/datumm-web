import { ArrowRight, Brain, Check, ChevronDown, CircleHelp, FileArchive, FileText, Search, Square, Users, Workflow, Wrench, X } from 'lucide-react';

import {MessageResponse} from './ai-elements/message';
import type { TaskEvent } from '@/lib/task-projection';
import type { ContextUsageData } from './agent-memory';
import { PublicResearchEvidence, PdfReviewEvidence, CompanionReviewEvidence } from './evidence-results';



export type ToolEvidence={callId:string;tool:string;role?:string;sessionId?:string;arguments?:unknown;status:string;result?:unknown;elapsedMs?:number|null};

export type RunManifest={taskId:string;sessionId?:string;model:string;mode:string;state:string;elapsedMs?:number|null;command?:string;tools?:ToolEvidence[];budget?:{calls:number;reservedUsd:number};children:{sessionId:string;role:string;model:string;state:string;calls:number;knownCostCalls?:number;reservedUsd:number;reportedUsd:number;elapsedMs:number;result?:string}[]};

export type ActivityTodo={content:string;status:string;priority:string};

const stages:Record<string,string>={assistant_update:'Progress update',specialist_started:'Specialist started',specialist_completed:'Specialist completed',skill_loaded:'Local skill',workflow_command:'Workflow command',compaction_started:'Compressing context',compaction_completed:'Compression',model_turn:'Thought',tool_running:'Tool call',tool_completed:'Observation',tool_failed:'Tool failed',session_recovered:'Chat restored',question_pending:'Waiting for your input',question_answered:'Your input received',agent_stage_start:'Planning',agent_stage_complete:'Step complete',agent_action:'Tool call',inspection:'Inspection',validate:'Validation',preview:'Review exact changes',approved:'Approved',execute:'Applying approved changes',verify:'Verification',batch_verified:'Batch verified',failed:'Failed',cancelled:'Stopped',interrupted:'Interrupted',paused_limit:'Limit reached'};

export function activityBatches(events:TaskEvent[]){
 const batches:TaskEvent[][]=[];
 for(const event of [...events].sort((a,b)=>a.index-b.index)){
  if(!stages[event.stage])continue;
  if(!batches.length||event.stage==='model_turn'&&!/^(vision|evidence)\s*·/.test(event.detail))batches.push([]);
  batches.at(-1)!.push(event);
 }
 if(batches.length>1&&batches[0].every(row=>row.stage!=='model_turn')){const setup=batches.shift()!;batches[0].unshift(...setup);}
 return batches;
}
const unavailable=(event:TaskEvent)=>event.stage==='tool_failed'&&/\bNO_PLAN_GEOMETRY\b/.test(event.detail);
const toolName=(event:TaskEvent)=>event.detail.replace(/^(Reading|Calling|Executing)\s+/,'').split(/[\s:{]/)[0].replace(/^datumm_revit_/,'');
export function stageIcon(event:TaskEvent){
 if(unavailable(event))return CircleHelp;
 if(['tool_failed','failed','interrupted','cancelled'].includes(event.stage))return X;
 if(event.stage.startsWith('question_'))return CircleHelp;
 if(event.stage.startsWith('compaction_'))return FileArchive;
 if(event.stage.startsWith('specialist_'))return Users;
 if(event.stage==='model_turn')return Brain;
 const tool=toolName(event);
 if(tool.startsWith('research_'))return Search;
 if(['design_plan','reconstruct_plan','plan_build'].includes(tool)||event.stage.startsWith('agent_stage')||event.stage==='workflow_command')return Workflow;
 if(['read_context','write_context','search_context','get_saved_evidence'].includes(tool)||event.stage==='skill_loaded')return FileText;
 return event.stage.startsWith('tool_')?Wrench:ArrowRight;
}

export function ActivitySummary({events}:{events:TaskEvent[]}){
 const rows=events.filter(event=>stages[event.stage]||['queued','running','answer','completed'].includes(event.stage));
 return <ol className="studio-activity-steps" aria-label="Task activity">{rows.map(event=>{
  const Icon=stageIcon(event),label=event.stage==='completed'?'Turn settled':event.stage==='answer'?'Answer ready':stages[event.stage]??event.stage.replaceAll('_',' '),detail=event.stage==='model_turn'?event.detail.match(/step \d+/)?.[0]??'Model step':event.stage==='queued'?'Task queued':event.stage==='running'?'Task started':event.stage==='answer'?'Response saved':event.stage==='completed'?'Model response finished':event.detail;
  return <li key={event.eventId??event.index}><Icon size={15} aria-hidden="true"/><span><strong>{label}</strong><small>{detail}</small></span>{event.at&&Number.isFinite(Date.parse(event.at))&&<time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}</li>;
 })}</ol>;
}
export function ActivityFeed({events,active,waiting,compact=false}:{events:TaskEvent[];active:boolean;waiting:boolean;compact?:boolean}){
 const batches=activityBatches(events).filter((batch,index,all)=>batch.some(row=>!['model_turn','assistant_update'].includes(row.stage))||active&&index===all.length-1);
 const latestUpdate=compact?batches.flatMap(batch=>batch.filter(row=>row.stage==='assistant_update')).at(-1):undefined;
 return <ol className="activity-feed" aria-label="Recorded work batches">{batches.map((batch,index)=>{
  const completed=batch.filter(row=>row.stage==='tool_completed'),unavailableReads=batch.filter(unavailable),failed=batch.filter(row=>['tool_failed','failed','interrupted','cancelled'].includes(row.stage)&&!unavailable(row)),step=batch.find(row=>row.stage==='model_turn')?.detail.match(/step \d+/)?.[0];
  const calls=batch.filter(row=>row.stage.startsWith('tool_')),runningCalls=calls.filter(row=>row.stage==='tool_running'),latest=batch.at(-1)!,Icon=stageIcon(failed.at(-1)??calls.at(-1)??batch.findLast(row=>row.stage!=='assistant_update')??latest),live=active&&index===batches.length-1&&!waiting;
  const labels=Array.from(new Set(completed.map(row=>toolName(row).replaceAll('_',' '))));
  const description=failed.length?(compact?'':failed.at(-1)!.detail||'Some recorded work stopped or failed. Review the details before continuing.'):unavailableReads.length?'No visible wall geometry in this view. The agent can continue with inventory or your supplied dimensions.':waiting&&index===batches.length-1?'Waiting for your answer.':'';
  const eventList=<ol>{batch.map(event=>{const EventIcon=stageIcon(event);return <li key={event.eventId??event.index} data-stage={event.stage}><EventIcon size={13} aria-hidden="true"/><span>{event.stage==='model_turn'?`${stages[event.stage]} · ${event.detail.match(/step \d+/)?.[0]??'model step'}`:event.detail||stages[event.stage]}</span></li>;})}</ol>;
  return <li key={batch[0].eventId??batch[0].index} data-batch-state={failed.length?'failed':live?'working':'recorded'}><details open={!compact&&(failed.length>0||live||undefined)}><summary><Icon size={15} aria-hidden="true"/><span className={live&&!failed.length&&!unavailableReads.length?'activity-shimmer':undefined}>{failed.length?(failed.some(row=>row.stage!=='tool_failed')?'Stopped / failed':`${failed.length} ${failed.length===1?'tool failed':'tools failed'} in this step`):unavailableReads.length?'Plan view has no wall geometry':labels.join(', ')||runningCalls.map(row=>toolName(row).replaceAll('_',' ')).join(', ')||(waiting&&index===batches.length-1?'Waiting for your answer':live?'Working':'Recorded activity')}</span>{live&&<WorkingIndicator/>}<small>{calls.length>0?`${completed.length} ${completed.length===1?'result':'results'} in this step`:''}</small></summary><div className="activity-batch-content">{compact?eventList:<details><summary>Details · {batch.length} events</summary>{eventList}</details>}</div></details>{batch.filter(row=>row.stage==='assistant_update'&&(!compact||row===latestUpdate)).map(row=><p key={row.eventId??row.index} className="activity-update">{row.detail}</p>)}{description&&<p className="activity-batch-description">{description}</p>}</li>;
 })}</ol>;
}



// @lat: [[architecture#Hosted workspace#Task lifecycle]]

export function activityTurns(events:TaskEvent[]):TaskEvent[][]{

 const turns:TaskEvent[][]=[];

 for(const event of [...events].sort((a,b)=>a.index-b.index)){

  if(event.stage==='queued'||!turns.length)turns.push([]);

  turns.at(-1)!.push(event);

 }

 // Setup events before the first admitted prompt belong to that first turn.

 if(turns.length>1&&turns[0].every(event=>!['queued','answer','completed','failed','cancelled','interrupted'].includes(event.stage))){const setup=turns.shift()!;turns[0].unshift(...setup);}

 return turns;

}

export function latestTaskActivity(task:{id:string;status:string;conversation?:unknown[];events:TaskEvent[];data:{usage?:ContextUsageData;run_manifest?:RunManifest;native_messages?:{id:string;text:string;finish:string|null}[];opencode_todos?:ActivityTodo[];opencode_questions?:unknown[];agent_question?:unknown;turns?:{conversationIndex:number;result?:{manifest?:RunManifest;evidence?:ToolEvidence[];todos?:ActivityTodo[]}|null}[]}},events=task.events){
 const index=Math.max(0,(task.conversation?.length??1)-1),turn=task.data.turns?.find(value=>value.conversationIndex===index),turnEvents=activityTurns(events)[index]??[],hasCurrentTurn=index===0||Boolean(turn)||turnEvents.length>0,manifest=turn?.result?.manifest??(hasCurrentTurn?task.data.run_manifest:undefined);
 return {index,events:turnEvents,active:['queued','running'].includes(task.status),waiting:Boolean(task.data.opencode_questions?.length||task.data.agent_question),nativeMessages:hasCurrentTurn?task.data.native_messages:undefined,manifest,evidence:turn?.result?.evidence??manifest?.tools??[],todos:turn?.result?.todos??(hasCurrentTurn?task.data.opencode_todos:undefined)??[],usage:task.data.usage?.rootTaskId===task.id?task.data.usage:undefined};
}



export function OpenCodeTodos({todos}:{todos:ActivityTodo[]}){

 if(!todos.length)return null;

 return <ol className="native-todos" aria-label="OpenCode task progress">{todos.map((todo,index)=><li key={index} data-status={todo.status}>{todo.status==='completed'?<Check className="todo-marker" size={15} aria-hidden="true"/>:todo.status==='in_progress'?<span className="todo-marker todo-ongoing" aria-hidden="true"/>:<Square className="todo-marker" size={15} aria-hidden="true"/>}<span>{todo.content}<small>{todo.status.replaceAll('_',' ')} · {todo.priority} priority</small></span></li>)}</ol>;

}



export function AgentActivity({events,nativeMessages=[],active=false,waiting=false,mode,model,evidence=[],todos=[],manifest,showFeed=true,compact=false}:{events:TaskEvent[];nativeMessages?:{id:string;text:string;finish:string|null}[];active?:boolean;waiting?:boolean;mode:string;model:string;evidence?:ToolEvidence[];todos?:ActivityTodo[];manifest?:RunManifest;showFeed?:boolean;compact?:boolean}){

 const rows=events.filter(event=>stages[event.stage]);

 const meaningful=rows.some(row=>!['model_turn','assistant_update','failed','cancelled','interrupted'].includes(row.stage))||evidence.length>0||todos.length>0||Boolean(manifest?.children?.length);
 const publicText=<>{nativeMessages.filter(row=>active||row.finish!=='stop').map(row=><div key={row.id} className="activity-update"><MessageResponse>{row.text}</MessageResponse></div>)}</>;
 if(!meaningful)return active&&nativeMessages.length?(compact?<div className="activity-compact">{publicText}<div className="orchestration-live" role="status"><WorkingIndicator/><span className="activity-shimmer">Working</span></div></div>:publicText):active?<div className={compact?'orchestration-live activity-compact':'orchestration-live'} role="status"><WorkingIndicator/><span className="activity-shimmer">Working</span></div>:null;

 const latest=rows.at(-1);
 const completed=evidence.filter(call=>call.status==='completed').length,failed=evidence.filter(call=>call.status==='failed').length;

  const content=<>{publicText}{showFeed&&<ActivityFeed events={events} active={active} waiting={waiting} compact={compact}/>}<PublicResearchEvidence evidence={evidence}/><PdfReviewEvidence evidence={evidence}/><CompanionReviewEvidence evidence={evidence}/><details className="activity-turn" open={!compact&&(waiting||failed>0||undefined)}><summary><ChevronDown size={13} aria-hidden="true"/><span>Activity</span><small>{completed} tool results{manifest?.children?.length?` · ${manifest.children.length} specialists`:''}{manifest?.elapsedMs!=null?` · ${(manifest.elapsedMs/1000).toFixed(1)}s`:''}{failed?` · ${failed} failed`:''}</small></summary><section className="orchestration-trace" aria-label="Agent orchestration">

   <div className="orchestration-heading"><strong>{active?(waiting?'Waiting for your input':'DATUMM working'):'Recorded activity'}</strong><span>{completed} tool results{failed?` · ${failed} failed`:``}{manifest?.elapsedMs!=null?` · ${(manifest.elapsedMs/1000).toFixed(1)}s`:``}</span>{todos.length>0&&<span>{todos.filter(todo=>todo.status==='completed').length}/{todos.length} tasks completed</span>}</div>

   <OpenCodeTodos todos={todos}/>

   {manifest&&<details className="orchestration-evidence"><summary>Main agent · {manifest.model} · {manifest.state}</summary><p>Parent session {manifest.sessionId??'not recorded'} / {manifest.elapsedMs===null||manifest.elapsedMs===undefined?'elapsed time unavailable while running':(manifest.elapsedMs/1000).toFixed(1)+'s'} · {manifest.budget?.calls??'unknown'} shared metered calls · ${manifest.budget?.reservedUsd.toFixed(4)??'unknown'} reserved</p><small>Waiting for input, interruption and failure remain explicit; idle does not imply completion.</small></details>}

   {Boolean(manifest?.children?.length)&&<details className="orchestration-evidence"><summary>Native specialists · {manifest!.children.length}/2</summary>{manifest!.children.map(child=><details key={child.sessionId}><summary>{child.role} · {child.model} · {child.state}</summary><p>{child.calls} total metered calls · ${child.reservedUsd.toFixed(4)} reserved · {child.knownCostCalls?`$${child.reportedUsd.toFixed(4)} reported${child.knownCostCalls<child.calls?' · partial':''}`:'Reported cost unavailable'} · {child.state==='running'?'running':`${(child.elapsedMs/1000).toFixed(1)}s`}</p><small>Native session {child.sessionId} · shared task budget · read-only</small>{child.result&&<pre>{child.result}</pre>}</details>)}</details>}

   {(rows.length>0||evidence.length>0)&&<details className="orchestration-background"><summary><ChevronDown size={14} aria-hidden="true"/><span>Background activity</span><small>{rows.length} recorded steps</small></summary><div className="orchestration-background-content">

  <ol className="orchestration-steps">{rows.map(event=>{

   const failed=['tool_failed','failed','interrupted'].includes(event.stage),thought=event.stage==='model_turn',input=event.stage.startsWith('question_');

   const Icon=failed?X:input?CircleHelp:event.stage==='tool_completed'||event.stage==='approved'||event.stage==='batch_verified'?Check:ArrowRight;

    return <li key={event.eventId??event.index} data-stage={event.stage}><details><summary><Icon size={13} aria-hidden="true"/><span>{thought?`${stages[event.stage]} · ${event.detail.match(/step \d+/)?.[0]??'reasoning step'}`:event.stage.startsWith('tool_')||event.stage.startsWith('specialist_')||event.stage==='compaction_completed'?event.detail:stages[event.stage]}</span></summary><div className="orchestration-detail">{event.detail}<small>{event.at&&new Date(event.at).toLocaleTimeString()} · Recorded runtime activity{thought?'; private chain-of-thought is not exposed.':'.'}</small></div></details></li>;

  })}</ol>

   {evidence.length>0&&<details className="orchestration-evidence"><summary>Tool inputs and results · {evidence.length} {evidence.length===1?'call':'calls'}</summary>{evidence.map(call=><details key={call.callId}><summary>{call.role?call.role+' · ':''}{call.tool} · {call.status}{call.elapsedMs!=null?` · ${(call.elapsedMs/1000).toFixed(1)}s`:''}</summary><strong>Input</strong><pre>{JSON.stringify(call.arguments??{},null,2)}</pre><strong>Observation</strong><pre>{JSON.stringify(call.result??'No result was recorded.',null,2)}</pre></details>)}</details>}

   </div></details>}

  <footer className="orchestration-footer"><Square size={12} aria-hidden="true"/><strong>{manifest?.mode??mode}</strong><details className="activity-runtime"><summary>Runtime details</summary><span>{manifest?.model??model}</span></details>{active&&<span className="orchestration-live" role="status" aria-live="polite">{waiting?<CircleHelp size={12}/>:<WorkingIndicator/>}{waiting?'Waiting for you':<span className="activity-shimmer">{latest?.stage==='tool_running'?'Calling tool':'Working'}</span>}</span>}</footer>

 </section></details></>;
  return compact?<div className="activity-compact">{content}</div>:content;

}


export function WorkingIndicator(){
 return <span className="working-segments" aria-hidden="true">{[0,1,2,3,4,5].map(index=><i key={index} style={{animationDelay:`${index*120}ms`}}/>)}</span>;
}
