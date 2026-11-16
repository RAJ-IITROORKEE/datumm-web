# DATUMM affectUI migration — accepted context

Author: RAJ-IITROORKEE  
Date: 12 November 2026  
Branch: `codex/ui-ux-foundation-2026-11-12`  
EGM intake: existing approved PLAN.md plus the user's latest reference instructions. This file records decisions and evidence; it is not a claim that the remaining migration is implemented.

## Problem and accepted outcome

The real application has several implemented UI slices, but the start screen, navigation and inspector still differ visibly from the selected affectUI screens. Component fixtures under `/dev/ux` helped verify states; the user explicitly rejected presenting those fixtures as the actual migrated product. Implementation and acceptance must reach the real application at `/` and its real account, settings, pricing, connector and admin routes.

The user has already approved application development on the separate branch. The latest request selects Option A and authorizes the full Elephant–Goldfish plan and fresh-context Sol 6.1 High reviews without further section pauses. Preserve existing code changes and earlier decisions. The larger right work area itself contains Design, Activity, Assets and Exports; there is no permanent fourth inspector column.

## Confirmed reference choices

- Sidebar and initial agent screen: https://www.affectui.com/screens/assistant-home . Match its layout, theme, typography, spacing and interaction model; adapt text and working actions to DATUMM.
- Right inspector: https://www.affectui.com/screens/agent-chat . Use its panel hierarchy and interaction model for **Design, Activity, Assets and Exports**. The reference itself exposes Brief, Assets and Activity; Exports is the user's explicit DATUMM addition.
- Free affectUI components: acquire and use their public source directly, retain the license, record origin and content hash, and adapt only where DATUMM's real contract or accessibility requires it.
- Pro affectUI components: inspect public previews, implement our own component, and compare visual and interaction evidence repeatedly. Do not acquire gated source. A passing build alone is not reference parity.
- Use REA guidance or tools for evidence collection and reconstruction. The built-in browser remains the requested reference/test browser.
- Latest explicit clarification: replace the **entire application's** theme colors and typography with the selected affectUI system. This includes existing screens and means old saved color palettes cannot silently override the new baseline. Preserve accessible modes and a recoverable copy of replaced preferences rather than retaining the old active visual identity.

## Prior approved decisions retained

PLAN.md D1–D12 remain the authority: stable chat beside a larger drawing/work area during work; same-mounted Focus drawing; compact real activity; review and annotations before direct geometry editing; one explicit Ask/Plan/Build composer; reports/tables/CSV/Mermaid; read-only agent-updated schedules and BOQs; Google-first onboarding; automatic non-native output revisions with history; individual accounts first; Free now, planned Pro $20/month and Max $99/month.

The home screen can center the greeting/composer before any task exists. The working layout must retain the approved chat/canvas arrangement once a task or drawing exists. This is a state distinction, not permission to discard working task context.

Native Revit changes continue to require exact approval and separate measured verification. Fake demo agents, metrics, model names, quotas, permissions, Undo and app integrations are not DATUMM capabilities merely because they appear in a reference.

## Actual source state

- Root route: `src/app/page.tsx` → `WorkspaceEntry` → real `Workspace`, or configured Clerk sign-in and `AccountOnboardingGate`.
- Sidebar: `src/components/workspace/sidebar.tsx`; shared shell: `workspace.tsx`, `desktop-titlebar.tsx`, `studio-workspace.css`.
- Chat: `workspace/conversation.tsx` and `workspace/composer.tsx`; models in `model-picker.tsx`.
- Inspector: `workspace/inspector.tsx`; shared real activity in `workspace/activity-panel.tsx`.
- Drawing/output/BOQ: `plan-canvas.tsx`, `workspace/output-workspace.tsx`, `workspace/review-report.tsx`.
- Account flow: `workspace-entry.tsx`, `onboarding/account-onboarding.tsx`, `/api/account/profile`; settings, billing and admin have real source implementations.

Baseline commit `e8b9b36` has earlier activity/review/settings migrations. Additional production bug fixes are currently uncommitted: composer readiness/Escape, initial Settings focus, connector status freshness, drawing/comment focus and identity reset, export/clipboard feedback ownership. Their component tests pass; they are not the requested new shell/inspector migration.

## Evidence from this phase

Actual localhost was opened at `http://localhost:3000/`, not a fixture route. A disconnected Enter attempt preserved the unsent text and Send remained disabled. Opening/reopening Settings focused its heading. Profile & account explicitly reported Sign-in unavailable. Test text was removed/restored without starting a task. The browser is left on the real root route.

Reference Assistant Home full preview: measured sidebar width 272px at the observed viewport, Inter, main surface `rgb(20,20,22)`, heading 28px/500 with 34px line height. These are observed reference values, not a universal responsive-width rule. Project expansion toggled; Search opened a command dialog; Escape from its Command input closed it and returned focus to Search.

Reference Agent Chat full preview: measured right inspector width 368px at the observed viewport, main surface `rgb(20,20,22)` and border `rgba(255,255,255,.08)`. Assets click showed an empty explanation/action. ArrowRight from Assets selected Activity. Loading and Empty preview states changed both chat and inspector content. Only these selected references/states were tested; the entire affectUI catalog is not qualified.

Ignored local evidence: `artifacts/ux/affectui-assistant-home-dom.txt`, `affectui-assistant-home-full.jpg`, `affectui-agent-chat-dom.txt`, `affectui-agent-chat-activity.jpg`, `affectui-agent-chat-brief.jpg`, `actual-localhost-before-shell-migration.jpg`.

## Environment and tool blockers

The linked Vercel project has no Development environment variables. `Datumm-opencode/.env` was inspected read-only with values suppressed; it contains provider configuration, not the three web variables. Its `apps/web/.env.example` contains empty Clerk placeholders and a local HTTP example; that is not a valid configured HTTPS origin for the present web proxy. No secrets or configuration were copied and the software repository was unchanged.

Real localhost onboarding needs `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and the correct `ORCHESTRATOR_URL`, plus existing Clerk/service permission for the localhost origin. Do not weaken auth or alter production origins to make the UI demonstration work. The current unconfigured-auth fallback skips onboarding; the revised plan must replace that silent fallback with a clear unavailable sign-in state.

REA MCP tools and an installed REA CLI were absent. The requested npm CLI acquisition was attempted outside the repository; `rea-agents@6.9.0` refused to start on Node 24.18.0 and requires a newer supported Node. No Node upgrade, MCP registration or analysis engine was installed. Browser observations above follow REA's evidence discipline but are not a successful REA tool analysis.

The free Tool Call Card public registry and upstream MIT license were downloaded to ignored artifacts for inspection. Its source has not yet been integrated into production. Other free component provenance and direct imports still need an explicit ledger.

## Alternatives weighed

- Rejected by the user: treating `/dev/ux` as the completed application migration. The root application and real account flow must receive the changes; fixtures remain supporting tests.
- User-selected approach: directly use free components and independently reconstruct Pro behavior from public previews. A generic restyling without measured reference comparison does not meet the request.
- User-selected boundary: individual accounts now; organizations, collaboration and the broader multi-agent/mobile/desktop roadmap remain later work.
- Existing contract boundary: source model revision is not an immutable BOQ revision history. Do not present local answer snapshots as the approved D9 service capability.

## Next EGM artifact

Option A is selected. `design_draft.md` contains the complete architecture, alternatives, risks, ordered M0–M9 file/test packages and fixed configuration/persistence contracts. The frozen dark/light reference contract and pinned free-source inventory are saved under `docs/ux/`. Actual free imports and the new shell/theme remain implementation work.

Formal initial Zoom Out/Catalyst, document-only Comprehension, three feature Critic rounds and intermediate Zoom Out have completed. Feature Critic converged on two consecutive clean rounds. Implementation Readiness found concrete contract gaps, repaired them in explicit adapter/work-area supplements and converged after five rounds with final rounds 4/5 clean. Stage reports and the finding ledger are separate from the earlier drafting assistants. Read the final consolidated report for the latest verdict; do not infer implementation or connected acceptance from planning review.
