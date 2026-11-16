# DATUMM — AG-UI and agent workspace gap analysis

16 November 2026. Planning, not a migration completion claim. Source references resolve through the detailed [current audit](AGUI_CURRENT_ARCHITECTURE_AUDIT.md); technology claims through [feature research](AGUI_FEATURE_RESEARCH.md).

## Ranked top ten

Priorities are migration/product risk, not claims of ten reproduced production bugs. P0 = must preserve before migration; P1 = first useful product upgrade; P2 = gated enhancement.

| Rank | Priority | Problem and evidence | User impact | Proposed treatment |
| --- | --- | --- | --- | --- |
| 1 | P0 | Domain approval and task lifecycle cannot be represented by a chat's generic finished flag (`task_controller.py:568,658–660`, `main.py:1104–1165`) | Migration could show waiting/cancelled/uncertain native work as complete or weaken approval | One explicit mapping contract; retain exact native authorization and reconciliation |
| 2 | P0 | Durable task cursor model differs from standard AG-UI HTTP's non-resumable stream (`task-projection.ts`, `task_api.py`) | Reconnect could duplicate commands or discard a continuing job | Preserve v2 recovery; separate observation/replay from execution; never blindly rerun |
| 3 | P1 | Hosted model calls await ainvoke; browser text chunks wrap completed answer (`budget.py:468–478`, `/api/chat:34`) | Long apparent silence and misleading expectation of token streaming | Emit real public milestones now; separately qualify final-answer streaming later |
| 4 | P1 | Public events are mostly stage/detail, while structured evidence arrives separately (`task_contracts.py:297–324`, diagnostics) | Tool card cannot always explain current action/arguments/result | Stable tool invocation/attempt records, redacted argument/result summaries and evidence references |
| 5 | P1 | Specialist jobs exist but lack complete public start/progress/dependency attribution (`specialist_jobs.py:342–466`) | Parallel work appears as sparse completion notes | Instrument actual jobs; show compact attributed list first; graph only with real edges |
| 6 | P1 | Task/checklist, AI SDK transient messages, outputs and drawing selection have several owners (`use-workspace-state.ts`, output context) | Repeated UI fixes can leave inconsistent status or repeated cards | One normalized read projection with keyed entities; distinct command and local-view state |
| 7 | P1 | Rich answer choices are domain-specific branches plus Markdown, not a general typed presentation contract | Tables/artifacts/questions can feel disconnected from the result | Bounded registry using existing cards; short answer and exact linked output |
| 8 | P1 | Engine integration is fixed CLI, not a canonical multi-engine boundary (`variable_engine.py`, PlanGraph) | Future engine changes risk geometry/version/approval drift | Define adapter contract and capability validation; preserve current engine until separately replaced |
| 9 | P2 | Long-history mapping, render fanout and snapshot polling have no measured performance baseline | More events could degrade typing, scrolling and drawing | Benchmark first; indexed subscriptions, batching and selective windowing based on evidence |
| 10 | P1 | Test/provenance records mix historical scope; latest count repair is local only; 22-vs21 vendor import drift | “Implemented” can be mistaken for deployed and fully tested | Explicit source/test/deploy matrix; keep earlier work paused and independent from AG-UI |

## Feature comparison

| Feature | Current implementation | Identified gap | Proposed solution | Priority |
| --- | --- | --- | --- | --- |
| Agent streaming | Custom task SSE → AI SDK transient parts; saved task recovery | Not AG-UI; no model token stream | Add compatible projection endpoint behind flag; retain AI SDK branch | P1 |
| Tool calls | AffectUI tool cards, timelines and optional structured diagnostics | Uneven source evidence; partial execution correlation/latency | Typed tool state and safe summaries; never infer result from argument end | P1 |
| Task progress | Real task plan/native todos, counts and provenance labels | No uniform step/dependency event contract across producer paths | Versioned checklist in normalized state; verified state transitions | P1 |
| Multi-agent UI | Recorded participants and specialist reviews | No universal live child start/end/attempt lineage | Add child-job events; optional dependency graph/list | P1 |
| Generative UI | Streamdown, tables, drawing/report/approval components | No allowlisted schema-driven selection contract | Versioned registry + deterministic tool-result presentation | P1 |
| Shared state | Versioned task projection, local React state, output scope | No AG-UI state projection; local/server ownership must remain distinct | Server read model + local view state + explicit revision-bound commands | P0 |
| Floor-plan preview | SVG-like 2D review, dark Working/white Sheet, lazy schematic Three | Not full Revit authoring or arbitrary RVT/DXF import | Preserve viewer; engine adapter and capability schema; direct editing deferred | P1 |
| Questions | Versioned grouped questions, Later/Show, answer drafts | New protocol must preserve all IDs/receipts and historical state | Interrupt adapter to existing QuestionSet; one waiting tray | P0 |
| Approvals | Web acceptance separate from exact native proposal | Generic UI/AG-UI tool approval insufficient | Server-bound approval interrupt; existing command authority only | P0 |
| Output brevity | Short summary conventions and previews already implemented | Depends on provider content and domain branching | Summary budget with full safe detail retained in artifacts; no destructive blind truncation | P1 |
| Tables/charts | Markdown tables, CSV/revision reports | Typed chart/large-data pagination not generalized | Registry table first; chart only when useful, units/source/version labelled | P2 |
| Mind maps/flowcharts | Optional Mermaid plugin | No general node-based interactive diagram registry | Optional requested renderer; no default diagram or floor-plan substitution | P2 |
| Usage/context | Per-call budget ledger; estimate/coverage-aware UI | Not standard event updates; ledger spans executions | Preserve scopes; optional normalized usage snapshots, unknown stays unknown | P1 |
| Assets/exports | Preview and source-bound downloads with report history | Not arbitrary file/RVT upload/BOQ support | Reuse registry; explicit supported kinds and source revision, honest unavailable state | P1 |
| Memory/RAG | Project Brief persistence; bounded evidence memory, retrieval | Research quality and personal memory not fully qualified | Keep project-centered sources; retrieval evaluation separate from transport | P2 |
| Mobile/accessibility | Prior 320–1440px checks, keyboard panes/dialogs, reduced motion | Full assistive-tech/touch/continuous-stream matrix incomplete | Screen-reader announcements, virtualized focus tests, physical touch gate | P1 |
| Error recovery | Typed failure messages, replay/snapshot, reconciliation | Successful drop/reconnect/fault scenarios not fully qualified | Fault matrix with zero duplicate side effects and explicit unknown outcomes | P0 |

## Proposed UI behavior, grounded in AffectUI

The reference map in [PLAN.md](../../PLAN.md#component-reference-map) remains the visual baseline. Preserve the compact single left sidebar, shared composer and four right tabs. Do not introduce separate Tasks/Memory top-level screens merely because a demo has them.

| Surface | Reference | Proposed DATUMM behavior |
| --- | --- | --- |
| Chat process | [Agent Thread](https://www.affectui.com/screens/agent-thread/full), [tool card](https://www.affectui.com/components/tool-call-card) | One updating process block per turn. Current safe action visible; completed calls collapse into count/duration, expandable by keyboard. Group repeated calls visually but preserve every attempt in details |
| Streaming/result | [AI answer](https://www.affectui.com/components/ai-answer), [thinking state](https://www.affectui.com/components/thinking-state) | Immediate request acknowledgment, actual public milestones, then 2–3-sentence answer. No fabricated token animation or private reasoning. Larger evidence in work area |
| Questions | [Agent Thread decision state](https://www.affectui.com/screens/agent-thread/full) | Compact form above composer, grouped required questions, custom answer, Later/Show. Submitted/waiting/expired states bound to question version |
| Approval | [Agent Permissions](https://www.affectui.com/screens/agent-permissions/full), [permission request](https://www.affectui.com/components/permission-request) | Small review notice for web concept; explicit native impact/document scope on Build approval. No unnecessary Revit connection for web acceptance |
| Activity | [Agent Tasks](https://www.affectui.com/screens/agent-tasks), [Agent Chat](https://www.affectui.com/screens/agent-chat/full) | Actual checklist first; current job; compact context graph with estimate/unknown; total tokens separate; expanded tools/agents. Tasks reference remains earlier catalog evidence, not newly tested |
| Design | [Agent Chat shell](https://www.affectui.com/screens/agent-chat/full) + existing DATUMM drafting contract | Drawing only, stable view/selection, revision badge, dark Working and white Sheet, small properties drawer |
| Assets / Exports | [Files](https://www.affectui.com/screens/files) + existing preview components | Collection → preview → exact-revision download. Keep drawing mounted. Explicit unsupported/failed/stale file states |

Only the Thread disclosure/Decision/Later transitions were freshly toggled during this audit; other links retain their previous inventory evidence. Public Pro previews do not authorize copying gated code. Reuse existing licensed controls; custom code should be limited to process projection, registry adapters and domain-specific geometry/usage surfaces.

## Product boundaries needing a decision

Keep suggestions only in the empty-input placeholder, no chips. Keep compact project-centered organization. Preserve agent-mediated geometry changes for the first migration; editable room properties/wall dragging are additional product scope. Do not equate a provisional clear-area target with a measured Revit area. Native BOQ, RVT upload/conversion, desktop parity, paid billing and admin expansion remain outside this audit's initial migration. The latest request asks for architectural research on these features, not permission to implement them.

## Non-gaps worth avoiding

Questions, approvals, tool cards, Streamdown, project briefs, usage views and artifact history are not wholly missing. Replacing them wholesale would discard tested behavior. AG-UI is useful for interoperability and coherent event semantics; it is redundant as a substitute for existing Markdown rendering, authentication, storage, native permissions or geometry validation. Adding a graph library before the backend exposes reliable edges would create decoration rather than observability.
