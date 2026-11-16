/**
 * Checklist states come only from the saved task plan or native todos.
 * @typedef {{key:string,title:string}} PlanStep
 * @typedef {{plan?:{steps:PlanStep[],progress:{key:string,status:string}[]}|null,todos?:{content:string,status:string}[],active?:boolean}} TodoInput
 * @typedef {{id:string,title:string,status:'pending'|'running'|'done'|'failed'|'unconfirmed'|'stopped'|'partial'|'unknown'}} TodoItem
 */
const fromProgress = (status, active, settled) => ['completed', 'complete', 'done'].includes(status) ? 'done' : ['failed', 'error'].includes(status) ? 'failed' : status === 'partial' ? 'partial' : ['running', 'in_progress'].includes(status) ? active ? 'running' : 'unconfirmed' : ['cancelled', 'stopped', 'interrupted'].includes(status) ? 'stopped' : ['', 'pending', 'queued', 'not_started'].includes(status) ? settled ? 'unconfirmed' : 'pending' : 'unknown';

/** @param {TodoInput} input @returns {TodoItem[]} */
export function deriveTodos({ plan, todos = [], active = false, settled = false }) {
  /** @type {TodoItem[]} */
  let items = [];
  if (plan?.steps?.length) {
    items = plan.steps.map((step) => ({ id: step.key, title: step.title, status: fromProgress(plan.progress?.find((row) => row.key === step.key)?.status ?? '', active, settled) }));
  } else if (todos.length) {
    items = todos.map((todo, index) => ({ id: String(index), title: todo.content, status: fromProgress(todo.status, active, settled) }));
  }
  return items;
}

/** @param {TodoItem[]} items */
export function todoSummary(items) {
  const done = items.filter((item) => item.status === 'done').length;
  return { done, total: items.length, allDone: items.length > 0 && done === items.length, current: items.find((item) => item.status === 'running') };
}
