# Phase packet — CV1: host adapter seam

| Field | Value |
| --- | --- |
| Status | done 17 Nov 2026 (convergence plan approved by the user; reviewed by the orchestrator) |
| Depends on | CV0 ([plan](desktop-ui-convergence-plan.md), sections 4 and 6) |
| Approved by / date | Requested by the orchestrator 17 Nov 2026; user approval of the packet not recorded here |
| Base commit | b306db3 |

## 1. Goal and non-goals

Add a typed host-adapter contract so the shared UI can later run inside the desktop app (decision UI-b). No visible change. Non-goals: the desktop implementation (CV3), moving every call site (CV2/CV3), new dependencies, any native or window behaviour on the web, any approval path.

## 2. Current state (verified)

- Service proxy: `src/app/api/service/[...path]/route.ts:1-80` (allow-list, Clerk token added server-side by `src/lib/backend.ts:5-6`). Implemented and tested.
- Client fetch helpers: `api()` at `src/components/workspace/use-workspace-state.ts:90-91`; direct `fetch('/api/service/...')` in `admin/use-admin.tsx:15`, `onboarding/account-onboarding.tsx:56,127`, `project-brief-editor.tsx:41,69`, `workspace/review-report.tsx:116-194`, `lib/device-authorization.mjs:29`; download links in `conversation.tsx:870`, `exports-panel.tsx:56`, `plan-details.tsx:38`, `agent-memory.tsx:73`, `agent-specialists.tsx:22`, `workspace.tsx:220`.
- Clerk (client): `workspace-entry.tsx:2,8`, `admin/admin-draft-root.tsx:2`, `admin/admin-shell.tsx:5`, `connections/device-authorization.tsx:4`, `workspace/sidebar-account.tsx:7`.
- Attachments: `src/lib/composer-attachments.mjs`, used by `workspace/composer.tsx`, `attachment-chips.tsx`.
- Capability flags: `src/lib/capabilities.mjs` (backend features; unknown = off). Host flags here are a separate list.
- Desktop bridge type `window.desktop`: `src/lib/desktop.ts`, `desktop-contract.ts` (web installs none).

## 3. Design

Frontend-only seam. The web host delegates to existing code and does not rewrite it. Next docs (`node_modules/next/dist/docs/`) were consulted for layouts: a Server Component layout may render a Client Component provider around `children`.

## 4. Change list (scope and files)

- Add `src/lib/host/contract.mjs`, `contract.d.mts`: surface names, capability flag names, `notAvailable()`, `missingHostMembers()`.
- Add `src/lib/host/web.mjs`, `web.d.mts`: `createWebHost({fetcher})`.
- Add `src/components/host-provider.tsx`: `HostProvider`, `useHost()`. Context defaults to the web host, so isolated renders and `/dev` fixtures keep working.
- Edit `src/app/layout.tsx`: mount `HostProvider` once inside `<body>`.
- Add `tests/host-web.test.mjs`.
- Add this packet.

Reused code: `composer-attachments.mjs` (attachments surface), the `/api/service/` proxy (tasks surface).

## 5. Contract

| Surface | Members |
| --- | --- |
| `auth` | `kind` (`web-session` or `desktop-session`), `fetchCredentials`. No token ever reaches the UI; Clerk stays server-side behind the proxy. Sign-in and sign-out remain Clerk components until CV3. |
| `tasks` | `request(path, init)` returns a `Response` (same-origin, no-store defaults); `url(path)` for downloads |
| `native` | `status()` only. Web returns `{available:false, reason}`. There is no approve, build or write method: the UI holds no approval authority, and the desktop's trusted review stays the only approver. |
| `attachments` | `limits`, `kindOf`, `validate` (delegates to `composer-attachments.mjs`) |
| `settings` | `status()`; web: not available (providers, voice and runtime belong to desktop) |
| `window` | `status()`; web: not available |
| `capabilities` | `has(flag)`; flags `hostedTasks`, `attachments`, `nativeBridge`, `localSettings`, `windowControls`. Web: first two on. Unknown flag = off. |

Desktop CV3 adds members behind these surfaces (native capture and view images, settings read/write, window controls) by extending the contract in the web repo first.

## 6. Dependencies and risks

No new dependency. Risks: (1) a call-site migration changing request options: `tasks.request` defaults equal the old `cache:'no-store', credentials:'same-origin'`, and a test pins this. (2) Provider position changing hydration: it is a plain context provider with no markup. (3) The contract growing into a rewrite: contained by migrating only the sites below.

Migrated call sites (all behaviour-identical):
1. `src/components/project-brief-editor.tsx`: brief GET and PUT via `host.tasks.request`.
2. `src/components/onboarding/account-onboarding.tsx` (`ConnectorStep`): devices check via `host.tasks.request('devices')`.

Left for CV2/CV3: `api()` in `use-workspace-state.ts` (module-level, not a hook; needs a small refactor in the oversized file), `admin/use-admin.tsx`, `review-report.tsx`, `device-authorization.mjs`, all download links (`host.tasks.url`), composer attachments use of `host.attachments`, Clerk components behind `host.auth`, `desktop-titlebar` and `window.desktop` behind `host.window`/`host.native`.

## 7. Tests and browser scenarios

Tests: `tests/host-web.test.mjs` (surface completeness, request defaults and URL, honest unavailability and no approve method, capability flags, attachments delegation). Browser: none required (no visible change); optional smoke: open the workspace signed in, open the project brief, run the onboarding connection check; both behave as before. Not run in this phase.

## 8. Acceptance

`npm run typecheck`, `npm test`, `npm run build`, `lat check` pass; no visible change; no file outside section 4 and the two migrated components changed.

## 9. Rollback

Revert the commit. No data, route or storage change.

## 10. Result

| Item | Outcome |
| --- | --- |
| Commit | `main` (see git log, "CV1: host adapter seam") |
| Gates | see below |
| Browser evidence | built-in browser, localhost:3001 with the local backend, 17 Nov. The workspace renders under `HostProvider`. Project brief: GET `/api/service/projects/<id>/brief` 200, then an entry was added and saved with PUT 200 (revision 0 → 1). Orchestrator re-ran typecheck, 882/882 tests, build and `lat check`; all passed |
| Not run or not verified | onboarding connection check (only shown to new accounts); `lat.md` has no host node (none added) |
| Next step | CV2 shared shell; migrate remaining call sites |

Gates run 17 Nov 2026, Node 24.18.0 (the default node is 20.13.1, so PATH was set to 24.18.0):

- `npm run typecheck`: passed, no errors.
- `npm test`: tests 882, pass 882, fail 0 (5 new in `tests/host-web.test.mjs`).
- `npm run build`: exit 0.
- `lat check`: "All checks passed" (via `npx lat check`).

Three existing tests stub component imports, so they were updated to supply `host-provider`: `tests/web-configuration.test.mjs` (layout import map), `tests/project-brief-editor.test.mjs` and `tests/onboarding-profile.test.mjs` (a real `createWebHost` over the test's fetch). These belong in the section 4 file list.
