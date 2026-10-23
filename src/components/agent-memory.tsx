'use client';
import { Button } from '@/components/ui/button';
import styles from './composer-controls.module.css';

export type TaskMemory={schemaVersion:number;version:number;originalGoal:string;answers:unknown[];binding:{documentId?:string;revision?:number};evidence:{id:string;rowsStored:number;coverage:{status:string}}[];unresolvedOperationIds:string[];nextAction:string;compaction?:{count:number;state:string;lastCompletedAt?:string|null;beforeEstimatedTokens?:number|null;afterEstimatedTokens?:number|null}};
export type ContextMetrics={compactedFields:string[]};
export type ContextUsageData={schemaVersion:number;rootTaskId:string;updatedAt:string;context:{modelId?:string|null;modelCapacityTokens:number|null;estimatedInputTokens:number|null;reservedOutputTokens:number|null;estimatedWindowUtilization:number|null;projectedWindowUtilization:number|null;estimateMethod:string|null;applicationPressure:string;measurementState:string;lastProviderCallState?:string;lastProviderInputTokens?:number|null;lastProviderOutputTokens?:number|null;lastProviderReportedUsd?:string|null};cumulative:{inputTokens:number|null;outputTokens:number|null;reasoningTokens:number|null;providerReportedUsd:string|null;usageCoverage:string;providerCostCoverage:string;modelCalls:number;callsWithUnknownUsage:number};compaction:{count:number;state:string;lastCompletedAt:string|null;beforeEstimatedTokens:number|null;afterEstimatedTokens:number|null}};

const countLabel=(value:number|null)=>value===null?'Unavailable':new Intl.NumberFormat().format(value);
const percent=(value:number|null)=>typeof value!=='number'||!Number.isFinite(value)||value<0?null:Math.round(value*1000)/10;

export function ContextUsage({usage,busy=false}:{usage?:ContextUsageData;busy?:boolean}){
 if(!usage)return <section className={`context-usage ${styles.contextUsageCompact}`} aria-label="Context and token usage"><div className="context-usage-heading"><span>Context used</span><span>Unavailable</span></div><p className={styles.contextUnavailable}>{busy?'Preparing the next model request.':'This task has no compatible usage record yet.'}</p></section>;
 const current=percent(usage.context.estimatedWindowUtilization);
 const projected=percent(usage.context.projectedWindowUtilization);
 const inputKnown=usage.cumulative.inputTokens!==null;
 const outputKnown=usage.cumulative.outputTokens!==null;
 const hasUsage=inputKnown||outputKnown;
 const compacted=usage.compaction.count>0;
 const measured=usage.context.measurementState==='measured'||usage.context.lastProviderCallState==='reported'&&typeof usage.context.lastProviderInputTokens==='number'&&Number.isFinite(usage.context.lastProviderInputTokens);
 const updated=new Date(usage.updatedAt);
 return <section className={`context-usage ${styles.contextUsageCompact}`} aria-label="Context and token usage">
  <div className="context-usage-heading"><span>Context used</span><span>{current===null?'Unavailable':`${Math.round(Math.min(100,current))} / 100`}</span></div>
  {current!==null?<div className={`context-usage-track ${styles.contextTrack}`} role="progressbar" aria-label={`${measured?'Reported':'Estimated'} input context window used`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,current)} aria-valuetext={`${current.toFixed(1)}% of ${usage.context.modelId??'the selected model'} context window; latest main request, ${measured?'provider reported':'estimated'} input.`}><span style={{width:`${Math.min(100,current)}%`}}/></div>:<p className={styles.contextUnavailable}>Context estimate unavailable for this model.</p>}
  {usage.context.applicationPressure==='compact_before_next_step'?<p className="context-usage-notice" role="status">Context will be compacted before the next step.</p>:null}
  <details className={styles.contextDetails}><summary>Usage details</summary><dl>
   {usage.context.modelId?.startsWith('test/')?<><dt>Model type</dt><dd>Test model · scripted usage</dd></>:null}
   <dt>Latest main request</dt><dd>{countLabel(usage.context.estimatedInputTokens)} input tokens · {measured?'provider reported':'estimated'}</dd>
   <dt>Usage updated</dt><dd>{Number.isFinite(updated.getTime())?<time dateTime={usage.updatedAt}>{updated.toLocaleString()}</time>:'Unavailable'}</dd>
   <dt>Model capacity</dt><dd>{countLabel(usage.context.modelCapacityTokens)} tokens</dd>
   <dt>Planned output</dt><dd>{countLabel(usage.context.reservedOutputTokens)} tokens</dd>
   <dt>Projected window</dt><dd>{projected===null?'Unavailable':`~${projected.toFixed(1)}%`}</dd>
   <dt>Total provider usage</dt><dd>{hasUsage?`${countLabel(usage.cumulative.inputTokens)} in · ${countLabel(usage.cumulative.outputTokens)} out${usage.cumulative.usageCoverage==='partial'?' · partial known total':''}`:'Unavailable'}</dd>
   <dt>Provider usage coverage</dt><dd>{usage.cumulative.usageCoverage}</dd>
   <dt>Last provider call</dt><dd>{usage.context.lastProviderCallState??'unavailable'}</dd>
   <dt>Last call input / output</dt><dd>{countLabel(usage.context.lastProviderInputTokens??null)} / {countLabel(usage.context.lastProviderOutputTokens??null)}</dd>
   <dt>Last call reported cost</dt><dd>{usage.context.lastProviderReportedUsd===undefined||usage.context.lastProviderReportedUsd===null?'Unavailable':`$${Number(usage.context.lastProviderReportedUsd).toFixed(6)}`}</dd>
   <dt>Provider reported cost</dt><dd>{usage.cumulative.providerReportedUsd===null?'Unavailable':`$${Number(usage.cumulative.providerReportedUsd).toFixed(6)}${usage.cumulative.providerCostCoverage==='partial'?' · partial':''}`}</dd>
   <dt>Model calls</dt><dd>{usage.cumulative.modelCalls}</dd>
   <dt>Reasoning tokens</dt><dd>{countLabel(usage.cumulative.reasoningTokens)}</dd>
   <dt>OpenCode compaction</dt><dd>{usage.compaction.state==='compacting'?'compressing…':compacted?`${usage.compaction.count} ${usage.compaction.count===1?'summary':'summaries'}`:usage.compaction.state==='automatic'?'automatic':'not recorded'}</dd>
   <dt>Compaction</dt><dd>{usage.compaction.state}{compacted&&usage.compaction.lastCompletedAt?` · ${new Date(usage.compaction.lastCompletedAt).toLocaleString()}`:''}</dd>
   {compacted?<><dt>Before / after</dt><dd>{countLabel(usage.compaction.beforeEstimatedTokens)} / {countLabel(usage.compaction.afterEstimatedTokens)} estimated tokens</dd></>:null}
  </dl><p>The meter shows the latest main request, not cumulative token totals. Low use is normal; compaction and shorter requests can reduce it.</p>{usage.context.modelId?.startsWith('test/')?<p>Synthetic test model; these readings do not represent a live provider model.</p>:null}{usage.context.estimateMethod?<small>{usage.context.estimateMethod} · estimates are approximate</small>:null}</details>
 </section>;
}

export function AgentMemory({memory,metrics,runId}:{memory:TaskMemory;metrics?:ContextMetrics;runId:string}){
 return <details className="saved-plan-card" aria-label="Task memory"><summary>Task handoff · version {memory.version}</summary>
  <p>{memory.originalGoal}</p><p>{memory.answers.length} saved answer groups · {memory.evidence.length} evidence pages</p>
  <small>Document {memory.binding.documentId?.slice(0,8)??'not connected'} · Revision {memory.binding.revision??'—'}</small>
  <p>Next: {memory.nextAction.replaceAll('_',' ')}</p>
  {memory.unresolvedOperationIds.length>0&&<p role="status">Check {memory.unresolvedOperationIds.length} original native operation(s) before continuing.</p>}
  {memory.compaction?.count?<p>Context compacted {memory.compaction.count} {memory.compaction.count===1?'time':'times'}; exact decisions and native-operation records remain authoritative.</p>:null}
  {metrics?.compactedFields.length?<p>Some advisory context was compacted to keep this task responsive. Exact goals, answers, plans, evidence and native-operation records remain stored separately.</p>:null}
  <a href={`/api/service/runs/${runId}/export/handoff`} download>Download task handoff (.md)</a>
 </details>;
}

export function AgentLimit({runId,canContinue,hasOperation,pending,findings,onContinue,onRecover}:{runId:string;canContinue:boolean;hasOperation:boolean;pending:boolean;findings:string[];onContinue:()=>void;onRecover:()=>void}){
 return <div className="saved-plan-card analysis-checkpoint" role="status" aria-label="Analysis checkpoint"><div className="section-caption">ANALYSIS CHECKPOINT <span>Progress saved</span></div><strong>Review what DATUMM found</strong>
  {findings.length>0?<ul>{findings.map((finding,index)=><li key={index}>{finding}</li>)}</ul>:<p>{canContinue?'Your goal and inspected evidence are saved. The remaining analysis can continue from this checkpoint.':hasOperation?'The task paused after a Revit operation. Check its original status before starting another model change.':'This task reached its shared run allowance. Review saved evidence before starting a focused follow-up.'}</p>}
  {hasOperation?<p>Check the original Revit operation before starting another model change.</p>:null}
  <div className="plan-actions">{canContinue?<Button disabled={pending} onClick={onContinue}>Continue analysis</Button>:hasOperation?<Button disabled={pending} onClick={onRecover}>Check original operation</Button>:<span>Review the saved handoff before starting a focused follow-up.</span>}<a href={`/api/service/runs/${runId}/export/handoff`} download>Download findings</a></div>
  {canContinue?<small>DATUMM carries saved decisions and the remaining-step cursor into one linked continuation. Usage limits stay shared; native evidence is refreshed and approvals are never inherited.</small>:null}
 </div>;
}
