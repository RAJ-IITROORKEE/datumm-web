// U2: today's per-user usage (GET me/usage/today) and the plain wording for the composer status line.
const count = value => Number.isSafeInteger(value) && value >= 0;
const part = raw => {
  if (!raw || typeof raw !== 'object' || !count(raw.used)) return null;
  const limit = raw.limit === null ? null : raw.limit;
  if (limit !== null && !(count(limit) && count(raw.left))) return null;
  return { used: raw.used, limit, left: limit === null ? null : raw.left };
};

/** Null for anything that is not a well-formed response, so a bad body shows nothing instead of a wrong number. */
export function parseDailyUsage(body) {
  const runs = part(body?.runs), modelCalls = part(body?.modelCalls);
  if (!runs || !modelCalls || typeof body.resetsAt !== 'string') return null;
  return { runs, modelCalls, resetsAt: body.resetsAt };
}

const NOUN = { runs: 'tasks', modelCalls: 'model calls' };
// Same words the backend sends with its 429, so a fresh reading and a refused send read alike.
export const dailyLimitMessage = (limit, kind = 'runs') => `You've reached today's limit of ${limit} ${NOUN[kind]}. It resets at 00:00 UTC.`;
export const isDailyLimitMessage = text => /^You've reached today's limit of \d+ (?:tasks|model calls)\. It resets at 00:00 UTC\.$/.test(String(text ?? '').trim());

/** The tighter of the two limits that exist, or null when the user is unlimited. */
function tightest(usage) {
  const limited = ['runs', 'modelCalls'].filter(kind => usage[kind].limit !== null);
  return limited.sort((a, b) => usage[a].left - usage[b].left)[0] ?? null;
}

/** Status-line text: a refused send wins, then "N left today" only while a limit exists; null shows nothing. */
export function dailyStatus(usage, error = '') {
  if (isDailyLimitMessage(error)) return String(error).trim();
  const kind = usage && tightest(usage);
  if (!kind) return null;
  const { left, limit } = usage[kind];
  if (left === 0) return dailyLimitMessage(limit, kind);
  return kind === 'runs' ? `${left} left today` : `${left} model ${left === 1 ? 'call' : 'calls'} left today`;
}
