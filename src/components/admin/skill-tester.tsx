'use client';
import { useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { SegmentedControl } from '@/components/vendor/affectui/segmented-control-clean';
import { MODES, type AdminSkill, type Mode } from '@/lib/admin-config.mjs';
import { MODE_LABELS } from '@/lib/admin-tools.mjs';
import { PREVIEW_PATH, parsePreview, previewBody } from '@/lib/skill-preview.mjs';
import { ResultState, useAdminClient, type Result } from './use-admin';
import styles from './skills-section.module.css';

const UNREADABLE: Result<unknown> = {
  ok: false, reason: 'error',
  message: 'The service answered in a format this page does not understand.',
};
const names = (ids: string[]) => (ids.length ? ids.join(', ') : 'none');

/** Asks the backend which skills a prompt would list and attach, over the unsaved draft. */
export function SkillTester({ skills }: { skills: AdminSkill[] }) {
  const client = useAdminClient();
  const id = useId();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<Mode>('ask');
  const [pending, setPending] = useState(false);
  const [shown, setShown] = useState<{
    key: string; answer: { listed: string[]; attached: string | null } | null;
    failure: Result<unknown> | null;
  } | null>(null);
  const latest = useRef(0);
  const body = previewBody({ prompt, mode, skills });
  const key = JSON.stringify(body);
  // An answer belongs to the exact prompt, mode and draft skills it was asked for.
  const { answer = null, failure = null } = shown?.key === key ? shown : {};
  const run = async () => {
    if (!body || pending) return;
    const request = ++latest.current;
    setPending(true); setShown(null);
    const result = await client<unknown>(PREVIEW_PATH, { method: 'POST', body });
    if (request !== latest.current) return;
    setPending(false);
    const parsed = result.ok ? parsePreview(result.data) : null;
    setShown({ key, answer: parsed, failure: !result.ok ? result : parsed ? null : UNREADABLE });
  };
  return (
    <div className={styles.tester}>
      <label htmlFor={`${id}-prompt`} className={styles.meta}>
        Type a sample prompt to see which skills the agent would list. Uses unsaved changes.
      </label>
      <Textarea id={`${id}-prompt`} rows={3} maxLength={2000} value={prompt}
        onChange={event => setPrompt(event.target.value)} />
      <div className={styles.testerRow}>
        <SegmentedControl aria-label="Mode to test" size="sm" value={mode}
          onChange={value => setMode(value)}
          options={MODES.map(value => ({ value, label: MODE_LABELS[value] }))} />
        <Button type="button" variant="outline" disabled={!body || pending}
          onClick={() => void run()}>
          {pending && <Loader2 className="animate-spin" aria-hidden />} Test prompt
        </Button>
      </div>
      <div role="status" aria-live="polite">
        {answer && (
          <p className={styles.result}>
            <span>Would list: {names(answer.listed)}</span>
            <span>Would attach: {answer.attached ?? 'none'}</span>
          </p>
        )}
      </div>
      {failure && <ResultState result={failure} />}
    </div>
  );
}
