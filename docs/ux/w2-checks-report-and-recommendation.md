# Phase packet — Wave 2: checks report (V2) and check-ranked recommendation (AG1a)

| Field | Value |
| --- | --- |
| Status | approved 17 Nov 2026 (user: "Start Wave 2"; the master planner was approved with its recommended options) |
| Plans | [master planner](master-planner-2026-11-17.md) Wave 2; [revision plan](revision-agent-plan-2026-11-17.md) V2 and AG1; RV-b (ask only blocking questions) |
| Repos | `datumm-orchestrator` (`apps/domain-api`), `datumm-web` |
| Workers | Main agent (Opus 5.5) plans, reviews, gates and releases. Two Sonnet subagents (effort high) work in parallel: **A** backend, **B** web |

## 1. What the main agent found, and how that scopes this wave

- Hosted Plan runs produce 1 to 3 alternatives in `create_design` (`agent_workflow.py:3501-3622`). They end with
  "Choose an alternative or request a change" (`:3609`). The run asks mid-way only for a conflicting or ambiguous
  alternative count (`:3412-3421`). Those are real blocking questions, so they stay (RV-b).
- The planner only emits **validated** candidates. On today's generated plans the V1 findings are almost always
  `pass`; the live Dental clinic plan is `pass`. A check-and-fix loop has nothing to fix until rules exist that
  generated plans can fail: R1′ NBC rules, advisory rules and brief target areas. Building the Hill Climb loop
  now would be code that never runs.
- Runs are bounded at 5 model calls and 6 tool calls (`budget.py:10`), and compaction already exists
  (`agent_compaction.py`). Panda-style step limits, an 85% gate and loop detection (H6) only matter once runs get
  longer. **H6 moves to land with the full AG1 loop** (after R1′a), where it is needed.

So Wave 2 delivers the visible part now, and the full loop follows when it has something to fix:

- **V2:** architects see every check on the plan in plain language, and can "Show" each one in 2D/3D.
- **AG1a:** the agent ranks its own alternatives by their checks and recommends one, recording why as an
  assumption. The review stays one step: the existing review card, now with checks and a recommendation.

## 2. Scope

### A — backend (`apps/domain-api`)

- In `create_design`, call `plan_artifacts.ensure(owner, graph, brief=brief)` with the brief that is in scope, so
  the brief rules run from the start.
- Each candidate gains `checks: {status, blocking, advisory, codes}` from its artifact `findings`, or `null` if the
  findings are unavailable.
- `result['recommended'] = {planId, version, reason}` is the best candidate by: `pass` before `warn` before
  `fail`, then fewest blocking, then fewest advisory, then the original order (the planner's own score). With one
  candidate, it is that one. Candidate order and `previewSvg` stay unchanged, because other code reads
  `candidates[0]`.
- One plain-language assumption is added. For example: "Recommended alternative 2: it has the fewest check
  problems (all checks pass)." If every candidate fails, it says so and names the blocking problem count; nothing
  is hidden.
- The answer sentence names the recommendation and its check status, and keeps "Revit has not been modified".
- The public run projection carries `checks` and `recommended`. Confirm what the web reads (for example
  `agent_design`) and that the strict models and whitelists allow the new fields.
- Tests: the ranking order, ties, no findings, every candidate failing, the brief passed to `ensure`, and the
  projection fields.
- README and `lat.md` updated.

### B — web (`datumm-web`)

- New `src/lib/plan-checks.mjs` + `.d.mts` (pure):
  - parse and validate `datumm.findings.v1`; unknown shapes are rejected safely;
  - group findings by category in the order Geometry, Brief, Circulation, Openings, Code;
  - a status label, using plain words;
  - `refsToHighlights(finding)`;
  - tests in `tests/plan-checks.test.mjs`.
- New `ChecksReport` component, built from `src/components/ui` and `vendor/affectui` in the DATUMM theme:
  - The header shows the status (pass / needs attention / problems), the counts, and the rule set in small text.
  - Rows are grouped by category. Each row shows a severity icon with a text label (not colour alone), the
    message, and expected vs actual.
  - A disclosure holds "Why" and "How to fix".
  - A **Show** button highlights the finding's rooms, walls and openings in the plan (2D and 3D both use the
    existing `highlights`) and switches to the drawing if needed.
  - Empty state: "No problems found by the plan checks."
  - When findings are unavailable (`null`): "Checks are not available for this version yet", plus Retry.
- Place it where the current plan version's drawing is shown in the Design area, as a "Checks" section or tab
  beside Properties. Follow the existing layout; no new permanent column (D17). Data comes from the plan-version
  response the web already fetches (`variable/plans/<id>/versions/<v>` now returns `findings`).
- The alternatives review card shows each alternative's check status and a "Recommended" badge from the run's
  `recommended`, with its reason as the tooltip or subtitle. The selection behaviour does not change.
- Keyboard and screen readers: the buttons are reachable, Show announces what it highlighted, and states are not
  conveyed by colour alone.

Out of scope: dispositions (accept or waive with a reason; deferred to the review phase), H6, the full fix loop,
and auto-selection writes.

## 3. Gates

- **A:** `uv run --frozen pytest -q`, `lat check`.
- **B:** typecheck, `npm test`, build, `lat check`.
- **Localhost browser (main agent):**
  - The Checks section renders for a `pass` plan.
  - A fixture or dev route with failing findings shows grouped rows, and Show highlights in 2D and 3D.
  - The review card shows the badges.
- **Live:** backend release (rehearsal, quiet check, backup, switch); web deploy and smoke checks; on the live
  Dental clinic plan, Checks shows "No problems found", and the API carries `checks` and `recommended` on new runs.

## 4. Rollback

Revert the commits. The new fields are additive.

## 5. Result

(Filled in by the main agent.)
