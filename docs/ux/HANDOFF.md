# DATUMM handoff

Overwritten at every checkpoint. Read [AGENTS.md](../../AGENTS.md) first, then this file, then the packet named under "Active phase". Older detail is in Git history and [docs/ux/history/](history/handoff-before-agui-progress-review-2026-11-16.md).

Updated 16 November 2026, end of S0.

## Now

- **Hold:** the roadmap is approved (16 Nov). No application code changes until the user approves each phase packet. Do not deploy, merge, release or push. AWS login is unavailable; do not request it.
- **Branch:** `codex/ui-ux-foundation-2026-11-12`, 18 commits ahead of `origin/main` after the P2 commit, working tree clean, not pushed.
- **Scope changes by the user on 16 Nov** (logged as D22 and D23 in [PLAN.md](../../PLAN.md)): AG-UI with affectUI across the whole app in phases, middle chat first; connect the UI to the existing harness first, then expand admin capability. Panda-agent is a read-only reference.
- **Decisions on the research (16 Nov):** detect capabilities per backend; backend work on a fresh local branch from `188ebc0` with the candidate patches re-applied; admin scope is traces and feedback, versioned config and audit, model registry, MCP and skills registry; the model router is deferred. Findings: [research record](research-reference-and-harness-2026-11-16.md).

## Active phase

| Phase | Status | Next action |
| --- | --- | --- |
| S0 | Done: [packet](s0-source-verification-and-baseline.md) | none |
| C1 | Not started; packet not written | Write the C1 packet (capability contract, config consistency, contract hygiene) and ask the user its three decisions: `goal`, `history/done`, `/api/chat` |

Phase table: [PLAN.md](../../PLAN.md#phases). Packet format: [PACKET_TEMPLATE.md](PACKET_TEMPLATE.md).

## Last verified

| Check | Result | Date / how |
| --- | --- | --- |
| `npm run typecheck`, `npm test` (603), `npm run build` | Passed | 16 Nov, Node 24.18.0, after the cleanup commit |
| `lat check`, Markdown link check (123 files) | Passed | 16 Nov, after the docs commit |
| 32 recorded source hashes (`artifacts/ux/agui-presentation/qualification.json`) | All matched | 16 Nov, before and after cleanup |
| Backend suite on the new checkout | 132 + 9 subtests on clean `188ebc0`; 180 + 26 with the presentation patch; `lat check` passed | 16 Nov, Python 3.12.10 |
| Runtime smoke (21 checks), browser | **Not rerun** | Last recorded 16 Nov earlier, in the qualification file and [producer packet](agui-composition-producer.md) |
| Code graph freshness (backend) | Unresolved | Refresh refused semantic-node loss; no destructive rebuild |

Node 22.18 or newer is required for `npm test`. The default `node` here is 20.13.1; Node 24.18.0 is at `%LOCALAPPDATA%\Programs\node-v24.18.0-win-x64`.

## What exists (as recorded; source verification is the first step of P4)

| Area | Recorded status | Evidence |
| --- | --- | --- |
| AG-UI endpoint and client transport over durable v2 commands | Implemented, tested locally | [agui-chat-migration.md](agui-chat-migration.md) |
| Grouped-question resume | Implemented, tested; generic multi-interrupt resume unfinished | [agui-chat-continuation.md](agui-chat-continuation.md) |
| Process grouping, conservative history status | Implemented, tested | [agui-local-chat.md](agui-local-chat.md) |
| Bounded composition registry and client hash gate | Implemented, tested | [agui-local-chat.md](agui-local-chat.md) |
| Composition producer (finish tool, checkpoint, projection) | Controlled local only: controlled model decisions with Mongo mock; not deployed; proof lost after the 2,000-event tail | [agui-composition-producer.md](agui-composition-producer.md) |
| General Plan intent repair | Local candidate only, not deployed | [agui-chat-continuation.md](agui-chat-continuation.md) |
| Workspace, onboarding, settings, pricing, review, admin pages | Implemented; browser-qualified in earlier scoped packets | [workspace-acceptance-upgrade.md](workspace-acceptance-upgrade.md), [implementation-checkpoints.md](implementation-checkpoints.md) |
| Provider token streaming, live-provider composition quality, hosted rollout, measured performance | Not established | [full-migration-gap-register.md](full-migration-gap-register.md) |

Final answers are delivered after validation, not as true provider token streaming.

## Source locations

| Checkout | Branch / base | State |
| --- | --- | --- |
| Web `E:/Web development/PROJECTS-FULL STACK/datumm-web` | `codex/ui-ux-foundation-2026-11-12` | Committed, not pushed |
| `artifacts/ux/agui-presentation/candidate` | `codex/agui-chat-presentation-20261116`, base `188ebc0bc0599ff84f3760aaef24711e522972ae` | Uncommitted producer, projection and storage changes plus a copy of the Plan-intent repair; locally qualified, undeployed. Backed up as a patch in [docs/backend-candidates](../backend-candidates/README.md) |
| `artifacts/ux/checklist-completion/candidate` | `codex/agui-plan-intent-20261116`, same base | Original five-file Plan-intent repair, frozen; do not overwrite or reset |
| Original backend clone | `codex/alternative-count-clarification-20261116`, commit `4eb6135862fcd6083d798f5eaff4f9c1e4a79f00` | Paused and excluded from the producer candidate; its own qualification gates are open |
| Backend working checkout `E:/Web development/PROJECTS-FULL STACK/datumm-orchestrator` | `codex/web-ui-harness-20261116`, commit `e8cefa7` on `188ebc0` | Presentation patch applied and committed locally; origin is the candidate folder, not GitHub; not pushed. All backend phases build here |
| `../datumm-web-ask-recovery` | `codex/independent-ask` | Unmerged, two uncommitted files; untouched |
| `../datumm-web-artifacts-archive-2026-11-16` | n/a | Archived evidence from the cleanup; old packets cite it as `artifacts/ux/<name>` |

Last recorded deployed backend: source 188, image `sha256:6af54c878220f1117b316c3a414dda35f88f93ec3cee3dd7470270f4e88d378c`; not revalidated on AWS since.

## Guardrails that carry across phases

Owner, task, turn, execution and workspace-epoch isolation; durable commands, idempotency, receipts and recovery; versioned questions and saved drafts; immutable plans and reports with exact-source exports; native approval bound to the reviewed document, revision and proposal; full-answer fallback when presentation validation fails. Composition, navigation, Markdown or a saved answer never authorizes a Revit change. Details: [AGENTS.md](../../AGENTS.md#6-rules-that-never-bend).

## Cleanup record, 16 Nov

Caches (`.next`, `.npm-cache`, `.pytest_cache`) deleted; three unused source files removed (`ai-elements/reasoning.tsx`, `lib/studio-pipeline.ts`, `vendor/opencode-question.ts`); planning reports moved to `docs/egm/` and `docs/agui/`; 393 old artifact entries archived beside the repo; three merged worktrees and 17 merged branches removed; local `main` fast-forwarded to `origin/main`. Nothing was deleted from evidence.
