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

## Added 17 Nov: supertask/ai-architecture-lab, `experiments/2026-11_archicad-drawing-set`

Read by the orchestrator through `gh api`: the README, `rules/README.en.md` and `skills/inspection.md`. The repo
has no licence file, so ideas only. An AI drives Archicad (the Tapir add-on over its JSON API) to model a 2-storey
house and draw 8 sheets, with a review-and-fix loop. Ideas that fit our plan:

- **Drafting rules as plain-language files, one per sheet type**, given to the agent alone for that sheet. After
  each review, every mistake is appended as one line, "what it did → what is correct", so the next run improves.
  This maps to firm and client standards in V1/R1′, which can grow from accepted findings.
- **Check numbers before looking at images.** Levels are checked against the model across all sheets, dimension
  segments must sum to the overall dimension, and the grid must match one `grid.json` on every sheet. The maximum
  element height must equal the drawn maximum height. Overlaps are found by intersecting bounding boxes.
  Vision is never trusted for numbers (it misreads 6,950 as 6,900) and only for coarse questions. This supports
  deterministic V1/V3 checks, with V4 critique advisory only.
- **Sort each finding:** fix in the model, fix in the 2D annotation, or a preference that is not fixed (with the
  reason recorded). Every fix order includes "re-read 1 m around what you changed and add no new overlap" and
  "report model-side causes instead of patching them in 2D".
- **Stop rule:** each round reports fixed / not fixed / partly fixed for the previous findings and gives a
  verdict. The loop stops after 2–3 rounds once only minor items remain. This matches AG1's ~3-round budget.
- **Snapshot before a fix** (`walls_before_fixA.json`; the script refuses to run if the snapshot already
  exists). Scripts that are not idempotent are named as such. This supports before-values and revert in M2/EV1.
- **A fresh agent context per sheet**, so no value carries over between steps.

Drawing sheets (sections, elevations, annotation) is a later step for us than plan and model revisions. Keep it
for EV1 reissue.

## Added 17 Nov: pengxiaoan/autocad-dwg-redraw-skill (image → editable DWG)

Read by the orchestrator: the Chinese tutorial `docs/图片自动绘制DWG使用教程.md`. 471 stars; no licence detected,
so ideas only. A Codex skill turns photos, scans, screenshots or sketches of drawings into editable DWG/DXF
through AutoCAD COM (pywin32, OpenCV, ezdxf, PyMuPDF), then checks and compares the result. Ideas for RD1
(redline intake) and for M1:

- **Named redraw modes that limit the claims made:**
  - `strict-dimensioned`: needs units and reliable dimension anchors.
  - `general`: the default; uncertain items are recorded.
  - `hybrid`: dimensioned areas are checked; the rest is marked as inferred.
  - `visual-trace`: unitless; no claim of real dimensions.
  - `geometry-only`: drops text and dimensions.
- **Honesty rules:**
  - Never assume millimetres when the image has no unit or known length.
  - Stated dimensions and user data always override pixel ratios.
  - Stop and list the blockers instead of claiming accuracy.
  - "Looks similar" does not prove dimensions.
- **An evidence-traceable spec JSON** sits between the image and the drawing. Each element records where it came
  from.
- **The pipeline:** preflight of the input quality, spec validation, inspection of the output (units, layers,
  entities), then an image-vs-CAD comparison (side by side, overlay, difference image and error metrics). It
  loops on problems and finally reports what is known, what is inferred and what is unresolved.

For us: RD1 should turn a redline image into a scoped task spec with per-item evidence and a mode that limits the
claims. The final report's "known / inferred / unresolved" maps to our findings and recorded assumptions. DWG
output is out of scope for now.

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
