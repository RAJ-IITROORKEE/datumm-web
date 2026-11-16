# Phase packet — Q1: Rules pre-router and latency measurement

| Field | Value |
| --- | --- |
| Status | **done 17 Nov 2026** (local; not pushed or deployed; flag off by default) |
| Depends on | A1 (done 16 Nov): text-free traces built from per-call telemetry and run events |
| Approved by / date | User, 17 Nov ("Approve Q1, recommended"): every decision takes its recommended option (A). The packet gives the reply behavior but not the exact text; the implementer drafts it and the user reviews the copy at the checkpoint |
| Base commits | Web `codex/ui-ux-foundation-2026-11-12` (end of A2); backend `70395b3` on `codex/web-ui-harness-20261116` |

All `path:line` facts were **observed** in source on 16 Nov 2026 (backend `70395b3`, web working tree). Statements marked *inferred* were not run or measured. No test, browser or hosted check was run for this packet. Backend paths are under `datumm-orchestrator/apps/domain-api/`.

## 1. Goal and non-goals

An admin can see, per turn, where time and money went: admission, start-up, model calls, native tools, the rest, and how big each model packet and its tool schemas were. Then one narrow, deterministic shortcut: a first-turn greeting, a "thanks" or a "what can you do" gets a fixed reply without any model call, and every other message takes today's full path. The shortcut is off by default and measured before and after on a fixed question set.

Non-goals: a model router, any model call used for routing, a shadow-mode experiment (no "would have routed" recording while the flag is off), new dependencies, a second timing store, fixing the costs Q1 finds (section 10 lists them for later phases), streaming (N5), changes to v2 commands, checkpoint shape, `PublicTask`, native authority or approval, deployment or hosted checks (G1).

## 2. Current state (verified)

Status key: **T** implemented and tested; **U** implemented, under-tested; **C** controlled or local only; **P** planned or missing.

| Item | State | Evidence |
| --- | --- | --- |
| Graph entry | T. `START → discover` unconditionally; `discover` routes to `interpret_brief`, `prepare_draft`, `require_model_connection` or `decide`; `decide ⇄ dispatch` loop; `require_model_connection`, `explain_plan_scope` end. No intent node exists | `agent_workflow.py:3876-3904`, router `:2409-2418` |
| "Intent capture" | T. Not a node: in Ask the first `decide` pass offers only `capture_intent` at low effort (`role: intent`); in Plan, `create_execution` sets `brief_context`, which turns intent off and runs the brief interpreter (its own paid call, one repair) | `agent_workflow.py:324,330-332,1188-1193,1500-1503,1820`; `main.py:949-956`; `brief_interpreter.py:526-575` |
| Paid calls for "hi" | *Inferred* from source: at least two in both modes (Ask: intent + planner; Plan: brief interpreter + planner), each with one bounded retry (`agent_retry`). The web default mode is **Plan** | `agent_workflow.py:1836-1898`; `use-workspace-state.ts:133`; `adapter.mjs:52` |
| Short or small-talk path | **P** in the graph. Two deterministic precedents: a bare acknowledgement after an unsupported-scope answer gets a canned `reply()` with no run (so no trace, no completion proof); an empty-inventory Ask finishes with a deterministic answer. `build_chat.acknowledgement` already treats `ok/yes/thanks` as non-requests, and `ok/yes/proceed` are approval vocabulary in Build | `task_controller.py:572-574,772-778`; `agent_workflow.py:1462-1467`; `build_chat.py:5-9,12-45` |
| Work before the first model call | *Inferred* from source: the POST runs `dispatch` inline (projection, admission, parent reads, run insert, budget checkpoint; in Plan two reads of up to 64 segments), then a background claim; `decide` performs roughly 20 sequential awaits, mostly Mongo round trips (`_active` full-run reads, checkpoints, `context_packet` event, five reservations), before the provider request | `task_api.py:77-79`; `main.py:783-976`; `task_execution.py:127-145`; `agent_workflow.py:1444-1834` |
| Metadata fetch | U. The full OpenRouter `/models` catalog is fetched at most every 300 s per process and **deep-copied on every price or metadata lookup** | `pricing.py:18-39` |
| Per-call timing and tokens | U (A1 made it readable). `durationMs`, actual tokens, USD, finish reason per call; `createdAt` at reservation | `budget.py:163-201,325,345,468-477`; `traces.py:210-221` |
| Per-tool and per-step timing | T (N3). `tool_returned/stopped` and `agent_stage_complete` carry `durationMs` (dispatch only; `decide` has no completion event) | `relay.py:44-51`; `agent_workflow.py:2307-2329` |
| Packet size | U. `context_packet` event stores `packetBytes` and `estimatedInputTokens` per decision in `run_events` (not public). **Tool-schema bytes are computed only when a fit fails** | `agent_workflow.py:1811`; `agent_context.py:46,58-63`; used at `agent_workflow.py:1738,1781` |
| Trace duration | T. `durationMs` = first run event to terminal event; admission and queue time are outside it. `modelMs` = sum of call durations | `traces.py:260-264,286` |
| Timestamps usable without new writes | Command `acceptedAt`, `finishedAt` (task), run `created_at`, every event `at`, call `createdAt` | `task_controller.py:447,491`; `main.py:924`; `storage.py:198` |
| Delivery to the browser | T. SSE re-runs a full projection every 300 ms; the answer text reaches the client only with the terminal snapshot (`TEXT_MESSAGE_*` from `terminalEvents`) | `task_api.py:245-260`; `adapter.mjs:93,176-214`; `agui-chat-transport.ts:88-104` |
| Attachments | Not representable in v2: the adapter rejects any `attachmentIds`, `Submit` has no attachment field | `adapter.mjs:16`; `task_contracts.py:158-166` |
| Resume, approval, answers | Never pass `START`: answers go through `reply_to_agent`, approvals through `resume`, continue through `continue_run`, all on the saved checkpoint | `task_controller.py:614-640`; `main.py:1051,1152-1161`; `task_execution.py:141-142` |
| Flags | Env settings `*_enabled: bool = False`; capability document is a constant | `settings.py:18-21`; `main.py:291-293` |

## 3. Decisions needed (recommendation first)

1. **Where per-phase timing comes from.** **(A)** Compute phases on read in `traces.py` from existing timestamps; add only two small additive writes: `toolSchemaBytes` on the existing `context_packet` event and `agent_entry_route {lane, rule|floor}` in run data. (B) Persist a phase summary on the run at its terminal event. (C) New per-phase events (count against the 200/2,000 caps; rejected).
2. **Which phases.** **(A)** `admitMs` (command accepted → run created), `startMs` (run created → first run event), `firstCallMs` (run created → first call reserved), `answerMs` (run created → `answer` event, which is the first useful output until N5), `modelMs` (exists), `toolMs`, `stepMs`, `unattributedMs` (duration minus model and tool time, floor 0), `maxPacketBytes`, `maxToolSchemaBytes`. Sums can exceed wall time when specialists overlap; the page says so. (B) A also with a `decide` stage-complete event for planner overhead.
3. **Short-path categories.** **(A)** Three, exact whole-message match after normalisation against a closed phrase list: `greeting` (hi, hello, hey, good morning…), `thanks` (thanks, thank you, thank you so much…), `capabilities` (what can you do, who are you, how can you help…). Bare `ok/okay/yes/sure/cool` never qualify: in a follow-up they can answer a question asked in prose, and they are approval vocabulary in Build. (B) Also farewells (bye, see you).
4. **When a category may apply.** **(A)** `greeting` and `capabilities` only on a task's first turn; `thanks` also on a follow-up whose previous execution completed. (B) First turn only for all three.
5. **Hard floors** (any one forces the full path; each is an enum recorded on the run). **(A)** all of: flag off; mode `build`; parent execution not `completed` (covers pending questions, approvals, pauses, failures); previous turn was a short path; device selected or model context not `none`; selected room in `clientContext`; draft, variable selection, recipe or draft fingerprint; continuation or intent-pause recovery; more than 60 characters or 8 words; any digit, backtick, slash command, URL or leading quote; any domain term (Revit, plan, room, BHK, wall, floor, door, site, level, model, design, build, area, layout, code, regulation, and the planner's room vocabulary); any non-ASCII letter; `build_chat.intent()` not `None`; no exact phrase match. Resume and approval floors are structural (section 2) and get tests, not code.
6. **Language.** **(A)** English phrases only; anything else takes the full path. (B) Add romanized Hindi greetings and thanks (namaste, shukriya, dhanyavaad) with the English reply.
7. **Model use on the short path.** **(A)** None: a fixed reply per category, copy approved by you. (B) A cheap model call with a short prompt (Panda's fast lane does this, `router.ts:1-2`): needs budget reservation, telemetry and adds provider latency back.
8. **Visibility and override.** **(A)** The process list shows one public event `quick_reply` ("Answered directly; no model or tools were used."); the reply ends by inviting the real question; the next message always takes the full path (floor "previous turn was short"). (B) An "Answer with the full agent" action: needs a new command or UI action; not recommended.
9. **Modes.** **(A)** Ask and Plan (Plan is the web default, so Ask-only would rarely fire). For a short Plan turn, `create_execution` skips building `brief_context`. (B) Ask only.
10. **Flag and kill switch.** **(A)** Env setting `entry_rules_enabled: bool = False`; the kill switch is setting it false and restarting; read at run creation, so in-flight runs are unaffected. (B) An admin-config field with A2 history and no restart (more scope: config schema, admin page).
11. **Capability reporting.** **(A)** None: the shortcut is server behaviour and the new trace fields are additive (the web shows them only when present). (B) A dynamic `entryRules` capability flag.
12. **Measurement method.** **(A)** A checked-in fixed set of 40 prompts (12 expected short, 28 must-stay-full), run in-process twice (flag off, flag on) with a scripted provider and mongomock; record per prompt: lane, paid calls, packet and tool-schema bytes, Mongo operation count (counting wrapper), in-process wall time excluding the provider. Real latency, tokens and USD stay **unqualified until G1**, where A1 traces over a fixed window with the flag off then on give hosted p50/p95. (B) Also a local live-provider run: needs a provider key in this session; not recommended.

## 4. Design (recommended options)

**Rules as data.** New `entry_rules.py`: `PHRASES` (category → frozen set of normalised phrases), `DOMAIN_TERMS`, `REPLIES` (category → fixed text), `Floor` and `Rule` enums, and one pure function `classify(prompt, *, mode, first_turn, parent_status, parent_lane, device_id, context_requirement, client_context, draft, continuation, flag) -> {'lane': 'short'|'full', 'rule': str|None, 'floor': str|None}`. Normalisation: NFKC, lowercase, emoji and trailing punctuation removed, repeated letters squeezed (Panda's `squeeze`), whitespace collapsed. Floors are checked first; only then the exact match. No regex "contains" match can admit a message, so a domain question cannot reach the short path by construction; the floors are a second layer.

**Classification point.** `main.create_execution` already loads the parent and knows mode, device, client context, draft and continuation (`main.py:819-899`). It calls `classify` once, checkpoints `agent_entry_route`, and passes `entry_lane` to `initial_agent_state` (new optional `AgentState` key). Old checkpoints lack the key and route as today.

**Graph change** (`build_agent_graph`):

```python
graph.add_node('answer_small_talk', remembered(answer_small_talk))
graph.add_conditional_edges(START, route_entry)  # replaces add_edge(START, 'discover')
graph.add_edge('answer_small_talk', END)
# route_entry(state): 'answer_small_talk' if state.get('entry_lane') == 'short' else 'discover'
```

`answer_small_talk` calls `_active`, writes `answer` and `agent_result {status: completed, answer, observations: [{kind: response_ready}], findings: []}` without setting a status (the driver owns the terminal transition, as `explain_plan_scope` notes), then appends `answer` and `quick_reply` events. `drive_agent` marks it completed and runs report history as for any answer (`main.py:181-187`). The existing completion proof then applies unchanged (`task_controller.py:283-315`), so the answer is saved, rateable and reload-safe.

**Measurement points.** `context_packet` gains `toolSchemaBytes` (one `len(json.dumps(tools))`, reusing `packet_section_bytes`'s encoder). `traces.py`: `TASK_PROJECTION` adds `commands.acceptedAt`; `EVENT_PROJECTION` adds `packetBytes`, `toolSchemaBytes`; lifecycle stages add `answer`, `context_packet`, `quick_reply` (their `detail` is never projected); `RUN_PROJECTION` adds `data.agent_entry_route`. `Row` gains `phases {…}` (ints or null) and `route {lane, rule, floor}` (closed enums); `Signal` gains `quick_reply`, so the existing signal filter finds short-path turns. Privacy is A1's three layers: constant projections, closed enums, `extra='forbid'`; the matched phrase is never stored.

**Admin page.** `/admin/traces` row details gain a "Time" block (admission, start, first call, answer, model, tools, unattributed) and "Packet" (largest packet, largest tool schemas), plus the lane. The web parser drops unknown keys and shows nothing when the fields are absent.

**Must-stay-full regression set** (part of the 40): "hi, plan a 3BHK on 12 x 15 m", "hello revit", "hey what's in my model", "thanks, now add a door", "ok", "yes", "yes proceed", "approve version 2", "sure, go ahead", "what can you do with my Revit model", "what can you do for a 2BHK", "help me with walls", "/plan hi", "hi 👋 build it", "namaste 2bhk", "hola", "bonjour", "こんにちは", "hi" in Build mode, "hi" with a selected room, "hi" with a device and `read`, "hi" after a pending question, "thanks" after a failed turn, "hi" right after a short-path turn, "hello" as an amendment to a paused-limit task, a 70-character greeting, "thanks for the plan with 3 bedrooms", "who are you? also check my site area".

**Rollout and rollback.** Local only; flag default off. At G1: collect A1 traces with the flag off for the agreed window, enable, compare. Rollback: flag off (immediate for new runs) or revert.

**Reused:** `remembered`, `_active`, `checkpoint`, `event`, `completion_proof`, `build_chat.intent`, `infer_model_context_requirement`, A1 `traces.py` builders and models, web `admin-traces.mjs` and `traces-section.tsx`, Panda's normalisation idea (not its code). No new dependency.

## 5. Change list

**Backend** (`datumm-orchestrator`, branch `codex/web-ui-harness-20261116`, single owner: backend implementer):

| File | Change |
| --- | --- |
| `entry_rules.py` (new) | Phrases, domain terms, replies, enums, `classify` |
| `agent_workflow.py` | `AgentState.entry_lane`; `initial_agent_state(entry_lane=…)`; `answer_small_talk`, `route_entry`; `START` conditional edge; `toolSchemaBytes` on `context_packet` |
| `main.py` | `classify` in `create_execution`; checkpoint `agent_entry_route`; skip `brief_context` when short |
| `settings.py` | `entry_rules_enabled: bool = False` |
| `traces.py` | Projections, `phases`, `route`, `quick_reply` signal |
| `test_entry_rules.py` (new) | Table-driven classify: 12 short, 28 full, every floor, normalisation |
| `test_entry_lane.py` (new) | Graph path, completion proof, compatibility, measurement table |
| `test_traces.py` | Phase fields, canary, key set |
| `lat.md/` (agent graph and traces sections), `apps/domain-api/README.md` | Entry edge, rule module, trace fields; code map |

**Web** (`datumm-web`, single owner: web implementer):

| File | Change |
| --- | --- |
| `src/lib/admin-traces.mjs` + `.d.mts` | Parse `phases`, `route`; `quick_reply` in `TRACE_SIGNALS` |
| `src/components/admin/traces-section.tsx` | Time and Packet blocks in row details |
| `src/components/dev/admin-preview.tsx` | Fixture rows with and without phases |
| `tests/admin-traces.test.mjs` | Parsing, unknown keys dropped, absent fields |

## 6. Contract changes, dependencies and risks

Additive only: `agent_entry_route` in run data, `toolSchemaBytes` on a private event, new optional trace fields and one signal, one `AgentState` key, one graph node and the `START` edge. Public event keys gain nothing except the `quick_reply` stage (`storage.py:141-142` already allows any stage with its fixed detail). No change to commands, checkpoints' existing keys, `PublicTask`, AG-UI events or native approval. No dependencies.

| Risk | Containment |
| --- | --- |
| A domain question gets a canned reply | Exact-match allowlist, floors, 28-prompt regression set, first-turn-only greetings, next turn always full |
| A canned reply is wrong in context ("thanks" after a failure) | Parent must be `completed`; reply copy approved by you |
| Paused or old checkpoints change behaviour | Resume never passes `START`; missing key routes to `discover`; compatibility tests |
| Text leaks into traces | Rule and floor are enums; A1 canary extended to the new projections |
| Timing misread (overlapping calls, mixed time zones) | `unattributedMs` floored at 0; nulls when timestamps are missing or tz-mismatched (A1 rule) |
| Mock measurements mistaken for real latency | Recorded as controlled-local; hosted numbers only at G1 |

## 7. Tests and browser scenarios

**Backend** (`uv run --frozen pytest`, baseline 349 + 26 subtests), each written to fail on `70395b3` first:

1. **Routing table:** every one of the 40 prompts gives its expected lane, rule or floor; normalisation cases ("Hiii!!", "THANK YOU 🙏").
2. **Floors:** one case per floor enum turns an otherwise short prompt full.
3. **No domain question reaches the short path:** every regression prompt, and every `DOMAIN_TERMS` entry inserted into every phrase, classifies full.
4. **Graph:** flag on, "hi" in Ask and Plan: zero model calls reserved, `answer` then `completed` events, `completion` proof present, `quick_reply` event public; flag off: today's path.
5. **Compatibility:** a paused (`needs_input` and `awaiting_approval`) task resumes on its checkpoint without entering `answer_small_talk`; state without `entry_lane` routes to `discover`; a follow-up after a short turn is full.
6. **Traces:** phase fields present, ints or null, key set exact; canary in prompt, answer, event detail and note never appears; `quick_reply` filter.
7. **Measurement:** the 40-prompt run prints the before/after table (lane, calls, bytes, Mongo ops, in-process ms) and asserts short-path rows have 0 calls and full-path rows are unchanged between flag states.

**Web** (`npm test`, baseline 710): parser accepts and drops fields as above.

**Browser** (built-in browser, local dev server, controlled fixture `/dev/ux` "Admin fixture", 1280 px and 390 px, light and dark): (1) a trace row's details show the Time and Packet blocks; (2) a row without phases shows neither and no "0 ms"; (3) the `quick_reply` signal filter shows only that row; (4) 390 px: no page overflow. Hosted behaviour needs G1.

## 8. Acceptance criteria

- With the flag on, the 12 short prompts make no model call and produce a saved, proven answer; all 28 regression prompts take the full path unchanged.
- Before/after table recorded in section 11, labelled controlled-local; no latency or cost claim beyond it until G1.
- Trace rows carry the phase fields text-free; canary and key-set tests pass.
- Paused, resumed and old-checkpoint tasks behave as before.
- Flag off reproduces today's behaviour exactly.
- Gates green: backend suite and `lat check`; web `npm run typecheck`, `npm test`, `npm run build`, `lat check`; runtime smoke `--production`. Counts recorded.

## 9. Rollback

Set `entry_rules_enabled=false` (new runs) or revert both commits. Left behind: `agent_entry_route` on runs and `toolSchemaBytes` on events, both ignored by older code. No command, checkpoint or approval state is modified.

## 10. Open questions found during research

1. **The roadmap's graph edge saves model calls, not setup.** Run creation, admission, budget checkpoint and the claim still happen. The only existing no-run shortcut (`task_controller.py:572-574`) leaves no trace and no completion proof, so it is not reused.
2. **"Intent capture" is not a node:** it is the first `decide` pass in Ask and is replaced by the brief interpreter in Plan (`agent_workflow.py:330-332`; `main.py:949-956`). A greeting costs at least two paid calls in both modes (*inferred*).
3. **Most phases are already recorded;** only the lane and tool-schema size are missing. `decide` has no stage-complete event, so planner overhead is derived, not measured.
4. **Panda's "metadata, serial setup, resent schemas" finding has DATUMM analogues** that routing does not touch: catalog deep copy per lookup (`pricing.py:18-31`), about 20 sequential awaits per decision before the provider (*inferred*), schemas resent every call and never measured, SSE re-projection every 300 ms and answer text only at the terminal snapshot. Q1 measures them; fixing them belongs to N5 or a later packet.
5. **Attachments and approval floors** are structural today (`adapter.mjs:16`; separate command types). A future attachment phase must add an attachment floor.
6. **Trace `durationMs` excludes admission and queue time** (`traces.py:260-264`); `admitMs` and `startMs` close that gap.
7. **`explain_plan_scope` is registered as a node but only called as a function** (`agent_workflow.py:3241,3881`), and `require_model_connection` sets `completed` itself while `explain_plan_scope`'s comment says the driver owns that transition. The new node follows the driver-owned pattern.
8. **Plan turns feed every earlier prompt into the brief sources** (`brief_interpreter.py:83-100`), so a short-pathed "hi" remains a brief source on the next Plan turn, exactly as today.

## 11. Result

| Item | Outcome |
| --- | --- |
| Commit | Backend and web Q1 commits on their branches (see `git log`); not pushed |
| Backend change | `entry_rules.py`: closed phrase allowlist (greeting, thanks, capabilities), domain terms, read-only tables, pure `classify` with every packet floor plus `not_first_turn`; the "device selected" floor now reads the device the user chose, not the one inferred after model-context resolution; `agent_workflow.py`: `route_entry` on a `START` conditional edge (LangGraph 1.2.12 accepts it) and an `answer_small_talk` node that makes no model call, reserves no budget, and leaves the terminal transition to the driver (so the normal completion proof, saved answer and rating apply); `toolSchemaBytes` on the private `context_packet` event; `main.py`: one `classify` call per execution, `agent_entry_route` in the existing checkpoint, no `brief_context` and no previous-design read on a short turn; `entry_rules_enabled` (default off); `traces.py`: text-free `phases` (admit, start, first call, first answer, model, tools, steps, unattributed, largest packet, largest tool schemas) and `route`, a `quick_reply` signal; tests `test_entry_rules.py`, `test_entry_lane.py` |
| Web change | Trace parser accepts `phases` (integers up to 2^31-1 ms or bytes, else null) and `route` (closed tokens), `quick_reply` label "Answered directly"; the traces page row details gain a Time block (with an overlap note), a Packet block and an "Answered directly" line, each showing only values that exist (a real 0 shows, a missing value never does); multi-day durations read "2 d 3 h"; dev fixture rows with and without phases and a short-path row |
| Gates run (17 Nov, Node 24.18.0, Python 3.12.10, orchestrator after all changes) | Backend `uv run --frozen pytest`: 499 passed + 26 subtests (baseline 408 + 26); `lat check` passed. Web `npm run typecheck`, `npm test` 749 / 749 (baseline 741), `lat check` passed; `npm run build` exit 0 (see limits); runtime smoke `--production` 18 / 18 on a fresh `next start` after that build |
| Before/after table (controlled-local: in-process, scripted provider, mongomock, Plan mode; not real latency, tokens or USD) | 40-prompt set run with the flag off then on. The 12 short prompts (greetings, thanks, "what can you do", "who are you") went from 2 paid model calls each to **0**, Mongo collection operations from about 199 to 64 per turn, and in-process time from about 35-62 ms to about 7-13 ms (24 calls to 0 in total; 2,389 to 768 operations; 578 ms to 103 ms in total, noisy). The 26 full-path rows that run end to end are **identical** between flag states in calls, packet bytes, tool-schema bytes (about 15.8 KB packets and 11.0 KB schemas for a Plan turn), operations, events, answers and errors. Two rows (a paused-limit "hello" and a Build "hi") are refused before classification under both flags; their floors are covered by unit tests |
| Failing-first evidence | New test files failed at import on `fa25300`; 5 of 31 trace tests failed; every review fix had a test that failed first |
| Browser evidence | Built-in browser, local dev server, `/dev/ux` Admin fixture, Traces page. 1 (1280 px): rows with phases showed Time (Admission 35 ms, Start 120 ms, First call 480 ms, First answer 4.1 s, Model 3.1 s, Tools 700 ms, Unattributed 400 ms), the overlap note and Packet (48,213 bytes; 9,120 bytes). 2: a row without phases showed neither block, and a row with null values omitted exactly those lines. 3: the "Answered directly" filter returned only the short-path row (found on page 2) with real zeros for Model and Tools, no Packet block and no "First call" line. 4 (390 px dark): no page overflow, the table scrolls in its own region |
| Independent review | 9 findings, none a blocker; a fuzz of 28,119 phrase mutations found no case where a domain or approval message reached the short path. Fixed: the device floor checked the wrong value, `firstCallMs` null when one call lacked a timestamp, two wasted reads on short turns, mutable tables with a KeyError path, two measurement rows that measured nothing (now labelled), phase values past 24 hours hidden on the web, a fixture inconsistent with the backend, long lines |
| Pre-existing bug found and fixed (outside Q1's scope) | A run ending in `require_model_connection` ("Connect Revit...", read-context prompt, no connected session) set `completed` itself, so the driver's final checkpoint raised `LEASE_LOST`: the answer showed but there was no `completed` event, report history never finished, and a background exception was logged. Reproduced on `fa25300`, reachable in production (Ask or Plan, no connected device). Fixed by letting the driver own the transition; test added. A latent branch with the same pattern in `explain_plan_scope` is unreachable today and left alone |
| Reply copy (drafted by the implementer, for your review: one constant, `REPLIES` in `entry_rules.py`) | greeting: "Hi! I'm DATUMM, your assistant for Revit and building layouts. What would you like to work on?" / thanks: "You're welcome! Tell me what you'd like to do next." / capabilities: "I can help you generate and revise concept layouts, review them in 2D and 3D, and prepare reports and schedules. Changes to your Revit model happen only after you approve an exact proposal. What would you like to start with?" / process-list event: "Answered directly; no model or tools were used." |
| Not run or not verified | Real latency, tokens, USD and Mongo behavior (G1); a live provider; the fuzz scripts were not rerun after the fixes; screen-reader reading |
| Limits found | English phrases only; greetings and "what can you do" only on a task's first turn, "thanks" also after a completed turn; the next message always takes the full path. Mongo operation counts exclude the in-memory graph checkpointer. A device selected in the composer forces the full path even when the prompt needs no model context. The flag is read at run creation (set `entry_rules_enabled=false` and restart to switch off). `npm run build` intermittently stops after a successful compile with a Next.js advisory notice for the pinned version 16.4.3 (exit 1 in some runs, 0 in others); not investigated, and no dependency was changed |
| Next step | Local merge into `main` (no push) and a localhost test of the new backend routes, as requested; then the A3 packet |
