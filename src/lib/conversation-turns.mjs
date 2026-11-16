/** Pair only adjacent prompt-only and answer-only records; retain their original indices. */
export function conversationTurns(records = []) {
 const turns = [];
 records.forEach((record, index) => {
  const previous = turns.at(-1);
  if (record.answer && !record.prompt && previous && previous.answerIndex === undefined && previous.prompt && previous.endIndex === index - 1 && (record.turnId === previous.turnId)) {
   previous.answer = record.answer; previous.answerIndex = index; previous.endIndex = index;
   if (record.nativeMessages) previous.nativeMessages = record.nativeMessages;
   previous.turnId = record.turnId ?? previous.turnId;
   previous.presentation = record.presentation;
   previous.completion = record.completion;
   previous.recordedOutcome = record.recordedOutcome;
  } else turns.push({...record, index, endIndex:index, answerIndex:record.answer ? index : undefined});
 });
 return turns;
}
/** Only explicit identities bind events to a turn. Unbound events remain task-level. */
export function turnEvents(turns, groups, ordinal) {
 const id = turns[ordinal]?.turnId;
 if (id) return groups.flat().filter(event => event.turnId === id);
 return [];
}

/** A whole-task result cannot settle an ambiguously attributed question turn. */
export function processTurnStatus({turn, turns, taskId, events, last, taskStatus}) {
 const lifecycle = events.filter(event => ['completed','failed','cancelled','interrupted','needs_input','paused_limit','paused_recovery','partial','stale','blocked'].includes(event.stage));
 const mixedQuestion = lifecycle.some(event => event.stage === 'needs_input') && lifecycle.some(event => event.stage !== 'needs_input');
 const repeatedTurn = Boolean(turn?.turnId && turns.filter(row => row.turnId === turn.turnId).length > 1);
 if (last && taskStatus !== 'completed') return taskStatus;
 if (!turn?.turnId || !taskId || repeatedTurn || mixedQuestion || !lifecycle.length) return 'unknown';
 const execution = lifecycle[0].executionId;
 if (!execution || lifecycle.some(event => event.taskId !== taskId || event.turnId !== turn.turnId || event.executionId !== execution)) return 'unknown';
 const states = new Set(lifecycle.map(event => event.stage));
 if (states.size !== 1 || states.has('needs_input')) return 'unknown';
 return lifecycle[0].stage;
}

/** A saved answer may be complete despite a mixed question lifecycle only with exact text and event identity. */
export function answerHasCompletionProof({turn, turns, taskId, events}) {
 if (!taskId || !turn?.turnId || !turn.answer || turns.filter(row => row.turnId === turn.turnId && row.answer === turn.answer).length !== 1) return false;
 const matches=events.filter(event => event.stage==='answer' && event.detail===turn.answer && event.taskId===taskId && event.turnId===turn.turnId && typeof event.executionId==='string' && event.executionId && Number.isSafeInteger(event.sequence));
 if(matches.length!==1)return false;
 const answer=matches[0];
 return events.some(event=>event.stage==='completed' && event.taskId===taskId && event.turnId===turn.turnId && event.executionId===answer.executionId && Number.isSafeInteger(event.sequence) && event.sequence>answer.sequence);
}

/** The server binds this narrow outcome to the exact task, turn and execution. */
export function historicalOutcome(turn, turns, taskId, events, savedError) {
 const value = turn?.recordedOutcome;
 if (value === undefined) return null;
 if (savedError || !taskId || !turn?.turnId || !value || value.schemaVersion !== 1 ||
     value.taskId !== taskId || value.turnId !== turn.turnId || value.status !== 'needs_connection' ||
     typeof value.executionId !== 'string' || !value.executionId.trim()) return 'rejected';
 const outcomes = turns.filter(row => row.recordedOutcome);
 if (turns.filter(row => row.turnId === value.turnId).length !== 1 || outcomes.filter(row => row.recordedOutcome?.turnId === value.turnId || row.recordedOutcome?.executionId === value.executionId).length !== 1) return 'rejected';
 if (events.some(event => ['failed', 'error', 'cancelled', 'interrupted', 'needs_input', 'waiting', 'awaiting_approval', 'paused_limit', 'paused_recovery', 'partial', 'stale', 'blocked'].includes(event.stage))) return 'rejected';
 if (events.some(event => event.executionId && event.executionId !== value.executionId)) return 'rejected';
 return value.status;
}

/** A rejected outcome may retain a failure only when every lifecycle event shares its exact execution. */
export function rejectedHistoricalStatus(turn, turns, taskId, events) {
 const value = turn?.recordedOutcome;
 if (!value || value.schemaVersion !== 1 || value.status !== 'needs_connection' || value.taskId !== taskId ||
     !turn.turnId || value.turnId !== turn.turnId || typeof value.executionId !== 'string' || !value.executionId.trim() ||
     turns.filter(row => row.turnId === turn.turnId).length !== 1 ||
     turns.filter(row => row.recordedOutcome?.turnId === value.turnId || row.recordedOutcome?.executionId === value.executionId).length !== 1) return 'unknown';
 const lifecycle = events.filter(event => ['completed','failed','error','cancelled','interrupted','needs_input','waiting','awaiting_approval','paused_limit','paused_recovery','partial','stale','blocked'].includes(event.stage));
 if (!lifecycle.length || lifecycle.some(event => event.executionId !== value.executionId) ||
     events.some(event => event.executionId && event.executionId !== value.executionId)) return 'unknown';
 const states = new Set(lifecycle.map(event => event.stage));
 if (states.size !== 1) return 'unknown';
 const state = lifecycle[0].stage;
 return state === 'completed' ? 'unknown' : state;
}

/** Retain the previous literal answer/output eligibility independently of process proof. */
export function legacyAnswerOutputState({last, executing, taskStatus, historicalStatus}) {
 if (last && executing) return 'streaming';
 return (last ? taskStatus : historicalStatus) === 'completed' ? 'saved' : 'partial';
}

/** A durable public snapshot binds a successful terminal event to one saved answer. */
export function answerCompletionCandidate({turn,turns,taskId,events}) {
 const value=turn?.completion;
 if(!value || typeof value!=='object' || Array.isArray(value)) return false;
 const keys=['schemaVersion','taskId','turnId','executionId','answerHash','status','completionSequence'];
 if(Object.keys(value).length!==keys.length || keys.some(key=>!Object.hasOwn(value,key)) || value.schemaVersion!==1 || value.status!=='completed' || value.taskId!==taskId || !taskId || !turn.turnId || value.turnId!==turn.turnId || typeof value.executionId!=='string' || !value.executionId.trim() || value.executionId.length>128 || !/^[a-f0-9]{64}$/.test(value.answerHash) || !Number.isSafeInteger(value.completionSequence) || value.completionSequence<=0 || typeof turn.answer!=='string' || !turn.answer) return false;
 if(turns.filter(row=>row.completion?.taskId===taskId && row.completion?.executionId===value.executionId && row.completion?.answerHash===value.answerHash).length!==1) return false;
 const contradictory=new Set(['failed','error','cancelled','interrupted','needs_input','waiting','waiting_for_input','awaiting_approval','reconciling','paused_limit','paused_recovery','partial','stale','blocked','superseded']);
 return !events.some(event=>event.taskId===taskId && event.turnId===turn.turnId && event.executionId===value.executionId && Number.isSafeInteger(event.sequence) && event.sequence>=value.completionSequence && contradictory.has(event.stage));
}

export async function verifyAnswerCompletionHash(completion,text,digest=globalThis.crypto?.subtle) {
 if(!digest || typeof text!=='string' || text.length>100000 || !completion || !/^[a-f0-9]{64}$/.test(completion.answerHash)) return false;
 try { const hash=Array.from(new Uint8Array(await digest.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join(''); return hash===completion.answerHash; } catch { return false; }
}
