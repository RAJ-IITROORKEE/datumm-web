# Phase packet — A4a: Tool catalog, per-mode switches, approval modes and risk classes

| Field | Value |
| --- | --- |
| Status | **done 17 Nov; web live with this commit; backend ships with the next backend release** |
| Depends on | T1 built (backend `e89d52c`, web `649b29f`); A2 versioned config; [parity plan](panda-parity-plan-2026-11-17.md) rows 10–12, step 5; H5 = A |
| Approved by / date | User's standing instruction, 17 Nov ("proceed to next automatically ... as per the plan"): A4a-a to A4a-g take the recommended option |
| Base commits | Backend local `main` `e89d52c` (read 17 Nov). Web `main` as read 17 Nov. Panda `panda-agent-ui/Panda-agent` working tree as read 17 Nov |

Facts marked **observed** were read in source this session with `path:line`; *inferred* ones were
reasoned, not run. No test, build, server, browser, network or AWS call was made for this packet.
Backend paths are under `datumm-orchestrator/apps/domain-api/`; Panda paths under `Panda-agent/src/`.
The backend `CLAUDE.md` asks for graphify queries first; this research used direct reads instead.

**Design rules (user; mandatory).** Keep DATUMM's theme and typography exactly; layout and behaviour
from Panda; components from `src/components/ui` and `vendor/affectui`; port onto the LangGraph
backend (H5 = A). **A native Revit write keeps its exact-proposal approval in every approval mode;
no setting, mode, card answer or admin switch added here can authorize one** (AGENTS.md line 79).

## 1. Goal and non-goals

An administrator opens **Admin → Tools**, sees every agent tool with what it does, where it runs
and its risk class, and switches each optional tool on or off separately for Ask, Plan and Build;
saves are versioned, diffed, audited and restorable like every A2 config change. A user picks how
the agent asks before acting in **Settings → Permissions**: Ask (default), Safe or Full auto. The
backend enforces both. A tool call that needs approval pauses on a card ("Allow once" / "Don't
allow") that expires after 15 minutes. Revit model changes always use today's exact-proposal card.

Non-goals: MCP tools (A4c), skills registry (A4b), "Allow always in this chat", an approval log
page, per-user tool switches, document tools (H6), new risk classes, any change to the native
approval path, Full Control, task Full Access or scoped agent access.

## 2. Current state (verified)

Key: **T** implemented and tested; **U** implemented, under-tested; **A** absent.

| # | Item | State | Evidence (observed) |
| --- | --- | --- | --- |
| 1 | Native registry `AgentTool(name, purpose, access read/propose/write, modes, requires_document)`: 12 reads, `preview_changes` and `compile_variable_plan` propose, `apply_change_set` write (Build only); asserts every read is in relay `READ_TOOLS` | **T** | `agent_tools.py:9-53`; `relay.py:4-5` |
| 2 | `available()` intersects advertised connector tools with that policy; writes excluded unless `permit_writes` | **T** | `agent_tools.py:56-63` |
| 3 | The decide step calls `available('analyze' if ask else 'build', …)` **without** `permit_writes`, so the model is never offered `apply_change_set` | **T** | `agent_workflow.py:1481-1483` |
| 4 | Model-visible tools are built per mode in `_tools`: always `finish_answer`, `ask_question`, `plan_task`; research (`search_regulations`, `knowledge_search`, `web_search`) in Ask always and in Plan only on a regulation regex, never Build; `lookup_evidence` and nine `inspect_*`/`query_elements` tools only with a Revit document and the matching advertised read; `generate_concept_image` in Ask, or Plan once a design exists; `propose_changes` in Plan/Build with `preview_changes`; `create_design` in Plan before a design | **T/U** | `agent_workflow.py:1107-1191` |
| 5 | Later focus filters narrow the list (plan step, goal regex, repeats, budget, read-only brief) | **T** | `agent_workflow.py:1014-1030,1514-1564` |
| 6 | Only admin tool switch today: `webSearch.enabled` removes `web_search` (all modes) | **T** | `agent_workflow.py:1577-1578`; `app_config.py:24-27` |
| 7 | A tool the model picks that was not offered is rejected (`AGENT_INVALID_ACTION`) | **T** | `agent_workflow.py:1912,1921` |
| 8 | Native writes: the graph's `approve` node interrupts for the exact proposal; three pre-existing owner grants can auto-approve, each claimed atomically and confirmed by Revit `approve_change_set` against the same `proposalId`, `approvalHash`, `documentId`, `revision`: task Full Access (30 min), scoped agent access for a selected variable plan (≤120 elements), Full Control for the validated 3BHK (1 h) | **T** | `workflow.py:329-413`; `main.py:328,360,596-641`; `agent_access.py:19-80` |
| 9 | Human approval `POST /v1/runs/{id}/resume` needs status `awaiting_approval`, re-checks plan selection, leases a claim and requires Revit to confirm the exact proposal; expiry `PROPOSAL_EXPIRED` handled | **T** | `main.py:1066-1118,728-736`; `proposal_refresh.py:30` |
| 10 | Web approval card: "Approve these exact changes", document, revision, expiry countdown, disabled when stale, "Refresh expired review", "Configure task Full Access" | **T** | `src/components/review/proposal-approval.tsx:8-32`; `conversation.tsx:817-819` |
| 11 | Questions: versioned records (≤4 items, ≤3 options), `pause_question` sets `needs_input`; reply needs status `needs_input` and the same question id and version; v2 `commands` route into it | **T** | `agent_questions.py:48-104`; `agent_workflow.py:2084-2099`; `main.py:645-662`; `task_controller.py:624` |
| 12 | No question or card expiry; no per-user preference store (collections in use include `runs`, `devices`, `app_config`, `config_history`, `admin_audit`; none per-user settings) | **A** | `grep storage.db.*` over `*.py` |
| 13 | Skills are prompt text per mode; MCP servers stored only | **T** | `agent_model_policy.py:117-123`; `app_config.py:39-45` |
| 14 | External calls: `web_search` (OpenRouter Exa or Tavily), `search_regulations` (OpenRouter), `generate_concept_image` (image model, reserves `image_calls`) | **T** | `research_tools.py` per T1; `agent_workflow.py:2542-2560` |
| 15 | Config: `AppConfig` strict; `load()`, `validated()` and `ensure_current()` keep only known **top-level** keys; PUT body is strict (unknown key → 422); write is `$set` (never unsets) | **T** | `app_config.py:20-21,81-83`; `config_history.py:60-66,134,184-186`; `admin_api.py:22-25` |
| 16 | History diff flattens `SCALARS`, `limits.*`, `webSearch.*`, skills and MCP items | **T** | `config_history.py:25-29,77-87` |
| 17 | Capabilities: fixed booleans on `/v1/config`; web treats unknown as off for gated features | **T** | `main.py:294-306`; web `src/lib/capabilities.mjs:2,8-22` |
| 18 | Web admin: Agent, Models, Web search, Knowledge, Skills, MCP pages; no Tools page. Settings: no Permissions section | **A** | `src/components/admin/admin-shell.tsx:19-33`; `src/components/settings-navigation.mjs:1-10` |
| 19 | Proxy allow-list has `config`, `tools` (native read tools at `/v1/tools`) and `admin/config…`; no `me/…` route | **T** | `src/app/api/service/[...path]/route.ts:5,19-20`; `main.py:452` |

Panda reference (observed): `TOOL_CATALOG` entries `{name, label, description, group, runsOn,
required, setting}` and per-tool Chat/Work switches stored as `(enabled, scope)` with CAS
`expectedVersion` (`agent-loop/tool-catalog.ts:33-92`); risk classes and modes, unknown name =
`write`, `mcp_*` = `external` (`agent-loop/approvals.ts:6-37`); `needsApproval`: always-ask or
`device` → ask; `read` → run; Ask asks write and external, Safe asks external, Full auto runs
(`:39-45`); 15-minute TTL (`:11`); preference fails closed to `ask` (`:93-96`); one pending card per
turn, atomic decide, arguments kept only while pending, hash-bound (`migrations/20261116090000_
panda-agent-approvals.sql:1-50`); Permissions screen = mode radio cards, "Always asks" list,
"Recent approvals" (`ui/agent/settings/permissions-section.tsx:34-51`).

## 3. Decisions for the user (recommendation first)

1. **A4a-a Where admin switches live.** **(A) New top-level `tools` map in `AppConfig`**:
   `{<toolId>: {modes: [...]}}`, missing id = catalog default. Saved through `config_history.write`
   (CAS, history, diff, audit, restore unchanged). Top level, because an older image drops unknown
   top-level keys (item 15). (B) A separate collection with per-tool CAS like Panda (second history).
2. **A4a-b Granularity.** **(A) One row per setting, 9 rows** (section 4 table), Revit reads grouped
   as one `revit_read` switch. (B) One switch per model-visible tool (≈20 rows).
3. **A4a-c Risk classes.** **(A)** `read`: core, knowledge, web and regulation search (as Panda,
   `web_search` is read), Revit reads, `create_design`, `propose_changes` (rollback-only dry run,
   grants nothing); `external`: `generate_concept_image`; `device`: the native Revit write (not a
   model tool; always the exact-proposal card); `write`: none today, reserved for MCP and H6.
   (B) Also make `web_search` and `search_regulations` `external` (Ask mode asks every search).
4. **A4a-d Approval mode storage.** **(A) New Mongo collection `owner_prefs`** (`_id` = owner,
   `approvalMode`, `updatedAt`), `GET/PUT /v1/me/permissions`; read live at each gated call,
   any error or unknown value = `ask`. (B) Clerk public metadata. (C) Browser storage (not
   enforceable; rejected).
5. **A4a-e Card mechanism.** **(A) Reuse the versioned question pause** with
   `kind: 'tool_approval'`, options `allow_once` / `deny`, `expiresAt` = now + 15 min and a stored
   `call {name, argsHash}`; the existing reply path resumes it. (B) Separate approvals collection
   and endpoint like Panda (new route, new resume path).
6. **A4a-f Default mode.** **(A) Ask** (Panda default). Visible change: in Ask and Safe an explicit
   concept-image request shows one card first. (B) Full auto by default (no visible change).
7. **A4a-g `webSearch.enabled` overlap.** **(A) Keep it as a master switch** on the Web search page;
   effective = master on AND mode on. The Tools row links to that page. (B) Migrate it into `tools`.

## 4. Design (recommended options)

**Catalog** (new `tool_catalog.py`, pure, code-owned; the model cannot extend it). Each entry:
`id, label, description, group, runsOn, risk, required, allowedModes, defaultModes, toolNames`.
`allowedModes` is a ceiling from today's `_tools` rules (item 4): admin can only narrow it.

| id | Model tools | Risk | Allowed / default modes | Required |
| --- | --- | --- | --- | --- |
| `core` | `finish_answer`, `ask_question`, `plan_task`, `lookup_evidence` | read | all | yes |
| `knowledge_search` | same | read | Ask, Plan | no |
| `web_search` | same | read | Ask, Plan | no |
| `search_regulations` | same | read | Ask, Plan | no |
| `revit_read` | `inspect_*`, `query_elements` | read | all | no |
| `generate_concept_image` | same | external | Ask, Plan | no |
| `create_design` | same | read | Plan | no |
| `propose_changes` | same | read | Plan, Build | no |
| `revit_write` | none (graph `approve` node) | device | Build | locked row: "Always asks: exact proposal" |

Unknown model tool name → `write` (fail safe, as Panda). A test asserts every name `_tools` can emit
maps to one catalog entry.

**Admin switch enforcement.** One filter in decide beside today's web-search filter
(`agent_workflow.py:1577-1578`): drop tools whose setting excludes `state['mode']`. Because decide
rejects unoffered tools (item 7), that is the enforcement; `dispatch_action` re-checks the setting
before running (a save can land between decide and dispatch). Turning `propose_changes` off in
Build only removes proposals; it can never add a write path.

**Approval policy** (`tool_catalog.needs_approval(mode, risk)`, port of Panda `:41-45`):
`device` → always the native exact-proposal path (never a tool card); `read` → run; `external`
→ card in Ask and Safe, run in Full auto; `write` → card in Ask, run in Safe and Full auto. Unknown
mode = Ask.

**Card** (A4a-e A). In `dispatch_action`, before a gated tool runs: read the mode; if a card is
needed and no matching allowed answer exists, call `pause_question` with a fixed server-written
question ("Allow generate concept image (external): <first 120 chars of prompt>?"), options
`allow_once` / `deny` (no custom input), `expiresAt`, `call {name, argsHash = sha256(canonical
args)}`. The model never writes card text. On reply (`main.py:645`): if `kind == 'tool_approval'`
and now > `expiresAt` → 409 "This approval expired; ask the agent again" and the run records
`approval_expired` (tool not run). On `allow_once` the resumed dispatch runs **only** if the next
decision has the same name and `argsHash`; otherwise it asks again. `deny` adds an observation
"user declined <tool>" and the agent continues without it. Answers never touch `awaiting_approval`
runs: the reply path needs `needs_input` (`main.py:650`), the native path needs `awaiting_approval`
(`main.py:1070`). Events: `tool_approval_requested|allowed|denied|expired|auto` (mode, tool, risk;
no args).

**Revit write safety (non-negotiable).** `workflow.py` `approve` and `main.py` `resume` are not
edited. The approval mode is never read on the native path; Full auto adds no grant, extends no
grant and never calls `approve_change_set`. Existing owner grants (item 8) stay as they are and are
created only by their own explicit endpoints.

**Capabilities.** `adminTools` (admin config accepts `tools`; `GET /v1/admin/config` adds a
read-only `toolCatalog` list) and `approvalModes` (`/v1/me/permissions` and tool cards). Web:
unknown or off → no Tools nav item, no Permissions section, never send `tools` (an old backend
returns 422, item 15), approval cards fall back to the plain question card.

**Admin Tools page** (`/admin/tools`, Panda layout, DATUMM theme): `ConfigPage` with groups (Core,
Research, Revit, Design); each row: label, description, "Runs on", risk `Badge`, three `Switch`
controls Ask / Plan / Build (disabled outside `allowedModes`; required rows show "Always on");
the `revit_write` row is a locked note. Save uses the existing draft/CAS flow; Config history shows
`tools.<id>.modes` changes. Components: `ui/switch`, `ui/badge`, `ui/card`, `ui/tooltip`.

**Settings → Permissions** (Panda layout): heading "When DATUMM wants to act"; three radio cards
(Ask before acting — default; Safe — asks before outside services; Full auto — runs outside
services without asking) via vendored `segmented-control-clean` or native radios styled with
existing tokens; an "Always asks" list: "Revit model changes: every change needs your approval of
the exact proposal, or a task access grant you set for that proposal" and "New kinds of tools".
Card UI: reuse `agent-questions.tsx` with a risk `Badge` and an expiry line; expired → disabled.

## 5. Contract changes

| Change | Kind |
| --- | --- |
| `AppConfig.tools: dict[ToolId, {modes: list[Mode]}]`, validated against `allowedModes` (422) | Backend S; old images drop it on load |
| History `_flat` adds `tools.<id>.modes` (values shown) | Backend S |
| `GET /v1/admin/config` adds `toolCatalog` | Backend S; old web ignores it |
| `GET/PUT /v1/me/permissions` `{approvalMode: 'ask'|'safe'|'auto'}`, strict body; collection `owner_prefs` | Backend S; proxy allow-list `me\/permissions` |
| Question record `kind: 'tool_approval'`, `expiresAt`, `call {name, argsHash}`; public view hides `argsHash` | Backend M; touches checkpoint data, not the v2 command schema |
| Capabilities `adminTools`, `approvalModes` | Backend S; web `CAPABILITY_FEATURES` |
| No native, relay, `/resume`, AG-UI event or v2 command change | — |

## 6. Change list

**Backend** (owner: backend implementer, local `main`): `tool_catalog.py` (new; catalog,
`needs_approval`, `setting_for`), `app_config.py` (`tools` field, `resolved()`),
`config_history.py` (`_flat`), `admin_api.py` (`toolCatalog`), `main.py` (capabilities,
`/v1/me/permissions`, expiry check in `reply_to_agent`), `agent_workflow.py` (decide filter,
dispatch gate and card, ≈40 lines), `agent_questions.py` (approval record), `storage.py` (hide
`argsHash`), `test_tool_catalog.py` (new), `README.md` code map, `lat.md/` note.

**Web** (owner: web implementer): `src/lib/admin-tools.mjs` + `.d.mts` (row model, validation,
modes ≤ allowed), `src/lib/permissions.mjs` + `.d.mts`, `src/lib/admin-config.mjs` (validate
`tools` only when present; `emptyConfig` unchanged), `src/lib/capabilities.mjs` + `.d.mts`,
`src/app/admin/tools/page.tsx`, `src/components/admin/tools-section.tsx` (+ module CSS),
`admin-shell.tsx` (nav item, `feature: 'adminTools'`, strict), `settings-navigation.mjs` +
`desktop-settings.tsx` (Permissions), `agent-questions.tsx` (approval variant),
`src/app/api/service/[...path]/route.ts` (allow-list), `src/components/dev/` fixtures, tests.

## 7. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`; recorded baseline 636 + 26 subtests, 17 Nov, T1 result):

1. Catalog covers every tool name `_tools` can emit; unknown name → `write`.
2. `needs_approval` table: 4 risks × 3 modes + unknown mode; `device` never returns "run".
3. Switch off `web_search` for Plan → not offered in Plan, still in Ask; a decision naming it is
   `AGENT_INVALID_ACTION`; a save between decide and dispatch blocks the call.
4. Config: `tools` with a mode outside `allowedModes` → 422; saved, versioned, diffed; restore
   round-trips; a stored document with `tools` loads under a filter without the field (old image).
5. Permissions: default `ask`; PUT accepts the three values only, rejects extra keys; owner-scoped;
   Mongo error → `ask`.
6. Card: Ask mode image call pauses with `tool_approval`; allow → same name and hash runs once;
   changed args → asks again; deny → not run; reply after 15 min → 409, tool not run.
7. **Auto never approves a native write:** with `approvalMode: 'auto'` and no grant, a Build run
   with a proposal reaches `awaiting_approval` (interrupt), `approve_change_set` is not called; a
   `tool_approval` reply cannot resume an `awaiting_approval` run (409); `workflow.py` and
   `main.resume` do not read `owner_prefs` (source test).

**Web** (`npm test`; recorded baseline 833, 17 Nov): tools row model and validation; permissions
parse fails closed; capability names; `admin-config` never adds `tools` when absent; proxy path.

**Browser** (built-in browser, 1280 px and 390 px, light and dark):

- `/dev/ux` fixtures: (1) capabilities unknown → no Tools item, no Permissions. (2) Tools page:
  toggle Web search off for Plan, Save, history row `tools.web_search.modes`. (3) Required and
  `revit_write` rows not switchable. (4) Permissions: choose Safe, reload fixture keeps it.
  (5) Approval card pending, expired (disabled) and answered.
- Real signed-in localhost against the local backend (HANDOFF line 11): (6) Tools page loads the
  catalog, a save round-trips, Config history and restore work. (7) Settings → Permissions saves
  and survives reload. Card flows need a model and cannot run there (no provider key); they are
  fixture-only until hosted.

## 8. Acceptance criteria

- With no `tools` saved and mode Ask, offered tools are byte-for-byte today's except that an
  explicit concept-image request first shows a card (A4a-f A).
- An admin switch removes a tool from that mode only, within 30 s of save (`app_config.py:62`).
- No path from approval mode, card answer or `tools` reaches `approve_change_set`; the native
  approval code is unchanged in the diff.
- Older backend: web shows today's UI and sends no new field (fixture 1).
- Gates: backend pytest, `lat check`, `npm run check:graph`; web `npm run typecheck`, `npm test`,
  `npm run build`, `lat check`. No colour, font or token line in the web diff; no new dependency.

## 9. Rollback

(1) Admin turns tools back on or restores an earlier revision. (2) Image rollback: old code drops
the stored `tools` key on load (`app_config.py:83`, `config_history.py:64,134`) and ignores
`owner_prefs`. Caveat (observed `config_history.py:185`): a save made by the old image `$set`s
only its own fields, so the stale `tools` value stays in the document and returns when the new
image is redeployed; history rows written by the old image have no `tools`, so restoring one later
resets switches to defaults. A pending `tool_approval` card on a run is answerable as a plain
question under the old image (no expiry); the old agent then runs without gating, which is today's
behaviour and never touches native approval. (3) Web revert: Tools page and Permissions disappear.
Left behind: `owner_prefs` documents, `tools` in config and history, card fields on runs.

## 10. Open questions

1. Should `web_search` ask in Ask mode (A4a-c B)? Panda says no; DATUMM users may expect it.
2. Expiry vs. budget clock: a paused card stops the reasoning clock like any question (*inferred*
   from `budget.py:556`); confirm at build.
3. Should Permissions show a "Recent approvals" list (Panda) from run events? Deferred to UI3.
4. Hosted check of a real card needs a model key; schedule with the next live release.

## Result (fill at checkpoint)

| Item | Outcome |
| --- | --- |
| Commit | |
| Gates run (command, Node version, counts, date) | |
| Browser evidence (tool, URL, scenario, result) | |
| Not run or not verified | |
| Limits found | |
| Next step | |

## Result (17 Nov)

Built on `main` (Sonnet implementers per repo, contract reconciled by the orchestrator, independent Opus review, Opus fixes). Backend commit in `datumm-orchestrator` (local; ships with the next backend release together with T1). Web: this commit.

| Item | Outcome |
| --- | --- |
| Contract | The orchestrator compared the two sides before review: the web answered cards by position (`option_1`) while the backend accepts only `approval` / `allow_once` / `deny` (every click would have 409'd), and the web expected `risk` the backend did not send. Both aligned |
| Review | No HIGH: no path approves, applies or skips approval of a native write (`workflow.py` and `main.resume` untouched; Full auto only skips `external` cards; Build only allows read tools; card replies need `needs_input`). 2 MEDIUM fixed (server expiry flag now public and cleared on the next card; Permissions keeps keyboard focus). 7 LOW fixed (group casing, expiry re-check before the claim with one event, `tool_disabled` observation instead of a misleading question, declined tool not re-offered until the user says more, unknown names gated as `write`, grant rows and arguments kept out of public data, countdown announced only at 5 min / 1 min / expiry) |
| Gates (orchestrator) | Backend 657 passed + 26 subtests, `lat check` passed. Web typecheck clean, `npm test` 855 / 855, `lat check` passed, `npm run build` exit 0; no colour, font or token change |
| Browser (built-in, signed-in localhost on the A4a backend) | Admin Tools: grouped rows, Core "Always on", Build switches disabled beyond the ceiling, Revit model changes locked with "Always asks … in every approval mode"; turning Web search off for Plan saved revision 1 and Config history shows `tools.web_search.modes: null -> ["ask"]`. Settings → Permissions: three choices, Full auto says Revit changes still need exact approval, "Always asks" list; Down-arrow switched to Safe, the server stored `safe`, focus stayed on the radio. Approval card fixture: "Outside service" badge, expiry, "This does not authorize Revit changes", Don't allow / Allow once. Orchestrator fixes during the check: a stale "Loading…" under the loaded choices, and Ask's text now says it also asks before tools that change something |
| Not run | A real card flow with a model (no provider key locally), 390 px, light mode, screen reader |

