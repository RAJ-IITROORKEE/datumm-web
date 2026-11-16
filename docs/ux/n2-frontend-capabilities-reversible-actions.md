# Phase packet — N2: Frontend capability awareness and reversible actions

| Field | Value |
| --- | --- |
| Status | **proposed, awaiting user approval** |
| Depends on | C1 (done 16 Nov), N3 (done 16 Nov) |
| Approved by / date | |
| Base commits | Web working tree at the end of N3 (`codex/ui-ux-foundation-2026-11-12`); backend `36613f4` on `codex/web-ui-harness-20261116` |

All `path:line` facts below were **observed** in source on 16 Nov (backend `36613f4`, web working tree). Statements marked *inferred* were not run. No test, browser or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

With each new prompt, the agent receives a small, versioned description of what the user is looking at: viewport class, open work-area section and preview, selected room, and which display actions this browser supports. When an answer finishes, the agent may attach up to two display actions from a fixed list. The browser checks each one against the current task, turn and workspace epoch, applies it once, records it in that turn's process list and offers Undo.

Non-goals: any consequential operation from this channel (commands, approval, Build, mode change, sending a message, network or file access); any change to native approval, which stays desktop-only and bound to document, revision and proposal; model-generated React, HTML or JavaScript; sending DOM, logs, prompt text, secrets or account ids; actions in the middle of a run; re-applying actions on reload or from history; deployment or hosted verification (G1); new dependencies or CopilotKit.

## 2. Current state (verified)

Labels: **T** implemented and tested, **U** implemented but under-tested, **L** local or controlled only, **P** planned.

| Item | State | Evidence |
| --- | --- | --- |
| Run input sent today | T. The transport always sends `tools: []` and `context: []`. Everything else goes in `forwardedProps`: mode, model, effort, `modelContextRequirement`, deviceId, recipe, taskId, projectId, idempotency and versions, `eventCursor`, `visiblePlan`, `acceptedAssumptions`, `placement`, and `attachmentIds` (always empty) | `agui-chat-transport.ts:15-21,27-29`; body built at `use-workspace-state.ts:872-874` |
| Adapter input gate | `prepareInput` throws on **any** non-empty `tools` or `context` (U: no test sends either). `forwardedProps` is `.strict()` (T: an unknown prop is rejected) | `adapter.mjs:6-16,25`; `tests/agui-adapter.test.mjs:25` |
| Selection and attachment context | T. Viewport references and annotations are embedded as text lines in the prompt (`Viewport annotation: {json}`), which counts toward the 12,000-character limit. Web attachments are refused | `prompt-content.tsx:14-37`; `use-workspace-state.ts:812-819`; `hosted-command.mjs:3-5` |
| What the agent already knows | The task and conversation are on the server. The presentation primitives are already in the `finish_answer` tool schema (`composition`). The model packet carries `selectedElements` only from the native Revit selection. Viewport class, open work-area section and selected web room never reach the model. `visiblePlan` is used only for chat build gating, not given to the model | `agent_workflow.py:1103-1105,1566-1610`; `task_controller.py:782` |
| Backend acceptance of an envelope | **None without a schema change.** `Record` and `CommandRequest` are `extra='forbid', strict=True`, so an unknown top-level field returns 422. Precedent for an additive field that does not change the request digest: `projectId` with `exclude=True` | `task_contracts.py:6-8,280-286`; digest `task_controller.py:417` |
| Execution input | The command entry becomes a `NewRun` payload. `NewRun` has no client-context field | `task_controller.py:663-713`; `main.py:446-457` |
| Frontend or client tools | **None.** The agent's tools are server-built function schemas bound with `tool_choice`. The LangGraph loop runs every call on the server. The only mid-run pause is the question interrupt (`needs_input`). No path returns a client tool result. No "frontend tool" concept in `apps/` (grep) | `agent_workflow.py:1097-1177,1814-1820,2068-2073` |
| AG-UI tool events | Adapter emits no `TOOL_CALL_*`; the transport ignores them; N3 decided against emitting them | `adapter.mjs:46-86`; [N3 decision 1](n3-tool-task-subagent-lifecycle.md) |
| `@ag-ui/core` 1.0.4 | `RunAgentInput.tools` (`name`, `description`, `parameters`) and `context` (`{description, value: string}`); `TOOL_CALL_START/ARGS/END/RESULT`; a client tool's result returns on a later run as a `tool` message. `CUSTOM` events exist | `node_modules/@ag-ui/core/dist/schemas.mjs:94,242,545,557-595` |
| Presentation delivery precedent | T. `finish_answer.composition` is validated, stored as `agent_composition` in run data, and projected as `conversation[].presentation` only when the completion proof holds. The web re-validates hash and identity | `agent_workflow.py:2760-2763`; `task_controller.py:359-365`; `chat-composition.mjs:15-34` |
| Display targets: work-area section | T. `selectWorkAreaSection` (`design`, `activity`, `assets`, `exports`), scoped by `workspaceScopeInput.key`. It also switches `workspacePane` to `drawing`, which **hides the chat below 1,180 px** | `use-workspace-state.ts:276-279,342`; `workspace.tsx:177-193`; split rule `workspace-layout.mjs:66` |
| Display targets: disclosures | Mixed. The turn's process disclosure is local `useState` in `TurnProcess`. Activity-panel disclosures are controlled by a `view` object. Other disclosures are uncontrolled `<details>` | `turn-process.tsx:219`; `activity-panel.tsx:134-177`; `chat-composition.tsx:13,32` |
| Display targets: scroll to turn | **P.** Turns have no anchor (`id` or `data-turn-id`) and no scroll helper | `conversation.tsx:583-603` (grep: no `scrollIntoView` or `data-turn`) |
| Display targets: composer draft | T. `setPrompt` writes the per-source saved draft. AGENTS.md §4 allows suggestions **only as the empty composer's placeholder** | `use-workspace-state.ts:133-141`; `composer.tsx:482-484`; [AGENTS.md](../../AGENTS.md#4-ui-direction) |
| Scope and epoch | T. `WorkScope {key, epoch}` is client-only. The epoch increments on every scope change; `matches()` checks both; `BoundAnswer` binds proof to key and epoch. The backend never sees the epoch | `output-workspace.tsx:21-30`; `workspace.tsx:99-100`; `conversation-answer.tsx:13-22` |
| Capability gate | T. C1 tri-state flags; `unknown` keeps today's behavior. No N2 flag exists | `capabilities.mjs:1-19`; backend `main.py:290-298` |

## 3. Decisions needed (recommendation first)

1. **Envelope transport.**
   - **(A, recommended)** One AG-UI `context` entry, `{description:"datumm.frontend.v1", value:<JSON string>}`. The adapter validates it strictly and maps it to a new optional top-level `CommandRequest.clientContext` with `exclude=True`, as `projectId` does, so command digests and retries are unchanged. This uses the slot AG-UI defines for ambient run information.
   - (B) A new `forwardedProps.clientContext`. Same backend work, but it mixes display state with command props.
   - (C) Prompt text, as viewport references are today. Rejected: it costs prompt characters, is persisted as user words and can be spoofed by typing.
2. **Action delivery.**
   - **(A, recommended)** An optional `displayActions` array (at most 2) on `finish_answer`. It is validated on the server, stored beside `agent_composition` and projected as `conversation[].presentation.actions` only when the completion proof holds. It is durable, reload-safe and reuses the composition path. Backend size **S–M**.
   - (B) True AG-UI frontend tools: send `tools`, bind them into the model, pause the run on the call, return the result as a tool message. This needs a new interrupt type, a resume command and checkpoint changes: size **L**, touching v2 and checkpoints, for actions whose result the model does not need.
   - (C) A new public event stage, which would allow actions in the middle of a run (disruptive) and change the event allowlist.
   - (D) Composition-registry nodes. Rejected: the composition contract says "No new facts or actions" (`chat_composition.py:16`).
3. **Allowlisted action set.**
   - **(Recommended)** Three actions:
     - `open_work_area {section}`
     - `expand_process {turnId}`
     - `scroll_to_turn {turnId}`
   - **Prefill the composer draft** becomes `suggest_followup {text ≤160}`. It is shown only as the empty composer's placeholder and never written into the draft, which is what AGENTS.md §4 requires.
   - Alternatives: true draft prefill, which needs a rule change from you because model text would sit in the user's own message; or drop prefill entirely.
4. **Apply model and undo.**
   - **(Recommended)** Auto-apply once, only on the live run that produced the answer, in the same scope and epoch, after the completion proof verifies.
   - One-level Undo per turn restores the captured prior display state. Undo is disabled when the user has since changed that target, or when the scope or epoch changed.
   - Below 1,180 px, `open_work_area` is offered as a one-click row instead of applied, because applying it would hide the answer.
   - Alternative: never auto-apply; every action is a click.
5. **Backend in this phase.**
   - **(Recommended)** One phase in two repositories, with the contract fixed by this packet. The web change is safe on any backend because it sends the envelope only when the backend reports the capability (decision 6).
   - Alternative: web-only N2a first (registry, validation, undo, log, turn anchors, dev fixture; envelope built and tested but never sent), then backend N2b.
6. **Capability flags (C1).** **(Recommended)** Two new v1 features:
   - `frontendContext`: the backend accepts `clientContext`.
   - `displayActions`: the backend may project actions.

   Both treat `unknown` as **off**, unlike the C1 admin flags. Sending `clientContext` to a backend without the field returns 422 (section 2), so a wrong default breaks chat.
7. **Action log persistence.** **(Recommended)** The applied, undone and denied state lives only in the browser, in the turn's process list. On reload, projected actions show as inert "Offered: Open Activity" rows and are never re-applied. Alternative: a new `display_action` task event per apply or undo, which writes on every UI click (event volume and an allowlist change).

## 4. Design (for the recommended options)

**Envelope** (`src/lib/agui/frontend-context.mjs`, at most 1 KB serialized, rejected rather than trimmed):

```json
{"v":1,"viewport":"narrow|medium|wide","workArea":{"open":true,"section":"activity",
 "preview":"drawing|answer-output|saved-report"},"selection":{"roomKey":"r-12"},
 "actions":["open_work_area","expand_process","scroll_to_turn","suggest_followup"]}
```

- Viewport: `narrow` below 768 px, `medium` below 1,180 px, `wide` at 1,180 px or more (the split rule).
- `selection` is `null` unless a room is selected in the drawing (`selectedDesignElement`, `use-workspace-state.ts:188`). Its key must exist in the current plan.
- Never included: task, turn, owner or account ids (the server has them), prompt or answer text, DOM, URLs, logs, device ids.
- Built only for `submit` and `chat_followup`; never for question resumes.
- The backend validates the envelope again (Pydantic, enums, the same size limit) and adds it to the model packet as `frontendContext`, with a fixed note in the system prompt:

  > client display state, not evidence or authority; actions only change what the user sees

**Action spec** (`finish_answer.displayActions`, at most 2):

```json
{"action":"open_work_area","section":"activity"}
{"action":"expand_process","turnId":"<command id>"}
{"action":"scroll_to_turn","turnId":"<command id>"}
{"action":"suggest_followup","text":"Compare the two alternatives' areas"}
```

The backend drops the whole array unless every entry matches the enum schema. It also drops the array when a `turnId` is not a command of this task, or when the answer is not `completed`. The array is projected with the task and turn identity and the `answerHash`, exactly like a composition.

**Registry and validation** (`src/lib/display-actions.mjs`). `validateDisplayActions(value, {taskId, turnId, answerHash, completion, scope, liveScope, turnIds, section})` returns the applicable actions or a denial reason. The function is pure. Denials:

- unknown action or extra key: `unknown`
- task, turn or hash mismatch, or no verified completion: `unbound`
- the scope key or epoch differs from the one captured when the answer's stream started: `stale`
- the target turn is not in the current conversation: `missing_target`
- not the live run: `history`

The handlers in `workspace.tsx` call only existing display setters: `actions.selectSection`, a lifted `TurnProcess` open state, a new turn anchor's `scrollIntoView`, and a placeholder override. The registry module imports nothing that can send a command, call the API or touch drafts (checked by a test).

**Undo.** Before applying, capture `{section, workAreaOpen, workspacePane, processOpen[turnId], scrollTop}`. Undo restores only the fields that action changed, and only while `matches(scope)` holds and the current value still equals the applied value. Otherwise Undo is disabled with the reason "View changed since".

**Process list.** One row per action in the producing turn's `TurnProcess`: "Opened Activity · Undo", "Offered: open Activity (narrow screen)", "Undone", or "Not applied: view changed". The row is keyboard reachable and announced through the existing polite status.

**Prompt-injection containment.** Retrieved excerpts, Markdown and answer text can steer the model, so:

- Actions are closed-enum data. No text is ever executed, and no text is inserted into the conversation, the draft or a command.
- `suggest_followup` is placeholder text only, plain, one line, with viewport and annotation markers rejected.
- The validator reads identities from the task snapshot and live scope, never from answer text.
- The worst case is a changed view, undone in one click.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, one owner):

| File | Change |
| --- | --- |
| `task_contracts.py` | `ClientContext` model (strict); `CommandRequest.clientContext: ClientContext \| None = Field(default=None, exclude=True)` |
| `task_controller.py` | Store `clientContext` on the command entry (`:441`); pass it into the `NewRun` payload (`:663`); project `presentation.actions` beside the composition (`:359-365`) |
| `main.py` | `NewRun.client_context`; `CAPABILITIES` gains `frontendContext` and `displayActions` true |
| `agent_workflow.py` | Seed state; packet key `frontendContext` (`:1566`); system note; `finish_answer.displayActions` schema (`:1104`); store validated actions with the result (`:2760`) |
| `display_actions.py` (new) | Schema and `validate(actions, task_command_ids)`; shared vectors written like the composition vectors |
| `local/entry.py` | Report both flags `false` (OpenCode path unchanged) |
| `test_display_actions.py` (new) | Section 8 backend tests |
| `lat.md/` note, `apps/domain-api/README.md` | Contract note; code map |

**Web** (`datumm-web`, current branch, one owner):

| File | Change |
| --- | --- |
| `src/lib/agui/frontend-context.mjs` + `.d.mts` (new) | Envelope builder and validator (the roadmap's `agui/capabilities.mjs`, renamed so it is not confused with C1's `capabilities.mjs`) |
| `src/lib/display-actions.mjs` + `.d.mts` (new) | Registry, validation, undo capture and compare (pure) |
| `src/lib/capabilities.mjs`, `.d.mts` | Add `frontendContext`, `displayActions`; `unknown` is off for both |
| `src/lib/agui/adapter.mjs` | Accept at most one `context` entry with the known description, validate it, map it to `envelope.clientContext`; keep rejecting `tools` |
| `src/lib/hosted-command.mjs` | Pass `clientContext` through when present |
| `src/lib/agui-chat-transport.ts` | Take `frontendContext` out of the body (like `clientSubmissionId`) into `input.context` |
| `src/components/workspace/use-workspace-state.ts` | Build the envelope at submit when `frontendContext` is on; capture the live scope per submission |
| `src/components/workspace.tsx` | Action handlers over existing `actions`; undo snapshot |
| `src/components/workspace/conversation.tsx`, `turn-process.tsx` | `data-turn-id` anchor; controlled `open` for the process disclosure; action log rows |
| `src/components/workspace/composer.tsx` | Placeholder override when the draft is empty |
| `src/lib/conversation-turns.mjs` | Carry `presentation.actions` |
| `src/components/dev/` UX fixture | A "Display actions" scenario (live, stale, history, narrow) with no transport |
| `tests/` | Section 8 web tests; `lat.md/contracts.md` section |

## 6. Contract changes

| Change | Kind |
| --- | --- |
| `CommandRequest.clientContext` (optional, excluded from digest) | Backend, additive top-level request field; command schemas and digests unchanged. Old web clients never send it |
| AG-UI `context` accepted (one known entry) | Web adapter |
| `finish_answer.displayActions`; `presentation.actions` in the projection | Backend, additive; tool schema grows (measure the bytes, as for composition +1,489) |
| Capabilities `frontendContext`, `displayActions` | Additive config keys |

No change to v2 command types, events, checkpoints, the proxy allow-list (`/api/agui` is not proxied) or native approval.

## 7. Dependencies and risks

No new dependencies.

| Risk | Containment |
| --- | --- |
| A new web on an old backend sends `clientContext`, the backend returns 422, and chat breaks | Both flags default to off on `unknown`; test that no context is sent without the flag |
| An injected answer moves the view or plants a suggestion | Closed enums, identity checks, one-click undo, placeholder-only text, no command path (section 4) |
| A mobile user loses the answer | No auto pane switch below 1,180 px |
| Tool schema growth costs tokens on every call | Two small enums; record the bytes; `displayActions` is offered only in modes that reach `finish_answer` |
| A paused v2 task resumes without context | The field is optional; a test resumes a `paused_recovery` task |
| The model sees envelope values as facts | The system note plus the packet key name; the envelope holds no geometry or evidence |

## 8. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 216 + 26 subtests):

- A request with and without `clientContext` gives the same digest. A retry with the same key and a different context is idempotent.
- Oversized, extra-key or bad-enum context returns 422.
- The context reaches the packet as `frontendContext`.
- `displayActions`: an unknown action, a foreign `turnId`, more than 2 actions, or a non-completed answer drops all of them. Actions are projected only with a completion proof.
- The paused task projects compatibly.

**Web** (`npm test`, baseline 629):

- Envelope: shape, size, enums; no prompt or ids; omitted without the flag.
- Adapter: one known context accepted; unknown description, two entries, or any `tools` rejected.
- **Unknown action denied.** **Stale scope denied** (key or epoch changed). History and reload never apply. Missing target denied.
- **Undo for each action** (`open_work_area`, `expand_process`, `scroll_to_turn`, `suggest_followup`), plus undo disabled after a manual change.
- The registry module imports no command, API or draft setter.
- Shared Python/JS action vectors agree.

**Browser** (built-in browser, local dev server, controlled UX fixture, no hosted service), at 1280 px and 390 px, light and dark:

1. Live answer with `open_work_area: activity` at 1280 px: Activity opens, the process row says "Opened Activity", Undo restores the previous section and the work area's visibility, and focus stays in the chat.
2. The same at 390 px: the chat stays visible, the row offers "Open Activity", and one click opens it and Undo returns to the chat.
3. `scroll_to_turn` and `expand_process` on an earlier turn: it scrolls and expands; Undo restores the scroll and the collapsed state; keyboard only.
4. Switch chats before the stream finishes: nothing applies and the row reads "Not applied: view changed".
5. Reload: the row shows "Offered: …", nothing moves, and no `/api/agui` request is made.
6. `suggest_followup` with an empty composer: the placeholder shows the text and the draft stays empty; typing replaces it; a non-empty draft is never touched.

## 9. Acceptance criteria

- The agent receives the envelope only when the backend reports `frontendContext`. Old backends see an unchanged request.
- Only the allowlisted actions apply. Each one is scoped to the current task, turn and epoch, logged in the process list and undoable. Unknown, stale, history and foreign actions are denied.
- No action path can issue a command, an approval, a message or a draft write. Native approval is untouched.
- No change to v2 command types, checkpoints or events.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`, runtime smoke `--production`. Counts recorded.

## 10. Rollback

Revert the web and backend commits. The capability flags give a runtime off switch: with the backend flags false, the web sends no context and ignores actions. `clientContext` stored on command entries and `displayActions` stored in run data become unread fields. No checkpoint or command schema needs migration.

## 11. Open questions found during research

1. **"Expose allowed actions as frontend tools (AG-UI tool calls)":** the backend has no client-tool round-trip. Every tool call runs inside the server loop, and the only pause is the question interrupt (`agent_workflow.py:1814-1820,2068-2073`). True frontend tools are size L and touch checkpoints, so the roadmap's "S" holds only for decision 2A.
2. **"Accept the envelope as optional input" without a schema change:** impossible. `CommandRequest` forbids extra fields (`task_contracts.py:7,280`). The smallest change is one excluded top-level field.
3. **"The agent knows the current chat and supported presentation primitives":** it already does, from the server-side task and the `finish_answer` composition schema (`agent_workflow.py:1103-1105`). The envelope only needs to add viewport, work-area state and the web selection.
4. **"Validated against the current task and epoch":** the epoch is client-only (`output-workspace.tsx:21-24`). The server can bind task and turn; only the browser can check the epoch, by capturing it at submit.
5. **"Prefill the composer draft"** conflicts with AGENTS.md §4 (suggestions only as the empty composer's placeholder). Decision 3 needs your call.
6. **"Expand a disclosure":** most disclosures are uncontrolled `<details>` with no stable id. Only the turn process and Activity panel are controllable (`turn-process.tsx:219`, `activity-panel.tsx:134-177`). The packet limits this to the turn process.
7. **"Scroll to a turn":** no turn anchor exists. N2 adds one.
8. **"Logged in the process list":** the process list is built from task events. A browser-only log disappears on reload unless decision 7B adds an event.
9. **C1's "unknown keeps today's behavior"** does not fit here: an unknown backend must be treated as off, or chat requests fail with 422.

## 12. Result (fill at checkpoint)

| Item | Outcome |
| --- | --- |
| Commit | |
| Gates run (command, Node version, counts, date) | |
| Browser evidence (tool, URL, scenario, result) | |
| Not run or not verified | |
| Limits found | |
| Next step | |
