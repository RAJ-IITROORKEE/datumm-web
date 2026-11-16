# Phase packet — A2: Admin versioned config and audit

| Field | Value |
| --- | --- |
| Status | **done 16 Nov 2026** (local; not pushed or deployed) |
| Depends on | C1 (done) for capability gating; A1 (done) for the `strict` nav pattern and the latest admin code |
| Approved by / date | User, 16 Nov ("Approve A2, recommended"): every decision takes its recommended option (A) |
| Base commits | Web working tree on `codex/ui-ux-foundation-2026-11-12`; backend `94c8ed4` on `codex/web-ui-harness-20261116` |

All `path:line` facts below were **observed** in source on 16 Nov (backend `94c8ed4`, web working tree). Statements marked *inferred* were reasoned from code, not run. No test, browser or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

An admin opens **Admin → Config history** and sees every saved revision of the global agent configuration: number, when, by whom, whether it was an edit or a restore, and which settings changed. Selecting a revision shows how it differs from the live configuration; **Restore** asks for confirmation and saves that configuration as a **new** revision, guarded by the same compare-and-set as a normal save. The Audit log pages back through all admin changes, can be filtered by kind, and says what changed (setting paths, and values only where they are safe to show).

Non-goals: rewriting, deleting or squashing history (restore always appends); changing what a run already snapshotted (section 2, item 9 says what is *not* snapshotted today); secrets in snapshots or audit (A2 refuses credential-bearing MCP URLs instead of storing them; sealed secrets belong to A4); a second admin role or per-section permissions; model registry (A3); MCP and skills registry, connection tests or skill files (A4); audit rows for admin reads; knowledge-source versioning (its audit rows are enriched, not versioned); any deploy or hosted check (G1); any change to v2 commands, checkpoints, `PublicTask`, `PublicEvent` or native authority.

## 2. Current state (verified)

Status key: **T** implemented and tested; **U** implemented, under-tested; **C** controlled or local only; **P** planned or missing.

| # | Item | State | Evidence |
| --- | --- | --- | --- |
| 1 | Storage | T. **One document** `app_config {_id: 'global'}` holding the `AppConfig` fields plus `revision` (int counter), `updatedAt`, `updatedBy` (raw Clerk subject). No other copy; a save overwrites it. Revision 0 means "no document yet" | `app_config.py:46-55,75-77`; `admin_api.py:24-27,43-45` |
| 2 | Compare-and-set | T. `PUT /v1/admin/config {config, expectedRevision}`: `find_one_and_update` matching `revision` (0 also matches a missing field), `$inc` revision, upsert; no match or a duplicate-key race gives **409** with a plain-string `detail`. A save with no changes still bumps the revision ("no changes") | `admin_api.py:18-21,35-53`; `test_round3_api.py:83-95` |
| 3 | Cache | T. `current()` caches the resolved config for 30 s per process; `PUT` calls `invalidate()`. Single uvicorn worker (`main.py:290`), so one cache | `app_config.py:58-89`; `test_round3_api.py:90` |
| 4 | History | **P. Absent.** No collection, no previous values kept anywhere | grep `app_config` / `admin_audit` |
| 5 | Audit writes | U. Config: `{at, by, summary: 'Updated config: <top-level keys>', revision}`, inserted **after** the CAS, not atomically (a crash between leaves a revision without an audit row). Knowledge: `{at, by, summary}` with no revision. The summary names only top-level keys (`skills`, not which skill or field) | `admin_api.py:51-52`; `knowledge.py:269-270` |
| 6 | Audit read | T. `GET /v1/admin/audit`: last 100 rows, projection `at, by, summary` (the stored `revision` is dropped), sorted by `at`; no paging or filter; index `(at -1)`; **no retention/TTL** | `admin_api.py:56-59`; `storage.py:29`; `test_round3_api.py:94-95` |
| 7 | Admin auth | T. Router-level `require_admin` (Clerk subject in `ADMIN_SUBJECTS`); 403 tests for config/audit/overview; 401 from `principal` without a bearer token | `admin_api.py:15`; `auth.py:20-31`; `test_round3_api.py:76-79`; `test_admin_auth.py:8-16` |
| 8 | What is snapshotted at run creation | T/U. Model and reasoning effort (stored on the task and run), USD ceiling and per-run limits (run ledger). `parallelChats` is read at admission only | `task_controller.py:383-389`; `main.py:784-787,941`; `main.py:763` |
| 9 | What is read **mid-run** | U. **Skills** and `webSearch.enabled` are re-read at every agent decision; `webSearch` (enabled, domains, max results) is re-read at every `web_search` call. A save, and therefore a restore, changes these for runs already in progress within ≤30 s. No test pins this | `agent_workflow.py:1563-1569`; `research_tools.py:339-345` |
| 10 | Sensitive content in config | `mcpServers[].url` matches only `^https://[^\s]{4,300}$`, so `https://user:token@host/…` or `?api_key=…` is accepted and stored in clear. Skill `instructions` (≤4,000 chars × 30) are free admin text injected into the system prompt. No field is a declared secret. `mcpServers` is not used by any runtime code | `app_config.py:28-43`; grep `mcpServers` (only `app_config.py`, `test_app_config.py:22`) |
| 11 | Who is shown | `updatedBy` and audit `by` are raw Clerk subjects, shown as-is in the web save bar and audit table | `admin_api.py:44,52`; `form.tsx:144`; `data-sections.tsx:97` |
| 12 | Capabilities | v1 flags include `adminConfig`, `adminAudit` (true in production, false in the local app); nothing for history or restore | `main.py:291-293`; `local/entry.py:246`; `capabilities.mjs:2` |
| 13 | Web 409 handling | T. `adminCall` maps 409 to `stale` | `use-admin.tsx:19`; `ConfigPage` keeps the draft and offers "Reload latest" `form.tsx:139-140`; `tests/admin-config-editor.test.mjs` |
| 14 | Web config state | T. One shared draft for Agent, Web search, Skills and MCP pages (`AdminConfigProvider`), dirty check by stable JSON, leave-page guard while dirty or saving. `ConfigEnvelope.revision` is typed `number \| string` | `form.tsx:14-57`; `use-admin.tsx:86-121`; `admin-shell.tsx:112-157`; `admin-config.mjs:59` |
| 15 | Web audit page | T. Fetches the 100-row array, client-side text search, three columns | `data-sections.tsx:93-98` |
| 16 | Proxy | v1 allow-list has `admin/config` and `admin/audit` exactly; `admin/config/history` would be refused with `DATUMM_PROXY_NOT_ALLOWED` | `route.ts:5,20` |
| 17 | Gating pattern | `strict` nav items hide unless the flag is `on`; a strict page waits for `config` before calling | `admin-shell.tsx:16-31,112-115` |
| 18 | Dev fixture | C. `AdminPreview` keeps an in-memory envelope and audit list; PUT checks `expectedRevision`; scenario `conflict` forces 409 | `admin-preview.tsx:15-35` |
| 19 | Panda-agent reference | Versioned rows with a conflict error and "changed elsewhere, reloaded"; full snapshot history for skills only; **no restore anywhere** | [research record](research-reference-and-harness-2026-11-16.md) "Patterns worth reusing" |

## 3. Decisions needed (recommendation first)

1. **History storage.** **(A)** One full snapshot per revision in a new `config_history` collection, `_id = revision`. Restore reads one document; diffs are computed on demand. (B) Store only diffs: smaller, but restore must replay a chain and one bad row breaks every later revision.
2. **Baseline and crash gap.** **(A)** History is self-healing: after every write, and on every history read, if the live revision has no history row it is written from the live document (marked `recovered: true`). This also creates the baseline row for today's document on first use. (B) A one-off migration script plus best-effort inserts (a crash leaves a permanent gap).
3. **Audit row richness.** **(A)** `changes: [{path, before?, after?, beforeHash, afterHash}]` (≤50, then `changesTruncated`), with item-level paths (`skills[code-review].instructions`, `mcpServers[docs].enabled`). Hash = first 12 hex of SHA-256 over canonical JSON. (B) Paths only. (C) Full before/after values for everything.
4. **Which values may appear.** **(A)** Values only for an allowlist of short, non-free-text fields: `models`, `defaultModel`, `defaultReasoningEffort`, `runUsdLimit`, `limits.*`, `parallelChats`, `webSearch.*`, `skills[].{name, modes, enabled}`, `mcpServers[].{name, enabled}`. Hash only for `skills[].{description, instructions}`, `mcpServers[].{url, toolAllowlist}` and added/removed items. (B) Hash only for every field.
5. **Credentials in MCP URLs.** **(A)** Refuse on write (PUT and restore): a URL with userinfo, a query string or a fragment returns 422 "Put credentials in a sealed secret (A4), not the URL." Checked in the write path, not in `AppConfig`, so an existing stored document still loads. A baseline or old snapshot that fails the check is kept with that URL replaced by its origin and `redacted: true`, and is **not restorable**. (B) Store snapshots as-is (copies any credential into an append-only collection; rejected). (C) Strip silently (restores a different URL than was saved).
6. **Restore semantics.** **(A)** `POST /v1/admin/config/restore {fromRevision, expectedRevision, note?}`: any earlier, restorable revision; the snapshot is re-validated against today's `AppConfig` (unknown keys dropped like `load()`, then 422 if invalid); it is written through the **same** CAS as `PUT`, so a stale `expectedRevision` gives 409; it creates revision N+1 with `action: 'restore'`, `restoredFrom`; restoring a snapshot equal to the live config gives 422 "Already current". `note` ≤200 chars, plain text, shown only to admins. (B) No note. (C) Restore without CAS (rejected: overwrites a concurrent edit).
7. **Confirmation and unsaved edits.** **(A)** The web shows a confirmation dialog listing the changed paths and "Saves as revision N+1; running chats may pick up skills and web-search changes within 30 seconds"; Restore is disabled while the shared config draft is dirty or saving ("Save or discard your edits first"). After success the shared config reloads. (B) One-click restore.
8. **Paging and filters.** **(A)** History: `before` (revision) cursor, `limit` 20 (max 50), newest first. Audit: keep the **array** response (additive for old web builds), add `before` cursor (`at|_id`), `limit` 25 (max 100, default 100 when absent so today's call is unchanged) and `kind = config | knowledge`; each row gains `cursor`. Text search stays client-side over the loaded rows. (B) A new paged envelope `{rows, nextCursor}` behind the capability flag.
9. **Retention.** **(A)** Keep all history and audit rows (admin edits are rare; worst case one snapshot ≈150 KB, *inferred* from the field caps); record the size bound and revisit at G1. (B) Keep the last 500 revisions. (C) 365-day TTL on both (breaks restore of old revisions and audit completeness).
10. **Capability flags.** **(A)** One flag `adminHistory` (history read, restore and enriched audit), `unknown = off` (`strict`), production true, local app false. The audit page uses the new query parameters only when it is on. (B) Two flags `adminHistory` and `adminRestore` (read-only history without restore has no current use).
11. **Pages.** **(A)** One new **Config history** page (`/admin/history`, System group): config is one document spanning four pages, and restore is whole-document. The config save bar's "Revision N" links to it. Audit page gains paging and the kind filter. (B) A history panel on each of the four config pages, filtered to its paths (four times the UI; restore still whole-document, which is confusing on a per-page panel).
12. **Mid-run config reads (item 9).** **(A)** Keep A2's scope: do not change run behavior; correct the docstring and the Agent page copy ("edits never change a run in progress" is false for skills and web search) and add one test pinning today's behavior; snapshotting skills and web search on the run goes to A4, which changes the tool set anyway. (B) Snapshot skills and `webSearch` on the run ledger at creation in A2 (touches `agent_workflow.py` and `research_tools.py`, the hot path).

## 4. Design (recommended options)

**Backend: `config_history.py` (new).** `snapshot(cfg)` (dump plus URL check from decision 5), `diff(old, new) -> changes` (item-level paths keyed by `id` for `skills` and `mcpServers`; value allowlist from decision 4; hashes), `ensure_current()` (decision 2), `write(config, expected, admin, *, action, restored_from=None, note=None)` = the existing CAS moved from `put_config` unchanged, then history insert (`_id = revision`, idempotent on duplicate key), audit insert, `invalidate()`.

- **`config_history` document:** `{_id: revision, revision, at, by, action: 'update' | 'restore' | 'baseline', restoredFrom?, note?, config, configHash, changes, recovered?, redacted?}`. `_id` gives uniqueness and order; no extra index.
- **`admin_audit` row (additive):** existing `at, by, summary, revision` plus `kind: 'config' | 'knowledge'`, `action`, `changes`, `changesTruncated`, `restoredFrom?`, `note?`. `summary` keeps its current text so old web builds still read it. Knowledge rows gain `kind` and `action` (`add | reindex | delete`) only. New index `(kind, at -1, _id -1)`; the existing `(at -1)` stays.
- **`PUT /v1/admin/config`:** same body and response; now calls `write(..., action='update')`; adds the decision 5 check (422).
- **`GET /v1/admin/config/history?before=&limit=`** → `{schemaVersion: 1, current: revision, rows: [{revision, at, by, action, restoredFrom, note, configHash, changes, recovered, redacted, restorable}], nextBefore}`. No `config` in list rows.
- **`GET /v1/admin/config/history/{revision}`** → `{revision, …row, config, changesFromCurrent}` (same `diff`, same masking), 404 if absent. Lets the web show "compare with live" without a second diff implementation.
- **`POST /v1/admin/config/restore`:** body `Strict {fromRevision: int ≥ 1, expectedRevision: int ≥ 0, note: str ≤ 200 = ''}`; 404 unknown revision; 422 not restorable, invalid under today's schema, or already current; 409 stale; 200 returns the same envelope as `GET /config`.
- **`GET /v1/admin/audit`:** decision 8 parameters; response stays a list; projection adds `kind, action, revision, changes, changesTruncated, restoredFrom, note, cursor`.
- **Redaction proof (three layers, as in A1):** (1) the write path refuses credential-bearing URLs, so no new snapshot can hold one; old ones are redacted to the origin and marked unrestorable; (2) audit and `changes` emit values only through the allowlist in decision 4, hashes otherwise; (3) a canary test (section 7). Skill text **is** stored in history snapshots: it is admin-authored configuration already returned by `GET /config`, not a secret, and restore needs it. History and audit stay admin-only (router dependency).

**Web.**

- **Proxy:** v1 pattern `admin/(?:config(?:/(?:history(?:/[0-9]{1,9})?|restore))?|audit|…)` (`route.ts:5`).
- **Capability:** `adminHistory` in `CAPABILITY_FEATURES`; nav item `{href: '/admin/history', label: 'Config history', feature: 'adminHistory', strict: true}`.
- **Pure lib `src/lib/admin-history.mjs` + `.d.mts`:** defensive parsing of history rows, detail and audit rows (drops unknown keys, closed `action`/`kind` sets, integer revisions), restore body builder (refuses without integer `fromRevision` and `expectedRevision`, trims `note` to 200), change formatting (`before → after` when values exist, "changed" otherwise).
- **`history-section.tsx` (new):** `PageHeader`; `Table` of revisions (revision, when, by, action badge, changed paths); "Load older"; selecting a row loads its detail into a `<details>` region showing `changesFromCurrent`; a **Restore** button opens `Dialog` (existing `ui/dialog`, already used by the leave guard) with the change list, optional note `Textarea`, and "Restore as revision N+1". Disabled with a reason while the shared draft is dirty or saving, or the row is not restorable. 409 → the existing `stale` copy plus "Reload history"; success → `useSharedAdminConfig().reload()` and a status line "Restored revision R as revision N+1".
- **Audit:** `AuditSection` gains a kind `Select`, a "Load older" button using `cursor`, and a details cell listing changes; only when `adminHistory` is on. Without it, today's behavior.
- **Save bar:** "Revision N" becomes a link to `/admin/history` when `adminHistory` is on (`form.tsx:144`).

**Reused:** `require_admin`, the existing CAS code (moved, not rewritten), `load()` key filtering, `adminCall`/`useAdminResource`/`ResultState`, `useSharedAdminConfig`, `PageHeader`, `Table`/`EmptyState`, `Badge`, `Select`, `Textarea`, `Dialog`, the `AdminPreview` fixture client. No new dependency.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, single owner: backend implementer):

| File | Change |
| --- | --- |
| `config_history.py` (new) | Snapshot, URL check, diff with masking, `ensure_current`, shared `write` |
| `admin_api.py` | `PUT /config` via `write`; `GET /config/history`, `GET /config/history/{revision}`, `POST /config/restore`; audit query parameters and projection |
| `knowledge.py` | Audit rows gain `kind`, `action` (`:269-270`) |
| `storage.py` | Index `admin_audit (kind, at -1, _id -1)` |
| `main.py`, `local/entry.py` | `adminHistory`: true and false |
| `app_config.py` | Docstring corrected (decision 12A) |
| `test_config_history.py` (new) | Section 7 |
| `README.md`, `lat.md/` admin section | Code map and history/audit contract; `lat check` |

**Web** (`datumm-web`, current branch, single owner: web implementer):

| File | Change |
| --- | --- |
| `src/lib/capabilities.mjs` + `.d.mts` | `adminHistory` |
| `src/app/api/service/[...path]/route.ts` | Allow-list entries |
| `src/lib/admin-history.mjs` + `.d.mts` (new) | Parsing, restore body, change formatting |
| `src/components/admin/history-section.tsx` (new), `src/app/admin/history/page.tsx` (new) | History page and restore dialog |
| `src/components/admin/data-sections.tsx` | Audit paging, kind filter, changes cell |
| `src/components/admin/admin-shell.tsx` | Nav item (strict) |
| `src/components/admin/form.tsx` | Revision link in the save bar |
| `src/components/admin/config-sections.tsx` | Agent page copy corrected (decision 12A) |
| `src/components/dev/admin-preview.tsx` | Fixture: history store, restore, audit cursor, `adminHistory` on except a `history-off` state |
| `tests/capabilities.test.mjs`, `tests/admin-proxy.test.mjs`, `tests/admin-history.test.mjs` (new), `tests/admin-config-editor.test.mjs` | Section 7 |
| `lat.md/contracts.md` | Restore and redaction rules |

## 6. Contract changes, dependencies and risks

| Change | Kind |
| --- | --- |
| `GET /v1/admin/config/history`, `GET …/history/{revision}`, `POST /v1/admin/config/restore`, collection `config_history` | Backend, new, admin-only; size S–M |
| `PUT /v1/admin/config` 422 on credential-bearing MCP URL | Backend, **behavior change** for one input class |
| Audit rows and `GET /audit` parameters | Backend, additive (list shape kept) |
| `adminHistory` flag | Additive; absent means off |
| Proxy entries, history page, audit paging | Frontend |

No change to v2 commands, checkpoints, `PublicTask`, `PublicEvent`, AG-UI events or native approval. No new dependencies.

| Risk | Containment |
| --- | --- |
| A credential is copied into append-only history | Write-path refusal; redact-and-mark for old data; canary test |
| Restore of a snapshot that no longer validates | Re-validate against today's `AppConfig`; 422 with no write |
| Restore changes running chats' skills and web search | Stated in the dialog; behavior pinned by a test; snapshotting deferred (decision 12) |
| History/audit gap after a crash between CAS and inserts | `ensure_current` repairs history; audit gap remains and is recorded as a limit |
| Refactor of the CAS breaks saves | Existing `test_round3_api.py:83-95` must pass unchanged |
| Unbounded growth | Size bound recorded; revisit at G1 |
| Existing stored MCP URL with credentials | Still loads (check is write-only); marked unrestorable in history; admin must edit it before the next save succeeds (*inferred* none exist; not checkable without hosted data) |

## 7. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 334 + 26 subtests), each written to fail on `94c8ed4` first:

1. **Restore creates a new revision:** save r1, r2; restore r1 with `expectedRevision: 2` gives r3 equal to r1's config, `action: 'restore'`, `restoredFrom: 1`; r1 and r2 history rows unchanged.
2. **Stale restore:** `expectedRevision: 1` while live is 2 gives 409 and no write (revision, history and audit counts unchanged).
3. **Append-only:** no route updates or deletes a `config_history` row; repeated `ensure_current` leaves one row per revision; baseline row created from a pre-existing document marked `recovered`.
4. **Validation:** unknown revision 404; already-current 422; snapshot invalid under today's schema 422; extra body field 422; `note` > 200 422.
5. **Redaction canary:** PUT with `https://u:CANARY@host/x` and `?key=CANARY` gives 422; a pre-seeded document holding `CANARY` in a URL produces a history row and audit row with no `CANARY`, `redacted: true`, `restorable: false`, and restore of it gives 422. Skill `instructions` containing `CANARY-SKILL` appear in no audit row and no list row (only as a hash).
6. **Audit enrichment:** changing one skill's `enabled` and another's `instructions` yields paths `skills[a].enabled` with values and `skills[b].instructions` with hashes only; knowledge rows carry `kind: 'knowledge'`; `kind` filter and `before` cursor return no duplicates or gaps; no-parameter call returns ≤100 rows in the old order.
7. **Admin-only:** 401 without a token and 403 for a non-admin on all three new routes.
8. **Mid-run behavior pinned (decision 12A):** a skill change is visible to `current()` after save without a new run (documents item 9).
9. **Capabilities:** production and local values. Existing CAS test passes unchanged.

**Web** (`npm test`, baseline 689): flag with `unknown = off`; proxy allows `admin/config/history`, `admin/config/history/12`, `admin/config/restore`, blocks `admin/config/history/x` and `admin/config/other`; parser drops unknown keys and non-integer revisions; restore body builder refuses without binding; nav hides Config history unless on; Restore disabled while the shared draft is dirty.

**Browser** (built-in browser, local dev server, controlled fixture only: `/dev/ux` "Admin fixture"), 1280 px and 390 px, light and dark:

1. Edit: change Parallel chats on Agent, save; Config history shows the new revision with `parallelChats 3 → 2`; Audit shows the same change.
2. Conflict: fixture state `conflict`, save: "Changed elsewhere" with edits kept; in history, Restore gives the same stale message and no new row.
3. Restore: select the older revision, open Restore, see the change list, add a note, confirm: a new revision "Restored from N" appears, Agent page shows the restored value, the status line announces it.
4. Dirty guard: edit Agent without saving, open history: Restore is disabled with "Save or discard your edits first".
5. Skill text: change a skill's instructions and save; history and audit show "changed", never the text.
6. Audit paging: "Load older" appends rows without duplicates; kind filter shows only knowledge rows after a fixture source add.
7. Keyboard: Tab to a revision, Enter opens details, Restore opens the dialog with focus inside, Escape closes and returns focus to the trigger.
8. Capability off (`history-off`): no Config history nav; direct visit reads "Not provided by this backend"; Audit behaves as today.
9. 390 px: no horizontal page overflow; tables scroll inside their region; the dialog fits.

Hosted behavior needs G1.

## 8. Acceptance criteria

- Every successful save or restore leaves exactly one history row for its revision; restore never edits an earlier row.
- Restore is CAS-guarded (409 test) and re-validated (422 tests).
- No credential-bearing URL can be written; the canary appears in no history list row, detail row or audit row.
- Audit rows name changed paths and show values only for the allowlist; the no-parameter audit call is backward compatible.
- Admin-only access enforced by the backend (401/403 tests).
- Without `adminHistory`, the web looks and behaves as today.
- Browser scenarios 1–9 pass on the fixture.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`; runtime smoke `--production`. Counts recorded.

## 9. Rollback

Revert the backend and web commits. Without the flag the web hides the page and the audit extras. Left behind: the `config_history` collection, extra audit fields and one index, all unused and droppable by hand. The live `app_config` document is never migrated, so the old code reads it unchanged. A restore that already ran stays as an ordinary revision.

## 10. Open questions found during research

1. **"Runs keep their snapshot":** only model, effort, USD ceiling and limits are snapshotted. Skills and web search are read live at each decision and search call (`agent_workflow.py:1563-1569`; `research_tools.py:339-345`), so the docstring (`app_config.py:4`), the Agent page copy (`config-sections.tsx:17`) and the research record ("config edits do not affect running runs") are wrong for those fields. Decision 12.
2. **"Admin config has compare-and-set but no history":** confirmed. The roadmap does not mention that the stored audit `revision` is dropped on read (`admin_api.py:58`), that a no-change save still bumps the revision, or that audit and update are not atomic.
3. **"No secrets":** config has no secret field, but the MCP URL pattern admits embedded credentials (`app_config.py:41`). Snapshotting as-is would copy them into an append-only store. Decision 5.
4. **"409 handling already exists in `use-admin.tsx`":** true for saves (`use-admin.tsx:19`, `form.tsx:139-140`); restore needs its own dialog state and must also respect the shared dirty draft, which spans four pages.
5. **"History and restore panel in the admin config pages":** config is one document behind four pages; a per-page panel would restore fields of other pages too. Decision 11.
6. **Audit identity:** `by` is a raw Clerk subject shown to admins (`data-sections.tsx:97`). Resolving it to an email needs a Clerk lookup on the backend or web; out of A2 unless you want it.
7. **Knowledge audit rows** have no revision and no structured fields (`knowledge.py:269-270`); A2 adds `kind`/`action` only.
8. **Panda reference:** its conflict copy says "reloaded" (automatic reload). DATUMM keeps the user's draft and asks first (`form.tsx:140`), which is safer; A2 keeps that.
9. **Hosted data unknown:** whether the production `app_config` already holds a credential-bearing MCP URL, and its revision count, cannot be checked without hosted access (G1).

## 11. Result

| Item | Outcome |
| --- | --- |
| Commit | Backend and web A2 commits on their branches (see `git log`); not pushed |
| Backend change | `config_history.py`: snapshot with a write-path credential check (userinfo, query, fragment, or an unparseable URL, refused with 422), diff with a value allowlist and hashes otherwise computed against the redacted old config, self-healing baseline rows (`recovered`), the existing compare-and-set moved unchanged into one shared `write`; `GET /v1/admin/config/history` and `/{revision}`, `POST /v1/admin/config/restore` (CAS-guarded, 404 / 422 / 409, creates revision N+1 with `restoredFrom` and a note); audit rows gain `kind`, `action`, `changes`, `restoredFrom`, `note`, `cursor`, with a `before` cursor, `limit` and `kind` filter and the no-parameter call unchanged; capability `adminHistory`; indexes `admin_audit (kind, at, _id)`; history rows carry `restorable` and `identical`; revision numbers bounded to 31 bits; Agent-config docstring corrected; `test_config_history.py` |
| Web change | `adminHistory` flag (strict, unknown = off); proxy entries; defensive parser (the detail snapshot is parsed away and never held); Config history page with a revision table, per-revision diff against live, and a restore dialog (change list, note ≤200, "Restore as revision N+1", 409 / 404 / 422 handling, focus returns to the trigger); Restore blocked for unsaved or unfinished edits, non-restorable, live, or identical revisions; audit page with kind filter, "Load older" and a changes cell; save-bar revision link; Agent page copy corrected; dev fixture with a history store |
| Gates run (16 Nov, Node 24.18.0, Python 3.12.10, orchestrator after all changes) | Backend `uv run --frozen pytest`: 349 passed + 26 subtests (baseline 334 + 26); `lat check` passed. Web `npm run typecheck`, `npm run build`, `npm test` 710 / 710 (baseline 689), `lat check` passed; runtime smoke `--production` 18 / 18 on a fresh `next start` (port 3100) |
| Failing-first evidence | 10 of 11 first backend tests failed on `94c8ed4` (the other pins today's behavior); every review fix on both sides had a test that failed first |
| Browser evidence | Built-in browser, local dev server, `/dev/ux` "Admin fixture". 1: edited Parallel chats 3 → 2 and saved; history showed Revision 13 (Live) and "parallelChats 2 → 3" against live; audit showed "Edit · parallelChats 3 → 2". 2: in the conflict state Restore showed "Changed elsewhere … Reload to continue from it." with "Reload history", the dialog stayed open and no revision was written. 3: Restore with a note gave "Restored revision 12 as revision 14", a new "Restore from 12" live row, the Agent page showed the restored value 3, and the audit row carried the note. 4: with an unsaved edit, Restore was disabled with "Save or discard your edits first". 5: instruction changes read "changed" with no text or hash, allowlisted values were shown (`enabled false → true`), and the page held no snapshot or skill text. 6: "Load older" went 25 to 28 rows with no duplicates; the Knowledge filter showed only knowledge rows. 7: Enter on Restore opened the dialog with focus on the note field; Escape closed it and returned focus to the trigger. 8: flag off hid Config history, a direct visit read "Not provided by this backend", the audit page and plain "Revision 12" save bar behaved as before. 9 (390 px, dark): no page overflow, the table scrolled in its region, the dialog fit (16–374 px) |
| Independent review | 10 findings. Fixed: a malformed IPv6 MCP URL gave a 500 and blocked all saves, a hash of a credential URL reached the audit log, a history read during a save could relabel it as a baseline and lose its restore note, oversized revision numbers gave a 500, Restore enabled when it would fail (identical or invalid revisions, unfinished list entries), the browser holding the full snapshot, a mid-run pin test that proved nothing, style and line endings |
| Not run or not verified | Real Mongo or Cosmos behavior (index use, duplicate-key paths, `$or` plus sort), multi-worker behavior, anything hosted (G1); whether production already stores a credential-bearing MCP URL; screen-reader reading |
| Limits found | Skills and web search are still read live by runs in progress, so a restore reaches them within about 30 seconds (documented; snapshotting is A4). The audit insert is not atomic with the config write, so a crash between them leaves a revision without an audit row (history is repaired, audit is not). The history list reads up to 51 stored snapshots per page to compute `restorable` and `identical`. History and audit are kept forever with no retention (revisit at G1). A URL with `@` inside its path is not userinfo and is not refused. Admin identities are raw Clerk subjects. The save bar's "Changes saved." state outlasts navigation until the provider remounts (existing behavior) |
| Next step | Write the N4 packet (evidence-backed compositions) |
