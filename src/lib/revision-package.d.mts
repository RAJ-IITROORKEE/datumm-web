import type { ParsedFindings } from './plan-checks.mjs';

export type PackageRequest = { planId: string; version: number; taskId: string | null };
export type PackageEdit = {
  rooms: { key: string; fields: string[] }[]; walls: string[]; openings: string[];
};
export type PackageDiff = {
  addedRooms: string[]; removedRooms: string[];
  changedRooms: { key: string; kindChanged: boolean }[];
  siteChanged: boolean; openingCounts: { from: number; to: number } | null;
};
export type PackageVersion = {
  version: number; parentVersion: number | null; fingerprint: string; createdAt: string;
  findings: ParsedFindings | null; assumptions: string[];
  edit: PackageEdit | null; diff: PackageDiff | null;
};
export type RevisionPackage = { planId: string; version: number; versions: PackageVersion[] };
export type GraphNames = {
  rooms?: { key: string; name: string }[]; openings?: { key: string; kind?: string }[];
};
export type ChecksSummary = {
  status: 'pass' | 'warn' | 'fail'; line: string; problems: string[]; advice: string[];
};

export function packageRequest(
  params: { task?: unknown; plan?: unknown; version?: unknown } | null | undefined,
): PackageRequest | null;
export function parsePackage(raw: unknown): RevisionPackage | null;
export function changeLog(
  pkg: RevisionPackage, graphs?: Record<number, GraphNames | undefined>,
): { version: number; text: string }[];
export function summariseChecks(version: PackageVersion | null | undefined): ChecksSummary | null;
export function savedOn(iso: string): string;
export function graphsByVersion(
  pkg: RevisionPackage, first: GraphNames | undefined, last: GraphNames | undefined,
): Record<number, GraphNames | undefined>;
export function isAccepted(
  task: unknown, plan: { planId: string; version: number; fingerprint: string },
): boolean | null;
