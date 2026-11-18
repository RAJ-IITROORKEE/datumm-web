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

Each tool call uses [[src/components/ai-elements/tool.tsx#Tool]] with a status badge and bounded, escaped input and output.

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

Rooms with a `boundary` polygon render as that polygon, and walls with `curve.kind=='arc'` render as a bent solid with real thickness and height, built by `curvedWallPositions` in `src/lib/plan-3d-geometry.mjs`; openings on an arc wall sit along the arc (`placeOpening`). Rectangle-only graphs keep the box and flat-extrusion shapes.

A click reports the nearest room, wall or opening through `onSelectElement`; `onSelect` still reports rooms only, and comment placement stays room-based. Each highlighted room, wall or opening also gets an accent outline drawn over its occluders. Selection, highlight and display changes only repaint; the scene is rebuilt when the graph fingerprint changes, and the old one is freed with [[src/components/plan-three.tsx#disposePlanScene]].

### Plan checks

The plan-version response carries `findings` (`datumm.findings.v1`); `parseFindings` in `src/lib/plan-checks.mjs` rejects unknown shapes with null.

On null the Checks tab says checks are not available and offers Retry; nothing is guessed.

The Design area shows the report as a **Checks** tab beside **Details** inside the Properties drawer (`workspace/design-side-panel.tsx`), so there is no new column. Rows are grouped Geometry, Brief, Circulation, Openings, Code with a text severity label, expected against found, and a Why and how-to-fix disclosure. **Show** passes `refsToHighlights` in `src/lib/plan-checks.mjs` to the same `highlights` array that 2D and 3D already read, opens the drawing, and announces the result in a polite live region. Ids are never printed; rooms appear by name.

The review card reads optional `checks` on each candidate and `recommended` on `agent_design` through `alternativeChecks` in `src/lib/plan-checks.mjs` and shows a status line per alternative with a Recommended badge and the reason. Absent fields show nothing, and selection behaviour is unchanged. The `/dev/ux` "Plan checks fixture" shows the failing, warnings-only, pass and unavailable states.

The Checks tab ends with a separate **Design review** section for the layout critic's advice. `critiqueFor` in `src/lib/layout-critique.mjs` reads `agent_specialists` and returns nothing, "not available", or the advice. Advice shows only for a completed `layout_critic` result whose `binding` (plan id, version and fingerprint) matches the drawing on screen; a `partial` or `failed` result says the review was not available; a missing, stale or cancelled result shows nothing. Severities read Concern, Note and Not sure. The section is labelled as advice that never changes the check result, and the pass, warn and fail header and its counts are computed from the rule findings only. The `/dev/ux` "Plan checks fixture" has a Design review switch for each state.

### Revision package

A printable page at `/revision-package?task=…&plan=…&version=…` collects what an architect sends with a reissue. The Review screen links to it with `target="_blank" rel="noopener"`.

The page is a client page behind the normal Clerk sign-in (`src/components/review/revision-package-page.tsx`). It reads `variable/plans/{id}/versions/{n}/package` through the service proxy, then the first and last versions for their drawings and room names. The task read (`tasks/{id}`) is optional and only supplies the title and whether this version is the accepted one; without it the page leaves the acceptance line out. `parsePackage` in `src/lib/revision-package.mjs` validates the `datumm.revision-package.v1` payload as untrusted data and rejects unknown shapes, and `changeLog` in `src/lib/revision-package.mjs` writes one plain line per version from the recorded edit, then the stored diff, and otherwise says the changes were not recorded. Print CSS hides the controls and forces a white page. The `/dev/ux` "Revision package fixture" shows the page with synthetic data.

### Plan edits

The Details tab of the Design side panel offers targeted edits of the selected room, wall or opening, only when the `planEditing` capability is on and the drawing is the task's current saved version.

A room offers Rename, Swap with and Resize; a wall offers Move by N mm; an opening offers width, offset and Delete with a confirmation. The UI is `workspace/plan-edit-panel.tsx`. Controls are disabled while a request runs, and `use-plan-edit.ts` refuses a second request. Plans that are not generated schema 3 or 4 hide the actions.

`src/lib/plan-edits.mjs` builds and checks each request (`{fingerprint, edit}` to `variable/plans/<id>/versions/<v>/edits`) and words the outcome. After a 200, `use-plan-edit.ts` selects the new version on the brief and reloads the task, the same path as choosing an alternative, then shows "Saved as Version N · changes · checks". A 409 `edit.stale` says the plan changed elsewhere, other refusals show the server's message, and the plan on screen stays as it was. An accepted version gets a note that the new one needs accepting again. Undo is "Back to Version N-1": it reads the earlier saved version and shows it as a retained reference, never deleting or selecting anything. The `/dev/ux` "Plan edits fixture" mocks the server's success and refusals.

### Redline intake

The Edit panel can read a marked-up image or PDF page and list the changes a model saw; the architect ticks, then applies. See [[contracts#Redline intake]].

`workspace/redline-panel.tsx` sits below the edit forms and `redline-list.tsx` draws the list. The ticked changes go through `use-plan-edit.ts` `applyMany`, which reuses the single-edit path one request at a time. The `/dev/ux` "Redline intake fixture" mocks the file reader and the server for a ready list, unclear marks, an apply error part-way and a multi-page PDF picker.

### Revit checks

The Details drawer's Revit tab lets an architect check the open Revit model, select or zoom to the affected elements in Revit and compare a Revit floor-plan image with the DATUMM plan. See [[contracts#Revit checks]].

`workspace/revit-panel.tsx` takes the workspace `api` helper as `call`, so the `/dev/ux` "Revit checks fixture" answers every call itself (health with problems, partial coverage, a plan image, a stale-revision refusal and offline). `workspace.tsx` passes the tab through the `revit` slot of `details-drawer.tsx` only when `revitChecks` is on and the selected device is online; the DATUMM plan beside the Revit image is a static `PlanDrawing` of the plan on screen. The tab is local to the drawer, like Technical, and has no stored section.

## Admin console

`/admin` is a dark-only console for runtime agent configuration, gated on the server by the signed-in primary email and enforced again by the backend by Clerk subject.

`src/app/admin/layout.tsx` returns 404 unless the verified primary email is in `ADMIN_EMAILS` (pure rule `isAdminEmail` in `src/lib/admin-access.mjs`, default the owner). Pages call `/api/service/admin/...`, which the proxy maps to the backend `/v1/admin/...`; a 404 shows "Backend not deployed yet" and a 403 "Backend admin access not configured".

Config sections (Agent, Web search, Skills, MCP servers) edit one shared config document with dirty state, validation from `src/lib/admin-config.mjs` mirroring `AppConfig`, and a revision-checked save; a 409 asks for a reload. MCP servers are stored only and not yet connected to the agent. Knowledge polls while any source is indexing. The Plugin page reads `public/downloads/release.json`.
