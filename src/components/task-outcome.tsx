import {CheckCircle2, CircleHelp, FileText} from 'lucide-react';
import {workflowState} from '@/lib/workflow-state';
import type {RunManifest,ToolEvidence} from './agent-activity';
import {Button} from './ui/button';

type OutcomeTask={id:string;status:string;mode:string;modelOutcome?:{state:string;verified:boolean};data:Record<string,any>};
export function TaskOutcome({task,onArtifacts}:{task:OutcomeTask;onArtifacts:()=>void}){
 if(['queued','running'].includes(task.status))return null;
 const workflow=workflowState(task),manifest=task.data.run_manifest as RunManifest|undefined;
 const tools=(task.data.orchestration?.evidence??manifest?.tools??[]) as ToolEvidence[];
 const failures=tools.filter(tool=>tool.status==='failed').length;
 const native=task.data.native_build;
 if(!native&&!task.data.design&&!tools.length&&!task.data.agent_inspection&&!task.data.agent_result)return null;
 if((task.data.failure||task.data.design)&&!native)return null;
 const separateNativeFollowup=Boolean(native&&!native.design);
 const verified=workflow.label==='Native receipt verified';
 const title=verified?'Revit result verified':workflow.label==='Turn settled'?'Response prepared':workflow.label;
 const candidate=task.data.design?.candidates?.find((row:any)=>row.fingerprint===task.data.design.selected)??task.data.design?.candidates?.[0];
 return <section className="task-outcome" aria-label="Task outcome"><header>{verified?<CheckCircle2 size={16}/>:<CircleHelp size={16}/>}<strong>{title}</strong></header><p>{workflow.next}</p>{candidate&&separateNativeFollowup&&<p>Saved design excludes this separate native proposal and later native room-name changes.</p>}<div className="outcome-actions"><Button variant="ghost" size="sm" onClick={onArtifacts}><FileText size={14}/>View saved artifacts</Button>{candidate&&<a download={`datumm-design-v${candidate.graph.version}.svg`} href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(candidate.svg)}>{separateNativeFollowup?'Saved design reference SVG':'Plan SVG'} · v{candidate.graph.version}</a>}</div><details><summary>Run details &amp; remaining review</summary><div className="outcome-facts"><span>{tools.filter(tool=>tool.status==='completed').length} recorded tool results in this turn{failures?` · ${failures} failed`:''}</span>{candidate&&<span>Proposed design · v{candidate.graph.version} · {candidate.graph.rooms.length} rooms</span>}{manifest?.elapsedMs!=null&&<span>{(manifest.elapsedMs/1000).toFixed(1)}s elapsed</span>}{manifest?.budget&&<span>${manifest.budget.reservedUsd.toFixed(4)} reserved · {manifest.budget.calls} metered calls</span>}</div>{native?.operationId&&<small>Original operation {native.operationId} · {verified?'recorded read-back verified':'verification unresolved'}</small>}<p>{candidate?'Review architectural assumptions, source alignment, structural design and local regulations. Native execution and verification are recorded separately in the build result.':'Review the answer and recorded evidence for unresolved requirements and incomplete coverage.'}</p><small>Reserved cost is a budget reservation; provider billing may be partial or unavailable. This summary uses saved data and makes no additional model call.</small></details></section>;
}
