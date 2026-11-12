# Review, approval and change-summary migration

12 November 2026 · approved PLAN.md review decisions and D3–D7 · branch `codex/ui-ux-foundation-2026-11-12`.

## Direction contract

Mode: Operate. Audience: architects/BIM practitioners reviewing proposed geometry and exact native changes.

THESIS: Understand what is being reviewed and what each action authorizes before acting.

OWN-WORLD: The existing affectUI-derived neutral palette, self-hosted Inter, compact status, readable facts and quiet technical disclosures.

STORY: Review a plan, accept its identity and assumptions, prepare native changes, approve an exact proposal, then inspect committed and measured results as distinct states.

FIRST VIEWPORT: One titled review with status, source/version and concise changes. Exact native identity and expiry sit beside deliberate actions. Measured comparisons show expected/actual values; advanced payloads stay expandable. Narrow controls wrap within the panel.

FORM: seed: none (pinned). The user explicitly requested affectUI and the existing approved plan.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Reference mapping and evidence

| Reference | Observed in Codex browser | DATUMM adaptation |
| --- | --- | --- |
| [Approval Card](https://www.affectui.com/components/approval-card) | Inspected public pending/resolved preview, action title/context, facts, status and action row. Reset preview and Deny produced a denied state. The demo also replays autonomously; those transitions are not DATUMM service evidence. | Separate plan acceptance and exact native approval. Keep real proposal/document/revision/hash/expiry and pending/error handling. Do not add demo risk scores, countdown-pausing, Always allow, automatic approval or global approval shortcuts. Existing separately reviewed Full Access configuration is preserved. |
| [Change Summary](https://www.affectui.com/components/change-summary) | Inspected label/change rows and description-list semantics; reference is a metric recap rather than an exact geometry diff. | Count only supplied native operation kinds. Show actual saved comparison/diff text and expected/actual evidence. No invented percentages, measured quantities or BOQ revision service. |
| [Review Center](https://www.affectui.com/components/review-center) | Inspected queue, item context, uncertain evidence, details and deliberate decision controls. Filter controls were observed and exercised, but autonomous demo replay prevents treating the resulting queue as a stable test fixture. | Keep one current task/proposal scope and clear evidence/action hierarchy. Do not copy bulk approvals, risk/confidence ranking, Undo or a new multi-agent queue without backend support. |

No gated source was retrieved or installed. Existing React components and DATUMM callbacks remain the implementation source.

## Component and ownership ledger

- Shared `review/review-panels.module.css`: consistent panel, header/status, facts, actions, forms, details, errors and tables. Coordinator owns shared styling and conversation mounting.
- `review/proposal-approval.tsx`: hosted exact proposal panel, clock/click-time expiry guard, complete identity, local duplicate guard, explicit pending and failure states. Calls the existing `act('resume'|'refresh-proposal'|'cancel')`; the original server command still supplies proposal ID/hash/document/revision. Navigation to existing scope configuration preserves its focus trigger.
- `review/plan-review-card.tsx`: current plan identity, acceptance, mode change, preparation and placement navigation. Acceptance remains distinct from native dispatch; stale/loading/error drawings cannot accept or prepare. Callback success does not invent accepted/verified status.
- `review/change-summary.tsx`: supplied operation counts, exact deletion closure and retained native-bound evidence. Existing deletion identity/history remains accessible outside the pending approval condition.
- Sol 6.1 High native worker: `native-build-review.tsx`, `native-build-progress.tsx`, scoped native CSS and tests. Preserves exact identity, click-time expiry, original operation reconciliation, receipt coverage/limitations and distinction among unknown/stale/committed-unverified/verified results. Trace completion does not imply verified changes.
- Sol 6.1 High design worker: `design-review.tsx`, scoped CSS and tests. Keeps source/hash confirmation, revision/selection guards, explicit native build consequences, measured placement and loaded-type checks. Pending controls lock and duplicate callbacks are guarded.
- Sol 6.1 High comparison worker: `build-comparison.tsx`, `workspace/plan-details.tsx`, scoped CSS and tests. Preserves exact comparison/feedback/target IDs, native/goal acceptance gates, bounded revision preparations, saved-version identity, exports and read-only comparison viewers.

## State and acceptance requirements

Test proposed/accepted plan, missing candidate, loading/stale geometry, source mismatch, busy action, failed save, unavailable native controls, valid/expired/malformed proposal, no completion evidence, committed but unverified, stale/unknown receipts and verified outcome separately. Verify that opening details/reviewing alternatives never approves native work. Compare expected/actual rows, preserve Unicode feedback after failure, and block duplicate requests, invalid displacement and exhausted preparations. A correction preparation must require a fresh exact proposal before a native write.

Browser qualification uses clearly labelled synthetic actual-component previews under development-only `/dev/ux`. Callback logs are in-memory; they are not native execution or backend persistence. Production rejection, relevant tests, TypeScript, build, review verdict and actual capture paths are recorded in HANDOFF. Real connected Google/Revit journeys remain a separate release dependency; no push, merge or deployment is included.

Acceptance completed: 129 tests, TypeScript, production build and all 13 runtime smoke checks passed. Codex browser checks covered desktop/390/320px, keyboard disclosures, every approval/result state above, exact callback identity and failed Unicode draft recovery. The independent source review passed after correcting one Prepare availability mismatch. Captures and live-environment limits are in the latest HANDOFF.
