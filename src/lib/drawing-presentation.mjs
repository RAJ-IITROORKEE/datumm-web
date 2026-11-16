/** Naming is local to the ordered, loaded candidates; IDs remain source metadata. */
export function drawingTitle(plan, candidates = []) {
 const ids = [...new Set(candidates.map(candidate => candidate?.planId).filter(id => typeof id === 'string' && id.trim()))];
 const index = typeof plan?.planId === 'string' ? ids.indexOf(plan.planId) : -1;
 const name = index < 0 ? 'Saved drawing' : `Concept ${index + 1}`;
 return typeof plan?.version === 'number' && Number.isFinite(plan.version) ? `${name} · Version ${plan.version}` : name;
}
