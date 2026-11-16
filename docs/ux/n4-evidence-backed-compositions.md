# Phase packet — N4: Evidence-backed compositions and versioned interactions

| Field | Value |
| --- | --- |
| Status | **done 16 Nov 2026** (local; not pushed or deployed) |
| Depends on | N1 (done 16 Nov), N2 (done 16 Nov) |
| Approved by / date | User, 16 Nov (chose "N4 first"): every decision takes its recommended option (A) |
| Base commits | Web `codex/ui-ux-foundation-2026-11-12` working tree at the end of A2; backend `70395b3` on `codex/web-ui-harness-20261116` |

All `path:line` facts below were **observed** in source on 16 Nov (backend `70395b3`, web working tree). Statements marked *inferred* were not run. The only command run was a read-only byte count of the two tool schemas (section 2). No test, build, browser or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

An answer that talks about a saved report can show an **evidence card** for that report revision: its revision number, date, source plan and a few fixed totals. The server reads all of these from the immutable saved revision. The model only picks which listed revision to cite. Clicking the card opens that exact revision in the work area, and the browser checks its hash. Any reference that is wrong, foreign, stale or tampered drops the whole composed view, and the full answer stays.

Non-goals:

- Executable content, links, URLs or styles in the composition.
- New facts from the model. Numbers on a card come from the saved revision, never from model arguments.
- References to anything other than a saved immutable record, by exact id and hash (decision 1 sets which records).
- Interactive composition nodes (choice or form); see decision 6.
- Any native authority. A card never approves, builds, revises or sends anything.
- Deployment and hosted checks (G1). Live-provider composition quality stays unqualified until G1.
- New dependencies, a new endpoint, or changes to v2 commands, checkpoints or events.

## 2. Current state (verified)

Labels: **T** implemented and tested, **U** implemented but under-tested, **L** local or controlled only, **P** planned.

| Item | State | Evidence |
| --- | --- | --- |
| Composition grammar: exactly **seven** node kinds, `text`, `stack`, `grid`, `details`, `table`, `bars`, `flow`. Every leaf is a UTF-16 span of the final answer. There is **no** `metric`, `checklist`, `choice` or `form` node | T | `chat_composition.py:16-24,71-73`; web `chat-composition.mjs:6-14` |
| Contract text: "Optional illustrative layout … No new facts or actions"; module docstring "never supplies evidence or authority"; the UI notice reads "Illustrative explanation · not model measurements or execution evidence" | T | `chat_composition.py:1,16`; `chat-composition.tsx:32` |
| Bounds: at most 24 nodes, depth 4, 8 children (grid 2), span ≤1,200 and ≤8,000 total UTF-16 units, proposal ≤24,576 UTF-8 bytes, answer ≤100,000 units | T | `chat_composition.py:43-47,62-64,69,77`; `chat-composition.mjs:19-28,37-45` |
| Answer-hash binding: the server stores `{schemaVersion:1, kind:'illustrative-explanation', answerHash, root}`. `validate_stored` rebuilds it against the full answer on every projection. The projection adds `taskId`/`turnId` only under the completion proof. The browser re-checks the schema, identity and SHA-256 of the answer | T | `chat_composition.py:102,107-122`; `task_controller.py:359-365`; `chat-composition.mjs:15,32-34`; `chat-composition.tsx:26-31` |
| Producer: `finish_answer.composition` is offered on every `finish_answer` and validated only for `completed` results. It is checkpointed as `agent_composition` and cleared when a later answer omits it | L (controlled model decisions, Mongo mock; not deployed) | `agent_workflow.py:1108-1110,2789-2793`; `storage.py:228-231`; [producer note](agui-composition-producer.md) |
| N1: proof comes from a targeted read of proof-stage events, so `presentation` survives the 2,000-event tail | T (local) | [N1 result](n1-durable-completion-proof.md#12-result); `task_controller.py:359` |
| N2 binding pattern: the server lists ids the model may use (`turnIds` ≤11, read from the owned task, never the client). `displayActions` is validated whole-or-nothing, stored with `answerHash`, rechecked at projection against the task's commands, and its schema is offered only when the context lists actions | T (local) | `display_actions.py:41-75`; `agent_workflow.py:1111-1113,1621-1623,2290-2304`; `task_controller.py:366-370` |
| Shared vectors: 12 Python-written composition vectors (`DATUMM_COMPOSITION_VECTORS`) replayed by the web; N2 added 26 action vectors | T | `test_chat_composition.py:63-95`; `tests/fixtures/chat-composition-vectors.json` (12 entries); `tests/chat-composition-conformance.test.mjs:8-13` |
| Tool-schema cost. Recorded: ask tool list 9,746 → 11,235 compact UTF-8 bytes (+1,489) for `composition`, and +691 for `displayActions`. Re-measured today with compact JSON: `composition` schema 1,474 bytes, `displayActions` 678. The only automated bound is `< 5000` bytes | U: the measurement is a one-off, not a test | [producer note](agui-composition-producer.md) line 42; [N2 result](n2-frontend-capabilities-reversible-actions.md#12-result); `test_chat_composition.py:142` |
| **Evidence today: saved report revisions.** Insert-only `report_revisions`, owner- and task-scoped, `revisionId` = SHA-256 of owner, task, execution, semantic hash and parent. `contentHash` = SHA-256 of the canonical dataset. Linked by `parentRevisionId` from `tasks.reportHead`, at most 256 per task. Read by `GET /v2/tasks/{id}/reports/{revisionId}`, which re-hashes the dataset (503 on mismatch). **Content is concept-only:** proposed room areas from a saved plan, `sourceKind:'proposed'`, no native evidence | T (deployed earlier as source 1ef3861; [qualification](report-revision-history.md)) | `report_history.py:1,59-70,76,88-100,140-154`; `task_api.py:189-212` |
| Report publication timing: `publish` runs **after** the run completes, outside `finish_answer`. So a turn's own new revision does not exist while the model writes its answer | T | `main.py:180-186`; `agent_workflow.py:2802` |
| Orphan revisions: the revision is inserted **before** the head compare-and-set, so a lost CAS leaves a stored revision that is not in the history chain | T (inferred consequence) | `report_history.py:91-100` |
| Plan versions: immutable entries `{version, parentVersion, fingerprint, graph}` in an owner-scoped `plans` document (not task-scoped) | T | `plan_versions.py:10-17,37-45`; `variable_api.py:39` |
| Specialist evidence: digest-addressed immutable JSON (≤512,000 bytes), owner-scoped and restricted to the task's segments on read | T | `specialist_jobs.py:121-136`; `task_api.py:215-227` |
| Measurements (native quantities, element pages): **run-scoped observations only**, cited as `observation-<index>` by `findings[].evidenceRefs` and bound to document and revision. Not durable records with their own id or hash | T | `model_evidence.py:56-72,95-117`; `agent_workflow.py:1586-1589` |
| What the model can cite today: `findings.evidenceRefs` (current-run observations and regulation sources) and, in the packet, `authorityRefs.designVersions` (plan id, version, fingerprint). **No saved report revision is listed to the model** | T | `agent_workflow.py:1586-1591`; `agent_memory.py:160` |
| Web open path: `openSavedReport` opens the task's **current** report; the user picks a revision in a `<select>`. A preview and asset destination carry only `taskId`, never a `revisionId` | T | `work-area-contract.ts:12,20,63`; `review-report.tsx:10,128-144,187` |
| Versioned interactions: `ask_question` builds a `QuestionSet` (≤4 items, ≤3 options) with a server `version`. The `answer` command requires `questionVersion` and is rejected on mismatch. The web sends it, and the AG-UI resume id is `questionId:version`. Composition has no interactive nodes | T | `agent_questions.py:38-58,61-73`; `task_contracts.py:185-190`; `use-workspace-state.ts:776`; `adapter.mjs:18,42,77` |
| Capability gate: C1 tri-state flags. N2 flags treat `unknown` as off | T | `capabilities.mjs:1-22`; `main.py:291-293` |
| Dev fixture `/dev/chat-composition`: composition preview with "invalid" and "foreign" toggles, plus the N1 replay | L | `src/app/dev/chat-composition/page.tsx`; `chat-composition-preview.tsx:24-25`; `harness-replay.tsx:54` |

*Inferred:* production has no stored `agent_composition` (producer never deployed), so N4 changes no stored answer.

## 3. Decisions needed (recommendation first)

1. **Referenceable evidence in N4.**
   - **(A, recommended) Saved report revisions only.** They are the only records that are task-scoped, immutable, hashed, readable by id and openable in the UI.
   - (B) Also plan versions. They are immutable and fingerprinted, but owner-scoped rather than task-scoped and have no hash over the graph bytes (the fingerprint is the identity). Adds a second resolver and opening path.
   - (C) Also specialist evidence. It is immutable, but it is download-only JSON with no viewer.
   - Measurements cannot be referenced in any option: they have no durable id (section 2). They wait for D9's native measured BOQ history.
2. **Reference shape and resolver.**
   - **(A, recommended)** The server lists up to 8 revisions from the task's history chain in the packet as `evidenceRefs: [{key:"report-3", revisionNumber, createdAt, title}]`, like N2's `turnIds`. The model writes only `{"type":"evidence","ref":"report-3"}`. At finish, the server binds each key to `{kind:"report-revision", revisionId, contentHash}` and stores it. At every projection the server re-reads those revisions with one `$in` query scoped by owner and task, compares `contentHash` and adds the display fields. The browser re-checks the shape and the answer hash, and checks `contentHash` again when the revision is opened.
   - (B) The model copies the 64-hex `revisionId` and `contentHash` itself. This costs about 80 tokens per reference and invites copying errors.
   - (C) The browser resolves each card by fetching the revision. This means N requests per answer, and the dataset can be up to 2 MB.
3. **What a card displays.**
   - **(A, recommended)** Fixed server fields only: revision number, created date, source plan title and version, row count, and `quantityTotals.proposedRoomCount` and `proposedAreaM2`, labelled "Proposed concept geometry · not measured Revit quantities" (the dataset's own limitation).
   - (B) Link-only card (revision number and date).
   - (C) Model-chosen rows or fields. Rejected: the model would choose which facts appear.
4. **New node kinds.** **(Recommended)** One leaf, `evidence`. A citation list is a `stack` of evidence nodes. At most 4 evidence nodes, inside the existing 24-node limit. Alternatives: an evidence card plus a separate `citations` node; or adding `metric`/`checklist`, which do not exist today and would be new model-authored layouts.
5. **Stale, foreign or unresolvable references.** **(Recommended)** Drop the **whole** composition and keep the full answer, the same all-or-nothing rule as today. Revisions are never deleted, and a soft-deleted task is not readable at all. So this covers a hash mismatch, a revision missing from the owner and task, an orphan, or tampering. Alternative: keep the layout and show an "Unavailable evidence" card, which needs a third projected state and more tests.
6. **Versioned interactions.** **(Recommended)** Add no `choice` or `form` node in N4. The versioned path that exists stays the only one: `ask_question` with a server version, and an `answer` command with `questionVersion` (section 2). N4 proves that an evidence card can never issue a command and that replaying or reloading never resubmits. Alternative: a `choice` node bound to `{questionId, version}` that submits through the existing answer command. It duplicates the question UI, and it would make composition a command source, which conflicts with AGENTS.md §6.
7. **Schema budget and when it is offered.** **(Recommended)** Budget **≤ +400 compact UTF-8 bytes** over today's 1,474-byte `composition` schema, measured by a test. The evidence variant is offered **only when the server lists at least one revision**; otherwise the schema bytes are unchanged. Alternative: always offer it (simpler, about +400 bytes on every `finish_answer` call).
8. **Flag, capability and rollout.** **(Recommended)** A backend setting `evidence_compositions_enabled: bool = False`, matching the `*_enabled` pattern (`settings.py:18-21`). It controls listing and offering and is off until the bytes are recorded. Capability `evidenceCompositions`, reported only when the setting is on, for operators; `unknown` is off. The web needs no gate to render, because it renders only nodes that validate, and an old web rejects the new schema version and shows the full answer. Alternative: no setting, revert-only rollback.
9. **Schema version.** **(Recommended)** Keep `schemaVersion: 1` byte-identical when there is no evidence node, so the 12 vectors and stored data stay valid. Use `schemaVersion: 2` and `kind: "evidence-backed-explanation"` when one is present, so an older browser falls back to the full answer instead of misreading it. Alternative: add the node to v1. An old web would reject it as an unknown type anyway, so the result is the same with less clarity.
10. **Citing this turn's own report.** **(Recommended)** Not in N4. Only revisions that exist when `finish_answer` runs can be cited. A turn's own new revision is published after completion (section 2). Alternative: a `this-run` key resolved at projection to the revision whose `sourceExecutionId` is this execution. It is useful for generate-then-answer, but it is empty when the semantic hash did not change and can race the history CAS.

## 4. Design (for the recommended options)

**Packet** (`agent_workflow.py`, beside `frontendContext`, only when the setting is on and the chain is non-empty): `evidenceRefs` holds at most the 8 newest revisions read by walking `reportHead` → `parentRevisionId` (the walk `report_history.history` already does). Each entry is `{key:"report-<n>", revisionNumber, createdAt, title≤120}`, plus a fixed system note: "evidenceRefs are saved concept reports; cite only listed keys; values come from the report, not from you."

**Model grammar** (added to the `nodes.items` schema only in the offered variant):

```json
{"id":"e1","type":"evidence","ref":"report-3"}
```

`ref` matches `^report-[1-9][0-9]{0,2}$` and must be a listed key. A node has exactly `id`, `type`, `ref`. Evidence nodes are leaves, at most 4, and no two may cite the same key.

**Stored by `finish_answer`** (`agent_composition`, same checkpoint):

```json
{"schemaVersion":2,"kind":"evidence-backed-explanation","answerHash":"<64 hex>",
 "root":{"type":"stack","children":[{"type":"text","text":{"start":0,"end":48}},
   {"type":"evidence","ref":{"kind":"report-revision","revisionId":"<64 hex>",
    "contentHash":"<64 hex>"}}]}}
```

**Projected** (`conversation[].presentation.composition`, under the completion proof only), with `taskId` and `turnId` added as today. Each evidence node gains a server-built `display`:

```json
{"type":"evidence","ref":{"kind":"report-revision","revisionId":"…","contentHash":"…"},
 "display":{"revisionNumber":3,"createdAt":"2026-11-16T10:00:00+00:00","planTitle":"…",
  "planVersion":2,"rowCount":6,"proposedRoomCount":6,"proposedAreaM2":104.5}}
```

**Validation, both sides.**

- Python `validate(proposal, answer, refs)`: when `refs` is given it accepts `evidence` nodes, maps keys to the bound ref, and returns v2. When `refs` is None it behaves as today.
- `validate_stored(value, answer, resolved)`: it takes the projection's `{revisionId: row}` map. It rebuilds the v2 tree and checks for each ref that the row exists for this owner and task and that `row.contentHash` matches. Then it attaches `display` from fixed row fields. Any failure returns None, so the whole composition is dropped.
- Web `validateChatComposition`: adds a v2 branch to the strict Zod union. `revisionId` and `contentHash` must match `/^[a-f0-9]{64}$/`. `display` is strict: integers ≥1, a finite number ≥0, ISO date, strings ≤120 characters. Unknown keys reject. The 64-hex answer hash, task and turn identity are checked as today.

**Resolution and binding.**

- In `projection()` (async), collect the evidence refs from the rows' `agent_composition`. Read them with **one** query, `report_revisions.find({_id:{$in}, owner, taskId}, {contentHash, revisionNumber, createdAt, sourcePlan, 'dataset.quantityTotals', 'changeSummary.rowCount'})`, capped at 32 ids per projection. Then pass the map into the synchronous `conversation()`.
- The full dataset re-hash stays in `get_revision`, which runs when a card is opened, so the task list does not re-hash 2 MB datasets.
- The chain check happens at finish time, because only listed chain revisions can be bound. The chain is append-only, so a bound revision stays in it, and orphans can never be bound.
- The binding layers are: owner and task (query scope), turn and answer (`answerHash` and completion proof), and revision (`revisionId` + `contentHash`).

**Open card** (web). `WorkAreaPreview` `saved-report` and `AssetDestination` gain optional `revisionId` and `contentHash`. `ReviewReportPanel` starts on that revision. It shows "This saved report no longer matches the cited revision" and keeps the current selection unless the fetched `revision.contentHash` equals the cited hash. Opening is a display change only. It reuses the existing scope and epoch check, and nothing auto-opens.

**Renderer** (`chat-composition.tsx`). The card is a `<figure>` with fixed labels, the totals and an "Open revision" button. All text renders as React text. For v2 the notice reads "Answer view with saved report evidence · concept geometry, not Revit measurements". Text, table, bars and flow nodes keep their "illustrative" captions.

**Fallback.** Every failure, on either side, at finish or at projection, yields no composition, and `AnswerContent` renders the full answer as today (`conversation-answer.tsx:29-31`).

**Prompt-injection containment.**

- The model picks a key from a server list.
- Ids, hashes and every displayed value come from Mongo.
- No URLs, no Markdown in card fields, and no command or draft path from the card. The registry test asserts that it imports no API or command setter.
- `planTitle` is length-bounded text.

**Vectors.** `test_chat_composition.py` appends at least 8 v2 vectors to the same file (resolved `display` included, since the browser validates the projected shape):

- valid single card
- valid card in a stack with text
- v1 carrying an evidence node
- bad hash format
- extra key in `ref`
- extra key in `display`
- 5 evidence nodes
- non-finite area

The web conformance test runs unchanged over 20 or more entries. The 12 existing vectors are untouched.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, one owner):

| File | Change |
| --- | --- |
| `chat_composition.py` | v2 `evidence` node; `SCHEMA_WITH_EVIDENCE` variant; `validate(..., refs=None)`; `validate_stored(..., resolved=None)` |
| `report_history.py` | `evidence_refs(task, owner, limit=8)` reusing the history walk; `resolve_refs(owner, task_id, ids)` single projected query |
| `agent_workflow.py` | Packet `evidenceRefs` and note; offer the variant schema; pass refs to `validate` at `:2790` |
| `task_controller.py` | Prefetch refs in `projection()`; pass the map to `conversation()`; `validate_stored` call at `:363` |
| `settings.py`, `main.py` | `evidence_compositions_enabled`; capability `evidenceCompositions` |
| `local/entry.py` | Report `evidenceCompositions: false` |
| `test_evidence_composition.py` (new) | Section 7 backend tests; schema byte test |
| `test_chat_composition.py` | Append v2 vectors; existing assertions unchanged |
| `lat.md/` composition note, `apps/domain-api/README.md` | Contract note; code map |

**Web** (`datumm-web`, current branch, one owner):

| File | Change |
| --- | --- |
| `src/lib/chat-composition.mjs` + `.d.mts` | v2 schema branch and `evidence` node output |
| `src/components/workspace/chat-composition.tsx` (+ `.module.css`) | Evidence card, v2 notice, Open button |
| `src/lib/work-area-contract.ts` | Optional `revisionId`/`contentHash` on `saved-report` preview and destination |
| `src/components/workspace/review-report.tsx` | Initial revision and hash check |
| `src/components/workspace/use-workspace-state.ts` or `workspace.tsx` (whichever owns `openSavedReport`) | Pass the cited revision through |
| `src/components/dev/chat-composition-preview.tsx` | "Evidence card" sample with "Tamper revision hash" toggle |
| `tests/chat-composition.test.mjs`, `tests/fixtures/chat-composition-vectors.json`, `tests/evidence-card.test.mjs` (new) | Section 7 web tests; regenerated vectors |
| `lat.md/contracts.md` | Evidence composition contract |

Reused: `validate`/`validate_stored`, the history walk, `get_revision` integrity check, N1 proof, N2 server-listed-id pattern, `ChatCompositionView`, `ReviewReportPanel`, the dev preview. No new dependency.

## 6. Contract changes

| Change | Kind |
| --- | --- |
| `finish_answer.composition` may contain `evidence` nodes (variant schema, only when refs are listed and the setting is on) | Backend, additive; tool bytes measured |
| `presentation.composition` `schemaVersion:2` / `evidence-backed-explanation` with server `display` | Backend projection, additive; v1 unchanged |
| Capability `evidenceCompositions` | Additive config key |
| Saved-report preview opens a given revision | Web only |

No change to v2 commands, events, checkpoints, the proxy allow-list (the reports endpoints are already used), `PublicTask` schema keys or native approval.

## 7. Tests, browser scenarios, acceptance, risks, rollback

**Backend tests** (`uv run --frozen pytest`, baseline 349 + 26 subtests). Each one fails first on `70395b3` where it can:

1. A listed key binds to the exact `revisionId` and `contentHash`; an unlisted key, a duplicate key or more than 4 evidence nodes drops the composition.
2. **Foreign:** a revision of another owner or another task with the same id never resolves; the composition is dropped.
3. **Wrong hash:** a stored `contentHash` that differs from the row drops the composition; the completion and the literal answer remain.
4. **Missing or unsaved:** an orphan revision (inserted, CAS lost) is never listed; a ref whose row is absent drops the composition.
5. With the setting off, or with no revisions, the packet has no `evidenceRefs` and the tool schema bytes equal today's.
6. The variant schema grows by ≤ 400 compact UTF-8 bytes (asserted).
7. **Versioned interaction replay:** projecting twice performs no writes and no commands. A stale `questionVersion` is still rejected. A paused v2 task projects compatibly.
8. The v1 vectors are unchanged, and the v2 vectors are written.

**Web tests** (`npm test`, baseline 710):

- The v2 card validates; tampered `contentHash` format, extra keys, v1 with evidence, a foreign task or turn, and a changed answer each return null and render the full answer.
- The shared vectors agree (≥20).
- Opening a revision with a mismatched hash shows the notice and does not switch.
- The card module imports no command, API or draft setter.

**Browser** (built-in browser, local dev server, controlled fixture, no hosted service), `/dev/chat-composition`, at 1280 px and 390 px, light and dark emulation:

1. The "Evidence card" sample renders the revision number, date, plan and totals, with the v2 notice. No horizontal overflow at 390 px.
2. "Tamper revision hash" removes the composed view and shows the full answer.
3. Keyboard: Tab reaches "Open revision", Enter activates it in the fixture (it announces the cited revision; no network), and the existing disclosure still works.
4. The existing tampered-answer and different-task toggles still fall back.

A real open of a hosted revision from a live answer needs G1.

**Acceptance criteria.**

- Cards show only server-resolved values from an exact `revisionId` and `contentHash` of the same owner and task.
- Foreign, wrong-hash, unlisted, orphan and over-limit references drop the composition, and the full answer always remains.
- No card path issues a command. Question versions keep their authority.
- Schema bytes are recorded and within budget. v1 output is byte-identical.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`, runtime smoke `--production`. Counts recorded.

**Risks.**

| Risk | Containment |
| --- | --- |
| Tool-schema token cost on every finish | Offered only with listed refs and the setting on; byte test; the setting stays off until measured |
| A card looks like measured truth | Fixed "proposed concept geometry" label from the dataset; no model numbers; measurements excluded |
| Projection cost (task list projects every task) | One capped `$in` query with a field projection; no dataset re-hash at projection |
| Python/JS drift on the v2 shape | Shared vectors with resolved `display` |
| Injection through the plan title or answer | Server-chosen fields, text rendering, length caps, no links or commands |
| Real Mongo `$in` and field projection | Recorded as not run until G1 |

**Rollback.** Turning the setting off stops listing and offering; old v2 compositions still project, or turn off with a revert. Reverting both commits restores v1 only. Stored v2 `agent_composition` then fails v1 `validate_stored` and falls back to the full answer. No revision, plan, command or checkpoint is written or migrated.

## 8. Open questions found during research

1. **Registry contents:** the roadmap says to "extend the bounded registry (metric, checklist, choice or form)". None of these exist. The registry is `text`, `stack`, `grid`, `details`, `table`, `bars`, `flow` (`chat_composition.py:20`, `chat-composition.mjs:6-14`).
2. **"No new facts" contract:** an evidence card shows facts that are not in the answer text. They come from the server, not the model, but the schema description, module docstring and UI notice must change (`chat_composition.py:1,16`; `chat-composition.tsx:32`). Decision 9 makes the change visible as a new kind.
3. **"Cite … measurements":** no durable measurement record exists. Native quantities are run-scoped observations (`model_evidence.py:56-72`). Saved report revisions are concept-only proposed areas (`report_history.py:59-70`), so N4 cannot cite measured evidence.
4. **"Interactions carry versions":** they already do, through `ask_question` and `questionVersion` (`agent_questions.py:72`, `adapter.mjs:42`). Composition has no interactive node, so N4's remaining work there is proof that cards stay non-interactive.
5. **"Extend the finish-tool schema" with +1,489 as the baseline:** that number is a recorded one-off measurement with no test. The only automated bound is `< 5000` bytes (`test_chat_composition.py:142`). N4 adds a byte test.
6. **Same-turn citation:** a turn's report is published after `finish_answer` (`main.py:183-186`), so "generate, then cite its report" in one turn is not possible without decision 10B.
7. **Orphan revisions:** insert-before-CAS leaves revisions outside the history (`report_history.py:92-100`). A direct id lookup alone would accept them; N4 binds only chain revisions.
8. **Opening by revision:** the work area cannot open a given revision today; it opens the current report (`work-area-contract.ts:12,63`). N4 adds this.
9. **Roadmap size S–M:** the backend part is about S–M as estimated. The web open-by-revision path adds a small, separate change to `review-report.tsx`.

## 9. Result

| Item | Outcome |
| --- | --- |
| Commit | Backend and web N4 commits on their branches (see `git log`); not pushed |
| Backend change | `chat_composition.py`: `evidence` leaf, `SCHEMA_WITH_EVIDENCE` variant (+174 compact bytes over the 1,474-byte base, test-pinned under 400), `validate(…, refs)` returns v2 only when a card is present (v1 output byte-identical), `validate_stored(…, resolved)` re-checks owner/task scoped rows and the exact `contentHash` and attaches server-built `display`; any failure drops the whole composition; `createdAt` must match the web's pattern and carry an offset; `report_history.py`: `evidence_refs` (chain walk, max 8, orphans never listed) and `resolve_refs` (one owner- and task-scoped `$in` query up to 256 ids, no dataset re-hash); `agent_workflow.py`: `evidenceRefs` in the packet only when the setting is on and the chain is non-empty (listed once per run, key/number/date/title only, never a hash, note that titles are user text); `task_controller.py` projection prefetch; `evidence_compositions_enabled` (default off) and capability `evidenceCompositions`; `test_evidence_composition.py`; 26 shared vectors (13 new v2, one `serverOnly`) |
| Web change | Strict version union in `chat-composition.mjs` (v2 needs at least one evidence node, at most 4, no duplicate revision, strict `ref` and `display`); `evidence-card.tsx` (a `<figure>` of plain text, fixed labels, "Proposed concept geometry · not measured Revit quantities", an "Open revision N" button); the v2 notice; open-by-revision through the existing display-only path with the scope and epoch guard; `review-report.tsx` follows the history cursor to find an older cited revision and says "not found" (never a false hash mismatch) when it cannot; stable provider inputs; dev fixture "Evidence card" with a "Tamper revision hash" toggle |
| Gates run (16 Nov, Node 24.18.0, Python 3.12.10, orchestrator after all changes) | Backend `uv run --frozen pytest`: 408 passed + 26 subtests (baseline 349 + 26); `lat check` passed. Web `npm run typecheck`, `npm run build`, `npm test` 741 / 741 (baseline 710; the 26-entry vector file adds one test per vector), `lat check` passed; runtime smoke `--production` 18 / 18 on a fresh `next start` (port 3100) |
| Failing-first evidence | All 38 first backend tests failed on `70395b3`; every review fix on both sides had a test that failed first. The first web conformance run found one vector the browser cannot judge (a hash differing from the saved row is a server-side check) and it is now flagged `serverOnly` and skipped on the web |
| Browser evidence | Built-in browser, local dev server, `/dev/chat-composition` "Evidence card". 1 (1280 px): the card showed revision 3, date, source plan and version, rows, proposed rooms, proposed area 104.5 m², the concept-geometry label and the v2 notice; no links. 3: focus and Enter on "Open revision 3" announced "Fixture only, no request sent: would open cited revision ab12ab12ab12…" with no network request. 2 and 4: "Tamper revision hash", "Tamper answer hash" and "Different task" each removed the card and left the full answer; clearing them restored it. 390 px dark: the card fit (20–370 px), no page or card overflow, notice present. Not run in a browser: the report-panel notices for an older or missing cited revision (unit-tested only) |
| Independent review | 8 findings, none in binding, isolation or model-text leakage. Fixed: a false "no longer matches" notice for revisions older than the first 20 history entries (now paged, or "not found"), the web accepting a v2 composition with no evidence while Python rejected it (now rejected on both, pinned by a shared vector), Python and web disagreeing on date forms, older answers silently losing cards past 32 cited revisions (cap now 256), evidence refs re-read on every decide step (now once per run), plan titles as a prompt-injection channel (note added), a possible "-0 m²" display, an inline lambda rebuilding the context value, long lines |
| Not run or not verified | Real Mongo or Cosmos `$in` and field projection, a live model citing revisions, hosted behavior (G1); screen-reader reading; the report-panel notices in a browser |
| Limits found | Cards cite saved report revisions only, which hold concept geometry, not measured Revit quantities (measurements have no durable id, so they cannot be cited). A turn cannot cite its own new report (published after the answer). The capability `evidenceCompositions` reflects the setting at process start. Python is slightly stricter than the web on dates (`T24:00`, `2026-02-30`), which drops the card, the safe direction. Cited revisions beyond 13 history pages (256) are reported as not found |
| Next step | Q1 (packet written, awaiting approval), then A3 (model registry), W1 (needs a separate go or no-go), A4, N5, G1 |
