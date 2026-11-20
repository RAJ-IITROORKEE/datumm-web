# W1 · Right work area on AG-UI

| Field | Value |
| --- | --- |
| Status | Implemented and verified locally on 20 Nov 2026. Owner approved the packet the same day. |
| Depends on | N3 activity and N4 evidence contracts from the [16 Nov roadmap](roadmap-2026-11-16.md#3-order-and-dependencies) |
| Base | Web `main` at `f5ecbf3` |

## 1. Goal

Use the chat's AG-UI observation to keep Details → Activity, Files (Assets in the roadmap), and Exports in sync with the selected task. Reduce duplicate selected-task requests while retaining timely saved-state recovery and exact output identity. Floor-plan shared state, drawing edits, import, native approvals, and deployment are outside W1.

## 2. Current state

- **Implemented and tested.** Chat and the work area already share a task projection from [the workspace hook](../../src/components/workspace/use-workspace-state.ts#L186). [The Details slots](../../src/components/workspace.tsx#L1220) consume that projection. [Existing export tests](../../tests/workspace-exports.test.mjs) cover saved revision and latest-task links.
- **Implemented, under-tested for this overlap.** AG-UI forwards progress and a command-bound saved snapshot through `datumm.task` [activity frames](../../src/lib/agui/adapter.mjs#L197). The same selected task can simultaneously be fetched by the [open-chat polling effect](../../src/components/workspace/use-workspace-state.ts#L764). That effect also provides the first complete saved record, so admission alone cannot suppress it.
- **Planned.** The browser transport [reads task activity](../../src/lib/agui-chat-transport.ts#L82), while the [existing state snapshot](../../src/lib/agui/adapter.mjs#L94) carries a versioned question. Task-state frames do not yet feed the work area. The transport [has no generic reattach](../../src/lib/agui-chat-transport.ts#L150).

## 3. Design

Reuse [the existing Details layout](../../DESIGN.md#5-interface-map) and the shared task projection. Route trusted saved task snapshots through AG-UI and keep incremental activity in the current event path. After the first saved record, space routine active-task reads at six seconds while a healthy, admitted observation owns the selected task. Keep the current 1.5-second active fallback when it cannot cover the task. A cursor gap, higher list revision, checkpoint completion, or interrupted observation can trigger a prompt saved read. Files and Exports remain bound to saved task and revision data as it changes.

## 4. Change list

- Transport implementer owns `src/lib/agui/adapter.mjs`, `src/lib/agui-chat-transport.ts`, and their tests. Map the already-authorized saved task record onto a standard AG-UI state snapshot and retain the activity path and versioned interrupt.
- Workspace implementer owns `src/components/workspace/use-workspace-state.ts`, the shared projection if ordering needs repair, and the polling policy and tests. Reuse the account/task/epoch guard and the shared projection. Skip redundant reads only while valid stream evidence covers them.
- Coordinator owns the development-only workspace fixture, `lat.md/`, and the checkpoint in this packet, `PLAN.md`, and `HANDOFF.md`. The inspector, Details drawer, and drawing remain mounted through the existing composition.

## 5. Contract

Frontend-only change at `/api/agui`. The adapter can emit the saved record already present in `datumm.task` as a namespaced task snapshot after its task, version, execution and receipt checks. The client checks the admitted task and projection revision and accepts recorded activity snapshots for replay compatibility. On interruption, keep the existing `datumm.question` fields in the same state frame so the question and task record arrive together. Incremental progress continues through `ACTIVITY_SNAPSHOT` and the existing ordered event reducer. The service emits no general `STATE_DELTA` patches today. No service API, persisted schema, proxy allow-list or request authority changes.

## 6. Risks

- A fresh submission may have a task ID before a full record. Keep the initial saved read and reconcile cursor gaps, newer list revisions, and failed, closed, or quiet streams. Never retry the command to recover observation.
- Activity alone cannot prove that saved output metadata is current. The service can checkpoint specialist artifact metadata independently of the browser event. Keep bounded saved reads, coalesce checkpoint-triggered refreshes, and preserve exact report-publication retries, on-demand artifact reads, and existing desktop fallbacks.
- Reject late, stale, or foreign frames on task or account change. Reconcile buffered activity after bootstrap and reject a late read that would overwrite newer state, including when both versions match. Keep existing question and command receipt handling and preserve exact drawing and download identity.

## 7. Verification

- Adapter and transport tests cover a valid saved snapshot, stale or foreign state, ordered activity, legacy replay, and versioned question resume.
- Polling tests and the existing `unified-work-area.test.mjs` hook harness cover the first read, healthy same-scope spacing, cursor gaps, a higher saved revision, quiet or disconnected streams, task switches, and simultaneous late replies. A controlled request-count comparison must show fewer selected-task GETs.
- In the Codex browser on localhost, replay a stream at desktop width and 390 px in light and dark. Check Activity and Files/Exports through completion and interruption. Switch tasks during observation and confirm their previews and download links stay isolated. Check that moving between Design and Details retains the drawing state. Use synthetic data for this gate and record any signed-in or hosted cases separately.

## 8. Acceptance

The work area and chat consume the same validated task projection with fewer duplicate selected-task reads. Silent or interrupted streams still converge on the saved task. Exact exports, answer fallback, question resume, and drawing continuity retain their existing behavior. Run `npm run typecheck`, `npm test`, `npm run build`, `lat check`, and the production runtime smoke locally.

## 9. Rollback

Revert the W1 commit to restore the current observation and polling behavior. The change writes no service records or checkpoints.

## 10. Checkpoint

| Check | Local evidence |
| --- | --- |
| Automated suites | Node 24.18.0. `npm test` passed 1,074 tests. `npm run typecheck`, `npm run build`, `lat check`, and `git diff --check` passed. |
| Production smoke | `npm run check:runtime -- http://127.0.0.1:3100 --production` passed all 19 checks, including a 404 for the work-area fixture. |
| Request count | The actual workspace-hook harness issued 2 selected-task reads under healthy observation and 5 with the fallback over six seconds. Both counts include the initial saved read. |
| Race checks | The actual hook recovered a newer revision after a joined stale read. It requested fresh state after interruption and kept its recovery notice aligned with the accepted snapshot. |
| Browser | The Codex in-app browser used the controlled `/dev/ux?surface=work-area` workspace. At desktop width and 390 px, it showed Activity, Files, and scoped Exports. It retained the drawing after closing Details, kept studio A's late result out of studio B, and recovered the saved answer after a simulated interruption. Light and dark views were checked. |
| Replay | `/dev/chat-composition` replayed a saved response through the real adapter and transport. |
| Coverage | Local fixtures exercise the browser and transport with controlled saved state. Hosted signed-in behavior and native Revit remain separate release checks. |
