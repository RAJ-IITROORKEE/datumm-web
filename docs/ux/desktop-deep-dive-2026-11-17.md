# Desktop vs web deep dive: tracing, tools, Revit add-in, design engine, see/touch trust (17 November 2026)

Read-only research. Builds on `desktop-harness-comparison-2026-11-17.md` (does not repeat its architecture summary).

- **Desktop**: GitHub `datumm-opencode-revit-agent` `origin/main` = `9a24261`, read with `git archive` from the local clone into
  a scratch folder (the clone's working tree was not touched). Paths below prefixed `D:`.
- **Web**: backend `datumm-orchestrator` `main` = `8bd8b8f` (P-SEC now on `main`), prefixed `O:` (= `apps/domain-api/` unless
  stated); frontend `datumm-web`, prefixed `W:`.
- ✔ = read in source at that location. Unmarked = inferred or taken from a README; section 8 lists what was not verified.
- Viewer engines from outside DATUMM are left to the other survey; section 4 covers only what the two lines use today.

---

## 1. Agent tracing and observability

### 1.1 What the desktop records

| Item | What it is | Evidence |
| --- | --- | --- |
| Spans | `{taskId, runId, traceId(32 hex), spanId(16 hex), parentSpanId, name, startedAt, endedAt, elapsedMs, status, attributes, error, payloadRef}`; nested via `AsyncLocalStorage` | ✔ `D:apps/desktop/src/main/runtime-trace.ts:10,34,84-87` |
| Span names | `provider.generate` (each model call), `tool.<name>` (MCP tool), `tool.read.<name>` (broker reads, role `agent` or `desktop`), `tool.native.<name>` (non-read upstream calls), `native.<tool>` (OpenCode built-ins: `task`, `skill`, `question`) | ✔ `orchestration.ts:1338`, `:1211`, `:937`, `:394`, `:772` |
| Storage | Append-only `traces/<taskId>.jsonl` (preview attributes) plus full payload file `traces/<taskId>.payloads/<spanId>.json` with `{bytes, sha256}` reference; files mode `0600`; symlinks refused | ✔ `runtime-trace.ts:56-57,74-83` |
| Integrity | Payload read re-checks byte length and SHA-256 | ✔ `runtime-trace.ts:116-122` |
| Crash handling | A `running` span found after restart becomes `interrupted` with `PROCESS_INTERRUPTED`; never replayed | ✔ `runtime-trace.ts:112` |
| Model-call provenance | Per call: SHA-256 of the exact submitted request, SHA-256 of the tool schemas, prompt version (hash of system messages), model route `role:model`, context projection version | ✔ `runtime-trace.ts:12-16`; `orchestration.ts:1397-1399` |
| Tool-call identity | OpenCode plugin calls `/tool-admit` before and `/tool-settle` after every tool; admission requires the call to match a call the metering proxy actually saw in the provider response (session, callId, tool, canonical args, role) and returns a one-time nonce that the MCP handler then requires | ✔ `harness-config.ts:26-37`; `orchestration.ts:760-776` (admit), `:1197-1202` (nonce check) |
| Argument diagnostics | Advertised schema + validator result annotated on the span; failures coded `INVALID_TOOL_ARGUMENTS` vs `NATIVE_TOOL_ERROR` | ✔ `orchestration.ts:777-787,1216` |
| Token / cost metering | Proxy reserves cost **before** forwarding (`input bound × prompt price + output bound × completion price + images`, ×1.01), never refunds uncertain calls; per-chat ledger `meter.json` `{reserved, calls, usage}`; specialists' calls and reserve tracked separately | ✔ `orchestration.ts:1378-1391`; `:220` |
| Limits | Step cap `STEP_LIMIT`, tool cap `TOOL_LIMIT`, per-chat call cap and reserved-USD cap `BUDGET_LIMIT`, context bound `CONTEXT_LIMIT`. **All default to 0 = off** (only `maxOutputTokens` 32000) | ✔ `orchestration.ts:1346,767,1388-1389,1384`; `provider-catalog.ts:3` |
| Run manifest | Per run: children (specialists), every tool call with role/status/elapsed, proposals, budget with `costCoverage` | ✔ `orchestration.ts:805-810` |
| Activity / step log | `active.activity` stages (`model_turn`, `specialist_started/completed`, `skill_loaded`) | ✔ `orchestration.ts:1352,775,801-802` |
| Evidence files | Large tool results saved per task, read back by the model through `get_saved_evidence` (paged) | ✔ `tool-evidence.ts:17` |
| Export | OTLP/HTTP JSON to a **loopback** MLflow (`/v1/traces`, numeric experiment) or a Langfuse OTLP endpoint (HTTPS any host, or loopback HTTP); keys stored with Electron `safeStorage`; only settled complete runs are sent; per-destination acknowledgement digests prevent duplicates; failed export retries every 10 s; telemetry never replays work | ✔ `runtime-trace.ts:18-31,66-72,134-175` |
| Viewing | In-app "Pipeline trace" panel (desktop IPC `readTrace` / `exportTrace`), developer Datum dashboard at `127.0.0.1:5123/observability` (tool-failure hotspots, evidence coverage, nested spans, payload on demand with hash check), optional MLflow UI | ✔ `D:apps/web/src/components/pipeline-trace.tsx` (72 lines), `observability-dashboard.tsx`; `D:lat.md/observability.md` |
| Insights | `readDatumInsights` separates preview, committed and identity-matched verified read-back; does not count inherited operations as new | `D:lat.md/observability.md` (README-level) |
| Evals | Promptfoo runner drives the real pinned OpenCode loop with scripted model responses and a read-only fixture MCP: discovery, unavailable read, invalid/unsupported args, **forbidden write**, recovery, cancellation, specialist handoff; optional MLflow publish with per-case trace IDs; safety assertions are hard gates | ✔ `D:tests/agent-evals/README.md`, `promptfooconfig.yaml`, `fixture-mcp.cjs` |

### 1.2 How good it is (desktop)

- **Completeness: high.** Every model call, every tool admission/settlement, native reads by UI and agent, specialist ancestry.
  Gap: C# Revit time is one opaque MCP round trip (stated in `D:lat.md/observability.md`).
- **Correlation: good.** `traceId` per root run, `taskId` groups follow-ups, `sessionId`/`callId` from OpenCode, OTel
  attributes `datumm.task_id`, `datumm.run_id` ✔ `runtime-trace.ts:162`. Native `operationId` lives in the build row, not as a
  span attribute (not checked further).
- **Redaction: credentials only, not PII.** String patterns `sk-…`, `vck_…`, `Bearer …`, `Basic …`, AWS `AKIA/ASIA` and keys named
  `authorization|password|secret|api key|token|accessToken|refreshToken|dataurl|image_url|audio|svg` plus any
  `reasoning/thought/thinking` key ✔ `trace-content.ts:6,13`. Native images are dropped ✔ `runtime-trace.ts:98-100`.
  User prompts, file names, Revit element names and document titles are kept. Fine locally; **a problem if Langfuse points at
  a remote HTTPS host** — previews (up to 16 000 chars per string) then leave the machine ✔ `runtime-trace.ts:29,159`.
- **Retention:** unbounded until the user deletes the chat; `forget()` removes spans, payloads and export checkpoints
  ✔ `runtime-trace.ts:124-133`. No age-based pruning.
- **Export:** good (OTel standard, dedup, offline retry).

### 1.3 What the web has today

| Item | Evidence |
| --- | --- |
| A1 admin traces: **one text-free row per hosted turn**, computed on read from `runs`, `run_events`, `answer_feedback`; regex-checked tokens and enums only; Pydantic `extra=forbid`; owner shown as keyed HMAC (`trace_owner_hash_secret`) | ✔ `O:traces.py:1-5,205-211,252-264,266-351` |
| Per-call telemetry inside the budget ledger (`model_call_telemetry`: role, model, status, finish reason, input/output/reasoning tokens, duration, provider USD, failure code, invalid tool calls) | ✔ `O:traces.py:252-264`; `O:budget.py:163-200,256` |
| Cost reserve before each model call (`reserve_model_call`, `reserve_model_tokens`, `reserve_usd`) | ✔ `O:budget.py:123,163,482` |
| Native tool activity: `tool_start` / `tool_returned` / `tool_stopped` events with `callId` and `durationMs` per relay call | ✔ `O:relay.py:28-52` |
| `task_events`: atomic sequence per task plus retryable publication outbox; unique `(taskId, sequence)`; completion-proof stages | ✔ `O:task_events.py:1-30`; `O:storage.py:32-33` |
| `model_evidence`: evidence index bound to document/revision/device/session, paged-read chain checks, coverage manifest, advice binding | ✔ `O:model_evidence.py:19,57,96,121` |
| AG-UI activity in the chat (process activity from run events) | `W:src/components/agent-activity.tsx` (198), `W:src/lib/process-activity.mjs` |
| Admin UI for traces | `W:src/components/admin/traces-section.tsx`, `trace-rows.tsx`, `W:src/lib/admin-traces.mjs` |
| Retention | TTL only on `answer_feedback`, `feedback_limits`, `pairing`, `authorizations`; **none on `runs`, `run_events`, `task_events`** | ✔ `O:storage.py:15-44` |
| Pipeline trace panel | **Inert on the web**: `PipelineTrace` calls `window.desktop?.readTrace` only | ✔ `W:src/components/pipeline-trace.tsx:7`; mounted at `W:src/components/workspace/activity-panel.tsx:181` |
| Evals | `tests/agent-evals/*` and `scripts/check-agent-evals.cjs` exist in the orchestrator repo but drive OpenCode, not LangGraph — inherited, not usable for the hosted agent | ✔ `git ls-files` in orchestrator |
| OTel / Langfuse / MLflow export | none found in `apps/domain-api` | ✔ grep |

### 1.4 Gaps each way, and what to port

| Direction | Gap | Port |
| --- | --- | --- |
| Web lacks | Span tree per run (parent/child, tool → specialist ancestry), request provenance hashes, owner-facing run timeline | Port the **span schema and provenance hash** (`runtime-trace.ts:10-16`) into LangGraph callbacks; store in a Mongo `run_spans` collection keyed by run; feed A1 (text-free) and an owner-only timeline. Not the JSONL store. |
| Web lacks | Offline agent regression for the LangGraph loop (forbidden write, invalid args, recovery, cancellation) | Rewrite the Promptfoo **cases and assertions**, not the provider: drive `agent_workflow` with scripted model replies and a fake relay. Hard-gate safety assertions. |
| Web lacks | Retention policy | TTL or archive job for `runs/run_events/task_events` (decision T-c). |
| Web lacks | Working "pipeline trace" on web | Either hide it on web (CV1 capability flag) or back it with `run_spans`. |
| Desktop lacks | Text-free admin aggregate, owner hashing, feedback join | Not needed on a single-user desktop; keep for hosted only. |
| Desktop lacks | PII-aware redaction before **remote** export | Restrict Langfuse to loopback or strip `input/output` previews for remote endpoints (desktop fix, outside this plan). |
| Both | Native `operationId`, proposal hash and document revision are not first-class span attributes | Add them to the `tool.*` span for preview/approve/apply/status so one trace query answers "what changed and was it verified" (EV1). |

---

## 2. MCP tools

### 2.1 The desktop tool list

The add-in exposes 19 MCP tools over stdio (`datumm-revit` server) ✔ `D:revit-bridge/revit-mcp/src/index.ts:8-46`,
`drafting.ts:102-140`. The Electron broker re-exports **only `READ_TOOLS`** to the model ✔ `orchestration.ts:66-68,382`, adds
its own integration, context, planning and companion tools, and OpenCode sees them all prefixed `datumm_revit_` ✔
`orchestration.ts:722,448`.

Roles: **M** = main agent (`datumm`), **E** = evidence specialist, **V** = vision specialist. Mode `ask` removes all
`plan/design/build` tools ✔ `orchestration.ts:657-660`. Specialists get `modelTools('ask', role)` ✔ `orchestration.ts:436`.

| Tool (model name without `datumm_revit_`) | R/W | Key arguments | Roles | Approval | Defined |
| --- | --- | --- | --- | --- | --- |
| `list_revit_sessions` | R | none | M E V | none | ✔ `index.ts:26` |
| `get_revit_health`, `get_document_context` | R | `sessionId?` | M E V | none | ✔ `index.ts:30-39` |
| `get_native_capabilities` | R | `sessionId`, `mirrorProbe?` | M E V | none | ✔ `drafting.ts:103` |
| `get_dimension_references` | R | session, document, revision, view | M E V | none | ✔ `drafting.ts:106` |
| `get_model_elements` | R | categories, level?, ≤8 parameter names, page | M E V | none | ✔ `drafting.ts:108` |
| `get_model_inventory`, `get_model_views`, `get_model_quantities` (≤5000 instances) | R | level?, page | M E V | none | ✔ `drafting.ts:113-117` |
| `get_model_warnings` | R | page | M E V | none | ✔ `drafting.ts:120` |
| `get_room_boundaries` | R | exactly two rooms, phase | M E V | none | ✔ `drafting.ts:122` |
| `get_plan_snapshot` (SVG, ≤2000 elements) | R | view? | M E V | none | ✔ `drafting.ts:124` |
| `get_model_catalog`, `get_selection` (≤100) | R | page | M E V | none | ✔ `drafting.ts:130-132` |
| `get_operation_status` | R | `operationId` | M E V | none | ✔ `drafting.ts:139` |
| `get_plan_image`, `get_view_image` | R | view, pixel size | **not to model directly** (internal reads behind the two `inspect_*` tools) | none | ✔ `orchestration.ts:69`; `drafting.ts:126-128` |
| `show_model_elements` | changes selection/view only | element IDs, document, revision | **not exposed to the model** | — | ✔ `drafting.ts:111`; absent from `READ_TOOLS` |
| `preview_changes` | proposes (dry evaluation, no commit) | full change set (≤100 ops, see 3.2) | **not exposed to the model**; called by `NativeBuild` | — | ✔ `drafting.ts:133`; `native-build.ts:538` |
| `approve_change_set` | authorizes (no write) | proposal, hash, document, revision | not exposed; desktop only after the confirm dialog | owner dialog | ✔ `drafting.ts:135`; `native-build.ts:635-643` |
| `apply_change_set` | **W** (or `dryRun` rollback) | proposal, hash, fresh `operationId` | not exposed; desktop only | exact approval | ✔ `drafting.ts:137`; `native-build.ts:566,656` |
| `inspect_plan_image` | R (PNG) | session, document, revision, view | M E V | none | ✔ `orchestration.ts:74` |
| `inspect_native_view` | R (PNG) | + `captureMode`, `pixelSize` 256–1600 | M E V, only when the device has an admitted native-image session | none | ✔ `orchestration.ts:75,653` |
| `resolve_room_connection` | R | two rooms, level, phase, type | M E V | none | ✔ `orchestration.ts:76` |
| `plan_room_connection` | proposes (review-only door proposal) | same | **M only**, not Ask | none to prepare; build needs approval | ✔ `orchestration.ts:77,655` |
| `get_model_health_report` | R (aggregated reads) | session/document | M E V | none | ✔ `model-health.ts:7` |
| `get_saved_evidence` | R (local task files) | `callId`, offset | M E V | none | ✔ `tool-evidence.ts:17` |
| `read_saved_design`, `read_context`, `search_context` | R (local chat/project docs) | name/query | M E V | none | ✔ `orchestration.ts:94-99` |
| `write_context` | **W local** (`plan.md`, `handoff.md`, `external_context_knowledge.md`; ≤32 KiB; `expectedRevision`) | — | **M, not Ask** | none (revision check only) | ✔ `orchestration.ts:97,658` |
| `research_search`, `research_fetch`, `read_research` | R **external** (Exa MCP; official HTTPS pages; ≤3 same-host redirects) | fixed topic fields | M E (not V) | none (capability toggle) | ✔ `research.ts:14-17`; `orchestration.ts:658` |
| `research_guidance` | **W local** note | excerpt, edition | M, not Ask | none | ✔ `research.ts:16`; `orchestration.ts:658` |
| `review_pdf_source`, `review_dxf_source`, `review_grid_schedule_source` | R (chat attachments via companions) | source id | M only | none (capability toggle) | ✔ `pdf-companion.ts:17`, `cad-companion.ts:26`, `grid-companion.ts:27` |
| `design_plan`, `reconstruct_plan` | proposes (saves a local design) | V3 brief / reference source + region | M, not Ask | none | ✔ `design-planning.ts:66,95` |
| `plan_build` | proposes (saves SVG + operations for review) | change set | M, not Ask, Revit capability | none to prepare | ✔ `native-build.ts:279` |
| OpenCode built-ins `question`, `todowrite`, `skill`, `task` | — | — | M (`task` only to `datumm-vision`/`datumm-evidence`) | — | ✔ `orchestration.ts:435,722` |

### 2.2 Broker rules (desktop)

1. OpenCode permission `"*": "deny"`; allow `datumm_revit_*`, `question`, `todowrite`, the role's skill allow-list and the two
   specialist tasks; built-ins `bash, read, edit, write, glob, grep, list, webfetch, websearch, lsp, apply_patch, …` are
   forbidden ✔ `orchestration.ts:100,435`.
2. Specialists: `subagent_depth: 1`, at most two children per chat, foreground only, prompt ≤12 000 chars, no `@` or ``!` ``
   injection, `task`, `question`, `todowrite` denied, model routing checked per call ✔ `orchestration.ts:436,442,748-755,745`.
3. Every model request is checked: each advertised tool must be allowed for **that role** (`wireTool`), messages text-only,
   images only via the scoped media path ✔ `orchestration.ts:1347-1352`.
4. Every tool execution needs `/tool-admit` → nonce → MCP handler nonce check → role/mode re-check ✔ (1.1).
5. Read catalog must be complete or startup fails (`NATIVE_CATALOG_INCOMPLETE`) ✔ `D:apps/desktop/src/main/README.md`;
   `native-build.ts:258-259`.
6. Write path: **only** the HTTP routes matching `nativeExecution` (`demo`, `build/approve|reconcile|refresh|show|select`,
   `design/select|prepare|adapt|build`) and only with the separate execution token ✔ `orchestration.ts:1029-1030`.
7. Annotation review-only mode blocks proposal tools ✔ `orchestration.ts:1206`.

### 2.3 Web A4a catalog and internal actions

| A4a row | Risk | Modes | Model tool names | Evidence |
| --- | --- | --- | --- | --- |
| `core` (required) | read | all | `finish_answer`, `ask_question`, `plan_task`, `lookup_evidence` | ✔ `O:tool_catalog.py:38-39` |
| `skills` | read | all | `load_skill` | ✔ `:40` |
| `knowledge_search` | read | ask, plan | `knowledge_search` | ✔ `:42` |
| `web_search`, `search_regulations` | read (external) | ask, plan | same | ✔ `:44-47` |
| `revit_read` | read | all | `inspect_native_capabilities`, `inspect_dimension_references`, `inspect_model`, `inspect_selection`, `query_elements`, `inspect_model_views`, `inspect_quantities`, `inspect_plan_snapshot`, `inspect_plan_image` | ✔ `:48-52` |
| `generate_concept_image` | external | ask, plan | same | ✔ `:53` |
| `create_design` | read | plan | same | ✔ `:55` |
| `propose_changes` | read (drafts only) | plan, build | same | ✔ `:57` |
| `revit_write` | **device, locked** | build | none — only the workflow's exact-proposal path | ✔ `:59-60` |

- Approval policy: `ask` / `safe` / `auto` per owner; unknown tool names fail safe as `write`; `device` always needs a card;
  cards are server-written, args-hash bound, 15 min ✔ `O:tool_catalog.py:72-119`.
- Internal workflow actions (not model tools): `execute_changes`, `verify_changes`, `authorize_changes`, `capture_intent`,
  `intent_fallback` ✔ `O:agent_task_plan.py:8-13`; `O:tool_catalog.py:66`.
- Native registry under the actions: `O:agent_tools.py:18-57` ✔; relay allow-list `READ_TOOLS` (15 names) + `preview_changes`,
  `approve_change_set`, `apply_change_set`, three `compile_*` ✔ `O:relay.py:4-5`. Direct device tool route is read-only
  (`403 Model writes must use an approved workflow run`) ✔ `O:main.py:515-520`.
- **Missing on the hosted relay vs desktop:** `get_model_warnings`, `get_room_boundaries`, `get_view_image`,
  `show_model_elements` ✔ `O:relay.py:4` — model health, room connections, 3D view capture and "Show in Revit" cannot work
  hosted (V3, M2).

### 2.4 Differences that matter

| Topic | Desktop | Web |
| --- | --- | --- |
| Who sees the native write tools | Nobody on the model side (filtered at the broker) | Nobody on the model side (locked row, workflow-only) |
| Per-role scoping | Yes (main / vision / evidence) | Specialists are code jobs with "no goal or write authority" ✔ `O:specialist_jobs.py:1-4` |
| Call identity check | Nonce bound to the provider's tool call | Args hash on approval cards only |
| Local writes without approval | `write_context`, `research_guidance`, saved designs/proposals | Saved designs, memory, plans (Mongo) |
| External reads | Exa search + official fetch | Tavily/web search, regulations, concept image model |

---

## 3. The Revit add-in (`revit-bridge/`)

### 3.1 Shape

- C# add-in for Revit 2026 family (26.0.4.409 to <27), .NET 8; component `0.2.0-alpha.20` ✔ `D:revit-bridge/README.md`.
- Transport: authenticated loopback listener `127.0.0.1` ✔ `Datumm.Bridge/BridgeServer.cs:44`; per-session descriptor files in
  `%LOCALAPPDATA%\DatummAgent\sessions` with an owner-only ACL ✔ `SessionStore.cs:11-27`; command deadline 60 s, read 20 s ✔
  `BridgeServer.cs:30-31`.
- **Desktop path:** Electron spawns the TypeScript stdio MCP server (`revit-mcp`), which calls the loopback bridge.
- **Hosted path:** optional Node connector opens an outbound WebSocket to `/v1/connector` with a device token and forwards
  relay calls to the same stdio MCP. It advertises **every** MCP tool the server lists, including `approve_change_set` and
  `apply_change_set` ✔ `apps/connector/src/index.mjs:64-69,138`; the server-side relay allow-list is the real boundary ✔
  `O:relay.py:5,29`.
- `BackendDefaults.Url = https://d2hwgmaqtyfvmj.cloudfront.net` (our AWS backend); saved legacy Azure URL migrates to it;
  custom URLs are kept ✔ `Datumm.Revit/BackendDefaults.cs:6-10`.

### 3.2 What it can read and write

- **Reads:** host document only; linked models listed with transforms but not inspected ✔ `drafting.ts:108,115`. Categories:
  walls, floors, doors, windows, rooms (inventory); any requested categories (elements); types; views/levels/phases/links;
  persistent warnings; room finish boundaries; plan SVG; PNG of plan or 3D views; selection ✔ `drafting.ts:103-132`.
- **Writes (one change set, ≤100 operations, mm, internal XY):** `wall` (straight or arc), `floor`, `ceiling`, `roof` (flat or
  uniform slope), `floor_opening`, `stair` (stair-only batch), `create_wall_type` (type-only batch), `grid` (straight/arc),
  `door`, `window`, `room`, `room_tag`, `family_instance`, `dimension` (stable references), `create_level` (level-only batch),
  `create_plan_view`, `create_3d_view`, `create_section_view`, `create_sheet`, `create_viewport` (homogeneous documentation
  batch), `move`, `set_comments`, `set_room_metadata`, `set_room_color_scheme`, `change_type`, `delete`; existing-wall move with
  hosted-door evidence; phase-bound door-only batches ✔ `drafting.ts:76-101`.
- **No save, sync or arbitrary code tool** ✔ `index.ts:9`.

### 3.3 Transactions, dry run, receipts, read-back

| Mechanism | Evidence |
| --- | --- |
| Proposal = validated change set + hash, **10-minute expiry**, no open transaction | ✔ `DraftingService.cs:199-204` (`AddMinutes(10)` at :202) |
| Delete preview evaluates the full dependent closure in a rollback-only transaction; hash binds that closure | ✔ `DraftingService.cs:627-639`; `drafting.ts:133` |
| Approval checks hash, document, revision, expiry and re-checks the document, then sets `Approved` | ✔ `DraftingService.cs:217-231` |
| Local ribbon approval path (TaskDialog with exact change summary) | ✔ `DraftingService.cs:233-240` |
| Apply refuses unless approved (dry run excepted) | ✔ `DraftingService.cs:752` |
| One `TransactionGroup` "DATUMM: <title>", failure preprocessor, assimilated into **one Revit undo step** | ✔ `DraftingService.cs:774,790-793,1023` |
| Dry run: begin rollback-only, roll the group back, confirm rollback (and room colour scheme restoration); `ROLLBACK_UNCERTAIN` otherwise | ✔ `DraftingService.cs:775,1008-1018,1057-1059` |
| Durable receipt journal: `operationId`, proposal hash, document, state (`running/committed/rolled_back/failed`), created/modified/deleted IDs, warnings, verification failure | ✔ `DraftingContracts.cs:434-439`; `DraftingService.cs:763-764,1018-1036,1062-1065` |
| Idempotency: reusing an `operationId` never executes twice; unknown outcomes are reconciled through `get_operation_status`, never replayed; `JOURNAL_UNCERTAIN` if commit happened but receipt could not be finalized | ✔ `drafting.ts:137-139`; `DraftingService.cs:730-737,1054` |
| Read-back in the transaction (e.g. roof offset), identity checks for existing edits | ✔ `DraftingService.cs:912-916,962-963` |
| Desktop wrapper: preflight dry run → re-preview → owner dialog (45 s, fail closed, one at a time) → approve → apply → status read-back → warnings baseline vs read-back delta | ✔ `native-build.ts:538-593,630-689,736-738`; `native-confirm.ts:13-40` |
| Hosted wrapper: preview + dry run, exact approval or scoped grant, apply, `verify` | ✔ `O:workflow.py:260-268,340-410,464,472` |

**What is not recorded:** before-values of modified elements. `InteriorEditSnapshot` is used to verify the expected *after*
state, not to restore ✔ `DraftingService.cs:18,307-353`. Revert paths today: Revit's own Undo (one step per DATUMM group), and
a dedicated `undo-wall-move` action for existing wall moves only ✔ `orchestration.ts:1125,1138`.

### 3.4 Model health

`get_model_health_report` aggregates reads and "grants no write authority" ✔ `model-health.ts:7`;
`D:apps/desktop/src/main/README.md`. Warnings delta per build ✔ `native-build.ts:736-738`. Hosted cannot call
`get_model_warnings` (2.3).

### 3.5 What the web Build path uses today

Reads through `revit_read` (9 actions mapped onto the 15 relay reads ✔ `O:agent_workflow.py:3013,3038,3209`), preview
✔ `O:agent_workflow.py:3309`, `O:build_review.py:382`, dry run, approve and apply ✔ `O:workflow.py:268,358-402,464`, and the
three `compile_*` connector extensions ✔ `O:relay.py:5`. Not used: warnings, room boundaries, view images, show-in-Revit,
model health, the desktop's existing-edit review.

---

## 4. Design engine and rendering

### 4.1 Planner (shared package, two different entry points)

- Same `apps/planner` source in both repos (no change in the orchestrator since `2aace05`, only the README on desktop) ✔
  `git diff --stat 2aace05 HEAD -- apps/planner` (empty).
- Contracts: `design-brief.v1–v3`, `plan-graph.v1–v7`, `building-program.v1` ✔ `D:apps/planner/contracts/`.
- Graph versions: v5 convex, v6 curved, v7 multi-room coordinated convex rooms; generic checks for schema, parent version,
  256 KiB size, duplicate keys ✔ `plan-graph.ts:96-109`.
- Checks: `checkSpatial` (exact source dimensions, parcel envelope, setbacks), `checkRequiredAdjacency`, `checkV3` ✔
  `geometry-v3.ts:7-30`. **They throw on the first failure** — this is exactly what V1 changes ("collect every finding").
- **Desktop** runs a worker thread with actions `generate` (variable candidates), `generate-building` (multi-storey),
  `generate-multi-room`, `generate-convex`, `generate-curved`, `exchange` (local room-region swap) ✔
  `D:apps/desktop/src/main/planner-worker.ts:25-45`; started from `design-planning.ts:24`.
- **Hosted** runs `variable-cli.js` in a Node subprocess (`generate`, `validate`, `render`, `bind`), which imports only
  `variable-candidates`, `plan-graph`, `variable-bindings` ✔ `O:variable_engine.py:23-36,71`; `D:apps/planner/revit-mcp/src/variable-cli.ts:2-4`.
  So **curved, convex, multi-room and multi-storey generation, and `exchange`, exist in the shared package but are not
  reachable on hosted.**

### 4.2 Rendering

| | Desktop UI (`D:apps/web`) | Web (`datumm-web`) |
| --- | --- | --- |
| Framework | Next 16.4.3, React 19.3.0 ✔ | Next 16.4.6, React 19.3.0 ✔ |
| 3D library | `three` 0.186.1 + `OrbitControls` ✔ | `three` 0.186.1 + `OrbitControls` ✔ |
| 3D plan | `plan-three.tsx` 311 lines; imports planner curve tessellation, three-point arcs and room topology directly from `apps/planner` ✔ `:7-9` | `plan-three.tsx` 225 lines; rectilinear only, no planner import ✔ |
| Multi-storey 3D | `building-three.tsx` (reuses plan scene per floor) ✔ | none ✔ |
| 2D plan | `plan-canvas.tsx` 320 lines, React SVG, arcs | `plan-canvas.tsx` 311 lines, React SVG, rectilinear; geometry helpers in `W:src/lib/plan-geometry.mjs` ✔ |
| Building canvas | `building-canvas.tsx` | none |
| Native Revit model view | `native-model-canvas.tsx` (SVG from model snapshot), `native-model-tree.tsx`, `native-model-properties.tsx`, `native-model-workspace.tsx` ✔ | none |
| Native images | `native-view-images.tsx` (PNG from Revit) | plan image via hosted read only |

Both lines draw 2D as hand-written React SVG and 3D as plain three.js scenes; no viewer engine, no IFC. The desktop's extra
reach (curves, storeys, native model) comes from importing planner geometry into the renderer.

---

## 5. See / touch trust matrix

Legend for "Logged": **S** = span with arguments and result (desktop), **E** = run/task event with tool name and outcome (web),
**A** = admin trace row (counts only), **R** = add-in receipt journal. ⚠ = gap.

### 5.1 Desktop

| Actor | Can see | Can touch | Gate for each write | Logged |
| --- | --- | --- | --- | --- |
| Main agent (`datumm`) | All model-facing Revit reads (host document, any category, warnings, boundaries, images), chat/project docs, saved designs, attachments via companions, public web (Exa) | Local docs (`write_context`), research notes, saved designs, review-only proposals | None for local writes beyond `expectedRevision`; mode ≠ Ask | S |
| Vision specialist | Chat images/PDF sources **and all Revit reads** ⚠ (gets `this.tools`, not only images) ✔ `orchestration.ts:658` | Nothing | — | S (child of the Task span) |
| Evidence specialist | Revit reads, context reads, public research | Nothing | — | S |
| Compaction agent | Conversation | Nothing (`"*": "deny"`) ✔ `:446` | — | S (`provider.generate`) |
| MCP read group | Host document within each tool's bounds | Nothing (`show_model_elements` changes selection only, not exposed) | — | S |
| Proposal tools (`plan_build`, `plan_room_connection`, `design_plan`, `reconstruct_plan`) | Inputs + reads | Local proposal/design records | None (cannot reach Revit) | S |
| Native write path (`NativeBuild`) | Proposal, document identity | **Revit model** via preview → dry run → approve → apply | Execution token route + owner dialog bound to hash, digest, revision, expiry (45 s) | S + R ⚠ no before-values; revert = Revit Undo or one special action |
| Revit add-in | Whole host document | Whole host document within the operation union | Exact hash approval (chat, Full Control, or ribbon); **does not know who approved** ⚠ | R + `startup.log` |
| Owner (UI) | Everything local | Approves; deletes chats (purges traces) | Dialog | S (role `desktop`) |
| Admin | n/a (single user) | — | — | — |

### 5.2 Web (hosted)

| Actor | Can see | Can touch | Gate for each write | Logged |
| --- | --- | --- | --- | --- |
| Main LangGraph agent | 15 relay reads via `revit_read`, saved runs/plans/memory, skills, knowledge, web/regulation search, concept image model | Designs, proposals, memory, plan steps (Mongo); cannot call native writes | A4a mode + approval mode for `external`/`write` rows; `device` locked | E, A |
| Specialists (`specialist_jobs`) | Explicit same-version refs only | Findings only; "no goal or write authority" ✔ | — | E (`specialist_complete`), A |
| Relay | Device's tools | Calls `preview/approve/apply` on behalf of the workflow | Server allow-list; one lane per device; apply timeout → "unconfirmed, reconcile" ✔ `O:relay.py:28-74` | E (`tool_start/returned/stopped`) |
| Workflow approval | Proposal | `approve_change_set` | **Exact approval**, or a **scoped grant**: task access (remaining calls, operations, elements), agent control (selected-variable-plan, document, binding, max elements, expiry, remaining), device Full Control (expiry, remaining) ✔ `O:workflow.py:340-410` | E (`approved` with grant id) |
| Hosted connector | All MCP tools of the local server ⚠ (advertises approve/apply) | Whatever the relay sends | Device token; server allow-list | console only ⚠ |
| Revit add-in | Same as desktop | Same as desktop | Same as desktop | R |
| Admin | A1 text-free rows (owner hashed), config history, model registry, tool switches | Runtime config (CAS), tool rows can only **narrow** modes | Admin auth; audit trail ✔ `O:admin_api.py:37-171` | `admin_audit` |
| Owner | Own runs, events, exports | Approves; sets approval mode; grants Full Control | UI cards | E |

### 5.3 Gaps (both lines)

| # | Gap | Line | Fix | Plan phase |
| --- | --- | --- | --- | --- |
| G1 | No before-value per modified element; no generated revert proposal | both | Extend the receipt with `before` (parameters, location, type) for `move`, `change_type`, `set_*`, `delete` and offer "Revert this operation" as a new exact proposal | M1 (plan side), M2 (Revit side), EV1 |
| G2 | Add-in approval is hash-bound but caller-anonymous; hosted connector advertises write tools | both | Keep server allow-list as the boundary; add `approvedBy` + grant id to the approve call and receipt; connector advertises reads only unless the device has a write grant | V3 / M2 |
| G3 | Vision specialist can read the whole Revit model | desktop | Give `vision` only image/context tools | desktop backlog; web specialists already scoped |
| G4 | Limits default to off (steps, tools, calls, USD) | desktop | Non-zero defaults | desktop backlog |
| G5 | Remote Langfuse receives prompt previews | desktop | Loopback-only or strip previews | desktop backlog |
| G6 | Scoped grants on hosted can auto-approve before any evidence of reliability exists | web | Tie grants to the trust ladder (5.4) and to an operation-kind allow-list | AG1, M2 |
| G7 | Reads are logged as tool name + outcome on web, not arguments/coverage; no span tree | web | `run_spans` (1.4) | V2/EV1 |
| G8 | No retention policy for run data | web | TTL/archive | decision T-c |
| G9 | Hosted cannot read warnings or room boundaries, so "warnings delta" verification is impossible there | web | Add the four reads to the relay | V3 |

### 5.4 Proposed trust ladder for the revision agent

Per project and per **operation kind** (e.g. `set_room_metadata`, `door`, `move`), not global. Demotion is automatic.

| Level | The agent may | Gate | Evidence needed to move up |
| --- | --- | --- | --- |
| **L0 Look** | Call reads only; every read logged with arguments, document, revision and coverage | none | Read spans present for every claim in the answer (coverage manifest complete, `model_evidence` bound to document+revision); 0 unlogged reads in the run |
| **L1 Propose** | Prepare exact proposals and run dry runs; never approve | none (nothing reaches the model) | Last N (suggest 10) dry runs of this kind: rollback confirmed, 0 `ROLLBACK_UNCERTAIN`, V1 checks pass, proposal identity/hash stable on re-preview |
| **L2 Apply with exact approval** | Apply after the owner approves this hash/document/revision before expiry | Card or dialog per proposal | Last N applies of this kind: read-back verified, warnings delta has no new warnings (or each accepted), **before-values recorded and one revert exercised successfully** (G1), 0 `JOURNAL_UNCERTAIN` |
| **L3 Auto for named low-risk edits** | Apply without a per-proposal card, inside a grant: allow-listed kinds (start with `set_comments`, `set_room_metadata`, `room_tag`, `set_room_color_scheme`), max elements, expiry, remaining count — the shape the hosted grants already have ✔ `O:workflow.py:340-400` | Owner opt-in per project; batch review at the end (product direction) | Not a level to climb past; stays per kind. Any read-back mismatch, uncertain rollback/journal, new Revit warning, or owner revert **drops that kind to L1** |

Not eligible for L3, ever: `delete`, `create_level`, `stair`, `create_wall_type`, existing-wall moves, anything touching more
than one level.

---

## 6. Ranked port recommendations

Ranked by value for the cost. Size S/M/L. Phase = `revision-agent-plan-2026-11-17.md` or CV phase of
`desktop-ui-convergence-plan.md`.

| Rank | Port | From → to | Size | Phase |
| --- | --- | --- | --- | --- |
| 1 | **Collect-all checks**: wrap planner `check*` and hosted draft checks so each returns findings instead of throwing; finding schema `{rule, severity, message, expected, actual, roomKeys}` | shared planner + `O:agent_draft_verify.py` | M | **V1** |
| 2 | **Hosted reads parity**: add `get_model_warnings`, `get_room_boundaries`, `get_view_image` (and `show_model_elements` as a UI-only action) to `O:relay.py` and `agent_tools.py`; port the warnings baseline/delta from `native-warnings.ts` | desktop → orchestrator | S/M | **V3** |
| 3 | **Before-values + revert proposal** in the receipt (G1) | add-in (shared) | M | **M1** (plan analogue), **M2**, **EV1** |
| 4 | **Span schema + provenance hashes** in LangGraph, `run_spans` collection, owner run timeline; native `operationId`/hash/revision on spans | `runtime-trace.ts` → orchestrator | M | **V2** (Show/trace rows), **EV1** (change log) |
| 5 | **Agent regression suite for LangGraph**: port the Promptfoo cases (forbidden write, invalid args, recovery, cancellation, specialist handoff) with a fake relay | `tests/agent-evals` → orchestrator | M | **AG1** (gate before the agentic loop ships) |
| 6 | **Trust ladder** (5.4) on top of the existing hosted grants: per-kind state, demotion rules, kind allow-list | new, web | M | **AG1**, then **M2** |
| 7 | **Curved / multi-storey / multi-room on hosted**: extend `variable-cli` with the worker's `generate-*` and `exchange` actions | `planner-worker.ts` → `variable-cli.ts` | M | **M1** (`exchange` = room swap), building later |
| 8 | **Renderer reach**: port `plan-three.tsx` curve/arc handling and `building-three.tsx` into the web, behind the CV host adapter | desktop UI → `datumm-web` | M | **CV2** (shared shell) / **CV4** (slots) |
| 9 | **Native model tree / canvas / properties + existing-edit review** | desktop UI → `datumm-web` | L | **M2**, **CV4** |
| 10 | **Hide `PipelineTrace` on web** until `run_spans` exists (capability flag) | web | S | **CV1** |
| 11 | **Role-scoped tool sets** for any future hosted LLM specialists (vision gets images only) | desktop rule, improved | S | **AG1** |
| 12 | **Code checks with citations** reuse the findings schema from rank 1 | — | M | **R1′** |
| 13 | **Redline intake** reuses `reconstruct_plan`'s source-region contract (owned image/page id + hash + normalized region) | `design-planning.ts:95` | M | **RD1** |
| 14 | **Drift gate**: synced renderer files must stay hash-equal | — | S | **CV5** |
| 15 | Approval receipt details in the review card (hash prefix, digest, revision, expiry, operation counts — the desktop dialog's fields) | `native-confirm.ts:29-31` | S | **V2** / **UX1** |

Not to port: OpenCode plugin/nonce plumbing (LangGraph owns its tool calls), JSONL trace files, local Langfuse/MLflow
settings UI, Electron dialog.

---

## 7. Decisions for the user (recommendation first)

| # | Decision | Recommendation | Alternative |
| --- | --- | --- | --- |
| T-a | Trust ladder scope | **Per project and per operation kind, with automatic demotion** | One global level per user |
| T-b | What the hosted Full Control / task / agent grants may approve now | **Only kinds that reached L2 evidence; deletes and levels never** | Leave grants as they are until AG1 |
| T-c | Run-data retention on hosted | **Keep runs 180 days, archive spans/events after 30 days; feedback unchanged** | Keep forever (today) |
| T-d | Trace store for the web | **Mongo `run_spans` with the desktop span schema; no third-party export yet** | OTel export to Langfuse/MLflow now |
| T-e | Before-values for edits | **Record in the add-in receipt (shared by both lines)** | Record only on the server from pre-reads |
| T-f | Hosted connector advertising write tools | **Advertise reads only unless the device holds a write grant** | Keep as is (server allow-list only) |
| T-g | Bring curved/multi-storey planning to hosted | **After V1/M1, through `variable-cli` actions** | Now, before V1 |

---

## 8. Not verified

- Live behaviour of any path on either line (nothing was run).
- `readDatumInsights` internals, `native-model-wiring.ts` routes and the exact `show_model_elements` caller (README level only).
- Whether OpenCode streams text to the desktop UI (inferred in the earlier comparison).
- Web UI component behaviour (`agent-activity`, admin traces) beyond file presence and the `PipelineTrace` source.
- The exact field list of hosted `verify` (`O:workflow.py:472`) versus the desktop's read-back predicates.
- Whether the scratch copy `scratchpad/dm/` matched `origin/main`; this research used a fresh `git archive` of `origin/main`.
