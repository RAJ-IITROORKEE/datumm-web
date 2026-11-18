# Phase packet — Wave 5a: agentic run (AG1 + H6) and run tracing (TR1)

| Field | Value |
| --- | --- |
| Status | approved 18 Nov 2026 (user: "Yes start" to "start with AG1 + H6 and TR1") |
| Plans | [revision plan](revision-agent-plan-2026-11-17.md) AG1 and RV-b; [starred repos](starred-repos-review-2026-11-17.md) (Hill Climb, deer-flow loop detection, archlang "never weaken a rule"); [desktop deep-dive](desktop-deep-dive-2026-11-17.md) §1 (spans) and §6 rank 5 (LangGraph evals) |
| Workers | Main agent (Opus 5.5) plans, reviews, gates, browser checks and release. Two Sonnet subagents (effort high): **A** agent loop (`agent_workflow.py`, `budget.py`, new modules), **B** tracing (new read-only modules and route, web Details, new eval tests). B never edits A's files. |

## 1. Evidence from Wave 4's live test

On a new run the agent asked "How many bathrooms should the plan include?" although the prompt said "use your
defaults". RV-b (ask only blocking questions) is not enforced. Every generated plan currently passes its blocking
checks; NBC findings are advisory because every rule is unverified.

## 2. Scope

### A — AG1 + H6 (`apps/domain-api`)

1. **Question gate (RV-b)**
   - The agent's question schema gains `blocking: bool` and a recommended option, which is required when
     `blocking` is false.
   - Blocking questions pause as today. Use them only when the run cannot continue safely: missing or conflicting
     site size or scale, contradictory requirements, or anything that touches Revit.
   - A non-blocking question is not shown. The run takes the recommended option and records an assumption,
     "Assumed: 1 bathroom (you can change this)", which is listed at review.
   - The server enforces this; the prompt also explains it.
   - Existing explicit clarification paths stay: conflicting or ambiguous alternative counts and flexible retry.
   - Setting `agentic_defaults_enabled`, default on.
2. **Check-and-fix loop (Hill Climb)**, after `create_design`, on the recommended candidate:
   - The score is `(blocking, advisory)`, lower is better.
   - Deterministic fixers map finding codes to candidate edits through the M1 engine (`variable_engine.edit` with
     the unintended-change lock).
   - Each attempt is kept only if the score improves and the lock passes; otherwise it is dropped. At most 3
     rounds; stop when nothing improves.
   - **Locked:** brief targets, rule thresholds and the rules table are never edited by the agent.
   - **Blocking findings** are always eligible. **Advisory findings** are fixed only when the setting
     `auto_fix_advisory` is on, **default off**. The user has not yet decided the main-door question, so advisory
     NBC notes are not auto-applied.
   - Every kept fix becomes the next plan version and an assumption ("Automatically widened the bedroom door to
     900 mm to meet a blocking rule"). The review shows before and after.
3. **H6 loop rules**
   - Loop detection (the deer-flow idea): hash each tool name with its arguments over a sliding window. A repeat
     at the warning threshold injects a "wrap up now" instruction; at the hard limit the run stops with a plain
     message.
   - An 85% budget gate: when the USD or call budget reaches 85%, the next model call is told to finish.
   - The existing limits and compaction stay.
4. **Tests**:
   - question gate: blocking pauses; a non-blocking question becomes an assumption; a missing recommendation is
     rejected;
   - the loop: improve-and-keep, no-improvement-and-stop, the lock refusing, the 3-round cap, advisory skipped
     while off;
   - loop detection: warn, then stop;
   - the 85% gate.

### B — TR1 (`apps/domain-api` read-only + `datumm-web`)

1. **Run steps computed on read**, like A1 traces.
   - `GET /v2/tasks/{id}/steps` (owner-scoped) returns a step tree per run from data the system already records:
     run and task events (stage and time), model calls (budget usage receipts: model, tokens, cost, duration),
     tool calls (relay events), questions and approvals.
   - Each node is `{kind: run|model|tool|question|approval|check|edit, label, startedAt, durationMs, status, children}`.
   - Plain labels only; no prompt or answer text.
2. **Web**: the Details drawer's Activity tab gains a "Run steps" tree (collapsible, keyboard navigable, with
   durations and costs), behind the capability `runSteps`.
3. **LangGraph agent evals**: `apps/domain-api/evals/` with a fake relay and a fake model, scripted cases taken
   from the desktop's Promptfoo set:
   - forbidden write refused;
   - invalid tool arguments;
   - recovery after a tool error;
   - cancellation;
   - a non-blocking question becomes an assumption, once A lands (B adds this case last, against A's contract);
   - an approval-required stop.

   It runs under pytest.

## 3. Gates and checks

- Backend: `pytest`, `lat check`, planner checks unaffected.
- Web: typecheck, `npm test`, build, `lat check`.
- Localhost against the live backend after release, then on the live site, in a **new test chat**:
  - a prompt that would have asked a non-blocking question now finishes with stated assumptions;
  - Details → Activity → Run steps shows the tree;
  - no console errors.

## 4. Rollback

Revert the commits. The settings `agentic_defaults_enabled` and `auto_fix_advisory` give a quick off switch
without a revert.

## 5. Result

(Filled in by the main agent.)
