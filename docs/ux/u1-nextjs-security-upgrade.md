# Phase packet — U1: Next.js security upgrade

| Field | Value |
| --- | --- |
| Status | **done 17 Nov (local, not pushed)**: see section 11 |
| Depends on | Nothing. Must finish before G1 step W1 (Vercel preview) |
| Approved by / date | User, 17 Nov: phase (go-live D6) and, after the packet, "Approve U1" with every recommended option (U1-a to U1-e: A) |
| Base commit | Web `3d2e4f2` on local `main` |

Research ran on 17 Nov 2026 (local time; 16 Nov 21:34 UTC) from `datumm-web/`. **Observed** means
read in source or returned by a command listed in section 10; **inferred** means reasoned from code
and not run. No build, dev server, install, `next upgrade` or browser check was run for this packet.

## 1. Goal and non-goals

DATUMM Web runs on a Next.js release that the npm advisory database marks as affected, and agent-run
builds stop on it about half the time. After U1 the app runs on a patched 16.4.x release, the build
reports no advisory and exits 0 every time, and users see no change at all.

Non-goals: any feature, UI or route change; React, Clerk, AI SDK, AG-UI, Tailwind, TypeScript or any
other dependency bump (none is required by peer ranges, section 2 item 6); moving off `--webpack`
or onto Turbopack; adopting Cache Components or other "Future Defaults"; a 16.5 canary; changing
`experimental.agentUpgrade`; deploying, pushing or touching Vercel settings.

## 2. Current state (verified)

| # | Item | State and evidence |
| --- | --- | --- |
| 1 | Pinned version | **Observed.** `next` exact `16.4.3` (`package.json:24`); lockfile `node_modules/next` 16.4.3 (`package-lock.json:5621-5622`) plus `@next/env` and eight `@next/swc-*` at 16.4.3; `node_modules/next/package.json` 16.4.3 |
| 2 | Advisory | **Observed** (`npm audit --omit=dev --json`): one finding, **GHSA-mfr8-8qww-v76h** (npm id 1247486), *moderate*, CWE-362, "Next.js: Information disclosure across root params when a 'use cache' function is called through unstable_cache()", vulnerable `>=16.3.0 <=16.4.4`, `fixAvailable` 16.4.6 (not semver-major). Totals: 1 moderate, 0 high, 0 critical |
| 3 | Patched versions | **Observed.** Registry bulk-advisory query returns that advisory for 16.4.3 and 16.4.4 and nothing for **16.4.5** (first patched, published 3 Nov) or **16.4.6** (published 9 Nov, dist-tag `latest`). 16.4.x has no later release; `canary` is 16.5.0-canary.52 |
| 4 | Does DATUMM use the affected feature? | **Observed: no.** No `'use cache'`, `unstable_cache`, `cacheLife`, `cacheTag` or `cacheComponents` in `src/` or `next.config.ts`. *Inferred:* the vulnerability is not reachable in this app; the upgrade is hygiene plus build reliability, not an active exposure |
| 5 | Why the build exits 1 | **Observed in source.** `experimental.agentUpgrade` defaults to `'security'` (`next/dist/server/config-shared.js:192`). `next build` runs `nudgeUpgrade` (`next/dist/build/index.js:545-561`), which asks the advisory service. When a **coding agent** is detected (`CLAUDECODE`, `CODEX_*`, `CURSOR_AGENT`, `AI_AGENT` and others, via `@vercel/detect-agent`), it throws `SecurityFatalError` with `exitCode: 1` (`next/dist/lib/upgrade/nudge.js:330-335`) unless a retry receipt under `.next/cache/next-agentic-upgrade-retries/` is less than 5 minutes old (`nudge.js:97,117-170`); the first run writes the receipt, the next run consumes it and continues with a warning. That explains the strict 1,0,1,0,1 pattern in the P12 result ([G1 plan](g1-go-live-plan.md) section 4). A receipt file dated 17 Nov 02:57 exists in that folder |
| 6 | Human and CI builds | **Observed in source**, behavior **inferred**: without an agent, the nudge returns early unless the terminal is interactive and not CI (`nudge.js:376-378,482-488`); interactive humans get a 10-second skippable menu. Vercel is CI with no TTY and sets none of the agent variables, so its build should not stop on this. Not verified on Vercel |
| 7 | Peer ranges | **Observed.** `next@16.4.5` and `16.4.6` declare the same peers (React `^18.2.0 \|\| ^19.0.0`), engines (`node >=20.9.0`) and dependencies as 16.4.3 apart from their own `@next/*` versions. `@clerk/nextjs` 7.9.7 peer `next ... \|\| ^16.1.0-0` covers 16.4.x. No other installed package has a `next` peer. No ESLint config or `eslint-config-next` is installed |
| 8 | Next APIs in use | **Observed.** `src/proxy.ts` (Clerk `clerkMiddleware`, same-origin guard, matcher); 4 route handlers under `src/app/api/**/route.ts`; `maxDuration=240` in `api/agui/route.ts:6` and `api/service/[...path]/route.ts:4`, mirrored for the service route in `vercel.json:7`; `dynamic='force-dynamic'` in 3 files; imports only `next/link`, `next/navigation`, `next/dynamic`, `next/server`; no `next/image`. `next.config.ts` sets `poweredByHeader`, `serverExternalPackages`, `outputFileTracingIncludes` |
| 9 | Build and deploy | **Observed.** `next build --webpack` (`package.json:7`); Vercel `installCommand` `npm ci` (`vercel.json:4`), so the committed lockfile decides what Vercel installs |
| 10 | Version mentions | **Observed.** "16.4.3" in `AGENTS.md:46`, `PROJECT.md:16`, `PLAN.md:29`, the G1 plan, the Q1 packet and older history docs. `lat.md/` has none |
| 11 | Dev churn | **Observed.** `next-env.d.ts` currently imports `.next/dev/types/...` (dev form); `next dev` writes the agent-rules block in `AGENTS.md:1-9` (`next/dist/server/lib/generate-agent-files.js`) |
| 12 | Local Node | **Observed.** `node` on PATH in this shell is v20.13.1, below the repo's 22.18 minimum; recorded gates used Node 24.18.0 |

## 3. Design

No screen, flow or component changes. Reference docs read (installed 16.4.3):
`node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md`,
`02-guides/upgrading/agent-upgrade.md`, `03-api-reference/05-config/01-next-config-js/agentUpgrade.md`.

What Next's own tool would do (**from docs and `next upgrade --help` only; not run**):

- `next upgrade` without `--agent` runs the interactive codemod flow toward `--revision`
  (default `latest`).
- `next upgrade --agent=security` picks "the latest safe release in the earliest eligible major"
  (here 16.4.6), copies migration guides and Skills to a temp folder, writes an agent task that asks
  for a separate Git worktree and checks, and asks the agent to save the policy as
  `experimental.agentUpgrade` in `next.config`. The docs suggest running it via `npx next@canary`.
- Recommendation: **do not use it.** It pulls canary tooling, can edit `next.config.ts`, and hands
  control to a task we did not write. A pinned `npm install` is smaller and reviewable.

## 4. Change list

| File | Change | Owner |
| --- | --- | --- |
| `package.json:24` | `"next": "16.4.3"` → `"16.4.6"` (exact, no caret) | Implementer |
| `package-lock.json` | Regenerated by the install: `next`, `@next/env`, 8 `@next/swc-*` to 16.4.6. Any other changed entry is a stop-and-ask | Implementer |
| `AGENTS.md:46`, `PROJECT.md:16` | "16.4.3" → "16.4.6" | Implementer |
| `docs/ux/u1-...md` (this file), `HANDOFF.md`, `PLAN.md:29`, G1 plan P12/D6/Q1 rows | Result and status at checkpoint | Orchestrator |

Install command (recommended, run once in `datumm-web/` with Node ≥22.18, after the dev server is
stopped): `npm install next@16.4.6 --save-exact`. Then `git diff --stat` must show only the files
above. Do **not** commit `next-env.d.ts` churn or a changed agent-rules block in `AGENTS.md:1-9`
unless its new text differs because of the new version (compare first).

## 5. Contract changes

None. No AG-UI event, schema, proxy allow-list, backend endpoint or storage change. Frontend-only.

## 6. Dependencies and risks

No new dependency. Version change of one existing dependency (needs the approval this packet asks).

| Risk | Likelihood | Containment |
| --- | --- | --- |
| Patch release changes proxy (middleware) or Clerk behavior | Low | Same peers (§2.7); signed-in workspace and admin browser checks; runtime smoke 18/18 |
| Webpack build or `serverExternalPackages`/Resvg/Sharp tracing changes | Low | 5× build; export preview check in the chat scenario |
| Streaming route handlers (`maxDuration`, AG-UI) regress | Low | A streaming chat in the browser; `npm test` covers the adapter |
| React/AI SDK/Tailwind/affectUI | Very low | React stays 19.3.0; no other package moves; vendored files untouched |
| Lockfile pulls unrelated updates | Low | `--save-exact` on one package; diff review; stop if anything else moves |
| Agent-rules block text in `AGENTS.md` changes with the version | Unknown | Compare after the first `next dev`; commit only if the new block differs |
| A new advisory hits 16.4.6 before release | Low | Re-run `npm audit --omit=dev` at W1 |
| Gates run on Node 20 by mistake | Medium | Confirm `node -v` ≥22.18 (ideally 24.18.0, as recorded) before gates |
| Shared `.next` folder with the running dev server | Medium | Stop the dev server before install and builds; restart after |

## 7. Tests and browser scenarios

No new unit tests: no logic changes. Gates (run by the orchestrator, Node recorded):

1. `npm audit --omit=dev` → 0 vulnerabilities for `next`.
2. `npm run typecheck` clean; `npm test` 769/769 (count as of A3; equal or explain).
3. `npm run build` five times in a row from the agent session (the case that failed before);
   record each exit code. Expected: 5/5 exit 0 and no "affected by a known security
   vulnerability" line.
4. `lat check` passes.
5. `npm start -- -p 3100`, then `npm run check:runtime -- http://127.0.0.1:3100 --production`:
   18/18.

Browser (built-in browser; desktop and 390 px; light and dark where the page supports it):

1. `/dev/ux` in dev: page renders, no console errors. (Dev route; also confirm 404 in production via
   the smoke.)
2. `/dev/chat-composition`: fixtures render, composed views and tables appear.
3. Signed-in workspace at `http://localhost:3001`: sign-in through Clerk, sidebar loads chat list,
   an existing chat opens with history.
4. Admin page (e.g. `/admin` overview and `/admin/models`): loads behind the admin gate.
5. A chat that streams: the "hi" short path on the local backend at minimum; a model-backed answer
   needs a provider key, which the local backend lacks, so mark it not run unless one is available.

Local only; hosted behavior is checked at W1 (Vercel build log is a second sample).

## 8. Acceptance criteria

- `package.json` pins `next` at exactly 16.4.6; lockfile changes only `next`, `@next/env` and the
  eight `@next/swc-*` entries; no other dependency version changes.
- `npm audit --omit=dev` reports no `next` advisory.
- `npm run build` exits 0 in 5 of 5 consecutive runs with no advisory warning.
- `npm run typecheck` clean, `npm test` all pass, `lat check` passes, runtime smoke 18/18.
- Browser scenarios 1–4 pass; scenario 5 passes or is recorded as not run with the reason.
- No source file under `src/` changes.

## 9. Rollback

Revert the U1 commit (restores `package.json` and `package-lock.json`), then `npm ci` to restore
`node_modules`. If already on Vercel: instant rollback to the previous deployment (stateless; no
data, checkpoint or backend state is touched). The retry receipt in `.next/cache` is harmless.

## 10. Decisions and open questions

| # | Decision | Options (recommendation first) |
| --- | --- | --- |
| U1-a | Target | **A: 16.4.6** (latest on 16.4.x and npm `latest`, what `npm audit` and the security policy pick). B: 16.4.5 (smallest patched; one fewer change). C: 16.5 canary (no) |
| U1-b | Pinning | **A: exact pin in `package.json` and lockfile**, as every other dependency is. B: caret range |
| U1-c | Who installs | **A: an implementer agent runs the one `npm install` above after approval, with the dev server stopped.** B: the user runs it and the agent does the rest |
| U1-d | Reminder setting | **A: leave `experimental.agentUpgrade` at its default** (it is what surfaced this). B: set it to `false` (silences future advisories; not recommended) |
| U1-e | Timing vs go-live | **A: U1 lands on local `main` before the W1 preview, ships in the same web release.** B: ship W1 on 16.4.3 (Vercel likely unaffected per §2.6) and upgrade after |

Open questions and things not verified:

- Whether Vercel's build actually prints or stops on the notice (inferred no; W1 log will show).
- Release notes for 16.4.4–16.4.6 were not read (not in the installed docs); the changes beyond the
  advisory are unknown until installed. Read `node_modules/next/dist/docs/` again after install.
- Whether 16.4.6 changes the agent-rules block or `next-env.d.ts` output.
- Which Node binary the earlier sessions used for 24.18.0 (this shell has 20.13.1 on PATH).
- The advisory's full text and CVSS vector (npm reports score 0) were not read beyond its title.

Research commands (17 Nov, read-only; all ran in `datumm-web/`): `npm audit --omit=dev --json`;
`npm view next versions --json`; `npm view next dist-tags --json`; `npm view next time --json`;
`npm view next@{16.4.3,16.4.5,16.4.6} peerDependencies engines dependencies optionalDependencies
--json`; POST to `registry.npmjs.org/-/npm/v1/security/advisories/bulk` with `next` 16.4.3–16.4.6
and with 16.4.5 and 16.4.6 alone; `node node_modules/next/dist/bin/next upgrade --help`;
`node -v`, `npm -v`; greps over `src/`, `next.config.ts`, lockfile and `node_modules/next/dist`.

## 11. Result

Built 17 Nov on local `main`; nothing pushed. The orchestrator ran the one install itself (option
U1-c asked for an implementer agent; it was a single reviewed command).

| Item | Outcome |
| --- | --- |
| Change | `next` pinned at exactly 16.4.6 (`npm install next@16.4.6 --save-exact`, Node 24.18.0, dev server stopped). `package-lock.json` changed only `next`, `@next/env` and the eight `@next/swc-*` entries (10 version lines); no other dependency moved. `AGENTS.md:46` and `PROJECT.md:16` say 16.4.6. No file under `src/` changed |
| Gates (17 Nov, Node 24.18.0) | `npm audit --omit=dev`: 0 vulnerabilities. `npm run typecheck`: clean. `npm test`: 769 / 769. `npx lat check`: passed. Runtime smoke `--production` on a fresh `next start` (port 3100): 18 / 18 |
| Build 5x | Exit codes 0, 0, 0, 0, 0, with no "known security vulnerability" line in any run (before: 1, 0, 1, 0, 1) |
| Browser (built-in browser, 1269 px, signed-in real site against the local backend) | `/dev/ux` renders all fixtures; `/dev/chat-composition` renders its fixtures; the workspace loads signed in; `/admin/models` loads behind the admin gate; a "hi" in Ask mode returned the approved greeting, status Completed, with the thumbs and reason list. Not run: 390 px and light mode, a model-backed streaming answer (no provider key locally) |
| Not run or not verified | Vercel build behavior with 16.4.6 and with the reminder (W1 preview log will show); release notes for 16.4.4 to 16.4.6; the advisory's full text |
| Limits found | In the pane, the dev server's HMR websocket does not connect (console `ws://localhost:3001/_next/hmr` errors; a test socket timed out). Pages load and work. Not compared against 16.4.3 in this pane, so not attributed to the upgrade. One Clerk line about a redirect loop appeared once at the first request after the restart with an old session cookie; sign-in worked on the next load and did not repeat |
| Next step | G1 pre-deploy tasks; the W1 preview build log is the second sample for the build behavior |
