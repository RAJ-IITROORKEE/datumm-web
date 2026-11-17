export type MeterReading = {
  used: number;
  max: number | null;
  percent: number | null;
  /** True when the number is the request estimate, not a provider report. */
  estimated: boolean;
  input: number | null;
  output: number | null;
  usd: number | null;
  calls: number | null;
};
export type MeterTone = 'neutral' | 'warning' | 'danger';
export function usageBelongsTo(usage: unknown, taskId: string): boolean;
export function contextPercent(used: unknown, max: unknown): number | null;
export function meterReading(usage: unknown): MeterReading | null;
export function meterTone(percent: number | null | undefined): MeterTone;
export function ringDash(
  percent: number | null | undefined,
  circumference: number,
): { dash: number; gap: number };
export function formatTokens(count: number): string;
