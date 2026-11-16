# Alternative-count clarification

16 November 2026. The user requested a recheck of prior work, then progression to the recommended next step with subagents. The latest recommendation was ask once when the design-output count is unclear, then remember its versioned answer. This continuation adopts that path; the rejected default-one experiment remains historical evidence.

## Prior-work gate

Current frontend tests passed 535/535 and TypeScript passed. All 24 acceptance-file hashes match their recorded values. The earlier production build, 13 runtime checks and wider browser journeys retain their original scope; the whole working tree was not hashed in that qualification. Fresh Codex reload restored the saved 14 × 9 m v3 and its concise answer. Activity again showed actual steps, no invented checklist, 34,540 input / 8,766 output shared usage and separate latest-request context estimate. Screenshots/logs are under `artifacts/ux/recheck-2026-11-16/`.

## Bounded implementation

- At actual fresh `create_design` admission, require a source-bound alternative count before generation. Ask the existing canonical versioned one-to-three question when absent. Explicit supported counts retain precedence; existing ambiguous/out-of-range handling remains.
- Use the existing answer receipt and interpreted brief source rebuild. Do not store an inferred default as an explicit user fact. Exact confirmed count questions stay suppressed after a valid answer; invalid or stale answers do not establish a count.
- Selected-design revisions without a new count retain their existing behavior. General Ask, selection, material discussion and native paths do not acquire a global count question.
- Check count admission before claiming a flexible retry, preserving authorization for the resumed execution. Source-less legacy checkpoints that cannot ingest a count answer require an honest bounded recovery instead of a repeated question or silent generation; source-backed version-2 checkpoints must remain supported.
- No new schema, provider, dependency, inferred singular-home parser, native authority or UI redesign is included.

## Validation and progression

Terra 6.1 High implementation and independent design/source review use an isolated branch from deployed `188ebc0`. Preserve the rejected experiment and its two counterexamples, then gate generation/question/revision dispatch, actual versioned receipts, source rebuild and old checkpoint behavior. Run focused/API/lat checks and independent review before source freeze. Exact-source container and actual hosted generate → clarify → revise → reload remain separate gates; AWS CLI renewal is currently required. No claim of arbitrary natural-language count interpretation or complete live qualification follows from mocked external IO tests.

Current state: **paused by the subsequent AG-UI research-only request**. Local implementation and scoped independent review finished; commit `4eb6135862fcd6083d798f5eaff4f9c1e4a79f00` is on isolated branch `codex/alternative-count-clarification-20261116`, parent `188ebc0bc0599ff84f3760aaef24711e522972ae`. It is not deployed. The six Python committed files match the tested manifest; `lat.md/planning.md` is content-identical after newline normalization but differs in literal CRLF/LF bytes, so the final seven-file byte assertion failed after the successful commit. No source-identity receipt was written by that interrupted gate. Do not repeat the commit or mark exact-source packaging/container qualification complete.

The final local manifest records passing count/default-room/flexible-retry/completion/grounding/compaction/receipt checks, API132 +9 subtests and lat. Graph extraction freshness remains failed. A semantic count-source namespace preserves confirmed answers across unrelated generic-input questions; the compatibility path accepts an old retry binding only when reconstruction exactly matches its frozen full source digest. Lost legacy evidence is not fabricated. Local package helpers and a synthetic fixture exist; real-planner/container/hosted generate-and-revise acceptance is pending. See [current handoff](HANDOFF.md) for exact resumption steps and [new architecture roadmap](../agui/AGUI_MIGRATION_PLAN.md) for the separate, unapproved AG-UI proposal.
