# Desktop harness vs web harness (17 November 2026)

Read-only research by an Opus agent on GitHub `RAJ-IITROORKEE/datumm-opencode-revit-agent` `main` = `9a24261`
(14 Nov), read from git objects in the local clone `datumm-opencode` (its working tree was not touched).
The orchestrator re-checked the marked (✔) claims. Nothing was changed in either repo.

## 1. How the two relate

- Same monorepo lineage (`apps/desktop`, `apps/domain-api`, `apps/planner`, `apps/web`). Last common commit
  `2aace05` (12 Nov) ✔. Desktop `main` has **126** commits after it ✔; our backend `main` has 50 ✔.
- Core agent code did not diverge on the desktop side: `agent_workflow.py` is unchanged there since `2aace05`
  (2,977 lines; ours 4,046 after C1–A4b); `apps/planner` changed only its README.
- `datumm-web` was mirrored from the desktop `apps/web`: 30 of 43 desktop component files share names with ours.

## 2. Desktop architecture (summary)

- Electron main supervises three loopback services: the pinned **OpenCode CLI 2.1.4** (`serve`, verified at
  start, never auto-installed), a Python domain sidecar on SQLite, and the Next.js UI in a sandboxed window.
- OpenCode config is generated in code: every built-in tool (bash, read…) is forbidden; only `datumm_revit_*`,
  `question`, `todowrite`, an allow-list of skills and two specialist tasks are allowed.
- Electron main is a **metering proxy** between OpenCode and OpenRouter: per-role tool filtering, budget
  reserved before each model call, step cap, tool-call id/argument checks, and **text streamed while tool calls
  stay buffered until complete** (`completion-stream.ts`).
- Revit: a stdio MCP server to the C# add-in (vendored into `revit-bridge/` on 14 Nov), brokered through the
  official MCP SDK. Writes need an exact proposal, a separate execution token and an Electron confirm dialog.
- Specialists: OpenCode Task sub-agents `datumm-vision` and `datumm-evidence`, depth 1, shared budget ledger.
- The add-in's default backend URL is our AWS backend (`BackendDefaults.cs:6`).

## 3. Differences that matter

| Capability | Desktop `9a24261` | Web (backend `115980f` + datumm-web) |
| --- | --- | --- |
| Agent loop | OpenCode + DATUMM proxy/plugin | LangGraph (Python) |
| Token streaming | Yes (text through the proxy) | No (forced `finish_answer`, validated first) |
| Tools / permissions | OpenCode permissions per role | A4a tool catalog, modes, approval cards |
| Skills | OpenCode skills (12) + 5 commands | A4b registry with on-demand loading |
| MCP to the agent | Revit MCP over stdio | Stored only (A4c not built) |
| Specialists | Vision / evidence sub-agents | `specialist_jobs.py` code checks |
| Admin traces, config history, models, AG-UI | Local traces only | A1–A3, AG-UI compositions |
| **Hosted security fixes after 12 Nov** | **Yes** | **Missing** ✔ (proposal expiry re-check before approve, share-link expiry, Clerk audience/origins, device user code + rate limit, CSV formula escaping, strict history request) |
| Verification of new element kinds (ceiling, roof, floor opening, stair, grid, arc boundaries) + "Validate in Revit" gate | Yes | Missing |

## 4. What to bring to the web (ranked by value for the cost)

1. **P-SEC — port the hosted security fixes** (S, low risk): the shared-module hunks in `main.py`, `auth.py`,
   `settings.py`, `share_api.py`, `task_api.py` from `2aace05..origin/main`, with their tests. Our live task sets
   `CLERK_AUTHORIZED_PARTIES` explicitly ✔, so the desktop's empty default is safe; device user codes stay off
   until the add-in shows one.
2. **P-NV — native verification for the new element kinds** (S/M): `agent_draft_verify.py` /
   `agent_draft_preview.py` hunks plus the M7 "Validate in Revit" state in the web review card — only once the
   web Build sends those kinds.
3. **N5 streaming** (M/L): port the proxy rule into the LangGraph provider call — stream text, buffer tool calls
   until complete, reserve before dispatch, check call ids/arguments, fail on `length` truncation.
4. **A4c MCP** (L): reuse the broker rules (read-tool allow-list, per-role filtering, nonce-bound admission,
   "incomplete catalog" failure) over HTTPS with the Python SDK — not stdio.
5. **Specialists** (M): vision/evidence roles with a 2-child cap and shared budget.
6. **Skills content** (S): import the 6 Revit workflow skills and 5 commands into the A4b registry.

UI to bring (behaviour only, rebuilt with affectUI in DATUMM's theme and Panda layout): the approval receipt
details (coverage, identity, evidence), the "Validate in Revit" / "Refresh review to approve" states, the
specialists list, the context meter with compaction count, and the native model tree / canvas / properties
pattern for W1.

## 5. What not to copy

The OpenCode process, plugin and `serve` API (a second loop, against H5 = A); loopback tokens, SQLite store,
Markdown context files and stdio MCP (desktop-only); the Electron confirm dialog (the web keeps its own explicit
exact-proposal approval); the desktop CSS modules, title bar, voice and local-file settings.

## 6. Not verified

Live behaviour of any desktop path; whether OpenCode streams partial text to the desktop UI (inferred); whether
the web Build sends the new element kinds today; desktop UI visuals (no screenshots).
