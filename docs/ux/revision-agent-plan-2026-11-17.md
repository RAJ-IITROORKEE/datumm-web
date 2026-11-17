# Revision-agent plan: modify, verify, review once (17 November 2026)

Status: **proposed, awaiting the user's approval.** Direction from the user (17 Nov message and the shared
YC-application chat): DATUMM closes design revisions end to end — redlines become tasks, the agent changes the
plan or Revit model on its own, **checks the result**, and asks for one review at the end, with every change
previewed, logged and reversible. Research: two read-only Opus agents (desktop line `9a24261` and our live stack
`115980f` + web); the orchestrator re-checked the marked (✔) facts.

## 1. Where we are

- **Verification exists but is scattered and mostly invisible.** The planner checks geometry, adjacency,
  circulation, openings and area, but stops at the first failure and shows it as an error message ✔
  (`plan-graph.ts:40`). Revit verification is strong (rollback dry run, exact receipt, per-element read-back with
  expected vs actual, goal criteria, one automatic correction) but appears as separate cards.
- **Desktop-only checks:** model health (Revit warnings, zero-area and unenclosed rooms, duplicate numbers),
  warnings delta before/after a build, checks for ceilings/roofs/stairs/grids/arcs, "Validate in Revit".
- **Missing everywhere:** one verification report, deterministic code (NBC) rules, a loop that fixes until the
  checks pass, and targeted edits ("make this room bigger") without re-solving the whole plan.
- **The flow is a copilot:** a Plan-then-Build run needs up to ~10 clicks or answers; only one (the exact Revit
  approval) is required by our safety rules. The agentic loop already exists on the desktop as "planning goals"
  and is switched off on hosted ✔ (`main.py:296`).
- **The UI is engineer-shaped:** Plan ID / fingerprint, "Approve exact proposal and build", task versions, model
  ids and runtime traces in the main view. The desktop's three modes are Workflow, Workspace and Platform ✔.

## 2. The target loop

1. **Task** — the architect describes a change, marks it on the 2D/3D view, or (later) uploads a redline set;
   DATUMM turns it into scoped tasks.
2. **Work** — the agent modifies the plan or model on its own: targeted edits where possible, re-solve where
   needed. It asks only blocking questions (scale, conflicts); everything else becomes a recorded assumption.
3. **Check** — a deterministic check engine runs (geometry, brief targets, circulation, NBC rules, Revit integrity).
   If anything fails, the agent fixes and re-checks, within a budget (about 3 rounds), and stops if nothing improves.
4. **Review once** — one screen: what changed (before/after), the checks report, assumptions, and the single
   **exact Revit approval** (bound to document, revision and proposal — unchanged rule).
5. **Apply and confirm** — Revit applies; read-back checks confirm; any correction comes back as a small follow-up
   review.
6. **Evidence** — a revision package with before/after and the checks, ready to send back to the client.

## 3. Architect-shaped UI (DATUMM theme and fonts unchanged; Panda layout; affectUI components)

- **Design** mode: the plan or Revit model, select and change, with a Checks panel beside it.
- **Review** mode: the one end-of-task review (changes, checks, assumptions, approval).
- **Details** drawer instead of a mode: activity, ids, traces, files and standards (the desktop's "Platform").
- A plain-language pass on all copy: no ids, fingerprints or runtime terms in the main view.
- Sidebar filters by state: In progress / Needs input / Ready for review.

## 4. Phases (each: packet → build → review → localhost check → live)

| # | Phase | Size | Depends on |
| --- | --- | --- | --- |
| 0 | **P-SEC** — hosted security fixes (in review now) | S | — |
| V1 | **Check engine for plans** — collect every finding (not the first): geometry, brief targets, circulation; `findings[]` on each design with rule, severity, plain message, expected vs actual, room keys | M | — |
| V2 | **Checks report** — pass/warn/fail rows grouped Geometry / Brief / Circulation / Code / Revit, "Show" highlights in 2D/3D | M | V1 |
| AG1 | **Agentic run** — hosted planning goal on the LangGraph run: defaults for alternative, placement and prepare; check-and-fix loop; one review at the end | L | V1 |
| UX1 | **Architect modes** — Design / Review + Details drawer, copy pass, sidebar state filters (reshapes W1) | L | V2, AG1 |
| M1 | **Targeted plan edits** — select a room → typed edit (resize, move, rename, swap) → local re-tile → checks → before/after diff | L | V1 |
| V3 | **Revit integrity on hosted** — model health, warnings delta, room boundaries, new element kinds, "Validate in Revit" | M | P-SEC |
| M2 | **Edit selected Revit elements on hosted** — the desktop's model tree / canvas / properties and existing-edit review | L | V3 |
| R1′ | **NBC rule tables** — deterministic code checks with clause citations (habitable room minimums, kitchen/bath, stairs, door widths, travel distance) | M | V1 |
| V4 | **Model critique** — the layout critic switched on as advisory only (never changes pass/fail) | S | V1 |
| RD1 | **Redline intake** — a marked-up PDF or image → scoped revision tasks (first type: door, window or room changes) | L | AG1, M1 |
| EV1 | **Revision package** — before/after, checks and change log for reissue | M | V2, AG1 |

## 5. What changes in the current plan

- Done and kept: UI1, UI2, T1, A4a, A4b. The concept-image card follows the end-of-task policy (no mid-run card).
- **Parked:** A4c (MCP) until its decisions are made; H6, U2, A5, UI3 and N5 streaming (long agentic runs are
  reviewed at the end, so streaming matters less now).
- **Moved forward and reshaped:** W1 becomes UX1. R1 narrows to deterministic rules (R1′).
- G1 releases continue unchanged; Tavily still waits for the key.

## 5a. Adaptations from the user's starred repos (proposed)

See [starred-repos-review-2026-11-17.md](starred-repos-review-2026-11-17.md).

- **V1:** freeze the finding schema first (archlang catalog plus mutinybim dispositions and rule versions).
- **R1′:** split into a rule table (R1′a) and route-based travel distance (R1′b, ported from massing).
- **M1:** prove that untouched rooms did not change.
- **AG1:** loop detection (deer-flow), stop when failures stop shrinking, and never weaken targets to pass.
- **Review and EV1:** show dispositions beside the checks; Approve stays disabled until the review is opened.

## 6. Decisions for the user (recommendation first)

| # | Decision | Options |
| --- | --- | --- |
| RV-a | Order | **A: P-SEC → V1 → V2 → AG1 → UX1 → M1, then V3/M2/R1′, then RD1/EV1.** B: start with UX1 (visual change first) |
| RV-b | Questions during a run | **A: ask only blocking questions; everything else becomes a recorded assumption shown at review.** B: keep asking as today |
| RV-c | First revision type | **A: room changes (resize, move, rename, swap) on generated plans, then door/window in Revit.** B: door/window first |
| RV-d | Mode names | **A: Design and Review, with a Details drawer.** B: keep the desktop's Workflow / Workspace / Platform |
