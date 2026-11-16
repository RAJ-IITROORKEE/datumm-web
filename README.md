# DATUMM Web

DATUMM's Studio interface for the browser, backed by the existing hosted DATUMM task service. Web and desktop use the same Clerk account instance. Revit connectivity requires the separate Windows add-in and connector.

## Run

Copy `.env.example` to an ignored `.env.local`, configure the existing Clerk instance and HTTPS orchestrator origin, then run `npm ci`, `npm run dev`. Validate with `npm test`, `npm run typecheck`, `npm run build`, and `lat check`.

Development defaults to `http://localhost:3001`, an origin currently authorized by the hosted service. Open that exact origin: `http://localhost:3000` is not currently authorized and authenticated service requests will return 401. If port 3001 is occupied, free it or use an origin already authorized by the service; changing the port alone does not authorize that origin.

Both Clerk keys must be nonblank before the account provider, sign-in or setup can open. Missing or partial configuration shows “Account sign-in is unavailable”; it never opens an anonymous workspace. The server derives only safe configuration reasons. These presence checks do not establish credential health.

The task service is configured separately: `ORCHESTRATOR_URL` must be an HTTPS root origin without credentials, query or fragment. A configured origin is not a reachability check. Account profile/setup remains available when the task service is unavailable. Configure the exact web origin with the existing Clerk/service allowlists; never widen those allowlists for local testing. Keep real values in ignored environment files or the deployment secret store, then restart development after changes.

After starting the production build with `npm start`, run `npm run check:runtime` for anonymous browser/API boundary checks. A different running origin can be passed after `--`. These checks do not prove authenticated backend or live Revit acceptance.

## Code map

`src/components/workspace.tsx` composes the Studio from the files below. State stays in one hook; each panel receives it as props.

- `src/components/workspace/use-workspace-state.ts`: all workspace state, effects and commands (`useWorkspaceState`), the `Run` and related types, and the service `api` helper.
- `src/components/workspace/sidebar.tsx`: left navigation (new chat, search, scheduled tasks, activity, pinned, project and recent lists, row menus, filters) and the collapsed rail.
- `src/components/workspace/conversation.tsx`: the chat panel and its transcript blocks (messages, one process accordion per turn, design and native review cards, errors, budget checkpoint, saved-artifacts link). The question dock and plan checklist render above the composer.
- `src/components/workspace/turn-process.tsx`: the per-turn process accordion (step, agent or job, tool names and statuses), rendered under the DATUMM label.
- `src/components/workspace/plan-details.tsx`: alternatives, comparison, exports, assumptions and limits for the plan, shown in the Exports tab (the chat keeps a compact card).
- `src/components/workspace/review-report.tsx` and `src/lib/review-report.mjs`: read-only source-aware BOQ/element report preview and typed retained-row CSV, covered by `tests/review-report.test.mjs`.
- `src/app/connect/page.tsx`, `src/components/connections/device-authorization.tsx` and `src/lib/device-authorization.mjs`: authenticated connector computer review and explicit approval; connector token claiming is not exposed to the browser.
- `src/components/workspace/chat-row.tsx`: one minimal chat row with status dots, inline rename and the row menu (Rename, Move to project, Pin, Archive, Delete).
- `src/components/workspace/project-create.tsx`: hosted "New project" inline field.
- `src/components/workspace/plan-dock.tsx`: pinned "Plan · n of m" checklist above the composer (task plan, native to-dos, or stage spans for Ask turns).
- `src/components/workspace/share-dialog.tsx`: chat-header Share button and dialog (create link, copy, stop sharing); hidden when the backend share route answers 404/405.
- `src/app/share/[token]/page.tsx` and `not-found.tsx`: public read-only shared chat, fetched server-side from `GET /v2/shared/{token}` without sign-in (`src/proxy.ts` skips Clerk for `/share`); the plan SVG is shown through an `<img>` data URI only.
- `src/lib/share.mjs`: pure share link, token and shared-payload normalisation, covered by `tests/share.test.mjs`.
- `src/components/workspace/brief-chips.tsx`: compact brief chips (footprint, entry, counts) at the top of the Properties tab.
- `src/components/agent-questions.tsx`: the one-question-at-a-time dock (hosted questions).
- `src/components/workspace/composer.tsx`: composer area (notices, queue, mode menu, model picker, plugin setup guide, send and stop).
- `src/components/workspace/inspector.tsx`: right panel tabs (Agent, Properties, Activity) plus Exports and MCP tools.
- `src/components/plan-canvas.tsx`: the plan viewer (2D and 3D tabs, tools, comments, properties, export). `src/components/plan-drawing.tsx` draws the 2D sheet from the plan graph (`PlanDrawing`) and exports a view (`exportPlanSheet`, `exportRaster`); `src/components/plan-three.tsx` is the 3D view.
- `src/lib/plan-geometry.mjs`: pure 2D plan geometry (room outlines, dimension chains, wall and arc paths, sheet extents, measure label), covered by `tests/plan-geometry.test.mjs`. `src/lib/plan-pdf.ts` wraps a JPEG in a one-page PDF on the server and in the browser.
- `src/lib/sidebar-history.mjs` and `src/lib/workspace-layout.mjs`: pure rules for the chat lists and plan focus, covered by `tests/sidebar-history.test.mjs` and `tests/workspace-layout.test.mjs`.
- `src/lib/turn-nesting.mjs` and `src/lib/chat-seen.mjs`: step, agent, tool grouping (`nestProcess`, hosted `stageSpans` with note-based titles and summaries, `latestNote` for the shimmering Working line) and unread-chat rules, covered by `tests/turn-nesting.test.mjs` and `tests/chat-seen.test.mjs`.
- `src/lib/settled-poll.mjs`: the polling loop (skips hidden tabs, backs off on errors) and the interval rules `openChatPollMs` / `listPollMs`, covered by `tests/settled-poll.test.mjs`.
- `src/lib/hosted-command.mjs`: strict v2 envelope and the new-chat pre-check (parallel Ask/Plan up to three), covered by `tests/hosted-command.test.mjs`.
- `src/lib/agent-todos.mjs` and `src/lib/question-stepper.mjs`: pure rules for the plan checklist and the question dock, covered by `tests/agent-todos.test.mjs` and `tests/question-stepper.test.mjs`.
- `src/app/admin/`: the dark-only `/admin` console. `layout.tsx` is the server gate (verified primary email in `ADMIN_EMAILS`, comma list, default the owner, else 404), `admin.css` pins the dark tokens, and each section is a one-line page.
- `src/components/admin/`: `admin-shell.tsx` (collapsible sidebar, mobile sheet, breadcrumb), `use-admin.tsx` (proxy calls, 404/403/409 states, config load and revision-checked save), `form.tsx` (fields, chips, config page with save bar), `config-sections.tsx` (Agent, Web search, Skills, MCP servers), `data-sections.tsx` (Overview, Knowledge, Plugin, Audit log).
- `src/lib/admin-access.mjs` and `src/lib/admin-config.mjs`: pure email gate and config validation, covered by `tests/admin-access.test.mjs`, `tests/admin-config.test.mjs` and `tests/admin-proxy.test.mjs`. Set `ADMIN_EMAILS` in Vercel to add admins; the backend still requires the Clerk subject in `ADMIN_SUBJECTS`.

## Deploy

Use the repository root as a Next.js Vercel project, Node.js 22 or newer, build command `npm run build`, and default output directory. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and server-only `ORCHESTRATOR_URL` in Vercel.

Append the exact new web origin to the configured service's `CLERK_AUTHORIZED_PARTIES` allowlist and permit it in the same Clerk instance. Keep existing authorized origins, desktop authorization origin and desktop verification pin. A future custom subdomain must be added to those allowlists before switching it on. Browser sessions on different unrelated domains may require sign-in again; identity remains the same account.

## Runtime scope

The browser proxies its configured hosted task service through strict v2 commands, saved events and versioned plans; it does not host an agent worker in Vercel. On 12 November 2026, read-only environment and health checks identified production behind AWS CloudFront as `datumm-orchestrator` (task/event contract v2), while the hosted OpenCode preview reported an isolated history namespace and `nativeAvailable:false`. These are separate environments; do not switch origins merely to obtain a different UI capability. See `docs/ux/backend-contract-evidence.md` for source and live-evidence limits.

`/connect?request=...` reviews the Revit connector's existing browser authorization request after sign-in. Only an explicit Allow action approves the computer; this does not approve native model changes or confirm the device is online. Connector token claiming remains outside the browser. The workspace's Schedules & BOQ view reads the existing schema-1 `report-json` export and labels model revision, source and coverage. Its CSV contains validated retained rows; it does not implement immutable BOQ revision history.

Local project folders, attachments, speech transcription, desktop MCP packs and queued background prompts remain desktop capabilities. The web interface exposes hosted model selection, planning, exact design acceptance, drawing/export review, connector management and exact native proposal approval.

Only reviewed frontend source, browser DTOs, the DATUMM mark, public plugin release metadata, font and dependency notices are included. No backend implementation, desktop binaries, private model content or environment values are included.
