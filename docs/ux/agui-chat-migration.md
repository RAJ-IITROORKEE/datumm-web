# AG-UI chat migration — implementation packet

16 November 2026. Latest user approves Option B through A for the middle chat. [Roadmap addendum](../agui/AGUI_MIGRATION_PLAN.md#approved-chat-only-scope-and-phase-order) governs; right work area and floor-plan state migration are deferred. Earlier alternative-count repair remains paused and undeployed.

## Intended outcome

Agent-selected and agent-composed declarative responses inside chat, beyond fixed domain cards. Live safe operational summaries, actual tools/checklist, grouped versioned questions and concise answers. Diagrams are optional renderer choices; Mermaid is not the only future grammar. The agent receives compact supported-UI context/capabilities and uses validated reversible frontend actions. Arbitrary generated code and native approval from UI content are excluded.

## Current slice

Latest continuation: [Plan intent and hosted AG-UI questions](agui-chat-continuation.md) supersedes the initial question-command limitation below. Hosted question replies now use a validated AG-UI resume mapped to the existing answer authority, qualified with565 frontend tests/TypeScript/build/17 runtime checks and actual browser continuation/reload. General Plan intent repair is implemented/reviewed/tested locally in a separate backend branch but remains undeployed pending cloud qualification. The original Phase1 evidence below retains its historical scope.

Phase0 baseline passed 535 frontend tests and TypeScript before adapter edits; logs under `artifacts/ux/agui-chat-phase1/`. Dependencies added: exact `@ag-ui/core`1.0.4 and direct Zod4.6.7; install audit reported zero vulnerabilities. No CopilotKit/prebuilt chat or additional diagram renderer installed.

Phase1 producer/consumer is implemented and scoped-qualified: `/api/agui` translates existing owner-scoped admission/task stream into validated AG-UI events. `AguiChatTransport` consumes that network stream and bridges to existing in-memory useChat rendering/projection. Internal compatibility parts are not a second browser wire. Existing v2 commands/checkpoints remain the business authority; HTTP still underlies streaming. No silent resubmit on failure. `/api/chat` was deleted in C1 (16 Nov); `/api/agui` is the only send transport. Question replies still use the existing versioned task command path, not generic AG-UI resume.

Independent review required and verified terminal snapshots match the newly admitted command/current execution, not merely the same task; unmatched snapshots cannot turn a previous answer into new completion. New focused tests cover stream truncation, old snapshots, async receipt rejection, foreign identities, unexpected terminal outcomes, observer cleanup/cancellation, accepted-task delivery before error and late submissions. Old snapshots are re-observed with the same task/cursor without resubmitting. Missing correlation in a long-run 2,000-event tail or a synchronous command-only response fails closed with saved-task recovery; it is not a proven full replay implementation.

## Qualification evidence

- Final current frontend suite: **554/554**, no skipped tests; TypeScript passed; production build passed. Root reran the final suite after producer cleanup changes. Logs under `artifacts/ux/agui-chat-phase1/` and `artifacts/ux/agui-chat-2026-11-16/`.
- Production server3100 passed **16 runtime checks**, including AG-UI unauthenticated401, missing-origin403 and cross-origin403. Temporary server3100 stopped after testing; development3001 remains.
- Independent source reviewer found no remaining scoped blocker for controlled chat testing. This does not qualify native writes, full AG-UI resume, broad replay or dynamic UI composition.
- Actual Codex browser observed `/api/agui`200 `text/event-stream`, RUN_STARTED → real ACTIVITY_SNAPSHOT events → TEXT_MESSAGE_START/CONTENT/END → RUN_FINISHED success. General Ask task `05b82787-72d9-57b1-a101-f252b1c4fd40` answered a levels/grids question, then a distinct elevation follow-up; reload retained both answers. No native connection/write requested.
- Explicit clarification task `40a3cc14-5c28-5c8d-96c8-b395e82af12d`: requested beginner/advanced question; real interrupt and existing form appeared; Later/Show passed; Beginner answer continued via existing task command; final checklist2/2 and answer survived reload. Process disclosure remained keyboard-addressable. 390×844 browser layout had scrollWidth390 and one composer; normal viewport restored, composer empty. Screenshots: question.png, mobile.png, final.png.
- Earlier Plan-mode test `aa598697-012e-5f17-8298-4f9d2f95f711` correctly transported an interrupt but revealed a harness gap: even a general-only prompt is routed through mandatory footprint/entry briefing. It remains a saved waiting task; no fabricated answers or native action. Root recorded it as an outstanding producer repair, not a transport success for intent handling.
- Expanded historical process shows repeated Capture request entries across continuation, and the original waiting question appears completed after continuation. These presentation issues remain for the next chat process pass; the transport does not claim to fix them.
- Source snapshot: `artifacts/ux/agui-chat-phase1/source-identity.json`. No right-work-area component/theme source changed. No cloud/backend deployment, merge or release occurred. AWS CLI recheck remains expired; renewal requested for hosted pipeline work.

## Next producer slice

Defer mandatory geometry questions/footprint admission until actual create_design, preserving validation before solver and explicit user-requested upfront questions. Current Plan path initializes brief_context before planner (`main.py:943–959`, `agent_workflow.py:327–329,2295–2335`, `brief_interpreter.py:397–410` in isolated candidate). Test general-only Plan, incomplete genuine design, invalid dimensions and old checkpoint compatibility. Pick and record an explicit backend base before edits; do not silently mix in the paused count candidate.

Provider uses forced finish_answer tool arguments and awaited ainvoke. Directly exposing fragments can leak tool arguments/private reasoning or publish a final answer later rejected by evidence admission. Operational progress can stream first. Chunking a fully validated saved answer is only presentation streaming and must not be advertised as faster provider first-token delivery. True incremental answer admission requires a separate validated design/test gate.

## Remaining scope after transport gate

- Harness emission of earlier actual progress/tool evidence; provider answer streaming with evidence admission intact.
- Compact unified checklist/specialist/question state on the new protocol, including qualified question continuation.
- Compositional layout/data schema and renderer with charts, tables, node diagrams and forms, not just a fixed card selector.
- Actual agent presentation-tool integration plus frontend capability/context and mediated actions. A fixture renderer alone does not complete this.
- Source-matched performance, fault/reconnect, mobile/keyboard and production acceptance. No claim of latency-free behavior or token savings.

The right work area and generator stay outside this pass. This packet must distinguish adapter qualification from later generative UI/harness completion.
