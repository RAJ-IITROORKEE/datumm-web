# Panda-agent parity plan (17 November 2026)

Status: **approved 17 Nov; H5 = option A (port Panda's harness behavior onto DATUMM's backend).** The user asked (17 Nov) to bring the whole Panda-agent experience into DATUMM:
its design layout, references, harness tool calling and every feature, step by step, with each
finished step committed, pushed to `main` and deployed live. This file is the feature list and the
order. Source of the Panda facts: the 17 Nov research (Panda code at
`panda-agent-ui/Panda-agent`, `origin/main` `7c78dea`) summarized in
[harness-decision-2026-11-17.md](harness-decision-2026-11-17.md); paths below are Panda's.

## 1. One decision first: what "harness tool calling" means (H5)

| Option | What changes | Size | Keeps |
| --- | --- | --- | --- |
| **A. Port Panda's harness behavior onto DATUMM's backend (recommended)** | The Python agent gets Panda's loop rules: tool catalog with per-mode switches, approvals (ask / safe / auto, risk classes), step limits (30 normal, 80 long), history compaction at 75% keeping the last 3 turns, "answer or ask only" at 85% of budget, on-demand skills, MCP tools, Tavily, citation ids that must come from a tool | Several M/L phases (section 3) | Durable tasks and resume, the layout solver, reports, exact-proposal Revit approval, everything live now |
| B. Copy Panda's TypeScript loop and run it for the web chat | A second agent loop (Panda's `agent-loop/*`, `openrouter-step.ts`, journal tables) in Next.js or a Node service on AWS, calling DATUMM's Python services as tools | XL; two chat stores; Plan/Build still need the Python path | Panda's exact code |

Under both options the UI, admin and feature list below is the same. Only where the loop runs
differs. Section 3 of the harness decision explains why A is recommended: Panda's loop is
hand-written (no Vercel AI SDK) and does not stream either, and 85% of DATUMM's backend is domain
code a new loop would still have to call.

## 2. Feature parity list

Status in DATUMM: **have** (done), **part** (exists, needs Panda's version), **new** (absent).

| # | Panda feature (where in Panda) | DATUMM | Phase |
| --- | --- | --- | --- |
| 1 | Sidebar: Pinned, Projects, date groups, Ctrl K palette, chips, resize, drawer (`ui/agent/sidebar/`) | part | UI1 (building) |
| 2 | Model picker with groups, price, privacy hint (`model-picker.tsx`) | part | UI1 |
| 3 | Context meter ring and tooltip (`ai-elements/context*`) | part | UI1 |
| 4 | Prompt queue: up to 3 queued, "Send now" steer, Alt+Enter (`ui/prompt-queue.ts`) | new | UI2 |
| 5 | Suggested follow-up as ghost text, Tab accepts | new | UI2 |
| 6 | Attachment chips with thumbnails, reading and error states, paste and drop | part | UI2 |
| 7 | "N of M left today" and daily limits per user (`panda_agent_daily_limits`) | new | U2 |
| 8 | Retry on another model after a provider failure (`workspace.tsx:591`) | new | UI2 |
| 9 | Question cards: up to 3 questions, 2 to 5 options (`ask_user`) | have | — |
| 10 | Approval cards with risk class and 15-minute expiry (`approvals.ts`) | part (Revit exact proposals) | A4a |
| 11 | Approval modes ask / safe / auto per user; device always asks | new | A4a |
| 12 | Tool catalog with per-mode switches (Chat/Work → Ask/Plan/Build) (`tool-catalog.ts`) | new | A4a |
| 13 | Skills: SKILL.md, versions and restore, listed by relevance, loaded on demand (`skill-md.ts`) | part (prompt text) | A4b |
| 14 | MCP registry: https only, private-address block, sealed secrets, test before enable, per-tool allow / ask / never (`mcp/client.ts`, migration `20261113190000`) | part (stored only) | A4c |
| 15 | Tavily web search, 4 per turn, cited ids checked (`search/tavily.ts`, `tools.ts:547`) | part (OpenRouter Exa) | T1 |
| 16 | Step limits 30 / 80, budget gate at 85%, compaction at 75% keeping 3 turns (`loop.ts`, `history.ts`, `work-limits.ts`) | part (16k/24k trimming, budget) | H6 |
| 17 | Document outputs: PDF, DOCX, XLSX, Markdown tools (`create_*`) | part (report exports) | H6 |
| 18 | Admin models: test, enable, visibility, daily limits, usage (`admin/agent-models`) | have (A3; visibility and limits new) | A3 + U2 |
| 19 | Admin traces (`admin/agent-traces`) | have (A1, live) | — |
| 20 | Admin feedback page: reasons, thumbs-down list, copy as eval case (`admin/agent-feedback`) | part (votes stored, no page) | A5 |
| 21 | Settings: General, Appearance, Permissions, Usage, Data, Account | part | UI3 |
| 22 | RAG control room: intake, library, corpus, playground, evaluation (`admin/rag-control-room`) | part (knowledge sources) | R1 (NBC) |
| 23 | Token streaming | absent in Panda too | N5 |

Not copied (DATUMM-specific or worse): Panda's product catalog, pinout, firmware compile and Web
Serial tools; its custom MCP client without OAuth (use the official MCP SDK); its `PANDA_AGENT_*`
flag sprawl; its shadow decision router.

## 3. Order (each step: packet → approval → build → localhost check → commit → push → live)

| Step | Phase | Size | Live effect |
| --- | --- | --- | --- |
| 1 | **UI1** composer and sidebar (in progress) | M | New picker, meter, sidebar groups and chips |
| 2 | **A3 backend release** plus UI1 `modelInfo` | S | Models admin page; picker prices and context sizes |
| 3 | **UI2** composer extras: queue, follow-up ghost text, attachments, retry on another model | M | Panda-style composer |
| 4 | **T1** Tavily search with checked citations (DATUMM's own key in Secrets Manager) | S | Better cited web answers |
| 5 | **A4a** tool catalog, per-mode switches, approval modes and risk classes | M | Admin Tools page; approval settings |
| 6 | **A4b** skills registry with versions and on-demand loading | M | Admin Skills page |
| 7 | **A4c** MCP registry (official Python MCP SDK) | L | Admin MCP page; MCP tools in chat |
| 8 | **H6** loop rules: step limits, budget gate, compaction, document tools | M | Steadier long runs |
| 9 | **U2** per-user daily limits and "left today"; model visibility | M | Usage limits |
| 10 | **A5** admin feedback page and eval-case copy | S | Feedback review |
| 11 | **UI3** settings parity (Permissions, Usage, Data) | M | Settings pages |
| 12 | **N5** streaming; **W1** right work area; **R1** NBC knowledge control room | L | Later |

If the user picks H5 option B, steps 5 to 8 are replaced by one XL phase that ports Panda's loop,
and the order is re-planned.
