# Research record — Panda-agent reference and DATUMM harness capabilities (16 November 2026)

Two read-only Opus subagents produced these findings; this file is the condensed record so later agents need not redo the work. **Provenance:** claims marked ✔ were re-checked by the orchestrator against source on 16 Nov; unmarked claims are the subagents' reports with file and line evidence and should be re-verified in phase S0 before a phase depends on them. Nothing was changed in either repository. Plan built from this: [roadmap](roadmap-2026-11-16.md).

## A. DATUMM harness

### Which runtime serves what

| Runtime | Role | Evidence |
| --- | --- | --- |
| `datumm-orchestrator` (FastAPI + LangGraph, Mongo checkpoints, `apps/domain-api/main.py`) | Production contract the web calls: `/v1` runs, devices, connector, admin; `/v2` tasks, projects, share. Ask, Plan and Build with native Revit through a relay | ✔ admin router `admin_api.py:13`, `knowledge.py:273`, `/v1/config` `main.py:290` |
| Desktop OpenCode harness (`apps/desktop`, local sidecar) | MCP broker, native skills and commands, native sub-agents, per-role model routing, provider streaming, compaction, local traces | Reported |
| Hosted OpenCode canary (`apps/domain-api/hosted/entry.py`) | Ask and Plan only, `nativeAvailable:false`, no admin routes, a few allowlisted users | Reported |

Source of truth for backend work: the candidate clone at `artifacts/ux/agui-presentation/candidate` (HEAD `188ebc0` ✔). The local `Datumm-opencode` clone is at `971acc2` on another branch and lacks `188ebc0`. Hosting location (AWS) is from documents only; docs conflict on the cutover date.

### Capabilities today (production contract)

| Capability | Status |
| --- | --- |
| Agent config: models, default model, effort, USD ceiling, per-run limits, parallel chats | Implemented, tested; compare-and-set revisions, 30 s cache, run snapshots config |
| Model catalog | `/v1/config` serves environment models; admission validates against the admin list, so they can drift |
| Model routing | None. User-selected planner, no automatic fallback; specialists use environment models with one timeout fallback |
| Context trimming | Implemented (16k target, 24k hard bound, deterministic compaction) |
| Tool registry | Server-owned fixed allowlist; no `/v1/tools` on production |
| MCP | Stored only ✔ (`app_config.py:38`, `mcpServers` field `:55`) |
| Skills | Admin text appended to the system prompt; no tools or files |
| RAG and knowledge | Implemented, tested: HTML only, SSRF-safe, 2 MB cap, embeddings, top-5 excerpts, background indexing; quality not evaluated |
| Web search | Implemented: OpenRouter web plugin, domain allowlist, budgeted |
| Memory | Project brief with compare-and-set; task handoff memory; no per-user long-term memory |
| Sub-agents | Five specialist roles behind default-off flags; deployed flag values unknown; no full lifecycle events |
| Events | Stage and detail records, 300 ms polled SSE; no event-level per-tool duration or outcome (the web separately reads `run_manifest.tools[].elapsedMs`, whose production fill is unverified); inline cap 200, tail cap 2,000 |
| Telemetry | Per model call (tokens, USD, duration, finish reason) recorded privately, excluded from public data |
| Usage | Cumulative per task; today's USD in the admin overview; no per-owner, per-day or per-model aggregate |
| Quotas | Only a parallel-chat cap and a project cap; no per-user quota or billing |
| Cancel, pause, continue | Implemented on production as `/v1/runs/{id}/cancel|pause|continue|recover|resume` and as v2 command types; the v2 REST routes `tasks/{id}/cancel`, `queue*`, `questions/answer` and `design-review` exist only on the OpenCode local app |
| Feedback | Absent |
| Audit | Admin only, last 100 rows, fields `at, by, summary` |
| Admin auth | Clerk subject in `ADMIN_SUBJECTS`; one role, no tiers |
| AG-UI emission | Backend none ✔ (no AG-UI strings). Web adapter emits `RUN_STARTED/FINISHED/ERROR`, `TEXT_MESSAGE_*`, `STATE_SNAPSHOT`, `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT` ✔; no `TOOL_CALL_*` or `STEP_*` |

### Admin API

`GET`/`PUT /v1/admin/config` (409 on stale revision), `GET /v1/admin/audit`, `GET /v1/admin/overview`, knowledge sources `GET`, `POST`, `DELETE`, `POST …/{id}/reindex`. Every endpoint has a web page and the proxy allow-list matches. Proxied paths that exist only on the OpenCode app: `tools`, task `cancel`, `questions/answer`, `queue*`, `design-review`. Backend endpoints with no web route: `/v1/agent/goals`, device `capabilities` and `analysis`, `/desktop/*`.

### Constraints on the frontend

Native Revit authority stays exact-proposal only; event retention caps lose old composition proof; no public per-step traces; no token deltas; no router decisions to show; the v2 command schema and LangGraph checkpoints must stay resumable; one worker with an in-process concurrency lock; config edits do not affect running runs; production and the OpenCode preview differ, so the UI must detect capability per backend.

### Unknowns

Whether AWS serves `188ebc0` today; deployed values of `ADMIN_SUBJECTS`, specialist flags, `ALLOWED_MODELS`, USD limit; whether admin pages succeed against production; retrieval and citation quality; real token and latency cost of events.

## B. Panda-agent (reference only)

Current code: git worktree `E:\Web development\PROJECTS-FULL STACK\panda-agent-ui` (path `Panda-agent\src\…` inside it), branch `claude/agent-ui-migrations`. The folder `Pandabyte\Panda-agent` is an older OpenCode-and-RAG build. Stack: Next 16.4.3, React 19.3, assistant-ui, Streamdown, Clerk, Postgres RPCs. **Not** the Vercel AI SDK: its own TypeScript loop calls OpenRouter with `fetch`. LangGraph only in the admin RAG workflow.

### Screens

| Route | Features |
| --- | --- |
| `/panda-agent` | Conversation sidebar with projects and search; composer; thinking and activity panel; plan checklist; prompt queue; question and approval cards; model picker; attachments; dictation; cited answers; thumbs feedback with reasons; share; retry on another model; Chat and Work modes |
| Workspace settings | General, Appearance, Permissions (approval mode), Usage, Data, Account |
| `/admin/agent-models` | Stats strip, ordered free-model pool, model table, add from catalog, test (latency, tool call), enable, visibility, daily limits |
| `/admin/agent-skills` | Tabs: Skills, MCP Servers, Tools, Configuration; SKILL.md editor; MCP add, test, per-tool allow, ask or never |
| `/admin/agent-traces` | Period, stats, by-model table, signals, recent turns with filter chips |
| `/admin/agent-feedback` | Period, stats, reasons, thumbs-down list, opt-in Q&A, copy eval case, dismiss |
| `/admin/rag-control-room` | Intake review, corpus, document library, retrieval playground, model and case evaluation |

The live site redirects every agent and admin page to Clerk sign-in, so these come from code. `/panda-agent/ui-preview` returns 404; `/admin/ai-chat` is a placeholder.

### Patterns worth reusing

- **Versioned rows:** every mutable row has a version; patches send the expected version; the database raises a conflict; the UI says "changed elsewhere, reloaded". Skills keep full snapshot history; models and tool settings do not; there is no restore anywhere.
- **Safe additions:** a new model is off until tested and enabled; an MCP server cannot be enabled until a connection test passes.
- **Text-free traces:** one row per turn with owner hash, requested and served model, outcome, steps, tools, bounded signal names, tokens, cost, duration; no question or answer text.
- **Feedback:** up or down, fixed reason list, optional 500-character note, text stored only if the user shares it, joined to the trace by request id.
- **Approval modes:** ask, safe, auto per user, with risk classes read, write, device, external; device tools always ask; cards expire after 15 minutes.
- **MCP registry:** secrets sealed with the server name bound in, https only, SSRF blocklist, 15 s timeout, size caps, per-tool mode, untrusted results. Hand-written client with no OAuth; DNS re-checked only at save, test and turn start.
- **Skills:** SKILL.md frontmatter, 6,000 character cap, only name and trigger in the prompt with the body loaded on demand, enabled per Chat or Work.

### Orchestration and "JEV"

- **JEV** is TypeSafe's decision model `typesafe/jev-1.14`, called through OpenRouter's alpha endpoint `https://openrouter.ai/api/alpha/decisions` ✔. It answers typed choice, probability and score questions. It is a vendor model, not an internal library.
- In Panda-agent it runs in **shadow mode only**, behind a flag that defaults off ✔ (`PANDA_AGENT_JEV_SHADOW`), is never awaited, and never changes a turn. The gate that would act on it is written but not called live. Labels are 208 from one rater, and none of the evaluation scripts has been run against a provider.
- What actually routes there: a regex fast-lane (`fast-lane/router.ts`), a catalog quick lane for single-product questions, and a full loop (10 steps, history compaction at 75%, word-overlap skill selection). Model choice is not routed: the user picks or a free pool with failover is used.
- Planned there but unbuilt: dropping history on a confident "no", product pre-read, web pre-search, evidence-sufficiency checks, with gates of 95% lane accuracy, at most 2% false history drops and zero injection to the short path. Its own measurements say the large costs are per-turn metadata fetches, serial setup, resent prompts and schemas, and re-prompts.

### Portability verdicts

Copy as UI patterns: admin layouts, stats strips, filter chips, modals, plan checklist, queue, question and approval cards, thinking panel. Needs backend capability: traces and feedback store, versioned history with restore, model test and usage, approval risk classes, MCP and skills registry (use the official Python MCP SDK), the regex pre-router as a graph edge. Do not copy: the Jev client, contract and gate code (TypeScript, alpha vendor API), the custom MCP client, non-streamed answer handling.

**Router verdict:** defer. A LangGraph orchestrator already routes with graph edges; Panda's own data says routing is not its main cost; misrouting a domain question to a no-tools lane is the main risk; an extra round trip and an external processor for user text need a privacy review; accuracy has never been measured. Adopt only deterministic rules now.

### Panda-agent gaps to avoid

Documents that contradict the code; two diverging trees; three generations of skill systems on one admin page; a dozen `PANDA_AGENT_*` flags deciding behavior; an uncalibrated router; a thin evaluation harness with manual feedback-to-eval; no skill restore; no model or tool audit history; per-instance model cooldown; no OAuth for MCP.

### Unknowns

Which Panda tree is deployed; whether the shadow flag is on anywhere; real accuracy, latency and cost of the decision model; vendor price and latency claims are quoted from Panda's own plan dated 15 Nov 2026 and were not re-verified; the live admin layouts were never seen.
