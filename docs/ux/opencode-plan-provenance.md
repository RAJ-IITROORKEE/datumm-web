# Plan and todo turn provenance

Current hosted result, 13 November2026: [targeted repair](progress-usage-recovery.md) is implemented/deployed at `d300ea5b` and actual-browser qualified. Hosted plans, conversation rows and newly imported event records use uniquely verified execution→command turn identity. New action/completion events share an explicit activity ID. Missing/ambiguous history stays task-level; semantic comparisons are never inferred from a design-readiness message. UI fixes and final451-test/build/TypeScript/13-runtime gate passed. The native OpenCode contract below is still a separate proposal; this hosted deployment does not implement or qualify it.

Historical source inspection, 13 November 2026. The original proposal below predates the hosted implementation above. The web UI continues to show conservative unknown/unconfirmed states when provenance is absent.

Inspected backend checkout: `E:/Web development/PROJECTS-FULL STACK/Datumm/_wt-orch-build`. Its OpenCode desktop transport and hosted task-plan workflow are distinct paths.

## Observed OpenCode path

- `apps/domain-api/local/live_runtime.py` — `LiveRuntime.work()` sends `turnIndex = len(task['conversation']) - 1` to the engine. `observe()` polls `/tasks/{taskId}/harness` and writes `data.opencode_todos`. `finish()` also writes successful `result.todos` globally, then saves `{conversationIndex, result, error}` in `data.turns`. The saved turn wrapper already identifies its conversation record.
- `apps/desktop/src/main/orchestration.ts` — `ActiveTurn` does not retain `turnIndex`. `sessionTodos()` validates and returns content/status/priority. `handle()` returns these todos from the harness route; `runTurn()` includes them in the terminal result.
- In the native V2 branch of `Orchestration.api()`, the todo route finds the latest completed `todowrite` tool part across the entire session. Reusing a session can therefore return a prior turn's checklist, including when the new turn has not written any todos.
- In the same adapter, the message POST receives the native prompt's `queued.id` before waiting for completion. Assistant snapshots expose `info.parentID`; terminal response selection already matches this parent against `queued.id`.

Simply stamping the latest conversation index on a session-level checklist would falsely attribute inherited todos to a new turn. Task status, matching checklist text and a task-scoped session do not prove turn ownership.

## Proposed OpenCode contract

Retain validated `input.turnIndex` as optional `ActiveTurn.conversationIndex`, and retain the admitted native prompt ID as `ActiveTurn.promptMessageId` immediately after prompt admission. For native V2, select completed `todowrite` parts only from root-session assistant messages whose `info.parentID` matches that prompt ID.

Return an optional `todosConversationIndex` beside the todo array only when the source message is bound to the admitted prompt. A current prompt with no matching todo should have an explicit empty checklist. Legacy, V1 or unmatched session-level data stays unbound; do not infer provenance or backfill it with the latest index.

Have `LiveRuntime.observe()` and `finish()` preserve the optional binding atomically with `data.opencode_todos`, rejecting mismatched active-turn indices. Keep saved `result.todos` inside its existing exact `data.turns[].conversationIndex` wrapper. Provenance must survive failure and restart without replaying inference or tools.

## Observed hosted task-plan path

`apps/domain-api/agent_workflow.py` creates `agent_task_plan` in `dispatch_action()` for the `task_plan` action. `decide()` and other completion/verification paths recompute it through `apps/domain-api/agent_task_plan.py::plan_record()`. `apps/domain-api/storage.py::checkpoint()` persists the result. This evidence-based plan is separate from OpenCode's native `todowrite` checklist.

`apps/domain-api/task_controller.py::projection()` selects active-execution data. Its `conversation()` helper flattens execution prompts, question receipts, user answers and final answers into public conversation rows. Consequently, the latest flattened conversation index is not a reliable identity for the execution that created a plan.

For this path, propose an optional `turnId` derived from the accepted command's existing `id`, matched through `command.resultExecutionId === activeExecutionId`. Project that same identity alongside the plan and its conversation group. Preserve missing provenance for legacy plans. Do not alter evidence predicates, plan completion, acceptance or native write authorization as part of this presentation contract.

## Verification scope before deployment

- Scripted OpenCode: two turns in one session; the first writes todos and the second does not. The second must not acquire the first checklist. Identical todo text in both turns must still bind through the different native parent IDs.
- Prove root/child-session separation and live-harness/terminal-result parity. Missing or invalid provenance remains unknown.
- SQLite transport: test atomic checklist/binding publication, exact saved-turn preservation, stale-index rejection, failed settlement and restart recovery. Existing checks in `scripts/check-orchestration.cjs` and `scripts/check-plan-recovery.py` provide suitable starting points.
- Hosted projection: test accepted-command binding with question/answer groups, execution changes and legacy records lacking provenance. Preserve exact evidence and authorization fields.
- Web projection: consume only matching explicit provenance; retain current conservative labels for older or unmatched records.

Only source inspection was performed for this report. Backend `lat check` passed. No backend source, native model, runtime deployment or service configuration was changed.
