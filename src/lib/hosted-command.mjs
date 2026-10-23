/** Match the hosted v2 contract without silently dropping unsupported source data. */
export function hostedCommand(body, command) {
  if (body.projectId != null && body.projectId !== '' || body.attachmentIds != null && (!Array.isArray(body.attachmentIds) || body.attachmentIds.length)) {
    throw new Error('Projects and file attachments are available in DATUMM Desktop. Send this web request without them.');
  }
  return {schemaVersion:2,idempotencyKey:body.idempotencyKey,expectedTaskVersion:body.expectedTaskVersion??0,expectedPlanVersion:body.expectedPlanVersion??0,command};
}
