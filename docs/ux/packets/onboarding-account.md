# Onboarding and individual account packet

12 November 2026. Planning only; application implementation is not approved. Surface mode: Operate. Read [onboarding](../onboarding.md), [PLAN](../../../PLAN.md), [PRODUCT](../../../PRODUCT.md) and [PROJECT](../../../PROJECT.md). Guidance: installed Impeccable onboarding playbook; the coordinating agent owns context/doctor. This packet records source inspection, not verification of deployed services.

## Approved goal and scope

D8: **Google sign-in → name and professional domain → multiple use cases → optional Revit connector download/connection with Skip for now → workspace**. A connection must not block reaching useful web Ask/Plan work. Proposed first value: start a real Ask/Plan task and understand its reviewable result; the launch audience and exact starter task remain decisions.

D10: **individual accounts first**. Omit organizations, membership roles, invitations, team billing and organization switching from launch. Existing system-admin authorization stays separate from an individual's profile. D9: generated output revisions become current automatically with history; native changes retain exact proposal approval and execution/verification boundaries.

Excluded: auth replacement, harness migration, new provider credentials, billing-provider integration, native test operations, speculative working use cases, tour-library installation and merge/release. Implementation requires approval of the plan revision and reading relevant local Next.js documentation before code.

## Exact reference map and evidence

Use affectUI's approved initial colors/typography through the shared token owner. No browser inspection was performed for this packet. Existing [reference evidence](../reference-observations.md) observes Preferences navigation only; the other references below are catalog discoveries, not completed interaction audits.

| Surface | Exact references | Behavior still to inspect |
| --- | --- | --- |
| First run | <https://www.affectui.com/screens/onboarding>, <https://www.affectui.com/components/stepper-form> | Step navigation, validation, focus, persistence and narrow layout. D8 controls DATUMM's step order. |
| Optional setup/first value | <https://www.affectui.com/components/setup-guide>, <https://www.affectui.com/screens/assistant-home> | Skip/retry/help, completion semantics, empty state and real starter actions. |
| Individual settings | <https://www.affectui.com/screens/settings-preferences>, <https://www.affectui.com/screens/settings-profile>, <https://www.affectui.com/screens/settings-models>, <https://www.affectui.com/screens/settings-security> | Preferences navigation was observed; forms, dirty/save states, security scope and dismissal still need inspection. |
| Usage | <https://www.affectui.com/screens/agent-usage>, <https://www.affectui.com/components/usage-meter> | Context capacity vs usage, time range, freshness and unknown/partial data. |
| Commercial | <https://www.affectui.com/screens/settings-subscription>, <https://www.affectui.com/blocks/pricing-plans> | Conditional later scope; no copied demo prices, plan or checkout. |
| Members | <https://www.affectui.com/screens/settings-members> | Future reference only under D10. |
| Admin | <https://www.affectui.com/screens/settings-general>, <https://www.affectui.com/screens/integrations>, <https://www.affectui.com/screens/agent-permissions>, <https://www.affectui.com/screens/agent-activity> | Adapt only existing global functions after verifying permission and API contracts. |

Later built-in-browser inspection records date/viewport/theme/auth, actual capture path, entry action, focus/keyboard, dismissal/Back, scroll and persistence. Keep observation, documented behavior and recommendation separate. The existing ledger has no saved screenshot filenames; do not invent capture links.

## Existing source and capability map

Paths are exact repository-relative paths. Existing means implemented in this frontend; deployment support remains unverified.

| Surface | Sources and current contract | Consequence |
| --- | --- | --- |
| Entry/auth | `src/app/page.tsx`, `src/components/workspace-entry.tsx`, `src/lib/auth-gate.mjs`: Clerk loading/signed-out/open gate, `<SignIn routing="hash"/>`, immediate `Workspace key={userId}` after sign-in | Insert first-run decision after verified identity; retain account remount isolation. Google-first provider order/configuration is not established by source. |
| Session/transport | `src/app/layout.tsx`, `src/proxy.ts`, `src/lib/backend.ts`: configured Clerk provider, API mutation same-origin check, bearer auth, validated HTTPS backend, no-store; 401 without session, 503 without auth config | Reuse identity and server ownership. Auth-unconfigured currently opens the shell but service calls fail; that is not completed account setup. Preserve public `/share/*`. |
| Proxy | `src/app/api/service/[...path]/route.ts`: GET/POST/PUT/DELETE allowlist, `/v1` config/devices/admin, `/v2` tasks/projects | No profile/onboarding/preferences/billing/members/account-usage endpoint currently allowed. Do not call invented APIs or claim localStorage is durable account completion. |
| Settings `/#settings` | `src/components/desktop-settings.tsx`, `src/components/workspace.tsx`, `src/components/workspace/use-workspace-state.ts`, `src/lib/settings-navigation.mjs` | Embedded General, Account & connections, Models, Appearance, Revit, Workspace capabilities. Domain/use-case editing is new. Coordinate section URLs/Back with shell owner. |
| Local preferences | `src/components/workspace.tsx` saves send shortcut, canvas input, persistent properties; `src/components/theme-settings.tsx`, `src/lib/appearance.ts` save appearance/density/scale to browser localStorage | These are not account-synced. Follow-up behavior/mm units are fixed disabled controls. D4 shared composer supersedes floating canvas input; coordinate migration. Do not make fixed controls appear functional. |
| Account/lifecycle | `src/components/workspace/sidebar.tsx`: Clerk name/avatar, archived chats, connections, delete all chats, sign out. `src/components/desktop-settings.tsx`: Clerk `UserButton` | Delete all chats is not account deletion. Verify enabled Clerk profile/security/session behavior before promising it; avoid duplicating identity-managed controls. |
| Desktop admission | `src/components/account-admission.tsx`, `src/lib/desktop-contract.ts` and workspace state | Desktop admission and fixture/local-test identity stay separate; never persist fixture completion to a hosted profile. |
| Models | `GET /api/service/config` → `/v1/config`; `RuntimeConfig` in workspace state supplies models/default model/effort | Use real catalog. No verified account-default-model persistence exists; global defaults belong to admin. |
| Download | `public/downloads/release.json`, `src/components/plugin-setup-guide.tsx`, `src/components/workspace.tsx` | Reuse metadata/checksum. Source says Windows x64/Revit 2026, unsigned alpha.40; metadata explicitly leaves live 2026.5 unqualified. Verify launch matrix rather than expanding support claims. |
| Connection/status | `GET /api/service/devices` → `/v1/devices`; `Device` in workspace state contains `id/name/online/fullControl` and scoped grants. `GET devices/:id/context` returns typed `{sessionId,observedAt,context}` | Empty/offline/connector-online/active-document-ready are different. Current refresh couples config/devices/history; setup needs an independently recoverable device check. Verify readiness schema and freshness before native starters. |
| Authorization | Visible setup instructs Revit Connection Settings → Sign in with browser → authorize computer. Proxy allows `device-authorizations/:id[/approve]` | No corresponding authorization page/consumer was found in this frontend. Verify deployed route/deep link, account binding, expiry and return behavior. Do not auto-approve a device during wizard completion. |
| Legacy pairing | Workspace state retains POST `pairing` returning `{code}`, while visible setup says no pairing code is needed | Do not reintroduce a code step from an unused helper/allowlist entry. |
| Disconnect/grants | Workspace state uses DELETE `devices/:id`, POST/DELETE `devices/:id/control`; workspace UI describes scoped Full Control | Reuse disconnect semantics in settings. Onboarding never enables Full Control, creates a grant or approves a proposal. |
| Task usage | `src/components/agent-memory.tsx`: `ContextUsageData`/`ContextUsage`; `src/components/agent-activity.tsx` checks `rootTaskId`; task `data.usage` supplies context estimate, cumulative tokens/cost, coverage, timestamp | Missing is unavailable, not zero. Context-window estimate differs from cumulative usage; provider cost differs from billed customer charge. No account-period aggregation contract found. |
| Budget/spend | `src/components/task-outcome.tsx`, `src/components/agent-activity.tsx`: `RunManifest` reservations/reported costs. `src/components/admin/data-sections.tsx`: admin `usdToday` | Reserved budget, partial provider cost, global admin spend and customer invoices are different. Never derive billing/quotas from these. |
| Admin authority | `src/app/admin/layout.tsx`, `src/lib/admin-access.mjs`: verified primary-email allowlist; backend subject enforcement documented. `src/components/admin/use-admin.tsx` handles missing/forbidden/stale/error | Retain separate `/admin` gate and verify backend permissions with direct unauthorized requests. Discipline/use-case choices never grant a role. |
| Admin API | `src/components/admin/config-sections.tsx`, `src/components/admin/data-sections.tsx`, `src/lib/admin-config.mjs`: GET/PUT `admin/config` with `expectedRevision`; GET overview/audit; knowledge-source add/delete/reindex | Global models/budgets/concurrency/search/skills are not personal preferences/entitlements. Preserve conflict recovery. MCP explicitly stores configuration without activating tools; Plugin page is deployed metadata/download, not release publishing. |

## Proposed persistence contract: backend addition

Choose one authoritative professional-profile owner: authenticated DATUMM service or controlled Clerk metadata. Avoid conflicting dual writes. Clerk remains identity authority. A proposed logical record, not an approved route/schema:

```ts
type AccountSetup = {
  schemaVersion: 1;
  revision: number;
  profile: { displayName: string; professionalDomainIds: string[]; useCaseIds: string[] };
  onboarding: {
    version: number;
    completedSteps: ('profile' | 'use-cases')[];
    connectorChoice: 'not-decided' | 'skipped' | 'connected';
    completedAt: string | null;
  };
  updatedAt: string;
};
```

Domain cardinality remains undecided; the array does not approve a multi-domain UI. Professional domain means discipline, not email/website domain. Stable catalog IDs are separate from labels. Saved connector choice never substitutes for live readiness.

Required contract semantics:

- Read/save partial steps/complete a version for the authenticated subject; server checks ownership and resolves subject. Never accept client-written admin/entitlement/provider fields.
- Prefill identity name only when no DATUMM value exists. Decide DATUMM display name vs Clerk name updates. Preserve Unicode names; no forced Western first/last split. Do not collect employer/phone/credentials.
- Validate IDs, bounds and Other text server-side. Save acknowledged steps before advancing; use revision checks. Retry/double-submit/lost responses must not duplicate completion or overwrite newer edits.
- Proposed completion: saved profile/use cases plus explicit Skip or Continue after verified connection. Failed checking never blocks Skip. Decide profile-service-unavailable fallback before introducing first-run gating.
- Reload resumes incomplete setup; completed users return to saved workspace/task. Agree existing-account and future-version migration rather than unexpectedly replaying the wizard.
- Optional draft cache is account/version-scoped and isolated on sign-out/account switch. Local cache cannot authorize completion, privileges or billing; existing global localStorage keys are not account storage.
- Handle session expiry, denied access, missing routes, validation, revision conflict and offline/5xx separately. Preserve edits on failure; never display Saved for an unacknowledged write.
- Preserve validated same-origin task/settings/connector return destinations through OAuth/setup. Finish must not auto-send a prompt, consume a pending device approval or accept native work.

## Screen behavior and state matrix

Proposed post-auth step labels: **About you · Your work · Connect Revit (optional)**. Avoid an extra ceremonial welcome screen or blocking tour.

| Screen | Ready/loading/empty | Failure/recovery/completion |
| --- | --- | --- |
| Sign in | Continue with Google; concise value statement; session-loading state before branching. Other methods only if configured/approved | Cancelled/failed/unavailable OAuth offers retry/help and preserves safe return route. Redirect alone is not verified account admission. |
| About you | Editable prefilled name, labelled discipline choice, why suggestions are tailored; load saved values without blank-form flash | Inline errors, failed-save Retry with input intact, explicit conflict reconciliation. Back does not silently submit. |
| Your work | Grouped native-checkbox multi-select, selected count; search only if warranted; use proposed taxonomy in onboarding.md pending review | No-results offers clear search; unknown/retired choice can be corrected without clearing other choices. Future interests visibly differ from supported actions. Required min/max/Other remain decisions. |
| Connect Revit | Download/current release/checksum, already-installed guide, Check connection, prominent Skip. Distinguish no device, offline, checking, connector online/no document, ready | Download click never claims installation. Wrong account/expired authorization/multiple devices/missing bridge/document get specific help. Check failure permits Retry or Skip. Continue grants no native authority. |
| Workspace first use | Explain saved projects/chats, provide one real starter action, modest relevant icon/preview and contextual help | Starter fills editable shared composer; user sends. Unsupported service gives recovery, not a dead-end demo. Relevant connection reminder respects dismissal. No mandatory first project unless agreed task requires one. |
| Profile/preferences | Same authoritative profile/use cases; visible local-vs-account persistence; verified Clerk security controls | Dirty/saving/saved/error/unavailable/conflict; preserve drafts and restore workspace when returning. Agree unsaved-exit behavior. |
| Usage | Task usage with source/timestamp/coverage, unknown and partial labels | Preserve stale data with Retry after failed refresh; wrong-task data is not rendered. No fabricated quota/billing total. |
| Admin | Existing permission/loading/missing states and real global functions | Preserve 403 backend authorization, 404 unavailable backend, 409 conflict, failed save and retry; unsaved config never appears active. |

Accessibility/responsiveness:

- Real labels, fieldset/legend for options, inline errors linked by `aria-describedby`/`aria-invalid`; focus error summary after blocked submission. Selection cannot rely only on color.
- Focus the step heading after user navigation, never on polling/autosave. Use `aria-current="step"`; Back/completed-step navigation preserves edits. Tab/Shift+Tab, Space checkboxes and appropriate Enter submit work without custom-key hijacking.
- Announce checking/saving/status politely and actionable failure as an alert; avoid polling chatter. Restore dialog trigger focus; verify Clerk modal focus/title/recovery behavior if retained.
- At 320 CSS px and 200% zoom stack options/actions, keep Back/Skip reachable, use page-height scroll and avoid nested traps. Support long names/localization/reduced motion. Check final token combinations, focus and target sizes against WCAG 2.2 AA.

## Honest launch scope

| Area | Proposed initial boundary | Expansion dependency |
| --- | --- | --- |
| Profile/settings | Individual name/discipline/interests; existing functional preferences and Clerk account controls; identify browser-local storage | Approved profile/name ownership and persistence; migration/precedence for any sync or personal model defaults. |
| Revit | Install/help/check/select/disconnect with truthful readiness; exact approval outside setup | Verified authorization handler, supported versions and session/context freshness. |
| Usage | Preserve real per-task context/tokens/provider cost with coverage/timestamp | Account-period dashboard requires server aggregation, metric definitions, timezone, reconciliation, permissions, entitlements/limits and export contract. Client-summed history is not authoritative. |
| Billing | No invented plan/price/trial/invoice/checkout. If an agreed navigation entry exists, explain unavailable status without inert purchase actions | Approved provider/prices/charging unit, server entitlements, signed webhooks, sandbox checkout/portal, cancellation/proration/invoices/tax/failure policy. Separate commercial packet later. |
| Members | Omit under D10 | Separate future team product/authorization model. |
| Admin | Preserve gated overview/config/knowledge/skills/MCP/release metadata/audit | Verify deployed endpoints/global authority; no new activation/publishing capability inferred. |

## Delivery dependencies and ownership

1. Confirm taxonomy, validation, first-value task, completion/migration and profile authority. Verify Google provider, actual connector authorization route and live device/context schemas with designated accounts.
2. Agree shell route/Back/account handoff and shared tokens. Backend owner specifies authenticated profile read/write/revision contract; backend changes require their own approved scope.
3. After implementation approval, onboarding owner may create `src/components/onboarding/*` and an agreed profile client module. Integrator exclusively edits shared `src/components/workspace-entry.tsx`, `src/components/workspace.tsx`, `src/components/workspace/use-workspace-state.ts`, `src/components/workspace/sidebar.tsx`, `src/components/desktop-settings.tsx` and `src/app/api/service/[...path]/route.ts`. Resolve ownership before parallel edits.
4. Coordinate existing `src/components/plugin-setup-guide.tsx`/`src/lib/plugin-setup.mjs` with native-authority owner; release metadata remains release-owner work. Reuse connection authority rather than forking it.
5. Validate complete flow/account switching and preserved auth/share/admin/native boundaries; capture sanitized rendered before/after evidence. Billing and team work stay separate.

## Acceptance and verification

These are requirements for later implementation; no application tests were run for this planning-only file.

| Journey | Pass condition |
| --- | --- |
| New user skips | Google identity verified; name/domain and multiple choices durably saved; Skip reaches workspace; supported Ask/Plan works; no connector grant/native operation. |
| Connect | Current release/checksum used; download alone stays disconnected. Verify ready, online/no document, wrong account, expired authorization and multiple devices. Continue grants no write authority. |
| Resume/retry | Reload each step, Back, offline save, double Continue, lost response and stale revision preserve valid data/idempotent completion. Completed users bypass setup. |
| Existing account/return route | Agreed migration preserves saved task/workspace; no accidental repeat setup; `/share/*` remains independently accessible under existing rules. |
| Account isolation | Expiry/sign-out/account B cannot expose account A's progress/drafts/profile. Cross-account writes/direct admin requests denied server-side. Desktop fixture stays isolated. |
| Capability honesty | Selecting automation/takeoffs never enables unavailable starters. Missing profile/catalog/usage routes show unavailable recovery. Skip retains native connection guidance at point of use. |
| Settings | Same profile record updated; global admin config unchanged; failed/conflicting/unsaved edits recover; workspace draft/context restored on return. |
| Usage/commercial | Unknown ≠ zero; partial coverage/freshness visible; reservation ≠ billed spend; no fake quota/invoice/member UI. |
| Accessibility | Keyboard/screen reader through OAuth return, errors, checkboxes, Back/Skip/help/settings; rendered narrow viewport/zoom, focus/contrast/reduced-motion checks. |

Extend relevant existing suites when their behavior changes: `tests/auth-gate.test.mjs`, `tests/plugin-setup.test.mjs`, `tests/service-proxy.test.mjs`, `tests/admin-access.test.mjs`, `tests/admin-proxy.test.mjs`, `tests/share.test.mjs`. Auth-gate currently asserts source shape tied to immediate Workspace rendering; replace that fragile assertion with first-run/returning-user behavior. Add meaningful persistence/state tests for resume, conflicts, idempotency and isolation. Run required repository checks and designated-account browser journeys on the candidate; native writes are unnecessary for onboarding verification.

## Pending decisions

- Review onboarding.md taxonomy; domain cardinality, required use-case minimum/maximum, Other and retired IDs. Confirm launch-supported workflows separately from interests.
- Confirm audience/first useful task and starters from real capabilities. Numeric time-to-value goals and optional analytics/retention policy are undefined.
- Decide profile owner/name authority, API/revision contract, validation limits, existing-account migration and profile-service-unavailable fallback.
- Decide whether profile/use-case steps have any optional fields beyond the already-approved connector Skip. Do not infer mandatory project creation or a blocking tutorial.
- Verify Google/production auth, safe return routes, actual device-authorization handler, Revit matrix and device/document freshness.
- Decide local-vs-account preferences/model defaults and lifecycle/deletion/retention policy before adding new account controls.
- Decide account-period usage/commercial launch scope; provider/pricing/quotas/billing authority remain unknown. Individual-only scope is already settled by D10.

Handoff: only this planning packet is owned/changed; no application code, installs, browser state, live account, native operation, billing transaction or commit changed. Unverified: full affectUI behavior, deployed Google/profile/authorization APIs, connector support and commercial metering.
