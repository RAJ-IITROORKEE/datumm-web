# Structured answers and Revit schedules

12 November 2026. D6–D7 approved in PLAN.md. This is a design/integration proposal, not an implemented feature.

## Research and current integration

Opened [Streamdown](https://streamdown.ai/) and its [playground](https://streamdown.ai/playground) in the Codex browser. The preview rendered headings, lists, task lists, tables, math, Mermaid diagrams and a custom chart example. Opened the table download menu: CSV and Markdown were visible. Opened a Mermaid flowchart fullscreen and visually confirmed rendering; exited successfully. Download correctness, clipboard formats and streaming simulation were not tested.

The repo already installs Streamdown **2.6.0**. `src/components/ai-elements/message.tsx` wraps it in `MessageResponse`, with `tableMaxHeight={0}` and DATUMM styling. It is used in conversation, process/activity and public share views. No `@streamdown/mermaid` plugin is declared in the app package dependencies. Installed types include `plugins`, `isAnimating`, table height and fullscreen controls.

The wrapper's custom memo comparison checks only `children`. This means a future `isAnimating`, permission or configuration update with unchanged text could be skipped. Address this when wiring structured-output behavior; it is not a claim that a tested live export failed. Current call sites do not supply `isAnimating`. Preserve the public share's `disallowedElements={['img']}` policy.

## Agreed output scope

| Output | Revit/BIM use | Presentation |
| --- | --- | --- |
| Formatted report | Brief, assumptions, design options, review findings | Short summary in chat; full report beside chat. |
| Tables/schedules | Room areas, door/window lists, quantities, design comparisons | Readable headers/units, horizontal overflow, copy and CSV export. |
| BOQ review sheet | Element quantities from design or Revit export | Agent-updated data with visible origin and revision; no editable cell grid/formula engine. |
| Mermaid | Process flow, planning dependencies, conceptual room adjacency | Inline preview and fullscreen; never use as a scaled drawing or Revit geometry model. |

Streamdown supplies Markdown presentation and interactions. Real schedule data, revisions, permissions and Revit extraction remain application/harness responsibilities. Its GFM table feature is not an editable spreadsheet engine. Sources: [GFM](https://streamdown.ai/docs/gfm), [interactivity](https://streamdown.ai/docs/interactivity), [Mermaid plugin](https://streamdown.ai/docs/plugins/mermaid).

## Proposed agent output contract

Keep two coordinated outputs:

1. **Readable answer:** Markdown headings, concise prose, lists, small GFM tables, explicit units/assumptions and source references. Mermaid fences for diagrams where helpful.
2. **Typed artifact:** identifier, kind, title, project/document identity, model/plan version, revision, timestamp, origin (Revit extraction / design derivation / estimate), schema, data, units and authorized export metadata. Field names are provisional until the deployed API is inspected.

Use typed records for complete schedules and exports instead of parsing a prose table back into authoritative quantities. Bind room/element rows to real source IDs when provided; do not invent clickable elements. Avoid silently mixing model versions or presenting estimates as measured quantities. Missing information should remain visible as unknown.

Recommended response pattern: result summary → artifact card → assumptions/issues → suggested next action. A BOQ should include element/category, description, quantity, unit and source identity where available. Rates/currency/amounts are optional later data, not invented to populate a table. The user explicitly does not require formulas.

## Agent update interaction — proposal for next discussion

The user asks for a change in chat, optionally attaching selected rows/output context. The agent prepares a new revision; display a concise change summary and preserve access to the prior revision. Decide next whether all schedule revisions need an explicit “Use this revision” action or whether non-native output updates can become current automatically. Neither behavior is approved yet. Updating a report must never imply applying changes in Revit.

## Implementation considerations for later

- Theme headings, borders, tables and controls using affectUI tokens. Compose built-in components or use documented styling hooks so copy/export behavior survives: [component customization](https://streamdown.ai/docs/components).
- Install only approved plugins after checking compatibility with 2.6.0; Mermaid is an additional integration, not currently enabled by the existing wrapper.
- Bind streaming status explicitly; suppress incomplete-data exports until completion. Long schedules should use a bounded preview or dedicated output view rather than unbounded chat growth.
- Use a controlled renderer allowlist; do not execute arbitrary JSX/HTML/scripts emitted by the model. Preserve link/image restrictions and validate diagram data. Handle malformed diagrams with readable fallback and retry, not a broken conversation.
- Export authoritative rows with correct units, encoding and quoting; handle spreadsheet formula injection from untrusted cell text even though DATUMM has no formula feature.
- Add math, custom charts, PDF/XLSX report generation or live collaboration only after separate scope decisions. A custom chart in the playground does not make it an existing DATUMM feature.

Acceptance examples: stream an incomplete table/fence without breaking layout; complete without text change and enable controls; reload an identical artifact; export commas/newlines/Unicode safely; inspect a large schedule; recover a malformed diagram; distinguish stale source version; verify public-share authorization. Use meaningful tests when implementation exists.
