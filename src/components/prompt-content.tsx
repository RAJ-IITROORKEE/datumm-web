import {MousePointer2,X,ArrowUp,ArrowDown} from 'lucide-react';

export type ViewportAnnotation={id:string;number:number;note:string;roomKey:string;roomName:string;anchorMm:{x:number;y:number};planId:string;version:number;fingerprint:string;view:'2d'|'3d';intent?:'question'|'revise'};
export type ViewportReference={label:string;context:string;annotation?:ViewportAnnotation;note?:string};
function annotationValue(raw:string):ViewportAnnotation|null{
 try{
  if(raw.length>12000)return null;
  const row=JSON.parse(raw),bounded=(value:unknown,max:number)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
  if(!row||!bounded(row.id,96)||!Number.isInteger(row.number)||row.number<1||row.number>100||typeof row.note!=='string'||row.note.length>2000||!bounded(row.roomKey,128)||!bounded(row.roomName,240)||!bounded(row.planId,128)||!Number.isSafeInteger(row.version)||row.version<1||typeof row.fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(row.fingerprint)||!['2d','3d'].includes(row.view)||!row.anchorMm||!['x','y'].every(key=>typeof row.anchorMm[key]==='number'&&Number.isFinite(row.anchorMm[key])&&Math.abs(row.anchorMm[key])<=50000)||row.intent!==undefined&&!['question','revise'].includes(row.intent))return null;
  return {id:row.id,number:row.number,note:row.note,roomKey:row.roomKey,roomName:row.roomName,anchorMm:{x:row.anchorMm.x,y:row.anchorMm.y},planId:row.planId,version:row.version,fingerprint:row.fingerprint,view:row.view,intent:row.intent??'question'};
 }catch{return null;}
}

export function referenceContext(reference:ViewportReference){return reference.annotation?'Viewport annotation: '+JSON.stringify(reference.annotation):[reference.note,reference.context].filter(Boolean).join('\n\n');}

export function splitViewportPrompt(value:string){
 const references:ViewportReference[]=[],parts:string[]=[];let cursor=0;
 for(const match of Array.from(value.matchAll(/(?:^|\n\n?)(Viewport (?:context|annotation): [^\n]+)/g))){
  const context=match[1],before=value.slice(cursor,match.index),annotation=context.startsWith('Viewport annotation: ')?annotationValue(context.slice('Viewport annotation: '.length)):null;
  if(annotation){parts.push(before);references.push({label:`Annotation ${annotation.number} · ${annotation.roomName}`,context,annotation});cursor=match.index!+match[0].length;continue;}
  if(context.startsWith('Viewport annotation: '))continue;
  const version=context.match(/; version:? (\d+);/),identity=context.match(/planId:? [^;\s]+; version:? \d+; fingerprint:? [a-f0-9]{64}(?:[;. ]|$)/i);
  if(!version||!identity)continue;
  const rawRoom=context.match(/room: (.*?); planId:/)?.[1],room=rawRoom?.replace(/ \([^()]+\)$/,'')??'Selected element';
  const view=context.includes('3D')?'3D':context.includes('2D')?'2D':'Annotation';
  const legacyNote=before.match(/(?:^|\n)(Comment #\d+: [\s\S]*)$/);
  parts.push(legacyNote?before.slice(0,legacyNote.index):before);
  references.push({label:`${room} · ${view} · v${version[1]}`,context,...(legacyNote?{note:legacyNote[1]}:{})});cursor=match.index!+match[0].length;
 }
 parts.push(value.slice(cursor));let text=parts.join('');
 if(references.length)text=text.replace(/(Prepare a reviewable annotation proposal for room [^\n]+?) \([^()]+\)(: label)/g,'$1$2');
 return {text,references};
}

export function withViewportReferences(text:string,references:ViewportReference[]){
 return [text,...references.map(referenceContext)].filter(Boolean).join('\n\n');
}

export function hasPromptContent(value:string){const parsed=splitViewportPrompt(value);return Boolean(parsed.text.trim()||parsed.references.some(row=>row.annotation?.note.trim()||row.note?.trim()));}

export function appendViewportPrompt(previous:string,incoming:string){
 const current=splitViewportPrompt(previous),next=splitViewportPrompt(incoming),references=[...current.references];
 for(const row of next.references){
  const identity=(value:ViewportReference)=>value.annotation?JSON.stringify([value.annotation.planId,value.annotation.version,value.annotation.fingerprint,value.annotation.id]):value.context;
  const index=references.findIndex(value=>identity(value)===identity(row));
  if(index<0)references.push(row);
 }
 return withViewportReferences([current.text,next.text].filter(Boolean).join('\n\n'),references);
}

export function ViewportReferences({references,onChange}:{references:ViewportReference[];onChange?:(value:ViewportReference[])=>void}){
 const edit=(index:number,note:string)=>onChange?.(references.map((row,i)=>i!==index?row:row.annotation?{...row,annotation:{...row.annotation,note}}:{...row,note}));
 const move=(index:number,offset:number)=>{const next=[...references],target=index+offset;if(target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];onChange?.(next);};
 return <div className="viewport-reference-chips">{references.map((reference,index)=><div key={reference.annotation?reference.annotation.fingerprint+':'+reference.annotation.id:reference.context+':'+index} className="viewport-reference-item">{onChange&&(reference.annotation||reference.note)?<details className="viewport-reference-editor"><summary className="viewport-reference-chip"><MousePointer2 size={12} aria-hidden="true"/>{reference.label}{reference.annotation&&<span>{reference.annotation.intent==='revise'?'· Edit':'· Review'}</span>}</summary><label>Note<textarea aria-label={`Edit ${reference.label}`} maxLength={2000} value={reference.annotation?.note??reference.note??''} onChange={event=>edit(index,event.target.value)}/></label>{reference.annotation&&<label>Intent<select aria-label={`Intent for ${reference.label}`} value={reference.annotation.intent??'question'} onChange={event=>onChange(references.map((row,i)=>i===index&&row.annotation?{...row,annotation:{...row.annotation,intent:event.target.value as 'question'|'revise'}}:row))}><option value="question">Review / question</option><option value="revise">Request edit</option></select></label>}</details>:<span className="viewport-reference-chip"><MousePointer2 size={12} aria-hidden="true"/>{reference.label}</span>}{onChange?<><button type="button" className="icon-button" disabled={index===0} aria-label={`Move ${reference.label} up`} onClick={()=>move(index,-1)}><ArrowUp size={12}/></button><button type="button" className="icon-button" disabled={index===references.length-1} aria-label={`Move ${reference.label} down`} onClick={()=>move(index,1)}><ArrowDown size={12}/></button><button type="button" className="icon-button" aria-label={`Remove ${reference.label}`} onClick={()=>onChange(references.filter((_,i)=>i!==index))}><X size={12}/></button></>:(reference.annotation?.note||reference.note)&&<p>{reference.annotation?.note??reference.note}</p>}</div>)}</div>;
}

export function PromptContent({text}:{text:string}){
 const viewport=splitViewportPrompt(text);
 if(viewport.references.length)return <div className="prompt-references">{viewport.text&&<p>{viewport.text}</p>}<ViewportReferences references={viewport.references}/></div>;
 const parts=text.split('Design feedback (reference only): ');
 if(parts.length===1)return <>{text}</>;
 try{
  const references=parts.slice(1).map(part=>JSON.parse(part.trim()) as {note:string;intent:string;target:{kind:string;key?:string}});
  if(references.some(row=>typeof row.note!=='string'||!['question','revise'].includes(row.intent)||!row.target||!['element','source'].includes(row.target.kind)||row.target.key!==undefined&&typeof row.target.key!=='string'))return <>{text}</>;
  return <div className="prompt-references">{parts[0].trim()&&<p>{parts[0].trim()}</p>}{references.map((row,index)=><p key={index}><strong>{row.intent==='revise'?'Revision':'Question'} · {row.target.kind==='source'?'Source region':row.target.key??'Design'}</strong><span>{row.note}</span></p>)}<details><summary>Exact design references · {references.length}</summary><pre>{text}</pre></details></div>;
 }catch{return <>{text}</>;}
}
