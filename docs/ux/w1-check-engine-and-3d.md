# Phase packet — Wave 1: check engine (V1, V1-O) and 3D view fixes (VW1)

| Field | Value |
| --- | --- |
| Status | approved 17 Nov 2026 (user: "Start Wave 1"; the master planner and revision plan were approved with their recommended options) |
| Plans | [master planner](master-planner-2026-11-17.md) Wave 1; [revision plan](revision-agent-plan-2026-11-17.md) V1; [starred repos](starred-repos-review-2026-11-17.md) (archlang catalog, mutinybim dispositions, SolidCraft-style oracle); [viewer engines](plan-viewer-engines-2026-11-17.md) §1 |
| Repos | `datumm-orchestrator` (`apps/planner`, `apps/domain-api`), `datumm-web` |
| Workers | Main agent (Opus 5.5) plans, reviews, runs gates and releases. Three Sonnet subagents (effort high) work in parallel on disjoint files: **A1** planner, **A2** domain-api, **B** web 3D |

## 1. Why

Today `validatePlanGraph` (`apps/planner/revit-mcp/src/plan-graph.ts:105-171`) stops at the first failed check
(`check()` at `:40`), so a person sees one error, never a report. V1 collects every finding in a fixed format.
That format is the contract for V2 (the checks report), AG1 (check and fix), R1′ (NBC rules), M1 and EV1.

## 2. The finding contract (`datumm.findings.v1`)

```json
{
  "schema": "datumm.findings.v1",
  "ruleSet": "plan-rules@1",
  "status": "pass | warn | fail",
  "summary": {"blocking": 0, "advisory": 0},
  "findings": [{
    "code": "circulation.clear-width",
    "category": "geometry | brief | circulation | openings | code",
    "severity": "blocking | advisory",
    "message": "Plain sentence for an architect",
    "why": "Why the rule exists",
    "fix": "What usually fixes it",
    "expected": "at least 1200 mm",
    "actual": "1100 mm",
    "refs": {"rooms": [], "walls": [], "openings": []},
    "ruleVersion": 1
  }]
}
```

- `status`: `fail` if any finding is blocking; `warn` if there are only advisory findings; `pass` if there are none.
- Codes are stable and kebab-case under a category prefix. Each code has one catalog entry: category, severity,
  why, fix, and an example (archlang shape). Messages use plain language, with no ids.
- Dispositions (accepted, waived or deferred, each with a reason, tied to `ruleVersion`) are reserved for V2. They
  are not stored in V1.

## 3. Scope

### A1 — planner (`apps/planner/revit-mcp/src`)

- New `finding-catalog.ts`: one entry per rule code.
- New `plan-findings.ts`: `inspectPlanGraph(input, brief?) → findings.v1`.
  - It runs **every** check in today's `validatePlanGraph` for schema versions 1 to 4 and collects them. Examples:
    exterior faces vs site, room bounds and area, adjacency, overlap, tiling, walls vs edges, wall kinds, clear
    area, circulation width, opening rules, entrance, reachability, program bound, and the `checkV3` rules.
  - Versions 5, 6 and 7 call their existing validators; a thrown error becomes one blocking `graph.integrity`
    finding (known limit, recorded).
  - Brief rules apply only when a brief is supplied and states a target: a required room kind missing (blocking);
    room area outside ±10% of a stated target (advisory).
- `validatePlanGraph` becomes "run the checks and throw the **first blocking** message, unchanged". All existing
  error messages and the throw order stay byte-identical. The non-check work (schema compile, bounds, hostOpenings
  return) is kept.
- `variable-cli.ts` gets a new operation: `{"operation":"inspect","graph":…,"brief"?:…}` returns `{ok:true,result:findings.v1}`.
  It never fails because a rule fails. Bad input returns `ok:false` as today.
- **V1-O golden plans**: `apps/planner/fixtures/golden/*.json`. Each file holds a graph, an optional brief, and the
  expected finding codes, computed by hand and explained in a `note`. Cover at least: a clean plan (`pass`),
  narrow circulation, an unreachable room, overlapping rooms, an opening too close to an end, a missing entrance,
  and a brief area outside the band.
  `apps/planner/check-findings.mjs` (run after `npm run build`) asserts the exact codes and the status for each.
  `check-variable-cli.mjs` adds the `inspect` operation.
- Update `apps/planner/README.md`.

### A2 — domain-api (`apps/domain-api`)

- `variable_engine.py`: `async def inspect(graph, brief=None) -> dict` (same subprocess path and limits as
  `validate`).
- `plan_artifacts.py`: artifact rows gain `findings`, computed once per immutable version. An old row without
  findings, or with another `ruleSet`, is filled lazily with `$set`. `RENDERER` and the ref hash stay unchanged,
  and the svg integrity check stays as is. If the engine fails, findings are `null`, logged, and never block the
  drawing.
- `variable_api.py` `plan_version` also returns `findings`. The proxy allow-list already covers this path.
- Tests with a mocked engine: findings returned; lazy fill of old rows; engine failure gives `null` without a 503;
  integrity unchanged.
- Update the README code map and add a `lat.md` section on the finding contract.

### B — web 3D (`datumm-web/src/components/plan-three.tsx` and new small modules)

- **Correct shapes:** rooms with `boundary` polygons render as polygons, not rectangles, and arc walls (`curve.kind
  === 'arc'`) render as arcs. Port the behaviour of the desktop's `apps/web/src/components/plan-three.tsx`
  (`origin/main`, read with `git show`; never touch the clone's working tree), rebuilt to our code standards.
- **Wall and opening selection:** `onSelect` reports `{kind:'room'|'wall'|'opening', key}`. Room selection stays
  backward compatible for existing callers.
- **Outline highlight:** highlighted rooms, walls or openings get an outline (edges) in addition to today's colour
  blend, ready for V2's "Show".
- **No full rebuild:** selection or highlight changes repaint; only a graph fingerprint change rebuilds the scene.
- Pure geometry goes in `src/lib/plan-3d-geometry.mjs` + `.d.mts`, with `tests/plan-3d-geometry.test.mjs`.

Out of scope: the checks report UI (V2), dispositions, curved and multi-storey generation on hosted (T-g), and
new dependencies (`@flatten-js/core` is not added; arcs are done with our own maths).

## 4. Risks

- **A1 changes the hard validator.** Mitigation: messages and order stay the same, and the golden plans plus
  `check-variable-cli.mjs` cover it. A regression would block generation, which the rehearsal and live checks
  would show.
- **A2 adds one more subprocess call per plan version.** It runs once per immutable version and is cached.
- **B rewrites a 216-line component.** Keep the public props, and test the pure geometry.

## 5. Gates

- **A1:** `cd apps/planner && npm run build && node check-variable-cli.mjs && node check-findings.mjs`.
- **A2 and backend:** `cd apps/domain-api && uv run --frozen pytest -q`; `lat check`.
- **B:** typecheck, `npm test`, build, `lat check`.
- **Browser on localhost (main agent):** open a chat with a plan; 3D shows the plan; select a room and a wall;
  highlights show outlines. `GET variable/plans/<id>/versions/1` returns `findings` with `status`.
- **Live:** backend release (the rehearsal must show plan versions still served); web deploy and smoke checks;
  the same scenarios on datumm-web.vercel.app with a real plan, and the findings JSON on a real plan version.

## 6. Rollback

Revert the commits. The new `findings` field on artifact rows is ignored by old code.

## 7. Result

(Filled in by the main agent.)
