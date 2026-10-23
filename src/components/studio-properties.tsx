'use client';
import {useState} from 'react';
import {ArrowRight,Eye,ShieldCheck} from 'lucide-react';
import type {DrawingVersion} from './plan-canvas';
import {Button} from './ui/button';

export function StudioProperties({drawing,selected,onSelect,onRequest,onReview}:{drawing:DrawingVersion;selected:string;onSelect:(key:string)=>void;onRequest:(text:string)=>void;onReview:()=>void}){
 const room=drawing.graph.rooms.find(row=>row.key===selected);
 const [name,setName]=useState(room?.name??''),[x,setX]=useState('0'),[y,setY]=useState('0'),[error,setError]=useState('');
 const t=drawing.graph.wallThicknessMm;
 return <div className="studio-properties-panel">
  <div className="studio-property-section-label">SELECTED ELEMENT</div>
  <label className="studio-property-field">Room<select aria-label="Properties selected room" value={room?.key??''} onChange={event=>onSelect(event.target.value)}><option value="">Plan geometry</option>{drawing.graph.rooms.map(value=><option key={value.key} value={value.key}>{value.name}</option>)}</select></label>
  <h2>{room?.name??'Plan geometry'}</h2><p className="studio-property-muted">{room?'Room':'Footprint'} · Proposed design</p>
  <dl className="studio-property-facts"><div><dt>{room?'Area':'Footprint area'}</dt><dd>{(room?room.areaMm2/1e6:drawing.graph.site.widthMm*drawing.graph.site.depthMm/1e6).toFixed(1)} m²</dd></div><div><dt>Width</dt><dd>{(room?Math.max(0,room.rect[2]-room.rect[0]-t):drawing.graph.site.widthMm).toLocaleString()} mm</dd></div><div><dt>Depth</dt><dd>{(room?Math.max(0,room.rect[3]-room.rect[1]-t):drawing.graph.site.depthMm).toLocaleString()} mm</dd></div><div><dt>Height</dt><dd>{drawing.graph.wallHeightMm?.toLocaleString()??'Unavailable'} mm</dd></div><div><dt>Wall thickness</dt><dd>{t.toLocaleString()} mm</dd></div><div><dt>Design version</dt><dd>v{drawing.version} · Current proposal</dd></div></dl>
  <div className="studio-property-section-label">ANNOTATION</div>
  <form onSubmit={event=>{event.preventDefault();if(!room)return;const offsetX=Number(x),offsetY=Number(y);if(!name.trim()||!x.trim()||!y.trim()||![offsetX,offsetY].every(Number.isFinite)||Math.abs(offsetX)>drawing.graph.site.widthMm||Math.abs(offsetY)>drawing.graph.site.depthMm){setError('Enter a room label and offsets within this plan footprint.');return;}setError('');onRequest(`Prepare a reviewable annotation proposal for room ${room.name}: label ${JSON.stringify(name.trim())}, offset X ${offsetX} mm, offset Y ${offsetY} mm. This is a proposal request, not approval to change Revit.\n\nViewport context: 2D annotation; room: ${room.name} (${room.key}); planId: ${drawing.planId}; version: ${drawing.version}; fingerprint: ${drawing.fingerprint}.`);}}>
   <label className="studio-property-field">Room label<input aria-label="Annotation room label" required maxLength={120} disabled={!room} value={name} onChange={event=>setName(event.target.value)}/></label>
   <div className="studio-property-pair"><label className="studio-property-field">Offset X · mm<input aria-label="Annotation offset X" type="number" required min={-drawing.graph.site.widthMm} max={drawing.graph.site.widthMm} disabled={!room} value={x} onChange={event=>setX(event.target.value)}/></label><label className="studio-property-field">Offset Y · mm<input aria-label="Annotation offset Y" type="number" required min={-drawing.graph.site.depthMm} max={drawing.graph.site.depthMm} disabled={!room} value={y} onChange={event=>setY(event.target.value)}/></label></div>
   <Button type="submit" variant="secondary" disabled={!room}><Eye size={15}/>Preview annotation change</Button>
   {error&&<p role="alert" className="error-banner">{error}</p>}
  </form>
  <p className="studio-annotation-note">Preview adds an editable request to the assistant. Send it to generate the proposal. Revit changes require separate approval.</p>
  <div className="studio-property-review"><strong><ShieldCheck size={17}/>Plan ready to review</strong><p>Inspect the exact geometry, then prepare the native proposal for this project.</p><Button onClick={onReview}>Review design<ArrowRight size={15}/></Button></div>
  <details className="studio-property-identity"><summary>Design identity</summary><code>{drawing.planId} · v{drawing.version}<br/>{drawing.fingerprint}</code></details>
 </div>;
}
