'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { actionLabel, historyPath, parseHistory, type HistoryRow } from '@/lib/admin-history.mjs';
import { featureEnabled } from '@/lib/capabilities.mjs';
import type { AdminSkill } from '@/lib/admin-config.mjs';
import { formatSkillMd, hasUseWhen } from '@/lib/skill-md.mjs';
import {
  activeModes, skillFromSnapshot, skillVersions, withSkill, type SkillVersion,
} from '@/lib/skill-versions.mjs';
import { useCapabilities } from './capabilities-context';
import { useAdminClient } from './use-admin';
import styles from './skills-section.module.css';

const when = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(+date) ? date.toLocaleString() : 'time not supplied';
};
const whyNot = (version: SkillVersion) => (version.kind === 'removed'
  ? 'The skill was removed in this revision.'
  : version.restorable ? undefined : 'Contains data that cannot be restored');

// Versions come from the newest 50 history rows; "Load older" pages further back.
function useSkillHistory(enabled: boolean, revision: unknown) {
  const client = useAdminClient();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = useCallback(async (before: number | null, append: boolean) => {
    const result = await client<unknown>(historyPath({ before, limit: 50 }));
    const page = result.ok ? parseHistory(result.data) : null;
    if (!page) { setState('error'); return; }
    setRows(previous => (append ? [...previous, ...page.rows] : page.rows));
    setNext(page.nextBefore); setState('ready');
  }, [client]);
  useEffect(() => {
    if (enabled) { setState('loading'); void load(null, false); }
  }, [enabled, load, revision]);
  return { rows, next, state, older: () => next && load(next, true) };
}

function Versions({ id, versions, state, rows, busy, onRestore }: {
  id: string; versions: SkillVersion[]; state: string; rows: number; busy: boolean;
  onRestore: (revision: number) => void;
}) {
  if (state === 'loading') return <p role="status" className={styles.hint}>Loading versions…</p>;
  if (state === 'error') {
    return <p role="alert" className={styles.error}>Versions could not be loaded.</p>;
  }
  if (!versions.length) {
    return (
      <p className={styles.hint}>
        No saved change to this skill in the newest {rows} revisions.
      </p>
    );
  }
  return (
    <ul className={styles.versions}>{versions.map(version => (
      <li key={version.revision}>
        <div>
          Revision {version.revision}{' '}
          <Badge variant="outline">
            {version.kind === 'changed' ? actionLabel(version.action) : version.kind}
          </Badge>
          <span className={styles.sub}>
            {when(version.at)}{version.by ? ` · ${version.by}` : ''}
          </span>
          {version.fields.length > 0 && (
            <span className={styles.sub}>Changed: {version.fields.join(', ')}</span>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" title={whyNot(version)}
          disabled={busy || !version.restorable || version.kind === 'removed'}
          aria-label={`Restore ${id} from revision ${version.revision}`}
          onClick={() => onRestore(version.revision)}>
          <RotateCcw aria-hidden /> Restore this version
        </Button>
      </li>))}
    </ul>
  );
}

export function SkillDetail({ skill, skills, revision, onEdit, onExport, onRemove, onRestore }: {
  skill: AdminSkill; skills: AdminSkill[]; revision: unknown;
  onEdit: () => void; onExport: () => void; onRemove: () => void;
  onRestore: (skills: AdminSkill[]) => void;
}) {
  const client = useAdminClient();
  const history = featureEnabled(useCapabilities(), 'adminHistory');
  const { rows, next, state, older } = useSkillHistory(history, revision);
  const versions = useMemo(() => skillVersions(rows, skill.id), [rows, skill.id]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setStatus(''), [skill.id]);

  const restore = async (target: number) => {
    setBusy(true); setStatus('');
    const result = await client<unknown>(`admin/config/history/${target}`);
    setBusy(false);
    const item = result.ok ? skillFromSnapshot(result.data, skill.id) : null;
    const list = item && withSkill(skills, item);
    if (!list) { setStatus(`Revision ${target} could not be restored for this skill.`); return; }
    onRestore(list);
    setStatus(`Revision ${target} of this skill is in your draft. Save changes to apply it.`);
  };

  const live = activeModes(skill);
  return (
    <div className={styles.detailBody}>
      <div className={styles.detailHead}>
        <h2>{skill.name || skill.id}</h2>
        <p className={styles.meta}>
          <code className={styles.id}>{skill.id}</code>
          {' · '}{live.length ? `on in ${live.join(', ')}` : 'off'}
          {versions[0] && ` · last changed in revision ${versions[0].revision}`}
        </p>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil aria-hidden /> Edit
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onExport}>
          <Download aria-hidden /> Export SKILL.md
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 aria-hidden /> Remove
        </Button>
      </div>
      {!hasUseWhen(skill.description) && (
        <p className={styles.hint}>
          The description has no &quot;Use when…&quot; line, so the agent can only pick this
          skill by name.
        </p>
      )}
      <pre className={styles.preview} tabIndex={0} aria-label={`SKILL.md preview for ${skill.id}`}>
        {formatSkillMd(skill)}
      </pre>
      <section aria-labelledby="skill-versions">
        <h3 id="skill-versions" className={styles.name}>Versions</h3>
        {history
          ? <Versions id={skill.id} versions={versions} state={state} rows={rows.length}
            busy={busy} onRestore={target => void restore(target)} />
          : <p className={styles.hint}>
            This backend does not report config history, so versions are not available.
          </p>}
        {history && state === 'ready' && next && (
          <Button type="button" variant="ghost" size="sm" onClick={() => void older()}>
            Load older
          </Button>
        )}
        <p role="status" className={styles.hint}>{status}</p>
      </section>
    </div>
  );
}
