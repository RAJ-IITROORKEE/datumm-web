export type PromptDraftStatus = 'saved' | 'memory' | 'unavailable';
export type PromptDraftStore = {
  get(source: string): string;
  revision(source: string): string | undefined;
  set(source: string, text: string): PromptDraftStatus;
  confirm(source: string, submittedText: string, submittedRevision?: string): PromptDraftStatus;
  move(source: string, target: string): PromptDraftStatus;
  status(source?: string): PromptDraftStatus;
};
export const promptDraftLimits: Readonly<{days: number; drafts: number; characters: number; totalCharacters: number}>;
export function createPromptDraftStore(options?: {accountKey?: string | null; storage?: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null; now?: () => number}): PromptDraftStore;
