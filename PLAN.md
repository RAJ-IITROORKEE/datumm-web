# DATUMM UI/UX plan

Updated 16 November 2026. This file holds the decisions, the phase table and the design reference map. Current state and the next step are in [docs/ux/HANDOFF.md](docs/ux/HANDOFF.md); rules for agents are in [AGENTS.md](AGENTS.md). Earlier narrative status is in Git history and in [the archived plan](docs/ux/history/plan-before-workspace-acceptance-2026-11-15.md); old "next step" text there does not reopen anything.

## Phases

Each phase has a packet in `docs/ux/` copied from [PACKET_TEMPLATE.md](docs/ux/PACKET_TEMPLATE.md). A phase starts after its packet is approved and ends at a checkpoint: gates run, packet result filled, handoff overwritten, this table updated, commit.

| ID | Phase | Status | Packet / evidence |
| --- | --- | --- | --- |
| P0 | Repository cleanup and safe save | Done 16 Nov | Cleanup record in the handoff; commits `1b90d9c` to `172b4f9` |
| P1 | Agent rules, design map, READMEs | Done 16 Nov | `76564d3`: AGENTS.md, CLAUDE.md, DESIGN.md |
| P2 | Plan → build tracking format | Done 16 Nov | [PACKET_TEMPLATE.md](docs/ux/PACKET_TEMPLATE.md), this table, the handoff |
| P3 | Research: Panda-agent reference and harness capability inventory | Done 16 Nov | [Research record](docs/ux/research-reference-and-harness-2026-11-16.md) |
| P4 | Revised phased plan | Approved 16 Nov | [roadmap](docs/ux/roadmap-2026-11-16.md) |
| S0 | Source verification and backend baseline (fresh branch at `188ebc0`) | Done 16 Nov | [Packet](docs/ux/s0-source-verification-and-baseline.md) |
| C1 | Capability contract and config consistency | Done 16 Nov (local, not pushed) | [Packet](docs/ux/c1-capability-contract-and-config.md) |
| N1 | Durable completion proof | Done 16 Nov (local, not pushed) | [Packet](docs/ux/n1-durable-completion-proof.md) |
| N3 | Tool, task and sub-agent lifecycle | Packet proposed, awaiting approval | [Packet](docs/ux/n3-tool-task-subagent-lifecycle.md) |
| N2 | Frontend capability awareness and reversible actions | Proposed | Roadmap |
| A1 | Admin: traces and feedback | Proposed | Roadmap |
| A2 | Admin: versioned config and audit | Proposed | Roadmap |
| N4 | Evidence-backed compositions | Proposed | Roadmap |
| Q1 | Rules pre-router and latency measurement (model router deferred) | Proposed | Roadmap |
| A3 | Admin: model registry | Proposed | Roadmap |
| W1 | Right work area on AG-UI state | Proposed; separate go or no-go | Roadmap |
| A4 | Admin: MCP and skills registry | Proposed | Roadmap |
| N5 | Provider streaming and measured performance | Proposed | Roadmap |
| G1 | Hosted gate | Blocked: AWS access unavailable | Roadmap |

## Confirmed decisions

| ID | User decision | Consequence |
| --- | --- | --- |
| D1 | Stable chat, larger right canvas, explicit Focus drawing | Keep navigation/chat/drawing positions stable; restore the previous layout after focus mode. |
| D2 | Compact agent summary, expandable details | Research/web/RAG/planner/executor details are secondary; only show agents that actually ran. |
| D3 | Review and annotate first; agent makes edits | Selection, pan/zoom/orbit, measurement and pinned annotations; no direct wall/room resizing in this release. |
| D4 | Explicit Ask / Plan / Build, one composer | Attach selected rooms/views as context chips; replace the competing floating drawing prompt with an action that targets the shared composer. |
| D5 | affectUI is the initial visual foundation | Match its public theme colors and typography initially; later brand changes are separate decisions. |
| D6 | Structured reports and tables with CSV export; larger previews beside chat; diagrams optional when requested | Improve the existing Streamdown renderer; preserve drawing as a separate right-workspace view. |
| D7 | Review sheets; agent updates them; no formulas needed | Schedules and BOQs support design and Revit export work. No direct spreadsheet cell editing or formula engine in this release. |
| D8 | Google sign-in first → name/domain → multiple use cases → optional Revit connector → workspace | Connector step has Skip for now. See [onboarding specification](docs/ux/onboarding.md); retain the implemented, validated professional-domain/use-case taxonomy. |
| D9 | Non-native sheet/BOQ revisions become current automatically, with change summary and history | Keep prior revisions accessible; native Revit changes still require explicit approval. |
| D10 | Individual accounts first | Defer organization invitations/team roles; preserve existing restricted administrator functions. |
| D11 | Subscription-based usage billing later; free tier now | Show Free tier. No paid checkout, invented prices or unlimited-use promises; provider and quotas remain undefined. |
| D12 | Pro $20/month and Max $99/month; individual plans, teams later | Use affectUI pricing-plans layout. Pro targets regular professional work with higher usage; Max targets heavier usage and planned priority processing. Paid plans remain upcoming until billing is connected; exact quotas are undefined. |
| D13 | Assistant Home for the exact starting screen/sidebar; Agent Chat for the right panel | Center the new-task home; retain the stable working chat/canvas. Right-panel sections are Design, Activity, Assets and Exports. Source/component parity is not established by earlier passing tests. |
| D14 | Use free affectUI source directly; reconstruct Pro behavior independently and compare | Record source/license/hash for free code; public interaction/visual evidence and independent code for Pro. No gated source. |
| D15 | Use Elephant–Goldfish for the complete revised migration plan | Read [accepted context](docs/egm/discussion_summary.md), [EGM draft](docs/egm/design_draft.md) and [gap register](docs/ux/full-migration-gap-register.md). Full consolidated planning/review completed; Feature Critic converged in 3 rounds and detailed readiness in 5, each with two consecutive clean rounds. See [consolidated verdict](docs/egm/consolidated_review_report.md). |
| D16 | Replace all theme colors and typography across the complete application with affectUI | Apply the new visual system to all existing screens, controls and output chrome. Retire active legacy color overrides through a recoverable appearance migration; retain accessibility and Light/Dark/System preferences. |
| D17 | Option A: Design, Activity, Assets and Exports occupy the larger right work area | Navigation and chat stay stable; Design hosts drawing only, with properties inside it; output previews belong in Assets/Exports. No permanent fourth inspector column. Use Sol 6.1 High workers for the full EGM review and implementation handoff. |
| D18 | Dark drafting canvas for everyday2D/3D, separate white Sheet/Print | Confirmed13 November product-audit answer. Implemented and scoped-browser-qualified in Phase 3; preserve exact geometry and legible white exports. |
| D19 | Generate → review → revise a concept leads the web first-use journey | Confirmed13 November. Import/model review and connected automation are secondary paths; generation and revision are qualified within the current handoff; broader native/import work remains separate. |
| D20 | Project Brief & decisions before personal memory across chats | Confirmed13 November. Units, footprint, orientation, room needs and confirmed choices need visible sources/editability; hosted persistence, editing, bounded history and cross-chat/reload behavior are qualified; explicit Use in chat is required. |
| D21 | Compact project-centered navigation | Confirmed13 November. Keep Design / Activity / Assets / Exports; add Running / Needs your input filters to the project task/chat overview and place Brief & decisions under Project context. No separate top-level Tasks/Memory screens in this direction. Preserve the approved compact structure; current implementation/evidence is indexed in the handoff. |
| D22 | AG-UI with shadcn-style affectUI components across the whole app | Confirmed 16 November. Every agent-facing surface moves to AG-UI and the affectUI component set, in phases: the middle chat first, then the right work area, settings and admin, each with its own approved plan. This lifts the earlier "chat only" narrowing; native writes, direct drafting and billing stay out of scope until separately approved. |
| D23 | Connect the UI to the existing harness first, then expand admin capability | Confirmed 16 November. First update the UI/UX so the harness's current features work well; then add admin capability to the harness. Panda-agent (`Pandabyte/Panda-agent`, local and live) is a read-only design reference; nothing there is changed. No Panda-agent orchestration idea, such as a model router, is adopted until P4 evaluates it and the user approves. |

Product framing from the user: **a Cursor for Revit**. The web workspace supports architectural reasoning and review; native modifications still require exact approval and verified execution.

## Workspace direction

```text
Project / chat navigation | Stable chat                  | Larger work area
                         | Answers + compact activity   | Drawing: 2D / 3D
                         | Review/approval cards        | Assets / Exports: report / schedule
                         | Ask / Plan / Build composer  | Contextual properties / annotations
```

The three positions and Option A are selected. The current detailed contract is in [the EGM implementation plan](docs/egm/design_draft.md#detailed-implementation-plan):

- Navigation defaults to 224 px with a separate collapse/open control; chat and work area share an accessible resizable separator. Version-2 width migration, bounds and effective clamping are specified in the EGM plan.
- Project/document/level/version context near the work-area title. Selection opens contextual properties without permanently consuming drawing height.
- Drawing tools stay in one compact toolbar. Focus drawing temporarily expands the work area; returning restores chat draft, selection, camera and pane widths.
- Opening an artifact selects its Assets/Exports preview without discarding the mounted drawing. Closing the preview returns to its collection; Design remains drawing-only.
- On narrow screens show Chat / Work area, with an accessible navigation drawer and contained Design / Activity / Assets / Exports sections. Checkpoints and focus behavior are specified in the EGM plan.

This direction adapts Revit's stable project browser, properties and view controls to an agent-led workflow. It does not recreate the full Revit ribbon in a browser. See [current evidence](docs/ux/current-state.md).

## Component reference map

Evidence levels: **I** = specific interaction tested; **P** = preview/docs inspected; **C** = catalog link found, detailed behavior still to inspect. An approved direction does not approve every control inside the reference demo. Public Pro previews are design references; no gated source is required.

| Work package | Exact references | Evidence | DATUMM decision / next investigation |
| --- | --- | --- | --- |
| Drawing deliverables and native intent | [Agent / Permissions](https://www.affectui.com/screens/agent-permissions/full), [permission request](https://www.affectui.com/components/permission-request), [Files](https://www.affectui.com/screens/files) | I for public permission menu; other links retain earlier inventory evidence | Identified browser PNG/PDF sheets and captures; optional concept access follows saved and current Build intent, while existing selected-device grants remain revocable in an open task. See [qualified packet](docs/ux/deliverable-review-clarity.md) for actual Revit read, export, narrow-layout and controlled-test limits. No copied autonomy presets or new permission authority. |
| Shell | [Agent Chat / Agents](https://www.affectui.com/screens/agent-chat), [full preview](https://www.affectui.com/screens/agent-chat/full), [earlier double sidebar](https://www.affectui.com/screens/agent-chat-rail), [full preview](https://www.affectui.com/screens/agent-chat-rail/full), [Assistant Home](https://www.affectui.com/screens/assistant-home/full), [flat shell](https://www.affectui.com/screens/app-shell-flat) | I / I / I / P | Latest author clarification: replace the LEFT double-sidebar with the Agent Chat single-sidebar structure,224px default expanded/52px collapsed; preserve the right work-area structure, task/drawing and recognizable collapse/open controls. |
| Answer layout | [AI answer](https://www.affectui.com/components/ai-answer), [message actions](https://www.affectui.com/components/message-actions), [cited answer](https://www.affectui.com/components/cited-answer) | P / C / C | Streamdown content inside affectUI visual hierarchy; literal list preview, full answer and copy passed in the [conversation result packet](docs/ux/conversation-result-polish.md). Citation/feedback details proposed. |
| Minimal Revit conversation and questions | [Agent / Thread](https://www.affectui.com/screens/agent-thread), [full preview](https://www.affectui.com/screens/agent-thread/full), [thinking state](https://www.affectui.com/components/thinking-state), [tool call](https://www.affectui.com/components/tool-call-card) | I for reference Thread disclosure and Later/Show; other states retain prior inventory | Compact public process and2–3-sentence result; rich Revit details in the right work area. Retain DATUMM shell/controls. Concise Streamdown answers, grouped questions and Later/Show are implemented; this acceptance pass refines recorded process hierarchy and checks combined recovery. [M6 packet](docs/ux/minimal-revit-chat.md) and [current audit](docs/ux/product-audit-2026-11-13.md) distinguish partial implementation from parity and deployed service behavior. Historical connection outcomes now retain originating-turn authority as recorded in the [conversation result packet](docs/ux/conversation-result-polish.md). The reported explicit footprint wording now passes fresh generate and revise without a repeat question; see [footprint recovery](docs/ux/footprint-question-recovery.md) for bounded coverage. [Alternative-count recovery](docs/ux/alternative-count-recovery.md) qualified two alternatives through generation and revision, and clarification of a four-alternative request followed by one result; bounded search can produce fewer than requested. |
| Task and Needs-you overview | [Agent / Tasks](https://www.affectui.com/screens/agent-tasks), [Inbox](https://www.affectui.com/screens/inbox) | P for Tasks preview; Inbox catalog/docs; I for Thread Later/Show | D21 keeps Running / Needs your input filters in the project task/chat overview, with task-scoped checklists and grouped Later/Show questions. Separate top-level Tasks/Inbox screens are outside the selected compact structure; broad demo workflow parity is not claimed. |
| Project Brief & decisions | [Agent / Memory](https://www.affectui.com/screens/agent-memory), [memory panel](https://www.affectui.com/components/memory-panel) | P for Memory screen; C for panel | D20/D21: hosted project records are editable and durable across chats, with bounded history, chat-level sources and explicit Use in chat. No implicit agent ingestion or native authority; desktop parity and exact-turn provenance remain separate. See [Project Brief persistence](docs/ux/project-brief-persistence.md). |
| Agent inspection and permission scope | [Agent / Orchestration](https://www.affectui.com/screens/agent-orchestration), [Agent / Permissions](https://www.affectui.com/screens/agent-permissions), [permission request](https://www.affectui.com/components/permission-request) | P / P / C | Public previews inspected13 November. Surface actual participants/findings and plain-language scope, preserving exact native approval. No simulated fleet, copied Hands-off grant or uncontracted rule editor. |
| Composer | [Chat composer](https://www.affectui.com/components/chat-composer), [agent chat](https://www.affectui.com/screens/agent-chat/full) | I | D4; explicit modes, context chips, real attachment capabilities, draft preservation. Latest user correction: contextual suggestions only as the empty textarea placeholder, no prompt-chip row or transcript next-step section. See [current refinement](docs/ux/chat-workarea-refinement.md). |
| Model controls | [Model picker](https://www.affectui.com/components/model-picker) | I | Proposed; real backend model catalog/capabilities only. Never copy demo prices or model names. |
| Activity | [Thinking state](https://www.affectui.com/components/thinking-state), [progress tracker](https://www.affectui.com/components/progress-tracker), [tool call](https://www.affectui.com/components/tool-call-card) | I / C / P | D2: compact real tool-process disclosure and associated recorded todo checklist; latest author list reference refines visual density. Turn ownership must be explicit; no fabricated thinking, status or timing. Tool preview autoplay limits detailed reference qualification. See [activity packet](docs/ux/activity-migration.md). |
| Expanded run | [Chat progress](https://www.affectui.com/screens/agent-chat-progress), [run inspector](https://www.affectui.com/blocks/run-inspector), [agent lanes](https://www.affectui.com/components/agent-lanes), [handoff](https://www.affectui.com/components/agent-handoff) | P / I / C / C | D2 shared Activity inspector migrated using existing events/manifest. Public run-inspector inline call disclosure tested; no invented agent fleet or span metrics. |
| Review decisions | [Approval card](https://www.affectui.com/components/approval-card), [change summary](https://www.affectui.com/components/change-summary), [review center](https://www.affectui.com/components/review-center) | I / P / P | Migrated current task/plan/native review and comparison; preserve exact approval and measured evidence. See [migration packet](docs/ux/review-panels-migration.md). Reference queue autoplay is not qualified DATUMM behavior. |
| Annotation discussion | [Comments panel](https://www.affectui.com/components/comments-panel), [comment thread](https://www.affectui.com/components/comment-thread) | C | D3 pins/context; multi-user discussion is future scope. |
| Reports, schedules and output collection | [Files screen](https://www.affectui.com/screens/files), [data table](https://www.affectui.com/components/data-table), [filter menu](https://www.affectui.com/components/filter-menu) | C for references; actual DATUMM report history tested | D6–D9: proposed concept room schedules now retain immutable, automatically current revisions with historical source identity and revision-bound exports. Native BOQ, other report types and legacy backfill remain separate; filtering/search and version comparison remain proposals. See [report revision history](docs/ux/report-revision-history.md). |
| Markdown outputs | [GFM tables](https://streamdown.ai/docs/gfm), [interactivity](https://streamdown.ai/docs/interactivity), [Mermaid](https://streamdown.ai/docs/plugins/mermaid), [custom components](https://streamdown.ai/docs/components), [playground](https://streamdown.ai/playground) | P + I in playground | D6–D7; see [output contract](docs/ux/structured-output.md). Latest clarification: Revit drawings/schedules are primary; diagrams remain optional and must not become a default answer format. Narrow table scrolling, full-screen focus and CSV retention passed in the [conversation result packet](docs/ux/conversation-result-polish.md). |
| First-run journey | [Onboarding](https://www.affectui.com/screens/onboarding), [stepper form](https://www.affectui.com/components/stepper-form), [setup guide](https://www.affectui.com/components/setup-guide), [assistant home](https://www.affectui.com/screens/assistant-home) | C | D8 step order approved; option taxonomy, detailed behavior and auth/connector contracts to verify. |
| Settings | [Preferences](https://www.affectui.com/screens/settings-preferences), [profile](https://www.affectui.com/screens/settings-profile), [models](https://www.affectui.com/screens/settings-models), [security](https://www.affectui.com/screens/settings-security) | P / C / C / C | Separate personal preferences from workspace/admin permissions. |
| Members | [Members](https://www.affectui.com/screens/settings-members) | C | Deferred by D10; initial release focuses on individual accounts and existing admin gates. |
| Billing and usage | [Subscription](https://www.affectui.com/screens/settings-subscription), [usage](https://www.affectui.com/screens/agent-usage), [usage meter](https://www.affectui.com/components/usage-meter), [pricing plans](https://www.affectui.com/blocks/pricing-plans) | C | [Context compaction recovery](docs/ux/context-compaction-recovery.md) separates latest estimated input and proposed reduction from cumulative provider usage, successful summaries and safe no-reduction attempts; historical failures remain historical. Billing provider, quotas and authoritative billing remain unresolved. |
| Admin | [General settings](https://www.affectui.com/screens/settings-general), [integrations](https://www.affectui.com/screens/integrations), [permissions](https://www.affectui.com/screens/agent-permissions), [activity](https://www.affectui.com/screens/agent-activity) | C | Adapt to actual DATUMM admin functions. Stored MCP configuration must not imply active tools. |


## State and validation requirements

Each approved component must specify empty, loading/streaming, ready, cancelled, failed, disconnected, stale and unavailable/permission states where applicable. Use actionable copy, preserve drafts, expose keyboard actions and return focus when dialogs close. Respect reduced motion. Do not remove essential controls to imitate a screenshot.

Particular checks for the agreed work:

- Streaming completion changes available actions even when the final text stays identical.
- Reloaded answers and outputs match their completed streaming version.
- Selecting a room attaches the correct project, plan version and element identity; stale context is visible.
- Agent updates create traceable output revisions; an old schedule never silently adopts a new model's identity.
- BOQ data from Revit is distinguished from conceptual estimates; units and source version remain attached through export.
- Annotation persistence, camera controls and focus-mode restoration work without generating an agent run.
- Markdown cannot confer Revit approval or execute arbitrary model-generated UI/code.
- Test public shares independently; preserve existing image restrictions and artifact authorization.


## Historical evidence

The [archived plan](docs/ux/history/plan-before-workspace-acceptance-2026-11-15.md), [archived handoff](docs/ux/history/handoff-before-workspace-acceptance-2026-11-15.md) and individual packets preserve the earlier EGM phases and scoped results. Keep their failure evidence intact. Merge/release is a later user decision.
