# Phase packet — Wave 6c: Revit checks on the web, step 1 (V3a)

| Field | Value |
| --- | --- |
| Status | approved 19 Nov 2026 (user: "cont with revit check after this", "use the revit for live tests in parallel"; scope "Two steps") |
| Plans | [master planner](master-planner-2026-11-17.md) V3; [desktop deep-dive](desktop-deep-dive-2026-11-17.md) :164–169, G2, G9, rank 2 |
| Repos | `datumm-orchestrator/apps/domain-api` and `datumm-web`. **The Revit add-in is not changed in V3a.** |
| Workers | Two Sonnet subagents (effort high), in parallel against the contract below. **A** works on the backend only, **B** on the web only. The main agent reviews, runs gates, and tests live against the architect's Revit. |

## 1. Today (checked 19 Nov)

- **Add-in read tools:** the add-in allows 15 tools (`ReadDispatcher.cs:42`). Among them, `show_model_elements` selects or shows elements and returns `modelChanged:false`; it needs the exact `documentId` and revision (`NativeExtensions.cs:202`). `get_plan_image` returns a floor-plan PNG (`ModelInspection.cs:250`).
- **Missing from the add-in:** `get_model_warnings`, `get_room_boundaries` and `get_view_image`. They are **V3b** (add-in build plus reinstall).
- **Hosted allowlists:** `READ_TOOLS` (`relay.py:4`) lacks `show_model_elements`. The web device tools route `/v1/devices/{id}/tools` allows only `READ_TOOLS` (`main.py:528`).
- **Web today:** shows device online state, the Revit context chip, and polls `devices/{id}/context` every 10 s (`use-workspace-state.ts:649`). There is no model health, plan image or Show-in-Revit UI.

## 2. Contract

### A — backend

1. **Show in Revit.** Add `show_model_elements` to `relay.READ_TOOLS`: it changes only the selection or view, never the model.
   - It is **not** given to the agent; it is user-triggered from the web only.
   - Its arguments are validated on the device tools route: the exact `documentId` and `revision` from the current device context, plus 1 to 50 element ids (integers or the add-in's id strings, matched to what the add-in accepts).
   - A mismatched or stale revision is refused (409) before it reaches the relay.
   - `test_hosted_write_paths` stays green, and the write set is unchanged.
2. **Model health, from existing reads only.** New `model_health.py` and route `GET /v1/devices/{id}/health` (owner-scoped; 409 when no document is open; 503 when the device is offline).
   - It uses bounded, paged reads of tools already allowed (`get_document_context`, `get_model_inventory`, `get_model_elements`, `get_model_views`: check what each returns in the add-in and connector).
   - The response is `{"schema":"datumm.model-health.v1","documentId","revision","title","coverage":"complete|partial","counts":{rooms,levels,views,…},"checks":[{"code","severity":"warn|info","message","count","elementIds":[≤50]}],"limitations":["…"]}`.
   - **Checks:** rooms that are unplaced or have zero area; rooms with no name; duplicate room numbers; levels with no rooms (info); and whatever else those reads honestly support.
   - Every message is plain text written by the server.
   - `limitations` always says that Revit warnings and room boundaries need the add-in update (V3b).
   - Never more than 5 relay pages per read. The result is computed on request and not stored.
3. **Plan image** stays the existing `get_plan_image` through the device tools route, with no change.
4. **Capability:** `revitChecks`, true when the relay supports these reads.
5. **Tests** use a fake relay: each health check, the paging cap, partial coverage, no document, offline, another owner, show-elements validation (stale revision, too many ids, wrong document), and that the write set is unchanged.

### B — web

1. **Revit check panel**, in the Details drawer as a new tab "Revit", behind `revitChecks` and shown only when a device is online with an open document.
   - **Model health:** a "Check the model" button calls `devices/{id}/health`. The results are grouped Problems (warn) and Notes (info), each with its count and a "Show in Revit" button.
     - The button calls `devices/{id}/tools` with `show_model_elements`, the exact `documentId` and revision from the health result, and the element ids. It reports "Shown in Revit" or the refusal in plain words.
     - The coverage line and the limitations are shown, so warnings and room boundaries clearly say "needs the DATUMM add-in update".
   - **"Validate in Revit":** pick a floor-plan view from `get_model_views` (existing read), then fetch `get_plan_image` and show it. It is labelled with the view name, scale and revision. When a DATUMM plan is selected, it appears side by side with that plan's drawing.
   - The plan-to-model overlay gate is V3b, because it needs room boundaries.
2. **Proxy:** the allowlist accepts `devices/<id>/health` (GET). The `devices/<id>/tools` route is already allowed.
3. **Pure logic** goes in `src/lib/model-health.mjs` (+ `.d.mts` + test): parse `datumm.model-health.v1` strictly, group the checks, and build the show-elements request.
4. **Dev fixture:** `/dev/ux` with a health result, a partial-coverage result, a plan image, a stale-revision refusal, and offline.

## 3. Out of scope (V3b)

- `get_model_warnings`, `get_room_boundaries`, the warnings delta, the plan-to-model overlay gate.
- Any add-in or connector change.
- Any Revit write.

## 4. Safety

- `show_model_elements` changes only the Revit selection or view (`modelChanged:false`). It is bound to the exact document and revision, and user-triggered only.
- No write tool is added. Native approval is untouched.

## 5. Gates and checks

- **Backend:** pytest, `lat check`, all 9 packaged image checks.
- **Web:** typecheck, `npm test`, build, `lat check`.
- **Live with the architect's Revit connected:**
  - check the model and read the results;
  - press "Show in Revit" on one result, and the architect confirms the selection in Revit;
  - use "Validate in Revit" to see a floor-plan image;
  - no console errors;
  - confirm no model change in Revit (undo history unchanged).

## 6. Rollback

Revert the commits.

## 7. Result

To fill in at checkpoint.
