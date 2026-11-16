# Localhost migration verification — 13 November 2026

This pass inspected the actual configured application at `http://localhost:3001/`, using the Codex in-app browser and Terra 6.1 High source reviewers. It supplements the existing M9 results; it does not claim that every affectUI catalog screen or a production release was tested. No frontend source changed in this pass. The preceding 376-test, production build, standalone TypeScript and 13-runtime-check results remain the last technical run.

## Observed results

The completed, real one-bedroom concept task opened with its saved conversation and exact proposed 12,000 × 9,000 mm drawing. The application uses self-hosted Inter Variable, the migrated dark palette and a 248px navigation panel. Collapse produces a 52px rail; expand restores navigation. Pinned, Projects and Chats remain usable, and the old duplicate top-header status/connect/review controls are absent.

- The shared composer retained a temporary unsent draft through Plan → Ask → Plan. The test draft was cleared, Plan restored, and no message was sent.
- Design, Activity, Assets and Exports opened against the same saved task. Assets used Concept 1/2/3 and readable report names rather than raw IDs. Unloaded alternative previews were explicitly unavailable, with separate Review/select controls. No alternative was selected.
- Activity showed the recorded two-item task plan and completed state, 8,268 input / 3,818 output ledger totals and 0.5% estimated latest-request input context. The native OpenCode reading was explicitly unavailable; zero recorded runtime events were not replaced with invented events. These are the existing task's observations, not qualification of the unreleased shared-ledger correction.
- Exports bound drawing links to the exact saved plan/version/style and disclosed unavailable saved-report revision history. This pass inspected links and capability states; it did not re-download every format or establish immutable BOQ revisions.
- Close/Open work area retained the drawing. Keyboard resizing changed the splitter from 591 to 575 and back to 591. Focus drawing opened and exited without losing the saved geometry or 100% zoom.
- At 390px, Chat and Work area switched explicitly; the document width stayed 390px without horizontal overflow and the message field used 16px text. Navigation opened and its direct Close control dismissed it. With the focused collapse control's tooltip open, the first Escape dismissed that tooltip and the second dismissed the drawer, returning focus to Open workspace navigation. Source review confirmed intentional active-layer handling rather than an ignored Escape.
- The inspected tab had no captured warning/error console entries at the end of the pass.

The browser's responsive override was cleared; original desktop navigation width, splitter, Plan mode, empty composer, Design tab and selected Bathroom were restored. No profile/admin save, payment, plan acceptance, connector authorization or Revit mutation occurred.

Proof is retained in ignored `artifacts/ux/container-phase-workspace-desktop.jpg`, `container-phase-activity-desktop.jpg` and `container-phase-workspace-390.jpg`. Prior detailed onboarding/account/admin and 320px tests remain recorded in HANDOFF; those were not all repeated here. Independent bounded source review found no new concrete P1/P2 defect.

## Status and remaining gates

The implemented workspace migration is operating in the inspected localhost states. Exact parity is established only for the selected reference contracts and documented state comparisons, not the entire affectUI catalog. The full product is not release-qualified: deployed terminal cancellation/shared usage fixes, native OpenCode/Revit approval and read-back, research-source quality, D9 immutable BOQ history, billing/entitlements, live multi-account acceptance and final merge/release remain separate gates. See the current gap register and the AWS container-testing packet for backend qualification.
