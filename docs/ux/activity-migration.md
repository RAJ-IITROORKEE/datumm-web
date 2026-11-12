# affectUI activity migration

12 November 2026 · baseline `d7a8da9` · branch `codex/ui-ux-foundation-2026-11-12`.

## Scope and source contract

The user requested the next approved affectUI migration with Sol 6.1 High workers and Codex browser testing. This slice implements D2 / W-D / I4: a compact conversation-turn summary, recorded tool details, and a consistent full Activity inspector. The approved Inter/neutral theme in DESIGN.md remains authoritative. No transport, scheduler, native execution, approval or service contract is added.

Task lifecycle comes from the selected task. Event/tool/participant records describe only the work actually recorded. Planned scheduler rows are not proof that workers ran. Tool completion is not measured Revit verification. Unknown or unfinished tool records must not become success when streaming ends. Private model text stays out of the activity interface; public updates and source-backed tool records remain inspectable.

Both the contextual Inspector and the main Activity destination use the same panel. Their selected task and turn must stay attached to events, manifest and usage; changing the selected task resets local filtering/disclosures. The task/turn projection helpers and service commands remain unchanged. Activity navigation and diagnostics never approve a model change.

## Reference ledger

Public previews were inspected in the Codex in-app browser, dark/Clean variant, on 12 November 2026. Pro source was neither requested nor downloaded.

| Reference | Evidence and adaptation |
| --- | --- |
| [Thinking state](https://www.affectui.com/components/thinking-state) | Observed flat status/duration header and progressive detail. Space collapsed it with visible focus; Enter reopened it. Use a compact expandable public activity summary; derive duration only from supplied records. Source expansion was attempted but its resulting list was not reliably qualified. No invented sources or private thinking. |
| [Tool call card](https://www.affectui.com/components/tool-call-card) | Inspected group summary, per-call name/status/supplied duration, Arguments and Result sections and large-output disclosure. Group keyboard action was attempted, but autoplay changed the preview during a nested action; stable nested keyboard persistence is not claimed for the reference. Implement local semantic disclosures, no backend-less retry or replay action. |
| [Run inspector](https://www.affectui.com/blocks/run-inspector) | Observed title, labelled metrics, recorded hierarchy and call rows. Clicking a supplied call visibly opened its inline evidence. The demo then progressed automatically; a later failure-row keyboard action no longer matched. DATUMM uses the actual event/manifest data available, without adopting the sample five-agent fleet, costs, tokens or timeline bars. |
| [Agent activity](https://www.affectui.com/screens/agent-activity) | Inspected loaded-record filters/search and step detail presentation. Switching its public preview to Empty state visibly showed an explanation and empty detail panel. Adapt local search/empty treatment only; DATUMM does not adopt sample approval categories, permissions or Undo without corresponding service authority. |
| [Chat progress](https://www.affectui.com/screens/agent-chat-progress), [progress tracker](https://www.affectui.com/components/progress-tracker), [agent lanes](https://www.affectui.com/components/agent-lanes), [handoff](https://www.affectui.com/components/agent-handoff) | Existing approved map remains preview/catalog evidence. No new fleet, percent tracker or handoff protocol is introduced. The progress tracker is presented as a checklist in the catalog, not authoritative execution progress. |

## Ownership

| Owner | Files and boundary |
| --- | --- |
| Sol 6.1 High compact worker | `workspace/turn-process.tsx`, scoped CSS, focused component tests. Existing exports/props and projection helpers preserved. |
| Sol 6.1 High evidence worker | `agent-activity.tsx`, scoped CSS, focused component tests. Existing shared projection helper exports preserved. |
| Sol 6.1 High inspector worker | New `workspace/activity-panel.tsx`, scoped CSS, focused tests. Parent mounts it; no shared file edits. |
| Parent integrator | `workspace.tsx`, `workspace/inspector.tsx`, dev-only fixture, documentation and browser qualification. |

## Acceptance ledger

Implemented on the existing UI/UX branch. The real conversation mounts use task + turn keys, so same-turn updates retain expansion while selecting another task resets it. Flat event tools and supplied manifest/evidence are presented as records; explicit task lifecycle wins stale active/waiting flags. Unfinished records stay unconfirmed. Full Activity filtering applies only to loaded latest-turn events, never to server history as a whole. Explicit foreign-task events and manifests are rejected; mismatched runtime evidence is unavailable rather than displayed under another task.

The existing batching/turn/latest-task helpers, task projection, transport, command paths and native authority are unchanged. The shared panel is mounted in both `workspace.tsx` and `workspace/inspector.tsx`. Its diagnostics lazily mount desktop traces only after their own disclosure opens. The new preview under `/dev/ux` mounts the actual components with clearly labelled synthetic data, supplies no real desktop bridge and performs no task, account, admin or Revit action. Production still returns 404 for that route.

Independent [source review](activity-review.md) found two issues: task-switch disclosure retention in the real conversation mount and stale waiting flags overriding paused/blocked lifecycle. Both were fixed and covered. Its 33 targeted checks include actual ConversationPanel output/React keys, not only source-text assertions.

Final validation: **157 tests passed**, **TypeScript passed**, **production build passed**, and **all 13 production runtime checks passed** in the locally built unconfigured environment. The temporary production server was stopped. Seven scoped source/CSS detector targets returned no findings; that regex-only result does not qualify contrast or assistive-technology behavior. DESIGN.md and its sidecar now document the activity vocabulary without replacing the theme.

## Codex browser acceptance

- Default desktop: collapsed chat summary, keyboard Space/Enter expansion and persistence after a public update; task switch clears the inspector's search/disclosures and resets chat expansion. The current task identity stays visible.
- Search/type filters: no-match and clear, exact one-event type match, and a search for the fixture's private model-step text returns no matches. Both public and diagnostic event presentations show only the step number.
- Evidence: keyboard opens diagnostics, runtime group and individual tool results; recorded `0`, `false` and Unicode text remain exact. Completed calls, stopped calls, failed calls and unconfirmed outcomes have distinct labels. Queue and approval-wait states retain their task meaning; no native approval is available here.
- Source isolation: the wrong-task fixture displays zero foreign events and an explicit unavailable runtime explanation. Foreign tool data is not shown.
- Responsive: 390px chat/inspector navigation and 320px filtering/evidence; the document stayed at viewport width, the 320px tool region fit its 246px content width and search inputs measured 16px. Focus rings and keyboard disclosures remained visible. Temporary viewport overrides were reset.
- Actual local workspace: Activity opened without starting a task, empty state and run filters worked at 390/320px, and no page-wide overflow or local console error was observed. The local service is unconfigured, so this is empty-workspace navigation evidence, not authenticated history or hosted streaming qualification.

Ignored captures: `artifacts/ux/activity-desktop.jpg`, `activity-evidence-320.jpg`, `activity-empty-workspace-mobile.jpg`. The desktop/evidence previews are synthetic; the empty-workspace capture is the actual local app. The local tab is left on the activity preview; live DATUMM and the reference tabs are preserved.

Still unverified: connected streaming/replay and real multi-participant histories, screen-reader announcements, real desktop trace service/export and Revit execution. Those remain release qualification. There was no push, merge, deployment or native approval.
