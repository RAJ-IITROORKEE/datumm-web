/**
 * Checklist states come only from the saved task plan or native todos.
 * @typedef {{key:string,title:string,required?:boolean}} PlanStep
 * @typedef {{plan?:{steps:PlanStep[],progress:{key:string,status:string}[]}|null,todos?:{content:string,status:string,required?:boolean}[],active?:boolean,settled?:boolean}} TodoInput
 * @typedef {{id:string,title:string,required?:boolean,status:'pending'|'running'|'done'|'failed'|'unconfirmed'|'stopped'|'partial'|'skipped'|'unknown'}} TodoItem
 */
const fromProgress = (status, active, settled) => ['completed', 'complete', 'done'].includes(status) ? 'done' : ['failed', 'error'].includes(status) ? 'failed' : status === 'partial' ? 'partial' : ['running', 'in_progress'].includes(status) ? active ? 'running' : 'unconfirmed' : ['cancelled', 'stopped', 'interrupted'].includes(status) ? 'stopped' : ['', 'pending', 'queued', 'not_started'].includes(status) ? settled ? 'unconfirmed' : 'pending' : 'unknown';

/** @param {TodoInput} input @returns {TodoItem[]} */
export function deriveTodos({ plan, todos = [], active = false, settled = false }) {
  /** @type {TodoItem[]} */
  let items = [];
  if (plan?.steps?.length) {
    items = plan.steps.map((step) => {
      const status = plan.progress?.find((row) => row.key === step.key)?.status ?? '';
      return checklistItem(step.key, step.title, status, step.required, active, settled);
    });
  } else if (todos.length) {
    items = todos.map((todo, index) =>
      checklistItem(String(index), todo.content, todo.status, todo.required, active, settled));
  }
  return items;
}

function checklistItem(id, title, status, required, active, settled) {
  return {
    id, title,
    ...(required === false && { required: false }),
    status: required === false && status === 'skipped' ? 'skipped' : fromProgress(status, active, settled),
  };
}

/** @param {TodoItem[]} items */
export function todoSummary(items) {
  const required = items.filter((item) => item.required !== false);
  const done = required.filter((item) => item.status === 'done').length;
  return {
    done, total: required.length, allDone: required.length > 0 && done === required.length,
    current: items.find((item) => item.status === 'running'), optional: items.length - required.length,
  };
}
