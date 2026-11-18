export type CritiqueSeverity = 'concern' | 'info' | 'unknown';
export type CritiqueRow = {
  severity: CritiqueSeverity; label: 'Concern' | 'Note' | 'Not sure'; message: string;
};
export type Critique = { state: 'unavailable' } | { state: 'ready'; findings: CritiqueRow[] };
export type PlanIdentity = { planId: string; version: number; fingerprint: string };

export function critiqueFor(results: unknown, plan: PlanIdentity | null | undefined): Critique | null;
