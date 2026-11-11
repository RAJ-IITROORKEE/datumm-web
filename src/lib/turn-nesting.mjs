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

const clip = (text, max = 80) => {
  const value = typeof text === 'string' ? text.trim().replace(/\s+/g, ' ') : '';
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

/**
 * Flat step list for hosted turns that send no `parentStepId`: each
 * `agent_stage_start` ... `agent_stage_complete` span is one step with its action /
 * research / evidence-lookup events as child rows. Title: the first `note` inside the
 * span (80 chars), else the start event's detail. `summary`: the span's last note when
 * it differs from the first. A span with no complete event is still running.
 * @template {{ index: number; stage: string; detail?: string; note?: string; at?: string; agent?: { name?: string } }} E
 * @param {E[]} events
 * @returns {{ id: string; title: string; summary: string; done: boolean; children: E[] }[]}
 */
export function stageSpans(events) {
  const spans = [];
  let open = null;
  let notes = [];
  const close = () => {
    if (!open) return;
    if (notes.length) open.title = clip(notes[0]);
    if (notes.length > 1) open.summary = clip(notes.at(-1), 140);
    open = null;
  };
  for (const event of [...events].sort((a, b) => a.index - b.index)) {
    if (event.stage === 'agent_stage_start') {
      close();
      notes = [];
      open = { id: String(event.index), title: clip(event.detail) || `Step ${spans.length + 1}`, summary: '', done: false, children: [] };
      spans.push(open);
    } else if (event.stage === 'agent_stage_complete') {
      if (open) open.done = true;
      close();
    } else if (open) {
      if (clip(event.note)) notes.push(event.note);
      if (CHILD.test(event.stage)) open.children.push(event);
    }
  }
  close();
  return spans;
}

/** Latest progress note of a running turn, else the title of the latest step. */
export function latestNote(events, spans = stageSpans(events)) {
  for (let i = events.length - 1; i >= 0; i--) {
    const note = clip(events[i].note, 160);
    if (note) return note;
  }
  return spans.at(-1)?.title ?? '';
}
