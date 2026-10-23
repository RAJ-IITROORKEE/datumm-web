'use client';
import {useRef,useState} from 'react';
import {Play,Loader2} from 'lucide-react';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';

export function DemoMode({disabled,sessionId,onComplete}:{disabled:boolean;sessionId?:string;onComplete:(task:any)=>void}){
  const [open,setOpen]=useState(false),[target,setTarget]=useState<any>(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const running=useRef(false);
  const inspect=async()=>{setOpen(true);setBusy(true);setTarget(undefined);setError('');try{setTarget({...await window.desktop!.demoAction('target',{sessionId}),runId:crypto.randomUUID()});}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const run=async()=>{if(!target||busy||running.current)return;running.current=true;setBusy(true);setError('');try{const task=await window.desktop!.demoAction('run',{...target,commit:true});onComplete(task);setOpen(false);}catch(e){setError((e as Error).message);}finally{running.current=false;setBusy(false);}};
  return <><button className="desktop-demo-button" disabled={disabled||busy} onClick={()=>void inspect()} title="Predefined compact 1BHK demo"><Play size={14}/>Demo</button><Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent className="demo-mode-dialog"><DialogHeader><DialogTitle>Compact 1BHK demo</DialogTitle><DialogDescription>Predefined 8 × 9 m plan, 3000 mm walls, one floor, bedroom, living/dining, kitchen, bathroom and circulation with doors and windows. No AI setup questions.</DialogDescription></DialogHeader>{busy&&!target?<p role="status">Inspecting the active Revit target…</p>:target&&<><dl className="settings-diagnostics"><dt>Project</dt><dd>{target.documentName}</dd><dt>View / level</dt><dd>{target.viewName} / {target.levelName}</dd><dt>Placement</dt><dd>Internal origin 0 / 0 mm · rotation 0°</dd><dt>Construction</dt><dd>Measured loaded types, selected automatically</dd></dl><p>Use a disposable project with free space at the internal origin. This button creates the preset geometry after rollback preview, then verifies it. It does not save, sync or remove existing elements.</p><Button disabled={busy} onClick={()=>void run()}>{busy?<Loader2 size={15} className="spin"/>:<Play size={15}/>} {busy?'Building and verifying…':'Build demo in this project'}</Button></>}{error&&<p role="alert">{error}</p>}<Button variant="secondary" disabled={busy} onClick={()=>void inspect()}>Refresh target</Button></DialogContent></Dialog></>;
}
