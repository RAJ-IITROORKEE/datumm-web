export type NestableEvent = { index: number; parentStepId?: string; agent?: { id: string; role?: string; name?: string } };
export function nestProcess<E extends NestableEvent>(events: E[]): { steps: { id: string; agents: { id: string; role: string; name: string; events: E[] }[] }[]; rest: E[] };
