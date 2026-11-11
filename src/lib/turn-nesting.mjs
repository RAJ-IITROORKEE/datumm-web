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

const CHILD = /^(agent_action|research|evidence_lookup\w*)$/;

/**
 * Flat step list for hosted turns that send no `parentStepId`: each
 * `agent_stage_start` ... `agent_stage_complete` span is one step, titled by the
 * start event, with its action / research / evidence-lookup events as child rows.
 * A span with no complete event is still running.
 * @template {{ index: number; stage: string; detail?: string; at?: string; agent?: { name?: string } }} E
 * @param {E[]} events
 * @returns {{ id: string; title: string; done: boolean; children: E[] }[]}
 */
export function stageSpans(events) {
  const spans = [];
  let open = null;
  for (const event of [...events].sort((a, b) => a.index - b.index)) {
    if (event.stage === 'agent_stage_start') {
      open = { id: String(event.index), title: event.detail?.trim() || `Step ${spans.length + 1}`, done: false, children: [] };
      spans.push(open);
    } else if (event.stage === 'agent_stage_complete') {
      if (open) open.done = true;
      open = null;
    } else if (open && CHILD.test(event.stage)) open.children.push(event);
  }
  return spans;
}
