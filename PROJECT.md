# DATUMM Web — UI/UX renewal

Status: user approved the plan and development on 12 November 2026. Implementation and local verification are in progress; merge/release remain later decisions.
Date: 12 November 2026 (Asia/Kolkata).
Working branch: `codex/ui-ux-foundation-2026-11-12`.
Baseline: `749587903de58957d410a7bfc8637888c981899c` (remote main, PR #10).
Preserved local main: `09ea4bf7d2da13f3dbc4162f34d0097dfe8d6edf`.

## Product intent

Build a complete, coherent web experience for architects and BIM/Revit practitioners using DATUMM's agent. The existing application is a working prototype. The immediate priority is its interface, controls, onboarding and end-to-end user journeys. The web product should be useful independently and connect clearly to Revit for native operations. A more capable desktop product follows later.

The user identifies AWS-hosted OpenCode as the target agent harness. Integration verification on 12 November found production behind AWS CloudFront exposes the existing `datumm-orchestrator` v2 task contract, while the hosted OpenCode preview is separate, has isolated history and reports native operations unavailable. Older Azure-location notes are stale. Read `docs/ux/backend-contract-evidence.md`; do not conflate hosting provider with runtime contract or migrate the harness implicitly.

## Instructions and boundaries

- Work on this branch; keep main preserved. Integrate and merge only at the end, after the agreed design, implementation and verification phases and the user's release decision.
- Foundation, skill setup and planning are complete enough for the approved implementation. Continue development and validation on this branch; preserve unresolved service dependencies explicitly.
- Use the Codex built-in browser for the reference walkthrough and live DATUMM observations.
- Ask questions during discovery, recording answers and open decisions here. Do not silently turn assumptions into requirements.
- Read relevant installed Next.js documentation in `node_modules/next/dist/docs/` before writing application code. This project uses Next 16.4.3 and React 19.3.
- Keep real hosted behavior, account boundaries, saved chats, plans, exports and explicit native-operation approval intact during the redesign.
- Skills are development guidance. Installing them does not configure DATUMM's runtime skills, MCP servers or model providers.

## Scope to plan

| Area | Required planning coverage | Dependency to verify |
| --- | --- | --- |
| App shell | Navigation, project/chat hierarchy, panel resizing, shortcuts, contextual actions, responsive layout | Existing routes and persisted navigation state |
| Chat and agent panel | Ask/Plan/Build, model controls, reasoning/tool summaries, agent progress, clarification, stop/resume/retry, recovery | Hosted event schema, cancellation, concurrency and capability support |
| Onboarding | First visit, sign-in, product walkthrough, first useful task, optional Revit connection, resumable/skippable help | Clerk, account admission and connector pairing |
| Projects | Create/select/search, chat organization, context visibility, saved work and return journeys | Project APIs and ownership |
| Plan review | 2D/3D, annotation, properties, versions, comparisons, acceptance, exports and print/PDF readability | Plan identity/version and annotation persistence |
| Revit connection | Device status, install/pair/connect, active document, supported operations, disconnect/reconnect | Connector and active model identity |
| Native changes | Preview, exact approval, execution status, verification, failure/recovery | Server/connector authority; never infer approval from UI navigation |
| Settings | Account, appearance, accessibility, notifications, model defaults, connections, help | Distinguish user/project/org/system settings |
| User management | Individual profile, sessions, account lifecycle | Existing identity and authorization capabilities; organizations/team roles deferred by D10 |
| Billing | Free / Pro / Max pricing and subscription-usage design; payment collection later | User confirmed Pro $20/month and Max $99/month, free tier current; provider, quotas, entitlements and payment contract undecided |
| Usage | Requests/tokens/cost or credits, quotas, time ranges, attribution, limits and freshness | Authoritative metering; never present estimated spend as billed spend |
| Admin | Runtime configuration, knowledge, release management and audit | Existing admin gates and backend permissions |

Future work: team collaboration, multi-agent coordination, smartphone companion/synchronization and the richer desktop application. Reserve appropriate seams in the architecture; do not include speculative controls in the current UI without a usable behavior and agreed scope.

## Baseline evidence and limits

Evidence below comes from the initial repository/browser inspection in this chat, not a full UX audit:

- Repository: `RAJ-IITROORKEE/datumm-web`; production entry: <https://datumm-web.vercel.app/>.
- Latest baseline includes admin pages, public chat sharing, refined plan drawing/PDF exports, Revit connection guidance and the alpha.40 download metadata.
- The live signed-in workspace loaded project/chat history. Search and the Plan/Build/Ask menu responded. The workspace was left open in the Codex browser.
- Live status reported Revit disconnected. No new agent run, native operation or billing transaction was performed.
- Admin showed no custom runtime skills and no MCP servers. MCP configuration UI explicitly described stored configuration without agent tool activation.
- Browser console reported Clerk development keys. Include production authentication readiness in the release checklist.
- Before branch creation, local main was 12 commits behind remote main. All 33 tests on that older checkout passed. Its type check failed in generated `.next` files referencing absent newer admin/share routes. These results are not validation of this new baseline.
- Git identified 20 local branches and five worktrees. Two nominally unmerged branches had patch-equivalent changes on main. Do not delete other branches/worktrees as cleanup.

## Initial UX hypotheses to investigate

1. First-use guidance may not clearly distinguish tasks that work on the web from tasks requiring a connected Revit model.
2. Chat, plan canvas, agent activity and review actions need a consistent hierarchy across empty, running, waiting and completed states.
3. Account/settings, usage and commercial workflows need an explicit information architecture and backend capability inventory.
4. Users need clearer model/document/version context before accepting plans or native modifications.
5. Long chat histories, narrow panels, keyboard use and mobile views need systematic testing.

These are planning hypotheses derived from the brief and initial view. Confirm or reject each using observed behavior; do not describe untested journeys as defects.

## Reference investigation

Confirmed by the user on 12 November: affectUI, <https://www.affectui.com/screens/app-shell-flat>, is the starting reference, including its initial colors and typography. The component map and approved decisions D1–D10 are in [PLAN.md](PLAN.md). Streamdown is the approved direction for structured reports, tables, diagrams and agent-updated review schedules/BOQs; no spreadsheet formula engine or direct cell editing is required. Non-native sheet/BOQ revisions become current automatically with change summaries and history. Initial account scope is individual users; organization invitations/team roles are deferred. Onboarding starts with Google sign-in, then name/domain and multiple use cases, an optional Revit connector step with Skip for now, and the workspace; see [onboarding specification](docs/ux/onboarding.md).

Confirmed by the user on 12 November: “Modulo” meant morluto/REA, already present globally and now included as repository guidance. Browser observation is sufficient for reference interaction mapping; REA server/native analysis tools are not required just to inspect a website.

For each user-selected reference screen, inspect the visible UI in the Codex browser and record:

- URL, date, viewport, theme, authentication state and screenshot identifier.
- Entry route and user goal; navigation, hover, focus, keyboard and click behavior.
- Menu/popover/dialog lifecycle, dismissal, back navigation, persistence and scroll ownership.
- Loading, empty, error, permission-denied, disconnected and success states when accessible.
- Layout measurements, typography, color roles, density, icons, spacing and motion.
- Which details should be faithfully reproduced, adapted for DATUMM, or omitted, and why.
- Distinguish observed behavior from inferred or inaccessible behavior. Respect source asset/code licenses when importing actual materials.

Use the same observation format for DATUMM, linking each proposed change to a user problem and a reference observation. Avoid capturing personal data or credentials in committed screenshots. Keep bulky raw captures under ignored `artifacts/ux/`; curate only necessary, sanitized evidence into documentation.

## Planning sequence and deliverables

1. **Foundation (this task):** dedicated branch, scoped skill installation with provenance, product handoff, safe repository hygiene.
2. **Current-state walkthrough:** inventory routes, controls, capability boundaries and key Revit-user journeys; produce an evidence-backed issue register with severity and reproduction steps.
3. **Reference walkthrough with user:** inspect the exact supplied screens, capture behavior, discuss preferences and record decisions. Do not choose a final visual direction beforehand.
4. **Experience architecture:** agreed navigation map, personas/jobs, first-run journey, screen inventory, state matrix and web/desktop/mobile capability boundaries.
5. **Design specification:** tokens, component hierarchy, content/copy, responsive rules, accessibility, wireframes and representative high-fidelity screens.
6. **Integration specification:** map every control to an existing API, a required backend addition or a future capability; define ownership, permissions, metering and failure handling.
7. **Implementation plan for user review:** prioritized vertical slices with file/module boundaries, dependencies, acceptance criteria and test strategy. Development starts after the user agrees to this plan.
8. **Build and validate later:** implement agreed slices, review rendered UI in browser, verify regressions and production readiness, then make the final merge/release decision.

Proposed planning artifacts (create when their evidence exists):

- `docs/ux/current-state.md` — route/control inventory, observations and issue register.
- `docs/ux/reference-observations.md` — reference behavior and DATUMM mapping.
- `docs/ux/journeys.md` — user journeys, navigation and state matrix.
- `PRODUCT.md` — agreed audience, product boundaries and outcomes.
- `DESIGN.md` — agreed visual system and component rules.
- `docs/ux/integration-contracts.md` — API/capability mapping and unresolved backend work.
- `docs/ux/implementation-plan.md` — approved sequence, acceptance tests and rollout.

## Revit-user priorities

- Get to a useful Ask or Plan task without requiring a native connection unnecessarily.
- Make project, document, level, units and current plan version unambiguous where relevant.
- Keep the user's prompt and work recoverable through disconnects, reloads and long runs.
- Make question answering, plan review, annotation and comparison understandable without exposing raw implementation logs by default.
- Make approval consequences explicit and bind approval to the exact reviewed proposal.
- Show native execution and verification separately; a preview is not evidence that Revit changed.
- Preserve read-only investigation as a clear, useful workflow.

## Acceptance criteria to refine during planning

- A first-time user can sign in, understand Ask/Plan/Build, create a project and finish a first useful task.
- Every planned screen has loading/empty/error/success/permission states and clear recovery actions.
- Keyboard navigation, focus restoration, accessible labels, contrast, reduced motion and responsive behavior meet the agreed WCAG 2.2 AA target.
- Streaming and saved history remain consistent; no duplicate tasks or lost drafts during retry/reconnect.
- Plan identity, native authority and exact approval boundaries survive the redesign.
- User management, billing and usage reflect real server-authorized state, with honest unavailable states where APIs are missing.
- Performance budgets and supported viewport/browser matrix are agreed before implementation.
- Run relevant unit/contract checks, typecheck, production build, runtime smoke tests and targeted browser journeys on the actual release candidate. Use test accounts/sandbox billing for consequential workflows.
- Authentication environment, API authorization, deployment configuration and rollback are verified before production release.

## Questions for the next discussion

1. Output revision workflow and first-use journey; selected reference URLs and initial visual foundation are recorded in PLAN.md.
2. Primary launch user: individual architect, BIM engineer, small studio or organization?
3. Which journeys are mandatory for the first web release, and which can wait?
4. Exact spacing, responsive behavior and accessibility adjustments within the agreed affectUI visual foundation?
5. Which settings belong to users or projects? Organization invitations/team roles are deferred by D10.
6. Billing provider, plans, charging unit, quotas and source of usage data?
7. Which AWS OpenCode endpoints/events and capabilities are deployed today?
8. What should phone access support initially: chat, approval, status, plan viewing or full editing?
9. Which Revit versions, units, project types and connector states define the launch test matrix?

## Repository hygiene and handoff

No tracked application file has been identified as safely obsolete during this preparation. Preserve source, tests, licenses, architecture documents, plan-viewer evidence and generated Next.js agent guidance. Installed skills belong in `.agents/skills/`; their source pins and file digests are recorded in `.agents/skills-lock.json`.

Exclude development skills, planning documents and captures from deployment uploads. Ignore Python caches generated by skill utilities. Do not delete `.next`, dependencies, environment files, other worktrees or user files as incidental cleanup. Rebuild generated output deliberately when the implementation/testing phase needs a clean baseline.

Current artifacts: [PLAN.md](PLAN.md), [PRODUCT.md](PRODUCT.md), [current state](docs/ux/current-state.md), [reference evidence](docs/ux/reference-observations.md), [structured outputs](docs/ux/structured-output.md) and [phase handoff](docs/ux/HANDOFF.md).

Current development: stable middle chat/right work area, preserved-viewer Focus drawing, one Ask/Plan/Build composer, compact real activity, Streamdown/Mermaid and answer-output browsing, Clerk-backed onboarding/profile, settings/usage/free-tier billing and planned pricing. Deployed AWS/Clerk/Revit behavior and authoritative BOQ revision APIs remain unverified. See [implementation review](docs/ux/implementation-review.md) and [phase handoff](docs/ux/HANDOFF.md) for actual verification results. No push, merge or deployment is part of this implementation checkpoint.

Local verification checkpoint: 59 tests, TypeScript and production build passed; production runtime smoke passed, including public pricing and production rejection of the development fixture route. Browser review covered desktop and 390px layouts plus clearly labelled synthetic onboarding/drawing/output fixtures. Pricing is available at `/pricing` and Settings → Billing, with current Free and planned Pro $20/month / Max $99/month. Numerical allowances and paid payment integration remain undefined.

Latest integration checkpoint: `/connect` computer review/approval and read-only Schedules & BOQ are implemented against inspected source contracts. An existing authenticated live proposed report parsed successfully; measured/verified reports and real device approval remain untested. Final local checks passed 71 tests, TypeScript, production build and runtime smoke. See the top of [HANDOFF](docs/ux/HANDOFF.md) and [integration review](docs/ux/integration-review.md). BOQ source model revisions are explicitly distinct from saved report history; no revision-storage API or paid billing provider was invented.

Latest tooling instruction: use GPT-6.1 Sol at high reasoning for parallel sub-agents. Workspace, integration/output and onboarding/account planning were delegated with separate document ownership. Impeccable's project hook was installed and its doctor check returned no findings after updating PRODUCT.md to the current schema. No new skill download was necessary; the repository skill was already installed. Hook execution itself still depends on Codex loading/trusting the manifest.

Latest acceptance work adds account/task-scoped browser text draft recovery, revision-bound admission, service retry, stable report snapshots and recoverable onboarding validation. Codex browser testing covered actual disconnected workspace at desktop/390/320px and labelled report/stream/onboarding fixtures. See [HANDOFF](docs/ux/HANDOFF.md) for current checks, screenshots, limits and next connected-service dependency; earlier numerical checkpoints above remain historical.

Latest user steering continues the proposed affectUI migration before live-service qualification. Settings/admin forms, navigation and data surfaces follow the same foundation; source boundaries and reference evidence are recorded in [the settings packet](docs/ux/admin-settings-migration.md). The requested review/approval/change-summary slice is also implemented; read [its component/state ledger](docs/ux/review-panels-migration.md) and latest HANDOFF. Backend revision storage, payment activation and release remain separate dependencies.

Settings/admin verification checkpoint: 102 tests, TypeScript, production build and all 13 production runtime checks passed. Codex browser validation covered desktop/390/320px and a real local Settings navigation journey; admin writes were synthetic fixture operations only. Admin entry and proxy gates stayed intact. See HANDOFF for exact outcomes and preserved limitations.

Review migration verification: 129 tests, TypeScript, production build and all 13 runtime checks passed. Codex browser checks covered pending/failed/expired/unavailable/stale/unknown/unverified/verified states at desktop/390/320px using labelled actual-component fixtures. No real native write is claimed. Current checks and remaining live qualification are recorded in HANDOFF; earlier numerical checkpoints above are historical.

Latest activity migration: D2 / W-D / I4 compact activity, recorded tool evidence and the shared Activity inspector are implemented. Sol 6.1 High workers plus an independent reviewer preserved task/turn identity, lifecycle authority, existing projection helpers and native boundaries. Codex browser checks covered desktop/390/320px fixtures and actual empty-workspace navigation. Final checks passed 157 tests, TypeScript, production build and all 13 runtime checks. See [activity packet](docs/ux/activity-migration.md), [independent review](docs/ux/activity-review.md) and latest HANDOFF; connected history/streaming/native qualification remains outstanding. No push, merge or deployment occurred.
