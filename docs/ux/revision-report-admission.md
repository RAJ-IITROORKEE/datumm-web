# Revision report admission

15 November 2026. User requested Terra 6.1 High implementation/review, full generation/revision browser checks and handoff update.

**Final scoped outcome:** the original revision request produced its report, and an explicit no-checklist revision also saved a real final report with response_ready. The no-plan turn has no fabricated checklist or 2/2. Reload qualification and final evidence are recorded below. Free-form prose still has a residual save-confidence caveat; this is not a claim of general answer correctness.

## Verified cause

Actual task `c7a05279-5396-5113-9ad6-bad6b46160e5`, revision run `a2f5cccf-70e5-553b-8264-4fc61fd56e03`, saved the requested 13 × 9 m v2 design but no task plan. Its original prompt requested a separate report with saved minima and validation limits. Observations contain design_ready only; the final response is deterministic readiness text. There is no finish_answer, response_ready or genuine 2/2 for that turn. Source ed94ff5 continues only when the sole pending task-plan step is finish_answer, so no-plan designs terminate before reporting.

## Bounded implementation plan

1. After a successfully saved web-only Plan design with no task plan, use the existing bounded final-answer continuation. Retain original request and current owner-bound saved facts. This applies to generation and revision consistently and costs one additional tracked answer decision on ordinary no-plan designs; it avoids unreliable report-keyword inference.
2. Keep existing planned dependencies, unsupported-step handling and native admission/approval behavior intact. Do not invent a task plan, completed checklist, response_ready observation or 2/2. Only genuine finish_answer supplies answer evidence.
3. Distinguish owner-verified absent task plan (`not_recorded`) from unavailable/stale/foreign evidence. Do not tell the answer model a checklist is saved when none exists. Requested checklist obligations must not be silently marked fulfilled merely because a report exists.
4. Qualify focused/API/failure/budget tests and independent exact source/container/image-only rollout. Test the original prompt through generate → revise → reload, compare actual report contents with saved minima and evidence, and record remaining limits.

Root approved the extra bounded answer call within the user's authorized report/orchestration repair. This is a reporting change, not new native authority or a frontend/theme redesign. Implementation and qualification are in progress.

## Reviewed source

Clean direct child `6331c219ca6bf4597a873a79b563069c3cb9d2a0` follows ed94ff5 on `codex/revision-report-admission-20261115`. The new continuation applies only after successful saved web-only Plan design with no task plan; existing planned dependency checks and native modes are unchanged. Original goal and current saved facts reach genuine finish_answer. Owner-bound absent plans are `not_recorded`, not conflated with unavailable/foreign evidence. A scoped validator rejects recognizable false recorded-checklist claims.

An explicit recognizable request to record a task checklist remains partial if no plan was saved, even after the report completes; the server discloses that omission. This recognition is lexical and may miss other phrasing. Alternative shortfalls are recovered only from the existing source-generated diagnostic, cross-checked against actual saved count and preserved in the final report. No synthetic task plan, response_ready or completed counter is added.

Focused 17 cases, exact-source API 132 tests plus nine subtests, lat and count/flexible/default standalone checks passed. No-plan tests cover real dispatch and mocked runner/public projection, saved facts, ordinary requests, missing requested checklist, native/build exclusion, provider/cancellation/budget failures and old planned paths. Graph refresh refused the existing 43 missing semantic nodes; freshness remains unqualified. Free-form report truth/format remains model-dependent within the existing bounded lexical checks.

Archive SHA-256 `41fbe9e73a48b49e4ed19ff53441608c101e343982a11498e28434a447dd6b7b`, 175 entries / 762,119 bytes, independently matches committed source/current helpers. Container build and actual browser checks remain pending. No frontend source changes or native actions occurred.

## Container checkpoint

Build `cc2712f2-fd56-4287-9328-11d18dbb5e98` passed all inherited gates, focused suites, real disposable Mongo/API and cleanup. Two reviewers inspected all 474 log events, the exact pinned S3 source and ECR linkage. Reviewed image: `sha256:bb49ed58d799aa2bea6e1bcc9129a6e48764e2fc532ee0b94420e60a070c5265`. Backup/change-set preparation and browser qualification are pending at this checkpoint. The previous ed94ff5 image remains deployed until the reviewed cutover.

Fresh backup `mongodump/20261115T041243Z.archive.gz`, 32,519,758 bytes, was verified before zero-active-run cutover. Deep review accounted for twenty parameters, nineteen unchanged and only Task image / Service task reference modifications. Previous 23bc7d04 image is the rollback target; backup restoration was not tested. The reviewed image-only update is running; final steady-state and browser qualification remain pending at this checkpoint.

## Actual generation and revision evidence

Deployment reached complete CloudFormation, one completed ECS deployment / one running / zero pending, exact 6331c21 running source/digest, v2 health and four anonymous 401 checks, verified independently twice. Actual Codex task `c013d196-9ed2-5678-8cf3-b10cdbd97fbd` generated one 12 × 9 m south-entry alternative with real 2/2 and report. Run `f4fe0063-b53d-53d0-a868-31d7946108e9` contains design_ready + response_ready. Replaying the original previously failing revision prompt produced the same plan `dc8bae66-f933-5031-8e49-3f2bae4aceeb` at v2 / 13 × 9 m, one alternative, genuine 2/2 and a report of saved minima/limits. Run `b169d2e5-9a0b-51b7-b30a-d904b9c1a7e1` confirms values 12 m² per bedroom and 26 m² living/dining match saved minima and are labelled provisional targets, not measured areas.

An additional revision explicitly requested no task plan/checklist and a report after saving the design. Run `7e6b6557-14cf-5191-b2f1-f6f22ea3f1ec` saved the same plan at v3 / 14 × 9 m with one alternative, plan=null and real design_ready + response_ready. Its three-sentence final report supplies Bedroom 1's saved 12 m² and Kitchen's 8 m² as provisional minimum design targets, not measured areas, plus validation limits. This is direct live qualification of the newly admitted no-plan answer path; no checklist/2-of-2 is claimed for that turn. Shared usage rose 4→8→11 calls, ending at 33,853 input / 10,185 output tokens, complete coverage. No repair event was captured; bounded correction remains controlled-test qualified. All reports/values were independently compared to saved sources.

**Residual wording issue:** the no-plan answer says it cannot verify a new save in the turn, although the saved v3 record proves the new revision. This unnecessary confidence caveat remains in the historical answer and is disclosed separately from the repaired report-admission behavior. Broad prose truth, lexical checklist-request recognition, graph freshness and backup restoration remain qualified limits. No native inspection, approval, write, merge or full release occurred. No frontend source changed; earlier frontend checks are historical.

Reload restored the final no-plan report, one alternative and exact 14,000 × 9,000 mm v3 drawing. Activity shows create_design → finish_answer → response saved, with no invented checklist/2-of-2. Normal-viewport screenshots: `artifacts/ux/revision-report-admission/final.png` and `activity-reloaded.png`. The composer is empty and verified task retained. Requested-checklist omission/partial behavior and failure handling were controlled-test qualified, not induced live; no live repair event was captured.
