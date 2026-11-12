# DATUMM product context

<!-- impeccable:product-schema 1 -->

Confirmed user direction, 12 November 2026.

## Platform

web

## Users

Architects and Revit/BIM practitioners. The initial release serves individual accounts; organizations, invitations and team roles are deferred. The specific launch specialty remains open.

## Product Purpose

DATUMM is an agent workspace for architects and Revit/BIM practitioners: a Cursor for Revit. Users ask questions, plan buildings, review drawings and outputs, annotate context and direct the agent to make changes. The current web application is a working prototype whose interface and end-to-end flows need improvement.

The user approved the UI/UX plan and implementation on 12 November 2026. affectUI provides the initial visual foundation. Preserve the working system and isolate changes on the existing UI/UX branch; merge/release remain later decisions.

## Positioning

The user's framing is a Cursor for Revit: an agent-led architectural workspace joining conversation, drawing review, schedules and controlled native actions. This is intended positioning, not a claim of feature parity with Cursor or Revit.

## Operating Context

The web workspace can be used before connecting Revit. Onboarding explicitly allows skipping the connector. Revit-connected tasks depend on the current native model and connection state. Design and Revit-export outputs must identify their source and revision.

## Agreed experience

- Stable chat beside a larger right drawing/work area, with Focus drawing.
- Ask / Plan / Build through one composer with selected room/view context.
- Compact agent activity with expandable details grounded in real execution.
- First viewer release supports review and annotation; edits are agent-driven.
- Structured reports, tables with CSV export and Mermaid diagrams; large outputs open beside chat.
- Reviewable schedules and BOQs from designs or Revit exports. The agent updates them; spreadsheet formulas and direct cell editing are outside this release.
- First-run onboarding: Google sign-in, name and professional domain, multiple use cases, optional Revit connector download/connection with Skip for now, then the workspace.
- Keep native execution approval explicit and bound to the reviewed proposal.
- Non-native sheet/BOQ updates automatically become current with a change summary and previous revisions available; this never approves native model changes.
- Free tier now; subscription-based usage billing later. Confirmed individual prices: Pro $20/month and Max $99/month. Pro offers planned higher usage for professional work; Max targets heavy use with planned priority processing. Provider and quotas remain undefined; do not imply unlimited usage or enable paid checkout.

## Capabilities and Constraints

The onboarding sequence is agreed; its detailed fields and option taxonomy still need review. Settings, account/user management, billing, usage and administration are requested, with individual journeys and backend contracts still to agree. The user describes AWS-hosted OpenCode as the harness; reconcile older repository documentation before modifying integrations.

Team collaboration, broader multi-agent workflows, smartphone integration and a richer desktop product are future directions. Do not imply unavailable capabilities through decorative controls.

Success means a practitioner can understand the current project/model/version, ask or plan confidently, inspect the result, annotate it and request a controlled change without losing their place. Numeric success targets and the launch audience remain to be defined.

## Brand Commitments

Keep DATUMM branding. The user selected affectUI as the initial visual reference, including its theme colors and typography; detailed visual evidence lives in docs/ux/reference-observations.md. Later brand changes are a separate decision.

## Evidence on Hand

Working source and a live saved-plan walkthrough are documented in docs/ux/current-state.md. Public affectUI previews and Streamdown's playground were inspected; evidence limits and links are recorded in docs/ux/reference-observations.md and docs/ux/structured-output.md. The user's Revit screenshot is pending. Do not invent production backend verification, customer testimonials, pricing or performance results.

## Product Principles

- Keep the user's project, model and output revision identifiable.
- Give conversation, review and agent-directed changes a coherent workflow.
- Keep native execution approval distinct from discussion or output generation.
- Preserve working behavior and recoverable context while improving the interface.
- Represent only actual capabilities and distinguish unavailable or future functionality.

Decision source: [PLAN.md](PLAN.md). Current context: [PROJECT.md](PROJECT.md).
