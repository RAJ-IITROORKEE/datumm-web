'use client';
import { Button } from '@/components/ui/button';
import styles from './composer-controls.module.css';

export type TaskMemory={schemaVersion:number;version:number;originalGoal:string;answers:unknown[];binding:{documentId?:string;revision?:number};evidence:{id:string;rowsStored:number;coverage:{status:string}}[];unresolvedOperationIds:string[];nextAction:string;compaction?:{count:number;state:string;lastCompletedAt?:string|null;beforeEstimatedTokens?:number|null;afterEstimatedTokens?:number|null}};
export type ContextMetrics={compactedFields:string[]};
export type ContextUsageData={schemaVersion:number;rootTaskId:string;scope?:'execution_ledger';ownerTaskId?:string;ledgerExecutionId?:string;ledgerShared?:boolean;updatedAt:string;context:{modelId?:string|null;modelCapacityTokens:number|null;estimatedInputTokens:number|null;reservedOutputTokens:number|null;estimatedWindowUtilization:number|null;projectedWindowUtilization:number|null;estimateMethod:string|null;applicationPressure:string;measurementState:string;lastProviderCallState?:string;lastProviderInputTokens?:number|null;lastProviderOutputTokens?:number|null;lastProviderReportedUsd?:string|null};cumulative:{inputTokens:number|null;outputTokens:number|null;reasoningTokens:number|null;providerReportedUsd:string|null;usageCoverage:string;providerCostCoverage:string;modelCalls:number;callsWithUnknownUsage:number};compaction:{count:number;state:string;lastCompletedAt:string|null;beforeEstimatedTokens:number|null;afterEstimatedTokens:number|null}};
export type NativeUsageData={schemaVersion:1;taskId:string;sessionId:string;scope:'root_session';messageId:string;updatedAt:string;providerId:string;modelId:string;tokens:{input:number;output:number;reasoning:number;cache:{read:number;write:number}};contextTokens:number;contextCapacityTokens:number|null;contextPercent:number|null};

const countLabel=(value:number|null)=>value===null?'Unavailable':new Intl.NumberFormat().format(value);
const percent=(value:number|null)=>typeof value!=='number'||!Number.isFinite(value)||value<0?null:Math.round(value*1000)/10;

export function ContextUsage({usage,nativeUsage,busy=false,compact=false}:{usage?:ContextUsageData;nativeUsage?:NativeUsageData;busy?:boolean;compact?:boolean}){
 if(nativeUsage){const t=nativeUsage.tokens;return <section className={`context-usage ${styles.contextUsageCompact}`} aria-label="Context and token usage">
  <div className="context-usage-heading"><span>OpenCode context · root session</span><span>{nativeUsage.contextPercent===null?'Unavailable':`${nativeUsage.contextPercent}%`}</span></div>
  {nativeUsage.contextPercent!==null&&<div className={`context-usage-track ${styles.contextTrack}`} role="progressbar" aria-label="OpenCode context used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,nativeUsage.contextPercent)} aria-valuetext={`${nativeUsage.contextPercent}% of model context capacity`}><span style={{width:`${Math.min(100,nativeUsage.contextPercent)}%`}} /></div>}
  <p className={styles.contextUnavailable}>{countLabel(nativeUsage.contextTokens)} / {countLabel(nativeUsage.contextCapacityTokens)} tokens · latest qualifying assistant message{compact?' · child sessions excluded':''}{busy?' · snapshot may change while the task runs':''}</p>
  {!compact && <p className={styles.contextUnavailable}>Input {countLabel(t.input)} · output {countLabel(t.output)} · reasoning {countLabel(t.reasoning)} · cache read {countLabel(t.cache.read)} · cache write {countLabel(t.cache.write)}</p>}
  {!compact && <p className={styles.contextUnavailable}>Message created: <time dateTime={nativeUsage.updatedAt}>{new Date(nativeUsage.updatedAt).toLocaleString()}</time>. Child sessions are not included.</p>}
  {compact && <details className={styles.contextDetails}><summary>Usage details</summary><p>Input {countLabel(t.input)} · output {countLabel(t.output)} · reasoning {countLabel(t.reasoning)} · cache read {countLabel(t.cache.read)} · cache write {countLabel(t.cache.write)}</p><p>Message created: <time dateTime={nativeUsage.updatedAt}>{new Date(nativeUsage.updatedAt).toLocaleString()}</time>. Child sessions are not included.</p></details>}
  {usage && compact && <p className={styles.contextUnavailable}>{usage.scope==='execution_ledger'?(usage.ledgerShared?'Shared execution ledger total':'Execution ledger total'):'Recorded provider total · scope not specified'}{usage.cumulative.usageCoverage==='partial'?' · partial':''}: {countLabel(usage.cumulative.inputTokens)} input · {countLabel(usage.cumulative.outputTokens)} output</p>}
  {usage&&<details className={styles.contextDetails}><summary>Provider usage</summary><p>{usage.scope==='execution_ledger'?(usage.ledgerShared?'Shared execution ledger total':'Execution ledger total'):'Recorded provider total · scope not specified'}{usage.cumulative.usageCoverage==='partial'?' · partial':''}: {countLabel(usage.cumulative.inputTokens)} input · {countLabel(usage.cumulative.outputTokens)} output · {countLabel(usage.cumulative.reasoningTokens)} reasoning tokens. Provider telemetry; separate from the OpenCode context reading.</p></details>}
 </section>;}
 if(!usage)return <section className={`context-usage ${styles.contextUsageCompact}`} aria-label="Context and token usage"><div className="context-usage-heading"><span>Context and tokens</span><span>Unavailable</span></div><p className={styles.contextUnavailable}>{busy?'Preparing the next model request.':'Verified usage is not available for this task.'}</p></section>;
 const current=percent(usage.context.estimatedWindowUtilization);
 const projected=percent(usage.context.projectedWindowUtilization);
 const inputKnown=usage.cumulative.inputTokens!==null;
 const outputKnown=usage.cumulative.outputTokens!==null;
 const hasUsage=inputKnown||outputKnown;
 const compacted=usage.compaction.count>0;
 const notReduced=usage.compaction.state==='not_reduced';
 // The window uses estimatedInputTokens, even when the provider also reported a different input count.
 const measured=false;
 const updated=new Date(usage.updatedAt);
 return <section className={`context-usage ${styles.contextUsageCompact}`} aria-label="Context and token usage">
  <div className="context-usage-heading"><span>Estimated input · latest main request</span><span>{current===null?'Unavailable':`${current.toFixed(1)}%`}</span></div>
  {current!==null?<div className={`context-usage-track ${styles.contextTrack}`} role="progressbar" aria-label={`${measured?'Reported':'Estimated'} input context window used`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,current)} aria-valuetext={`${current.toFixed(1)}% of ${usage.context.modelId??'the selected model'} context window; latest main request, ${measured?'provider reported':'estimated'} input.`}><span style={{width:`${Math.min(100,current)}%`}}/></div>:<p className={styles.contextUnavailable}>Context estimate unavailable for this model.</p>}
  {usage.context.applicationPressure==='compact_before_next_step'?<p className="context-usage-notice" role="status">{notReduced?'Context is near the application limit; exact context is retained.':'Context will be compacted before the next step.'}</p>:null}
  {!compact && <p className={styles.contextUnavailable}>{measured?'Provider reported':'Estimated'} input as a share of model capacity. OpenCode's native context reading is not available in this record.</p>}
  <p className={styles.contextUnavailable}>{usage.scope==='execution_ledger'?(usage.ledgerShared?'Shared execution ledger total':'Execution ledger total'):'Provider total · scope not specified'}{usage.cumulative.usageCoverage==='partial'?' · partial':''}: {hasUsage?`${countLabel(usage.cumulative.inputTokens)} input · ${countLabel(usage.cumulative.outputTokens)} output`:'Unavailable'}{busy?' · Snapshot may change while the task runs.':''}</p>
  {!compact && <p className={styles.contextUnavailable}>Updated: {Number.isFinite(updated.getTime())?<time dateTime={usage.updatedAt}>{updated.toLocaleString()}</time>:'Unavailable'}</p>}
  <details className={styles.contextDetails}><summary>Usage details</summary>{compact && <p>Estimated input as a share of model capacity. OpenCode's native context reading is not available in this record.</p>}<dl>
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
   <dt>Reasoning tokens</dt><dd>{countLabel(usage.cumulative.reasoningTokens)} · coverage not specified</dd>
   <dt>Context compaction</dt><dd>{usage.compaction.state==='compacting'?'compressing…':compacted?`${usage.compaction.count} ${usage.compaction.count===1?'summary':'summaries'}`:notReduced?'Exact context retained':usage.compaction.state==='automatic'?'automatic':'not recorded'}</dd>
   <dt>Latest compaction attempt</dt><dd>{notReduced?'No safe reduction':usage.compaction.state}</dd>
   {compacted&&usage.compaction.lastCompletedAt?<><dt>Last successful compaction</dt><dd>{new Date(usage.compaction.lastCompletedAt).toLocaleString()}</dd></>:null}
   {compacted||notReduced?<><dt>{notReduced?'Input / proposed input':'Before / after'}</dt><dd>{countLabel(usage.compaction.beforeEstimatedTokens)} / {countLabel(usage.compaction.afterEstimatedTokens)} estimated tokens</dd></>:null}
  </dl>{notReduced?<p>No safe reduction was available. Exact context was retained; this attempt saved no tokens.</p>:null}<p>The meter shows the latest main request, not cumulative token totals. Low use is normal; compaction and shorter requests can reduce it.</p>{usage.context.modelId?.startsWith('test/')?<p>Synthetic test model; these readings do not represent a live provider model.</p>:null}{usage.context.estimateMethod?<small>{usage.context.estimateMethod} · estimates are approximate</small>:null}</details>
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
 const text=hasOperation?'Paused after a Revit operation. Check its original status before another model change.':canContinue?'Run allowance reached. Progress is saved.':'Run allowance reached. Review the saved handoff before a focused follow-up.';
 return <div className="analysis-checkpoint-line" role="status" aria-label="Analysis checkpoint" title={findings.join('; ')||undefined}><span>{text}</span>
  {canContinue?<Button size="sm" disabled={pending} onClick={onContinue}>Continue analysis</Button>:hasOperation?<Button size="sm" disabled={pending} onClick={onRecover}>Check original operation</Button>:null}
  <a href={`/api/service/runs/${runId}/export/handoff`} download>Download findings</a></div>;
}
