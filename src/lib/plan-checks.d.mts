export type FindingCategory = 'geometry' | 'brief' | 'circulation' | 'openings' | 'code';
export type FindingSeverity = 'blocking' | 'advisory';
export type CheckStatus = 'pass' | 'warn' | 'fail';
export type FindingRefs = { rooms: string[]; walls: string[]; openings: string[] };
export type Finding = {
  code: string; category: FindingCategory; severity: FindingSeverity; message: string;
  why: string; fix: string; expected: string; actual: string; refs: FindingRefs;
};
export type ParsedFindings = { ruleSet: string; status: CheckStatus; blocking: number; advisory: number; findings: Finding[] };
export type FindingGroup = { category: FindingCategory; label: string; findings: Finding[] };
export type CandidateChecks = { status: CheckStatus; blocking: number; advisory: number };
export type Recommendation = { planId: string; version: number; reason: string };

export const CATEGORY_ORDER: FindingCategory[];
export function parseFindings(raw: unknown): ParsedFindings | null;
export function groupFindings(findings: Finding[]): FindingGroup[];
export function statusLabel(status: string): string;
export function refsToHighlights(finding: { refs?: Partial<FindingRefs> } | null | undefined): string[];
export function refsSummary(finding: { refs?: Partial<FindingRefs> } | null | undefined, roomNames?: Record<string, string>): string;
export function parseCandidateChecks(raw: unknown): CandidateChecks | null;
export function parseRecommended(raw: unknown): Recommendation | null;
export function checksLine(checks: CandidateChecks | null): string;
export type AlternativeCheckRow = { index: number; checks: CandidateChecks | null; recommended: boolean };
export function alternativeChecks(candidates: unknown, recommendedRaw: unknown): { rows: AlternativeCheckRow[]; reason: string };
