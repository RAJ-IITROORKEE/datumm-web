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

Chats of unlisted projects stay in Recent when hosted groups are shown. The list rules in `src/lib/sidebar-history.mjs` preserve pinned separation, desktop grouping and the server's newest-first order. `groupChatsByDate` adds Today / Yesterday / Previous 7 days / Older groups by `created_at` without reordering, and `chatChip` is the one rule for the "Working" and "Needs attention" row chips.

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

The open routes are config, config history (list, one numeric revision, restore), audit, overview, traces, feedback (the list and `feedback/{id}/case`, one id of letters, digits and `._:-`), model registry and knowledge sources; traces, feedback, history and model usage keep their query strings. The model routes are `admin/models`, `models/test`, `models/usage` and `models/{provider}/{model}/tests`: a model id contains one `/`, so the tests path has exactly two id segments, and `.` or `..` segments, a third segment or `models/x/y/z` are refused. The one non-admin addition is `me/permissions` (GET and PUT) for the approval mode; other `me/...` paths are refused. Paths such as `admin/traces/x`, `admin/feedback/x`, `admin/feedback/../case`, `admin/config/history/x` and `admin/config/other` are refused.

## Daily limits

The composer shows "N left today" only while a per-user daily limit exists, and the plain limit message once it is reached or a send is refused with 429.

`src/lib/daily-usage.mjs` parses `GET me/usage/today` (a malformed body is null and shows nothing), picks the tighter of the tasks and model-call limits, and recognises the backend's 429 wording so the composer shows it once in the status area instead of the error banner. `dailyLimits` is validated in the admin config only when the backend returns it (1 to 10000 or empty), never added by `emptyConfig`, and the proxy opens only `me/usage/today` beside `me/permissions`.

## Capability parsing

The backend config's `capabilities` object is read as a tri-state per feature; anything missing or malformed is unknown, never off, so older backends keep working.

Unknown admin features still call the endpoint, and unknown planning goals keep the live-runtime gate. `adminTraces`, `feedback`, `adminHistory`, `adminModels`, `modelInfo`, `planEditing`, `runSteps`, `redlines` and `revitChecks` are the exception: unknown is off, because no deployed backend serves them yet. See `src/lib/capabilities.mjs`.

## Redline intake

The Edit panel's "Read a marked-up plan" is shown only when the `redlines` capability is on: one page image goes to `variable/plans/<id>/versions/<v>/redlines`, the architect ticks the changes the model read, and the existing edit route applies them.

`src/lib/redlines.mjs` builds the request (`{fingerprint, image, pageText}`, text clipped to 8,000 characters) and parses `datumm.redlines.v1` strictly: a wrong schema, plan, version, shape, edit or duplicate id rejects the whole answer, and the model's `mark` is plain text. High and medium items start ticked, low unticked, unclear ones cannot be ticked. `src/lib/redline-file.ts` runs in the browser only: images are downscaled on a canvas to a JPEG of at most 2,400 px and 2.5 MB, and a PDF page (at most 100 pages, 20 MB) is drawn by `pdfjs-dist` loaded on demand, with annotations drawn and their text added to `pageText`. The proxy opens the route with a 3.5 MB body limit for that route alone. `applyMany` in `use-plan-edit.ts` posts the ticked edits one at a time, each with the fingerprint of the previous answer, stops at the first refusal, and selects the newest saved version once. The file is never stored.

## Revit checks

The Details drawer's Revit tab is shown only when the `revitChecks` capability is on and a device is online; everything it does is a read, and nothing writes the model.

`src/lib/model-health.mjs` parses `datumm.model-health.v1` from `GET devices/<id>/health` strictly: a wrong schema, shape, severity, duplicate id or more than 50 ids per check rejects the whole answer, so half a report is never shown. Checks group into Problems (`warn`) and Notes (`info`). "Select in Revit" and "Zoom to them in Revit" post `show_model_elements` to `devices/<id>/tools` with `{documentId, expectedRevision, elementIds, action: 'select' | 'show'}`, the document and revision taken from the health result and no session (the service fills it in); a stale revision is refused with a 409 and worded as "The model changed since this check". "Validate in Revit" reads `list_revit_sessions` (exactly one session), pages `get_model_views` (`kind: 'plans'`), then reads `get_plan_image` (`pixelSize` 1200). The image is shown only when its content type is `image/png`, the base64 is at most 2.2 MB, it starts with the PNG signature and its edges are 1 to 2,048 px. The proxy opens `devices/<id>/health` for GET and no other path next to it. Room boundaries are not read yet: they need the DATUMM add-in update.

The health answer may carry `warnings: {coverage: 'complete' | 'partial' | 'unavailable', total, items: [{key, failureDefinitionId, severity, description, elementIds}]}` (at most 200 items, 20 ids each). It is parsed strictly, but a missing block (an older service) reads as `unavailable`, and the panel then says "Revit warnings need the DATUMM add-in update." The Revit warnings section groups the items by description with a count and the same Select and Zoom actions; the service's `REVIT_WARNING` checks are left out of Problems so nothing is listed twice. `warningDelta(previous, next)` returns new and resolved counts by `key` only when both checks have complete coverage with every warning listed, share a `documentId` and differ in revision; otherwise the panel shows nothing. The previous result lives in component state only.

"Compare with the DATUMM plan" posts `{planId, version}` of the plan on screen to `POST devices/<id>/compare-plan` and parses `datumm.plan-model-compare.v1` strictly, rejecting an answer for another plan or version. Matched rooms whose area differs by more than 10 % are flagged; rooms only in Revit get "Select in Revit" using the comparison's `documentId` and `revision`. The proxy opens `compare-plan` next to `health`.

## Run steps tree

The Details drawer's Activity tab shows a Run steps tree only when the backend capability `runSteps` is on, built from `GET tasks/{id}/steps` and shown as labels, durations, tokens and cost.

A model node also shows its `first word` time when the backend sends `firstTokenMs`; absent or invalid is null.

`src/lib/run-steps.mjs` parses the v1 body strictly: a bad envelope is null (the panel shows an error), and invalid runs or nodes are dropped instead of guessed at. Costs arrive as exact decimal strings and are only rounded for display. The proxy opens `tasks/{id}/steps` alongside the other task routes. The section loads only once opened, and has loading, empty and error states. See `src/components/workspace/run-steps.tsx`.

## Run steps keyboard

The tree follows the WAI-ARIA tree pattern: one tab stop, arrows move, Right and Left open, close or step to the parent, Home and End jump, Enter and Space toggle.

`treeKey` in `src/lib/run-steps.mjs` returns a focus move or a toggle for the visible rows and null for every other key, so Tab and typing are untouched. Rows are flat `treeitem`s with `aria-level`, `aria-setsize`, `aria-posinset` and `aria-expanded` on parents only.

## Admin tools rows

The Tools page only narrows each tool inside the server's `allowedModes`; required and Revit-write rows never switch.

An untouched config gets no `tools` key. `adminTools` is strict: unknown is off, so `tools` is never sent to an older backend. Server group labels (`Core`, `Research`, `Revit`, `Design`) match the group ids without case. See `src/lib/admin-tools.mjs`.

## Skill SKILL.md format

SKILL.md is only the editor and import/export format for a skill; the stored item keeps its six fields plus the optional `toolHints` (see Skill tool hints).

`parseSkillMd` in `src/lib/skill-md.mjs` maps frontmatter `name` to the id, optional `title` to the name (default: the id), `description` to the description and the body to the instructions. It refuses control characters (tab and newline stay legal), files over 6000 characters, a missing header, bad ids and anything over the backend caps of 300 and 4000, and reports each problem with its field. CRLF and a byte-order mark parse like LF. The editor changes the draft only on a valid parse, and a rename is refused so version history stays keyed by id.

## Skill tool hints

A skill's "Tools that help" are model-facing tool names that suggest what the skill works best with; they never turn a tool on.

The optional frontmatter line `tools: a, b` round-trips to `toolHints` (at most 6 distinct names matching `^[a-z][a-z0-9_]{0,63}$`; `[a, b]` is accepted) and is omitted when empty, so older skills are byte-identical. The editor's checkboxes rewrite that line through `setSkillMdTools` and read it with `skillMdTools`, which work on files that do not parse yet. The options come only from the `toolNames` of the `toolCatalog` rows (`toolHintOptions` in `src/lib/skill-hints.mjs`), each name once, so the Revit write row, which has none, never appears; a selected name the catalog does not list stays visible so it can be removed. `validateConfig` refuses more than 6 hints, repeats and bad names, and refuses admin skill ids that start with `datumm-`. The Test a prompt panel lists the hints of the skills it would list.

## Starter skills

DATUMM starter skills are code-owned, off until turned on, and the only thing an admin changes is the modes each is on in.

`parseBuiltinCatalog` in `src/lib/skill-builtin.mjs` keeps valid `builtinSkillCatalog` entries from the config envelope (`datumm-` id, name, description at most 300, instructions at most 4000, hints) and drops the rest; an older backend sends none and the group does not show. `toggleBuiltinMode` writes `builtinSkills: [{id, modes}]` into the draft, saved by the normal Save bar, and removes an entry whose last mode goes off. `View` shows the read-only SKILL.md. `validateConfig` accepts `builtinSkills` only with `datumm-` ids and distinct modes, and the editor never adds the key to a backend that did not send it. See `src/components/admin/starter-skills.tsx`.

## Skill use in traces

A run's loaded skills show as chips on its trace row and as a "Skill use" table, parsed key by key and optional.

`src/lib/admin-traces.mjs` keeps per row `skills: [{id, name, hash}]` (at most 10; id pattern, name 1 to 120 without control characters, short hex hash or null) and in stats `skillUse: [{id, name, runs}]` (runs above 0, most used first). Absent from an older backend means empty and nothing shows. The run steps parser also accepts a `skill` node, labelled by the backend as "Skill: <name>", in the same tree as tools; only that node may carry `skill: {id, hash}`, shown as the id and the first 8 hash characters. History and change lists word `builtinSkills[id]`, `builtinSkills[id].modes` and `skills[id].toolHints` plainly through `pathLabel` in `src/lib/admin-history.mjs`, keeping the raw path as the tooltip. See `src/components/admin/skill-use-table.tsx`.

## Skill versions

A skill's versions are the config history rows whose changes touch `skills[<id>]`, and a restore puts that skill back into the draft only.

`src/lib/skill-versions.mjs` filters rows by exact `skills[id]` or `skills[id].` paths, so `ab` never matches `a`. `skillFromSnapshot` reads the item from the raw history detail (the history parser drops the snapshot), keeps the stored fields (and `toolHints` when present) and validates them with `validateConfig`. `withSkill` replaces or appends and refuses a thirty-first skill. Nothing saves until the admin presses Save changes, which writes a normal revision.

## Skill preview

The Test a prompt panel sends the unsaved draft skills to `admin/skills/preview` and shows only skill ids from the answer.

`src/lib/skill-preview.mjs` is the one place that knows the request and response shape (prompt up to 2000 characters, a mode, at most 30 skills; answer `listed` ids and `attached` id or null). The proxy allows only that exact path. The Skills page uses the registry only when `skillsOnDemand` is on; unknown keeps the older page and sends nothing new. See `src/components/admin/skills-section.tsx`.

## Admin MCP registry

The MCP page manages outside tool servers through immediate admin calls; a key is sent once and never read back, and the page is a registry only when the service says it can seal keys.

`src/lib/admin-mcp.mjs` rebuilds every server key by key (no key or sealed field survives), shows an unreadable tool mode as Never, and removes control characters from everything a server sent. The editor mirrors the backend: id `^[a-z0-9-]{1,20}$`, an https address with no credentials, query or fragment, and the header name and key set together; on edit an empty key with an unchanged header sends `keepKey`, and a changed header needs the key again. A key is cleared from the dialog state as it is sent. 422 lists are cut to `{loc, msg}` in `adminCall` so rejected input is never kept; 409 means a stale version, or an id clash when adding. The proxy opens `admin/mcp`, `admin/mcp/{id}`, `{id}/test|enable|disable` and `{id}/tools/{tool}` with strict id and tool patterns. `mcpRegistry` off shows an explanation from `capabilities.reasons`; unknown (an older service) keeps the stored-list page. Annotations are shown only as "the server says" hints. Audit rows use kind `mcp` and the seven `mcp_*` actions. The tool approval card words `mcp__<server>__<tool>` as "<tool> on <server>" through `plainApprovalText`. See `src/components/admin/mcp-section.tsx`.

## Approval modes

The approval mode fails closed to `ask`; a `tool_approval` question is a card only when `approvalModes` is on.

No mode or card answer authorizes a Revit change; Full auto copy says so. The run's public `agent_approval_expired` flag keeps a card expired whatever the client clock says. The countdown is not a live region; a status line speaks only at 5 min, 1 min and expiry. Changing the mode never disables the radio group (focus stays); a change made while a save is in flight is ignored. See `src/lib/permissions.mjs`.

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

`src/lib/admin-traces.mjs` rebuilds every row, call, tool, specialist and stats object key by key. Unknown keys are dropped. Model ids, tool names and codes must match fixed patterns, enums fall back to `other` or null, and counts are clamped. Unreported call usage stays null instead of becoming 0, and so does a missing `firstTokenMs` (per call, in `phases`, and `firstTokenP50Ms` / `firstTokenP95Ms` in stats), shown as "First word" only when present. Row `phases` keep only exact integers (ms up to 86,400,000, bytes up to 2^31-1); anything else, or an absent object, is null, and the details show only present values. Row `route` is `{lane, rule, floor}` with lowercase token patterns and the `quick_reply` signal shows as "Answered directly". The owner is only a 16-hex keyed hash that the backend produces; with no server secret every `ownerHash` is null and the owner filter is simply unavailable. Traces and the `feedback` capability are admin-only conveniences: the backend 403 is the real gate. See `src/components/admin/traces-section.tsx`.

## Answer draft streaming

While the model writes its answer the chat shows a muted, labelled draft; the server-checked answer replaces it and is the only saved text.

The backend sends non-persisted `{stage:"answer_draft",text,seq}` frames. `src/lib/agui/adapter.mjs` keeps them out of `ACTIVITY_SNAPSHOT`: the first opens `TEXT_MESSAGE_START` with the id the final answer uses, later ones send only the new suffix. A frame that does not extend the sent text ends the draft, and an older frame is ignored. On the saved snapshot the checked answer sends its missing suffix, or a `CUSTOM` `datumm.answer.replace` event with the full text before `TEXT_MESSAGE_END`; a run that does not complete clears the draft the same way with empty text. With no draft frame the events are exactly the single answer message of before. The decisions are pure functions in `src/lib/agui/answer-draft.mjs`.

`src/lib/agui-chat-transport.ts` turns the replace event into a `data-answer-replace` part. The chat treats a text part whose AI SDK state is `streaming` as a draft and renders `src/components/workspace/answer-draft.tsx`: plain text only, a "Writing…" label, `aria-busy` and `aria-live="off"`, so no token is announced and the checked answer arrives once as ordinary content. The development replay `/api/dev/agui-replay` plays `tests/fixtures/agui-answer-draft.json` (one continued and one replaced draft) at `/dev/chat-composition`. Token streaming is not claimed until measured live.

## Admin feedback parsing

The Feedback page lists ratings without any question, answer or note, and the browser keeps only the allowlisted keys, so no later backend change can put text in the list.

`src/lib/admin-feedback.mjs` rebuilds each row (`id`, `vote`, `reason`, `createdAt`, `model`, `ownerHash`, `taskId`) key by key, drops unknown keys, and shows a reason only for a down vote. The one place text appears is "Copy as eval case": it fetches `admin/feedback/{id}/case`, rebuilds the case with `expected` always null and puts the JSON on the clipboard; nothing is sent anywhere. If the clipboard is blocked the JSON is shown in a read-only box to copy by hand. See `src/components/admin/feedback-section.tsx`.

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

## Composer queue, steer and retry

A hosted Ask or Plan turn keeps accepting prompts: up to three wait in the browser and run in order, and nothing new is asked of the service.

`src/lib/prompt-queue.mjs` refuses a fourth, empty, over-12,000-character or Build entry, keys sessionStorage by account and task, and falls back to memory. `nextQueued` releases the head only after `completed` (or `cancelled` when the web itself asked to stop), pauses on every other ending or an unserved model, and `use-prompt-queue.ts` sends only after this tab watched the task run. "Send now" sends the v2 `cancel` command, waits for the status, then sends a normal `chat_followup` led by "Instead of: …" (280 characters). Queue, steer and Send now exist only for a task whose own mode is Ask or Plan with no native build, proposal or operation; with nothing running, Send now sends only after `completed`, `failed` or `cancelled`, never over a pending question or Revit approval. A refused or timed-out stop drops the steer line, and a localStorage claim keeps a duplicated tab from sending the same queued prompt twice. `src/lib/model-retry.mjs` offers "Retry with <model>" only for a failed Ask or Plan task whose public failure code is `provider_timeout`, `provider_unavailable` or `provider_schema_invalid`, resending the last prompt as one `chat_followup` on the default or first other served model. The desktop server queue is unchanged and shares `queue-panel.tsx`.

## Composer attachments gate

Attachment chips, paste and drop exist but render only when the backend reports `attachments` on and a send path carries them, which none does yet; unknown is off, so every current backend keeps the disabled "Requires DATUMM Desktop" menu item.

`src/lib/composer-attachments.mjs` accepts JPEG, PNG and WebP only (four per message, 1.5 MB after the browser resizes to 1,568 px) and `attachment-chips.tsx` holds the reading, ready and error states. Nothing is sent to the service: the hosted command schema has no attachment field yet.

## Work modes and the review gate

The work area has two modes, Design and Review, plus a Details drawer; Accept and Approve stay off until Review was opened for that task version, in memory only.

`src/lib/work-modes.mjs` maps the stored `workAreaSection` (still `design`, `activity`, `assets`, `exports`, so the backend frontend context and display actions are unchanged) to mode Design with the drawer closed or open on Activity, Files or Exports; Technical lives only in the drawer. `reviewVersionOf` keys a version by plan version plus the exact proposal hash, so a new plan version or a refreshed proposal locks again. `reviewOpened` and `markReviewOpened` hold that set in memory: a reload locks everything, and it is never stored or sent. The Review screen (`review-screen.tsx`) marks the version opened and renders the same plan card and exact Revit approval panel as the chat with the same props; both only gain a `reviewLocked` switch that disables Accept plan or "Approve exact proposal and build", never changing what they send.

## Desktop shared-shell sync

`scripts/sync-desktop.mjs` copies the web shell into the desktop renderer one way, so the desktop can show the same UI behind a switch; the web repo stays the only place the shell is edited.

The allowlist is the import closure of `workspace.tsx`, `workspace-entry.tsx` and `host-provider.tsx` (CSS modules, JSON and `.d.mts` siblings included), not a glob. Files under `admin/`, `billing/`, `dev/`, `app/api/`, `proxy.ts`, `next.config.*` and modules that import server-only code or Node built-ins are excluded with a printed reason; a kept file that needs an excluded one fails the run, except the few files `scripts/desktop-sync.json` admits by name. Copies land under `src/shared/` with `@/` rewritten to `@shared/`, each file's sha256 goes in `.sync-manifest.json`, and `--check` fails on any edit, missing file or source change since the sync. A dirty synced path blocks the sync unless `--allow-dirty`.
