'use client';
import { useRef, useState, type ReactNode } from 'react';
import { BookOpen, Download, ExternalLink, Loader2, Plus, RefreshCw, Search, ScrollText, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Field, PageHeader } from './form';
import { ResultState, useAdminClient, useAdminResource, type Result } from './use-admin';
import { CORPORA } from '@/lib/admin-config.mjs';
import styles from './data-sections.module.css';

const when = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(+d) ? d.toLocaleString() : iso || 'Not supplied'; };
function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return <div className={styles.tableScroll} role="region" aria-label={caption+', scroll to see all columns'} tabIndex={0}><table className={styles.table}><caption className="sr-only">{caption}</caption><thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
function EmptyState({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: ReactNode }) {
  return <div className={styles.empty}><Icon size={24} aria-hidden/><h2>{title}</h2><p>{children}</p></div>;
}
function RecordSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <div className={styles.search}><Search size={15} aria-hidden/><input type="search" aria-label={label} placeholder={label} value={value} onChange={event=>onChange(event.target.value)}/>{value&&<button type="button" aria-label={'Clear '+label.toLowerCase()} onClick={()=>onChange('')}><X size={14} aria-hidden/></button>}</div>;
}

type Overview = { health: string; imageVersion: string; counts: { tasks: number; owners: number; activeRuns: number; runsToday: number }; usdToday: number };
export function OverviewSection() {
  const { result, load, data } = useAdminResource<Overview>('admin/overview');
  const [refreshing,setRefreshing]=useState(false);
  const reload=()=>{setRefreshing(true);void load().finally(()=>setRefreshing(false));};
  return <>
    <PageHeader title="Overview" description="Service status and activity across the hosted workspace." actions={<Button variant="outline" size="sm" disabled={refreshing} onClick={reload}><RefreshCw className={refreshing?'animate-spin':''} aria-hidden/>{refreshing?'Refreshing…':'Refresh'}</Button>}/>
    <ResultState result={result} onRetry={reload}/>
    {data&&<div className={styles.stack}>
      <section className={styles.group} aria-labelledby="admin-service-heading"><div className={styles.groupHeading}><h2 id="admin-service-heading">Hosted service</h2><p>The latest status reported by the service.</p></div><dl className={styles.facts}><div><dt>Health</dt><dd><span className={styles.health} data-healthy={/^(ok|healthy|up)$/i.test(data.health)}><span aria-hidden/>{data.health}</span></dd></div><div><dt>Running version</dt><dd className={styles.identifier}>{data.imageVersion}</dd></div></dl></section>
      <section className={styles.group} aria-labelledby="admin-activity-heading"><div className={styles.groupHeading}><h2 id="admin-activity-heading">Workspace activity</h2><p>Recorded counts from the hosted backend.</p></div><dl className={styles.counts}>{[['Tasks',data.counts.tasks],['Accounts',data.counts.owners],['Active runs',data.counts.activeRuns],['Runs today',data.counts.runsToday]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{typeof value==='number'?value.toLocaleString():value}</dd></div>)}</dl></section>
      <section className={styles.group} aria-labelledby="admin-cost-heading"><div className={styles.groupHeading}><h2 id="admin-cost-heading">Reported cost</h2><p>Service-reported usage cost, separate from subscriptions and invoices.</p></div><dl className={styles.facts}><div><dt>Today · USD</dt><dd className={styles.amount}>${Number(data.usdToday).toFixed(2)}</dd></div></dl></section>
    </div>}
  </>;
}

type Source = { id: string; url: string; title: string; corpus: string; status: 'indexing' | 'ready' | 'failed'; chunks: number; updatedAt: string; error?: string };
const statusVariant = { ready: 'outline', indexing: 'secondary', failed: 'destructive' } as const;
export function KnowledgeSection() {
  const { result, load, data } = useAdminResource<Source[]>('admin/knowledge/sources', rows => rows.some(r => r.status === 'indexing') ? 4000 : 0);
  const client=useAdminClient();
  const [form, setForm] = useState({ url: '', title: '', corpus: 'other' });
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState<string|null>(null),busyRef=useRef(false);
  const [action,setAction]=useState<Result<unknown>|null>(null),[notice,setNotice]=useState('');
  const [confirm,setConfirm]=useState<string|null>(null);
  const run=async(key:string,path:string,method:string,body?:unknown)=>{
    if(busyRef.current)return false;
    busyRef.current=true;setBusy(key);setAction(null);setNotice('');
    try{const r=await client<unknown>(path,{method,body});setAction(r.ok?null:r);if(r.ok){setConfirm(null);setNotice(method==='DELETE'?'Source removed.':method==='POST'&&key!=='add'?'Reindex requested.':'Source added.');await load();}return r.ok;}
    finally{busyRef.current=false;setBusy(null);}
  };
  const urlOk=/^https:\/\/[^\s]{4,}$/.test(form.url.trim());
  const shown=data?.filter(source=>(source.title+' '+source.url+' '+source.corpus+' '+source.status).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <>
    <PageHeader title="Knowledge" description="Public pages the agent can search and cite. Add a source to make its title, link and short excerpts available."/>
    <div className={styles.stack}>
      <section className={styles.group} aria-labelledby="admin-add-source-heading"><div className={styles.groupHeading}><h2 id="admin-add-source-heading">Add a source</h2><p>HTTPS pages are indexed in the background. PDF sources are not supported yet.</p></div>
        <form className={styles.sourceForm} noValidate onSubmit={async event=>{event.preventDefault();if(!urlOk||busyRef.current)return;if(await run('add','admin/knowledge/sources','POST',{url:form.url.trim(),corpus:form.corpus,...(form.title.trim()&&{title:form.title.trim()})}))setForm({url:'',title:'',corpus:form.corpus});}}>
          <fieldset disabled={!!busy} className={styles.sourceFields}>
            <Field label="Source URL" error={form.url&&!urlOk?'Enter an https:// URL.':undefined}>{p=><Input {...p} type="url" required placeholder="https://" value={form.url} onChange={event=>setForm({...form,url:event.target.value})}/>}</Field>
            <div className={styles.formColumns}><Field label="Title (optional)">{p=><Input {...p} maxLength={120} value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/>}</Field><Field label="Corpus">{p=><Select {...p} value={form.corpus} onChange={event=>setForm({...form,corpus:event.target.value})}>{CORPORA.map(c=><option key={c}>{c}</option>)}</Select>}</Field></div>
            <div className={styles.formAction}><Button type="submit" disabled={!urlOk||!!busy}>{busy==='add'?<Loader2 className="animate-spin" aria-hidden/>:<Plus aria-hidden/>}Add source</Button></div>
          </fieldset>
        </form>
      </section>
      {action&&<ResultState result={action}/>}
      <p role="status" className={styles.feedback}>{notice}</p>
      <section aria-label="Knowledge sources"><div className={styles.listHeading}><h2>Sources {data&&<span>{data.length}</span>}</h2><RecordSearch value={query} onChange={setQuery} label="Search sources"/></div>
        <ResultState result={result} onRetry={()=>void load()}/>
        {data&&(data.length===0?<EmptyState icon={BookOpen} title="No sources yet">Add a public page above to start building the agent’s knowledge.</EmptyState>:shown?.length===0?<EmptyState icon={Search} title="No matching sources">Try another title, URL, corpus or status, or clear your search.</EmptyState>:<Table caption="Knowledge sources" head={['Source','Corpus','Status','Chunks','Updated','Actions']}>{shown?.map(source=><tr key={source.id}>
          <td className={styles.sourceCell}><a href={source.url} target="_blank" rel="noreferrer noopener">{source.title||source.url}<ExternalLink size={12} aria-hidden/></a><span>{source.url}</span>{source.error&&<p className={styles.error}>{source.error}</p>}</td>
          <td>{source.corpus}</td><td><Badge variant={statusVariant[source.status]??'outline'}>{source.status==='indexing'&&<Loader2 className="animate-spin" aria-hidden/>}{source.status}</Badge></td><td className={styles.numeric}>{source.chunks.toLocaleString()}</td><td className={styles.timestamp}>{when(source.updatedAt)}</td>
          <td><div className={styles.rowActions}><Button variant="ghost" size="icon" aria-label={'Reindex '+(source.title||source.url)} disabled={!!busy||source.status==='indexing'} onClick={()=>void run(source.id,'admin/knowledge/sources/'+source.id+'/reindex','POST')}><RefreshCw aria-hidden/></Button>{confirm===source.id?<><Button variant="destructive" size="sm" disabled={!!busy} onClick={()=>void run(source.id,'admin/knowledge/sources/'+source.id,'DELETE')}>Confirm delete</Button><Button variant="ghost" size="sm" disabled={!!busy} onClick={()=>setConfirm(null)}>Cancel</Button></>:<Button variant="ghost" size="icon" aria-label={'Delete '+(source.title||source.url)} disabled={!!busy} onClick={()=>setConfirm(source.id)}><Trash2 aria-hidden/></Button>}</div></td>
        </tr>)}</Table>)}
      </section>
    </div>
  </>;
}

export type PluginRelease = { version: string; file: string; checksumUrl: string; sha256: string; bytes: number; unsigned: boolean; builtAt: string; sourceCommit: string; revit: string; capabilities: string[] };
export function PluginSection({release}:{release:PluginRelease}) {
  return <><PageHeader title="Revit plugin" description="The connector release included with this deployment." actions={<Button asChild><a href={release.file}><Download aria-hidden/>Download installer</a></Button>}/><div className={styles.stack}>
    <section className={styles.group} aria-labelledby="admin-release-heading"><div className={styles.groupHeading}><h2 id="admin-release-heading">Published release</h2><p>Install the connector to bring a Revit model into DATUMM.</p></div><dl className={styles.facts}><div><dt>Version</dt><dd className={styles.identifier}>{release.version}</dd></div><div><dt>Supported Revit</dt><dd>{release.revit}</dd></div><div><dt>Installer size</dt><dd>{(release.bytes/1048576).toFixed(1)} MB</dd></div><div><dt>Built</dt><dd>{when(release.builtAt)}</dd></div><div><dt>Signing</dt><dd><Badge variant="outline">{release.unsigned?'Unsigned installer':'Signed installer'}</Badge></dd></div></dl></section>
    <section className={styles.group} aria-labelledby="admin-release-capabilities"><div className={styles.groupHeading}><h2 id="admin-release-capabilities">Release capabilities</h2><p>Declared by this plugin release. A connected model and exact approval still govern native changes.</p></div><ul className={styles.capabilities}>{release.capabilities.map(capability=><li key={capability}>{capability}</li>)}</ul></section>
    <details className={styles.details}><summary>Integrity and source details</summary><dl className={styles.facts}><div><dt>SHA-256</dt><dd><code>{release.sha256}</code></dd></div><div><dt>Checksum file</dt><dd><a href={release.checksumUrl}>{release.checksumUrl.split('/').pop()}</a></dd></div><div><dt>Source commit</dt><dd><code>{release.sourceCommit}</code></dd></div></dl></details>
  </div></>;
}
export function AuditSection() {
  const {result,load,data}=useAdminResource<{at:string;by:string;summary:string}[]>('admin/audit');
  const [query,setQuery]=useState('');
  const shown=data?.filter(row=>(row.by+' '+row.summary+' '+when(row.at)).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <><PageHeader title="Audit log" description="The last 100 recorded admin changes."/><div className={styles.listHeading}><span className={styles.listHint}>Configuration history</span><RecordSearch value={query} onChange={setQuery} label="Search audit log"/></div><ResultState result={result} onRetry={()=>void load()}/>{data&&(data.length===0?<EmptyState icon={ScrollText} title="No changes recorded">Admin changes will appear here after they are saved.</EmptyState>:shown?.length===0?<EmptyState icon={Search} title="No matching changes">Try another account, date or description, or clear your search.</EmptyState>:<Table caption="Admin audit log" head={['When','By','Change']}>{shown?.map((row,index)=><tr key={index}><td className={styles.timestamp}>{when(row.at)}</td><td>{row.by}</td><td>{row.summary}</td></tr>)}</Table>)}</>;
}
