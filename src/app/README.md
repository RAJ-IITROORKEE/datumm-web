# src/app

Next.js App Router: pages, layouts and API route handlers. Read the installed docs in `node_modules/next/dist/docs/` before changing anything here; this Next.js version has breaking changes.

## Routes

| Route | File | Notes |
| --- | --- | --- |
| `/` | `page.tsx` | Sign-in gate, onboarding gate, then the workspace (`components/workspace-entry.tsx`) |
| `/pricing` | `pricing/page.tsx` | Static plans; paid plans unavailable |
| `/connect` | `connect/page.tsx` | Revit connector authorization review |
| `/revision-package` | `revision-package/page.tsx` | Printable revision package (`?task=&plan=&version=`), opened in a new tab from the Review screen; Clerk sign-in, `noindex` |
| `/share/[token]` | `share/[token]/` | Public read-only chat; Clerk is skipped for `/share` |
| `/admin/*` | `admin/` | Dark-only console; `layout.tsx` returns 404 unless the primary email is in `ADMIN_EMAILS` |
| `/dev/*` | `dev/` | Development fixtures; 404 in production |

## API handlers

| Route | Purpose |
| --- | --- |
| `api/agui` | AG-UI chat endpoint: send, resume, observe (`lib/agui/adapter.mjs`) |
| `api/service/[...path]` | Same-origin proxy to the hosted task service. Paths are allow-listed by regex; anything else is 404 |
| `api/account/profile` | `GET` and `PUT` the signed-in user's onboarding profile |
| `api/dev/agui-replay` | Replays saved AG-UI output, including recorded answer draft frames chosen by task id; 404 in production |

## Rules

- Server Components by default. Add `'use client'` only for state, effects or browser APIs.
- Pages stay thin: fetch or gate here, render from `src/components`. No business logic in route files; put it in `src/lib` with a test.
- Every state-changing `/api/*` request is origin-checked in `src/proxy.ts` (Next.js 16 name for middleware). Keep that check when adding handlers.
- Set `maxDuration` on handlers that stream or wait on the backend, and mirror it in `vercel.json`.
- Add a new proxied path by extending the allow-list in `api/service/[...path]/route.ts` and `tests/service-proxy.test.mjs` together.
- Dev-only routes check `process.env.NODE_ENV` and call `notFound()`, and are covered by `npm run check:runtime -- http://127.0.0.1:3000 --production` against a production build.
- Never expose secrets, the orchestrator origin or raw backend errors to the browser.
