import type {DesignRecord} from './design-review';
import type {ActivityTodo,RunManifest,ToolEvidence} from './agent-activity';
import {TaskOutcome} from './task-outcome';

export type SavedTurn={conversationIndex:number;error?:string|null;result?:{design?:DesignRecord;build?:any;evidence?:ToolEvidence[];manifest?:RunManifest;todos?:ActivityTodo[];failure?:unknown}|null};
export function SavedTurnResult({turn,taskId,onArtifacts}:{turn?:SavedTurn;taskId:string;onArtifacts:()=>void}){
 if(!turn?.result)return null;
 const result=turn.result,candidate=result.design?.candidates.find(row=>row.fingerprint===result.design?.selected)??result.design?.candidates[0];
 const task={id:taskId,status:turn.error?'failed':'completed',mode:result.manifest?.mode??'plan',data:{design:result.design,native_build:result.build,run_manifest:result.manifest,orchestration:{evidence:result.evidence??[]},error:turn.error}};
 return <div className="saved-turn-result" aria-label={`Saved result for message ${turn.conversationIndex+1}`}>{candidate&&<details className="saved-turn-plan"><summary>Proposed plan · version {candidate.graph.version} · {candidate.graph.rooms.length} rooms</summary><img src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(candidate.svg)} alt={`Saved proposed plan version ${candidate.graph.version}`}/><a download={`datumm-design-v${candidate.graph.version}.svg`} href={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(candidate.svg)}>Download this version</a><small>Historical proposal. Current acceptance and native review remain separate.</small></details>}<TaskOutcome task={task} onArtifacts={onArtifacts}/></div>;
}
