# Phase packet — A3: Admin model registry

| Field | Value |
| --- | --- |
| Status | **proposed, awaiting user approval** |
| Depends on | A1 (done) for telemetry parsing and the `strict` nav pattern; A2 (done) for the shared config write, history, restore and audit |
| Approved by / date | |
| Base commits | Web `93806ba` (checkout reports branch `main`; the handoff names `codex/ui-ux-foundation-2026-11-12`, see section 10); backend `70ce912` on `codex/web-ui-harness-20261116` (also local `main`) |

All `path:line` facts below were **observed** in source on 17 Nov (backend `70ce912`, web `93806ba`). Statements marked *inferred* were reasoned from code, not run. No test, browser, provider or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

An admin opens **Admin → Models** and sees every model DATUMM knows about: whether users can pick it, whether it is the default, its latest test result, its catalog price, and its measured calls, tokens, cost and latency per day. The admin can run a bounded **test** on a model, then enable or disable it and choose the default. A model cannot serve a user until it has passed a test and been enabled; the server enforces this when config is written and when a run is admitted, not only the UI. Nothing in the registry, its responses or its audit rows holds a key or any user text.

Non-goals: a model router or automatic fallback (parked, [roadmap](roadmap-2026-11-16.md) §2 item 4); billing, paid tiers or per-user quotas; per-group visibility (decision 8); changing the specialist, brief-interpreter, layout-critic, vision or image model selection (they stay environment-controlled); adding a model outside the server allowlist from the web (decision 2); an OpenRouter credit banner (decision 12); Panda's ordered free-model pool and daily limits; storing test prompts or answers; any deploy or hosted check (G1); any change to v2 commands, checkpoints, `PublicTask`, `PublicEvent` or native authority.

## 2. Current state (verified)

Status key: **T** implemented and tested; **U** implemented, under-tested; **C** controlled or local only; **P** planned or missing.

| # | Item | State | Evidence |
| --- | --- | --- | --- |
| 1 | Two model lists | T. Env `ALLOWED_MODELS` (six ids by default) and `DEFAULT_MODEL`; admin `AppConfig.models` (≤20 free strings, 1–120 chars) and `defaultModel`. Empty admin list falls back to env; an admin default not in the list falls back to env default, then the first model | `settings.py:26,33-41`; `app_config.py:49-50,64-69`; `test_app_config.py:13-19` |
| 2 | "Enabled" today | T. A model is selectable iff it is in the resolved list: `/v1/config` returns it to the picker; both admission paths reject anything else with 400 "Model is not enabled." | `main.py:296-299`; `task_controller.py:390-392`; `main.py:786-790`; `test_config_capabilities.py:23-45` |
| 3 | **Execution checks the env list, not the admin list** | U. The planner refuses a model not in env `settings.models` (`agent_workflow.py:1455,1464`); so do variable decisions (`variable_decision.py:50`), the brief interpreter (`brief_interpreter.py:537`) and specialists (`specialist_jobs.py:212`). `AppConfig.models` is never checked against env. An admin can therefore enable a model that is admitted and then fails at the first decision (*inferred*: no test covers it) | as cited |
| 4 | Every segment re-admits | T/U. Follow-ups (`amend`, continuation, `prepare_build`) build a `NewRun` with an explicit model and go through `create_execution`, which re-checks the admin list. A disabled model blocks the next turn of an existing task with 400; a run already executing is not re-checked against the admin list (*inferred* from the call path) | `task_controller.py:676-686,728,857-860`; `main.py:790` |
| 5 | Effort | T. Admin `defaultReasoningEffort` or env; snapshotted on the task and run | `app_config.py:51,70`; `task_controller.py:393` |
| 6 | Picker | T. `/v1/config.models` and `defaultModel` feed `ModelPicker` (names derived from the id; four known providers); web falls back to `openai/gpt-6-luna` when no default | `use-workspace-state.ts:672-677,728`; `model-picker.tsx:26-38`; `composer.tsx:586` |
| 7 | Admin model UI | T. Agent page: a chip list "Allowed models" (≤20, free text) and a default `Select`, through the shared A2 draft and CAS save | `config-sections.tsx:20-23`; `admin-config.mjs:24-25` |
| 8 | Versioning | T. `models` and `defaultModel` are history scalars with values shown in audit and diffs; restore runs the same `write` | `config_history.py:23`; `admin_api.py:89-106` |
| 9 | Catalog and prices | U. `pricing.py` fetches the public OpenRouter catalog `/api/v1/models` without a key, 10 s timeout, 5-minute per-process cache, and fails closed with `BUDGET_UNAVAILABLE`. Fields read: `id`, `pricing.{prompt, completion, internal_reasoning, overrides}`, `context_length`, `top_provider.{context_length, max_completion_tokens}` (≥4,096 required); `architecture.input_modalities` for vision | `pricing.py:16-81`; `agent_model_policy.py:29-36` |
| 10 | Per-call telemetry | U. `data.budget.model_call_telemetry.{callId}` inside the run that made the call: `role` (8 values), `modelId`, `status`, `createdAt`, tokens, `reasoningTokens`, `providerReportedUsd`, `finishReason`, `durationMs`, `failureCode`. No owner, no text. Specialists write to the parent run | `budget.py:163-201,256-349`; [A1 §2](a1-admin-traces-feedback.md#2-current-state-verified) |
| 11 | Cross-owner scan | T. Index `runs (created_at -1, _id -1)`; A1 caps a scan at 5,000 runs (1,000 under a signal filter) with `truncated`; `MODEL_RE` and the `_call` sanitizer already exist. No TTL on runs | `storage.py:41`; `traces.py:25-30,252-262,405-408` |
| 12 | Per-model usage | **P.** No aggregate anywhere; overview sums today's USD only | `admin_api.py:139-150` |
| 13 | Model test | **P.** No route, collection or helper (grep `models/test`, `model_test`: none) | grep |
| 14 | Env-only models | C. Image models (two fixed ids, `pricing.py:64-65`), `BRIEF_INTERPRETER_MODEL`, `LAYOUT_CRITIC_MODEL`, `SPECIALIST_FALLBACK_MODELS`, and the hosted OpenCode worker's `ALLOWED_MODELS` are env-only; the local app has its own model policy and reports every admin flag false | `settings.py:15-16,24-25`; `hosted/entry.py:49-51`; `local/entry.py:198-203,246` |
| 15 | Provider | All model calls go to OpenRouter with the one server key (`ChatOpenAI(base_url=openrouter)`) | `agent_workflow.py:1840`; `specialist_jobs.py:253`; `brief_interpreter.py:568` |
| 16 | Web plumbing | Capability list, strict nav, proxy allow-list without `admin/models`, `AdminPreview` fixture with two models (`openai/gpt-6.1-sol`, not in the env default list) | `capabilities.mjs:2`; `admin-shell.tsx:17-31`; `route.ts:5`; `admin-preview.tsx:20-21` |

## 3. Decisions needed (recommendation first)

1. **Registry storage.** **(A)** No new stored registry: "enabled" stays the A2-versioned `AppConfig.models` list (history, restore and audit come free); test results go to a new append-only `model_tests` collection; status is **derived**, never stored: `enabled` (in the list), `ready` (latest test passed, not enabled), `failed`, `untested`, `needs_allowlist` (not in env). (B) A `modelEntries` array in `AppConfig` with `{id, label, notes}` (adds editable labels and notes, still versioned). (C) A separate `models` collection with its own CAS (duplicates A2's history and audit).
2. **Env and admin lists.** **(A)** Env `ALLOWED_MODELS` stays the outer ceiling: a config write (PUT or restore) that enables a model outside it gets 422 "Add it to the server allowlist first." Admins can still test any catalog model; adding a new one to production needs an env change (G1). Closes item 3 with no hot-path change. (B) Make the admin list authoritative and change the five execution checks to it (hot path, specialist policy and the hosted worker env; size L).
3. **The test.** **(A)** `POST /v1/admin/models/test {modelId}`: (1) free catalog checks reusing `pricing.py`: listed, fully priced, context headroom, plus `architecture.input_modalities` and *inferred* `supported_parameters` containing `tools`; (2) one paid call with a fixed synthetic prompt, one bound no-op tool, `max_tokens` 512, `timeout` 30 s, `max_retries` 0, effort low; passes when the reply is a valid call of that tool and the finish reason is `tool_calls` or `stop`. Records latency, tokens, provider USD, finish reason, failure code. No user data; the reply text is discarded. (B) Catalog checks only (free, but proves nothing about tool calling).
4. **Test cost bound.** **(A)** Refuse before calling when `model_estimate` exceeds **$0.05** (422 "Too expensive to test"); at most **20 tests per UTC day** across admins (429); counted in `model_tests`. No key configured gives 503 "Provider not configured" and writes nothing; tests stub `ChatOpenAI`. (B) No caps (an admin loop can spend without bound).
5. **Where "off until tested" is enforced.** **(A)** Twice on the server: the shared `config_history.write` refuses (422) any model **added** to `models` whose latest test did not pass; and `app_config.resolved()` drops listed models with no passing or legacy record, so admission and `/v1/config` cannot serve one even if Mongo is edited by hand. The UI only mirrors it. (B) Write path only.
6. **Existing models (migration).** **(A)** On the first registry read, every model in today's resolved list gets one `model_tests` row `{kind: 'legacy', passed: true}` with no measurements, so nothing a user can pick today disappears; the UI labels them "Legacy · not tested" and offers Test. The live config is not rewritten. (B) Require a test before keeping any model (risks an empty picker after deploy).
7. **Usage view.** **(A)** Computed on read: `GET /v1/admin/models/usage?period=7d|30d` scans runs by `created_at` with A1's index and projection, cap 5,000 with `truncated`; buckets by call `createdAt` UTC day, `modelId`, `role`: calls, failed, input/output/reasoning tokens, provider USD (string), p50/p95 duration. (B) Stored daily rollups (exact past the cap, but a write on every call or a job; defer to G1 if the cap is hit).
8. **Visibility.** **(A)** One global list: enabled means every signed-in user sees it. The roadmap's "per-model visibility flag" is the enable switch; groups need a member tier and more than one admin role, neither of which exists (`auth.py:20-31`). (B) A `hidden` flag (still admitted for follow-ups, hidden from new picks) — only if you want "retire" separate from "disable". (C) Groups: defer to a separate decision.
9. **Default model.** **(A)** Must be enabled and passed; a write that disables the default without choosing another gets 422 "Choose another default first." Reads keep today's fallback (`app_config.py:67-68`). (B) Keep the silent fallback on write too.
10. **Disabling with runs in flight.** **(A)** A run already executing finishes on its model; the **next turn** of any task on that model gets today's 400 (item 4), and the web shows "This model was turned off by an admin; pick another model" and keeps the draft. The confirm dialog says so. (B) Let existing tasks keep a disabled model (needs a `retiring` state, decision 8B).
11. **Prices.** **(A)** Show catalog prompt and completion price per million tokens with `fetchedAt`; on catalog failure the list still loads with "Price unavailable". Measured cost is the provider-reported USD from telemetry, labeled separately. (B) Measured only.
12. **OpenRouter credit banner.** **(A)** Not in A3: DATUMM does use one OpenRouter key (item 15), but reading its balance needs a provider endpoint not used anywhere in code; propose it at A4 or G1. (B) Add it now.
13. **Capability flag.** **(A)** `adminModels`, strict (`unknown` = off), production true, local app false. (B) Reuse `adminConfig` (an old backend would 404 the new routes).
14. **Page.** **(A)** New `/admin/models` in the Agent group; enable, disable and default go through the **shared A2 draft and save bar** (no new write route); the Agent page's model chips become a read-only summary with a link when `adminModels` is on, and stay as today when off. (B) Extend the Agent page in place (mixes tests and usage into the budget page).
15. **Test records in history.** **(A)** Tests are observations, not config: append-only, never restored, each one also writes an audit row `kind: 'model_test'` (who, model, passed, USD) because it spends money. Restore re-runs the decision 5 gate: restoring a revision that enables a model whose latest test now fails gives 422 naming it. (B) Version tests inside config (every test bumps the revision and conflicts with an open draft).

## 4. Design (recommended options)

**`model_tests` document** (no owner beyond the admin subject already used by audit; no text):

```json
{"_id": "<uuid>", "modelId": "anthropic/claude-sonnet-5", "kind": "test", "at": "2026-11-18T09:12:03Z",
 "by": "<admin subject>", "passed": true,
 "checks": {"listed": true, "priced": true, "context": true, "tools": true, "imageInput": false,
            "toolCall": true, "finishReason": "tool_calls"},
 "latencyMs": 2140, "inputTokens": 212, "outputTokens": 18, "usd": "0.0011",
 "estimateUsd": "0.0094", "failureCode": null,
 "price": {"promptPerM": "3.00", "completionPerM": "15.00"}}
```

Legacy rows: `{"kind": "legacy", "passed": true, "checks": {}, ...nulls}`. Index `(modelId, at -1)`; `(at -1)` serves the daily cap. `modelId` must match A1's `MODEL_RE`.

**Routes** (all in `admin_api.py`, so `require_admin` gives 401/403):

- `GET /v1/admin/models` → `{schemaVersion: 1, catalogAt | null, catalogError: bool, rows: [{id, status, enabled, isDefault, inAllowlist, latestTest | null, price | null, contextLength | null, imageInput | null}]}`. Rows = env allowlist ∪ admin list ∪ tested ids (bounded ≤60). Runs the legacy migration once (idempotent by `_id = legacy:<modelId>`).
- `GET /v1/admin/models/{modelId:path}/tests?limit=10` → last tests for one model (404 for an invalid id).
- `POST /v1/admin/models/test` body `Strict {modelId}` → 200 with the stored row (pass or fail). 422 bad id, not in catalog, or over the cost cap; 429 daily cap; 503 no key or catalog down (nothing stored).
- `GET /v1/admin/models/usage?period=7d|30d&model=` → `{from, to, scanned, truncated, days: [{day, modelId, role, calls, failed, inputTokens, outputTokens, reasoningTokens, usd, p50Ms, p95Ms}]}`; Pydantic `extra='forbid'`, strings regex-checked, built only from A1's `_call` output.
- **Write gate** in `config_history.write` (PUT and restore): for each id added relative to live: in env allowlist (else 422), latest `model_tests` row passed (else 422 "Test this model first"); default rule (decision 9). Error detail lists model ids only.
- **`app_config.load()`** also loads the set of passed model ids (one query, same 30 s cache); `resolved()` filters `models` by it, falling back to the default rule. *Inferred* cost: one extra query per 30 s per process.

**Privacy and secrets.** The test request carries only the fixed prompt; the key is read from settings at call time and never stored, logged or returned; exception text is not stored (A1 rule, `failure_taxonomy`). Usage rows carry no owner, task id or text. Canary tests cover both (section 7).

**Web.**

- **Proxy:** add `admin/models(?:/test|/usage|/[A-Za-z0-9._:-]{1,80}/[A-Za-z0-9._:-]{1,80}/tests)?` to the v1 pattern (`route.ts:5`). Model ids contain `/`, so the tests path is two segments.
- **Capability:** `adminModels` in `CAPABILITY_FEATURES`; nav `{href: '/admin/models', label: 'Models', feature: 'adminModels', strict: true}` in the Agent group.
- **Pure lib `src/lib/admin-models.mjs` + `.d.mts`:** defensive parsing of rows, tests and usage (drops unknown keys, closed status set), status labels, per-model totals from daily rows, price formatting.
- **`models-section.tsx` (new):** `PageHeader`; stats strip (enabled, ready, failed, usage USD for the period) using the overview `counts` pattern; `Table` with model, status `Badge`, default, price, last test, calls and USD (7d); row actions: **Test** (opens `Dialog` stating the cost cap, a progress line, then the result checks), **Enable/Disable** and **Make default** edit the shared draft (disabled with the reason when untested, failed or outside the allowlist); disable of a model opens a confirmation ("The next turn of chats using it will ask users to pick another model"); the existing save bar saves with CAS. A usage `<details>` per model shows the daily table. 390 px: table scrolls in its region (A1 pattern).
- **Agent page:** chips become a read-only list plus "Manage models" link when `adminModels` is on.
- **Composer:** map the 400 "Model is not enabled." on a follow-up to the decision 10 copy (existing error path).

**Reused:** `require_admin`, `config_history.write` and `ensure_current`, `pricing.model_metadata` / `model_estimate` / `model_context_capacity`, `vision_route`, `budget._reply_diagnostics` and `_provider_cost`, A1 `traces._call`, `MODEL_RE`, `runs (created_at)` index, `adminCall`/`useAdminResource`/`ResultState`, `useSharedAdminConfig`, `PageHeader`, `Table`/`EmptyState`, `Badge`, `Dialog`, `AdminPreview`. No new dependency.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, single owner: backend implementer):

| File | Change |
| --- | --- |
| `model_registry.py` (new) | Row builder, legacy migration, test runner with caps, usage aggregation, response models |
| `admin_api.py` | Four routes |
| `config_history.py` | Write gate (allowlist, passed test, default rule) |
| `app_config.py` | Load passed ids; filter in `resolved()` |
| `storage.py` | `model_tests` indexes |
| `main.py`, `local/entry.py` | `adminModels`: true and false |
| `test_model_registry.py` (new); `test_app_config.py`, `test_config_history.py` | Section 7 |
| `README.md`, `lat.md/` admin section | Code map and registry contract; `lat check` |

**Web** (`datumm-web`, single owner: web implementer):

| File | Change |
| --- | --- |
| `src/lib/capabilities.mjs` + `.d.mts` | `adminModels` |
| `src/app/api/service/[...path]/route.ts` | Allow-list entries |
| `src/lib/admin-models.mjs` + `.d.mts` (new) | Parsing, status, totals |
| `src/components/admin/models-section.tsx` (+ module CSS), `src/app/admin/models/page.tsx` (new) | Models page, test dialog |
| `src/components/admin/admin-shell.tsx` | Strict nav item |
| `src/components/admin/config-sections.tsx` | Read-only model summary when on |
| `src/components/workspace/use-workspace-state.ts` | Disabled-model follow-up copy (one mapping) |
| `src/components/dev/admin-preview.tsx` (+ `admin-models-fixture.ts` new) | Fixture: rows in every status, a test that passes and one that fails, usage, `models-off` state |
| `tests/capabilities.test.mjs`, `tests/admin-proxy.test.mjs`, `tests/admin-models.test.mjs` (new) | Section 7 |
| `lat.md/contracts.md` | Off-until-tested rule |

## 6. Contract changes, dependencies and risks

| Change | Kind |
| --- | --- |
| `GET /v1/admin/models`, `GET …/{id}/tests`, `POST …/models/test`, `GET …/models/usage`, collection `model_tests` | Backend, new, admin-only; size M |
| `PUT /config` and restore 422 for untested, out-of-allowlist or default-less model lists | Backend, **behavior change** for admin writes |
| `resolved()` drops models with no passing or legacy record | Backend, **behavior change** for `/v1/config` and admission (none today after migration) |
| `adminModels` flag, proxy entries, Models page | Additive; absent flag means off |

No change to v2 commands, checkpoints, `PublicTask`, `PublicEvent` or native approval. No new dependencies.

| Risk | Containment |
| --- | --- |
| Provider cost of tests | $0.05 estimate cap, 20/day, `max_tokens` 512, no retries; each test audited with its USD |
| Catalog fetch failure | List and usage still load (`catalogError`); test returns 503 and stores nothing |
| Stale prices | Show `fetchedAt`; measured cost comes from provider-reported USD |
| Breaking existing runs or picker | Legacy rows keep every current model; in-flight runs untouched; gate applies only to models **added** |
| Admin list outside env (existing bug, item 3) | Write gate 422; an existing stored list is still loaded (gate is write-only), so a production config that already holds such an id keeps today's behavior until edited (*inferred* none; G1) |
| A hand-edited Mongo list | `resolved()` filter |
| Usage undercounts past 5,000 runs | `truncated` shown; rollups deferred (decision 7B) |

## 7. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 499 + 26 subtests, recorded 17 Nov), written to fail on `70ce912` first:

1. **Off until tested, at admission:** add an untested model via PUT gives 422; seed it into Mongo directly: `/v1/config` omits it and v2 submit with it gives 400.
2. **Pass then enable:** stubbed provider returns a valid tool call: test stored `passed`; PUT enabling it succeeds; picker list includes it. A failing stub (no tool call, `length`) stores `passed: false` and enable gives 422.
3. **Bounds:** estimate over $0.05 gives 422 with no provider call; the 21st test of a UTC day gives 429; no key gives 503 and no row; the stub asserts `max_tokens` 512, `max_retries` 0 and the fixed prompt.
4. **Allowlist and default:** enabling a model outside env 422; disabling the default without a new default 422.
5. **Migration:** first `GET /models` creates one legacy row per resolved model; repeated calls create none; the picker list is unchanged.
6. **Restore interplay:** r1 enables X (passed); r2 disables X; a later failing test of X; restoring r1 gives 422 naming X; with a passing test it creates r3.
7. **Usage:** seeded telemetry across two days, two models, three roles: per-day totals equal the sums; a run outside the period is excluded; cap sets `truncated`.
8. **Privacy canary:** `CANARY` in run title, prompt, answer and a hostile `modelId`; the provider stub's reply contains `CANARY`: neither usage, list, tests nor audit responses contain it; no key value appears in any response or stored row.
9. **Admin-only:** 401 and 403 on all four routes. **In flight:** a running run's state is untouched by a disable; the next `amend` gets 400.
10. **Capabilities:** production and local values; existing CAS and history tests pass unchanged.

**Web** (`npm test`, baseline 749): flag with `unknown` = off; proxy allows the four paths (with a two-segment id) and blocks `admin/models/x/y/z`; parser drops unknown keys and unknown statuses; totals from daily rows; nav hidden unless on; Enable disabled for untested rows.

**Browser** (built-in browser, local dev server, controlled fixture only: `/dev/ux` "Admin fixture"), 1280 px and 390 px, light and dark:

1. Models page lists rows in each status with price and 7-day usage; legacy rows read "Legacy · not tested".
2. Test a ready model: dialog states the cost cap, shows progress, then checks and latency; status becomes Passed.
3. Enable it, save: Agent summary and the save bar show the new revision; Config history shows `models` changed.
4. A failing test: Enable stays disabled with "Last test failed".
5. Disable the default without choosing another: inline error; choose another default, confirm disable, save.
6. Keyboard: Tab to Test, Enter opens the dialog with focus inside, Escape returns focus.
7. `models-off`: no Models nav, a direct visit reads "Not provided by this backend", Agent page chips as today.
8. 390 px: no page overflow; tables scroll in their region; the dialog fits.

Live provider tests and hosted behavior need G1.

## 8. Acceptance criteria

- A model cannot be admitted before a passing test and an enable, enforced by the server at write and at admission (tests 1–2).
- Tests are bounded by the estimate cap, the daily cap and the call settings, and store no text (tests 3, 8).
- Usage totals equal the seeded telemetry and are text-free (tests 7–8).
- Every model selectable today remains selectable after deploy (test 5).
- Admin-only access is enforced by the backend (401/403).
- Without `adminModels`, the web behaves as today.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`; runtime smoke `--production`. Counts recorded.

## 9. Rollback

Revert the backend and web commits. Without the flag the web hides the page; the Agent page chips return. The `resolved()` filter and write gate disappear with the revert, so the admin list behaves as today. Left behind: the `model_tests` collection (legacy and test rows), audit rows of kind `model_test` and two indexes, unused and droppable by hand. The `app_config` document is never migrated.

## 10. Open questions found during research

1. **Two allowlists drift (item 3):** the research record says they "can drift"; the code shows the consequence: an admin-enabled model outside env is admitted and then fails at the planner (`agent_workflow.py:1455`). Decision 2. Whether production's admin list already holds such an id needs G1.
2. **"Admins add models":** with decision 2A, adding a brand-new model still needs an env change and redeploy; the web can only test and stage it. Full admin control is decision 2B (size L).
3. **"Per-model visibility flag":** with one admin role and no member tier (`auth.py:20-31`) a separate visibility flag only matters for "hidden but still served to existing chats" (decision 8B); groups remain the roadmap's open question 4.
4. **Specialist, brief, vision and image models** are not admin-controlled (item 14); the registry shows their measured usage by role but cannot enable or test them as separate roles. Panda's per-role pools are out of scope.
5. **Tool support in the catalog:** `supported_parameters` is not read anywhere in code; its presence and meaning are *inferred* from OpenRouter's public schema and must be checked against a live catalog response before relying on it (the paid probe is the real check).
6. **Credit banner:** DATUMM uses OpenRouter credit through one key, but no code reads the balance; decision 12.
7. **Telemetry untested directly (A1 item 8)** and still inside run documents with no TTL: usage depends on runs never being purged.
8. **Web branch:** the checkout reports `main` at `93806ba`, while the handoff names `codex/ui-ux-foundation-2026-11-12`; confirm the branch before building.
9. **Fixture model** `openai/gpt-6.1-sol` (`admin-preview.tsx:20`) is not in the env default list; under decision 2A the fixture must mark it `needs_allowlist` or replace it.
