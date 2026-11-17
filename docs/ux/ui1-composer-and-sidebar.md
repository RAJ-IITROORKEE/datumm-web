# Phase packet — UI1: Composer and sidebar

| Field | Value |
| --- | --- |
| Status | **done 17 Nov**: web live with this commit; backend `modelInfo` ships with the A3 backend release (section 11) |
| Depends on | G1 (live site), H0 [harness decision](harness-decision-2026-11-17.md) §5 row 2; A3 for prices (optional, see UI1-a) |
| Approved by / date | User, 17 Nov ("Approve UI1"): every decision UI1-a to UI1-i takes option A |
| Base commits | Web `017bd0d` (`main`). Backend local `main` `387e687`; **live `70ce912`**, which has no A3 (`2e00ee3` is after it). Panda `panda-agent-ui/Panda-agent` on `claude/agent-ui-migrations`, checkout at `1bedf1c` (the brief names `7c78dea`, an ancestor; the files cited below were read at `1bedf1c`) |

Facts marked **observed** were read in source on 17 Nov with `path:line`; *inferred* ones were reasoned,
not run. No test, build, browser or backend was run for this packet. Backend paths are under
`datumm-orchestrator/apps/domain-api/`; Panda paths under `Panda-agent/src/ui/`.

## 1. Goal and non-goals

A signed-in user sees, in the composer, which model they are on, its provider and (when the backend
says so) its price and context size, picks another with the keyboard, and reads a small ring that
shows how full the model's context window was on the last turn, with a card that explains the
numbers. In the sidebar they find Pinned, Projects and chats grouped Today / Yesterday / Previous
7 days, open a Ctrl/Cmd+K palette, drag the sidebar wider or narrower, and see "Working" and
"Needs attention" on rows. A new web on the live backend `70ce912` keeps working with what that
backend serves.

Non-goals: any harness, loop or LangGraph change; Tavily (T1); tools, skills or MCP registries
(A4a/A4b); token streaming (N5); admin pages (A3 is done); new model tiers, free pools or per-user
quotas; Panda's assistant-ui components or `--pa-*` tokens (behavior is ported, components are not);
a change to v2 commands, checkpoints, `PublicTask`, `PublicEvent` or native approval; a new dependency.

## 2. Current state (verified)

Key: **T** implemented and tested; **U** implemented, under-tested; **P** planned or partial; **A** absent.

| # | Item | State | Evidence (observed unless marked) |
| --- | --- | --- | --- |
| 1 | Model picker | U. Radix popover with effort slider and a `DropdownMenu` radio submenu of `/v1/config.models`; name and provider derived from the id (4 known providers); keyboard from Radix | `src/components/model-picker.tsx:26-38,62-153`; used at `workspace/composer.tsx:586-599`; render test `tests/composer-interactions.test.mjs:70-78` |
| 2 | Picker groups, price, context, privacy | A. Rows show name + provider only; no grouping | `model-picker.tsx:139-146` |
| 3 | Picker data | `/v1/config` returns ids only: `models`, `defaultModel`, effort, `capabilities` | backend `main.py:298-304`; web `use-workspace-state.ts:44,677` |
| 4 | Price and context per model | Admin-only. A3 `listing()` builds `price {promptPerM, completionPerM}`, `contextLength`, `imageInput` from the cached OpenRouter catalog; **not live** | `model_registry.py:163-173,215-236`; `pricing.py:17-32` (5-min cache, 10 s timeout; `_catalog` is also at `70ce912`, `model_registry.py` is not) |
| 5 | Privacy hint | A. No retention or logging field anywhere in DATUMM; Panda's comes from its own registry | grep `privacy`, `retention`: none in `domain-api`; Panda `agent/model-display.ts:36-38` |
| 6 | Context data per task | T. Public `data.usage` (schema 1): `context.modelCapacityTokens`, `estimatedInputTokens` (latest main request), `reservedOutputTokens`, `estimatedWindowUtilization`, `lastProviderCallState`, `lastProviderInputTokens`, `lastProviderOutputTokens`, `lastProviderReportedUsd`; `cumulative.{input,output,reasoning}Tokens`, `providerReportedUsd`, `modelCalls`; owner-scoped by `task_usage` | `budget.py:380-449`; `storage.py:78-91`; `usage_projection.py:1-36`; `task_controller.py:208-213`; present at `70ce912` (`git show 70ce912:…/budget.py`) |
| 7 | Cached tokens, per-turn steps, peak step | A. No cache-token field is recorded (`grep cache budget.py`: none). "Last provider call" is the newest call of **any role** by `createdAt` (specialists write to the parent run), so it is not "the largest step of the last turn". `modelCalls` is a ledger total, not per turn | `budget.py:416-424`; [A3 §2 item 10](a3-admin-model-registry.md#2-current-state-verified) |
| 8 | Context display | T, not in composer. `ContextUsage` renders a bar + details in the Activity panel and Settings → usage; no ring, no composer placement | `agent-memory.tsx:13-63`; `workspace/activity-panel.tsx:99`; `workspace.tsx:1388`; `tests/context-usage.test.mjs` (4 tests) |
| 9 | Pinned | T | `workspace/sidebar.tsx:482-490`; `lib/sidebar-history.mjs:19`; `tests/sidebar-history.test.mjs` |
| 10 | Projects, collapsible | U. Collapse state and order in `localStorage`; row menu; project filter | `sidebar.tsx:491-607` |
| 11 | Ctrl/Cmd+K palette over chats, projects, actions | T | `workspace/search-dialog.tsx:65-99` (combobox + listbox); `sidebar.tsx:301-313,347-370`; `sidebar-history.mjs:67-97`; `tests/sidebar-search.test.mjs` (20 tests) |
| 12 | Date groups | A. One flat "Chats" list in server order (`pinned_at` desc, `created_at` desc, limit 100) | `sidebar.tsx:608-640`; backend `task_api.py:179`. Each task carries `created_at` and `transcript[].at` (`task_controller.py:247-251`); the web `Run` type declares neither (`use-workspace-state.ts:70`) |
| 13 | Resizable width | P. Width is stored and clamped 180–440 (default 224) and `resizePanel('left')` exists, but only the **right** handle is rendered | `lib/workspace-layout.mjs:34,46,63`; `use-workspace-state.ts:336-342`; `workspace.tsx:1021`; `panel-resize.tsx:7`; DESIGN.md §5 says "224px expanded" |
| 14 | Mobile drawer | T/U. Below **899 px**: `role="dialog"` + `aria-modal`, backdrop, Escape closes and refocuses | `workspace.tsx:385-416,645-649`; `use-workspace-state.ts:655-661` |
| 15 | Row status | U. Dots/icons with `aria-label`: running, needs answer, failed, unread; no text chip | `workspace/chat-row.tsx:65,96-103`; rules `lib/workflow-state.ts` |
| 16 | Oversized files | `workspace.tsx` 1458, `use-workspace-state.ts` 1208, `conversation.tsx` 1549 lines; also over 300: `sidebar.tsx` 707, `composer.tsx` 717 | `wc -l` |
| 17 | `/dev/ux` | No sidebar or composer fixture (Workspace fixture is answer + drawing only) | `components/dev/ux-preview.tsx:46-60` |

So Panda's sidebar spec is right: most of the sidebar came from here. New work is date groups, the
left resize handle, text chips, the picker's groups and facts, and the composer ring.

## 3. Decisions for the user (recommendation first)

1. **UI1-a Meter data.** **(A) Web-only now** from `data.usage`: used = `lastProviderInputTokens +
   lastProviderOutputTokens` when `lastProviderCallState` is `completed`, else
   `estimatedInputTokens` labeled "estimated"; max = `modelCapacityTokens`; card shows input,
   output, cost (`lastProviderReportedUsd`), "Model calls in this chat" (`cumulative.modelCalls`),
   and says it covers the latest model call. No cached row. (B) Backend S now: add
   `context.turn = {peakTokens, inputTokens, outputTokens, steps, usd}` over this turn's calls
   (Panda's "largest step"), behind capability `turnUsage`; ships with the next backend release.
2. **UI1-b Picker facts.** **(A) Additive `modelInfo` in `/v1/config` behind capability `modelInfo`**
   (section 5), shown only when on; on `70ce912` the picker shows name + provider as today. (B)
   Web-only: provider from the id, no price or context.
3. **UI1-c Privacy hint.** **(A) Omit per-model hints** (no source exists, item 5); one static line under
   the list: "Requests go to the model provider through OpenRouter." (B) Add an admin-set
   `retention` field (belongs in A4a or later).
4. **UI1-d Picker groups.** **(A) By provider**, default model first in its group, server order kept.
   (B) Flat list as today. (Panda's Free / More groups have no meaning here.)
5. **UI1-e Ring tones.** **(A) Panda's thresholds:** neutral below 70%, warning 70–90%, danger above 90%,
   using the `warning` and `danger` tokens (DESIGN.md front matter). (B) Warning only at 90%.
6. **UI1-f Date groups.** **(A) Today / Yesterday / Previous 7 days / Older**, by `created_at` (keeps the
   server order inside each group; no reordering while a chat runs). (B) By last activity
   (`transcript[-1].at`): matches Panda, but rows jump between groups and order no longer matches
   the server's 100-item window.
7. **UI1-g Width and drawer.** **(A) Render the left handle with 220–360 px** (default 224 kept; stored
   values outside are clamped) **and keep the 899 px drawer breakpoint** (all CSS and focus code
   use it). (B) Also move the drawer to 760 px (touches `workspace.tsx`, three CSS files and their
   checks).
8. **UI1-h Chips.** **(A) Text chips** "Working" (running) and "Needs attention" (needs answer, failed,
   interrupted, Revit check), from one pure rule; unread dot stays. (B) Keep dots, add tooltips.
9. **UI1-i Splitting files.** **(A) Do not split the three oversized files in UI1;** touch them for
   wiring only (≤15 lines each). Extract from `sidebar.tsx` the account menu
   (`sidebar-account.tsx`) and the chat sections (`sidebar-chats.tsx`) so it ends under 400 lines;
   new UI goes in new files. (B) Also split `workspace.tsx` (separate phase; larger diff and
   regression risk on focus and drawer code).

## 4. Design (recommended options)

DESIGN.md §4 (composer row "model, effort, voice and Send on the right") and §5 (left navigation)
stay; §5's width line changes to "224px default, 220–360 resizable".

**Model picker** (`model-picker.tsx`, kept as the one picker). Keep the popover and effort slider.
The model submenu becomes provider groups: `DropdownMenuLabel` per provider inside the existing
`DropdownMenuRadioGroup`, separators between groups. Each row: name; second line provider, then
"$3 / $15 per M" and "200K context" when `modelInfo` has them, "Reads images" when `imageInput`.
Keyboard comes from Radix (arrows, Home/End, typeahead, Enter, Escape returns focus to the
trigger). Trigger `aria-label` adds price when known. Ported from Panda `model-display.ts:19-25`
(provider names, monogram not used) and `:40-45` (group ordering idea).
*Build deviation:* the row's second line shows the facts only, not the provider, because the group
label already names the provider and repeating it on every row adds noise without information.

**Context meter** (`workspace/context-meter.tsx`, new, client). A 16 px SVG ring plus "12K / 200K"
text in the composer's right group, before the model picker. Trigger is a `Button` that opens the
affectUI popover (`vendor/affectui/popover-clean`): card title "Context used, latest model call",
rows Input, Output, Cost, Model calls in this chat, Model window; a note: "This shows the latest
model call only. Totals for the chat are in Activity." with a link that opens Activity. Math
ported from Panda `ai-elements/context-math.ts:5-27` (percent, ring dash, tone).

| State | Shows |
| --- | --- |
| No task yet, or `data.usage` missing / other owner | Nothing (no empty ring) |
| Running, no completed call | Ring with estimate, text "~12K / 200K", `aria-busy` |
| Window unknown (`modelCapacityTokens` null) | Text "12K tokens", no ring, card says "Model window unavailable" |
| Usage unknown | Hidden; Activity keeps today's "Unavailable" copy |
| 390 px | Ring only (text hidden); card fits `calc(100vw - 32px)` |

Screen reader: trigger label "Context used, latest model call: 12K of 200K tokens, 6% used";
tone is never the only signal (percent is in the label). Light and dark use tokens only.

**Sidebar.** Chats section splits into date groups (headings are `h3` text, not buttons; empty
groups hidden). Archived view and search results stay flat. Chips sit at the row end, truncate the
title first, and keep the existing `aria-label`s as the chip text. Left `PanelResize` renders
between sidebar and chat when the sidebar is open and not in drawer mode; keyboard arrows ±16 px,
Home/End, double-click resets (existing component). Palette and drawer behavior unchanged.

Loading / empty / error copy for the sidebar and palette stays as today (`sidebar.tsx:509-513,
641-648`; `search-dialog.tsx:84-99`).

## 5. Contract changes

| Change | Kind |
| --- | --- |
| `/v1/config.modelInfo` (UI1-b A), capability `modelInfo: true` in `main.py` `CAPABILITIES`, `false` in `local/entry.py:246` | Backend S, additive |
| Optional `data.usage.context.turn` + capability `turnUsage` (UI1-a B only) | Backend S, additive; touches `budget.py` and `storage.py:84` allow-list |
| Web reads `created_at` already in the task payload | Frontend-only |

`modelInfo` shape (only served models; any field may be absent; strings for money as A3 does):

```json
{"modelInfo": {"anthropic/claude-sonnet-5": {"promptPerM": "3", "completionPerM": "15",
  "contextLength": 200000, "imageInput": true}}}
```

Built from `model_registry._facts` over `pricing._catalog` wrapped in `asyncio.wait_for(…, 2)`;
on timeout or `RuntimeError` the key is `{}` and `/v1/config` still returns 200. Tests in
`test_config_capabilities.py`: shape per served model only; catalog down gives `{}`; no key,
owner or admin field leaks; local app reports `modelInfo: false`.

**Degradation on `70ce912`** (no `modelInfo` or `turnUsage` flag): `parseCapabilities` gives
`unknown`, the web treats it as **off** (`featureEnabled`, `capabilities.mjs:22`), the picker
shows names and providers, and the meter uses the `data.usage` fields that `70ce912` already
serves. No proxy allow-list change (`/v1/config` is already allowed).

## 6. Change list

**Web** (single owner: web implementer):

| File | Change |
| --- | --- |
| `src/lib/model-display.mjs` + `.d.mts` (new) | Name, provider, groups, price and context labels, `modelInfo` parser (drops bad entries) |
| `src/lib/context-meter.mjs` + `.d.mts` (new) | `meterReading(usage)`, `contextPercent`, `ringDash`, `meterTone`, `formatTokens` |
| `src/lib/sidebar-history.mjs` + `.d.mts` | `groupChatsByDate(chats, now)`; `chatChip(task)` |
| `src/lib/capabilities.mjs` + `.d.mts` | `modelInfo` (and `turnUsage` if UI1-a B) |
| `src/lib/workspace-layout.mjs` | Navigation clamp 220–360 |
| `src/components/model-picker.tsx` | Groups, facts, labels; logic moves to `model-display.mjs` |
| `src/components/workspace/context-meter.tsx` (+ module CSS, new) | Ring, popover card |
| `src/components/workspace/composer.tsx` | Mount the meter; pass `modelInfo` |
| `src/components/workspace/sidebar.tsx`; `sidebar-account.tsx`, `sidebar-chats.tsx` (new) | Extraction, date groups |
| `src/components/workspace/chat-row.tsx` (+ `sidebar.module.css`) | Chips |
| `src/components/ui/dropdown-menu.tsx` | Export `DropdownMenuGroup` (Radix) for `role="group"` |
| `src/components/workspace.tsx` | Render left `PanelResize` (wiring only) |
| `src/components/workspace/use-workspace-state.ts` | Keep `modelInfo` from config (wiring only) |
| `src/components/dev/ux-preview.tsx`, `dev/composer-sidebar-preview.tsx` (new) | Fixture: chats across dates, every chip, 6 models in 3 providers with and without facts, usage at 30 / 75 / 95% and unknown window |
| `tests/model-display.test.mjs`, `tests/context-meter.test.mjs` (new); `tests/sidebar-history.test.mjs`, `tests/capabilities.test.mjs`, `tests/layout-preferences.test.mjs` | Section 7 |
| `DESIGN.md` §5, `lat.md/` (if a contract note names the picker) | Width line; `lat check` |

**Backend** (only with UI1-b A; owner: backend implementer): `main.py` (`modelInfo` and flag),
`local/entry.py` (flag false), `test_config_capabilities.py`, `README.md` config section.

## 7. Tests and browser scenarios

**Web unit** (`npm test`, baseline 769 recorded 17 Nov), written first:

1. `meterReading`: completed call uses provider in+out; running uses the estimate with
   `estimated: true`; null window gives no percent; negative, NaN or missing fields give null
   readings, never 0%; other-owner usage (scope mismatch) gives null.
2. `meterTone` at 69.9 / 70 / 90 / 90.1; `ringDash` clamps 0–100; `formatTokens` 999, 1.2K, 200K, 1M.
3. `groupChatsByDate` across midnight in local time, invalid date goes to Older, order kept.
4. `chatChip`: running → Working; needs answer, failed, interrupted, Revit check → Needs attention.
5. `modelInfo` parser drops non-numeric prices, negative context, unknown ids; groups by provider
   with the default first; `modelInfo`/`turnUsage` flags `unknown` = off.
6. Layout clamp: stored 180 → 220, 440 → 360, 224 unchanged.
7. Existing picker render test still passes with and without `modelInfo`.

**Backend** (UI1-b A): the four cases in section 5; suite baseline 530 + 26 subtests.

**Browser**, built-in browser, 1280 px and 390 px, light and dark:

- *Controlled fixture* (`/dev/ux` → "Composer and sidebar"): (1) picker groups by provider,
  arrows/Home/End/typeahead, Enter selects, Escape returns focus; facts shown only on rows that
  have them. (2) Ring at 30 / 75 / 95% shows neutral / warning / danger and the percent in its
  label; card opens with Enter, closes with Escape; unknown window shows text only. (3) Date
  headings, chips, Ctrl K palette. (4) 390 px: ring only, card fits, drawer opens and traps focus.
- *Real localhost* (signed in, `http://localhost:3001`, local https backend with in-memory Mongo
  and no provider key, as in the [handoff](HANDOFF.md)): (5) picker lists served models; with the
  backend change, price and context appear; with `modelInfo` forced off, names only. (6) Drag and
  keyboard-resize the sidebar between 220 and 360; reload keeps the width. (7) Existing chats
  group by date; pin moves a chat to Pinned. A real meter reading needs a model call, which this
  backend cannot make; meter values on real data belong to the live check after deploy.

## 8. Acceptance criteria

- The picker groups by provider and shows price and context only when `modelInfo` is on; on a
  backend without the flag it behaves as today (unit 5, browser 5).
- The meter never shows a fabricated 0% or percent without a known window (unit 1).
- Tones change at 70% and above 90%; percent is always in the accessible name (unit 2, browser 2).
- Chats group by date with no lost or duplicated rows (unit 3); chips follow one rule (unit 4).
- Sidebar resizes 220–360 by pointer and keyboard; drawer below 899 px unchanged (browser 4, 6).
- `sidebar.tsx` under 400 lines; new files under 300; no new dependency; LF.
- Gates green: `npm run typecheck`, `npm test`, `npm run build`, `lat check`, runtime smoke
  `--production`; backend suite and `lat check` when UI1-b A. Counts recorded.

## 9. Rollback

Revert the web commit: picker, sidebar and composer return to today. The stored layout width may
sit at 220–360 and stays valid under the old 180–440 clamp. Revert the backend commit: `modelInfo`
and its flag disappear; an older web ignores the unknown key. No stored data, checkpoint or task
changes in either repo.

## 10. Open questions

1. **Risk: `/v1/config` latency.** A cold catalog fetch takes up to 10 s (`pricing.py:24`); the
   2 s `wait_for` bounds it, but a cold first load then shows no prices until the next config read
   (*inferred*). Acceptable?
2. **"Latest model call" vs "last turn".** With UI1-a A the reading can be a specialist call
   (item 7). If that is misleading in practice, take UI1-a B in the T1 backend release.
3. **Cached tokens** are not recorded by DATUMM; showing them needs telemetry work in `budget.py`
   (out of scope).
4. **Live backend has no A3** (`70ce912`): `modelInfo` reuses A3's `_facts`, so it is built on
   local `main` and ships in the same backend release as A3; A3's fail-closed list then decides
   which models appear. Until then the live picker shows names only.
5. **Panda reference commit:** the checkout is at `1bedf1c`, not `7c78dea`; confirm which to cite.
6. **100-chat window:** date groups cover only the 100 newest tasks (`task_api.py:179`); older
   chats remain reachable only by search of loaded rows, as today.

## 11. Result

Built 17 Nov on `main` (web by a Sonnet agent, backend `modelInfo` by a Sonnet agent; independent Opus review; review fixes by two Opus agents). Backend commit `95b2361` (local; ships with the A3 backend release). Web: this commit.

| Item | Outcome |
| --- | --- |
| Review | 1 HIGH (a non-finite catalog price would 500 `/v1/config` and the workspace load), 3 MEDIUM (cache never warmed past the 2 s cap and no shared fetch; left resize stored a viewport-clamped chat width; "Needs attention" missed Revit "verification incomplete"), 10 LOW. All fixed with tests. A fix side effect (60 s fail-fast also blocking budget checks before paid calls) was caught by the orchestrator and limited to the `modelInfo` path. A README line-ending rewrite (about 1,880 lines of noise) was reverted to the 2 real lines |
| Gates (orchestrator, Node 24.18.0, Python 3.12) | Web: typecheck clean, `npm test` 788 / 788, `lat check` passed, `npm run build` exit 0 in 5 of 5. Backend: 541 passed + 26 subtests, `lat check` passed |
| Theme and fonts | Unchanged: no colour token or font line in the diff; the only `DESIGN.md` edit is the screen-map line for the sidebar |
| Browser (built-in browser, real signed-in `localhost:3001` over the local backend, and `/dev/ux`) | Fixture: meter neutral 30%, warning 75%, danger 95%, "~40K / 200K" while estimating, "42K tokens" with no window, hidden with no reading; picker grouped by provider with prices, context and "Reads images", default first with a check, a row without facts, OpenRouter note; sidebar Today / Yesterday / Previous 7 days / Older with "Working" and "Needs attention" chips (incl. Revit verification incomplete) and the unread dot. Real site: `/v1/config` `modelInfo` on with all 6 served models filled from the live OpenRouter catalog; the picker shows them grouped OpenAI / Anthropic / Qwen / Google. 375 px: rings only, text hidden as designed |
| Not run | Pointer drag and keyboard resize of the handle, screen-reader reading, light mode, a model-backed turn (no provider key locally, so no real meter reading on the real site) |
| Limits | "Reads images" touches the menu's right edge on the widest row (cosmetic). `needsRevitCheck` mirrors `workflow-state.ts` and must change with it. "Revit build blocked", "Revit is busy" and "read timed out" no longer get a chip (strict UI1-h list); the user may want them back |
| Next step | Push web live; A3 backend release with `modelInfo`; then UI2 per the [parity plan](panda-parity-plan-2026-11-17.md) |
