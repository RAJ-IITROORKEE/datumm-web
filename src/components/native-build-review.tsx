'use client';
import {useState,useEffect,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {CheckCircle2, CircleAlert, CircleHelp, Clock3, Loader2} from 'lucide-react';
import styles from './review/review-panels.module.css';
import nativeStyles from './native-build-review.module.css';

export function NativeBuildReview({value,pending,onAction,onCorrection,onRefresh,nativeAvailable=true}:{value:any;pending:boolean;onRefresh?:()=>Promise<void>;onCorrection?:()=>void;nativeAvailable?:boolean;onAction:(action:'approve'|'reconcile'|'show'|'select')=>Promise<void>}){
 const [error,setError]=useState(''),[now,setNow]=useState(Date.now()),[localPending,setLocalPending]=useState(false);
 const actionLock=useRef(false);
 const busy=pending||localPending;
 useEffect(()=>{if(value?.state!=='preview')return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[value?.state,value?.proposal?.expiresAt]);
 if(!value)return null;
 const counts=value.changes.operations.reduce((rows:Record<string,number>,op:any)=>({...rows,[op.kind]:(rows[op.kind]??0)+1}),{});
 const preview=value.state==='preview',expiresAt=Date.parse(value.proposal.expiresAt),expired=!Number.isFinite(expiresAt)||expiresAt<=now;
 const receipt=value.outcomeReceipt;
 const verified=value.state==='committed'&&(receipt?receipt.status==='verified':value.feedback?.verified===true);
 const roomUpdates=value.changes.operations.length>0&&value.changes.operations.every((op:any)=>op.kind==='set_room_metadata');
 const furnitureOnly=value.changes.operations.length>0&&value.changes.operations.every((op:any)=>op.kind==='family_instance');
 const colorOnly=value.changes.operations.length>0&&value.changes.operations.every((op:any)=>op.kind==='set_room_color_scheme');
 const colorRows=value.changes.operations.filter((op:any)=>op.kind==='set_room_color_scheme').map((op:any)=>({op,before:value.originalViews?.find((view:any)=>view.id===op.viewId),scheme:value.resolvedRoomColorSchemes?.find((scheme:any)=>scheme.id===op.schemeId)}));
 const heading=receipt?.status==='stale'?'Revit evidence is stale':receipt?.status==='unknown'?'Build status needs checking':preview?(expired?'Review expired':roomUpdates?'Review room updates':furnitureOnly?'Review furniture placement':colorOnly?'Review room colours':'Ready to build in Revit'):verified?(roomUpdates?'Rooms updated in Revit':furnitureOnly?'Furniture added in Revit':colorOnly?'Room colour scheme assigned':'Built in Revit'):value.state==='committed'?'Built · verification incomplete':value.state==='unknown'||value.state==='applying'?'Build status needs checking':'Build did not complete';
 const feedbackIssues=(value.feedback?.issues??[]).filter((issue:string)=>!preview||value.operationId||issue!=='Native state: preview. No successful build is claimed.');
 const names:Record<string,string>={wall:'walls',floor:'floors',door:'doors',window:'windows',room:'rooms',family_instance:'family instances',room_tag:'room tags',dimension:'dimensions',set_room_color_scheme:'room colour scheme assignments'};
 const typeRows=(value.resolvedTypes??[]).map((type:any)=>({...type,kind:type.kind??value.changes.operations.find((op:any)=>op.typeId===type.id)?.kind??'element',count:value.changes.operations.filter((op:any)=>op.typeId===type.id).length})).filter((type:any)=>type.count>0);
 const sizeLabels:Record<string,string>={widthMm:'width',heightMm:'height',thicknessMm:'thickness'};
 const measurementRows=(value.feedback?.measurements??[]).map((item:any)=>({item,kind:value.changes.operations.find((op:any)=>op.key===item.key)?.kind,values:[['height','heightMm'],['sill','sillMm'],['point elevation','pointElevationMm']].filter(([,key])=>Number.isFinite(item[key])).map(([label,key])=>`${label} ${item[key]} mm`)})).filter((row:any)=>row.values.length);
 const areaRows=(value.feedback?.findings??[]).filter((item:any)=>Number.isFinite(item.areaM2));
 const origin=value.design?.binding?.placement;
 const metadataRows=value.changes.operations.filter((op:any)=>op.kind==='set_room_metadata').map((op:any)=>({op,before:value.originalElements?.find((element:any)=>element.id===op.elementId)}));
 const elementName=(key:string)=>value.changes.operations.find((op:any)=>op.key===key)?.name??key;
 const perform=async(work:()=>Promise<void>)=>{
  if(pending||actionLock.current||!nativeAvailable)return;
  actionLock.current=true;setLocalPending(true);setError('');
  try{await work();}catch(e){setError(e instanceof Error?e.message:'The native action could not complete. Inspect the original operation before retrying.');}
  finally{actionLock.current=false;setLocalPending(false);}
 };
 const act=async(action:'approve'|'reconcile'|'show'|'select')=>{
  if(action==='approve'){
   if(!preview)return;
   if(!Number.isFinite(expiresAt)||expiresAt<=Date.now()){setNow(Date.now());setError('This exact proposal has expired or has no valid expiry. Refresh the review before approving.');return;}
  }
  await perform(()=>onAction(action));
 };
 const refresh=async()=>{if(onRefresh)await perform(onRefresh);};
 const status=receipt?.status==='stale'?'Evidence stale':receipt?.status==='unknown'?'Status unknown':preview?(expired?'Review expired':'Approval required'):verified?'Verified':value.state==='committed'?'Verification incomplete':value.state==='unknown'||value.state==='applying'?'Needs checking':'Build incomplete';
 const tone=verified?'success':preview&&!expired?'default':'warning';
 const statusText=receipt?.status==='stale'?'Saved evidence is stale. Inspect the original operation and refresh its status before relying on this result.':receipt?.status==='unknown'?'The saved evidence does not confirm the native result. Inspect the original operation before retrying.':verified?'Changes applied and checked in Revit. You do not need to approve this proposal again.':preview?(expired?'Refresh this review, then approve the renewed proposal. No Revit changes have been applied for this proposal.':'Awaiting your review. No Revit changes have been applied for this proposal.'):value.state==='committed'?'Native changes are recorded, but full verification is not confirmed.':'Inspect the original result before retrying; another build could duplicate elements.';
 return <section className={styles.panel} aria-label="Native build review" aria-busy={busy}>
 <header className={styles.header}>
  <div className={styles.heading}><h3 className={styles.title}>{heading}</h3><p className={styles.description}>{value.changes.title}</p></div>
  <span className={styles.status} data-tone={tone}>{busy?<Loader2 className="spin" aria-hidden="true"/>:verified?<CheckCircle2 aria-hidden="true"/>:preview&&!expired?<Clock3 aria-hidden="true"/>:receipt?.status==='stale'?<CircleAlert aria-hidden="true"/>:<CircleHelp aria-hidden="true"/>}{status}</span>
 </header>
 <p className={styles.note} role="status">{statusText}</p>
 <dl className={styles.facts} aria-label="Native change overview">
  <div><dt>Changes</dt><dd>{Object.entries(counts).map(([kind,count])=>`${count} ${kind==='set_room_metadata'?(count===1?'room update':'room updates'):count===1?kind.replaceAll('_',' '):names[kind]??kind.replaceAll('_',' ')}`).join(' · ')}</dd></div>
  <div><dt>Target level</dt><dd>{value.placement?.level?.name??value.changes.levelId}{Number.isFinite(value.placement?.level?.elevationMm)&&<small>{value.placement.level.elevationMm} mm elevation</small>}</dd></div>
 </dl>
 {furnitureOnly&&<><dl className={styles.facts} aria-label="Furniture placements">{value.changes.operations.map((op:any)=><div key={op.key}><dt>{value.resolvedTypes?.find((type:any)=>type.id===op.typeId)?.name??op.key}</dt><dd>X {op.point.x} mm · Y {op.point.y} mm · rotation {op.rotationDegrees}°{value.placement?.level?.name?` · ${value.placement.level.name}`:''}</dd></div>)}</dl><p className={styles.note}>Drawing markers show insertion points only. Furniture dimensions, room fit and clearances are not verified by this preview.</p></>}
 {colorRows.length>0&&<><dl className={styles.facts} aria-label="Room colour scheme assignments">{colorRows.map(({op,before,scheme}:any)=><div key={op.key}><dt>{before?.name??'View name unavailable'}</dt><dd>{before?.roomColorSchemeName??(before?.roomColorSchemeId===null?'No room colour scheme':'Current assignment unavailable')} → {scheme?.name??'Selected scheme name unavailable'}{scheme?.parameterName&&<small>Room parameter: {scheme.parameterName}</small>}</dd></div>)}</dl><p className={styles.note}>Assigns the selected existing room colour scheme to the named view. Scheme entries and legends are retained; visible colour refresh requires inspection in Revit.</p></>}
 {metadataRows.length>0&&<><dl className={styles.facts} aria-label="Room name and number changes">{metadataRows.map(({op,before}:any)=><div key={op.key}><dt>Room #{before?.roomNumber??'unknown'}</dt><dd>{before?.roomName??'Name unavailable'} → {op.name??before?.roomName??'unchanged'}{op.number!==undefined&&<small>Number: {before?.roomNumber??'unavailable'} → {op.number}</small>}</dd></div>)}</dl><p className={styles.note}>Room geometry and existing tags are retained.</p></>}
 {origin&&Number.isFinite(origin.originXmm)&&Number.isFinite(origin.originYmm)&&<p className={styles.note}>Placement: X {origin.originXmm} mm · Y {origin.originYmm} mm · rotation {origin.rotationDegrees}°</p>}
 {!furnitureOnly&&typeRows.length>0&&<dl className={styles.facts} aria-label="Selected construction types">{typeRows.map((type:any)=>{const dimensions=Object.entries(sizeLabels).filter(([key])=>Number.isFinite(type.sizes?.[key])).map(([key,label])=>`${label} ${Number(type.sizes[key].toFixed(3))} mm`).join(' · ');return <div key={type.id}><dt>{type.kind.replaceAll('_',' ')} · {type.count}</dt><dd>{type.name||type.kind}{dimensions&&<small>{dimensions}</small>}</dd></div>;})}</dl>}
 {!colorOnly&&value.svg&&preview&&<img className={nativeStyles.drawing} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(value.svg)} alt={furnitureOnly?'Proposed furniture insertion points only; schematic SVG':'Exact proposed native paths and opening positions; schematic SVG'}/>}
 <div className={nativeStyles.approval}>
  {preview&&<dl className={nativeStyles.identity} aria-label="Approval expiry">
   <div><dt>Expires</dt><dd>{Number.isFinite(expiresAt)?<time dateTime={value.proposal.expiresAt}>{new Date(expiresAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'long'})}</time>:'Expiry unavailable — refresh required'}</dd></div>
  </dl>}
  <details className={styles.details}><summary>Exact details</summary>
  <dl className={nativeStyles.identity} aria-label="Exact native proposal identity">
   <div><dt>Document</dt><dd><code>{value.changes.documentId}</code></dd></div>
   <div><dt>Reviewed revision</dt><dd>{value.changes.expectedRevision}</dd></div>
   <div><dt>Proposal</dt><dd><code>{value.proposal.proposalId}</code></dd></div>
   <div><dt>Approval hash</dt><dd><code>{value.proposal.approvalHash}</code></dd></div>
   {value.operationId&&<div><dt>Original operation</dt><dd><code>{value.operationId}</code><small>Retries inspect this ID.</small></dd></div>}
  </dl>
  </details>
  {preview&&<p className={styles.note}>Approval binds these exact operations, document and revision. Review placement, types, hosts and affected elements before approving.</p>}
  <div className={styles.actions}>
   {preview?<>
    {expired&&onRefresh?<Button disabled={busy||!nativeAvailable} onClick={()=>void refresh()}>Refresh review to approve</Button>:<Button disabled={busy||expired||!nativeAvailable} onClick={()=>void act('approve')}>{localPending?'Working…':'Approve exact proposal and build'}</Button>}
    {!expired&&onRefresh&&<Button variant="secondary" disabled={busy||!nativeAvailable} onClick={()=>void refresh()}>Refresh exact proposal</Button>}
   </>:<>
    <Button variant="secondary" disabled={busy||!nativeAvailable} onClick={()=>void act('reconcile')}>Refresh original operation status</Button>
    {value.state==='committed'&&value.nativeSelectionAvailable&&<>
     <Button variant="secondary" disabled={busy||!nativeAvailable} onClick={()=>void act('show')}>Show in Revit</Button>
     <Button variant="secondary" disabled={busy||!nativeAvailable} onClick={()=>void act('select')}>Highlight result</Button>
    </>}
    {onCorrection&&<Button variant="secondary" disabled={busy} onClick={onCorrection}>Draft reviewed correction</Button>}
   </>}
  </div>
  {!nativeAvailable&&<p className={styles.note}>Use DATUMM Desktop for exact approval and native reconciliation.</p>}
  <p className={styles.note}>The project has not been saved or synchronized.</p>
  {error&&<p className={styles.error} role="alert">{error}</p>}
 </div>
 {(measurementRows.length||areaRows.length)>0&&<details className={styles.details}><summary>Measured specifications &amp; room areas</summary>
 {areaRows.length>0&&<><p>Measured native areas</p><ul>{areaRows.map((item:any)=><li key={item.key}><strong>{elementName(item.key)}</strong> · {item.areaM2.toFixed(2)} m²</li>)}</ul></>}
 {measurementRows.length>0&&<><p>Revit read-back</p><ul>{measurementRows.map((row:any)=><li key={row.item.key}><strong>{row.kind?names[row.kind]??row.kind:'Element'}</strong>{row.item.key?` · ${row.item.key}`:''} · {row.values.join(' · ')}</li>)}</ul></>}
 </details>}
 {!verified&&feedbackIssues.length>0&&<ul className={styles.list}>{feedbackIssues.slice(0,3).map((issue:string,index:number)=><li key={index}>{issue}</li>)}</ul>}

 <details className={styles.details}><summary>{preview?'Exact proposal & technical evidence':'Native result & technical evidence'}</summary>
 {receipt&&<details><summary>Verification receipt · {receipt.status.replaceAll('_',' ')}</summary><p>This summary is derived from the saved native journal and independent read-back.</p><dl className={styles.facts} aria-label="Verification receipt"><div><dt>Operation coverage</dt><dd>{receipt.coverage.verifiedOperations??'Unknown'} verified / {receipt.coverage.expectedOperations??'unknown'} proposed{receipt.coverage.unverifiedOperations!=null?` · ${receipt.coverage.unverifiedOperations} unverified`:''}</dd></div><div><dt>Element coverage</dt><dd>{receipt.coverage.observedElements??'Unknown'} observed / {receipt.coverage.expectedElements??'unknown'} expected{receipt.coverage.missingElements!=null?` · ${receipt.coverage.missingElements} missing`:''}</dd></div><div><dt>Original identity</dt><dd>Document <code>{receipt.identity.documentId??'unavailable'}</code> · operation <code>{receipt.identity.operationId??'not dispatched'}</code> · reviewed revision {receipt.identity.expectedRevision??'unavailable'}</dd></div><div><dt>Evidence</dt><dd>Commit {receipt.evidence.commitState??'unavailable'} · read-back {receipt.evidence.readbackState??'unavailable'} · same document {receipt.evidence.sameDocument===null?'unknown':receipt.evidence.sameDocument?'yes':'no'}</dd></div></dl>{receipt.evidence.limitations?.map((item:string,index:number)=><p key={index}>{item}</p>)}</details>}
 <strong>{value.changes.title}</strong><p>Document <code>{value.changes.documentId}</code> · level <code>{value.changes.levelId}</code> · revision {value.changes.expectedRevision}</p>
 {value.placement&&<p>Target: {value.placement.level.name} · measured level elevation {Number.isFinite(value.placement.level.elevationMm)?`${value.placement.level.elevationMm} mm`:'unavailable'} · {value.placement.units} · {value.placement.coordinateFrame}</p>}
 <details><summary>Targets, dimensions, types and hosts</summary><ul>{value.changes.operations.map((op:any)=>{const typeName=value.resolvedTypes?.find((type:any)=>type.id===op.typeId)?.name,kind=op.kind==='set_room_metadata'?'room update':names[op.kind]??op.kind.replaceAll('_',' ');return <li key={op.key}><strong>{typeName??kind}</strong>{typeName?` · ${kind}`:''}{op.key?` · ${op.key}`:''}{op.elementId?` · target ${op.elementId}`:''}{op.host?` · host ${op.host}`:''}{op.heightMm!==undefined?` · height ${op.heightMm} mm`:''}{op.sillMm!==undefined?` · sill ${op.sillMm} mm`:''}</li>;})}</ul></details>
 {!colorOnly&&value.svg&&!preview&&<details><summary>Original native proposal drawing</summary><img className={nativeStyles.drawing} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(value.svg)} alt="Original reviewed native paths and opening positions; schematic SVG"/></details>}
 <details><summary>Review exact operations and native deletion closure</summary><pre className={styles.evidence}>{JSON.stringify({changes:value.changes,deletions:value.proposal.deletions??[]},null,2)}</pre></details>
 {!!value.originalElements?.length&&<details><summary>Inspected target constraints and dependencies</summary><pre className={styles.evidence}>{JSON.stringify(value.originalElements.map((element:any)=>({id:element.id,constraints:element.constraints??'Unavailable in this bridge'})),null,2)}</pre></details>}
 {value.differenceSvg&&<details><summary>Compare proposed and measured paths</summary><p>Blue dashed: proposed · orange: measured. XY paths only; missing or unsupported geometry is omitted.</p><img className={nativeStyles.drawing} alt="Proposed and measured native paths overlaid in the same millimetre coordinate frame" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(value.differenceSvg)}/></details>}
 {value.feedback&&(!preview||feedbackIssues.length>0||value.feedback.findings?.length>0)&&<details open={!value.feedback.verified}><summary>Build feedback · {value.feedback.verified?'verified':'needs review'}</summary><ul>{feedbackIssues.map((item:string,index:number)=><li key={index}>{item}</li>)}{(value.feedback.findings??[]).map((item:any)=><li key={item.key}>{item.kind} · {item.key}: {item.status}{item.issue?` — ${item.issue}`:''}{item.areaM2!==undefined?` · native area ${item.areaM2} m²`:''}</li>)}</ul>{value.feedback.measurements?.map((item:any)=><p key={item.key}>{item.key}{Number.isFinite(item.levelElevationMm)?` · ${item.levelName??'Level'} elevation ${item.levelElevationMm} mm`:''}{Number.isFinite(item.heightMm)?` · measured height ${item.heightMm} mm`:''}{Number.isFinite(item.pointElevationMm)?` · measured point elevation ${item.pointElevationMm} mm`:''}{Number.isFinite(item.sillMm)?` · measured sill ${item.sillMm} mm`:''}</p>)}{value.feedback.limitations?.map((item:string,index:number)=><p key={index}>{item}</p>)}</details>}
 {value.feedback?.measurements?.some((item:any)=>item.vertical)&&<details><summary>Measured base, floor plane and head heights</summary><ul>{value.feedback.measurements.filter((item:any)=>item.vertical).map((item:any)=><li key={item.key}>{item.key}: {Object.entries(item.vertical).filter(([key])=>!['schemaVersion','units','coordinateFrame'].includes(key)).map(([key,measurement])=>`${key}: ${Number.isFinite(measurement)?measurement+' mm':'unavailable'}`).join(' · ')}</li>)}</ul></details>}
 </details>
 </section>;
}
