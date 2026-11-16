/** Stop remains pending only while the latest recorded lifecycle belongs to this task. */
export function stopRequested(task, events = task?.events ?? []) {
 if (!task || task.status === 'reconciling') return false;
 let pending = false, latestCancel = 0;
 for (const event of [...events].filter(event => !event.taskId || event.taskId === task.id).sort((a,b)=>a.index-b.index)) {
  if (event.stage === 'cancel_requested') {pending = true;latestCancel=event.sequence??event.index+1;}
  else if (['cancelled','completed','failed','interrupted','reconciling'].includes(event.stage)) pending = false;
  else if (event.stage === 'command_accepted' && /^Accepted (?:submit|chat followup|amend|continue) in this task\.$/.test(event.detail)) pending = false;
 }
 if (['cancelled','completed','failed','interrupted'].includes(task.status)) return pending&&typeof task.eventCursor==='number'&&latestCancel>task.eventCursor;
 return pending;
}
