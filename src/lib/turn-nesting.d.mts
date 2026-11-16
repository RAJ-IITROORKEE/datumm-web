export type NestableEvent = { index: number; stage?: string; parentStepId?: string; agent?: { id: string; role?: string; name?: string } };
export function nestProcess<E extends NestableEvent>(events: E[]): { steps: { id: string; agents: { id: string; role: string; name: string; events: E[] }[] }[]; rest: E[] };
export function stageSpans<E extends {index:number;stage:string;detail?:string;note?:string;at?:string;activityId?:string;executionId?:string;turnId?:string;taskId?:string;controlOutcome?:string;agent?:{name?:string}}>(events: E[]): {id:string;title:string;summary:string;done:boolean;outcome?:string;children:E[]}[];
export function latestNote(events: { note?: string }[], spans?: { title: string }[]): string;
