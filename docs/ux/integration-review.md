# Integration slice review

Reviewed 12 November 2026 against the working changes above web HEAD
`2f6c9b8131ae0758c2d987833a413801bd3ec730`.

## Scoped verdict

Pass for the local implementation checkpoint after the two corrections below.
No unresolved P0/P1/P2 finding was identified in this review's source boundary.
This is not production or end-to-end Revit acceptance, merge approval, or a
WCAG conformance claim. Release still requires the explicit checks below.

The boundary was the new `/connect` page, device authorization helper/UI,
report schema adapter/UI, its workspace transition, and integration evidence
documents. Existing unrelated workflows and backend source were not changed.
Impeccable's Operate/craft guidance informed the rendered review. REA guidance
supports ordinary repository analysis here; no external REA runtime was needed.

## Material findings and corrections

| Finding | Impact | Final disposition |
| --- | --- | --- |
| P2: Switching from an answer output to Schedules & BOQ used the normal output close operation, which queues focus restoration to the old conversation opener. | That restoration could compete with the new report heading's focus and move keyboard navigation back into chat. This was a source-derived lifecycle finding, not a witnessed browser reproduction. | Corrected by the implementation owner: `dismissOutput()` removes the output without scheduling restoration, and the BOQ transition uses it. Normal explicit output closing retains its existing restoration. Final source inspected in `workspace.tsx` and `output-workspace.tsx`. |
| P2: Report source/export copy suggested reopening checked updated model data. | The audited export reconstructs saved task evidence; reopening does not read the current Revit model. The earlier copy overstated freshness. | Corrected by the implementation owner: source details now explain saved evidence and request a new agent model read for current quantities; the CSV note explicitly says refresh does not reread Revit. Final source inspected in `review-report.tsx`. |

## Verified implementation boundaries

- Device authorization validates one bounded URL-safe request ID before any
  request and carries only a relative `/connect?request=...` sign-in return URL.
  Duplicate or malformed query values do not reach the service.
- Loading/sign-in only reads the authorization request. The deliberate Allow
  click alone sends the approval POST. The browser never starts authorization,
  sends a verifier, claims a connector token, grants native access, or submits a
  native operation. Success copy distinguishes authorization from connection.
- The authorization view is keyed by Clerk subject and request; unmount aborts
  its pending fetch. Aborted results are discarded. Already-approved copy does
  not claim that the current account owns or approved the device.
- The web account entry keys the workspace by Clerk subject. The output provider
  resets on task identity; the report loader remounts on task/version identity
  and aborts obsolete requests. Report results cannot be retained under a new
  task by that loader. This is source evidence, not a live account-switch test.
- Report fetching uses the existing authenticated root-task export alias.
  Dataset `runId` remains the execution identity and is shown as Report
  execution. A different execution ID is permitted; artifact metadata must bind
  to the parsed dataset. Returned download paths are discarded, never linked.
- Source model revision and source plan version remain source metadata. The UI
  does not synthesize report revision history, a current-artifact pointer,
  editable rows, or native approval from those values.
- The adapter bounds bytes, rows and text, preserves absent evidence as null,
  rejects mistyped numeric fields and foreign report-artifact bindings, and
  exports all retained table rows with provenance. CSV textual formulas are
  neutralized while typed negative measurements remain numbers. The 200-row
  visual preview is labelled separately from retained-table CSV size.
- The report has loading, empty, access, unavailable/configuration, error and
  retry states. Tabs expose selected state, roving keyboard focus and panel
  labels; the horizontally scrolling table is keyboard reachable. Header focus,
  Escape close and report-trigger restoration are implemented.

## Evidence and limits

Reviewed source: `src/app/connect/page.tsx`,
`src/components/connections/device-authorization.tsx` and its CSS module,
`src/lib/device-authorization.mjs` and declarations/tests,
`src/lib/review-report.mjs` and declarations/tests,
`src/components/workspace/review-report.tsx` and its CSS module,
the workspace/output integration, account entry, existing authenticated proxy,
and the backend/connector evidence documents. Existing API authorization and
same-origin mutation checks remain in the request path.

Viewed ignored captures `artifacts/ux/boq-review-desktop.jpg`,
`boq-review-mobile.jpg` and `connect-unconfigured.jpg`. The report captures use
explicitly labelled synthetic data; the narrow capture demonstrates contained
horizontal table overflow and wrapping metadata at its captured scroll position.
These images support layout observations only, not keyboard/touch execution or
authenticated connection success. Final copy corrections occurred after them.

The coordinating task reported 70 tests and TypeScript passing before the final
two corrections; the final production build and post-correction verification
remain owned by that task. This reviewer did not repeat those checks. A live,
existing proposed report was downloaded read only and successfully parsed by
the coordinating task; its ignored private payload was not opened or copied by
this reviewer. That sample qualifies the proposed/empty shape only.

[Backend evidence](backend-contract-evidence.md) correctly separates current
production health/configuration from historical source and the isolated hosted
OpenCode preview. AWS hosting does not itself establish the OpenCode runtime.
[Connector evidence](connector-auth-evidence.md) distinguishes connector device
authorization from the separate desktop account broker. Public health/source
identity is not an end-to-end authentication or native capability test.

## Required acceptance still outstanding

1. On the actual configured environment, verify a connector-generated
   verification URI, Clerk sign-in/sign-up return, deliberate device approval,
   connector-only one-use token claim and connected status. No real device was
   authorized during this implementation review.
2. Exercise expiry/consumption, lost approval response, account switching and
   revocation with controlled accounts/devices; ensure none silently approves
   another request or infers native permission.
3. Qualify authenticated measured and verified reports, including partial
   evidence, unknown quantities and saved-task updates. Current-model freshness
   requires a new read; immutable BOQ revision history remains a backend
   dependency.
4. Complete final post-correction tests/typecheck/build and keyboard smoke of
   answer-output → BOQ, report close and task switching. Broader accessibility,
   physical touch and native execution acceptance were outside this review.

No deployment, commit, backend mutation, token claim or native write was
performed by this review.
# Final integrator verification

After the reviewed corrections, the integrator ran the full 71-test suite, TypeScript, production build and extended production runtime smoke successfully. The replacement-output focus behavior has a passing regression test. The final desktop BOQ capture was refreshed after copy corrections. A browser-downloaded synthetic CSV was checked for both element rows and model-revision metadata. No live device approval or native model operation was performed. These checks supplement, rather than broaden, the review's stated live-integration limits.
