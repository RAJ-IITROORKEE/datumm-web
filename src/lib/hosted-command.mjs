/** Match the hosted v2 contract without silently dropping unsupported source data. */
export function hostedCommand(body, command) {
  if (body.projectId != null && body.projectId !== '' || body.attachmentIds != null && (!Array.isArray(body.attachmentIds) || body.attachmentIds.length)) {
    throw new Error('Projects and file attachments are available in DATUMM Desktop. Send this web request without them.');
  }
  return {schemaVersion:2,idempotencyKey:body.idempotencyKey,expectedTaskVersion:body.expectedTaskVersion??0,expectedPlanVersion:body.expectedPlanVersion??0,command};
}

export async function postHostedCommand(request, taskId, envelope) {
  if (!taskId) {
    const response = await request('/v2/tasks?active=true');
    if (!response.ok) return response;
    const tasks = await response.json();
    if (!Array.isArray(tasks)) throw new Error('Invalid active task response.');
    const active = tasks.find(task => typeof task?.id === 'string' && /^[a-zA-Z0-9-]{1,128}$/.test(task.id) && ['queued','running','awaiting_approval'].includes(task.status));
    if (active) {
      const title = typeof active.title === 'string' && active.title ? active.title : 'Untitled chat';
      const state = active.status === 'awaiting_approval' ? 'awaiting approval' : active.status;
      return Response.json({detail:{error:`Your saved chat “${title}” is ${state}. Review that chat before starting a new one.`,blockingTask:{id:active.id,title,status:active.status}}},{status:409});
    }
  }
  // Admission remains authoritative if another request starts after this check.
  return request(taskId ? `/v2/tasks/${encodeURIComponent(taskId)}/commands` : '/v2/tasks',{method:'POST',body:JSON.stringify(envelope)});
}
