# Admin and Settings review — 12 November 2026

Coordinator's final acceptance: 102 aggregate tests, TypeScript, production build and 13 production runtime checks passed. Anonymous/unconfigured admin entry remains 404 and admin config remains gated; development previews return 404 in production. Browser caught and rechecked a narrow settings grid conflict at 320/390px; the scoped placement correction passed, as did actual local workspace Settings search/Usage focus at 390px. These are coordinator-owned results, not repeated live service tests by this reviewer.

Scope: affectUI migration of the admin shell, configuration/data sections,
personal Settings navigation and synthetic component preview. Read-only source
review; no application edit, browser session, service mutation or commit by
this reviewer. Merge/release remains a separate decision.

## Finding

**P2 — Older resource responses can replace newer post-mutation data.**
`src/components/admin/use-admin.tsx`, `useAdminResource`/`load`, accepts every
completed GET without request ownership. While Knowledge is polling an indexing
source, delete it and complete the post-delete reload first; an older pending
poll can then resolve and put the removed source back into the table. This is a
retained issue in the touched loader, not a newly introduced UI regression.

Independently reproduced by executing the actual transpiled hook with controlled
request completion: newer refresh produced `[]`, then the older request restored
`[{id:"old",status:"indexing"}]`. Discard obsolete completions with a request
generation/lifecycle guard; cover the reversed completion order. The correction
now uses an active path/client owner and incrementing request sequence. This
reviewer inspected it and reran the late-response/path/client/unmount regressions
successfully.

The follow-up correction also prevents the 4-second Knowledge interval from
superseding its own slow pending GETs. Timer ticks now skip while the current
owner's latest request is pending; explicit refresh can still supersede an
older read. This reviewer inspected the final guard and ran regressions for
slow polling completion, reversed completion order, development effect replay,
path/client changes and unmount. **Finding resolved.** The original timing
scenario was hook/source evidence, not a live-service browser reproduction.

## Boundaries and positive findings

- Actual admin layout still requires a primary verified email in ADMIN_EMAILS;
  service requests still obtain the Clerk token through the authenticated
  same-origin proxy. No gate or backend authorization change was found.
- The injectable admin client defaults to the existing network client. Its
  in-memory alternative is confined to the labelled dev preview; the dev route
  still rejects non-development environments in source. Production runtime
  rejection remains the coordinator's check.
- Configuration writes preserve the captured expected revision. Duplicate saves,
  edits and reload during a pending save are blocked; invalid/failed/conflicting
  edits remain available until explicit reload. The form disables editable
  fields and save actions while pending. Helpers and errors remain associated
  with controls; chip entry respects composition.
- Knowledge actions use one immediate busy guard, retain failure feedback and
  keep delete confirmation deliberate. The preview's operations affect fixture
  memory only. Server persistence and actual indexing are not established by it.
- Personal Settings adds section search/grouping and heading focus on selection
  without fabricating model names/providers. Billing remains planned and usage
  remains task-scoped. MCP copy explicitly distinguishes stored configuration
  from active agent tools. Native changes still require exact approval.

## Verification

This reviewer ran `node --test tests/admin-config-editor.test.mjs
tests/settings-navigation.test.mjs`: **12 passed** after the request-ownership
correction. The scoped source detector
reported **0 primary findings and 16 advisory token-documentation notes**, several
from existing Settings values. These are not measured contrast/accessibility
results and were not promoted to material bugs.

The coordinator reports browser checks on labelled actual-component fixtures:
pending config Save disables editing, success settles cleanly, conflict retains
the edited value 5, invalid value 0 disables Save and explicit Reload resets the
form; admin sidebar widths are 64px collapsed and 232px expanded. Subsequent
fixture interactions verified source-search empty/clear, adding a Unicode source
and clearing fields, Delete then Cancel retaining its row, skill validation and
successful save, MCP enabled-in-configuration save retaining the stored-only
warning, no Save for missing/forbidden data, Web search save failure retaining
value 7, and mobile drawer Escape restoring its trigger followed by section
navigation. This reviewer did not repeat those interactions. Final full
typecheck/build and production runtime checks remain owned by the coordinator.

Scoped verdict: **pass, subject to the coordinator's final build/runtime
checks**. The retained resource-response issue and slow-poll follow-up are
resolved. No remaining material source finding was identified. Synthetic
browser success does not qualify real administrator mutations, live indexing
or deployed account permissions; those boundaries remain explicit above.
