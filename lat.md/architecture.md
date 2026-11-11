# Hosted workspace

DATUMM web reuses the Studio presentation and the existing hosted task service, while account identity and native model authority remain explicit.

## Task lifecycle

Clerk authenticates browser users; the server proxy forwards their token to the configured HTTPS orchestrator. Existing v2 tasks persist conversation, plan versions, events and outcomes through the hosted LangGraph harness.

The hosted request envelope excludes desktop-only project and attachment fields. Unsupported source data is rejected rather than silently discarded. This frontend does not host an OpenCode worker or expose local runtime credentials.

The service proxy forwards Ask and Plan clarification replies, cancellation, queue controls and design review to v2. A separate preview can select the isolated hosted OpenCode gateway through server-only ORCHESTRATOR_URL; production routing stays configured independently.

New chat submissions check saved active tasks before creation and offer to open the blocking chat while retaining the unsent draft. Independent Ask and Plan chats may run in parallel up to three per account; Revit-context and Build requests still wait. This advisory check never approves or cancels work; backend admission (HTTP 409 with `blockingTask`) is authoritative.

Preview exports trace their font and native Resvg/Sharp companions. Raster libraries load only for preview requests so task and account requests can start independently of image conversion.

Vercel deployments explicitly exclude local npm caches, build outputs, environment files and artifacts through `.vercelignore`; server credentials are configured in the linked project environment.

## Review and authority

Studio layout does not install a desktop bridge. Authenticated task commands accept plans and approve exact proposals; the separately installed Revit connector validates the native operation and its original identity.

The connector download points to the public alpha.29 unsigned candidate with its checksum and exact source commit. The compatible annual API range and unqualified live2026.5 gate remain explicit in release metadata.

Studio chrome is independent of native authority. Global 3D layout rules live in the global stylesheet so CSS Modules retain their required local scope.

Settings navigation uses the same Button component and navigation class as the desktop, preserving inline icons, label spacing and compact controls across both surfaces.

Signed-out visitors see only a modal sign-in gate. Browser sign-out and account switching reset mounted workspace state. Native window controls and desktop runtime settings are unavailable in the browser. See [[contracts#Hosted contract tests]] for the serialization boundary.

Sidebar project grouping follows desktop capability or, for hosted accounts, a successful `GET projects`; a 404 or 405 hides projects, rename and move instead of showing errors. Studio layout does not affect it. Browsers list all unpinned hosted chats even when their stored default-project identifiers cannot be resolved through desktop-only project metadata.

Chat-first center: the conversation owns the center until the current chat has renderable plan geometry (a drawing or saved SVG, decided by `isRenderablePlan` in `src/lib/workspace-layout.mjs`). Then the studio canvas takes the center and the conversation moves to the side assistant panel; switching chats re-evaluates this.

## Chat presentation

Agent work is collapsed by default behind a single "Worked · N steps" row; the answer renders as markdown and result cards stay secondary.

The [[src/components/ai-elements/reasoning.tsx#Reasoning]] panel opens while a run streams or waits for input and collapses when it settles, still showing failed counts. Each tool call uses [[src/components/ai-elements/tool.tsx#Tool]] with a status badge and bounded, escaped input and output.

### Agent panel

The inspector tab is "Agent". Each agent turn shows the message, then one collapsed process accordion (step, then agent or job, then tool names and statuses); raw output stays in the Activity tab.

[[src/components/workspace/turn-process.tsx#TurnProcess]] builds the accordion from saved events, the run manifest and evidence, with a spinner and the current step while running. The transcript no longer shows background work, specialist review, the brief, partial-outcome or "Response prepared" cards; scheduler and specialists live in the Activity tab and the brief is summarised as chips in Properties. A budget checkpoint stays as one line with its action.

The chat plan review is a compact card: one summary line, Accept this plan, Request changes and View details. [[src/components/workspace/plan-details.tsx#PlanDetails]] holds alternatives, comparison, exports, assumptions and limits in the Exports tab; the plan preview is never duplicated in the transcript.

Each turn renders as the DATUMM label, then the process accordion ("Working…" or "Worked for N s · n steps"), then the answer. Events with `agent` and `parentStepId` nest step, agent, tool calls through `src/lib/turn-nesting.mjs`. Hosted lead turns send neither, so each `agent_stage_start` to `agent_stage_complete` span becomes one step with its action, research and evidence-lookup events as child rows; a turn starts at `queued` or `command_accepted`.

The workspace polls sparingly: the open chat every 1.5 s only while queued, running or reconciling, every 20 s while waiting for input or approval, never once settled; the chat list every 6 s while a chat runs, else 30 s; config, devices and projects on load, after changes and every 60 s. Hidden tabs skip ticks, errors back off to 60 s, and a failing 404 or 405 hides rename, move or projects only when that feature's own route answered it. "Review design" shows only for a non-Ask chat with real plan geometry (rooms or a non-empty SVG).

### Chat list

Rows show the title only, with status dots for running, pending question, failed and unread chats.

The unread dot comes from `src/lib/chat-seen.mjs` (last-seen task version per chat in localStorage). The row menu offers Rename (inline), Move to project, Pin, Archive and Delete; hosted project groups use the same sidebar UI as the desktop.

### Plan checklist

A pinned "Plan · done of total" checklist above the composer shows the agent's steps, derived by `src/lib/agent-todos.mjs` from the saved task plan or native to-dos; it collapses once every step is done.

### Question dock

Hosted questions appear in a dock above the composer, one at a time with progress, option chips, an "Other" input, Back and Next, then a review and one submit. The reply path and sessionStorage draft are unchanged.

[[src/components/agent-questions.tsx#AgentQuestions]] uses the pure rules in `src/lib/question-stepper.mjs`. Only a real pending question shows the sidebar attention icon ([[src/lib/workflow-state.ts#hasPendingQuestion]]); failed chats show a small error dot. Ask chats and chats without a plan hide the build part of the pipeline bar and the "Review design" button. The question and plan docks share one `composer-dock` block in normal flow above the composer, no wider than it. "Review design" needs a renderable plan. Below 850px the sidebar starts closed and a plan canvas keeps a 280px minimum height.

## Plan viewer

The plan viewer draws the 2D floor plan in the browser from the plan graph, in a Revit hidden-line style that follows the app theme. It never holds approval authority.

### 2D sheet

[[src/components/plan-drawing.tsx#PlanDrawing]] renders walls as solid cut poche, thin door leaves and swings, window lines, room tags, chained and overall dimensions, a scale bar and a north arrow.

Geometry comes from `src/lib/plan-geometry.mjs`, in model millimetres. Hidden line is the default; "Presentation" adds the coloured room fills. Sheet colours are CSS variables set in `plan-canvas.module.css`: white paper with black ink in light mode, the theme canvas with light linework in dark mode. The server SVG is still used for server exports and other previews.

### Tools and export

Select picks rooms, walls and openings and shows their properties; measure takes two clicks, snaps to wall ends and reports millimetres and metres.

[[src/components/plan-drawing.tsx#exportPlanSheet]] saves the current view as PNG or a one-page PDF, always black on white. Comments stay in browser storage; there is no server endpoint for them yet.

### 3D view

The 3D view reads its colours from the theme tokens and repaints when the theme changes. "Hidden" shows unlit paper-coloured faces with ink edges.

The level cut rebuilds each wall at the cut height with [[src/components/plan-three.tsx#wallGeometry]], so the cut face is a real cap with real edges.

## Admin console

`/admin` is a dark-only console for runtime agent configuration, gated on the server by the signed-in primary email and enforced again by the backend by Clerk subject.

`src/app/admin/layout.tsx` returns 404 unless the verified primary email is in `ADMIN_EMAILS` (pure rule `isAdminEmail` in `src/lib/admin-access.mjs`, default the owner). Pages call `/api/service/admin/...`, which the proxy maps to the backend `/v1/admin/...`; a 404 shows "Backend not deployed yet" and a 403 "Backend admin access not configured".

Config sections (Agent, Web search, Skills, MCP servers) edit one shared config document with dirty state, validation from `src/lib/admin-config.mjs` mirroring `AppConfig`, and a revision-checked save; a 409 asks for a reload. MCP servers are stored only and not yet connected to the agent. Knowledge polls while any source is indexing. The Plugin page reads `public/downloads/release.json`.
