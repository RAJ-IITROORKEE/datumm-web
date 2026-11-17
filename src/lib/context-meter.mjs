/** Pure maths for the composer context meter (reads `data.usage`, schema 1). */

const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Same ownership rule the Activity panel applies before it shows usage. */
export function usageBelongsTo(usage, taskId) {
  if (!usage || usage.rootTaskId !== taskId) return false;
  if (usage.scope === 'execution_ledger') {
    return usage.ownerTaskId === taskId && Boolean(usage.ledgerExecutionId);
  }
  return !usage.ownerTaskId || usage.ownerTaskId === taskId;
}

export const contextPercent = (used, max) =>
  valid(used) && valid(max) && max > 0 ? (used / max) * 100 : null;

/** Null means "show nothing": a missing reading must never render as 0%. */
export function meterReading(usage) {
  const context = usage?.context;
  if (!context) return null;
  const completed = context.lastProviderCallState === 'completed' &&
    valid(context.lastProviderInputTokens) && valid(context.lastProviderOutputTokens);
  const used = completed ? context.lastProviderInputTokens + context.lastProviderOutputTokens
    : valid(context.estimatedInputTokens) ? context.estimatedInputTokens : null;
  if (used === null) return null;
  const capacity = context.modelCapacityTokens;
  const max = valid(capacity) && capacity > 0 ? capacity : null;
  const reported = context.lastProviderReportedUsd;
  // Number('') and Number(true) are finite, so only real numbers and numeric strings count.
  const usd = typeof reported === 'number' || typeof reported === 'string' && reported.trim() !== ''
    ? Number(reported) : NaN;
  return {
    used, max, percent: contextPercent(used, max), estimated: !completed,
    input: completed ? context.lastProviderInputTokens : null,
    output: completed ? context.lastProviderOutputTokens : null,
    usd: valid(usd) ? usd : null,
    calls: valid(usage.cumulative?.modelCalls) ? usage.cumulative.modelCalls : null,
  };
}

export const meterTone = percent =>
  percent === null || percent === undefined || percent < 70 ? 'neutral'
    : percent <= 90 ? 'warning' : 'danger';

export function ringDash(percent, circumference) {
  const share = Math.max(0, Math.min(100, percent ?? 0)) / 100;
  return {dash: share * circumference, gap: circumference - share * circumference};
}

const trim = value => value.toFixed(1).replace(/\.0$/, '');
export function formatTokens(count) {
  if (count >= 1e6 || Math.round(count / 100) / 10 >= 1000) return `${trim(count / 1e6)}M`;
  return count >= 1000 ? `${trim(count / 1e3)}K` : String(Math.round(count));
}
