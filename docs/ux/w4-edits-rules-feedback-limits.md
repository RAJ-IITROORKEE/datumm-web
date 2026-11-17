# Phase packet — Wave 4: targeted plan edits (M1), NBC rule table (R1′a), feedback page (A5), daily limits (U2)

| Field | Value |
| --- | --- |
| Status | approved 18 Nov 2026 (user: "Start Wave 4"; master planner Wave 4) |
| Plans | [master planner](master-planner-2026-11-17.md) Wave 4; [revision plan](revision-agent-plan-2026-11-17.md) M1, R1′; [starred repos](starred-repos-review-2026-11-17.md) (archlang lock / no unintended change; debim rule table; pascal `achievedChanges`); [Panda parity](panda-parity-plan-2026-11-17.md) #7, #18, #20 |
| Workers | Main agent (Opus 5.5) plans, reviews, gates, browser and release. Sonnet subagents (effort high) on disjoint files. Round 1: **M1-api**, **R1**, **A5**, **M1-web** (against the contract below). Round 2: **U2**, after A5, because both touch admin. |

## 1. What already exists (checked in source)

- The planner already has exact, validated edit functions, used today only by the desktop
  (`apps/planner/revit-mcp/src/program-revision.ts`):
  - `exchangeProgramRegions` (`:55`): swap two rooms;
  - `describeProgramWallMove` / `moveProgramWall` (`:134`, `:152`): signed millimetre move of a shared interior wall chain. This is how a room is resized;
  - `editProgramOpening` (`:186`): add, update or delete a door or window.

  Each keeps unaffected geometry and refuses unsupported cases. The hosted CLI (`variable-cli.ts`) exposes only
  generate, validate, render, bind and inspect.
- Plan versions are immutable, with exact identity: plan id, version and fingerprint (`plan_versions.py`). Plan
  artifacts compute `findings` (V1). The web has a diff route (`variable/diff`) and the Review screen (W3).
- Answer feedback is stored (A1, `test_feedback.py`), and admin has traces. There is no feedback review page and no
  per-user daily limit.

## 2. Scope

### M1-api — hosted targeted edits (`apps/planner` CLI + `apps/domain-api`)

- `variable-cli.ts` gains an `edit` operation:
  `{operation:'edit', graph, brief?, edit:{kind:'swap'|'move-wall'|'rename'|'opening', ...}}`. It calls the
  existing functions, plus a new small `renameRoom` that changes only the name and validates. It returns
  `{graph, changes}`.
  - `changes` is a pure `achievedChanges(before, after)`: rooms whose rect, boundary, name or area changed,
    walls moved, and openings changed, all computed from geometry, never claimed.
- New route `POST /v1/variable/plans/{planId}/versions/{version}/edits`. The body is
  `{fingerprint, edit, expectedTaskVersion?}`.
  - It refuses with 409 if the fingerprint is not the current saved one, and is owner-scoped.
  - It creates the next version through `plan_versions.revise` and computes findings.
  - It adds the **no-unintended-change** rule:
    - Expected changes depend on the edit: a swap changes the two rooms; a wall move changes the rooms adjoining
      the moved chain (from `describeProgramWallMove`); a rename changes the room's name only; an opening edit
      changes that opening.
    - Anything else changed gives a blocking finding `edit.unintended-change` (an archlang-style lock), and the
      version is **not** published.
  - It returns `{planId, version, fingerprint, changes, findings}`.
- The route is flag-gated on the capability `planEditing` (default on). It is never a Revit write: native
  acceptance and approval stay separate.
- Tests: each kind, a stale fingerprint, an unintended change refused, and a refused edit leaving the saved plan
  unchanged. The web proxy allow-list gets the new path.

### M1-web — edit actions in Design (`datumm-web`)

- In Properties, when a room is selected:
  - Rename (inline);
  - **Swap with…** (pick another room);
  - **Resize**: choose an adjoining interior wall and a signed mm distance, previewed as "moves the wall between
    X and Y by N mm".
- When a wall is selected: Move by N mm. When an opening is selected: edit its width, offset or kind, or delete
  it.
- Each edit calls the route with the exact identity. While it runs, the controls are disabled and duplicate
  clicks blocked.
- On success: the new version shows, a toast says "Saved as Version N · X rooms changed · checks: pass/warn/fail",
  and Review shows before/after.
- On a refusal, a plain message appears and the current plan stays.
- Undo is "Go back to Version N-1" through the existing version history. No destructive undo.
- Pure request building and validation go in `src/lib/plan-edits.mjs`, with tests.

### R1 — NBC rule table (`apps/planner`)

- `apps/planner/rules/nbc-2016.json`: rows of
  `{id, clause, edition:'NBC 2016', description, appliesTo:[room kinds], metric:'clearAreaM2'|'clearWidthMm'|'doorWidthMm', min, unit, verified:false, source}`.
  - Start with residential habitable rooms, kitchen, bath, WC, combined bath+WC, and the main and internal door
    widths.
  - Every value is entered with its clause reference **as stated in NBC 2016 Part 3**. If the implementer cannot
    confirm a value from an authoritative text, it stays `verified:false`.
- `plan-findings.ts` evaluates the table into category `code`. **Unverified rules are advisory only**; verified
  rules are blocking. Each finding carries `clause` and `edition`. The rule set becomes `plan-rules@2`, and
  `plan_artifacts.RULE_SET` matches it, so old rows refill.
- The goldens are updated and new ones added. The coverage guard includes the code rules.

### A5 — admin feedback page (`domain-api` admin read route + `datumm-web` admin)

- `GET /v1/admin/feedback`: a paginated list of answer feedback (vote, reason, created time, model, task title).
  It is text-light, with the owner hashed as in traces, and admin-only.
- The web admin gets a Feedback section: thumbs-down first, a filter by reason, and **Copy as eval case**, which
  copies a JSON case (prompt, answer excerpt, expected, reason) to the clipboard. Nothing is sent anywhere.

### U2 — per-user daily limits (round 2)

- Admin config gains `limits.daily: {runs:int, modelCalls:int}` per user, applied on run creation:
  a 429 with a plain message.
- `GET /v1/me/usage/today` returns `{used, limit, left}`. The composer shows "N left today" when a limit exists.
- Optional per-model `visible` already exists in the registry; it is confirmed and exposed.
- Tests and an admin UI field.

## 3. Gates

- Backend: planner `npm run build`, `check-variable-cli`, `check-findings`; domain-api `pytest`; `lat check`.
- Web: typecheck, `npm test`, build, `lat check`.
- Browser on localhost, which reads the live backend after release; for edits before release, use a dev fixture or
  local backend:
  - rename, swap and move-wall create the next version, and Review shows the changes;
  - Checks shows NBC advisory items with their clause;
  - admin Feedback lists entries, and Copy works.
- Live: the backend release (rehearsal must still serve plan versions and refill findings), then the web deploy
  and smoke checks. Edits are verified on a **test chat** created for this purpose, never on the user's existing
  chats.

## 4. Rollback

Revert the commits. New plan versions created by edits stay as normal immutable versions.

## 5. Result

(Filled in by the main agent.)
