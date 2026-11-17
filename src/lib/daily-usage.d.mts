export type DailyPart = { used: number; limit: number | null; left: number | null };
export type DailyUsage = { runs: DailyPart; modelCalls: DailyPart; resetsAt: string };
export function parseDailyUsage(body: unknown): DailyUsage | null;
export function dailyLimitMessage(limit: number, kind?: 'runs' | 'modelCalls'): string;
export function isDailyLimitMessage(text: unknown): boolean;
/** "N left today" only while a limit exists; the plain limit message when it is reached or a send was refused. */
export function dailyStatus(usage: DailyUsage | null | undefined, error?: string): string | null;
