'use client';

import {useState} from 'react';
import {TurnProcess} from '../workspace/turn-process';
import {ActivityPanel} from '../workspace/activity-panel';
import {latestTaskActivity,type RunManifest,type ToolEvidence} from '../agent-activity';
import type {Run} from '../workspace/use-workspace-state';
import type {TaskEvent} from '@/lib/task-projection';
import styles from './activity-preview.module.css';

const scenarios=[['running','Running'],['queued','Queued'],['needs_input','Needs input'],['awaiting_approval','Waiting for approval'],['failed','Failed'],['cancelled','Stopped'],['completed','Completed'],['unconfirmed','Unconfirmed tool'],['empty','No records'],['foreign','Wrong-task records']] as const;
const eventDetail=(event:TaskEvent)=>event.detail;

/** Development-only actual component fixtures. Nothing starts a task or touches Revit. */
export function ActivityPreview({onClose}:{onClose:()=>void}) {
  const [scenario,setScenario]=useState<string>('running'),[task,setTask]=useState(1),[updates,setUpdates]=useState(0),[pane,setPane]=useState('chat');
  const id=`synthetic-activity-${task}`;
  const active=scenario==='running'||scenario==='queued';
  const waiting=scenario==='needs_input';
  const status=['empty','foreign','unconfirmed'].includes(scenario)?'completed':scenario;
  const noRecords=scenario==='empty';
  const foreign=scenario==='foreign';
  const sourceTask=foreign?'synthetic-other-task':id;
  const at=(seconds:number)=>new Date(Date.parse('2026-11-12T09:00:00Z')+seconds*1000).toISOString();
  const event=(index:number,stage:string,detail:string):TaskEvent=>({eventId:`${id}-${index}`,taskId:sourceTask,index,stage,detail,at:at(index*2)});
  const events:TaskEvent[]=noRecords?[]:scenario==='queued'?[event(0,'queued','Review the room schedule')]:[
    event(0,'queued','Review the room schedule'),
    event(1,'model_turn','Internal model text must never appear in this activity UI · step 1'),
    event(2,'tool_running','Calling read_room_schedule'),
    ...(scenario==='unconfirmed'?[]:[event(3,'tool_completed','read_room_schedule returned retained room records')]),
    ...(scenario==='queued'?[]:[event(4,'tool_running','Calling check_room_names')]),
    ...(scenario==='failed'?[event(5,'tool_failed','check_room_names could not read the saved source')]:scenario==='completed'?[event(5,'tool_completed','check_room_names finished')]:[]),
    ...Array.from({length:updates},(_,i)=>event(6+i,'assistant_update',`Checked saved schedule section ${i+1}.`)),
    ...(!active&&!['empty','foreign','unconfirmed'].includes(scenario)?[event(20,status,status==='completed'?'Answer saved; no native model change was requested.':status==='awaiting_approval'?'Review the exact proposal in chat.':status==='needs_input'?'Which level should be included?':status==='cancelled'?'The task was stopped.':'Source read failed; review the retained evidence.')]:[]),
  ];
  const evidence:ToolEvidence[]=noRecords||scenario==='queued'?[]:[
    {callId:`${id}-rooms`,tool:'read_room_schedule',role:'lead',status:scenario==='unconfirmed'?'running':'completed',arguments:{documentId:'synthetic-model',level:'Level 1'},...(scenario==='unconfirmed'?{}:{result:{rooms:3,confirmed:false,missing:0},elapsedMs:1200})},
    ...(scenario==='queued'?[]:[{callId:`${id}-names`,tool:'check_room_names',role:'lead',status:scenario==='failed'?'failed':scenario==='completed'?'completed':scenario==='cancelled'?'cancelled':'running',arguments:{source:'saved report',label:'Zoë 李'},...(scenario==='failed'?{result:{error:'Synthetic source is unavailable.'},elapsedMs:400}:scenario==='completed'?{result:false,elapsedMs:800}:{})}]),
  ];
  const manifest:RunManifest|undefined=noRecords?undefined:{taskId:sourceTask,model:'Synthetic model',mode:'ask',state:status,tools:evidence,children:[],...(active?{}:{elapsedMs:(events.at(-1)?.index??0)*2000})};
  const run={id,title:`Review room schedule · fixture ${task}`,mode:'ask',model:'Synthetic model',status,events,conversation:[{prompt:'Check the retained room schedule.'}],data:{run_manifest:manifest,opencode_todos:noRecords?[]:[{content:'Review supplied room names',status:scenario==='completed'?'completed':active?'in_progress':'pending',priority:'normal'}],...(waiting?{agent_question:{questionId:'synthetic-question'}}:{})}} as unknown as Run;
  const currentActivity=latestTaskActivity(run,events);
  return <section className={styles.root}>
    <header className={styles.header}>
      <div><h1>Agent activity preview</h1><p>Synthetic records · no agent run, device access or Revit operation</p></div>
      <button onClick={onClose}>Close activity preview</button>
    </header>
    <div className={styles.controls}>
      <label>Activity scenario<select value={scenario} onChange={e=>{setScenario(e.target.value);setUpdates(0);}}>{scenarios.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></label>
      <button onClick={()=>setUpdates(value=>value+1)} disabled={noRecords||foreign}>Append public update</button>
      <button onClick={()=>{setTask(value=>value+1);setUpdates(0);}}>Switch fixture task</button>
      <span>Fixture {task} · {updates} appended updates</span>
    </div>
    <nav className={styles.panes} aria-label="Activity preview pane"><button aria-pressed={pane==='chat'} onClick={()=>setPane('chat')}>Chat activity</button><button aria-pressed={pane==='inspector'} onClick={()=>setPane('inspector')}>Activity inspector</button></nav>
    <div className={styles.columns}>
      <section className={styles.chat} data-visible={pane==='chat'} aria-label="Synthetic chat activity">
        <h2>Chat activity</h2><p className={styles.prompt}>Check the retained room schedule.</p>
        {foreign?<p>Wrong-task evidence is tested in the inspector. No foreign record is mounted in this chat.</p>:<TurnProcess key={id} events={events} active={active} waiting={waiting} status={status} manifest={manifest} evidence={evidence}/>}
        {scenario==='awaiting_approval'&&<p className={styles.notice}>The real exact-proposal approval panel remains in chat. This preview grants no approval.</p>}
        {scenario==='completed'&&<p>The retained schedule has been reviewed. This fixture does not measure or modify a model.</p>}
      </section>
      <section className={styles.inspector} data-visible={pane==='inspector'} aria-label="Synthetic activity inspector">
        <ActivityPanel key={id} run={run} runId={id} currentActivity={currentActivity} executing={active} desktopAvailable={false} mode="ask" model="Synthetic model" eventDetail={eventDetail}/>
      </section>
    </div>
  </section>;
}
