# Supplied footprint question recovery

Started 14 November and qualified 15 November 2026 after [deliverable and native intent clarity](deliverable-review-clarity.md). The user approved repair of redundant footprint questions, full browser generation/revision tests and a handoff update using Terra 6.1 High workers. The reported case is fixed and live; the separate alternative-count limitation below remains open.

## Reproduction and cause

Actual task `b592fd19-ac00-525e-b88b-ac9cdc62c0b8` supplied “building footprint 10 m wide and 8 m deep” but received a required footprint question. Answering it produced two alternatives. Independent source investigation identified the deterministic dimension parser: it accepts the equivalent `wide by … deep` form but not `wide and … deep`, leaving the authoritative brief empty.

## Bounded repair and validation

Repair the shared brief interpreter, retaining the difference between parcel and building dimensions, source-backed values and real ambiguity. Conflicting dimensions must still ask; ignored examples must not become instructions. Preserve explicit amendments, native approval and task/turn ownership. No question is hidden only in the frontend.

Use a clean candidate exported from deployed `b79f2c99228b26d607973a0f158f32b7a25d6582`, excluding unrelated dirty backend work. Require regression and independent review, an exact-source child commit and packaged-image check, fresh backup and reviewed image-only update before hosted browser qualification.

Test a fresh request using the original wording, inspect the resulting footprint and alternatives, request a real dimensional revision, check preserved source and updated geometry, reload and inspect 2D/schematic 3D. Record any intentional clarification or provider failure separately. No Revit model write or automatic native approval is part of this web-only journey.

## Source and deployment qualification

Frozen source `e650512f7f57f25ab93256f1854d566ef1c41649` is a direct child of the previously deployed b79 baseline on `codex/footprint-question-recovery-20261114`. Its four-file diff contains the shared brief interpreter, two additional receipt regressions, a standalone admission check and planning notes. Original dirty backend work is excluded. The parser recognizes labeled `and` pairs, preserves same-source conflicting values for clarification, keeps that clarification through the repeat filter and masks explicitly quoted `example` content. It is not a general natural-language quotation classifier.

Independent source and archive review passed. Final local checks passed 124 API tests plus nine subtests, all 27 receipt regressions, the actual admission-node smoke check and `lat check`. The source graph refresh refused to overwrite missing saved semantic nodes; its freshness check remains a separate pre-existing limitation. No graph overwrite was forced.

AWS access was renewed. Archive SHA-256 `71330fb6cc1d38fdda7f4d88f0735051517232d418fef89b295373622d19675d` contains 166 entries / 715,171 bytes. Build `51cee921-ebad-4751-b1ed-badec127f99a` passed exact source, prior planner/revision/provenance/usage/native/history checks, the new footprint admission check, isolated Mongo/API checks and cleanup. Independently reviewed image: `sha256:9bfb4437db3fd0549401a64c49754d9a5e3b37d2b62227705497b33a074cd1a0`. Fresh backup `mongodump/20261114T181808Z.archive.gz` is 31,236,529 bytes; restore capability is not established. Independent deep review confirmed only the API image and Service task reference changed, with the remaining parameters and infrastructure preserved. The final quiet check returned zero active runs. Cutover reached CloudFormation UPDATE_COMPLETE, ECS one running / zero pending on one completed deployment, exact source/image and anonymous 401 responses. Version 2 checkpoint compatibility remains required for rollback.

Frontend qualification passed 500 tests, optimized build, standalone TypeScript and 13 production runtime checks. No frontend behavior or visual theme was changed in this repair. The temporary production server on 3100 was stopped; development on 3001 remains available.

## Actual browser generation and revision

Fresh localhost task `4cb1576c-5f2c-5fd2-8f8e-0a28e03e477b` used the original prompt unchanged. It generated two alternatives without a clarification. The saved brief records the exact original span `10 m wide and 8 m deep`, explicit footprint role, 10,000 × 8,000 mm and no unresolved fields. The loaded graph independently of the answer text has that footprint and a south entrance.

Selected plan `19446fc2-340e-5fac-80dd-a525a0517b70` version 1 / fingerprint `1ee7cd9ced59ab66ec4e7f9f60aebf9b07953ecb80eb4468f4bdd3ac291790ee` survived reload. Review properties and the unsent Revise brief action worked. The actual revision changed the footprint using `11 m wide and 8 m deep`; it completed without a clarification. The saved amendment supplies 11,000 × 8,000 mm, and the loaded graph agrees. The same plan advanced to version 2 / fingerprint `0b750d572a1f6c600caefb6e44459a1d7605490cdf235f2effaa8b4a0c10d10e`. Generation used three model calls; the owned shared ledger reached seven cumulatively after revision without a reset. Both saved tasks report completed, and their transcript has one prompt/answer pair per request, not an extra clarification exchange.

The previous-version comparison loaded both versions and reported five changed rooms and footprint/entry change. It retained the disclosure that server diff fingerprints are not independently verified. Closing it left version 2 selected. Desktop 2D and schematic 3D, 390 px 3D Fit, and 320 px white-sheet Fit remained bounded. The downloaded `datumm-Concept-1-19446fc2-340e-5fac-80dd-a525a0517b70-v2-2d.pdf` has one page; rendering and visual inspection confirmed 11,000 × 8,000 dimensions, current room labels and version 2/reference footer.

## Limits and next work

The revision produced three new alternatives despite the request for two. The footprint admission repair is qualified; alternative-count consistency remains a separate orchestration follow-up. No live ambiguous/parcel-only request was added in this browser run; those refusal and clarification cases are covered by controlled tests. Interpreter policy reported ready with automaticFallback=false and literalFallback=true; that is not a claim that all provider fallback paths were exercised.

No native Revit tools, plan acceptance, placement preparation, automatic grant, model write or allowance reset occurred. Native/RVT import/rendering, populated models, native write/read-back, durable editable project memory, BOQ revision history, billing, research quality and source-graph freshness remain separately scoped. No merge or full product release.

Evidence is under `artifacts/ux/footprint-question-recovery/`: exact source/archive/build/image/deployment receipts, test logs, generation/revision public records and loaded drawings, comparison/narrow screenshots and downloaded/rendered PDF. Temporary AWS sign-in was closed, private verification scratch files removed, device emulation cleared and response inspection disabled. The verified localhost task remains open at the normal desktop width with an empty composer and version 2 selected.
