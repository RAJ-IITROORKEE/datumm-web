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

The service proxy opens only the admin config, audit, overview and knowledge source routes, mapped to backend v1 admin paths, and rejects every other admin path.
