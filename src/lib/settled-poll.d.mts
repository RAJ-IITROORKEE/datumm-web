export function settledPoll(refresh: () => Promise<unknown>, delay: number,
 timers?: {setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout}): () => void;
