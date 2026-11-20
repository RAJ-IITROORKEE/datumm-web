# Phase 2C · Keep unfinished plan work visible

| Field | Value |
| --- | --- |
| Status | Implemented and verified locally |
| Depends on | [Phase 2B](phase-2b-step-identity.md) |
| Direction | Continue implementation after verifying `41e41bf` live, 21 November 2026 |

## Observed behavior

A Plan task can save a valid concept and finish while a required research step and its report are both pending. The decision and answer gates also treat a supported step as runnable even when its prerequisite has no recorded evidence. A legacy checklist with two report steps can receive one answer and be marked complete.

## Change

Keep the saved concept while the graph continues pending checklist work. Enter the existing answer-only path when the final answer is the sole ready remaining step. Use the same prerequisite and tool-availability check in decision and finish. Recompute checklist status from the final answer receipt and persist a partial result if checklist work remains. Keep this slice on the existing checklist schema, whose recorded steps count as required.

## Acceptance

In an offline dispatcher regression, the design step saves its artifact, leaves the other steps pending and continues. A blocked prerequisite permits a partial answer and names the pending work. A supported ready step defers finishing. One answer receipt completes one eligible report step. The existing concept review, evidence, native approval and cancellation tests continue to pass.

## Verification

- The backend passed 1,032 tests, 26 subtests and 21 focused checklist and concept-answer checks. lat check passed.
- In a controlled 20 by 30 m 3BHK run, the real planner saved the concept, the offline knowledge fixture satisfied the research step, and the grounded final answer completed the checklist at 3 of 3. The saved report had eight room rows and three bedrooms. Its plan revision and hash matched, and another owner received 404.
- With web search disabled, the same harness kept the saved concept, delivered a partial answer and retained the research and report steps as pending. The saved checklist stayed at 1 of 3.
- Graphify refused to refresh the pre-existing stale graph because the rebuild would drop saved semantic nodes. The repository-wide freshness gate remains open.
- The live validation failure from [Phase 2B](phase-2b-step-identity.md#production-rollout) remains open. Phase 2C has local evidence for checklist completion and partial goals.

The existing evidence reducer groups web, regulation and project knowledge receipts under the same evidence kind. Source-specific attribution and cached-result deduplication remain follow-up work.

## Rollback

Revert the backend commit. Saved checklist records and the public task schema use their current types.
