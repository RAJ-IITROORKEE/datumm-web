# Phase 2A · Plan revisions and the 3BHK regression

| Field | Value |
| --- | --- |
| Status | Implemented and verified locally |
| Depends on | Architectural agent MVP Phase 1 |
| Direction | Proceed to Phase 2, 21 November 2026 |
| Baseline | Web `832e66b`, orchestrator `8b6e4ea` |

## 1. Goal

Keep the original plan and checklist when the model merely renames the same work. Begin Phase 2 with this bounded fix and exercise the 20 × 30 m concept flow with the existing offline planner.

## 2. Observed baseline

The real `plan_task` dispatcher rejects an exact repeat. The same actions, prerequisites and results with different step keys and titles were accepted as version 2 and checkpointed. Progress still comes from typed evidence in `agent_task_plan.py:280`. Existing offline graph, admission and completion tests passed 50 of 50.

## 3. Design

Compare the ordered actions and the plan requirements while ignoring display titles and replacing dependency keys with their step positions for comparison. Keep original identifiers on an unchanged plan. A real revision still goes through the existing validator and recomputes evidence. The existing chat keeps its affectUI-based plan disclosure. [affectUI Agent Plan](https://www.affectui.com/components/agent-plan)

## 4. Files

Change the duplicate comparison in `apps/domain-api/agent_workflow.py`. Add a focused offline dispatcher regression and document the comparison in `lat.md/planning.md`. Use a separate backend checkout from `main` because the checker branch has work in progress.

## 5. Contracts

The tool inputs, public task response, stored plan format and AG-UI events retain their current schemas. The existing no-progress outcome handles a renamed repeat. Dependency order, action targets, expected results, goals and success criteria remain part of the comparison.

## 6. Risks and dependencies

Use test-local provider doubles to control decisions. Test a genuine prerequisite or target change so the comparison allows actual replanning. Treat mapping stable IDs across substantive revisions as a later change that needs explicit identity rules for ambiguous repeated steps.

## 7. Checks

Run the duplicate, renamed and substantive revision cases through the real dispatcher. Run the graph, admission and completion suites offline. Run the existing 20 × 30 m planner check and the concept-answer checks. Label solver and scripted model evidence individually.

## 8. Acceptance

A cosmetic repeat creates zero checkpoints and keeps the original step IDs. A genuine revision can increment the version. The checklist still requires evidence for completion.

## 9. Rollback

Revert the local orchestrator change. Prior plan versions remain readable under the same schema.

## 10. Local result

- The reproduction rejected an exact repeat but accepted its renamed equivalent and wrote one checkpoint. After the patch, the renamed repeat rejects before any checkpoint. The dependency change still writes one version-2 checkpoint.
- Backend commit `fdc7820` is on `codex/agent-plan-revisions`. The next Phase 2 slice covers identity through substantive revisions and its interaction with evidence recomputation.
- The full isolated backend suite passed 1,030 tests and 26 subtests. The targeted run passed 137 tests and the existing concept answer and grounding checks passed 20. The real planner CLI generated, validated, inspected and rendered three candidates for the 20 × 30 m brief. `lat check` passed.
- An offline run on the patched backend admitted a synthetic 3BHK Plan task with a confirmed 20 × 30 m building footprint and south entrance. Scripted model decisions drove real task admission, LangGraph, the Node planner and report publication, backed by in-memory Mongo with HTTP blocked. Three alternatives had zero blocking findings. Both checklist steps had recorded evidence. The saved answer carried completion proof. Report revision 1 had eight room rows, including three bedrooms. The plan version, fingerprint and content hash matched, and a different owner received 404.
- This records controlled model behavior and local persistence. Evaluation of model choices on ambiguous briefs and production performance belongs to the broader Phase 2 work.
