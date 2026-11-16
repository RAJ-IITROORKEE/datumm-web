<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DATUMM Web — rules for every agent

DATUMM Web is the browser workspace for individual architects and Revit/BIM users: ask, generate a concept, review 2D/3D, annotate, revise and export. It is a Next.js frontend over a separate hosted task service. Claude agents also read [CLAUDE.md](CLAUDE.md) (it imports this file and adds the orchestration guide).

## 1. Read order

1. This file.
2. [docs/ux/HANDOFF.md](docs/ux/HANDOFF.md): current state, last verified checks, next step.
3. The one active phase packet that the handoff links to.
4. The `README.md` of the folder you are editing.

Read anything else only when one of these links to it. [PROJECT.md](PROJECT.md) (product context and constraints), [PLAN.md](PLAN.md) (decisions and phase table), [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) are references. `docs/ux/history/`, `docs/egm/` and older packets are history: their "next step" text never overrides the handoff.

## 2. Structure

```text
src/app/          routes, layouts, API route handlers (Next.js App Router)
src/components/   UI. ui/ = shadcn-style primitives; vendor/affectui/ = pinned affectUI sources;
                  workspace/ = chat, sidebar, work area; admin/, billing/, onboarding/, review/,
                  connections/, ai-elements/, dev/ (development-only fixtures)
src/lib/          pure logic (.mjs + .d.mts types), AG-UI adapter (agui/), theme tokens (themes/)
tests/            node --test files, one per lib module or behaviour, plus runtime-smoke.mjs
docs/             ux/ (handoff, phase packets), agui/ (research and plan), egm/ (original design
                  reports), backend-candidates/ (patches), plan-viewer/ (screenshots)
lat.md/           knowledge graph: architecture and contract notes linked from code with @lat
.agents/          installed skills (instructions only, not tools)
artifacts/        git-ignored local evidence and the two live backend candidates
```

The hosted backend (FastAPI/LangGraph orchestrator) is **not** in this repo. Backend candidates under `artifacts/ux/` are separate Git clones with their own `AGENTS.md`; read it before touching one.

## 3. Tech stack

Verify versions in `package.json` and the lockfile, not from memory.

- Next.js 16.4.3 (App Router, built with `--webpack`), React 19.3, TypeScript 5.9, Tailwind CSS 4.3.
- Auth: Clerk. Chat: AG-UI (`@ag-ui/core`) bridged into AI SDK (`ai`, `@ai-sdk/react`) rendering; answers render with Streamdown.
- UI: Radix, `class-variance-authority`, `tailwind-merge`, `lucide-react`, Inter Variable. There is no `components.json`; do not run the shadcn CLI without approval.
- Drawing: Three.js for 3D, Resvg/Sharp for server-side preview export.
- Validation: Zod. Tests: Node's built-in runner. Deploy: Vercel (Node 22 or newer).

## 4. UI direction

All agent-to-UI interaction moves to AG-UI, and all interface components come from affectUI-based shadcn-style primitives. The middle chat migrates first; every later surface (right work area, settings, admin) needs its own approved plan before it starts. Design rules, tokens and the screen map are in [DESIGN.md](DESIGN.md).

- Reuse `src/components/ui` and `src/components/vendor/affectui` before writing a component. Vendored files keep their pinned digests; change them only through the recorded patch process in `vendor/affectui/PROVENANCE.md`.
- Reconstruct public Pro previews independently. Never use gated source.
- Agent-composed UI is validated declarative data from a bounded registry. Never render model-generated React, HTML or JavaScript.
- "Thinking" means safe operational summaries, never private reasoning.
- Suggestions appear only as the empty composer's placeholder, not as chips.

## 5. Skills

Skills are instruction files in `.agents/skills/`, not tools. Read [.agents/SKILLS.md](.agents/SKILLS.md), then open only the one that fits the task.

| Task | Skill |
| --- | --- |
| UX shaping, critique, empty/error states, UX copy | `impeccable` |
| Interaction, accessibility, responsive, typography search | `ui-ux-pro-max` |
| Interface and accessibility review | `web-design-guidelines` |
| React rendering and data-fetching performance | `react-best-practices` |
| Chat, tool and conversation components | `ai-elements` (legacy; verify current APIs) |
| Reference behaviour that source cannot show | `reverse-engineer-anything` |
| Documentation prose | `writing-guidelines` |
| Print/export inspection | `pdf` |

## 6. Rules that never bend

- Composition, navigation, Markdown or a saved answer never authorizes a Revit change. Native approval stays bound to the exact document, revision and proposal.
- Preserve owner/task/turn/execution isolation, durable commands and receipts, versioned questions and drafts, immutable plans and reports, and the full-answer fallback.
- No secrets in chat, docs, screenshots or commits.
- No new dependency, other harness, CopilotKit or A2UI without approval.
- No claim of token streaming, hosted behaviour, performance gain or a passing check that was not run in the current session. Quote recorded results as recorded, with their date.
- Keep service capabilities honest: the deployed service is the existing orchestrator v2 contract.

## 7. Plan → build → checkpoint

1. **Classify before planning.** For each feature, check source and mark it: implemented and tested, implemented but under-tested, local or controlled only, planned, or deferred. Cite `path:line`. Documents claim; code decides.
2. **Write the phase packet first** in `docs/ux/`: scope, files, reused components, schema or event changes, dependencies, risks, tests, browser scenarios, acceptance criteria, rollback.
3. **Get approval** for the packet before changing application code.
4. **Build one bounded phase.** Validate it before dependent work starts. A failed gate is repaired or recorded as a blocker, never called complete.
5. **Checkpoint:** run the gates, fill in the packet's result, overwrite the handoff, update the `PLAN.md` row, commit.

**Ask the user** whenever a decision is theirs: scope, product behaviour, naming, anything irreversible or outward-facing. Never ask what the code or docs can answer. Batch questions with your recommended option first. Always ask before pushing, merging, deploying, releasing, deleting files, or acting outside this repository.

State evidence as observed or inferred, and as local, controlled-fixture or hosted. Name the browser tool you actually used. If something cannot be checked, say so and stop rather than fill the gap.

## 8. Code standards

Applied to new code and to files you edit; do not reformat untouched code. Recorded source hashes and vendored digests depend on exact bytes.

- Line endings are LF (`.gitattributes`). Two-space indent. Match the quote style of the surrounding file.
- Server Components by default; add `'use client'` only where state, effects or browser APIs need it. Read the installed Next.js docs first.
- Pure logic goes in `src/lib/<name>.mjs` with `<name>.d.mts` types and `tests/<name>.test.mjs`. UI calls it; it never calls UI.
- New files stay small and single-purpose: aim under 300 lines, lines under 100 characters. `workspace.tsx`, `use-workspace-state.ts` and `conversation.tsx` are oversized; split them only inside an approved phase.
- Comments explain why, never what. Mark contract tests with `@lat:` and keep `lat.md/` links valid when moving or deleting source.
- Dev-only routes under `/dev` and `/api/dev` must return 404 in production.
- New non-trivial logic ships with a test. Smallest complete change: reuse existing code and dependencies first.

## 9. Commands and gates

Node 22.18 or newer is required (one test imports a `.ts` file). Dev server: `npm run dev` on `http://localhost:3001`, the only origin the hosted service authorizes. Configure `.env.local` from `.env.example`.

| Gate | Command |
| --- | --- |
| Types | `npm run typecheck` |
| Tests | `npm test` |
| Build | `npm run build` |
| Knowledge links | `lat check` |
| Runtime boundaries | `npm start`, then `npm run check:runtime -- http://127.0.0.1:3000 --production` (the origin must come first; without `--production` the dev-route 404 checks are skipped) |

## 10. Scope and state

Active scope and the next step live in the handoff, not here. Deferred work stays deferred until the user approves its plan: right work area and floor-plan shared state, direct drafting, admin expansion, billing and entitlements, wider native writes, desktop parity. Do not deploy, merge or release without approval; AWS login is unavailable and must not be requested.
