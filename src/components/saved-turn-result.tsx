import type {DesignRecord} from './design-review';
import type {ActivityTodo,RunManifest,ToolEvidence} from './agent-activity';
import {TaskOutcome} from './task-outcome';

export type SavedTurn={conversationIndex:number;error?:string|null;result?:{design?:DesignRecord;build?:any;evidence?:ToolEvidence[];manifest?:RunManifest;todos?:ActivityTodo[];failure?:unknown}|null};
export function SavedTurnResult({turn,taskId,onArtifacts}:{turn?:SavedTurn;taskId:string;onArtifacts:()=>void}){
 if(!turn?.result)return null;
 const result=turn.result,candidate=result.design?.candidates.find(row=>row.fingerprint===result.design?.selected)??result.design?.candidates[0];
 const task={id:taskId,status:turn.error?'failed':'completed',mode:result.manifest?.mode??'plan',data:{design:result.design,native_build:result.build,run_manifest:result.manifest,orchestration:{evidence:result.evidence??[]},error:turn.error}};
 return <div className="saved-turn-result" aria-label={`Saved result for message ${turn.conversationIndex+1}`}>{candidate&&<p className="saved-turn-plan plan-card-line">Plan v{candidate.graph.version} · {candidate.graph.rooms.length} rooms · <button type="button" className="artifacts-link" onClick={onArtifacts}>View details</button></p>}<TaskOutcome task={task} onArtifacts={onArtifacts}/></div>;
}
