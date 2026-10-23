'use client';
import dynamic from 'next/dynamic';
import {ArrowUp, Check, ChevronDown, Eye, Hand, Home, MapPin, MessageSquarePlus, MessagesSquare, Minus, MousePointer2, PanelRight, Pencil, Plus, RotateCcw, Settings2, Trash2, X} from 'lucide-react';
import {type FormEvent,type KeyboardEvent,type MouseEvent as ReactMouseEvent,type ReactNode,useCallback,useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import styles from './plan-canvas.module.css';
import {createCanvasAnnotationStore,EMPTY_ANNOTATIONS,EMPTY_ANNOTATION_SNAPSHOT,validRoomAnchor,type AnnotationData,type AnnotationIdentity,type AnnotationDraft,type ViewportComment} from './plan-canvas-annotations';

export {readCanvasAnnotations} from './plan-canvas-annotations';
export type {ViewportComment} from './plan-canvas-annotations';

const PlanThree=dynamic(()=>import('./plan-three').then(module=>module.PlanThree),{ssr:false,loading:()=> <p role="status">Loading 3D preview…</p>});
export type PlanGraph={site:{widthMm:number;depthMm:number};wallThicknessMm:number;wallHeightMm?:number;assumptions?:string[];rooms:{key:string;name:string;areaMm2:number;rect:number[]}[];walls?:{key:string;start:number[];end:number[]}[];openings?:{key:string;wallKey:string;kind:string;offsetMm:number;widthMm:number;heightMm:number;sillMm:number}[]};
export type DrawingVersion={planId:string;version:number;fingerprint:string;svg:string;lineworkSvg?:string;graph:PlanGraph};
export type ReferenceSource={id?:string;sha256?:string;name:string;image:string;page?:number};
export type ReferenceRecord={source:{id:string;sha256:string;name:string;page?:number;crop?:{x:number;y:number;width:number;height:number}};region:{x:number;y:number;width:number;height:number};observations:{elementKey:string;label:string;state:string}[];confirmed:boolean;stale:boolean};
type DisplayStyle='shaded'|'edges'|'wireframe';
type CanvasTool='select'|'pan'|'comment';
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
  {graph.rooms.map((room,index)=>{const [x0,y0,x1,y1]=room.rect;return <polygon key={room.key} points={[project(x0,y0),project(x1,y0),project(x1,y1),project(x0,y1)].join(' ')} fill={index%2?'#dce5df':'#e9e5dc'} stroke="#7b817e" strokeWidth=".8"/>;})}
 </svg>;
}

export function PlanCanvas({drawing,label='Selected plan',onStyleChange,source,reference,highlights=[],onSelectElement,selectedElement,onAsk,onProperties,voiceControl,canvasInputEnabled=true,persistentProperties=true,readOnly=false}:{drawing:DrawingVersion;label?:string;onStyleChange?:(view:'presentation'|'linework')=>void;source?:ReferenceSource;reference?:ReferenceRecord;highlights?:string[];onSelectElement?:(key:string)=>void;selectedElement?:string;onAsk?:(text:string)=>void;onProperties?:()=>void;voiceControl?:ReactNode|((onTranscript:(text:string)=>void)=>ReactNode);canvasInputEnabled?:boolean;persistentProperties?:boolean;readOnly?:boolean}){
 const id=useId(),identity={planId:drawing.planId,version:drawing.version,fingerprint:drawing.fingerprint};
 const firstRoom=drawing.graph.rooms.find(row=>row.key===selectedElement)?.key??(!selectedElement?drawing.graph.rooms[0]?.key??'':'');
 const storageKey=`datumm.plan-canvas.annotations.v1:${encodeURIComponent(drawing.planId)}:${drawing.version}:${drawing.fingerprint}`;
 const subscribeAnnotations=useCallback((listener:()=>void)=>typeof window==='undefined'?()=>{}:annotationStore.subscribe(storageKey,listener),[storageKey]);
 const getAnnotations=useCallback(()=>typeof window==='undefined'?EMPTY_ANNOTATION_SNAPSHOT:annotationStore.getSnapshot(storageKey),[storageKey]);
 const annotationState=useSyncExternalStore(subscribeAnnotations,getAnnotations,()=>EMPTY_ANNOTATION_SNAPSHOT);
 const annotationsReady=annotationState.loaded,annotations=annotationsReady?annotationState.data:EMPTY_ANNOTATIONS;
 const [overlay,setOverlay]=useState(false),[opacity,setOpacity]=useState(.35);
 const [zoom,setZoom]=useState(1),[fitRequest,setFitRequest]=useState(0),[view,setView]=useState<'presentation'|'linework'>('presentation'),[room,setRoom]=useState(firstRoom),[tab,setTab]=useState<'2d'|'3d'>('2d');
 const [displayStyle,setDisplayStyle]=useState<DisplayStyle>('edges'),[showGrid,setShowGrid]=useState(true),[showLabels,setShowLabels]=useState(true),[displayOpen,setDisplayOpen]=useState(false);
 const [tool,setTool]=useState<CanvasTool>('select'),[commentPanel,setCommentPanel]=useState<CommentPanel>('closed'),[activeCommentId,setActiveCommentId]=useState(''),[statusMessage,setStatusMessage]=useState('');
 const [askOpen,setAskOpen]=useState(true),[askDraft,setAskDraft]=useState(''),[frameSize,setFrameSize]=useState({width:0,height:0});
 const frame=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null),moved=useRef(false),askInput=useRef<HTMLInputElement>(null),reopen=useRef<HTMLButtonElement>(null),commentInput=useRef<HTMLTextAreaElement>(null),displayRef=useRef<HTMLDivElement>(null),displayButton=useRef<HTMLButtonElement>(null),previousIdentity=useRef(storageKey);
 const fit=()=>{setZoom(1);frame.current?.scrollTo(0,0);setFitRequest(value=>value+1);};
 const selected=drawing.graph.rooms.find(r=>r.key===room),selectedComment=annotations.comments.find(comment=>comment.id===activeCommentId),draft=annotations.draft;
 const clearWidth=selected?Math.max(0,selected.rect[2]-selected.rect[0]-drawing.graph.wallThicknessMm):drawing.graph.site.widthMm;
 const clearDepth=selected?Math.max(0,selected.rect[3]-selected.rect[1]-drawing.graph.wallThicknessMm):drawing.graph.site.depthMm;
 const activeTool=readOnly&&tool==='comment'?'select':tool;
 const svg=view==='linework'?drawing.lineworkSvg??drawing.svg:drawing.svg;
 const bounds=svg.match(/viewBox=["']([^"']+)["']/)?.[1].trim().split(/[\s,]+/).map(Number)??[-1100,-1100,drawing.graph.site.widthMm+2200,drawing.graph.site.depthMm+3400];
 const can3d=Boolean(drawing.graph.walls?.length&&drawing.graph.openings&&drawing.graph.wallHeightMm);
 const registered=Boolean(reference&&!reference.stale&&source?.id===reference.source.id&&source?.sha256===reference.source.sha256);
 const openComments=annotations.comments.filter(comment=>comment.status==='open');
 const commentsDirty=draft?draft.commentId?annotations.comments.find(comment=>comment.id===draft.commentId)?.text!==draft.text:Boolean(draft.text):false;
 const savedComment=annotations.comments.find(comment=>comment.id===draft?.commentId);
 const scalePxPerMm=frameSize.width&&frameSize.height&&bounds.length===4&&bounds[2]>0&&bounds[3]>0?Math.min(frameSize.width/bounds[2],frameSize.height/bounds[3])*zoom:0;
 const scaleMm=scalePxPerMm?([10000,5000,2000,1000,500,200,100,50,20,10].find(value=>value*scalePxPerMm<=78)??10):2000;
 const scaleWidth=Math.min(78,scaleMm*scalePxPerMm||78);

 useEffect(()=>{annotationStore.load(storageKey,identity,drawing.graph.rooms);},[storageKey,drawing.planId,drawing.version,drawing.fingerprint,drawing.graph.rooms]);
 useEffect(()=>{
  if(previousIdentity.current===storageKey)return;
  previousIdentity.current=storageKey;setRoom('');setTool('select');setCommentPanel('closed');setActiveCommentId('');setZoom(1);frame.current?.scrollTo(0,0);
 },[storageKey]);
 useEffect(()=>{
  if(selectedElement&&drawing.graph.rooms.some(row=>row.key===selectedElement)){setRoom(selectedElement);return;}
  const fallback=!selectedElement?drawing.graph.rooms[0]:undefined;
  if(fallback){setRoom(fallback.key);onSelectElement?.(fallback.key);}
 },[selectedElement,drawing.graph.rooms,onSelectElement]);
 useEffect(()=>{
  const element=frame.current;if(!element)return;
  const observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(rect)setFrameSize({width:rect.width,height:rect.height});});
  observer.observe(element);return()=>observer.disconnect();
 },[tab]);
 useEffect(()=>{
  if(!displayOpen)return;
  const dismiss=(event:PointerEvent)=>{if(!displayRef.current?.contains(event.target as Node))setDisplayOpen(false);};
  const escape=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape'){setDisplayOpen(false);displayButton.current?.focus();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[displayOpen]);
 useEffect(()=>{if(commentPanel==='draft')requestAnimationFrame(()=>commentInput.current?.focus());},[commentPanel]);

 const updateAnnotations=(update:(current:AnnotationData)=>AnnotationData)=>annotationStore.update(storageKey,identity,update);
 const setDraft=(next:AnnotationDraft|null)=>updateAnnotations(current=>({...current,draft:next}));
 const choose=(key:string)=>{if(!drawing.graph.rooms.some(row=>row.key===key))return;setRoom(key);onSelectElement?.(key);};
 const forwardAsk=(text:string,roomKey=room)=>{
  if(!text.trim()||!onAsk)return;
  const selectedRoom=drawing.graph.rooms.find(row=>row.key===roomKey),roomContext=selectedRoom?`${selectedRoom.name} (${selectedRoom.key})`:'all rooms';
  const viewContext=tab==='3d'?'3D cutaway':`2D floor plan · ${view==='linework'?'linework':'presentation'}`;
  onAsk(`${text.trim()}\n\nViewport context: ${viewContext}; room: ${roomContext}; planId: ${drawing.planId}; version: ${drawing.version}; fingerprint: ${drawing.fingerprint}.`);
 };
 const ask=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!askDraft.trim()||!onAsk)return;forwardAsk(askDraft);setAskDraft('');};
 const tabKey=(event:KeyboardEvent<HTMLButtonElement>,current:'2d'|'3d')=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const next=event.key==='Home'?'2d':event.key==='End'?(can3d?'3d':'2d'):current==='2d'?(event.key==='ArrowRight'&&can3d?'3d':'2d'):(event.key==='ArrowLeft'?'2d':'3d');
  setTab(next);requestAnimationFrame(()=>document.getElementById(`${id}-tab-${next}`)?.focus());
 };
 const closeAsk=()=>{setAskOpen(false);requestAnimationFrame(()=>reopen.current?.focus());};
 const openAsk=()=>{setAskOpen(true);requestAnimationFrame(()=>askInput.current?.focus());};
 const retryAnnotations=()=>{
  const wasReadError=!annotationStore.getSnapshot(storageKey).loaded,ok=annotationStore.retry(storageKey,identity,drawing.graph.rooms);
  setStatusMessage(ok?wasReadError?'Local comments loaded.':'Local comments saved in this browser.':'Local comments could not be saved. Retry when browser storage is available.');
 };
 const beginDraft=(roomKey:string,x:number,y:number)=>{
  if(readOnly||!annotationsReady||!validRoomAnchor(drawing.graph.rooms,roomKey,x,y))return;
  if(commentsDirty){setCommentPanel('draft');setStatusMessage('Save or discard the current comment draft before starting another.');return;}
  choose(roomKey);setActiveCommentId('');setDraft({roomKey,x,y,text:''});setCommentPanel('draft');setStatusMessage('');
 };
 const openComment=(comment:ViewportComment)=>{
  if(!annotationsReady)return;
  if(!readOnly&&draft&&draft.commentId!==comment.id&&(!draft.commentId||commentsDirty)){setCommentPanel('draft');setStatusMessage('Save or discard the current comment draft before switching comments.');return;}
  if(!readOnly&&draft?.commentId&&draft.commentId!==comment.id&&!commentsDirty)setDraft(null);
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
 const openCommentList=()=>{setCommentPanel('list');setActiveCommentId('');setStatusMessage('');};
 const handleCanvasClick=(event:ReactMouseEvent<HTMLImageElement>)=>{
   if(moved.current||activeTool==='pan'||bounds.length!==4||bounds.some(value=>!Number.isFinite(value)))return;
  const box=event.currentTarget.getBoundingClientRect(),[bx,by,width,height]=bounds,scale=Math.min(box.width/width,box.height/height);
  if(!scale)return;
  const x=(event.clientX-box.left-(box.width-width*scale)/2)/scale+bx,y=drawing.graph.site.depthMm-((event.clientY-box.top-(box.height-height*scale)/2)/scale+by);
  const hit=drawing.graph.rooms.find(row=>x>=row.rect[0]&&x<=row.rect[2]&&y>=row.rect[1]&&y<=row.rect[3]);
   if(!hit){if(activeTool==='comment')setStatusMessage('Place comments inside a room on this plan.');return;}
   if(activeTool==='comment')beginDraft(hit.key,x,y);else choose(hit.key);
 };
 const commentKey=(event:KeyboardEvent<SVGGElement>,comment:ViewportComment)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openComment(comment);}};
 const displayedComment=selectedComment??annotations.comments.find(comment=>comment.id===activeCommentId);
 const commentRoom=draft?drawing.graph.rooms.find(row=>row.key===draft.roomKey):displayedComment?drawing.graph.rooms.find(row=>row.key===displayedComment.roomKey):undefined;

 return <section className={`plan-canvas ${styles.planCanvas}`} aria-label={label}>
  <div className={styles.tabs}><div className={styles.viewTabs} role="tablist" aria-label="Design views">
   <button type="button" id={`${id}-tab-2d`} className={styles.tab} role="tab" aria-controls={`${id}-panel`} aria-selected={tab==='2d'} tabIndex={tab==='2d'?0:-1} onKeyDown={event=>tabKey(event,'2d')} onClick={()=>setTab('2d')}>
    <span className={styles.thumbnail}><img alt="" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(drawing.svg)}/></span><span className={styles.tabCopy}><strong>2D floor plan</strong><small>Plan v{drawing.version}</small></span>
   </button>
   <button type="button" id={`${id}-tab-3d`} className={styles.tab} role="tab" aria-controls={`${id}-panel`} aria-selected={tab==='3d'} tabIndex={tab==='3d'?0:-1} disabled={!can3d} title={!can3d?'Full shared geometry is unavailable for this drawing':undefined} onKeyDown={event=>tabKey(event,'3d')} onClick={()=>setTab('3d')}>
    <span className={styles.thumbnail}><CutawayThumbnail graph={drawing.graph}/></span><span className={styles.tabCopy}><strong>3D cutaway</strong><small>Same geometry · v{drawing.version}</small></span>
   </button>
   </div>
   {!readOnly&&<button type="button" className={`${styles.annotateButton} ${tool==='comment'?styles.active:''}`} aria-pressed={tool==='comment'} disabled={!annotationsReady} onClick={toggleAnnotate}><MessageSquarePlus size={14} aria-hidden="true"/>Annotate</button>}
   <div className={styles.displayControl} ref={displayRef}><button ref={displayButton} type="button" className={styles.displayButton} aria-expanded={displayOpen} aria-controls={`${id}-display`} onClick={()=>setDisplayOpen(open=>!open)}><Settings2 size={14} aria-hidden="true"/><span>Display</span><ChevronDown size={12} aria-hidden="true"/></button>
    {displayOpen&&<section className={styles.displayPanel} id={`${id}-display`} aria-label="Display settings" role="dialog">
     {tab==='2d'?<><strong>2D view style</strong><div className={styles.displayOptions} role="group" aria-label="2D view style"><button type="button" aria-pressed={view==='presentation'} onClick={()=>{setView('presentation');onStyleChange?.('presentation');}}>Presentation</button><button type="button" aria-pressed={view==='linework'} disabled={!drawing.lineworkSvg} onClick={()=>{setView('linework');onStyleChange?.('linework');}}>Linework</button></div><label><span>Grid</span><input type="checkbox" checked={showGrid} onChange={event=>setShowGrid(event.target.checked)}/></label></>:<><strong>Visual style · 3D</strong><div className={styles.displayOptions} role="group" aria-label="3D visual style">{(['shaded','edges','wireframe'] as const).map(style=><button key={style} type="button" aria-pressed={displayStyle===style} onClick={()=>setDisplayStyle(style)}>{style==='wireframe'?'Wire':style[0].toUpperCase()+style.slice(1)}</button>)}</div><label><span>Grid</span><input type="checkbox" checked={showGrid} onChange={event=>setShowGrid(event.target.checked)}/></label><label><span>Room labels</span><input type="checkbox" checked={showLabels} onChange={event=>setShowLabels(event.target.checked)}/></label></>}
     <p>Display preferences affect the preview. Geometry and native review stay separate.</p>
    </section>}
   </div>
   {onAsk&&canvasInputEnabled&&!askOpen&&<button ref={reopen} className={styles.reopenAsk} type="button" aria-controls={`${id}-viewport-form`} aria-expanded="false" aria-label="Reopen floating viewport input" title="Ask DATUMM" onClick={openAsk}><Eye size={14}/></button>}
  </div>
  <div className={styles.viewport} id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} tabIndex={0}>
    {annotationState.error&&<div className={styles.persistenceAlert} role="alert"><span>{readOnly?annotationState.errorKind==='read'?'Could not read local comments. Open the editable plan view to retry.':'Could not save local comments. Changes remain in memory; open the editable plan view to retry.':annotationState.errorKind==='read'?'Could not read local comments. Retry to load them.':'Could not save local comments. Changes remain in memory; retry before leaving this plan.'}</span>{!readOnly&&<button type="button" onClick={retryAnnotations}>Retry</button>}</div>}
    {tab==='3d'?<PlanThree graph={drawing.graph} fingerprint={drawing.fingerprint} room={room} highlights={highlights} onSelect={choose} displayStyle={displayStyle} onDisplayStyleChange={setDisplayStyle} showGrid={showGrid} onShowGridChange={setShowGrid} showLabels={showLabels} onShowLabelsChange={setShowLabels} tool={activeTool} fitRequest={fitRequest} comments={annotationsReady?annotations.comments:[]} selectedCommentId={activeCommentId||undefined} onSelectComment={commentId=>{const comment=annotations.comments.find(row=>row.id===commentId);if(comment)openComment(comment);}} onAddComment={addCommentAt}/>:<>
     <div className={`${styles.drawingFrame} ${showGrid?styles.grid:''}`} ref={frame} tabIndex={0} role="region" aria-label="Plan drawing. Use arrow keys to pan, plus or minus to zoom, zero to fit." data-tool={activeTool}
     onWheel={event=>{if(event.ctrlKey){event.preventDefault();setZoom(value=>Math.max(1,Math.min(6,value+(event.deltaY<0?.25:-.25))));}}}
     onKeyDown={event=>{const directions:Record<string,[number,number]>={ArrowLeft:[-80,0],ArrowRight:[80,0],ArrowUp:[0,-80],ArrowDown:[0,80]};if(directions[event.key]){event.preventDefault();const [left,top]=directions[event.key];frame.current?.scrollBy({left,top});}else if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')fit();else setZoom(value=>Math.max(1,Math.min(6,value+(event.key==='-'?-.25:.25))));}}}
     onPointerDown={event=>{moved.current=false;if(event.button!==0||tool!=='pan'&&zoom===1)return;drag.current={x:event.clientX,y:event.clientY,left:event.currentTarget.scrollLeft,top:event.currentTarget.scrollTop};event.currentTarget.setPointerCapture(event.pointerId);}}
     onPointerMove={event=>{if(drag.current){if(Math.hypot(drag.current.x-event.clientX,drag.current.y-event.clientY)>4)moved.current=true;event.currentTarget.scrollLeft=drag.current.left+drag.current.x-event.clientX;event.currentTarget.scrollTop=drag.current.top+drag.current.y-event.clientY;}}}
     onPointerUp={event=>{drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}} onPointerCancel={()=>{drag.current=null;}}>
     <div className={styles.drawingLayers} style={{width:`${zoom*100}%`,height:`${zoom*100}%`}}>
      {source&&overlay&&(registered?<svg className={styles.sourceOverlay} viewBox={bounds.join(' ')} role="img" aria-label={`Registered reference ${source.name}`} style={{opacity}}><image href={source.image} x={-reference!.region.x*drawing.graph.site.widthMm/reference!.region.width} y={-reference!.region.y*drawing.graph.site.depthMm/reference!.region.height} width={drawing.graph.site.widthMm/reference!.region.width} height={drawing.graph.site.depthMm/reference!.region.height} preserveAspectRatio="none"/></svg>:<img className={styles.sourceOverlay} src={source.image} alt={`Reference ${source.name}`} style={{opacity}}/>)}
      {selected&&<svg className={styles.highlightOverlay} viewBox={bounds.join(' ')} aria-hidden="true"><rect x={selected.rect[0]+drawing.graph.wallThicknessMm/2} y={drawing.graph.site.depthMm-selected.rect[3]+drawing.graph.wallThicknessMm/2} width={clearWidth} height={clearDepth} fill="#3456a01c" stroke="#3456a0" strokeWidth={35}/></svg>}
      {highlights.length>0&&<svg className={styles.highlightOverlay} viewBox={bounds.join(' ')} aria-label="Walkthrough geometry highlights" role="img">{drawing.graph.rooms.filter(row=>highlights.includes(row.key)).map(row=><rect key={row.key} x={row.rect[0]} y={drawing.graph.site.depthMm-row.rect[3]} width={row.rect[2]-row.rect[0]} height={row.rect[3]-row.rect[1]} fill="#228b6733" stroke="#17694f" strokeWidth={70}/>)}{(drawing.graph.walls??[]).filter(row=>highlights.includes(row.key)||(drawing.graph.openings??[]).some(opening=>highlights.includes(opening.key)&&opening.wallKey===row.key)).map(row=><line key={row.key} x1={row.start[0]} y1={drawing.graph.site.depthMm-row.start[1]} x2={row.end[0]} y2={drawing.graph.site.depthMm-row.end[1]} stroke="#17694f" strokeWidth={100}/>)}{highlights.includes('site')&&<rect x={0} y={0} width={drawing.graph.site.widthMm} height={drawing.graph.site.depthMm} fill="none" stroke="#17694f" strokeWidth={100}/>}</svg>}
      <img draggable={false} className={styles.planImage} alt={`${label} version ${drawing.version}. Exact ${drawing.graph.site.widthMm} × ${drawing.graph.site.depthMm} mm footprint; room sizes in millimetres.`} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)} onClick={handleCanvasClick}/>
      <svg className={styles.annotationLayer} viewBox={bounds.join(' ')} role="group" aria-label="Room comments">{annotationsReady&&openComments.map(comment=>{const commentRoom=drawing.graph.rooms.find(row=>row.key===comment.roomKey);return <g key={comment.id} className={`${styles.commentPin} ${comment.id===activeCommentId?styles.selectedPin:''}`} transform={`translate(${comment.x} ${drawing.graph.site.depthMm-comment.y})`} role="button" tabIndex={0} aria-label={`Comment ${comment.number} in ${commentRoom?.name??'room'}: ${comment.text}`} onClick={event=>{event.stopPropagation();openComment(comment);}} onKeyDown={event=>commentKey(event,comment)}><circle r="240"/><text textAnchor="middle" dy=".35em">{comment.number}</text></g>;})}</svg>
     </div>
     <div className={styles.viewCaption}><span>{tab==='2d'?'2D':'3D'} · {view==='linework'?'Linework':'Presentation'}</span><strong>{label}</strong><small>Proposed geometry · v{drawing.version}</small></div>
     <div className={styles.northMark} aria-label="North"><span>N</span><svg viewBox="0 0 24 32" aria-hidden="true"><path d="M12 1 19 21 12 17 5 21 12 1Z" fill="currentColor"/><path d="M12 17v14" stroke="currentColor" strokeWidth="1.5"/></svg></div>
     <div className={styles.canvasFoot}>
      <div className={styles.scaleBar} aria-label={`Scale bar, ${scaleMm>=1000?`${scaleMm/1000} metres`:`${scaleMm} millimetres`}`}><span style={{width:`${scaleWidth}px`}}/><small>0 <b>{scaleMm>=1000?`${scaleMm/1000} m`:`${scaleMm} mm`}</b></small></div>
      <div className={styles.zoomControls} role="group" aria-label="Viewport zoom controls"><button type="button" aria-label="Home view" title="Home view" onClick={fit}><Home size={13}/></button><button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.25))}><Minus size={13}/></button><output aria-live="polite">{Math.round(zoom*100)}%</output><button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom>=6} onClick={()=>setZoom(value=>Math.min(6,value+.25))}><Plus size={13}/></button><button type="button" aria-label="Fit drawing" title="Fit drawing" onClick={fit}><RotateCcw size={13}/></button></div>
     </div>

    </div>
   </>}
   <div className={styles.toolPalette} role="toolbar" aria-label="Canvas tools">
    <button type="button" aria-label="Select element" title="Select element" aria-pressed={activeTool==='select'} className={activeTool==='select'?styles.toolActive:''} onClick={()=>setTool('select')}><MousePointer2 size={15} aria-hidden="true"/></button>
    <button type="button" aria-label="Pan drawing" title="Pan drawing" aria-pressed={activeTool==='pan'} className={activeTool==='pan'?styles.toolActive:''} onClick={()=>setTool('pan')}><Hand size={15} aria-hidden="true"/></button>
    {!readOnly&&<button type="button" aria-label="Add comment" title="Comment on a room" aria-pressed={tool==='comment'} className={tool==='comment'?styles.toolActive:''} disabled={!annotationsReady} onClick={startCommentTool}><MessageSquarePlus size={15} aria-hidden="true"/></button>}
    <button type="button" aria-label={`All comments, ${openComments.length} open`} title="All comments" aria-expanded={commentPanel==='list'} className={commentPanel==='list'?styles.toolActive:''} disabled={!annotationsReady} onClick={openCommentList}><MessagesSquare size={15} aria-hidden="true"/>{openComments.length>0&&<span className={styles.commentCount}>{openComments.length}</span>}</button>
    <button type="button" aria-label="Fit drawing to view" title="Fit to view" onClick={fit}><MaximizeIcon/></button>
   </div>
     {onAsk&&canvasInputEnabled&&<>
      {askOpen?<form className={styles.askForm} id={`${id}-viewport-form`} onSubmit={ask}><label className={styles.srOnly} htmlFor={`${id}-viewport-input`}>Ask about this viewport</label><Eye size={15} aria-hidden="true"/><input ref={askInput} id={`${id}-viewport-input`} value={askDraft} onChange={event=>setAskDraft(event.target.value)} maxLength={2000} placeholder="Ask about this view…"/><span className={styles.askContext} title={`${selected?.name??'All rooms'} · ${tab==='3d'?'3D':'2D'} · version ${drawing.version}`}>{selected?.name??'All rooms'} · {tab==='3d'?'3D':'2D'} · v{drawing.version}</span>{typeof voiceControl==='function'?voiceControl(forwardAsk):voiceControl}<button type="submit" disabled={!askDraft.trim()} aria-label="Send viewport context"><ArrowUp size={15}/></button><button type="button" onClick={closeAsk} aria-label="Close floating viewport input" title="Close input"><X size={14}/></button></form> :null}
     </>}
     {commentPanel!=='closed'&&<section className={styles.commentPopover} role="dialog" aria-label={commentPanel==='list'?'All plan comments':'Room comment'}>
      <div className={styles.commentTop}><strong>{commentPanel==='list'?'Comments':commentPanel==='draft'?(draft?.commentId?`Edit comment #${savedComment?.number??''}`:'New comment'):`Comment #${displayedComment?.number??''}`}</strong><button type="button" aria-label="Close comment panel" title="Close" onClick={()=>setCommentPanel('closed')}><X size={14}/></button></div>
      {commentPanel==='list'?<div className={styles.commentBody}>
        {draft&&<div className={styles.draftNotice}><p>An unsent draft is saved for {drawing.graph.rooms.find(row=>row.key===draft.roomKey)?.name??'this room'}{readOnly?'. Open the editable plan view to continue it.':'.'}</p>{!readOnly&&<button type="button" onClick={()=>{setActiveCommentId(draft.commentId??'');setRoom(draft.roomKey);setCommentPanel('draft');}}>Continue draft</button>}</div>}
       {annotations.comments.length===0?<p className={styles.emptyComments}>No comments on this plan version yet.</p>:<>
        <h3>Open · {openComments.length}</h3>{openComments.length?openComments.slice().reverse().map(comment=><button type="button" key={comment.id} className={styles.commentRow} onClick={()=>openComment(comment)}><span className={styles.commentRowTitle}><b>#{comment.number} · {drawing.graph.rooms.find(row=>row.key===comment.roomKey)?.name??'Room'}</b><small>Open</small></span><span>{comment.text}</span></button>):<p className={styles.emptyComments}>No open comments.</p>}
        <details className={styles.resolvedList}><summary>Resolved · {annotations.comments.length-openComments.length}</summary>{annotations.comments.filter(comment=>comment.status==='resolved').slice().reverse().map(comment=><button type="button" key={comment.id} className={styles.commentRow} onClick={()=>openComment(comment)}><span className={styles.commentRowTitle}><b>#{comment.number} · {drawing.graph.rooms.find(row=>row.key===comment.roomKey)?.name??'Room'}</b><small>Resolved</small></span><span>{comment.text}</span></button>)}</details>
       </>}
      </div>:commentPanel==='draft'&&draft?<div className={styles.commentBody}>
       <div className={styles.commentAnchor}><MapPin size={12} aria-hidden="true"/><span>{commentRoom?.name??'Room'} · {tab==='3d'?'3D':'2D'} · v{drawing.version}</span></div>
        {readOnly?<p className={styles.commentText}>{draft.text||'Empty unsaved draft.'}</p>:<textarea ref={commentInput} aria-label="Edit room comment" maxLength={MAX_COMMENT_TEXT} value={draft.text} onChange={event=>setDraft({...draft,text:event.target.value})} placeholder="Describe the change you want…"/>}
        <small className={styles.localNote}>{readOnly?'This draft is read-only in the comparison view.':onAsk?'Saved locally for this exact plan version. It is never sent automatically.':'Local-only comment for this exact plan version; assistant handoff is unavailable here.'}</small>
       {statusMessage&&<p className={styles.commentStatus}>{statusMessage}</p>}
        {!readOnly&&<div className={styles.commentActions}><button type="button" className={styles.primaryAction} disabled={!draft.text.trim()} onClick={saveDraft}><Check size={13}/>{draft.commentId?'Save changes':'Save comment'}</button>{onAsk&&<button type="button" disabled={!draft.text.trim()} onClick={sendDraft}><ArrowUp size={13}/>Add to message</button>}<button type="button" onClick={discardDraft}>Discard draft</button></div>}
      </div>:displayedComment?<div className={styles.commentBody}>
       <div className={styles.commentAnchor}><MapPin size={12} aria-hidden="true"/><span>{commentRoom?.name??'Room'} · {tab==='3d'?'3D':'2D'} · v{drawing.version}</span></div>
       <p className={styles.commentText}>{displayedComment.text}</p>
        {!onAsk&&<small className={styles.localNote}>Local-only comment for this exact plan version; assistant handoff is unavailable here.</small>}
       {statusMessage&&<p className={styles.commentStatus}>{statusMessage}</p>}
        <div className={styles.commentActions}>{!readOnly&&<button type="button" aria-label={`Edit comment ${displayedComment.number}`} title="Edit comment" onClick={()=>{setDraft({commentId:displayedComment.id,roomKey:displayedComment.roomKey,x:displayedComment.x,y:displayedComment.y,text:displayedComment.text});setCommentPanel('draft');}}><Pencil size={13}/></button>}{onAsk&&<button type="button" className={styles.primaryAction} aria-label={`Add comment ${displayedComment.number} to message`} title="Add to message" onClick={()=>sendSavedComment(displayedComment)}><ArrowUp size={13}/></button>}{!readOnly&&<><button type="button" aria-label={`${displayedComment.status==='open'?'Resolve':'Reopen'} comment ${displayedComment.number}`} title={displayedComment.status==='open'?'Resolve comment':'Reopen comment'} onClick={()=>toggleResolved(displayedComment)}>{displayedComment.status==='open'?<Check size={13}/>:<RotateCcw size={13}/>}</button><button type="button" className={styles.removeAction} aria-label={`Remove comment ${displayedComment.number}`} title="Remove comment" onClick={()=>removeComment(displayedComment)}><Trash2 size={13}/></button></>}</div>
      </div>:null}
     </section>}
     {statusMessage&&<span className={styles.srOnly} role="status" aria-live="polite">{statusMessage}</span>}
  </div>
   {source&&<div className={`plan-source-controls ${styles.sourceControls}`}><label><input type="checkbox" checked={overlay} onChange={event=>setOverlay(event.target.checked)}/>Reference overlay: {source.name}{source.page?` · page ${source.page}`:''}</label>{overlay&&<label>Opacity<input type="range" min={0} max={1} step={.05} value={opacity} onChange={event=>setOpacity(Number(event.target.value))} aria-label="Reference overlay opacity"/></label>}<small>{registered?`Source footprint registered to this exact graph; dimensions ${reference!.confirmed?'confirmed by you':'unconfirmed, review required'}. This is a proposed reconstruction.`:reference?'Source is stale or differs from this reconstruction. Choose its exact source before reviewing registration.':'Visual comparison only. Source scale and position are not registered to plan coordinates; this does not verify reconstruction.'}</small></div>}
  {persistentProperties&&<div className={styles.properties} aria-label="Persistent geometry properties">
   <div className={`${styles.propertyGlyph} ${selected?styles.selectedRoomGlyph:''}`} aria-hidden="true"><span/></div>
   <div className={styles.propertyName}><strong>{selected?.name??'Plan geometry'}</strong><small>{selected?'Room · level not provided':`Plan · version ${drawing.version}`}</small></div>
   <dl className={styles.propertyMetrics}>
    <div><dt>AREA</dt><dd>{((selected?.areaMm2??drawing.graph.site.widthMm*drawing.graph.site.depthMm)/1e6).toFixed(1)} m²</dd></div>
    <div><dt>WIDTH · mm</dt><dd>{clearWidth.toLocaleString()}</dd></div>
    <div><dt>DEPTH · mm</dt><dd>{clearDepth.toLocaleString()}</dd></div>
    <div><dt>HEIGHT · mm</dt><dd>{drawing.graph.wallHeightMm?.toLocaleString()??'—'}</dd></div>
    <div><dt>WALL · mm</dt><dd>{drawing.graph.wallThicknessMm.toLocaleString()}</dd></div>
   </dl>
   {onProperties?<button type="button" className={styles.propertyDetailsButton} aria-label="Open detailed properties" title="Detailed properties" onClick={onProperties}><PanelRight size={15} aria-hidden="true"/></button>:<details className={styles.propertyDetails}><summary aria-label="Open detailed properties" title="Detailed properties"><PanelRight size={15} aria-hidden="true"/></summary><div className={styles.detailsPopover}><strong>Geometry properties</strong><label>Room<select aria-label="Select room" value={room} onChange={event=>choose(event.target.value)}><option value="">Plan geometry</option>{drawing.graph.rooms.map(row=><option key={row.key} value={row.key}>{row.name}</option>)}</select></label><p>{selected?`${selected.name} · ${selected.areaMm2.toLocaleString()} mm²`:'Full footprint'}<br/>{drawing.graph.site.widthMm.toLocaleString()} × {drawing.graph.site.depthMm.toLocaleString()} mm</p><small>Plan {drawing.planId} · v{drawing.version}<br/>Fingerprint {drawing.fingerprint}<br/>Proposed geometry · not an imported RVT model</small></div></details>}
  </div>}
  <div className={styles.canvasStatus}><span><MousePointer2 size={12} aria-hidden="true"/><span>{selected?`${selected.name} selected`:'Select a room to inspect its dimensions'}</span></span><span>{drawing.graph.site.widthMm.toLocaleString()} × {drawing.graph.site.depthMm.toLocaleString()} mm · v{String(drawing.version).padStart(2,'0')}</span></div>
 </section>;
}

function MaximizeIcon(){return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
