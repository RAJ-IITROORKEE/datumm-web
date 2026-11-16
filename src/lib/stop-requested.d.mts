import type {TaskEvent} from './task-projection';
export function stopRequested(task:{id:string;status:string;eventCursor?:number;events?:TaskEvent[]}|null,events?:TaskEvent[]):boolean;
