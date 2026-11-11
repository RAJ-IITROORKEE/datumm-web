const MAX_BACKOFF = 60000;
const FAST = new Set(['queued', 'running', 'reconciling']);
const DONE = new Set(['completed', 'failed', 'cancelled']);

/** Open-chat poll interval in ms, or null when the chat is settled and needs no polling. */
export const openChatPollMs = (status) => (FAST.has(status) ? 1500 : DONE.has(status) ? null : 20000);

/** Chat-list poll interval in ms: fast only while some chat is running. */
export const listPollMs = (runs) => (runs.some((run) => FAST.has(run.status)) ? 6000 : 30000);

/**
 * Start the next refresh only after the previous request settles. `delay` is ms or a
 * function returning ms. Ticks are skipped while the page is hidden and one runs when
 * it becomes visible; a thrown refresh (or one resolving `false`) backs off exponentially, capped at 60 s.
 */
export function settledPoll(refresh, delay, timers = {
 setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
 clearTimeout: id => globalThis.clearTimeout(id),
}, doc = globalThis.document) {
 let stopped = false, running = false, failures = 0, timer;
 const tick = async () => {
  if (stopped || running) return;
  running = true;
  if (!doc?.hidden) {
   try { failures = (await refresh()) === false ? failures + 1 : 0; } catch { failures++; /* Each refresh owns its error presentation. */ }
  }
  running = false;
  if (!stopped) timer = timers.setTimeout(tick, Math.min(MAX_BACKOFF, (typeof delay === 'function' ? delay() : delay) * 2 ** Math.min(failures, 6)));
 };
 const visible = () => {
  if (doc.hidden || stopped || running) return;
  timers.clearTimeout(timer);
  void tick();
 };
 doc?.addEventListener?.('visibilitychange', visible);
 void tick();
 return () => { stopped = true; if (timer !== undefined) timers.clearTimeout(timer); doc?.removeEventListener?.('visibilitychange', visible); };
}
