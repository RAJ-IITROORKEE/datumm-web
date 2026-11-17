# DATUMM web: master planner (17 November 2026)

Status: **for the user's review before development starts.** This brings into one ordered plan everything not yet
built for datumm-web and its backend (`datumm-orchestrator`). Sources: [PLAN.md](../../PLAN.md),
[revision-agent plan](revision-agent-plan-2026-11-17.md),
[desktop UI convergence plan](desktop-ui-convergence-plan.md), [desktop deep-dive](desktop-deep-dive-2026-11-17.md),
[viewer engines](plan-viewer-engines-2026-11-17.md) and the [starred-repos review](starred-repos-review-2026-11-17.md).

## 1. How each phase runs

| Step | Who | Gate to pass |
| --- | --- | --- |
| 1. Packet | Opus (medium) subagent | Scope, files, tests, browser scenarios, acceptance, rollback; recommended options taken |
| 2. Build | Sonnet subagent(s), on disjoint files | Its own tests added |
| 3. Review | A separate Opus (medium) subagent, reading the diff cold | No high findings; medium findings fixed |
| 4. Gates | Orchestrator (Opus 5.5) runs them itself | Backend: `pytest`, `lat check`. Web: typecheck, `npm test`, build, `lat check` |
| 5. Localhost | Orchestrator, in the built-in browser | The packet's browser scenarios pass against the local backend |
| 6. Live | Orchestrator | Backend: build → rehearsal on the latest dump → quiet check → backup → change set (Service + Task only) → health. Web: Vercel deploy and 18 runtime checks. Then the same scenarios on the live site |
| 7. Record | Orchestrator | Packet result, PLAN.md row and handoff updated; committed to `main` |

Parallel rule: at most one backend implementer and one web implementer at a time, so no two writers share files.
The rehearsal and the image build run one after the other, because CodeBuild allows one build at a time.

## 2. Done and live

UI1, UI2, A3, A4a, A4b, CV1, plus T1 code (backend `115980f`, web `caf5a62`).
P-SEC is built, reviewed and pushed (`8bd8b8f`) but is **not live yet** (blocker B1).

## 3. Waves

### Wave 0: unblock (now, small)

| # | Item | Where | Size | Needs |
| --- | --- | --- | --- | --- |
| W0.1 | Release P-SEC to AWS | backend | S | B1 (user: `aws login`) |
| W0.2 | Fix the pre-existing 404: `history/done` is called by the web but has no route | web + backend | S | — |
| W0.3 | Trust hardening: standing grants approve only proven kinds, never deletes or levels (T-b); the connector advertises read tools only without a write grant (T-f) | backend | S–M | T decisions |
| W0.4 | Run retention: runs kept 180 days, spans and events archived after 30 (T-c) | backend | S | T-c |

### Wave 1: the check engine (core of the product)

| # | Item | Where | Size | Depends on |
| --- | --- | --- | --- | --- |
| V1 | Collect every finding instead of stopping at the first. Freeze the finding schema: code, severity, plain message, why, fix, expected vs actual, room keys, rule version, plus person dispositions (archlang + mutinybim shapes). Brief → intent file; each rule is either blocking or advisory | backend (planner + domain-api) | M | RV approval |
| VW1 | 3D viewer fixes: curved walls, polygon rooms, wall selection, outline highlights, no full rebuild on each change | web | M | — (parallel with V1) |

### Wave 2: show the checks, then let the agent fix

| # | Item | Where | Size | Depends on |
| --- | --- | --- | --- | --- |
| V2 | Checks report: pass/warn/fail grouped by Geometry, Brief, Circulation, Code, Revit; "Show" highlights in 2D/3D; dispositions with reasons | web | M | V1, VW1 |
| AG1 | Agentic run on hosted: defaults instead of mid-run questions, a check-and-fix loop. Hill Climb rules: locked rules and targets, keep only steps that improve the score, undo the rest, stop when failures stop shrinking, at most ~3 rounds. Loop detection from deer-flow. One review at the end | backend | L | V1 |

### Wave 3: the architect UI (one shared shell for web and desktop)

| # | Item | Where | Size | Depends on |
| --- | --- | --- | --- | --- |
| UX1 = CV2 | Design and Review modes plus a Details drawer; plain-language copy (ids and traces moved to Details); sidebar filters (In progress / Needs input / Ready for review); density fixes. Review opens before Approve is enabled | web | L | V2, AG1 |

### Wave 4: targeted edits and code rules

| # | Item | Where | Size | Depends on |
| --- | --- | --- | --- | --- |
| M1 | Select a room, then resize, move, rename or swap it; local re-tile; checks; before/after diff; a "no unintended change" rule (archlang lock, pascal `achievedChanges`); 2D edit handles | backend + web | L | V1, UX1 |
| R1′a | NBC rule table: clause, threshold, version, enabled (debim shape); habitable room minimums, kitchen and bath, stairs, door widths | backend | S–M | V1 |

### Wave 5: Revit on hosted, tracing, travel distance

| # | Item | Where | Size | Depends on |
| --- | --- | --- | --- | --- |
| V3 | Hosted read parity: add the 4 missing read tools (model warnings, room boundaries, view image, show elements); model health; warnings delta; "Validate in Revit"; plan-to-model overlay gate (creator-generalist) | backend + web | M | P-SEC live |
| TR1 | Tracing: `run_spans` in Mongo with the desktop span schema; the Details drawer shows the run tree; LangGraph agent evals (today's evals drive OpenCode) (T-d) | backend + web | M | UX1 |
| R1′b | Travel distance along the walking route (ported from massing) | backend | M | R1′a |

### Wave 6: Revit edits, redlines, revision package (needs the desktop/add-in repo)

| # | Item | Where | Size | Depends on |
| --- | --- | --- | --- | --- |
| M2 | Edit selected Revit elements on hosted; before-values in the add-in receipt and a revert proposal (T-e) | backend + web + **add-in** | L | V3 |
| RD1 | Redline intake: a marked-up PDF or image becomes scoped tasks; claim-limiting modes; known / inferred / unresolved (DWG-redraw skill ideas) | backend + web | L | AG1, M1 |
| EV1 | Revision package: before/after, checks, dispositions, change log; vector PDF | web + backend | M | V2, AG1 |
| CV3–CV5 | Desktop adopts the shared shell: sync script, desktop host adapter, drift gate | **desktop repo** | M–L | UX1 |

### Parked (not planned until you ask)

A4c MCP registry (waits on decisions A4c-a and A4c-c), H6, U2, A5, UI3, N5 streaming, R1 RAG, Crucible render
worker, DWG output, bringing curved and multi-storey planning to hosted (T-g: after V1/M1), CV6 shared package.

## 4. Blockers

| # | Blocker | Blocks | Who |
| --- | --- | --- | --- |
| B1 | The AWS `datumm` sign-in expired | P-SEC live and every backend release | User: `aws login --profile datumm` |
| B2 | Revision-agent plan not yet approved (RV-a to RV-d plus the repo adaptations) | V1 and everything after it | User |
| B3 | Trust decisions T-a to T-g open | W0.3, W0.4, TR1, M2 | User |
| B4 | `TAVILY_API_KEY` not in the runtime secret | Web search in live use | User adds it in Secrets Manager |
| B5 | New dependencies need approval: `@flatten-js/core`; `svg2pdf.js` + `jspdf`; `@thatopen/*` + `web-ifc` (M2) | VW1/M1 arcs, EV1 vector PDF, M2 model view | User, at the phase |
| B6 | Add-in changes (before-values, connector tool list) live in the desktop repo, where the local clone has uncommitted work | M2, T-e, T-f on the device side | User: where to make add-in changes |

## 5. Current issues found

- The planner stops at its first failed check, so the user sees one error, not a report (`plan-graph.ts:40`).
- 3D draws curved walls straight and polygon rooms as rectangles; PDF export is a raster JPEG.
- Hosted standing grants can approve writes before any track record exists; the connector advertises write tools.
- Edits record no before-values, so a change cannot be reverted by proposal.
- No retention on `runs`, `run_events`, `task_events`.
- The web's trace panel shows nothing on hosted; agent evals don't cover the LangGraph agent.
- The web calls `history/done`, which has no backend route (404).
- Local `.env.local` points at the local backend; restore `.env.local.bak-a3` before real use.

## 6. Suggestions

1. Unblock first: sign in to AWS so P-SEC can go live, and add the Tavily key.
2. Approve RV and the T decisions together, so Wave 0 and Wave 1 can start in parallel: backend V1 and web VW1.
3. Merge UX1 and CV2 into one phase so the shell is built once for both products.
4. Build V1 before any UI rework: the finding schema is the contract that V2, AG1, R1′, M1 and EV1 all use.
5. Choose the first beta revision type now (recommended: room changes) so AG1 and M1 have one measurable target:
   staff hours per accepted revision.
