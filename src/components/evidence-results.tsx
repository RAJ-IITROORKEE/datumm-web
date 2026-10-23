'use client';
import type { ToolEvidence } from './agent-activity';

export function CompanionReviewEvidence({evidence}:{evidence:ToolEvidence[]}){
 const reviews=evidence.filter(call=>['review_dxf_source','review_grid_schedule_source'].includes(call.tool)&&call.status==='completed').flatMap(call=>{
  try{
   const result=call.result as {content?:{type:string;text?:string;data?:string;mimeType?:string}[]};
   const text=result.content?.find(part=>part.type==='text')?.text??'';if(text.length>32*1024)return [];
   const report=JSON.parse(text),cad=call.tool==='review_dxf_source';
   if(report.engine?.name!==(cad?'CADCraft':'GridCraft')||report.engine?.version!=='0.8.0'||typeof report.source?.name!=='string'||report.source.name.length>180||!/^[a-f0-9]{64}$/.test(report.source.sha256))return [];
   if(cad){if(!report.query||!Array.isArray(report.query.entities)||report.query.entities.length>100||!Number.isSafeInteger(report.query.matchingEntities)||report.query.matchingEntities<report.query.entities.length||(report.query.layer!=null&&typeof report.query.layer!=='string'))return [];}
   else if(!report.worksheet||typeof report.worksheet.name!=='string'||typeof report.worksheet.range!=='string'||!Array.isArray(report.worksheet.cells)||report.worksheet.cells.length>2000||report.worksheet.cells.some((cell:any)=>typeof cell.address!=='string'||!/^[A-Z]{1,3}[1-9]\d*$/.test(cell.address)||![null,'string','number','boolean'].includes(cell.value===null?null:typeof cell.value)||(cell.formula!==null&&typeof cell.formula!=='string')))return [];
   const image=cad?result.content?.find(part=>part.type==='image'&&part.mimeType==='image/png'&&typeof part.data==='string'&&part.data.length<=512*1024&&/^iVBOR[A-Za-z0-9+/]*={0,2}$/.test(part.data)):undefined;
   return [{callId:call.callId,report,cad,image}];
  }catch{return [];}
 });
 if(!reviews.length)return null;
 return <section className="agent-evidence-card" aria-label="Attached CAD and spreadsheet reviews"><strong>Attached source review</strong>{reviews.map(({callId,report,cad,image})=><details key={callId}><summary>{report.source.name} · {cad?'CADCraft drawing':`${report.worksheet.name}!${report.worksheet.range}`}</summary><p>{cad?'Drawing units, georeferenced origin and preview fidelity unconfirmed.':'Source units unconfirmed. Formula results use GridCraft’s local engine and require review. Equal expression and value strings cannot establish whether a cell is a formula.'} No source edits or native changes.</p><small>Original SHA-256: {report.source.sha256} · {report.engine.name} {report.engine.version}</small>{cad?<><p>Entity query: {report.query.layer??'all layers'} · window {report.query.window?JSON.stringify(report.query.window):'whole drawing'}. Preview uses visible drawing layers; the entity layer filter is not applied.</p><p>Entities returned: {report.query.entities.length} of {report.query.matchingEntities} matching · {report.query.complete?'complete query':'partial query'}.</p>{image?<img src={'data:image/png;base64,'+image.data} alt={`${report.source.name} drawing preview`} style={{maxWidth:'100%',height:'auto'}}/>:<p>Drawing image is retained in saved tool evidence.</p>}<details><summary>Drawing entity evidence</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(report.query.entities,null,2)}</pre></details></>:<div style={{maxHeight:360,overflow:'auto'}}><table><caption>Cells · {report.worksheet.range}</caption><thead><tr><th>Cell</th><th>Value</th><th>Formula view</th></tr></thead><tbody>{report.worksheet.cells.map((cell:any)=><tr key={cell.address}><th scope="row">{cell.address}</th><td>{cell.value===null?'empty':String(cell.value)}</td><td>{cell.formula??(typeof cell.formulaView==='string'&&cell.formulaView.startsWith('=')?cell.formulaView+' (expression or literal; unconfirmed)':'—')}</td></tr>)}</tbody></table></div>}</details>)}</section>;
}

export function PdfReviewEvidence({evidence}:{evidence:ToolEvidence[]}){
 const reviews=evidence.filter(call=>call.tool==='review_pdf_source'&&call.status==='completed').flatMap(call=>{
  try{
   const result=call.result as {content?:{type:string;text?:string;data?:string;mimeType?:string}[]};
   const report=JSON.parse(result.content?.find(part=>part.type==='text')?.text??'');
   if(report.engine?.name!=='PdfCraft'||report.engine.version!=='0.9.0'||!report.source||typeof report.source.name!=='string'||report.source.name.length>180||!/^[a-f0-9]{64}$/.test(report.source.sha256)||!Number.isSafeInteger(report.source.page)||report.source.page<1||!Number.isSafeInteger(report.source.pages)||report.source.pages<report.source.page||typeof report.text!=='string'||report.text.length>12000)return [];
   const image=result.content?.find(part=>part.type==='image'&&part.mimeType==='image/png'&&typeof part.data==='string'&&part.data.length<=512*1024&&/^iVBOR[A-Za-z0-9+/]*={0,2}$/.test(part.data));
   return [{callId:call.callId,report,image}];
  }catch{return [];}
 });
 if(!reviews.length)return null;
 return <section className="agent-evidence-card" aria-label="Attached PDF review"><strong>PDF page review · PdfCraft</strong>{reviews.map(({callId,report,image})=><details key={callId}><summary>{report.source.name} · page {report.source.page} of {report.source.pages}</summary><p>Drawing scale unconfirmed. Full page reviewed; attachment crop is not applied. No OCR or native changes.</p><small>Original SHA-256: {report.source.sha256} · PdfCraft {report.engine.version}</small>{image?<img src={'data:image/png;base64,'+image.data} alt={`${report.source.name}, page ${report.source.page} preview`} style={{maxWidth:'100%',height:'auto'}}/>:<p>Page image is retained in saved tool evidence.</p>}<details><summary>Extracted text · {report.coverage?.text==='partial'?'partial':'complete'} page text</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{report.text||'No extractable text was found. This does not prove the page is blank.'}</pre></details></details>)}</section>;
}

export function PublicResearchEvidence({evidence}:{evidence:ToolEvidence[]}){
 const sources=new Map<string,{id:string;url:string;title:string;requestedEdition:string;jurisdiction:string;retrievedAt:string;coverage:string;editionMentioned:boolean}>(),notes=new Map<string,{id:string;claim:string;status:string;edition:string;jurisdiction:string;localAuthority:string;citations:{sourceId:string;quote:string}[]}>();
 let pending=false;const failures:string[]=[];
 for(const call of evidence){
  if(call.status==='failed'&&call.tool.startsWith('research_')){try{const result=call.result as {content?:{type:string;text?:string}[]};const data=JSON.parse(result.content?.find(row=>row.type==='text')?.text??'');if(typeof data.error?.message==='string')failures.push(data.error.message);}catch{/* Raw error remains recorded. */}}
  if(call.status!=='completed'||!['research_fetch','research_guidance','read_research'].includes(call.tool))continue;
  try{
   const result=call.result as {content?:{type:string;text?:string}[]};const data=JSON.parse(result.content?.find(row=>row.type==='text')?.text??'');
   pending||=String(data.contextProjection??'').startsWith('pending');
   for(const source of data.sources??(call.tool==='research_fetch'?[data]:[])){
    const url=new URL(source.url);if(url.protocol!=='https:'||url.username||url.password||!['help.autodesk.com','www.bis.gov.in','bis.gov.in','www.gov.uk','www.nist.gov'].includes(url.hostname))continue;
    sources.set(source.id,source);
   }
   for(const note of data.guidance??(call.tool==='research_guidance'?[data]:[]))if(['checked','unknown','conflicting'].includes(note.status))notes.set(note.id,note);
  }catch{/* Failed or incompatible evidence stays visible in the raw tool observation. */}
 }
 if(!sources.size&&!notes.size&&!failures.length)return null;
 return <section className="agent-evidence-card" aria-label="Public research citations"><strong>Public research · saved references</strong>{failures.map((message,index)=><p role="status" key={index}>Research unavailable: {message}</p>)}<p>Checked means a fetched excerpt was reviewed. Compliance, local adoption and licensed rules remain unverified.</p>{pending&&<p role="status">Context projection pending; the local citation journal is retained.</p>}{[...notes.values()].map(note=><details key={note.id}><summary>{note.status} · {note.claim}</summary><p>{note.jurisdiction} · requested edition {note.edition} · authority {note.localAuthority}</p>{note.citations.map((citation,index)=><blockquote key={index}>{citation.quote}<small>Source {citation.sourceId.slice(0,12)}</small></blockquote>)}</details>)}<details><summary>Sources · {sources.size}</summary><ol>{[...sources.values()].map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p>{source.jurisdiction} · requested edition {source.requestedEdition} ({source.editionMentioned?'mentioned in retrieved text':'not established'}) · {source.coverage} page coverage · retrieved {source.retrievedAt}</p><small>Source {source.id.slice(0,12)}</small></li>)}</ol></details></section>;
}

export type ModelCoverage={documentId:string|null;revision:number|null;includedCategories:string[];
 hostScopes:Record<string,{status:string;returnedCount:number;totalCount:number|null}>;
 linkedContentCoverage:string;geometryCoverage:string;quantityScopePolicy:string;capturedAt:string[];
 skippedGeometry?:{inspectedUniqueInstances:number;unsupportedDescriptionCount:number;nonLineWallCount:number;policy:string};
 links:{id:string;name?:string;loaded?:boolean;isLoaded?:boolean;contentCoverage:string;transform?:unknown}[]};
export type AdviceFinding={title:string;priority:string;rationale:string;uncertainty:string;
 evidenceRefs:string[];elementIds:string[];locations:{elementId:string;point:unknown;units:string;frame:string}[];safeNextAction:string};
export type ResearchSource={id:string;url:string;title:string;publisher:string;publisherBasis:string;
 officialCandidate:boolean;status:string;edition:string|null;date:string|null;dateBasis:string;
 retrievedAt:string;locator:string;textAvailability:string;currency:string;applicability:unknown};
export type RegulationResearch={status:string;question?:string;uncertainty?:string;sourceConflicts?:string;
 providerUncertainty?:string;adviceCoverage?:string;
 query:{country?:string|null;state?:string|null;city?:string|null;authority?:string|null;occupancy?:string|null;asOf?:string|null};
 sources:ResearchSource[];claims:{text:string;sourceIds:string[];status:string}[]};

export function EvidenceResults({coverage,findings=[],research=[]}:{coverage?:ModelCoverage;findings?:AdviceFinding[];research?:RegulationResearch[]}){
 if(!coverage&&!findings.length&&!research.length)return null;
 return <section className="agent-evidence-card" aria-label="Analysis coverage and cited findings">
  <div className="section-caption">ANALYSIS EVIDENCE</div>
  {coverage&&<details><summary>Host coverage · revision {coverage.revision??'unknown'}</summary>
   <p>Document: {coverage.documentId??'unknown'}. Included categories: {coverage.includedCategories.join(', ')||'none inspected'}.</p>
   <ul>{Object.entries(coverage.hostScopes).map(([kind,scope])=><li key={kind}>{kind}: {scope.status} · {scope.returnedCount}/{scope.totalCount??'unknown'}</li>)}</ul>
   <p>{coverage.quantityScopePolicy}</p><p>{coverage.geometryCoverage}</p>
   {coverage.skippedGeometry&&<p>Inspected unique instances: {coverage.skippedGeometry.inspectedUniqueInstances}. Unsupported descriptions: {coverage.skippedGeometry.unsupportedDescriptionCount}. Non-line walls: {coverage.skippedGeometry.nonLineWallCount}. {coverage.skippedGeometry.policy}</p>}
   <p>Linked contents: {coverage.linkedContentCoverage}.</p>
   {coverage.links.map(link=><details key={link.id}><summary>{link.name||link.id} · loaded: {String(link.loaded??link.isLoaded??'unknown')} · contents {link.contentCoverage}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(link.transform??'Transform unavailable',null,2)}</pre></details>)}
   <p>Evidence captured: {coverage.capturedAt.join(', ')||'unknown'}. Downloads use this frozen evidence.</p>
  </details>}
  {findings.map((finding,index)=><article key={index}><strong>{finding.priority.toUpperCase()} · {finding.title}</strong><p>{finding.rationale}</p><p>Uncertainty: {finding.uncertainty}</p><p>Evidence: {finding.evidenceRefs.join(', ')}. Elements: {finding.elementIds.join(', ')||'none'}.</p>
   {!!finding.locations.length&&<details><summary>Measured locations</summary><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(finding.locations,null,2)}</pre></details>}<p>Suggested next action: {finding.safeNextAction}.</p></article>)}
  {research.map((row,index)=><details key={index} open={row.status!=='retrieved'}><summary>Regulation research · {row.status}</summary>
   {row.question&&<p>{row.question}</p>}<p>{row.uncertainty}</p>{row.sourceConflicts&&<p>{row.sourceConflicts}</p>}{row.providerUncertainty&&<p>{row.providerUncertainty}</p>}
   <p>Jurisdiction: {[row.query.country,row.query.state,row.query.city].filter(Boolean).join(', ')||'missing'}. Occupancy: {row.query.occupancy||'missing'}. Relevant date: {row.query.asOf||'retrieval date'}. Compliance has not been assessed.</p>
   {row.adviceCoverage==='sources-only'&&<p>Sources were found, but no supported claim was retained.</p>}
   {row.claims.map((claim,i)=><p key={i}>{claim.text} <small>({claim.status}; {claim.sourceIds.join(', ')})</small></p>)}
   <ol>{row.sources.map(source=><li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
    <p>{source.id} · publisher: {source.publisher} ({source.publisherBasis}). {source.officialCandidate?'Government source candidate. ':''}Status: {source.status}. Edition: {source.edition??'unknown'}. Date: {source.date??'unknown'} ({source.dateBasis}).</p>
    <p>Retrieved: {source.retrievedAt}. Locator: {source.locator}. Available text: {source.textAvailability}. Currency: {source.currency}.</p>
    <details><summary>Applicability and adoption uncertainty</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(source.applicability,null,2)}</pre></details>
   </li>)}</ol>
  </details>)}
 </section>;
}
