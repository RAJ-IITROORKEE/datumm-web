# Local chat continuation — 16 November 2026

The next authorized [producer continuation](agui-composition-producer.md) implements the local harness/checkpoint/public-projection path described under Next below. Its controlled-provider qualification and remaining hosted/retention limits supersede the renderer-only status of this historical packet.

The user cannot authenticate to AWS now and explicitly authorized localhost development/testing. Continue independent local chat work; do not keep requesting login or mark cloud qualification complete. Scope is the middle conversation. Existing right work area, native authority, themes, business commands and frozen backend candidates are unchanged.

## Implemented and locally qualified

- Historical process status no longer inherits whole-task completion. A unique task/turn/execution lifecycle is required; ambiguous question/answer history displays **Recorded activity**, not Completed or an invented Answered receipt.
- Adjacent repeated named actions group only when task/turn identities agree and execution/activity identities distinguish attempts. Nested details retain every attempt, outcome and identifier. Missing/ambiguous identities stay separate.
- A stage-complete controller transition does not prove tool success. Explicit `needs_input` stays waiting; `continue`, `finish` and `prepare_draft` remain unconfirmed operational outcomes. This is a truthful display limit of current public evidence, not a claim those tools failed.
- Historical literal answer/table output eligibility retains the prior rules and CSV behavior independently of process labels. New composed views and validated summaries use a stricter exact-answer completion gate. Long answers cannot use that new gate when only a truncated event detail is available; a durable per-answer completion binding remains necessary.
- Added a bounded, read-only, illustrative composition grammar: stack/grid, full source text blocks, disclosure, source table, bar comparison and explicit connection flow. This lets a future producer select composition rather than prescribing a single domain card or Mermaid renderer.
- Table/chart rows derive deterministically from a complete blank-line-delimited Markdown source table; flow links derive from an explicit complete `A -> B`/`A → B` block. Titles are neutral; independent label/value/edge recombination is rejected. Text blocks and disclosure labels cannot cut a negation out of a sentence.
- Optional `presentation.composition` reaches the actual `ConversationAnswer` renderer only after saved task/turn/UTF-8 SHA-256 identity and layout validation. Unknown kinds/fields, commands, arbitrary styles, HTML/image primitives, oversized/deep/circular input and invalid data fall back to the original answer path. Rendering uses escaped React text; no generated code runs. Workspace key/epoch and task guards fence late validation.
- Structured presentations are explicitly illustrative, not measured Revit evidence or operational proof. Selecting/reordering whole source blocks can still omit context; complete answer copy/output remains available. Current forms/native approvals remain on existing versioned, authorized paths.

No packages were added for this slice. Existing Zod, React, icons and affectUI tokens are reused.

## Source map

- `src/lib/conversation-turns.mjs` and declaration: process status, exact completion proof, legacy output eligibility.
- `src/lib/turn-nesting.mjs` and declaration: source-bound action outcomes.
- `src/components/workspace/conversation.tsx`, `turn-process.tsx` and CSS: compact process grouping/history.
- `src/lib/chat-composition.mjs` and declaration: bounded version1 explanation envelope and deterministic source extraction.
- `src/components/workspace/chat-composition.tsx` and CSS; `conversation-answer.tsx`: scoped renderer, fallback and accessible disclosure.
- `src/app/dev/chat-composition/page.tsx`, `src/components/dev/chat-composition-preview.tsx`: explicitly controlled local preview; production404.

Envelope: `{schemaVersion:1,taskId,turnId,answerHash,kind:'illustrative-explanation',root}`. Source spans count UTF-16 code units without splitting surrogate pairs; hash uses the complete exact UTF-8 saved answer. At most24 layout nodes, depth4,24KiB serialized envelope and8,000 referenced text characters; individual blocks max1,200 characters. Tables max6 columns/12 rows, flows max12 nodes/20 edges. These are deliberate initial bounds, not arbitrary-code generative UI.

## Exact-source validation

Final gate: **584/584 frontend tests, TypeScript, production build and18 production runtime checks passed**. Production checks include AG-UI authentication/origin boundaries and both development fixture routes returning404. Temporary production3100 was stopped; development3001 remains available.

Independent review verified process/history, source-table/flow extraction, bounded schema, fallback, native authority isolation and delayed A1→B2→A3 scope validation. Its19 inspected hashes still matched at the final22-file qualification manifest. Logs, screenshots, review receipt and `qualification.json` are under `artifacts/ux/chat-process-2026-11-16/`. The full suite's earlier intermediate579 result is superseded by584 after final repairs.

Actual Codex browser:

- Ask task `cdef2ef4-22be-5150-a39a-55a20e9bff37`: requested two concise sentences about Revit levels/grids with no model access; received the concise answer, expanded real knowledge/web activity, verified Capture request grouped as two individually identified attempts, then reloaded and retained the answer with an empty composer. This uses the unchanged hosted service through localhost; AWS CLI authentication was not needed. No native inspection/write was requested. This slice did not recapture the AG-UI wire; earlier transport/resume wire evidence retains its original scope.
- Existing task `6286a05a-4051-5d67-804a-16476d1dd18c`: grouped answers and Metric selection survived reload; earlier questions now show Recorded activity instead of inheriting Completed. No new question was submitted in this check.
- `/dev/chat-composition`: controlled table/chart layout, explicit flow and keyboard disclosure passed. Tampered hash and different-task envelopes fell back to answer preview/actions; full copy retained the source table.390px layout contained content without horizontal overflow. Temporary viewport overrides were cleared. This fixture does **not** demonstrate actual agent composition or hosted persistence.

## Next local and hosted work

1. Add a real optional model-facing presentation proposal to the harness `finish_answer` tool; server validates after final-answer admission, derives task/turn/execution/hash bindings, and saves atomically with that exact answer. Do not ask the model to invent authority identifiers.
2. Extend `task_controller.conversation` projection to retain the exact presentation with the correct historical answer; do not inherit a prior `agent_result` into a new question/turn. AG-UI's existing authoritative snapshot can then carry it. Add durable per-answer completion binding to handle truncated event details without weakening the current proof gate.
3. Use controlled local graph/provider I/O to test producer→checkpoint→public projection→AG-UI→renderer and persistence before live deployment. Actual model tool selection, source-grounded measured/report charts and version-bound form actions are separate gates. Current registry supports illustrative explanation only.
4. Frontend capability context/actions, full structured tool lifecycle, generic resume/replay and true validated provider-answer streaming remain unfinished. Operational updates already stream; final-answer delivery after `ainvoke` is not token streaming or a measured latency improvement.
5. When AWS access is available, qualify/deploy the frozen Plan-intent repair and any separately reviewed producer change, then real Plan/design/revision/provider tests. Do not merge the paused count candidate implicitly. Container/real-planner qualification and graph freshness remain pending.

Read-only backend inspection found `agent_workflow.py` finish tool/result persistence, `storage.public_run` result projection and `task_controller.conversation` historical projection are the relevant producer boundaries. No backend files were changed in this slice; the frozen five-file candidate remains uncommitted/undeployed on `codex/agui-plan-intent-20261116`.

Rollback: remove/omit the optional composition descriptor to retain the current answer renderer. Reverting the scoped process/history helpers restores the prior presentation without changing saved tasks, commands, native approvals or reports. No data migration or release was performed.
