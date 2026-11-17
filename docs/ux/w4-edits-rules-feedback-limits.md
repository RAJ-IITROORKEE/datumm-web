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

| Item | Outcome |
| --- | --- |
| M1-api | Backend `5fe8387`. `plan-edits.ts` (`renameRoom`, `achievedChanges`, `editPlan`) behind the CLI `edit` operation; `plan_edits.py` route. Fingerprint mismatch gives 409; anything outside `expected` gives 422 `edit.unintended-change` and nothing is published. Owner-scoped, gated by `planEditing`, no Revit calls. 33 tests plus the real CLI chain. |
| R1′a | Backend `5fe8387`. `rules/nbc-2016.json` has 13 rows, **all unverified** ("Part 3 (clause to confirm)"; the official BIS text could not be reached). Code findings are advisory unless a row is verified. `plan-rules@2`. The file is packaged into the image (Dockerfile, dockerignore, make-source). 48 goldens cover 46 of 47 codes, and an independent script agreed on all of them. |
| A5 | Backend `5fe8387`, web `50d20bb`. `/v1/admin/feedback` (text-free, owner hashed) and `/case` (eval case from stored data only, answer included only when its hash matches). Web Feedback section with Copy as eval case. |
| U2 | Backend `db30ae7`, web `50d20bb`. `dailyLimits {runs, modelCalls}`, null by default, so nothing is enforced until an admin sets it. A plain 429 resets at 00:00 UTC; admins are exempt; `GET /v1/me/usage/today`; the composer shows "N left today". There is no per-model visible flag: hiding a model means removing it from the config list (documented). |
| M1-web | Web `50d20bb`, plus fixes `291f030` and the lineage binding. The Properties panel offers rename, swap, resize/move wall and opening edit/delete, with a toast and a read-only "Back to Version N-1". |
| Bugs found in the live test and fixed | (1) The edited version could not be bound for acceptance, because the web only knew the original alternatives; it is now bound through its lineage. (2) `beginDrawingReview` dropped Review's before/after and Accept for an edited version; it now also trusts the exact current plan. The server still checks current, latest and exact fingerprint. |
| Gates | Backend: planner build, `check-variable-cli`, `check-findings`, 4 planner scripts, pytest 853 + 26 subtests, `lat check`. Web: typecheck, 948/948, build, `lat check`. |
| Live, 18 Nov | **Backend `db30ae7` live.** Image `g1-backend-w4-db30ae7e3ef8-65`. Rehearsal: 36,139 documents before and after, 0 tracebacks. Backup `20261117T191312Z`. The change set touched only Service and Task. Web `291f030` deployed and smoke passed. The Dental clinic plan's findings refilled to `plan-rules@2` (one advisory `code.min-door-width`, clause to confirm), and the capabilities `planEditing`, `dailyLimits` and `feedback` are on. **A new test chat** ("Test chat for plan edits") went through the whole flow: the recommendation shows on a real run; rename gave Version 2; a 300 mm wall move gave Version 3 (2 rooms, 5 walls); Review showed Before v2 / After v3; then **Plan accepted · Version 3**, with 0 API errors. |
| Gaps seen | The agent still asked one non-blocking question (bathroom count) despite "use your defaults": RV-b is not enforced on hosted (AG1). Every generated plan shows the advisory main-door note, because the generator draws 900 mm doors against an unverified 1000 mm minimum. That is the user's decision. |
