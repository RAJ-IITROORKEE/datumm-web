# DATUMM handoff

Overwritten at every checkpoint. Read [AGENTS.md](../../AGENTS.md) first, then this file, then the packet named under "Active phase". Older detail is in Git history and [docs/ux/history/](history/handoff-before-agui-progress-review-2026-11-16.md).

Updated 21 November 2026 after the architectural agent MVP planning review.

## Architectural agent MVP (21 Nov)

Phase 1 of the [architectural agent and retrieval MVP](architectural-agent-mvp-2026-11-21.md#phase-1-local-result) passed local browser checks. The 3BHK Ask and Plan results stayed readable after save and reload. The checklist distinguished confirmed steps from a finished response. Phase 2 covers autonomous planning and dispatch. The Q1 production rollout has a separate trace window and approval.

[Phase 2A](phase-2a-plan-revisions.md) now rejects cosmetic plan revisions before they can replace the saved checklist. The backend change is local on `codex/agent-plan-revisions` at `fdc7820`. A controlled offline 3BHK run on that commit recorded two completed steps and published a verified room report. Phase 2 continues with stable identity through substantive revisions.

## Now (20 Nov)

- **W1 live.** Vercel serves web `1b92fc4` and the backend health endpoint reported `8b6e4ea`. All 19 production smoke checks passed. A signed-in workspace showed Activity, Files and scoped Exports. A synthetic Ask reopened after an in-progress reload and showed one saved prompt and a completed answer. See [W1 packet and results](w1-agui-work-area.md).
- **A4c MCP live.** The AWS change set added the secret reference to the ECS API task. CloudFormation completed the update, ECS reported 1/1 tasks, and the backend stayed on `8b6e4ea`. Microsoft Learn discovery found three tools and one approved read-only search returned data. The test server is registered and off. See [A4c results](a4c-mcp-registry.md#11-result-fill-at-checkpoint).
- **N4 live.** CloudFormation and ECS finished the flag rollout on backend `8b6e4ea`. In a signed-in synthetic Ask on web `1b92fc4`, the saved card opened historical Revision 1 before and after reload. Its stored revision ID and content hash matched the saved reference. All 19 production smoke checks passed. See the [N4 production result](n4-evidence-backed-compositions.md#10-production-activation).
- **Q1 is next.** The production flag is off. A read-only aggregate on 20 Nov found 18 `full` / `flag_off` traces and zero short-lane runs. The first qualifying trace was 17 Nov at 05:05:04 IST. Recheck seven days of trace coverage and get the separate activation approval at or after 24 Nov at 05:05:04 IST. See the [go-live plan](g1-go-live-plan.md).

## Now (19 Nov)

- **Way of working since 17 Nov:** work on local `main`, test in the built-in browser on localhost, push, release backend (scratchpad `release_psec.sh`) and web (Vercel), then test live. Phase packets and results are in `docs/ux/w*.md`; PLAN.md has one row per wave. The "Hold" notes below are from 17 Nov and are superseded by that.
- **Live now:** backend `d569fda` (V3b plus hotfix), web `0d10531`. **CV3a done** (desktop `68b5259`): the shared shell behind `DATUMM_SHARED_SHELL=1`. Re-sync with `npm run sync:desktop` after shell changes, and check with `npm run check:shared-sync` in the orchestrator. Next on this track: the local sidecar AG-UI contract (commandId, commandReceipts, answer), CV4 slots, and the CV5 CI gate.
- **Deferred by the user (19 Nov: "skip the revit actual test and record this, we will do it later"):**
  1. Add `get_model_warnings` and `get_room_boundaries` to the DATUMM add-in. Blocked on the source: `revit-datumm-plugin` is mid-change (45 uncommitted entries, `revit-mcp/` and `apps/connector/` deleted on disk) and is at alpha.28, while the installed add-in is 0.5.0-alpha.40 from another source. Ask the user where the alpha.40 source is. Then build, package, and reinstall with Revit closed. Contracts are in `apps/desktop/src/main/native-warnings.ts` and `room-connections.ts`.
  2. Live test on the architect's Revit: warnings appear (and the delta after an edit in Revit), compare-plan against a plan built in Revit, and the plan-to-model boundary overlay (needs `get_room_boundaries`).
  3. Check the V3a device refresh live: the Revit tab appears without a reload when Revit connects after the page loaded.
- **Open user decisions:** main-door NBC note (advice / 900 mm / 1000 mm); confirm the 14 NBC rows (including the 22.5 m travel distance); the meaning of "JEV" (model routing track).

## Now (17 Nov, history)

- **Hold:** the roadmap is approved (16 Nov). No application code changes until the user approves each phase packet. Do not deploy, merge to a remote, release or push. AWS login is unavailable; do not request it. The user's direction (17 Nov, D24): this work is going to the live site (backend on AWS, web on Vercel) after approval of [the go-live plan](g1-go-live-plan.md); nothing has been pushed or deployed.
- **Branch:** both repos are on local `main`, not pushed (web is ahead of `origin/main`; the backend `origin` is a local folder). Backend S0 to A3 are local commits on `main`. A preview launch config for the dev server is at the workspace root `Datumm/.claude/launch.json` (outside both repos).
- **Real-site local test (17 Nov):** `datumm-web/.env.local` has `ORCHESTRATOR_URL=https://localhost:8443`; the original value is in `.env.local.bak-a3` (both git-ignored). Restore it before any real use. A local https backend with in-memory Mongo and no provider key runs from the session scratchpad (`local_backend_real.py`, with a self-signed certificate); the dev server is started with `NODE_EXTRA_CA_CERTS` pointing at that certificate. The first Clerk user verified becomes admin on that throwaway server only. Chats that need a model cannot run there; admin pages and the "hi" short path can.
- **Subagent routing (user, 16 Nov):** Haiku (high effort) for mechanical code and file work, Sonnet (high) for moderate implementation and coordination, Opus for planning, research, review and bug fixes. Implementer and reviewer stay separate.
- **Scope changes by the user on 16 Nov** (logged as D22 and D23 in [PLAN.md](../../PLAN.md)): AG-UI with affectUI across the whole app in phases, middle chat first; connect the UI to the existing harness first, then expand admin capability. Panda-agent is a read-only reference.
- **Decisions on the research (16 Nov):** detect capabilities per backend; backend work on a fresh local branch from `188ebc0` with the candidate patches re-applied; admin scope is traces and feedback, versioned config and audit, model registry, MCP and skills registry; the model router is deferred. Findings: [research record](research-reference-and-harness-2026-11-16.md).

## Active phase

| Phase | Status | Next action |
| --- | --- | --- |
| S0 | Done: [packet](s0-source-verification-and-baseline.md) | none |
| C1 | Done 16 Nov: [packet and result](c1-capability-contract-and-config.md) | Decide `history/done` and the unused `organizeDone`; browser scenarios were not run |
| N1 | Done 16 Nov: [packet and result](n1-durable-completion-proof.md) | Real-Mongo plan and index build checks belong to G1 |
| N3 | Done 16 Nov: [packet and result](n3-tool-task-subagent-lifecycle.md) | Hosted verification belongs to G1 |
| N2 | Done 16 Nov: [packet and result](n2-frontend-capabilities-reversible-actions.md) | Live-model and hosted checks belong to G1 |
| A1 | Done 16 Nov: [packet and result](a1-admin-traces-feedback.md) | Provision `TRACE_OWNER_HASH_SECRET` and check index behavior at G1 |
| A2 | Done 16 Nov: [packet and result](a2-admin-versioned-config-audit.md) | Index and duplicate-key behavior on real Mongo belong to G1 |
| N4 | Live and verified 20 Nov. [Production result](n4-evidence-backed-compositions.md#10-production-activation) | Keep the live flag in later production template updates |
| Q1 | Implemented 17 Nov. [Packet and result](q1-rules-prerouter-latency.md) | Recheck the seven-day flag-off trace baseline on or after 24 Nov at 05:05 IST, then get separate activation approval |
| A3 | Done 17 Nov: [packet and result](a3-admin-model-registry.md) | Live provider tests, real prices and rollback behavior belong to G1 |
| U1 | Done 17 Nov: [packet and result](u1-nextjs-security-upgrade.md) | Vercel build behavior is checked in the W1 preview log |
| UI1 | Done 17 Nov: [packet and result](ui1-composer-and-sidebar.md); web live | Backend `modelInfo` (`95b2361`) goes live with the A3 backend release; next phase per the [parity plan](panda-parity-plan-2026-11-17.md) (H5 = A) |
| H0 | [Harness decision](harness-decision-2026-11-17.md) approved 17 Nov | Keep the LangGraph backend, go live first, then UI1, T1, A4a, A4b, N5 |
| G1 | [Go-live plan](g1-go-live-plan.md) approved 17 Nov (D1 to D12, all recommended options) | Read-only AWS checks done 17 Nov (live backend is `188ebc0`; production uses a Clerk development instance; see the plan's AWS check results). P5 done (about 35,900 documents; indexes are trivial). P3 done (stored admin config is empty, so the picker and effort do not change at deploy). Still open: P8 (Vercel env names), Q-10 (preview origin); then P11 to P13; AWS steps are run by the user and agents prepare commands (D8 A); each push, merge or deploy still needs its own approval. W1, A4 and N5 remain proposed |

Phase table: [PLAN.md](../../PLAN.md#phases). Packet format: [PACKET_TEMPLATE.md](PACKET_TEMPLATE.md).

## Last verified

| Check | Result | Date / how |
| --- | --- | --- |
| `npm run typecheck`, `npm test` (788), `npm run build`, `lat check` | Passed on Next.js 16.4.6; build exit 0 in 5 of 5 runs (on 16.4.3 it stopped on an agent-only advisory reminder, see U1) | 17 Nov, Node 24.18.0, end of U1 |
| Runtime smoke `--production` (18 checks; 3 `/api/chat` checks removed in C1) | Passed 18 / 18 | 17 Nov, fresh `next start` on port 3100, end of U1 |
| Recorded source hashes (`artifacts/ux/agui-presentation/qualification.json`) | Superseded for files C1 edited; four web entries reported stale before C1 (see [C1 result](c1-capability-contract-and-config.md#11-result)) | 16 Nov, reviewer; not re-verified |
| Backend suite (`uv run --frozen pytest`) | 530 + 26 subtests; `lat check` passed | 17 Nov, Python 3.12.10, end of A3 |
| Browser scenarios | A3: Models page, disable and save, Config history revision, test dialog and "Provider not configured" error passed on the real signed-in localhost site against the local backend (built-in browser). Q1 scenarios 1–4 passed on the `/dev/ux` Admin fixture (built-in browser, 1280 px, and 390 px dark); N4, A2, A1, N2, N3 and N1 passed earlier; C1 scenarios not run | 16 Nov, see [N1 result](n1-durable-completion-proof.md#12-result) |
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
| Live-provider composition quality | Not established (provider streaming and timing measured live 19 Nov: [W6b](w6b-answer-streaming.md)) | [full-migration-gap-register.md](full-migration-gap-register.md) |

Since 19 Nov the answer streams as a labelled draft from the provider (`finish_answer` answer field), and the checked answer replaces it; the saved answer is always the checked one.

## Source locations

| Checkout | Branch / base | State |
| --- | --- | --- |
| Web `E:/Web development/PROJECTS-FULL STACK/Datumm/datumm-web` | `main` (the old `codex/ui-ux-foundation-2026-11-12` is merged into it locally) | Committed, not pushed |
| `artifacts/ux/agui-presentation/candidate` | `codex/agui-chat-presentation-20261116`, base `188ebc0bc0599ff84f3760aaef24711e522972ae` | Uncommitted producer, projection and storage changes plus a copy of the Plan-intent repair; locally qualified, undeployed. Backed up as a patch in [docs/backend-candidates](../backend-candidates/README.md) |
| `artifacts/ux/checklist-completion/candidate` | `codex/agui-plan-intent-20261116`, same base | Original five-file Plan-intent repair, frozen; do not overwrite or reset |
| Original backend clone | `codex/alternative-count-clarification-20261116`, commit `4eb6135862fcd6083d798f5eaff4f9c1e4a79f00` | Paused and excluded from the producer candidate; its own qualification gates are open |
| Backend working checkout `E:/Web development/PROJECTS-FULL STACK/Datumm/datumm-orchestrator` | `main` (same history as `codex/web-ui-harness-20261116`), based on `188ebc0` | Presentation patch and phases C1 to A3 committed locally; origin is the candidate folder, not GitHub; not pushed. All backend phases build here |
| `../datumm-web-ask-recovery` | `codex/independent-ask` | Unmerged, two uncommitted files; untouched |
| `../_archive/datumm-web-artifacts-archive-2026-11-16` | n/a | Archived evidence from the cleanup; old packets cite it as `artifacts/ux/<name>` |

Live backend since 17 Nov 08:00 UTC: `115980f` (A4b; images now from the public.ecr.aws mirror), image `sha256:f97db082…`; before that `1e67551` (T1 code, A4a, `b0c06874…`); before that `95b2361` (A3 + UI1 `modelInfo`, `70f618ff…`); before that `70ce912` (`bb926402…`) from 16 Nov 23:09 UTC. Original: source 188, image `sha256:6af54c878220f1117b316c3a414dda35f88f93ec3cee3dd7470270f4e88d378c`; not revalidated on AWS since.

## Guardrails that carry across phases

Owner, task, turn, execution and workspace-epoch isolation; durable commands, idempotency, receipts and recovery; versioned questions and saved drafts; immutable plans and reports with exact-source exports; native approval bound to the reviewed document, revision and proposal; full-answer fallback when presentation validation fails. Composition, navigation, Markdown or a saved answer never authorizes a Revit change. Details: [AGENTS.md](../../AGENTS.md#6-rules-that-never-bend).

## Cleanup record, 16 Nov

Caches (`.next`, `.npm-cache`, `.pytest_cache`) deleted; three unused source files removed (`ai-elements/reasoning.tsx`, `lib/studio-pipeline.ts`, `vendor/opencode-question.ts`); planning reports moved to `docs/egm/` and `docs/agui/`; 393 old artifact entries archived beside the repo; three merged worktrees and 17 merged branches removed; local `main` fast-forwarded to `origin/main`. Nothing was deleted from evidence.
