/**
 * Pure derivation of the pinned to-do checklist from the saved task plan or the native to-dos.
 * @typedef {{key:string,title:string}} PlanStep
 * @typedef {{plan?:{steps:PlanStep[],progress:{key:string,status:string}[]}|null,todos?:{content:string,status:string}[],active?:boolean,spans?:{id:string,title:string,done:boolean}[]}} TodoInput
 * @typedef {{id:string,title:string,status:'pending'|'running'|'done'|'failed'}} TodoItem
 */
const fromProgress = (status) => (status === 'completed' ? 'done' : ['failed', 'error'].includes(status) ? 'failed' : ['running', 'in_progress'].includes(status) ? 'running' : 'pending');

/** @param {TodoInput} input @returns {TodoItem[]} */
export function deriveTodos({ plan, todos = [], active = false, spans = [] }) {
  /** @type {TodoItem[]} */
  let items = [];
  if (plan?.steps?.length) {
    items = plan.steps.map((step) => ({ id: step.key, title: step.title, status: fromProgress(plan.progress?.find((row) => row.key === step.key)?.status ?? '') }));
  } else if (todos.length) {
    items = todos.map((todo, index) => ({ id: String(index), title: todo.content, status: fromProgress(todo.status) }));
  } else if (spans.length) {
    // Ask turns without a task plan: each stage span is a step.
    items = spans.map((span, index) => ({ id: span.id, title: span.title, status: span.done || !active ? 'done' : index === spans.length - 1 ? 'running' : 'done' }));
  }
  // A running turn always has a current step: the first unfinished one.
  if (active && items.length && !items.some((item) => item.status === 'running')) {
    const next = items.find((item) => item.status === 'pending');
    if (next) next.status = 'running';
  }
  return items;
}

/** @param {TodoItem[]} items */
export function todoSummary(items) {
  const done = items.filter((item) => item.status === 'done').length;
  return { done, total: items.length, allDone: items.length > 0 && done === items.length, current: items.find((item) => item.status === 'running') };
}
