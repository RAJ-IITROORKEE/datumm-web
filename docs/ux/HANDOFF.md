# DATUMM handoff

Updated 12 November 2026. Branch `codex/ui-ux-foundation-2026-11-12`.

## Latest acceptance and recovery checkpoint

Continued the approved release-verification phase using GPT-6.1 Sol high agents for draft recovery, onboarding hardening and independent acceptance review. The next local reliability slice is implemented:

- Signed-in text drafts recover by account and task/project in this browser for seven days, with bounded storage and explicit memory-only feedback when storage fails or limits apply. Uploads and recognizable credentials are excluded from persistence; this is not a credential detector or cloud draft sync. Unconfigured/preview sessions remain memory-only. Admission clears only the captured submitted revision. Newer local edits survive; another owner's newer persisted draft cannot be removed or moved by a late response.
- Service bootstrap failure now explains why the workspace is disconnected and offers Retry connection. Existing text and saved view stay available. Same-task background updates preserve the current report snapshot, tab, details and focus; reopening reloads saved execution evidence.
- Onboarding explains missing fields/interests, focuses the relevant field or error, prevents duplicate pending saves, and keeps Unicode entries after failure. Inputs use 16px text on narrow screens. Display and global Escape handling respect the active layer.

Browser acceptance used the Codex in-app browser. Actual local workspace: desktop, 390px and 320px, unavailable-service retry preserving the exact typed draft, Settings/Billing/Activity navigation, keyboard expansion of Pro details and disabled paid actions. Synthetic development fixtures: unchanged-text streaming completion enables export; malformed Mermaid exposes source and Retry; a 1,200-row BOQ renders 200 preview rows but downloads all 1,200; same-task report updates preserve Elements/source details without a new fetch or stolen focus; unavailable report recovery; report ArrowRight/Home/Escape; Unicode onboarding failure/retry, required interests and optional connector Skip. Display Escape restored its trigger and left Focus drawing active. Full real inspector nesting remains a source-inspected guard, not a witnessed failure.

Independent [acceptance review](acceptance-audit.md) identified and verified correction of stale-owner draft confirmation and provisional-identity transfer races. Persistence tests cover exact revisions, identical re-edits, account isolation, expiry, limits, unavailable storage and interleaved owners. Browser draft reload under a configured account remains live acceptance work; the local environment has no Clerk/orchestrator credentials. Successful service reconnect, actual Google saves, connector authorization, measured/verified Revit exports and native execution are not claimed by synthetic fixtures.

Final checks: **88 tests passed**, TypeScript passed, final production build passed, and all 11 production runtime smoke checks passed (app/pricing, configuration/auth gates, rejected writes/unsupported routes, invalid connector recovery and production-404 dev fixture). The temporary production server was stopped afterward. Captures are ignored under `artifacts/ux/`: `service-recovery-desktop.jpg`, `diagram-recovery.jpg`, `onboarding-save-recovery.jpg`, `onboarding-validation-mobile.jpg`, `billing-keyboard-mobile.jpg`, `report-acceptance-desktop.jpg`. The existing design sidecar was refreshed for current field states without replacing DESIGN.md. Source-only Impeccable detection found no primary issues; five advisory notes concern local onboarding type/focus-radius values, not measured accessibility. Doctor's sole remaining advisory is an unset future marketing build preference; app work remains code-first.

Next plan dependency: connected-environment acceptance with real Google/profile, streaming/reconnect, Revit connector and measured reports. Immutable BOQ revisions and paid subscriptions still need authoritative backend contracts. No push, merge or deployment is included in this checkpoint.

## Latest integration checkpoint

Implemented `/connect?request=...` from the actual Revit connector contract. Sign-in preserves the request; loading only reviews it. A deliberate Allow action authorizes the computer through the existing endpoint. Connector start/token claiming and native model approvals remain separate. Invalid/expired/already-approved/unavailable requests have explicit recovery. No real device was authorized during this task.

Added **Schedules & BOQ** to the saved-task work area when the service does not explicitly exclude report export. It reads the existing schema-1 report JSON and presents BOQ/element tables, source document/model revision, partial coverage and limitations. Visual tables omit wholly unspecified columns; CSV preserves the typed retained data and provenance, including numeric negative values. Preview rendering is bounded to 200 rows; the validated dataset limit is 10,000 rows / 2 MiB. Unsupported exports show an unavailable state. Refresh reloads saved task evidence and does not reread Revit.

Read-only verification established current production behind AWS CloudFront exposes `datumm-orchestrator` contract v2 at source commit `2aace05d66e4789eab403fa03be7571a53980ed4`. The separate hosted OpenCode preview reports `nativeAvailable:false` and isolated canary history. Earlier Azure-location notes are stale; no environment/origin was changed. Vercel CLI supplied no secret key to the local check, so this is not evidence that the deployed key is absent. An existing authenticated production report was downloaded through the browser and parsed successfully: proposed source, zero measured BOQ/element rows. Private payload remains ignored and is not committed.

Final checks: **71 tests passed**, TypeScript and production build passed, extended production runtime smoke passed including `/connect` recovery, anonymous device-authorization gate and production-404 dev fixtures. Browser checks covered invalid/unconfigured connection pages plus clearly labelled synthetic desktop/mobile BOQ tables, tabs and actual CSV download. Download contents were checked against source metadata and fixture rows. The new scoped design detector returned zero primary/advisory findings. Independent [integration review](integration-review.md) identified two issues (replacement focus and live-model freshness copy); both were fixed and the scope passed. Screenshots: ignored `artifacts/ux/boq-review-desktop.jpg`, `boq-review-mobile.jpg`, `connect-unconfigured.jpg`.

Read [backend contract evidence](backend-contract-evidence.md) and [connector authorization evidence](connector-auth-evidence.md) before changing integrations. Sibling repositories were read-only; their existing work was preserved. Payment collection and immutable BOQ revision history still require explicit backend contracts. Connected Google/profile persistence, a real connector authorization, and measured/verified report qualification remain live-environment acceptance work. No push, merge or deployment occurred.

## Previous UI implementation checkpoint

The user approved development and subsequent pricing additions. The earlier planning-only statements in phase packets are historical. Application development is authorized; push/merge/deployment remain later decisions.

Implemented locally:

- Stable navigation/chat/right work area, same-mounted-viewer Focus drawing, narrow Chat / Work area navigation, contextual properties/activity and one Ask/Plan/Build composer.
- Streamdown completion-state rendering, strict Mermaid diagrams, side-by-side answer outputs and scoped answer-table CSV export. Output history reflects real saved answers; it is not an authoritative BOQ revision service.
- Google-first configured Clerk sign-in, profile/domain/grouped interests, optional connector setup/Skip, durable Clerk private-metadata profile storage, resume and existing-user bypass. Profile editing is available in Settings.
- affectUI-derived theme, self-hosted Inter, preserved saved palettes, coherent settings and admin appearance, current-task usage and pricing.
- Public `/pricing` and Settings Billing: current Free tier, planned Pro **$20/month**, Max **$99/month**, individuals only. Higher/highest usage and Max priority processing are explicitly planned. No paid checkout or invented numerical quota.

Verification: **59 tests passed**, TypeScript passed, final production build passed. Production runtime smoke passed for app/pricing, rejected cross-origin/missing-origin writes, unsupported routes/attachments, profile unavailable gate and production-404 development fixture. Updated the smoke test's obsolete unsupported-project route: project listing is already supported by the existing proxy; its unsupported workspace child remains rejected. `npm audit --omit=dev --audit-level=low` reported zero vulnerabilities after pinning the Mermaid transitive KaTeX dependency to patched 0.18.2.

Browser evidence: actual local workspace at desktop and 390px; mobile Settings/Usage/Billing and Activity; synthetic dev-only plan/output/onboarding fixtures for 2D/3D, focus retaining 125% zoom, annotation save/context handoff, Pro details and pricing stacking. Screenshot files are in ignored `artifacts/ux/`; actual paths include `workspace-desktop.jpg`, `workspace-mobile.jpg`, `onboarding-usecases.jpg`, `onboarding-connector.jpg`, `review-3d.jpg`, `annotation-review.jpg`, `activity-mobile.jpg`, `settings-mobile.jpg`, `pricing-desktop.jpg`, `pricing-mobile.jpg`, `billing-desktop.jpg`, `billing-mobile.jpg`. The Billing phone screenshot was recaptured after viewport settling; the independent reviewer confirmed 390×844.

Independent review: [implementation-review.md](implementation-review.md). Two navigation/focus regressions were fixed and scored resolved; pricing received a scoped source/visual pass. [DESIGN.md](../../DESIGN.md) and `.impeccable/design.json` describe the built tokens/components. The first scoped detector pass returned no findings; the subsequent new pricing scan reported advisory type/radius documentation differences, after which tiny badges/radius were aligned and intentional pricing type steps documented. No suppressions were added. Final doctor reports only an unset future marketing/showcase build preference; Operate app surfaces remain code-first, and no unrelated preference was silently stored.

Live limits: no local Clerk/orchestrator credentials. Google provider, actual profile persistence against Clerk, AWS OpenCode streaming/export/reconnect, Revit authorization/execution and metering need connected-environment verification. D9 immutable BOQ revisions/full provenance require a verified backend contract; the UI does not fabricate one. Payment provider, exact quotas, subscriptions/webhooks and paid entitlements are still undefined. Annotation storage remains browser-local to the exact plan version. The dev fixture route returns 404 in production.

Next: review the local result with the user; connect the verified service environment, validate live journeys and agree backend revision/payment contracts. Preserve current native approval paths and do not merge/release implicitly.

## Read first

1. PROJECT.md: baseline, authority and overall scope.
2. PLAN.md: approved decisions D1–D10, component URLs, provisional phases and packet rules.
3. Only the relevant evidence/specification: current-state.md, reference-observations.md, structured-output.md or onboarding.md.

## Phase ledger

| Phase | Outcome | Remaining |
| --- | --- | --- |
| Foundation | Isolated branch; nine repository skill directories with provenance; PROJECT.md; main preserved | No implementation started. |
| Discovery round 1 | Live saved plan/2D/3D/settings examined; affectUI shell/chat/model/progress/settings and public tokens inspected | Full state, keyboard and mobile audits remain. |
| Decisions round 1 | D1 stable chat/right work area; D2 compact activity | Exact pane sizing and inspector behavior. |
| Decisions round 2 | D3 review/annotation first; D4 one Ask/Plan/Build composer | Detailed viewer controls and user Revit screenshot. |
| Structured-output round | Streamdown playground/export menu/fullscreen diagram verified; existing 2.6.0 renderer inspected; D6 reports/tables/diagrams and D7 agent-updated schedules/BOQ approved | Output revision workflow and backend artifact/extraction contract. |
| Onboarding round | D8 Google sign-in first, name/domain, multiple use cases, optional Revit connector with Skip for now, then workspace | Proposed taxonomy, field rules, profile persistence and detailed reference interactions. |
| Revision/account round | D9 automatic-current non-native sheet/BOQ revisions with history; D10 individual accounts first | Exact revision persistence and billing/usage scope. |
| Toolkit repair | Installed Codex Impeccable hook; updated PRODUCT.md to current schema using confirmed facts; doctor returned no findings | Automatic hook execution depends on Codex loading/trusting the manifest; not demonstrated by the doctor check. |
| Parallel source planning | Sol 6.1 high agents wrote packets/workspace.md, integration-contracts.md and packets/onboarding-account.md; coordinator reviewed and indexed them | Confirm remaining interaction decisions and verify deployed contracts before source implementation. |
| Specification | PLAN.md and PRODUCT.md created with observed evidence separated from proposals | DESIGN.md, journey details, contracts and approved implementation packets are not complete. |

## Earlier planning follow-up

Discuss the proposed onboarding domain/use-case taxonomy, individual-account billing/usage and remaining viewer details in small question rounds. First-use step order, automatic-current output revisions with history, and individual-account scope are already approved. Do not revisit D1–D10 unless new information requires it.

Then inspect the chosen onboarding/settings/account references and verify actual AWS OpenCode capabilities. Resolve individual billing/usage scope; team invitations/roles are already deferred. User may provide a Revit screenshot; do not invent its contents.

Use the packet index in PLAN.md. W-D/I4 are one activity workstream and W-A/I6 one shell integration stream; do not assign competing owners. Verified gaps: annotation storage is browser-local; profile/onboarding persistence is absent from current proxy surface; generic immutable artifact revisions are not established; existing export routes still need live format/data verification. These are implementation dependencies, not blanket claims that the current product is broken.

## Historical planning guardrails and verification

- During the original planning phase no UI source/dependency change or native run was made. The approved implementation above supersedes that boundary; push/merge/deploy are still excluded.
- Source reviews and browser observations are evidence; no new-baseline test/build pass is claimed.
- Browser tabs for live DATUMM, affectUI and Streamdown were preserved. Revit disconnected; live DATUMM restored to saved plan's 2D view.
- Streamdown already exists; Mermaid plugin is not currently configured. MessageResponse's text-only memo comparator needs attention when adding state props.
- Public-share image restrictions and native approval authority must survive the redesign.
- Latest user instruction selects GPT-6.1 Sol with high reasoning for sub-agents, replacing earlier Terra preference. Three agents developed planning packets in parallel with exclusive file ownership. Application implementation still requires plan approval.
- Ponytail keeps scope and handoffs compact. Impeccable doctor now reports no findings after product-schema repair and hook installation; final DESIGN.md remains intentionally pending. REA guidance is installed; external REA analysis server is not configured.

After each phase update this ledger with decisions, artifacts, actual verification and the next unresolved question. Never turn a proposal into an approved requirement without the user's answer.
