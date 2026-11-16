/** Project only data that can be attributed to the selected task and source. */
const text = value => typeof value === 'string' ? value.trim() : '';
const strings = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
const fieldLabel = key => ({ dimensionRole: 'Dimensions describe', entry: 'Entrance direction' }[key] ?? key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()));
const provenanceLabel = value => ({ explicit: 'Explicitly supplied', assumed: 'Assumed', inferred: 'Inferred' }[text(value)] ?? 'Source not established');
const validPlan = plan => Boolean(text(plan?.planId) && typeof plan?.version === 'number' && Number.isFinite(plan.version) && text(plan?.fingerprint));
const scalar = value => typeof value === 'string' ? text(value) : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

export function projectBrief(run, selectedTaskId, project) {
  if (!run || !selectedTaskId || run.id !== selectedTaskId) return { state: 'no-task', sections: [] };
  const projectId = text(run.projectId);
  if (projectId && project && project.id !== projectId) return { state: 'project-mismatch', sections: [] };
  const association = projectId ? (project ? 'matched' : 'unavailable') : 'unknown';
  const sections = [];
  const brief = run.data?.agent_interpreted_brief;
  if (brief && typeof brief === 'object') {
    const values = [], sourceOnly = [];
    const dimensions = Array.isArray(brief.dimensions) ? brief.dimensions : [];
    const roles = new Set(dimensions.map(dimension => text(dimension?.role).toLowerCase() || 'unknown'));
    for (const [key, item] of Object.entries(brief.values ?? {})) {
      const value = scalar(item?.value);
      if (value) {
        const record = { label: fieldLabel(key), value, provenance: text(item?.provenance), sourceText: '' };
        const conflictingRole = [...roles].some(role => role !== 'unknown' && role !== value.toLowerCase());
        if (key === 'dimensionRole' && (roles.size > 1 || conflictingRole)) sourceOnly.push(record);
        else values.push(record);
      }
    }
    for (const dimension of dimensions) {
      const parts = [scalar(dimension?.widthMm) && `Width ${scalar(dimension.widthMm)} mm`, scalar(dimension?.depthMm) && `Depth ${scalar(dimension.depthMm)} mm`].filter(Boolean);
      if (parts.length || text(dimension?.sourceText)) values.push({ label: text(dimension?.role) ? fieldLabel(text(dimension.role)) : 'Dimension', value: parts.join(' · ') || 'Dimensions not recorded', provenance: text(dimension?.provenance), sourceText: text(dimension?.sourceText) });
    }
    for (const [key, value] of Object.entries(brief.program ?? {})) if (typeof value === 'boolean') values.push({ label: fieldLabel(key), value: value ? 'Yes' : 'No', provenance: '', sourceText: '' });
    const assumptions = strings(brief.assumptions), deferred = strings(brief.deferred);
    const unresolved = strings(brief.unresolved).filter(item => !deferred.includes(item));
    if (values.length || sourceOnly.length || assumptions.length || unresolved.length || deferred.length) sections.push({ kind: 'interpretation', values, sourceOnly, assumptions, unresolved, deferred, status: text(brief.status) });
  }
  const memory = run.data?.agent_memory;
  if (memory && typeof memory === 'object') {
    const goal = text(memory.originalGoal), nextAction = text(memory.nextAction);
    const operations = strings(memory.unresolvedOperationIds);
    if (goal || nextAction || operations.length) sections.push({ kind: 'handoff', goal, nextAction, operations, version: scalar(memory.version), schemaVersion: scalar(memory.schemaVersion), documentId: text(memory.binding?.documentId), revision: scalar(memory.binding?.revision) });
  }
  const acceptance = run.acceptance;
  const plan = acceptance?.plan;
  const accepted = strings(acceptance?.acceptedAssumptions);
  if (accepted.length && validPlan(plan)) {
    const current = run.currentPlanRef;
    const relation = !validPlan(current) ? 'unknown' : current.planId === plan.planId && current.version === plan.version && current.fingerprint === plan.fingerprint ? 'current' : 'different';
    sections.push({ kind: 'accepted', assumptions: accepted, planId: plan.planId, version: String(plan.version), fingerprint: plan.fingerprint, relation });
  }
  return { state: 'ready', taskId: run.id, taskTitle: text(run.title) || 'Untitled task', projectId, projectTitle: association === 'matched' ? text(project.title) || 'Untitled project' : '', association, taskVersion: scalar(run.taskVersion), eventCursor: scalar(run.eventCursor), sections };
}

/** Distinguish interpreted inputs from geometry in the saved proposal. */
export function briefChips(run) {
  const brief = run?.data?.agent_interpreted_brief, design = run?.data?.agent_design?.brief;
  const chips = [];
  const site = design?.site;
  if (Number.isFinite(site?.widthMm) && Number.isFinite(site?.depthMm)) chips.push(`Proposed footprint: ${site.widthMm.toLocaleString()} × ${site.depthMm.toLocaleString()} mm`);
  if (site?.entry) chips.push(`Proposed entry: ${site.entry}`);
  else if (brief?.values?.entry?.value) chips.push(`${brief.values.entry.value} entry · ${provenanceLabel(brief.values.entry.provenance)}`);
  for (const [key, noun] of [['bedrooms', 'bedroom'], ['guestRooms', 'guest room'], ['bathrooms', 'bathroom']]) {
    const item = brief?.values?.[key], count = Number(item?.value);
    if (Number.isFinite(count) && count > 0) chips.push(`${count} ${noun}${count === 1 ? '' : 's'} · ${provenanceLabel(item?.provenance)}`);
  }
  if (design?.requirements?.length) chips.push(`${design.requirements.length} requirements`);
  const deferred = strings(brief?.deferred);
  const unresolved = strings(brief?.unresolved).filter(item => !deferred.includes(item));
  if (unresolved.length) chips.push(`${unresolved.length} to confirm`);
  return chips;
}

export { provenanceLabel };
