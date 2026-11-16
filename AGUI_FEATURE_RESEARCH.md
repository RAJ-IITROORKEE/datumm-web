# AG-UI feature and integration research

16 November 2026. Research only. Versions below are observations, not installation instructions. [Audit](AGUI_CURRENT_ARCHITECTURE_AUDIT.md) establishes the existing system; [target](AGUI_TARGET_ARCHITECTURE.md) contains DATUMM-specific proposals.

## Verified release and compatibility baseline

Official npm/PyPI metadata was queried without installing anything. Published TypeScript tarball declarations were inspected in memory. Do not use an old skill's approximate event count or prerelease naming as authority. The current protocol is 1.0; packaged versions differ by language/integration.

| Package / protocol | Stable/default release observed | Compatibility / caution |
| --- | --- | --- |
| `@ag-ui/core`, `@ag-ui/client`, `@ag-ui/encoder` | 1.0.4, published 5 Nov 2026 | Zod peer ^3.25.18 or ^4; client brings RxJS 7.8.1, JSON Patch, UUID, proto/encoder and helpers. No framework UI included |
| Python `ag-ui-protocol` | 1.0.0 | Python ≥3.9; Pydantic ≥2.11.2 |
| `@ag-ui/langgraph` | 0.0.46, 13 Nov | Peer AG-UI ≥1; pulls LangChain ≥1.2 and graph SDK. Not a turnkey adapter for DATUMM v2 domain commands |
| Python `ag-ui-langgraph` | 0.0.47 | Python ≥3.10,<3.15, LangGraph ≥0.6,<2, LangChain ≥1.2; dependency reconciliation needed |
| CopilotKit react-core/react-ui/runtime | 1.88.0, 13 Nov | React 18/19 peers; runtime Node ≥20. These releases depend on AG-UI 1.0.2; runtime AI SDK ^6.0.104 differs from DATUMM's 7.0.114. 2.0 RC is not the stable choice |
| A2UI | Protocol 1.0; `@a2ui/react` 0.15.0 | React 18/19; Node ≥18; Zod3-based package graph. Confirm catalog/protocol compatibility, not equal version numbers |
| React Flow `@xyflow/react` | 12.12.1 | React ≥17; optional graph view, brings Zustand/system package; not a drafting kernel |
| Vercel AI SDK `ai` | 7.0.173 latest; installed 7.0.114 | Latest Node ≥22, Zod ^3.25.76 or ^4.1.8. No upgrade required by this proposal |
| Streamdown | 2.7.1 latest; installed 2.6.0 | React18/19; keep installed renderer until a separately tested upgrade |

Metadata sources: [AG-UI core](https://registry.npmjs.org/@ag-ui/core/latest), [client](https://registry.npmjs.org/@ag-ui/client/latest), [encoder](https://registry.npmjs.org/@ag-ui/encoder/latest), [LangGraph JS](https://registry.npmjs.org/@ag-ui/langgraph/latest), [Python protocol](https://pypi.org/pypi/ag-ui-protocol/json), [Python LangGraph](https://pypi.org/pypi/ag-ui-langgraph/json), [CopilotKit core](https://registry.npmjs.org/@copilotkit/react-core/latest), [runtime](https://registry.npmjs.org/@copilotkit/runtime/latest), [React UI](https://registry.npmjs.org/@copilotkit/react-ui/latest), [A2UI React](https://registry.npmjs.org/@a2ui/react/latest), [React Flow](https://registry.npmjs.org/@xyflow/react/latest), [AI SDK](https://registry.npmjs.org/ai/latest), [Streamdown](https://registry.npmjs.org/streamdown/latest). Mutable latest endpoints require rechecking and exact lockfile review at implementation approval.

DATUMM's Python3.12/LangGraph1.2.12 and React19.3 are plausible matches, not a tested dependency combination. Zod4.6.7 is presently transitive; an adopted SDK should have explicitly managed direct peer dependencies. Actual production bundle/SSR/CSP behavior and Python resolver compatibility remain untested.

## Capability classification

| Capability | Native AG-UI contribution | Additional responsibility / limitation | Official evidence |
| --- | --- | --- | --- |
| Agent/frontend communication | Typed run input and ordered event model | Authentication, tenancy, domain command admission remain app-owned | [Architecture/spec](https://docs.ag-ui.com/spec/1.0/index) |
| Event transport | HTTP POST + SSE; other bindings available | Streaming proxy buffering, timeouts and durable storage are deployment/app concerns | [HTTP SSE](https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse) |
| Text | TEXT_MESSAGE_START/CONTENT/END and chunk convenience | Backend must actually emit text; cannot manufacture token latency gains | [Text events](https://docs.ag-ui.com/sdk/js/core/events) |
| Tools | TOOL_CALL_START/ARGS/END/RESULT with stable identity | END closes arguments, not execution. Application parses/validates complete arguments; result/status determines actual completion | [Tool semantics](https://docs.ag-ui.com/spec/1.0/events/tool-calls) |
| Run/steps | RUN_STARTED/FINISHED/ERROR, STEP_STARTED/FINISHED | Business task may span multiple runs; no generic task dependency scheduler | [Lifecycle](https://docs.ag-ui.com/spec/1.0/events/lifecycle) |
| Shared state | STATE_SNAPSHOT, RFC6902 STATE_DELTA, MESSAGES_SNAPSHOT | Application supplies schema, persistence, allowed paths, conflict detection and authority | [State](https://docs.ag-ui.com/concepts/state) |
| Progress | ACTIVITY_SNAPSHOT/DELTA; step events | Checklist data, evidence semantics and UI supplied separately | [Event families](https://docs.ag-ui.com/concepts/events) |
| Frontend tools | Input may advertise client-provided tools | Client handlers and authorization required; backend MCP catalog should not be sent as frontend tools | [Tools](https://docs.ag-ui.com/concepts/tools) |
| Human input | Interrupt outcome and resume entries | Durable receipts, expiry, ownership and native approval enforcement remain DATUMM's responsibility | [Interrupt/resume spec](https://docs.ag-ui.com/spec/1.0/basic/patterns/interrupt-resume) |
| Generative UI | Carries structured UI payloads | Does not generate/render components. Needs registry, A2UI renderer or framework | [Generative UI scope](https://docs.ag-ui.com/concepts/generative-ui-specs) |
| Multiple agents | SUBAGENT_STARTED/FINISHED/ERROR and subagentRunId attribution in current SDK | Harness must emit correlated child evidence; no scheduler or graph layout | [Subagents](https://docs.ag-ui.com/concepts/subagents) |
| Extensions | CUSTOM, metadata; RAW exists | Version custom schemas; do not expose raw secrets or reasoning | [Event API](https://docs.ag-ui.com/sdk/js/core/events) |
| Errors | RUN_ERROR and typed lifecycle | Retry policy, compensation and reconciliation app-owned | [Lifecycle](https://docs.ag-ui.com/spec/1.0/events/lifecycle) |
| Reconnection | Serialization/compaction utilities; client connection abstractions | Standard HTTP binding explicitly has no Last-Event-ID resumption. Persistence/replay extension must be designed | [HTTP binding](https://docs.ag-ui.com/spec/1.0/basic/transports/http-sse), [serialization](https://docs.ag-ui.com/concepts/serialization) |
| Cancellation | Client abortRun aborts HTTP; current protocol has cancelled outcome | Stopping a request does not stop a durable job or roll back Revit | [HttpAgent](https://docs.ag-ui.com/sdk/js/client/http-agent), [lifecycle](https://docs.ag-ui.com/spec/1.0/events/lifecycle) |
| Usage | Optional provider/model usage entries on RUN_FINISHED | Map only verified per-run counts; preserve coverage/unknowns separately; not per-token streaming | [Lifecycle accounting](https://docs.ag-ui.com/spec/1.0/events/lifecycle) |
| React/Next | Framework-neutral TypeScript client usable in client boundary | Hooks, ownership, SSR hydration and components are not supplied by protocol | [HttpAgent](https://docs.ag-ui.com/sdk/js/client/http-agent) |
| Performance | Incremental transport can avoid full snapshots | No demonstrated DATUMM latency, memory, token or bundle gain yet | [State](https://docs.ag-ui.com/concepts/state) |

Important version detail: inspected 1.0.4 declarations contain subagentRunId, SUBAGENT_* events, protocolVersion, interrupt outcomes and resume. Older examples or skills can omit these. Some concept/SDK pages simplify lifecycle or disagree with newer specification examples. Treat the selected release schema as structural authority and versioned behavioral spec as behavioral authority; add executable conformance fixtures before adoption. A 1.0 producer must declare its own protocolVersion; a forwarding proxy must not invent another producer's version. [Migration guide](https://docs.ag-ui.com/migrating-to-1-0).

Interrupts close a protocol run and resume in a new one. Cover every outstanding interrupt; retain the same conversation identity. DATUMM must additionally validate receipt/version/hash server-side even where protocol client rules suffice for generic applications. A grouped QuestionSet can be one interrupt with a structured multi-answer payload; Later is display deferral, not approval or cancellation. [Interrupt concepts](https://docs.ag-ui.com/concepts/interrupts).

Do not display REASONING_* content. Only explicit public operational summaries, tool evidence and task states enter the DATUMM UI. Model continuation material is not a user-facing activity log.

## Adapter availability and existing harness

Official framework integrations include LangGraph/LangChain and many others; no DATUMM v2 task-service adapter was found in the official catalog inspected. This is a catalog finding, not a claim that no third-party OpenCode adapter exists. A general LangGraph integration can expose a graph, but DATUMM wraps its graph with owner-scoped commands, durable jobs, device authorization and immutable outputs. A **custom domain projection adapter** is therefore still required. Wrapping the raw graph directly would bypass established product contracts. [Integration catalog](https://docs.ag-ui.com/integrations).

The current GET task SSE can feed that adapter. It cannot simply be renamed an AG-UI endpoint: its input, snapshot, lifecycle and event payload contracts differ. AI SDK UIMessage and AG-UI are also distinct protocols despite both using SSE. Keep separate adapters over one normalized domain store; do not send two incompatible event grammars through useChat. [AI SDK stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol).

MCP remains the tool/resource connection protocol, AG-UI the UI boundary. Existing hosted relay and desktop MCP paths can both emit normalized observations without moving tool credentials or native execution into the browser. MCP does not prescribe the application harness. [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture).

## Structured generative UI choices

| Choice | Value for DATUMM | Tradeoff / recommendation |
| --- | --- | --- |
| Typed JSON + existing React registry | Small fixed set of domain cards, strict source identity and familiar theme | Recommended first. Own a small versioned schema; derive most presentations deterministically from actual tool results |
| A2UI native catalog | Cross-platform declarative composition and data binding | Useful later for web/desktop/mobile shared surfaces. Additional renderer/catalog/version management now; optional proof-of-concept after registry has demonstrated need |
| CopilotKit controlled UI | Frontend tools, tool renderers, shared-state hooks and HITL helpers | Valid Option C, but duplicates existing chat/state mechanisms and introduces substantial package surface; benchmark one isolated capability before choosing |
| AI SDK structured output | Schema-constrained model output through existing stack | Not a renderer, validator of factual truth, or reason to add a second model call; Python harness can use its own typed schema instead |
| React Flow | Inspectable agent/dependency graph with accessible nodes | Optional lazy view only when actual parent/child edges exist. Mobile list first; not a replacement floor-plan canvas |
| Streamdown + optional Mermaid | Existing prose/tables and occasional diagrams | Retain. Mermaid is optional/request-driven; architectural geometry must come from PlanGraph, not diagram text |

A2UI catalog definitions and native component implementations can preserve the app's appearance while allowing bounded composition. Surface data binding is separate from domain database authority. No generated HTML/JS/MCP-app sandbox path is proposed for DATUMM. [Catalog guide](https://a2ui.org/guides/defining-a-catalog/), [data model](https://a2ui.org/concepts/data-binding/).

CopilotKit supports controlled components, tool renderers and state rendering; a prebuilt chat shell is optional. The stable package also exposes v2 entry points: that path name alone does not imply installing a 2.0 RC. Documentation/examples require exact-package verification. [Generative UI](https://docs.copilotkit.ai/concepts/generative-ui-overview), [HITL](https://docs.copilotkit.ai/human-in-the-loop). Dojo was inspected through the Codex browser; its Agent State code uses one shared progress surface. It was not load-tested or submitted with private DATUMM data.

AI SDK structured output can validate shape against a schema; additional domain checks still need to validate units, provenance and revision. [Structured data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data). React Flow provides graph editing/visualization primitives, not agent execution semantics. [React Flow](https://reactflow.dev/learn). Streamdown handles streaming Markdown, tables and optional plugins; it does not supply trustworthy checklists or artifact identity. [Streamdown](https://streamdown.ai/).

## License and commercial use

AG-UI repository is MIT: commercial use/modification/distribution permitted with retained copyright/permission notice and warranty disclaimer. No mandatory paid AG-UI runtime subscription was found. [Repository license](https://github.com/ag-ui-protocol/ag-ui/blob/main/LICENSE).

CopilotKit's repository/queried packages are MIT; hosted or self-hosted Intelligence features have separate service/commercial requirements. OSS TypeScript runtime can operate without Intelligence; do not assume every language runtime or memory/observability service is free because the repository is MIT. [License](https://github.com/CopilotKit/CopilotKit/blob/main/LICENSE), [OSS versus Intelligence](https://docs.copilotkit.ai/concepts/oss-vs-enterprise).

A2UI repository is Apache-2.0; preserve applicable notices and modification/license obligations. [License](https://github.com/a2ui-project/a2ui/blob/main/LICENSE). React Flow metadata is MIT; AI SDK and Streamdown metadata Apache-2.0. Check transitive license inventory at adoption. These findings do not grant access to AffectUI Pro source: retain current pinned MIT free components and independent public-preview adaptations.

## What remains a measurement, not a claim

No SDK installed, benchmark built, tokens saved, byte-size comparison measured or adapter executed. RxJS/proto and CopilotKit's wider dependency graph are verified dependencies, not measured shipped bundle sizes; tree shaking and import choices matter. Shared state could reduce repeated payloads, but additional UI schemas can increase prompt tokens. [Migration Phase 0](AGUI_MIGRATION_PLAN.md#phase-0--baseline-and-contract-freeze) defines the measurement gate.
