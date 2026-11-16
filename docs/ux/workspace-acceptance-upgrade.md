# Workspace acceptance upgrade

15 November 2026. User authorized chat, right work area, responsive repairs and plan cleanup after the saved-revision qualification. Existing affectUI theme, Inter typography, single left navigation, explicit Ask/Plan/Build and four right sections remain the design foundation. Mode: Operate.

## Observed reference behavior

Codex built-in browser, public previews, signed out, dark theme, normal desktop viewport (1280 × 720 capture). These observations describe demos, not DATUMM capabilities.

| Reference | Observed interaction | Applied direction |
| --- | --- | --- |
| [Agent Thread](https://www.affectui.com/screens/agent-thread/full) | One muted tool-summary row expands to named tool results and recorded durations. Decision demo docks the grouped choice above composer; Later collapses to a waiting-count/Show row, Show restores it. Error demo expands failed tool evidence and offers a local Retry. Offline demo visibly preserves unsent content. | Quiet, useful process summary with honest lifecycle; compact named rows; retain DATUMM Later/Show, exact retries and draft protections. No demo durations, agents or autonomous permissions are copied. |
| [Agent Chat](https://www.affectui.com/screens/agent-chat/full) | Single left navigation; independently resized right brief; section tabs switch brief/activity/assets without leaving chat. Activity is a compact named event list. Assets empty state names the next available action. Close brief removes the panel and exposes Open brief. | Preserve DATUMM four sections and recognizable close/open controls, reduce diagnostic density, put current useful work first. Right resize remains an accessible separator. |
| [Files](https://www.affectui.com/screens/files/full) | Searchable named collections, file type/title/metadata hierarchy, grid/list and filters. Clicking the inspected spreadsheet template did not expose a preview in this demo. | Clear asset names/type/source and explicit supported preview actions. Do not claim the reference demonstrated document preview or add decorative nonfunctional file controls. |

The REA tool is not connected in this session; direct browser observations supply runtime evidence. Existing licensed affectUI vendor components remain available. No gated source was accessed.

## Observed DATUMM gaps

Actual saved task `964068a2-13f6-5659-a552-3f9323c2134e`, version 3, backend 188ebc0. Baseline captures: `artifacts/ux/workspace-acceptance/{activity,exports,mobile}-before.png`.

- Chat has genuine per-turn expandable activity and grouped questions already. Generic settled labels and repeated inner status text deserve a quieter, more informative hierarchy; preserve honest tool/turn separation.
- Activity puts model/mode and several usage paragraphs ahead of the current checklist/process. Filters/diagnostics compete with primary review content.
- Exports starts with seven latest-task formats and six identical Preview data actions before the saved drawing/report path. Those downloads are latest evidence, not the preview's exact saved report revision. Preserve that distinction while making the existing revision-bound report workflow primary.
- Assets is functional, searchable and source-bound, but needs stronger file-type/preview hierarchy. Unsupported specialist JSON preview stays unavailable.
- At 390 px: navigation opener is 32 px, pane controls 33 px, composer controls 28 px and context controls 26 px high. At 320 px there is no document overflow and the textarea uses 16 px text; those working properties must be retained.
- A collapsed desktop navigation expands after crossing 390 → 1440 px. Breakpoint changes overwrite the prior desktop choice. Preserve desktop preference while treating the narrow drawer separately.

## Implementation and ownership

1. Chat worker: compact turn-process hierarchy and question-card polish using existing primitives; preserve state, evidence, scoped drafts and placeholder-only guidance. Own turn-process files, question-card CSS and focused chat tests; request coordination before conversation/composer shared edits.
2. Work-area worker: checklist/process-first Activity; compact secondary usage/configuration; clearer Assets; saved report/drawing actions before a collapsed latest-evidence export directory. Own activity/assets/exports files and related panel CSS/tests. Preserve preview/download identities and mounted drawing state.
3. Responsive worker: narrow touch sizing and desktop navigation continuity. Own studio-workspace.css, sidebar CSS, use-workspace-state.ts and relevant layout tests; coordinate any workspace.tsx/composer CSS edits.
4. Coordinator: browser/reference evidence, integration, canonical PLAN/PROJECT/HANDOFF and gap-register cleanup. Preserve prior evidence in linked historical snapshots, not competing current next-step instructions.

Workers use existing UI primitives and dependencies, source-bound statuses and narrow ownership. No backend/native/payment/admin expansion is planned. A concrete service defect would require separate evidence and scoped review.

## Acceptance gate

- Actual saved task: expand/collapse process; switch all four sections; open/close answer/report previews and historical report revision; check revision-bound CSV identity and drawing continuity.
- Fresh synthetic web-only prompts: clarification with Later/Show, concise answer/table and actual process; pause/recovery where safely available. Native write/approval is not a test shortcut.
- Desktop 1440 / intermediate 1135 / tablet 768 / phone 390 and 320; keyboard navigation, drawer dismissal/focus, resize bounds, no document overflow, 16 px narrow input, usable touch targets and desktop state continuity.
- Focused checks, full frontend tests, TypeScript, production build and existing runtime smoke; independent combined review. Distinguish real service journeys, controlled fixtures and unavailable fault/gesture coverage.
- Final screenshots, restored viewport, clean test drafts and an updated canonical handoff. Merge/release remain separate.

Status: the scoped implementation and combined acceptance gate passed. Broader product/native/release boundaries remain separate.

## Implemented result

Terra 6.1 High workers implemented the chat, work-area and responsive packages, with independent combined source review and coordinator browser testing. Existing affectUI surfaces, Inter, Lucide icons and installed primitives remain; no dependency or backend migration was needed.

- Chat's closed process row prioritizes actual named actions, with separate lifecycle/failure/unconfirmed status. Completed leaf rows are quieter visually and retain accessible status. Checklist recording/design/report steps use readable labels; raw records remain available in diagnostics. Question choices are clearer; Later/Show and scope/draft contracts remain unchanged.
- Activity now presents the concise turn header and recorded checklist, compact context/usage meter, then compact named event rows. Estimates, native root-session scope, partial/unavailable usage and ledger totals retain their distinct meanings. Extended usage and filters remain available through disclosures.
- Assets shows type/source and explicit Preview or Download actions. Exports leads with the saved report and drawing, followed by a closed latest-task evidence directory. Revision-bound report exports remain inside the unchanged saved-report preview; generic latest formats stay accessible and explicitly distinct.
- Desktop navigation choice and the narrow drawer have separate state, including restoration through Settings. The drawer starts closed on entry to narrow layout. Its collapse control keeps an accessible name/title without the tooltip that previously consumed the first Escape. Primary phone controls and downloads have 44 px targets. Narrow/short-screen question bodies scroll internally so the composer and context tray remain reachable.
- PLAN, PROJECT, HANDOFF and the gap register now provide a current index. Earlier ledgers are retained in linked historical snapshots with source text hashes; old next-step instructions no longer compete with the current plan. The component reference map and confirmed decisions remain in PLAN.

## Actual browser evidence

Saved task `964068a2-13f6-5659-a552-3f9323c2134e` retained exact 14,000 × 9,000 mm version 3 and one alternative. Its historical report revision 1 remained selected through Design → Exports; both downloaded CSVs had SHA-256 `e9e8d1d92882744f8739fd95fcd1a094f8506b15fb2e54ca0046efdc83a72479`. The current drawing stayed version 3. Asset search isolated Answer 3; opening/closing that preview with Escape restored focus to its opener. No review or native approval was submitted.

Fresh task `44c866fe-926a-5778-af82-f59ea95a48fa` asked grouped footprint/entrance questions. Entered 12 × 9 m/South answers survived Later → Show and reload. At 320 × 740, the repaired question form ended at 515 px, Submit was 44 px high, Send ended at 645 px and the 44 px Project context control ended at 699 px: the composer/tray remained inside the viewport. Pause during planning reached a saved checkpoint; reload retained Pause and Continue resumed to a real saved design. These are actual service observations, not fixture claims.

The fresh task generated three alternatives after the test wording “one home.” [Read-only count diagnosis](workspace-acceptance-count-finding.md) establishes retained wording but no alternativeCount fact; controlled replay distinguishes “one home” from “one concept/alternative.” This is an interpretation ambiguity, not proven count loss due to pause/resume. The initial stronger count-regression description was corrected; neither the UI nor backend result was rewritten to hide the three alternatives. This pass does not settle ambiguous dwelling-versus-output count policy.

A nonmutating follow-up requested two review sentences and a three-row Room / Review note table. Chat showed the concise summary and output openers; the full three-row table opened beside chat, exported CSV with all rows/two columns, and opened/closed fullscreen. It did not generate a new displayed plan version. The table CSV is `C:/Users/rajra/Downloads/answer-3-table-1.csv`. Browser exports were checked as files, not as a claim of native quantities.

At desktop, pointer dragging changed the chat divider from 600 to 520 px; Home reached its 320 px minimum, and End restored 600 px. Close/reopen retained the width and selected room. Focus drawing retained Bedroom 1, 125% zoom and an unsent draft when returning; the draft was cleared and Fit restored afterward. A collapsed desktop sidebar stayed collapsed across phone and desktop sizes, including opening Settings, resizing and returning. A single Escape closed the phone drawer and returned focus to its opener. Assets remained selected through Chat → Work area on narrow screens. Activity no-match/clear filters and usage disclosure were exercised. Saved drawing and latest-evidence download targets measured 44 px on phone.

The measured matrix covers 1440/1135/768/390/320 px widths without document overflow. Narrow inputs use 16 px text; primary controls measured 44 px at 768/390/320, while desktop controls stay compact. `responsive-browser.json` records measurements. Emulated captures can have tiled edges and are not visual goldens; normal 1280 × 720 final captures are `final-design.png`, `final-activity.png` and `final-exports.png`. Reference captures are recorded separately. Temporary viewport overrides/test drafts were cleared; duplicate/reference test tabs were closed after restoring the same saved workspace in the final normal-viewport tab.

## Final checks and limits

Final frontend gate: **535/535 tests**, standalone TypeScript, optimized production build and **13/13 production runtime checks** passed. Logs are in `artifacts/ux/workspace-acceptance/`. An intermediate test expected lowercase “create design”; its assertion was updated for the intentional readable action label while retaining specialist-detail and checklist-label checks. Final checks passed after that change. The temporary production server on 3100 was stopped; development 3001 remains available.

The independent [combined review](workspace-acceptance-review.md) covers source guards and focused tests; the coordinator's actual browser evidence above closes the inspected touch/focus gaps. Fresh final-page console inspection showed only the Clerk development-instance warning, with no application error. Earlier hot-refresh encoding/effect warnings were corrected and are not relabelled as final-page failures.

No backend source/deployment, native inspection/write/approval, billing activation, admin expansion, merge or release occurred. New live tests did not fault-inject providers/network, verify real touch hardware, exercise native writes or qualify every affectUI catalog state. Existing unknown/partial/native source guards remain tested by the frontend suite; full semantic answer correctness, graph freshness and backup restoration are not established by this UI pass. A final evidence download attempt timed out in browser control and reset that session; controls were reconnected and the final saved workspace was verified afterward. No second latest-run export is claimed for that attempt.
