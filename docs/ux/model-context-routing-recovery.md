# General guidance and current-model routing recovery

14 November2026. The user authorized the root fix, Terra6.1 High subagents, general and actual model-request browser tests, and a handoff update. Preserve the approved affectUI/EGM interface and explicit native approval boundaries.

## Observed defect and scope

Two actual general Ask prompts containing “in Revit” returned a model connection requirement with Revit context off. Their task IDs and exact text are retained in [first-use recovery](first-use-starter-recovery.md). The shared classifier contained a bare `in|inside|from Revit` expression. Default frontend requests correctly use automatic inference; forcing all Ask requests to no-context would hide legitimate native requests and is not the fix.

Automatic inference now distinguishes the tested general/procedural questions from current-model requests. Explicit context read and Build write precedence remain unchanged. Negative modification constraints must not suppress a separate affirmative read; negated reads and procedural instructions are covered by the regression matrix. This is a bounded deterministic text heuristic, not comprehensive semantic intent understanding. Ambiguous language may still require explicit Revit context. No permission, authorization or exact-proposal approval is granted by classification.

## Isolated source and review

Candidate `102c9ee7daa72ed1defbfd5bfc2a490fed07aa34` directly parents the qualified live `439feca35cd77500f9812f55d63139744e5dd370`. Only three files differ: `agent_workflow.py`, `test_pending_admission.py` and `lat.md/hosted-opencode.md`. The focused changes were applied through an isolated index to the actual live source; the older desktop checkout and unrelated web work are excluded. Independent exact-source review confirmed that the prior version2 brief source and native approval controls remain intact.

48 admission tests passed in the worker checkout. The exact candidate then passed **73 combined admission/brief regressions** with the existing installed environment. Frontend **475 tests passed**; this repair has no frontend application change. Existing source graph refresh still refuses pre-existing missing semantic nodes; no forced rewrite occurred. The documentation link check passed.

## Required service and browser qualification

The existing AWS builder is used because Docker is not installed locally. The reviewed source package has162 files,690569 bytes and SHA-256 `e2e6bf950d6b1939a3932192c46140de1e2a2c9265564d5f5824a304531f870d`; S3 version `JuSMIIcaFgWyOlFbpXtW8G9jKqtOerPS`. Build `322094c9-3522-40d5-b511-af068b381004` must qualify source identity, actual packaged classifier cases/overrides/read gate, prior brief/planner/revision/usage checks and isolated Mongo/API startup and cleanup. A fresh backup, quiet-run check and deep image-only change-set review are required before cutover. Version2 checkpoint compatibility remains required; the compatible439 baseline is retained.

Browser acceptance: fresh general floor-plan guidance; a general follow-up containing “in Revit”; explicit general levels/grids guidance with no inspection; an actual current-model inspection request; and explicit Revit context on a general question. General guidance should answer without demanding a connector. Actual model requests must use a connected, identified session or honestly require a connection without fabricated data. No native writes or new grants are part of testing. The initial browser connection dialog showed four offline devices; a real connected-model read remains dependent on a test connector being online.

The completed deployment and browser results are recorded below. Evidence lives under `artifacts/ux/model-intent-routing/`.

## Deployment qualification

Build `322094c9-3522-40d5-b511-af068b381004` succeeded:107 API source hashes,25 brief regressions,21 packaged intent cases plus explicit overrides/read gate, prior planner/revision/usage/event checks and isolated Mongo/API checks/cleanup. Qualified image `sha256:ffd441662735a30237665cea0c16f650c1acba3feafddc6e3741b0cb37852367`, tag `intent-routing-102c9ee7daa7-24`.

A fresh backup `mongodump/20261113T201103Z.archive.gz` contained30922267 bytes. Parent and independent reviewer confirmed that change set `intent-routing-102c9ee7daa7` modified only the API image and service task reference. A final point-in-time activeRuns0 check and exact prior439 health preceded execution. The update reached CloudFormationUPDATE_COMPLETE, ECS1running0pending/singleCOMPLETED; health identifies exact102c9ee7 and anonymous protected endpoints return401. Backup freshness/size is not a restore rehearsal; the quiet check is not an admission lock. Candidate directly preserves version2 checkpoint compatibility;439 is the compatible prior image, while earlier0bc/9f08 images still have the previously recorded version2 constraint.

Actual Codex browser acceptance followed terminal service verification; results are below. No frontend workaround, native consent/write, IAM/infrastructure expansion, Git push/merge or full release occurred.

## Actual browser results and independent evidence review

Codex browser on localhost3001 passed the bounded routing gate against the deployed102 source:

| Case | Observed result | Owned execution evidence |
| --- | --- | --- |
| Original floor-plan guidance, task`f0ff74fa-5078-53aa-aeeb-9d152cfa7d96` | Completed general instructions, no connector required; full answer opened beside chat | Initial execution`6b7cbac9-f30f-5129-a9ac-abcf20066a66`: inferred`none`, completed |
| Exact levels/grids question with no-inspection instruction, task`0b818e43-0dfc-54ae-af62-29766c84d9a2` | Completed general explanation/table with no model inspection claim; reopened answer persisted | Execution`94cf32fa-3ee8-5b4c-86d4-6e0eb4dc1e6a`: inferred`none`, completed |
| Actual current-model room inspection, task`0ba44c14-ec36-5b90-a4e6-66f9772559ea` | Required one connected session; explicitly stated that no model data was read or inferred | Execution`1742064c-52b2-5e6d-9b49-dd1f3ce09567`: inferred`read`, `needs_connection` |
| General duplicate-view follow-up on that model-request chat | Completed a two-sentence general answer, without inheriting model access | Execution`6076e1f4-e5fb-5360-a1ed-fe18deefdae7`: inferred`none`, completed |
| General question with explicit Revit context enabled | Existing pending-native-approval preflight refused the new request; the complete draft was preserved | No new task or native authority was created; this verifies the approval guard, not a completed read |

A first duplicate-view follow-up in the floor-plan chat inferred`none` but paused with`BUDGET_EXHAUSTED`/agent_model_calls. It is evidence of correct routing only, not a completed follow-up. Findings remain saved and no allowance was reset. The equivalent follow-up later completed in the model-request chat. Run-allowance efficiency remains a separate follow-up.

The bounded read-only evidence capture used each known public task ID, then its owner-bound private executions. `runs.data.model_context_requirement` confirms actual inference; task-level requested mode and raw queued snapshots are not substituted for execution outcomes. Every captured execution had zero native operations and no native build. Independent review checked the exact source, change set and live records against the browser text and found no remaining blocker to the bounded routing fix.

Four connectors were offline both before and after testing; no device was authorized, disconnected, granted access or used for a live native read/write. Connected-model qualification therefore remains open. Explicit context was switched off again, the temporary test draft/error cleared, and the verified general-answer task remains open with an empty composer. Final screenshot: `artifacts/ux/model-intent-routing/final-general-answer.png`. No viewport override was used.

Additional UI observations are retained without expanding this repair: the list-only floor-plan answer used a generic “Open the full answer” preview, and the older connection-required turn showed “Status unavailable” after a successful general follow-up. Do not mark either compact-preview quality or historical status presentation as newly qualified. The final screenshot also shows narrow-work-area table row labels breaking mid-word; table sizing remains UI polish. The first answer also disclosed weak retrieved support; research-source quality remains open. The source graph freshness issue remains unchanged.

## Outcome and next work

The reported general-question connection defect is fixed and live within the tested intent matrix. The current backend baseline is102c9ee7, directly descended from439, with version2 compatibility retained. General natural-language intent remains bounded; explicit Revit context remains the supported way to disambiguate a model request. Next reliability work is allowance efficiency and device/model-bound context qualification; compact answer previews and historical connection-status labels remain UI polish. Durable project memory, D9 revision history, native/RVT qualification, billing, research and full migration/release remain separate.
