// Start the next refresh only after the previous request settles.
export function settledPoll(refresh, delay, timers = {
 setTimeout: (callback, ms) => globalThis.setTimeout(callback, ms),
 clearTimeout: id => globalThis.clearTimeout(id),
}) {
 let stopped = false, timer;
 const tick = async () => {
  if (stopped) return;
  try { await refresh(); } catch { /* Each refresh owns its error presentation. */ }
  finally { if (!stopped) timer = timers.setTimeout(tick, delay); }
 };
 void tick();
 return () => { stopped = true; if (timer !== undefined) timers.clearTimeout(timer); };
}
