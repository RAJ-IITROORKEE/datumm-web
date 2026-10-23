export type DraftAssessment = {
  goalStatus: 'in_progress' | 'review_required' | 'blocked' | 'machine_criteria_satisfied' | 'criteria_unmet' | 'criteria_unavailable';
  nativeStatus: 'verified' | 'committed_unverified' | 'unknown';
  checks: {key:string;kind:string;elementId:string|null;status:'verified'|'unverified';issue?:string;batchIndex?:number}[];
  criteria: {text:string;status:'review_required'}[];
  machineCriteria?: {key:string;sourceText:string;metric:'created_count'|'final_count';category:string;comparison:'eq'|'gte'|'lte';target:number;measured:number|null;status:'verified'|'unmet'|'unavailable';evidenceSource:string|null}[];
  planProgress?: {plannedBatches:number;verifiedBatches:number;remainingBatches:number};
  issue?: string | null;
  nextAction: 'review_result' | 'reconcile_original_operation' | 'review_unmet_criteria' | 'continue_plan';
};

export type NativeBatch = {
  operationId:string;
  state:string;
  counts:Record<string,number>;
  nativeStatus:string;
  checks:DraftAssessment['checks'];
};

export function DraftAssessmentDetails({assessment,batchHistory=[]}:{assessment:DraftAssessment;batchHistory?:NativeBatch[]}) {
  return <div aria-label="Goal assessment">
    <p>{assessment.goalStatus==='blocked'
      ? 'Goal verification is incomplete. Check the original operation before any correction.'
      : assessment.planProgress?.remainingBatches
      ? `${assessment.planProgress.verifiedBatches} of ${assessment.planProgress.plannedBatches} planned native batches verified. The remaining drafting work is still open.`
      : assessment.goalStatus==='criteria_unmet'
      ? 'The exact model changes passed read-back, but one or more explicit numeric goal checks did not pass.'
      : assessment.goalStatus==='criteria_unavailable'
      ? 'The exact model changes passed read-back, but current evidence was not sufficient to evaluate every numeric goal check.'
      : assessment.goalStatus==='machine_criteria_satisfied'
      ? 'The exact model changes and explicit numeric goal checks passed. Subjective design criteria remain available for your review.'
      : 'The exact model changes passed verification. The requested design criteria still need your review.'}</p>
    {!!assessment.machineCriteria?.length&&<details><summary>Numeric goal checks · {assessment.machineCriteria.filter(check=>check.status==='verified').length}/{assessment.machineCriteria.length} passed</summary>
      <ul>{assessment.machineCriteria.map(check=><li key={check.key}>
        <strong>{check.key.replaceAll('_',' ')}</strong> · {check.status==='verified'?'Passed':check.status==='unmet'?'Not met':'Evidence unavailable'}
        <small> · expected {check.comparison==='eq'?'':check.comparison==='gte'?'at least ':'at most '}{check.target} {check.category}</small>
        <small> · measured {check.measured===null?'unavailable':`${check.measured} ${check.category}`}</small>
        <small> · requested: “{check.sourceText}”</small>
        {check.evidenceSource&&<small> · evidence: {check.evidenceSource==='verified_native_operation_journal'?'verified Revit changes':'current Revit inventory'}</small>}
      </li>)}</ul>
    </details>}
    <details><summary>Native checks · {assessment.checks.filter(check=>check.status==='verified').length}/{assessment.checks.length} verified</summary>
      <ul>{assessment.checks.map(check=><li key={`${check.batchIndex??1}:${check.key}`}>
        <strong>{check.key.replaceAll('_',' ')}</strong> · {check.batchIndex?`Batch ${check.batchIndex} · `:''}{check.kind.replaceAll('_',' ')} · {check.status==='verified'?'Verified':'Unverified'}
        {check.elementId&&<small> · Element {check.elementId}</small>}
        {check.issue&&<small> · {check.issue}</small>}
      </li>)}</ul>
    </details>
    {batchHistory.length>1&&<details><summary>Native batch history · {batchHistory.length} batches</summary>
      <ol>{batchHistory.map(batch=><li key={batch.operationId}>
        <strong>Operation {batch.operationId.slice(0,8)}</strong> · {batch.nativeStatus.replaceAll('_',' ')}
        <small> · {Object.entries(batch.counts).map(([kind,count])=>`${count} ${kind}`).join(', ')}</small>
        <small> · {batch.checks.filter(check=>check.status==='verified').length}/{batch.checks.length} checks verified</small>
      </li>)}</ol>
    </details>}
    {assessment.issue&&<p>{assessment.issue}</p>}
  </div>;
}
