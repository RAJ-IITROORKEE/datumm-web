# DATUMM Web — project context

Updated 16 November 2026. Start with this file, [PLAN.md](PLAN.md) and [the current handoff](docs/ux/HANDOFF.md). The [historical project ledger](docs/ux/history/project-before-workspace-acceptance-2026-11-15.md) preserves prior observations and setup without competing current next-step instructions.

**Current instruction: hold for progress review.** The user requested the consolidated handoff and updated plan, then will decide how to continue. Do not automatically implement another phase or request AWS login. [HANDOFF](docs/ux/HANDOFF.md) records the source/test checkpoint, local-vs-hosted limits, preserved candidates and proposed priorities; [AG-UI phase checkpoint](AGUI_MIGRATION_PLAN.md#review-checkpoint--16-november-2026) supersedes old continuation instructions. Latest implementation remains qualified at 603 frontend tests, 180 backend tests + 26 subtests, TypeScript/build/21 runtime checks; its 32 manifest hashes and five original frozen repair hashes matched during this documentation update.

## Product and current authorization

Latest 16 November direction: user approved **Option B through A for the middle chat only**. Input, streamed process/tool/task updates, questions and agent-composed interactive responses lead this implementation. Right work area, floor-plan shared-state migration and admin expansion are deferred. Read [AGUI_MIGRATION_PLAN.md](AGUI_MIGRATION_PLAN.md) and its chat-scope addendum. Earlier count repair stays paused. Preserve exact native authority and existing durable task/command recovery; replace the chat wire incrementally, with existing AI SDK rendering as an internal compatibility boundary where needed. Do not claim low latency or generative composition is complete merely because AG-UI events transport successfully.

DATUMM is an agent-led web playground for individual Revit/BIM practitioners: ask, generate a concept, review 2D/3D, annotate, revise and export. It is a lighter web experience; fuller drafting/native automation and desktop parity are separate work. Product truth is in [PRODUCT.md](PRODUCT.md); affectUI theme/Inter and visual roles are in [DESIGN.md](DESIGN.md).

The user approved the Elephant–Goldfish plan and actual implementation, then authorized the [workspace acceptance upgrade](docs/ux/workspace-acceptance-upgrade.md): chat, right work area, responsive behavior and plan cleanup. That scoped pass is implemented and browser/technical qualified with Terra 6.1 High workers. Continue from the current handoff and remaining product register; do not reopen historical next-step instructions. Admin expansion is deferred. Merge/release remains a later user decision.

## Working constraints

- Reuse branch `codex/ui-ux-foundation-2026-11-12`; preserve main and all preexisting dirty work. Do not delete unrelated files, dependencies, local environment files or other worktrees.
- Read installed Next.js documentation in `node_modules/next/dist/docs/` before application edits. This checkout uses Next 16.4.3 / React 19.3. Read [.agents/SKILLS.md](.agents/SKILLS.md) and use relevant installed guidance; skills do not configure live tools, MCP servers or providers.
- Use the Codex built-in browser for references and localhost. Record observed interaction separately from inference/inaccessible states; preserve licensed free source and independently reconstruct public Pro behavior.
- Keep actual account/task/turn/source identity, native approval, saved plans, immutable report revisions, exports and draft recovery intact. No UI navigation or Markdown can grant native authority.
- Native model context requires the correct connection and permission; general questions and web concepts do not. Web plan acceptance is separate from native Build approval.
- Keep current service capabilities honest. The deployed AWS service exposes the existing datumm-orchestrator v2 contract; do not imply that separate OpenCode preview/native features are integrated merely because the target harness is OpenCode.

## Current qualified baseline

Latest [local producer continuation](docs/ux/agui-composition-producer.md): optional agent-chosen illustrative layouts now pass final-answer checkpoint and exact completion projection into the chat's scoped hash gate.603 frontend tests, 180 backend tests + 26 subtests, TypeScript/build/21 runtime checks and captured-graph AG-UI browser replay passed. Live-provider/container/hosted deployment remain unqualified; completion proof remains limited by the retained event tail. Original frozen backend repair is preserved; new isolated candidate is uncommitted. Right work area is unchanged.

Earlier renderer-only [local chat continuation](docs/ux/agui-local-chat.md): user cannot authenticate to AWS; independent chat development/testing continues locally. Historical process labels/grouped attempts and a read-only illustrative composition foundation passed584 tests, TypeScript, production build and18 runtime checks, with actual Ask/reload/history and controlled composition/mobile browser verification. No backend/cloud changes; actual agent presentation emission and durable historical completion bindings remain pending. Right work area remains unchanged.

Earlier hosted-question [chat continuation](docs/ux/agui-chat-continuation.md): hosted AG-UI question resume passed565 tests/TypeScript/build/17 runtime checks and actual grouped-answer/reload browser flow. Backend general-Plan admission repair passed159 API tests +9 subtests and scoped independent review on isolated base 188 branch, but remains uncommitted/undeployed; cloud/real-planner/live Plan validation is pending. Right work area is unchanged. See current handoff for exact source identities and AWS renewal state.

Earlier transport-only AG-UI slice: [implementation packet](docs/ux/agui-chat-migration.md) records554 frontend tests, TypeScript, build,16 production runtime checks and actual Codex Ask/follow-up/question/reload with390px containment. Existing right-work-area source is unchanged. Advanced dynamic composition, generic AG-UI resume, full replay and true provider-answer streaming remain pending. Earlier baseline paragraphs below retain historical scope.

The [additional follow-through](docs/ux/workflow-followthrough.md) passed Light/reduced-motion, nested keyboard dismissal, reversible offline-draft/reload and latest Run record download checks on the same 24 inspected UI source files. On 16 November, 535 frontend tests and TypeScript passed again, the 24 hashes still matched, and actual Codex reload restored v3 plus recorded Activity usage. A new 334-file current source snapshot records today's test inputs without retroactively proving the older production build. The user's go-ahead adopts [ask-once alternative-count clarification](docs/ux/alternative-count-clarification.md); implementation and review continue from the tested backend base. The rejected permissive default is historical. AWS renewal remains pending for cloud qualification.

Hosted backend source `188ebc0bc0599ff84f3760aaef24711e522972ae` is unchanged by this UI pass. [Saved revision confidence](docs/ux/saved-revision-confidence.md) records actual generation, planned/no-checklist revision and reload, with exact saved versions and native-save limits. [Project Brief persistence](docs/ux/project-brief-persistence.md) and [proposed room-schedule history](docs/ux/report-revision-history.md) are qualified within their scopes. The current frontend gate passed 535 tests, TypeScript, production build, 13 runtime checks and actual 320–1440 px browser journeys. Old test counts retain only their original source scope.

The actual app runs on localhost:3001. Development fixtures are useful for controlled states but do not qualify live service behavior. Keep bulk screenshots/logs in ignored `artifacts/ux/` and concise evidence in documentation. No secrets belong in chat, screenshots or committed reports.

## Design commitments

Single left navigation (224 px default, recognizable collapse/open); stable chat and larger resizable right work area. Design is drawing-only; Activity shows actual checklist/process and truthful usage; Assets/Exports host supported previews and revision-bound downloads. Ask/Plan/Build share one composer. Contextual suggestions appear only as an empty-input placeholder. Dark drafting and separate white sheets remain selected; direct wall/room editing is outside this release. Exact decisions and reference links are in [PLAN.md](PLAN.md#component-reference-map).

## Remaining product work

See [the current gap register](docs/ux/full-migration-gap-register.md). Native BOQ/RVT import, broader Revit execution/read-back, desktop parity, research quality, billing provider/entitlements/quotas and release acceptance are not completed by the UI migration. Individual Free is current; Pro $20/month and Max $99/month remain planned with payments disabled. Organizations/team collaboration and smartphone companion are future scope. Preserve version-2 paused-checkpoint compatibility and the documented graph/backup limits.
