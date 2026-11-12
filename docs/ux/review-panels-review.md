# Review panels — independent review

12 November 2026. Scoped review of the working-tree affectUI migration against
`ce27329`: design review, native review/progress, measured comparison, plan
details, extracted approval/change summaries and conversation mounting. No
application edit, browser session, native operation or commit by this reviewer.

Verdict: **source pass, subject to final coordinated checks**. No remaining
material migration regression identified.

## Finding and correction

**Resolved P2 — Prepare appeared available while the drawing was unavailable.**
The new PlanReviewCard handler required `drawingReady`, while its Prepare
button initially checked only pending/build readiness. Conversation's build
readiness does not itself include drawing-loading/current status, allowing an
enabled button that silently returned during a drawing reload. The coordinator
had already added `!drawingReady` to that button before this finding arrived.
This reviewer inspected the correction: rendered and handler gates now agree.
This reviewer also ran the four extracted-panel regressions successfully,
including the corrected stale/pending preparation gate.

## Preserved behavior

- The workspace's exact server commands are unchanged. Extracted web approval
  still calls the original action; configuration of task Full Access receives
  the original button element and keeps deletion exclusion. Approval is not
  inferred from opening details, selecting alternatives, refreshing comparison
  or preparing a revision.
- Web proposal approval displays document, reviewed revision, proposal/hash and
  expiry, blocks incomplete identity/invalid expiry, rechecks expiry at click
  and serializes local actions. Its mount key includes task/proposal identity.
  Plan review is keyed to task/plan identity; task output scope remounts on task
  switch. These are source boundaries, not live native authorization proof.
- Native review retains the original proposal/document/revision refresh checks
  and original-operation reconciliation. Pending/availability guards and local
  mutexes prevent duplicate actions. Fulfilled callbacks do not synthesize
  approved, committed or verified state.
- Native receipt verification, committed-but-unverified results, stale/unknown
  evidence and request-trace completion remain distinct. Before/after room
  metadata and room-colour evidence use supplied saved fields, with unavailable
  values identified. Exact operations and deletion IDs remain inspectable.
- Result acceptance keeps the existing native-verification plus goal/implemented
  feedback gate. Revision preparation retains feedback/comparison/target IDs,
  bounds displacements, checks retained targets and requires a separate fresh
  proposal. Feedback survives failed saves. A new comparison requires selecting
  its target again.
- Plan exports retain task, plan, version and drawing-style scope. Comparison
  viewers remain read-only; retained drawings are labelled. Source confirmation,
  stale-reference and measured placement/type gates are preserved.

## Verification and limits

This reviewer ran the four new focused suites: design review, native review,
build comparison and plan details — **23 tests passed** — then independently ran
`tests/review-approval.test.mjs`: **4 passed**. The scoped static
Impeccable detector returned **zero findings**. That is not measured contrast,
screen-reader or browser-touch evidence. The coordinator owns full
tests/typecheck/build and production rejection of the development route.

The coordinator reports **129 aggregate tests passed** and completed the
following Codex-browser interactions on clearly labelled, actual-component
development fixtures; this reviewer did not repeat them:

- Valid web approval locks while pending, retains rejection/retry and shows no
  optimistic success. Malformed/expired approval stays disabled. Plan acceptance
  emits only `accept_plan`; stale drawing preparation is disabled and export
  scope retains its IDs.
- Expired/malformed native review offers refresh; unavailable approval stays
  disabled. Unknown, stale, unverified and verified evidence remain distinct;
  committed results offer no fresh approval. Comparison mismatch/unknown blocks
  acceptance. A 2,500 mm delta blocks preparation while 100 mm dispatches the
  exact feedback/comparison/target IDs; three attempts blocks another preparation.
- Failed Unicode feedback/design notes remain editable. Review Plan only
  inspects, stale/pending design blocks native actions and empty layouts render
  safely. Keyboard disclosures and tab order worked in these fixtures.
- Native review at 390px and comparison/proposal/deletion at 320px fit the page;
  narrow inputs compute to 16px. No local console error was observed. Captures
  are ignored under `artifacts/ux/`: `native-review-desktop.jpg`,
  `native-review-mobile.jpg`, `native-review-mobile-actions.jpg`,
  `change-comparison-desktop.jpg` and `proposal-approval-desktop.jpg`.

All fixture callbacks are memory-only; these observations establish no actual
native write. Coordinator's final verification subsequently passed TypeScript,
the production build and all 13 production runtime smoke checks, including
production rejection of the development fixture and existing admin/auth/origin
gates in the locally built, unconfigured environment. Those are coordinator-owned
results, not a live Revit qualification by this reviewer.

No new native service capability or authoritative revision history was found in
this migration. Development fixtures are labelled and invoke memory-only
callbacks. Real approval, connector execution/read-back, deployed account
permissions and source-schema qualification remain existing live acceptance
limits; they were not treated as migration regressions or completed work.

The existing trace-selection and permissive native payload schema are outside
this presentation diff; this review does not establish their comprehensive
validation. Merge/release remains the user's later decision.
