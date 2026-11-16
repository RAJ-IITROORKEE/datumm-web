# Conversation result polish

14 November 2026. **Completed and qualified for this bounded slice.** Literal list previews, originating-turn connection outcomes and readable narrow tables now follow the existing Component reference map. The planning and proposed validation text below is retained as historical context.

## Observed results and limits

Actual Codex browser task `972a2252-053a-5fe4-9562-8f3bec8a12cb` returned an eight-item list: the preview showed a literal excerpt, the full answer retained all eight items, and copy retained 1,795 characters. Its six-column, four-row table retained exact long tokens in normal and full-screen views; horizontal scrolling kept cells readable. At 390 and 320 px the page remained bounded; ArrowRight scrolled the table, Tab stayed in the dialog, and Escape and Close returned focus to the correct opener. The actual `answer-2-table-1.csv` export retained all four rows, six columns and long tokens.

Actual historical task `0ba44c14-ec36-5b90-a4e6-66f9772559ea` showed its first turn as Revit connection required from that turn's recorded outcome (`1742064…`), followed by a general completed answer. Both remained correct after reload and A–B–A navigation. The public task JSON is retained with the local evidence. A versioned outcome is projected only for a uniquely owned task, execution and command binding; missing, legacy or ambiguous bindings stay unknown. Conflicting lifecycle records fail closed, and failed or paused states remain distinct when their ownership is established. Answer and copy identity remain unchanged.

The missing Streamdown Tailwind source path was fixed. A scoped Radix text-only full-screen adapter corrected the vendor table's off-screen placement and focus behavior while retaining its table and CSV contract. These observations are actual browser results, not a claim about untested native execution.

## Technical and deployment evidence

Final frontend checks passed 492 tests, production build, standalone TypeScript and 13 production runtime checks. The exact backend candidate passed 122 tests and nine subtests with two existing duplicate OpenAPI operation-ID warnings. Independent source and release review cleared the bounded change.

Backend source `b79f2c99228b26d607973a0f158f32b7a25d6582` was deployed as image `012330b83c960e38de7e470d9c3359b4c6b3795322c57e50ded250bc3e04612a`; build `6319cb99-6bee-4c87-be4e-15a13c6e5bba` and CloudFormation completed, ECS reported 1 running / 0 pending on the single completed deployment, the deployed source matched, and anonymous access remained 401. The pre-deployment `mongodump/20261114T070643Z.archive.gz` backup is 31,184,757 bytes; restore has not been qualified.

Local evidence is under `artifacts/ux/conversation-result-polish/`, including `backend-tests.log`, frontend and runtime logs, `live-history-public.json`, `live-answer-2-table-1.csv`, `chat-table-desktop.png`, `historical-status-desktop.png` and `table-fullscreen-320.png`. No native calls or writes occurred in this slice. Full migration and full release remain separate and incomplete.

## Historical plan

### References and observed behavior

Use the approved [Agent / Thread full preview](https://www.affectui.com/screens/agent-thread/full), [AI answer](https://www.affectui.com/components/ai-answer), [tool call](https://www.affectui.com/components/tool-call-card) and [Streamdown GFM tables](https://streamdown.ai/docs/gfm), together with the existing [chat refinement packet](chat-interaction-refinement.md). Keep current affectUI tokens, Inter, shell and four work-area tabs.

Fresh Codex inspection of the public Thread preview showed brief paragraph answers, separate artifact links, an expandable tool-group button and public task/decision states. Activating “Ran 3 tools” exposed the associated rows and expanded state. The displayed task counts, timings and canned demo content are not DATUMM service evidence and must not be copied as functionality.

### Bounded implementation

1. Long list-only answers should show a short literal excerpt from their first list items rather than the generic empty Preview instruction. Preserve shortened/Preview disclosure, full-answer access, source identity, copy and saved text. Do not generate or imply an AI summary from truncated text.
2. Historical authoritative `needs_connection` outcomes should have a plain Revit-connection-required label. Keep unknown fallback, paused-limit and failure states distinct and preserve exact originating-turn ownership.
3. Tables in narrow chat/work panes should preserve readable labels and full cell content with horizontal scrolling rather than arbitrary mid-word breaks. Keep output identity, table/CSV access and the existing Streamdown rendering contract.

Initial source targets: `src/lib/answer-presentation.mjs`, `src/components/workspace/turn-process.tsx`, scoped markdown table CSS in `src/app/globals.css`/`foundation.css`, and their focused behavior tests. Confirm actual caller paths before edits; use local Next.js guidance and the installed UI guidance.

### Validation

Use meaningful behavior tests for literal previews and status provenance, then the appropriate full frontend/build/type/runtime gate. In the Codex browser inspect actual historical connection-required turns, a long list-only answer and the recorded native table at desktop and390/320px. Verify full-answer/copy/export retention, keyboard access and bounded page/table overflow. Record actual observations separately from controlled fixtures. No new memory persistence, billing contract, native permission or backend feature is implied by this UI slice.
