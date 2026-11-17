import type { AdminSkill } from './admin-config.mjs';

export type SkillVersion = {
  revision: number; at: string | null; by: string | null; action: string;
  restoredFrom: number | null; restorable: boolean;
  kind: 'added' | 'removed' | 'changed'; fields: string[];
};
type Row = {
  revision: number; at?: string | null; by?: string | null; action?: string;
  restoredFrom?: number | null; restorable?: boolean;
  changes?: { path: string; beforeHash: string | null; afterHash: string | null }[];
};
export function skillVersions(rows: Row[] | null | undefined, id: string): SkillVersion[];
export function skillFromSnapshot(detail: unknown, id: string): AdminSkill | null;
export function withSkill(skills: AdminSkill[], item: AdminSkill): AdminSkill[] | null;
export function activeModes(skill: AdminSkill): AdminSkill['modes'];
export function toggleSkillMode(
  skill: AdminSkill, mode: AdminSkill['modes'][number], on: boolean,
): AdminSkill;
