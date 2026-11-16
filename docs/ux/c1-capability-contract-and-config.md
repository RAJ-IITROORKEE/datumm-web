# Phase packet — C1: Capability contract and config consistency

| Field | Value |
| --- | --- |
| Status | **approved, build in progress** |
| Depends on | S0 (done) |
| Approved by / date | Four design decisions approved 16 Nov (section 3); packet approved by the user 16 Nov ("move with the plan phased from beginning … proceed with the implementation") |
| Base commits | Web `8c4385f`; backend `e8cefa7` on `188ebc0` |

## 1. Goal and non-goals

The web UI learns what the connected backend supports from one signal it trusts, shows or hides features accordingly, and the model picker and effort default cannot drift from the admin configuration. Also removes UI calls that can never succeed.

Non-goals: new admin features (A1 to A4), MCP, routing, streaming, any change to v2 command schemas, event shapes or checkpoints, any deployment.

## 2. Current state (verified in S0 and this packet's research)

| Item | State | Evidence |
| --- | --- | --- |
| `GET /v1/config` | Returns the **environment** values `settings.models`, `model_default`, `default_reasoning_effort`, plus `modelConfigured`, `localMode`, `owner`, `agentEnabled` | `main.py:290-295` |
| Run admission | Validates the model against the **admin** list | `task_controller.py:379-382`; v1 path `main.py:781` |
| Reasoning effort, v2 submit | Uses `settings.default_reasoning_effort`, ignoring the admin default. The submit command field is already optional (`None`), so a one-line fix works | `task_controller.py:383`; command models `task_contracts.py:162,173,219,231` |
| Reasoning effort, v1 path | Already honors the admin default | `main.py:781` |
| Admin config semantics | `0` means "server default" for `runUsdLimit` and for per-run limits (`effective_limits` keeps only values above 0). The USD field says so; the per-run limits hint says "0 to 100" and does not | `app_config.py:47`, `budget.py:21-23`; `config-sections.tsx:30,37` |
| Capability signal in web | `GET config` fields `runtime`, `nativeAvailable`, `nativeReadAvailable`, `supportedExports`, `agentEnabled`, `models`; no `capabilities` | `use-workspace-state.ts:42,522-529,663` |
| Admin "Backend not deployed yet" | Shown for any 404 | `use-admin.tsx:18,70-72`; proxy 404 is the plain text `Not found` (`route.ts:20`) |
| `tasks/{id}/goal`, `tasks/{id}/history/done` | UI calls both; proxy allow-list has neither; only the OpenCode local app serves them (`local/entry.py:663` answers 501 without the live runtime; `:1184`). The production orchestrator serves neither | `conversation.tsx:707`; `use-workspace-state.ts:1128`; backend grep |
| Legacy `/api/chat` | No caller in `src`; kept alive by `tests/chat-stream-failure.test.mjs` and three smoke checks | S0 |

## 3. Decisions (user, 16 Nov)

1. Capabilities are reported by **extending `GET /v1/config`** with a versioned `capabilities` object; no new endpoint.
2. `goal` and `history/done`: **allow-list in the proxy and gate by capability**; hidden unless the backend reports support.
3. Legacy `/api/chat` route: **delete it and its test**.
4. Admin 404: **capabilities first, plus a distinct proxy code**.

## 4. Design

**Capability document** (inside the `/v1/config` response, optional for old backends):

```json
"capabilities": {
  "version": 1,
  "features": {
    "adminConfig": true, "adminAudit": true, "adminOverview": true, "adminKnowledge": true,
    "planningGoals": false, "taskDoneMarking": false, "taskQueue": false,
    "nativeQuestions": false, "designReviewRoute": false, "toolsCatalog": false
  }
}
```

Names above are the starting set; step 1 of the build fixes the final list from the route inventory. Only features the UI conditions on in C1 appear; later phases add flags.

**Tri-state parsing** (`src/lib/capabilities.mjs`): each feature is `true`, `false` or `unknown`. A missing `capabilities` object (every backend deployed today) means all `unknown`. Rules for `unknown`:

- Admin features: behave exactly as today (call the endpoint; on 404 show the unavailable state). This keeps the working admin pages usable on the current deployment.
- Everything else (`planningGoals`, `taskDoneMarking`, `taskQueue`, `nativeQuestions`, `designReviewRoute`, `toolsCatalog`): treated as **off**. These routes are not served by production, so hiding them removes buttons that fail.
- A `version` the web does not know means all `unknown`.

**Admin 404.** The proxy's own 404 returns JSON `{code:"DATUMM_PROXY_NOT_ALLOWED"}` (status 404) instead of plain text. `use-admin.tsx` distinguishes it from a backend 404 and shows copy that names the real cause ("this web build does not expose that route" versus "this backend does not provide it"). A capability reported `false` hides the admin nav item and shows the same "not provided by this backend" state if the URL is opened directly.

**Reused components:** existing `ResultState` and unavailable-state patterns in `src/components/admin/`; `ui/` primitives. No new visual components.

References: [DESIGN.md](../../DESIGN.md) section 5 (admin console, settings), [research record](research-reference-and-harness-2026-11-16.md) (Panda-agent shows an admin section only when its registry exists).

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, one owner):

| File | Change |
| --- | --- |
| `apps/domain-api/main.py` (`config`, ~`:290`) | Return `models`, `defaultModel`, `defaultReasoningEffort` from `await app_config.current()`; add `capabilities` (production values: admin flags true, the rest false) |
| `apps/domain-api/task_controller.py` (`submit`, `:383`) | `reasoning_effort = payload.get('reasoningEffort') or cfg['defaultReasoningEffort']` |
| `apps/domain-api/test_app_config.py` or `test_round3_api.py` | Tests: config reflects admin models and default and effort; omitted effort on submit uses the admin default; explicit effort wins; `capabilities` shape and version |
| `lat.md/` note | Document the capabilities contract where config is described |

**Web** (`datumm-web`, current branch, one owner):

| File | Change |
| --- | --- |
| `src/lib/capabilities.mjs`, `.d.mts` | New: tri-state parser from the config response |
| `tests/capabilities.test.mjs` | New: missing object, unknown version, partial object, malformed values, each feature's `unknown` rule |
| `src/components/workspace/use-workspace-state.ts` | Parse capabilities from `config`; expose them; gate `organizeDone`, queue, native-question and tools-catalog paths; wrap `organizeDone` in the 404-tolerant `guarded` helper |
| `src/components/workspace/conversation.tsx` | Gate the planning-goal action |
| `src/app/api/service/[...path]/route.ts` | Allow-list `tasks/{id}/goal` and `tasks/{id}/history/done`; proxy 404 body becomes `{code:"DATUMM_PROXY_NOT_ALLOWED"}` JSON |
| `tests/service-proxy.test.mjs`, `tests/admin-proxy.test.mjs` | Cover the new routes, the new 404 body, and that unrelated paths stay blocked |
| `src/components/admin/use-admin.tsx`, `admin-shell.tsx` | Distinguish proxy 404 from backend 404; hide nav items for features reported `false`; new unavailable copy |
| `src/components/admin/config-sections.tsx` | Per-run limits hint: "0 uses the server default" |
| `src/app/api/chat/route.ts`, `tests/chat-stream-failure.test.mjs` | **Delete.** Before deleting, confirm which assertions of the failure test have no equivalent in `agui-adapter.test.mjs`, `chat-usage-errors.test.mjs` or `chat-composition*.test.mjs`; port any that do not |
| `tests/runtime-smoke.mjs` | Remove the three `/api/chat` checks (cross-origin, missing origin, unsupported attachment); the equivalent origin checks for `/api/agui` already exist. Check count falls from 21 and is re-recorded |
| `tests/web-configuration.test.mjs`, `src/app/README.md`, `docs/ux/` current docs | Remove or update references to `/api/chat` (history documents keep theirs) |

**First build step (read-only):** route inventory. For every allow-listed path the UI calls, record which backend serves it (production `main.py`/`task_api.py`, OpenCode `local/entry.py`), and set each capability flag from that table. The inventory is committed in the packet result.

## 6. Contract changes

| Change | Kind |
| --- | --- |
| `capabilities` object in `GET /v1/config` | Additive; old clients ignore it; old backends omit it and the web treats that as unknown |
| `/v1/config` model and effort values come from admin config | Behavior fix; the keys already exist |
| v2 submit effort default from admin config | Behavior fix; no schema change |
| Proxy 404 body becomes JSON with a code | Web-only; any external consumer of the proxy's 404 text is unlikely and unverified |
| Proxy allow-list gains two routes | Web-only |

No change to v2 commands, events, checkpoints or native authority.

## 7. Dependencies and risks

No new dependencies.

| Risk | Containment |
| --- | --- |
| A wrong default hides a working feature | Tri-state: missing means today's behavior for admin and off only for routes production does not serve; tests for every `unknown` rule |
| New web deployed before the backend exposes `capabilities` | Safe by design: all `unknown` |
| `/v1/config` response change affects other consumers (desktop app, hosted OpenCode) | Keys unchanged, one key added; grep the backends for config consumers during the inventory |
| Removing `/api/chat` drops a test that guarded a behavior also used by `/api/agui` | Port or confirm equivalent assertions before deleting (section 5) |
| Admin config edited mid-run changes the picker list | Config is cached 30 s and runs snapshot it; no new behavior |

## 8. Tests and browser scenarios

Backend: domain-api suite (previous 180 + 26 subtests) with the new config and submit tests; `lat check`.
Web: `npm run typecheck`, `npm test`, `npm run build`, `lat check`, runtime smoke with `--production` against a production build (count recorded).

Browser (local dev server, config mocked through the dev fixtures or a stub, 1280 px and 390 px, light and dark):

1. Config with no `capabilities` (today's production): admin pages load and work; goal and done actions hidden; model picker shows the config list.
2. Config with `capabilities.version 1` reporting admin features false: admin nav items hidden; opening an admin URL shows "not provided by this backend".
3. Config reporting `planningGoals` and `taskDoneMarking` true (OpenCode-like): both actions visible and their requests reach the proxy.
4. Unknown version: same as scenario 1.
5. Open an admin URL the proxy blocks: copy says this web build does not expose the route (proxy code), not "backend not deployed".

## 9. Acceptance criteria

- Picker models and default effort equal the admin configuration end to end (backend tests and web test).
- Omitted effort on v2 submit uses the admin default; explicit effort wins.
- On a backend without `capabilities`, no working admin page disappears and no failing button remains.
- Proxy 404 and backend 404 produce different, accurate messages.
- `/api/chat` is gone with no loss of unique test coverage; docs updated.
- Standing gates green; the new smoke count recorded; backend suite counts recorded.

## 10. Rollback

Revert the web and backend commits. The `capabilities` key is additive, the config and effort fixes are behavior fixes with no stored state, and the proxy changes are stateless.

## 11. Result

Filled at the checkpoint.
