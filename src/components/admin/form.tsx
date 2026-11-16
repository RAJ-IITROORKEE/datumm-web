'use client';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/vendor/affectui/card-clean';
import { featureEnabled } from '@/lib/capabilities.mjs';
import { useCapabilities } from './capabilities-context';
import { ResultState, useAdminClient, useAdminConfig, type Result } from './use-admin';
import type { AdminConfig } from '@/lib/admin-config.mjs';
import styles from './admin-form.module.css';

type KnowledgeDraft = {url:string;title:string;corpus:string};
type SharedConfig = ReturnType<typeof useAdminConfig> & {pendingChipCount:number; pendingChips:Record<string,string>; setPendingChip:(id:string,value:string)=>void; activate:(accountId:string)=>void; discardAll:()=>void; knowledge:KnowledgeDraft; knowledgeDirty:boolean; setKnowledge:(value:KnowledgeDraft)=>void; knowledgePending:boolean; knowledgeResult:Result<unknown>|null; knowledgeUnknown:boolean; knowledgeNotice:string; submitKnowledge:()=>Promise<boolean>; allowKnowledgeRetry:()=>void};
const ConfigContext = createContext<SharedConfig | null>(null);
export function AdminConfigProvider({children,accountId,deferred=false}:{children:ReactNode;accountId?:string|null;deferred?:boolean}) {
  const [active,setActive]=useState(!deferred);
  const config = useAdminConfig(active);
  const client=useAdminClient();
  const [pendingChips, setPendingChips] = useState<Record<string,string>>({});
  const [knowledge,setKnowledgeState]=useState<KnowledgeDraft>({url:'',title:'',corpus:'other'});
  const [knowledgeBaseline,setKnowledgeBaseline]=useState('other');
  const knowledgeRef=useRef(knowledge), knowledgeRevision=useRef(0), knowledgeGeneration=useRef(0), knowledgeBusy=useRef(false), knowledgeUnknownRef=useRef(false), mounted=useRef(false);
  const [knowledgePending,setKnowledgePending]=useState(false),[knowledgeResult,setKnowledgeResult]=useState<Result<unknown>|null>(null),[knowledgeUnknown,setKnowledgeUnknown]=useState(false),[knowledgeNotice,setKnowledgeNotice]=useState('');
  const [knowledgeDetached,setKnowledgeDetached]=useState(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const setKnowledge=(value:KnowledgeDraft)=>{knowledgeRef.current=value;knowledgeRevision.current++;setKnowledgeState(value);};
  const submitKnowledge=async()=>{
    if(knowledgeBusy.current||knowledgeUnknownRef.current)return false;
    const value=knowledgeRef.current, revision=knowledgeRevision.current, generation=knowledgeGeneration.current;
    if(!/^https:\/\/[^\s]{4,}$/.test(value.url.trim()))return false;
    knowledgeBusy.current=true;setKnowledgePending(true);setKnowledgeResult(null);setKnowledgeNotice('');
    const result=await client<unknown>('admin/knowledge/sources',{method:'POST',body:{url:value.url.trim(),corpus:value.corpus,...(value.title.trim()&&{title:value.title.trim()})}});
    if(!mounted.current)return false;
    if(generation!==knowledgeGeneration.current){knowledgeBusy.current=false;setKnowledgePending(false);setKnowledgeDetached(false);return false;}
    knowledgeBusy.current=false;setKnowledgePending(false);
    if(result.ok){if(knowledgeRevision.current===revision){setKnowledge({url:'',title:'',corpus:value.corpus});setKnowledgeBaseline(value.corpus);}setKnowledgeNotice('Source added.');return true;}
    setKnowledgeResult(result);if(result.reason==='error'){knowledgeUnknownRef.current=true;setKnowledgeUnknown(true);}return false;
  };
  const setPendingChip = useCallback((id:string,value:string) => setPendingChips(previous => {
    if ((previous[id] ?? '') === value) return previous;
    const next = {...previous};
    if (value) next[id] = value; else delete next[id];
    return next;
  }), []);
  const pendingChipCount = Object.keys(pendingChips).length;
  const knowledgeDirty=Boolean(knowledge.url || knowledge.title || knowledge.corpus !== knowledgeBaseline);
  const activate=useCallback((id:string)=>{if(accountId && accountId===id)setActive(true);},[accountId]);
  const discardAll=()=>{config.discard();setPendingChips({});knowledgeGeneration.current++;setKnowledgeDetached(knowledgeBusy.current);knowledgeUnknownRef.current=false;setKnowledgeUnknown(false);setKnowledge({url:'',title:'',corpus:'other'});setKnowledgeBaseline('other');setKnowledgeResult(null);setKnowledgeNotice('');if(deferred)setActive(false);};
  useEffect(() => {
    if (!config.dirty && !config.saving && !pendingChipCount && !knowledgeDirty && !(knowledgePending&&!knowledgeDetached) && !knowledgeUnknown) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [config.dirty, config.saving, pendingChipCount, knowledgeDirty, knowledgePending, knowledgeDetached, knowledgeUnknown]);
  return <ConfigContext.Provider value={{...config,pendingChipCount,pendingChips,setPendingChip,activate,discardAll,knowledge,knowledgeDirty,setKnowledge,knowledgePending,knowledgeResult,knowledgeUnknown,knowledgeNotice,submitKnowledge,allowKnowledgeRetry:()=>{knowledgeUnknownRef.current=false;setKnowledgeUnknown(false);}}}>{children}</ConfigContext.Provider>;
}
export const useOptionalAdminConfig = () => useContext(ConfigContext);
export function useSharedAdminConfig() {
  const config = useContext(ConfigContext);
  if (!config) throw new Error('Admin configuration requires its shell.');
  return config;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return <header className={styles.pageHeader}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className={styles.headerActions}>{actions}</div>}</header>;
}

export function SettingsGroup({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = useId();
  return <Card as="section" className={styles.group} aria-labelledby={id}><div className={styles.groupHeading}><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div><div className={styles.groupFields}>{children}</div></Card>;
}

/** Label, helper and error retain their control association in both settings and stacked forms. */
export function Field({ label, hint, error, children, className, layout = 'stack' }: { label: string; hint?: string; error?: string; className?: string; layout?: 'row' | 'stack'; children: (p: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode }) {
  const id = useId(), note = `${id}-note`, problem = `${id}-error`;
  return (
    <div className={[styles.field, layout === 'row' ? styles.fieldRow : styles.fieldStack, className].filter(Boolean).join(' ')}>
      <div className={styles.fieldLabel}><label htmlFor={id}>{label}</label>{hint && <p id={note}>{hint}</p>}</div>
      <div className={styles.fieldControl}>{children({ id, 'aria-describedby': [hint && note, error && problem].filter(Boolean).join(' ') || undefined, 'aria-invalid': error ? true : undefined })}{error && <p id={problem} className={styles.fieldError}>{error}</p>}</div>
    </div>
  );
}

/** Chips keep their full value readable and remain removable with the keyboard. */
export function ChipList({ label, values, onChange, max, normalize = (v: string) => v.trim(), placeholder, error, hint, draftKey }: { label: string; values: string[]; onChange: (v: string[]) => void; max: number; normalize?: (v: string) => string; placeholder?: string; error?: string; hint?: string; draftKey?:string }) {
  const [localText, setLocalText] = useState('');
  const [feedback, setFeedback] = useState('');
  const generatedId = useId(), chipId = draftKey ?? generatedId, config = useContext(ConfigContext);
  const text = config?.pendingChips ? config.pendingChips[chipId] ?? '' : localText;
  const setText = (value:string) => { setLocalText(value); config?.setPendingChip?.(chipId, value); };
  const setPendingChip = config?.setPendingChip;
  useEffect(() => () => { if (!draftKey) setPendingChip?.(chipId, ''); }, [chipId, draftKey, setPendingChip]);
  const input = useRef<HTMLInputElement>(null);
  const add = () => {
    const v = normalize(text);
    if (!v) return;
    if (values.includes(v)) { setFeedback('This entry is already in the list.'); return; }
    if (values.length >= max) { setFeedback(`The list is limited to ${max} entries.`); return; }
    onChange([...values, v]); setText(''); setPendingChip?.(chipId, ''); setFeedback(''); input.current?.focus();
  };
  return (
    <Field layout="row" label={label} error={error || feedback} hint={`${hint ? `${hint} ` : ''}${values.length} of ${max} entries.`}>
      {p => <>
        {values.length > 0 && <ul className={styles.chips} aria-label={label}>{values.map(v => <li key={v}><span>{v}</span><button type="button" aria-label={`Remove ${v}`} onClick={() => { onChange(values.filter(x => x !== v)); setFeedback(''); }}><X aria-hidden /></button></li>)}</ul>}
        <div className={styles.chipAdd}><Input {...p} ref={input} value={text} placeholder={placeholder} onChange={e => { setText(e.target.value); setFeedback(''); }} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} /><Button type="button" variant="outline" onClick={add} disabled={!text.trim() || values.length >= max}><Plus aria-hidden /> Add</Button></div>
      </>}
    </Field>
  );
}

/** Collapsible directory row used by Skills and MCP servers. */
export function ItemCard({ title, subtitle, badges, open, onToggle, onRemove, children, invalid = false }: { title: string; subtitle: string; badges?: ReactNode; open: boolean; onToggle: () => void; onRemove: () => void; children: ReactNode; invalid?: boolean }) {
  const id = useId();
  const config = useContext(ConfigContext);
  return (
    <div className={styles.item}>
      <div className={styles.itemHeading}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className={styles.itemToggle}>
          <ChevronDown className={`${styles.chevron} ${open ? '' : styles.closed}`} aria-hidden />
          <span className={styles.itemCopy}><span className={styles.itemTitle}>{title}</span><span className={styles.itemSubtitle}>{subtitle}</span></span>
          <span className={styles.itemBadges}>{invalid && <span className={styles.fieldError}>Needs attention</span>}{badges}</span>
        </button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${title}`} disabled={Boolean(config?.pendingChipCount)} title={config?.pendingChipCount ? 'Add or clear the unfinished list entry first.' : undefined} onClick={onRemove}><Trash2 aria-hidden /></Button>
      </div>
      <div id={id} hidden={!open} className={styles.itemBody}>{children}</div>
    </div>
  );
}

/** Loads one revision of config and keeps editing unavailable until a save settles. */
export function ConfigPage({ title, description, children }: { title: string; description: string; children: (c: { draft: AdminConfig; update: (p: Partial<AdminConfig>) => void; errors: Record<string, string>; effective: Record<string, unknown> }) => ReactNode }) {
  const c = useSharedAdminConfig();
  const count = Object.keys(c.errors).length;
  const history = featureEnabled(useCapabilities(), 'adminHistory');
  return (
    <>
      <PageHeader title={title} description={description} />
      <ResultState result={!c.draft && c.result?.ok ? null : c.result} onRetry={c.reload} />
      {c.draft && c.base && (
        <form className={styles.configForm} onSubmit={e => { e.preventDefault(); if (!c.pendingChipCount) void c.save(); }} noValidate aria-busy={c.saving}>
          {c.saveResult && !c.saveResult.ok && c.saveResult.reason === 'stale'
            ? <div role="alert" className={styles.notice}><div className={styles.noticeCopy}><strong>Changed elsewhere</strong><p>A newer configuration was saved. Your edits are still here. Reload discards them and opens the latest version.</p></div><Button type="button" variant="outline" size="sm" onClick={c.reload}>Reload latest</Button></div>
            : c.saveResult && <ResultState result={c.saveResult} />}
          <fieldset className={styles.configFields} disabled={c.saving}><legend className="sr-only">{title} configuration</legend>{children({ draft: c.draft, update: c.update, errors: c.errors, effective: c.base.effective })}</fieldset>
          <div className={styles.saveBar}>
            <p role="status">{c.saving ? 'Saving changes…' : c.pendingChipCount ? 'Add or clear the unfinished list entry before saving.' : count ? <span className={styles.fieldError}>{count} field{count > 1 ? 's' : ''} need attention. Check the highlighted settings.</span> : c.saved && !c.dirty ? 'Changes saved.' : c.dirty ? 'You have unsaved changes.' : <>{history ? <Link href="/admin/history">Revision {c.base.revision}</Link> : `Revision ${c.base.revision}`}{c.base.updatedBy ? ` · ${c.base.updatedBy}` : ''}</>}</p>
            <div className={styles.saveActions}><Button type="button" variant="ghost" disabled={!c.dirty || c.saving} onClick={c.reload}>Discard changes</Button><Button type="submit" disabled={!c.dirty || c.saving || count > 0 || c.pendingChipCount > 0}>{c.saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />} Save changes</Button></div>
          </div>
        </form>
      )}
    </>
  );
}
