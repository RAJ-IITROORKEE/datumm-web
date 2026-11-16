# DATUMM Web — project context

Stable product context and constraints. It holds no status: the current state and next step are in [docs/ux/HANDOFF.md](docs/ux/HANDOFF.md), decisions and phases in [PLAN.md](PLAN.md), rules for agents in [AGENTS.md](AGENTS.md). Earlier observations and setup are preserved in [the historical ledger](docs/ux/history/project-before-workspace-acceptance-2026-11-15.md); its next-step text is not current.

## Product

DATUMM is an agent-led web playground for individual Revit/BIM practitioners: ask, generate a concept, review 2D/3D, annotate, revise and export. It is the lighter web experience; fuller drafting, native automation and desktop parity are separate work. The user's framing: **a Cursor for Revit**. The web workspace supports architectural reasoning and review; native modifications still need exact approval and verified execution. Product truth is in [PRODUCT.md](PRODUCT.md); design roles, tokens and the screen map are in [DESIGN.md](DESIGN.md).

## Direction

The interface moves to AG-UI with shadcn-style affectUI components across the whole app, in phases, middle chat first (decision D22 in [PLAN.md](PLAN.md)). The UI connects to the existing agent harness before admin capability is expanded (D23). Each phase needs an approved packet. Merge and release are later, separate decisions.

## Working constraints

- Work on branch `codex/ui-ux-foundation-2026-11-12`. Preserve `main`, the backend candidates and unrelated local files. Do not delete files, dependencies or environment files without approval.
- Read the installed Next.js docs in `node_modules/next/dist/docs/` before application edits (Next 16.4.3, React 19.3). Skills in `.agents/skills/` are instructions only; they do not configure live tools, MCP servers or providers.
- Use an available browser tool for references and localhost, and name it. Record observed behavior separately from inference and from inaccessible states. Use licensed free source; reconstruct public Pro behavior independently.
- Keep account, task, turn and source identity, native approval, saved plans, immutable report revisions, exports and draft recovery intact. No navigation or Markdown grants native authority.
- Native model context needs the right connection and permission; general questions and web concepts do not. Accepting a plan on the web is separate from native Build approval.
- Keep service capabilities honest. The deployed service exposes the existing datumm-orchestrator v2 contract; do not imply that OpenCode preview or native features are integrated just because the target harness is OpenCode.
- Keep bulk screenshots and logs in the ignored `artifacts/ux/` and concise evidence in `docs/ux/`. No secrets in chat, screenshots or commits.
- The app runs on `http://localhost:3001`. Development fixtures help with controlled states but do not qualify live service behavior.

## Design commitments

Single left navigation (224 px default, recognizable collapse and open); stable chat and a larger resizable right work area. Design is drawing-only; Activity shows the actual checklist and process with truthful usage; Assets and Exports host supported previews and revision-bound downloads. Ask, Plan and Build share one composer. Contextual suggestions appear only as the empty-input placeholder. Dark drafting canvas and separate white sheets stay; direct wall and room editing is outside this release. Exact decisions and reference links are in [PLAN.md](PLAN.md#component-reference-map).

## Remaining product work

See [the gap register](docs/ux/full-migration-gap-register.md). Native BOQ and RVT import, broader Revit execution and read-back, desktop parity, research quality, billing provider, entitlements and quotas, and release acceptance are not completed by the UI migration. Individual Free is current; Pro $20/month and Max $99/month are planned with payments disabled. Organizations, team collaboration and the smartphone companion are future scope. Keep version-2 paused-checkpoint compatibility and the documented graph and backup limits.
