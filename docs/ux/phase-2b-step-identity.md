# Phase 2B · Stable checklist identity through replanning

| Field | Value |
| --- | --- |
| Status | Implemented and tested locally. Repository-wide graph freshness is blocked. |
| Depends on | [Phase 2A](phase-2a-plan-revisions.md) |
| Direction | Proceed with the next slice, 21 November 2026 |
| Baseline | Orchestrator `fdc7820` |

## Scope and design

When the agent revises a plan, keep the ID of an unchanged step and update prerequisite links to the effective IDs. Use the same action, expected result, target categories, target scopes and resolved prerequisites to establish continuity. An explicit matching ID or unique match can identify old work. Give an ambiguous or materially changed step a distinct ID and reserve IDs in the retained run history. The existing affectUI-based checklist remains the reader for the resulting plan. [affectUI Agent Plan](https://www.affectui.com/components/agent-plan)

## Contracts and implementation

Normalize IDs during accepted `plan_task` revisions in the orchestrator. Preserve the validated order and use the existing progress reducer to verify every step from its typed observations at the new plan version. The existing duplicate gate rejects cosmetic-only proposals before checkpointing.

## Checks and acceptance

Exercise the actual dispatch path with an inserted step, renamed unchanged work and a changed prerequisite. Cover ambiguity, ID collisions with retained history and correct prerequisite rewriting. Verify which steps remain pending when a prior completion has no backing observation. Run the focused and full offline backend suites, `lat check` and the codebase graph checks. The original 3BHK workflow should still produce the same kind of saved plan and report.

## Rollback

Revert the backend patch. Old and newly assigned IDs use the existing validated key format.

## Local result

- Backend commit `41e41bf` on `codex/agent-plan-revisions` preserves the layout and report IDs after an independent research step is inserted. Changed prerequisites create a fresh identity. Ambiguous repeated steps preserve identity only through a matching explicit key. Revisions re-evaluate completion evidence.
- The backend passed 1,032 tests and 26 subtests. `lat check` passed. The controlled offline 20 × 30 m 3BHK run finished both steps and saved its room report with eight rows. The source plan and report hash matched.
- Graphify refused both the full and scoped refresh because its rebuilt output omitted previously saved semantic nodes. `npm run check:graph` reached the freshness assertion and stopped. The starting manifest also disagrees with untouched files at the baseline commit. The saved graph was preserved.

## Production rollout

On 21 November, the owner approved the AWS image build and rollout for `41e41bf`. The encrypted source upload matched 263 reviewed source and build-kit files. CodeBuild run 94 passed the source, image, planner, revision, Mongo and API checks.

Change set `datumm-plan-41e41bf-20261120231156` deployed digest `sha256:6be6e01df8736ff9ab2653d0992979ab954625f631fd3c98ddf74027c6379100` using the live stack template. The preflight found zero active runs and jobs plus a fresh scheduled backup. CloudFormation reached `UPDATE_COMPLETE`, ECS reached `COMPLETED` at 1/1, and public health reported the exact commit. N4 remained enabled and the MCP secret reference was present. Q1 remained off. All 19 production runtime checks passed.

A signed-in synthetic 20 × 30 m 3BHK Plan saved three alternatives with zero blocking findings. The saved design and 1-of-2 checklist reappeared after reload. The `finish_answer` arguments failed validation twice, including one bounded repair. The run recorded `failed` with a partial goal and no room report revision. This live run used one checklist version. The tested revision behavior remains in the offline regressions. [Synthetic live Plan](https://datumm-web.vercel.app/?task=436cd8b6-3cd2-5d0a-b845-ad9a9871c83a)
