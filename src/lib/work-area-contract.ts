import type { ReactNode } from 'react';
import type { AnswerOutput } from '@/lib/answer-outputs.mjs';
import type { ReviewReport } from '@/lib/review-report.mjs';
import type { ComposerSource } from '@/components/composer-media';
export type WorkAreaSection = 'design' | 'activity' | 'assets' | 'exports';
export interface WorkScope { key: string; epoch: number; accountKey: string; taskId: string | null; sourceKey: string }
export interface PlanIdentity { planId: string; version: number; fingerprint: string }
export type WorkAreaPreview =
  | { kind: 'drawing'; scope: WorkScope }
  | { kind: 'answer-output'; scope: WorkScope; outputId: string }
  | { kind: 'saved-report'; scope: WorkScope; taskId: string; openId: number };
export interface WorkAreaActions {
  selectSection(section: WorkAreaSection, opener?: HTMLElement | null): void;
  openProperties(opener?: HTMLElement | null): void;
  closeProperties(): void;
  openDrawing(opener?: HTMLElement | null): void;
  openAnswerOutput(outputId: string, opener?: HTMLElement | null): void;
  openSavedReport(opener?: HTMLElement | null): void;
  closePreview(): void;
  returnToDrawing(): void;
  focusReview(selector: string): void;
}
export interface InspectorProps {
  scope: WorkScope; section: WorkAreaSection; preview: WorkAreaPreview;
  propertiesOpen: boolean; actions: WorkAreaActions;
  headerAction?: ReactNode;
  slots: { design: ReactNode; properties: ReactNode; activity: ReactNode; assets: ReactNode; exports: ReactNode; assetPreview?: ReactNode };
}
export interface AlternativeSelection { scope: WorkScope; taskId: string; briefId: string; plan: PlanIdentity }
export interface PlanDetailsSelectionProps {
  scope: WorkScope;
  onSelectAlternative: (selection: AlternativeSelection) => Promise<void>;
}
export interface OutputWorkspaceProps {
  scopeKey: string; scopeInput: Omit<WorkScope, 'epoch'>; children: ReactNode;
  onOpen?: () => void; onClose?: () => void;
}
export interface OutputWorkspaceValue {
  scope: WorkScope; outputs: AnswerOutput[]; activeOutput: AnswerOutput | null;
  register(key: string, outputs: AnswerOutput[]): void;
  openOutput(output: AnswerOutput | string, opener?: HTMLElement | null): void;
  closeOutput(): void; dismissOutput(): void;
}

export interface Bound<T> { value: T; accountKey: string; taskId: string | null; sourceKey: string }
export interface SavedDrawingInput { plan: PlanIdentity; current: boolean; briefId?: string }
export interface SavedReportInput { supported: boolean | undefined; report: ReviewReport | null }
export interface SpecialistArtifactInput { role: string; status: string; ref: string }
export interface AssetProjectionInput {
  scope: WorkScope; snapshotTaskId: string | null;
  drawings: Bound<SavedDrawingInput>[]; loadedDrawing: Bound<PlanIdentity> | null;
  answers: Bound<AnswerOutput>[]; report: Bound<SavedReportInput> | null;
  savedAttachmentIds: Bound<string>[]; savedSources: Bound<ComposerSource>[];
  specialists: Bound<SpecialistArtifactInput>[]; draftSources: Bound<ComposerSource>[];
}
export type AssetKind = 'saved-drawing' | 'answer-output' | 'saved-report' | 'saved-attachment' | 'specialist-artifact' | 'draft-attachment';
export type AssetDestination =
  | { kind: 'drawing'; plan: PlanIdentity }
  | { kind: 'answer-output'; outputId: string }
  | { kind: 'saved-report'; taskId: string }
  | { kind: 'saved-source'; sourceId: string; plan: PlanIdentity }
  | { kind: 'specialist-download'; taskId: string; sha256: string }
  | { kind: 'unavailable'; reason: string };
export interface AssetRow {
  id: string; scope: WorkScope; kind: AssetKind; title: string; provenance: string;
  metadata: { name?: string; mime?: string; bytes?: number; page?: number; sha256?: string; planId?: string; version?: number; fingerprint?: string; attachmentId?: string; artifactRef?: string };
  destination: AssetDestination; alternativeSelection?: AlternativeSelection;
}
export type ActivateAsset = (row: AssetRow, opener: HTMLElement | null) => void;
export interface AssetsPanelProps {
  rows: readonly AssetRow[]; onActivate: ActivateAsset;
  onSelectAlternative: (selection: AlternativeSelection) => Promise<void>; selectionBusy: boolean;
}
export interface ExportsPanelProps {
  workspace: import('@/components/workspace/use-workspace-state').WorkspaceState;
  scope: WorkScope; outputs: readonly AnswerOutput[]; report: ReviewReport | null;
  actions: Pick<WorkAreaActions, 'openDrawing' | 'openAnswerOutput' | 'openSavedReport'>;
}
