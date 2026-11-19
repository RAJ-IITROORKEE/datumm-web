import type { BuiltinSkillSetting, Mode } from './admin-config.mjs';

export type BuiltinSkill = {
  id: string; name: string; description: string; instructions: string; toolHints: string[];
};
export function parseBuiltinCatalog(raw: unknown): BuiltinSkill[];
export function builtinModes(settings: BuiltinSkillSetting[] | undefined, id: string): Mode[];
export function toggleBuiltinMode(
  settings: BuiltinSkillSetting[] | undefined, id: string, mode: Mode, on: boolean,
): BuiltinSkillSetting[];
