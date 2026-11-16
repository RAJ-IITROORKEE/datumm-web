# Phase packet — N3: Tool, task and sub-agent lifecycle

| Field | Value |
| --- | --- |
| Status | **proposed, awaiting user approval** |
| Depends on | N1 (done 16 Nov) |
| Approved by / date | |
| Base commits | Web `aa71966` on `codex/ui-ux-foundation-2026-11-12`; backend `34fcf67` on `codex/web-ui-harness-20261116` |

All `path:line` facts below were **observed** in source on 16 Nov (backend `34fcf67`, web `aa71966`). Statements marked *inferred* were not run. No test, browser or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

The per-turn process view shows, for hosted turns, which action ran, whether it succeeded, failed, was retried or was stopped, how long it took, and which specialist ran beside the lead and with what result, instead of today's "Not confirmed" on every finished hosted step. Old tasks render exactly as before.

Non-goals: showing private reasoning, prompts, tool arguments or results in events; any change to v2 commands, checkpoints, the composition grammar or native approval authority; approval resume through the web (decision 5); deployment or hosted verification (G1); transport reconnection (N5); traces and per-call telemetry for admins (A1).

## 2. Current state (verified)

Status key: **T** implemented and tested; **U** implemented, under-tested; **C** controlled or local only; **P** planned or missing.

| Item | State | Evidence |
| --- | --- | --- |
| Hosted action lifecycle | T. Each loop emits `agent_stage_start` ("Planning the next step"), then `agent_action` (detail = action name, a UUID `activityId`, optional model `note` ≤160 chars), then after dispatch `agent_stage_complete` with the same `activityId` and `controlOutcome` | `agent_workflow.py:1435-1436,1890-1892,2309-2326`; allowlist `storage.py:151-163`; `test_web_phase2.py:119-144` |
| `controlOutcome` meaning | It is a **routing** value, only `continue`, `finish`, `needs_input`, `prepare_draft`; never a success or failure of the action | `agent_workflow.py:2321`; `storage.py:151` |
| Action failure | When dispatch raises an unrecoverable error, no `agent_stage_complete` is written; the run ends with a `failed` (or `cancelled`) event carrying `failureCode` and `recoveryAction`, and `public_event` replaces its detail with fixed text | `agent_workflow.py:2289-2308`; `main.py:138-145`; `storage.py:140-141` |
| Retries | `read_retry`, `read_retry_succeeded`, `read_retry_exhausted`, `action_schema_repair`, `provider_retry(_exhausted)` are emitted, but their `action=` keyword is **not** allowlisted, and none carries `activityId`, so a retry cannot be tied to its action | `agent_workflow.py:2155-2161,2198-2225,2242`; `storage.py:151` |
| Per-action duration | **P.** Not measured. Only model calls are timed, privately (`durationMs` in budget receipts and telemetry) | `budget.py:257-279,339-355,469-478` |
| Native tool calls (Windows connector) | U. `relay.call` emits `tool_start`, then `tool_returned` or `tool_stopped`, with `tool` = name; no call id, duration or outcome; best-effort publication | `relay.py:28-49` |
| Specialists | U. `batch` runs 1–6 jobs, in parallel only if `specialist_parallel_enabled` (default **False**), at most 2 per task; `review_candidate` runs `report_preparer` and adds `layout_critic` only if `layout_critic_enabled` (default **False**). Job documents store status and lease, **no start or end time**. One `specialist_complete` event per job is written **after the whole batch** and the `agent_specialists` checkpoint, with status only inside the detail text. No start event; nothing on cancellation; no retry by design | `settings.py:20-21`; `specialist_jobs.py:29-30,342-431,445-465,469-475`; `test_web_phase2.py:170-185` |
| Scheduler background jobs | U. `background_completed` with `agent` and `jobId` | `task_scheduler.py:213-219` |
| Public event schema | `PublicEvent` (extra forbidden) already declares `stepId`, `jobId`, `progress`, `tool`, `failureCode`, `recoveryAction`, `agent`, `parentStepId`, `activityId`; a new field needs `PublicEvent`, the `public_event` allowlist **and** the `import_run` metadata key list | `task_contracts.py:297-324`; `storage.py:135-176`; `task_events.py:100-104` |
| `run_manifest` (`tools[].elapsedMs`, `status`, `children`) | **C, desktop/OpenCode only.** The hosted orchestrator never writes `run_manifest` (only `local/live_runtime.py:183,367`), and `public_run` does not allowlist it. The web's per-tool timing and status (`agent-activity.tsx:141,151`; `turn-process.tsx:34-39,160`) therefore never appear for hosted tasks. Same for `tool_running/tool_completed/tool_failed`, which the desktop emits (`apps/desktop/src/main/orchestration.ts:1216,1268`) | backend grep; `storage.py:45-56` |
| Web step status | T, but always "Not confirmed" for hosted. `stageSpans` marks a span done only for `controlOutcome` `success`/`completed`, which the backend never sends; a settled open span becomes `unconfirmed` ("Not confirmed"; header "Some work unconfirmed"). A test asserts `finish` → `unconfirmed`; the other tests use `success`, a value production does not emit | `turn-nesting.mjs:62-69`; `turn-process.tsx:19,163-168,216`; `process-activity.mjs:9-11`; `tests/turn-process.test.mjs:206,325-341`; `tests/turn-nesting.test.mjs:65,72` |
| Web tool rows | T for desktop stages only. `processRows` pairs `tool_running`/`tool_completed`/`tool_failed` by `callId` and scope; hosted `tool_start/returned/stopped` produce no row | `process-activity.mjs:17-37` |
| Web specialist rows | U. Any `specialist_complete` row shows **done**, even when the job was `partial`, `failed` or `stale`; the same job also appears from `agent_specialists` with its real status | `process-activity.mjs:32-33`; `turn-process.tsx:206`; `activity-panel.tsx:138` ("timing within the task is not specified") |
| AG-UI adapter | T. Emits `RUN_*`, `ACTIVITY_SNAPSHOT` (one per task event, record passed through unchanged), `STATE_SNAPSHOT`, `MESSAGES_SNAPSHOT`, `TEXT_MESSAGE_*`. No `TOOL_CALL_*` or `STEP_*` | `adapter.mjs:46-86,190-196`; `tests/agui-adapter.test.mjs` (18) |
| `RUN_ERROR` codes | T, dropped. Adapter sends `DATUMM_WAITING`, `DATUMM_APPROVAL_REVIEW`, `DATUMM_TASK_FAILED`, `DATUMM_TASK_NOT_COMPLETE`, `DATUMM_COMMAND_STOPPED`, `DATUMM_STREAM_INTERRUPTED`; the transport throws `new Error(event.message)` only. After admission the UI ignores the message too and re-reads the task (`recoverLiveView`), whose `data.failure.code` and `recoveryAction` are authoritative | `adapter.mjs:61,72,75-76,179,203-205`; `agui-chat-transport.ts:66`; `use-workspace-state.ts:443,598-606`; `storage.py:97-106` |
| Approval interrupt | T as terminal only. `awaiting_approval` ends the run with interrupt `approval:<fingerprint>`; `prepareInput` accepts only question resumes. Native approval is desktop-only by design | `adapter.mjs:27-33,67-72`; `use-workspace-state.ts:1181`; orchestrator `CLAUDE.md` ("The web UI never holds approval authority") |
| Event caps | Run document keeps 200 inline events; v2 reads and `PublicTask.events` are the newest 2,000 task events; `import_run` imports ≤2,000 per pass. N1 changed only proof reads | `storage.py:113,193-194`; `task_events.py:56-60,92-93`; `task_contracts.py:344` |
| Reusable UI | `vendor/affectui/tool-call-card-clean.tsx` is used by the Activity tab for manifest tools (statuses incl. `unconfirmed`, recorded duration). `ai-elements/tool.tsx` has **no importer** | `agent-activity.tsx:4,141-151`; grep |

*Inferred:* deployed values of `specialist_parallel_enabled` and `layout_critic_enabled` are unknown from source; with defaults, a hosted turn runs one specialist, so "two concurrent specialists" exists only with both flags on.

## 3. Decisions needed (recommendation first)

1. **AG-UI mapping.**
   - **(A, recommended) Keep `ACTIVITY_SNAPSHOT` as the one process source.** New fields ride on the task-event record the adapter already forwards unchanged; no adapter logic change. Reload and history read the same task events, so live and saved views cannot disagree.
   - (B) Also emit `STEP_STARTED/FINISHED` and `TOOL_CALL_START/END` (with `subagentRunId` for specialists, outcome in `metadata`) for protocol fidelity. No consumer exists: the transport ignores them, and `TOOL_CALL_END` has no status field in `@ag-ui/core` 1.0.4. Live-only, so it never covers reloads.
   - (C) Translate them into AI SDK tool parts and render from those: a second source of truth that disagrees with the saved task after reload. Not recommended.
2. **Action outcome and timing.**
   - **(A, recommended) Backend fields on `agent_stage_complete`:** `outcome` (`succeeded`, `failed`, `skipped`, `stopped`) and `durationMs` measured with `perf_counter` around dispatch, including its bounded retry. On the unrecoverable path, write one best-effort `agent_stage_complete` with `outcome: failed` and the classified `failureCode` before re-raising. Retry events gain the action's `activityId`.
   - (B) Web only: treat `continue`/`finish`/`prepare_draft` as done and derive duration from `at` deltas. No backend work, but it equates routing with success (a test deliberately forbids this today) and still cannot show a failed action.
3. **Native tool calls.** **(A, recommended)** `relay.call` adds a per-call UUID `callId`, `durationMs` and `outcome` to its three events; the web aliases `tool_start`/`tool_returned`/`tool_stopped` to its existing tool rows. (B) Leave them invisible.
4. **Specialist scope.**
   - **(A, recommended) Start and end only.** `execute()` stores `activityId` (UUID), `startedAt`, `finishedAt` on the job and emits `specialist_started` when it claims the job. The existing `specialist_complete` stays where it is (after the parent adopts the batch), now with the job's `activityId`, `outcome` (the job status) and `durationMs` from the stored times. Two jobs show overlapping spans; no event on cancellation (the row settles as "Not confirmed" beside a stopped run).
   - (B) Roadmap wording, start, progress and end. A specialist is one model call (`specialist_jobs.py:277-339`), so there is no real progress to report; it adds volume only.
   - (C) End only, with outcome and duration: no running state, no visible concurrency.
5. **Approval-interrupt resume.** **(A, recommended) Out of N3 and out of the web.** Approval stays desktop-only; the adapter keeps ending the run with the approval interrupt; add a test that an `approval:` resume is rejected. (B) Defer to N2 as a planned item. N2's actions are reversible display operations only, so (B) would need a new rule change.
6. **`RUN_ERROR` codes.** **(A, recommended)** The transport attaches `code` to the thrown error; `recoverLiveView` uses it only to pick the notice copy (stream interrupted versus task stopped or waiting); the task snapshot stays authoritative. (B) Also copy `data.failure.code` and `recoveryAction` into `RUN_ERROR.metadata`. (C) Leave as is.
7. **Event-volume budget.** **(A, recommended)** No new event per action or native call (fields only); +1 event per specialist job (≤6 per batch, 1 with defaults); +1 on an unrecoverable action failure (terminal). New fields are three scalars (≤80 bytes per event). A backend test counts events for a fixture run before and after. (B) No budget; risk of crowding the 2,000-event tail.
8. **Flag.** **(Recommended) none:** fields and one stage are additive and old clients ignore them; rollback is a revert. Alternative: `lifecycle_events_enabled: bool = True` in `settings.py`.

## 4. Design (for the recommended options)

**Backend fields.** One shared tuple `PUBLIC_EVENT_KEYS` in `storage.py` used by `public_event` and `import_run` (removes the duplicated key list at `task_events.py:103`). Additions:

| Field | Type, validation | On |
| --- | --- | --- |
| `outcome` | one of `succeeded`, `failed`, `partial`, `stale`, `skipped`, `stopped` | `agent_stage_complete`, `tool_returned`/`tool_stopped`, `specialist_complete` |
| `durationMs` | int, 0..86,400,000 | same events |
| `callId` | UUID string (validated like `activityId`) | relay tool events |
| new stage `specialist_started` | detail "Report preparer started", `agent`, `activityId` | `specialist_jobs.execute` |

Action rule (`agent_workflow.dispatch`, `:2271-2326`): no exception, or a retry that succeeded, gives `succeeded`; a recovery pause after an exception gives `failed` with `controlOutcome: needs_input`; the `previously_failed` branch (no dispatch) gives `skipped`; the unrecoverable path writes `failed` and re-raises; `CancelledError` writes nothing. The failure write is wrapped like `relay.py:36-41` so it can never hide the original error or a lease loss.

**Adapter.** No logic change (decision 1A). It already forwards every record field (`adapter.mjs:190-196`).

**Web mapping** (pure logic, tested):

- `stageSpans`: span status from `outcome` when present (`succeeded` → done, `failed` → failed, `skipped` → skipped, `stopped` → cancelled); `controlOutcome: needs_input` stays waiting; carry `durationMs`; count retry events with the span's `activityId` as `retries`. **Without `outcome`** (every old event, and desktop) the current rule is unchanged, so old hosted steps keep "Not confirmed".
- `processRows`: alias `tool_start` → running, `tool_returned` → done unless `outcome` says otherwise, `tool_stopped` → failed; pair by `callId` with the existing `sameCall`. `specialist_started`/`specialist_complete` pair by `activityId`; status from `outcome` (`partial`, `failed`, `stale`); a completion without `outcome` stays done as today.
- `turn-process.tsx`: `Rows` shows `durationMs` from the row before falling back to manifest `elapsedMs`; a retried row shows "Retried once"; the specialist `Node` uses the paired row so one job is not shown with two statuses.

**Concurrency, retries, failure, interruption.** Two specialists: two `specialist_started` rows with distinct `activityId`, both running, each closed by its own completion. Retries: one row, `retries: 1`, final outcome of the retry. Failure: the row shows Failed and the turn header keeps "Recorded work failed". Interruption: open rows settle to "Not confirmed" as today; question pauses keep the existing attempt grouping (`turn-process.tsx:183-189`).

**Privacy.** Only enums, integers and UUIDs are added. No arguments, results, prompts, model text or token data. `note` and `detail` are unchanged.

**Reused:** `processRows`, `stageSpans`, `settledStatus`, `aggregateStatus`, `TurnProcess` `Rows`/`Node`, the dev `ActivityPreview`. `tool-call-card-clean.tsx` stays the Activity-tab card; `ai-elements/tool.tsx` is not adopted (no importer). No new component or dependency.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, one owner):

| File | Change |
| --- | --- |
| `storage.py` | `PUBLIC_EVENT_KEYS`; allowlist `outcome`, `durationMs`, `callId` |
| `task_contracts.py` | `PublicEvent`: `outcome`, `durationMs`, `callId` (optional) |
| `task_events.py` | `import_run` copies `PUBLIC_EVENT_KEYS` |
| `agent_workflow.py` | `dispatch`: timing, `outcome`, failure completion; retry events pass `activityId` |
| `relay.py` | `callId`, `durationMs`, `outcome` on tool events |
| `specialist_jobs.py` | job `activityId`, `startedAt`, `finishedAt`; `specialist_started`; fields on `specialist_complete` |
| `test_lifecycle_events.py` (new) | Section 8 backend tests |
| `lat.md/hosted-opencode.md`, `apps/domain-api/README.md` | Event fields and stage; code-map line |

**Web** (`datumm-web`, current branch, one owner):

| File | Change |
| --- | --- |
| `src/lib/turn-nesting.mjs` + `.d.mts` | Outcome, duration, retries on spans |
| `src/lib/process-activity.mjs` + `.d.mts` | Hosted tool aliases; specialist pairing and outcome |
| `src/lib/task-projection.ts` | `TaskEvent`: `outcome`, `durationMs`, `controlOutcome` |
| `src/components/workspace/turn-process.tsx` | Duration, "Retried once", one status per specialist |
| `src/lib/agui-chat-transport.ts` | Attach `code` to `RUN_ERROR` errors |
| `src/components/workspace/use-workspace-state.ts` | `recoverLiveView` notice copy by code (one line; oversized file, no refactor) |
| `src/components/dev/activity-preview.tsx` | Four hosted-lifecycle scenarios (section 8) |
| `tests/fixtures/hosted-lifecycle-events.json` (new) | Old and new hosted event shapes, from the backend test output |
| `tests/turn-nesting.test.mjs`, `tests/turn-process.test.mjs`, `tests/agui-adapter.test.mjs`, `tests/agui-chat-transport.test.mjs` | Section 8 web tests |
| `lat.md/contracts.md` | Hosted step outcome rule (`:45`) |

## 6. Contract changes

| Change | Kind |
| --- | --- |
| `PublicEvent` gains three optional fields; new stage `specialist_started` | Backend, additive, size **S–M**. Old events validate unchanged |
| `agent_stage_complete` may now follow a failed dispatch | Behavior addition; old clients treat it like any completion |
| Job documents gain `activityId`, `startedAt`, `finishedAt` | Private storage, additive |
| `RUN_ERROR` errors carry `code` in the client | Frontend only |

No change to v2 commands, checkpoints, `PublicTask`, the proxy allow-list, AG-UI event types or native approval.

## 7. Dependencies and risks

No new dependencies.

| Risk | Containment |
| --- | --- |
| A failure-path event write raises and masks the real error or a lease loss | Best-effort write inside `try/except Exception`, as `relay.py:36-41`; tested with a failing `event` |
| Two specialists race on `event_seq` | `storage.event` already retries the optimistic write 20 times (`storage.py:184-199`); test with both flags on |
| "Succeeded" read as "verified" | Footnote already says completion records a result, not verification (`turn-process.tsx:252`) |
| Tail crowding (2,000) | Budget in decision 7 and a count test |
| Specialist `durationMs` across restarts | Computed only when both stored times exist; otherwise omitted |
| Desktop events change meaning | Desktop stages and `run_manifest` paths are untouched; new rules apply only when `outcome` is present |

## 8. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 197 + 26 subtests), each written to fail on `34fcf67` first:

1. `public_event` and `import_run` keep valid `outcome`, `durationMs`, `callId` and drop invalid ones (bad enum, negative, non-UUID, over-range).
2. Dispatch: success gives `succeeded` with `durationMs`; read retry success gives `succeeded` and the retry events carry the same `activityId`; exhausted retry gives `failed` + `needs_input`; unrecoverable error gives one `failed` completion then the run `failed` event; a raising `event` does not mask the original error.
3. Relay: `tool_start` and `tool_returned`/`tool_stopped` share one `callId` with outcome and duration.
4. Specialists with both flags on: two `specialist_started` before either `specialist_complete`; distinct `activityId`; outcomes match job status (one `partial` via timeout); overlapping stored times.
5. Volume: a fixture run gains exactly the budgeted events; a v2 task saved before N3 projects unchanged.

**Web** (`npm test`, baseline 613): adapter forwards the new fields unchanged and rejects an `approval:` resume; transport error carries `code`; `stageSpans`/`processRows`/`TurnProcess` with the old fixture (unchanged output, "Not confirmed" kept) and the new fixture (done, failed, retried, two specialists, partial, stopped).

**Browser** (built-in browser, local dev server, controlled fixture only, `/dev/ux` activity preview), 1280 px and 390 px, light and dark:

1. Tool failure: the failed action and native call show Failed with a duration; header shows "Recorded work failed".
2. Retry: one row, "Retried once", Completed, duration.
3. Two concurrent specialists: two rows, both running while live, then one Completed and one Partially complete; each specialist shown once.
4. Interrupt and resume: an action paused for a question (waiting), a later attempt completed (attempt group); then a stopped run whose open specialist settles to "Not confirmed".
5. Old events: the same turn from the old fixture still shows "Not confirmed". No horizontal overflow at 390 px; rows readable by screen reader.

Hosted behavior needs G1 and is not part of N3.

## 9. Acceptance criteria

- Hosted actions, native calls and specialists show succeeded, failed, retried, partial or stopped and a recorded duration when the new fields are present (tests and browser 1–4).
- Two concurrent specialists are distinguishable; each appears once with its true status.
- Events without the fields render exactly as today, including "Not confirmed".
- No argument, result, prompt or reasoning text is added to any event; new fields are enums, integers, UUIDs.
- Event count stays within decision 7.
- No change to commands, checkpoints, `PublicTask` or approval paths.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`. Counts recorded.

## 10. Rollback

Revert the backend and web commits. Events already written keep the extra fields and `specialist_started` rows; reverted clients ignore unknown fields and show the unknown stage as a plain activity row (*inferred* from `processRows` and `activityBatches`). Job documents keep three unused fields. No command, checkpoint or answer is modified.

## 11. Open questions found during research

1. **"The web already reads `elapsedMs` and status; confirm production fills them" (S0, roadmap):** production does not. `run_manifest` and the `tool_running` stages come only from the desktop/OpenCode runtime; the hosted orchestrator never writes them (`local/live_runtime.py:183,367` only). So fields are missing for every hosted tool, not some.
2. **"Add `durationMs` and `outcome` to the allowlist":** they also need `PublicEvent` (extra forbidden) and the `import_run` key list, or they are dropped or rejected (`task_contracts.py:297`; `task_events.py:103`).
3. **`controlOutcome` is routing, not outcome.** The web tests use `success`, a value the backend cannot emit (`storage.py:151`), so the tested "done" path never runs in production.
4. **"Specialist start, progress and end events":** a specialist is a single model call with no progress to report; production defaults run one specialist, sequentially (`settings.py:20-21`). Deployed flag values are unknown.
5. **Retry events lose their action** because `action=` is not allowlisted (`agent_workflow.py:2200`; `storage.py:151`).
6. **Approval-interrupt resume** conflicts with the rule that the web holds no approval authority; it is not a gap to close in the web.
7. **"Surface `RUN_ERROR` codes":** after admission the UI already discards the message and re-reads the task, whose `data.failure` holds the real code; the user-visible gain is limited to notice copy.
8. **Reuse of `ai-elements/tool.tsx`:** it has no importer; `TurnProcess` rows already render status and duration.
9. **Pinned schema check:** `generate_task_schemas.py --check` targets a root `contracts/` folder that is not in the repository, so it cannot pass today; adding fields to `PublicEvent` changes that output. Not run.
10. **Roadmap size M:** with the recommended options the backend is S–M (six small edits and one test file).

## 12. Result

Not started.
