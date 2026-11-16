# M3/M5 work-area implementation contract

Implemented M3/M5 contract, updated 13 November 2026; resolves IR9R1-2 and the CB9R1-2 selection hazard. The normative exports below now live in `src/lib/work-area-contract.ts` and their production callers. `useWorkspaceState`, `OutputWorkspaceProvider` and `ReviewReportPanel` remain the task, output-selection and parsed-report owners. No new store, subscription, service or arbitrary candidate loader is introduced. See [checkpoints](implementation-checkpoints.md) for acceptance limits.

## M3 public seam (integrator owns)

Create `src/lib/work-area-contract.ts` containing only exported types and type imports from React, `answer-outputs.mjs`, `review-report.mjs` and `composer-media.tsx`. All signatures below are normative. `WorkScope.key` is `JSON.stringify([accountKey, taskId ? 'task' : 'draft', taskId ?? sourceKey])`; epoch is monotonic within the account mount.

```ts
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
  returnToDrawing(): void;
  focusReview(selector: string): void;
}
export interface InspectorProps {
  scope: WorkScope; section: WorkAreaSection; preview: WorkAreaPreview;
  propertiesOpen: boolean; actions: WorkAreaActions;
  slots: { design: ReactNode; properties: ReactNode; activity: ReactNode; assets: ReactNode; exports: ReactNode };
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
```

`InspectorProps` is exported from the new contract and re-exported from `workspace/inspector.tsx`; `Inspector(props: InspectorProps)` becomes a slot host with no fetching or task commands. `scopeKey` must equal `scopeInput.key`. `OutputWorkspaceProvider(props: OutputWorkspaceProps)` and `useOutputWorkspace(): OutputWorkspaceValue` remain exported from `workspace/output-workspace.tsx`. Re-export the two output types there. `scopeInput` carries account/source/task information; it is not inferred by parsing the key.

The hook exposes `workAreaSection`, `propertiesOpen`, `selectWorkAreaSection(section: WorkAreaSection): void`, `openProperties(): void`, `closeProperties(): void`, `selectAlternative(selection: AlternativeSelection): Promise<void>` and `workspaceScopeInput: Omit<WorkScope, 'epoch'>`. The shell assembles `WorkAreaActions` using those hook operations and the existing output context; it does not duplicate task state. Export `WorkAreaActions` for callers instead of exposing the old `setTab`/`setRight` union. Existing `reviewAlternative(candidate)` becomes an internal helper reached only by `selectAlternative`. In M3, change its existing caller to `PlanDetails(props: WorkspaceState & PlanDetailsSelectionProps)` while retaining the combined presentation. It constructs the exact selection from supplied scope/current task/brief/candidate and calls only shell-supplied `onSelectAlternative`, which validates provider key/epoch before the hook. No direct hook call or exported compatibility bypass remains. M3 updates its workspace mount and review-fixture props; M5 adds the presentation split.

### Scope, lifecycle and focus

- Derive `workspaceScopeInput.taskId` from **`runId`**, the authoritative selected/admitted ID, including URL recovery before its snapshot resolves. Never use `run?.id ?? 'draft'`: projection may still contain task A after selecting B. `scopedRun = run?.id === runId ? run : null`; every drawing/report/asset/answer/activity input uses that filter. No task ID means draft scope, including its `sourceKey` (`new` or `new:<projectId>`). Account key is the existing Clerk-subject workspace boundary; desktop/unconfigured development mounts use their explicit mount key, never another account's cached data.
- Provider state is `{scope, sources, activeId}`. When input key differs, set a new empty record in the provider's own render and increment epoch **before descendants render**. Do not key/remount its children or perform the reset in a passive effect. `WorkspaceContent` retains report selection ownership as `reportSelection: {scope: WorkScope; openId: number} | null`, plus its existing opener; it derives `WorkAreaPreview` from activeOutput/reportSelection, never stores a duplicate output selection. Parsed report data remains solely in `ReviewReportPanel`.
- M3 puts the provider inside `WorkspaceContent`, surrounding a new file-local `WorkspacePanels` child that consumes its context. This structural refactor happens once; subsequent scene/scope/section changes keep that same tree mounted. Provider `onOpen` synchronously clears shell reportSelection before setting activeId; opening a report calls `dismissOutput` then sets shell selection in the same action. Shell filters report selection by current key/epoch on every render before exposing it. Report callbacks carry that token; `nextReportOpenId` is shell-local and monotonic. No passive mutual-exclusion effect remains.
- Registration, cleanup, open/close, copy/download feedback and animation-frame focus callbacks capture `{key, epoch}`. Each callback compares both against the live record before acting. A→B→A has different epochs; an A1 cleanup cannot unregister A3 outputs. Registration also rejects `AnswerOutput.source.taskId` unequal to selected task; draft outputs require the captured draft key. No old snapshot can register while B is task-loading.
- Hook selection/restoration updates the authoritative ID before snapshot loading; source-preview requests carry scope token and requested ID set. In the hook use an internal `{key, generation}` ref, incremented synchronously when workspaceScopeInput.key changes; stamp existing drawing/saved-source results with that captured token. Return empty savedSources/null designVersion when either field differs, including A→B→A before effects run. Loader completion compares both plus requested identities before commit. This local async guard is not another store; provider epoch separately guards output callbacks. Never stamp an old loaded value with the new scope merely while constructing a Bound envelope. Retain account/source-scoped draft arrays in their existing owner; do not copy draft attachments into saved inputs at task admission.
- New task/project draft, selected task and account transitions reset section to Design, properties closed, preview drawing, focus/feedback cleared. Same-task snapshots preserve section/properties/preview. If an active output disappears, fall back to drawing; do not silently replace a ready report on task-version updates. Normal section changes preserve the preview and mounted drawing. Closing properties changes only the inner disclosure.
- `selectSection` selects the section and narrow Work area pane; properties opens Design/drawing. Answer/report open selects Design/Work area and closes properties; those two previews are mutually exclusive. Review navigation selects Chat, closes properties and focuses the existing exact review card, without task/device/native commands. Old `preview`/`activity`/`exports` map to the corresponding section, `assistant` to Chat, `tools` to Activity diagnostics; replace all old state setters/openers.
- Inspector uses roving tab focus (Left/Right wrap, Home Design, End Exports). Keep `slots.design` at one constant React position, hidden/inert outside Design; drawing remains at one constant position inside it, hidden/inert beneath answer/report previews. Only exact planId/version/fingerprint changes its viewer key. Activity/Assets/Exports own their scroll regions. Before hiding a focused subtree, move focus to the selected tab or narrow pane control. Escape closes the highest active layer, then properties/preview; section navigation does not steal dialog Escape.
- Preview open remembers a visible connected opener and focuses its heading. Return restores that opener only with matching scope/epoch and visibility, otherwise the Drawing control (`data-output-focus-fallback`). Focus drawing snapshots section/preview/properties/widths/opener with token; exit restores only still-valid same-scope identities, otherwise Drawing. No shell/composer remount or width/section-based drawing key.

## M5 projection contract (outputs worker owns)

Append these exports to the same type-only contract **in M3**, so M5 introduces no competing type vocabulary. `SavedDrawingInput` is normalized from scoped currentPlanRef, candidates and loaded drawing; it carries no geometry. `Bound<T>` records provenance assigned by the existing owner, not server authorization.

```ts
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
  metadata: { name?: string; mime?: string; bytes?: number; page?: number; sha256?: string };
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
```

Create `src/lib/workspace-assets.mjs` exporting `projectWorkspaceAssets(input)` only, and `src/lib/workspace-assets.d.mts` declaring `projectWorkspaceAssets(input: AssetProjectionInput): AssetRow[]` with type imports from `./work-area-contract`. It is pure: no hooks, fetch, URLs, callbacks or task commands. Export `AssetsPanel(props: AssetsPanelProps)` and `ExportsPanel(props: ExportsPanelProps)` from the M5 component paths. Exports uses its supplied actions for Open drawing/answer/saved report; it never fetches/parses a second report or mutates hidden shell state. Split `PlanDetails` using exact signature `PlanDetails(props: WorkspaceState & PlanDetailsSelectionProps & { surface: 'design' | 'exports' })`; Design gets alternatives/assumptions/comparison, Exports gets supported exact download controls. Both receive the same scoped run/drawing/style. Deliberate comparison remains read-only; ordinary details/export mounting creates no canvas.

### Mapping, deduplication and activation

1. Validate bindings before merging. Saved rows require `snapshotTaskId === scope.taskId !== null` and exact account/task ownership; explicit foreign `Attachment.task`, `AnswerSource.taskId` or report-envelope binding excludes a record. Draft rows require account/sourceKey match and null task binding; their attachment `task`, if present, must match selected task. Never infer report root task from `ReviewReport.runId` (execution ID may differ). Missing owner metadata is allowed only when the current scoped owner assigns the envelope from its known source; do not adopt arbitrary cached metadata.
2. Order kinds: saved drawing, answer output, saved report, saved attachment, specialist artifact, unsaved draft attachment; preserve supplied order within each kind. Row ID is `JSON.stringify([scope.accountKey, scope.taskId ?? scope.sourceKey, kind, identity])`. Drawing identity is `[planId,version,fingerprint]`, answer identity is output ID, report identity is `report-json`, attachments use supplied ID, specialists use hash. Dedup within kind by that exact tuple; no cross-kind collapse. For duplicate drawing rows combine current=true and first supplied briefId; for duplicate metadata keep the first accepted entry, filling only absent fields from later accepted entries. Never overwrite conflicting supplied values.
3. Current plan ref first, retained candidates next, then loaded exact drawing if absent. A drawing destination is available only when all three identity fields equal `loadedDrawing` in this scope. Unloaded candidates have `unavailable: 'Saved drawing preview is not loaded'` plus an optional separately labelled **Review/select alternative** action when a scoped variable brief/candidate exists. Do not call selection to satisfy ordinary preview. A retained already loaded drawing can open Design without changing currentPlanRef.
4. Answer rows use registered output title/kind/completion/source state; opening resolves that ID again in the current provider record. Partial/streaming preview is allowed; existing export/copy completion gates remain. Saved report row is labelled `Saved BOQ & elements report`; null report means metadata not yet loaded, not zero rows. Explicit report-json exclusion gives unavailable; missing support metadata uses existing guarded load-on-demand behavior.
5. Saved attachment IDs come from scoped conversation order, dedup first occurrence. Join only accepted savedSources by ID; use actual name, mime, bytes, page and sha256. Missing name is `Attachment · <ID>`; omit unknown metadata. Saved source preview is available only with existing image plus exact loaded drawing, then activation calls existing `setSelectedSourceId(id)` and opens Drawing. ID-only rows explain Desktop preview availability; no invented URL. Draft rows are visibly **Unsaved**, use actual source metadata, and have unavailable web preview/upload; no new persistence claim.
6. Flatten specialist refs in supplied result order. Only completed `report_preparer` refs matching `/^[a-f0-9]{64}$/` get specialist-download destinations. Other references remain unavailable metadata. Activation creates only `/api/service/tasks/${encodeURIComponent(taskId)}/specialist-artifacts/${sha256}`; no model-supplied URL. Update `AgentSpecialists` to apply the same supported-role/status/hash rule.
7. Integrator implements `ActivateAsset`: reject stale scope/epoch; resolve the row against current projection; dispatch only the above discriminants. Drawing/source opens Design, answers call existing provider, report opens existing report panel, specialist uses the guarded same-origin download. Unavailable activation only announces its reason. It never calls `reviewAlternative`, `selectAlternative`, task commands, device authorization or native access.

Drawing titles are `Plan <planId> · v<version>` with Current/Retained provenance; answer titles remain supplied with `Answer <conversationIndex+1> · <state>` provenance. Report provenance is `Saved task evidence` until parsed sourceKind/source metadata is available. Specialist titles are `Evidence report (JSON) · <hash>` with supplied role/status provenance. Saved attachments use `Saved task input`; draft attachments use `Unsaved draft input`. These labels establish no native measurement, server artifact identity or immutable output revision. `ExportsPanel` receives a scoped WorkspaceState view (foreign snapshot/drawing/source fields cleared), never raw stale hook data.

### Explicit alternative selection and report/answer data

**Verified hazard:** `use-workspace-state.ts` currently loads candidate geometry, GETs `variable/briefs/{briefId}/alternatives`, then POSTs `.../selection`. The drawing effect loads only currentPlanRef. M3 integrator retains that sequence behind `selectAlternative`, with no candidate loader added. The labelled action explains that it changes the selected task alternative, while acceptance/native approval remain separate.

The shell's onSelectAlternative validates provider key/epoch before calling the hook. The hook captures its own current `{key,generation}` guard at entry, rejects a mismatched input key, and checks that captured guard before start, after each await, and immediately before POST. Also require selected runId/taskId, scoped snapshot task, variable briefId and candidate membership by planId/version/fingerprint to match. Verify loaded geometry against all three requested identity fields. Retain `reviewEpoch` cancellation; increment on task/account/draft changes and newer selection. Fetch current selection revision, recheck scope/identity, POST the exact tuple and expectedSelectionRevision, then recheck before task refresh/state commit. A switch after POST cannot undo a submitted selection, but its late completion must never update another scope; do not claim abort revoked a write. No plan acceptance or task/native grant follows selection.

`ReviewReportPanel` stays the only report fetch/parser/full-row owner. Extend its exported props to `{scope: WorkScope; taskId: string; taskVersion?: number; openId: number; onClose: () => void; onReport: (scope: WorkScope, report: ReviewReport | null) => void; fetcher?: typeof fetch}`. It retains GET `/api/service/runs/{taskId}/export/report-json`, bounded body/parse/error handling and full validated rows. Key only its loader by `[scope.key,scope.epoch,openId]`; taskVersion is not a reload key. Section switches keep it mounted; close/reopen increments openId, explicit retry reloads. Abort and token-check completions and callbacks. Shell retains only the callback reference for Assets/Exports and clears it on close/scope change; it does not fetch or parse a duplicate report. Refresh errors retain the last ready report with an error/retry notice; CSV continues to use that exact retained report and all rows, while preview remains bounded to 200 rows.

For Conversation's current transport-message branch, bind `AnswerSource.taskId` to the admitted `runId` after `data-run`, not `run?.id` from a missing/old snapshot. Retain the hook's pending-submission/recovery guards so an obsolete stream is never rebound to a newly selected task. Saved-answer branches use their verified scoped run identity. Before admission there is no task-bound registration; when no authoritative snapshot establishes completion, use partial rather than claiming saved completion from stream end alone. Include first streamed table before snapshot and late-obsolete-stream cases in M3/M5 regressions.

Answer data remains `AnswerContent` → epoch-bound `register` → existing provider → `OutputPanel`; Assets/Exports consume the same registered records. Never reparse a separate answer snapshot or treat frontend output IDs as immutable service artifacts. Explicit supportedExports exclusions disable formats in every caller; absent metadata remains legacy-guarded availability. Service exports retain exact task/plan/version/style; local answer/report CSV stays labelled as retained data, with existing parser bounds and formula neutralization.

## Operation/ownership map and executable exits

| Phase | New files | Modified owners and final mounts |
| --- | --- | --- |
| M3 integrator | `src/lib/work-area-contract.ts`; existing planned work-area CSS/tests | Hook exposes scope/actions; output provider implements epoch protocol; WorkspaceContent retains report selection and composes exclusive preview; workspace and Inspector mount stable Design/Activity plus typed Assets/Exports placeholders. Conversation/titlebar/openers use new actions. Preserve existing PlanDetails/download/report access in temporary slots. No import from an M5 file exists. Add all new type-file/export/signature changes here to M3's allowlist before implementation. |
| M5 outputs worker | Planned `workspace-assets.mjs`/`.d.mts`, Assets/Exports components/CSS/tests | PlanDetails split, output/report presentation/callbacks, specialist guard and existing planned tests. Type contract is consumed unchanged; requests to alter it go to integrator. |
| M5 integrator (serialized) | None | **Integrator alone** modifies final `src/components/workspace.tsx` and `src/components/workspace/inspector.tsx` mounts: build normalized inputs, call projection, wire activation/selection, replace placeholders with real Assets/Exports, and pass scope/report callbacks. Include these as explicit M5 integration writes; outputs worker cannot edit them. |

Caller propagation is phase-specific. M3 additionally modifies `src/components/workspace/plan-details.tsx` and `tests/plan-details.test.mjs` for callback wiring only. Its already allowed `src/components/dev/review-preview.tsx` gets synthetic scope `{key: JSON.stringify(['development-fixture','task','fixture-task']), epoch:1, accountKey:'development-fixture', taskId:'fixture-task', sourceKey:'fixture-source'}` and `onSelectAlternative: selection => record('select_alternative', selection)`; no real request. M5 permits serialized props-only edits to that fixture (explicit `surface='design'`) and `src/components/dev/ux-preview.tsx`. The report fixture passes scope built from its existing `fixture-task-${task}` ID with account/source as above, epoch=`task`, `openId=1`, and a stable no-op `onReport` callback; retain its injected synthetic fetcher and task-version no-reload controls. M5 production report mounts use actual provider scope/openId/guarded callbacks. Fixtures remain production-404 and cannot satisfy actual-route acceptance.

M3 exits independently buildable with four functional tabs, truthful temporary Assets state, preserved legacy export controls, existing report access, one composer/viewer and typed slots; it does not claim M5 asset projection complete. M5 exits independently buildable atop M3 after its serialized final mounts, with no unresolved props, helper path or ownership choice.

Required tests (implementation work, not run by this supplement):

- `unified-work-area`/`output-canvas-interactions`: selected B ID while A snapshot remains; pre-snapshot admission; account/project-draft switches; A1→B2→A3 late register/cleanup/report/source/clipboard/focus callbacks; no stale render or shell/composer remount; camera continuity only for the same exact drawing (identity replacement deliberately resets it); section defaults, preserved same-task state, roving tabs/hidden focus/Escape and return fallback.
- `workspace-assets`: all six row kinds; each foreign binding; same ID/different kind; exact drawing fingerprint differences; duplicate metadata conflict/order; absent metadata; unavailable drafts/ID-only sources; specialist malformed hash/status/role; current/report support excluded versus missing.
- `workspace-assets`/`plan-details`: spy every fetch/command during ordinary drawing/answer/report/source preview and unavailable-row activation; assert **zero POSTs**, zero alternative-selection calls and zero native/task/device grants. Report GET is the sole on-demand preview network action; existing source/answer previews reuse loaded data.
- `plan-details`: labelled Review/select alternative alone invokes selection. Assert exact task, brief, plan, version, fingerprint and expectedSelectionRevision; reject wrong geometry identity, removed candidate, changed brief and A→B→A at both GET boundaries before POST. Verify same-task stale selection epoch is rejected, and post-submit scope switch discards refresh/feedback without claiming the write was undone.
- `review-report`/`workspace-exports`: load once across section/task-version updates; reopen/retry deliberately; abort/discard cross-scope responses; failed refresh retains ready data; execution ID differs from root task; denied/malformed/oversized/empty states; bounded preview/full CSV identity, supported formats and exact encoded task/plan/version/style links. No D9 revision history is fabricated.

Source verified: hook's runId/sourceDrafts/saved-source effect/currentPlanRef loader/reviewAlternative; workspace's current run-based scope/report/output mounts; Inspector's old union; PlanDetails' combined alternatives/exports; answer-output declarations; report loader/parser types; ComposerSource/Attachment fields; specialist result/download rendering and proxy's 64-hex allowlist. No unresolved implementation design question remains in this seam; real service/account/Revit qualification and D9/billing dependencies retain the draft's existing limits.
