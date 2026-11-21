# Phase 2D · Required work and chat progress

The Phase 2 checklist separates required work from supplementary research. The local chat update also addresses the two browser comments on the verified 3BHK thread.

## Behavior

- Omitted priority means required, including for existing plans. Web Plan can designate supplementary research as optional. Required steps cannot depend on it. Plans keep their existing step identities through revisions.
- When the goal and all required steps finish, unfinished optional work is recorded as skipped. Required work without evidence still leaves the result partial. The checklist shows the required count and keeps optional rows visible.
- The sidebar uses a small theme warning dot for chats that need attention. The status has a screen-reader label and a hover title.
- An expandable summary above the answer leads to the recorded checklist, execution steps, tool calls and workers. The current turn can open Activity for deeper inspection. Answers keep Markdown structure inline and tables show their row count. Completed concepts can open the room report directly. The existing report reader checks the saved revision and source.

## Reference and implementation

The chat hierarchy follows the public behavior of [Chat / Progress](https://www.affectui.com/screens/agent-chat-progress), [Agent / Thread](https://www.affectui.com/screens/agent-thread), [Tool Call Card](https://www.affectui.com/components/tool-call-card) and [Agent / Orchestration](https://www.affectui.com/screens/agent-orchestration). Its disclosures group existing events. Full tool details continue to use the pinned affectUI tool card in Activity.

The local Panda-agent activity and stream implementations informed the distinction between a compact progress disclosure, recorded tool calls and final structured output. The later Panda-agent tool group and rich Markdown renderer informed call grouping and placement of output actions. The architectural plan, room schedule and status are DATUMM records.

Backend changes are in agent_task_plan.py, agent_workflow.py and agent_memory.py. The web uses the existing conversation, TurnProcess, PlanDock, ChatRow and output components. The local AG-UI fixture replays a structured 3BHK answer, tool receipts and a skipped optional research row. No new dependency is required.

## Acceptance

Verify that required work still blocks completion, unavailable optional work is skipped without inventing evidence, and recorded optional research can complete. Check that older plans retain required defaults and exact native approval behavior. In the local chat, the reply stays inline, required counts and the optional disposition survive reload, and the activity and report actions open the existing scoped readers. Inspect the warning dot in both theme modes.

## Local result

The offline API and planner completed the 20 by 30 m 3BHK with optional research present, unavailable and disabled. The available lookup completed its row. The other cases saved the optional row as skipped. Each run completed the required steps and saved its inline answer and eight-row report. The report matched the saved plan fingerprint and content hash. A second owner received 404.

The backend and web test suites, typecheck, local production build, all 19 runtime smoke checks and both knowledge-link checks passed. Mounted component tests covered recorded status, artifact navigation and the warning dot. The local replay route returned 200. A visual browser pass is pending because the computer-use tool could not access the local preview.

Graphify freshness remains open. Its rebuild refused to replace the saved graph after finding missing semantic nodes.

## Rollback

Revert the corresponding web and backend commits together. Old plans already use the required default. Review new optional records before running an older backend against them because its task-step validator predates the optional field.

Phase 3 starts with project-scoped file intake and versioned citations. [Architectural agent MVP sequence](architectural-agent-mvp-2026-11-21.md#delivery-sequence-and-exit-checks)
