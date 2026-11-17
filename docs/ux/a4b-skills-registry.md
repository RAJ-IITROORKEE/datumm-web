# Phase packet — A4b: Skills registry (SKILL.md, per-mode, listed by relevance, loaded on demand)

| Field | Value |
| --- | --- |
| Status | **done 17 Nov; web live with this commit; backend with the next backend release** |
| Depends on | A2 versioned config (done); A4a tool catalog and `_tool_gate` (done, backend local `1e67551`); [parity plan](panda-parity-plan-2026-11-17.md) row 13, step 6; H5 = A |
| Approved by / date | User's standing instruction, 17 Nov: A4b-a to A4b-f take the recommended option. Orchestrator addition for rollback safety: config load drops unknown `tools` ids (writes still reject them) |
| Base commits | Backend local `main` `1e67551` (read 17 Nov). Web `main` as read 17 Nov. Panda `panda-agent-ui` working tree as read 17 Nov |

Facts marked **observed** were read in source this session with `path:line`; *inferred* ones were
reasoned, not run. No test, build, server, browser, network or AWS call was made for this packet.
Backend paths are under `datumm-orchestrator/apps/domain-api/`; Panda paths under
`panda-agent-ui/Panda-agent/src/` unless they start with `app/` (then `panda-agent-ui/app/`).

**Design rules (user; mandatory).** Keep DATUMM's theme and typography exactly; layout and behaviour
from Panda; components from `src/components/ui` and `vendor/affectui`; port onto the LangGraph
backend (H5 = A). **A skill is guidance text. It cannot add a tool, widen a mode, change an approval
mode or authorize a Revit change** (AGENTS.md section 6).

## 1. Goal and non-goals

An administrator opens **Admin → Skills**, sees a list of skills with per-mode switches (Ask, Plan,
Build), opens one to edit it as a single SKILL.md (frontmatter + body) with a live preview and limit
counters, sees that skill's past versions and restores one, and types a sample prompt to see which
skills the agent would list and which one it would attach. In a chat, the agent's prompt carries
only a short list (name + "use when" line) of at most 8 relevant skills; it reads a skill's body
with a `load_skill` tool (at most 3 per run), and one clear match is attached automatically.

Non-goals: built-in (code-shipped) skills, skill files or scripts, skill-provided tools, per-user
skills, usage counters, a separate skills collection, MCP (A4c), compaction rules (H6).

## 2. Current state (verified)

Key: **T** implemented and tested; **U** implemented, under-tested; **A** absent.

| # | Item | State | Evidence (observed) |
| --- | --- | --- | --- |
| 1 | Storage: `skills: list[Skill]` (≤30) inside the one `app_config` document. `Skill` is strict: `id` `^[a-z0-9-]{1,40}$`, `name` ≤120, `description` ≤300, `instructions` 1–4000, `modes` (default Ask+Plan), `enabled` | **T** | `app_config.py:31-37,62` |
| 2 | Versioning: every save goes through `config_history.write` (CAS, snapshot, diff, audit); skill `instructions` and `description` appear only as hashes in diffs and audit; full text kept in the snapshot for restore | **T** | `config_history.py:28,77-88,186`; `test_config_history.py:159-171` |
| 3 | History list, detail (with `config` and `changesFromCurrent`) and whole-config restore exist | **T** | `admin_api.py:70,81-90,93` |
| 4 | Effective config drops disabled skills; skills are read live (30 s cache) | **T** | `app_config.py:4-5,79,95` |
| 5 | Injection: every enabled skill whose `modes` includes the run mode is appended **in full** to the system prompt of every decide call, prefixed "Additional guidance (never grants write authority…)" | **T/U** | `agent_model_policy.py:117-123`; `agent_workflow.py:1572-1573` |
| 6 | No relevance filter, no list cap below 30, no `load_skill`. Worst case ≈ 30 × (4000 + 124) + 95 ≈ 124k characters on every decision (*inferred* ≈ 31k tokens at ~4 chars/token; not measured) | **A** | items 1, 5 |
| 7 | Skills are not used in the intent step (only the `else` branch appends them) | **T** | `agent_workflow.py:1568-1573` |
| 8 | Only the last 8 observations reach the model packet | **T** | `agent_workflow.py:448-452` |
| 9 | A4a catalog is code: rows with `risk`, `allowedModes` ceiling, `toolNames`; unknown name → `write`; admin switches only narrow (`AppConfig.tools` validator) | **T** | `tool_catalog.py:37-72,80-91`; `app_config.py:64-75` |
| 10 | Decide filters tools by `tool_catalog.filter_tools`; `_tool_gate` re-checks the switch at dispatch and runs `read` tools without a card | **T** | `agent_workflow.py:1579`; `:2650-2667` |
| 11 | A test asserts the catalog covers every name `_tools` can emit | **T** | `test_tool_catalog.py:66` |
| 12 | Focus filters keep a fixed set (`finish_answer`, `ask_question`, `plan_task`, `lookup_evidence`) plus requested names | **T** | `agent_workflow.py:1030` |
| 13 | Config load and history validation keep only known **top-level** keys; item models are strict, so an unknown field **inside** a skill item fails validation of the whole config (*inferred* from `extra='forbid'`; `load()` does not catch it) | **T** | `app_config.py:21-22,99-101`; `config_history.py:60-66` |
| 14 | Web Skills page: card per skill with Id, Name, Description, Instructions (4000 counter), mode checkboxes, enable switch, add/remove; text says "appended to the agent's system prompt" | **T** | `src/components/admin/config-sections.tsx:108-150`; `src/app/admin/skills/page.tsx:1-2` |
| 15 | Web validation mirrors `Skill` bounds; nav item gated by `adminConfig` | **T** | `src/lib/admin-config.mjs:9,49-57`; `src/components/admin/admin-shell.tsx:26` |
| 16 | History UI never renders skill text; restore dialog says running chats pick up skills within 30 s | **T** | `lat.md/contracts.md:165,173`; `src/components/dev/admin-history-fixture.ts:17` |
| 17 | Capabilities are fixed booleans; `adminTools`, `approvalModes` exist, no skills flag | **T** | `main.py:296-299` |
| 18 | Proxy allow-list has `admin/config`, `history/{n}`, `restore`; nothing under `admin/skills` | **T** | `src/app/api/service/[...path]/route.ts:5` |

Panda reference (observed): SKILL.md parser — frontmatter `name` (kebab, ≤64) and `description`
(one line, ≤500) required, body required, whole file ≤6000, control characters refused
(`agent-loop/skill-md.ts:3-33`). Registry table + `_versions` table, every change bumps `version`
(CAS) and appends a history row; ≤12 enabled, ≤30 active (`migrations/20261113180000_panda-agent-
agent-skills.sql:1-38`). Prompt lists name + trigger (`Use when…` sentence, ≤150 chars) of ≤8
skills ranked by shared words, all if none match (`agent-loop/loop.ts:261-288`); `load_skill`,
≤3 per turn (`agent-loop/tools.ts:180,268`); `bestSkill` attaches one clear match (≥2 shared
words and ahead of the runner-up, or one distinctive 6+ letter word) (`loop.ts:274-282`;
`agent-loop/chat.ts:461-467`); loaded skill text is trimmed last (`loop.ts:58-61`). Admin UI:
filter chips, list with Chat/Work switches, detail aside with version and SKILL.md, modal editor
(`app/admin/agent-skills/skills-registry.tsx:59-71,185-193,214,232`). A per-skill restore control
was not found in that file (searched "Restore").

## 3. Decisions for the user (recommendation first)

1. **A4b-a Storage.** **(A) Keep skills in the versioned config with the same `Skill` item shape.**
   Versions = config history filtered to `skills[<id>]` paths; per-skill restore copies that
   skill from a history snapshot into the draft and saves (new revision, normal audit). No schema,
   no migration, rollback-safe (item 13). (B) Separate `agent_skills` + `agent_skill_versions`
   collections with per-skill CAS (Panda): second history, second audit path, new endpoints (M).
   (C) New fields on `Skill` (e.g. `whenToUse`): breaks older images on load (item 13); rejected.
2. **A4b-b SKILL.md mapping.** **(A) SKILL.md is the editor and import/export format only**:
   frontmatter `name` → `id`, optional `title` → `name` (default: `id`), `description` (must
   contain the "Use when…" trigger) → `description`, body → `instructions`; modes and enabled stay
   switches outside the file. Parsed in a web lib; the backend keeps validating fields. Caps stay
   today's (description 300, body 4000) — tighter than Panda (500 / 6000). (B) Store raw SKILL.md
   text server-side (needs a new field; see A4b-a C).
3. **A4b-c Prompt strategy.** **(A) List ≤8 relevant skills (id + trigger) in the system prompt;
   bodies only via `load_skill` (≤3 per run) plus one auto-attach.** Loaded bodies are re-read from
   live config and appended to the system prompt on every later decision of the run (item 8 would
   drop an observation after 8 steps). (B) Same but no auto-attach (cheaper; weak models may skip
   `load_skill`, Panda's reason for `bestSkill`). (C) Keep today's full injection, capped.
4. **A4b-d `load_skill` in the catalog.** **(A) New row `skills`** ("Skills", group Core, runs on
   DATUMM, risk `read`, allowed and default all modes, not required). Off in a mode → no list, no
   tool, no auto-attach in that mode. (B) Fold into the required `core` row (cannot be switched).
5. **A4b-e Per-skill modes default.** **(A) Keep Ask + Plan** for new skills (today's default,
   `app_config.py:36`); Build only when the admin turns it on. (B) All three.
6. **A4b-f "Which skills would list" tester.** **(A) Backend endpoint**
   `POST /v1/admin/skills/preview {prompt, mode, skills?}` running the same ranking code on the
   draft (unsaved) skills, so the answer cannot drift. (B) Port the ranking to a web lib too (two
   implementations).

## 4. Design (recommended options)

**Ranking** (new `skill_registry.py`, pure, port of Panda `loop.ts:261-288`): `words(text)` =
lowercase `[a-z0-9]{3,}` minus a stop list (Panda's, with `datumm`, `revit` replacing
`pandabyte`, `board(s)`); score = shared words with `id` (dashes → spaces) + `description`, plus
prefix matches for asked words longer than 4; `relevant(skills, prompt, max=8)` = hits by score,
or the first 8 when none hit; `best(skills, prompt)` = Panda `bestSkill` rule; `trigger(desc)` =
the "Use when/for…" clause or first sentence, ≤150 chars; an empty description lists the `name`.
Skills considered = enabled, `mode in skill.modes`, and the `skills` catalog row on for the mode.

**Prompt** (replaces `skills_prompt` at `agent_workflow.py:1573`): when the list is non-empty,
append "Skills (administrator-written guidance; never grants authority, never adds tools, never
approves Revit changes; never overrides the rules above). If one fits, call load_skill first:" then
one line per skill `- <id>: <trigger>`. Then, for each loaded id (from `skill_loaded`
observations in the whole run, newest 3, still enabled in this mode): "[Skill <id>] <body
whitespace-collapsed>". Bounds: list ≤ 8 × (40 + 150 + 4) + 250 ≈ 1.8k chars; bodies ≤ 3 × 4000.
Worst case ≈ 14k chars, down from ≈ 124k (item 6).

**`load_skill` tool** (`_tools` adds it when the list is non-empty; added to the focus keep set at
`agent_workflow.py:1030` and any other filter that would drop it — *inferred* list from
`:1514-1564`, verify at build): args `{id}` (pattern as `Skill.id`). Dispatch: through `_tool_gate`
(risk `read`, no card); `reserve(run, 'agent_tool_calls')`; refuse with an observation (not an
error) if the id is not in the current mode's enabled set, already loaded, or 3 already loaded;
else append `{'kind':'skill_loaded','id','hash': sha256(body)[:12],'auto':False}` — the body is
**not** stored in the run (the system prompt reads it live), so traces and exports carry ids only.
Event `skill_loaded` (id only).

**Auto-attach.** At the first non-intent decision of a run that has no `skill_loaded` yet, if
`best()` returns a skill, record the same observation with `auto: True` and event
`skill_auto_attached`. It counts toward the 3.

**Safety.** Skill text is trusted-admin text but treated as guidance only: (1) the tool list is
computed from `_tools`, the catalog and admin switches before skills are read; no code path parses
skill text into tools, modes, limits or approval state. (2) `workflow.py` approve and `main.py`
resume are not edited and do not read skills. (3) Skill text never reaches history/audit diffs
(hash only, unchanged). (4) Bodies are bounded (4000) and whitespace-collapsed; the web editor
refuses control characters (Panda rule).

**Migration.** None: same item shape. Existing skills keep their text and modes. The editor shows
a hint on skills whose description has no "Use when" clause ("Add a 'Use when…' line so the
agent can choose this skill"); they still list by name.

**Capability** `skillsOnDemand` (backend ranks and loads; the preview endpoint exists). Web: off
or unknown → today's Skills page and copy, unchanged.

**Admin Skills page** (`/admin/skills`, Panda layout, DATUMM theme; flag on):
- Header: title, one-line explanation ("The agent sees each skill's name and 'use when' line and
  reads the full text only when it needs it"), "New skill", "Import SKILL.md" (file input, text
  only).
- Filter chips: All, Ask, Plan, Build, Off (`ui/button` with `aria-pressed`).
- List rows (`ui/card`): id (mono), title, trigger line, three `ui/switch` (Ask / Plan / Build,
  labelled "Ask: enabled for <id>"); all off = off badge (`ui/badge`). Click opens the detail.
- Detail (`ui/sheet` on 390 px, side panel at desktop): SKILL.md preview (read-only, rendered as
  text, never as HTML), revision of last change, "Edit", "Export SKILL.md", "Remove" (confirm
  `ui/dialog`), **Versions**: rows from config history whose changes touch `skills[<id>]` (date,
  admin, action, changed fields), each with "Restore this version" → puts that snapshot's item into
  the draft; the page's existing Save bar commits it. Shortcut: scans the newest 50 history rows;
  "Load older" pages further.
- Editor (`ui/dialog`): one monospace textarea (vendored `text-area-clean`) with SKILL.md;
  counters "description N of 300", "body N of 4000"; parse errors inline (`aria-describedby`);
  the draft updates only on a valid parse.
- "Test a prompt" panel: prompt textarea + mode segmented control (`segmented-control-clean`)
  → "Would list: a, b, c" and "Would attach: a" (or "none"), from the preview endpoint over the
  current draft; note "Uses unsaved changes".
- Save/discard, dirty state, 409 reload: the existing `ConfigPage` flow.

## 5. Contract changes

| Change | Kind |
| --- | --- |
| No `AppConfig` / `Skill` schema change; no new top-level key | none (rollback-safe) |
| Catalog row `skills` → tool `load_skill`; `AppConfig.tools.skills` becomes a valid key | Backend S; old image: unknown id in `tools` fails the A4a validator (see section 9) |
| `POST /v1/admin/skills/preview` `{prompt ≤2000, mode, skills?: Skill[] ≤30}` → `{listed: id[], attached: id \| null}`; strict body; admin only | Backend S; proxy allow-list `admin\/skills\/preview` |
| Observation `skill_loaded {id, hash, auto}`; events `skill_loaded`, `skill_auto_attached` (ids only) | Backend S; run checkpoint data only, no new state key, no v2 command change |
| Capability `skillsOnDemand` | Backend S; web `CAPABILITY_FEATURES` |
| No native, relay, `/resume`, approval or AG-UI schema change | — |

## 6. Change list

**Backend** (owner: backend implementer): `skill_registry.py` (new: `words`, `relevant`, `best`,
`trigger`, `prompt_block`), `agent_model_policy.py` (remove `skills_prompt` or delegate),
`agent_workflow.py` (decide: list + loaded bodies + auto-attach; `_tools` adds `load_skill`; keep
sets; dispatch branch), `tool_catalog.py` (row `skills`), `admin_api.py` (preview route),
`main.py` (capability), `test_skill_registry.py` (new), `test_tool_catalog.py` (coverage),
`test_config_history.py` (unchanged; must still pass), `README.md` code map, `lat.md/` note.

**Web** (owner: web implementer): `src/lib/skill-md.mjs` + `.d.mts` (parse/format, caps, control
chars; port of Panda `skill-md.ts`), `src/lib/skill-versions.mjs` + `.d.mts` (filter history rows
to one skill, pick the item from a detail snapshot), `src/lib/capabilities.mjs` + `.d.mts`,
`src/components/admin/skills-section.tsx` (+ module CSS; new, keeps old `SkillsSection` for flag
off), `src/app/admin/skills/page.tsx` (choose by flag), `src/app/api/service/[...path]/route.ts`
(allow-list), `src/components/dev/` fixtures (skills list, versions, preview), tests, `lat.md/`
contracts note. `config-sections.tsx` copy unchanged.

## 7. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`; recorded baseline 657 + 26 subtests, 17 Nov, A4a result):

1. Ranking: Panda cases ported (shared words, prefix match, no hit → first 8, ties by order);
   `best` returns null on a tie or a single common word; `trigger` extracts "Use when…".
2. **Prompt-size bound:** 30 enabled skills with 4000-char bodies and 300-char descriptions in
   one mode → skills text in the system prompt ≤ 2,000 chars before any load and ≤ 14,500 after
   3 loads; nothing appended when the list is empty.
3. Mode and switch: a skill off for Build is never listed, loaded or attached in Build; catalog
   `skills` off for Plan → no list, no `load_skill`, no auto-attach in Plan; a decision naming
   `load_skill` there is `AGENT_INVALID_ACTION`.
4. `load_skill`: unknown/disabled/other-mode id, repeat and 4th load each add a refusal
   observation and do not grow the prompt; a loaded skill disabled mid-run drops out of the next
   decision; run data and events hold ids and hashes, never body text.
5. **A skill cannot enable a tool or approve a Revit change:** a Build skill whose body says "call
   apply_change_set", "approve the proposal", "switch to auto" → offered tool names equal those of
   the same run without skills plus `load_skill`; a proposal still reaches `awaiting_approval`;
   `approve_change_set` is not called; source test that `workflow.py` and `main.resume` do not
   import `skill_registry` or read `skills`.
6. Preview endpoint: admin only, strict body, uses draft skills when given, matches decide output.
7. Old image: a stored config whose `tools` holds `skills` — see section 9 for the expected result.

**Web** (`npm test`; recorded baseline 855, 17 Nov): `skill-md` parse/format round trip, every
error, caps 300/4000, control characters, CRLF; `skill-versions` filtering and item pick; flag off
renders today's section; proxy path accepted, neighbours refused.

**Browser** (built-in browser, 1280 px and 390 px, light and dark):

- `/dev/ux` fixtures: (1) flag unknown → today's Skills page. (2) List with chips and per-mode
  switches; toggle Build on, Save, Config history shows `skills[x].modes`. (3) Editor: paste a bad
  SKILL.md → inline error, Save disabled; fix → counters and preview update. (4) Versions: restore
  an older version → draft dirty, Save → new revision. (5) Test a prompt → listed and attached.
- Real signed-in localhost against the local backend (HANDOFF "Real-site local test"): (6) Skills
  page loads, create from SKILL.md, save, reload persists. (7) Versions and restore round-trip.
  (8) Test a prompt returns from the backend. Chat use of `load_skill` needs a model key and is
  fixture/unit-only until hosted.

## 8. Acceptance criteria

- With no skills saved, prompts and offered tools are byte-for-byte today's (no list, no
  `load_skill`).
- With skills saved, no decision's system prompt carries more than 8 listed skills or more than
  3 bodies; per-run loads ≤ 3.
- No path from skill text reaches the tool list, approval mode, grants or `approve_change_set`;
  the native approval code is unchanged in the diff.
- Older backend: web shows today's Skills page and sends nothing new (fixture 1).
- Gates: backend pytest, `lat check`, `npm run check:graph`; web `npm run typecheck`, `npm test`,
  `npm run build`, `lat check`. No colour, font or token line in the web diff; no new dependency.

## 9. Rollback

(1) Admin: turn the `skills` catalog row off per mode (no list, no load) or restore an earlier
revision. (2) Backend image rollback: the skill items are unchanged, so an older image reads them
and goes back to full injection (today's behaviour). **Caveat to verify at build:** if an admin
saved `tools.skills`, the A4a validator in the older image refuses an unknown id
(`app_config.py:70-72`), and `load()` does not catch it (`:99-101`) — *inferred* that config
reads would then fail. Contain it: before rolling back, remove `tools.skills` (save it at
default), or make the A4b validator change ship first as "unknown ids are dropped on load, refused
on write". Record which at build. `skill_loaded` observations on old runs are ignored by older
code (*inferred*: unknown kinds pass through `model_observations`, `agent_workflow.py:469-470`).
**Recorded at build (orchestrator ruling):** A4b ships the load-drop (logged as a warning that
names each dropped id), but it protects a rollback only to an image that contains it. The live
image `1e67551` does not. **Rollback step to `1e67551`:** first reset the `skills` tool row to its
default — /admin, Tools, switch Skills back on for Ask, Plan and Build, save — which removes
`tools.skills` from the saved config. Then roll the image back.
(3) Web revert: today's Skills page. Left behind: `skill_loaded` rows and events on runs.

## 10. Open questions

1. A4b-a A keeps caps at 300/4000; is Panda's 500/6000 wanted (needs a schema widen, which older
   images refuse — item 13)?
2. Should auto-attach be visible to the user (a "Using skill X" step in the activity list)?
   Recommended yes, from the `skill_auto_attached` event; UI copy to approve.
3. Should built-in DATUMM skills (e.g. NBC citation style) ship as seed data? Deferred.
4. Hosted check of `load_skill` with a real model; schedule with the next live release.
5. Known limit, kept: an older image that resumes a run stopped on a `load_skill` decision treats
   it as an unknown tool (risk `write`), so it shows an approval card instead of loading the skill.

## 11. Result (fill at checkpoint)

| Item | Outcome |
| --- | --- |
| Commit | |
| Gates run (command, Node version, counts, date) | |
| Browser evidence (tool, URL, scenario, result) | |
| Not run or not verified | |
| Limits found | |
| Next step | |

## Result (17 Nov)

Built on `main` (Sonnet implementers per repo, contract checked by the orchestrator, independent Opus review, Opus fixes). Backend commit in `datumm-orchestrator`; web this commit.

| Item | Outcome |
| --- | --- |
| Contract | Preview `{prompt, mode, skills?}` → `{listed, attached}`, the six skill fields and the `skills[id]` / `skills[id].field` history paths match the backend (checked in source before review) |
| Review | 1 HIGH handled: rolling back to `1e67551` after saving the new `skills` tool switch would break config reads there (only newer images drop unknown ids on load) — documented rollback step (reset the Skills tool to its default first) and dropped ids are logged. 2 MEDIUM fixed: `load_skill` no longer offered when a focus filter narrowed the tools; the skills block is now the last system text and its header says skills never override any rule. 8 LOW fixed or documented (grant look-past skill rows, older-image `load_skill` limit, no new font stack, Apply without edits writes nothing, stale tester answers, focus after Remove, export URL revoke) |
| Gates (orchestrator) | Backend 673 passed + 26 subtests, `lat check` passed. Web typecheck clean, `npm test` 877 / 877, `lat check` passed, `npm run build` exit 0; no colour, font or token line |
| Browser (built-in, signed-in localhost on the A4b backend) | Admin Skills shows the new registry; New skill editor shows counters and inline errors, accepts a SKILL.md (`nbc-fire-egress`), Add then Save gives revision 1, the detail panel shows the SKILL.md preview and "Revision 1 added" with Restore; Test a prompt ("maximum travel distance to a fire exit …", Ask) returns "Would list: nbc-fire-egress", "Would attach: nbc-fire-egress". Orchestrator fixes during the check: the list row was squeezed beside the detail panel (layout now intrinsic: two columns only when both fit, row wraps), and the "in your draft" notice now clears after a save |
| Not run | A real model run with `load_skill`, 390 px, light mode, screen reader, file import/export downloads |

