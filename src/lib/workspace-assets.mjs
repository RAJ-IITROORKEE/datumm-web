import { drawingTitle } from './drawing-presentation.mjs';

/** Project only data already owned by the selected workspace. No loading or mutation. */
export function projectWorkspaceAssets(input) {
  const { scope } = input;
  const rows = [];
  const saved = bound => Boolean(scope.taskId && input.snapshotTaskId === scope.taskId && bound && bound.accountKey === scope.accountKey && bound.taskId === scope.taskId);
  const attachmentMatches = value => value.task == null || value.task === scope.taskId;
  const samePlan = (a, b) => a?.planId === b?.planId && a?.version === b?.version && a?.fingerprint === b?.fingerprint;
  const loaded = saved(input.loadedDrawing) ? input.loadedDrawing.value : null;
  const unavailable = reason => ({ kind: 'unavailable', reason });
  const add = (kind, identity, title, provenance, metadata, destination, extra = {}) => {
    const id = JSON.stringify([scope.accountKey, scope.taskId ?? scope.sourceKey, kind, identity]);
    const existing = rows.find(row => row.id === id);
    if (existing) {
      for (const [key, value] of Object.entries(metadata)) if (existing.metadata[key] == null) existing.metadata[key] = value;
      return existing;
    }
    const row = { id, scope, kind, title, provenance, metadata, destination, ...extra };
    rows.push(row);
    return row;
  };
  const metadata = source => Object.fromEntries(['name', 'mime', 'bytes', 'page', 'sha256'].filter(key => source[key] != null).map(key => [key, source[key]]));
  const drawings = [];
  for (const bound of input.drawings) {
    if (!saved(bound)) continue;
    const value = bound.value, existing = drawings.find(item => samePlan(item.plan, value.plan));
    if (existing) { existing.current ||= value.current; existing.briefId ??= value.briefId; }
    else drawings.push({ ...value });
  }
  if (loaded && !drawings.some(item => samePlan(item.plan, loaded))) drawings.push({ plan: loaded, current: false });
  // Name concepts before sorting by current selection so selecting an alternative cannot rename it.
  const candidates = drawings.filter(item => item.briefId).map(item => item.plan);
  const currentPlan = drawings.find(item => item.current)?.plan;
  for (const drawing of [...drawings.filter(item => item.current), ...drawings.filter(item => !item.current)]) {
    const { plan } = drawing;
    add('saved-drawing', [plan.planId, plan.version, plan.fingerprint], drawingTitle(plan, candidates), drawing.current ? 'Current drawing' : currentPlan?.planId === plan.planId && plan.version < currentPlan.version ? 'Known previous version' : drawing.briefId && currentPlan?.planId !== plan.planId ? 'Alternative drawing' : 'Retained drawing', { planId: plan.planId, version: plan.version, fingerprint: plan.fingerprint },
      samePlan(plan, loaded) ? { kind: 'drawing', plan } : unavailable('Saved drawing preview is not loaded'),
      drawing.briefId && (!currentPlan || currentPlan.planId !== plan.planId) ? { alternativeSelection: { scope, taskId: scope.taskId, briefId: drawing.briefId, plan } } : {});
  }
  for (const bound of input.answers) {
    if (!saved(bound) || (bound.value.source.taskId != null && bound.value.source.taskId !== scope.taskId)) continue;
    const output = bound.value;
    add('answer-output', output.id, output.title, `Answer ${output.source.answerNumber ?? output.source.conversationIndex + 1} · ${output.source.state}`, {}, { kind: 'answer-output', outputId: output.id });
  }
  if (saved(input.report)) {
    const { supported, report } = input.report.value;
    add('saved-report', 'report-json', 'Saved BOQ & elements report', report ? [report.sourceKind, report.source, report.modelRevision == null ? null : `Source model revision ${report.modelRevision}`].filter(Boolean).join(' · ') : 'Saved task evidence', {},
      supported === false ? unavailable('Saved report export is not supported for this task') : { kind: 'saved-report', taskId: scope.taskId });
  }
  const sources = new Map();
  for (const bound of input.savedSources) {
    if (!saved(bound) || !attachmentMatches(bound.value)) continue;
    const source = bound.value, previous = sources.get(source.id);
    if (!previous) sources.set(source.id, { ...source });
    else for (const [key, value] of Object.entries(source)) if (previous[key] == null) previous[key] = value;
  }
  let attachmentIndex = 0;
  const attachmentNames = new Map();
  for (const bound of input.savedAttachmentIds) {
    if (!saved(bound)) continue;
    const id = bound.value, source = sources.get(id);
    if (!attachmentNames.has(id)) attachmentNames.set(id, ++attachmentIndex);
    add('saved-attachment', id, source?.name || `Saved attachment ${attachmentNames.get(id)}`, 'Saved task input', { ...(source ? metadata(source) : {}), attachmentId: id },
      source?.image && loaded ? { kind: 'saved-source', sourceId: id, plan: loaded } : unavailable('Attachment preview is available in DATUMM Desktop'));
  }
  for (const bound of input.specialists) {
    if (!saved(bound)) continue;
    const { role, status, ref } = bound.value;
    const readable = value => value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
    add('specialist-artifact', ref, 'Evidence report (JSON)', `${readable(role)} · ${readable(status)}`, { artifactRef: ref },
      role === 'report_preparer' && status === 'completed' && /^[a-f0-9]{64}$/.test(ref) ? { kind: 'specialist-download', taskId: scope.taskId, sha256: ref } : unavailable('This specialist reference has no supported download'));
  }
  const draftNames = new Map();
  for (const bound of input.draftSources) {
    if (!bound || bound.accountKey !== scope.accountKey || bound.taskId !== null || bound.sourceKey !== scope.sourceKey || !attachmentMatches(bound.value)) continue;
    const source = bound.value;
    if (!draftNames.has(source.id)) draftNames.set(source.id, draftNames.size + 1);
    add('draft-attachment', source.id, source.name || `Draft attachment ${draftNames.get(source.id)}`, 'Unsaved draft input', { ...metadata(source), attachmentId: source.id }, unavailable('Unsaved attachment · Web preview and upload are unavailable'));
  }
  for (const row of rows) if ((row.kind === 'draft-attachment' || row.kind === 'saved-attachment') && row.metadata.name) row.title = row.metadata.name;
  return rows;
}
