# Phase packet — Wave 0: unblock and trust hardening

| Field | Value |
| --- | --- |
| Status | approved 17 Nov 2026 (user approved the master planner, the revision plan and T-a to T-g at the recommended options, and said "start with wave 0") |
| Plan | [master planner](master-planner-2026-11-17.md) Wave 0; [desktop deep-dive](desktop-deep-dive-2026-11-17.md) §5 (gaps G6, G8) and §6 (rank 10) |
| Repos | `datumm-orchestrator` (backend, `main`), `datumm-web` (`main`) |
| Workers | Main agent (Opus 5.5) plans, reviews and releases; three Sonnet subagents (effort high) build W0.3, W0.4 and W0.5 in parallel on disjoint files |

## 1. Scope

| # | Item | Repo | Files (owner) |
| --- | --- | --- | --- |
| W0.1 | Release P-SEC (`8bd8b8f`) to AWS with the standard recipe | backend | none (release only); blocked until the user signs in to AWS |
| W0.2 | Remove the dead `organizeDone` (it called `tasks/{id}/history/done`, which has no route; no caller). Done by the main agent | web | `src/components/workspace/use-workspace-state.ts` |
| W0.3 | **Grant kind guard (T-b):** no standing grant may approve a proposal with an ineligible operation kind. The three auto-approve paths in `workflow.py` `approval()` are task access, agent control and device Full Control. Ineligible kinds are delete, create level, stair, create wall type, existing-wall move, and anything touching more than one level. The run then falls through to the normal exact-approval interrupt, so the owner reviews it. Each refusal records an event. | backend | new `grant_policy.py`; `workflow.py` (approval section only); `test_grant_policy.py`; domain-api README code map; `lat.md` section |
| W0.4 | **Run retention (T-c):** a daily job deletes runs older than `DATUMM_RUN_RETENTION_DAYS` (default 180), with their events. It only deletes terminal runs (`completed`, `failed`, `cancelled`, `interrupted`) that have no unresolved native operation and no pending proposal. Every pass logs its counts. `0` disables it. The daily S3 mongodump remains the archive. Compacting events after 30 days is deferred to TR1 (`run_spans`). | backend | new `retention.py`; the startup hook in `main.py` (lifespan/scheduler lines only); `settings.py` (one setting); `test_retention.py`; README; `lat.md` |
| W0.5 | **Hide the trace panel on hosted (deep-dive rank 10):** `PipelineTrace` only works in the desktop app. It shows only when the `runTrace` capability is on; an unknown capability is off, so it is hidden on the web until TR1. | web | `src/components/workspace/activity-panel.tsx` and wherever `view.trace` is derived; `src/lib/capabilities.mjs` if a flag name is added; a test |

Out of scope: device-side connector changes (T-f's add-in part is in the desktop repo), the evidence-based trust
ladder (AG1), and event archiving to S3.

## 2. Risks and how they are handled

- **W0.3 could block an approval the user expects to be automatic.** By design it falls back to the exact
  approval card. Existing exact approval is unchanged. An operation kind that can't be identified counts as
  ineligible (fail closed).
- **W0.4 deletes data.** It is fail-closed: it skips any run that is not terminal, has native operations or
  pending proposals, or is not older than the cutoff. Live data starts in October 2026, so nothing is old enough
  to be deleted before about April 2027. The rehearsal on the live dump must report 0 deletions. Backups keep
  every run.
- **W0.5 hides a panel.** It is shown again by the flag; the desktop sets the flag through its host adapter
  (CV3).

## 3. Tests and acceptance

- W0.3: unit tests for every kind on the deny-list, an unknown kind, an eligible kind and multi-level. For each
  of the three grant paths, an ineligible proposal is not auto-approved and does not use up the grant's
  remaining count. Eligible kinds behave as before.
- W0.4: tests for old terminal runs (deleted with their events), recent runs, non-terminal runs, runs with native
  ops or proposals, and `0` (disabled). The job is idempotent.
- W0.5: a test that the trace view is off without the flag.
- Gates (run by the main agent):
  - Backend: `uv run --frozen pytest -q`, `lat check`.
  - Web: typecheck, `npm test`, build, `lat check`.
- Browser on localhost, built-in browser: the Activity panel has no empty trace section, chats load, the project
  brief loads.
- Live: the backend rehearsal reports 0 retention deletions and no tracebacks. On the web, 18 runtime checks and
  the same browser scenario on datumm-web.vercel.app.

## 4. Rollback

Revert the commit. W0.4 deletions can only be undone from the S3 backups, which is why the rehearsal gate
requires 0 deletions on today's data.

## 5. Result

| Item | Outcome |
| --- | --- |
| W0.2 | Done by the main agent: removed the dead `organizeDone` (no caller) |
| W0.3 | Backend `97aa668`. `grant_policy.auto_approval_blockers` is checked before any grant is claimed. Ineligible kinds are delete, create level, stair and create wall type. Also blocked: unrecognized or unreadable kinds, a move whose target is a wall or unmeasured, and anything multi-level. 41 tests. Add-in kinds outside the eligible list (for example ceilings or roofs) fall back to exact review, which is the intended fail-closed behaviour |
| W0.4 | Backend `97aa668`. `retention.sweep`/`serve` works per chat, is fail-closed, deletes at most 500 runs per pass and logs counts only. 25 tests. Known limit: a crash between deleting runs and deleting their dependent rows leaves orphan rows, which are harmless and never shown. Still to check: 0 deletions in the rehearsal on the live dump |
| W0.5 | Web. The trace is gated on the host `runTrace` capability, which is off on the web, and the `desktopAvailable` prop is removed. 2 tests |
| Gates (main agent, 17 Nov) | Backend: pytest 789 passed + 26 subtests; `lat check` passed. Web: typecheck, 883/883 tests, build, `lat check` all passed |
| Browser (built-in, localhost) | `/dev/ux` Activity fixture renders, Task diagnostics is present, no "Local pipeline trace" section; workspace home loads |
| Live web | see the commit after this one |
| W0.1 and the backend release | waiting for the user's AWS sign-in; P-SEC and W0.3/W0.4 ship together |
