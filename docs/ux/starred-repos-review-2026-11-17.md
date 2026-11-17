# Starred repos review: what to adapt (17 November 2026)

An Opus agent read all 145 repos in the user's GitHub star lists `datumm` (56) and `agentic` (89). It used
`gh api` and the READMEs and opened key files in source; it cloned and ran nothing. ✔ means checked in source,
(README) means taken from the README only. The orchestrator re-checked the licences of archlang, deer-flow,
massing and mutinybim, and that archlang's `schemas/intent.schema.json` exists. Before copying any code, read the
repo's LICENSE file and keep attribution.

## Shortlist

| # | Repo (licence) | Phases | What to adapt | Copy or idea |
| --- | --- | --- | --- | --- |
| 1 | ChanMeng666/archlang (MIT) | V1, R1′, M1, V2 | Finding catalog: stable code, summary, why, fix, example, with docs generated from it ✔. Brief "intent" schema: blocking checks (room count, area bands, windows, dimensions) vs advisory ones (adjacency, reachability) ✔. `impact --lock` proves the rooms it should not touch did not move ✔. A fix is applied automatically only when proven; it never weakens a constraint to pass ✔ | Copy the shapes and rule texts with attribution; rewrite the checks for our plan model; NBC values replace ADA/UK |
| 2 | pascalorg/editor (MIT) | V1, AG1, M1, EV1 | Check registry (`registerSceneCheck`) ✔. `achievedChanges(before, after)`: never claim a change the model does not hold ✔. Checkpoints with `changesSince` for before/after ✔. `lostPaths`: catches edit fields the schema silently dropped ✔ | Idea, plus small ports of pure functions |
| 3 | permitzip/mutinybim (Apache-2.0) | V2, Review, EV1 | Finding dispositions ✔: accepted / waived / deferred / override / retracted, each with a reason and tied to the rule version | Copy the type shape |
| 4 | ibuilder/massing (MIT) | R1′ | Travel distance along the walking route: raster plus multi-source Dijkstra from the exits, reporting the grid cell size ✔; occupant load ✔ | Port to the orchestrator; IBC rules mapped to NBC Part 4; check whether numpy is already a dependency |
| 5 | Sam-AEC/aec-model-bridge (GPL-3.0) | V3, M2, Review | (README) Look-only / ask-first / auto modes. Approve stays disabled until the review is opened; an approved action runs once; a revert plan is built from the executed record; warnings are grouped | Ideas only (GPL) |
| 6 | bytedance/deer-flow (MIT, LangGraph) | AG1 | Loop detection ✔: hashes each tool call with its arguments; at a warning threshold it asks the model to wrap up, at a hard limit it strips tool calls. Token-budget and clarification middleware ✔ | Port the logic into our graph nodes (not the middleware class) |
| 7 | PRIDA-TAKON/debim (MIT) | R1′ | Building-code rules as a data table (rule, standard, threshold, enabled, notes) with pytest ✔; a `needs_review` flag (README) | Copy the shape |
| 8 | coleam00/Archon (MIT) | AG1, UX1 | (README) The workflow fixes the steps and gates, the agent judges inside each step; a decision becomes one "attention item" | Idea |
| 9 | humanlayer/12-factor-agents (no licence detected) | AG1 | (README) Own the control flow, compact errors into context, contact a person through a tool call (supports RV-b) | Idea |
| 10 | OpenAEC-Foundation/open-pdf-studio (LGPL-3.0) | RD1, EV1 | Drawing revision compare: alignment and change detection ✔ | Ideas |
| 11 | Kentucky-ai/opentakeoff (AGPL-3.0) | RD1, M1 | (README) Agent output stays a dashed proposal until a person accepts it; every shape records its scale and author | Ideas only |

Not useful for us, with the reason:

- Coding-agent harnesses and products: a second harness, ruled out by H5.
- Skills, memory and awesome lists: these configure coding agents.
- Mechanical and 3D-print CAD, geometry kernels and datasets.
- UI kits: CopilotKit and A2UI need approval; none of the kits is affectUI.

The agent's full grouped list is in the session record.

## Proposed changes to the revision-agent plan (awaiting the user, together with RV-a to RV-d)

1. **V1:** freeze the finding schema first, using archlang's catalog shape plus mutinybim's dispositions with the
   rule version. Turn the brief into an intent file and mark each rule as blocking or advisory.
2. **Split R1′.**
   - R1′a: an NBC rule table with clause, threshold, version and enabled flag (debim shape). Size S–M.
   - R1′b: route-based travel distance, ported from massing. Size M.
   - Every finding carries the rule version, so a waived finding returns when the rule changes.
3. **M1:** add an "unintended change" rule. A targeted edit proves that untouched rooms did not change
   (archlang `impact --lock`). It reports only changes it can read back (pascal `achievedChanges`).
4. **AG1:**
   - Port deer-flow's loop detection.
   - Stop when the set of failing codes stops shrinking.
   - Add a hard rule: the agent never edits brief targets or thresholds to pass a check. Only a person's
     disposition waives a finding.
5. **Review and EV1:**
   - Show dispositions with their reasons beside the checks, and include them in the revision package.
   - Keep Approve disabled until the review has been opened.
   - Plan a revert proposal built from the executed receipt.
