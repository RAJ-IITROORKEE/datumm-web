# Desktop UI convergence plan (17 November 2026)

Status: **approved by the user on 17 Nov 2026, with every recommended option (UI-a to UI-h).** Plan only so
far; no application code has changed yet.

Goal: one shared UI for the DATUMM desktop app and DATUMM Web. Keep the desktop's idea (clear modes that
follow an architect's workflow) and the web's execution (layout, components, density). Long term both
products share one UI and backend codebase, and each product line still moves in its own direction.

Design rules for every step (user, 17 Nov): keep DATUMM's theme and typography exactly; Panda-agent is the
layout and behaviour reference; affectui.com (vendored in `src/components/vendor/affectui`) is the component
reference. Plain language in the main view: no ids, fingerprints, revisions or traces.

## How this was checked

- `D:` = desktop `RAJ-IITROORKEE/datumm-opencode-revit-agent` `origin/main` `9a24261`, read only with
  `git show origin/main:<path>` from the local clone (its working tree was not touched) and extracted to
  this session's scratchpad. The older `desktop-main` extract was not used.
- `W:` = this repo, local `main`, as on disk on 17 Nov.
- ✔ = I read that line in source this session. Unmarked claims come from docs and are not re-verified.
- Nothing was built, run or opened in a browser. All sizes in section 1 are worked out from CSS, not measured
  on screen.

## 1. The desktop UI today

### 1.1 Screen map (desktop layout, `desktopLayout = desktopAvailable || desktopPreview` ✔ `D:apps/web/src/components/workspace.tsx:145`)

```
+--------------------------------------------------------------------------------------+ 44px titlebar
| [<] DATUMM | Project / Architectural workspace           [...] [>|] [gear] [_][ ][x]  |
+-----------+--------------------------------------------------+-----------------------+
| WORKSPACE | Task title  · Project · Proposed design v3  [act]| Assistant|Properties| | 66px header
| New chat  +--------------------------------------------------+ Activity  [...]       |
| Find…     | Project name   Workspace revision 12             |-----------------------|
| Scheduled | [Workflow] [Workspace] [Platform]                | chat transcript       |
| Activity  | [Generated Design][Existing Revit Model]         | (12px text)           |
| Pinned    | +-------------------------------+--------------+ |                       |
| Projects  | | canvas / native model         | Proposal     | |                       |
|  folders  | | (min-height 540px)            | Review       | |                       |
| Recent    | |                               | 240-280px    | |                       |
|           | +-------------------------------+--------------+ | composer (68px, 12px) |
| Settings  | Pipeline: Brief Plan Review Prepare Approve ...  | 44px                  |
| Account   +--------------------------------------------------+-----------------------+
| status · connection · selected element                                         26px |
+--------------------------------------------------------------------------------------+
  200px                 1fr (min 220px)                          440px (max 42vw)
```

### 1.2 The three modes

The mode type is persisted in the workspace record: `'workflow' | 'workspace' | 'platform'`
✔ `D:apps/desktop/src/workspace-contracts.ts:3`, order ✔ `D:apps/web/src/lib/workspace-controller.ts:3`,
unknown values fall back to `workspace` ✔ `workspace-controller.ts:4-5`. The tabs are rendered by
`WorkspaceModes` ✔ `D:apps/web/src/components/workspace-modes.tsx:20-37`.

| Mode | What it shows | Evidence |
| --- | --- | --- |
| Workflow | `WorkflowOverview`: a state label, a "next step" sentence and a 7-step list Brief → Plan → Review → Prepare → Approve → Apply → Verify, plus the scheduler | ✔ `workspace.tsx:1129`, ✔ `workflow-overview.tsx:7-14`, ✔ `D:apps/web/src/lib/studio-pipeline.ts:10-18` |
| Workspace | A "Model source" toggle (Generated Design / Existing Revit Model); generated plan canvas, or `NativeModelWorkspace` (session and floor-plan pickers, capture, view images, model canvas, then tree and properties) | ✔ `workspace.tsx:1125`, ✔ `native-model-workspace.tsx:82-95` |
| Platform | "Project Resources": Drawings & Files, Project Standards, Connected Tools, each with a button that opens another panel | ✔ `workspace-modes.tsx:28-32` |
| (all) | A context row (project name and "Workspace revision N") above the tabs, and a "Proposal Review" aside on the right when a proposal exists | ✔ `workspace-modes.tsx:22,35`, ✔ `workspace.tsx:1128,1131` |

Around the modes: the right inspector has its own tabs Assistant / Properties / Activity (the chat lives in a
tab) ✔ `workspace.tsx:1216-1217`; the sidebar has Scheduled tasks and Activity as separate full views
✔ `workspace.tsx:1153`; Settings replaces the whole stage with an embedded 205px-nav dialog
✔ `workspace.tsx:1244`, ✔ `desktop-settings.module.css:6`.

### 1.3 Why it feels cramped (concrete causes)

1. **Five stacked chrome bars.** Titlebar 44px ✔ `studio-workspace.css:3`; grid rows 66px header, 44px
   pipeline, 26px footer ✔ `studio-workspace.css:10-11`; then inside the stage a context row (12px padding
   each side) and a tab row ✔ `workspace-modes.module.css:2,5`. About 180px is fixed chrome before the mode
   content, about 260px with the context and tab rows.
2. **The canvas cannot fit a laptop window.** The canvas stage has `min-height:540px`
   ✔ `studio-workspace.css:64`. On a 768px-high window (about 500px left after chrome) the canvas
   overflows and the stage scrolls.
3. **Chat and properties compete for one panel.** The chat is a tab beside Properties and Activity
   ✔ `workspace.tsx:1216`, so an architect cannot read the agent and see the selected room together.
4. **Three columns plus a nested fourth.** Right panel default 440px (range 240-620) ✔ `workspace.tsx:313`,
   ✔ `panel-resize.tsx:7`; the centre may shrink to 220px ✔ `studio-workspace.css:10`; inside it the
   Proposal aside takes 240-280px ✔ `workspace-modes.module.css:7`. At 1366px wide the centre is about
   726px, under the 850px container breakpoint ✔ `workspace-modes.module.css:33`, so the proposal drops
   below the canvas, out of view.
5. **The same progress is shown twice.** Workflow mode lists the 7 steps, and every other mode also shows the
   44px "Pipeline" bar with the same steps ✔ `workspace.tsx:1213`.
6. **Small text.** Body 13px Arial ✔ `D:apps/web/src/app/globals.css:31`, type scale 12/13/14
   ✔ `globals.css:5`; chat text 12px (`--studio-chat-font-size:var(--type-sm)`) ✔ `studio-workspace.css:266`;
   composer textarea 68px high at 12px ✔ `studio-workspace.css:284`.
7. **Native model detail is squeezed.** The element tree is capped at 260px high
   ✔ `native-model-workspace.module.css:25`; tree and properties sit side by side only above a 650px
   container ✔ `native-model-workspace.module.css:39`, which item 4 rarely leaves.
8. **Engineer-shaped copy in the main view.** "Workspace revision N" ✔ `workspace.tsx:1128`; "Design
   identity" in the property grid ✔ `workspace.tsx:1220`; "Document {id} · observed revision"
   ✔ `native-model-workspace.tsx:88`; "Scope {fingerprint}…" ✔ `workspace.tsx:1191`; seven pipeline
   stages named after internal states ✔ `studio-pipeline.ts:11-17`.
9. **Too many always-visible regions.** Sidebar, header, mode tabs, model-source toggle, canvas, proposal
   aside, pipeline bar, inspector tabs, chat and footer are on screen together (10 regions).
10. **Layered, override-heavy CSS.** A base grid in `globals.css:51` (242 / 1fr / 316) is overridden by
    `studio-workspace.css:10-14` and again in 7 media queries ✔; 19 `!important` ✔; mode styles reach into
    other components by `aria-label` selectors ✔ `workspace-modes.module.css:23-29`. Every layout fix risks
    another.
11. **One 1,248-line composition root** ✔ (`workspace.tsx`, several lines over 2,000 characters) and a
    1,214-line settings file ✔ (`desktop-settings.tsx`).

## 2. What the web does better

| Area | Web behaviour | Evidence |
| --- | --- | --- |
| Shell grid | Three bordered panels (navigation, chat, work area), 8px gap, 12px radius; 64px header and 26px footer only | ✔ `W:src/components/studio-workspace.css:460-469` |
| Layout rules as tested pure logic | Navigation 220-360px (default 224), chat 320-620px (default 380); split view only at 1180px or more with 640px left; viewport clamps never overwrite saved widths | ✔ `W:src/lib/workspace-layout.mjs:34,46,62-76` |
| Narrow screens | Below split: one pane with a Chat / Drawing switch ✔ `studio-workspace.css:551-556`; below 850px the navigation becomes a 264px drawer with backdrop ✔ `:573-576`; below 500px one column ✔ `:582-588`; 16px inputs on narrow ✔ `:512` | as cited |
| Focus mode | The drawing can take the full window | ✔ `studio-workspace.css:559-563` |
| Home | Composer centred, 672px max, 28/34 title; work area hidden until there is a drawing | ✔ `studio-workspace.css:527-535`, ✔ `workspace-layout.mjs:11-12` |
| Work area | Four sections Design / Activity / Assets / Exports with roving-tab keyboard, `inert` hidden panels, Properties as a closable aside, Escape closes properties then previews | ✔ `W:src/components/workspace/inspector.tsx:8-11,23-44` |
| Chat beside the drawing | Chat is a stable middle column; the drawing and properties stay visible while reading | ✔ `studio-workspace.css:466-467` |
| Sidebar | Panda-style: new chat, search dialog, pinned, projects, date groups, row menu, "Working" / "Needs attention" chip, 52px rail | ✔ `workspace/sidebar.tsx:73`, ✔ `chat-row.tsx:97`, ✔ `search-dialog.tsx:15`, ✔ `sidebar-rail.tsx:27`; groups per `DESIGN.md:163` |
| Composer | Prompt queue with Alt+Enter "send now", context meter, model picker | ✔ `workspace/composer.tsx:304,312,523,602,611` |
| Approvals | Tool approval card, permissions settings, exact Revit proposal panel kept separate | ✔ `tool-approval-card.tsx:15`, ✔ `permissions-settings.tsx:11`, ✔ `review/proposal-approval.tsx:10` |
| Admin | Models, Tools, Skills pages plus traces, history, audit inside one admin shell | ✔ `W:src/app/admin/{models,tools,skills}/page.tsx`, ✔ `components/admin/admin-shell.tsx` |
| Settings | Eight sections from a pure navigation module; `desktop-settings.tsx` is 122 lines here versus 1,214 on desktop | ✔ line counts; sections per `DESIGN.md:174-185` |
| Typography and theme | Inter Variable 13/20 interface, 14/22.4 answers ✔ `W:src/app/foundation.css:173-175`, ✔ `studio-workspace.css:483-484`. `datumm.json` is byte-identical in both repos ✔ (diffed) | as cited |
| Seams already present | `desktop-contract.ts` holds renderer DTOs and "installs no native bridge" ✔ `W:src/lib/desktop-contract.ts:1`; the work area takes content through typed slots ✔ `W:src/lib/work-area-contract.ts`, used at `inspector.tsx:14` | as cited |

Web weaknesses to fix in the shared version, not to copy: 11px text in two places ✔
`studio-workspace.css:455,540`; `workspace.tsx` (1,460 lines), `conversation.tsx` (1,557) and
`use-workspace-state.ts` (1,223) are oversized ✔; the web work area has no mode concept, so the architect's
workflow is implicit.

## 3. The target shared UI

### 3.1 Modes (decision UI-a, recommendation first)

| Option | Modes | Fit |
| --- | --- | --- |
| **A (recommended). Design / Review, plus a Details drawer** | **Design**: the plan or Revit model, select and change, a Checks panel beside it. **Review**: the one end-of-task review (what changed, checks, assumptions, exact Revit approval). **Details** drawer, not a mode: activity, files and standards, tools, exports, technical ids | Matches the revision-agent plan section 3 and its loop (work, check, review once). Keeps the desktop's idea of clear modes, with two verbs an architect uses. Each desktop mode still has a home: Workspace → Design, Workflow → the progress line in Review and the sidebar state filters, Platform → Details |
| B. Keep Workflow / Workspace / Platform | Same three tabs, rebuilt in the web shell | No migration of stored mode values. But "Workspace" and "Platform" are software words, Workflow duplicates the progress bar (section 1.3 item 5), and Platform is reference material that does not need a full mode |

Stored values under A: map on read `workspace → design`, `platform → design` with the drawer open,
`workflow → review` when a proposal exists, else `design`. A rollback stays safe because the old reader turns
any unknown value into `workspace` ✔ `D:workspace-controller.ts:5`.

### 3.2 Screen map

```
Wide (>= 1180px, split view)
+---------------------------------------------------------------------------------------+
| title bar (desktop only, 40px): [<] DATUMM  Project / Chat     [Design|Review] [i] _ [] x |
+----------+-------------------+--------------------------------------------------------+
| New chat | chat (380px)      | Design                                    [Checks] [Props]|
| Search   |                   | +-----------------------------------+  +---------------+|
| Filters: |  answers 14/22.4  | |                                   |  | Checks        ||
|  In prog |                   | |     plan / Revit model            |  | 2 warnings    ||
|  Needs   |  questions dock   | |     2D | 3D                        |  | Show on plan  ||
|  Review  |                   | |                                   |  +---------------+|
| Projects |  [composer 672]   | +-----------------------------------+                   |
| Recent   |  queue · model    |                                                        |
| Account  |  · context meter  |                                                        |
+----------+-------------------+--------------------------------------------------------+
| Revit connected · Project · v3                                           (26px, web)  |
+---------------------------------------------------------------------------------------+
  224px (52 rail)  320-620px        1fr (min 640 shared with chat)

Review mode replaces the work area:
| Review: what changed (before | after)  · Checks report · Assumptions · [Approve in Revit] |

Details drawer [i] (overlay sheet from the right, 420px, Escape closes, focus returns):
| Activity | Files & standards | Tools | Exports | Technical details (ids, revisions) |
```

```
Medium (900-1179px): one pane + switch          Narrow (< 850px, phone at < 500px)
+------------------------------------+          +----------------------+
| [=] Chat | Design | Review     [i] |          | [=] Task title  [i]  |
+------------------------------------+          | Chat | Design|Review |
| active pane only                    |          | one pane, 16px input |
|                                     |          | 44px targets          |
+------------------------------------+          +----------------------+
 navigation: 52px rail or drawer                 navigation: drawer
```

### 3.3 Layout per mode

| Region | Design | Review | Details drawer |
| --- | --- | --- | --- |
| Sidebar | Web sidebar; adds state filters In progress / Needs input / Ready for review (from the desktop's chat filter, ✔ `D:workspace.tsx:1159`) | same | unchanged behind the sheet |
| Chat column | Stable, same component in both modes | Stays; the review card in chat links to the Review mode | unchanged |
| Main area | Drawing (2D/3D) or the Revit model canvas; source switch "New design / Revit model" as a segmented control in the work-area header, not a separate row | One review screen: before/after, checks grouped Geometry / Brief / Circulation / Code / Revit, assumptions, one exact approval | not a region |
| Right panel | Properties (closable aside, existing `inspector.tsx:41-44`) and Checks (toggle) share one 320px slot, one at a time | none; review is full width | 420px sheet over the work area (`W:src/components/ui/sheet.tsx` exists ✔) |
| Desktop title bar | One 40px bar: drag region, project / chat title, Design / Review switch, Details button, window controls. Replaces the 44px titlebar and the 66px header. No separate pipeline bar | same | same |
| Web header | 64px header keeps the same switch and Details button | same | same |

The desktop's tree / canvas / properties for an existing Revit model become the Design main area (canvas)
with the tree as a collapsible list in the Properties slot. Activity and Scheduled tasks move from full
views to the Details drawer and the profile menu, as on the web.

### 3.4 Responsive and density rules

- Breakpoints from `workspace-layout.mjs`: split at ≥ 1180px with ≥ 640px left; single pane below; navigation
  drawer below 850px; one column below 500px. Mode switch becomes part of the pane switch when single.
- At most three visible regions plus one overlay (sheet, dialog or properties).
- Fixed vertical chrome ≤ 96px on web (64 + 26 today) and ≤ 66px on desktop (40px bar + 26px status).
- No `min-height` on the canvas larger than the space left after chrome; the canvas fits, then zooms.
- Type: DATUMM tokens as in `DESIGN.md:126` (13/20 interface, 14/22.4 answers, 12/16 metadata minimum).
  Nothing below 12px. Chat on desktop goes from 12px to the web's 13/14.
- Targets: 32px on fine pointers, 44px on coarse pointers and narrow screens; 16px inputs on narrow.
- Main view copy in plain language; ids, revisions, fingerprints and traces only under Details → Technical
  details.
- Layout CSS lives in one module per region; no `!important`, no `aria-label` selectors for styling.

## 4. Shared-codebase strategy (decision UI-b, recommendation first)

What must stay product-specific in every option: the Electron shell and window controls; the preload bridge
(`window.desktop`, 50+ methods ✔ `D:apps/desktop/src/preload/index.ts`, used from 10 component files ✔);
OpenCode supervision; the Python domain sidecar and local SQLite; the local session-cookie proxy
(`D:apps/web/src/proxy.ts` per its README) versus Clerk on the web; local settings (providers, voice, runtime
limits); native Revit capture and the trusted desktop approval; the admin console (web only).

| Option | What is shared | Sync and drift risk | Effort |
| --- | --- | --- | --- |
| **B (recommended now). Web is the source of truth; desktop `apps/web` consumes it through a host adapter** | All presentation: shell, sidebar, chat, composer, work area, review, settings frame, tokens, `vendor/affectui`, `ui/`. Desktop keeps a thin `host/desktop` folder (adapter for `window.desktop`, local proxy, local auth state) and desktop-only slot content (native model, observability) | One direction only (web → desktop) with a hash manifest and a CI check in the desktop repo that fails on local edits to synced files. Risk is moderate and visible; today's drift came from two-way copying (e.g. `desktop-settings.tsx` 1,214 vs 122 lines ✔) | M to set up; then each sync is S |
| A (target later). Shared `packages/ui` used by both | The same set as B, as a versioned package | Lowest drift once in place, but the web is a separate repo and the desktop is an npm workspace with `packages/*` already declared ✔ (`D:package.json`, no `packages/` folder yet ✔). Needs a monorepo merge or a private package registry, and both on the same Next and React versions (web 16.4.6, desktop 16.4.3 ✔) | L |
| C. Desktop embeds the hosted web UI with a host adapter | Everything, including deploys | Lowest code drift, but the desktop loses offline and local mode, and loading a remote origin into a window with a privileged preload bridge widens the attack surface; local OpenCode and sidecar calls would need a second channel | L, plus a security review |

Recommendation: **B now, A when the repos merge.** B gives one UI immediately with a seam (the host adapter and
work-area slots) that becomes the package boundary in A, so nothing is thrown away. Backend convergence
(hosted orchestrator versus local OpenCode plus sidecar) stays behind the same adapter: the UI calls
`host.tasks`, `host.native`, `host.auth`; each product implements them. That is a separate plan.

Host adapter surface (first cut, names only): `auth` (status, sign in/out), `tasks` (commands, events),
`native` (discover, capture, build action, view images), `attachments`, `settings` (models, voice, runtime;
desktop only), `window` (minimize, maximize, close, state; desktop only), `capabilities` (what the host
supports, so the UI hides absent features honestly).

## 5. File-by-file port list (desktop `apps/web/src/components` at `9a24261`)

"Synced" = replaced by the web file of the same role; "Slot" = kept as desktop content inside a shared slot;
"Drop" = removed after its content moves.

| Desktop file | Becomes |
| --- | --- |
| `workspace.tsx` | Synced web shell (`W:workspace.tsx` + `workspace/*`), split during the port; desktop wiring moves to `host/desktop` |
| `workspace-modes.tsx` (+css) | Drop; replaced by the Design / Review switch in the work-area header and the Details sheet |
| `workflow-overview.tsx` (+css) | Drop; its steps become the progress line in Review, in plain words |
| `desktop-titlebar.tsx` | Kept (same file exists in web ✔); restyled to the 40px bar with the mode switch |
| `panel-resize.tsx` | Synced web version; widths from `workspace-layout.mjs` |
| `project-context.tsx` | Synced web version |
| `demo-mode.tsx` | Kept, behind `host.capabilities` |
| `composer-media.tsx`, `composer-controls.module.css` | Synced web composer (`workspace/composer.tsx`, `attachment-chips.tsx`); desktop attachment ingest through `host.attachments` |
| `model-picker.tsx` | Synced web version |
| `prompt-content.tsx` | Synced (identical name; check diff) |
| `agent-questions.tsx`, `opencode-questions.tsx`, `vendor/opencode-question.ts` | Synced web question dock; the OpenCode state machine stays only if the desktop host still emits OpenCode questions |
| `saved-turn-result.tsx`, `task-outcome.tsx` | Synced |
| `ai-elements/conversation.tsx`, `ai-elements/message.tsx` | Synced web `ai-elements` and `workspace/conversation.tsx` |
| `plan-canvas.tsx` (+css), `plan-canvas-annotations.ts` | Synced web version |
| `plan-three.tsx` (+css) | Synced web version |
| `building-canvas.tsx` (+css), `building-three.tsx` | Slot (Design main area, multi-floor); candidate to move into web later |
| `design-review.tsx`, `planning-goal.tsx`, `studio-properties.tsx` | Synced; properties render in the Properties slot |
| `reference-alignment-panel.tsx` (+css), `reference-alignment.ts` | Slot (Design, Properties side) |
| `native-build-review.tsx`, `native-build-progress.tsx` | Synced web versions; feed the Review mode |
| `native-model-workspace.tsx` (+css), `native-model-canvas.tsx`, `native-model-tree.tsx`, `native-model-properties.tsx`, `native-model-inspection.module.css` | Slot (Design → Revit model). Canvas in the main area, tree and properties in the Properties slot. Basis for M2 on hosted |
| `native-view-images.tsx` | Slot (Details → Files) |
| `existing-edit-review.tsx` | Slot (Review, existing-model edit) |
| `draft-assessment.tsx`, `build-comparison.tsx` | Synced; shown in Review |
| `agent-activity.tsx`, `agent-memory.tsx`, `agent-scheduler.tsx`, `agent-specialists.tsx` | Synced; shown in Details → Activity |
| `evidence-results.tsx` | Synced; Review checks and Details |
| `datum-insights.tsx`, `pipeline-trace.tsx` | Details → Technical details (desktop slot) |
| `observability-dashboard.tsx` (+css) | Kept as is; developer route only |
| `desktop-settings.tsx` (+css) | Synced web settings frame and sections; desktop-only sections (providers, voice, runtime, updates, Revit bridge) as slot content |
| `theme-settings.tsx` (+css) | Synced web Appearance section; tokens unchanged |
| `account-admission.tsx` (+css) | Synced (identical); desktop sign-in through `host.auth` |
| `studio-workspace.css` | Synced web file, then split by region (no `!important`) |
| `ui/*` (badge, button, button-group, dialog, dropdown-menu, separator, tabs, tooltip) | Synced web `ui/*` plus `vendor/affectui/*` |
| `README.md` | Rewritten to say which files are synced and which are desktop-owned |

## 6. Phases, risks, tests, browser scenarios, rollback

Each phase: packet → approval → build → review → localhost check → live (web) or installer (desktop).

| # | Phase | Size | Where | Depends on |
| --- | --- | --- | --- | --- |
| CV0 | Approve this plan and decisions UI-a to UI-h | S | docs | — |
| CV1 | Host adapter contract and capability flags in web (`lib/host/*`), web implementation only; no visible change | S | web | CV0 |
| CV2 | Shared shell in web: Design / Review switch, Details sheet, plain-language copy pass, sidebar state filters, density fixes (no 11px) | M (shell); the full Review screen waits for V2/AG1 | web | CV1; overlaps UX1 of the revision plan |
| CV3 | Desktop adopts the synced shell: sync script plus hash manifest, `host/desktop` adapter, 40px title bar, mode-value mapping | M | desktop | CV2 |
| CV4 | Desktop slots: Revit model (tree / canvas / properties), existing-edit review, building canvas, reference alignment, technical details | L | desktop | CV3 |
| CV5 | Drift gate in desktop CI (fails on edits to synced files) | S | desktop | CV3 |
| CV6 | Extract `packages/ui` once the repos merge | L | both | CV5, a repo decision |

Risks:
- **Native approval boundary.** The desktop approves Revit writes in its trusted review; the shared Review
  screen must call `host.native` and never treat a click in shared UI as approval by itself.
  Mitigation: keep `native-build-review` behaviour and its tests (`D:apps/web/tests/approval-honesty.test.mjs`).
- **Stored mode values.** Mapping in section 3.1; old readers fall back safely ✔.
- **Font change on desktop.** Desktop moves from Arial to the web's Inter (decision UI-e).
- **Two Next versions** (16.4.6 web, 16.4.3 desktop ✔): align before CV3.
- **Oversized web files** are copied into the desktop unless split first; split inside CV2.
- **Order conflict** with the revision-agent plan (RV-a puts UX1 after V1, V2, AG1): CV2 can ship the shell
  with today's content and leave the full Review screen to UX1.

Tests (all with Node's runner, no new dependency):
- `workspace-layout` per mode and breakpoint (split, single, drawer, one column).
- Mode mapping both ways, including unknown values.
- Host adapter: web host hides desktop-only features; desktop host maps each `window.desktop` call.
- Hash-manifest check for synced files.
- Desktop gates kept: `type-scale`, `contrast`, `css-vars`, `no-hex-colors`, `screen-reader-semantics`,
  `tabs-and-refresh`, `approval-honesty` (all present ✔ in `D:apps/web/tests/`); web `npm test`,
  `typecheck`, `build`, `lat check`.
- A copy check: no id, fingerprint or "revision N" text outside Details.

Browser scenarios (built-in browser on web localhost; desktop browser preview `npm run preview:desktop`, then
the installed app):
1. 1366×768: Design shows chat, drawing and properties with no page scroll; the canvas fits.
2. 1920×1080 and 1180 / 1179px: split turns into one pane exactly at the breakpoint; saved widths unchanged.
3. 1024px and 390px, dark and light, high contrast: pane switch, navigation drawer, 44px targets, 16px input.
4. Keyboard: Tab to the mode switch, arrows change mode; Details opens, Escape closes and focus returns.
5. Review: the exact Revit approval still shows document, revision and proposal in Technical details and is
   refused when stale; browser preview still refuses Build.
6. Desktop: the title-bar drag region does not cover the mode switch or window controls; minimize, maximize
   and close work.
7. A saved desktop task with mode `platform` opens in Design with Details open.

Rollback: web, revert the commit and promote the previous Vercel deployment. Desktop, revert the sync commit;
the previous installer stays published; stored mode values stay readable by the old build ✔. CV1 has no
visible change and needs no rollback.

## 7. Decisions for the user (recommendation first)

| # | Decision | Options |
| --- | --- | --- |
| UI-a | Mode names | **A: Design / Review plus a Details drawer.** B: keep Workflow / Workspace / Platform |
| UI-b | Sharing strategy | **B now (web is the source of truth, desktop consumes it through a host adapter), A (`packages/ui`) when the repos merge.** A now. C: desktop embeds the hosted web UI |
| UI-c | Sync direction | **One way, web → desktop; desktop UI changes land in web first.** Two-way copying as today |
| UI-d | Chat position on desktop | **Stable middle column as on the web.** Keep chat as a right-panel tab |
| UI-e | Desktop typography | **Use the web's DATUMM tokens (Inter 13/20, answers 14/22.4); colours already identical.** Keep Arial on desktop |
| UI-f | Where ids and traces go | **Details → Technical details only.** Keep them in the main view for engineers |
| UI-g | Activity and Scheduled tasks on desktop | **Details drawer and the profile menu, as on the web.** Keep them as full views |
| UI-h | Order against the revision-agent plan | **CV1 now (no visible change); CV2 shell after V2, together with UX1.** B: CV2 first, before V1 |
