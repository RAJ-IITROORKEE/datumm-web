export type QueuedPrompt = {id: string; prompt: string; mode: 'ask' | 'plan'; model: string};
export type QueueError = 'full' | 'empty' | 'too_long' | 'mode';
export type QueuePause = 'status' | 'model' | null;
export type QueueStore = {
  get(task: string | null | undefined): QueuedPrompt[];
  set(task: string | null | undefined, items: QueuedPrompt[]): void;
};
export const MAX_QUEUED: 3;
export const MAX_PROMPT_CHARS: 12000;
export function enqueue(
  items: QueuedPrompt[],
  entry: {prompt: string; mode: string; model: string; id?: string},
): {items: QueuedPrompt[]; error?: QueueError};
export function removeQueued(items: QueuedPrompt[], id: string): QueuedPrompt[];
export function promptFirst(items: QueuedPrompt[], id: string): QueuedPrompt[];
export function nextQueued(
  items: QueuedPrompt[],
  context: {status: string | undefined; models: string[]; steering?: boolean},
): {item: QueuedPrompt | null; paused: QueuePause};
export function interruptedLine(prompt: unknown): string | null;
export function withInterrupted(prompt: string, stopped: unknown): string;
export function createQueueStore(options?: {
  accountKey?: string | null;
  storage?: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
}): QueueStore;
export function queueAllowed(
  run: {mode?: string; data?: Record<string, unknown>} | null | undefined,
): boolean;
export function sendNowAllowed(status: string | undefined): boolean;
export function claimQueued(
  storage: () => Pick<Storage, 'getItem' | 'setItem'> | null,
  claim: {accountKey: string; taskId: string; id: string; tab: string; now?: number},
): boolean;
export function clearQueueKeys(
  storages: Array<() => Pick<Storage, 'length' | 'key' | 'removeItem'> | null>,
): void;
