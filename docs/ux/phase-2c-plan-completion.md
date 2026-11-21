# Phase 2C · Keep unfinished plan work visible

| Field | Value |
| --- | --- |
| Status | Live and verified on 21 November 2026 at 0bc283b |
| Depends on | [Phase 2B](phase-2b-step-identity.md) |
| Direction | Release Phase 2C with final-answer recovery and verify a fresh 20 by 30 m 3BHK after reload |

## Observed behavior

A Plan task can save a valid concept and finish while a required research step and its report are both pending. The decision and answer gates also treat a supported step as runnable even when its prerequisite has no recorded evidence. A legacy checklist with two report steps can receive one answer and be marked complete.

## Change

Keep the saved concept while the graph continues pending checklist work. Enter the existing answer-only path when the final answer is the sole ready remaining step. Use the same prerequisite and tool-availability check in decision and finish. Recompute checklist status from the final answer receipt and persist a partial result if checklist work remains. Keep this slice on the existing checklist schema, whose recorded steps count as required.

## Acceptance

In an offline dispatcher regression, the design step saves its artifact, leaves the other steps pending and continues. A blocked prerequisite permits a partial answer and names the pending work. A supported ready step defers finishing. One answer receipt completes one eligible report step. The existing concept review, evidence, native approval and cancellation tests continue to pass.

## Verification

- The backend passed 1,032 tests, 26 subtests and 22 focused checklist and concept-answer checks. lat check passed.
- In a controlled 20 by 30 m 3BHK run, the real planner saved the concept, the offline knowledge fixture satisfied the research step, and the grounded final answer completed the checklist at 3 of 3. The saved report had eight room rows and three bedrooms. Its plan revision and hash matched, and another owner received 404.
- With web search disabled, the same harness kept the saved concept, delivered a partial answer and retained the research and report steps as pending. The saved checklist stayed at 1 of 3.
- Graphify refused to refresh the pre-existing stale graph because the rebuild would drop saved semantic nodes. The repository-wide freshness gate remains open.
- The offline 20 by 30 m 3BHK completed with one grounded fallback after two rejected execution recaps. The saved answer, both checklist steps, and an eight-row report used the same plan revision.

The existing evidence reducer groups web, regulation and project knowledge receipts under the same evidence kind. Source-specific attribution and cached-result deduplication remain follow-up work.

## Final-answer and checklist recovery

The [Phase 2B run](phase-2b-step-identity.md#production-rollout) first returned a numbered execution recap. Its repair used a room table containing counts such as (3) and (2), which the recap detector treated as list markers. Backend commit 79fe014 narrows the marker pattern and uses a verified saved layout summary when a named final answer still fails after one correction.

On release 79fe014, the signed-in Plan saved a readable inline answer and the eight-row room report at Revision 1. The model skipped recording the explicitly requested checklist, so the run correctly showed a partial goal. Backend commit 0bc283b makes the approved planning tool the first decision for an explicit checklist request before concept generation. [First live retest](https://datumm-web.vercel.app/?task=ae575312-039d-5ad4-b620-632e6e2c7f13)

## Production acceptance

The release archive matched all 263 source and build-kit hashes for 0bc283b. CodeBuild 96 passed the planner, revision, Mongo and API checks and published digest sha256:2595e51688c1e73baf68d78e9ea790aca9a52276b1af5c8e27e48b6699d4ad8e. Change set datumm-plan-completion-0bc283b-20261121001158 replaced the ECS task definition and updated its service. A current scheduled backup and zero active runs and jobs were verified before execution. CloudFormation and ECS completed, the health endpoint reported the exact commit, and all 19 production smoke checks passed.

The signed-in live 20 by 30 m 3BHK recorded and completed both checklist steps. The workflow attempted one model correction and saved one grounded inline answer from the verified concept. The room report opened at Revision 1 with eight rows and three bedrooms. The contents matched the recorded hash and the source matched the saved plan version and fingerprint. The answer, both completed steps and exact report revision survived reload. [Fresh live 3BHK](https://datumm-web.vercel.app/?task=2a0c8244-d4cf-5339-91ca-c2fa7aada70d)

Report revision 47bc1652f8923d92954b5ec35c0ae11e5726e63358a042c17e9afe2a724d5131 has content hash 3a037a7174f9899766e267b26cb6adbcd02fd04022f94f5bc08ab3770d73f783.

## Rollback

The previous qualified AWS image is 79fe014 at sha256:ea5f036533a6dd168ec83efaeb2d766d081c82b3f88085325832f28c81099c89. Saved checklist records and the public task schema use their current types.
