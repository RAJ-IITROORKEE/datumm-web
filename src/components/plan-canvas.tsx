'use client';
import dynamic from 'next/dynamic';
import {ArrowUp, Check, ChevronDown, CircleHelp, Hand, Home, MapPin, MessageSquarePlus, MessagesSquare, Minus, MousePointer2, PanelRight, Pencil, Plus, RotateCcw, Ruler, Settings2, Trash2, X} from 'lucide-react';
import {type KeyboardEvent,type MouseEvent as ReactMouseEvent,type ReactNode,useCallback,useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {formatLength,planSheet,pointInRoom,wallLength,rectangularClearDimensions} from '@/lib/plan-geometry.mjs';
import {fitViewport,panViewport,zoomViewport,boundViewport,fitContentSize} from '@/lib/plan-viewport.mjs';
import styles from './plan-canvas.module.css';
import {drawingExportName,safeDrawingSegment} from '@/lib/drawing-export-identity.mjs';
import {exportPlanSheet,exportRaster,PlanDrawing} from './plan-drawing';
import {createCanvasAnnotationStore,EMPTY_ANNOTATIONS,EMPTY_ANNOTATION_SNAPSHOT,validRoomAnchor,type AnnotationData,type AnnotationIdentity,type AnnotationDraft,type ViewportComment} from './plan-canvas-annotations';

export {readCanvasAnnotations} from './plan-canvas-annotations';
export type {ViewportComment} from './plan-canvas-annotations';

const PlanThree=dynamic(()=>import('./plan-three').then(module=>module.PlanThree),{ssr:false,loading:()=> <p role="status">Loading 3D preview…</p>});
export type PlanGraph={site:{widthMm:number;depthMm:number};wallThicknessMm:number;wallHeightMm?:number;assumptions?:string[];spatialContext?:{northDegrees?:number|null};furnitureIntents?:{kind:string;rect:number[]}[];rooms:{key:string;name:string;kind?:string;areaMm2:number;rect:number[];boundary?:number[][]}[];walls?:{key:string;start:number[];end:number[];kind?:string;roomKeys?:string[];curve?:{kind:string;mid?:number[]}}[];openings?:{key:string;wallKey:string;kind:string;offsetMm:number;widthMm:number;heightMm:number;sillMm:number}[]};
export type DrawingVersion={planId:string;version:number;fingerprint:string;svg:string;lineworkSvg?:string;graph:PlanGraph};
export type ReferenceSource={id?:string;sha256?:string;name:string;image:string;page?:number};
export type ReferenceRecord={source:{id:string;sha256:string;name:string;page?:number;crop?:{x:number;y:number;width:number;height:number}};region:{x:number;y:number;width:number;height:number};observations:{elementKey:string;label:string;state:string}[];confirmed:boolean;stale:boolean};
type DisplayStyle='shaded'|'edges'|'hidden'|'wireframe';
type CanvasTool='select'|'pan'|'comment'|'measure';
type CommentPanel='closed'|'list'|'draft'|'comment';

const MAX_COMMENTS=100,MAX_COMMENT_TEXT=2000;
const annotationStore=createCanvasAnnotationStore({getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)});

export function formatViewportAnnotation(comment:ViewportComment,drawing:DrawingVersion,view:'2d'|'3d'){
 const room=drawing.graph.rooms.find(row=>row.key===comment.roomKey);
 return `Viewport annotation: ${JSON.stringify({id:comment.id,number:comment.number,note:comment.text,roomKey:comment.roomKey,roomName:room?.name??comment.roomKey,anchorMm:{x:comment.x,y:comment.y},planId:drawing.planId,version:drawing.version,fingerprint:drawing.fingerprint,view,intent:'question'})}`;
}

function CutawayThumbnail({graph}:{graph:PlanGraph}){
 const project=(x:number,y:number)=>`${44+(x/graph.site.widthMm-y/graph.site.depthMm)*21},${8+(x/graph.site.widthMm+y/graph.site.depthMm)*11}`;
 return <svg viewBox="0 0 88 56" aria-hidden="true" focusable="false">
  {graph.rooms.map((room,index)=>{const [x0,y0,x1,y1]=room.rect;return <polygon key={room.key} points={[project(x0,y0),project(x1,y0),project(x1,y1),project(x0,y1)].join(' ')} fill="currentColor" fillOpacity={index%2?.08:.16} stroke="currentColor" strokeWidth=".8"/>;})}
 </svg>;
}

export function PlanCanvas({drawing,label='Selected plan',exportLabel,exportOwnerKey,viewStyle,onStyleChange,source,reference,highlights=[],onSelectElement,selectedElement,onAsk,onProperties,readOnly=false}:{drawing:DrawingVersion;label?:string;exportLabel?:string;exportOwnerKey?:string;viewStyle?:'presentation'|'linework';onStyleChange?:(view:'presentation'|'linework')=>void;source?:ReferenceSource;reference?:ReferenceRecord;highlights?:string[];onSelectElement?:(key:string)=>void;selectedElement?:string;onAsk?:(text:string)=>void;onProperties?:()=>void;voiceControl?:ReactNode|((onTranscript:(text:string)=>void)=>ReactNode);canvasInputEnabled?:boolean;persistentProperties?:boolean;readOnly?:boolean}){
 const id=useId(),identity={planId:drawing.planId,version:drawing.version,fingerprint:drawing.fingerprint};
 const firstRoom=drawing.graph.rooms.find(row=>row.key===selectedElement)?.key??(!selectedElement?drawing.graph.rooms[0]?.key??'':'');
 const storageKey=`datumm.plan-canvas.annotations.v1:${encodeURIComponent(drawing.planId)}:${drawing.version}:${drawing.fingerprint}`;
 const subscribeAnnotations=useCallback((listener:()=>void)=>typeof window==='undefined'?()=>{}:annotationStore.subscribe(storageKey,listener),[storageKey]);
 const getAnnotations=useCallback(()=>typeof window==='undefined'?EMPTY_ANNOTATION_SNAPSHOT:annotationStore.getSnapshot(storageKey),[storageKey]);
 const annotationState=useSyncExternalStore(subscribeAnnotations,getAnnotations,()=>EMPTY_ANNOTATION_SNAPSHOT);
 const annotationsReady=annotationState.loaded,annotations=annotationsReady?annotationState.data:EMPTY_ANNOTATIONS;
 const [overlay,setOverlay]=useState(false),[opacity,setOpacity]=useState(.35);
 const [viewport,setViewport]=useState(fitViewport),[surface,setSurface]=useState<'drafting'|'sheet'>('drafting'),[fitRequest,setFitRequest]=useState(0),[localView,setView]=useState<'presentation'|'linework'>('linework'),[room,setRoom]=useState(firstRoom),[tab,setTab]=useState<'2d'|'3d'>('2d');
 const view=viewStyle??localView,zoom=viewport.zoom;
 const [threeIdentity,setThreeIdentity]=useState('');
 const [displayStyle,setDisplayStyle]=useState<DisplayStyle>('edges'),[showGrid,setShowGrid]=useState(true),[showLabels,setShowLabels]=useState(true),[displayOpen,setDisplayOpen]=useState(false);
 const [tool,setTool]=useState<CanvasTool>('select'),[commentPanel,setCommentPanel]=useState<CommentPanel>('closed'),[activeCommentId,setActiveCommentId]=useState(''),[statusMessage,setStatusMessage]=useState('');
 const [picked,setPicked]=useState(''),[measure,setMeasure]=useState<number[][]>([]),[cutMm,setCutMm]=useState(0),[frameSize,setFrameSize]=useState({width:0,height:0});
 const frame=useRef<HTMLDivElement>(null),drag=useRef(new Map<number,{x:number;y:number;startX:number;startY:number}>()),moved=useRef(false),commentInput=useRef<HTMLTextAreaElement>(null),commentDialog=useRef<HTMLElement>(null),displayRef=useRef<HTMLDivElement>(null),displayButton=useRef<HTMLButtonElement>(null),previousIdentity=useRef(storageKey),sheet=useRef<SVGSVGElement>(null),capture=useRef<(()=>HTMLCanvasElement)|null>(null),commentReturn=useRef<HTMLElement|SVGElement|null>(null);
 const exportKey=JSON.stringify([storageKey,exportOwnerKey??'']);
 const exportScope=useRef({key:exportKey,epoch:0,mounted:true});
 if(exportScope.current.key!==exportKey){exportScope.current.key=exportKey;exportScope.current.epoch++;}
 useEffect(()=>{exportScope.current.mounted=true;return()=>{exportScope.current.mounted=false;exportScope.current.epoch++;};},[]);
 const fit=()=>{if(tab==='3d'){setFitRequest(value=>value+1);return;}setViewport(fitViewport());};
 const selected=drawing.graph.rooms.find(r=>r.key===room),selectedComment=annotations.comments.find(comment=>comment.id===activeCommentId),draft=annotations.draft;
 const clearDimensions=selected?rectangularClearDimensions(selected,drawing.graph.wallThicknessMm):null;
 const clearWidth=selected?clearDimensions?.widthMm:drawing.graph.site.widthMm;
 const clearDepth=selected?clearDimensions?.depthMm:drawing.graph.site.depthMm;
 const activeTool=readOnly&&tool==='comment'||tab==='3d'&&tool==='measure'?'select':tool;
 const {bounds,unit}=planSheet(drawing.graph),viewSize=fitContentSize(frameSize,bounds),wallHeight=drawing.graph.wallHeightMm??3000;
 const pickedOpening=drawing.graph.openings?.find(row=>row.key===picked),pickedWall=pickedOpening?undefined:drawing.graph.walls?.find(row=>row.key===picked);
 const can3d=Boolean(drawing.graph.walls?.length&&drawing.graph.openings&&drawing.graph.wallHeightMm);
 const registered=Boolean(reference&&!reference.stale&&source?.id===reference.source.id&&source?.sha256===reference.source.sha256);
 const openComments=annotations.comments.filter(comment=>comment.status==='open');
 const commentsDirty=draft?draft.commentId?annotations.comments.find(comment=>comment.id===draft.commentId)?.text!==draft.text:Boolean(draft.text):false;
 const savedComment=annotations.comments.find(comment=>comment.id===draft?.commentId);
 const scalePxPerMm=frameSize.width&&frameSize.height&&bounds.length===4&&bounds[2]>0&&bounds[3]>0?Math.min(frameSize.width/bounds[2],frameSize.height/bounds[3])*zoom:0;
 const metrics:[string,string][]=pickedOpening?[["WIDTH · mm",pickedOpening.widthMm.toLocaleString()],['HEIGHT · mm',pickedOpening.heightMm.toLocaleString()],['SILL · mm',pickedOpening.sillMm.toLocaleString()],['OFFSET · mm',pickedOpening.offsetMm.toLocaleString()]]
  :pickedWall?[['LENGTH · mm',Math.round(wallLength(pickedWall)).toLocaleString()],['THICKNESS · mm',drawing.graph.wallThicknessMm.toLocaleString()],['HEIGHT · mm',drawing.graph.wallHeightMm?.toLocaleString()??'—'],['OPENINGS',String((drawing.graph.openings??[]).filter(row=>row.wallKey===pickedWall.key).length)]]
  :[[selected?'AREA INCL. WALLS':'FOOTPRINT AREA',`${((selected?.areaMm2??drawing.graph.site.widthMm*drawing.graph.site.depthMm)/1e6).toFixed(1)} m²`],[selected?'EST. CLEAR WIDTH · mm':'WIDTH · mm',clearWidth?.toLocaleString()??'Unavailable'],[selected?'EST. CLEAR DEPTH · mm':'DEPTH · mm',clearDepth?.toLocaleString()??'Unavailable'],['HEIGHT · mm',drawing.graph.wallHeightMm?.toLocaleString()??'—'],['WALL · mm',drawing.graph.wallThicknessMm.toLocaleString()]];
 const pickedName=pickedOpening?`${pickedOpening.kind==='window'?'Window':'Door'} ${pickedOpening.key}`:pickedWall?`Wall ${pickedWall.key}`:'';
 const measured=measure.length===2?Math.hypot(measure[1][0]-measure[0][0],measure[1][1]-measure[0][1]):0;

 useEffect(()=>{annotationStore.load(storageKey,identity,drawing.graph.rooms);},[storageKey,drawing.planId,drawing.version,drawing.fingerprint,drawing.graph.rooms]);
 useEffect(()=>{
  if(previousIdentity.current===storageKey)return;
  previousIdentity.current=storageKey;setRoom('');setPicked('');setMeasure([]);setTool('select');setCommentPanel('closed');setActiveCommentId('');setViewport(fitViewport());setSurface('drafting');setTab('2d');setThreeIdentity('');setCutMm(0);setDisplayOpen(false);setStatusMessage('');drag.current.clear();commentReturn.current=null;
 },[storageKey]);
 useEffect(()=>{
  if(selectedElement&&drawing.graph.rooms.some(row=>row.key===selectedElement)){setRoom(selectedElement);return;}
  const fallback=!selectedElement?drawing.graph.rooms[0]:undefined;
  if(fallback){setRoom(fallback.key);onSelectElement?.(fallback.key);}
 },[selectedElement,drawing.graph.rooms,onSelectElement]);
 useEffect(()=>{
  const element=frame.current;if(!element)return;
  const observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect&&rect.width>0&&rect.height>0)setFrameSize({width:rect.width,height:rect.height});});
  observer.observe(element);return()=>observer.disconnect();
 },[tab]);
 useEffect(()=>{setViewport(value=>boundViewport(value,fitContentSize(frameSize,bounds)));},[frameSize,bounds[2],bounds[3]]);
 useEffect(()=>{drag.current.clear();},[tab]);
 useEffect(()=>{
  const element=frame.current;if(!element?.addEventListener)return;
  const wheel=(event:WheelEvent)=>{event.preventDefault();const rect=element.getBoundingClientRect();setViewport(value=>zoomViewport(value,value.zoom*Math.exp(-event.deltaY*.0015),{x:event.clientX-rect.left,y:event.clientY-rect.top},fitContentSize({width:rect.width,height:rect.height},bounds)));};
  element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);
 },[tab,bounds[2],bounds[3]]);
 useEffect(()=>{
  if(!displayOpen)return;
  const dismiss=(event:PointerEvent)=>{if(!displayRef.current?.contains(event.target as Node))setDisplayOpen(false);};
  const escape=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented&&(event.target as HTMLElement|null)?.tagName!=='SELECT'){event.preventDefault();event.stopPropagation();setDisplayOpen(false);displayButton.current?.focus();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[displayOpen]);
 useEffect(()=>{
  if(commentPanel==='closed')return;
  const pending=requestAnimationFrame(()=>{if(commentPanel==='draft'&&commentInput.current)commentInput.current.focus();else commentDialog.current?.focus();});
  return()=>cancelAnimationFrame(pending);
 },[commentPanel]);

 const updateAnnotations=(update:(current:AnnotationData)=>AnnotationData)=>annotationStore.update(storageKey,identity,update);
 const setDraft=(next:AnnotationDraft|null)=>updateAnnotations(current=>({...current,draft:next}));
 const choose=(key:string)=>{if(!drawing.graph.rooms.some(row=>row.key===key))return;setPicked('');setRoom(key);onSelectElement?.(key);};
 const addViewContext=()=>{
  if(!onAsk)return;
  const selectedRoom=picked?undefined:drawing.graph.rooms.find(row=>row.key===room);
  const roomContext=selectedRoom?`${selectedRoom.name} (${selectedRoom.key})`:'all rooms';
  const viewContext=tab==='3d'?'3D cutaway':`2D floor plan · ${view==='linework'?'linework':'presentation'}`;
  onAsk(`Viewport context: ${viewContext}; room: ${roomContext}; planId: ${drawing.planId}; version: ${drawing.version}; fingerprint: ${drawing.fingerprint}.`);
 };
 const tabKey=(event:KeyboardEvent<HTMLButtonElement>,current:'2d'|'3d')=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const next=event.key==='Home'?'2d':event.key==='End'?(can3d?'3d':'2d'):current==='2d'?(event.key==='ArrowRight'&&can3d?'3d':'2d'):(event.key==='ArrowLeft'?'2d':'3d');
  if(next==='3d')setThreeIdentity(storageKey);setTab(next);requestAnimationFrame(()=>document.getElementById(`${id}-tab-${next}`)?.focus());
 };
 const retryAnnotations=()=>{
  const wasReadError=!annotationStore.getSnapshot(storageKey).loaded,ok=annotationStore.retry(storageKey,identity,drawing.graph.rooms);
  setStatusMessage(ok?wasReadError?'Local comments loaded.':'Local comments saved in this browser.':'Local comments could not be saved. Retry when browser storage is available.');
 };
 const beginDraft=(roomKey:string,x:number,y:number)=>{
  if(readOnly||!annotationsReady||!validRoomAnchor(drawing.graph.rooms,roomKey,x,y))return;
  if(commentsDirty){setCommentPanel('draft');setStatusMessage('Save or discard the current comment draft before starting another.');return;}
  commentReturn.current=document.activeElement as HTMLElement|SVGElement|null;
  choose(roomKey);setActiveCommentId('');setDraft({roomKey,x,y,text:''});setCommentPanel('draft');setStatusMessage('');
 };
 const openComment=(comment:ViewportComment)=>{
  if(!annotationsReady)return;
  if(!readOnly&&draft&&draft.commentId!==comment.id&&(!draft.commentId||commentsDirty)){setCommentPanel('draft');setStatusMessage('Save or discard the current comment draft before switching comments.');return;}
  if(!readOnly&&draft?.commentId&&draft.commentId!==comment.id&&!commentsDirty)setDraft(null);
  if(commentPanel==='closed')commentReturn.current=document.activeElement as HTMLElement|SVGElement|null;
  choose(comment.roomKey);setActiveCommentId(comment.id);
  if(draft?.commentId===comment.id)setCommentPanel('draft');
  else setCommentPanel('comment');
  setStatusMessage('');
 };
 const addCommentAt=(anchor:{roomKey:string;x:number;y:number})=>beginDraft(anchor.roomKey,anchor.x,anchor.y);
 const toggleAnnotate=()=>{if(readOnly||!annotationsReady)return;const next=tool==='comment'?'select':'comment';setTool(next);if(next==='comment'&&draft)setCommentPanel('draft');};
 const startCommentTool=()=>{if(readOnly||!annotationsReady)return;setTool(current=>current==='comment'?'select':'comment');if(draft)setCommentPanel('draft');};
 const saveDraft=()=>{
  const currentData=annotationStore.getSnapshot(storageKey).data,currentDraft=currentData.draft;
  if(readOnly||!annotationsReady||!currentDraft)return null;
  const text=currentDraft.text.trim();if(!text||text.length>MAX_COMMENT_TEXT||!validRoomAnchor(drawing.graph.rooms,currentDraft.roomKey,currentDraft.x,currentDraft.y))return null;
  let saved:ViewportComment|null=null;
  if(currentDraft.commentId){const current=currentData.comments.find(comment=>comment.id===currentDraft.commentId);if(!current)return null;saved={...current,text};
  }else{
   if(currentData.comments.length>=MAX_COMMENTS){setStatusMessage('This plan already has the maximum of 100 local comments.');return null;}
   const usedNumbers=new Set(currentData.comments.map(comment=>comment.number)),number=Array.from({length:MAX_COMMENTS},(_,index)=>index+1).find(value=>!usedNumbers.has(value));
   if(!number){setStatusMessage('This plan has reached the local comment numbering limit.');return null;}saved={id:crypto.randomUUID(),number,roomKey:currentDraft.roomKey,x:currentDraft.x,y:currentDraft.y,text,status:'open'};
  }
  if(!annotationStore.commit(storageKey,identity,{comments:currentData.comments.some(comment=>comment.id===saved!.id)?currentData.comments.map(comment=>comment.id===saved!.id?saved!:comment):[...currentData.comments,saved],draft:null})){setStatusMessage('Could not save comment locally. Your draft is still available to retry.');return null;}
  setActiveCommentId(saved.id);setCommentPanel('comment');setStatusMessage(`Comment #${saved.number} saved on this plan version.`);return saved;
 };
 const discardDraft=()=>{if(readOnly||!draft)return;const commentId=draft.commentId,ok=setDraft(null);if(commentId){setActiveCommentId(commentId);setCommentPanel('comment');}else setCommentPanel('list');setStatusMessage(ok?'Draft discarded.':'Draft discarded in memory, but the browser could not save that change.');};
 const sendDraft=()=>{if(readOnly)return;const saved=saveDraft();if(saved&&onAsk){onAsk(formatViewportAnnotation(saved,drawing,tab));setStatusMessage(`Comment #${saved.number} added to the message draft. Not sent.`);}};
 const sendSavedComment=(comment:ViewportComment)=>{if(!onAsk)return;onAsk(formatViewportAnnotation(comment,drawing,tab));setStatusMessage(`Comment #${comment.number} added to the message draft. Not sent.`);};
 const toggleResolved=(comment:ViewportComment)=>{
  if(readOnly)return;
  const ok=updateAnnotations(current=>({...current,comments:current.comments.map(row=>row.id===comment.id?{...row,status:row.status==='open'?'resolved':'open'}:row)}));
  setStatusMessage(ok?comment.status==='open'?'Comment resolved locally.':'Comment reopened locally.':'Comment status changed in memory, but the browser could not save it.');
 };
 const removeComment=(comment:ViewportComment)=>{
  if(readOnly)return;
  const current=annotationStore.getSnapshot(storageKey).data;
  if(current.draft?.commentId===comment.id&&current.draft.text!==comment.text){setStatusMessage('Save or discard the edited draft before removing this comment.');return;}
  const ok=updateAnnotations(data=>({...data,comments:data.comments.filter(row=>row.id!==comment.id),draft:data.draft?.commentId===comment.id?null:data.draft}));
  setActiveCommentId('');setCommentPanel('list');setStatusMessage(ok?`Comment #${comment.number} removed from this plan version.`:`Comment #${comment.number} removed in memory, but the browser could not save it.`);
 };
 const closeComments=()=>{setCommentPanel('closed');requestAnimationFrame(()=>{const opener=commentReturn.current;if(opener?.isConnected&&opener.getClientRects().length&&getComputedStyle(opener).visibility!=='hidden')opener.focus();else document.getElementById(`${id}-tab-${tab}`)?.focus();});};
 const openCommentList=()=>{commentReturn.current=document.activeElement as HTMLElement|SVGElement|null;setCommentPanel('list');setActiveCommentId('');setStatusMessage('');};
 const exportView=async(format:'png'|'pdf')=>{
  const name=drawingExportName(drawing,tab,exportLabel),epoch=exportScope.current.epoch;
  const isCurrent=()=>exportScope.current.mounted&&exportScope.current.key===exportKey&&exportScope.current.epoch===epoch;
  try{
   if(tab==='2d'){if(!sheet.current){setStatusMessage('The drawing is still loading. Retry the export when it is ready.');return;}await exportPlanSheet(sheet.current,format,name,isCurrent);}
   else{const canvas=threeIdentity===storageKey?capture.current?.():null;if(!canvas){setStatusMessage('The 3D view is still loading. Retry the export when it is ready.');return;}const k=Math.min(1,2400/Math.max(canvas.width,canvas.height));await exportRaster(canvas,Math.round(canvas.width*k),Math.round(canvas.height*k),format,name,undefined,undefined,isCurrent);}
   if(isCurrent())setStatusMessage(`View exported as ${format.toUpperCase()}.`);
  }catch{if(isCurrent())setStatusMessage('Could not export this view.');}
 };
 const handleCanvasClick=(event:ReactMouseEvent<SVGSVGElement>)=>{
  const matrix=event.currentTarget.getScreenCTM();
  if(moved.current||activeTool==='pan'||!matrix)return;
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
  let x=point.x,y=drawing.graph.site.depthMm-point.y;
  if(activeTool==='measure'){
   // Snap to a wall end within about 12 screen pixels so measured spans are exact.
   const reach=scalePxPerMm?12/scalePxPerMm:150,nearest=(drawing.graph.walls??[]).flatMap(wall=>[wall.start,wall.end]).map(end=>({end,gap:Math.hypot(end[0]-x,end[1]-y)})).sort((a,b)=>a.gap-b.gap)[0];
   if(nearest&&nearest.gap<=reach)[x,y]=nearest.end;
   setMeasure(points=>points.length===1?[points[0],[x,y]]:[[x,y]]);return;
  }
  const element=activeTool==='select'?(event.target as Element).closest('[data-opening-key],[data-wall-key]'):null;
  if(element){setPicked(element.getAttribute('data-opening-key')??element.getAttribute('data-wall-key')??'');return;}
  const hit=drawing.graph.rooms.find(row=>pointInRoom(row,x,y));
   if(!hit){if(activeTool==='comment')setStatusMessage('Place comments inside a room on this plan.');return;}
   if(activeTool==='comment')beginDraft(hit.key,x,y);else choose(hit.key);
 };
 const commentKey=(event:KeyboardEvent<SVGGElement>,comment:ViewportComment)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openComment(comment);}};
 const displayedComment=selectedComment??annotations.comments.find(comment=>comment.id===activeCommentId);
 const commentRoom=draft?drawing.graph.rooms.find(row=>row.key===draft.roomKey):displayedComment?drawing.graph.rooms.find(row=>row.key===displayedComment.roomKey):undefined;

 return <section className={`plan-canvas ${styles.planCanvas}`} aria-label={label}>
  <div className={styles.tabs}><div className={styles.viewTabs} role="tablist" aria-label="Design views">
   <button type="button" id={`${id}-tab-2d`} className={styles.tab} role="tab" aria-controls={`${id}-panel`} aria-selected={tab==='2d'} tabIndex={tab==='2d'?0:-1} onKeyDown={event=>tabKey(event,'2d')} onClick={()=>setTab('2d')}>
    <span className={styles.thumbnail}><PlanDrawing graph={drawing.graph} mode="hidden" compact/></span><span className={styles.tabCopy}><strong>2D floor plan</strong><small>Plan v{drawing.version}</small></span>
   </button>
   <button type="button" id={`${id}-tab-3d`} className={styles.tab} role="tab" aria-controls={`${id}-panel`} aria-selected={tab==='3d'} tabIndex={tab==='3d'?0:-1} disabled={!can3d} title={!can3d?'Full shared geometry is unavailable for this drawing':undefined} onKeyDown={event=>tabKey(event,'3d')} onClick={()=>{setThreeIdentity(storageKey);setTab('3d');}}>
    <span className={styles.thumbnail}><CutawayThumbnail graph={drawing.graph}/></span><span className={styles.tabCopy}><strong>3D cutaway</strong><small>Same geometry · v{drawing.version}</small></span>
   </button>
   </div>
   {tab==='2d'&&<div className={`${styles.displayOptions} ${styles.surfaceControls}`} role="group" aria-label="2D surface"><button type="button" aria-pressed={surface==='drafting'} onClick={()=>setSurface('drafting')}>Working</button><button type="button" aria-pressed={surface==='sheet'} onClick={()=>setSurface('sheet')}>Sheet</button></div>}
   {!readOnly&&<button type="button" className={`${styles.annotateButton} ${tool==='comment'?styles.active:''}`} aria-pressed={tool==='comment'} disabled={!annotationsReady} onClick={toggleAnnotate}><MessageSquarePlus size={14} aria-hidden="true"/>Annotate</button>}
   <div className={styles.displayControl} ref={displayRef}><button ref={displayButton} type="button" className={styles.displayButton} aria-expanded={displayOpen} aria-controls={`${id}-display`} onClick={()=>setDisplayOpen(open=>!open)}><Settings2 size={14} aria-hidden="true"/><span>Display</span><ChevronDown size={12} aria-hidden="true"/></button>
    {displayOpen&&<section className={styles.displayPanel} id={`${id}-display`} aria-label="Display settings" role="dialog">
     {tab==='2d'?<><strong>2D view style</strong><div className={styles.displayOptions} role="group" aria-label="2D view style"><button type="button" aria-pressed={view==='linework'} onClick={()=>{setView('linework');onStyleChange?.('linework');}}>Hidden line</button><button type="button" aria-pressed={view==='presentation'} onClick={()=>{setView('presentation');onStyleChange?.('presentation');}}>Presentation</button></div><label><span>Grid</span><input type="checkbox" checked={showGrid} onChange={event=>setShowGrid(event.target.checked)}/></label></>:<><strong>Visual style · 3D</strong><div className={styles.displayOptions} role="group" aria-label="3D visual style">{(['hidden','shaded','edges','wireframe'] as const).map(style=><button key={style} type="button" aria-pressed={displayStyle===style} title={style==='hidden'?'Hidden line':undefined} onClick={()=>setDisplayStyle(style)}>{style==='wireframe'?'Wire':style[0].toUpperCase()+style.slice(1)}</button>)}</div><label><span>Level cut · {cutMm&&cutMm<wallHeight?`${(cutMm/1000).toFixed(1)} m`:'off'}</span><input type="range" aria-label="Level cut height" min={300} max={wallHeight} step={100} value={cutMm||wallHeight} onChange={event=>setCutMm(Number(event.target.value))}/></label><label><span>Grid</span><input type="checkbox" checked={showGrid} onChange={event=>setShowGrid(event.target.checked)}/></label><label><span>Room labels</span><input type="checkbox" checked={showLabels} onChange={event=>setShowLabels(event.target.checked)}/></label></>}
     <strong>{tab==='2d'?'Export 2D white sheet':'Export 3D viewport capture'}</strong><div className={styles.displayOptions} role="group" aria-label={tab==='2d'?'Export 2D white sheet':'Export 3D viewport capture'}><button type="button" onClick={()=>void exportView('png')}>PNG</button><button type="button" onClick={()=>void exportView('pdf')}>{tab==='2d'?'PDF sheet':'PDF capture'}</button></div>
     <p>{tab==='2d'?'White sheet includes any current measurement. Local comments and source or highlight overlays are not included.':'Captures the current 3D view. Local comment pins are not included.'}</p>
    </section>}
   </div>
   {onAsk&&<button type="button" className={styles.addContextButton} onClick={addViewContext} aria-label={`Add ${picked?'current view':selected?.name??'current view'} version ${drawing.version} to message`} title={`Add ${picked?'this view':selected?.name??'this view'} · v${drawing.version} to message`}><ArrowUp size={14}/><span>Add {picked?'view':selected?'selection':'view'} to message</span></button>}
   <details className={styles.selectionProperties} onKeyDown={event=>{if(event.currentTarget.open&&event.key==='Escape'&&!event.defaultPrevented&&(event.target as HTMLElement).tagName!=='SELECT'){event.preventDefault();event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
    <summary aria-label="Geometry properties" title="Geometry properties"><PanelRight size={14} aria-hidden="true"/><span>Properties</span></summary>
    <section aria-label="Selected geometry properties">
      <strong>{pickedName||selected?.name||'Plan geometry'}</strong>
      <label>Room<select aria-label="Select room to inspect" value={room} onChange={event=>choose(event.target.value)}>{drawing.graph.rooms.map(row=><option key={row.key} value={row.key}>{row.name}</option>)}</select></label>
      <dl>{metrics.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
      <small>Proposed geometry · millimetres · Version {drawing.version}</small>
      <details className={styles.geometrySource}><summary>Drawing source details</summary><small>Plan ID: {drawing.planId}<br/>Version: {drawing.version}<br/>Fingerprint: {drawing.fingerprint}</small></details>
      {onProperties&&<button type="button" onClick={onProperties}>More plan details</button>}
    </section>
   </details>
  </div>
  <div className={styles.viewport} id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} tabIndex={0}>
    {annotationState.error&&<div className={styles.persistenceAlert} role="alert"><span>{readOnly?annotationState.errorKind==='read'?'Could not read local comments. Open the editable plan view to retry.':'Could not save local comments. Changes remain in memory; open the editable plan view to retry.':annotationState.errorKind==='read'?'Could not read local comments. Retry to load them.':'Could not save local comments. Changes remain in memory; retry before leaving this plan.'}</span>{!readOnly&&<button type="button" onClick={retryAnnotations}>Retry</button>}</div>}
    {can3d&&threeIdentity===storageKey&&<div className={styles.viewSurface} hidden={tab!=='3d'}><PlanThree graph={drawing.graph} fingerprint={drawing.fingerprint} room={room} highlights={highlights} onSelect={choose} onSelectElement={element=>{if(element.kind!=='room')setPicked(element.key);}} displayStyle={displayStyle} cutMm={cutMm} captureRef={capture} onDisplayStyleChange={setDisplayStyle} showGrid={showGrid} onShowGridChange={setShowGrid} showLabels={showLabels} onShowLabelsChange={setShowLabels} tool={activeTool==='measure'?'select':activeTool} fitRequest={fitRequest} comments={annotationsReady?annotations.comments:[]} selectedCommentId={activeCommentId||undefined} onSelectComment={commentId=>{const comment=annotations.comments.find(row=>row.id===commentId);if(comment)openComment(comment);}} onAddComment={addCommentAt}/></div>}
    <div className={styles.viewSurface} hidden={tab!=='2d'}>
     <div className={`${styles.drawingFrame} ${showGrid?styles.grid:''}`} ref={frame} tabIndex={0} role="region" aria-label="Plan drawing" aria-describedby={`${id}-navigation-help`} data-tool={activeTool} data-surface={surface}
     onKeyDown={event=>{if(event.target!==event.currentTarget)return;const directions:Record<string,[number,number]>={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};if(directions[event.key]){event.preventDefault();const [x,y]=directions[event.key];setViewport(value=>panViewport(value,x,y,viewSize));}else if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')fit();else setViewport(value=>zoomViewport(value,value.zoom+(event.key==='-'?-.25:.25),{x:frameSize.width/2,y:frameSize.height/2},viewSize));}}}
     onPointerDown={event=>{if(drag.current.size===0)moved.current=false;if(event.pointerType!=='touch'&&event.button!==1&&(event.button!==0||activeTool!=='pan'))return;drag.current.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});if(drag.current.size>1)moved.current=true;if(event.button===1)event.preventDefault();}}
     onPointerMove={event=>{const old=drag.current.get(event.pointerId);if(!old)return;const before=[...drag.current.values()];drag.current.set(event.pointerId,{...old,x:event.clientX,y:event.clientY});const after=[...drag.current.values()];if(!moved.current&&before.length<2&&Math.hypot(event.clientX-old.startX,event.clientY-old.startY)<=4)return;moved.current=true;if(!event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.setPointerCapture(event.pointerId);if(before.length>=2&&after.length>=2){const a=before[0],b=before[1],c=after[0],d=after[1],oldDistance=Math.hypot(a.x-b.x,a.y-b.y),newDistance=Math.hypot(c.x-d.x,c.y-d.y);const rect=event.currentTarget.getBoundingClientRect(),oldMid={x:(a.x+b.x)/2-rect.left,y:(a.y+b.y)/2-rect.top},newMid={x:(c.x+d.x)/2-rect.left,y:(c.y+d.y)/2-rect.top},size=fitContentSize({width:rect.width,height:rect.height},bounds);if(oldDistance>0)setViewport(value=>panViewport(zoomViewport(value,value.zoom*newDistance/oldDistance,oldMid,size),newMid.x-oldMid.x,newMid.y-oldMid.y,size));}else setViewport(value=>panViewport(value,event.clientX-old.x,event.clientY-old.y,viewSize));}}
     onPointerUp={event=>{drag.current.delete(event.pointerId);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{drag.current.clear();moved.current=true;}} onLostPointerCapture={event=>{if(drag.current.has(event.pointerId)){drag.current.clear();moved.current=true;}}}>
     <div className={styles.drawingLayers} style={{transform:`translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`}}>
      {source&&overlay&&(registered?<svg className={styles.sourceOverlay} viewBox={bounds.join(' ')} role="img" aria-label={`Registered reference ${source.name}`} style={{opacity}}><image href={source.image} x={-reference!.region.x*drawing.graph.site.widthMm/reference!.region.width} y={-reference!.region.y*drawing.graph.site.depthMm/reference!.region.height} width={drawing.graph.site.widthMm/reference!.region.width} height={drawing.graph.site.depthMm/reference!.region.height} preserveAspectRatio="none"/></svg>:<img className={styles.sourceOverlay} src={source.image} alt={`Reference ${source.name}`} style={{opacity}}/>)}
      {selected&&!picked&&<svg className={styles.highlightOverlay} viewBox={bounds.join(' ')} aria-hidden="true"><rect x={selected.rect[0]+drawing.graph.wallThicknessMm/2} y={drawing.graph.site.depthMm-selected.rect[3]+drawing.graph.wallThicknessMm/2} width={clearWidth} height={clearDepth} className={styles.roomHighlight}/></svg>}
      {highlights.length>0&&<svg className={styles.highlightOverlay} viewBox={bounds.join(' ')} aria-label="Walkthrough geometry highlights" role="img">{drawing.graph.rooms.filter(row=>highlights.includes(row.key)).map(row=><rect key={row.key} x={row.rect[0]} y={drawing.graph.site.depthMm-row.rect[3]} width={row.rect[2]-row.rect[0]} height={row.rect[3]-row.rect[1]} fill="color-mix(in srgb, var(--pd-accent) 20%, transparent)" stroke="var(--pd-accent)" strokeWidth={70}/>)}{(drawing.graph.walls??[]).filter(row=>highlights.includes(row.key)||(drawing.graph.openings??[]).some(opening=>highlights.includes(opening.key)&&opening.wallKey===row.key)).map(row=><line key={row.key} x1={row.start[0]} y1={drawing.graph.site.depthMm-row.start[1]} x2={row.end[0]} y2={drawing.graph.site.depthMm-row.end[1]} stroke="var(--pd-accent)" strokeWidth={100}/>)}{highlights.includes('site')&&<rect x={0} y={0} width={drawing.graph.site.widthMm} height={drawing.graph.site.depthMm} fill="none" stroke="var(--pd-accent)" strokeWidth={100}/>}</svg>}
      <PlanDrawing svgRef={sheet} surface={surface} className={styles.planImage} graph={drawing.graph} sheetTitle={`${exportLabel??'Saved drawing'} · Version ${drawing.version}`} sheetPlanId={safeDrawingSegment(drawing.planId,'unknown')} mode={view==='linework'?'hidden':'presentation'} picked={picked} label={`${label} version ${drawing.version}. Exact ${drawing.graph.site.widthMm} × ${drawing.graph.site.depthMm} mm footprint; dimensions in millimetres.`} onClick={handleCanvasClick}>
       {measure.length>0&&<g className="pd-picked">{measure.map((point,index)=><circle key={index} className="pd-med" cx={point[0]} cy={drawing.graph.site.depthMm-point[1]} r={unit*.2}/>)}{measure.length===2&&<><path className="pd-med" d={`M ${measure[0][0]} ${drawing.graph.site.depthMm-measure[0][1]} L ${measure[1][0]} ${drawing.graph.site.depthMm-measure[1][1]}`}/><text className="pd-measure" strokeWidth={unit*.3} x={(measure[0][0]+measure[1][0])/2} y={drawing.graph.site.depthMm-(measure[0][1]+measure[1][1])/2-unit*.4} fontSize={unit*.75} fontWeight={600} textAnchor="middle">{formatLength(measured)}</text></>}</g>}
      </PlanDrawing>
      <svg className={styles.annotationLayer} viewBox={bounds.join(' ')} role="group" aria-label="Room comments">{annotationsReady&&openComments.map(comment=>{const commentRoom=drawing.graph.rooms.find(row=>row.key===comment.roomKey);return <g key={comment.id} className={`${styles.commentPin} ${comment.id===activeCommentId?styles.selectedPin:''}`} transform={`translate(${comment.x} ${drawing.graph.site.depthMm-comment.y})`} role="button" tabIndex={0} aria-label={`Comment ${comment.number} in ${commentRoom?.name??'room'}: ${comment.text}`} onClick={event=>{event.stopPropagation();if(moved.current&&event.detail!==0)return;openComment(comment);}} onKeyDown={event=>commentKey(event,comment)}><circle r="240"/><text textAnchor="middle" dy=".35em">{comment.number}</text></g>;})}</svg>
     </div>
     <div className={styles.viewCaption}><span>{tab==='2d'?'2D':'3D'} · {view==='linework'?'Hidden line':'Presentation'}</span><strong>{label}</strong><small>Proposed geometry · v{drawing.version}</small></div>
     <details className={styles.navigationHelp} onKeyDown={event=>{if(event.key==='Escape'&&event.currentTarget.open&&!event.defaultPrevented){event.preventDefault();event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
      <summary aria-label="Navigation help"><CircleHelp size={15} aria-hidden="true"/><span>Navigation help</span></summary>
      <p id={`${id}-navigation-help`}>Drag with Pan or middle mouse. Wheel zooms; touch pans or pinches. Arrow keys pan, + / − zoom, 0 fits.</p>
     </details>
     <div className={styles.canvasFoot}>
      <div className={styles.zoomControls} role="group" aria-label="Viewport zoom controls"><button type="button" aria-label="Home view" title="Home view" onClick={fit}><Home size={13}/></button><button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom<=1} onClick={()=>setViewport(value=>zoomViewport(value,value.zoom-.25,{x:frameSize.width/2,y:frameSize.height/2},viewSize))}><Minus size={13}/></button><output aria-live="polite">{Math.round(zoom*100)}%</output><button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom>=6} onClick={()=>setViewport(value=>zoomViewport(value,value.zoom+.25,{x:frameSize.width/2,y:frameSize.height/2},viewSize))}><Plus size={13}/></button><button type="button" aria-label="Fit drawing" title="Fit drawing" onClick={fit}><RotateCcw size={13}/></button></div>
     </div>

    </div>
   </div>
   <div className={styles.toolPalette} role="toolbar" aria-label="Canvas tools">
    <button type="button" aria-label="Select element" title="Select element" aria-pressed={activeTool==='select'} className={activeTool==='select'?styles.toolActive:''} onClick={()=>setTool('select')}><MousePointer2 size={15} aria-hidden="true"/></button>
    <button type="button" aria-label="Pan drawing" title="Pan drawing" aria-pressed={activeTool==='pan'} className={activeTool==='pan'?styles.toolActive:''} onClick={()=>setTool('pan')}><Hand size={15} aria-hidden="true"/></button>
    {tab==='2d'&&<button type="button" aria-label="Measure distance" title="Measure: click two points" aria-pressed={activeTool==='measure'} className={activeTool==='measure'?styles.toolActive:''} onClick={()=>{setMeasure([]);setTool('measure');}}><Ruler size={15} aria-hidden="true"/></button>}
    {!readOnly&&<button type="button" aria-label="Add comment" title="Comment on a room" aria-pressed={tool==='comment'} className={tool==='comment'?styles.toolActive:''} disabled={!annotationsReady} onClick={startCommentTool}><MessageSquarePlus size={15} aria-hidden="true"/></button>}
    <button type="button" aria-label={`All comments, ${openComments.length} open`} title="All comments" aria-expanded={commentPanel==='list'} className={commentPanel==='list'?styles.toolActive:''} disabled={!annotationsReady} onClick={openCommentList}><MessagesSquare size={15} aria-hidden="true"/>{openComments.length>0&&<span className={styles.commentCount}>{openComments.length}</span>}</button>
    <button type="button" aria-label="Fit drawing to view" title="Fit to view" onClick={fit}><MaximizeIcon/></button>
   </div>
     {commentPanel!=='closed'&&<section ref={commentDialog} tabIndex={-1} className={styles.commentPopover} role="dialog" aria-label={commentPanel==='list'?'All plan comments':'Room comment'} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeComments();}}}>
      <div className={styles.commentTop}><strong>{commentPanel==='list'?'Comments':commentPanel==='draft'?(draft?.commentId?`Edit comment #${savedComment?.number??''}`:'New comment'):`Comment #${displayedComment?.number??''}`}</strong>{commentPanel==='list'&&<span className={styles.commentTotal}>{annotations.comments.length}</span>}<button type="button" aria-label="Close comment panel" title="Close" onClick={closeComments}><X size={14}/></button></div>
      {commentPanel==='list'?<div className={styles.commentBody}>
        {draft&&<div className={styles.draftNotice}><p>An unsent draft is saved for {drawing.graph.rooms.find(row=>row.key===draft.roomKey)?.name??'this room'}{readOnly?'. Open the editable plan view to continue it.':'.'}</p>{!readOnly&&<button type="button" onClick={()=>{setActiveCommentId(draft.commentId??'');setRoom(draft.roomKey);setCommentPanel('draft');}}>Continue draft</button>}</div>}
       {annotations.comments.length===0?<p className={styles.emptyComments}>No comments on this plan version yet.</p>:<>
        <h3>Open · {openComments.length}</h3>{openComments.length?openComments.slice().reverse().map(comment=><button type="button" key={comment.id} className={styles.commentRow} onClick={()=>openComment(comment)}><span className={styles.commentRowTitle}><b>#{comment.number} · {drawing.graph.rooms.find(row=>row.key===comment.roomKey)?.name??'Room'}</b><small>Open</small></span><span>{comment.text}</span></button>):<p className={styles.emptyComments}>No open comments.</p>}
        <details className={styles.resolvedList}><summary>Resolved · {annotations.comments.length-openComments.length}</summary>{annotations.comments.filter(comment=>comment.status==='resolved').slice().reverse().map(comment=><button type="button" key={comment.id} className={styles.commentRow} onClick={()=>openComment(comment)}><span className={styles.commentRowTitle}><b>#{comment.number} · {drawing.graph.rooms.find(row=>row.key===comment.roomKey)?.name??'Room'}</b><small>Resolved</small></span><span>{comment.text}</span></button>)}</details>
       </>}
       <small className={styles.localNote}>Comments stay in this browser for this exact plan version.</small>
      </div>:commentPanel==='draft'&&draft?<div className={styles.commentBody}>
       <div className={styles.commentAnchor}><MapPin size={12} aria-hidden="true"/><span>{commentRoom?.name??'Room'} · {tab==='3d'?'3D':'2D'} · v{drawing.version}</span></div>
        {readOnly?<p className={styles.commentText}>{draft.text||'Empty unsaved draft.'}</p>:<textarea ref={commentInput} aria-label="Edit room comment" maxLength={MAX_COMMENT_TEXT} value={draft.text} onChange={event=>setDraft({...draft,text:event.target.value})} placeholder="Describe the change you want…"/>}
        <small className={styles.localNote}>{readOnly?'This draft is read-only in the comparison view.':onAsk?'Saved locally for this exact plan version. It is never sent automatically.':'Local-only comment for this exact plan version; assistant handoff is unavailable here.'}</small>
       {statusMessage&&<p className={styles.commentStatus}>{statusMessage}</p>}
        {!readOnly&&<div className={styles.commentActions}><button type="button" className={styles.primaryAction} disabled={!draft.text.trim()} onClick={saveDraft}><Check size={13}/>{draft.commentId?'Save changes':'Save comment'}</button>{onAsk&&<button type="button" disabled={!draft.text.trim()} onClick={sendDraft}><ArrowUp size={13}/>Add to message</button>}<button type="button" onClick={discardDraft}>Discard draft</button></div>}
      </div>:displayedComment?<div className={styles.commentBody}>
       <div className={styles.commentAnchor}><MapPin size={12} aria-hidden="true"/><span>{commentRoom?.name??'Room'} · {tab==='3d'?'3D':'2D'} · v{drawing.version}</span></div>
       <p className={styles.commentText}>{displayedComment.text}</p>
        <small className={styles.localNote}>{onAsk?'Saved locally for this exact plan version. Add it to a message to ask the assistant.':'Local-only comment for this exact plan version; assistant handoff is unavailable here.'}</small>
       {statusMessage&&<p className={styles.commentStatus}>{statusMessage}</p>}
        <div className={styles.commentActions}>{!readOnly&&<button type="button" aria-label={`Edit comment ${displayedComment.number}`} title="Edit comment" onClick={()=>{setDraft({commentId:displayedComment.id,roomKey:displayedComment.roomKey,x:displayedComment.x,y:displayedComment.y,text:displayedComment.text});setCommentPanel('draft');}}><Pencil size={13}/></button>}{onAsk&&<button type="button" className={styles.primaryAction} aria-label={`Add comment ${displayedComment.number} to message`} title="Add to message" onClick={()=>sendSavedComment(displayedComment)}><ArrowUp size={13}/></button>}{!readOnly&&<><button type="button" aria-label={`${displayedComment.status==='open'?'Resolve':'Reopen'} comment ${displayedComment.number}`} title={displayedComment.status==='open'?'Resolve comment':'Reopen comment'} onClick={()=>toggleResolved(displayedComment)}>{displayedComment.status==='open'?<Check size={13}/>:<RotateCcw size={13}/>}</button><button type="button" className={styles.removeAction} aria-label={`Remove comment ${displayedComment.number}`} title="Remove comment" onClick={()=>removeComment(displayedComment)}><Trash2 size={13}/></button></>}</div>
      </div>:null}
     </section>}
     {statusMessage&&<span className={styles.srOnly} role="status" aria-live="polite">{statusMessage}</span>}
  </div>
   {source&&<div className={`plan-source-controls ${styles.sourceControls}`}><label><input type="checkbox" checked={overlay} onChange={event=>setOverlay(event.target.checked)}/>Reference overlay: {source.name}{source.page?` · page ${source.page}`:''}</label>{overlay&&<label>Opacity<input type="range" min={0} max={1} step={.05} value={opacity} onChange={event=>setOpacity(Number(event.target.value))} aria-label="Reference overlay opacity"/></label>}<small>{registered?`Source footprint registered to this exact graph; dimensions ${reference!.confirmed?'confirmed by you':'unconfirmed, review required'}. This is a proposed reconstruction.`:reference?'Source is stale or differs from this reconstruction. Choose its exact source before reviewing registration.':'Visual comparison only. Source scale and position are not registered to plan coordinates; this does not verify reconstruction.'}</small></div>}
  <div className={styles.canvasStatus}><span><MousePointer2 size={12} aria-hidden="true"/><span>{activeTool==='measure'?(measured?`Measured ${formatLength(measured)}`:measure.length?'Click the second point':'Click two points to measure'):pickedName?`${pickedName} selected`:selected?`${selected.name} selected`:'Select a room, wall or opening to inspect it'}</span></span><span>{drawing.graph.site.widthMm.toLocaleString()} × {drawing.graph.site.depthMm.toLocaleString()} mm · v{String(drawing.version).padStart(2,'0')}</span></div>
 </section>;
}

function MaximizeIcon(){return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
