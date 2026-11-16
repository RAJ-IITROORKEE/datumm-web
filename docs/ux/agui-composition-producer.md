# Local agent composition producer — 16 November 2026

Continuation of [local chat work](agui-local-chat.md), authorized by “Okay next.” Scope remains middle chat. AWS authentication/deployment, right work area, new floor-plan state, native writes and admin expansion are excluded.

## Implemented path

The existing harness's ordinary `finish_answer` now accepts an optional bounded flat layout proposal: `rootId` and at most24 typed nodes. The model chooses text, stack/grid, disclosure, source table, numeric bars or explicit connections. The server converts the proposal into the existing nested illustrative grammar; it does not accept generated code, arbitrary styles, links, commands or authority identifiers. Specialized read-only summary paths retain their existing schemas.

Validation happens against the **final saved answer**, after existing admission and disclosure handling. UTF-16 source offsets match browser indexing, including astral characters. Complete source blocks preserve table rows and explicit flow edges; charts do not freely recombine labels and values. Invalid, unsupported, absent or partial proposals preserve the answer and omit composition. Consistency is not factual verification: these views remain explicitly illustrative, not Revit measurements or execution evidence.

Answer/result/internal `data.agent_composition` are saved in one checkpoint. The internal field is outside the existing public-run allowlist. A central checkpoint guard clears it whenever another answer is written without a freshly validated composition, including identical text, preventing old layouts from following later answers.

Public task projection attaches a presentation only after unique owner/task/run/command binding, completed execution and result, exact full saved answer, response-ready observation and matching durable answer→completed task events. The server derives the task/turn/hash binding; the model cannot supply it. Conversation answer records receive:

```text
completion: {schemaVersion:1, taskId, turnId, executionId,
             answerHash, status:'completed', completionSequence}
presentation: {composition: {schemaVersion:1, taskId, turnId,
                            answerHash, kind:'illustrative-explanation', root}}
```

The client checks exact identity, unique binding and conflicting later lifecycle events, then asynchronously verifies SHA-256 of the full UTF-8 answer within the current workspace scope/epoch. Missing or invalid binding cannot bypass through older event proof. Later failure, partial result, approval/input wait, reconciliation or supersession denies proof. Existing literal historical answer-table eligibility remains separate; no model/native authority is granted by an answer export.

**Retention limit:** proof is now derived from a targeted read of each answer's proof-stage events (N1), so it survives more than 2,000 later events; an execution whose proof-stage rows fall partly outside the newest 512 such rows gets no proof (literal answer kept); real-Mongo index use is unverified until G1. Their literal answer always remains available. No proof ledger is persisted; see [durable completion proof](n1-durable-completion-proof.md).

## Isolation and source map

Backend work is uncommitted in `artifacts/ux/agui-presentation/candidate`, branch `codex/agui-chat-presentation-20261116`, based on `188ebc0bc0599ff84f3760aaef24711e522972ae`. The prior frozen Plan-intent five files were copied byte-for-byte into this separate clone; the original clone and all five original hashes remain unchanged. The paused alternative-count branch is excluded. Managed checkout creation stalled; a local clone was used, and local long-path configuration repaired six omitted checkout files before development.

- `apps/domain-api/chat_composition.py`: bounded proposal schema, normalization, validation and stored-data revalidation.
- `apps/domain-api/agent_workflow.py`: ordinary finish-tool proposal and post-admission checkpoint.
- `apps/domain-api/storage.py`: stale-composition clearing on later answer checkpoints.
- `apps/domain-api/task_controller.py`: public completion/presentation projection.
- `test_chat_composition.py`, `test_chat_projection.py`, `test_historical_outcome.py`: producer, projection, ownership and lifecycle regression coverage. The last test's AST extraction harness now includes the new helper; earlier full-suite failures exposed that harness dependency and were repaired without weakening its assertions.
- Web `conversation-turns.mjs`/declaration, `conversation.tsx`, `conversation-answer.tsx` and workspace Run type: split-record preservation, exact binding and scoped asynchronous verification.
- Web `agui/recorded-replay.mjs`, `api/dev/agui-replay/route.ts`, `dev/harness-replay.tsx`, development page: captured local replay through the same AG-UI adapter/client. The workspace transport still defaults to `/api/agui`; its optional internal development endpoint is not model-selectable. Development replay returns404 in production and issues no real commands.

## Validation and actual browser evidence

Final local gates: **603 frontend tests;180 backend tests plus26 subtests; TypeScript; production build;21 production runtime checks passed.** The backend reports two preexisting duplicate-operation warnings. `lat check` passed. Graph update refused loss of preexisting semantic nodes and graph freshness still fails; no destructive graph rebuild was performed.

Twelve shared Python/browser validation cases matched, including UTF-16/emoji, combining characters, escaped pipes, CRLF, disclosure/hash change, split surrogate, partial block, unknown fields, nonnumeric/non-ASCII numbers, boolean version and whitespace differences. This is representative conformance evidence, not formal equivalence for every input. The ask tool-list compact UTF-8 JSON grew from9,746 to11,235 bytes (+1,489); no token or latency savings are claimed.

Controlled model decisions drove the actual LangGraph→checkpoint→`drive_agent` terminal→Mongo-mock durable event import→public task projection. The sanitized public result is saved in `tests/fixtures/agui-produced-task.json`; the browser replay uses that captured result. A Node integration test passes it through the real AG-UI adapter, client and composition gates.

Codex browser at `/dev/chat-composition` verified the Saved harness response replay, reload and replay again, formatted output, keyboard disclosure, exact full-answer copy, full-answer and table previews, enabled CSV control, and390px containment. CSV download itself was not repeated in this fixture check. A fresh wire capture showed one replay POST,200 text/event-stream, RUN_STARTED, actual captured activity snapshots, text start/content/end and RUN_FINISHED, with no evicted capture events. Existing actual Ask task `cdef2ef4-22be-5150-a39a-55a20e9bff37` still restored its concise answer on localhost with an empty composer. No new live-provider composition or native request was made.

Logs, screenshots, wire metadata, exact source hashes and `qualification.json` are under `artifacts/ux/agui-presentation/`. Temporary production3100 was stopped after checks; localhost3001 remains available. No dependencies, commit, cloud deployment, merge or release were added by this slice.

## Next gates

1. Durable per-answer completion evidence beyond the event tail, without replaying commands or assuming status from the latest task.
2. Agent awareness of safe frontend capabilities and reversible actions; existing question/approval authority must remain separate. Generic resume, broad replay and validated provider-answer streaming remain unfinished.
3. Live-provider schema compliance and presentation quality, real Mongo/container behavior and eventual exact-source hosted rollout when AWS access is available. The saved replay does not substitute for those checks. The live Plan-intent bug remains unfixed until its backend candidate is deployed and verified.
4. Measured/native report compositions need immutable evidence references; current illustrative diagrams/charts must not become factual or operational proof.

Rollback is additive: omit the optional descriptor/proof to keep the existing text/Markdown path. Existing tasks/checkpoints, native approvals, drawings, reports and right-work-area components are preserved. Do not discard the older frozen candidate or silently combine the paused count repair during a later rollout.
