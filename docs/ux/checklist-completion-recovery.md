# Concept checklist completion recovery

15 November 2026. User-authorized backend repair with Terra 6.1 High implementation and independent validation. Inspect evidence first, then qualify fresh generate/revise in the Codex browser. Preserve historical records and native approval boundaries.

**Final scope:** the checklist repair passed actual generate → revise → reload on deployed source eb86413. Both new runs have genuine 2/2 evidence; historical 1/2 is unchanged. The saved-context follow-up and native-badge correction are qualified below. Free-text wording still needs refinement; this is not whole-product completion.

## Verified cause before implementation

The browser task `6a4cde35-1697-5f5f-955c-fe679ecb3c8b` exposes its saved latest run through Exports → Run record. The downloaded backend record identifies run `48e8e1b7-4d1f-5955-b111-6e0dc77a88a3`, overall completed, with `revise_concept` completed from `design_ready` and `report` pending with an empty evidence list. The latter action is `finish_answer`, depends on the completed design step, and requires `response_ready`. Actual observation kinds contain no response_ready. Minimal evidence is saved in `artifacts/ux/checklist-completion/before-evidence.json`.

The final readiness text reports the dimensions and alternative count but does not provide the planned assumptions and validation limits. Therefore inventing a response_ready observation, hiding the step or forcing 2/2 would misrepresent the record. The frontend's unconfirmed state is correct.

## Bounded implementation plan

1. Preserve successful design and its preview checkpoint. If the only remaining step is one finish_answer with satisfied dependencies, continue the existing validated answer loop instead of terminating immediately.
2. Only the genuine finish_answer path supplies response_ready. Keep prior records unchanged and retain incomplete evidence on failure, missing prerequisites or unsupported steps.
3. Preserve the newly generated drawing/report through provider or shared-budget failure. Do not add native tool admission or approval authority, nor spend an unbounded extra loop.
4. Test recorded-shaped generation/revision, failure/budget paths, dependency guards, no-plan behavior and exact execution/turn evidence; run inherited API/container gates and independent review before publishing/deploying the image.
5. Verify new generation → revision → reload in localhost against the deployed service, inspect saved evidence, and update this packet, PLAN and handoff. A historical task is not retroactively repaired.

## First release checkpoint

Candidate source `e4e2b1910371240307b661a892cd1695cd93e0ce` is a clean direct child of deployed base `1ef3861b2e5186151df387a1e2e5a20e99f8d0c1`, on isolated branch `codex/checklist-completion-20261115`. The original dirty desktop repository and previous candidate were untouched. Managed worktree creation stalled; the implementation used a separate local clone. No merge or upstream push occurred.

The final-answer continuation restricts both offered tools and dispatch to finish_answer. It skips unrelated brief/empty-inventory shortcuts during this stage. Provider and cancellation failures leave a partial result, saved design and pending report step. Budget failure retains the design with the existing paused-limit outcome and does not reset the usage ledger. New report revisions publish only on successful final completion; failed final answers retain prior report history rather than publishing a successful report.

Five standalone regressions and the API suite (132 tests plus nine subtests, two existing warnings) passed; frontend's existing 79 checklist/activity tests passed without source changes. Failure-path IO is mocked, not a production fault injection. `lat check` passed. Graph refresh refused to overwrite the previously recorded 43 missing semantic nodes, leaving graph freshness unqualified. Exact-source container gates and service rollout passed as recorded below; browser qualification is in progress. No native actions were performed.

## Container and release evidence

The frozen archive has 174 entries, 749,836 bytes and SHA-256 `89813f0ba7b1f0403fd16a16cc0b0ddbf2ef0f8d0a80c65ce448eac7caa64706`. Independent comparison verified every committed source/helper entry. AWS build `0028cdd8-7285-4aaf-af4b-d2e931ec8d76` passed all inherited planner, event, usage, count, compaction, native-admission, Project Brief and report-history gates, the new five-case packaged regression, real disposable Mongo/API checks and cleanup. Two reviewers inspected the complete 471-event log and source/image linkage.

Deployed image: `sha256:efec406b2d1d9bcc95d3585f2f80b100ee26a3ed8aa9f82e9208af03509262ec`. A fresh 31,919,350-byte database backup and zero-active-run check preceded the image-only change-set execution. All 20 parameters were accounted for, 19 unchanged; only the task image and service task reference changed. Backup restoration was not tested. Prior image `sha256:5501a05ca2b9434b1a55d3308c0dc035582a992a34710365f9b9d2ea24709906` is the rollback target; preserve existing version-2 checkpoints.

CloudFormation reached UPDATE_COMPLETE; ECS has one completed deployment, one running task and no pending tasks. Independent read-only checks matched running task and task-definition image digest, public health source `e4e2b1910371240307b661a892cd1695cd93e0ce`, task/event contracts v2 and anonymous 401 access checks. Receipts are in `artifacts/ux/checklist-completion/`. Live-browser qualification remains in progress at this checkpoint.

## First live generate/revise check

Actual Codex task `017c9f90-a4f4-5718-8af8-7bd832abbb83` generated one 12 × 9 m concept and revised it to 13 × 9 m, retaining one alternative at version 2. Both exported backend run records contain two completed steps and genuine `response_ready` evidence for the report. Revision reload restored 2/2 and exact 13,000 × 9,000 mm geometry. Shared usage rose from four to eight model calls without a reset, with complete coverage. Receipts: `generation-evidence.json` and `revision-evidence.json` in the first packet. Public exports omit the private continuation marker; its cleanup is qualified by controlled tests, not inferred from that omission.

The new answer stage exposed a frontend bug: any in-progress result could display a native Build badge with a fallback batch count. The badge now requires active Build mode and actual verified native batch entries. The live revision's 1/2 reporting stage had no native badge. Final frontend checks passed 526 tests, production build, TypeScript and 13 runtime checks.

Full qualification is still pending a related summary-context repair. Generation reported numerical room targets unsupported by the captured evidence; revision said saved geometry/count were unavailable despite the saved version 2. The continuation can receive a cached previous selection instead of the newly saved design. A separate `artifacts/ux/checklist-report-grounding/` packet preserves the first release receipts and will qualify current saved-result context before final browser acceptance. This is a factual-context repair, not a claim that free-form model prose is mechanically verified. The original historical 1/2 record remains unchanged. No native write or approval was performed.

## Saved-result context follow-up

Source `eb864131e0d50f8a3a23c7681726ab613d2770e7` is a clean child of `e4e2b1910371240307b661a892cd1695cd93e0ce` in the same isolated clone, on branch `codex/checklist-report-grounding-20261115`. During the bounded answer continuation, an owner-scoped read must match the current saved design and pending marker. Its count, candidate references, footprint and available assumptions/diagnostics are supplied in `currentConceptResult`; the old selected concept is excluded. Oversized or malformed assumption/diagnostic groups are individually unavailable rather than making the footprint/count unavailable. No room dimensions are invented by this projection.

Compaction preserves this field, while omitting it from the protected digest when absent preserves historical checkpoint compatibility. The existing generic finish_answer action still executes and supplies real response_ready evidence. The prompt requires a concise answer without repeated checklist text and limits geometry claims to available current facts; this is guidance, not a mechanical semantic guarantee.

Both five-case standalone checks, API 132 tests plus nine subtests, `lat check` and independent review passed. Tests include stale selection, ownership, missing and oversized evidence, actual fitted-packet pressure, protected-field integrity and restoring an older checkpoint. Both actual downloaded saved-design shapes projected the expected facts with a synthetic private pending marker; this replay does not prove the live marker state. Graph refresh refused the existing missing semantic nodes and left its file unchanged.

Frozen follow-up archive: 175 entries, 753,417 bytes, SHA-256 `2aa53ab449722a6f826782722e686a81950afc5844e398975670f35dfa891118`. Every archive member matched committed source or reviewed helpers. Build `3f3288df-e8fb-4636-a2f4-398a1847b205` passed all inherited gates and both five-case packaged regressions, disposable Mongo/API and cleanup; independent reviewers inspected all 472 log events and exact image/source linkage.

The follow-up is deployed at image `sha256:95b6844c617979c2db83a896dd69c88136d5fde669842d8a9f62cd13a9f6f546`. Fresh backup `mongodump/20261115T013435Z.archive.gz` was 32,009,643 bytes and verified before the zero-active-run cutover; restoration was not tested. Twenty parameters were accounted for, nineteen unchanged; only Task image and Service task reference changed. The previous efec406b image is the rollback target. CloudFormation UPDATE_COMPLETE, one completed ECS deployment, one running task, zero pending, actual image digest, exact eb86413 health source, v2 contracts and anonymous 401 checks passed. Final browser qualification is recorded below.

## Final browser qualification

On the repaired service, actual Codex task `ccc1a3a0-0d8d-52c1-9dbf-4d649fc21992` generated one 12,000 × 9,000 mm south-entry concept, then revised it to 13,000 × 9,000 mm. Plan `5ff26f93-26a4-51e5-86df-1121d3fe62e7` advanced v1 → v2 with distinct fingerprints. Run records `897b5300-3f0d-5e39-8f6a-d1d4a41349a5` and `76e04e78-4053-56f3-a9de-031159fc024f` each record completed create_design and finish_answer steps with real design_ready/response_ready evidence. The browser showed the intermediate 1/2 reporting stage and final 2/2; the web-only turn had no native Build badge.

Reload restored the final 2/2 in chat and Activity, one alternative, v2 and exact drawing dimensions. The same root ledger increased from four to eight model calls, with final 25,290 input and 6,398 output tokens and complete coverage; two compactions were recorded without a usage reset. The composer was left empty. No native approval, inspection or model change was performed. `artifacts/ux/checklist-report-grounding/{generation-evidence,revision-evidence,final-review}.json` and `checklist-final.png` capture the outcome. Public run records do not expose the private pending marker.

Independent comparison confirmed the answer's count, footprint and recorded 150 mm wall assumption match the saved source. The new answers did not invent room dimensions. Two wording limitations remain: generation repeated the checklist despite the instruction; revision unnecessarily said the single candidate was not a separately confirmed alternative. The source-context fix does not enforce semantic or formatting correctness of arbitrary model prose. These remain the next bounded chat refinement, not failures of the 2/2 evidence fix. Full migration, graph freshness, backup restoration, native writes and broader product release remain unqualified.
