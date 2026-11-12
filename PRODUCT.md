# DATUMM product context

Confirmed user direction, 12 November 2026.

DATUMM is an agent workspace for architects and Revit/BIM practitioners: a Cursor for Revit. Users ask questions, plan buildings, review drawings and outputs, annotate context and direct the agent to make changes. The current web application is a working prototype whose interface and end-to-end flows need improvement.

The immediate effort is collaborative UI/UX planning. The user will approve the plan before implementation. affectUI provides the initial visual foundation. Preserve the working system and isolate changes on the existing UI/UX branch.

## Agreed experience

- Stable chat beside a larger right drawing/work area, with Focus drawing.
- Ask / Plan / Build through one composer with selected room/view context.
- Compact agent activity with expandable details grounded in real execution.
- First viewer release supports review and annotation; edits are agent-driven.
- Structured reports, tables with CSV export and Mermaid diagrams; large outputs open beside chat.
- Reviewable schedules and BOQs from designs or Revit exports. The agent updates them; spreadsheet formulas and direct cell editing are outside this release.
- First-run onboarding: Google sign-in, name and professional domain, multiple use cases, optional Revit connector download/connection with Skip for now, then the workspace.
- Keep native execution approval explicit and bound to the reviewed proposal.

## Wider scope to specify

The onboarding sequence is agreed; its detailed fields and option taxonomy still need review. Settings, account/user management, billing, usage and administration are requested, with individual journeys and backend contracts still to agree. The user describes AWS-hosted OpenCode as the harness; reconcile older repository documentation before modifying integrations.

Team collaboration, broader multi-agent workflows, smartphone integration and a richer desktop product are future directions. Do not imply unavailable capabilities through decorative controls.

Success means a practitioner can understand the current project/model/version, ask or plan confidently, inspect the result, annotate it and request a controlled change without losing their place. Numeric success targets and the launch audience remain to be defined.

Decision source: [PLAN.md](PLAN.md). Current context: [PROJECT.md](PROJECT.md).
