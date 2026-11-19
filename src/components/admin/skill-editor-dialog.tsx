'use client';
import { useId, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { BUILTIN_PREFIX } from '@/lib/admin-config.mjs';
import type { ToolHintOption } from '@/lib/skill-hints.mjs';
import {
  SKILL_LIMITS, hasUseWhen, parseSkillMd, setSkillMdTools, skillMdCounts, skillMdTools,
  type SkillText,
} from '@/lib/skill-md.mjs';
import { SkillToolHints } from './skill-tool-hints';
import styles from './skills-section.module.css';

/** The editor is a single SKILL.md; the draft changes only when the file parses cleanly. */
export function SkillEditorDialog({
  initialText, originalId, otherIds, full, toolOptions, onApply, onClose,
}: {
  initialText: string; originalId: string | null; otherIds: string[]; full: boolean;
  toolOptions: ToolHintOption[];
  onApply: (skill: SkillText) => void; onClose: () => void;
}) {
  const [text, setText] = useState(initialText);
  const base = useId();
  const parsed = useMemo(() => parseSkillMd(text), [text]);
  const counts = skillMdCounts(text);
  const tools = skillMdTools(text);
  const errors: string[] = parsed.ok ? [] : parsed.errors.map(error => error.message);
  if (parsed.ok) {
    const id = parsed.skill.id;
    // Renaming would orphan the version history, which is keyed by id.
    if (originalId && id !== originalId) {
      errors.push(`The name must stay "${originalId}". Create a new skill for another name.`);
    }
    if (!originalId && otherIds.includes(id)) {
      errors.push(`A skill named "${id}" exists. Open it and edit it instead.`);
    }
    if (!originalId && id.startsWith(BUILTIN_PREFIX)) {
      errors.push(`The "${BUILTIN_PREFIX}" prefix is reserved for DATUMM starter skills.`);
    }
    if (!originalId && full) errors.push('The registry holds at most 30 skills.');
  }
  const valid = parsed.ok && errors.length === 0;
  const trigger = parsed.ok && !hasUseWhen(parsed.skill.description);
  const describedBy = [errors.length && `${base}-errors`, `${base}-counters`]
    .filter(Boolean).join(' ');
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{originalId ? `Edit ${originalId}` : 'New skill'}</DialogTitle>
          <DialogDescription>
            One SKILL.md: a header with name, optional title and description, then the
            instructions. Modes and the on/off switch are set in the list, not in the file.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={`${base}-text`} className={styles.sr}>SKILL.md text</label>
        <Textarea id={`${base}-text`} className={styles.editor} rows={14} value={text}
          spellCheck={false} aria-invalid={errors.length > 0} aria-describedby={describedBy}
          onChange={event => setText(event.target.value)} />
        <SkillToolHints options={toolOptions} selected={tools}
          onChange={names => setText(setSkillMdTools(text, names))} />
        <p id={`${base}-counters`} className={styles.counters}>
          <span data-over={counts.description > SKILL_LIMITS.description}>
            description {counts.description} of {SKILL_LIMITS.description}
          </span>
          <span data-over={counts.body > SKILL_LIMITS.instructions}>
            body {counts.body} of {SKILL_LIMITS.instructions}
          </span>
        </p>
        {errors.length > 0 && (
          <ul id={`${base}-errors`} className={`${styles.error} ${styles.errors}`} role="alert">
            {errors.map(message => <li key={message}>{message}</li>)}
          </ul>
        )}
        {trigger && (
          <p className={styles.hint}>
            Add a &quot;Use when…&quot; line to the description so the agent can choose this
            skill.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={!valid}
            onClick={() => { if (parsed.ok) onApply(parsed.skill); }}>
            {originalId ? 'Apply changes' : 'Add skill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
