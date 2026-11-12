# DATUMM UI/UX plan

Updated: 12 November 2026. Status: user approved the plan and authorized implementation; development and local verification in progress. Merge/release remain separate.
Branch: `codex/ui-ux-foundation-2026-11-12`. Read [PROJECT.md](PROJECT.md) for baseline and boundaries.

## Confirmed decisions

| ID | User decision | Consequence |
| --- | --- | --- |
| D1 | Stable chat, larger right canvas, explicit Focus drawing | Keep navigation/chat/drawing positions stable; restore the previous layout after focus mode. |
| D2 | Compact agent summary, expandable details | Research/web/RAG/planner/executor details are secondary; only show agents that actually ran. |
| D3 | Review and annotate first; agent makes edits | Selection, pan/zoom/orbit, measurement and pinned annotations; no direct wall/room resizing in this release. |
| D4 | Explicit Ask / Plan / Build, one composer | Attach selected rooms/views as context chips; replace the competing floating drawing prompt with an action that targets the shared composer. |
| D5 | affectUI is the initial visual foundation | Match its public theme colors and typography initially; later brand changes are separate decisions. |
| D6 | Structured reports, tables with CSV export, Mermaid diagrams, larger previews beside chat | Improve the existing Streamdown renderer; preserve drawing as a separate right-workspace view. |
| D7 | Review sheets; agent updates them; no formulas needed | Schedules and BOQs support design and Revit export work. No direct spreadsheet cell editing or formula engine in this release. |
| D8 | Google sign-in first → name/domain → multiple use cases → optional Revit connector → workspace | Connector step has Skip for now. See [onboarding specification](docs/ux/onboarding.md); option taxonomy remains proposed. |
| D9 | Non-native sheet/BOQ revisions become current automatically, with change summary and history | Keep prior revisions accessible; native Revit changes still require explicit approval. |
| D10 | Individual accounts first | Defer organization invitations/team roles; preserve existing restricted administrator functions. |
| D11 | Subscription-based usage billing later; free tier now | Show Free tier. No paid checkout, invented prices or unlimited-use promises; provider and quotas remain undefined. |
| D12 | Pro $20/month and Max $99/month; individual plans, teams later | Use affectUI pricing-plans layout. Pro targets regular professional work with higher usage; Max targets heavier usage and planned priority processing. Paid plans remain upcoming until billing is connected; exact quotas are undefined. |

Product framing from the user: **a Cursor for Revit**. The web workspace supports architectural reasoning and review; native modifications still require exact approval and verified execution.

## Workspace direction

```text
Project / chat navigation | Stable chat                  | Larger work area
                         | Answers + compact activity   | Drawing: 2D / 3D
                         | Review/approval cards        | Open report / schedule / diagram
                         | Ask / Plan / Build composer  | Contextual properties / annotations
```

The three primary positions are agreed. The following detailed behavior is proposed for the next review:

- Resizable navigation and chat; drawing receives remaining width. Choose exact minimum widths after testing actual content, not arbitrary ratios.
- Project/document/level/version context near the work-area title. Selection opens contextual properties without permanently consuming drawing height.
- Drawing tools stay in one compact toolbar. Focus drawing temporarily expands the work area; returning restores chat draft, selection, camera and pane widths.
- Opening a large artifact selects a named work-area tab without discarding the drawing. Closing it returns to the drawing; chat retains the artifact card.
- On narrow screens show one primary pane at a time with clear Chat / Drawing / Outputs navigation; breakpoint and phone scope remain undecided.

This direction adapts Revit's stable project browser, properties and view controls to an agent-led workflow. It does not recreate the full Revit ribbon in a browser. See [current evidence](docs/ux/current-state.md).

## Component reference map

Evidence levels: **I** = specific interaction tested; **P** = preview/docs inspected; **C** = catalog link found, detailed behavior still to inspect. An approved direction does not approve every control inside the reference demo. Public Pro previews are design references; no gated source is required.

| Work package | Exact references | Evidence | DATUMM decision / next investigation |
| --- | --- | --- | --- |
| Shell | [Flat shell](https://www.affectui.com/screens/app-shell-flat) | P | D1; map resize, focus, persistence, narrow-screen recovery. |
| Answer layout | [AI answer](https://www.affectui.com/components/ai-answer), [message actions](https://www.affectui.com/components/message-actions), [cited answer](https://www.affectui.com/components/cited-answer) | P / C / C | Streamdown content inside affectUI visual hierarchy; citation/feedback details proposed. |
| Composer | [Chat composer](https://www.affectui.com/components/chat-composer) | I | D4; explicit modes, context chips, real attachment capabilities, draft preservation. |
| Model controls | [Model picker](https://www.affectui.com/components/model-picker) | I | Proposed; real backend model catalog/capabilities only. Never copy demo prices or model names. |
| Activity | [Thinking state](https://www.affectui.com/components/thinking-state), [progress tracker](https://www.affectui.com/components/progress-tracker), [tool call](https://www.affectui.com/components/tool-call-card) | P / C / C | D2; user-facing progress/tool summaries, not private reasoning. |
| Expanded run | [Chat progress](https://www.affectui.com/screens/agent-chat-progress), [run inspector](https://www.affectui.com/blocks/run-inspector), [agent lanes](https://www.affectui.com/components/agent-lanes), [handoff](https://www.affectui.com/components/agent-handoff) | P / P / C / C | D2; inspector presentation proposed, dependent on real event/span data. |
| Review decisions | [Approval card](https://www.affectui.com/components/approval-card), [change summary](https://www.affectui.com/components/change-summary), [review center](https://www.affectui.com/components/review-center) | C | Preserve existing acceptance semantics; design exact before/after approval later. |
| Annotation discussion | [Comments panel](https://www.affectui.com/components/comments-panel), [comment thread](https://www.affectui.com/components/comment-thread) | C | D3 pins/context; multi-user discussion is future scope. |
| Output collection | [Files screen](https://www.affectui.com/screens/files), [data table](https://www.affectui.com/components/data-table), [filter menu](https://www.affectui.com/components/filter-menu) | C | D6–D7; filtering/search/version compare are proposals to refine. |
| Markdown outputs | [GFM tables](https://streamdown.ai/docs/gfm), [interactivity](https://streamdown.ai/docs/interactivity), [Mermaid](https://streamdown.ai/docs/plugins/mermaid), [custom components](https://streamdown.ai/docs/components), [playground](https://streamdown.ai/playground) | P + I in playground | D6–D7; see [output contract](docs/ux/structured-output.md). |
| First-run journey | [Onboarding](https://www.affectui.com/screens/onboarding), [stepper form](https://www.affectui.com/components/stepper-form), [setup guide](https://www.affectui.com/components/setup-guide), [assistant home](https://www.affectui.com/screens/assistant-home) | C | D8 step order approved; option taxonomy, detailed behavior and auth/connector contracts to verify. |
| Settings | [Preferences](https://www.affectui.com/screens/settings-preferences), [profile](https://www.affectui.com/screens/settings-profile), [models](https://www.affectui.com/screens/settings-models), [security](https://www.affectui.com/screens/settings-security) | P / C / C / C | Separate personal preferences from workspace/admin permissions. |
| Members | [Members](https://www.affectui.com/screens/settings-members) | C | Deferred by D10; initial release focuses on individual accounts and existing admin gates. |
| Billing and usage | [Subscription](https://www.affectui.com/screens/settings-subscription), [usage](https://www.affectui.com/screens/agent-usage), [usage meter](https://www.affectui.com/components/usage-meter), [pricing plans](https://www.affectui.com/blocks/pricing-plans) | C | Requested coverage; billing provider, quotas and authoritative metering unresolved. |
| Admin | [General settings](https://www.affectui.com/screens/settings-general), [integrations](https://www.affectui.com/screens/integrations), [permissions](https://www.affectui.com/screens/agent-permissions), [activity](https://www.affectui.com/screens/agent-activity) | C | Adapt to actual DATUMM admin functions. Stored MCP configuration must not imply active tools. |

## Proposed delivery phases

1. **Discovery and decisions (current):** preserve D1–D10, inspect remaining selected references, refine onboarding and account scope with the user. Keep evidence distinct from recommendation.
2. **Visual and interaction specification:** verify affectUI tokens, spacing, weights, focus, scroll and responsive behavior; create agreed DESIGN.md and wireframes. User's Revit screenshot is still pending.
3. **Capability contracts:** verify AWS OpenCode API/events, reconnect/cancel semantics, artifact schemas, native authority, model catalog, roles and metering. Mark every control existing / backend addition / future.
4. **Shell and chat slice:** layout, navigation, shared composer, answer rendering and compact activity. Preserve saved conversations and existing acceptance/approval flows.
5. **Drawing and output slice:** review tools, annotations, focused drawing, report/schedule/diagram previews and agent-updated versions.
6. **Onboarding, settings and administration slices:** agree scope and integrate actual account, usage and billing contracts before presenting working controls.
7. **Release verification:** regression checks, accessibility, responsive behavior, large-output performance, disconnected recovery and native approval correctness; user decides merge/release at the end.

The user explicitly approved the plan and application implementation after this draft was written. Implement the approved experience using verified existing capabilities; do not fabricate unavailable service contracts. Deployment and merge remain later decisions.

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

## Future parallel implementation handoff

The user's latest instruction selects **GPT-6.1 Sol, high reasoning** for parallel sub-agents, replacing the earlier Terra preference. Three planning agents were dispatched for workspace, integration/output contracts and onboarding/account packets. Application implementation still awaits plan approval. Assign non-overlapping files; one owner integrates shared files.

Every packet must contain:

1. Goal and approved decision IDs; explicit exclusions.
2. Exact reference URLs from the table, evidence level, and interactions still to inspect with REA observation discipline.
3. Current source files, permitted edit ownership and dependencies; read local Next.js guides before code.
4. Input/output/event types, authoritative data source, permissions and persistence rules.
5. State matrix, keyboard/focus/scroll behavior, responsive rules and token references.
6. Acceptance examples and proportionate tests; visual before/after evidence.
7. Handoff: changed files, verified outcomes, unverified states, risks and next dependency.

Candidate packet boundaries: shell; composer/answer; activity; viewer review; structured outputs; onboarding/settings; commercial/admin. Resolve shared ownership before running in parallel. Keep the master plan compact; workers read only the relevant evidence and packet rather than the whole transcript.

### Source-backed planning packets

| Packet | Read for | Readiness |
| --- | --- | --- |
| [Workspace W-A–W-E](docs/ux/packets/workspace.md) | Shell, Focus drawing, composer/context, activity, viewer/annotations; exact file ownership and state/acceptance matrices | Written; remaining layout interactions and browser-local annotation policy need review. |
| [Integration I1–I6](docs/ux/integration-contracts.md) | Existing proxy/export/event/native contracts, Streamdown renderer, typed outputs and D9 revision behavior | Written; deployed API fixtures and missing revision contracts need verification. |
| [Onboarding and account](docs/ux/packets/onboarding-account.md) | Google/profile/use-case/optional connector flow, account persistence, settings/admin/usage boundaries | Written; taxonomy, profile storage and live authorization flow need verification. |

Cross-packet ownership: W-D and I4 describe the **same activity workstream**, not two concurrent owners. W-A and I6 share one shell integrator. I2 owns MessageResponse; W-C owns composer presentation; conversation and workspace hook insertion points remain integrator-only. Account and integration workers request shared proxy/type changes from one integration owner. Freeze the file ledger before future parallel source edits.

The next approval-ready milestone is the agreed wireframe/interaction specification plus verified service contracts. These source-backed packets do not claim the entire reference catalog or deployed backend has been tested. Do not invent endpoints or treat existing export menu entries as evidence that every upstream format works.

## Next decisions

Acceptance/recovery slice implemented: account/task-scoped browser text drafts, revision-bound admission, visible service retry, stable saved-report review and accessible onboarding validation. Codex browser checks distinguish actual unconfigured workspace behavior from labelled synthetic fixtures; see [latest handoff](docs/ux/HANDOFF.md) and [acceptance audit](docs/ux/acceptance-audit.md). The next dependency is connected-environment verification, not additional reference styling or a fabricated revision/payment API.

Integration progress: `/connect` now uses the connector's actual account authorization contract, and Schedules & BOQ reads the inspected schema-1 report export. Current production and isolated OpenCode preview were verified read-only; see [backend evidence](docs/ux/backend-contract-evidence.md). D9 immutable report revisions still need a backend API. Existing report `revision` is the source model revision, not a saved BOQ revision.

Ask in small rounds before adding details to committed scope:

- Output lifecycle: define revision data and failure recovery around approved D9 automatic-current behavior.
- Onboarding: review proposed domain/use-case options and define the first workspace starter suggestions after the agreed D8 flow.
- Revit connection and supported versions/units; launch user and phone behavior.
- Individual-account billing, quotas and admin boundaries; organizations/team roles are deferred by D10.

Update [phase handoff](docs/ux/HANDOFF.md) after every planning phase. A future approval of implementation must identify the approved plan revision and unresolved exclusions.
