// The layout critic's advice (`agent_specialists`, role `layout_critic`), shown beside the checks.
// The result is untrusted backend data: unfamiliar shapes become "not available", never a guess,
// and nothing here can change a check result.

const SEVERITY_LABELS = { concern: 'Concern', info: 'Note', unknown: 'Not sure' };
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const boundTo = (binding, plan) => isObject(binding) && isObject(plan)
  && binding.planId === plan.planId && binding.planVersion === plan.version
  && binding.fingerprint === plan.fingerprint;

function parseAdvice(findings) {
  if (!Array.isArray(findings)) return null;
  const rows = findings.map((row) => {
    const valid = isObject(row) && Object.hasOwn(SEVERITY_LABELS, row.severity)
      && typeof row.message === 'string' && row.message.trim() !== '';
    if (!valid) return null;
    return { severity: row.severity, label: SEVERITY_LABELS[row.severity], message: row.message };
  });
  return rows.includes(null) ? null : rows;
}

/**
 * `null` shows nothing. `{state:'unavailable'}` says the review could not run.
 * `{state:'ready', findings}` carries advice, only for a completed review of this plan version.
 */
export function critiqueFor(results, plan) {
  const critics = Array.isArray(results)
    ? results.filter((row) => isObject(row) && row.role === 'layout_critic') : [];
  const mine = critics.find((row) => boundTo(row.binding, plan));
  const row = mine ?? critics.find((item) => item.status === 'partial' || item.status === 'failed');
  if (!row) return null;
  if (row.status === 'partial' || row.status === 'failed') return { state: 'unavailable' };
  if (row !== mine || row.status !== 'completed') return null;
  const findings = parseAdvice(row.findings);
  return findings ? { state: 'ready', findings } : { state: 'unavailable' };
}
