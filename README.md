# DATUMM Web

DATUMM's workspace for the browser: an agent-led playground where individual architects and Revit/BIM users ask, generate a concept, review 2D/3D, annotate, revise and export. It is a Next.js frontend over the existing hosted DATUMM task service. Web and desktop share one Clerk account instance. Revit connectivity needs the separate Windows add-in and connector.

## Where to read

| Need | File |
| --- | --- |
| Rules for agents, stack, standards | [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md) |
| Current state and next step | [docs/ux/HANDOFF.md](docs/ux/HANDOFF.md) |
| Product context and constraints | [PROJECT.md](PROJECT.md), [PRODUCT.md](PRODUCT.md) |
| Decisions and phase table | [PLAN.md](PLAN.md) |
| Design system, screen and API map | [DESIGN.md](DESIGN.md) |
| AG-UI research and migration plan | [docs/agui/](docs/agui/AGUI_MIGRATION_PLAN.md) |
| Architecture and contract notes | [lat.md/](lat.md/lat.md) |

## Structure

```text
src/app/          routes, layouts and API handlers      → src/app/README.md
src/components/   UI components                         → src/components/README.md
src/lib/          pure logic, AG-UI adapter, themes     → src/lib/README.md
tests/            node --test suite and runtime smoke   → tests/README.md
scripts/          desktop sync script and its config    → scripts/README.md
docs/             handoff, phase packets, research
lat.md/           knowledge graph linked from code
```

## Run

Needs Node.js 22.18 or newer. Copy `.env.example` to an ignored `.env.local`, configure the existing Clerk instance and the HTTPS orchestrator origin, then:

```bash
npm ci
npm run dev
```

Validate with `npm run typecheck`, `npm test`, `npm run build` and `lat check`.

Development runs on `http://localhost:3001`, the origin the hosted service currently authorizes. Open that exact origin: `http://localhost:3000` is not authorized and authenticated requests return 401. If 3001 is taken, free it; changing the port alone does not authorize the new origin.

Both Clerk keys must be nonblank before sign-in or setup can open. Missing or partial configuration shows "Account sign-in is unavailable" and never opens an anonymous workspace. These presence checks do not prove credential health.

`ORCHESTRATOR_URL` configures the task service separately. It must be an HTTPS root origin without credentials, query or fragment, and a configured origin is not a reachability check. Account profile and setup stay available when the task service is down. Add the exact web origin to the existing Clerk and service allowlists, never widen them for local testing, keep real values in ignored environment files or the deployment secret store, and restart development after changes.

After `npm start`, run `npm run check:runtime` for anonymous browser and API boundary checks. A different running origin can be passed after `--`. These checks do not prove authenticated backend or live Revit acceptance.

## Deploy

Use the repository root as a Next.js Vercel project: Node.js 22 or newer, build command `npm run build`, default output directory. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and the server-only `ORCHESTRATOR_URL` in Vercel. `vercel.json` sets a 240 s limit for the chat and service routes; `.vercelignore` keeps caches, environment files, artifacts and `docs/` out of uploads.

Append the exact new web origin to the service's `CLERK_AUTHORIZED_PARTIES` allowlist and permit it in the same Clerk instance. Keep the existing authorized origins, the desktop authorization origin and the desktop verification pin. A future custom subdomain must be added to those allowlists before it is switched on. Sessions on unrelated domains may ask for sign-in again; the account identity is the same.

Set `ADMIN_EMAILS` (comma list) in Vercel to grant `/admin`; the backend separately requires the Clerk subject in `ADMIN_SUBJECTS`.

## Runtime scope

The browser reaches the hosted task service through strict v2 commands, saved events and versioned plans; no agent worker runs in Vercel. On 12 November 2026, read-only checks identified production behind AWS CloudFront as `datumm-orchestrator` (task and event contract v2), while the hosted OpenCode preview reported an isolated history namespace and `nativeAvailable:false`. These are separate environments; do not switch origins to obtain a different UI capability. Source and live-evidence limits are in `docs/ux/backend-contract-evidence.md`.

`/connect?request=…` reviews the Revit connector's browser authorization request after sign-in. Only an explicit Allow approves the computer; it never approves a native model change or proves the device is online. Connector token claiming stays outside the browser. The Schedules & BOQ view reads the existing schema-1 `report-json` export and labels model revision, source and coverage; its CSV holds validated retained rows and is not an immutable BOQ revision history.

Local project folders, attachments, speech transcription, desktop MCP packs and queued background prompts remain desktop capabilities. The web interface offers hosted model selection, planning, exact design acceptance, drawing and export review, connector management and exact native proposal approval.

This repository holds only reviewed frontend source, browser DTOs, the DATUMM mark, public plugin release metadata, font and dependency notices. No backend implementation, desktop binaries, private model content or environment values are included.
