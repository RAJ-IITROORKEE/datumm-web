# Phase packet — CV3a: desktop adopts the shared web shell, behind a switch

| Field | Value |
| --- | --- |
| Status | approved 19 Nov 2026. User: "continue as per the plan using subagents"; approach "Staged, behind a switch". |
| Plans | [desktop UI convergence plan](desktop-ui-convergence-plan.md) CV3 (rows 279–310; decisions UI-a to UI-h approved 17 Nov) |
| Repos | `datumm-web` (sync script) and `datumm-orchestrator/apps/web` + `apps/desktop` (desktop renderer) |
| Workers | Two Sonnet subagents (effort high): **A** in `datumm-web` builds the sync script and manifest; **B** in the orchestrator does the desktop side. They run in parallel against the layout below. The main agent reviews, runs gates and checks the desktop browser preview. |

## 1. Facts (mapped 19 Nov)

- **The desktop renderer is its own Next app.**
  - It is `D/apps/web`: Next 16.4.3, `output:'standalone'`, run by Electron from `apps/desktop/src/main/web.ts:17`, `entry.ts:153`.
  - Its API routes are `/api/service` and `/api/chat`. They go to a local sidecar (`DATUMM_LOCAL_MODE`, the `datumm-desktop-session` cookie) through `src/proxy.ts` and `backend.ts`.
  - It has no `/api/agui`, no `src/lib/host`, no `components/workspace/` folder, and no `vendor/affectui`.
- **About 60 web workspace files are missing on the desktop.** Same-named files differ almost line by line.
  - Web `workspace.tsx` is 1496 lines; the desktop's is 1251.
  - Web `desktop-settings.tsx` is 124 lines; the desktop's is 1210.
- **`window.desktop` has about 50 methods** (`apps/desktop/src/preload/index.ts:28-132`). The web host contract (`src/lib/host/contract.mjs`) covers only a small part.
- **The desktop gates the plan lists do not exist** in this checkout. These are `approval-honesty`, `type-scale`, `contrast` and the others. The desktop `apps/web/tests` has 5 files.
- **Dependencies:** the web has `@ag-ui/core`, `@fontsource-variable/inter`, `@streamdown/mermaid`, `pdfjs-dist` and `zod`, which the desktop renderer lacks. Every other shared dependency has the same version, apart from Next.

## 2. Layout (the contract between A and B)

- **Synced files** go to `D/apps/web/src/shared/`, keeping their web paths below `src/`. For example, `W/src/components/workspace/composer.tsx` goes to `D/apps/web/src/shared/components/workspace/composer.tsx`.
  - The sync script rewrites every import of `@/` to `@shared/` in the copied files. The desktop's own `@/` files are never overwritten.
  - It writes `D/apps/web/src/shared/.sync-manifest.json`: `{source: "datumm-web@<commit>", files: {"<path>": "<sha256 of the copied bytes>"}}`.
- **What is synced** comes from an explicit allowlist in `W/scripts/desktop-sync.json`:
  - `src/components/**`, except `admin/`, `billing/` and `dev/`;
  - `src/lib/**` (pure modules), except `backend.ts`, `request-body.ts` and anything server-only, which the script detects and lists;
  - `src/app/globals.css`, if the shell needs it;
  - theme tokens.

  It never syncs `src/app/api/**`, `next.config.*`, `proxy.ts` or `middleware`.
- **Desktop side:**
  - `tsconfig` gains `"@shared/*": ["./src/shared/*"]`.
  - `D/apps/web/src/host-desktop/` holds the `host/desktop` adapter, which implements the web host contract from `@shared/lib/host/contract.mjs` over `window.desktop`.
  - Approve is never on the contract. Shared UI never approves a Revit write; desktop approvals stay in the existing native review.
- **Switch:**
  - The desktop renders the shared shell only when `DATUMM_SHARED_SHELL=1`, or a desktop setting is on; it is off by default.
  - It is wired in `D/apps/web/src/app/page.tsx` (or the existing entry component): `<HostProvider host={desktopHost}><Workspace/></HostProvider>` from `@shared`.
  - Otherwise the current desktop shell renders exactly as today.

## 3. Scope

### A — `datumm-web`

- **Sync script:** `scripts/sync-desktop.mjs` (Node, no new dependency).
  - It reads `scripts/desktop-sync.json` and resolves the allowlist.
  - It refuses a dirty tree for the synced paths, unless given `--allow-dirty`.
  - It copies the files, rewrites the `@/` imports, writes the manifest, and prints a summary.
  - `--check` compares the target to the manifest and the source, and exits non-zero on drift.
  - `--target` defaults to `../datumm-orchestrator/apps/web`.
- **Server-only detection:** it scans for imports such as `server-only`, `next/headers`, `node:` and `@clerk/nextjs/server`, and excludes those files with a printed reason.
- **Host contract:** if the desktop shell needs more than `status` on `native`, `auth`, `window` or `settings`, extend `src/lib/host/contract.mjs` and `web.mjs` minimally, with tests. This is read and status only; there is no approve.
- **Tests:** the allowlist resolution, the import rewrite, the manifest hashing, the `--check` drift detection, and the exclusion of server-only files. Use a temporary folder and never the real target.
- **README:** a scripts row.

### B — orchestrator (`apps/web`, `apps/desktop`)

- **Next:** align to 16.4.6, the web's version.
- **Dependencies:** add the web dependencies the synced files import (`@ag-ui/core`, `@fontsource-variable/inter`, `zod`, `@streamdown/mermaid`, and `pdfjs-dist` only if imported), at the web's exact versions. Root `package-lock.json` changes are expected.
- **Path alias:** `@shared/*`.
- **`src/host-desktop/`:** the adapter, with tests, mapping `window.desktop` methods to the contract.
- **Task transport:** read how the shared shell talks to the backend (`/api/agui` and `/api/service`). If the desktop sidecar serves the same v2 task API, add an `/api/agui` route in the desktop that reuses the synced adapter (`@shared/lib/agui/adapter.mjs`) through the desktop's own `backend.ts`. If not, record exactly what is missing, and show a plain "Chat in the new view needs the hosted service" state in the switched shell. Do not fake it.
- **Switch** as in section 2.
- **Run the sync:** `node ../datumm-web/scripts/sync-desktop.mjs`, once A's script exists. If it doesn't exist yet, write B against the layout and sync at the end.
- **First test, `apps/web/tests/approval-honesty.test.mjs`:**
  - no file under `src/shared/` calls `nativeBuildAction('approve')` or `window.desktop` directly;
  - the shared shell's Review cannot approve a Revit write;
  - the classic native review keeps its approve path.
- **Tests and checks:** `check:shared-sync`, which runs the manifest check, plus the existing `typecheck`, `build`, `node --test apps/web/tests/*.test.mjs` and `check:ui`.

## 4. Out of scope

- Making the shared shell the default.
- CV4: the desktop slots (Revit model tree, canvas and properties; existing-edit review; building canvas).
- CV5: the CI drift gate. A local `check:shared-sync` exists now.
- Removing old desktop files.
- Installers.

## 5. Checks

- **Web:** typecheck, `npm test`, build, `lat check`.
- **Orchestrator:** pytest is untouched; `apps/web` typecheck, build and tests; `check:ui`; `check:shared-sync`; `lat check`; `npm run graph:update` and `check:graph` as CLAUDE.md asks.
- **Browser:** `npm run preview:desktop` with the switch off shows the classic shell, unchanged. With the switch on, it shows the shared shell (title bar, Design and Review, Details drawer) using the desktop host. Chat works or plainly says it is unavailable, and there are no console errors.
- **No Electron installer is built.**

## 6. Rollback

Turn the switch off (the default), or revert the commits. Synced files live only under `src/shared/`.

## 7. Result

| Item | Outcome |
| --- | --- |
| Build | **Web `c8b034a` + `f248012`:** `scripts/sync-desktop.mjs` and `desktop-sync.json`. The import closure of the shell is 301 files, with 4 named exceptions from admin and billing. `@/` becomes `@shared/`; files outside `src/` go to `_root`; `@lat:` links become plain notes; there is a sha256 manifest, and `--check` catches drift. 12 tests. **Desktop `68b5259`:** the synced `src/shared/` (from `datumm-web@f248012`); `host-desktop/` (`createDesktopHost`, `SharedShell`); `page.tsx` switch `DATUMM_SHARED_SHELL=1` (read server-side, off by default); Next 16.4.6 plus `@ag-ui/core`, `@fontsource-variable/inter`, `@streamdown/mermaid`, `pdfjs-dist`, `zod` (root `zod` override 4.6.7); `check:shared-sync`; `approval-honesty.test.mjs`. |
| Type fix (main agent) | Both the shared and the classic `lib/desktop.ts` declared `window.desktop` with different types. `tsconfig` maps `@shared/lib/desktop` to the desktop's own `src/lib/desktop.ts` and excludes the synced copy, so there is one declaration with the full preload type. |
| Chat transport | Not wired: `/api/agui` answers 501. The local sidecar serves v2 tasks, but its receipts lack `commandId` (`local/facade.py:131,186`), its snapshots lack `commandReceipts` and event `turnId`, and it refuses `answer` commands (`facade.py:49`, `live_runtime.py:138`). The shared shell shows "Chat here needs the hosted service; switch back to the classic view to chat locally." |
| Approval | The shared files that mention `nativeBuildAction` are pinned to `conversation.tsx`, `use-workspace-state.ts` and `desktop-contract.ts`. The approve call must carry the exact task version and proposal identity. The sidecar's exact-proposal checks are asserted. **The preload now refuses `approve` while the shared shell is mounted**, so no shared click can approve a Revit write; the classic review keeps its approve path. |
| Gates | **Web:** typecheck, 1035+ tests, build, `lat check`. **Desktop renderer:** typecheck, 23/23 tests, build, `check:ui` (22 PASS), `check:shared-sync` (no drift), `lat check`. |
| Browser (desktop offline preview, 19 Nov) | **Switch off:** the classic shell ("Architectural Workspace", Workflow / Workspace / Platform), no shared marker. **Switch on:** the shared shell renders in the desktop theme ("What are we designing today?", composer, Plan, Revit unavailable) with the honest chat notice. `/api/service` config, devices, runs and projects return 200 after the preview session starts. The early 401 and connection-refused lines were only during startup. |
| Environment | The preview needed `.venv-domain` (git-ignored). It was created per the root README (Python 3.12 + `apps/domain-api/local/requirements.lock`). |
| Not done | `graph:update` / `check:graph`; an Electron run; CV4 slots; CV5 CI drift gate; hiding the shared Approve button (it is refused, not hidden); the local sidecar contract for AG-UI chat. |
