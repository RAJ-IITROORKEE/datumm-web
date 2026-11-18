# Phase packet — Wave 5c: model critique (V4) and revision package (EV1)

| Field | Value |
| --- | --- |
| Status | approved 18 Nov 2026 (user: "Yes, start 5c") |
| Plans | [revision plan](revision-agent-plan-2026-11-17.md) V4 and EV1 |
| Repos | `datumm-orchestrator/apps/domain-api` and `datumm-web` |
| Workers | Two Sonnet subagents (effort high), running in parallel against the contract below. **A** owns the backend files only; **B** owns the web files only. The main agent reviews, runs the gates, tests in the browser and releases. |

## 1. What exists (checked 18 Nov)

- **Layout critic:** `specialist_jobs.py:320` already runs it as a bounded specialist that gives advice only. It has no tools, no Revit authority, and its findings are schema-checked. It is gated by `settings.layout_critic_enabled`, which defaults to False (`settings.py:26`) and is not set on hosted, so it never runs. It reviews `candidates[0]` and binds the result to that plan, version and fingerprint (`specialist_jobs.py:456`). The web shows it only inside Activity → "Recorded specialist reviews".
- **Revision data:**
  - Versions keep `parentVersion` (`plan_versions.py:10`).
  - Findings live per version in `plan_artifacts` (`plan_artifacts.py:14`).
  - A room-level diff exists (`variable_selection.py:57`).
  - Acceptance is per task (`task_controller.py:593`).
  - **An edit's `changes` are not stored.** They are returned once by `plan_edits.py:157` and then lost.
  - No route lists versions, and no package export exists.

## 2. Scope

### V4 — model critique, advice only

- **A1.** `layout_critic_enabled` defaults to **True**. Any env value still overrides it.
- **A2.** Add a role-specific instruction for `layout_critic` to the critic's system prompt (`model_findings`): review the room layout as an architect would, covering adjacency, daylight and outlook, circulation, privacy, and proportion. Use plain words, at most 6 findings, and never repeat a measured check or claim code compliance. The output schema does not change.
- **B1.** The Checks tab gains a separate section, "Design review", below the rule groups. It is labelled "Advice from a model review. It never changes the check result." It shows the critic findings only when the result's `binding.planId`/`planVersion`/`fingerprint` match the plan version on screen. Severities read "Concern", "Note" (for info) and "Not sure" (for unknown). The pass/warn/fail header and counts ignore these findings. If the critic's status is `partial`/`failed`, the section says "The design review was not available for this plan." If there is no critic result, nothing is shown.
- **B2.** The web `SpecialistResult` type gains `binding`.

### EV1 — revision package

- **A3.** `plan_versions.revise` stores an optional `edit` record on the new version entry, `{changes}`, where `changes` is the `_changes_shape` object (`{rooms:[{key,fields}],walls:[key],openings:[key]}`). `plan_edits.py` passes it. Older versions have no record.
- **A4.** A new route `GET /v1/variable/plans/{planId}/versions/{n}/package`, owner-scoped and gated like the version route. It returns:

  ```json
  {"schema":"datumm.revision-package.v1","planId":"…","version":3,
   "versions":[{"version":1,"parentVersion":null,"fingerprint":"…","createdAt":"ISO",
     "findings":{"schema":"datumm.findings.v1", "…":"same as the version route"},
     "assumptions":["…"],"edit":null,"diff":null},
    {"version":2,"parentVersion":1,"…":"…","edit":{"changes":{"…":"…"}},
     "diff":{"…":"variable_selection diff output against its parent"}}]}
  ```

  - The lineage is followed through `parentVersion` from `n` back to the root, then listed in ascending order, at most 50 versions.
  - `findings` uses the same `plan_artifacts.ensure(..., brief=…)` path as the version route.
  - `diff` is `null` for the root.
  - The response has no SVG; the web fetches the first and last drawings through the existing version route.
  - Unknown plan or version: 404. Another owner's plan: 404.
- **B3.** The web proxy allowlist accepts `variable/plans/<id>/versions/<n>/package`.
- **B4.** `src/lib/revision-package.mjs` (+ `.d.mts` + test):
  - It validates the package as untrusted data and rejects unknown shapes.
  - It builds plain change-log lines per version: "Version 2: Bedroom 2 resized; 1 door changed".
    - Room names come from that version's graph, if supplied.
    - It uses `edit.changes`, falls back to `diff`, and otherwise says "Version 2: changes not recorded".
  - It summarises each version's checks: status, problems and advice notes.
- **B5.** A printable "Revision package" page that opens in a new tab from the Review screen.
  - It shows:
    - the title and the plan version;
    - "As first generated" (the root) next to "This version", using the existing stored SVGs as `<img>` data URLs, as Review does;
    - the change log;
    - the checks for the root and the current version;
    - the assumptions;
    - whether this version is the accepted one (from the run's acceptance, if the page has it; otherwise left out).
  - It has a "Print or save as PDF" button (`window.print`, print CSS hides the controls) and a "Download data (JSON)" link.
  - It uses only existing UI primitives and no new dependency. Signed-out users get the normal sign-in.

## 3. Out of scope

- The critic changing pass/fail, auto-fixing, or reviewing more than `candidates[0]`.
- Server-side PDF rendering.
- Persisting edit operations beyond `changes`.
- A per-version acceptance history.

## 4. Risks

- **Cost:** the critic adds one model call per design run (bounded: 1,600 output tokens, 45 s, inside the run's budget and daily limits). Off switch: the env var `LAYOUT_CRITIC_ENABLED=false`, which needs a stack parameter change, or a revert.
- **Wrong advice:** the critic can be wrong. It is labelled as advice, kept apart from the checks, and never changes the result.

## 5. Gates and checks

- **Backend:** pytest, `lat check`, all 9 packaged image checks, and the planner checks unchanged.
- **Web:** typecheck, `npm test`, build, `lat check`.
- **Live**, after release, in a **new test chat**:
  - a design run shows the "Design review" section in Checks;
  - edit a version, then open the Revision package: the change log names the edit, the before and after drawings show, and print preview works;
  - no console errors.

## 6. Rollback

Revert the commits. The critic can also be turned off with `LAYOUT_CRITIC_ENABLED=false`.

## 7. Result

| Item | Outcome |
| --- | --- |
| Build | Backend `8bcd5e3`: the critic is on by default with layout guidance and at most 6 findings; edits store `edit.changes`; the package route was added. Web `9c547f8`: the Design review section in Checks (`layout-critique.mjs`), the `/revision-package` page (`revision-package.mjs`, page and view, print CSS), the Review link, the proxy route, and dev fixtures. |
| Gates | Backend: pytest 910 + 26 subtests; all 9 packaged image checks; `lat check`. Web: typecheck, 973/973 tests, build, `lat check`. |
| Live, 19 Nov | **Backend `8bcd5e3` live 18:22Z, 18 Nov.** Rehearsal: 36,536 documents before and after, 0 tracebacks. Backup `20261118T182039Z`. The change set touched only Service and Task. Web `9c547f8` deployed and passed smoke. In a new test chat ("Test chat 5c v2", 12 × 9 m, "use your defaults"), version 1's Checks showed the Design review with 6 notes, kept apart from the result. Moving the Bedroom 1 wall by 300 mm made version 2. On localhost and on the live site, its Revision package showed both drawings, "Version 2: Bedroom 1 resized; Living Dining resized; 5 walls adjusted", the checks for both versions, the assumptions, and "not accepted". There were no console errors on live. |
| Found | (1) The critic's notes appear only on the version it reviewed (version 1), not on edited versions, as scoped. (2) The critic sometimes labels a positive observation as "Concern" (daylight). (3) The package lists only the plan's own assumptions, not the run's, such as "1 bathroom assumed"; the Review screen shows both. (4) A first test chat with a 9 × 12 m parcel asked three blocking questions, then found no plan for a 7.5 × 10.5 m footprint. This is existing planner behaviour and not part of this wave. |
| Not verified | The print dialog itself (only the fixture's print button was seen); the signed-out sign-in on the package page. |
