# Phase packet — A1: Admin traces and feedback

| Field | Value |
| --- | --- |
| Status | **proposed, awaiting user approval** |
| Depends on | N3 (done 16 Nov) for lifecycle fields; C1 (done) for capability gating |
| Approved by / date | |
| Base commits | Web `a57d866` on `codex/ui-ux-foundation-2026-11-12`; backend `48bbd1d` on `codex/web-ui-harness-20261116` |

All `path:line` facts below were **observed** in source on 16 Nov (backend `48bbd1d`, web working tree). Statements marked *inferred* were not run. No test, browser or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

An admin opens **Admin → Traces** and sees one text-free row per hosted turn: when, a keyed hash of the owner, mode, requested and served models, outcome and failure code, step and tool outcomes from N3, specialists, model calls, tokens, reported USD, duration, bounded signals and the user's rating. A signed-in user can rate a completed answer up or down with a fixed reason, and that rating appears joined to its trace. Admin-only access is enforced by the backend; the web gates are convenience.

Non-goals: any question, answer, prompt, title, event `detail`/`note`, tool argument or result in a trace; a model router, evaluation pipeline or "copy as eval case" (Panda's manual step); per-model usage aggregates and model tests (A3); audit history or restore (A2); audit rows for admin reads; a second admin role; deployment or hosted checks (G1); desktop MLflow traces (`lat.md/observability.md:5-19`, a different runtime); any change to v2 commands, checkpoints, `PublicEvent` or native authority.

## 2. Current state (verified)

Status key: **T** implemented and tested; **U** implemented, under-tested; **C** controlled or local only; **P** planned or missing.

| Item | State | Evidence |
| --- | --- | --- |
| Per-call telemetry location | U. A map `data.budget.model_call_telemetry.{callId}` **inside the run document that made the call** (not the ledger, not a collection). No direct test: tests stub `reserve_model_call`/`invoke_tracked` | `budget.py:194-201`; stubs `test_brief_receipts_regression.py:365` |
| Fields at reservation | `callId` (32 hex), `policyVersion`, `role` (8-value set), `modelId` (≤160 chars), `status: reserved`, `createdAt`, `reservedInputUnits`, `reservedOutputTokens`, `reservedUsdEstimate` | `budget.py:167-173,196-200` |
| Fields at settlement | Success: `status`, `providerReportedUsd`, `finishReason` (7 normalized values), `invalidToolCallCount`, `refusal`, `reasoningTokens`, `durationMs`, `actualInputTokens`, `actualOutputTokens`. Failure: `status: failed`, `failureCode`, `recoveryAction`, `durationMs`; exception text is never stored. A crash between reserve and settle leaves `reserved` | `budget.py:233-253,322-334,338-349`; taxonomy codes `failure_taxonomy.py:105-154` |
| Callers (which roles land on which run) | Planner and intent `agent_workflow.py:1820,1860`; vision `:3125`; brief interpreter `brief_interpreter.py:565`; specialists write to the **parent** run (`job['runId']`) `specialist_jobs.py:243-260`; standards research `research_tools.py:217,369` |
| Ledger copy | Receipts `usage_receipts.{callId}` with `runId` and cumulative counters on the root ledger run | `budget.py:178-184,272-300` |
| Privacy today | Telemetry is excluded from every public DTO: `budget` is not in `public_run`'s allowlist; owners see only an aggregate usage snapshot | `storage.py:45-56,86-87`; `budget.py:380-448` |
| Owner-identifying data | Raw Clerk subject in `runs.owner`, `tasks.owner` and admin `admin_audit.by`. The run document also holds **text**: `title` (prompt[:90]) and `data.prompt`, answers, results. Telemetry rows hold no owner and no text | `main.py:922`; `task_controller.py:72`; `admin_api.py:50` |
| Retention | No TTL on `runs`, `run_events` or `task_events`. Chat deletion is **soft** (`tasks.deleted_at`); runs, telemetry and events stay | `storage.py:15-39`; `task_api.py:168-179,227-243` |
| Indexes | All `runs` indexes start with `owner`; nothing serves a cross-owner period query. `run_events (run_id, seq)` unique; `task_events (taskId, executionId, stage)` | `storage.py:15-16,24,31-32` |
| Turn identity | A turn is a v2 command id; it links to exactly one execution (run) through `resultExecutionId`, else no turn | `task_controller.py:264-268,313,372-374` |
| N3 lifecycle fields | T. `outcome`, `durationMs`, `callId`, `activityId` on `agent_stage_complete`, relay `tool_*` and `specialist_started/complete`; retries carry the action's `activityId`. Limits: `provider_retry` has no `activityId`; `flexible_retry`/`intent_fallback` have no action | `storage.py:136-186`; `task_contracts.py:336-366`; [N3 result](n3-tool-task-subagent-lifecycle.md#12-result) |
| Durable event source | `run_events` holds every event of a run with all extra keys, **including `detail` and `note` (model text ≤160)**. `task_events` is filled only when a projection imports runs (*inferred* from [N1](n1-durable-completion-proof.md) item 3), so it can lag | `storage.py:193,202,212-219` |
| Admin auth | T. `require_admin`: Clerk subject in `ADMIN_SUBJECTS` (default empty), one role; router-level dependency. Local mode maps a token to `local-development-owner` | `auth.py:20-31`; `settings.py:29`; `admin_api.py:13`; `test_admin_auth.py`; route 403s `test_round3_api.py:78` |
| Admin endpoints | `config` GET/PUT (CAS), `audit` (last 100, read projects `at, by, summary`; insert also stores `revision`), `overview` (scans up to 5,000 runs by `created_at`, unindexed), knowledge sources | `admin_api.py:28-77`; `knowledge.py:273` |
| Admin web pages | Overview, Agent, Web search, Knowledge, Skills, MCP, Plugin, Audit. Web gate: verified email in `ADMIN_EMAILS`; nav hides an item only when its capability is `off` | `src/app/admin/*/page.tsx`; `layout.tsx:13-18`; `admin-shell.tsx:16-27` |
| Capabilities | v1 flags `adminConfig, adminAudit, adminOverview, adminKnowledge, planningGoals, frontendContext, displayActions`; local app reports admin flags false | `main.py:291-292`; `local/entry.py:246`; `capabilities.mjs:2-22` |
| Proxy allow-list | v1 `admin/(config|audit|overview|knowledge/...)`; v2 task routes list; anything else returns `DATUMM_PROXY_NOT_ALLOWED` | `route.ts:5,19-20`; `tests/admin-proxy.test.mjs:19-24` |
| Feedback | **P. Absent.** No route, collection or field in the backend (grep for `feedback` outside `.venv`: no hits). The web has no feedback call | grep |
| Thumbs UI | C (vendored, unused for feedback). `MessageActions` supports `feedback` with reasons, but the vote is uncontrolled (no initial value), `onFeedback` is fire-and-forget (shows "Thanks!" regardless), thumbs-down fires twice (`down`, then `down`+reason), and "Other" opens a free-text input with no length limit | `message-actions-clean.tsx:43-46,154,194,261-292,556-569`; provenance `PROVENANCE.md:131-135` |
| Where the action bar renders | `AnswerContent` renders `MessageActions` with `actions={['copy']}`. `ConversationAnswer` passes `turnId` to it **only when the completion proof verified** | `output-workspace.tsx:79,112`; `conversation-answer.tsx:11-22,28` |
| Rate limiting | None on user routes. One reusable pattern: a Mongo fixed-window counter with TTL | `desktop_auth.py:225-242` |
| Owner-hash secret | **P.** No setting exists | `settings.py:5-38` |

## 3. Decisions needed (recommendation first)

1. **Owner identifier in traces.** **(A)** `ownerHash` = first 16 hex of HMAC-SHA256 over the subject with a new server-only `TRACE_OWNER_HASH_SECRET`; unset secret gives `null` and disables the owner filter. (B) Omit the owner entirely (no per-user drill-down). (C) Plain SHA-256: rejected, reversible by hashing known Clerk ids.
2. **Granularity.** **(A)** One row per turn (execution) with a bounded nested call list (≤40: role, model, status, finish reason, tokens, duration, USD, failure code). (B) One row per model call. (C) Per turn without calls.
3. **Period, filters, paging.** **(A)** Period `24h | 7d | 30d` (default `7d`); filters `mode`, `model` (requested), `outcome`, `feedback` (`up | down | none`), `owner` (hash), `signal`; cursor paging 25 per page (max 50), newest first; stats over a scan capped at 5,000 runs with an explicit `truncated` flag (same cap as overview). (B) Also an arbitrary date range.
4. **Feedback content.** **(A)** Rating plus one reason from `inaccurate, incomplete, ignored_instructions, too_long, other`; no free text and no question/answer sharing in A1. The UI labels the last chip "Something else" so the vendored text input never renders (`message-actions-clean.tsx:556`). (B) Add an optional note ≤500 chars behind an explicit "visible to DATUMM admins" consent, shown only in a separate admin feedback view, never in traces. (C) Panda-style opt-in snapshot of the question and answer text: defer.
5. **Retention.** **(A)** Traces are computed on read, so no new trace store. Feedback expires after 365 days (TTL index). Both are hidden once the task is deleted. (B) Feedback lives as long as its task, like all other data today. (C) 90-day TTL.
6. **Capability flags.** **(A)** `adminTraces` and `feedback` in the v1 document; `unknown` means **off** for both (no deployed backend serves them, so a missing flag must not show a button that 404s); production reports true, the local app false. (B) `adminTraces` follows C1's admin rule (call, show "not provided" on 404).
7. **Thumbs placement.** **(A)** Only on saved answers whose completion proof verified (where `AnswerContent` already receives `turnId`), in the existing action bar beside Copy; never on streaming, partial, needs-connection, shared or replayed answers, nor in the output panel. (B) On every answer that has a turn id.
8. **Saved vote after reload.** **(A)** One recorded vendored patch adding `defaultVote` to `MessageActions`, plus `GET /v2/tasks/{id}/feedback` for the owner's votes; a failed save is announced by the workspace status line. (B) No patch: thumbs start neutral after reload.
9. **Pages.** **(A)** One `/admin/traces` page; feedback is a filter and a stats block (up, down, reasons). (B) The roadmap's separate `/admin/feedback` page.
10. **CSV export.** **(A)** Not in A1 (A3 needs aggregates first). (B) Same allowlisted fields as CSV.
11. **Rate limit.** **(A)** Per-owner fixed window, 30 feedback writes per minute, reusing the `desktop_auth.py:225-242` pattern with a TTL collection. (B) Rely only on the structural bound (one document per turn, ≤256 turns per task, `task_controller.py:26`).

## 4. Design (recommended options)

**`GET /v1/admin/traces`** (in `admin_api.py`, so `require_admin` applies). Query: `period`, `mode`, `model`, `outcome`, `feedback`, `owner`, `signal`, `cursor`, `limit`; unknown values give 422. Response `{schemaVersion: 1, from, to, stats, rows, nextCursor}`.

- **Row: the complete allowlist.** `traceId` (execution UUID), `taskId`, `turnId | null`, `at`, `ownerHash | null`, `mode`, `reasoningEffort`, `requestedModel`, `servedModels[]`, `status`, `outcome` (`completed, failed, cancelled, paused, waiting, running, other`), `failureCode`, `recoveryAction`, `durationMs` (first to terminal event, else null), `modelMs` (sum of call durations), `steps {total, succeeded, failed, skipped, stopped, retried, unconfirmed}`, `tools [{name, calls, failed}]` ≤20, `specialists [{role, outcome, durationMs}]` ≤6, `calls [...]` ≤40 plus `callsTruncated`, `tokens {input, output, reasoning}`, `usd` (string or null), `signals[]`, `feedback {rating, reason, at} | null`.
- **Stats:** `turns, scanned, truncated, failed, p50Ms, p95Ms, inputTokens, outputTokens, usd, feedback {up, down, reasons}`.
- **Signals (closed enum):** `retried`, `model_fallback` (a planner call's model differs from the requested model), `output_limit`, `content_filter`, `refusal`, `invalid_tool_call`, `usage_unknown`, `call_unsettled` (left `reserved`), `specialist_partial`, `budget_exhausted`.
- **How text is kept out, three layers.** (1) Mongo projections are constants: runs `{_id, owner, task_id, mode, model, reasoning_effort, status, created_at, deleted_at, data.budget.model_call_telemetry, data.failure.code, data.failure.recoveryAction}`; tasks `{_id, deleted_at, commands.id, commands.resultExecutionId}`; `run_events` `{run_id, seq, stage, at, outcome, durationMs, tool, callId, activityId, agent.role, failureCode}`. Prompt, title, answer, `detail`, `note` and command text are never loaded. (2) Pydantic response models with `extra='forbid'` and `Literal` enums; `modelId` must match `^[A-Za-z0-9._/:-]{1,160}$` and tool names `^[A-Za-z0-9_.:-]{1,80}$`, else dropped. (3) Tests (section 7).
- **Reads.** A new `runs (created_at desc)` index serves the period query. The lifecycle comes from `run_events` (complete per run, indexed), not `task_events` (may lag). Runs whose task or run has `deleted_at` are excluded. One `$in` query each for tasks, events and feedback per page.
- **Feedback join.** Key `taskId:turnId`, and only when the stored `executionId` equals `traceId`. The `feedback` filter starts from `answer_feedback` (indexed by `updatedAt`) and then loads those runs.

**`POST /v2/tasks/{id}/feedback`** (in `task_api.py`, `principal`). Body (`Strict`): `turnId`, `answerHash` (`^[a-f0-9]{64}$`), `rating` (`up | down | cleared`), `reason` (enum, only with `down`).

- **Owner check:** `controller.owned` gives 404 for a foreign or deleted task.
- **Turn binding:** the projection must contain exactly one answer message with this `turnId` and a `completion` whose `answerHash` equals the body (the existing N1 proof, `task_controller.py:283-315`). No proof gives 409 "This answer is not saved yet"; a different hash gives 409 "This answer changed; reload".
- **Write:** upsert `_id = taskId:turnId` with `owner`, `executionId`, `answerHash`, `rating`, `reason`, `createdAt` (on insert), `updatedAt`, `expiresAt`. `cleared` deletes it. A repeated identical request leaves one document (idempotent by key).
- **Limit:** 30 writes per owner per minute (429).
- **`GET /v2/tasks/{id}/feedback`:** the owner's `[{turnId, rating, reason}]` for that task (≤256).

**Web.**

- **Proxy:** `admin/traces` in the v1 pattern; `feedback` added to the v2 task alternatives (`route.ts:5,19`).
- **Capabilities:** `adminTraces` and `feedback` in `CAPABILITY_FEATURES`, both treated as `unknown = off`. The nav item uses `featureEnabled` instead of "hide only when off" (`admin-shell.tsx:27`).
- **Admin page:** `/admin/traces` uses `PageHeader`, the overview `counts` strip, `Select` for period, toggle chips for filters, the data-sections `Table` (exported, scroll region at 390 px) and a `<details>` per row for calls and tools.
- **Thumbs:** `AnswerContent` shows `['copy', 'feedback']` only when `turnId`, `answerHash` and an `answerFeedback` handler from `OutputWorkspaceProvider` are all present. `workspace.tsx:87` passes the handler only when `featureEnabled(caps, 'feedback')`, using the existing `api()` (`use-workspace-state.ts:85`). Reasons map to the enum in a pure lib.

**Reused:** `require_admin`, `controller.owned`, `projection`/`completion_proof`, `execution_command`, the `desktop_auth` limiter pattern, `adminCall`/`useAdminResource`/`ResultState`, `PageHeader`, `Table`/`EmptyState`, `Badge`, `Select`, vendored `MessageActions`, the `AdminPreview` fixture client. No new dependency.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, single owner: backend implementer):

| File | Change |
| --- | --- |
| `traces.py` (new) | Projection constants, row and stats builder, signals, `owner_hash`, response models, feedback join |
| `admin_api.py` | `GET /traces` with validated query |
| `task_api.py` | `POST` and `GET /{task_id}/feedback`, limiter |
| `task_contracts.py` | `FeedbackRequest` |
| `storage.py` | Indexes: `runs (created_at -1)`; `answer_feedback (updatedAt -1)`, TTL on `expiresAt`; `feedback_limits` TTL |
| `settings.py` | `trace_owner_hash_secret: str = ''` |
| `main.py`, `local/entry.py` | `adminTraces`, `feedback`: true and false |
| `test_traces.py`, `test_feedback.py` (new) | Section 7 |
| `lat.md/hosted-opencode.md`, `apps/domain-api/README.md` | Trace allowlist and feedback contract; code map |

**Web** (`datumm-web`, current branch, single owner: web implementer):

| File | Change |
| --- | --- |
| `src/lib/capabilities.mjs` + `.d.mts` | Two flags |
| `src/app/api/service/[...path]/route.ts` | Two allow-list entries |
| `src/lib/admin-traces.mjs` + `.d.mts` (new) | Defensive row parsing (drops unknown keys), query builder, formatters |
| `src/lib/answer-feedback.mjs` + `.d.mts` (new) | Reason mapping, body builder (refuses without `turnId` and `answerHash`) |
| `src/components/admin/traces-section.tsx` (new), `src/app/admin/traces/page.tsx` (new) | Traces page |
| `src/components/admin/data-sections.tsx` | Export `Table`, `EmptyState` |
| `src/components/admin/admin-shell.tsx` | "Traces" nav item gated by `featureEnabled` |
| `src/lib/work-area-contract.ts`, `src/components/workspace/output-workspace.tsx` | Optional `answerFeedback` prop; feedback action and status copy in `AnswerContent` |
| `src/components/workspace/conversation-answer.tsx` | Pass the verified `answerHash` |
| `src/components/workspace.tsx` | Supply `answerFeedback` when the capability is on |
| `src/components/vendor/affectui/message-actions-clean.tsx`, `PROVENANCE.md` | Recorded patch: `defaultVote` (decision 8) |
| `src/components/dev/feedback-traces-preview.tsx` (new), `ux-preview.tsx`, `admin-preview.tsx` | Fixture: a saved answer beside the traces view, sharing one in-memory store; `admin/traces` fixture data |
| `tests/capabilities.test.mjs`, `tests/service-proxy.test.mjs`, `tests/admin-proxy.test.mjs`, `tests/admin-traces.test.mjs` (new), `tests/answer-feedback.test.mjs` (new) | Section 7 |
| `lat.md/contracts.md` | Feedback binding and traces privacy rule |

## 6. Contract changes, dependencies and risks

| Change | Kind |
| --- | --- |
| `GET /v1/admin/traces` | Backend, new, admin-only; size M |
| `POST`/`GET /v2/tasks/{id}/feedback`, collections `answer_feedback` and `feedback_limits` | Backend, new; additive |
| `runs (created_at)` index | Backend storage, additive; built at start |
| Capability flags `adminTraces`, `feedback` | Additive; old web ignores them, new web treats their absence as off |
| Proxy entries; `answerFeedback` prop; vendored `defaultVote` | Frontend |

No change to v2 commands, checkpoints, `PublicTask`, `PublicEvent`, AG-UI events or native approval. No new dependencies.

| Risk | Containment |
| --- | --- |
| A text field leaks into traces, now or after a later change | Projection constants, `extra='forbid'`, regex-checked strings, canary and key-set tests |
| Unindexed cross-owner scan | New index, 5,000-row cap with `truncated`; index build time on real data belongs to G1 |
| Secret handling | Server-only setting; unset means `null` hashes, never a plain hash; rotation breaks continuity (documented) |
| Rating a changed or unsaved answer | `answerHash` and completion proof required |
| Vendored drift | Single recorded patch through `PROVENANCE.md` |
| Feedback POST cost | One projection per write (*inferred* acceptable; rate-limited) |
| Deleted chats still in Mongo (existing behavior) | Excluded from traces and the join; physical purge is out of scope (section 9) |

## 7. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 291 + 26 subtests), each written to fail on `48bbd1d` first:

1. **Privacy canary:** put `CANARY-7f3` in run `title`, `data.prompt`, `data.answer`, `agent_result`, `agent_research.advisoryAnswer`, `data.error`, command prompt, `run_events.detail` and `.note`, a hostile `modelId` and a tool name. The serialized traces response contains no canary, and no raw owner.
2. **Key set:** each row's keys equal the allowlist; an extra stored telemetry key never appears.
3. **Owner hash:** stable for one secret, different for another, `null` when unset.
4. **Filters and period:** boundaries at 24h, 7d and 30d; cursor paging returns no duplicates or gaps; each filter; deleted task excluded; cap sets `truncated`.
5. **Admin-only:** 401 without a token, 403 for a non-admin on `/v1/admin/traces`.
6. **Feedback scope and binding:** foreign owner 404; unknown turn 404; unsaved answer 409; stale hash 409; reason with `up` 422; extra field 422; identical repeat leaves one document; `cleared` deletes; 31st write in a minute 429; GET returns only the owner's rows.
7. **Join:** the rating appears on its trace and the `feedback=down` filter returns it; feedback on another execution of the same key does not join.
8. **Capabilities:** production and local values.

**Web** (`npm test`, baseline 669): flags and `unknown = off`; proxy allows `admin/traces` (with query) and `tasks/{id}/feedback` GET/POST, blocks `admin/traces/x`; trace parsing drops unknown keys; reason mapping; body builder refuses without binding; nav hides Traces unless on.

**Browser** (built-in browser, local dev server, controlled fixture only, `/dev/ux` "Feedback and traces"), 1280 px and 390 px, light and dark:

1. Saved answer: thumbs up, the status reads saved; the traces view shows the row with "Up".
2. Thumbs down, choose "Not accurate", Send: the row shows "Down · Inaccurate"; filter Down shows only that row; stats count it.
3. Streaming and unproven answers show no thumbs.
4. Remount the fixture: the vote stays pressed (`defaultVote`).
5. Fixture save failure: status says the rating was not saved; no "Thanks" claim beyond the bar.
6. Traces view: period switch, stats strip, row details open by keyboard; page text contains none of the fixture answer's words.
7. Capability off: Traces nav hidden; opening the path shows "Not provided by this backend".
8. 390 px: no horizontal page overflow; the table scrolls inside its region.

Hosted behavior needs G1.

## 8. Acceptance criteria

- Traces contain only the allowlisted fields; the canary and key-set tests pass.
- Feedback is owner-scoped, bound to a proven answer by hash, idempotent and rate-limited.
- Admin-only access is enforced by the backend (401/403 tests).
- Ratings join to their trace in the fixture (browser 1–2).
- Without the capability flags, no thumbs and no Traces nav appear.
- No change to commands, checkpoints, `PublicTask` or `PublicEvent`.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`; runtime smoke `--production`. Counts recorded.

## 9. Rollback

Revert the backend and web commits. The UI hides both features (flags absent mean off). Left behind: the `answer_feedback` and `feedback_limits` collections and three indexes, unused and droppable by hand. No run, event, command or checkpoint is modified.

## 10. Open questions found during research

1. **Thumbs location:** the roadmap names `conversation-answer.tsx`. The action bar lives in `AnswerContent` (`output-workspace.tsx:112`); `conversation-answer.tsx` only decides whether `turnId` is passed (`:28`).
2. **"Built from `model_call_telemetry`":** it is not a collection but a map inside each run document beside prompt and answer text, with no cross-owner index (`budget.py:194`; `storage.py:15-16`). A projection allowlist is mandatory, and a period index is new.
3. **N3 fields as source:** `task_events` is filled at projection time, so traces read `run_events`, which also carries `detail` and `note` text that must be projected out (`storage.py:202`).
4. **"Owner hash":** no server secret exists; one must be added and provisioned (G1).
5. **Deleted chats:** deletion is soft; runs and telemetry stay forever (`task_api.py:175-177`). Whether a physical purge is needed is a product and privacy decision outside A1.
6. **Vendored thumbs:** uncontrolled vote, fire-and-forget callback, a double `down` call and an unbounded "Other" text box (`message-actions-clean.tsx:194,261-292,556-569`). The roadmap's "optional note" would need the box bounded and consented (decision 4B).
7. **"Requested and served model":** served models exist only per call; specialists use environment models with fallbacks, so a turn can have several served models.
8. **Telemetry is untested directly:** only stubbed in tests. A1's tests become its first assertions.
9. **Pinned schema check:** `generate_task_schemas.py --check` cannot pass today (N3 item 9); `FeedbackRequest` changes its output. Not run.
10. **Proxy and admin:** the proxy forwards `admin/*` for any signed-in user; the backend 403 is the only server-side admin check (plus the layout's email gate). This is acceptable but should stay tested.

## 11. Result (fill at checkpoint)

| Item | Outcome |
| --- | --- |
| Commit | |
| Gates run (command, Node version, counts, date) | |
| Browser evidence (tool, URL, scenario, result) | |
| Not run or not verified | |
| Limits found | |
| Next step | |
