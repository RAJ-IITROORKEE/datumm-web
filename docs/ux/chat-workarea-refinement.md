# Chat and work-area refinement — 15 November 2026

## Direction and observed gaps

The user's latest instruction prioritizes chat and the four work-area sections; admin, navigation and theme are outside this slice. Earlier completion entries qualify individual features, not the whole experience.

Observed in localhost: Design owns both drawing and report/answer preview, Exports directs users back to Design, the review card dominates the transcript, and suggestions sit below answers. Source inspection confirms existing truthful public activity, current-turn checklists, usage and versioned questions. Plan acceptance already works without a connector, but its frontend Build-mode follow-up can mix an acceptance success with a connection error.

## Reference map for this slice

| Reference | Observed behavior and DATUMM adaptation |
| --- | --- |
| https://www.affectui.com/screens/agent-run | Public preview: one readable plan step per row, used-tools disclosure, explicit waiting-for-approval status and separate file previews. Use actual event/todo evidence, never simulated progress. |
| https://www.affectui.com/screens/agent-chat/full | Fresh full preview inspected: brief conversation, composer, separate Brief/Assets/Activity area. Activity shows concise timestamped events; Assets has an honest empty state. Retain neutral surfaces, Inter, restrained icons and independent work area. No Pro source was accessed. |
| https://www.affectui.com/components/tool-call-card | Existing pinned free adapter; concise tool summary with details on demand. |
| https://www.affectui.com/components/context-window | Existing reference for utilization; actual measured or estimated values must keep their source labels. |
| https://streamdown.ai/ | Current page describes streaming markdown, incomplete-block handling, lists/tables and optional plugins. Keep installed renderer and safe output/source handling; diagrams are not a default requirement. |

## Implementation sequence

### Latest observation and correction — placeholder only

The user reviewed the live composer and rejected the separate suggestion-chip row. Browser inspection confirmed three prompt buttons above the textarea, plus its existing generic placeholder. This supersedes step 2 below: suggestions belong only in the empty input's placeholder, with no separate row, chips, next-step block, or automatic insertion/submission. Use one stable contextual hint, disappear naturally when typing, retain an accessible input label, and reset the hint on chat/account changes. Keep normal keyboard navigation; no Tab interception or rotating animation is needed.

Next execution order, after this observation: (1) remove the suggestion portal/row and provide a scoped contextual placeholder; test empty/typed/cleared inputs and chat changes; (2) reconcile human answer numbering between Assets and previews without changing source identity; (3) verify the saved checklist evidence before any backend completion fix. The candidate terminal concept/revision path records design_ready but appears to omit response_ready; this is a source-based explanation, not a verified reading of the saved record. Do not mark remaining steps complete merely because a response finished. Any service fix needs its own regression, deployment and live qualification. Admin remains deferred.

1. Compact process summary and plan-review alert. Keep exact-plan acceptance and explicit native approval as separate operations. No automatic connection/setup action after acceptance.
2. Superseded by the latest correction above: remove the prompt-chip interaction and use a contextual empty-input placeholder only. Existing unrelated draft-producing actions still preserve drafts; no transcript next-step section.
3. Keep Design drawing-only. Open reports and answer previews in Assets or Exports with a clear return action; keep drawing mounted and exact report revision/download bindings intact.
4. Refine Activity around current-session checklist and truthful context/usage, then asset and export rows. Unsupported previews remain explicitly unavailable.
5. Run focused and full checks, production build/type check, actual browser desktop/narrow tests, process expansion, placeholder/draft/keyboard/chat-isolation checks, report revision preview/download and drawing retention. Record failures and untested states separately.

## Backend boundary

Current deployed contract already provides owner-scoped events, execution/turn binding, questions, report revisions and exact plan acceptance. Presentation changes do not require replacing OpenCode or deploying a new runtime. Review the supplied Pandabyte repository read-only for patterns, not as authority for DATUMM native actions. Any new service field needs an explicit typed contract and qualification.

## Verification

Final correction qualified: 524 current frontend tests, production build, standalone TypeScript and all 13 production runtime checks passed after placeholder-only cleanup and answer-number/source-qualifier fixes. Independent review found no source issue in the changed paths. Final logs are `artifacts/ux/chat-workarea-placeholder/{tests,build,typecheck,runtime}.log`. The temporary production test server was stopped and port 3100 released. Browser evidence and exact limits follow.

Before the latest placeholder correction, Terra 6.1 High implementation and independent checks passed 525 frontend tests, production build, standalone TypeScript and 13 production runtime checks. Logs are in `artifacts/ux/chat-workarea-refinement/`. Those checks qualify the earlier source snapshot; the final correction is qualified separately above.

Actual Codex browser evidence:

- Existing concept task `6a4cde35-1697-5f5f-955c-fe679ecb3c8b`: drawing-only Design retained the 13,000 × 9,000 mm version 2. Report previews opened in Assets; historical revision 1 stayed selected across Design → Assets. Its downloaded CSV matched the previously recorded bytes (SHA-256 `60D6956FA5E493B47C6DB4447F6088DD91D6D221EC829CF3EEF396B69A6ABDE6`).
- Exact web-only plan acceptance succeeded with no Revit connection, no connection dialog and no automatic Build request. `Plan accepted · v2` survived reload. No native build or write was executed.
- Fresh general question task `c5f129ef-bacd-537e-80e7-3c403eaa1c82`: public knowledge-search activity completed without requiring Revit. Three short bullets rendered in full. A follow-up table displayed a minimal `Table ready · 3 rows` message and opened a three-row preview in Assets. Escape closed the preview and returned focus to its opener. Exported CSV preserved all three rows and two columns. Both saved responses survived reload.
- At narrow widths, the document remained contained. At CSS 390 px, report controls used 16 px text, the report could scroll vertically to its table, and the table scrolled horizontally by keyboard. Normal desktop screenshots are `chat-final.png` and `answer-table-final.png`; emulated screenshot captures with tiled edges are not visual goldens.
- The earlier prompt chips filled drafts and preserved Keep/Replace correctly, but the user rejected that presentation. Their successful tests do not qualify the requested placeholder-only replacement.

## Remaining evidence and boundaries

The saved revision still shows checklist 1 of 2 and an unconfirmed outcome. Source inspection suggests the terminal design path does not emit the typed response_ready observation required by its final reporting step. The saved step/evidence record must be checked before changing the backend. Preserve the honest unknown state meanwhile; response settlement is not proof of every step's completion.

The observed answer-number mismatch is corrected: Assets and Exports now use the same human answer ordinal as previews, retaining raw message identity for source binding. Actual browser inspection showed Answer 1 and Answer 2 consistently across the saved list, preview selector and export list. Report-format previews are data previews, not byte-identical PDF/DOCX previews; a visible qualifier now distinguishes saved report data from latest-evidence downloads. Unsupported uploads and specialist JSON previews remain explicitly unsupported.

The placeholder correction passed actual browser empty → typed → Tab → different chat → restored concept → cleared input checks. Typing hid the placeholder, Tab moved to Add without inserting text, the general chat used its own hint, and the original unsent draft survived returning to the concept via navigation/reload. Clearing restored its plan hint. Zero suggestion rows remained and there was no document overflow at the normal desktop viewport. The saved concept acceptance also remained intact. The final screenshot `chat-final.png` shows this correction; no prompt was sent by these composer checks.

Pandabyte was inspected read-only. Its current chat uses assistant-ui with react-markdown/remark-gfm and an OpenCode-backed flow, rather than the Vercel AI SDK/Streamdown combination described from memory. Relevant patterns are compact confirmed activity, separation of provisional and saved messages, and draft-only suggestions; DATUMM retains its existing renderer and stronger source/draft boundaries.

No new backend deployment or native write occurred. The deployed backend source remains `1ef3861b2e5186151df387a1e2e5a20e99f8d0c1`. Admin, native BOQ/RVT import, specialist file viewers, desktop parity, billing and overall migration/release are outside this qualification.
