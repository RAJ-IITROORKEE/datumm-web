export type AnnotationIdentity={planId:string;version:number;fingerprint:string};
export type ViewportComment={id:string;number:number;roomKey:string;x:number;y:number;text:string;status:'open'|'resolved'};
export type AnnotationDraft={commentId?:string;roomKey:string;x:number;y:number;text:string};
export type AnnotationData={comments:ViewportComment[];draft:AnnotationDraft|null};
export type AnnotationStoreSnapshot={loaded:boolean;data:AnnotationData;error:boolean;errorKind:'read'|'write'|null};
type AnnotationRoom={key:string;rect:number[]};
type AnnotationStorage={getItem(key:string):string|null;setItem(key:string,value:string):void};

const MAX_COMMENTS=100,MAX_COMMENT_TEXT=2000;
export const EMPTY_ANNOTATIONS:AnnotationData={comments:[],draft:null};
export const EMPTY_ANNOTATION_SNAPSHOT:AnnotationStoreSnapshot={loaded:false,data:EMPTY_ANNOTATIONS,error:false,errorKind:null};

export function validRoomAnchor(rooms:AnnotationRoom[],roomKey:unknown,x:unknown,y:unknown):roomKey is string{
 if(typeof roomKey!=='string'||typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y))return false;
 const room=rooms.find(row=>row.key===roomKey);
 return Boolean(room&&room.rect.length>=4&&room.rect.slice(0,4).every(Number.isFinite)&&x>=room.rect[0]&&x<=room.rect[2]&&y>=room.rect[1]&&y<=room.rect[3]);
}

export function readCanvasAnnotations(raw:string|null,identity:AnnotationIdentity,rooms:AnnotationRoom[]):AnnotationData{
 if(!raw)return EMPTY_ANNOTATIONS;
 try{
  const saved=JSON.parse(raw),scope=saved?.identity;
  if(scope?.planId!==identity.planId||scope?.version!==identity.version||scope?.fingerprint!==identity.fingerprint||!Array.isArray(saved.comments)||saved.comments.length>MAX_COMMENTS)return EMPTY_ANNOTATIONS;
  const ids=new Set<string>(),numbers=new Set<number>(),comments:ViewportComment[]=[];
  for(const row of saved.comments){
   if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||row.id.length>96||!Number.isInteger(row.number)||row.number<1||row.number>MAX_COMMENTS||ids.has(row.id)||numbers.has(row.number)||!validRoomAnchor(rooms,row.roomKey,row.x,row.y)||typeof row.text!=='string'||!row.text.trim()||row.text.length>MAX_COMMENT_TEXT||!['open','resolved'].includes(row.status))continue;
   ids.add(row.id);numbers.add(row.number);comments.push({id:row.id,number:row.number,roomKey:row.roomKey,x:row.x,y:row.y,text:row.text,status:row.status});
  }
  const row=saved.draft;
  let draft:AnnotationDraft|null=null;
  if(row&&typeof row==='object'&&validRoomAnchor(rooms,row.roomKey,row.x,row.y)&&typeof row.text==='string'&&row.text.length<=MAX_COMMENT_TEXT&&(row.commentId===undefined||typeof row.commentId==='string'&&row.commentId.length<=96)){
   const linked=typeof row.commentId==='string'?comments.find(comment=>comment.id===row.commentId):undefined;
   if(row.commentId===undefined||linked&&linked.roomKey===row.roomKey&&linked.x===row.x&&linked.y===row.y)draft={...(linked?{commentId:linked.id}:{}),roomKey:row.roomKey,x:row.x,y:row.y,text:row.text};
  }
  return {comments,draft};
 }catch{return EMPTY_ANNOTATIONS;}
}

export function createCanvasAnnotationStore(storage:AnnotationStorage){
 type Entry={snapshot:AnnotationStoreSnapshot;initialized:boolean;listeners:Set<()=>void>};
 const entries=new Map<string,Entry>();
 const entryFor=(key:string)=>{
  let entry=entries.get(key);
  if(!entry){entry={snapshot:EMPTY_ANNOTATION_SNAPSHOT,initialized:false,listeners:new Set()};entries.set(key,entry);}
  return entry;
 };
 const publish=(entry:Entry,snapshot:AnnotationStoreSnapshot)=>{entry.snapshot=snapshot;for(const listener of entry.listeners)listener();};
 const write=(key:string,identity:AnnotationIdentity,data:AnnotationData)=>storage.setItem(key,JSON.stringify({identity,comments:data.comments,draft:data.draft}));
 const load=(key:string,identity:AnnotationIdentity,rooms:AnnotationRoom[])=>{
  const entry=entryFor(key);
  if(entry.initialized)return;
  entry.initialized=true;
  try{publish(entry,{loaded:true,data:readCanvasAnnotations(storage.getItem(key),identity,rooms),error:false,errorKind:null});}
  catch{entry.initialized=false;publish(entry,{...entry.snapshot,loaded:false,error:true,errorKind:'read'});}
 };
 return {
  getSnapshot:(key:string)=>entryFor(key).snapshot,
  subscribe:(key:string,listener:()=>void)=>{
   const entry=entryFor(key);entry.listeners.add(listener);
   return ()=>{entry.listeners.delete(listener);if(!entry.listeners.size&&!entry.snapshot.error)entries.delete(key);};
  },
  load,
  update:(key:string,identity:AnnotationIdentity,update:(current:AnnotationData)=>AnnotationData)=>{
   const entry=entryFor(key);if(!entry.snapshot.loaded)return false;
   const data=update(entry.snapshot.data);
   try{write(key,identity,data);publish(entry,{loaded:true,data,error:false,errorKind:null});return true;}
   catch{publish(entry,{loaded:true,data,error:true,errorKind:'write'});return false;}
  },
  commit:(key:string,identity:AnnotationIdentity,data:AnnotationData)=>{
   const entry=entryFor(key);if(!entry.snapshot.loaded)return false;
   try{write(key,identity,data);publish(entry,{loaded:true,data,error:false,errorKind:null});return true;}
   catch{publish(entry,{...entry.snapshot,error:true,errorKind:'write'});return false;}
  },
  retry:(key:string,identity:AnnotationIdentity,rooms:AnnotationRoom[])=>{
   const entry=entryFor(key);
   if(!entry.snapshot.loaded){entry.initialized=false;load(key,identity,rooms);return entry.snapshot.loaded;}
   try{write(key,identity,entry.snapshot.data);publish(entry,{...entry.snapshot,error:false,errorKind:null});return true;}
   catch{publish(entry,{...entry.snapshot,error:true,errorKind:'write'});return false;}
  },
 };
}
