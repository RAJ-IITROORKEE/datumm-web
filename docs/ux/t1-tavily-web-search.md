# Phase packet — T1: Tavily web search

| Field | Value |
| --- | --- |
| Status | **approved 17 Nov (recommended options), build in progress; deploy waits for the user's key and template go-ahead** |
| Depends on | UI2 (done); [parity plan](panda-parity-plan-2026-11-17.md) row 15, step 4; H5 = A and H3 = A ([harness decision](harness-decision-2026-11-17.md) lines 60, 77); [go-live plan](g1-go-live-plan.md) deploy path (B2 rehearsal, B3 change set) |
| Approved by / date | User's standing instruction, 17 Nov ("proceed to next automatically ... as per the plan"): T1-a to T1-g take the recommended option. The stack-template change and the secret value need the user's own go-ahead and action |
| Base commits | Backend local `main` `1b64a2c`; live backend `95b2361` ([HANDOFF](HANDOFF.md) line 77). Web `main` `98ddc08`. Panda `panda-agent-ui/Panda-agent` working tree as read 17 Nov |

Facts marked **observed** were read in source on 17 Nov with `path:line`; *inferred* ones were
reasoned, not run. No test, build, server, browser, network, Tavily or AWS call was made for this
packet. Backend paths are under `datumm-orchestrator/apps/domain-api/` unless prefixed; Panda paths
under `Panda-agent/src/`. Tavily API facts (endpoint, fields, credits, price) are from memory of
its public docs and are **not verified** this session.

**Design rules (user; mandatory).** Keep DATUMM's theme and typography exactly; components from
`src/components/ui` and `vendor/affectui`; port onto the LangGraph backend (H5 = A). The Tavily key
lives only in AWS Secrets Manager (H3 = A); agents never see, print or store it.

## 1. Goal and non-goals

An administrator can switch the agent's general `web_search` tool from OpenRouter (Exa) to Tavily
on the Web search admin page once DATUMM's own Tavily key exists. Answers then cite pages that
Tavily actually returned, with the same per-run budget (4 searches), the same domain allowlist and
the same "evidence is data" rules; one search costs one Tavily credit and no model tokens. Until
the switch is flipped, nothing users see changes.

Non-goals: moving `search_regulations` (claim extraction needs a model; T1-b); Tavily extract,
crawl or research endpoints; raw page content or Tavily's generated answer; images; fetching result
URLs from the server; a per-owner quota (T1-f B); admin usage dashboards for credits; token
streaming; any new Python or npm dependency (`httpx` is already used, `research_tools.py:12`).

## 2. Current state (verified)

Key: **T** implemented and tested; **U** implemented, under-tested; **A** absent.

| # | Item | State | Evidence (observed) |
| --- | --- | --- | --- |
| 1 | Search adapter: one OpenRouter chat completion with the `web` plugin (`engine: exa`, `mode: fast`, `max_results`, optional `include_domains`), `allow_fallbacks: False` | **T** | `research_tools.py:147-176`; test `test_round3_agent.py:220-232` |
| 2 | Outbound HTTP: `httpx.AsyncClient(timeout=50, follow_redirects=False)`, streamed, 256,000-byte cap, key from `settings.openrouter_api_key` | **U** (cap untested) | `research_tools.py:167-176`; `settings.py:7` |
| 3 | General `web_search`: `WebQuery` 3–300 chars, rejects URLs, secret words, "ignore … instructions", UUIDs, long hex | **T** | `research_tools.py:300-309,333-394`; `test_round3_agent.py:132-133` |
| 4 | Regulation research `search_regulations` (structured jurisdiction query, model-written claims linked to returned URLs, `bounded_advisory_text`) | **T** | `research_tools.py:179-291` |
| 5 | Callers: tool definitions offered only when research is requested; `web_search` removed when admin turns it off; dispatch | **T** | `agent_workflow.py:1134-1140,1577-1578,2733-2746`; regex gate `:1021`; at most 2 calls per tool `:603-604` |
| 6 | Admin config `webSearch {enabled, includeDomains ≤30, maxResults 1–10}`, read live (30 s cache) | **T** | `app_config.py:24-27,55,75,94-98`; `test_config_history.py:265-297` |
| 7 | Admin UI: Web search page (switch, domain chips, max results) | **T** | web `src/components/admin/config-sections.tsx:75-95`; `src/lib/admin-config.mjs:8,33-36` |
| 8 | Budget: `agent_web_searches` 4, `agent_research_calls` 2 per run ledger (continuations share it); each search also reserves a tool call, a model call, 18,000 input tokens and USD (`SEARCH_PRICE_USD` 0.007 + model estimate) | **T** | `budget.py:14-15,146-160`; `research_tools.py:22,360-373` |
| 9 | Dedupe: SHA-256 of the case-folded query on the ledger; a replay returns the stored result, a still-`reserved` one is never resent | **T** | `research_tools.py:340-359`; `test_round3_agent.py:130-131` |
| 10 | Sources: only provider `url_citation` annotations survive; `safe_source_url` (https, port 443, no credentials, no IP literal, no `localhost/.local/.internal/.test/.invalid`, no credential query); ≤5 sources, excerpt ≤1,500 chars, id `source-<sha256[:16]>`, `trustedInstructions: False` | **T** | `research_tools.py:48-68,312-330`; reused by `knowledge.py:23` |
| 11 | Citations: a finding's `evidenceRefs` must exist in the evidence index, which includes every `regulation_research` source id; else `UNSUPPORTED_ADVICE` | **T** (via advice tests) | `model_evidence.py:69-71,95-101` |
| 12 | Links written in the free-text `answer` are not checked against retrieved sources | **A** (*not found* in `finish_answer`, `agent_workflow.py:2748-2760`; web rendering not checked) | — |
| 13 | Results downstream: plan-step evidence needs `retrieved` with sources; compaction keeps 3 sources without excerpts; share view lists source URLs; public run view strips `cost`, `callId`, `queryFingerprint` | **T/U** | `agent_task_plan.py:256-258`; `agent_compaction.py:57-66`; `share_api.py:49-53`; `storage.py:72-74` |
| 14 | Failure: any search exception → result `unavailable` (run continues); telemetry via `record_model_call_failure` → `classify_failure` (`provider_timeout`, `provider_unavailable`) | **U** | `research_tools.py:389-391`; `budget.py:338-347`; `failure_taxonomy.py:106-124` |
| 15 | Capabilities: fixed booleans on `/v1/config`; web treats unknown as off | **T** | `main.py:294-298`; web `src/lib/capabilities.mjs:2,10-13` |
| 16 | Admin save: `AppConfig` is strict (`extra='forbid'`), but `load()` and history keep only known **top-level** keys; a nested unknown key in `webSearch` fails validation | **T** | `app_config.py:20-21,79-81`; `config_history.py:59-63,133`; `admin_api.py:24` |
| 17 | History diff flattens `webSearch.*` and `SCALARS` | **T** | `config_history.py:25,74-78` |
| 18 | Secret wiring: runtime secret JSON keys `OPENROUTER_API_KEY`, `DESKTOP_AUTH_SIGNING_KEY`, `DESKTOP_AUTH_PROXY_SECRET`; three `Secrets` entries; execution role may read the whole secret | **T** (live, per G1 P6) | `infra/orchestrator/stack.json:279-284,417-427,717-736,1134-1135` |
| 19 | Tavily anywhere in the backend | **A** | `grep -rli tavily` over `apps/domain-api/*.py` (excluding `.venv`): no match |

Panda reference (observed): request body `search_depth: basic`, `max_results: 3`,
`include_answer: false`, `include_raw_content: false`, `auto_parameters: false`, `include_usage`
when hosted (`search/tavily.ts:100-101`); `redirect: 'error'`, 20 s timeout, 1 MiB body cap, ≤3
results, ≤16,000 content chars (`:116,144,163,182,192`); query screen adds e-mail, key-shaped
tokens and ≥10-digit runs (`:48-51`); result URL https, no port, query or fragment, DNS-resolved
and every address public (`:83-98`); per-turn limit (`agent-loop/tools.ts:517`); `W…` citation ids
must come from this turn's results, else `unknown_citation` (`agent-loop/tools.ts:559`; the brief's
`:547` is the start of that function); key from `TAVILY_API_KEY` (`agent-loop/runtime.ts:182-183`);
daily limit name `web_searches` (`agent-loop/daily-limits.ts:2`).

## 3. Decisions for the user (recommendation first)

1. **T1-a Provider setting.** **(A) New top-level admin field `webSearchProvider`**
   (`'openrouter' | 'tavily'`, default `'openrouter'`). Top level, because an older backend drops
   unknown top-level keys but rejects an unknown key inside `webSearch` (item 16), so an image
   rollback cannot break config loading. (B) `webSearch.provider`: needs a Mongo `$unset` before
   any image rollback. (C) Env var only: no admin switch.
2. **T1-b Scope.** **(A) Only general `web_search` moves**; `search_regulations` stays on OpenRouter
   because its claims come from the model's search answer. (B) Regulation research also uses
   Tavily results plus a separate model call for claims (backend M, new prompt and tests).
3. **T1-c Fallback.** **(A) Fall back to OpenRouter only when nothing was sent**: Tavily selected
   but no key. A Tavily error after sending returns `unavailable` as today; no second provider
   call, no double charge. (B) Also fall back on Tavily errors (two searches for one budget slot).
4. **T1-d Result URL check.** **(A) Reuse `safe_source_url`** (item 10): the server never fetches
   result URLs, so DNS resolution adds latency without SSRF value. (B) Port Panda's DNS
   private-address check (3 s per host, `search/tavily.ts:83-98`).
5. **T1-e Links in answer prose.** **(A) In `finish_answer`, turn any https link whose URL is not a
   retrieved source of this run into plain text** (one helper, both providers), matching Panda's
   `unknown_citation` intent. (B) Leave prose links as today (item 12).
6. **T1-f Daily limit.** **(A) One global daily cap on Tavily requests** (constant 300 per UTC day,
   atomic counter document in a new `search_quota` collection; at the cap the search returns
   `unavailable` "Daily web search limit reached"). (B) Per-owner cap (owner lookup per search).
   (C) None: rely on the per-run 4 and the Tavily plan's own cap.
7. **T1-g Query screen.** **(A) Add Panda's e-mail, key-shaped token (`tvly-`, `sk-`…) and ≥10-digit
   checks to `WebQuery`** (one regex, both providers). (B) Keep today's screen.

## 4. Design (recommended options)

**Adapter** (`research_tools.py`, beside `OpenRouterSearchAdapter`), `TavilySearchAdapter.search(
query, *, max_results, domains)`:

- `POST https://api.tavily.com/search`, header `Authorization: Bearer <settings.tavily_api_key>`.
  Body: `query`, `search_depth: 'basic'`, `max_results: min(cfg.maxResults, 5)`,
  `include_domains: cfg.includeDomains` (omitted when empty), `include_answer: false`,
  `include_raw_content: false`, `include_images: false`, `include_usage: true`. Nothing else: no
  model, prompt, project, element, owner or chat data leaves the server, only the public query.
- `httpx.AsyncClient(timeout=httpx.Timeout(20, connect=5), follow_redirects=False)`, streamed with
  the existing 256,000-byte cap; non-2xx, non-JSON content type or a body that is not
  `{results: [...]}` raises.
- Returns the bounded results list plus `usage.credits` and `request_id` when well formed.

**`web_search` changes** (same function, `research_tools.py:333-394`):

- Provider = `cfg.webSearchProvider`; `tavily` without a key → OpenRouter path (T1-c A); the
  "not configured" check becomes per provider.
- Tavily path reserves `agent_web_searches` and `agent_tool_calls` and USD (`TAVILY_SEARCH_USD`,
  one basic credit; price is open question 1). It reserves **no** model call and no tokens.
  Then the daily cap (T1-f A), then the request. A run that hits the daily cap has still spent that
  search slot without sending a request, and will not retry that query in the same run.
- `tavily_sources(results, retrieved, limit)`: each result needs string `url`, `title`, `content`;
  URL through `safe_source_url`; control characters removed; title ≤240, excerpt ≤1,500; dedupe by
  URL; same source shape and `source-<hash>` id as `web_sources` (item 10), so evidence index,
  citations, compaction, share and public view (items 11, 13) need no change. Tavily's `score` is
  dropped.
- Result adds `provider: 'tavily'` and `cost {provider, credits, requestId, reservedUsd}`; `cost`
  is already stripped from the public view (`storage.py:72-74`). Dedupe and ledger claim unchanged.
- Errors: exceptions are caught as today → `unavailable`. A bounded `providerStatus` is stored on
  the result: `timeout` (httpx timeout), `rejected` (401/403), `quota` (429 and Tavily's
  plan-limit codes, *assumed* 432/433), `failed` (other). User text stays generic; no provider body
  or key is stored or logged. Run-level failure codes are unchanged (the run never fails on search).
- Telemetry: the existing `research` event; credits on the result; no model-call row (no model).

**Untrusted text.** Tavily `content` is page text and may contain instructions. It stays an
excerpt in a `regulation_research` observation with `trustedInstructions: False`; the tool
description already says excerpts are untrusted (`agent_workflow.py:1139`). No new rendering path.

**Citations.** Findings cite `source-…` ids, checked by `bind_advice` (item 11). T1-e A adds
`answer_links(answer, sources)` in `model_evidence.py`: markdown links and bare https URLs not
equal to a retrieved source URL of this run become their link text.

**Capability and admin.** New capability `tavilySearch` = `bool(settings.tavily_api_key)` (reveals
presence only). Web admin Web search page: one `Select` (`@/components/ui/input`, as used at
`config-sections.tsx:48`) "Search provider": "OpenRouter (Exa)" and "Tavily"; the field and option
render only when the capability is known; Tavily is disabled with hint "Tavily key not configured
on the server" when `tavilySearch` is false. The web never sends `webSearchProvider` to a backend
without the capability (an old backend would reject it with 422, item 16). No token or font change.

**Key delivery.** `settings.tavily_api_key: str = ''` (env `TAVILY_API_KEY`). Template:
one `Secrets` entry `{"Name": "TAVILY_API_KEY", "ValueFrom": "${RuntimeSecret}:TAVILY_API_KEY::"}`
in the task definition (`stack.json:717-736`) and the key name added to the `RuntimeSecretArn`
output description (`:1135`). The `RuntimeSecret` resource description (`:284`) is left unchanged
so the change set touches only `Task` and `Service`. The execution role already reads the secret
(`:424-427`); no IAM change.

## 5. Contract changes

| Change | Kind |
| --- | --- |
| `AppConfig.webSearchProvider: Literal['openrouter','tavily'] = 'openrouter'`; history `SCALARS` += it | Backend S; old backends ignore it on load (item 16) |
| Capability `tavilySearch` on `/v1/config` | Backend S; web adds the name to `CAPABILITY_FEATURES` (unknown = off) |
| `web_search` result: `provider`, `providerStatus`, `cost.credits`, `cost.requestId` | Backend S; `cost` already private; observation shape otherwise unchanged |
| New collection `search_quota` (`_id: 'tavily:<YYYY-MM-DD>'`, `count`) | Backend S; no index beyond `_id` |
| Task definition `Secrets` entry `TAVILY_API_KEY` | Infra; template change |
| No v2 command, AG-UI event, proxy allow-list or checkpoint change | — |

## 6. Change list

**Backend** (single owner: backend implementer; branch `claude/t1-tavily`):

| File | Change |
| --- | --- |
| `settings.py` | `tavily_api_key` |
| `app_config.py` | `webSearchProvider` field and in `resolved()` |
| `config_history.py` | add to `SCALARS` |
| `research_tools.py` | `TavilySearchAdapter`, `tavily_sources`, provider branch and daily cap in `web_search`, `WebQuery` regex (T1-g) |
| `model_evidence.py`, `agent_workflow.py` (finish path, wiring only) | `answer_links` (T1-e) |
| `main.py` | `tavilySearch` capability |
| `test_tavily_search.py` (new) | Section 7 |
| `README.md` code map, `lat.md/` research note | Text; `lat check`; `npm run graph:update` |
| `infra/orchestrator/stack.json` (+ `infra/orchestrator/README.md` secret list) | `Secrets` entry, output description |

**Web** (single owner: web implementer): `src/lib/capabilities.mjs` + `.d.mts` (name),
`src/lib/admin-config.mjs` (validate the field only when present; `emptyConfig` unchanged),
`src/components/admin/config-sections.tsx` (Select, ≤20 lines), admin fixture under
`src/components/dev/` (capability on/off, key absent), `tests/admin-config.test.mjs`,
`tests/capabilities.test.mjs`.

## 7. Tests and browser scenarios

**Backend unit** (`uv run --frozen pytest`, baseline 530 + 26 subtests recorded 17 Nov), with a
fake adapter or `httpx.MockTransport`; no network:

1. Request body exactly as section 4 (basic, ≤5, domains only when set, answer/raw/images off);
   header carries the key; no prompt, model or project text in the body.
2. Result filtering: `http`, IP literal, `localhost`, `.internal`, credential query, missing
   title/content, duplicates dropped; excerpt ≤1,500; ids stable; `trustedInstructions` false.
3. Budget: reserves web search, tool call and USD, no model call; 5th search in a run refused;
   replayed query sends nothing.
4. Fallback: provider `tavily` with empty key → OpenRouter fake called once; Tavily 500, 401, 429,
   timeout, oversize body and non-JSON → `unavailable` with the right `providerStatus`, OpenRouter
   not called, key absent from result and logs.
5. Daily cap: 300th request passes, 301st `unavailable` without a send; concurrent upsert race
   counts once.
6. Config: old-shape document loads; `webSearchProvider` saved, versioned and diffed; invalid value
   422. A document carrying `webSearchProvider` loads under the old `AppConfig` filter.
7. `answer_links`: retrieved URL kept; unknown URL becomes text; no URL unchanged.
8. `WebQuery`: e-mail, `tvly-…`, 10-digit run rejected; ordinary phrase accepted.
9. Capability reflects key presence; `/v1/config` never contains the key.

**Web unit** (`npm test`, baseline 831 recorded 17 Nov): capability name; validation accepts the
two values and absent; `emptyConfig` has no provider.

**Browser**, built-in browser, 1280 px and 390 px, light and dark:

- *Controlled fixture* (`/dev/ux` Admin): (1) capability absent → page as today. (2) capability
  false → Select shown, Tavily disabled with hint. (3) capability true → choose Tavily, Save,
  history row shows `webSearchProvider` change.
- *Real localhost* (signed in, local backend with in-memory Mongo, no keys, per
  [HANDOFF](HANDOFF.md)): (4) Web search page shows the Select with Tavily disabled; saving
  OpenRouter round-trips.
- *Hosted, only after the key exists and the switch is on*: (5) an Ask turn "What does Revit 2027
  add for stairs? Search the web." returns an answer whose sources are Tavily URLs, with no link
  outside them; admin traces show the run without key text.

## 8. Acceptance criteria

- With `webSearchProvider` `openrouter` (the default) behaviour and the request sent are byte-for-
  byte today's (existing tests unchanged and passing).
- With `tavily` and a key: one Tavily request per new query, no model call for the search, ≤5
  sources, all `safe_source_url`-valid, budget 4 per run and the daily cap enforced.
- Without a key, selecting Tavily is impossible in the UI and harmless on the server (fallback).
- No key value in repo, logs, results, traces, events, docs or chat; the key is read only from env.
- Change set preview touches only `Task` and `Service`.
- Gates: backend pytest, `lat check`, `npm run check:graph`; web `npm run typecheck`, `npm test`,
  `npm run build`, `lat check`. No colour, font or token line in the web diff; no new dependency.

## 9. Deploy and rollback

**What the user does (agents never see the value):** create the DATUMM Tavily account and key
(H3 A); in the AWS console open the runtime secret (`RuntimeSecretArn` output), Retrieve → Edit,
add key `TAVILY_API_KEY` with the value, save. Do this **before** the change set runs: ECS refuses
to start a task whose `Secrets` entry names a missing JSON key (*inferred* from ECS behaviour; the
circuit breaker would roll back after an outage). For local tests, put it in
`apps/domain-api/.env` (git-ignored, `.gitignore:16`) only if wanted.

**Path** (each step needs its own approval; AWS steps run by the user, D8 A): backend commit →
image build → B2 rehearsal on a data copy **without** the key (capability false, provider stays
OpenRouter, `/health` new commit) → **one change set** using the repo template (not
`--use-previous-template`) with the new `ImageUri`, other parameters `UsePreviousValue` →
preview must list only `Task` and `Service` → execute (about 1 min outage as in G1) → check
`/v1/config` shows `tavilySearch: true` → web deploy → admin selects Tavily → hosted scenario 5.

**Rollback:** (1) admin selects OpenRouter (live within 30 s, `app_config.py:96`); (2) image
rollback by change set to the previous image: the stored `webSearchProvider` is ignored by old code
(T1-a A); (3) template rollback by re-deploying the previous template; the extra key may stay in
the secret harmlessly. Left behind: `search_quota` documents, `provider`/`cost` fields on research
results, one history row.

## 10. Open questions

1. **Tavily plan and price.** Which plan (free credits per month or pay-as-you-go), and the USD per
   credit for `TAVILY_SEARCH_USD` (memory says about 0.008; *not verified*). It sets the daily cap.
2. **Latency.** Tavily basic search is expected to be faster than the OpenRouter call (no model
   step), *not measured*; measure on the hosted scenario.
3. **Excerpt quality.** Tavily `content` snippets versus Exa excerpts for building-code pages: does
   `basic` give enough text, or is `advanced` (2 credits, *not verified*) needed for regulation-
   adjacent questions?
4. **Plan-limit status codes** (432/433) are assumed; confirm from Tavily docs at build time.
5. **Same change set as another template change?** If `TRACE_OWNER_HASH_SECRET` (G1 D9) is still
   pending, both `Secrets` entries could go in one change set (one outage) once both keys exist.

## Result (17 Nov)

Code built on `main` (Sonnet implementers, independent Opus review, Opus fixes). Backend `e89d52c` (local; ships with the template change once the key exists). Web `649b29f` live: the provider choice shows "Tavily key not configured on the server" until then.

| Item | Outcome |
| --- | --- |
| Review | 1 HIGH fixed: `answer_links` corrupted Markdown on every answer; now only inline `[text](url)` links outside code, only in runs that searched the web, URLs normalised; other answers byte-for-byte unchanged. 4 MEDIUM fixed or ruled: composition dropped with a recorded reason when the answer is rewritten; 25 s total Tavily deadline; other Markdown forms untouched; links the model knows kept unless a web search ran. LOW: `remainingPlanNote` uses the final text; daily-cap behaviour documented; query rules apply to outbound web queries only (13+ digits, cards, `+` phones, emails, key tokens) |
| Gates (orchestrator) | Backend 636 passed + 26 subtests, `lat check` passed. Web typecheck clean, `npm test` 833 / 833, `lat check` passed, `npm run build` exit 0, live smoke 18 / 18 |
| Browser (built-in, signed-in localhost on the T1 backend without a key) | Admin Web search shows "Search provider: OpenRouter (Exa)" with "Tavily key not configured on the server"; theme unchanged |
| Not run | Any real Tavily call (no key), live Tavily answers, the template change and its deploy |
| User action needed | Add `TAVILY_API_KEY` (and optionally `TRACE_OWNER_HASH_SECRET`) to the runtime secret, then approve the stack-template change; backend image, rehearsal and switch follow in one change set |

