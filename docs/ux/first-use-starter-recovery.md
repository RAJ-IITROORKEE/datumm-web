# First-use starter recovery

14 November 2026. This bounded UI refinement follows D8 and the existing starter flow. It does not add a tour, onboarding persistence, an API, or native authority. Account setup already supports Google sign-in, profile and multiple use cases, optional connector setup and Skip; the actual sign-in, saved preferences, Skip and return to the workspace were previously checked. That does not qualify native execution.

## Problem and scope

The empty welcome invited a user to start with a drawing, implying web upload where that capability is unavailable. It now names a building idea or a Revit question, both supported web entry points. The existing starter buttons remain part of the shared composer: their actions must only prepare a draft, preserve an existing draft unless the user explicitly replaces it, and never submit a task or grant native approval. Revit model review depends on an actual connected model; a general Revit question does not. No new connector or upload capability is implied.

## Reference and boundaries

The approved [Assistant Home full preview](https://www.affectui.com/screens/assistant-home/full) is the Home layout and suggestion reference; [PLAN.md's component map](../../PLAN.md) also identifies the [onboarding](https://www.affectui.com/screens/onboarding), [stepper form](https://www.affectui.com/components/stepper-form) and [setup guide](https://www.affectui.com/components/setup-guide) references for first-run work. Reference appearance does not establish DATUMM service capabilities. Use the current affectUI theme, existing composer and D8 sequence, without copying demo services. Existing draft ownership and account/task boundaries remain authoritative.

On 14 November, Codex browser inspection of the Assistant Home full preview showed a greeting above a two-layer composer, a starter row with small stroke icons and a quiet footer. Clicking “Create Table” initially left the visible page unchanged; later, a demo thread appeared with canned Q2 results and “Worked 2s.” That demo is not evidence of a real service capability. DATUMM uses its approved draft-only behavior instead. Subsequent test text remained unsent, was cleared, and the reference was closed. The current DATUMM starter set covers web Plan and Ask, plus Connections; draft protection remains required.

## Validation gate

Before calling this slice complete, check actual Home at desktop and narrow widths, keyboard focus and suggestion activation. Check an empty draft, an existing draft, cancellation and deliberate replacement; confirm suggestions do not submit or change modes unexpectedly, and that connected-model entry is honestly gated. Verify the welcome and button copy against actual capabilities and preserve the draft through navigation or dismissal as applicable. Run the relevant tests and production checks on the final combined change; record the exact results and browser observations in the current handoff. Do not use native approval or write to qualify this UI slice.

The latest completed baseline before this work was 470 frontend tests, build, TypeScript and 13 runtime checks, with backend `439feca3` qualified for supported generation → summary → revision. Those numbers are not results for the new change. Broader migration, durable project memory, D9 history, billing, native/RVT qualification and release remain separate.

## Implemented behavior and reviewed limits

Terra 6.1 High workers implemented and independently reviewed the actual shared composer. Plan a concept and Ask a Revit question prepare an editable draft; they never send it. An existing draft gets explicit Replace draft / Keep draft choices. Scope, draft, mode, references and device/capability changes invalidate pending replacement; stale callbacks cannot apply even after an A–B–A transition. Sources and design references are retained, and confirmed web starters turn current-model context off. Revit connections opens the existing connection dialog without changing the draft or granting access. The default copy distinguishes web planning from connected model context and explicit Revit approval. Small stroke icons, existing Inter/theme and quiet starter-row hierarchy follow the approved reference.

Browser testing also exposed initial focus on an offline device’s Disconnect action and a fixed-width dialog overflow. The connection heading now receives initial focus; Close/Escape restores the opener. The existing maximum width is bounded by the viewport, without changing device controls or permissions.

Native-read admission remains a separate gap: hosted `revitSessions` is a device count rather than an independently qualified active-model session, and native context is not device-bound. The new Connections action therefore does not claim a model is ready for review.

## Historical routing finding — subsequently repaired

Two general Ask prompts unexpectedly returned a connection requirement without reading or inferring model data: task `697174cc-e729-5c37-b1bb-d2bad7c596e9` for “Explain how to create and manage floor plan views in Revit.” and task `3aef45bf-920e-5594-8757-84f0f3ed24ff` for explicit general levels/grids guidance. Context was off; requests retain the existing `auto` policy. Source inspection found that the model-context classifier includes a broad “in Revit” expression. This is a backend routing gap, not evidence that general guidance needs a connector, and is not fixed by this UI slice. The final starter says “Explain the difference between Revit levels and grids. Keep it to general software guidance.” No backend was deployed. Fixing this routing generally is the next reliability follow-up; preserve genuine current-model admission and explicit native approvals.

## Final validation — 14 November 2026

- Final combined source: **475 frontend tests, optimized production build, standalone TypeScript and 13 production runtime checks passed**. Independent bounded review found no blockers and passed 18 focused first-use/composer/settings tests. Logs: `artifacts/ux/first-use-starters/`.
- Actual Codex browser, localhost3001: Keep draft and Replace draft, keyboard activation/focus, draft edits invalidating confirmation, read-only task navigation and A–B–A return passed. Suggestions only prepared a draft; a new task began only after the tester explicitly pressed Send. No sources or references were removed.
- Connection dialog: existing offline devices stayed unavailable for Use device; no Disconnect, authorization, approval or native write was performed. Heading autofocus, Escape/Close restoration and draft/mode preservation passed. At390px the dialog was358px wide with16px gutters; at320px it was288px wide with16px gutters. Its inner scroll width matched its client width. Starter/replacement controls met44px narrow-screen targets. Temporary viewport overrides were reset.
- Actual final Ask task `0873fb2e-4f44-5705-9a79-52418e292e49` completed after explicit Send. Working progress, knowledge/web search events, concise answer preview, full structured answer beside chat and draft-only next suggestions were visible. Public events reported retrieval/no model change. This does not qualify native execution or solve broader general-question routing.
- Final empty Home is left open at localhost3001 with no test draft. Screenshot: `artifacts/ux/first-use-starters/final-home.png`; completed answer/process evidence is retained alongside it. Temporary production3100 was stopped; development3001 remains running.

Live online-device/context switching, rapid re-entrant callbacks and reference preservation permutations have controlled source tests, not a live native-model qualification. Full migration/release remains incomplete. The next reliability step is the overbroad general-question versus current-model classifier described above, followed by device/model-bound context qualification. Larger remaining contracts are durable editable Brief & decisions, D9 immutable BOQ revisions, RVT/native support, billing, research quality and release acceptance.

The bounded routing defect above is now repaired in deployed102c9ee7; see [routing recovery](model-context-routing-recovery.md) for exact tests, actual general/model request outcomes and remaining limits. It supersedes this packet’s former next-step routing status.
