# Phase packet — UI2: Composer extras

| Field | Value |
| --- | --- |
| Status | **done 17 Nov; live with this commit** (section 11) |
| Depends on | UI1 (done, web live); [parity plan](panda-parity-plan-2026-11-17.md) rows 4, 5, 6, 8; H5 = A ([harness decision](harness-decision-2026-11-17.md)) |
| Approved by / date | User's standing instruction, 17 Nov ("proceed to next automatically ... as per the plan"): every decision UI2-a to UI2-f takes the recommended option A |
| Base commits | Web `main` after UI1. Backend local `main` `95b2361`; live is `70ce912` per [HANDOFF](HANDOFF.md) line 77 (the G1 row of the same file says `188ebc0`; see open question 1). Panda `panda-agent-ui/Panda-agent` on `claude/agent-ui-migrations`, checkout now at `c30468e` (UI1 cited `1bedf1c`) |

Facts marked **observed** were read in source on 17 Nov with `path:line`; *inferred* ones were
reasoned, not run. No test, build, server, browser or backend was run for this packet. Backend paths
are under `datumm-orchestrator/apps/domain-api/`; Panda paths under `Panda-agent/src/`.

**Design rules (user, 17 Nov; mandatory).** Keep DATUMM's current theme and typography exactly: no
colour token, light/dark value or font change (a reviewer treats one as a defect). Panda-agent is the
reference for layout and behaviour. affectUI (vendored `src/components/vendor/affectui`) and
`src/components/ui` are the reference and source for every component. Harness behaviour is ported
onto DATUMM's LangGraph backend (H5 = A), never a second loop. Suggestions appear only as the empty
composer's placeholder, never as chips (AGENTS.md §4).

## 1. Goal and non-goals

While an Ask or Plan turn runs, the user keeps typing: Enter adds the prompt to a queue of up to 3
shown above the composer (edit, remove, "Send now"); Alt+Enter, or "Send now" on a row, stops the
current turn and sends that prompt next. The Send button reads "Add to queue" while a turn runs and
Stop stays beside it. After an answer, the model's suggested next request appears as the empty
composer's placeholder and Tab puts it in the box. When a turn fails because the model service failed,
the error card offers "Retry with <other model>". Attachment chips (thumbnail, "Reading…", error,
paste and drop) are built but stay hidden until a backend reports it accepts attachments.

Non-goals: a backend queue or steering route on the hosted service; attachment upload or storage on
the backend (only the shape is proposed, section 5); suggestion chips; extra model calls; automatic
model failover; Build-mode queueing or steering (native approval and reconciliation stay exact);
token streaming (N5); a new dependency; any token, font or `DESIGN.md` visual value change.

## 2. Current state (verified)

Key: **T** implemented and tested; **U** implemented, under-tested; **L** local or desktop only;
**P** partial; **A** absent.

| # | Item | State | Evidence (observed unless marked) |
| --- | --- | --- | --- |
| 1 | Backend queue routes `POST/DELETE /v2/tasks/{id}/queue*`, `queue/resume`, `queue/state`, `queue/admit` | **L.** Only in the OpenCode local app; production `task_api.py` has no queue route (routes at `:106-334`) | `local/entry.py:1075-1176`; hosted proxy regex `hosted/entry.py:121`; same in `188ebc0` (`git show`) |
| 2 | Web queue panel and send path | **L.** Panel, edit, remove, resume and a 10-item label render only when `liveRuntime` (`runtime === 'opencode'`); hosted runs hide Send while executing and show Pause | `composer.tsx:289-325,640-662`; `use-workspace-state.ts:155,599,838-853,906-923` |
| 3 | Proxy allow-list | Already passes `queue`, `queue/resume`, `queue/<id>`, `cancel` | `src/app/api/service/[...path]/route.ts:19` |
| 4 | Steering on the hosted v2 contract | **P.** No steer route. A `chat_followup` in Ask/Plan is recorded as `amend` and sets `scheduler.steeringPending`; a second command is refused 409 while one is `accepted`/`applying`. Whether an `amend` accepted while an execution *runs* supersedes it is not established (*not verified*). `cancel` is a v2 control command | `task_controller.py:438-469`; `task_inbox.py:3-6`; `task_contracts.py:244-246`; `main.py:1138-1150` |
| 5 | Stop | **T/U.** Hosted: Pause button (`act('pause')`); `cancel` command exists | `composer.tsx:641-651`; `main.py:1152-1164` |
| 6 | Suggested follow-up | **P.** The model may return `displayActions: [{action:'suggest_followup', text}]` in the same `finish_answer` call (no extra call), only when the browser offered it in `clientContext.actions`; validated on both sides (≤160 UTF-16, one line, no markup); the web shows it as the empty composer's placeholder. No Tab accept, no hint | `display_actions.py:8-41`; `agent_workflow.py:1110-1119,2325-2328`; `lib/display-actions.mjs:18-45`; `lib/agui/frontend-context.mjs:12,64`; `workspace/display-actions.tsx:129-131,210-212`; `composer.tsx:487-493` |
| 7 | `displayActions` capability live | On at `70ce912` (`main.py:293`, `git show`); **absent** at `188ebc0` (web then treats it as off) | `capabilities.mjs:22` |
| 8 | Attachments on the hosted service | **A.** Every v2 command is `extra='forbid'` with no attachment field; the web adapter caps `attachmentIds` at 0 and `hostedCommand` throws "File attachments are available in DATUMM Desktop" | `task_contracts.py:7,158-233`; `lib/agui/adapter.mjs:16`; `lib/hosted-command.mjs:3-5` |
| 9 | Attachments on desktop | **L.** `attachmentIds` (UUIDs, ≤6 per chat incl. queued) handed to the OpenCode runtime; preview ≤7 MB | `local/facade.py:19,89-113`; `local/entry.py:95,510-518,1091-1094`; `local/live_runtime.py:120` |
| 10 | Image input path in the agent | **P.** Only bounded native Revit PNGs: ≤1.5 MB raw, ≤2 MB base64, one image per visual call, 65,536-token reservation each; `image_payload.py` validates PNG/JPEG/WebP ≤4096 px for generated images | `agent_context.py:15-55`; `agent_workflow.py:3140-3156`; `image_payload.py:13-29` |
| 11 | Web attachment UI | **A.** "Add" menu has a disabled "File attachments · Requires DATUMM Desktop" item; no chips, paste or drop | `components/composer-media.tsx:12-26` |
| 12 | Provider failure codes | Public `data.failure {code, recoveryAction}`: `provider_timeout` and `provider_unavailable` (`review_progress`), `provider_schema_invalid` (`contact_support`). Before failing, the planner retries one transient error once, then pauses with a question (`needs_input`) | `failure_taxonomy.py:105-125`; `agent_workflow.py:2143-2192`; web type `use-workspace-state.ts:71` |
| 13 | Retry on another model | **A.** The error card shows generic guidance only. But `chat_followup` already carries `model`, and in Ask/Plan it becomes an `amend` segment run with `command.model` | `conversation.tsx:1391-1418`; `task_contracts.py:224-233`; `task_controller.py:683-687,577-582`; `adapter.mjs:49-51` |
| 14 | Oversized files | `composer.tsx` 729, `use-workspace-state.ts` 1206, `conversation.tsx` 1550 lines | `wc -l` |

Panda reference (observed): queue is browser state only, `MAX_QUEUED = 3`, ≤2000 chars, "Send now"
puts the prompt first, cancels the running answer and carries a 280-char `interrupted` line
(`ui/prompt-queue.ts:1-29`, `ui/workspace.tsx:223,553-570`); Enter while running queues, Alt+Enter
steers, Tab copies the ghost into an empty box (`ui/workspace.tsx:833`); follow-ups come from the
same final model step (`agent-loop/loop.ts:168`); retry offers one enabled alternate model
(`ui/agent/model-display.ts:48-51`, `ui/workspace.tsx:590-593`); attachments are read in the browser,
≤4 files, ≤6 images, chips with `reading | ready | error` (`ui/agent/attachments.ts:1-20`,
`agent-loop/turn-files.ts:3`, `agent-loop/turn-image.ts:17`); queue row actions in
`ui/agent/queue-panel.tsx`.

## 3. Decisions for the user (recommendation first)

1. **UI2-a Queue storage.** **(A) Browser queue for hosted Ask/Plan:** ≤3 items per task in
   `sessionStorage`, keyed by account and task (pattern of `prompt-drafts.mjs`); dispatched as a normal
   `chat_followup` when the task reaches `completed`; paused (kept, with a notice) on `failed`,
   `needs_input`, `awaiting_approval`, `cancelled` or a model no longer served. The desktop server
   queue (item 1) stays as is. Limit: lost when the tab closes, not shared across devices. (B) Port the
   local queue routes to production `task_api.py` behind capability `promptQueue` (backend M,
   durable, new Mongo field and scheduler admission).
2. **UI2-b "Send now" (steer).** **(A) Cancel, then send:** Alt+Enter or the row button sends the v2
   `cancel` command, waits for a terminal status, then sends the prompt as `chat_followup` with the
   first 280 characters of the stopped prompt prefixed as one line ("Instead of: …"). Ask/Plan only.
   (B) Rely on `amend` while running (item 4): needs a backend test first; not proposed for UI2.
3. **UI2-c Follow-up suggestion.** **(A) Model-only**, from the existing `suggest_followup` action (no
   extra call; may be absent). Add Tab accept, a hint, and a muted italic placeholder style using
   existing tokens. (B) Also a deterministic fallback from task state (e.g. after a Plan concept
   "Compare the alternatives"): a product-copy decision, no model call.
4. **UI2-d Retry on another model.** **(A) Web-only:** when `status === 'failed'` and
   `failure.code` is `provider_timeout` or `provider_unavailable` or `provider_schema_invalid`, the error
   card shows "Retry with <model>": a `chat_followup` with the last user prompt and the alternate model
   (default model if current ≠ default, else the first other served model; none → no button). The
   picker switches to that model. (B) Also on the `needs_input` provider-recovery pause (item 12),
   which needs a backend marker to tell it apart from other questions.
5. **UI2-e Attachments.** **(A) Build the chips, paste, drop, read and error states now, hidden
   unless `featureEnabled(capabilities,'attachments')`** (off on every current backend, so the live
   site keeps today's disabled item); backend images-only support (section 5) is its own phase. (B)
   Web-only text files folded into the prompt (shows in the transcript; 12,000-char cap). (C) Defer
   all of row 6 to the backend phase.
6. **UI2-f Files.** **(A)** New logic in `src/lib/*.mjs`, new UI in new files; `composer.tsx`,
   `use-workspace-state.ts`, `conversation.tsx` get wiring only (≤25 lines each); the desktop queue
   panel moves into the shared `queue-panel.tsx`. (B) Split `composer.tsx` first (larger diff).

## 4. Design (recommended options)

DESIGN.md §4 composer row stays ("model, effort, voice and Send on the right; suggestions only as
the empty placeholder"); no token or font change. Components: `ui/button`, `ui/dropdown-menu`,
`ui/tooltip`, `vendor/affectui/badge-clean` (queue count), `icon-button-clean`, `popover-clean` not
needed. Panda contributes layout and key behaviour only (no `--pa-*` tokens, no assistant-ui).

**Queue panel** (`workspace/queue-panel.tsx`): above the composer, inside `composer-area`, reusing
the `.prompt-queue` styles (`globals.css:231-235`). Caption "Queued · 2/3" and "Runs after the current
turn" or "Paused · prompts kept"; rows: mode, text (one line, ellipsis), actions Send now (`ArrowUp`),
Edit (moves text back when the box is empty), Remove (`X`). Desktop (`liveRuntime`) renders the same
component with its server data and 10-item limit. At 390 px actions collapse into one
`DropdownMenu` per row.

**Send control while a turn runs** (hosted Ask/Plan): Stop (existing `Square`) plus the send
button with `aria-label` and `title` "Add to queue" (`ListPlus` icon, already in `lucide-react`);
disabled at 3 queued with title "Queue is full (3)". Enter queues, Alt+Enter steers,
Shift+Enter new line; IME composition is ignored as today (`composer.tsx:515-523`). Build mode keeps
today's controls.

**Ghost suggestion**: placeholder text unchanged in source; when it is a suggestion the textarea
gets `data-suggestion`, the placeholder uses `color: var(--muted-foreground); font-style: italic`
and an `sr-only` description "Suggested follow-up. Press Tab to use it." via `aria-describedby`.
Tab (no Shift, empty box, suggestion present) fills the box and keeps focus; otherwise Tab moves
focus normally, so keyboard users are never trapped.

**Retry card**: one `Button variant="secondary"` inside the existing error card,
"Retry with Claude Sonnet 5" (name from `model-display.mjs`), busy text "Retrying…", disabled while
any command is pending.

**Attachment chips** (`workspace/attachment-chips.tsx`, capability-gated): a row above the
textarea (`.composer-sources`, already ordered first, `globals.css:275`); chip = 32 px thumbnail
(blob URL) or file icon, name, size, state: "Reading…" with `aria-busy`, "Couldn't read <name>:
<reason>" in `--trace-error` colour already used by `.error-card`, Remove button. Paste anywhere in
the chat and drop on the composer (drop zone outline uses `--border`). Limits mirror section 5.
The chips stay hidden, even with `attachments` on, until the backend attachments phase wires a send
path that carries them.

## 5. Contract changes

| Change | Kind |
| --- | --- |
| Browser queue, steer (cancel then `chat_followup`), Tab accept, retry (`chat_followup` + `model`) | **Frontend-only**; existing v2 commands; no proxy change |
| Capability name `attachments` added to `CAPABILITY_FEATURES` (unknown = off) | Frontend-only |
| Backend images-only attachments behind `attachments: true` (UI2-e A, later phase) | **Backend M**, touches v2 command schema and digests |
| `promptQueue` capability and production queue routes (UI2-a B only) | Backend M |

Proposed backend shape (not built in UI2; `ui2` web code accepts nothing else):

```json
{"command": {"type": "chat_followup", "prompt": "…", "model": "…",
  "images": [{"mediaType": "image/jpeg", "data": "<base64, ≤1,500,000 bytes raw>",
              "name": "site.jpg"}]}}
```

Rules: `submit`, `chat_followup` and `amend` only; ≤4 images per command, ≤6 per task; JPEG, PNG,
WebP decoded and checked with `image_payload.decode_image_payload` rules (≤4096 px); the browser
resizes to ≤1568 px JPEG first; model must report `imageInput` in `modelInfo`; each image reserves
65,536 tokens like native PNGs (`agent_context.py:51`); bytes stored in a separate owner-scoped
collection, never in events or traces; `local/entry.py` reports `attachments: false`. Because the
field is part of the command dump, a retried request with the same images stays idempotent.

**Degradation on `70ce912` and `188ebc0`:** no `attachments` flag → chips hidden, today's disabled
menu item. `188ebc0` has no `displayActions` → no suggestion, Tab does nothing. Queue, steer and
retry use only `cancel` and `chat_followup`, present on both (*inferred* for `188ebc0` from
`git show` of `task_contracts.py`; not run).

## 6. Change list

**Web** (single owner: web implementer):

| File | Change |
| --- | --- |
| `src/lib/prompt-queue.mjs` + `.d.mts` (new) | `enqueue`, `promptFirst`, `nextQueued`, `interruptedLine`, `queueStore` (sessionStorage, account+task key, ≤3, ≤12,000 chars) |
| `src/lib/model-retry.mjs` + `.d.mts` (new) | `retryableFailure(run)`, `alternateModel(models, current, defaultModel)` |
| `src/lib/composer-attachments.mjs` + `.d.mts` (new) | `kindOf`, limits, `validateAttachments`, state transitions |
| `src/lib/display-actions.mjs` | `acceptSuggestion(prompt, placeholder)` helper (pure) |
| `src/lib/capabilities.mjs` + `.d.mts` | `attachments` feature name |
| `src/components/workspace/use-prompt-queue.ts` (new) | Queue state, auto-dispatch on `completed`, pause rules, steer sequence |
| `src/components/workspace/queue-panel.tsx` (new) | Shared panel (hosted and desktop) |
| `src/components/workspace/attachment-chips.tsx` (+ module CSS, new) | Chips, paste, drop; rendered only when the flag is on |
| `src/components/workspace/composer.tsx` | Mount panel and chips; key handling; Add to queue label; `data-suggestion` |
| `src/components/workspace/use-workspace-state.ts` | Hosted branch of `queueMessage`; expose queue hook (wiring only) |
| `src/components/workspace/conversation.tsx` | Retry button in the error card (wiring only) |
| `src/app/globals.css` | `.composer textarea[data-suggestion]::placeholder` italic (no new token) |
| `src/components/dev/ux-preview.tsx`, `dev/composer-extras-preview.tsx` (new) | Fixture: running turn with 0–3 queued, paused queue, suggestion, failed turn per code, chips in each state |
| `tests/prompt-queue.test.mjs`, `tests/model-retry.test.mjs`, `tests/composer-attachments.test.mjs` (new); `tests/display-actions.test.mjs`, `tests/capabilities.test.mjs`, `tests/composer-interactions.test.mjs` | Section 7 |
| `DESIGN.md` §4 composer row, `lat.md/` if a contract note names the queue | Text only; `lat check` |

**Backend:** none in UI2 (A options). The attachments backend is a later packet.

## 7. Tests and browser scenarios

**Web unit** (`npm test`, baseline 788 recorded 17 Nov), written first:

1. Queue: 4th item refused; empty or >12,000-char text refused; `promptFirst` moves an existing item
   and keeps order; storage failure falls back to memory; keys never mix accounts or tasks.
2. Dispatch rule: next item only on `completed`; pauses on each other terminal status and on an
   unserved model; Build mode never queues.
3. `interruptedLine`: control characters removed, whitespace collapsed, ≤280 chars, empty → none.
4. `retryableFailure`: true only for `failed` with the three provider codes; false for
   `workflow_error`, native codes, `CANCELLED`, other owners' runs.
5. `alternateModel`: default first, never the current model, empty list → null.
6. `acceptSuggestion`: only with an empty prompt; whitespace-only counts as empty.
7. Attachments: kinds, limits (4 images, 1.5 MB raw after resize), error copy; flag unknown = off.
8. Composer render: send button label "Add to queue" while running hosted Ask; "Send message"
   otherwise; chips absent without the flag.

**Browser**, built-in browser, 1280 px and 390 px, light and dark:

- *Controlled fixture* (`/dev/ux` → "Composer extras"): (1) running turn: type, Enter → row 1;
  three rows → button disabled "Queue is full (3)"; Edit and Remove work; Escape closes the row menu
  at 390 px. (2) Alt+Enter on a draft → fixture shows "Stopping…", then the prompt first in line.
  (3) Suggestion placeholder is italic; Tab fills; Tab with text moves focus; screen reader name
  includes the hint. (4) Failed turn per code: retry button only for the three provider codes. (5)
  Chips: reading, ready with thumbnail, error, remove; paste an image; drop a file.
- *Real localhost* (signed in, `http://localhost:3001`, local https backend with in-memory Mongo and
  no provider key, per the [handoff](HANDOFF.md)): (6) with `attachments` absent the Add menu shows
  today's disabled item. (7) A model-backed turn cannot complete there, so queue dispatch, steer and
  a real `provider_*` failure are checked only if the keyless backend produces `failed` with a
  provider code (*not known*; open question 3); otherwise they belong to the live check after deploy.

## 8. Acceptance criteria

- Hosted Ask/Plan: up to 3 queued prompts; Enter queues, Alt+Enter and "Send now" cancel then send;
  nothing is sent while a command is pending; Build mode unchanged (unit 1–3, browser 1–2).
- Desktop queue behaves as today through the shared panel (existing tests pass).
- The suggestion is never a chip; Tab never traps focus (unit 6, browser 3).
- Retry appears only for the three provider codes and sends exactly one `chat_followup` with the
  alternate model (unit 4–5, browser 4).
- Attachment UI is invisible on backends without the flag (unit 7–8, browser 6).
- No colour token, light/dark value or font change in the diff; no new dependency; new files under
  300 lines; three oversized files grow ≤25 lines each; LF.
- Gates green: `npm run typecheck`, `npm test`, `npm run build`, `lat check`, runtime smoke
  `--production`. Counts recorded.

## 9. Rollback

Revert the web commit: composer, queue panel and error card return to today. Left behind: browser
`sessionStorage` queue entries under the new key (harmless, ignored by old code, cleared when the
tab closes). No backend, task, checkpoint or command shape changes; a steer that ran already left an
ordinary `cancel` and `chat_followup` in the task history.

## 10. Open questions

1. **Which commit is live?** HANDOFF line 77 says `70ce912`; its G1 row says AWS checks found
   `188ebc0`. The answer decides whether suggestions show live (item 7).
2. **Is cancel-then-send fast enough?** Cancel waits for the worker to stop; a turn inside a long
   model call may take up to the provider timeout (45 s, `agent_workflow.py:1842`) (*inferred*). If
   too slow, UI2-b B needs a backend test of `amend` while running.
3. **Keyless local backend:** does it fail with `provider_unavailable` (useful for testing retry) or
   earlier with "Provider not configured"? Not checked.
4. **Duplicate prompt on retry:** the retried prompt appears twice in the transcript (failed turn,
   then retried turn) (*inferred* from `create_segment`). Acceptable, or should the web collapse it?
5. **Queue across devices** is lost with UI2-a A; if the user expects Panda-like persistence across
   reloads, `localStorage` with a 24 h expiry is a one-line change (privacy: prompts stay on disk).
6. **Attachments backend phase** needs its own packet (storage, retention, privacy note for the
   model provider, vision-model gating) before UI2-e chips can be switched on.
7. **Alt+Enter with a full queue** (3 queued, new text in the box) keeps the spec: the prompt is
   refused with "Queue is full (3)" and nothing is stopped. Should it instead replace the last row
   or stop and send without queueing? Unchanged until decided.

## 11. Result

Built 17 Nov on `main` (Sonnet implementer, independent Opus review, Opus fixes). Web only; no backend change.

| Item | Outcome |
| --- | --- |
| Review | 2 HIGH fixed: a hosted Build run could be queued, steered or cancelled when the picker said Ask (now gated on the run's own mode and native state); "Send now" could answer a pending agent question or send during a pending Revit approval (now only after `completed`, `failed` or `cancelled`). 4 MEDIUM fixed: failed send landing in another chat's queue; stuck "Stopping…"; lost or duplicated queued prompt (per-call start flag, cross-tab claim); retry alternate chosen against the picker instead of the failed run. 7 LOW fixed or noted (sign-out clears queue keys, no nested "Instead of", focus after Edit/Remove, region role, object URL revoke, attachments need a send path, Alt+Enter with a full queue left as spec) |
| Gates (orchestrator, Node 24.18.0) | typecheck clean; `npm test` 831 / 831; `lat check` passed; `npm run build` exit 0; no colour, font or token line in the diff |
| Browser (built-in browser) | `/dev/ux` Composer extras: Tab fills the suggested follow-up; Enter while running queues it ("Queued · 1/3" with Send now, Edit, Remove); completing the turn sends it ("Sent: …", queue empty); Alt+Enter while running stops the turn and sends "Instead of: … / Make the living room larger"; "Retry with Claude Sonnet-5" only on the three provider codes. Real signed-in localhost: an Ask turn submits and runs through the changed send path; it failed with `workflow_error` (no provider key locally) and correctly shows no retry button |
| Not run | A real provider failure (retry on the live stack), the 390 px row menu, light mode, screen reader, attachments (hidden: no backend support) |
| Ownership check | Retry compares the task's `ownerId` (backend `task_contracts.py:29`, the Clerk subject) with the web's `accountKey` (the Clerk `userId`, `workspace-entry.tsx:8`): same value for hosted users |
| Next step | T1 Tavily search per the [parity plan](panda-parity-plan-2026-11-17.md) |
