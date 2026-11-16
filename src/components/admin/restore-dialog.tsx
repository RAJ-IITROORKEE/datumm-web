'use client';
import { useRef, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { MAX_NOTE, restoreBlock, restoreBody, type HistoryDetail } from '@/lib/admin-history.mjs';
import { ChangeList } from './change-list';
import { Field, useSharedAdminConfig } from './form';
import { ResultState, useAdminClient, type ConfigEnvelope, type Result } from './use-admin';
import styles from './history-section.module.css';

const GONE: Result<unknown> = {
  ok: false, reason: 'error', message: 'This revision no longer exists. Reload history.',
};

/** Restore button and its confirmation dialog; a restore is a CAS-guarded save of revision N+1. */
export function RestoreAction({ detail, current, onRestored, onReload }: {
  detail: HistoryDetail; current: number;
  onRestored: (from: number, revision: number) => void; onReload: () => void;
}) {
  const client = useAdminClient();
  const shared = useSharedAdminConfig();
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<Result<unknown> | null>(null);
  const block = restoreBlock({
    ...detail, current, dirty: shared.dirty, saving: shared.saving,
    pendingChipCount: shared.pendingChipCount,
  });
  const next = current + 1;

  const confirm = async () => {
    const body = restoreBody({ fromRevision: detail.revision, expectedRevision: current, note });
    if (busy.current || !body) return;
    busy.current = true; setPending(true); setFailure(null);
    const result = await client<ConfigEnvelope>('admin/config/restore', { method: 'POST', body });
    busy.current = false; setPending(false);
    if (!result.ok) { setFailure(result.reason === 'missing' ? GONE : result); return; }
    const saved = Number(result.data?.revision);
    setOpen(false); setNote('');
    shared.reload();
    onRestored(detail.revision, Number.isInteger(saved) ? saved : next);
  };

  const change = (value: boolean) => { if (!pending) { setOpen(value); setFailure(null); } };
  const reload = () => { setOpen(false); setFailure(null); onReload(); };

  return <>
    <div className={styles.detailActions}>
      <Button ref={trigger} type="button" variant="outline" size="sm" disabled={Boolean(block)}
        aria-describedby={block ? `restore-why-${detail.revision}` : undefined}
        onClick={() => { setFailure(null); setOpen(true); }}>
        <RotateCcw aria-hidden />Restore
      </Button>
      {block && <span id={`restore-why-${detail.revision}`} className={styles.note}>{block}</span>}
    </div>
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="admin-leave-dialog"
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
        <DialogHeader>
          <DialogTitle>Restore revision {detail.revision}?</DialogTitle>
          <DialogDescription>
            Saves as revision {next}; running chats may pick up skills and web-search changes
            within 30 seconds
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogBody}>
          <div>
            <h3 className={styles.note}>These settings change from the live configuration</h3>
            <div className={styles.dialogChanges}>
              <ChangeList changes={detail.changesFromCurrent} empty="No settings differ."
                truncated={detail.changesFromCurrentTruncated} />
            </div>
          </div>
          <Field label="Note (optional)" hint="Shown to admins in history and the audit log.">
            {p => <>
              <Textarea {...p} rows={3} maxLength={MAX_NOTE} value={note} disabled={pending}
                onChange={event => setNote(event.target.value)} />
              <p className={`${styles.note} ${styles.counter}`}>{note.length} of {MAX_NOTE}</p>
            </>}
          </Field>
          {failure && <ResultState result={failure} />}
          {failure && !failure.ok && failure.reason === 'stale' && (
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              Reload history
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void confirm()}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Restore as revision {next}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
