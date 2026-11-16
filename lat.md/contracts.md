---
lat:
  require-code-mention: true
---
# Hosted contract tests

The runnable checks protect the strict hosted v2 request boundary against accidentally sending desktop-only metadata or losing user source data.

## Strict envelope

Empty desktop metadata is omitted from hosted requests while idempotency, versions and the complete command are retained.

## Reject unsupported sources

Nonempty or malformed attachment collections fail before dispatch so the UI cannot silently omit user evidence. A project identifier is forwarded on the envelope so a chat can start inside a hosted project.

## Blocked new chat

Running work and native-context or Build requests blocked by a pending review preserve the prompt and return the saved chat identity without cancelling or approving it.

Independent Ask and Plan requests may pass a pending review. The backend remains authoritative for inferred Revit context and concurrent execution.

## Parallel Ask and Plan

Independent Ask and Plan chats may start while fewer than three chats run; a third running chat refuses the next one with the blocking chat named, and Revit-context or Build requests still wait for every active chat.

## Native preview encoding

The installed native raster libraries render the traced font and encode actual PNG and JPEG outputs, exposing missing native companions before deployment.

## Browser request boundaries

A running production build presents Studio without native window controls, rejects missing or foreign request origins, rejects unsupported source data and keeps anonymous service access closed.

## Ask and Plan proxy routes

The actual proxy forwards questions, cancellation, queue edits and design review to v2, rejects native task routes, and preserves existing Azure run routing and request bodies.

## Process nesting

Process events carrying a parent step and an agent nest step, agent, tool calls; events without them keep the flat grouping so older backends render as before.

## Stage spans

Hosted stage events group into flat steps: each stage start to complete span is a step, and its actions, research and lookups are child rows. See `stageSpans` in `src/lib/turn-nesting.mjs`.

A hosted step's status comes from the completion's `outcome` when present (succeeded is done, failed is failed, skipped is skipped, stopped is stopped), and `controlOutcome` `needs_input` still means waiting; `controlOutcome` is a routing value and never a result. Its `durationMs` and the retry events that carry the action's `activityId` ride on the step. Hosted tool and specialist events pair by `callId` and `activityId` and take their own `outcome` and `durationMs`; a call the user stopped is stopped, not failed. Relay tool events without a `callId` are not tool rows. A failed call inside a step that retried and then succeeded stays visible but does not mark the turn "Recorded work failed"; neither does a skipped or stopped step. Events without `outcome` keep the older rule, so old hosted steps stay "Not confirmed".

## Step notes

A hosted step is titled by the first progress note inside its stage span (80 characters) and summarised by its last note; the running line shows the latest note, else the latest step title. See `latestNote` in `src/lib/turn-nesting.mjs`.

## Share helpers

Share links, tokens and the public shared-chat payload are validated by pure helpers: unsafe URLs and non-SVG plans are dropped, and the plan is only shown as an image data URI. See `src/lib/share.mjs`.

## Poll intervals

The open chat polls fast only while active, slowly while waiting and not at all once settled; the chat list polls fast only while a chat runs; hidden pages skip ticks and failures back off. See `settledPoll` in `src/lib/settled-poll.mjs`.

## Unread chats

A chat is unread only when it settled with a task version newer than the one last seen while another chat was open; first sight never marks a chat unread.

## Browser sidebar history

Hosted chats with project identifiers remain visible without desktop project groups.

Chats of unlisted projects stay in Recent when hosted groups are shown. The list rules in `src/lib/sidebar-history.mjs` preserve pinned separation, desktop grouping and the server's newest-first order.

## Plugin setup guide

Build mode shows the Revit plugin setup card only while no device is online; Ask and Plan never show it, and it disappears once a device reports online.

## Sign-in gate

Signed-out visitors see a non-dismissible Clerk sign-in dialog instead of the workspace; loading and unconfigured-auth states are decided by one pure helper.

## Agent plan checklist

The pinned checklist maps saved plan progress or native to-dos to done, running, failed and pending items, and an active turn always has one running step. Ask turns without a plan use their stage spans as steps.

## Question stepper

The question dock blocks Next on a missing required answer, can skip optional ones, reviews before one submit, and builds the exact reply payload the service already accepts.

## Admin email gate

The admin console is reachable only when the primary email matches the comma list in ADMIN_EMAILS, case-insensitively, falling back to the owner address when the list is unset or blank.

## Admin config validation

The config editor blocks saving values outside the backend AppConfig bounds: models, effort, run USD limit, parallel chats, limits, web search, skills and MCP servers, including duplicate ids and non-https MCP URLs.

## Admin dirty state

Dirty state compares configs independent of key order, and domain chips are normalised to a bare lowercase host.

## Admin proxy routes

The service proxy opens only the named admin routes, mapped to backend v1 admin paths, and rejects every other admin path.

The open routes are config, config history (list, one numeric revision, restore), audit, overview, traces, model registry and knowledge sources; traces, history and model usage keep their query strings. The model routes are `admin/models`, `models/test`, `models/usage` and `models/{provider}/{model}/tests`: a model id contains one `/`, so the tests path has exactly two id segments, and `.` or `..` segments, a third segment or `models/x/y/z` are refused. Paths such as `admin/traces/x`, `admin/config/history/x` and `admin/config/other` are refused.

## Capability parsing

The backend config's `capabilities` object is read as a tri-state per feature; anything missing or malformed is unknown, never off, so older backends keep working.

Unknown admin features still call the endpoint, and unknown planning goals keep the live-runtime gate. `adminTraces`, `feedback`, `adminHistory` and `adminModels` are the exception: unknown is off, because no deployed backend serves them yet. See `src/lib/capabilities.mjs`.

## Durable completion proof

A saved answer keeps its completion proof when its own answer events have left the event window. The client checks exact identity, unique binding, visible contradictions and the full-answer SHA-256, not event presence.

## Frontend context and display actions

The browser tells the agent what it displays, and the agent may ask for up to two reversible display changes. Both are off unless the backend reports them on.

Unknown is off for `frontendContext` and `displayActions`, because an old backend answers an unknown `clientContext` with 422. See `src/lib/agui/frontend-context.mjs` and `src/lib/display-actions.mjs`.

The envelope `{v:1, viewport, workArea:{open, section, preview}, selection, actions}` holds display state only, at most 1 KB, and is rejected rather than trimmed. It travels as the single AG-UI context entry `datumm.frontend.v1`; the adapter validates it with the same validator, maps it to `clientContext`, and still rejects any tools, unknown descriptions, two entries, and context on a question resume. Viewport classes are narrow below 768 px, medium below 1,180 px, wide from 1,180 px; the section and preview values are those of `work-area-contract.ts`.

Actions arrive as `presentation.actions`, an object with `schemaVersion` 1, `kind` `display-actions`, the answer hash, task, turn and at most two items. They apply only once, on the live run that produced the answer, in the scope and epoch captured at submit, after the completion proof verifies; `history`, `stale`, `missing_target`, `unknown` and `unbound` actions never apply. The registry imports nothing, so no action can send a command, call the API or write a draft. `suggest_followup` text is only ever the empty composer's placeholder. Each applied action records the fields it changed and offers one-level Undo, disabled once the user changed that target or the scope changed. Below 1,180 px opening the work area is offered, not applied, so the answer is never hidden.

The vectors in `tests/fixtures/display-action-vectors.json` are shared with the backend validator.

## Evidence-backed composition

An answer may show a card for a saved report revision, and a card is evidence only when the server proved it. Any failure drops the whole composed view and the full answer renders.

The projection carries `schemaVersion` 2, `kind` `evidence-backed-explanation`, and at most four `evidence` leaves inside the usual 24-node and depth limits. Each leaf holds `ref` `{kind:'report-revision', revisionId, contentHash}` (two 64-hex strings) and a server-built `display` `{revisionNumber, createdAt, planTitle, planVersion, rowCount, proposedRoomCount, proposedAreaM2}`; unknown keys, out-of-bounds or non-finite values and a repeated `revisionId` reject. Version 1 stays unchanged and rejects an evidence leaf, so an older browser falls back to the full answer. The task, turn and answer-hash checks are the same as for version 1. See `src/lib/chat-composition.mjs`.

The model only picks which listed revision to cite; ids, hashes and every displayed number come from the saved revision, never from the model. The card shows fixed labels and the line "Proposed concept geometry · not measured Revit quantities", renders every value as React text with no link or markup, and never claims Revit measurements. `src/components/workspace/evidence-card.tsx` imports no command, API or draft setter, so a card cannot send a command or change a draft.

"Open revision" is a display change only. It asks the work area to open that exact revision through the existing scope-and-epoch checked open path, and nothing opens by itself. `src/components/workspace/review-report.tsx` starts on the cited revision only when its saved `contentHash` still equals the cited hash; otherwise it says "This saved report no longer matches the cited revision" and keeps the current selection. Evidence can never approve, build, revise or send anything.

The vectors in `tests/fixtures/chat-composition-vectors.json` are shared with the backend validator and include the version 2 cases.

## Admin traces parsing

The traces page shows one text-free row per hosted turn, and the browser keeps only the allowlisted keys, so no later backend change can put a question, answer, note or owner id on screen.

`src/lib/admin-traces.mjs` rebuilds every row, call, tool, specialist and stats object key by key. Unknown keys are dropped. Model ids, tool names and codes must match fixed patterns, enums fall back to `other` or null, and counts are clamped. Unreported call usage stays null instead of becoming 0. Row `phases` keep only exact integers (ms up to 86,400,000, bytes up to 2^31-1); anything else, or an absent object, is null, and the details show only present values. Row `route` is `{lane, rule, floor}` with lowercase token patterns and the `quick_reply` signal shows as "Answered directly". The owner is only a 16-hex keyed hash that the backend produces; with no server secret every `ownerHash` is null and the owner filter is simply unavailable. Traces and the `feedback` capability are admin-only conveniences: the backend 403 is the real gate. See `src/components/admin/traces-section.tsx`.

## Answer feedback binding

A rating is accepted by the client only for a saved answer whose completion proof just verified, and it always carries that proof's turn id and answer hash.

`feedbackBody` in `src/lib/answer-feedback.mjs` refuses without `turnId` and a 64-hex `answerHash`, maps the five reason labels to the service enum, and never produces free text; the last label is "Something else" so the vendored text input stays hidden. `AnswerContent` shows the thumbs only with a verified proof, the `feedback` capability on, the owner's votes loaded (for `defaultVote`) and never while streaming, partial, shared, replayed or in the output panel. Saves are queued so a reason lands after its thumb, and a failed save is announced in the composer status line, never reported as saved.

## Admin history parsing

The config history and audit pages rebuild every row key by key, so a later backend change can never put a snapshot, skill text or an unknown field on screen.

`src/lib/admin-history.mjs` keeps only allowlisted keys at every level, requires integer revisions and the closed `action` (`update`, `restore`, `baseline`) and `kind` (`config`, `knowledge`) sets, and counts a flag only when it is literally `true` (an absent `restorable` means not restorable). A change keeps `before` and `after` only when the backend sent a short scalar or list of scalars; free text, MCP URLs and tool lists arrive as hashes, are shown as "changed", and a hash is never rendered as a value. The detail response's full `config` snapshot is dropped, and only `changesFromCurrent` is kept. The audit response stays an array, rows from older backends lack the new fields, and the audit page uses the new `limit`, `before` and `kind` parameters only when `adminHistory` is on. See `src/components/admin/history-section.tsx`.

## Config restore binding

A restore always saves a new revision and is bound to both the revision being restored and the revision the admin saw as live.

`restoreBody` in `src/lib/admin-history.mjs` refuses without integer `fromRevision` (1 or more) and `expectedRevision` (0 or more) and trims the note to 200 characters. The dialog says it saves as revision N+1 and that running chats may pick up skills and web-search changes within 30 seconds. Restore stays disabled, with the reason shown, while the shared config draft is dirty or saving, for a row the backend marks unrestorable (redacted data), and for the live revision. A 409 keeps the dialog open with the stale copy and a "Reload history" action; success reloads the shared config and announces "Restored revision R as revision N+1". See `src/components/admin/restore-dialog.tsx`.

## Admin history gating

The Config history page and the save bar's revision link exist only when the backend reports `adminHistory` on.

The nav item is strict: unknown counts as off, the page waits for the capabilities before calling, and a direct visit while off reads "Not provided by this backend". The audit log keeps its previous behavior until the flag is on. See `src/components/admin/admin-shell.tsx`.

## Admin model registry parsing

The Models page rebuilds every registry row, test and usage day key by key, so a later backend change can never put an unknown field, a prompt, an answer or a key on screen.

`src/lib/admin-models.mjs` keeps only allowlisted keys at every level. A row needs a model id matching `^[A-Za-z0-9._/:-]{1,160}$` and one of the five statuses (`enabled`, `ready`, `failed`, `untested`, `needs_allowlist`); a row with any other status is dropped, never shown as enable-able. A flag counts only when it is literally `true`, integers are bounded, and dollar and price strings must be plain decimals. A `null` price reads "Price unavailable" only when the catalog failed. A `kind: 'legacy'` test reads "Legacy · not tested" and keeps its measurements null. Per-model totals are summed from the daily usage rows, with dollars added as integers so a column never drifts. See `src/components/admin/models-section.tsx`.

## Admin model gating

A model is off until it has been tested: the web only mirrors the server rule that an untested, failed or outside-allowlist model cannot be enabled.

`canEnable` returns "Add it to the server allowlist first", "Test this model first" or "Last test failed", and Enable stays disabled with that reason; the server refuses the same adds with 422 on save. Enable, Disable and Make default edit the shared A2 draft and save with the existing revision check. Disabling the current default shows "Choose another default first." and changes nothing; disabling any other model asks for confirmation that the next turn of chats using it will ask users to pick another model. A test names its cost cap ("at most $0.05 per test, 20 tests a day") before it runs. The `adminModels` nav item is strict, so a direct visit while it is off reads "Not provided by this backend", and the Agent page lists models read-only with a "Manage models" link only while it is on. A follow-up refused with "Model is not enabled." reads "This model was turned off by an admin; pick another model." in `serviceErrorMessage`. See `src/components/admin/model-rows.tsx`.
