export type AnswerSource = { key: string; taskId?: string; conversationIndex: number; answerNumber?: number; state: 'streaming' | 'saved' | 'partial' };
export type AnswerOutput = { id: string; kind: 'report' | 'table' | 'diagram'; title: string; markdown: string; complete: boolean; source: AnswerSource; headers?: string[]; rows?: string[][] };
export function splitTableRow(line: string): string[];
export function answerOutputs(text: string, source: AnswerSource): AnswerOutput[];
export function answerTableCsv(output: AnswerOutput): string;
