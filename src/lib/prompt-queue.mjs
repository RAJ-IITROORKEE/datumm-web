// Browser-only prompt queue for hosted Ask/Plan. Prompts live in sessionStorage, keyed by account
// and task, so they never mix and vanish when the tab closes. Nothing here touches the service.
export const MAX_QUEUED = 3;
export const MAX_PROMPT_CHARS = 12000;
const INTERRUPTED_MAX = 280;
const RUNNING = ['queued', 'running'];
// A question or a Revit approval may be waiting on any other status, so nothing is sent then.
const DIRECT = ['completed', 'failed', 'cancelled'];
const PREFIX = 'datumm-prompt-queue:';
const CLAIM_TTL_MS = 10 * 60 * 1000;

const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

/** Adds one prompt; the result carries `error` ('full'|'empty'|'too_long'|'mode') when refused. */
export function enqueue(items, entry) {
  const prompt = typeof entry?.prompt === 'string' ? entry.prompt.trim() : '';
  const error = entry?.mode === 'build' ? 'mode'
    : !prompt ? 'empty'
      : prompt.length > MAX_PROMPT_CHARS ? 'too_long'
        : items.length >= MAX_QUEUED ? 'full' : null;
  if (error) return {items, error};
  const row = {id: entry.id ?? newId(), prompt, mode: entry.mode, model: entry.model};
  return {items: [...items, row]};
}

export const removeQueued = (items, id) => items.filter(item => item.id !== id);

export function promptFirst(items, id) {
  const found = items.find(item => item.id === id);
  return found ? [found, ...items.filter(item => item !== found)] : items;
}

/**
 * What to do with the head of the queue. Only a completed turn releases it; a stop we asked for
 * (`steering`) releases it after `cancelled`. Every other ending pauses it and keeps the prompts.
 */
export function nextQueued(items, {status, models, steering = false}) {
  const head = items[0];
  if (!head || RUNNING.includes(status)) return {item: null, paused: null};
  if (status !== 'completed' && !(steering && status === 'cancelled')) {
    return {item: null, paused: 'status'};
  }
  if (models?.length && head.model && !models.includes(head.model)) {
    return {item: null, paused: 'model'};
  }
  return {item: head, paused: null};
}

/** Native work stays exact: a Build or Revit task never queues, steers or sends now. */
export const queueAllowed = run => Boolean(run) && run.mode !== 'build' &&
  !run.data?.native_build && !run.data?.proposal && !run.data?.operation_id;

/** Send now stops a running turn, or sends directly only after a plain ending. */
export const sendNowAllowed = status => RUNNING.includes(status) || DIRECT.includes(status);

const CONTROLS = new RegExp('[\u0000-\u001f\u007f-\u009f\u2028\u2029]', 'g');

/** One line naming the prompt a steer replaced, or null when there is nothing to say. */
export function interruptedLine(prompt) {
  if (typeof prompt !== 'string') return null;
  // An earlier steer line is dropped so lines never nest.
  const text = prompt.replace(/^Instead of: [^\n]*\n\n/, '').replace(/[\t\n\r]/g, ' ')
    .replace(CONTROLS, '').replace(/\s+/g, ' ').trim();
  return text ? 'Instead of: ' + text.slice(0, INTERRUPTED_MAX) : null;
}

/** The line is dropped, never the prompt, when it would push the prompt over the length limit. */
export function withInterrupted(prompt, stopped) {
  const line = interruptedLine(stopped);
  const fits = line && line.length + 2 + prompt.length <= MAX_PROMPT_CHARS;
  return fits ? line + '\n\n' + prompt : prompt;
}

const valid = row => row && typeof row.id === 'string' && typeof row.prompt === 'string' &&
  row.prompt.length <= MAX_PROMPT_CHARS && ['ask', 'plan'].includes(row.mode) &&
  typeof row.model === 'string';

export function createQueueStore({accountKey = null, storage = () => null} = {}) {
  const memory = new Map();
  const key = task => PREFIX + 'v1:' + encodeURIComponent(accountKey) + ':' +
    encodeURIComponent(task);
  const read = task => {
    try {
      const raw = storage()?.getItem(key(task));
      const rows = raw ? JSON.parse(raw) : null;
      return Array.isArray(rows) && rows.length <= MAX_QUEUED && rows.every(valid) ? rows : [];
    } catch { return []; }
  };
  return {
    get(task) {
      if (!task) return [];
      if (!memory.has(task)) memory.set(task, accountKey ? read(task) : []);
      return memory.get(task);
    },
    set(task, items) {
      if (!task) return;
      memory.set(task, items);
      if (!accountKey) return;
      try {
        if (items.length) storage()?.setItem(key(task), JSON.stringify(items));
        else storage()?.removeItem(key(task));
      } catch { /* memory copy keeps working */ }
    },
  };
}

/**
 * Marks one queued prompt as sent by this tab (a duplicated tab copies sessionStorage). False when
 * another tab claimed it within the TTL; true when storage is unusable, as one tab is the norm.
 */
export function claimQueued(storage, {accountKey, taskId, id, tab, now = Date.now()}) {
  try {
    const store = storage();
    if (!store) return true;
    const key = PREFIX + 'v1:claims:' + encodeURIComponent(accountKey);
    const claims = Object.fromEntries(Object.entries(JSON.parse(store.getItem(key) ?? '{}'))
      .filter(([, row]) => row && now - row.at < CLAIM_TTL_MS));
    const name = taskId + ':' + id;
    if (claims[name] && claims[name].tab !== tab) return false;
    claims[name] = {tab, at: now};
    store.setItem(key, JSON.stringify(claims));
    return true;
  } catch { return true; }
}

/** Removes every queue and claim key, for sign-out. */
export function clearQueueKeys(storages) {
  for (const get of storages) {
    try {
      const store = get();
      if (!store) continue;
      const keys = Array.from({length: store.length}, (_, i) => store.key(i));
      keys.filter(key => key?.startsWith(PREFIX)).forEach(key => store.removeItem(key));
    } catch { /* nothing stored there */ }
  }
}
