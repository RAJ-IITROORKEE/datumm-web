# DATUMM progress and review handoff

Updated 16 November 2026 (Asia/Calcutta).

## Review hold — start here

The user requested this progress/plan update and will review before continuing. **Stop application development here. Do not automatically start another phase, renew AWS login, deploy, merge or release.** Resume only when the user returns with instructions. The earlier approval of chat-only Option B through A remains the scope; this hold overrides earlier automatic progression.

Read this file, [PLAN.md](../../PLAN.md), [AG-UI phase status](../../AGUI_MIGRATION_PLAN.md#review-checkpoint--16-november-2026), and [the latest producer packet](agui-composition-producer.md). The entire previous handoff is preserved in [the review archive](history/handoff-before-agui-progress-review-2026-11-16.md). Older “next” instructions are historical.

## Product and scope

DATUMM is a web playground for individual Revit/BIM users: ask, generate, review and revise concepts, inspect drawings and outputs, and request separately approved native operations. Existing affectUI theme/Inter typography, compact navigation, stable chat and larger right work area remain the design foundation. [PLAN's Component reference map](../../PLAN.md#component-reference-map) remains the reference index.

Latest migration scope is **middle chat only**: AG-UI transport, public process/tool/task activity, questions and agent-composed responses. Further right-work-area/floor-plan shared-state migration and admin expansion are deferred. Do not expose private model reasoning or permit generated executable UI. Placeholder-only suggestions and exact Revit approval boundaries remain required.

## Completed work and qualification

| Work | Current result | Evidence and limits |
| --- | --- | --- |
| Planning/research and design setup | Approved EGM direction, component reference map, AG-UI architecture audit/research/gap/target/roadmap documents and repository design toolkit recorded | [Plan](../../PLAN.md), [audit](../../AGUI_CURRENT_ARCHITECTURE_AUDIT.md), [research](../../AGUI_FEATURE_RESEARCH.md), [gap analysis](../../AGUI_GAP_ANALYSIS.md), [target](../../AGUI_TARGET_ARCHITECTURE.md), [toolkit](../../.agents/SKILLS.md). Installed guidance does not itself grant runtime capabilities |
| Existing workspace modernization | affectUI theme/navigation, chat/composer, scoped Design/Activity/Assets/Exports, responsive behavior and dark drafting/white sheets implemented | [Acceptance](workspace-acceptance-upgrade.md), [follow-through](workflow-followthrough.md), [drafting](phase-3-drafting.md). Earlier scoped evidence; not whole-catalog parity or complete Revit drafting |
| Saved concepts/reports and Project Brief | Generate/revise/reload lineage, proposed schedule history, owner-scoped output/export behavior and cross-chat Brief persistence implemented within their packets | [Revision confidence](saved-revision-confidence.md), [Brief](project-brief-persistence.md), [report history](report-revision-history.md). Native BOQ/RVT import and broad write/read-back remain separate |
| AG-UI chat transport | Send/observe uses durable v2 commands/snapshots; actual Ask/follow-up/interrupt/reload verified | [Transport packet](agui-chat-migration.md). Existing harness and AI SDK rendering retained; final answer delivered after validation, not true provider token streaming |
| Hosted grouped-question continuation | AG-UI resume checks question/version, exact applied command/answer receipts, bounded confirmation, stale results and safe errors | [Continuation](agui-chat-continuation.md). Actual grouped answer/reload and one resume POST verified; generic multi-interrupt/native-tool resume unfinished |
| Process/history polish | Source-bound repeated attempts group without deleting evidence; ambiguous historical turns show Recorded activity; waiting transitions do not imply tool success | [Local chat packet](agui-local-chat.md). Some public tool outcomes remain unconfirmed; literal historical table export eligibility preserved |
| Structured-response renderer | Bounded illustrative text/layout/disclosure/table/bar/connection registry, exact source/hash/scope validation and fallback implemented | [Local packet](agui-local-chat.md). No arbitrary HTML/JS/React, commands or measured/native authority |
| Actual local composition producer | Optional finish proposal → final-answer checkpoint → completion/presentation projection → scoped client hash gate implemented | [Producer packet](agui-composition-producer.md). Controlled model decisions/real graph/driver/Mongo-mock and captured-output AG-UI browser replay; live-provider and hosted rollout pending |
| General Plan intent repair | General questions reach the planner without mandatory geometry admission; genuine design creation still validates the brief | [Continuation](agui-chat-continuation.md). Locally implemented and included in the new producer candidate, **not deployed**; live Plan behavior unchanged |

Earlier onboarding, account/settings, pricing, review/approval and usage work stays indexed by PLAN and its linked qualification packets. The latest AG-UI tests do not independently requalify every prior screen. Earlier native read evidence is in [native-read verification](native-read-verification.md); this slice did not test new native writes or claim desktop parity.

## Exact current test checkpoint

Last implementation qualification, not a new application test run during this documentation update:

| Check | Result |
| --- | --- |
| Frontend suite | 603 passed, zero failed/skipped |
| Backend API suite | 180 passed +26 subtests; two preexisting duplicate-operation warnings |
| TypeScript and production build | Passed |
| Production runtime checks | 21 passed, including auth/origin safeguards and development replay/preview404 gates |
| Shared Python/browser cases | 12 matched; representative conformance, not formal equivalence |
| Backend knowledge links (lat check) | Passed |
| Code graph freshness | **Unresolved:** refresh refused loss of preexisting semantic nodes; freshness failed. No destructive rebuild |

Exact source identity: `artifacts/ux/agui-presentation/qualification.json`. Its 19 web +13 backend hashes and the five original frozen repair hashes were rechecked and matched during this handoff update. Tests were not repeated because this turn changes documentation only.

Logs in that directory: `frontend-tests-final.log`, `backend-api-qualified.log`, `typecheck-final.log`, `build-qualified.log`, `runtime-final.log`, `lat-qualified.log`, `graph-update.log` and `graph-check.log`. Earlier lower counts retain their original scope.

## Browser evidence and review entry points

- [Actual localhost workspace](http://localhost:3001/): saved Ask task `cdef2ef4-22be-5150-a39a-55a20e9bff37` restored its concise Revit levels/grids answer, activity and empty composer. This uses the unchanged hosted service. No new live-provider composition or native write was tested in the latest slice.
- [Local composition preview](http://localhost:3001/dev/chat-composition): use **Replay saved harness response**. It replays a saved controlled local graph result through the actual AG-UI adapter/client. No real backend command or live provider call is issued. Preview controls, keyboard disclosure, exact full-answer copy, reload/replay and 390px containment were checked. CSV control was enabled; CSV download was not repeated in this fixture check.
- `browser-wire.json`: one replay POST,200 text/event-stream, RUN_STARTED/activity/text/RUN_FINISHED, no capture eviction. `browser-replay.png` and `mobile-replay.png` show the result.
- Hosted question task `6286a05a-4051-5d67-804a-16476d1dd18c` retains its grouped/Metric answers; old question rows now show Recorded activity rather than inheriting Completed.

Localhost3001 was available when implementation ended; temporary production3100 was stopped. These are recorded states, not a guarantee processes remain running after review. Tabs71(actual chat) and72(preview) were retained; recover by URL if unavailable.

## Source locations — preserve all candidates

| Checkout | Branch / source | State |
| --- | --- | --- |
| Web root `E:/Web development/PROJECTS-FULL STACK/datumm-web` | `codex/ui-ux-foundation-2026-11-12` | Existing dirty/untracked UI work preserved; no reset/cleanup/merge |
| `artifacts/ux/agui-presentation/candidate` | `codex/agui-chat-presentation-20261116`, base `188ebc0bc0599ff84f3760aaef24711e522972ae` | Uncommitted producer/projection/storage changes plus a byte-exact copy of the earlier Plan-intent repair; locally qualified, undeployed |
| `artifacts/ux/checklist-completion/candidate` | `codex/agui-plan-intent-20261116`, same base 188 | Original five-file Plan-intent repair uncommitted and unchanged; preserve its manifest |
| Preserved branch in original backend clone | `codex/alternative-count-clarification-20261116`, commit `4eb6135862fcd6083d798f5eaff4f9c1e4a79f00` | Paused and excluded from producer candidate. Exact package/container/real-planner/live gates open. Prior commit normalized only knowledge-file line endings; whole archive not byte-qualified |

Backend candidates are in ignored artifacts. Preserve those folders/manifests; web Git does not capture them. Backend instructions require graph/knowledge navigation and post-change checks. Python tests reused the original candidate's `apps/domain-api/.venv/Scripts/python.exe` with the new candidate working directory; no dependencies installed.

Last recorded deployed backend remains source 188, image `sha256:6af54c878220f1117b316c3a414dda35f88f93ec3cee3dd7470270f4e88d378c`. It was **not revalidated on AWS** in this slice. No new commit, push, deployment, merge or release occurred.

## Remaining work — proposed review order

| Order | Gap / next task | Acceptance |
| --- | --- | --- |
| N1 | Retain completion evidence beyond the 2,000-event tail | Old answers retain correctly bound presentation after eviction/reload; stale/foreign/failed results denied; no repeated commands |
| N2 | Safe frontend capability awareness/reversible interactions | Bounded current context and allowlisted capabilities; stale scope/actions denied; native permissions separate |
| N3 | Stronger tool/task/sub-agent lifecycle and recovery | Actual producer evidence drives process/checklist; concurrent agents, failures, retries and interruption distinguishable; no private reasoning |
| N4 | Evidence-backed compositions and broader interactions | Exact immutable report/measurement references; versioned questions retain authority; invalid specs preserve full answers |
| N5 | Validated provider streaming and measured performance | Preserve answer admission/correction; measure acknowledgment vs useful update, render/transport/memory/tokens; no unsupported savings claims |
| Hosted gate | Live provider, real Mongo/container/planner and rollout | Exact candidate/package/source, checkpoint compatibility and rollback, then Plan general question and generate→revise→report→reload. AWS unavailable; no login request pending |

This is a recommendation for review, **not an instruction to resume automatically**. Generic resume/replay, a durable proof ledger, frontend action access, measured/native charts and performance acceptance remain unfinished.

Current composition proof can disappear after its evidence leaves the retained 2,000-event tail; literal answers remain. Views establish illustrative source consistency, not factual/native verification. Ask-tool schema bytes increased by 1,489 in the measured configuration; token/latency effects were not measured.

## Deferred scope and safeguards

Keep current right Design/Activity/Assets/Exports intact. Further floor-plan shared state, direct drafting/room/wall editing, RVT import/native BOQ, broad Revit write/read-back, desktop parity, admin expansion, billing/entitlements/quotas and release acceptance remain separate. Free is current; Pro $20/month and Max $99/month are planned, payments disabled. Teams/collaboration and smartphone companion are future scope. [Product gap register](full-migration-gap-register.md).

Preserve owner/task/turn/execution identity, native approval bound to exact document/revision/proposal, version 2 paused checkpoints, immutable plan/report history and recovery receipts. Composition, navigation and saved answers never authorize Revit changes. Keep secrets out of documents/screenshots.

## Resuming after review

Confirm the user's chosen priority, check relevant source hashes/dirty state and available localhost/backend state, then follow the [updated roadmap](../../AGUI_MIGRATION_PLAN.md). Reuse current checkouts, do not combine paused repairs implicitly, and run checks appropriate to changed source/unresolved concerns. Update this handoff with actual outcomes, distinguishing controlled, local and hosted evidence.

Full predecessor: [review archive](history/handoff-before-agui-progress-review-2026-11-16.md). Earlier chronology: [workspace archive](history/handoff-before-workspace-acceptance-2026-11-15.md) and linked packets. Superseded “active” instructions do not override this review hold.
