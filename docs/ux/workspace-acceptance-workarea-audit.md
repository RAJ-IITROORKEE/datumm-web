# Work-area acceptance audit

15 November 2026. Source review and implementation for the approved workspace acceptance upgrade. Browser reference observations and final visual qualification are recorded in `workspace-acceptance-upgrade.md` and the coordinator's handoff.

- Activity presents the task-bound recorded checklist and event summary first. Search and event type remain available in a disclosure; context usage and mode/model follow. Existing task, turn, native-session and execution-ledger provenance checks remain in place.
- Assets identifies the actual record type and source, and labels the available Preview or Download action. Unsupported records retain their unavailable reason. No synthetic thumbnails or previews were added.
- Exports places the saved report and drawing paths first. The report preview owns saved history and revision-bound CSV downloads. A collapsed directory retains supported latest-task evidence downloads with an explicit distinction from saved revisions. Answer outputs and existing source details remain available.
- Modified files: `src/components/workspace/{activity-panel,assets-panel,exports-panel}.tsx`, corresponding CSS modules, `tests/activity-panel.test.mjs`, and `tests/workspace-exports.test.mjs`.
- Focused validation: 28 tests passed across `activity-panel`, `workspace-exports` and `deliverable-panels`. Source inspection confirmed unchanged report revision endpoint and mounted drawing ownership. Browser and full-suite qualification are coordinator-owned and pending at this checkpoint. No backend or native changes.

- Touch follow-up: narrow and coarse-pointer event filters, export directory, download and source controls have 44 px minimum heights; desktop controls remain compact. The 28 focused panel tests passed again. Browser measurement remains pending.

- Activity density follow-up: compact scoped usage now appears between the checklist and event list, retaining estimated/native provenance and partial or unknown ledger labels; longer detail remains available. Recorded event rows use a compact presentation without changing the default presentation elsewhere. 39 focused activity and usage tests passed, including compact native, unknown and partial states. Browser review remains pending.
