# Settings and administration migration

12 November 2026. Implements the approved PLAN.md settings/admin slice (phase 6), continuing D5's affectUI foundation and D10's individual-account scope. This extends the existing visual system; it does not replace the workspace or its authority model.

## Direction contract

Mode: Operate. Audience: individual Revit/BIM users and authorized DATUMM administrators.

THESIS: Find the setting or configuration record, review its scope and save deliberately.

OWN-WORLD: Existing affectUI-derived neutral tokens and self-hosted Inter, compact controls, tonal selection and quiet separators.

STORY: Personal settings stay distinct from global administration; reported state, unsaved edits and unavailable capabilities remain legible.

FIRST VIEWPORT: Stable grouped navigation, compact breadcrumb, readable title/description and independent scrolling content; configuration uses a persistent revision-aware save row. Personal mobile navigation expands above content and yields focus to the selected heading.

FORM: seed: none (pinned). The user requested the affectUI foundation and continuation of the approved plan.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Reference mapping

| Reference | Evidence this phase | DATUMM adaptation |
| --- | --- | --- |
| [Settings / General](https://www.affectui.com/screens/settings-general) | Public preview inspected in Codex browser: grouped navigation, compact label/helper/control rows, separated large text area, title/description and independent content region. No gated code accessed. | Admin models, budgets, per-run limits and web-search forms; stable grouped shell. Omit team/company/workspace deletion features outside individual scope. |
| [Integrations](https://www.affectui.com/screens/integrations) | Public preview inspected. Connected tab filtered to one example; searching Revit produced No integrations found and Clear search. Catalog itself recommends a simple list for small collections. | Skills and MCP as compact expandable directories; knowledge source search/empty results. Preserve the explicit distinction between stored MCP configuration and available runtime tools. No demonstration apps are copied into DATUMM. |
| [Agent / Activity](https://www.affectui.com/screens/agent-activity) | Public preview inspected: date-grouped records, filter counts and selected-record detail. Undo/approval examples are reference data, not verified DATUMM capabilities. | Read-only searchable admin audit records from the existing last-100 endpoint. No invented undo or approval controls. |
| [Preferences](https://www.affectui.com/screens/settings-preferences), [profile](https://www.affectui.com/screens/settings-profile), [models](https://www.affectui.com/screens/settings-models), [security](https://www.affectui.com/screens/settings-security) | Existing plan links; detailed new interactions not requalified this phase. Shared visual grammar is supported by the General preview and existing design evidence. | Personal/Workspace section groups, navigation search, narrow Browse sections, real catalog identities and explicit web/Revit/desktop capability boundaries. Existing Clerk account controls remain the security owner. |

## Ownership and implementation

- Sol 6.1 High shell worker: `admin-shell.tsx`, scoped `admin.css`; 232px navigation / 64px collapsed rail / mobile drawer, breadcrumbs, skip link and administrator identity. Verified-email route gate remains in the server layout.
- Sol 6.1 High forms worker: shared form primitives, config sections, resource hooks, scoped form CSS and mutation/ownership tests. Existing config revisions, validation and routes remain authoritative. Pending saves disable inputs, Discard and duplicate submits; failures keep edits.
- Sol 6.1 High settings worker: existing DesktopSettings and its CSS, section-search/catalog helper and focused tests. No new settings services. Selection focuses the section heading and resets only its content scroll.
- Coordinator: overview, knowledge, release and audit presentation; captioned contained tables, source search and confirmation/cancellation; actual-component synthetic dev fixtures and acceptance. Provider injection defaults to the real same-origin client. Only development previews supply the in-memory fixture client.

## Required verification

Exercise expanded/collapsed shell; mobile drawer Close/Escape/return focus; keyboard skip; settings search/clear/no results; narrow section selection; long model identities; configuration invalid/pending/saved/conflict/error; skill validation; stored-only MCP copy; knowledge add/retry/cancel/delete identity; source/audit search/empty; current release metadata; large/long rows with internal horizontal scrolling. Check current app and gate regressions, typecheck, build and production runtime smoke. Synthetic fixtures never qualify live backend writes or real account persistence.

Keep screenshots in ignored `artifacts/ux/`, update HANDOFF after acceptance, and retain all unmet live-service dependencies. No push/merge/release is part of this migration slice.

## Acceptance result

Codex browser checks passed on labelled actual-component fixtures: 232/64px desktop admin navigation, 390/320px mobile drawer/Escape/trigger focus, configuration invalid/pending/saved/conflict/error, exact retained edits, skill validation/save, stored-only MCP after a synthetic save, unavailable/denied states, knowledge admission/search/cancel, empty knowledge list, audit search and release details. At 320px, knowledge tables scroll inside a 272px region while the document remains 320px. No real admin write, external source indexing, computer authorization or native change was performed.

Personal Settings passed search/no-results/clear/Escape, section heading focus, mobile collapse, long model identifiers and missing-provider labels. Browser review caught a global settings-content grid rule creating an implicit second mobile column; explicit scoped placement corrected it, and 320/390px were rechecked. The actual unconfigured main workspace also passed section search and Usage navigation at 390px without horizontal overflow. Account/provider persistence and metering remain unqualified.

An independent [review](admin-settings-review.md) reproduced a retained resource-response race; latest-request ownership and nonoverlapping slow polls now prevent obsolete rows or initial loads replacing newer data/edits. Focused regressions passed. Source detectors report no primary issues and advisory local token differences; this is not a measured accessibility score.

Screenshots: `artifacts/ux/admin-overview-desktop.jpg`, `settings-models-desktop.jpg`, `settings-models-mobile.jpg`. These captures show synthetic data, not deployed service health or model availability. Final aggregate checks are recorded in HANDOFF.
