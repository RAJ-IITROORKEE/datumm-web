# G1 — go-live plan for the UI/UX phases

Status: **decisions D1 to D12 approved by the user on 17 Nov with every recommended option (A). This approves the approach only: each push, merge to a remote, tag, deploy, AWS action and Vercel promotion still needs its own approval at the time.** D10 is done (`scripts/check-ux-http.py` in the backend repo, commit `9c87ed6`). Written 17 November 2026 from the two local repositories and recorded evidence only. No AWS, Vercel, Clerk or MongoDB system was contacted; nothing was built, pushed, merged or deployed.

Labels: **O** = observed in source or a recorded result (`path:line`); **I** = inferred, verify before acting.

## 1. Goal and non-goals

Goal: put the finished phases S0, C1, N1, N3, N2, A1, A2, N4, Q1 (and A3 once its packet result is filled) on the live site, backend first, then web, each step gated by checks and with a tested-in-advance rollback.

Non-goals and limits:

- **This document authorizes nothing.** Every deploy, merge, push, tag, Vercel promotion, AWS command, stack/parameter/secret change, database dump or restore needs the user's explicit approval at the time (`AGENTS.md`, `HANDOFF.md:9`).
- AWS access is unavailable to agents. The user provides it, or runs the AWS steps, with the scope in decision D8.
- No feature work, no Next.js upgrade (separate phase, D6), no flag enablement at go-live (Q1, N4 stay off; section 4).
- W1, A4, N5 and the model router are out of scope.

## 2. Current state

### 2.1 What runs in production (recorded, not revalidated)

| Item | Recorded value | Evidence |
| --- | --- | --- |
| Backend stack | CloudFormation `datumm-orchestrator`, `ap-south-1`; CloudFront `https://d2hwgmaqtyfvmj.cloudfront.net`; one EC2 `t3.medium` host; ECS task = `api` + `mongo` (MongoDB 8, same task, linked) | `datumm-orchestrator/infra/orchestrator/README.md:5-15`; `stack.json:626-770` |
| Backend source / image | `188ebc0bc0599ff84f3760aaef24711e522972ae` / `sha256:6af54c878220f1117b316c3a414dda35f88f93ec3cee3dd7470270f4e88d378c`, deployed 15 Nov; rollback target recorded then: `bb49ed58…` | `docs/ux/saved-revision-confidence.md:29-33`; `HANDOFF.md:72` |
| Backend STATUS file | **Stale:** still says `ab89e2b` / `d58e6e13…` (12 Nov) | `datumm-orchestrator/docs/STATUS.md:32`; `infra/orchestrator/README.md:20` (open question Q-1) |
| Last backup recorded | `mongodump/20261115T052832Z.archive.gz`, 32.7 MB; restore never tested | `saved-revision-confidence.md:31` |
| Database size at cutover | 63 collections, 18,739 documents, 80 indexes (11 Nov) | `STATUS.md:16` |
| Web | Vercel project `datumm-web`, `datumm-web.vercel.app`; GitHub `RAJ-IITROORKEE/datumm-web` `origin/main` = `7495879` (12 Nov). That production serves exactly `7495879` is **I** | `STATUS.md:7`; `git log origin/main` |

### 2.2 What the local `main` branches add

**Backend** (`datumm-orchestrator`, `main` = `70ce912be3249d0cfe277a1a5fd669ddff18707a`, same as `codex/web-ui-harness-20261116`): **9 commits** beyond deployed `188ebc0`, 44 files, +5,761 / −110 (O, `git diff --stat 188ebc0`). Its `origin` is a local folder (`artifacts/ux/agui-presentation/candidate`), not GitHub. A3 was uncommitted when this plan was written and is now committed as `2e00ee3` (10 commits beyond `188ebc0`, with `model_registry.py` and `test_model_registry.py`).

| Commit | Phase | One line |
| --- | --- | --- |
| `e8cefa7` | (pre-S0 candidate) | Chat composition producer, completion projection, general Plan admission. **Never deployed; not a UI/UX phase but ships with this release** |
| `c188add` | C1 | `/v1/config` reports `capabilities` and serves admin model list, default model and effort |
| `34fcf67` | N1 | Completion proof from a targeted indexed read, not the 2,000-event tail |
| `36613f4` | N3 | Action, native call and specialist lifecycle fields on public events |
| `48bbd1d` | N2 | Optional validated `clientContext`; `displayActions` in compositions |
| `94c8ed4` | A1 | Text-free admin traces; answer feedback bound to the completion proof |
| `70395b3` | A2 | Versioned config history, restore, richer audit |
| `fa25300` | N4 | Evidence cards bound to saved report revisions (setting off) |
| `70ce912` | Q1 | Rules pre-router (setting off), phase timings in traces; `require_model_connection` completion fix |

**Web** (`datumm-web`, `main` = `77c078a`): **45 commits** ahead of `origin/main` (the request said ~47), 849 files, +173,782 / −5,133. Only 27 of them are S0→A3 work; **18 earlier commits (`e0982f6`…`76564d3`) carry the whole AG-UI chat transport, affectUI migration of settings/admin/review/activity, onboarding, pricing, connector authorization and `/connect`**, none of which has run on Vercel either. 119,898 added lines are `.agents/skills/` (374 files). A3 web was uncommitted when this plan was written and is now committed as `0fbe0c6` (46 commits ahead of `origin/main`, including the plan itself).

| Commit | Phase | One line |
| --- | --- | --- |
| `8c4385f` | S0 | Docs: source verification, backend baseline |
| `a7cafe9` | C1 | Capability parser, admin 404 clarity, `/api/chat` removed |
| `aa71966` | N1 | Eviction test and fixture (no app logic) |
| `1de170d` | N3 | Hosted action, tool and specialist outcomes in the process view |
| `a57d866` | N2 | Frontend context envelope, reversible display actions |
| `d8f9270` | A1 | `/admin/traces`, thumbs on proven saved answers |
| `9038aa2` | A2 | Config history page, restore dialog, richer audit |
| `4a26109` | N4 | Evidence card for saved report revisions |
| `a403747` | Q1 | Phase timings, packet sizes, direct-answer lane in traces |
| `0fbe0c6` | A3 | Admin Models page, test dialog |

### 2.3 Contract and data changes by phase

| Phase | Change | Kind | Evidence |
| --- | --- | --- | --- |
| C1 | `/v1/config` adds `capabilities`; returns **admin** `models`, `defaultModel`, `defaultReasoningEffort` instead of env values; now reads Mongo (30 s cache) | Additive key + **behavior change**: the picker shows the admin list on deploy if one is stored | `main.py:294-298`; `c1-…md:19-21,191` |
| C1 | v2 submit uses the admin default effort when the request omits it (was env `high`) | **Behavior change** if the admin config holds a non-default effort | `task_controller.py:393` |
| N1 | Proof read covers full history: a deny-stage event older than the tail now **vetoes** proof that was granted before | **Behavior change (tightening)**: some old answers may lose the composed view (literal answer kept) | `n1-…md:55,162` |
| N1 | Index `task_events (taskId, executionId, stage)` | Additive | `storage.py:33` |
| N3 | `outcome`, `durationMs`, `callId` on events; `specialist_started` stage | Additive | `n3-…md:199` |
| N2 | `CommandRequest.clientContext` accepted (old backend: 422) | Additive, gated | `n2-…md:238` |
| A1 | `GET /v1/admin/traces`; `POST/GET /v2/tasks/{id}/feedback`; collections `answer_feedback`, `feedback_limits` (TTL); index `runs (created_at, _id)` | Additive | `storage.py:41-44`; `admin_api.py:153` |
| A2 | `config_history` collection; history/restore routes; audit gains fields, cursor, `kind`; index `admin_audit (kind, at, _id)` | Additive | `storage.py:30`; `admin_api.py:68-116` |
| A2 | Config write refuses credential-bearing or unparseable MCP URLs with **422** | **Behavior change** for admin saves | `config_history.py:24,36-39,69` |
| N4 | `evidence` node, composition v2; `evidence_compositions_enabled` default **off** | Additive, off | `settings.py:22`; `agent_workflow.py:2316` |
| Q1 | `entry_rules_enabled` default **off**; `agent_entry_route` on runs; `toolSchemaBytes`, `phases` in traces | Additive, off | `settings.py:23`; `main.py:950` |
| Q1 | `require_model_connection` no longer sets `completed` itself (fixes `LEASE_LOST` in production) | Bug fix | `q1-…md:172` |
| A3 | `model_tests` collection + 2 indexes; `/v1/admin/models*`; startup `migrate_legacy()` writes one passed `legacy:<id>` row per current model and an `app_config` marker `_id: model_registry` | Additive + **startup data write** | `main.py:59` (uncommitted); `model_registry.py:194-207` |
| A3 | `resolved()` **fails closed**: only models whose newest test passed are served; a failed re-test drops a model at once; config writes adding an untested or out-of-env model get 422 | **Behavior change** | `app_config.py:64-68,84-97` (uncommitted) |

New indexes on existing collections: `runs`, `task_events`, `admin_audit`. All are built by plain `create_index` in `storage.initialize()` at every startup (`storage.py:8-46`), before the app accepts requests. The ECS health check allows 60 s start plus 3 × 30 s (`stack.json:637-648`). At ~18,700 documents in total the builds should take well under a second (I); record the real counts first (task P5) and stop if `task_events` or `runs` is far larger than expected.

Settings (`apps/domain-api/settings.py`), all from env; the stack sets only nine env vars and three secrets (`stack.json:667-736`):

| Setting | Required at go-live | In stack today | Effect if unset |
| --- | --- | --- | --- |
| `TRACE_OWNER_HASH_SECRET` (`:31`) | Optional, recommended | **No** (needs a template change: secret key + `Secrets` entry) | `ownerHash` null, owner filter ignored (`traces.py:207,413`) |
| `ADMIN_SUBJECTS` (`:32`) | Yes for admin | Yes (`AdminSubjects` parameter) | Admin API refused |
| `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES` (`:8-9`) | Yes | Yes | Auth fails; the second must list every web origin that signs in |
| `ENTRY_RULES_ENABLED`, `EVIDENCE_COMPOSITIONS_ENABLED` (`:22-23`) | Leave off | No (defaults false) | Off, as intended |
| `ALLOWED_MODELS`, `DEFAULT_MODEL` (`:26,33`) | Check | **No** → six built-in ids | A3 migration and the A3 write gate use them when the admin list is empty |
| `ANALYSIS_/SPECIALIST_PARALLEL_ENABLED`, `LAYOUT_CRITIC_ENABLED` (`:19-21`) | No change | No (false) | N3 "deployed specialist values unknown" resolves to false (I, verify the live task definition) |

### 2.4 Mixed versions

**New web ↔ old backend** (web goes first by accident, or backend rollback): safe, verified per flag in `src/lib/capabilities.mjs:8-29` and `src/components/admin/admin-shell.tsx:17-35`.

| Flag | Rule when the backend omits `capabilities` | Result on the old backend |
| --- | --- | --- |
| `frontendContext`, `displayActions` | `featureEnabled` (unknown = off) (`capabilities.mjs:22`) | No `clientContext` sent (`use-workspace-state.ts:881`), so no 422; actions ignored (`workspace.tsx:434`) |
| `feedback` | unknown = off (`workspace.tsx:91`) | No thumbs, no feedback calls |
| `adminTraces`, `adminHistory`, `adminModels` | `strict` nav items (`admin-shell.tsx:23,30,32`); pages use `featureEnabled` (`form.tsx:136`, `data-sections.tsx:114`, `config-sections.tsx:38`) | Hidden; a direct URL shows "Not provided by this backend" |
| `adminConfig`, `adminAudit`, `adminOverview`, `adminKnowledge` | **unknown is shown**, hidden only when `off` (`admin-shell.tsx:35`) | Shown: the old backend serves them (C1 decision). The request's claim "unknown = off" is true for the new features only |
| `planningGoals` | unknown keeps the old gate (`capabilities.mjs:25-29`) | Hidden in production (`liveRuntime` false) |
| `evidenceCompositions` | not parsed by the web | The card renders only from a valid v2 composition, which an old backend never emits |

New proxy routes (`route.ts:5,19`) reach the old backend and get its FastAPI 404, which the admin UI labels as backend-missing (C1). The proxy's own refusals are `DATUMM_PROXY_NOT_ALLOWED` (`route.ts:20`). The AG-UI chat, affectUI screens and other pre-S0 web work have never run against any hosted backend (HANDOFF "What exists"): that, not the flags, is the main risk of the web step.

**Old web ↔ new backend** (backend first, the planned order): safe by design (I, from additive fields): old web ignores `capabilities` and new event fields, sends no `clientContext`, never calls feedback/traces/history. Visible changes: the picker and default effort follow the admin config (C1); old admin saves can now fail 422 on MCP URLs with credentials (A2) or on untested/out-of-env models (A3); a v2 composition (N4, only if enabled) falls back to the full answer (`n4-…md:74`).

## 3. Rollout order and gates

The stack has **no canary path**: one host, MongoDB inside the same task, `MinimumHealthyPercent 0` and circuit-breaker rollback (`stack.json:849-851`), and "never run two writers against the same database" (`infra/orchestrator/README.md:32`). A deploy stops the old task first (1–3 min outage, `aws-repo-image-deploy-2026-11-12.md:29`). The recommended substitute is a **rehearsal on a copy** (step B2).

| Step | Who | Action (all need approval) | Gate to continue |
| --- | --- | --- | --- |
| B0 | User | Pre-deploy tasks P1–P10 (section 4) done | All recorded in the release note |
| W0 | Operator + user | **Needs its own approval (it is a push).** Push the release branch `release/g1-web-2026-11` (section 6). Vercel builds a **preview** of it, which talks to the still-old backend (safe, section 2.4). Read the preview's exact branch address from the Vercel dashboard. Expected form, inferred from Vercel's naming rules and the recorded team `unfiltered-iit-ians`: `https://datumm-web-git-release-g1-web-2026-11-unfiltered-iit-ians.vercel.app` | Preview build passes (first Vercel sample for Next.js 16.4.6, U1); the exact address is written into B3 |
| B1 | Operator | Publish the exact backend commit (section 6), make a source archive of it, build with `infra/orchestrator/builder.buildspec.yml` and `SOURCE_SHA` = that commit. The builder may push **only** to `datumm-opencode-builder-hosted-opencode` (`aws-repo-image-deploy-2026-11-12.md:23`) | Build log shows module import check, planner check and `/health` against throwaway Mongo (`builder.buildspec.yml:51-65`); record the pushed digest |
| B2 | Operator | **Rehearsal (recommended):** in the same CodeBuild account, restore the P4 dump into the throwaway `mongo:8`, start the new image against it, time startup | Startup under 60 s; `/health` shows the new `sourceCommit`; no traceback; A3 marker and one `legacy:` row per current model; `GET /v1/config` unauthenticated = 401. Delete the copy after |
| B3 | Operator | Change set: `ImageUri` only (and `RepositoryArn` only if the live image is in another repository), `--use-previous-template`, every other parameter `UsePreviousValue` (`aws-repo-image-deploy-2026-11-12.md:34-42`). **`ClerkAuthorizedParties` also changes** (Q-10, approved by the user 17 Nov to share this change set): the four existing origins plus the exact preview address from W0, comma-separated with no spaces, so preview sign-in works with no second outage; the backend matches `azp` exactly (`auth.py:12`), so a wildcard would not work. Optional template change for `TRACE_OWNER_HASH_SECRET` as a separate change set (D9) | Change set touches only `Task`, `Service` (and `TaskExecutionRole` if the repository changes); the task now also gets the longer `CLERK_AUTHORIZED_PARTIES`; if it touches host, volume or distribution, **stop** |
| B4 | Operator | Quiet window: no `running`/`queued` run; execute | `UPDATE_COMPLETE`; 1 running task, steady state; logs clean |
| B5 | Operator + user | Verify (checklist H-B below) | All pass, else rollback R-B |
| W1 | Operator | Vercel **preview** from the release branch, env for Preview set (P8) | Build passes; `node tests/runtime-smoke.mjs https://<preview> --production` 18/18 |
| W2 | User | Signed-in preview checks (H-W) | All pass. Needs the preview origin in `CLERK_AUTHORIZED_PARTIES` and the same Clerk instance as production (Q-4) |
| W3 | Operator | Promote that exact preview to production (or merge `main` and let Vercel build; D3) | Runtime smoke 18/18 against `datumm-web.vercel.app`; H-W repeated on production |
| L1 | User | Q1 baseline window (≥ 7 days of traces with the flag off), then a separate approval to enable `ENTRY_RULES_ENABLED` (template change + restart) | Q1 hosted checks below |

### Checks at each gate

**H-B, backend after B4** (old web still live):

1. `curl …/health` → `sourceCommit` equals the deployed commit (40 chars).
2. Unauthenticated: `node scripts/check-orchestrator-parity.mjs --azure <old origin> --aws <new origin>` is built for two live hosts (`check-orchestrator-parity.mjs:2-7`). With one stack, run it **staging-vs-production only if D1 option B is chosen**; otherwise use it as a status checker against the same origin twice (all 401 on protected routes, 404 JSON on the unknown route). With a token (`--token-env`), `/v1/config` shape **will differ** from the old one (`capabilities`, C1 `c1-…md:157`): expected.
3. Signed in (user, token in an env var, never in arguments): `GET /v1/config` → `capabilities.version` 1; `adminConfig, adminAudit, adminOverview, adminKnowledge, frontendContext, displayActions, adminTraces, feedback, adminHistory` true (`adminModels` true only with A3); `planningGoals`, `evidenceCompositions` false; `models` equals the P3 record (**fail = A3 fail-closed or C1 list change; roll back**); `defaultReasoningEffort` equals P3.
4. Old web smoke as in the 12 Nov record: Plan 12 × 9 m returns alternatives; a 20 × 30 m 3BHK returns alternatives; Ask with web search answers; an existing chat opens with history; "hi" takes the **full** path (flag off, no `quick_reply`).
5. Read-only admin: `GET /v1/admin/config/history` (baseline row `recovered`), `/v1/admin/audit` (array, unchanged without parameters), `/v1/admin/traces?period=1d` (rows, `truncated`, no prompt text, `ownerHash` null unless the secret is set).
6. Logs: no traceback; index builds and the A3 migration logged no error; Mongo `db.<coll>.getIndexes()` shows the new indexes (via SSM, read-only).

**H-W, web preview then production** (user, signed in, 1280 px and 390 px, light and dark):

1. New chat: Ask, Plan (12 × 9 m), revise; reload restores answer and drawing; Activity shows hosted tool rows with durations (N3).
2. Composed answer opens; an old long chat still shows its answer (N1; literal answer if proof is now vetoed).
3. Thumbs appear only on proven saved answers; vote, change to down with a reason, reload keeps the vote (A1).
4. Display actions: if the model offers one, Undo restores the layout; narrow screen shows the one-click offer (N2; live-model production is unproven).
5. Admin (`ADMIN_EMAILS` user): nav shows Traces and Config history; Traces lists today's turns with Time and Packet blocks; Audit "Load older"; Config history diff. **Restore and Test model are writes: only with approval, then restore the original revision.**
6. A3 (if shipped): Models page lists every current model as "Legacy · not tested"; do **not** test or disable until checks pass (a failed test removes a model at once).
7. Non-admin account: `/admin` is 404; production fixtures `/dev/ux`, `/dev/chat-composition` are 404 (runtime smoke covers them).

**Real-HTTP checks already used locally.** 47 checks against the new backend over HTTP with mongomock, no provider key, `ENTRY_RULES_ENABLED=true` and a test trace secret (17 Nov). The script lives only in this session's scratchpad (`local_http_test.py`), not in either repo (Q-6, D10):

| Category | Checks | Hosted use |
| --- | --- | --- |
| Auth, capabilities, config | 6 (401 without token on config and traces; version 1; flags; models from admin config) | Read-only: run at H-B3 |
| A2 history, restore, audit | 18 (revisions, 409 stale, 422 credential and unparseable MCP URL, diff, restore, identical/oversized 422, audit cursor, canary text absent) | **Writes**: run on the B2 copy only, or in production with approval and a restore back |
| Q1 short path | 8 ("hi" with N2 `clientContext` completes with the fixed reply, proof, `quick_reply` event; domain prompt takes the full path) | Only at L1, after enabling the flag |
| A1 feedback and traces | 15 (vote, 409 wrong hash, 422 reason with up, change vote, traces rows, `route`, phases, `ownerHash`, no text, filters, 422 bad query) | Feedback writes are the user's own votes: acceptable on the user's own chat; traces read-only |

## 4. Pre-deploy tasks (user or operator)

| # | Task | Why |
| --- | --- | --- |
| P1 | Confirm read-only what runs: `/health` `sourceCommit`, task-definition image digest, stack parameters, `ClerkIssuer`, `ClerkAuthorizedParties`, `AdminSubjects`, whether the live template equals `infra/orchestrator/stack.json` | STATUS and HANDOFF disagree (Q-1); the change set must keep 19 of 20 parameters |
| P2 | Record the rollback image digest (expected `6af54c87…`) and its repository ARN; confirm it is still in ECR | R-B |
| P3 | Signed in, save `GET /v1/config` (`models`, `defaultModel`, `defaultReasoningEffort`) and `GET /v1/admin/config` (models list, MCP URLs, skills) | C1 and A3 change what the picker serves; A2 refuses credential URLs on next save |
| P4 | Fresh `mongodump` (existing `datumm-mongodump.service`, `aws-repo-image-deploy-2026-11-12.md:30-33`) and confirm the object; ideally restore it once in B2 | Restore was never tested |
| P5 | Record counts and sizes of `runs`, `task_events`, `run_events`, `admin_audit`, `app_config`; check no TTL or external job prunes `task_events` | Index build time; N1 open question 1 |
| P6 | `ALLOWED_MODELS` / `DEFAULT_MODEL`: confirm the env list (unset = six built-ins, `settings.py:33`) covers every model users pick today; the A3 migration blesses the **admin list if non-empty, else the env list** | Fail-closed picker |
| P7 | Provision `TRACE_OWNER_HASH_SECRET` (random, ≥ 32 bytes) as a new key in the runtime secret, never printed; requires a template change (D9) | A1 owner filter |
| P8 | Vercel env per environment (Production, Preview): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `ORCHESTRATOR_URL` = `https://d2hwgmaqtyfvmj.cloudfront.net` (must be an https root origin, `backend.ts:9`), `ADMIN_EMAILS` (used at `src/app/admin/layout.tsx:17`, **missing from `.env.example`**) | Web config |
| P9 | Clerk: decide instance and keys (D4); add the Vercel production origin and any preview origin used for W2 to `ClerkAuthorizedParties` | Tokens from an unlisted origin are refused |
| P10 | `ADMIN_SUBJECTS` contains the admin's Clerk user id; `ADMIN_EMAILS` contains the same person's verified email | Two admin gates |
| P11 | Leave off: `ENTRY_RULES_ENABLED` (Q1, after a ≥ 7-day trace baseline), `EVIDENCE_COMPOSITIONS_ENABLED` (N4, after the user accepts the +174 schema bytes) | Approved packets |
| P12 | Next.js 16.4.3 advisory (D6): investigate without changing dependencies: run `npm run build` 5× on Node 24.18.0 with `NEXT_TELEMETRY_DISABLED=1`, capture full output and exit codes; read the advisory text and `npm audit --omit=dev` (read-only); check whether the advisory applies to features used (App Router server functions, middleware). Vercel build logs on the W1 preview give a second sample. Upgrading is a separate approved phase | Build reliability, security |
| P13 | Quiet window agreed (D7); notify any testers | 1–3 min outage |

### P12 result (17 Nov, local, Node 24.18.0, `NEXT_TELEMETRY_DISABLED=1`, five consecutive `npm run build` runs)

- Every run compiled and passed TypeScript. Exit codes: 1, 0, 1, 0, 1.
- The failing runs end with `SecurityFatalError`: Next.js 16.4.3 asks the npm advisory service (`registry.npmjs.org/-/npm/v1/security/advisories/bulk`), reports that this version is affected by a known vulnerability, and **stops the build on purpose** to show an upgrade recommendation. The passing runs print the same warning and continue.
- So the "intermittent build exit 1" recorded since Q1 is this upgrade nudge, not a compile problem. It stops the build only when Next.js detects a coding agent (read from `next/dist/lib/upgrade/nudge.js`); the first run leaves a 5-minute retry receipt, so back-to-back runs alternate 1, 0, 1, 0, 1. Without an agent and an interactive terminal, as on Vercel, the check returns early (inferred from source, not verified on Vercel; the W1 preview log will show).
- The notice also contains instructions addressed to the agent (to run `next upgrade --agent=security` and to ask the user about a worktree). These were not followed; no dependency was changed and `npm audit` was not run.
- **Effect on D6:** the user approved a separate phase U1 (17 Nov). Its research found one moderate advisory, GHSA-mfr8-8qww-v76h (`'use cache'` through `unstable_cache()`, versions up to 16.4.4), which DATUMM does not use; first fixed release 16.4.5, latest 16.4.6. See [the U1 packet](u1-nextjs-security-upgrade.md). The upgrade is hygiene and agent-build reliability rather than a live exposure.

### AWS check results (17 Nov, read-only; the orchestrator ran the runbook commands at the user's instruction)

The user chose to let the orchestrator use the existing `datumm` AWS CLI profile, which resolves to the **root** account (a scoped read-only policy was offered and declined). Only the read-only commands in [g1-aws-checks.md](g1-aws-checks.md) were run: describe and list calls, one template read, one ECR listing, one S3 listing, one log filter and one public `/health` request. Nothing was written, deployed or run on the host. Account ids are left out of this record.

| Task | Observed |
| --- | --- |
| P1 stack | `datumm-orchestrator` is `UPDATE_COMPLETE`, last updated 15 Nov 05:30 UTC. ECS service: desired 1, running 1, one `PRIMARY`/`COMPLETED` deployment, task definition revision 1 |
| P1 live commit | `/health`: version `0.5.0-alpha.16-r1`, `sourceCommit` `188ebc0bc0599ff84f3760aaef24711e522972ae`. Task image `...builder-hosted-opencode@sha256:6af54c87...`. **Q-1 is answered: `188ebc0` is live; `docs/STATUS.md` is the stale one** |
| P1 template | The live template equals `infra/orchestrator/stack.json` (full JSON equality). The change set will use the repo template |
| P1 logs | No `Traceback` in the last 24 hours in log group `datumm-orchestrator-LogGroup-dMbNMBsouJbp` |
| Parameters | `EnableEndpoint` true, `DesiredCount` 1, `MongoDatabase` `datumm_staging`, `InstanceType` t3.medium, data 40 GiB, `DashboardUrl` and `DesktopAuthOrigin` `https://datumm-codex-mvp.vercel.app` |
| P9 / Q-4 Clerk | `ClerkIssuer` is `https://civil-airedale-72.clerk.accounts.dev`: **production uses a Clerk development instance**, the same one the local tests signed in to. `ClerkAuthorizedParties`: `datumm-codex-mvp.vercel.app`, `localhost:3001`, `127.0.0.1:3001`, `datumm-web.vercel.app`. **No Vercel preview origin is listed** |
| P10 | `AdminSubjects` holds one Clerk user id, the same user that signed in during the local tests (the id is not repeated here). `ADMIN_EMAILS` on Vercel is not yet checked |
| P6 env | The task sets nine plain variables (`DASHBOARD_URL`, `CLERK_AUTHORIZED_PARTIES`, `DATUMM_LOCAL_MODE=false`, `ADMIN_SUBJECTS`, `DESKTOP_AUTH_ORIGIN`, `MONGODB_URI`, `MONGODB_DATABASE`, `VARIABLE_PLAN_ENABLED=true`, `CLERK_ISSUER`) and three secrets (`OPENROUTER_API_KEY`, `DESKTOP_AUTH_SIGNING_KEY`, `DESKTOP_AUTH_PROXY_SECRET`). **No `ALLOWED_MODELS`, `DEFAULT_MODEL`, `TRACE_OWNER_HASH_SECRET`, `ENTRY_RULES_ENABLED` or `EVIDENCE_COMPOSITIONS_ENABLED`**: the six built-in models apply, both flags are off, and owner hashing needs the D9 template change. Mongo runs unauthenticated inside the task (`mongodb://mongo:27017`) |
| P2 rollback image | Both `6af54c87...` (pushed 15 Nov 10:57 IST) and the previous `bb49ed58...` (09:41 IST) are in `datumm-opencode-builder-hosted-opencode`. The G1 rollback target is the running `6af54c87...` in that same repository, so `RepositoryArn` does not change on rollback. **Q-2 is answered** |
| P4 backups | Daily dumps exist; newest `20261116T203030Z.archive.gz`, 31.5 MiB. Restore is still untested |

**P5 counts (read-only SSM command on the host, `estimatedDocumentCount` per collection in `datumm_staging`, 17 Nov, approved by the user):** about 35,900 documents in 84 collections (18,739 in 63 collections on 11 Nov). The ones this release touches or indexes: `task_events` 4,443; `runs` 427; `run_events` 5,560; `admin_audit` 2; `app_config` 1; `report_revisions` 22; `tasks` 128; `graph_writes` 19,978; `graph_checkpoints` 4,039. None of the new collections exist yet (`config_history`, `model_tests`, `answer_feedback`, `feedback_limits`), as expected. The new indexes on `runs`, `task_events` and `admin_audit` are on collections of a few thousand documents at most, so builds at startup should take well under a second (still inferred, not measured). About 45 empty `validation_*` collections from 1 Oct are left over; not part of G1.

**P3 (read-only projection of `app_config`, 17 Nov, approved by the user; only `models`, `defaultModel`, `defaultReasoningEffort`, `revision` and the top-level key names were printed):** the single document `_id: "global"` is at revision 1 with `models: []`, `defaultModel: ""`, `defaultReasoningEffort: ""` and no other keys, so **no admin model list, default or effort is stored**. Consequences: C1 serves the env list (the six built-in models) and the env default effort, so the picker and effort do not change at deploy; the A3 migration blesses the env list, so all six stay served as `legacy:` rows; A2 starts from an empty baseline; no MCP servers or skills are stored.

Not yet checked: P8 (Vercel environment variable names, dashboard only). The live `/v1/config` response itself was not fetched; it follows from the empty `app_config` and the env list above (inferred).

**New finding (Q-10):** a Vercel preview URL is not in `ClerkAuthorizedParties`, so sign-in on a preview (steps W1 and W2) would fail. Adding an origin changes a stack parameter, which replaces the task and costs the same 1 to 3 minutes of downtime as an image change. Cheapest fix: add the stable preview alias in the **same** change set as the backend image at B3, instead of a second outage. Decision for the user before B3.

## 5. Rollback

| Step | Rollback | Notes |
| --- | --- | --- |
| R-B backend | Same update with `ImageUri` = P2 digest (and its `RepositoryArn`); the circuit breaker rolls back by itself if the task never turns healthy (`aws-repo-image-deploy-2026-11-12.md:51-55`) | 1–3 min outage again |
| R-B data | Leave in place: new indexes, `answer_feedback`, `feedback_limits`, `config_history`, `model_tests`, audit extras, event fields, `clientContext`, `agent_entry_route`. Old code ignores them (packet rollbacks: `c1:143`, `n1:138`, `n3:179`, `n2:219`, `a1:186`, `a2:179`, `n4:236`, `q1:147`) | Drop by hand only with approval |
| R-B A3 marker | Leave `app_config {_id: 'model_registry'}`. **Caveat:** on re-deploy the migration does not run again, so any model added to the admin list while rolled back has no test row and is **not served**. Before re-deploying, compare the list or test those models | `model_registry.py:198` |
| R-B dump | Restore P4 only if data was damaged; image rollback does not undo writes | Never tested |
| R-W web | Vercel instant rollback to the previous production deployment (`7495879` build) | Stateless; new web on old backend is safe (2.4) |
| Flags | Unset `ENTRY_RULES_ENABLED` / `EVIDENCE_COMPOSITIONS_ENABLED` and restart (read at run creation / process start) | `q1-…md:175`; `n4-…md:262` |

Cannot be rolled back: admin config revisions and restores (history and audit are kept forever, `a2-…md:205`); feedback votes until their TTL; legacy model rows; any model test spend; restored config values already used by runs; answers already shown with or without proof.

## 6. Branch and merge strategy (proposal; nothing done)

- **Backend:** no GitHub `main` for these commits; `origin` is a local folder. STATUS names GitHub `RAJ-IITROORKEE/datumm-opencode-revit-agent` (`STATUS.md:13`), whose `main` is far behind (I). Proposal: add the GitHub remote, push a release branch `release/g1-backend-2026-11` from the final commit (with A3, or `70ce912` without), open a PR against `main`, review `git diff 188ebc0..<commit>` (44 files), tag the deployed commit `g1-backend-<date>` only after B5. The CodeBuild source archive must be made from that exact commit (`git archive`, no working-tree files), so the image `sourceCommit` is real.
- **Web:** push `release/g1-web-2026-11` from `main` (after A3 is committed), open a PR into `origin/main`, review the squashed diff in three parts: pre-S0 UI (18 commits), S0–A3 (27+), `.agents/skills/` (120k lines; decide whether it belongs in the repo, D11). Merge by merge commit (keeps phase commits citable from packets) rather than squash. Tag `g1-web-<date>`.
- **Line endings:** `.gitattributes` is `* text=auto eol=lf`, `*.patch -text`. 52 files are LF in the index but CRLF in the working tree (`git ls-files --eol`), which explains the CRLF/LF warnings; nothing to commit for them. `docs/backend-candidates/agui-chat-presentation-20261116.patch` is mixed by design. The backend has mixed-ending files (`backend-rollout.md:37`); review with `git -c core.whitespace=cr-at-eol diff --check`.
- **Exclude from commits:** `next-env.d.ts` (dev churn: `.next/dev/types` vs `.next/types`, restore before committing); every `.env*` except `.env.example` (`.gitignore:5-7`); the Next.js agent-rules block that `next dev` re-adds to `AGENTS.md`; scratch files.

## 7. Decisions needed from the user

| # | Decision | Options (recommendation first) |
| --- | --- | --- |
| D1 | Canary or direct cutover | **A: rehearsal on a dump copy in CodeBuild (B2), then in-place cutover.** B: temporary staging stack from the same template with a restored copy and its own CloudFront (true parallel test and parity script; costs a host for a day and broad IAM). C: direct cutover without rehearsal |
| D2 | Same day for backend and web | **A: backend day 1, web day 2 after a day of traces with the old web.** B: same window (one outage, harder to tell which side broke) |
| D3 | Publish method | **A: release branches + PRs + merge commit + tags; Vercel promotes the reviewed preview.** B: direct push to `main` |
| D4 | Clerk production keys | **A: keep the current instance and keys for G1; production-instance switch is its own phase** (it changes `CLERK_ISSUER` and signs everyone out). B: switch now |
| D5 | Phases to hold back | **A: ship all code; Q1 and N4 settings stay off; A3 in a second backend release after the first is stable** (its fail-closed picker is the riskiest change; the web hides Models until the backend reports `adminModels`). B: wait for A3 and ship one release. C: also hold N2 (no runtime switch except revert) |
| D6 | Next.js before go-live | **A: investigate per P12, ship on 16.4.3 if the build is reliable on Vercel and the advisory does not affect used features; upgrade as a separate phase.** B: upgrade first (new phase, full retest) |
| D7 | Maintenance window | **A: a low-traffic slot (e.g. 20:30–21:30 UTC, next to the daily dump), no running runs.** B: any time with a quiet check |
| D8 | AWS access | **A: the user runs the AWS steps; agents prepare commands and read outputs pasted back.** B: a temporary IAM role (not root; `STATUS.md:51`) limited to: CloudFormation describe/change-set/execute on `datumm-orchestrator`, ECS/ECR/Logs read, CodeBuild start/read on the builder project, S3 read/write on the backup bucket and source prefix, SSM `SendCommand` to the host; expires after G1 |
| D9 | `TRACE_OWNER_HASH_SECRET` timing | **A: separate template change after B5 (image-only first deploy keeps the change set minimal).** B: same change set |
| D10 | 47 local HTTP checks | **A: save the script into the backend repo as a check (reads by default, writes behind a flag) in a small pre-G1 commit.** B: leave it in the scratchpad (lost on cleanup) |
| D11 | `.agents/skills/` in the web release | **A: keep it in the repo but review it as its own PR part.** B: drop from the release branch |
| D12 | Backup | **A: fresh dump right before B4 plus one restore rehearsal (B2).** B: dump only |

## 8. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| A3 fail-closed picker serves fewer or no models (migration missed, env list differs, failed re-test) | Low to medium: the stored admin list is empty, so the migration blesses the six env models (P3); a failed later re-test is the remaining way | P3, P6, H-B3; D5 ships A3 separately; never test in production until H-W passes |
| C1 makes the admin model list and effort live on deploy | Low: nothing is stored (P3), so the env values keep applying | P3 comparison before and after |
| AG-UI and affectUI web (18 pre-S0 commits) never hosted | Medium | W1–W2 on preview; D2 |
| Clerk origin/instance mismatch blocks preview sign-in | Medium | P9, Q-4 |
| Startup index builds or migration exceed the health window | Low | P5 counts; B2 timing |
| N1 veto hides composed views on some old chats | Low | Literal answer kept; H-W2 |
| Single host, single writer: 1–3 min outage, untested restore | Certain / Low | D7, D12 |
| Intermittent `npm run build` exit 1 on Vercel | Medium | P12; retry policy on preview only |
| Live model quality for N2 actions, N4 citations, Q1 latency is unmeasured | Certain | Flags off; L1 |

## 9. Consolidated hosted-verification checklist (from every Result section)

| From | Not run / not verified, or limit | G1 action |
| --- | --- | --- |
| S0 | Hosted behavior; whether production fills manifest timing, `controlOutcome`, full `answer`; `goal`, `history/done` served anywhere | H-W1; N3 answered timing (desktop only) |
| C1 | Browser scenarios 1–5 never run; local-app capabilities untested; Vercel build and deploy not run | H-W5 covers gating; W1 |
| C1 | Direct visit to an `off` admin section briefly sends its request | Accept |
| C1 | `/v1/config` fails when Mongo is down | H-B3; monitor |
| C1 | `history/done` and unused `organizeDone`: user decision pending | Open, not a G1 blocker |
| N1 | Real Mongo query plans and index build time; reload of an evicted hosted task | P5, B2, H-B6, H-W2 |
| N1 | Executions partly outside the newest 512 proof rows lose proof; extra queries per task in the list | Watch task-list latency in traces |
| N3 | Hosted behavior; deployed specialist flags; real event volume; AI SDK keeps the error `code` | P1 task definition; H-W1 |
| N3 | `provider_retry` not counted; `flexible_retry`/`intent_fallback` show "Not confirmed" | Accept |
| N2 | Live model producing `displayActions`; scroll with stick-to-bottom; light mode | H-W4 (best effort) |
| N2 | Context sent even with empty actions; wiring tested by source text only | Accept |
| A1 | Real Mongo index use, TTL, `$regex` on `_id`, duplicate-key retry; screen reader | H-B5, H-W3, B2 |
| A1 | Traces rescan up to 5,000 runs per request on one worker; secret not in the stack | P7, D9; watch latency |
| A2 | Real Mongo duplicate-key, `$or` + sort; multi-worker; whether production stores a credential MCP URL | P3; B2 writes |
| A2 | Audit insert not atomic with config write; history and audit kept forever; `@` in a URL path not refused | Retention decision after G1 |
| N4 | Real Mongo `$in`; live model citing revisions; report-panel notices in a browser | Only after enablement |
| N4 | Capability reflects the setting at process start | Restart on change |
| Q1 | Real latency, tokens, USD, Mongo; live provider; fuzz scripts not rerun | L1 baseline window |
| Q1 | English only; first turn only; device selected forces full path; flag read at run creation | Accept |
| Q1 | `npm run build` intermittent exit 1 with the 16.4.3 advisory | Resolved locally by U1 (16.4.6, 5 of 5 builds exit 0); Vercel behavior still to confirm in the W1 log |
| A3 | (in progress) migration on real data, fail-closed list, test spend caps | B2, H-B3, H-W6 |
| All | Graph freshness unresolved; backup restore untested | Q-5, D12 |

## 10. Open questions found during research

1. **Q-1 Which backend is live?** `docs/STATUS.md:32` and `infra/orchestrator/README.md:20` say `ab89e2b`/`d58e6e13…`; later web evidence says `188ebc0`/`6af54c87…` (`saved-revision-confidence.md:33`, `HANDOFF.md:72`). **Answered 17 Nov: `188ebc0` is live (`/health`, task image `6af54c87...`).** STATUS is stale and also predates the AG-UI work.
2. **Q-2 Rollback target:** the 15 Nov record names `bb49ed58…` as the previous image; for G1 the rollback target is the running `6af54c87…` (as `singular-design-default-release-gates.md:20` warns). **Answered 17 Nov:** it is in `datumm-opencode-builder-hosted-opencode`, alongside `bb49ed58...`.
3. **Q-3 Build source:** `builder.buildspec.yml` needs `SOURCE_SHA` but the repo commits are not on GitHub; the 15 Nov build used a reviewed S3 archive (`saved-revision-confidence.md:29`). The builder project's source configuration is not in the repo.
4. **Q-4 Clerk:** `.env.example:1` says "same Clerk instance as the existing DATUMM account host"; the local G1 test used a Clerk development instance. **Answered 17 Nov:** production uses the Clerk development instance (`civil-airedale-72`), the same one as the local tests; preview origins are not in `ClerkAuthorizedParties` (see Q-10).
5. **Q-5 `.env.example`:** says development uses `http://localhost:3001` for the service, but `backend.ts:9` throws on any non-https origin; `ADMIN_EMAILS` is missing.
6. **Q-6 The 47 checks** are recorded only in a session scratchpad, not in any packet or repo.
7. **Q-7 HANDOFF** names the web branch `codex/ui-ux-foundation-2026-11-12` (`HANDOFF.md:10`), which stops at `a403747`; `main` is 3 docs commits further (`77c078a`). The request said ~47 commits ahead; observed 45.
8. **Q-8 Parity script** compares "Azure vs AWS"; Azure is deactivated (`STATUS.md:17`), so it needs a second live host (staging) to be useful.
9. **Q-9 `e8cefa7`** (composition producer, general Plan admission) ships with this release though it predates the phased plan; its packets say "controlled local only".
10. **Q-10 Preview sign-in:** a Vercel preview origin is not authorized by the backend (`ClerkAuthorizedParties`). **Decided 17 Nov (user): add the preview address to the B3 change set.** The exact address is read at the new step W0 (a push, needing its own approval) before B3.
10. **Q-10 Template drift:** deploys use `--use-previous-template`; whether the live template matches `stack.json` (for example `AdminSubjects`) is unverified.
