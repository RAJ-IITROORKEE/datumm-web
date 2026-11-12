# Acceptance audit — 12 November 2026

Scoped source review of workspace failure feedback, report refresh and nested
Escape handling. The coordinating task owns browser verification and fixes.
No application code, tests, service state or native operation was changed by
this reviewer. Existing resolved findings in implementation-review.md and
integration-review.md were not reopened.

## Findings

| Finding | Reproduction and impact | Disposition |
| --- | --- | --- |
| **P2 — Service bootstrap fails silently.** `src/components/workspace/use-workspace-state.ts`, `refresh`; `src/components/workspace/composer.tsx`, runtime notices and Send gate. | Fail the initial config, device or history request. The combined load caught the error, set disconnected and marked the workspace ready. A typed prompt had a disabled Send button; neither an error nor a direct retry explained recovery. The footer changed only an unlabelled status dot. | **Corrected in source.** A separate service error now drives an alert and Retry connection action with pending feedback; successful full loading clears it. This reviewer inspected the correction. Actual main-workspace recovery remains the coordinator's browser check. |
| **P2 — Same-task report updates discard review position.** `src/components/workspace/review-report.tsx:48`, `:105`, `:118`, `:135`. | Open Elements, scroll and expand Source details, then receive a newer version of the same task. The task/version key remounted the report, resetting the tab to BOQ, losing position and focusing the heading. Loading-to-ready replaced another frame and focused again. An update could also take focus from a draft in chat. | **Corrected in source.** The task-only key retains the same report snapshot and view through task updates. Loading/ready share one frame, avoiding a second entry-focus effect. Switching task still aborts/remounts the loader. Reopening reloads saved evidence; this is deliberately not a live-model refresh. This reviewer inspected the correction; browser lifecycle evidence belongs to the coordinator. |
| **P2 candidate — Escape may dismiss two layers.** `src/components/workspace/use-workspace-state.ts`, `closeDrawer`; `src/components/plan-canvas.tsx:88`, `:203`. | With an inspector open, open drawing Display settings and press Escape. The global drawer handler exempted only dialogs carrying Radix's `data-state="open"`; the custom Display dialog lacks that attribute. Both document handlers could dismiss their layer and compete over focus. | **Defensive correction inspected.** The drawer now skips visible dialogs consistently and Display respects an already-consumed Escape. Original failure was source-derived; no browser reproduction by this reviewer. Do not count it as a witnessed keyboard failure. |
| **P2 — A late draft confirmation can overwrite a newer same-account draft.** `src/lib/prompt-drafts.mjs`, `persist`/`confirm`; hook queue/reply confirmation ownership. | Open store A1 and submit a task draft; recreate that account's store A2 after returning to the account, then edit the same task. A late A1 confirmation wrote its stale full snapshot, deleting A2's newer persisted edit. The live text remained, but reload lost it. | **Corrected and independently verified.** Current disk data is merged per source, revisions distinguish identical newer edits, and pending/queue/reply requests retain their submitted revision. The original two-store reproduction now retains the exact newer text after reload. The hook mirrors retained store text instead of blindly clearing the composer. |
| **P2 — Confirmation followed by move can relocate another owner's new-chat draft.** `src/lib/prompt-drafts.mjs`, `confirm`/`move`; `src/components/workspace/use-workspace-state.ts`, `data-run` handling. | In two same-account stores/tabs: A1 submits `new`; A2 edits `new`; A1 confirms its captured old revision, then calls `move('new', taskId)`, matching the hook's admission sequence. Confirmation imported A2's newer row into A1; move then treated it as transferable and removed it from `new`. | **Corrected and independently verified.** Moves require a locally authored revision; synchronization alone cannot grant transfer ownership. The exact combined reproduction now preserves the second owner's original new-chat source and leaves the admitted task empty. All 14 draft tests pass, including distinct/identical remote edits and a local identical re-edit that should transfer. |

## Evidence and limits

- Read PROJECT.md, PLAN/DESIGN direction, repository guidance and the previous
  implementation/integration reviews. Used Impeccable audit/harden guidance as
  a scoped review; no additional agents or browser session were started.
- The scoped static detector returned `[]` for workspace, model picker and
  Settings source. That scan does not establish contrast, focus order,
  responsive rendering or service readiness. A full numerical accessibility
  or performance score would exceed this evidence.
- Task/account output isolation, obsolete-request aborts, bounded report
  parsing, partial/source labels, retained CSV rows and existing exact native
  approval semantics remain positive source findings. No new approval path
  was found in output/report navigation.
- Model/reasoning controls use existing native/radix inputs. Draft/context
  switching, long outputs, partial data and responsive Activity/report layouts
  still need the coordinator's actual interaction results; source or synthetic
  screenshots alone do not qualify deployed account/service behavior.
- Live Google/Clerk persistence, measured/verified reports, connector approval,
  account switching and Revit execution remain acceptance dependencies already
  recorded in HANDOFF.md. This audit does not turn them into confirmed bugs or
  completed backend features.

## Next acceptance checks

1. Verify initial failure, visible retry, successful recovery and retained draft
   on the actual main workspace. Separate missing configuration, expired access
   and temporary service failure in the evidence.
2. Verify a same-task report update while Elements is selected and chat has
   keyboard focus; then switch task and ensure old data cannot appear. Confirm
   first-open focus and close-to-trigger restoration still work.
3. Exercise one Escape per layer for Display, inspector, drawing focus, model
   menus and answer outputs, including a narrow viewport.

After these targeted corrections, finish the existing browser acceptance and
polish pass. Merge/release remains the user's later decision.

## Coordinated browser evidence

The coordinating task reported the following actual browser interactions; this
reviewer did not repeat them. All examples below used clearly labelled
development fixtures except the main workspace/service-failure, mobile
navigation and Billing checks.

- Actual unconfigured workspace: service-error banner and Retry connection are
  visible; retry preserves the exact typed prompt at desktop, 390px and 320px.
  At 320px the document width remains 320px. Successful live-service recovery
  remains unverified.
- Report lifecycle fixture: Elements, expanded Source details and keyboard
  focus survive a same-task version update. Request count stays at two initial
  Strict Mode GETs. A mocked 404 offers actionable Retry. The large BOQ renders
  201 table rows including its header; downloaded CSV retains all 1,200 data
  rows and the last item.
- Output fixture: streaming table CSV changes from disabled to enabled on
  completion with identical answer text. Malformed-diagram Retry stays
  readable.
- Onboarding fixture: blank submission focuses the stable name field and linked
  descriptions; Unicode/RTL names survive a mocked save failure, retry advances,
  zero interests focuses the group and optional Skip reaches the workspace.
  Phone inputs/selects compute to 16px and no horizontal overflow was observed.
- Mobile Settings, Billing and Activity navigation work. Pro Plan details expand
  with Space and the planned paid action remains disabled.
- Drawing fixture: Display Escape closes Display and restores focus; while
  Focus drawing is active it preserves Focus drawing. The full real
  inspector-plus-Display nesting remains source-only evidence.

These checks qualify local interaction behavior; they do not establish live
Clerk persistence, real report freshness, connector approval or native model
execution.

## Draft correction review

This reviewer inspected the final store, declarations, tests and hook ownership
wiring; reran `node --test tests/prompt-drafts.test.mjs` (**14 passed**); and
reran both original module reproductions successfully. The reviewed changes
preserve original account/source ownership and submitted revisions across
admission, queue and clarification requests. No remaining material finding was
identified in this focused correction review. Real multi-account browser
switching and live admitted requests remain untested by this reviewer; module
tests are not a claim of end-to-end Clerk/service verification.
