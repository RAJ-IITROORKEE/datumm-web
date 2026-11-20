import {admissionMessage, serviceErrorMessage} from './chat-start';

/** Shared chat/inspector projection. A gap waits for replay or a full snapshot. */
export type TaskEvent = {schemaVersion?:2;eventId?:string;sequence?:number;taskId?:string;turnId?:string;executionId?:string;activityId?:string;sessionId?:string;callId?:string;toolCallId?:string;tool?:string;index:number;stage:string;detail:string;note?:string;failureCode?:string;controlOutcome?:string;outcome?:string;durationMs?:number;at:string;agent?:{id:string;role?:string;name?:string};parentStepId?:string};
export type TaskSnapshot = {id:string;taskVersion?:number;eventCursor?:number;events:TaskEvent[]};
export type Projection<T extends TaskSnapshot> = {taskId:string|null;snapshot:T|null;events:TaskEvent[];cursor:number;pending:TaskEvent[]};
// Live and reloaded failed details can carry upstream HTML; show the safe copy, keep the source event.
export const displayEvent=(event:TaskEvent):TaskEvent=>event.stage==='failed'?{...event,detail:admissionMessage(serviceErrorMessage(event.detail),event.failureCode)}:event;
export function emptyProjection<T extends TaskSnapshot>():Projection<T>{return {taskId:null,snapshot:null,events:[],cursor:0,pending:[]};}
const sequence=(event:TaskEvent)=>event.sequence??event.index+1;
const snapshotCursor=(snapshot:TaskSnapshot|null)=>snapshot?.eventCursor??snapshot?.events.reduce((cursor,event)=>Math.max(cursor,sequence(event)),0)??0;
export function acceptsTaskSnapshot(current:TaskSnapshot|null,snapshot:TaskSnapshot,readBase?:TaskSnapshot|null){
 const version=snapshot.taskVersion??0,currentVersion=current?.taskVersion??0;
 const cursor=snapshotCursor(snapshot),currentCursor=snapshotCursor(current);
 if(version<currentVersion||cursor<currentCursor)return false;
 return readBase===undefined||current===readBase||version>currentVersion||cursor>currentCursor;
}
function appendConsecutive(events:TaskEvent[],pending:TaskEvent[],cursor:number){
 while(pending.length&&sequence(pending[0])===cursor+1){events.push(pending.shift()!);cursor++;}
 return {events,pending,cursor};
}
export function reduceProjection<T extends TaskSnapshot>(state:Projection<T>, action:{snapshot:T;readBase?:T|null}|{event:TaskEvent}):Projection<T>{
 if('snapshot' in action){
  const snapshot=action.snapshot;
  if(state.taskId!==snapshot.id)state=emptyProjection<T>();
  if(!acceptsTaskSnapshot(state.snapshot,snapshot,action.readBase))return state;
  const cursor=snapshotCursor(snapshot);
  const events=snapshot.events.map(displayEvent).sort((a,b)=>a.index-b.index);
  // Live events can arrive before a saved read or while it is in flight.
  const pending=[...state.events,...state.pending].filter(event=>sequence(event)>cursor);
  return {taskId:snapshot.id,snapshot,...appendConsecutive(events,pending,cursor)};
 }
 const event=displayEvent(action.event),cursor=sequence(event);
 if(event.taskId&&state.taskId&&event.taskId!==state.taskId)return state;
 if(cursor<=state.cursor||state.pending.some(row=>sequence(row)===cursor))return state;
 const pending=[...state.pending,event].sort((a,b)=>sequence(a)-sequence(b));
 return {...state,taskId:state.taskId??event.taskId??null,...appendConsecutive(state.events.slice(),pending,state.cursor)};
}
