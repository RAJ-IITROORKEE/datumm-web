/**
 * Pure grouping for the per-turn process tree: step -> agent -> tool-call events.
 * Only events carrying `parentStepId` nest; the rest are returned untouched so
 * callers keep today's flat batching (older backends send neither field).
 */

/**
 * @template {{ index: number; parentStepId?: string; agent?: { id: string; role?: string; name?: string } }} E
 * @param {E[]} events
 * @returns {{ steps: { id: string; agents: { id: string; role: string; name: string; events: E[] }[] }[]; rest: E[] }}
 */
export function nestProcess(events) {
  const steps = [];
  const rest = [];
  for (const event of [...events].sort((a, b) => a.index - b.index)) {
    if (!event.parentStepId) { rest.push(event); continue; }
    let step = steps.find((row) => row.id === event.parentStepId);
    if (!step) steps.push((step = { id: event.parentStepId, agents: [] }));
    const id = event.agent?.id ?? 'lead';
    let agent = step.agents.find((row) => row.id === id);
    if (!agent) step.agents.push((agent = { id, role: event.agent?.role ?? 'lead', name: event.agent?.name ?? 'DATUMM', events: [] }));
    agent.events.push(event);
  }
  return { steps, rest };
}
