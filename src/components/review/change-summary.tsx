import {Layers3,Trash2} from 'lucide-react';
import styles from './review-panels.module.css';

export type ReviewOperation={key:string;kind:string}&Record<string,unknown>;
export type DeletionClosure={key:string;targetId:string;elements:{id:string;kind:string;name:string}[]};
const labels:Record<string,string>={wall:'Walls',floor:'Floors',door:'Doors',window:'Windows',room:'Rooms',family_instance:'Family instances',room_tag:'Room tags',set_room_metadata:'Room updates',set_room_color_scheme:'Room colour scheme assignments',move:'Moves',delete:'Deletions'};

/** Counts describe supplied operations, never measured quantities or completed writes. */
export function OperationChangeSummary({operations,title='Proposed changes'}:{operations:ReviewOperation[];title?:string}){
  const counts=new Map<string,number>();
  for(const op of operations)counts.set(op.kind,(counts.get(op.kind)??0)+1);
  return <section aria-label={title}><div className={styles.header}><div className={styles.heading}><h3 className={styles.title}>{title}</h3><p className={styles.description}>{operations.length} {operations.length===1?'operation':'operations'} in the supplied change set.</p></div><Layers3 size={17} aria-hidden/></div>{operations.length?<dl className={styles.facts}>{Array.from(counts,([kind,count])=><div key={kind}><dt>{labels[kind]??kind.replaceAll('_',' ')}</dt><dd>{count.toLocaleString()}</dd></div>)}</dl>:<p className={styles.note}>No operations were supplied. This summary does not establish model changes.</p>}</section>;
}

export function DeletionClosureReview({closure}:{closure:DeletionClosure}){
  return <section className={styles.panel} aria-label="Exact Revit deletion closure"><header className={styles.header}><div className={styles.heading}><h3 className={styles.title}>Review affected elements</h3><p className={styles.description}>{closure.elements.length} {closure.elements.length===1?'element':'elements'} in the exact deletion set.</p></div><span className={styles.status} data-tone="warning"><Trash2 aria-hidden/>Native deletion</span></header><p className={styles.note}>Revit evaluated this dependent set in a rollback-only transaction. Approving the proposal removes exactly these IDs; a changed set cancels the write. Explicit review approval is required.</p><dl className={styles.facts}><div><dt>Target element</dt><dd><code>{closure.targetId}</code></dd></div></dl><div className={styles.tableScroll} role="region" aria-label="Affected elements, scroll to see all columns" tabIndex={0}><table className={styles.table}><caption className="sr-only">Exact deletion closure</caption><thead><tr><th scope="col">Element</th><th scope="col">Role</th><th scope="col">Native ID</th></tr></thead><tbody>{closure.elements.map(element=><tr key={element.id}><td>{element.name}<br/><span>{element.kind.replaceAll('_',' ')}</span></td><td>{element.id===closure.targetId?'Target':'Dependent'}</td><td><code>{element.id}</code></td></tr>)}</tbody></table></div></section>;
}

export function NativeChangesPanel({operations,svg,pending}:{operations:ReviewOperation[];svg?:string;pending:boolean}){
  return <section className={styles.panel} aria-label="Native-bound changes"><OperationChangeSummary operations={operations}/><p className={styles.note}>Positions use Revit internal XY millimetres in the reviewed project and level. Hosted openings refer to wall keys in this batch; annotations use committed native IDs and inspected references.</p>{svg&&<details className={styles.details}><summary>Preview native positions</summary><img style={{width:'100%',maxHeight:360,objectFit:'contain',background:'var(--background)'}} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)} alt="Native-bound wall positions at the confirmed origin and rotation"/></details>}<details className={styles.details} open={pending||undefined}><summary>Review exact native changes</summary><ol className={styles.list}>{operations.map(op=><li key={op.key}><strong>{op.key} · {op.kind.replaceAll('_',' ')}</strong><pre className={styles.evidence}>{JSON.stringify(op,null,2)}</pre></li>)}</ol></details></section>;
}
