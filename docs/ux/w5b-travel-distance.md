# Phase packet — Wave 5b: route-based travel distance (R1′b)

| Field | Value |
| --- | --- |
| Status | approved 18 Nov 2026 (user: "R1′b first") |
| Plans | [revision plan](revision-agent-plan-2026-11-17.md) R1′; [starred repos](starred-repos-review-2026-11-17.md) #4: `ibuilder/massing` (MIT) `egress_route.py` measures travel distance along the walking route on a raster, with a multi-source shortest-path search from the exits, and reports the grid cell size it used |
| Repo | `datumm-orchestrator/apps/planner` (+ one `RULE_SET` line in `apps/domain-api/plan_artifacts.py`) |
| Worker | One Sonnet subagent (effort high); the main agent reviews, runs gates and releases |

## Scope

- A new `revit-mcp/src/travel-distance.ts`, pure and deterministic:
  - Rasterise the plan footprint at a fixed cell size, about 100 mm; record the cell size.
  - Walls are obstacles at their real thickness. Door openings are gaps. Windows are not passable.
  - Run a multi-source Dijkstra over 8 neighbours (diagonal cost √2) from every cell just inside the exterior
    door openings. The `entry` door is the main exit, and any other exterior door counts too.
  - For each room, the result is the farthest reachable cell's walking distance in mm, and the room is flagged
    unreachable if no cell is reached.
  - A straight-line value is kept for comparison, so the report can show route versus line.
  - The licence note in the file header credits `ibuilder/massing` (MIT) for the method if any code is ported; if
    only the idea is used, it says so.
- **Rule row** in `rules/nbc-2016.json`: `{id:'nbc-travel-distance', metric:'travelDistanceMm', max:<value>, appliesTo:[all habitable and service rooms], verified:false, clause:'Part 4 (clause to confirm)'}`. Use a commonly cited residential maximum, and say in `source` that it needs a check. The finding is advisory while unverified.
- **Finding** `code.max-travel-distance`. The plain message reads, for example: "The walk from the far corner of Bedroom 2 to the exit is longer than NBC 2016 suggests". Expected is "at most N m"; actual is "M m along the route (straight line L m)". Refs name the room and the exit door.
- Rule set `plan-rules@3`, and `plan_artifacts.RULE_SET` matches it.
- **Goldens:**
  - one clean plan, showing the route distance well under the limit;
  - one long plan over the limit, from a stretched corridor or a narrow site;
  - one where the route is much longer than the straight line, because a wall forces a detour.

  All are hand-derived (route length by hand to ±1 cell), with the coverage guard updated.
- **Performance:** a 30 × 20 m plan at 100 mm is 60,000 cells; this must run well under 1 s in `inspect`. Coarsen
  automatically for larger plans and report the cell size used.
- Rectangular plans only (schema versions 1 to 4), like the other code rules.

## Gates

Planner `npm run build`, `check-variable-cli`, `check-findings`, the four planner scripts; domain-api pytest; all 9
packaged image checks; `lat check`. Live: after release, a plan version's findings show `plan-rules@3`, and the
Checks tab shows the travel-distance result (advisory) on a real plan if one applies, or nothing if within the
limit.

## Result

| Item | Outcome |
| --- | --- |
| Build | Backend `82d464d`. `travel-distance.ts` uses 100 mm cells (coarsened for big plans, cell size reported), walls as obstacles, door gaps, windows closed, and a multi-source 8-neighbour Dijkstra from exterior doors. It reports route and straight line from the same spot. Rule row `nbc-travel-distance` is 22.5 m, Part 4, clause to confirm, unverified, so findings are advisory. The method idea is credited to ibuilder/massing (MIT); no code was ported. |
| Goldens | Three hand-derived plans (clean; over limit at 31.5 m; a detour where the route is 4.5 times the straight line) matched the engine to the millimetre. No existing golden changed (worst route about 18.1 m). 51 goldens cover 47 of 48 codes. A 30 × 20 m plan inspects in about 21 ms. |
| Gates | Planner build, CLI check, `check-findings`, the 4 planner scripts; pytest 903 + 26 subtests; all 9 packaged image checks; `lat check`. |
| Live, 18 Nov | **Backend `82d464d` live at 14:46Z.** Rehearsal: 36,412 documents before and after, 0 tracebacks. Backup `20261118T144345Z`. The change set touched only Service and Task. The Dental clinic plan findings refilled to `plan-rules@3`, with no travel finding (routes well under 22.5 m), as expected. |
| To verify by a person | The 22.5 m value and its Part 4 clause, against the NBC 2016 text. |
