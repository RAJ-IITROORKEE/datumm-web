# Concept summary wording repair

15 November 2026. User requested Terra 6.1 High implementation/review, real generate/revise browser checks and handoff updates.

**Final scoped result:** the tested generation and revision no longer repeat the numbered execution checklist or distinguish candidates from alternatives. Revision reload preserves its clean three-sentence answer, exact v2 geometry and genuine 2/2. A new false checklist-unavailable claim in generation remains an explicit accuracy gap; overall summary reliability is not declared complete.

## Observed before implementation

The saved Codex conversation `ccc1a3a0-0d8d-52c1-9dbf-4d649fc21992` repeats the two checklist items in its generation answer. Its revision describes one saved candidate as “not a separately confirmed alternative,” while the review panel correctly lists one alternative at version 2. The prior backend evidence verifies the saved count and genuine 2/2 completion. The current prompt already asks the model not to repeat the checklist, so another unvalidated style instruction alone is insufficient.

## Bounded plan

1. Inspect the real final-answer contract and saved-result projection. Preserve checklist evidence and the generic ability to answer a user-requested checklist.
2. Give concept completion a concise, validated summary contract and consistent user-facing alternative terminology, grounded in owner-scoped saved facts. Preserve requested report substance, assumptions/limits, failure behavior and native approvals.
3. Test generation/revision, count singular/plural, missing/stale facts, invalid summaries and generic-answer compatibility. Independently review source and exact container before a reviewed image-only deployment.
4. Test fresh generate → revise → reload in the Codex browser, compare exported backend evidence and update PLAN, PROJECT and handoff with results and limitations.

## Reviewed implementation

Source `03b2817286d347c138d38a451b1e8e1552d897f5` is a clean direct child of deployed base eb864131e0d50f8a3a23c7681726ab613d2770e7 in the existing isolated clone. No frontend changes were required. During concept-answer continuation, the model packet now uses alternativeCount/alternatives, removes internal task-plan progress and duplicate task_plan/design_ready observations, and retains the verbatim goal, success criteria and finish-step expected results. Those report requirements survive compaction without changing historical digests when the new field is absent. Stored checklist data and genuine finish_answer/response_ready completion are unchanged.

The initially considered broad word filter was rejected during review because it could reject legitimate report content. This is a structural context repair with style guidance, not a hard guarantee about generated prose; actual browser checks remain required. Generic and explicitly requested checklist reports remain supported.

API 132 tests plus nine subtests, both five-case standalone suites and lat check passed. Graph refresh refused the existing 43 missing semantic nodes; freshness is unqualified. Frozen archive: 175 entries, 754,412 bytes, SHA-256 `f8ea06129943fb957f90f42190a40fbe22104caaef7fd8d50fcc811b54b84d26`, independently compared against all committed source and reviewed helpers. AWS container build and final browser checks are pending; previous receipts remain unchanged.

## Container and rollout checkpoint

CodeBuild `f4f20ce2-d65a-44f4-b34a-1b5ca0fe66b6` passed all inherited gates, both focused suites, real disposable Mongo/API checks and cleanup. Two reviewers checked all 475 log events and source/image linkage. Image: `sha256:9f738f14f1e5911cc0b9ec98651180165a59bba89cbc0be43fd974dfa3661583`. Backup `mongodump/20261115T021022Z.archive.gz` is 32,102,071 bytes; restoration was not tested. Zero active runs and a deep image-only comparison preceded cutover. All twenty parameters were accounted for, nineteen unchanged; only Task image and Service task reference changed. Previous 95b6844 image is the rollback target. Rollout and final browser verification remain in progress at this checkpoint.

## First live qualification failed

Source 03b2817 reached complete CloudFormation/ECS state, exact running digest/source and anonymous 401 checks. Actual task `feee3160-ec8f-57c6-bf46-5682a738254f`, generation run `1a6a28e5-1f06-5d4c-8c1e-cd22db5955c6`, still returned “Checklist: (1) generate the concept—done; (2) report assumptions and validation limits—done.” The saved one-alternative count and 2/2 evidence are correct, but the wording repair is not qualified. The raw record was downloaded through Exports; this failed evidence is retained.

The follow-up in `artifacts/ux/concept-summary-validation/` will validate this narrow internal self-completion checklist shape during concept finish_answer, request one correction through the existing schema-recovery path, and retain the design/pending report on exhaustion. It will not strip text, ban general checklist content or claim a complete report without response_ready. The source/terminology cleanup remains useful, but does not alone fix repetition.

## Runtime validation follow-up

Source `7ac7d04fca73a9be38efcfeb9f4f65bd3e435bdf` is a clean child of 03b2817. During concept finalization only, it rejects the observed checklist-headed numbered recap containing both a completed generation/revision step and a completed report step. Existing schema recovery allows one correction. A repeated invalid answer leaves saved design and incomplete report evidence; unrelated report checklists and generic finish_answer remain valid. An explicit request to show a progress checklist in the answer/report is exempt. This is a bounded lexical check, not comprehensive intent detection; unusual formats may escape and differently worded explicit requests can be rejected. No answer text is silently removed.

Twelve standalone checks, API 132 plus nine subtests and lat check passed; independent targeted review passed. Frozen archive: 175 entries, 755,970 bytes, SHA-256 `4c89fc02af6ae45817c1a3c4c19602eb43aa71e667049a8f71d036d9d2c1b882`. Container build and actual browser qualification are pending. Graph freshness remains unqualified.

Follow-up build `9f236880-7bba-45b3-8675-331c0cf58f58` passed; two reviewers checked all 473 log events and packaged regression/Mongo/API/cleanup gates. The new exact image is `sha256:1b8c46daca1ae28b0f1564224130205b25311664e8119452bcb6d11c90d97de8`. Fresh backup `mongodump/20261115T022501Z.archive.gz` is 32,142,518 bytes and was verified before a zero-active-run cutover; restoration was not tested. Image-only change-set review again confirmed twenty parameters, nineteen unchanged and only Task image / Service reference modifications. Previous 9f738f14 image is the rollback target. Final rollout/browser checks remain pending at this checkpoint.

The second live generation on 7ac7d04 also failed wording qualification: task `a59b2ed7-94dd-5df9-9263-5207a7d5b715`, run `edf5bd18-f440-5e46-9a96-b2c3a8deeb71` said “Checklist: 1) Generate one concept — one alternative is available; 2) Report assumptions and validation limits — below.” It kept real 2/2 evidence but escaped the completion-status words. The next minimal follow-up removes that status-word dependency: the numbered internal generate/report recap itself is rejected, with the same one-correction and explicit-request boundaries. Evidence is preserved; this attempt is not declared complete.

## Recap-shape follow-up

Source `760a06159a815d966632debacd6efaa91bf7981d` is a clean child of 7ac7d04. It removes the completed-status prerequisite and adds the second live variant to dispatch/recovery tests. Twelve focused tests, 132 API tests plus nine subtests and lat check pass. Archive SHA-256 `470522ede5042cc9ed5eeadd92de591a57a59d14892eea78087ddccd955607f2` has 175 entries / 755,931 bytes, independently compared and downloaded from its pinned S3 version. Build `f34e0f80-77e6-44e0-91a8-98f31c0eaa14` passed; both reviewers inspected all 478 log events, source/image linkage and inherited gates.

Image `sha256:ac66b2728c131487aa40e61f3b1adf39da4181fcdc2ba75bcd6c4fff4956cee6` is the reviewed candidate. Backup `mongodump/20261115T023559Z.archive.gz`, 32,176,030 bytes, was verified before zero-active-run image-only cutover. Twenty parameters, nineteen unchanged; Task image and Service reference only. Backup restoration remains untested; rollback image is 1b8c46da. Final browser qualification remains pending. The detector is bounded to a heading/numbered recap structure and explicit-request exemption; other forms may escape and differently phrased requested execution recaps may be rejected.

The third live generation, task `64b15984-03aa-5b32-9c55-c7a4d006fe7e`, run `ce3aefa3-980d-5e2c-a7b9-6bf907321ec3`, again kept 2/2 but repeated the recap under “Task checklist,” escaping the anchored heading. Its export is preserved in the recap packet. The final follow-up in `artifacts/ux/concept-summary-final/` removes the heading dependency and recognizes the numbered generation/report role pair itself, including noun-first forms. It retains the bounded correction, failure evidence and explicit final-report request exemption. None of the three failed wording checks is labelled successful.

## Final candidate checkpoint

Source `6a96d471a6eba2115302f7570e4566ffdbc3db86` is a clean child of 760a061. It recognizes numbered concept-generation/report recaps independent of heading/status, provides a concrete correction instruction, and clarifies that recording execution progress does not request its repetition in the final answer. The explicit final-answer request exemption remains. This broadens the bounded detector's false-positive boundary for unusual substantive numbered reports; generic answers outside this continuation remain unaffected. No text is silently stripped and no completion is invented.

Twelve focused checks, 132 API tests plus nine subtests and lat check passed. Archive `1e8ea04f9b8ca3aab432ef8e576f4a28a6b01f36a254047e9dcefd4f3f21f258` has 175 entries / 756,123 bytes. Build `e75fd6d6` passed all gates; two reviewers checked all 471 events and image linkage. Image `sha256:5ec6d30c2f503bef07ba701ddb0138e03187fb1c26cda47d4854d2841b6117e1` follows the reviewed image-only change. Backup `mongodump/20261115T024702Z.archive.gz`, 32,200,961 bytes, was verified before zero-active-run cutover. Twenty parameters, nineteen unchanged; Task image and Service reference only. Rollback is ac66b272. Backup restoration and graph freshness remain unqualified. Final browser verification is pending at this checkpoint.

## Final live result and remaining gap

Actual Codex task `109e8852-ce12-5430-b782-f02e03d25784` on 6a96d47 generated one 12 × 9 m south-entry concept and revised it to 13 × 9 m. Both answers avoided the numbered execution recap and consistently described the saved result as an alternative. The revised answer is three concise sentences covering result, assumptions and validation limits, with no candidate/alternative distinction. Exported runs `b6f4a4a6-6b35-573d-bace-36c496f816b0` and `1e2e8ebd-c961-5fb9-aaa5-58a6b2a41ce8` each contain real design_ready and response_ready with 2/2. Plan `b6e718b4-b987-5b08-8291-2f4d7bc8c8ca` advanced v1 → v2. Shared usage rose five → nine calls, ending at 25,281 input / 10,298 output tokens with complete coverage. Five calls on generation do not prove answer correction ran; the record contains brief repair, not captured action-schema feedback. Bounded answer correction is controlled-test qualified.

**Remaining accuracy gap:** generation incorrectly said the requested checklist was not recorded, despite actual 2/2 backend evidence. This is preserved in the historical answer and disclosed rather than hidden. Removing internal task-plan context can encourage absence claims; the next refinement should provide truthful compact progress availability metadata or validate such absence claims without reintroducing duplicated narration. The two requested wording behaviors passed this tested journey, but overall summary reliability remains incomplete. No frontend source changed, so previous 526-test/build/type/runtime results are historical, not rerun here. No native action, approval, merge or full release occurred.

Reload restored the clean revision answer and 2/2 in chat and Activity, one alternative and exact 13,000 × 9,000 mm v2 drawing. Final normal-viewport screenshots are `artifacts/ux/concept-summary-final/chat-final.png` and `activity-reloaded.png`; the composer is empty and the verified task remains available. Both independent deployed-image checks passed complete CloudFormation, one completed ECS deployment / one running / zero pending, exact source/image, v2 contracts and four anonymous 401 checks. No native action or approval occurred.
