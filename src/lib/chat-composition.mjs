import { z } from 'zod';
import {splitTableRow} from './answer-outputs.mjs';

const span = z.object({start:z.number().int().nonnegative(),end:z.number().int().positive()}).strict();
const hex=z.string().regex(/^[a-f0-9]{64}$/);
const isoDate=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?$/;
// The server resolves `display` from the saved revision; the browser only checks its shape and bounds.
const evidence=z.object({type:z.literal('evidence'),
  ref:z.object({kind:z.literal('report-revision'),revisionId:hex,contentHash:hex}).strict(),
  display:z.object({revisionNumber:z.number().int().min(1),
    createdAt:z.string().max(40).regex(isoDate).refine(value=>!Number.isNaN(Date.parse(value))),
    planTitle:z.string().max(120),planVersion:z.number().int().min(1),rowCount:z.number().int().nonnegative(),
    proposedRoomCount:z.number().int().nonnegative(),proposedAreaM2:z.number().finite().nonnegative()}).strict()}).strict();
const makeNode = extra => {
  const children = () => z.array(node).min(1).max(8);
  const node = z.lazy(() => z.discriminatedUnion('type',[
    z.object({type:z.literal('text'),text:span}).strict(),
    z.object({type:z.literal('stack'),children:children()}).strict(),
    z.object({type:z.literal('grid'),children:children().max(2)}).strict(),
    z.object({type:z.literal('details'),label:span,children:children()}).strict(),
    z.object({type:z.literal('table'),source:span}).strict(),
    z.object({type:z.literal('bars'),source:span}).strict(),
    z.object({type:z.literal('flow'),source:span}).strict(),
    ...extra,
  ]));
  return node;
};
const envelope=(version,kind,node)=>z.object({schemaVersion:z.literal(version),taskId:z.string().min(1).max(128),turnId:z.string().min(1).max(128),answerHash:hex,kind:z.literal(kind),root:node}).strict();
// v1 stays byte-identical and rejects evidence; only v2 may carry saved-report evidence leaves.
const schema=z.discriminatedUnion('schemaVersion',[envelope(1,'illustrative-explanation',makeNode([])),envelope(2,'evidence-backed-explanation',makeNode([evidence]))]);

/** Read-only explanation grammar. Source spans establish consistency, never measured truth. */
export async function validateChatComposition(value,{taskId,turnId,text,state},digest=globalThis.crypto?.subtle) {
  if(state!=='saved'||!taskId||!turnId||typeof text!=='string'||text.length>100000||!digest) return null;
  try {
    // Bound before recursive schema parsing, including hostile/deep/circular input.
    const pending=[{value,depth:0}]; let count=0;
    while(pending.length){
      const row=pending.pop();
      if(++count>1600||row.depth>20) return null;
      if(row.value&&typeof row.value==='object') for(const child of Object.values(row.value))pending.push({value:child,depth:row.depth+1});
    }
    if(new TextEncoder().encode(JSON.stringify(value)).length>24576)return null;
    const parsed=schema.safeParse(value);
    if(!parsed.success)return null;
    const spec=parsed.data;
    if(spec.taskId!==taskId||spec.turnId!==turnId)return null;
    const hash=Array.from(new Uint8Array(await digest.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
    if(spec.answerHash!==hash)return null;
    let nodes=0,total=0,cited=0;const revisions=new Set();
    const read=source=>{
      if(source.end<=source.start||source.end>text.length||source.end-source.start>1200)throw Error('Invalid source span');
      // Offsets count UTF-16 code units; do not split a surrogate pair.
      for(const offset of [source.start,source.end])if(offset>0&&/[\uD800-\uDBFF]/.test(text[offset-1])&&/[\uDC00-\uDFFF]/.test(text[offset]??''))throw Error('Split source character');
      const result=text.slice(source.start,source.end);
      if(!result.trim()||(total+=result.length)>8000)throw Error('Empty or oversized content');
      return result;
    };
    const visit=(item,depth=0)=>{
      if(++nodes>24||depth>4)throw Error('Layout too large');
      if(item.type==='text'){
        const result=read(item.text);
        if((item.text.start>0&&!/\r?\n[ \t]*\r?\n$/.test(text.slice(0,item.text.start)))||(item.text.end<text.length&&!/^\r?\n[ \t]*\r?\n/.test(text.slice(item.text.end))))throw Error('Not a whole text block');
        return {type:item.type,text:result};
      }
      if(item.type==='evidence'){
        // At most 4 cards, never the same revision twice; ids, hashes and display come from the server.
        if(++cited>4||revisions.has(item.ref.revisionId))throw Error('Too much evidence');
        revisions.add(item.ref.revisionId);
        return {type:item.type,ref:item.ref,display:item.display};
      }
      if(['stack','grid','details'].includes(item.type)){
        let label;
        if(item.type==='details'){
          label=read(item.label);
          if(label.length>120||/[\r\n]/.test(label)||(item.label.start>0&&text[item.label.start-1]!=='\n')||(item.label.end<text.length&&!/^\r?\n/.test(text.slice(item.label.end))))throw Error('Not a complete label line');
        }
        return {type:item.type,...(label?{label}:{}),children:item.children.map(child=>visit(child,depth+1))};
      }
      const title=item.type==='table'?'Source table':item.type==='bars'?'Values from source table':'Illustrative connections',source=read(item.source);
      // Derive relationships from a whole block, never freely pair individual spans.
      if((item.source.start>0&&!/\r?\n[ \t]*\r?\n$/.test(text.slice(0,item.source.start)))||(item.source.end<text.length&&!/^\r?\n[ \t]*\r?\n/.test(text.slice(item.source.end))))throw Error('Not a whole source block');
      const lines=source.split(/\r?\n/);
      if(item.type==='table'||item.type==='bars'){
        if(lines.length<3||lines.length>14||lines.some(line=>!line.trim().startsWith('|')||!line.trim().endsWith('|')))throw Error('Invalid table block');
        const columns=splitTableRow(lines[0]),divider=splitTableRow(lines[1]),rows=lines.slice(2).map(splitTableRow);
        if(columns.length<1||columns.length>6||divider.length!==columns.length||divider.some(cell=>!/^:?-{3,}:?$/.test(cell.trim()))||columns.some(cell=>!cell.trim())||rows.some(row=>row.length!==columns.length||row.some(cell=>!cell.trim())))throw Error('Invalid table rows');
        if(item.type==='table')return {type:item.type,title,columns,rows};
        if(columns.length!==2)throw Error('Chart needs label and value columns');
        return {type:item.type,title,unit:columns[1],items:rows.map(([label,display])=>{
          if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(display)||!Number.isFinite(Number(display))||Number(display)>1e12)throw Error('Invalid number');
          return {label,value:Number(display),display};
        })};
      }
      const graphNodes=[],edges=[],ids=new Map();
      const identify=label=>{if(!ids.has(label)){const id=`node-${graphNodes.length}`;ids.set(label,id);graphNodes.push({id,label});}return ids.get(label);};
      if(lines.length>20)throw Error('Too many connections');
      for(const line of lines){
        const labels=line.split(/\s+(?:->|→)\s+/).map(label=>label.trim());
        if(labels.length<2||labels.length>12||labels.some(label=>!label||label.length>120||/[<>\r\n]/.test(label)))throw Error('Invalid explicit connection');
        for(let i=1;i<labels.length;i++){
          const edge={from:identify(labels[i-1]),to:identify(labels[i])};
          if(!edges.some(row=>row.from===edge.from&&row.to===edge.to))edges.push(edge);
        }
      }
      if(graphNodes.length>12||edges.length>20)throw Error('Graph too large');
      return {type:item.type,title,nodes:graphNodes,edges};
    };
    const root=visit(spec.root);
    // v2 means "evidence-backed": the server rejects it without a single evidence leaf, and so do we.
    if(spec.schemaVersion===2&&cited===0)return null;
    return {root,schemaVersion:spec.schemaVersion};
  } catch {return null;}
}
