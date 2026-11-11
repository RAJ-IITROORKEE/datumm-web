# DATUMM Web

DATUMM's Studio interface for the browser, backed by the existing hosted DATUMM task service. Web and desktop use the same Clerk account instance. Revit connectivity requires the separate Windows add-in and connector.

## Run

Copy `.env.example` to an ignored `.env.local`, configure the existing Clerk instance and HTTPS orchestrator origin, then run `npm ci`, `npm run dev`. Validate with `npm test`, `npm run typecheck`, `npm run build`, and `lat check`.

After starting the production build with `npm start`, run `npm run check:runtime` for anonymous browser/API boundary checks. A different running origin can be passed after `--`. These checks do not prove authenticated backend or live Revit acceptance.

## Code map

`src/components/workspace.tsx` composes the Studio from the files below. State stays in one hook; each panel receives it as props.

- `src/components/workspace/use-workspace-state.ts`: all workspace state, effects and commands (`useWorkspaceState`), the `Run` and related types, and the service `api` helper.
- `src/components/workspace/sidebar.tsx`: left navigation (new chat, search, scheduled tasks, activity, pinned, project and recent lists, row menus, filters) and the collapsed rail.
- `src/components/workspace/conversation.tsx`: the chat panel and its transcript blocks (messages, one process accordion per turn, design and native review cards, errors, budget checkpoint, saved-artifacts link). The question dock and plan checklist render above the composer.
- `src/components/workspace/turn-process.tsx`: the per-turn process accordion (step, agent or job, tool names and statuses), rendered under the DATUMM label.
- `src/components/workspace/plan-details.tsx`: alternatives, comparison, exports, assumptions and limits for the plan, shown in the Exports tab (the chat keeps a compact card).
- `src/components/workspace/chat-row.tsx`: one minimal chat row with status dots, inline rename and the row menu (Rename, Move to project, Pin, Archive, Delete).
- `src/components/workspace/project-create.tsx`: hosted "New project" inline field.
- `src/components/workspace/plan-dock.tsx`: pinned "Plan · n of m" checklist above the composer.
- `src/components/workspace/brief-chips.tsx`: compact brief chips (footprint, entry, counts) at the top of the Properties tab.
- `src/components/agent-questions.tsx`: the one-question-at-a-time dock (hosted questions).
- `src/components/workspace/composer.tsx`: composer area (notices, queue, mode menu, model picker, plugin setup guide, send and stop).
- `src/components/workspace/inspector.tsx`: right panel tabs (Agent, Properties, Activity) plus Exports and MCP tools.
- `src/lib/sidebar-history.mjs` and `src/lib/workspace-layout.mjs`: pure rules for the chat lists and plan focus, covered by `tests/sidebar-history.test.mjs` and `tests/workspace-layout.test.mjs`.
- `src/lib/turn-nesting.mjs` and `src/lib/chat-seen.mjs`: step, agent, tool grouping (`nestProcess`, hosted `stageSpans`) and unread-chat rules, covered by `tests/turn-nesting.test.mjs` and `tests/chat-seen.test.mjs`.
- `src/lib/settled-poll.mjs`: the polling loop (skips hidden tabs, backs off on errors) and the interval rules `openChatPollMs` / `listPollMs`, covered by `tests/settled-poll.test.mjs`.
- `src/lib/hosted-command.mjs`: strict v2 envelope and the new-chat pre-check (parallel Ask/Plan up to three), covered by `tests/hosted-command.test.mjs`.
- `src/lib/agent-todos.mjs` and `src/lib/question-stepper.mjs`: pure rules for the plan checklist and the question dock, covered by `tests/agent-todos.test.mjs` and `tests/question-stepper.test.mjs`.

## Deploy

Use the repository root as a Next.js Vercel project, Node.js 22 or newer, build command `npm run build`, and default output directory. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and server-only `ORCHESTRATOR_URL` in Vercel.

Append the exact new web origin to the existing Azure `CLERK_AUTHORIZED_PARTIES` allowlist and permit it in the same Clerk instance. Keep existing authorized origins, desktop authorization origin and desktop verification pin. A future custom subdomain must be added to those allowlists before switching it on. Browser sessions on different unrelated domains may require sign-in again; identity remains the same account.

## Runtime scope

This release uses the existing hosted LangGraph harness through strict v2 task commands, saved events and versioned plans. It does not deploy the desktop OpenCode process to Vercel. Cloud OpenCode parity requires a separately operated authenticated worker and persistence port.

Local project folders, attachments, speech transcription, desktop MCP packs and queued background prompts remain desktop capabilities. The web interface exposes hosted model selection, planning, exact design acceptance, drawing/export review, connector management and exact native proposal approval.

Only reviewed frontend source, browser DTOs, the DATUMM mark, public plugin release metadata, font and dependency notices are included. No backend implementation, desktop binaries, private model content or environment values are included.
