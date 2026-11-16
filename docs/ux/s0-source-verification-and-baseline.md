# Phase packet — S0: Source verification and backend baseline

| Field | Value |
| --- | --- |
| Status | done 16 Nov 2026 |
| Depends on | none |
| Approved by / date | User, 16 Nov ("Approve the roadmap and start S0") |
| Base commit | Web `d766337`; backend `188ebc0bc0599ff84f3760aaef24711e522972ae` |

## 1. Goal and non-goals

Replace recorded status with source-verified status for the web chat stack, and create the backend checkout that later phases build on. Non-goals: any application change, deployment, push, or change to the hosted backend, `Datumm-opencode`, the frozen candidate or the paused alternative-count branch.

## 2. Current state (verified)

Method: an independent Opus agent read source and tests (no test run, no browser); the orchestrator re-checked the three surprising findings, marked ✔. Status key: **T** implemented and tested; **U** implemented, under-tested; **C** controlled or local only; **P** planned or missing. Tests were not rerun for this packet beyond the last full run (603 passed, 16 Nov); assertions below are from reading the test files.

| Feature | Status | Evidence | Not covered |
| --- | --- | --- | --- |
| `/api/agui` endpoint and adapter | T | `src/app/api/agui/route.ts:8-14`; `src/lib/agui/adapter.mjs:46-86` emits `RUN_STARTED`, `ACTIVITY_SNAPSHOT`, `STATE_SNAPSHOT`, `MESSAGES_SNAPSHOT`, `TEXT_MESSAGE_START/CONTENT/END` (whole answer as one delta), `RUN_FINISHED`, `RUN_ERROR`; polls v2 events (`:167`); idempotent admission; `tests/agui-adapter.test.mjs` (18) | 80-attempt and 240 s bounds; **approval-interrupt resume has no client path** (`prepareInput` accepts question answers only, `:27-33`); client cancel after admission only detaches the observer (`:213`) |
| Client transport | T | `src/lib/agui-chat-transport.ts:55-98`; `tests/agui-chat-transport.test.mjs` (10) | **No reconnection** (`:132` returns null); **`RUN_ERROR` codes dropped**, only the message is thrown; `STATE_SNAPSHOT`, `MESSAGES_SNAPSHOT` and interrupt metadata ignored (the question UI reads the task snapshot) |
| Legacy `/api/chat` route | T (unused) | `src/app/api/chat/route.ts`; no `src` caller; kept alive by `tests/chat-stream-failure.test.mjs` and smoke | Candidate for removal; needs a decision |
| Hosted grouped-question resume | T | `adapter.mjs:17-33,121-158`; `question-stepper.mjs`; `tests/agui-adapter.test.mjs:29-89`, `question-stepper.test.mjs`, `grouped-questions.test.mjs` | More than one interrupt, approval resume, native (OpenCode) questions (use `tasks/{id}/questions/answer`, not served by production) |
| Process grouping, historical status | T | `process-activity.mjs:9-41`; `turn-nesting.mjs:59-67`; `turn-process.tsx:19,164,216`; `turn-process.test.mjs` (21), `turn-nesting.test.mjs` (7), `historical-outcome.test.mjs` (8) | Whether production fills the manifest fields it reads |
| Per-tool duration and outcome **in the web** | T ✔ | Reads `run_manifest.tools[].elapsedMs` and `status` (`agent-activity.tsx:141,151`; `turn-process.tsx:34-39`), `manifest.elapsedMs`, and `controlOutcome` (`turn-nesting.mjs:64`) | Event-level `durationMs` and `outcome` are not read; production filling is unverified |
| Composition validator and gate | T | `chat-composition.mjs:4-34` (7 node types: text, stack, grid, details, table, bars, flow; hash and identity bound; strict bounds); `chat-composition.tsx:24-32`; `tests/chat-composition*.test.mjs` incl. 12 shared Python/JS vectors | — |
| Composition producer | C | Backend finish tool, checkpoint and projection exist only in the local candidate, not deployed | Live provider quality, hosted behavior |
| Recorded replay and dev routes | C | `/dev/*` and `/api/dev/agui-replay` return 404 unless `NODE_ENV==='development'`; `agui-recorded-replay.test.mjs` (3) | No unit test of the 404 gate; production 404 checks run only with `--production` ✔ (`runtime-smoke.mjs:25`; `package.json` script has no flag) |
| Completion proof dependence on the event tail | U | `conversation-turns.mjs:39-45` needs exactly one `answer` event and a later `completed`; durable `turn.completion` path `:84-97`; `historical-outcome.test.mjs:41-54` | No eviction fixture (N1) |
| Capability detection | P | No `capabilities` endpoint. `GET config` already carries `runtime`, `nativeAvailable`, `nativeReadAvailable`, `supportedExports`, `agentEnabled`, `models` (`use-workspace-state.ts:42,151-153,522-529,663`); 404/405 treated as "unsupported" for rename, move, projects (`:82,1129-1140`) | Admin "Backend not deployed yet" shows for any 404, so a missing proxy path and a missing backend route look the same (`use-admin.tsx:18,72`) |
| Proxy allow-list vs production | U | `src/app/api/service/[...path]/route.ts:5,21`; `service-proxy.test.mjs`, `admin-proxy.test.mjs`. Allow-listed but not served by production (per the harness report): `tools`, `tasks/*/cancel`, `questions/answer`, `queue*`, `design-review` | |
| **UI calls the proxy blocks** | bug ✔ | `tasks/{id}/goal` (`conversation.tsx:707`) and `tasks/{id}/history/done` (`use-workspace-state.ts:1128`, `organizeDone`) match no allow-list pattern, so they always get the proxy's 404. `history/done` is not wrapped in the 404-tolerant `guarded` helper | Whether any backend serves them |
| Admin pages | T/U | Overview, Knowledge, Audit, Agent, Web search, Skills, MCP call the five backend endpoint groups (`use-admin.tsx:89,110`, `data-sections.tsx:25,42,76-94`, `form.tsx:31`); Plugin reads a static file; gate in `admin/layout.tsx:14-17`; `admin-*.test.mjs` | The "Backend not deployed yet" copy is untested |

## 3. Design

No UI change. References: [research record](research-reference-and-harness-2026-11-16.md), [roadmap](roadmap-2026-11-16.md).

## 4. Change list

No application change. Documentation only in the web repo (this packet, roadmap wording for N3 and C1, the runtime-check command in `AGENTS.md` and two READMEs, the research record, handoff, plan). Backend: new checkout and one local commit (section 10).

## 5. Contract changes

None.

## 6. Dependencies and risks

No new dependencies. Risks recorded: the backend checkout differs from the candidate only in carriage returns in three knowledge files (`lat.md/`), because the candidate was checked out with Windows line endings; code files are byte-identical.

## 7. Tests and browser scenarios

Backend: `pytest` in `apps/domain-api` with the existing Python 3.12 virtual environment; `lat check`. Web: source reading only. No browser scenario.

## 8. Acceptance criteria

- Source-verified matrix committed (section 2). **Met.**
- Backend baseline recorded. **Met:** clean `188ebc0` 132 passed + 9 subtests; with the presentation patch 180 passed + 26 subtests (matches the earlier record); `lat check` passed.
- Patches apply cleanly or conflicts are documented. **Met:** both dry-run clean; only the presentation patch was applied because it already contains the Plan-intent repair.

## 9. Rollback

Delete the `datumm-orchestrator` folder; revert the web documentation commit.

## 10. Result

| Item | Outcome |
| --- | --- |
| Backend checkout | `E:\Web development\PROJECTS-FULL STACK\datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, commit `e8cefa7` on `188ebc0` (13 files, +806 −15). Its `origin` is a local path (the candidate folder), not GitHub. Not pushed |
| Gates run | Backend `pytest` baseline and patched (above), `lat check` passed (16 Nov, Python 3.12.10, Node 24.18.0 for `lat`). No web test rerun |
| Not run or not verified | Web tests this phase; browser; whether production fills manifest tool timing, `controlOutcome` or the full `answer` text; whether any backend serves `goal` or `history/done`; hosted behavior |
| Limits found | See section 2 and the assignments below |
| Next step | Approve the C1 packet (capability contract and config consistency) |

### Findings and where they go

| Finding | Assigned to |
| --- | --- |
| Roadmap N3 overstated the web gap: it already shows manifest tool timing and status | N3: first confirm production fills them, then add event fields only where missing |
| `GET config` is already a partial capability signal | C1: extend it, do not replace it |
| Admin 404 copy cannot tell a proxy 404 from a backend 404 | C1 |
| `goal` and `history/done` UI calls always 404 at the proxy | C1: allow-list if a backend serves them, otherwise remove or hide the action (user decision) |
| Legacy `/api/chat` route unused by `src` | C1: decide removal (user decision) |
| `RUN_ERROR` codes dropped by the client transport | N3 |
| Approval-interrupt resume has no client path | N3 or N2, decided in that packet |
| No transport reconnection | N5 |
| Completion proof depends on the event tail | N1 (already planned) |
| `npm run check:runtime` skips production 404 checks without `--production`, and `--production` must follow an explicit origin | Fixed in `AGENTS.md` and READMEs in this checkpoint |
