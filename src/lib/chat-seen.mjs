/**
 * Unread rules for the chat list: a chat is unread when it has settled with a
 * task version newer than the one the user last had open. Versions live in
 * localStorage (callers wrap storage access in try/catch).
 */
const running = (status) => status === 'queued' || status === 'running';

/**
 * Advance the seen-version map. Returns the same object when nothing changed.
 * @param {Record<string, number>} seen
 * @param {{ id: string; taskVersion?: number }[]} runs
 * @param {string} openId
 */
export function advanceSeen(seen, runs, openId) {
  let next = seen;
  for (const run of runs) {
    const version = run.taskVersion ?? 0;
    if (run.id === openId ? seen[run.id] !== version : seen[run.id] === undefined) {
      if (next === seen) next = { ...seen };
      next[run.id] = version;
    }
  }
  const ids = Object.keys(next);
  if (ids.length > 300) { // ponytail: oldest-inserted ids drop first; fine for a personal chat list
    next = Object.fromEntries(ids.slice(-300).map((id) => [id, next[id]]));
  }
  return next;
}

/**
 * @param {{ id: string; status: string; taskVersion?: number }} run
 * @param {Record<string, number>} seen
 * @param {string} openId
 */
export const isUnread = (run, seen, openId) =>
  run.id !== openId && !running(run.status) && seen[run.id] !== undefined && (run.taskVersion ?? 0) > seen[run.id];
