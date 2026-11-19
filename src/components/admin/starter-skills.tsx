'use client';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { MODES, type BuiltinSkillSetting } from '@/lib/admin-config.mjs';
import { MODE_LABELS } from '@/lib/admin-tools.mjs';
import { builtinModes, toggleBuiltinMode, type BuiltinSkill } from '@/lib/skill-builtin.mjs';
import { formatSkillMd } from '@/lib/skill-md.mjs';
import styles from './skills-section.module.css';

function ViewButton({ skill }: { skill: BuiltinSkill }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`View ${skill.id}`}>
          <Eye aria-hidden /> View
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{skill.name}</DialogTitle>
          <DialogDescription>
            Read-only. A DATUMM starter skill is maintained by DATUMM; you choose only the modes
            it is on in.
          </DialogDescription>
        </DialogHeader>
        <pre className={styles.preview} tabIndex={0} aria-label={`SKILL.md preview for ${skill.id}`}>
          {formatSkillMd(skill)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}

/** Code-owned starter skills: per-mode switches (saved with the config) and a read-only view. */
export function StarterSkills({ catalog, settings, onChange }: {
  catalog: BuiltinSkill[]; settings: BuiltinSkillSetting[] | undefined;
  onChange: (next: BuiltinSkillSetting[]) => void;
}) {
  return (
    <section aria-labelledby="starter-skills" className={styles.starter}>
      <div>
        <h2 id="starter-skills" className={styles.groupTitle}>DATUMM starter skills</h2>
        <p className={styles.hint}>Built in, off until you turn it on</p>
      </div>
      <ul className={styles.list} aria-label="DATUMM starter skills">
        {catalog.map(skill => {
          const live = builtinModes(settings, skill.id);
          return (
            <li key={skill.id}>
              <Card className={styles.row}>
                <div className={styles.open}>
                  <span className={styles.name}>
                    {skill.name} <span className={styles.id}>{skill.id}</span>
                  </span>
                  <span className={styles.trigger}>{skill.description}</span>
                </div>
                <ViewButton skill={skill} />
                <ul className={styles.switches} aria-label={`${skill.id} modes`}>
                  {MODES.map(mode => (
                    <li key={mode}>
                      <label htmlFor={`${skill.id}-${mode}`}>{MODE_LABELS[mode]}</label>
                      <Switch id={`${skill.id}-${mode}`} checked={live.includes(mode)}
                        aria-label={`${MODE_LABELS[mode]}: enabled for ${skill.id}`}
                        onCheckedChange={on => onChange(
                          toggleBuiltinMode(settings, skill.id, mode, on),
                        )} />
                    </li>
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
