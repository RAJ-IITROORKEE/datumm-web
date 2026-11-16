# DATUMM — proposed incremental AG-UI migration plan

16 November 2026. **Approved direction; currently held for the user's progress review.** [Current audit](AGUI_CURRENT_ARCHITECTURE_AUDIT.md) → [feature research](AGUI_FEATURE_RESEARCH.md) → [gap analysis](AGUI_GAP_ANALYSIS.md) → [target architecture](AGUI_TARGET_ARCHITECTURE.md). The earlier count implementation stays paused in [HANDOFF](../ux/HANDOFF.md).

> **Order superseded, 16 November 2026.** The N1–N5 order and the "right work area and admin deferred" scope below are replaced by the [roadmap](../ux/roadmap-2026-11-16.md) (decisions D22 and D23 in [PLAN.md](../../PLAN.md)). Phase definitions, acceptance requirements and the measurement protocol here still apply as inputs. Do not follow the older sequencing.

## Review checkpoint — 16 November 2026

User requested updated progress and handoff before continuing. **Do not start the next phase automatically.** Resume only after their next instruction. This checkpoint supersedes historical automatic progression and “producer not implemented” notes later in this document; phase definitions and acceptance requirements remain the target.

| Phase | Verified progress | Still open |
| --- | --- | --- |
|0 Baseline | Exact current source manifests, functional/build/runtime tests and scoped browser evidence recorded | Latency/memory/token measurements and broader recovery baseline; no performance improvement claimed |
|1 AG-UI compatibility | Actual chat send/observe and hosted grouped-question continuation implemented/tested using v2 authority | Generic multi-interrupt/native-tool resume, broad replay/reconnection and remaining fault cases |
|2 Agent/tool activity | Compact source-bound process, grouped attempts, conservative historical status and failure/wait handling implemented | Explicit tool-result/latency evidence from all producer paths and larger fault coverage |
|3 Task/multi-agent UI | Existing checklist, specialist/scheduler and usage interfaces retained | Full parent/child concurrent lifecycle, dependencies, retry/recovery and complete observability |
|4 Structured generative UI | Bounded illustrative registry and actual local finish proposal/checkpoint/projection/client gate implemented; controlled graph output tested through AG-UI in Codex browser | Live-provider/tool-schema quality, hosted/container qualification, completion evidence beyond 2,000-event tail, measured components, safe frontend capabilities/actions and broader interactions |
|5 Floor-plan shared state | Existing viewer and immutable plan/report identity preserved | Further AG-UI right-work-area integration explicitly deferred; no new generator/direct editing implied |
|6 Performance/reliability/rollout | Local functional, TypeScript/build, auth/origin and production fixture404 checks passed | Benchmarks, sustained load/replay/fault/real-store/container/restore/live-provider gates and approved rollout |

Current checkpoint: 603 frontend tests; 180 backend tests + 26 subtests; TypeScript/build; 21 runtime checks; 12 cross-runtime cases; lat check passed. Graph freshness remains unresolved. Source hashes and original frozen repair hashes matched during the review handoff update; no application tests rerun for documentation-only changes. Details: [HANDOFF](../ux/HANDOFF.md) and [producer packet](../ux/agui-composition-producer.md).

Proposed review order: **N1 retained completion evidence → N2 safe frontend awareness/actions → N3 lifecycle/recovery → N4 evidence-backed compositions/interactions → N5 streaming/performance**. Hosted provider/container/planner/deployment acceptance is a separate access-dependent gate. AWS login is unavailable; no request is pending. This sequence does not authorize scope expansion or resumption during the review hold.

On resumption preserve v2 commands/checkpoints, native approval, affectUI identity, right work area, candidate branches and dirty work. Recheck changed source/gates; a controlled replay does not prove the hosted agent emits compositions.

## Approved chat-only scope and phase order

Latest continuation gate: [hosted question resume](../ux/agui-chat-continuation.md) qualified565 tests/TypeScript/build/17 runtime checks and actual grouped-choice reload/answer/AG-UI continuation. General Plan admission repair is locally source-reviewed and tested (159 API +9 subtests), undeployed on a separate base 188 branch. Cloud/real-planner/live-provider gate remains open; prior count candidate is excluded. Next dependent harness work follows that validation; agent-composed layouts/frontend capability integration are still pending.

Current implementation status: baseline functional gate passed535 tests/TypeScript; chat AG-UI producer/consumer slice passed554 tests, TypeScript, production build and16 runtime checks plus actual Codex Ask/follow-up/question/reload and 390px containment. See [implementation packet](../ux/agui-chat-migration.md) for exact limits. Phase 0 performance measurements and wider Phase1 replay/native/resume gates are still open; advanced dependent features are not marked complete. AWS renewal is pending for hosted harness work. Next scoped producer repair is general Plan intent versus mandatory geometry briefing, followed by safe progress/tool emission and compositional UI integration.

The latest user approves Option B through A and implementation with subagents. Primary outcome: an agent-native middle chat with quick visible acknowledgment, actual process/tool/checklist updates, versioned questions and agent-selected/composed interactive responses. Right-side Design/Activity/Assets/Exports and floor-plan shared state are deferred. Existing native approval and artifact identity stay authoritative.

The prior registry-first proposal understated the requested composition flexibility. Extend Phase4 from domain cards to **bounded declarative composition**: agent selects content and layout from safe primitives (text, stack/grid, metric, table, image/reference, chart, node/edge diagram, checklist, choice/form and domain preview). Templates are optional shortcuts, never the only response form. Agent may choose chart/diagram structure and combine blocks, with accessible text/table alternatives. Mermaid is one optional renderer, not the required diagram grammar. Domain-specific tool facts/permissions still come from verified evidence; no generated executable React/JS/HTML, unrestricted network calls or approval bypass.

Order after baseline: (1) chat AG-UI wire and lifecycle/recovery; (2) instrument missing real producer activity/tool data and safe public summaries, independently qualify provider answer streaming; (3) integrate checklist/specialist/question states in compact chat; (4) typed compositional UI schema + renderer, frontend capability/context contract and agent presentation tool; (5) performance/fault/mobile acceptance. Original Phase5 floor-plan integration is deferred; original Phase6 reliability applies to chat. Phase4 work starts only after its transport/identity prerequisites pass. A schema/renderer without an actual agent emission path is not a completed generative UI feature.

Frontend awareness is a compact versioned capability/context envelope: current chat/run, selected permitted context, supported presentation primitives/actions, viewport class and pending input state. Agent-initiated frontend actions are allowlisted, validated and scoped to current task; initial actions are reversible display/form operations. Do not send the DOM, full diagnostic log or secrets to the model. A request for “full access” is implemented as useful mediated interaction, with server-side authorization for consequential operations.

The chat wire target is AG-UI, replacing custom browser progress packets. Keep v2 business command/snapshot/recovery endpoints behind the adapter: HTTP request/response still exists underneath streaming, and removing durable admission would break existing guarantees. Retained AI SDK useChat may consume an internal protocol bridge during migration; report this clearly rather than claiming a full framework rewrite. Do not silently fall back by resubmitting an admitted command. Evidence-based fallback can observe the existing saved task.

Success measures: first acknowledgment and first actual update separately timed; safe operational summaries instead of private reasoning; one live process surface, compact question tray; independently validated dynamic layouts; measured render/stream overhead. Zero latency cannot be promised. New provider streams must preserve final-answer evidence admission and correction boundaries before publication.

Approved direction: Option B (thin AG-UI adapter plus typed compositional React renderer), introduced through Option A, scoped to chat. Keep current harness, v2 commands/checkpoints, AI SDK compatibility and AffectUI presentation. CopilotKit/A2UI packages and direct geometry editing are not prerequisites. The latest user instruction authorizes this scoped implementation; broader work-area/native/release scope is separate.

## Phase 0 — baseline and contract freeze

**Objective:** create an exact, reproducible source/runtime baseline before touching protocol or UI.

**Reuse:** current 535-test frontend suite, TypeScript/build/runtime checks, v2 task projection, saved generation/revision packets, source hashes, existing browser journeys and backend fixtures.

**Required changes after approval:** instrumentation and benchmark fixtures; inventory deployed source/image versus local candidate; classify required native/hosted/desktop capabilities; freeze current command/event/QuestionSet/approval/artifact schemas. Recheck selected SDK release schemas and dependency graph. Record current source manifest rather than assuming branch HEAD covers dirty work. No package upgrade merely to establish baseline.

**Dependencies:** chosen source baseline, access to designated test accounts/models, representative workload and approved measurement limits. Existing AWS renewal and local count-repair exact-source gates remain separate.

**Risks:** conflating local candidate with deployed service, collecting private data, benchmarks that time external models inconsistently, unqualified native writes.

**Tests:** rerun source-matched existing gates; capture real general question, grouped clarification, one/two alternative generation, revision with requested report, report history/CSV, pause/continue/reload and exact native-denial cases. Use controlled provider fixtures for transport performance; separately report real provider timing.

**Acceptance:** manifest identifies all frontend inputs and backend image; zero unexplained baseline failures; retained documents/approvals behave unchanged; benchmark table populated with method and sample counts; known gaps explicitly carried forward. No AG-UI performance claims yet.

**Complexity:** Medium; much existing test machinery can be reused, deployment/native evidence may dominate duration.

**Rollback:** instrumentation disabled; existing runtime untouched; retain measurement records without storing secrets.

## Phase 1 — AG-UI event compatibility

**Objective:** offer a conformant observation/run surface without replacing business execution.

**Reuse:** task command admission, idempotency, run/task outboxes, snapshot/cursor recovery, Clerk proxy, versioned checkpoint receipts and failure taxonomy.

**Required changes:** domain-to-AG-UI mapper, protocolVersion/schema validation, stable event/run/tool mapping, redaction and safe public payloads; add a separately routed feature-flag endpoint. Define standard POST run behavior separately from DATUMM observation/replay extension. Existing UI stays on its legacy adapter initially. Add a normalized projection boundary usable by either adapter.

**Dependencies:** Phase 0 contract freeze, exact package selection approval, chosen protocol-run/domain-execution mapping and retry semantics.

**Risks:** double submission in shadow mode; waiting reported as success; call arguments mistaken for result; dropped snapshot data; reconnect creating a second native action.

**Tests:** pure mapping fixtures against actual saved event families; schema/order validation; multiline/comment SSE framing and UTF-8 chunk splits; duplicate/out-of-order events; snapshot gap repair; unauthorized task/artifact; response interruption before/after admission; old checkpoints; unknown event fallback. Shadow comparison replays recorded events without running model/tools twice.

**Acceptance:** same admitted commands and canonical domain outcomes as legacy path; no duplicate action; waiting/cancelled/failed/uncertain preserved; 100% mapped supported fixture events validate; unsupported historical events remain explicitly unknown; no private reasoning or secret in public payloads. Polling fallback works if AG-UI endpoint fails.

**Complexity:** High around identity/recovery; medium for basic encoding. A generic graph adapter alone is insufficient.

**Rollback:** feature flag selects current AI SDK/v2 adapter; new records are additive and readable by existing runtime. Never downgrade an in-flight checkpoint to incompatible code.

## Phase 2 — agent activity and tool-call visualization

**Objective:** make actual work understandable in one compact process surface.

**Reuse:** TurnProcess, AgentActivity, adopted AffectUI ToolCallCard, current question tray, failure messages and Activity diagnostics. ToolCallGroup is an available vendor export with no current production caller; evaluate it as an optional primitive, not shipped grouping behavior.

**Required changes:** instrument actual tool start/result/failure/attempt identity where missing; expose redacted input/result summaries and timestamps; render one stable process group per turn. Keep authorized, redacted retained arguments/results on demand when recorded, never an unredacted disclosure bypass. Maintain short saved answer with full details in work-area artifacts. Final-answer token streaming requires a separate provider-path change and must retain evidence admission; do not stream unchecked private analysis or provisional claims as final output.

**Dependencies:** Phase1 projection; evidence contracts per tool; reference interaction map from PLAN. No new native permission authority.

**Risks:** fake tool-running animation, confusing TOOL_CALL_END with success, duplicates across reply and Activity, summaries hiding essential failure/source information.

**Tests:** sequential/parallel/retried tools, missing arguments/result, failed/uncertain native outcome, scroll during updates, expand/collapse and keyboard focus, reduced motion, delayed response, no provider token stream. Compare actual Thread disclosure/Decision/Later reference behaviors.

**Acceptance:** active action visible without opening logs; completed repeated calls grouped but all attempts accessible; no tool shown successful without result evidence; answer concise and source-correct; safe error plus recovery action; no duplicate process cards. All existing mobile and approval tests retained.

**Complexity:** Medium, with high-risk producer changes isolated by tool family.

**Rollback:** old process renderer selected against same normalized data; preserve stored events. Disable optional provider streaming independently.

## Phase 3 — task progress and multi-agent UI

**Objective:** expose real checklist and specialist work without fabricated dependencies or progress.

**Reuse:** task plan/native todo normalization, specialist job store, recorded reviews, Activity usage display and task filters.

**Required changes:** stable checklist/step versions and job start/end/error/suspension events; parent/child/tool/attempt correlation; duration from recorded timestamps; current/unknown/completed/skipped states. Compact agent list first; lazy graph view only when actual edges exist. No new agent scheduler is implied. Usage remains run-scoped versus shared-ledger scoped, with coverage.

**Dependencies:** Phase1 IDs and Phase2 tool records; backend specialist instrumentation and actual parallel workload.

**Risks:** presenting role names as executed agents; treating silence as completion; stale count after revision; overcounting usage or double-counting cache/reasoning; graph inaccessible on mobile.

**Tests:** no checklist, changed/replaced checklist, old turn provenance missing, partial jobs, parallel finish order, retry, interruption/resumption, missing duration, mixed-provider partial usage. Parent cancellation versus child reconciliation. Graph/list parity.

**Acceptance:** counts match verified milestones for exact turn/version; unknown stays unknown; every displayed child maps to persisted job; no private reasoning; shared usage never relabelled as latest-request usage; keyboard/mobile list covers all graph information.

**Complexity:** Medium–high; visibility depends on producer instrumentation, not component installation.

**Rollback:** disable graph/new participant view; retain existing recorded-review UI and persisted job data.

## Phase 4 — structured generative UI

**Objective:** choose compact useful presentation without executable model code.

**Reuse:** Streamdown, existing table/report previews, output workspace, artifact/exports, questions and exact approval controls.

**Required changes:** small versioned discriminated presentation union, server/client validators, allowlisted registry and safe fallback. Start with conciseAnswer, executionSummary, questionSet, roomSchedule, floorPlanRef and artifact. Add optional comparison/chart/explanation later. Use deterministic result mapping first; bounded model selection only when useful. Do not add frontend-native writes, arbitrary imports, HTML/JS or unrestricted layouts.

**Dependencies:** stable source identity and artifact contract; model/provider schema support if selected. Separate approval for additional rendering packages; optional A2UI portability experiment only if it solves a verified need.

**Risks:** oversized/invalid specs, unsupported kinds, stale artifacts, hallucinated values, token inflation, unsafe links, repeated cards.

**Tests:** malformed/unknown/oversized payloads, partial streaming JSON, missing source, foreign artifact, stale version, malicious markup/paths, duplicate presentation IDs; fallback text; CSV exact revision; charts agree with source table; cross-chat/reload persistence; accessible preview focus.

**Acceptance:** every interactive component comes from an allowlisted renderer and verified source; invalid output never executes code or blocks chat; no forced diagram for architectural output; no suggested-prompt chips; schema-token cost recorded against baseline. Full artifact payload fetched on demand.

**Complexity:** Medium for initial registry; high if expanded into arbitrary A2UI composition, which is deferred.

**Rollback:** text/linked-artifact fallback for new descriptors; preserve old viewers and revision storage. Version descriptors so old clients can ignore safely.

## Phase 5 — shared-state floor-plan workspace

**Objective:** synchronize exact design/revision/context while preserving geometry and native approval boundaries.

**Reuse:** PlanGraph, immutable plan versions/fingerprints, selection revisions, PlanCanvas/Three fallback, annotations, Project Brief, report history and current Revit proposal validation.

**Required changes:** canonical engine-adapter interface around current generator; capability/schema/units checks; read-only AG-UI design references and version-aware workspace projection; explicit selection/annotation context commands; snapshot recovery without resetting camera/draft. Research DXF/RVT adapter contracts independently; do not implement a new generator or direct dragging by implication. Direct room/wall/dimension editing needs separately approved scope.

**Dependencies:** Phase1/4 identity and registry; explicit engine capabilities; approved native test model for native extension work. Candidate count repair must be reconciled as a separate baseline decision.

**Risks:** wrong units/axes, silent schema downgrade, camera and model state mixed, stale approval after revision, duplicate drafting after lost acknowledgment, sheet targets confused with measured areas.

**Tests:** generate/review/revise/accept/reload; two tabs with stale version; wrong account/task/fingerprint; annotation anchor invalidation; unsupported geometry/3D fallback; sheet export same exact source; native permission denial/expiry/device swap; partial drafting reconciliation on designated model if native scope authorized.

**Acceptance:** same saved geometry drives 2D/3D/report and export references; no patch directly grants approval or mutates authoritative geometry; revisions immutable; selection/draft/camera restored; partial native outcomes are never called success without read-back. Engine-independent contract can be tested with a synthetic adapter without shipping another generator.

**Complexity:** High. Native write/read-back remains a distinct acceptance gate, not incidental UI testing.

**Rollback:** existing PlanGraph/engine and v2 viewer path stay available; flag disables shared projection. Preserve immutable versions and approval invalidation; no destructive geometry migration.

## Phase 6 — optimization, reliability and rollout

**Objective:** prove value and reliability on exact production-like builds before any broad rollout.

**Reuse:** all prior gates, explicit source/image manifests, restore/recovery packet, existing legacy transport.

**Required changes:** measured render optimization, narrow subscriptions/indexing, bounded buffering and selective lazy/windowed rendering; retention/backpressure policy; telemetry for schema/replay/fallback failures; per-account canary flags and observable rollback. No optimization based only on intuition.

**Dependencies:** prior phase acceptance, current AWS access if cloud validation required, supported deployment timeout/buffering configuration, approved thresholds and designated accounts.

**Risks:** focus lost by virtualization; coalesced events hiding approval/result; mixed-version clients; orphan native execution; dependency/CSP/regression surprises.

**Tests:** sustained event load, reconnect/drop/slow-client/backpressure, expired auth and failed provider/tool, deploy during paused question, artifact load failure, multi-account isolation, long chats, desktop/mobile/keyboard/screen reader, exact-source container and restore drills. Compare legacy/AG-UI from the same durable log, never double-execute real writes for comparison.

**Acceptance:** functional gates green; no duplicate side effects or cross-account data; benchmarks meet approved targets or explain regressions; exact client/server/source versions documented; recovery and kill switch demonstrated; known limits accepted. Merge/release remains a separate final decision.

**Complexity:** High and evidence-dependent; cannot estimate deployment readiness from number of UI components.

**Rollback:** stop new AG-UI admissions, route new tasks to legacy, drain/observe existing tasks with compatible handler; retain version 2 checkpoints and new additive records. If data is incompatible, deploy a tested compatibility release, not a blind image rollback.

## Measurement protocol and proposed targets

Current baseline: 535 functional tests and prior scoped browser/build evidence, **not** measured latency/memory/token savings. The numbers below are proposed acceptance targets to approve/refine after baseline; none are current achieved results.

Use fixed hardware/browser/build/network profile and exact backend image. Controlled fixtures separate rendering/transport overhead from model variance. Workloads: 20/200/1,000 turns; 10/100/1,000 tool events; 1/4/8 actual-or-synthetic specialist records; 10/50/200-room synthetic graphs (unsupported capability labelled); 320/390/768/1135/1440px layouts. Repeat controlled runs at least 30 times; real-provider samples separately report model, latency, sample count and uncertainty. No private payloads in performance logs.

| Metric | Measurement | Proposed gate |
| --- | --- | --- |
| First visible acknowledgment | Submit → local acknowledged/pending paint; separately server admission | p95 ≤150ms local; never label local acknowledgment as server admission |
| First useful agent update | Submit → first actual public event; split provider/queue/transport | Record baseline; no improvement claim unless repeated paired evidence |
| Tool visualization latency | Backend event timestamp → browser applied/painted, clock offset accounted | Local replay p95 ≤100ms; hosted path target ≤500ms after emission |
| Protocol overhead | Adapter CPU time, encoded bytes/event and end-to-end latency vs same legacy log | p95 adapter overhead ≤20ms; report bytes including snapshots, not just delta size |
| Render responsiveness | React commits, long tasks, input delay while streaming | No p95 input regression >10%; investigate >50ms main-thread tasks |
| Memory/history | Heap and retained entity counts after 1,000 turns and repeated task switching | Bounded growth; ≤15% regression budget pending baseline; no unbounded replay buffer |
| Bundle | Same production route compressed JS and lazy chunks, before/after | Proposed initial-shell added budget ≤50KiB gzip; exceptions require approval and evidence |
| Network/polling | Requests/minute, bytes/minute, redundant snapshots, slow-consumer queue | Reduce only proven duplication; retain recovery and liveness |
| Tokens | Same model/prompts/tool evidence; input/output/schema tokens and provider totals | No savings assumption; flag >5% schema overhead before enabling globally |
| Recovery | Dropped/duplicated/reordered events and failed acknowledgments | Zero duplicated commands/native writes; final read projection equals authoritative snapshot |
| Accessibility | Keyboard/AT checks, focus restoration, text status and reduced motion | All critical flows operable without drag/hover/color alone |

## Execution and handoff discipline after approval

Cross-cutting Phase1/6 conformance gate: test crash between command admission and mapping publication, same idempotency key across both transports, duplicate/interleaved publication, concurrent tabs, expired/partial interrupt answers and older consumers receiving unknown terminal outcomes. No truncated connection may synthesize success. Where native acceptance is authorized, inject disconnect after dispatch/before receipt/during read-back and race client abort against Stop; preserve exact proposal/document/session/revision/expiry and require fresh consent for changed scope. Until native tests are authorized and pass, native rollout remains disabled for the new adapter. Synthetic Phase5 engine tests must include round-trip identity and explicit unsupported curve/multi-level rejection without changing existing saved hashes.

Each phase starts from an exact source manifest and ends with changed files, tests, actual browser evidence, backend deployment identity, unresolved limits and rollback notes. Implementation, independent review and browser validation use separate agents; only one owner changes any shared file. After the user resumes following this review hold, proceed within the approved chat scope after prerequisite acceptance passes. If a gate remains unresolved, repair it before starting dependent work. User approval now covers chat OptionBviaA; right-work-area/native/release expansion remains separate.

First implementation slice: Phase 0 plus Phase1 chat producer/consumer using existing v2 evidence and saved state. Exclude native writes, new floor generator, CopilotKit adoption and right-panel changes. Demonstrate general answer, question interruption and saved-state recovery; controlled fixtures cover additional lifecycle/tool states before enabling them broadly. Do not invent missing producer evidence to satisfy a demo.

## Decision status after latest instruction

- Approved: Option B via A for middle chat; preserve harness/AffectUI and retain business command authority.
- Updated requirement: agent-composed declarative layouts beyond fixed cards, frontend awareness/actions, concise live process and questions.
- Deferred: right work area/floor-plan state/direct editing/import; no new generator.
- Benchmark numbers remain proposed targets; actual measurements and regressions must be reported before performance claims.
- Count-repair release remains paused and separate; no native authority expansion or general release implied.

The original research stopped without implementation. Subsequent user approval now starts the chat-only sequence above. Each following handoff must record actual source/tests/browser/backend scope; pending phases are not marked complete by transport adoption.

## Local continuation while AWS authentication is unavailable

Latest [producer packet](../ux/agui-composition-producer.md) supersedes the foundation-only status below for this bounded illustrative slice: real harness finish proposal/checkpoint and public projection are implemented locally, with exact hash/identity client verification and captured-graph AG-UI browser replay.603 web tests/180 API tests + 26 subtests/build/21 runtime checks passed. Phase4 live-provider/container/deployment, measured-data rendering, frontend capability actions, durable completion beyond the 2,000-event tail and broad replay remain open. This is not full Phase4 or release acceptance. Preserve the frozen earlier candidate and defer right-work-area migration.

User explicitly authorized localhost development/testing. [Current local packet](../ux/agui-local-chat.md) records584 tests, TypeScript/build/18 production runtime checks and actual Ask/history/reload browser proof. Phase2 presentation now groups source-bound repeated attempts and avoids inherited historical completion; missing public tool outcome proof stays unconfirmed. Existing literal historical table exports remain available independently of stricter new composition proof.

Phase4 **foundation only**: bounded source-derived illustrative text/layout/table/chart/connection renderers and fallback are integrated into the actual chat renderer and exercised in an explicitly controlled development preview. No actual agent presentation proposal, checkpoint/historical projection or measured-data registry emission is implemented yet. This does not satisfy Phase4's end-to-end producer acceptance. The packet specifies that next local producer/test slice. Existing right work area remains deferred; frozen Plan-intent candidate, real-planner/container/deployment and live Plan qualification remain pending. Do not block independent local work on renewed AWS login or mark dependent cloud gates passed.
