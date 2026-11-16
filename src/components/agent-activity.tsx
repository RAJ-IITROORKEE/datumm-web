import { ArrowRight, Brain, Check, ChevronDown, CircleHelp, FileArchive, FileText, Search, Square, Users, Workflow, Wrench, X } from 'lucide-react';

import {MessageResponse} from './ai-elements/message';
import { ToolCallCard, type ToolCallStatus } from './vendor/affectui/tool-call-card-clean';
import type { TaskEvent } from '@/lib/task-projection';
import type { ContextUsageData } from './agent-memory';
import { PublicResearchEvidence, PdfReviewEvidence, CompanionReviewEvidence } from './evidence-results';
import { activityStateLabel } from '@/lib/process-activity.mjs';
import { conversationTurns, turnEvents, type ConversationRecord } from '@/lib/conversation-turns.mjs';
import styles from './agent-activity.module.css';



export type ToolEvidence={callId:string;tool:string;role?:string;sessionId?:string;arguments?:unknown;status:string;result?:unknown;elapsedMs?:number|null};

export type RunManifest={taskId:string;sessionId?:string;model:string;mode:string;state:string;elapsedMs?:number|null;command?:string;tools?:ToolEvidence[];budget?:{calls:number;reservedUsd:number};children:{sessionId:string;role:string;model:string;state:string;calls:number;knownCostCalls?:number;reservedUsd:number;reportedUsd:number;elapsedMs:number;result?:string}[]};

export type ActivityTodo={content:string;status:string;priority:string};

const stages:Record<string,string>={assistant_update:'Progress update',specialist_started:'Specialist started',specialist_complete:'Specialist completed',specialist_completed:'Specialist completed',skill_loaded:'Local skill',workflow_command:'Workflow command',compaction_started:'Compressing context',compaction_completed:'Compression',model_turn:'Thought',tool_running:'Tool call',tool_completed:'Observation',tool_failed:'Tool failed',tool_start:'Tool call',tool_returned:'Observation',tool_stopped:'Tool stopped',session_recovered:'Chat restored',question_pending:'Waiting for your input',question_answered:'Your input received',agent_stage_start:'Planning',agent_stage_complete:'Step complete',agent_action:'Agent action',inspection:'Inspection',validate:'Validation',preview:'Review exact changes',approved:'Approved',execute:'Applying approved changes',verify:'Verification',batch_verified:'Batch verified',failed:'Failed',cancel_requested:'Stop requested',cancelled:'Stopped',interrupted:'Interrupted',paused_limit:'Limit reached'};
// Pre-N3 hosted relay events have no callId and stay hidden, as before N3.
const hostedTool=new Set(['tool_start','tool_returned','tool_stopped']);
const known=(event:TaskEvent)=>Boolean(stages[event.stage])&&(!hostedTool.has(event.stage)||Boolean(event.callId));
// tool_stopped covers both a failure and a user stop; the outcome says which.
const stageLabel=(event:TaskEvent)=>event.stage==='tool_stopped'&&event.outcome==='failed'?'Tool failed':stages[event.stage];

export function activityBatches(events:TaskEvent[]){
 const batches:TaskEvent[][]=[];
 for(const event of [...events].sort((a,b)=>a.index-b.index)){
  if(!known(event))continue;
  if(!batches.length||event.stage==='model_turn'&&!/^(vision|evidence)\s*·/.test(event.detail))batches.push([]);
  batches.at(-1)!.push(event);
 }
 if(batches.length>1&&batches[0].every(row=>row.stage!=='model_turn')){const setup=batches.shift()!;batches[0].unshift(...setup);}
 return batches;
}
const unavailable=(event:TaskEvent)=>event.stage==='tool_failed'&&/\bNO_PLAN_GEOMETRY\b/.test(event.detail);
export const toolName=(event:TaskEvent)=>event.detail.replace(/^(Reading|Calling|Executing)\s+/,'').split(/[\s:{]/)[0].replace(/^datumm_revit_/,'');
export function stageIcon(event:TaskEvent){
 if(unavailable(event))return CircleHelp;
 if(['tool_failed','failed','interrupted','cancelled'].includes(event.stage)||stageLabel(event)==='Tool failed')return X;
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

export function ActivitySummary({events,eventDetail,compact=false}:{events:TaskEvent[];eventDetail?:(event:TaskEvent)=>string;compact?:boolean}){
 const rows=events.filter(event=>known(event)||['queued','running','answer','completed'].includes(event.stage));
 return <ol className={`${styles.activitySummary} ${compact ? styles.activitySummaryCompact : ''}`} aria-label="Task activity">{rows.map(event=>{
  const structural:Record<string,string>={queued:'Task queued',running:'Task started',answer:'Response saved',completed:'Model response finished'};
  const action:Record<string,string>={capture_intent:'Understand request',finish_answer:'Prepare answer'};
  const compactAction:Record<string,string>={...action,create_design:'Create design',plan_task:'Record checklist',revise_task_plan:'Update checklist'};
  const Icon=stageIcon(event),label=event.stage==='completed'?'Turn settled':event.stage==='answer'?'Answer ready':event.stage==='model_turn'?'Model step':stageLabel(event)??event.stage.replaceAll('_',' '),detail=event.stage==='model_turn'?event.detail.match(/step \d+/)?.[0]??'Step number not recorded':structural[event.stage]??(event.stage==='agent_action'&&/^[a-z][a-z0-9_]*$/.test(event.detail)?action[event.detail]??event.detail.replaceAll('_',' '):eventDetail?eventDetail(event):event.detail);
  const compactDetail = compact && ['agent_action','agent_stage_complete'].includes(event.stage) && compactAction[event.detail] ? compactAction[event.detail] : detail;
  return <li key={event.eventId??event.index} data-stage={event.stage}><Icon size={15} aria-hidden="true"/><span>{compact ? <><strong>{compactDetail || label}</strong>{compactDetail && compactDetail !== label && <small>{label}</small>}</> : <><strong>{label}</strong><small>{detail}</small></>}</span>{event.at&&Number.isFinite(Date.parse(event.at))&&<time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}</li>;
 })}</ol>;
}
export function ActivityFeed({events,active,waiting,compact=false}:{events:TaskEvent[];active:boolean;waiting:boolean;compact?:boolean}){
 const batches=activityBatches(events).filter((batch,index,all)=>batch.some(row=>!['model_turn','assistant_update'].includes(row.stage))||active&&index===all.length-1);
 const latestUpdate=compact?batches.flatMap(batch=>batch.filter(row=>row.stage==='assistant_update')).at(-1):undefined;
 return <ol className="activity-feed" aria-label="Recorded work batches">{batches.map((batch,index)=>{
  const completed=batch.filter(row=>row.stage==='tool_completed'),unavailableReads=batch.filter(unavailable),failed=batch.filter(row=>(['tool_failed','failed','interrupted','cancelled'].includes(row.stage)||stageLabel(row)==='Tool failed')&&!unavailable(row)),step=batch.find(row=>row.stage==='model_turn')?.detail.match(/step \d+/)?.[0];
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

  const conversational = event.stage === 'command_accepted' && /^Accepted (?:submit|chat followup|amend) in this task\.$/.test(event.detail);
  const queuedBoundary = event.stage === 'queued' && !turns.at(-1)?.some(row => row.stage === 'command_accepted') && Boolean(turns.at(-1)?.some(row => row.stage !== 'queued'));
  if(!turns.length || conversational && !turns.at(-1)!.every(row=>row.stage==='queued') || queuedBoundary)turns.push([]);

  turns.at(-1)!.push(event);

 }

 // Setup events before the first admitted prompt belong to that first turn.

 if(turns.length>1&&turns[0].every(event=>!['queued','command_accepted','answer','completed','failed','cancelled','interrupted'].includes(event.stage))){const setup=turns.shift()!;turns[0].unshift(...setup);}

 return turns;

}

export function latestTaskActivity(task:{id:string;status:string;conversation?:ConversationRecord[];events:TaskEvent[];data:{usage?:ContextUsageData;run_manifest?:RunManifest;native_messages?:{id:string;text:string;finish:string|null}[];opencode_todos?:ActivityTodo[];todosConversationIndex?:number;opencode_questions?:unknown[];agent_question?:unknown;turns?:{conversationIndex:number;result?:{manifest?:RunManifest;evidence?:ToolEvidence[];todos?:ActivityTodo[]}|null}[]}},events=task.events){
 const records=conversationTurns(task.conversation),ordinal=Math.max(0,records.length-1),current=records[ordinal],index=current?.index??0,turn=task.data.turns?.find(value=>value.conversationIndex>=index&&value.conversationIndex<=(current?.endIndex??index)),currentEvents=records.length?turnEvents(records,activityTurns(events),ordinal):activityTurns(events)[0]??[],hasCurrentTurn=index===0||Boolean(turn)||currentEvents.length>0,manifest=turn?.result?.manifest??(hasCurrentTurn?task.data.run_manifest:undefined);
 return {index,turnId:current?.turnId,events:currentEvents,taskEvents:events,active:['queued','running'].includes(task.status),waiting:Boolean(task.data.opencode_questions?.length||task.data.agent_question),nativeMessages:hasCurrentTurn?task.data.native_messages:undefined,manifest,evidence:turn?.result?.evidence??manifest?.tools??[],todos:turn?.result?.todos??(task.data.todosConversationIndex !== undefined && task.data.todosConversationIndex >= index && task.data.todosConversationIndex <= (current?.endIndex ?? index) ? task.data.opencode_todos : undefined)??[],usage:task.data.usage?.rootTaskId===task.id?task.data.usage:undefined};
}



const stateNames:Record<string,string>={
 completed:'Completed',complete:'Completed',done:'Completed',succeeded:'Completed',
 failed:'Failed',error:'Failed',cancelled:'Stopped',stopped:'Stopped',interrupted:'Interrupted',
 recorded:'Recorded activity',unconfirmed:'Outcome unconfirmed',unknown:'Unknown status',
 queued:'Queued',pending:'Pending',running:'Running',in_progress:'Running',
 waiting:'Waiting for input',waiting_for_input:'Waiting for input',needs_input:'Waiting for input',
 awaiting_approval:'Waiting for approval',blocked:'Blocked',partial:'Partially complete',
 stale:'Source changed',skipped:'Skipped',paused_limit:'Paused at task limit',paused_recovery:'Recovery required',
 reconciling:'Checking operation status',
};
const duration=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?`${(value/1000).toFixed(1)}s`:undefined;
const amount=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)?`$${value.toFixed(4)}`:'Not recorded';
const safeEventDetail=(event:TaskEvent)=>event.stage==='model_turn'?`Model step · ${event.detail.match(/step \d+/)?.[0]??'step number not recorded'}`:event.detail||stageLabel(event);
/** A recorded tool state does not become a success when the containing task stops. */
function recordedState(state:string|undefined,active:boolean){
 const pending=['running','in_progress','pending','queued'].includes(state??'');
 const label=!active&&pending?'Outcome unconfirmed':stateNames[state??'']??'Unknown status';
 const tone=['failed','error'].includes(state??'')?'failed':['completed','complete','done','succeeded'].includes(state??'')?'completed':pending&&active?'active':'recorded';
 return {label,tone,unconfirmed:!active&&pending};
}
function EvidenceBlock({label,value}:{label:string;value:unknown}){
 const raw=typeof value==='string'?value:JSON.stringify(value,null,2);
 return <section className={styles.evidenceBlock}><h4>{label}</h4>{value===undefined?<p className={styles.note}>{label==='Arguments'?'Arguments were not recorded.':'No result was recorded.'}</p>:<pre tabIndex={0} aria-label={`${label} details`}>{raw}</pre>}</section>;
}
/** Only explicit source aliases may acquire success, failure or a live running icon. */
function toolStatus(state:string|undefined,active:boolean):ToolCallStatus{
 if(!active&&['running','in_progress','pending','queued'].includes(state??''))return 'unconfirmed';
 if(['completed','complete','done','succeeded'].includes(state??''))return 'success';
 if(['failed','error'].includes(state??''))return 'error';
 if(['running','in_progress'].includes(state??''))return 'running';
 if(['cancelled','stopped'].includes(state??''))return 'stopped';
 if(['waiting','waiting_for_input','needs_input'].includes(state??''))return 'waiting';
 const states=['recorded','pending','queued','awaiting_approval','interrupted','blocked','partial','stale','skipped','paused_limit','paused_recovery','reconciling','unconfirmed'] as const;
 return states.find(value=>value===state)??'unknown';
}
function RecordedTool({call,active}:{call:ToolEvidence;active:boolean}){
 const state=recordedState(call.status,active),elapsed=duration(call.elapsedMs);
 const details=<>
  {state.unconfirmed&&<p className={styles.note}>Last reported {stateNames[call.status]?.toLowerCase()}. No final tool outcome was recorded.</p>}
  {call.arguments===undefined&&<EvidenceBlock label="Arguments" value={undefined}/>}
  {call.result===undefined&&<EvidenceBlock label={state.tone==='failed'?'Error / result':'Result'} value={undefined}/>}
  <details className={styles.technical}><summary>Tool identity <ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><dl className={styles.facts}><div><dt>Call ID</dt><dd>{call.callId||'Not recorded'}</dd></div><div><dt>Session</dt><dd>{call.sessionId??'Not recorded'}</dd></div><div><dt>Agent role</dt><dd>{call.role??'Not recorded'}</dd></div><div><dt>Recorded status</dt><dd>{call.status||'Not recorded'}</dd></div><div><dt>Duration</dt><dd>{elapsed??'Not recorded'}</dd></div></dl></details>
 </>;
 return <li className={styles.tool} data-state={state.tone}><ToolCallCard
  name={call.tool||'Unnamed tool'} status={toolStatus(call.status,active)} statusLabel={state.label}
  args={call.arguments} result={call.result} resultLabel={state.tone==='failed'?'Error / result':'Result'}
  duration={typeof call.elapsedMs==='number'&&Number.isFinite(call.elapsedMs)&&call.elapsedMs>=0?call.elapsedMs:undefined}
  timing="recorded" openOnError={false} maxCodeHeight={220} details={details}
 /></li>;
}
export function OpenCodeTodos({todos}:{todos:ActivityTodo[]}){
 if(!todos.length)return null;
 return <ol className={styles.todos} aria-label="Recorded task progress">{todos.map((todo,index)=><li key={index} data-status={todo.status}>{todo.status==='completed'?<Check size={15} aria-hidden="true"/>:<Square size={15} aria-hidden="true"/>}<span>{todo.content}<small>{stateNames[todo.status]??'Unknown status'} · {todo.priority} priority</small></span></li>)}</ol>;
}
export function AgentActivity({events,nativeMessages=[],active=false,waiting=false,mode,model,evidence=[],todos=[],manifest,status:taskStatus,showFeed=true,compact=false}:{events:TaskEvent[];nativeMessages?:{id:string;text:string;finish:string|null}[];active?:boolean;waiting?:boolean;mode:string;model:string;evidence?:ToolEvidence[];todos?:ActivityTodo[];manifest?:RunManifest;status?:string;showFeed?:boolean;compact?:boolean}){
 const rows=events.filter(known);
 const lifecycle=taskStatus??manifest?.state,ended=['completed','failed','error','cancelled','interrupted','paused_limit','paused_recovery','partial','stale','blocked'].includes(lifecycle??'');
 const isActive=active&&!ended,isWaiting=waiting&&!ended;
 const publicMessages=nativeMessages.filter(row=>isActive||row.finish!=='stop');
 const meaningful=rows.length>0||evidence.length>0||todos.length>0||Boolean(manifest)||Boolean(taskStatus);
 if(!meaningful&&!isActive&&!isWaiting&&!publicMessages.length)return null;
 const live=isActive&&!isWaiting&&lifecycle!=='queued',latest=rows.at(-1),completed=evidence.filter(call=>recordedState(call.status,active).tone==='completed').length,failed=Math.max(evidence.filter(call=>recordedState(call.status,isActive).tone==='failed').length,rows.filter(row=>row.stage==='tool_failed').length);
 const steps=Math.max(evidence.length,rows.filter(row=>row.stage==='tool_completed'||row.stage==='tool_failed').length)||rows.filter(row=>!['model_turn','assistant_update'].includes(row.stage)).length;
 const elapsed=duration(manifest?.elapsedMs),current=latest?.stage==='tool_running'?toolName(latest).replaceAll('_',' '):'';
 const terminal=rows.findLast(row=>['failed','cancelled','interrupted','paused_limit'].includes(row.stage));
 const status=ended?activityStateLabel(lifecycle==='error'?'failed':lifecycle,false,false):isWaiting?'Waiting for your input':lifecycle==='queued'?'Queued':live?(current?`Working · ${current}`:'Working'):activityStateLabel(lifecycle??terminal?.stage,false,false);
 return <div className={styles.activity} data-compact={compact||undefined}>
  {publicMessages.map(row=><div key={row.id} className={styles.publicUpdate}><MessageResponse isAnimating={live&&!row.finish}>{row.text}</MessageResponse></div>)}
  {meaningful?<details className={styles.disclosure}>
   <summary className={styles.summary}>{live?<WorkingIndicator/>:isWaiting?<CircleHelp size={15} aria-hidden="true"/>:<Workflow size={15} aria-hidden="true"/>}<span className={styles.summaryLabel}>{status}</span><span className={styles.summaryMeta}>{steps>0&&`${steps} ${steps===1?'step':'steps'}`}{failed>0&&` · ${failed} failed`}{elapsed&&` · ${elapsed}`}</span><ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary>
   <section className={styles.body} aria-label="Recorded agent activity">
    <header className={styles.heading}><h3>Recorded activity</h3><p>{evidence.length?`${completed} completed tool ${completed===1?'call':'calls'}${failed?` · ${failed} failed`:''}`:'No structured tool calls were recorded.'}</p></header>
    <OpenCodeTodos todos={todos}/>
    {evidence.length>0&&<ol className={styles.tools} aria-label={`Tool calls · ${evidence.length}`}>{evidence.map(call=><RecordedTool key={call.callId} call={call} active={isActive}/>)}</ol>}
    {showFeed&&rows.length>0&&<details className={styles.technical}><summary>Progress updates <ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><ActivityFeed events={events} active={isActive} waiting={isWaiting} compact={compact}/></details>}
    {manifest&&<details className={styles.technical}><summary><span>Main agent</span><span className={styles.state}>{recordedState(manifest.state,isActive).label}</span>{elapsed&&<span className={styles.metric}>{elapsed}</span>}<ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><dl className={styles.facts}><div><dt>Task</dt><dd>{manifest.taskId}</dd></div><div><dt>Session</dt><dd>{manifest.sessionId??'Not recorded'}</dd></div><div><dt>Model</dt><dd>{manifest.model}</dd></div><div><dt>Recorded state</dt><dd>{manifest.state}</dd></div><div><dt>Duration</dt><dd>{elapsed??'Not recorded'}</dd></div><div><dt>Shared metered calls</dt><dd>{manifest.budget?.calls??'Not recorded'}</dd></div><div><dt>Reserved cost</dt><dd>{amount(manifest.budget?.reservedUsd)}</dd></div></dl></details>}
    {Boolean(manifest?.children?.length)&&<details className={styles.technical}><summary><span>Recorded specialists</span><span className={styles.metric}>{manifest!.children.length}</span><ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><ol className={styles.specialists}>{manifest!.children.map(child=><li key={child.sessionId}><details className={styles.technical}><summary><span>{child.role}</span><span className={styles.state}>{recordedState(child.state,isActive).label}</span>{duration(child.elapsedMs)&&<span className={styles.metric}>{duration(child.elapsedMs)}</span>}<ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><dl className={styles.facts}><div><dt>Model</dt><dd>{child.model}</dd></div><div><dt>Session</dt><dd>{child.sessionId}</dd></div><div><dt>Recorded state</dt><dd>{child.state}</dd></div><div><dt>Metered calls</dt><dd>{child.calls}</dd></div><div><dt>Reserved cost</dt><dd>{amount(child.reservedUsd)}</dd></div><div><dt>Reported cost</dt><dd>{child.knownCostCalls?`${amount(child.reportedUsd)}${child.knownCostCalls<child.calls?' · partial':''}`:'Not recorded'}</dd></div></dl>{child.result!==undefined&&<EvidenceBlock label="Result" value={child.result}/>}<p className={styles.note}>Shared task budget · read-only specialist</p></details></li>)}</ol></details>}
    {rows.length>0&&<details className={styles.technical}><summary><span>Recorded events</span><span className={styles.metric}>{rows.length}</span><ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><ol className={styles.events}>{rows.map(event=>{const Icon=stageIcon(event);return <li key={event.eventId??event.index} data-stage={event.stage}><Icon size={14} aria-hidden="true"/><div><p>{safeEventDetail(event)}</p>{event.at&&Number.isFinite(Date.parse(event.at))&&<time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}</div></li>;})}</ol><p className={styles.note}>Recorded runtime activity. Private chain-of-thought is not shown.</p></details>}
    <footer className={styles.footer}><span>{manifest?.mode??mode}</span><details className={styles.runtime}><summary>Runtime details <ChevronDown className={styles.chevron} size={14} aria-hidden="true"/></summary><p>{manifest?.model??model}</p></details></footer>
   </section>
  </details>:<div className={styles.live} role="status" aria-live="polite">{isWaiting?<CircleHelp size={15} aria-hidden="true"/>:<WorkingIndicator/>}<span>{status}</span></div>}
  <PublicResearchEvidence evidence={evidence}/><PdfReviewEvidence evidence={evidence}/><CompanionReviewEvidence evidence={evidence}/>
 </div>;
}


export function WorkingIndicator(){
 return <span className="working-segments" aria-hidden="true">{[0,1,2,3,4,5].map(index=><i key={index} style={{animationDelay:`${index*120}ms`}}/>)}</span>;
}
