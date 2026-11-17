export type SkillText = { id: string; name: string; description: string; instructions: string };
export type SkillMdError = {
  field: 'file' | 'name' | 'title' | 'description' | 'body'; message: string;
};
export const SKILL_LIMITS: {
  id: 40; name: 120; description: 300; instructions: 4000; file: 6000;
};
export function parseSkillMd(
  input: unknown,
): { ok: true; skill: SkillText } | { ok: false; errors: SkillMdError[] };
export function formatSkillMd(skill: SkillText): string;
export function editedSkill(stored: SkillText | undefined, parsed: SkillText): SkillText | null;
export function hasUseWhen(description: unknown): boolean;
export function skillMdCounts(input: unknown): { description: number; body: number };
