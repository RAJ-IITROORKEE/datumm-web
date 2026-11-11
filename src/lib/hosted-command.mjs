/** Match the hosted v2 contract without silently dropping unsupported source data. */
export function hostedCommand(body, command) {
  if (body.attachmentIds != null && (!Array.isArray(body.attachmentIds) || body.attachmentIds.length)) {
    throw new Error('File attachments are available in DATUMM Desktop. Send this web request without them.');
  }
  return {schemaVersion:2,idempotencyKey:body.idempotencyKey,expectedTaskVersion:body.expectedTaskVersion??0,expectedPlanVersion:body.expectedPlanVersion??0,...(body.projectId?{projectId:body.projectId}:{}),command};
}

/** Independent Ask/Plan runs may overlap up to this many per account; the backend stays authoritative. */
const PARALLEL_LIMIT = 3;

export async function postHostedCommand(request, taskId, envelope) {
  if (!taskId) {
    const response = await request('/v2/tasks?active=true');
    if (!response.ok) return response;
    const tasks = await response.json();
    if (!Array.isArray(tasks)) throw new Error('Invalid active task response.');
    const independent = ['ask','plan'].includes(envelope.command?.mode) && envelope.command?.modelContextRequirement !== 'read';
    const valid = task => typeof task?.id === 'string' && /^[a-zA-Z0-9-]{1,128}$/.test(task.id);
    const running = tasks.filter(task => valid(task) && ['queued','running'].includes(task.status));
    // Anything that is not an independent Ask/Plan waits for every active chat.
    const active = independent ? (running.length >= PARALLEL_LIMIT ? running[0] : undefined) : tasks.find(task => valid(task) && (running.includes(task) || task.status === 'awaiting_approval'));
    if (active) {
      const title = typeof active.title === 'string' && active.title ? active.title : 'Untitled chat';
      const state = active.status === 'awaiting_approval' ? 'awaiting approval' : active.status;
      const error = independent ? `You already have ${PARALLEL_LIMIT} chats running. Wait for one to finish, or open “${title}”.` : `Your saved chat “${title}” is ${state}. Review that chat before starting a new one.`;
      return Response.json({detail:{error,blockingTask:{id:active.id,title,status:active.status}}},{status:409});
    }
  }
  // Admission remains authoritative if another request starts after this check.
  return request(taskId ? `/v2/tasks/${encodeURIComponent(taskId)}/commands` : '/v2/tasks',{method:'POST',body:JSON.stringify(envelope)});
}
