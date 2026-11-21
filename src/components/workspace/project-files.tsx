'use client';

import {useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {FileUp} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input, Select} from '@/components/ui/input';
import {createWebHost} from '@/lib/host/web.mjs';
import {acceptSource, parseProjectSource, parseProjectSources, sourcePath, SOURCE_KIND_LABELS,
        PROJECT_SOURCE_VERSION_LIMIT, validUpload, type ProjectSource, type SourceKind} from '@/lib/project-sources.mjs';
import {ProjectSourcePreview} from './project-source-preview';
import styles from './project-files.module.css';

const host = createWebHost();
type ReadState = {key:string;rows?:ProjectSource[];error?:string};
function useSources(projectId: string, revision: number, sourceId?: string) {
  const [state, setState] = useState<ReadState>();
  const path = sourcePath(projectId,sourceId);
  const key = JSON.stringify([path,revision]);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const {signal} = controller;
    void (async () => {
      const response = await host.tasks.request(path,{signal,redirect:'error'});
      const rows = response.ok && parseProjectSources(await response.json(),projectId,sourceId);
      if (!signal.aborted) setState(rows ? {key,rows} : {key,error:'Files could not be loaded.'});
    })().catch(() => { if (!signal.aborted) setState({key,error:'Files could not be loaded.'}); });
    return () => controller.abort();
  },[path,key,projectId,sourceId]);
  return state?.key === key ? state : undefined;
}

function readBase64(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    const cancel = () => reader.abort();
    if (signal.aborted) { reject(signal.reason); return; }
    signal.addEventListener('abort',cancel,{once:true});
    reader.onloadend = () => {
      signal.removeEventListener('abort',cancel);
      if (signal.aborted || typeof reader.result !== 'string') reject(Error('The file could not be read.'));
      else resolve(reader.result.slice(reader.result.indexOf(',')+1));
    };
    reader.readAsDataURL(file);
  });
}

function errorMessage(status: number) {
  if (status === 409) return 'This file has a newer revision. Refresh and select the current revision before replacing it.';
  if (status === 413) return 'This file exceeds 2.5 MiB.';
  if (status === 429) return 'This project has reached its file capacity.';
  if (status === 415 || status === 422) return 'This file could not be accepted. Check the format and category.';
  return 'The file could not be uploaded.';
}

function SourceHistory({current, revision, onPreview}: {current:ProjectSource;revision:number;onPreview:(file:ProjectSource,opener:HTMLButtonElement)=>void}) {
  const versions = useSources(current.projectId,revision,current.sourceId);
  if (!versions) return <p role="status">Loading versions…</p>;
  if (versions.error) return <p role="alert">{versions.error}</p>;
  return <ul className={styles.revisions}>{versions.rows?.map(row =>
    <li key={row.version}><Button type="button" variant="ghost" size="sm" onClick={event => onPreview(row,event.currentTarget)}>Preview revision {row.version}</Button></li>)}</ul>;
}

/** Open only from the active account and selected project. The server checks ownership again. */
export function ProjectFiles({projectId, archived}: {projectId:string;archived:boolean}) {
  const [revision,setRevision] = useState(0);
  const [kind,setKind] = useState<SourceKind>('specification');
  const [replacement,setReplacement] = useState<ProjectSource>();
  const [history,setHistory] = useState<string>();
  const [preview,setPreview] = useState<ProjectSource>();
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState<{message:string;error?:boolean}>();
  const picker = useRef<HTMLInputElement>(null);
  const previewOpener = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController|null>(null);
  const formId = useId();
  const list = useSources(projectId,revision);
  useEffect(() => () => request.current?.abort(),[projectId,archived]);

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (archived || busy || request.current) return;
    const file = picker.current?.files?.[0], type = replacement?.kind ?? kind;
    const validation = validUpload(file,type), path = sourcePath(projectId);
    if (validation || !file || !path) { setNotice({message:validation || 'The project is unavailable.',error:true}); return; }
    const controller = new AbortController(), {signal} = controller;
    request.current = controller;
    setBusy(true); setNotice(undefined);
    try {
      const contentBase64 = await readBase64(file,signal);
      if (signal.aborted) return;
      const response = await host.tasks.request(path,{method:'POST',signal,redirect:'error',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({
          filename:file.name,kind:type,contentBase64,
          ...(replacement ? {sourceId:replacement.sourceId,expectedVersion:replacement.version} : {})
        })});
      if (!response.ok) throw Error(errorMessage(response.status));
      const saved = parseProjectSource(await response.json(),projectId);
      if (!saved || saved.kind !== type || (replacement && (saved.sourceId !== replacement.sourceId ||
          saved.version !== replacement.version+1)) || (!replacement && saved.version !== 1)) {
        throw Error('The saved file could not be verified. Refresh the list before retrying.');
      }
      if (signal.aborted) return;
      if (picker.current) picker.current.value='';
      setReplacement(undefined);
      setRevision(value => value+1);
      setNotice({message:'Revision ' + saved.version + ' uploaded.'});
    } catch (failure) {
      if (!signal.aborted) setNotice({message:failure instanceof Error ? failure.message : 'The file could not be uploaded.',error:true});
    } finally {
      if (request.current === controller) request.current=null;
      if (!signal.aborted) setBusy(false);
    }
  };
  const showPreview = (file: ProjectSource, opener:HTMLButtonElement) => {
    previewOpener.current = opener;
    setPreview(file);
  };
  const closePreview = () => {
    const opener = previewOpener.current;
    setPreview(undefined);
    if (opener?.isConnected) opener.focus();
  };
  const chooseReplacement = (file?: ProjectSource) => {
    setReplacement(file); setNotice(undefined);
    if (picker.current) { picker.current.value=''; picker.current.focus(); }
  };
  return <section className={styles.panel} aria-label="Project files">
    {!archived && <form className={styles.form} onSubmit={upload}>
      {replacement ? <div className={styles.toolbar}>
        <strong>New revision of <bdi>{replacement.filename}</bdi></strong>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => chooseReplacement()}>Cancel replacement</Button>
      </div> : <label className={styles.field}>File category
        <Select disabled={busy} value={kind} onChange={event => {
          setKind(event.target.value as SourceKind);
          if (picker.current) picker.current.value='';
        }}>
          {Object.entries(SOURCE_KIND_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </label>}
      <label className={styles.field} htmlFor={formId}>File
        <Input id={formId} ref={picker} required type="file" disabled={busy} accept={acceptSource(replacement?.kind ?? kind)} />
      </label>
      <div className={styles.toolbar}>
        <Button size="sm" type="submit" disabled={busy}><FileUp aria-hidden="true" />{busy ? 'Uploading…' : 'Upload file'}</Button>
        <span>{acceptSource(replacement?.kind ?? kind).replaceAll(',',', ')} · Up to 2.5 MiB</span>
      </div>
    </form>}
    <p className={styles.hint}>Search this project in Ask with <code>/sources your question</code>.</p>
    {notice && <p role={notice.error ? 'alert' : 'status'}>{notice.message}</p>}
    {!list && <p role="status">Loading project files…</p>}
    {list?.error && <div role="alert">{list.error} <Button type="button" size="sm" variant="ghost" onClick={() => setRevision(value => value+1)}>Try again</Button></div>}
    {list?.rows?.length === 0 && <p>No files in this project yet.</p>}
    {list?.rows && list.rows.length > 0 && <ul className={styles.list}>
      {list.rows.map(file => <li className={styles.row} key={file.sourceId}>
        <div className={styles.file}><strong dir="auto">{file.filename}</strong>
          <span>{SOURCE_KIND_LABELS[file.kind]} · Revision {file.version}</span></div>
        <div className={styles.toolbar}>
          <Button type="button" variant="outline" size="sm" aria-label={'Preview ' + file.filename + ' revision ' + file.version}
            onClick={event => showPreview(file,event.currentTarget)}>Preview</Button>
          <Button type="button" variant="ghost" size="sm" aria-label={'Versions of ' + file.filename} aria-expanded={history===file.sourceId} onClick={() => setHistory(history===file.sourceId ? undefined : file.sourceId)}>Versions</Button>
          {!archived && file.version < PROJECT_SOURCE_VERSION_LIMIT &&
            <Button type="button" variant="ghost" size="sm" disabled={busy} aria-label={'Upload revision of ' + file.filename}
              onClick={() => chooseReplacement(file)}>Upload revision</Button>}
        </div>
        {history === file.sourceId && <SourceHistory key={file.sourceId} current={file} revision={revision} onPreview={showPreview}/>}
        {preview?.sourceId === file.sourceId && <div>
          <Button type="button" variant="ghost" size="sm" onClick={closePreview}>Close preview</Button>
          <ProjectSourcePreview key={preview.version + ':' + preview.sha256} reference={preview}/>
        </div>}
      </li>)}
    </ul>}
  </section>;
}
