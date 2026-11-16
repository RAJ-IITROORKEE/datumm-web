# Saved report revision history

15 November 2026. The scoped proposed-concept schedule history is implemented, deployed and qualified under the user's authorization to continue the next UI/UX plan step with Terra 6.1 High subagents. This does not close the full D9 native BOQ/report contract or broader release.

## Chosen next step

The hosted Project Brief is qualified. D9's immutable output history remains open: the current report export is reconstructed from task evidence when requested, and source model revisions are not report revisions. This slice adds saved, exact-source proposed room schedules for the primary concept generate/review/revise journey. Native measured BOQ history and a general report-editing language remain separate.

Capture a validated proposed schedule at successful server finalization; expose an owner-scoped history manifest, explicit immutable revision retrieval and revision-bound CSV/JSON. Opening or exporting must not create a revision. Repeated reads and unchanged-source completions must not create duplicates. Failed, cancelled or stale work must preserve the previous ready revision. New successful revisions become current automatically, while a user reading history stays on that chosen revision until returning to current.

## Source and UI boundaries

Bind each schedule to the exact stored PlanGraph ID, version and fingerprint supplied by the service's current-plan contract at capture time. Areas are proposed room geometry, not native quantities or compliance results. Current report means latest saved output; it is not a promise that it always follows later drawing selection. Mongo is standalone, so no cross-document transaction guarantee is inferred for plan selection and report publication.

Use the existing affectUI theme, pinned free Change Summary component and compact report table. The selected reference map remains canonical: [Change Summary](https://www.affectui.com/components/change-summary), [Data Table](https://www.affectui.com/components/data-table) and [Review Center](https://www.affectui.com/components/review-center). On this pass the Change Summary public page was inspected: short metric rows, a description list, decorative trends whose text carries meaning, and reduced-motion behavior. No Pro source was obtained.

Legacy tasks without saved revisions retain their existing evidence view with an explicit legacy label. History, model-source revision, report revision and plan version remain distinct. Scope requests and late callbacks by account, task, epoch and report view identity. Exports must use the viewed immutable dataset, including while a newer current revision exists. No native approval, grant, model edit or automatic prompt submission is introduced.

## Required verification

Backend ownership, exact-source and stale-publication guards; immutable revision identity and hash; idempotency and real Mongo concurrency; historical CSV/JSON export with safe text and complete rows; failed-generation preservation. Frontend legacy/error/loading/ready/history/current states, draft/focus isolation and narrow layout. Actual Codex browser generation, room schedule, revision, history, explicit return to current, download identity and reload. Independent review and deployed source/image verification precede final acceptance.

## Source and service qualification

Backend source `1ef3861b2e5186151df387a1e2e5a20e99f8d0c1` directly follows `923dcf03cc77c8cc3e503b563ae300bbc348c433`. The original dirty desktop checkout was not modified. Final backend checks passed 132 API tests and nine subtests with two existing warnings, plus `lat check`. Graph refresh again refused to overwrite 43 missing saved semantic nodes; freshness remains open.

The frozen archive is 175 entries, 732,782 bytes, SHA-256 `b6b29910e8fda0b8204a30b1bfe3762c9dd6bcfb624a3a32fdf508a179490f30`. Build `eba8f31b-3121-4ca1-8593-ec843a023e5c` passed all inherited planner/count/compaction/flexible-room/native/Project Brief gates and the real Mongo report gate. Independent review covered all 464 build events. The first attempt failed because a qualification helper assumed a case-sensitive HTTP header; the helper was corrected and the same backend source passed the repeated build.

Image `sha256:5501a05ca2b9434b1a55d3308c0dc035582a992a34710365f9b9d2ea24709906` is deployed. A fresh 31,830,230-byte database backup and zero-active-run check preceded the reviewed image-only update. All 20 parameters were accounted for, with 19 unchanged. CloudFormation reached UPDATE_COMPLETE and ECS one running, zero pending, one completed deployment. Independent running-image/source checks, v2 contracts and anonymous report/config/task 401 checks passed. Backup restoration was not tested.

The service keeps up to 256 immutable revisions per task and stops new publication at capacity rather than discarding history. Publication uses an insert-only deterministic snapshot and task-head compare-and-swap; interrupted publication has durable pending recovery. Exact source capture and task-version fencing are tested. Selection and direct v1 cancellation remain separate Mongo documents: their observation can race publication, so this is not a multi-document transactional guarantee. V2 task commands are fenced by task version. The current report is a saved output, and the UI warns when its source differs from the selected drawing.

Final frontend gates passed 520 tests, optimized build, standalone TypeScript and 13 production runtime checks. Source review corrected history pagination, exact source validation, pending refresh and current-plan mismatch messaging. The temporary production server was stopped; development on port 3001 remains available. Older tasks remain clearly labelled legacy evidence rather than gaining fabricated history.

## Browser evidence so far

Actual Codex task `6a4cde35-1697-5f5f-955c-fe679ecb3c8b` generated one two-bedroom 12 × 9 m concept and automatically saved report revision 1 with six proposed room-area rows. With the report left open, a real 13 × 9 m revision completed on plan version 2 and automatically advanced the report to revision 2. Both immutable datasets passed independent canonical SHA-256 verification. Reading and refreshing did not create additional revisions.

Selecting historical revision 1 retained its original six values, showed a historical/source-mismatch notice and offered explicit View current report. The revision-1 CSV downloaded before and after revision 2 was byte-identical. Returning to current displayed the revised values. The drawing still showed exact 13,000 × 9,000 mm geometry and its schematic 3D view loaded. Reopening the report after a full reload restored current revision 2 with revision 1 still selectable. A reopened report starts at current; historical choice is retained while the report remains open, rather than persisted as a browser preference.

At a 390 × 844 CSS viewport, document width stayed 390 px, the revision selector used 16 px type, and the 500 px table remained inside a 348 px keyboard-scrollable region. Arrow keys moved its horizontal scroll without page overflow; close/reopen restored the report and its focus. Physical-touch gestures and a separate real-account session were not tested. Failed publication, concurrency and ownership have controlled real-Mongo/API and UI tests; no production failure or cancellation was injected into this browser run.

The normal viewport was restored, network capture disabled, temporary reference/legacy tabs closed and the verified task left open on current report revision 2 with an empty composer. Evidence under `artifacts/ux/report-revision-history/` includes exact public revision payloads, manifest, independent canonical/hash and CSV comparison receipt, actual downloads, desktop/history/narrow screenshots and logs. No plan acceptance, native grant/write, allowance reset, merge or full release occurred.
