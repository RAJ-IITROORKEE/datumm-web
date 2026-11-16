# Workspace acceptance: alternative-count finding

15 November 2026. Read-only diagnosis against deployed backend source `188ebc0bc0599ff84f3760aaef24711e522972ae`. No source, service, native model or historical record was changed.

## Observed record

Task `44c866fe-926a-5778-af82-f59ea95a48fa`, run `68135640-f9cf-5056-ada2-0e96ea06cdbd`, asked first for footprint and entrance and said: “I want exactly one single-storey two-bedroom home”. The user intended one concept. The saved answer receipt contains 12 m wide by 9 m deep and South; the saved design has three v1 alternatives at 12,000 × 9,000 mm with south entry. The task plan describes one home concept but has a single `create_design` step, and the saved readiness answer reports three alternatives. `artifacts/ux/workspace-acceptance/resumed-generation-evidence.json` summarizes the run; the downloaded original is `C:/Users/rajra/Downloads/datumm-68135640-f9cf-5056-ada2-0e96ea06cdbd.json`. The summary's `prompt` field is null, but the original export retains the exact prompt in `data.prompt`, task memory and the brief's original source.

The event sequence is clarification → accepted answers → `brief_ready` → `plan_task` → pause → Continue → `create_design`. The final saved interpreted brief retains all three source records: original request, answered dimensions and answered entry. Its fact list includes the room program and answered entry, but no `alternativeCount`. The exported record does not show the planner's private candidate inputs or the brief state at each instant, so it does not establish that pause or Continue discarded a count.

## Source trace and controlled replay

The server builds facts from each retained source in `apps/domain-api/brief_interpreter.py:329`; `literal_facts` at line 168 supplies the source-bound alternative count. Its patterns recognize counts attached to alternatives, plans, layouts, concepts or designs, including bounded whole-building modifiers. In the exact phrase above, `home` is a permitted modifier, but there is no following recognized output noun. The interpreter's model fact schema also does not contain `alternativeCount`; the source-bound literal path is authoritative for it.

A read-only local replay of the exact original text returned no `alternativeCount`, matching the saved brief. Replacing only “two-bedroom home” with “two-bedroom concept” returned the source-bound value `1`; adding “Produce exactly one alternative” also returned `1`. “I want one home with two bedrooms” and “Create two bedrooms in one home” returned no alternative count. This is a controlled parser replay, not a new live run or proof of the timing of the original model call.

At `apps/domain-api/agent_workflow.py:3110`, design admission obtains the requested count solely from the interpreted `alternativeCount` facts; absent a fact, `requested_count` remains unset. The resulting engine candidates are sliced to a requested count only when it is set, at line 3241. The program search may return up to three distinct candidates (`apps/planner/revit-mcp/src/program-search.ts:149`); this run returned three. The observed record and replay therefore support a missing count-admission path, rather than a demonstrated loss caused by clarification or pause.

## Interpretation and next repair

The requester's intended one-concept outcome is clear from the test context, but the literal words “one home” can also describe one dwelling while allowing several alternative designs for that dwelling. Do not treat every singular house, home, bedroom or bathroom as an alternative-count instruction. A bounded repair should retain the user's intended single-concept request when the whole source establishes that output count, and ask a targeted count question when dwelling quantity and alternative count cannot safely be distinguished. Keep explicit alternative counts, later amendments and versioned answers authoritative; retain negation, quoted examples, ranges and per-room/per-floor exclusions.

Before implementation, agree the ambiguous “one home” rule with the user or document the chosen clarification behavior. Add a regression using the exact original wording plus the two answered sources and pause/resume checkpoint, alongside explicit one/two/three alternatives, bedroom/bathroom counts, multiple design options for one dwelling, negated/quoted examples and later count amendments. Test the actual save/dispatch boundary and browser journey; do not rewrite this historical run. No model preference or task-plan title alone should override the source-bound count.
