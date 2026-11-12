# Workspace implementation planning packets

12 November 2026. **Planning only; application implementation is not approved.**
Decision authority: [PLAN.md](../../../PLAN.md), D1–D5 plus D9–D10 at shared seams. Source inspected on the current working branch; no application changes, runtime tests, new browser observations or reference interaction claims were made for this packet. Existing [current-state evidence](../current-state.md) and [reference ledger](../reference-observations.md) remain the runtime evidence. D6–D7 output rendering is a separate work package; this packet defines its workspace seam.

## Boundaries and evidence

**Approved:** stable chat beside a larger right work area, explicit Focus drawing (D1); compact actual agent activity with expandable details (D2); review/annotation with agent-driven edits (D3); one Ask / Plan / Build composer and context chips (D4); initial affectUI colors/type (D5).

Shared decisions: non-native sheet/BOQ revisions become current automatically, with a change summary and accessible history (D9); individual accounts first, with organization invitations/team roles deferred (D10). Work-area tabs must not introduce an extra Accept requirement for those non-native revisions. Native proposal approval is unchanged. Comments in this packet are individual review notes, not a team discussion feature.

**Proposed below:** exact focus interaction, layout state model, properties placement, keyboard conventions, breakpoint behavior, context display and worker ownership. These are implementation recommendations for review, not additional user decisions. Exact pane widths, supported phone tasks, output-tab close/return behavior and token measurements remain open. No fixed ratio or new backend is approved.

| Evidence ID | Bounded source observation | Limit |
| --- | --- | --- |
| W1 | `src/components/workspace.tsx` places `ConversationPanel` in the main stage before a renderable plan and `PlanCanvas` in that stage afterward; `src/components/workspace/inspector.tsx` hosts the conversation in its Agent tab when a plan exists. | Static source; deployed transitions not retested. |
| W2 | `src/components/workspace/use-workspace-state.ts` stores left/right visibility and widths; `askFromCanvas` appends a prompt reference and focuses the textarea. An effect opens Agent on renderable-plan/run changes. `newTask`/`selectRun` save in-memory drafts and change pane state. | These transitions require deliberate adaptation for D1; do not discard draft/recovery logic during extraction. |
| W3 | `src/components/panel-resize.tsx` supports pointer drag, Arrow keys, Home/End, double-click reset and separator ARIA values; widths persist as `datumm-panel-widths`. `src/components/studio-workspace.css` uses a navigation/main/inspector grid. | Existing right width describes an inspector, not the proposed stable middle chat. Current 850px behavior is not the approved new breakpoint. |
| W4 | `src/components/plan-canvas.tsx` already provides select/pan, 2D measurement, 2D/3D, fit/zoom, comments and exports. Expanded preview in `workspace.tsx` mounts a separate `PlanCanvas`. `src/components/plan-three.tsx` owns its camera and OrbitControls. | Reusing the renderer is feasible; separate canvas instances do not establish state-preserving Focus drawing. Camera preservation needs an explicit design. |
| W5 | `src/components/plan-canvas-annotations.ts` validates browser-local comments/drafts against exact plan ID/version/fingerprint and room anchors. Viewer handoff formats a reference and adds it to the shared message draft. `src/components/prompt-content.tsx` parses/deduplicates editable reference chips. | No cross-device/server comment sync established. Current selection is not itself a submitted reference. |
| W6 | `src/components/workspace/turn-process.tsx`, `src/components/agent-activity.tsx`, `src/lib/task-projection.ts` and `src/lib/turn-nesting.mjs` already consume actual task events and optional agent/manifest/tool evidence. Multiple activity surfaces exist. | AWS deployment event coverage, replay and cancellation behavior still need service verification. |
| W7 | Composer and hook use `/api/chat`, `tasks/{id}` snapshots, expected task/plan versions and idempotency keys. Source includes queue/cancel/resume endpoints. `nativeAction` requires desktop native approval with exact proposal/document/revision identifiers. | Source paths are not evidence every endpoint is deployed. Keep existing native controls and authority; Build mode selection is not approval. |

REA guidance applied: distinguish source observation, recorded runtime evidence, inference and unknowns. This source tree does not require REA provider installation. UI/UX Pro Max targeted keyboard/focus guidance supports visible focus; its search returned general focus guidance rather than a verified focus-restoration recipe, so restoration below is a proposed DATUMM rule, not a reference observation. Accessibility target remains WCAG 2.2 AA; enhanced AAA focus guidance is not relabeled AA.

## Shared ownership and contracts

These are **future ownership assignments**, activated only after approval. One integrator owns shared files throughout; other workers return a requested interface change instead of editing them concurrently.

| Owner | Exclusive edit surface | Dependency / seam |
| --- | --- | --- |
| Workspace integrator | `src/components/workspace.tsx`, `src/components/workspace/use-workspace-state.ts`, `src/components/workspace/inspector.tsx`, `src/components/workspace/conversation.tsx`, `src/components/studio-workspace.css`, `src/lib/workspace-layout.mjs`, `tests/workspace-layout.test.mjs`, `src/components/desktop-titlebar.tsx` | Composes packets W-A–W-E; owns shared state, layout, focus, hooks and insertion points. Do not rewrite agent transport during the UI slice. |
| Shell worker | `src/components/panel-resize.tsx`; proposed new `src/components/workspace/work-area.tsx` and `src/components/workspace/work-area.module.css` | Integrator supplies approved layout props and mounts once. Sidebar behavior remains with navigation owner; its outer geometry is integrator-owned. |
| Composer worker | `src/components/workspace/composer.tsx`, `src/components/prompt-content.tsx`, `src/components/composer-controls.module.css` | Hook submit/admission logic remains integrator-owned. Changes to `src/components/composer-media.tsx` require a separate owner allocation if needed. |
| Activity worker | `src/components/workspace/turn-process.tsx`, `src/components/workspace/plan-dock.tsx`, `src/components/agent-activity.tsx`; proposed new `src/components/workspace/activity.module.css` | Reads shared event projection; asks integrator to remove duplicate default presentations. No independent event subscription. |
| Viewer worker | `src/components/plan-canvas.tsx`, `src/components/plan-canvas.module.css`, `src/components/plan-canvas-annotations.ts`, `src/components/plan-three.tsx`, `src/components/plan-three.module.css`, `src/components/studio-properties.tsx`, `src/components/workspace/plan-details.tsx` | Receives exact drawing/selection/context callbacks; camera/focus contract agreed before starting. Renderer/exports are retained. |
| Design-token owner, outside this packet | `src/app/globals.css`, `src/lib/appearance.ts`, shared UI primitives and font loading in `src/app/layout.tsx` | Supplies verified affectUI-derived semantic tokens and typography; workers consume them without parallel global CSS edits. |
| Integration owner, outside this packet | `src/app/api/chat/route.ts`, `src/app/api/service/[...path]/route.ts`, `src/lib/task-projection.ts`, `src/lib/desktop-contract.ts`, `src/lib/task-command.ts` | Verifies contract and preserves authorization; these are read-only to packet workers. |

Before writing application code, each owner reads relevant installed Next.js 16.4.3 guides under `node_modules/next/dist/docs/`, especially client-component boundaries and any route/data guide the actual edit needs. Inspect the installed APIs; this plan is not permission to upgrade dependencies or install copied reference components.

Proposed client-only view model, named here to make ownership concrete (final type names may change):

- `WorkspaceLayout`: navigation visibility/width, chat width, active narrow-screen pane, active work-area tab, focus-drawing flag and restore snapshot. It must not carry native approval state.
- `DrawingIdentity`: existing `DrawingVersion` fields `planId`, `version`, `fingerprint`; keep `Run.currentPlanRef` and task version distinct. Project ID comes from authoritative task/project data. Native document/level identity is separate and shown only when measured/available; never synthesize it from room labels.
- `DrawingViewState`: 2D zoom/pan and selected tool, 3D camera/target/orientation, selected element and comment panel selection, keyed to drawing identity. Prefer retaining the mounted viewer across focus; if unavoidable, explicitly serialize/restore camera state before moving it. Revision changes intentionally invalidate incompatible selection/measurement.
- `ContextReference`: reuse `ViewportReference`/`ViewportAnnotation` and existing prompt serialization. Add room/view selection chips through the same contract rather than an additional request channel. Any structured server payload extension is a separately verified backend change.
- `ActivityView`: derived once from the existing `TaskEvent[]`, task status, cursor, optional `RunManifest`, tool evidence, specialist results and public progress messages. Agent absence means absent rows, not an inferred research/planning/execution pipeline.
- `WorkAreaTab`: drawing plus output tab identities provided by the structured-output owner. Shell handles activation, return focus and available width; output owner handles rendering, D9 automatic-current non-native revisions with change summary/history, export and authorization. Keep viewing a historical revision explicit rather than relabeling it as current when a new revision arrives.

Persistence: retain server-owned tasks, history, plan selection and approval unchanged. Layout preferences may remain browser-local with guarded reads/writes and a versioned migration from `datumm-panel-widths`; never reinterpret the old inspector width as a trusted chat width without clamping. Existing prompt drafts are in-memory per chat/new-project source, not proven durable through reload. Reload-safe draft retention is a proposed client requirement needing an agreed storage/lifetime/account-clear policy; do not claim it already works. Preserve reference/attachment identity, and clear account-bound caches on account change according to the integration contract. Comments remain explicitly local to this browser/exact version unless a server persistence addition is approved.

## W-A — Stable shell and larger right work area

**Goal:** implement D1/D5 without moving the conversation when a plan appears. Excludes project CRUD redesign, auth, new routing architecture and account features.

**References:** [flat shell](https://www.affectui.com/screens/app-shell-flat), evidence P. Existing ledger observed surfaces and separators; drag limits, keyboard resize, persistence and tab-close recovery remain untested. Documented under-900px drawer behavior is not a measured DATUMM requirement. [Colors](https://www.affectui.com/design-system/colors) / [typography](https://www.affectui.com/design-system/typography), documented values only; exact computed density/fallbacks still need verification.

**Implementation boundary:** shell worker and integrator files above; dependencies are approved token contract, minimal pane state and output-tab API. The chat component remains mounted in the middle. Right drawing/work area receives remaining width and an honest empty state before geometry exists. Exact desktop minima/defaults must be selected using long messages, populated toolbar and real drawing content before approval; preserve room for a larger drawing, with no hardcoded untested ratio. Navigation collapse remains explicit. Project/chat hierarchy and URL task restoration continue to use existing task/project state.

**Proposed interaction/state matrix:**

| State / trigger | Required behavior |
| --- | --- |
| New chat, no plan | Stable chat/composer; work area offers empty drawing guidance, no fake 2D/3D output. Starter actions only populate supported prompts. Empty-pane width policy still needs visual approval. |
| History loading / unavailable | Keep shell geometry stable; label history loading/error independently, preserve current chat and offer existing refresh recovery. |
| First geometry / streaming / completion | Populate right area without reparenting chat, changing draft or stealing keyboard focus. Do not auto-open properties/activity over the drawing. |
| Drawing load failed / missing / stale | Keep chat usable; show scoped drawing error/retry and exact available saved identity. Do not silently display another version as current. |
| Service disconnected / account expired | Preserve visible saved work and draft; disable only actions requiring unavailable authority, use existing recovery. |
| Resize / restore / invalid storage | Clamp to approved content minima; keyboard separator and reset available; malformed/blocked storage uses safe defaults. |
| Narrow viewport / browser zoom | Proposed one primary pane at a time with labeled Chat / Drawing / Outputs switching and navigation drawer. Preserve each pane's state; final breakpoint/phone scope is open. |

**Keyboard/focus/scroll:** independent sidebar history, conversation and work-area scroll; composer stays in chat flow and remains reachable without body scrolling. Retain pointer and keyboard resize; accessible label must name Chat if the boundary now resizes chat. Width controls/reset provide a single-pointer alternative to dragging. Pane switching places focus on its named heading/tab and returns to the invoking control when closing overlays. Opening a reference must not jump conversation scroll to the bottom if the user is reviewing older content. No focus trap for ordinary nonmodal panes. Proposed nonessential transitions honor reduced motion.

**Acceptance / evidence later:** begin a text-only chat, type a draft, receive its first drawing, select another chat and return: conversation position and its draft source remain correct, exactly one composer exists, right drawing identity matches selected task. Resize by pointer and keyboard; reload restores valid preferences; corrupt or unavailable storage is recoverable. At agreed narrow/desktop widths and browser zoom, no essential control is clipped, drawing remains usable and focus is visible. Update meaningful `tests/workspace-layout.test.mjs` state rules rather than preserving its old rule that conversation content never opens the studio unchanged. Runtime browser evidence must prove geometry arrival does not relocate the composer or trigger a new run.

## W-B — Focus drawing with exact restoration

**Goal:** D1's explicit Focus drawing. Excludes browser fullscreen requirement and unrelated expanded-preview redesign.

**References:** [flat shell](https://www.affectui.com/screens/app-shell-flat), P; focus/restore behavior is DATUMM proposal, not observed reference behavior. Existing `workspace.tsx` expanded-preview dialog is W4 evidence only.

**Ownership/dependency:** integrator owns focus state/trigger; viewer worker owns camera preservation; shell worker renders layout. Freeze this contract before W-A and viewer parallel edits. Keep saved-reference previews distinct from focusing the current drawing.

| State / trigger | Proposed response |
| --- | --- |
| No drawable geometry | Focus drawing unavailable with explanation; do not create an empty fullscreen trap. |
| Enter Focus drawing | Capture widths, pane/tab visibility, chat scroll, invoking focus target and drawing identity. Expand the same drawing; retain draft, room selection, 2D zoom/pan and 3D camera/target. |
| Focused | Visible Exit focus action, project/plan/version and 2D/3D status remain available. Annotation and inspection work as before; no duplicate composer. |
| Add view/comment to message | Proposed: exit focus to stable chat, append context without sending, focus shared composer. Restore viewer camera and previous widths. This exit behavior needs user review. |
| Exit / Escape | Restore captured layout and drawing view state, then trigger focus if it still exists; otherwise drawing heading. Inner menu/dialog gets first Escape. |
| Resize / new plan revision / task change while focused | Restore widths clamped to new viewport. Task/identity change exits focus and loads deliberate new-view defaults; never restore an old camera/room into new geometry. Do not discard existing scoped annotation draft. |
| Drawing error / WebGL loss | Exit remains operable; offer renderer recovery/2D fallback with exact identity. No resubmission or native operation. |

**Validation:** focus at nondefault widths, pan/zoom 2D, switch to 3D and orbit, focus/exit, open/close a comment; verify same camera/selection/draft and no renderer duplication. Test Escape precedence, return focus, viewport changes, selected revision invalidation and context-to-composer handoff. Add pure transition tests to the layout suite once behavior is approved; browser inspection verifies actual 3D camera and renderer lifecycle. ResizeObserver may reframe the canvas extent; it must not overwrite the saved camera target/orientation as an unintended fit.

## W-C — One Ask / Plan / Build composer and context

**Goal:** D4 with D3 review-first intent. Remove the competing floating text/voice prompt from the canvas in favor of Add view/selection to message; retain one shared composer. Excludes a new tool catalog, direct geometry editing, new model provider setup and blanket native authority.

**References:** [chat composer](https://www.affectui.com/components/chat-composer), I: model/Add menus and Escape were exercised; full send-key/focus lifecycle untested. [Model picker](https://www.affectui.com/components/model-picker), I for opening dialog only; backend capabilities/persistence unverified. Copy layout hierarchy, not demo actions/prices/model names.

**Ownership/dependency:** composer worker files above, viewer emits existing references, integrator adapts `askFromCanvas` and settings. `src/components/composer-media.tsx`, `src/components/model-picker.tsx`, `src/components/project-context.tsx`, `src/app/api/chat/route.ts` are existing dependencies; no automatic edit ownership. Shared renderer changes belong to the outputs packet. Preserve `submit`, optimistic admission/recovery, expected task/plan version, idempotency key, attachment IDs and draft source key semantics.

**Authoritative inputs:** mode union is `ask | plan | build`; models/reasoning controls use actual runtime/provider model capability data. Attachment/media actions remain limited to working account/runtime capabilities. Task snapshot and measured native context supply identity. Existing prompt references carry plan ID/version/fingerprint, view, room key and annotation intent; keep visible readable labels and exact encoded identity. Selection alone does not add/send context: explicit Add selection/view to message appends a chip, retains typed prompt, then focuses shared composer. Removing a chip removes its serialized reference; it does not delete geometry or comments. New room/view chip format must round-trip existing saved prompts; keep stale references legible and block unsafe revise targets using current guards.

| State / action | Required behavior |
| --- | --- |
| Empty / composing | Send follows existing meaningful-content validation; explicit mode stays visible. Reference-only request follows existing note validation, not arbitrary button enablement. |
| Select room/view / add annotation | Show exact version and review/revise intent in a removable/editable context chip. No run, mode change or native approval occurs. Stale targets show explanation and reattach action. |
| Mode switch | Preserve draft/references; communicate Ask as questions/read-only investigation, Plan as proposed design/review, Build as native-work workflow. Switching to Build grants no approval. |
| Revit disconnected / document unavailable | Ask/Plan remain usable for tasks that need no native model. Revit-read actions explain missing context. Build retains connection/setup gates; do not create unavailable native submit actions. |
| Streaming / awaiting question | Existing Stop/Pause/answer path remains; labels derive from actual task state. Queue next message is shown only if deployed queue semantics are verified. Source includes queue endpoints despite the static settings follow-up selector; resolve this discrepancy before final copy. |
| Cancel pending / cancelled / retry | Do not announce stopped until authoritative result. Preserve unsent draft, inspect saved task after uncertain admission; reuse idempotency/recovery behavior and avoid duplicate runs. |
| Failure / expired account / blocked task / media upload | Keep prompt and attachments where valid; scoped retry/error explains necessary action. Media busy state prevents unsafe switching. Unsupported model/capability has truthful availability copy. |

**Keyboard/scroll:** preserve send preference Enter or Ctrl/Meta+Enter, Shift+Enter newline and IME guard. Slash-menu Arrow/Enter/Escape handling stays ahead of send. Escape closes popover before global pane/focus action; restore focus to trigger. Chip controls have names including context target; long names wrap within composer. Mode/model/attachment menus remain reachable by keyboard, not hover only. No raw model controls copied from reference without verified support. Remove/replace the old floating-input setting with migration coordinated by integrator/settings owner; do not leave a preference promising a second composer.

**Acceptance:** type multiline draft, add room/view and annotation context, edit/remove a chip, switch permitted mode, send and reload saved conversation: text/reference identity remains consistent. A reference for v1 never silently targets v2. Save comment/add to draft, select Build, focus drawing, or change pane produces zero native approval calls. Test failed admission vs admitted-stream loss separately; retry must not duplicate a task. Existing send preferences, media failures, question groups and saved-turn display keep working. Exercise actual backend-supported Stop/queue/resume only in a safe test conversation after contract verification; mark unsupported/unverified paths explicitly. Use focused serializer/transition tests where invariants change, plus browser keyboard journey; do not add tests that only mirror markup.

## W-D — Compact actual agent activity

**Goal:** D2: one clear summary per conversation turn, expandable detail. Excludes simulated roles, private chain-of-thought, new orchestration/multi-agent backend, invented cost/tokens or a permanent pipeline consuming drawing height.

**References:** [thinking state](https://www.affectui.com/components/thinking-state), P; [chat progress](https://www.affectui.com/screens/agent-chat-progress), P; [run inspector](https://www.affectui.com/blocks/run-inspector), P. [Progress tracker](https://www.affectui.com/components/progress-tracker), [tool call](https://www.affectui.com/components/tool-call-card), [agent lanes](https://www.affectui.com/components/agent-lanes), [handoff](https://www.affectui.com/components/agent-handoff), C only. Expansion, scroll and keyboard behavior remain to inspect; approval of compact activity does not approve a fleet visualization.

**Ownership/dependency:** activity worker presentation files above; integrator mounts the compact summary in conversation and removes duplicate default pipeline summaries. Existing full Activity surface can remain a deliberate secondary destination; it must show the same task/turn identity. Event reducer and transport remain owned by integration. Scheduler/todo plan (`PlanDock`) is distinct from an execution log: retain actionable plan if present without rendering the same details twice.

**Data:** task status is the lifecycle authority; `TaskEvent` uses optional schema/event/sequence/task/agent/parent-step fields plus index/stage/detail/time. `reduceProjection` rejects wrong-task/stale events and holds sequence gaps. Use those records and optional manifest/tool evidence to build role rows. Flat stage events stay flat if agents/spans are absent. Public progress notes/tool summaries are acceptable; never present private reasoning. Duration from manifest/event timestamps is labeled as available/approximate if necessary; absent metrics stay absent.

| State | Summary and detail rule |
| --- | --- |
| No execution evidence | No fabricated roles or timer. A task-level running/waiting status may still display if authoritative. |
| Queued / active | Compact truthful queued/current public activity label. Expanded tool rows use actual tool state/identity; repeated updates deduplicate. |
| Needs input / approval | Clear Waiting for you with navigation to the existing question/review card; preserve that card's exact approval behavior. |
| Completed | Stable collapsed duration/steps when derivable; explanation of failed substeps remains available. User expansion choice should not reset on every new event. |
| Cancel requested / cancelled / failed | Lifecycle wording comes from snapshot, distinguish request pending from confirmed cancellation. Preserve completed evidence and scoped recovery. A partial failure must not become a completed success because streaming ended. |
| Disconnected / sequence gap / stale snapshot | Mark updates delayed/refreshing, retain last known status; rehydrate from authoritative snapshot, do not invent completion or replay native writes. |
| History / task switched / permission failure | Only selected task/turn evidence is visible; no residual rows from previous task. Missing evidence has honest unavailable state. |

**Keyboard/focus/scroll:** native buttons/collapsibles with expanded state; expand without moving chat scroll unexpectedly; long detail body scroll belongs inside the selected secondary surface when necessary. Announce meaningful lifecycle changes politely, not each token/timer tick. Error/approval controls remain reachable. Reduced motion disables shimmer/spinner animation as appropriate while preserving text status.

**Acceptance:** fixtures with flat hosted events, nested agents, no agents, duplicate events, out-of-order gaps, stale snapshots, waiting and tool failure yield truthful summaries. Reloaded completed activity matches streamed completion. Existing `tests/turn-nesting.test.mjs` is the relevant process regression suite; projection invariants need focused contract tests if logic changes, owned by integration. Browser check confirms one default turn summary, no permanent duplicate pipeline strip, accessible expansion and no unsolicited scroll jump. Completion actions must change even when final response text is unchanged; coordinate with answer/output renderer owner.

## W-E — Review, properties and pinned annotations

**Goal:** D3/D1/D4: preserve useful drawing tools, clarify identity and route requests through shared composer. Excludes direct wall/room resizing, arbitrary RVT import, collaborative comment threads, annotation sync service and renderer replacement.

**References:** [comments panel](https://www.affectui.com/components/comments-panel) / [comment thread](https://www.affectui.com/components/comment-thread), C; [approval card](https://www.affectui.com/components/approval-card) / [change summary](https://www.affectui.com/components/change-summary) / [review center](https://www.affectui.com/components/review-center), C. None of these interactions is claimed observed. Revit navigation rationale is in [current-state](../current-state.md); pending user Revit screenshot may inform final properties placement, not new scope.

**Ownership/dependency:** viewer worker files above; shell passes selected exact `DrawingVersion`, `selectedDesignElement`, context callback and optional properties action. Integrator owns task selection, acceptance, placement/native-review navigation and all calls. Existing `src/components/plan-drawing.tsx`, `src/lib/plan-geometry.mjs`, `src/lib/plan-pdf.ts`, `src/components/design-review.tsx`, `src/components/native-build-review.tsx` and `src/components/build-comparison.tsx` are dependencies, not automatically worker-owned.

**Proposed arrangement:** compact 2D/3D/view toolbar; on-demand properties with clear selection and close action, rather than a permanent band reducing drawing height. Exact placement (popover, drawer or collapsible side region) needs representative desktop/narrow wireframe approval. Keep plan ID/version and units visible; proposed geometry is labeled as such, never an imported/live RVT model. Show connected document/level context only when authoritative and relevant. Review control points users to the existing exact review card; it does not accept geometry or approve execution by itself.

| State / tool | Required behavior |
| --- | --- |
| Empty / loading / unavailable / stale geometry | Honest separate states, scoped retry, visible saved version when retained; disable only tools that require usable geometry. |
| 2D select / pan / measure | Retain current selection and coordinate units; measure two points with existing snapping behavior. No direct geometry mutations. Add non-drag alternatives and accessible selection via existing room controls. |
| 3D orbit / zoom / presets | Preserve actual Three.js controls, keyboard room access, orientation and current camera through layout-only changes. Measurement currently 2D-only: do not advertise 3D distance. |
| Selected room/wall/opening | Properties reflect actual inspected geometry, distinguish room-context support from wall/opening inspection. Add context only for supported stable identities; do not manufacture an executable element key. |
| Comment creation / edit / resolve / remove | Keep validated anchors, limits (100 comments; 2000 chars), version identity and dirty-draft protection. Clear browser-local/exact-version label. Existing Add to message remains unsent context. |
| Storage read/write failure | Retain in-memory/draft content and offer retry with truthful unsaved/local status; do not claim synced/saved when write failed. |
| New version / task / mismatched fingerprint | Comments/drafts remain in original scope; no silent migration of pins, rooms or measurements. Old annotations attached to composer remain explicitly versioned; revise target guards apply. |
| Read-only comparison / public share | Preserve `readOnly` restrictions and existing share authorization/image restrictions. Do not enable mutation or assistant handoff where unavailable. Local annotations are not implied public content. |
| WebGL failure / export failure | Explain fallback/retry; 2D remains useful where supported. Export failure is scoped; no new run. Preserve actual export units/identity and sanitize/error behavior. |

**Keyboard/focus/scroll:** tool buttons expose label and pressed state; room selection and comment pin interaction available from keyboard, Escape respects nested dialogs and dirty drafts. Properties/comments return focus to initiating control/pin when closed; do not hide focused content behind persistent bands. Camera pan/orbit has controls/presets and zoom buttons as alternatives. Comment contents remain selectable/wrapping. Tooltips supplement accessible names and never become the only label. Controls remain usable under approved density and touch target rules even if affectUI demo is denser.

**Acceptance:** select a room in 2D, inspect its properties, measure a known span, add/edit/resolve/reopen a comment, add it to draft, focus/exit and revisit exact version. Verify correct anchor/version, camera, unsent draft, storage error recovery and no agent run before Send. In 3D test orbit, presets, zoom, room selection, pins, layout resize and WebGL recovery. Compare v1/v2 and public share read-only behavior independently. Retain geometry/PDF/preview regression coverage in `tests/plan-geometry.test.mjs`, `tests/plan-pdf.test.mjs`, `tests/preview-raster.test.mjs`, `tests/share.test.mjs`; meaningful annotation storage tests are warranted if store/identity behavior changes. Capture sanitized before/after images with actual paths, not invented screenshot IDs.

## Delivery order and user decisions

1. Confirm proposed interactions and representative widths/breakpoint policy; finish selected reference observations and verified theme tokens. Reconcile service/event, queue/cancel, context, model catalog and native-approval contracts with the integration owner.
2. Integrator freezes layout/context/activity/viewer props and edit ownership. W-A shell and W-C/W-D presentation can proceed in parallel only after those seams are stable; integrator serializes shared-file edits. Viewer works against the agreed focus/camera/context interface. Do not dispatch overlapping owners for global styles/hook/conversation.
3. Integrate stable chat first, then focus/context/compact activity, then viewer properties/comments, then external output tabs. Every stage preserves saved chats and native reviews; use no production native changes to validate layout.
4. Run proportionate existing tests, typecheck, production build and targeted browser journeys on the implemented candidate. Baseline results in PROJECT.md do not validate this future implementation. Report unverified service/native/browser states. No push/merge/release decision is included.

**Decisions still needed from the user:** exact desktop/narrow wireframes and pane minimums; what the empty right work area shows/occupies; supported phone tasks; on-demand properties placement; whether Add context while focused exits focus; output-tab close/return and historical-view behavior within approved D9 (with outputs owner); draft reload-retention preference and lifetime; whether browser-local annotations are acceptable for launch. None requires blocking the documentation work.

**Technical verification, not user design guessing:** deployed AWS OpenCode snapshot/event coverage, cancellation terminal states, queue/resume availability, real model capability source, authoritative document/level IDs, existing saved context round-trip, attachment authorization and native approval paths. Source contains desktop-specific approval and other legacy flow branches; UI work must preserve each existing authorized path until integration owner verifies release behavior. No new web-native approval control is inferred.

Each future worker returns: changed file list, approved decisions implemented, tested acceptance examples and real capture paths, contract assumptions, unavailable/unverified states, migration/rollback risks and remaining dependency. The integrator records unresolved differences before requesting implementation/release approval.
