export type SelectionPlan = {planId:string;version:number;fingerprint:string};
export function readSelectionMarker(storage:Storage|null,account:string,task:string,brief:string):{status:'ready';plan:SelectionPlan|null}|{status:'unavailable'|'invalid'};
export function writeSelectionMarker(storage:Storage|null,account:string,task:string,brief:string,plan:SelectionPlan):boolean;
export function clearSelectionMarker(storage:Storage|null,account:string,task:string,brief:string,expected:SelectionPlan):boolean;
export function claimSelectionMarker(storage:Storage|null,locks:LockManager|null,account:string,task:string,brief:string,plan:SelectionPlan):Promise<boolean>;
export function releaseSelectionMarker(storage:Storage|null,locks:LockManager|null,account:string,task:string,brief:string,plan:SelectionPlan,stillCurrent?:()=>boolean):Promise<boolean>;
