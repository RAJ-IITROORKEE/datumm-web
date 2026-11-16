# Count phrase recovery

The user requested repair of the phrase “one single-storey concept,” full generation/revision testing in the Codex browser and an updated handoff. The observed task `af12e1a7-5796-5b31-8791-137cce9cf071` asked for one concept, resolved conflicting provisional room areas and received three alternatives. The previous [room-default recovery](room-default-recovery.md) documents that live result.

The bounded repair must distinguish a requested count of concepts from building storeys, rooms, elements and examples; keep genuine ambiguity and explicit amendments visible; preserve the existing supported count limit, room-constraint confirmation, compaction and native-approval boundaries. Source starts from deployed backend `92463a2a9acc052245e193cb7ec25f7e96253452` in an isolated candidate. Independent review, real planner and image qualification, and the actual browser journey are required before claiming completion.

## Outcome — 15 November 2026

The hosted backend now recognizes the requested count in bounded phrases such as “one single-storey concept” and “one 2-bedroom single-storey concept.” It distinguishes the requested number of concepts from the number of bedrooms and storeys; ambiguous, conflicting, negated, historical and per-floor wording remains subject to the interpreter's existing safeguards. This is a targeted grammar improvement, not a guarantee for every possible wording.

The isolated backend candidate is commit `243b6bebc9fb29b476574bdec509821b59cfcc65`, parent `92463a2a9acc052245e193cb7ec25f7e96253452`, on `codex/count-phrase-recovery-20261115` in the isolated source repository under `artifacts/ux/count-phrase-recovery/`. The original Datumm-opencode checkout was not modified. The change covers `apps/domain-api/brief_interpreter.py`, its count regression checks, and `lat.md/planning.md`.

## Verification

- 125 backend API tests and nine subtests passed; `lat check` passed. Focused tests and the packaged planner covered the original wording, bedroom/storey distinctions, revision inheritance and explicit later changes. Independent review checked the final source and planner. The unchanged frontend's earlier test results were not rerun for this backend change.
- The verified archive SHA-256 is `42096db5b0a383d9526c90c286bdc807e5e56ddfdfa492a00ea35d44e52a6e5c`. Build `f787d0f6-878c-412d-877d-563dfe978703` passed the packaged planner, count and prior recovery gates. The deployed image is `sha256:9b94591b1d2fac67470cd7ca4b636575dcddc02a0d5e9372c896296ed9cc4d14`. The service completed its update and was verified healthy with one running task, no pending tasks, and the expected image. Protected anonymous endpoints returned 401. A fresh database backup was taken; restoration was not tested.
- In the Codex browser, task `b0fff27c-75ac-59b6-b5db-373b50a25c28` used the original “one single-storey concept” wording and infeasible provisional room areas. The service asked for confirmation of the specific proposed changes; the synthetic test approved those listed changes and the result contained **one** alternative on the 10 × 8 m footprint. The recorded explicit count was `1` from the original request.
- A follow-up requested an 11 × 8 m footprint while keeping the same number of alternatives. Version 2 showed **one** alternative and the exact 11,000 × 8,000 mm footprint. The conversation, review card and drawing restored after a browser reload.
- Separate task `d04dd051-a796-5f90-83f2-9d8c431a8568` requested one 2-bedroom single-storey concept. The browser showed one alternative and two bedrooms, demonstrating that room count was not mistaken for alternative count.

The room sizes and 700 mm widths in the synthetic retry were provisional geometric inputs, not a building-code or accessibility assessment. No Revit model was inspected or changed, and no native plan approval was granted. Live database interleaving for concurrent stale adoption was not exercised by the in-memory concurrency regression. Browser screenshots and qualification material are retained under `artifacts/ux/count-phrase-recovery/`.

