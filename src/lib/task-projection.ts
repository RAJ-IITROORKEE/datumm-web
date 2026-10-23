/** Shared chat/inspector projection. A gap waits for replay or a full snapshot. */
export type TaskEvent = {schemaVersion?:2;eventId?:string;sequence?:number;taskId?:string;index:number;stage:string;detail:string;at:string};
export type TaskSnapshot = {id:string;taskVersion?:number;eventCursor?:number;events:TaskEvent[]};
export type Projection<T extends TaskSnapshot> = {snapshot:T|null;events:TaskEvent[];cursor:number;pending:TaskEvent[]};
export function emptyProjection<T extends TaskSnapshot>():Projection<T>{return {snapshot:null,events:[],cursor:0,pending:[]};}
export function reduceProjection<T extends TaskSnapshot>(state:Projection<T>, action:{snapshot:T}|{event:TaskEvent}):Projection<T>{
 if('snapshot' in action){
  const snapshot=action.snapshot;
  if(state.snapshot?.id!==snapshot.id)state=emptyProjection<T>();
  if((snapshot.taskVersion??0)<(state.snapshot?.taskVersion??0)||(snapshot.eventCursor??0)<state.cursor)return state;
  const events=snapshot.events.slice().sort((a,b)=>a.index-b.index);
  const cursor=snapshot.eventCursor??(events.at(-1)?.index??-1)+1;
  return {snapshot,events,cursor,pending:state.pending.filter(e=>(e.sequence??e.index+1)>cursor)};
 }
 const event=action.event,sequence=event.sequence??event.index+1;
 if(event.taskId&&state.snapshot&&event.taskId!==state.snapshot.id)return state;
 if(sequence<=state.cursor)return state;
 const pending=[...state.pending.filter(e=>(e.sequence??e.index+1)!==sequence),event].sort((a,b)=>a.index-b.index);
 const events=state.events.slice();let cursor=state.cursor;
 while(pending.length&&(pending[0].sequence??pending[0].index+1)===cursor+1){events.push(pending.shift()!);cursor++;}
 return {...state,events,cursor,pending};
}
