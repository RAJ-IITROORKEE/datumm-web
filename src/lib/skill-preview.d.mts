import type { AdminSkill, Mode } from './admin-config.mjs';

export const PREVIEW_PATH: 'admin/skills/preview';
export function previewBody(
  input: { prompt: unknown; mode: unknown; skills: AdminSkill[] },
): { prompt: string; mode: Mode; skills: AdminSkill[] } | null;
export function parsePreview(raw: unknown): { listed: string[]; attached: string | null } | null;
