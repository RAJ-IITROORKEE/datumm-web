# Phase packet — Wave 6d: Revit checks, step 2 (V3b, hosted and web side)

| Field | Value |
| --- | --- |
| Status | approved 19 Nov 2026. User: "Proceed"; "skip the revit actual test and record this, we will do it later"; scope "Web + backend only now". |
| Plans | [V3a packet](w6c-revit-checks-v3a.md) "Next"; [desktop deep-dive](desktop-deep-dive-2026-11-17.md) G9 and rank 2 |
| Repos | `datumm-orchestrator/apps/domain-api` and `datumm-web`. **The add-in repo `revit-datumm-plugin` is not touched.** |
| Workers | Two Sonnet subagents (effort high), in parallel against this contract. The main agent reviews, runs the gates and releases. |

## 1. Why the add-in waits

- **The add-in repo is mid-change.** It has 45 uncommitted entries, and `revit-mcp/` and `apps/connector/` are deleted from disk.
- **The installed add-in is newer than the repo.** The user's Revit loads 0.5.0-alpha.40; the repo is at alpha.28.
- **Neither new tool exists in any source.** `get_model_warnings` and `get_room_boundaries` are missing from the add-in, its MCP layer and its connector.

So the add-in work waits until the user points to the alpha.40 source. This wave builds the hosted and web side so warnings light up as soon as the add-in has the tool. Until then the web says plainly that warnings need the add-in update.

## 2. Contract

### A — backend

1. **Warnings in model health.** Add `get_model_warnings` to `relay.READ_TOOLS`; it reads only. The health route then tries it:
   - Arguments: `{sessionId, offset, limit: 100}`, at most 5 pages.
   - Expected response, as the desktop app's contract (`apps/desktop/src/main/native-warnings.ts:1-64`):
     - `{documentId, revision, total, nextOffset|null, warnings[], limitations[]}`.
     - Each warning is `{failureDefinitionId, severity, description, failingElementIds[], additionalElementIds[], elementIdsTruncated}`.
     - Paging must follow the same rules.
   - **On success**, the health JSON gains a `warnings` object:
     - It is `{coverage: complete|partial, total, items:[{key, failureDefinitionId, severity, description, elementIds[≤20]}]}`, at most 200 items.
     - `key` is a sha256 of `[failureDefinitionId, sorted failing ids, sorted additional ids]`, the desktop identity.
     - It also adds checks grouped by `description`: code `REVIT_WARNING`, severity `warn`, a count, element ids capped at 50, and the message from the server.
   - **If the add-in lacks the tool** (the first page answers `UNKNOWN_TOOL`, `METHOD_NOT_FOUND` or `UNSUPPORTED_CAPABILITY`, or the relay refuses it), `warnings` is `{coverage: "unavailable"}`. The limitation line about the add-in update stays, and the check still succeeds.
   - Documents or revisions that do not match across pages give 409, as for the other reads.
2. **Compare with the DATUMM plan.** `POST /v1/devices/{id}/compare-plan`, body `{planId, version}`, owner-scoped for both the plan and the device, and read-only.
   - It loads the plan version's rooms (name, kind, area from `rect`) and the Revit rooms (inventory: `name`, `number`, `areaM2`, `levelId`; existing reads, bounded as in health).
   - Rooms are matched by normalised name: case-folded, whitespace collapsed, a trailing number kept.
   - The response is `{"schema":"datumm.plan-model-compare.v1","documentId","revision","planId","version","matched":[{name, planAreaM2, revitAreaM2, differencePct, revitElementId}],"onlyInPlan":[name],"onlyInRevit":[{name, elementId}],"limitations":[...]}`.
   - A room counts as a mismatch when its area differs by more than 10 %.
   - The limitations line says matching is by name and area only; boundary geometry needs the add-in update.
3. **Capability** `revitChecks` stays. Add `planModelCompare` (true).
4. **Tests** (with a fake relay):
   - warnings paged across 2 pages;
   - paging rule violations giving partial or 409;
   - `UNKNOWN_TOOL` giving unavailable;
   - the sha256 key matching the desktop identity;
   - the caps;
   - compare-plan: name matching, area threshold, only-in-plan and only-in-Revit, other owner, offline, unknown plan.
   - The write set must stay unchanged.

### B — web (Revit tab)

1. **Revit warnings** section from `health.warnings`: grouped by description, with a count, and "Select in Revit" and "Zoom to them in Revit" (existing request). When `unavailable`, show one line: "Revit warnings need the DATUMM add-in update."
2. **Changes since the last check.** The panel keeps the previous health result in memory, per device and document. When a new check has the same `documentId`, both have complete warning coverage, and the revisions differ, it shows "Since the last check: N new warnings, M resolved", using the `key`s. Nothing is stored beyond the page.
3. **Compare with the DATUMM plan**, shown when a DATUMM plan is on screen. A button calls compare-plan with that plan and version, then shows:
   - the matched rooms, with the area difference flagged above 10 %;
   - rooms only in the plan;
   - rooms only in Revit, each with "Select in Revit".
4. Pure logic in `src/lib/model-health.mjs` (or a new `plan-model-compare.mjs`) with tests. Add dev fixture states for warnings, unavailable warnings, a delta, and a compare result.

## 3. Deferred (recorded in PLAN and HANDOFF)

- Add-in tools `get_model_warnings` and `get_room_boundaries` in the alpha.40 source. Then rebuild, package and reinstall (Revit closed).
- Live test on the architect's Revit: warnings, the delta after an edit in Revit, and compare-plan against a plan built in Revit.
- Plan-to-model boundary overlay, which needs `get_room_boundaries`.

## 4. Gates

- **Backend:** pytest, `lat check`, all 9 image checks.
- **Web:** typecheck, `npm test`, build, `lat check`.
- **Live, without Revit:** smoke; the Revit tab shows "need the add-in update" correctly once a device is connected.
- **Deferred:** the Revit live test.

## 5. Result

| Item | Outcome |
| --- | --- |
| Build | Backend `5f1754e`: warnings in health (desktop contract, identity keys, unavailable fallback) and `POST /v1/devices/{id}/compare-plan`. Web `fe01262`: Revit warnings section, "Since the last check", and Compare with the DATUMM plan. Dev fixture checked in the browser (delta "2 new warnings, 1 resolved"; compare flags −20 %). |
| Gates | Backend: pytest 961 + 26 subtests; all 9 image checks; `lat check`. Web: typecheck, 1024/1024, build, `lat check`. |
| Live, 19 Nov | Backend `5f1754e` live at 05:12Z (rehearsal 37,114 documents, 0 tracebacks; Service and Task only). Web `0d10531`, smoke passed. **Bug found live:** the real connector refuses an unlisted tool with the plain text "Unsupported MCP tool." (no code), so health returned 409 for the installed add-in. **Hotfix `d569fda`** (that text means unavailable; test added) went live at 05:27Z. Health on the architect's model "new2" then returned 200, 9 rooms, `warnings: {coverage: "unavailable"}`, and the add-in-update limitation. **Compare-plan** of the test plan v7 against "new2" returned 200: 2 matched by name (Bedroom 1 and Kitchen, both over 10 %), 4 only in the plan, 7 only in Revit. Correct for two different designs. |
| Deferred | Add-in tools, reinstall, live warnings, delta, boundary overlay: see HANDOFF "Now (19 Nov)". |
