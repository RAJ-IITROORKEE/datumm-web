# Phase packet — N1: Durable completion proof

| Field | Value |
| --- | --- |
| Status | **proposed, awaiting user approval** |
| Depends on | C1 (done 16 Nov) |
| Approved by / date | |
| Base commits | Web `codex/ui-ux-foundation-2026-11-12` (C1 checkpoint); backend `c188add` on `codex/web-ui-harness-20261116` |

All `path:line` facts below were **observed** in source on 16 Nov (backend `c188add`, web working tree). Statements marked *inferred* were not run. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

A completed answer keeps its completion proof, and with it its validated composed presentation, after the task has produced more than 2,000 later events, on reload and in the live snapshot. Stale, foreign, failed or contradicted answers are still denied.

Non-goals: deployment or hosted rollout (G1); backfill or rewriting of stored answers, runs or events; a new endpoint or event type; any change to v2 commands, checkpoints, the composition grammar or native authority; live-provider composition quality; the 200-event inline loss on runs whose `run_events` write failed (section 11, item 1).

## 2. Current state (verified)

| Item | State | Evidence |
| --- | --- | --- |
| Where proof is made | Built on every projection by `completion_proof()` from run data plus task events of that execution: exactly one `answer` event whose detail equals `answer[:2000]`, one later `completed` event, no later deny-stage event; hash is SHA-256 of the full UTF-8 answer | `task_controller.py:281-316` (filter `:297`, deny list `:305-309`, hash `:311`). *Implemented and tested* (`test_chat_projection.py:15-60`) |
| Event input to the proof | `proof_events = task_events.read(task, 0, tail=True)`: the **newest 2,000** task events, also for incremental polls | `task_controller.py:214-216,245`; `task_events.py:49-53` (`limit(2000)`) |
| When the proof is lost | When the answer's `answer`/`completed` events are older than the newest 2,000 task events, `answers`/`terminals` are empty and `completion_proof` returns `None`; then no `completion` and no `presentation` are attached. The literal answer stays | `task_controller.py:301-304,360-367`. **Eviction is a read window, not deletion:** no TTL or delete on `task_events` or `run_events` anywhere in `apps/` (indexes `storage.py:24,31`). *Implemented, under-tested*: no test covers >2,000 events |
| The 200 inline cap | Each run keeps only its newest 200 events inline (`$slice:-200`) and `public_run` returns 200. Durable copies go to `run_events` through an outbox. `import_run` falls back to the inline 200 only for an old dual-write failure. For v2 the projection replaces `events` with task events | `storage.py:193,201-208,112-115`; `task_events.py:56-77`; `task_controller.py:240` |
| Presentation source | `agent_composition` is checkpointed with the answer in run data (durable, not in events). It is revalidated against the full answer on every read and cleared when a later answer is written | `agent_workflow.py:2724-2737`; `chat_composition.py:107-122`; `storage.py:212-215`; `task_controller.py:363-366` |
| `completionSequence` origin | The task-level sequence is allocated when run events are imported during a projection, not when the run finishes | `task_controller.py:189-193`; `task_events.py:26-46,70-77`; run finish `main.py:180-186` |
| Response caps | `PublicTask.events` ≤ 2,000; event `detail` ≤ 2,000 chars | `task_contracts.py:344,313`; `storage.py:142` |
| Callers of the projection | Task GET, task list (one projection per row), SSE stream, share view, report history | `task_api.py:118,124,188,194`; `share_api.py:68`; `report_history.py:42` |
| Web: client gate | `answerCompletionCandidate` checks the exact 7-key shape, task and turn identity, uniqueness, and vetoes only on **visible** contradictory events; it does not require the answer events to be present. `verifyAnswerCompletionHash` recomputes SHA-256 over UTF-8 (max 100,000 chars). `BoundAnswer` binds the result to the workspace scope and epoch | `conversation-turns.mjs:84-97`; `conversation-answer.tsx:11-28`; `conversation.tsx:561-562,614`. *Implemented and tested* (`agui-recorded-replay.test.mjs`, `chat-composition-view.test.mjs`, `m6-conversation-controls.test.mjs`, `historical-outcome.test.mjs`) |
| Web: legacy event proof | `answerHasCompletionProof` needs the `answer` and `completed` events in the snapshot, so it also fails after eviction. It is used only when `completion` is absent | `conversation-turns.mjs:39-45`; `conversation.tsx:561` |
| Web: composition gate | Schema plus `answerHash` equal to SHA-256 of the full answer | `chat-composition.mjs:15,34`. *Implemented and tested* |
| The 12 shared vectors | Python writes them (`DATUMM_COMPOSITION_VECTORS`), the web replays them. They cover **composition validation**, not the completion hash | `test_chat_composition.py:63-95`; `tests/fixtures/chat-composition-vectors.json`; `tests/chat-composition-conformance.test.mjs:8-13` |
| Producer | **Controlled local only.** It exists on this backend branch, is not deployed (last deployed source 188), and was qualified with controlled model decisions and a Mongo mock | [agui-composition-producer.md](agui-composition-producer.md); `test_chat_composition.py:161-191`; `tests/fixtures/agui-produced-task.json` (3 events) |
| Hosted proof after eviction | Planned (this phase) | none |

*Inferred:* production has no stored `agent_composition` today because the producer was never deployed. So for answers completed before N1, the change only affects `completion` (saved-answer state and output controls), not composed views.

## 3. Decisions needed (recommendation first)

1. **Where the durable evidence comes from.**
   - **(A, recommended) Targeted read, no new storage.** Replace the tail read for proof with one indexed query of proof-relevant events (`answer`, `completed` and the deny stages) for the candidate executions. The events already exist forever (section 2), so this restores proof without a write path, growth or idempotency risk. The backend change is size **S**.
   - (B) Proof field on the run document, written once on the first successful derivation in a projection. It cannot be written at run completion because `completionSequence` does not exist yet. It still needs (A)'s query to veto contradictions older than the tail.
   - (C, roadmap) A new `answer_proofs` collection keyed by owner, task, turn, execution and answer hash. It has the same write-timing problem as (B), duplicates the composition that run data already holds, and also needs (A)'s veto query. Size M.
2. **Feature flag.** **(Recommended for A) none:** nothing is stored, so rollback is a revert. Alternative: `durable_completion_proof_enabled: bool = True` in `settings.py`, matching the existing `*_enabled` flags (`settings.py:18-21`), with off restoring the tail read. Required if you choose B or C.
3. **Retention and size bound.** **(Recommended, A)** no new stored bytes. The read is capped at 512 proof-stage rows per projection; past the cap the affected answers get no proof (deny, literal answer kept). The response shape is unchanged. For B/C: about 300 bytes per completed answer, kept for the task's lifetime, no TTL.
4. **Reload contract.** **(Recommended)** no new endpoint and no new field. The existing `conversation[].completion` and `.presentation` on `GET /v2/tasks/{id}` and the SSE snapshot simply stop disappearing. Alternative: a new `GET /v2/tasks/{id}/answers/{turnId}/proof`, which needs a proxy allow-list entry, a capability flag and a client fetch.
5. **Answers completed before N1.** **(Recommended)** apply the same proof rules to every answer whose events are intact. This is not a backfill: nothing is written, and an answer passes only if it passes today's checks. Alternative (roadmap wording): literal answer only for runs finished before a cutoff, which needs a cutoff setting and a run timestamp check, and withholds proof that is valid.

## 4. Design (for option A; B/C differ only where noted)

- **Candidates.** In `conversation()`, run today's non-event checks first (owner, task, unique segment and command, `applied`, run and result `completed`, `response_ready`, no error, `result.answer == answer`; `task_controller.py:284-296`). The executions that pass are the only ones queried.
- **Read.** One query in `task_events.py`, `proof_rows(task_id, execution_ids, cursor)`: `{taskId, executionId: {$in: ids}, stage: {$in: PROOF_STAGES}, sequence: {$lte: cursor}}`, limit 512. `PROOF_STAGES` is `answer`, `completed` plus the deny list at `task_controller.py:305-307`, kept as one shared constant. It needs one additive index `(taskId, executionId, stage)` in `storage.initialize` (`storage.py:31`). `completion_proof()` keeps its logic unchanged and receives these rows instead of the tail. The answer events' `detail` and the identity checks are unchanged.
- **Owner and isolation.** The query is scoped by `taskId` from the owned task (`task_controller.py:42-47,172`) and by execution ids that already passed the owner and segment checks. Rows of another task or execution cannot match.
- **Stale, foreign, failed.** These are unchanged and now enforced over the full history: a later deny-stage event anywhere vetoes the proof (today a veto older than the tail is invisible). A hash mismatch, a changed `agent_result.answer` or a missing `response_ready` denies the proof. An invalid composition keeps the completion and drops the presentation (`task_controller.py:364-366`). The web gate is unchanged and still re-verifies the hash and identity.
- **Idempotency.** The projection gains a read only: no writes, no commands, no event appends. `import_run` is unchanged.
- **Size.** At most 512 small rows read per projection. The task list projects every row (`task_api.py:118`), so the cost there is one extra indexed query per task (*inferred* cost, measured in tests by call count only).
- **v2 compatibility.** No change to commands, checkpoints, `PublicEvent`, `PublicTask` or `completion` keys. A paused (`paused_recovery`) task projects exactly as today except that earlier completed turns can regain `completion`.
- **Web.** No application change is expected (`conversation-turns.mjs:84-92` already accepts proof without visible events). The phase adds an eviction test and a dev fixture view.
- **Reused:** `completion_proof`, `validate_stored`, `answerCompletionCandidate`, `verifyAnswerCompletionHash`, `validateChatComposition`, the dev `HarnessReplay` and `tests/fixtures/agui-produced-task.json`. No new components or dependencies.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, one owner):

| File | Change |
| --- | --- |
| `task_events.py` | `PROOF_STAGES` constant and `proof_rows()` (bounded query) |
| `task_controller.py` | `projection` passes the targeted rows to `conversation`; the tail read stays for `events` only (`:214-216`); the deny list reads `PROOF_STAGES` |
| `storage.py` | Index `(taskId, executionId, stage)` on `task_events` |
| `test_durable_completion_proof.py` (new, `mongomock_motor` as in `test_historical_projection.py`) | Tests in section 8 |
| `lat.md/chat-projection.md` | Replace "The bounded event tail can omit proof for older answers" with the targeted-read rule; `lat check` |
| `apps/domain-api/README.md` | Code-map line for the new test |

**Web** (`datumm-web`, current branch, one owner):

| File | Change |
| --- | --- |
| `tests/completion-after-eviction.test.mjs` (new) | Replay after eviction from `agui-produced-task.json` with its answer and completion events removed (section 8) |
| `src/components/dev/harness-replay.tsx` | A "Saved answer after eviction" button that renders the captured snapshot without the turn's events through `ReplayAnswers` (no transport, no command). Dev only, 404 in production through the existing page |
| `docs/ux/agui-composition-producer.md` | One line pointing the retention limit to this packet |

## 6. Contract changes

| Change | Kind |
| --- | --- |
| `completion` and `presentation` survive more than 2,000 later events | Backend behavior fix, size S; no schema change |
| New `task_events` index | Backend storage; additive. Built at service start (`storage.initialize`) |
| Contradiction veto covers full history | Behavior tightening: an old answer whose later contradiction had left the tail no longer shows proof |

No change to the AG-UI events, proxy allow-list, v2 commands, checkpoints or native authority.

## 7. Dependencies and risks

No new dependencies.

| Risk | Containment |
| --- | --- |
| Index build on a large production `task_events` collection at first start | Additive and non-unique. Hosted rollout is G1 and needs approval; record the collection size before deploy |
| Projection latency (task list projects every task) | One indexed query; a call-count test; cap of 512 rows; past the cap the answer is denied |
| Python/JS hash mismatch | The proof hash is unchanged (`task_controller.py:311`, `conversation-turns.mjs:96`). A lone surrogate raises in Python (deny) and becomes U+FFFD in JS (mismatch, deny). Add one shared completion-hash vector (astral, combining, CRLF) to the web test. The 12 composition vectors stay as the presentation check |
| Old answers regain `completion` and so output controls (decision 5) | Same proof rules as new answers; if you choose the cutoff option, those answers stay literal |
| Mongo mock differs from real Mongo for `$in` and index use | The query uses plain operators. Real-Mongo verification belongs to G1 and is recorded as not run |

## 8. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 182 + 26 subtests), new file, each test written to fail on `c188add` first:

1. **Eviction:** answer and completed events followed by 2,001 events of another execution, so the projection keeps `completion` (sequence, hash) and `presentation`.
2. **Foreign owner:** run owner, or task id, foreign, so no proof even with matching rows; rows of another task with the same execution id are ignored.
3. **Stale hash:** `data.answer` differs from the event detail or from `agent_result.answer`, so no proof; composition `answerHash` stale, so completion without presentation.
4. **Failed validation:** invalid `agent_composition` gives completion only; `failed` or `paused_recovery` after the answer, both older than the tail, gives no proof.
5. **Paused-task compatibility:** a v2 task in `paused_recovery` with an earlier completed turn. `PublicTask` validates, the command receipts and `eventSequence` are unchanged, and the earlier turn has proof.
6. **No repeated commands and bound:** two projections perform no writes beyond the existing import; more than 512 proof rows denies the proof and keeps the literal answer.

The existing `test_chat_projection.py` and `test_chat_composition.py` pass unchanged.

**Web** (`npm test`, baseline 607): the new test loads `agui-produced-task.json`, replaces `events` with 3 unrelated events, and asserts that `answerCompletionCandidate` passes, the hash verifies, and `validateChatComposition` returns non-null; the legacy `answerHasCompletionProof` is false. Denials: tampered `answerHash`, foreign `taskId`, a visible contradictory event at or after `completionSequence`, a duplicated completion. It also checks one shared completion-hash vector.

**Browser** (built-in browser, local dev server, controlled fixture only, no hosted service), `/dev/chat-composition`, at 1280 px and 390 px, light and dark:

1. Click "Saved answer after eviction". The composed view renders, the disclosure works by keyboard, full-answer copy is exact, there is no horizontal overflow at 390 px.
2. Reload the page and repeat 1. Same result, no network request to `/api/agui` or `/api/service`.
3. The existing tampered-hash and different-task previews still fall back to the plain answer.

A real reload of an evicted hosted task needs G1 and is not part of N1.

## 9. Acceptance criteria

- An answer whose events are more than 2,000 events old keeps its `completion` and valid `presentation` (backend test 1, web test, browser 1–2).
- Foreign, stale, failed, contradicted or over-cap cases are denied, and the literal answer always remains.
- Projection performs no new writes or commands; the paused v2 task projects compatibly.
- No change to commands, checkpoints, event or task schemas.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`. Counts recorded.

## 10. Rollback

Revert the backend and web commits. Option A leaves only the extra index behind; it is harmless and can be dropped by hand. Proof then returns to the tail window. No stored answer, run, event or checkpoint is modified. (B/C: the flag off restores tail behavior; stored proof rows remain unused.)

## 11. Open questions found during research

1. **"Evicts" vs code:** the roadmap and producer note say old events are evicted. No code deletes `task_events` or `run_events` (no TTL, no delete in `apps/`); the loss is the `limit(2000)` read window (`task_events.py:52`, `task_controller.py:215`). The real loss is narrower: runs whose `run_events` publication failed keep only 200 inline events (`storage.py:193`, `task_events.py:58,66-69`). Is out-of-band retention (Atlas or ops) pruning `task_events`? It is unknown from source. If it does, option A is wrong and C is needed.
2. **"Store the presentation projection":** the presentation input is already durable in run data and revalidated on read (`task_controller.py:364`). Only the proof is tail-bound.
3. **"Written at completion":** the proof's `completionSequence` is a task-event sequence assigned during projection import, not at run finish (`main.py:180-186` vs `task_events.py:70-77`). Any stored proof is written at first projection, or its shape changes.
4. **"Reuse the 12 shared vectors" for the hash risk:** those vectors test composition validation, not the completion hash. N1 adds a completion-hash vector instead.
5. **Web "reads the durable projection":** no web code change is needed; the client gate already works without visible events (`conversation-turns.mjs:84-92`).
6. **Roadmap size M:** with option A the backend is size S.
7. **Handoff source table** lists the backend at `e8cefa7`; the branch HEAD is `c188add` (the C1 commit).

## 12. Result (fill at checkpoint)

| Item | Outcome |
| --- | --- |
| Commit | |
| Gates run (command, Node version, counts, date) | |
| Browser evidence (tool, URL, scenario, result) | |
| Not run or not verified | |
| Limits found | |
| Next step | |
