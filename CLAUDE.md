@AGENTS.md

# Multi-agent orchestration (Claude Code)

`AGENTS.md` holds the project rules. This file only adds how to split work across agents.

## When to use subagents

Use them for independent work that returns a conclusion: wide read-only searches, an independent review, a test run. Do the work yourself when it is a handful of tool calls or you already know the target. One writer per file at a time; dependent steps run in sequence.

## Roles

| Role | Does | Must not |
| --- | --- | --- |
| Explorer | Read-only search; returns paths, `path:line` facts and uncertainty | Edit, run builds, guess |
| Implementer | Makes one approved phase's change in named files | Touch files outside its list, add dependencies, commit |
| Reviewer | Reads the diff cold, without the implementer's conclusion | Fix what it finds; it reports |
| Tester | Runs the gates and browser scenarios; reports raw results | Change source to make a gate pass |

The implementer and the reviewer are never the same agent.

## Brief template

Every subagent starts with no context. Give it:

1. Goal and why, in two sentences.
2. Files to read first (`AGENTS.md`, the handoff, the phase packet) and the files it may edit.
3. What is already ruled out or decided.
4. What done looks like: tests, acceptance criteria, evidence to return.
5. Limits: no push, merge, deploy, new dependency or file deletion.

## Orchestrator duties

- Check every report against the actual diff and test output before relaying it. A subagent's summary is a claim, not evidence.
- Run the gates yourself at the end of a phase; do not rely on a subagent's pass.
- Keep the handoff current after each checkpoint so a fresh agent needs only the handoff and the packet.
- Surface open decisions to the user with a recommendation; do not resolve them silently.
