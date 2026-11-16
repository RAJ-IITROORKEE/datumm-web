/** A settled response is not evidence that a requested concept was generated. */
export function conversationResult({mode,status,hasConcept,loading=false,current=true}) {
  if (!current || mode !== 'plan' || status !== 'completed') return null;
  return {
    label: 'Response finished',
    note: hasConcept || loading ? null : 'No current drawing is available. Review the result or update your brief.',
    prompts: hasConcept || loading ? null : [
      'Update the project brief using the dimensions and room requirements I provided. Do not change Revit.',
      'Explain what information is still needed to generate a concept.',
    ],
  };
}

/** Only the current empty failed turn can borrow task-level failure information. */
export function failedTurnRecovery({status, answer, current, recoveryAction, hasConcept}) {
  if (!current || status !== 'failed' || answer?.trim() || recoveryAction !== 'review_progress') return null;
  return {
    message: 'The task stopped unexpectedly. Review its last saved step before retrying.',
    hasConcept: Boolean(hasConcept),
  };
}

/** Count only independently verified native batches for an active Build. */
export function nativeBatchProgress(run) {
  if (run?.mode !== 'build' || run?.data?.agent_result?.status !== 'in_progress' ||
      !['running','queued','awaiting_approval'].includes(run.status)) return 0;
  const history = run.data.agent_result.batchHistory;
  if (!Array.isArray(history)) return 0;
  return history.filter(batch => batch && typeof batch.operationId === 'string' && batch.operationId &&
    batch.state === 'verified' && batch.nativeStatus === 'verified').length;
}
