export function openChatPollMs(status: string | undefined): number | null;
export function listPollMs(runs: {status: string}[]): number;
export function settledPoll(refresh: () => Promise<unknown> | unknown, delay: number | (() => number),
 timers?: {setTimeout: (callback: () => void, ms: number) => unknown; clearTimeout: (id: any) => void},
 doc?: {hidden: boolean; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void}): () => void;
