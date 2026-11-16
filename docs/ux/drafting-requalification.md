# Drafting and connection requalification

14 November 2026. The user prioritized the raw HTML connection error and green Revit-ready indicator, then requested drafting and remaining tests before the next implementation phase. This checkpoint covers repairs and requalification of existing behavior. The conversation-result-polish feature slice has not started.

## Repairs and technical gates

Terra 6.1 High workers and independent review implemented safe HTTP/admission/saved-task and failed-SSE error presentation. HTML-shaped upstream failures are replaced with recovery guidance; ordinary answer/code text, specific permission/sign-in/usage errors and saved receipts remain intact. No automatic message replay or draft clearing was added. The observed HTML was an upstream service error during rollout, not proof that Revit was closed or disconnected.

The composer has a quiet semantic green dot only for the hosted path with an online selected device and one valid reported Revit session. Session observations are bound to the account/runtime/device/online generation during render. Device changes invalidate readiness immediately; delayed success or failure from A cannot affect B or a later A visit. Malformed session records remain unknown. Existing Build guards consume the same derived count. The alternate OpenCode runtime still infers its older count from devices; it receives no new green verification claim. Full Control and exact-proposal approval rules are unchanged.

The Display panel now distinguishes white-sheet measurement inclusion from local comments and source/highlight overlays, and explains that 3D captures omit local comment pins. Export behavior itself did not change.

Final frontend qualification: **482 tests passed**, optimized production build, sequential standalone TypeScript and **13 production HTTP checks** passed. Independent source review cleared the scoped fixes. Logs are `artifacts/ux/native-context-efficiency/frontend-*-qualified.log`. An earlier build incorrectly type-checked the isolated backend/Desktop source export under ignored artifacts. `tsconfig.json` now excludes artifacts while retaining application source checks; the successful rerun supersedes that failure. Earlier 478/479 runs predate the last readiness/SSE corrections.

## Actual Codex browser checks

Saved concept task `144a6a68-cfc0-5101-9803-a9e0d91a8eb2` retained Concept 1 / Version 1 and its selected alternative throughout review:

- Dark Working and white Sheet views, 100%/125% zoom and Fit worked. Keyboard pan moved the transform by 80px; direct Pan dragging moved it by exactly 70px/40px. Fit/Select restored the view.
- Focus drawing, 2D/3D switching and separate 2D zoom/3D TOP orientation state worked before subsequent development reloads. A clean reload restored usable annotation controls; development hot refresh temporarily reset local view state and annotation readiness, so that is not presented as production persistence.
- A Kitchen comment draft retained its text across 2D/3D switching, then was discarded. No comment or model edit was saved or sent. Durable annotation writes were covered by controlled tests, not newly asserted as a live service feature.
- Two wall-centerline picks measured 11,850mm, distinct from the 12,000mm footprint. The downloaded white PNG visibly included that measurement.
- 3D ISO/TOP, zoom, Wire/Edges and keyboard level-cut controls responded. The full model fit at actual 390px and 320px CSS widths after Fit; page width matched the viewport in both checks. At narrow widths the toolbar scrolls horizontally and small room labels require zoom/selection. This is viewport testing, not physical touch qualification.
- White 2D PNG and one-page PDF were downloaded and visually inspected. A dark 3D PNG captured the model and sprite labels. Saved SVG download succeeded and contained the expected room names. These are separate browser-sheet, viewport-capture and server-export paths.
- Read-only Concept 2 versus Concept 1 comparison completed, showed three changed rooms and disclosed that server diff fingerprints are not independently verified. Closing it preserved the selected Concept 1; no alternative selection or plan acceptance was performed.
- Revit connection details showed the selected connector ready with **Approve in chat**, and other offline devices could not be selected. Full Control was not enabled. During the later service transition readiness became Checking Revit and recovered. The final green dot was observed at desktop and an actual 325px CSS width, without page overflow; the intended 390px browser setting produced 325 CSS pixels in that tab, so this is not claimed as a 390px result.

Evidence and inspected downloads are under `artifacts/ux/native-context-efficiency/`: drafting white/measured PNG, white PDF and rendered PDF page, 3D capture, saved SVG, desktop screenshot and Revit-ready screenshots. The final native read receipts are under `artifacts/ux/native-title-refinement/` and documented in [the native repair packet](native-context-efficiency.md).

## Remaining product limits and next work

The web 3D view is a schematic generated graph preview, not a rendered native RVT or full Revit drafting environment. Local comment/source overlays are not embedded in the downloaded sheets; this is now disclosed. Export filenames and sheets could carry clearer human project/concept identity in a future pass. The connected web-only concept also exposes an optional Full Access block; moving that permission entry behind deliberate native-build intent would reduce chat clutter, but no permission workflow was changed during this audit.

Physical touch, registered external-image alignment, populated native takeoff, RVT upload/rendering, native write/approval/read-back, immutable BOQ history and exhaustive revision history remain outside this qualification. The actual native sample has zero elements in the four inspected host categories; it does not qualify populated models. No Revit save/sync/write, Full Control, plan acceptance, allowance reset, merge or full release occurred.

Next bounded UI slice remains [conversation result polish](conversation-result-polish.md). Long literal list previews and contained table readability can proceed locally. Historical connection-required labels need authoritative originating-turn outcome data; the current task projection does not retain that result after a follow-up. Preserve unknown rather than infer from answer wording or another execution. This checkpoint does not mark that dependency or the full migration complete.
