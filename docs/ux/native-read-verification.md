# Revit read-only verification and connector update

14 November2026. The user requested a real read-only model request in the Codex browser, a handoff update and the Revit plugin or installation through computer use. No model editing, Full Control, exact-plan acceptance or native write is authorized by this verification.

## Qualified result — single-session read-only scope

The user explicitly authorized Load Once, then Allow this computer. A renewed request for the same computer/account succeeded. Revit showed Connected to DATUMM, and localhost selected Revit ready / Approve in chat. Full Control stayed off and the connection panel was closed before reads.

Task `22408d23-ccac-5818-b969-344db5cb52f6` initially completed with active view L1 - Architectural, levels L1/L2 and revision 0. Its inventory follow-up retrieved complete empty host evidence, then paused at the shared model-call allowance before its final answer. Separate narrow task `a74c2f27-b276-5112-ba98-f71c10364537` completed and survived reload, matching the active view against complete coverage of 13 host floor plans.

Authenticated browser receipts identify Project1, document `abb46c39-b7ef-4858-b6d1-f80e4e207537`, at revision 0. Complete selected-category elements and quantities evidence establishes **0 host walls, doors, windows and rooms**; links and other categories were excluded. This does not qualify populated-model takeoff or native drafting. All observed calls were successful reads: capabilities, sessions, document context, inventory, views, quantities and elements. No write/preparation tool appears, and no model edit, save, sync or Full Control was performed. Before/after RVT SHA-256 and size match exactly.

Evidence: `artifacts/ux/native-read-verification/qualification.json`, `live-read-evidence.json`, `narrow-read-evidence.json`, before/after file identities, `revit-connected.png` and `final-read-workspace.png`. Capture used normal authenticated browser task responses, without extracting credentials or private reasoning. The AWS CLI session had expired, so this is not a fresh database qualification. No application source/deployment changed; prior 475 frontend/73 backend tests were not rerun for this installation-only task.

Remaining: the agent omits Project1 despite available `data.context.title`; the longer follow-up reaches its allowance after obtaining evidence; upgrade recovery should repair stale launcher/service settings. Do not report that follow-up as completed or reset allowances. Populated models, device/document switching, stale context, RVT processing, native write approvals/execution/read-back and full migration remain separate. Revit is left connected on Project1; the completed narrow read remains open with an empty composer and temporary network observation disabled.

The setup/pending-permission notes below are historical and superseded by this result.

## Initial observed setup

The browser still showed four offline connectors. Computer inspection found Revit2026.4 with `Project1 - Floor Plan: L1 - Architectural`, the DATUMM ribbon enabled, but the DATUMM Connection panel explicitly said Not connected. Its advanced service address was the former Azure endpoint; localhost uses the currently qualified AWS backend102c9ee7. The installed add-in manifest pointed at alpha.28. Correcting the service address to AWS did not let that installed connector start its connection flow.

## Installer preparation

The app’s public-download link resolves to the project’s GitHub `plugin-v0.5.0-alpha.40` release. The27,370,012-byte unsigned development installer was downloaded to `C:/Users/rajra/Downloads/DatummAgent-0.5.0-alpha.40-unsigned-win-x64.exe`. Its SHA-256 matches both the published checksum and GitHub’s asset digest: `d02ed6e951256e42c89984eca32dd46edaa33e20780e4d232db38a172f8dc23a`. This is a candidate development add-in, not a certified production release.

Computer use opened the verified installer. Its information screen requires Revit closed and states that it installs the current-user add-in, MCP server and pinned runtime, backs up the managed manifest and preserves unrelated add-ins. Revit was closed normally with no save/discard prompt; no model editing or save operation was performed. The installer reported completion and exited. A subsequent manifest check confirms alpha.40 and its existing DLL. Reopened model identity, connector authorization and the real read-only request still need qualification.

## Evidence and required outcome

Evidence is retained under `artifacts/ux/native-read-verification/`. The final outcome must distinguish installation, device authorization/online status, identified Revit session and actual tool-backed model read. Browser-visible success alone is not evidence that model data was read. Existing approval boundaries and historical tasks must remain intact. Do not mark a live read passed until the connected model and its read results are independently supported.

## Installed update and launcher repair

The alpha.40 installer completed successfully. Its installed manifest now points to the existing alpha.40 `Datumm.Revit.dll`; the installer exited. Revit was restarted normally. No save/discard prompt or model edit/save action was performed.

A separate stale launcher configuration survived the upgrade: Node/MCP paths targeted alpha.22 and its connector entry pointed at a nonexistent old `Datumm-codex/artifacts/plan-build-clean-20ac04d` file. The original three-field configuration was preserved in `launcher.before.json`, and the three paths were repaired to verified existing alpha.40 runtime/connector/MCP files. `launcher.after.json` records the result; no credentials or permission grants were changed by this repair.

Revit startup reached its explicit “Security – Unsigned Add-In” publisher-trust prompt naming DATUMM Agent Development and the alpha.40 DLL. The user was asked to choose Load Once themselves. No trust bypass or Always Load action was automated. Screenshot: `artifacts/ux/native-read-verification/revit-trust-prompt.png`. Device connection and the actual read-only browser request remain pending until Revit loads the add-in.

## Session load and current-workspace authorization

After the user explicitly instructed computer use to load and test the verified add-in, Load Once was selected for that Revit session; permanent Always Load trust was not enabled. Revit finished startup and the saved Project1 model was reopened through Recent. The existing pyRevit document-open notice was acknowledged. A local file identity receipt was recorded before native requests; no model edit or save was performed.

The alpha.40 connection UI retained the correct AWS URL and could now launch the installed connector. Its previous private credential still belonged to the former Azure origin. It was preserved inside the same restricted connector folder, not copied into the repository. The supported Sign in with another account flow started current-server authorization. The default browser opened the project’s hosted connect page; the same request was opened in the Codex browser against localhost3001, using the current account/current AWS service.

The actual permission page identifies computer Raj_Rabidas and explains that connecting it grants account access while model changes still require separate exact-proposal approval or explicit scoped access. The assistant asked for action-time permission before clicking Allow this computer. Device authorization and the read-only agent workflow are pending that answer. Screenshot: `artifacts/ux/native-read-verification/allow-computer-review.png`. No Full Control or device authorization has yet been granted by the assistant.
