'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  MAX_QUEUED, claimQueued, createQueueStore, enqueue, nextQueued, promptFirst, removeQueued,
  sendNowAllowed, withInterrupted, type QueuePause, type QueuedPrompt,
} from '@/lib/prompt-queue.mjs';

export type HostedQueueEnv = {
  accountKey: string;
  taskId: string | null;
  status: string | undefined;
  /** Hosted Ask/Plan with a task: the only place this queue exists. */
  active: boolean;
  models: string[];
  model: string;
  mode: 'ask' | 'plan';
  /** Nothing else is being sent or applied right now. */
  idle: boolean;
  /** The prompt of the turn that is running, named in the steer line. */
  lastPrompt: string;
  /** Sends one prompt as a normal follow-up; true when the service started a turn for it. */
  send(text: string, model: string, mode: 'ask' | 'plan'): Promise<boolean>;
  /** Asks the service to cancel the running turn; true when the command was accepted. */
  stop(): Promise<boolean>;
};

export type HostedQueue = {
  active: boolean;
  items: QueuedPrompt[];
  max: number;
  full: boolean;
  paused: QueuePause;
  stopping: boolean;
  /** Send now may run: a turn to stop, or a plain ending with no question or approval waiting. */
  canSendNow: boolean;
  notice: string;
  add(text: string): boolean;
  remove(id: string): void;
  /** Takes the item out of the queue so its text can go back into the box. */
  take(id: string): QueuedPrompt | null;
  /** Stops the running turn, then sends this prompt (a queued id, or new text) first. */
  sendNow(source: {id: string} | {text: string}, onQueued?: () => void): Promise<void>;
};

const COPY = {
  full: `Queue is full (${MAX_QUEUED}). Wait for a turn to finish or remove one.`,
  empty: 'Type a message to queue.',
  too_long: 'This message exceeds 12,000 characters. Shorten it before queueing.',
  mode: 'Build mode cannot be queued.',
};
// Cancel waits for the worker; a long model call can hold it up to the 45 s provider timeout.
const STOP_TIMEOUT_MS = 60_000;

const browserStorage = (name: 'sessionStorage' | 'localStorage') => () =>
  (typeof globalThis[name] === 'undefined' ? null : globalThis[name]);

export function usePromptQueue(env: HostedQueueEnv): HostedQueue {
  const {accountKey, taskId, status, active, models, model, mode, idle} = env;
  const store = useMemo(() => createQueueStore({
    accountKey, storage: browserStorage('sessionStorage'),
  }), [accountKey]);
  const [, bump] = useState(0);
  const [stopping, setStopping] = useState(false);
  const [notice, setNotice] = useState('');
  const items = active ? store.get(taskId) : [];
  const live = useRef(env);
  live.current = env;
  // A queue releases only after this tab watched its task run, so a reload never sends by itself.
  const watched = useRef<string | null>(null);
  const steering = useRef<{prompt: string} | null>(null);
  const sending = useRef(false);
  const tab = useRef('');
  tab.current ||= globalThis.crypto?.randomUUID?.() ?? String(Math.random());
  const write = useCallback((task: string | null, next: QueuedPrompt[]) => {
    store.set(task, next);
    bump(value => value + 1);
  }, [store]);

  /** Sends one queued item for `task`; a prompt that did not start goes back to the front. */
  const dispatch = async (task: string, item: QueuedPrompt, text: string) => {
    write(task, removeQueued(store.get(task), item.id));
    const claim = () => claimQueued(browserStorage('localStorage'),
      {accountKey: live.current.accountKey, taskId: task, id: item.id, tab: tab.current});
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    const claimed = locks ? await locks.request('datumm-prompt-queue-claim', claim) : claim();
    if (!claimed) return; // Another tab with a copy of this queue already sent it.
    const started = live.current.taskId === task &&
      await live.current.send(text, item.model, item.mode).catch(() => false);
    if (!started) write(task, [item, ...store.get(task)].slice(0, MAX_QUEUED));
  };

  const first = items[0];
  const decision = nextQueued(items, {status, models, steering: Boolean(steering.current)});
  const paused = items.length && !stopping ? decision.paused : null;

  useEffect(() => {
    steering.current = null;
    setStopping(false);
    setNotice('');
  }, [taskId, accountKey]);

  useEffect(() => {
    if (!active || !taskId) return;
    if (status === 'queued' || status === 'running') { watched.current = taskId; return; }
    // A stop that ended any other way than cancelled or completed leaves the queue paused.
    if (steering.current && status !== 'completed' && status !== 'cancelled') {
      steering.current = null;
      setStopping(false);
    }
    const {item} = decision;
    if (!item || !idle || sending.current || watched.current !== taskId) return;
    sending.current = true;
    watched.current = null;
    // Only a turn our stop cancelled is named; a turn that completed first was not replaced.
    const stopped = status === 'cancelled' ? steering.current?.prompt ?? '' : '';
    steering.current = null;
    void dispatch(taskId, item, withInterrupted(item.prompt, stopped))
      .finally(() => { sending.current = false; setStopping(false); });
  // `decision` and `items` derive from the other dependencies.
  }, [active, taskId, status, idle, first?.id, decision.item?.id]);

  const add = (text: string) => {
    const result = enqueue(items, {prompt: text, mode, model});
    setNotice(result.error ? COPY[result.error] : '');
    if (!result.error) write(taskId, result.items);
    return !result.error;
  };
  const canSendNow = active && !stopping && sendNowAllowed(status);
  return {
    active, items, max: MAX_QUEUED, full: items.length >= MAX_QUEUED, paused, stopping, canSendNow,
    notice,
    add,
    remove: id => write(taskId, removeQueued(items, id)),
    take(id) {
      const found = items.find(item => item.id === id) ?? null;
      if (found) write(taskId, removeQueued(items, id));
      return found;
    },
    async sendNow(source, onQueued) {
      if (!canSendNow || !taskId) return;
      const task = taskId;
      let next = items;
      if ('text' in source) {
        const result = enqueue(items, {prompt: source.text, mode, model});
        if (result.error) { setNotice(COPY[result.error]); return; }
        next = result.items;
        source = {id: next[next.length - 1].id};
      }
      const id = source.id;
      write(task, promptFirst(next, id));
      onQueued?.();
      if (status !== 'queued' && status !== 'running') {
        // A plain ending (a paused queue): send it now, no stop and no steer line.
        const item = next.find(row => row.id === id);
        if (item) await dispatch(task, item, item.prompt);
        return;
      }
      const token = {prompt: env.lastPrompt};
      steering.current = token;
      setStopping(true);
      setNotice('');
      // Releases only this stop: a release or a newer stop already took the steer away.
      const release = (message: string) => {
        if (steering.current !== token) return;
        steering.current = null;
        setStopping(false);
        setNotice(message);
      };
      setTimeout(() => release('The turn did not stop in time. Your prompt stays in the queue.'),
        STOP_TIMEOUT_MS);
      const stopped = await env.stop().catch(() => false);
      if (!stopped) release('The turn could not be stopped. Your prompt stays in the queue.');
    },
  };
}
