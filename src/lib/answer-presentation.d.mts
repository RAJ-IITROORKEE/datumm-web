export type AnswerPresentation = { schemaVersion: 1; taskId: string; turnId: string; answerHash: string; summary: string; nextPrompts: string[] };
export function validateAnswerPresentation(value: unknown, scope: {taskId?: string; turnId?: string; text: string; state: 'streaming' | 'saved' | 'partial'}, digest?: SubtleCrypto): Promise<AnswerPresentation | null>;
export function answerPreview(text: string, limit?: number): {text: string; shortened: boolean};

export function isCompactProse(text: string): boolean;
