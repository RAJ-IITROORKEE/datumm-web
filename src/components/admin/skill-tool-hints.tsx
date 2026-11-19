'use client';
import { useId } from 'react';
import { HINT_MAX, toggleHint, type ToolHintOption } from '@/lib/skill-hints.mjs';
import styles from './skills-section.module.css';

/** "Tools that help": checkboxes over the catalog's model-facing tools. Suggests only. */
export function SkillToolHints({ options, selected, onChange }: {
  options: ToolHintOption[]; selected: string[]; onChange: (names: string[]) => void;
}) {
  const base = useId();
  const known = new Set(options.flatMap(option => option.names));
  const groups = [...options, ...(selected.some(name => !known.has(name))
    ? [{ id: 'other', label: 'Not in this backend\'s tool list',
      names: selected.filter(name => !known.has(name)) }] : [])];
  if (groups.length === 0) return null;
  return (
    <fieldset className={styles.hints} aria-describedby={`${base}-note`}>
      <legend>Tools that help ({selected.length} of {HINT_MAX})</legend>
      <p id={`${base}-note`} className={styles.hint}>
        Suggests tools the skill works best with. It never turns a tool on.
      </p>
      <div className={styles.hintGroups}>
        {groups.map(group => (
          <div key={group.id} className={styles.hintGroup}>
            <span>{group.label}</span>
            {group.names.map(name => {
              const on = selected.includes(name);
              return (
                <label key={name}>
                  <input type="checkbox" checked={on}
                    disabled={!on && selected.length >= HINT_MAX}
                    onChange={event => onChange(toggleHint(selected, name, event.target.checked))} />
                  <span>{name}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
