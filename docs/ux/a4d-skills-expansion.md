# Phase packet — A4d: skills expansion (starter pack, tool hints, usage in traces)

| Field | Value |
| --- | --- |
| Status | approved 19 Nov 2026. User picked: architect starter pack, skill usage in traces, per-skill tool hints. |
| Plans | [A4b skills registry](a4b-skills-registry.md) (live 17 Nov); master planner "MCP / custom tools and skills" track |
| Repos | `datumm-orchestrator/apps/domain-api` and `datumm-web` |
| Workers | Two Sonnet subagents (effort high), in parallel against this contract. The main agent reviews, runs gates and releases. MCP (A4c) is decided separately after the research. |

## 1. Today (A4b, checked 19 Nov)

- **Storage:** skills live in `app_config.skills` (at most 30): `{id, name, description ≤300, instructions ≤4000, modes, enabled}` (`app_config.py:32-37`).
- **Agent side:** the agent lists at most 8 and loads at most 3 per run through `load_skill` (`skill_registry.py`, `agent_workflow.py:1202,1577,1967,2809`). A load writes a `skill_loaded` observation and event with the id and content hash.
- **No built-in skills.** No trigger or tool fields exist.
- **Admin web:** registry with SKILL.md import and export, an editor, a tester, versions and per-mode switches.

## 2. Contract

### A — backend

1. **Starter pack (code-owned).**
   - `builtin_skills.py` holds 6 skills with ids `datumm-…`, in the same shape as admin skills, each with a "Use when…" trigger:
     - `datumm-brief-writing`: turn a rough request into a clear design brief with assumptions;
     - `datumm-room-sizing`: room sizes and the NBC 2016 rows we hold, as advice only, never claiming compliance and pointing to the Checks;
     - `datumm-markup-reading`: how to read redlines and what to ask when a mark is unclear;
     - `datumm-revit-hygiene`: room naming and numbering, levels, unplaced rooms, matching the V3a checks;
     - `datumm-client-summary`: a plain client-ready summary of a version, its changes, checks and assumptions;
     - `datumm-revision-workflow`: modify, verify, review once, revision package.
   - Every instruction body must hold to these rules:
     - no compliance claims;
     - never approve or write in Revit;
     - say "advice" for unverified NBC values;
     - at most 4000 characters each.
   - **Off by default.** `AppConfig` gains `builtinSkills: [{id, modes}]`. Only ids from the pack are accepted, and an empty list means none is enabled.
   - The registry merges the enabled built-ins with the admin skills under the same caps (list 8, load 3). Admin ids may not start with `datumm-` (validator).
   - `GET /v1/admin/config` returns `builtinSkills` (the stored modes) plus a read-only `builtinSkillCatalog` (id, name, description, instructions, toolHints). Saving goes through the existing config PUT, with history.
2. **Tool hints.**
   - Skills gain an optional `toolHints: [toolName]`, at most 6. Each must be a model-facing tool name in `tool_catalog` (validated on save); unknown names are refused with 422.
   - When a skill is loaded, its block adds "Tools that help: a, b". It lists only hints that are actually offered in this run. Hints never add, enable or widen a tool.
   - Built-ins carry hints too.
3. **Usage in traces.**
   - `run_steps`: a `skill` node, "Skill: <name>", for each `skill_loaded` event (time, id, short hash).
   - Admin traces: per run, `skills: [{id, name, hash}]`; in stats, `skillUse: [{id, name, runs}]` across the scanned rows.
   - The capability `skillsOnDemand` stays. Add `builtinSkills: true`.
4. **Tests:**
   - the built-ins are off by default and today's prompt is unchanged;
   - enabling one lists and loads it;
   - the caps still hold with built-ins;
   - the `datumm-` prefix is refused for admin skills;
   - an unknown built-in id is refused;
   - unknown and non-model tool hints are refused;
   - a hint that is not offered is not shown;
   - a hint never adds a tool;
   - the run-steps skill node;
   - trace skills and `skillUse`;
   - each built-in body is within limits and contains no "complies" or "compliant" claim.

### B — web (admin)

1. **Skills page:** a "DATUMM starter skills" group above the admin skills. Each skill has a name and description, a "View" button (read-only SKILL.md preview), and per-mode switches. Saving uses the existing Save bar. They are labelled "Built in, off until you turn it on".
2. **Editor:** a "Tools that help" multi-select of the model-facing tool names from `toolCatalog`, at most 6, round-tripped through SKILL.md frontmatter `tools:`. The tester shows the hints for listed skills.
3. **Run steps** (Details → Activity): render the `skill` node. **Admin traces:** skills chips per run and a "Skill use" table (skill, runs).
4. **Pure logic and tests** for parsing, frontmatter, and the usage table. Dev fixtures as for the existing admin previews.

## 3. Out of scope

- MCP (A4c): decided after the research.
- Skill marketplaces and sharing.
- Per-user skills.

## 4. Gates

- **Backend:** pytest, `lat check`, all 9 image checks.
- **Web:** typecheck, test, build, `lat check`.
- **Live:**
  - admin enables one starter skill in Ask;
  - a new test chat that matches its trigger shows the skill node in Run steps, and the trace shows it;
  - turn the skill off again after the test.

## 5. Result

To fill in at checkpoint.
