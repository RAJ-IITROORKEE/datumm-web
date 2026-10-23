type Ref={planId:string;version:number;fingerprint:string};
type BuildState={mode:string;status:string;currentPlanRef?:Ref|null;acceptance?:{plan:Ref}|null;modelOutcome?:{state:string};data:{variable_selection?:unknown;operation_id?:string;proposal?:unknown;compiled?:unknown;native_operations?:unknown;receipt?:unknown;agent_result?:unknown}};

// A saved Build intent must have a visible next step, while uncertain or existing
// native work must never be offered a second preparation.
export function planBuildStep(run:BuildState|null,drawing:Ref|null,placementConfirmed:boolean){
 if(!run||run.mode!=='build'||!run.currentPlanRef)return null;
 const preDispatchFailure=run.status==='failed'&&!['native_operations','operation_id','receipt','proposal','agent_result'].some(key=>Boolean(run.data[key as keyof typeof run.data]));
 if((run.status==='failed'&&!preDispatchFailure)||(!preDispatchFailure&&(run.data.variable_selection||run.data.compiled))||run.data.operation_id||run.data.proposal||
    ['queued','running','awaiting_approval','reconciling'].includes(run.status)||
    ['unknown','committed_unverified','committed_verified'].includes(run.modelOutcome?.state??''))return null;
 const ref=run.currentPlanRef;
 const matches=(other?:Ref|null)=>Boolean(other&&other.planId===ref.planId&&other.version===ref.version&&other.fingerprint===ref.fingerprint);
 if(!matches(drawing))return 'drawing';
 if(!matches(run.acceptance?.plan))return 'accept';
 return placementConfirmed?'prepare':'placement';
}
