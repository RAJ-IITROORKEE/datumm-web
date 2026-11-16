# Harness decision and revised plan (17 November 2026)

Status: **approved by the user on 17 Nov ("Approve all": H1 to H4, every recommended option).** Research: two read-only Opus agents on 17 Nov; the
orchestrator re-checked the load-bearing claims in source (marked ✔). Nothing was changed in code.

## 1. The question

Should the DATUMM **web** agent move off its current backend harness onto the Vercel AI SDK running on
AWS (as the user believed Panda-agent does), keeping OpenCode only for the desktop app? And should the
plan borrow Panda-agent's sidebar, composer, model switcher, context meter, admin registries and
Tavily search?

## 2. What is actually true

| Belief | Finding |
| --- | --- |
| The web runs on the OpenCode harness on AWS | **No.** The web calls only the FastAPI + LangGraph `datumm-orchestrator` (`src/lib/backend.ts:8-10` ✔; live `/health` = `datumm-orchestrator`, `188ebc0` ✔). The hosted OpenCode stack is a separate canary for 1–4 allowlisted users, Ask and Plan only, no Revit (`hosted/README.md:3`). The confusion likely comes from the ECR repository name `datumm-opencode-builder-hosted-opencode`, which holds the LangGraph image ✔ |
| Panda-agent uses the Vercel AI SDK | **No.** No `ai`, `@ai-sdk/*` or MCP SDK package in any Panda worktree ✔. Its loop is hand-written TypeScript: one non-streamed `fetch` per step to OpenRouter (`openrouter-step.ts:69,92` ✔), assistant-ui on the browser, custom SSE. It also does **not** token-stream answers |
| Panda's sidebar and composer are a new design | **Partly.** Panda's own specs say they were copied from datumm-web (`design-specs/sidebar.md`), then extended: Pinned, date groups, Ctrl K palette, resizable width, model picker groups, context meter |
| DATUMM lacks MCP, skills, good search | **True.** MCP servers are stored but never offered to the agent (`app_config.py:40` ✔); skills are prompt text (`agent_workflow.py:1572` ✔); search is OpenRouter's Exa plugin with an allowlist and 4 searches per run (`research_tools.py:146-170` ✔) |

Panda-agent's current code is in `panda-agent-ui` (`7c78dea`, 17 Nov). The folder named in the request
(`Pandabyte`, branch `claude/agentic-rag-harness`) is 363 commits behind with 522 uncommitted paths.

## 3. Is it worth replacing the web harness? Recommendation: **no — keep the backend, port Panda's features onto it**

- Only about 15% of the backend (about 3,200 of 21,700 lines, inferred) is the agent loop. The other
  85% is what makes DATUMM work: durable tasks with receipts and resume, budget reserved before each
  model call, the layout solver and its verification, immutable plans and reports, exact-proposal
  Revit approval, and the C1–A3 admin features. A new loop would have to call all of it anyway.
- The AI SDK would mainly buy token streaming. Streaming is blocked here by the answer format (a
  forced `finish_answer` tool call ✔) and validation before display, not by LangGraph; phase N5 fixes
  that in place. Panda-agent does not stream either.
- MCP, skills and Tavily are features, not harness properties. Panda built them by hand; DATUMM can
  build them on its backend (official Python MCP SDK) with the same admin rules Panda uses.
- A replacement breaks paused tasks (LangGraph checkpoints), throws away 307 test functions and
  restarts every go-live gate. A second harness also needs explicit approval under `AGENTS.md`.
- **Revisit later, narrowly:** an AI SDK loop for the Ask path only, after N5 has measured streaming on
  the current backend, and only if it disappoints.
- **Desktop:** unchanged. The local OpenCode harness stays as it is.

## 4. Working rules from the user (17 Nov)

- Work on local `main` in both repos; no feature or release branches.
- Show every phase on the real localhost site; after the user approves it there, push `main` and
  deploy to the live AWS backend and Vercel site (each push or deploy still confirmed at the time).
- This replaces go-live decision D3 (release branches and PRs) and makes step W0 and the preview
  origin unnecessary: Vercel builds `main` straight to `datumm-web.vercel.app`, which the backend
  already authorizes.

## 5. Revised phase order

Each phase keeps the packet → approval → build → localhost check → checkpoint cycle; "Live" means the
user approved localhost and then the push/deploy.

| # | Phase | Size | What it delivers | Borrowed from Panda |
| --- | --- | --- | --- | --- |
| 1 | **G1 Go live** (existing plan, simplified) | M | Deploy the done work (C1–Q1, U1; A3 in a second backend release), push `main` to Vercel | Live preview on the go |
| 2 | **UI1 Composer and sidebar** | M | Model picker with groups, provider, price and privacy hint, keyboard nav; **context-window meter** (used / max ring, tooltip with input, output, steps, cost); sidebar: Pinned, Projects, Today / Yesterday / 7 days, Ctrl K palette, resizable, mobile drawer | `model-picker.tsx`, `ai-elements/context*`, `sidebar/` |
| 3 | **T1 Tavily web search** | S | Tavily adapter behind the existing search budget and domain allowlist; DATUMM's own key in AWS Secrets Manager; cited sources; admin on/off | `search/tavily.ts` rules (private-address check, citation ids) |
| 4 | **A4a Tools and skills registry** | M | Admin tool switches per mode (Ask / Plan / Build); SKILL.md skills with versions and restore, loaded on demand, not appended whole | `tool-catalog.ts`, `skill-md.ts`, skills admin |
| 5 | **A4b MCP registry** | L | Official Python MCP SDK; https only, SSRF block, secrets sealed; enable only after a passing test; per-tool allow / ask / never; results treated as untrusted | MCP admin and its database rule |
| 6 | **N5 Streaming and measured speed** | L | Token-streamed answers with validation kept; baseline from Q1 traces | Goes beyond Panda |
| 7 | **W1 Right work area** | S | Unchanged; separate go or no-go | — |
| 8 | **R1 Knowledge for NBC compliance** | L | Own research packet first: PDF intake, vector search, cited clauses, a control room for sources and evaluation; extends today's knowledge module | RAG control room layout |
| — | AI SDK Ask path | — | Deferred; only if N5 measurements disappoint | — |

Not borrowed: Panda's custom MCP client (no OAuth), its `PANDA_AGENT_*` flag sprawl, its uncalibrated
router, and its non-streamed answer handling.

## 6. Decisions for the user (recommendation first)

| # | Decision | Options |
| --- | --- | --- |
| H1 | Harness | **A: keep the LangGraph backend and port the features (section 3).** B: hybrid AI SDK loop for Ask now. C: full replacement |
| H2 | Order | **A: go live first (G1), then UI1, T1, A4a, A4b, N5.** B: UI1 and T1 before going live |
| H3 | Tavily account | **A: a separate DATUMM Tavily key stored in AWS Secrets Manager, never in the repo or chat.** B: share Panda's key |
| H4 | Go-live branches | **A: main only, as the user asked; drop W0 and the preview origin.** B: keep the earlier release-branch plan |
