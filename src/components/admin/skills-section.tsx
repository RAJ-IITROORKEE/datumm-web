'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Plus, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { MODES, type AdminConfig, type AdminSkill } from '@/lib/admin-config.mjs';
import { MODE_LABELS } from '@/lib/admin-tools.mjs';
import { featureEnabled } from '@/lib/capabilities.mjs';
import { editedSkill, formatSkillMd, type SkillText } from '@/lib/skill-md.mjs';
import { activeModes, toggleSkillMode } from '@/lib/skill-versions.mjs';
import { useCapabilities } from './capabilities-context';
import { SkillsSection } from './config-sections';
import { ConfigPage, SettingsGroup, useSharedAdminConfig } from './form';
import { SkillDetail } from './skill-detail';
import { SkillEditorDialog } from './skill-editor-dialog';
import { SkillTester } from './skill-tester';
import styles from './skills-section.module.css';

const FILTERS = ['all', ...MODES, 'off'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL = (f: Filter) => (f === 'all' ? 'All' : f === 'off' ? 'Off' : MODE_LABELS[f]);
const BLANK = '---\nname: \ndescription: Use when \n---\n';
const MAX_IMPORT = 20_000;
const DESCRIPTION = 'The agent sees each skill\'s name and "use when" line and reads the full '
  + 'text only when it needs it.';

const NARROW = '(max-width: 900px)';
const subscribe = (notify: () => void) => {
  const query = matchMedia(NARROW);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};
const useNarrow = () => useSyncExternalStore(
  subscribe, () => matchMedia(NARROW).matches, () => false,
);

/** The registry when the backend ranks and loads skills; today's section otherwise. */
export function SkillsRoute() {
  const caps = useCapabilities();
  if (!caps) return <p role="status">Loading…</p>;
  return featureEnabled(caps, 'skillsOnDemand') ? <SkillsRegistry /> : <SkillsSection />;
}

export function SkillsRegistry() {
  return (
    <ConfigPage title="Skills" description={DESCRIPTION}>
      {({ draft, update }) => <Registry draft={draft} update={update} />}
    </ConfigPage>
  );
}

function SkillRow({ skill, selected, onOpen, onChange }: {
  skill: AdminSkill; selected: boolean; onOpen: () => void; onChange: (next: AdminSkill) => void;
}) {
  const live = activeModes(skill);
  return (
    <li>
      <Card className={styles.row} data-selected={selected}>
        <button type="button" className={styles.open} onClick={onOpen}
          aria-current={selected ? 'true' : undefined}>
          <span className={styles.name}>
            {skill.name || skill.id} <span className={styles.id}>{skill.id}</span>
            {live.length === 0 && <Badge variant="secondary">off</Badge>}
          </span>
          <span className={styles.trigger}>{skill.description || 'No description'}</span>
        </button>
        <ul className={styles.switches} aria-label={`${skill.id} modes`}>
          {MODES.map(mode => (
            <li key={mode}>
              <label htmlFor={`${skill.id}-${mode}`}>{MODE_LABELS[mode]}</label>
              <Switch id={`${skill.id}-${mode}`} checked={live.includes(mode)}
                aria-label={`${MODE_LABELS[mode]}: enabled for ${skill.id}`}
                onCheckedChange={on => onChange(toggleSkillMode(skill, mode, on))} />
            </li>
          ))}
        </ul>
      </Card>
    </li>
  );
}

type Editor = { text: string; originalId: string | null };

function Registry({ draft, update }: {
  draft: AdminConfig; update: (patch: Partial<AdminConfig>) => void;
}) {
  const narrow = useNarrow();
  const revision = useSharedAdminConfig().base?.revision;
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  // A saved revision makes the "in your draft" notice stale.
  useEffect(() => { setNotice(''); }, [revision]);
  const opener = useRef<HTMLElement | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const removedAt = useRef<number | null>(null);
  const skills = draft.skills;
  const current = skills.find(s => s.id === selected) ?? null;
  const shown = skills.filter(s => filter === 'all' || (filter === 'off'
    ? activeModes(s).length === 0 : activeModes(s).includes(filter)));
  const remember = () => { opener.current = document.activeElement as HTMLElement | null; };
  const restoreFocus = () => setTimeout(() => opener.current?.focus(), 0);
  const set = (list: AdminSkill[]) => update({ skills: list });

  const apply = (text: SkillText) => {
    const old = skills.find(s => s.id === text.id);
    const edited = editedSkill(old, text);
    setSelected(text.id); setEditor(null); restoreFocus();
    if (!edited) { setNotice(`No changes to ${text.id}.`); return; }
    const item: AdminSkill = {
      ...edited, modes: old?.modes ?? ['ask', 'plan'], enabled: old?.enabled ?? true,
    };
    set(old ? skills.map(s => (s.id === old.id ? item : s)) : [...skills, item]);
    setNotice(`${old ? 'Updated' : 'Added'} ${item.id} in your draft. Save changes to apply.`);
  };
  const exportSkill = (skill: AdminSkill) => {
    const url = URL.createObjectURL(new Blob([formatSkillMd(skill)], { type: 'text/markdown' }));
    const link = Object.assign(document.createElement('a'), {
      href: url, download: `${skill.id}-SKILL.md`,
    });
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const importFile = async (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_IMPORT) { setNotice('That file is too large to be a SKILL.md.'); return; }
    // Errors show inline in the editor, so a bad file is fixed there rather than refused here.
    setNotice(''); setEditor({ text: await picked.text(), originalId: null });
  };
  const detail = current && (
    <SkillDetail skill={current} skills={skills} revision={revision}
      onEdit={() => {
        remember(); setEditor({ text: formatSkillMd(current), originalId: current.id });
      }}
      onExport={() => exportSkill(current)} onRestore={set}
      onRemove={() => { remember(); setRemoving(current.id); }} />
  );

  return <>
    <div className={styles.toolbar}>
      <ul className={styles.chips} aria-label="Filter skills">
        {FILTERS.map(f => (
          <li key={f}>
            <Button type="button" size="sm" variant={filter === f ? 'secondary' : 'outline'}
              aria-pressed={filter === f} onClick={() => setFilter(f)}>{FILTER_LABEL(f)}</Button>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button type="button" variant="outline"
          onClick={() => { remember(); file.current?.click(); }}>
          <Upload aria-hidden /> Import SKILL.md
        </Button>
        <input ref={file} type="file" accept=".md,text/markdown,text/plain" hidden
          aria-label="Import SKILL.md file"
          onChange={event => {
            void importFile(event.target.files?.[0]); event.target.value = '';
          }} />
        <Button type="button" disabled={skills.length >= 30}
          onClick={() => { remember(); setEditor({ text: BLANK, originalId: null }); }}>
          <Plus aria-hidden /> New skill
        </Button>
      </div>
    </div>
    <p role="status" className={styles.count} ref={status} tabIndex={-1}>{notice || `${skills.length} of 30 skills`}</p>
    <div className={`${styles.layout} ${current && !narrow ? '' : styles.single}`}>
      {shown.length === 0
        ? <p className={styles.empty}>{skills.length
          ? 'No skills match this filter.'
          : 'No skills yet. Add one, or import a SKILL.md file.'}</p>
        : <ul className={styles.list} aria-label="Skills" ref={list}>
          {shown.map(s => (
            <SkillRow key={s.id} skill={s} selected={s.id === selected}
              onOpen={() => setSelected(s.id)}
              onChange={next => set(skills.map(x => (x.id === s.id ? next : x)))} />
          ))}
        </ul>}
      {current && !narrow && (
        <aside aria-label="Skill details"><Card className={styles.detail}>{detail}</Card></aside>
      )}
    </div>
    {current && narrow && (
      <Sheet open onOpenChange={open => { if (!open) { setSelected(null); restoreFocus(); } }}>
        <SheetContent className="admin-root admin-skill-sheet">
          <SheetTitle className="sr-only">Skill details</SheetTitle>
          <SheetDescription className="sr-only">
            Preview, versions and actions for {current.id}.
          </SheetDescription>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="sm">Close</Button>
          </SheetClose>
          {detail}
        </SheetContent>
      </Sheet>
    )}
    <SettingsGroup title="Test a prompt"
      description="Which skills would the agent list for a prompt, and which one would it attach?">
      <SkillTester skills={skills} />
    </SettingsGroup>
    {editor && (
      <SkillEditorDialog key={`${editor.originalId ?? 'new'}:${editor.text.length}`}
        initialText={editor.text} originalId={editor.originalId}
        otherIds={skills.map(s => s.id)} full={skills.length >= 30} onApply={apply}
        onClose={() => { setEditor(null); restoreFocus(); }} />
    )}
    <Dialog open={Boolean(removing)}
      onOpenChange={open => { if (!open) { setRemoving(null); restoreFocus(); } }}>
      <DialogContent onCloseAutoFocus={event => {
        const at = removedAt.current;
        removedAt.current = null;
        if (at === null) return; // Cancel: the Remove button that opened it is still there
        // The removed skill's Remove button is gone: land on the row that took its place.
        event.preventDefault();
        const rows = [...(list.current?.querySelectorAll<HTMLElement>(`.${styles.open}`) ?? [])];
        (rows[Math.min(at, rows.length - 1)] ?? status.current)?.focus();
      }}>
        <DialogHeader>
          <DialogTitle>Remove {removing}?</DialogTitle>
          <DialogDescription>
            It leaves your draft now and the agent loses it after you save. Earlier versions stay
            in the config history.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={() => {
            removedAt.current = Math.max(0, shown.findIndex(s => s.id === removing));
            set(skills.filter(s => s.id !== removing)); setSelected(null); setRemoving(null);
            setNotice(`Removed ${removing} from your draft. Save changes to apply.`);
          }}>Remove skill</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
