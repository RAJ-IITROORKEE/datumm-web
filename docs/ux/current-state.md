# Current-state observations

12 November 2026. Live signed-in DATUMM in the Codex browser; desktop viewport approximately 1688 × 877. Findings are a focused walkthrough, not a full application audit. No new agent execution, native approval, settings mutation or billing transaction was performed.

## Verified journey

Opened saved chat `1BHK 9x7 north entry`. The center displayed a 9 × 7 m plan, version 1, with Living selected (17.2 m²). The right inspector contained Agent / Properties / Activity; left navigation held chats. Zoom changed from 100% to 125%; Fit restored the view. The 3D tab loaded a cutaway with walls/windows, grid and orientation controls. Orbit was not tested. Restored the 2D view before finishing.

Settings opened successfully. General showed send-key choice, disabled wait-for-run follow-up control, enabled floating canvas input and persistent properties, and disabled millimetre units selection. Account/connections, Models, Appearance, Revit and Workspace capabilities were visible navigation entries; their complete behavior was not audited. Revit remained disconnected.

## Findings and proposed response

| Finding | Evidence | Design implication |
| --- | --- | --- |
| Chat is narrow while the drawing has multiple persistent control bands | Saved-plan screenshot; top headers, view tabs, toolbar, bottom properties and pipeline | D1 larger right work area plus stable readable chat; compact contextual drawing controls. |
| Drawing prompt and chat composer compete | Floating “Ask about this viewport” overlaps drawing; separate assistant composer | D4 one composer with view/selection chips. |
| Properties consume persistent drawing height | Bottom Living details and Settings checkbox | Propose on-demand properties; exact inspector behavior still to approve. |
| Process information appears in multiple places | “Worked for 32s · 3 steps” and “Worked” plus pipeline/activity surfaces | D2 consolidate default progress; inspect event ownership before implementation. |
| Viewer already has useful functionality | Rendered 2D/3D, selection, zoom and fit | Improve existing components; do not assume renderer replacement is necessary. |

Source inspection: `src/components/workspace/use-workspace-state.ts` contains floating-input and persistent-properties defaults, canvas-question routing and an effect opening the assistant on plan/run changes. These behaviors should be accounted for when stabilizing panes. Verify exact current source positions before editing.

## Revit workflow basis

Autodesk describes the project browser, properties palette and view controls as distinct parts of the interface: [Revit interface](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-GetStarted/files/GUID-7793667D-5657-4382-9BEC-F7CB6AC8F53E.htm), [quick-start interface lesson](https://www.autodesk.com/learn/ondemand/curated/revit-quick-start-guide/5adAp1KzIFXQce7VR29DQ9). Navigation guidance covers pan/zoom/orbit and orientation: [mouse navigation](https://help.autodesk.com/cloudhelp/2023/ENU/Revit-GetStarted/files/GUID-1A152ED7-5636-4160-B7D4-5A54A29AB3CE.htm).

Inference for DATUMM: preserve stable spatial context, visible version/units and predictable drawing navigation while giving the agent conversation a dedicated place. The proposed layout is our recommendation, not an Autodesk specification. The user's own Revit screenshot is still pending.

## Not verified

Native connected execution, annotation persistence, model import/export correctness, long-run reconnect, public-share regressions, keyboard/mobile coverage, billing and full admin journeys. Existing source capabilities do not prove deployed backend behavior. Previous test results in PROJECT.md apply to the older baseline only.
