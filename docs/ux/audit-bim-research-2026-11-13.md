# BIM web workflow research — 13 November 2026

Research-only input to the product audit. Recommendations below are **not newly approved scope or architecture**. No application code, service configuration, account data or native model was changed. Sources are public first-party documentation, read on the audit date. Public catalog text is distinguished from browser-tested behavior; the parent audit owns live reference inspection.

## Product position and fixed decisions

The strongest web proposition is a light BIM review and planning workspace: ask about a known source, inspect drawings/model views, identify issues, request a revision, review quantities, and take away an attributable result. The richer local Datumm-opencode experience can own extensive native authoring and automation. This is a product recommendation, not evidence of desktop capabilities already shipped.

[PROJECT.md](../../PROJECT.md) and [PLAN.md](../../PLAN.md) already settle the stable chat/larger work area, single 248px navigation, Design / Activity / Assets / Exports, one Ask / Plan / Build composer, compact public progress, grouped questions, draft-only suggestions, agent-updated schedules without cell editing, automatic-current non-native revisions with history, individual accounts and exact native approval. Preserve these choices. The repository explicitly leaves immutable BOQ history and live native qualification open; research must not disguise those gaps as working features.

## Verified Autodesk facts and their limits

| Evidence | Implication for DATUMM |
| --- | --- |
| Revit 2026 launched on 2 April 2025 and has versioned help and update documentation. [Release announcement](https://www.autodesk.com/blogs/aec/2025/04/02/whats-new-in-revit-2026/), [2026 help](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-WhatsNew/files/GUID-C81929D7-02CB-4BF7-A637-9B98EC9EB38B.htm). | 2026 is a concrete documentation target, not a speculative version. This does not establish DATUMM connector compatibility. |
| Autodesk announced Revit 2027 on 7 April 2026 and provides a 2027 Help Center. Its launch article identifies Autodesk Assistant as Tech Preview. [Release announcement](https://www.autodesk.com/blogs/aec/2026/04/07/whats-new-in-revit-2027/), [2027 help](https://help.autodesk.com/view/RVT/2027/ENU/?guid=GUID-C81929D7-02CB-4BF7-A637-9B98EC9EB38B). | As of this audit, 2027 is released. Do not describe it as future or infer production guarantees from Assistant previews. Do not claim DATUMM supports it without a connector/runtime test. |
| APS Viewer SDK embeds 2D/3D views and offers section cuts, measurement, object/layer visibility, markup and print; its controls can be customized. [Viewer SDK](https://aps.autodesk.com/viewer-sdk). | These are feasible review patterns, not proof that DATUMM currently implements the SDK or every feature. A viewer action does not modify the source RVT. |
| Autodesk's Simple Viewer tutorial uploads source files, requests derivatives and loads them after checking translation status. Its server tutorial covers storage retention choices and prepares 2D, 3D and metadata derivatives. [Data and derivatives](https://get-started.aps.autodesk.com/tutorials/simple-viewer/data/), [Viewer and UI](https://get-started.aps.autodesk.com/tutorials/simple-viewer/viewer/). | A supported browser preview can be built through a service pipeline. It is not evidence of direct browser RVT parsing. Upload, translating, ready, failed and incomplete are distinct user states. |
| APS's June 2025 support note documents RVT translation to SVF/SVF2 and other supported formats, matched major-version pipelines and different maintenance treatment for older versions. Its version ranges are explicitly dated. [Support note](https://aps.autodesk.com/blog/revit-support-updates-model-derivative-api). | This establishes RVT conversion feasibility. It does **not** establish a current 2027 translator matrix. The [supported-translations page](https://aps.autodesk.com/en/docs/model-derivative/v2/overview/supported-translations/) returned no readable body in this research tool; verify exact version/output support before choosing a service. |
| An official October 2026 APS article states that Model Derivative does not directly extract Revit schedules. It describes reconstructing schedule-like data from element properties or exporting tables through Revit Automation. The same article marks its Workflow MCP as in development/private beta. [APS article](https://aps.autodesk.com/blog/ai-native-aps-idea-outcome-context-control-and-trust). | A property table cannot silently claim fidelity to a native Revit schedule. Do not base the product on the article's beta workflow demonstrations. |
| Revit Automation runs the Revit engine in the cloud and supports creating, extracting and modifying RVT/RTE/RFA data through the DB API. [Automation APIs](https://aps.autodesk.com/automation-apis). | Native cloud processing is technically possible through a separate backend service. It is additional integration, operating cost and data processing; it is not part of a browser viewer or an approved migration here. |
| A model saved by a newer Revit version cannot be opened in an earlier version; Autodesk points to IFC/DWG for moving geometry across that boundary. [Autodesk support](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/The-file-filename-rvt-was-saved-in-a-later-version-of-Revit-and-cannot-be-retrieved-in-this-version-when-opening-a-Revit-model.html). | Record the native output's Revit version. Do not promise a lossless “save as older Revit” option. |

## Revit-style navigation worth adapting

Revit documents middle-button pan, wheel zoom around the pointer, Shift + middle-button orbit in 3D, orbit around a selected object, a corner ViewCube and view-specific navigation tools. [Revit navigation](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-DocumentPresent/files/GUID-A3F4A7B5-225F-46D2-99D3-4C9771282DCA.htm).

**Recommendation:** use this familiar vocabulary while retaining a compact web toolbar. In 2D expose Select, Pan, Fit, Zoom, Measure and Annotate; in 3D add Orbit, orientation/home, section and isolate only when supported by actual geometry. Keep a visible escape from isolate/section and a reliable Fit/Home reset. Label keyboard/mouse help and provide clickable controls for trackpad/touch users. Do not copy desktop shortcuts that conflict with browser navigation. Do not make dragging a wall look editable when D3 permits review and agent edits only.

The top-down view of a 3D model and a published floor-plan sheet are different artifacts. Label view type, level, source version and units, retain camera per view, and avoid implying that either view automatically contains the other's annotations or exact drawing semantics. Selection-to-chat should attach a visible source/view/element chip to the one composer. Selecting an object must not submit a task.

## Model entry: three different promises

| Path | Useful experience | Proposed boundary |
| --- | --- | --- |
| Existing connected Revit desktop | Choose the active document and a supported view/snapshot; request a scoped read or schedule export. | Prefer this when the connector already supplies the needed data. Show document identity, version, capture time and freshness. “Connected” alone does not prove extraction or native execution works. Reusing the connection does not automatically authorize uploading the entire RVT elsewhere. |
| Existing drawing/report/model artifact | Review a supported PDF/image, structured schedule or previously generated view without installing Revit. | Describe only the information actually present. An image supplies no reliable element identity or uncalibrated physical measurement. Exact supported upload formats remain an implementation contract to verify. |
| New `.rvt` upload for conversion | Select file → review destination and processing terms → upload → convert → choose available views → inspect omissions. | A possible later service feature. Explain cloud recipient/region, retention, deletion, linked-file handling and expected charges before transfer. Do not label it “local preview.” Confirm version/output support and representative model fidelity first. |

The third path should earn its complexity through user demand. APS is one documented candidate, not a selected architecture. A local connector export may avoid an additional whole-model upload, but the agent's own transfer of extracted data still needs an accurate product explanation. A failed conversion should leave the source record and an actionable retry/reconnect choice; it must not appear as an empty successful model. Linked models, missing views and partial metadata need explicit coverage indicators.

## Recommended light workflows

These journeys apply approved interaction principles; new capabilities within them require qualification and agreement.

| Journey and example | Result the user can assess | Reliability condition |
| --- | --- | --- |
| **Ask:** “Which rooms on Level 2 have no department?” | Short count/summary, openable exception table, selected elements highlighted where identities exist. | State model/snapshot and parameter scope; distinguish blank, missing and unavailable values. Do not infer element facts from a screenshot. |
| **Review:** inspect a plan, isolate a category and pin “Check this doorway.” | A source-bound annotation and draft follow-up prompt. | Annotation scope/persistence must be visible; pins remain attached to the exact view/revision and do not claim to be native Revit annotations. |
| **Plan:** “Compare two layouts for this brief.” | Measured alternatives, stated assumptions, drawing and a compact comparison. | Conceptual geometry and estimates are labeled; preserve accepted plan identity. No code-compliance or model-authoring claim from a visual draft alone. |
| **Schedule/BOQ:** “List doors by type and level; flag missing fire ratings.” | Readable table, missing-data summary, units, grouping and CSV export. | Identify whether it is a native schedule export, property-derived table or estimate. BOQ prices, waste, inclusions and measurement rules need explicit inputs. |
| **Revise:** “Group this BOQ by level and exclude demolition.” | New current report, compact change summary, earlier report available. | D9 is approved, but immutable history remains a backend gap. Source-model revision and report revision must be separate. A report change cannot silently change the model. |
| **Native handoff:** “Apply these reviewed parameter changes.” | Exact before/after proposal and target; after approval, execution and read-back results. | Bind approval to document, source revision and proposal. Recheck freshness; partial failure is not completion. The local product can carry richer editing without forcing it into web controls. |
| **Export:** “Send me this reviewed schedule and marked plan.” | Named downloadable artifacts with source and generation details. | Export only completed, supported outputs. “Saved to DATUMM,” “downloaded,” “written to Revit” and “saved/synchronized in Revit” are different outcomes. |

## Streamdown: role and limitations

Streamdown handles partial Markdown while an answer streams. Its GFM support supplies tables and task lists; table presentation supports contained scrolling. [Introduction](https://streamdown.ai/docs), [GFM](https://streamdown.ai/docs/gfm). Its controls provide table copy/download formats and can be disabled while streaming through `isAnimating`; exact format choices should be checked against the installed version, because documentation pages are not perfectly consistent about TSV download. [Interactivity](https://streamdown.ai/docs/interactivity).

**Recommendation:** keep short conversational answers readable with restrained Markdown. Put full review reports and large schedules in Design, reached through a clear artifact card; retain access to the full answer instead of truncating evidence. Use the same completed content for replay and export. Streamdown is presentation, not a calculation engine, persistence service, BIM data validator or native approval channel. A rendered Markdown checklist is not authoritative runtime task status.

Mermaid is an optional plugin with diagram controls and error handling. It should support an explicit process/relationship explanation, not replace drawings or become the default response. [Mermaid plugin](https://streamdown.ai/docs/plugins/mermaid). Preserve existing application image/link restrictions: current documentation describes permissive URL/image defaults and recommends restriction for untrusted AI output. This is a rendering concern, not a reason to add unrelated permission prompts. [Security](https://streamdown.ai/docs/security).

## affectUI public reference evidence

The following are **catalog/documentation observations**, not interaction tests in this research. Public pages expose examples and props; no Pro registry source was obtained or copied.

| Public screen | Documented pattern | Adaptation proposed for DATUMM |
| --- | --- | --- |
| [Agent / Thread](https://www.affectui.com/screens/agent-thread) | Plain conversation, compact tool group, task/artifact cards and a question dock with Later/Show. | Best body reference for concise Revit conversation. Keep existing modes/model controls and actual service lifecycle. |
| [Agent / Tasks](https://www.affectui.com/screens/agent-tasks) | Work grouped by project, status in words, attention count and task detail/artifacts. | Useful task/history summary if genuine task records exist; no invented percent or workers. It need not become another top-level destination. |
| [Agent / Memory](https://www.affectui.com/screens/agent-memory) | Saved facts grouped by scope, source and usage, with review/keep/forget. | Consider only when runtime memory storage, scope and deletion are supported. Profile preferences, attached context and persistent agent memory are distinct. |
| [Agent / Permissions](https://www.affectui.com/screens/agent-permissions) | Read/change/risk groups, autonomy presets and locked rules. | Borrow plain-language capability explanations. Do not introduce Hands-off Revit writes or let a preset override exact native approval. |
| [Agent / Inbox](https://www.affectui.com/screens/inbox) | Questions, options and approval decisions, with open/done states and task context. | Borrow clear choices and focus recovery within the approved grouped question UI. Clarification answers and consequential approval need distinct action semantics. |

The question screen's verified route is `/screens/inbox`, not `/screens/agent-inbox`. The existing [Agent Chat](https://www.affectui.com/screens/agent-chat) remains the approved shell reference from repository evidence; its page was not readable in this web pass. Reference demos include editable sheets/formulas and sample autonomy settings that are outside DATUMM's approved scope.

## Export provenance and remaining decisions

**Recommended minimum provenance:** project/document identity; source model version and capture time; view/level/selection scope; units and extraction method; report revision and generation time; assumptions/exclusions; and verification status. Put a readable subset in the artifact header and export, with technical identifiers available in details. A CSV needs a companion manifest or separate metadata sheet/file if provenance cannot fit without corrupting its rectangular data. An exported screenshot should identify the view and snapshot, not imply it is an approved construction drawing.

Prioritize these questions before adding a new import or authoring promise:

1. Which supported connector outputs are already available: geometry, published 2D views, element properties, native schedules, and explicit document revision? Which survive disconnection?
2. Is web `.rvt` upload a validated user need, or does existing-desktop capture plus standalone artifact review cover the initial audience? If upload is required, who funds translation and owns retention/deletion?
3. What is the verified Revit/connector/translator compatibility matrix, including 2027, linked models and representative model sizes? Released Revit versions do not establish integration compatibility.
4. Can reports preserve immutable prior revisions today? What identifies a report revision independently of its source model revision, and what happens when generation fails?
5. Which exports are real end-to-end outputs today, and which step provides evidence of native write, save or central synchronization?

Recommended order: qualify existing source-bound review and schedule journeys first; resolve D9 history and export provenance; then assess RVT conversion as a separate product/service decision. Keep short chat, accessible clarification and clear native handoff throughout. This research proposes no new installation, backend architecture, release or implementation authorization.
