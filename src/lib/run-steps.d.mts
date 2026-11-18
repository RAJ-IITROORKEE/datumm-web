export type StepKind = 'model' | 'tool' | 'question' | 'approval' | 'check' | 'edit' | 'stage';
export type StepStatus = 'succeeded' | 'failed' | 'partial' | 'stale' | 'skipped' | 'stopped' | 'running' | 'waiting' | 'unknown';
export type StepTokens = { input: number; output: number };
export type StepNode = {
  kind: StepKind; label: string; startedAt: string | null; durationMs: number | null;
  firstTokenMs: number | null; status: StepStatus;
  model: string | null; tokens: StepTokens | null; usd: string | null; children: StepNode[];
};
export type StepRun = { runId: string; startedAt: string | null; status: string; truncated: boolean; children: StepNode[] };
export type RunSteps = { runs: StepRun[] };
/** A tree row: a run (`kind: 'run'`) or a step. `id` is a positional path such as `r0.1.0`. */
export type TreeRow = {
  id: string; parent: string | null; level: number; size: number; position: number; hasChildren: boolean;
  node: Omit<StepNode, 'kind'> & { kind: StepKind | 'run'; runStatus?: string; truncated?: boolean };
};
export type TreeAction = { focus: string } | { toggle: [string, boolean] } | null;
/** Null unless the body is the v1 envelope; invalid runs and nodes are dropped. */
export function parseRunSteps(body: unknown): RunSteps | null;
export function formatDuration(ms: number | null | undefined): string;
export function formatUsd(usd: string | null | undefined): string;
export function formatTokens(tokens: StepTokens | null | undefined): string;
export function nodeMeta(
  node: Pick<StepNode, 'status' | 'durationMs' | 'firstTokenMs' | 'tokens' | 'usd'>,
): string;
export function treeRows(runs: StepRun[]): TreeRow[];
export function initialExpanded(runs: StepRun[]): Set<string>;
export function visibleRows(rows: TreeRow[], expanded: Set<string>): TreeRow[];
export function treeKey(visible: TreeRow[], id: string, key: string, expanded: Set<string>): TreeAction;
