# Onboarding and individual account packet

12 November 2026. Planning only; no application implementation approval. Surface mode: Operate. Read with [onboarding](../onboarding.md), [PLAN](../../../PLAN.md), [PRODUCT](../../../PRODUCT.md) and [PROJECT](../../../PROJECT.md). This packet uses the installed Impeccable onboarding playbook; the coordinating agent owns the session context/doctor run. Source inspection below does not establish deployed service behavior.

## Goal, decisions and boundaries

Deliver D8: **Google sign-in → name and professional domain → multiple use cases → optional Revit connector download/connection with Skip for now → workspace**. Explain the difference between a useful web task and a native Revit operation without forcing a connection to enter the workspace. Proposed first value: start a real Ask/Plan task and understand its reviewable result; the exact starter task and launch audience remain product decisions.

D10 confirms **individual accounts first**. Do not add organization switching, invitations, membership roles or team billing to the initial release. Existing system-admin authorization remains separate from an individual's profile. D9 makes generated output revisions current automatically with history; onboarding does not create another approval step for those outputs. Native changes retain exact proposal approval and execution/verification boundaries.

Excluded: authentication replacement, harness migration, provider credentials, billing-provider implementation, native test operations, speculative use-case promises, installing tour libraries, custom account deletion, organization features and merge/release. Future implementation requires approval of the plan revision, verified contracts and local Next.js guides before source edits.

## References and evidence

Use affectUI's approved initial colors and typography through the shared design-token owner. Exact responsive spacing and all interactive behavior below still require built-in-browser inspection; no new reference/browser inspection was performed for this source-audit packet.

| Exact reference | Evidence already recorded | Adaptation and behavior to inspect |
| --- | --- | --- |
| <https://www.affectui.com/screens/onboarding> | Catalog only | Step hierarchy, content width, progress, Back/Continue, persistence and scroll. D8 controls DATUMM's order. |
| <https://www.affectui.com/components/stepper-form> | Catalog only | Focus on transition, validation, completed-step navigation and narrow layout. |
| <https://www.affectui.com/components/setup-guide> | Catalog only | Optional setup, install/connection distinction, dismissal and retry. |
| <https://www.affectui.com/screens/assistant-home> | Catalog only | First-use empty state and useful starter actions; do not copy unsupported suggestions. |
| <https://www.affectui.com/screens/settings-preferences> | Existing ledger observed Personal/Workspace groups and return-to-app navigation | Dirty/save/cancel behavior, keyboard navigation, scroll ownership. Adapt to individual scope. |
| <https://www.affectui.com/screens/settings-profile> | Catalog only | Name/profile edits and identity-managed fields. |
| <https://www.affectui.com/screens/settings-models> | Catalog only | Real catalog, default semantics, unavailable models. |
| <https://www.affectui.com/screens/settings-security> | Catalog only | Identity-provider session/security boundary. |
| <https://www.affectui.com/screens/settings-members> | Catalog only | Future reference only under D10; no launch members screen. |
| <https://www.affectui.com/screens/settings-subscription> | Catalog only | Conditional later scope; no fictitious plan, price or checkout. |
| <https://www.affectui.com/screens/agent-usage>, <https://www.affectui.com/components/usage-meter> | Catalog only | Usage vs context capacity, time range, freshness, unknown/partial readings. |
| <https://www.affectui.com/blocks/pricing-plans> | Catalog only | Future commercial reference, dependent on approved pricing and entitlement contract. |
| <https://www.affectui.com/screens/settings-general>, <https://www.affectui.com/screens/integrations>, <https://www.affectui.com/screens/agent-permissions>, <https://www.affectui.com/screens/agent-activity> | Catalog only | Admin presentation only after permissions/API verification; no new tools inferred from stored configuration. |

For each later inspection, record URL/date/viewport/theme/auth state, actual capture path, entry action, keyboard/focus, dismissal/Back, scroll and persistence. Keep observed behavior distinct from documentation and proposals. The current [reference ledger](../reference-observations.md) has no saved screenshot filenames; do not invent evidence links.

## Existing implementation and service map

Paths are repository-relative exact paths. Existing means source-backed, not live-endpoint verification.

| Surface/control | Current source and contract | Planning consequence |
| --- | --- | --- |
| Web entry `/` | `src/app/page.tsx`, `src/components/workspace-entry.tsx`, `src/lib/auth-gate.mjs`; Clerk `useAuth` loading/signed-out/open gate, modal `<SignIn routing="hash"/>`, `Workspace key={userId}` immediately after sign-in | Add first-run decision after identity is established. Verify Google provider configuration; source does not specify Google-first ordering. Keep account remount isolation and loading state. |
| Provider/session | `src/app/layout.tsx` wraps configured builds in `ClerkProvider`; `src/proxy.ts` applies Clerk middleware and same-origin checks on API mutations | Reuse Clerk. Auth-unconfigured currently opens the shell, while service calls return 503; never describe that shell as a signed-in account or completed setup. Preserve public `/share/*` behavior. |
| Authenticated transport | `src/lib/backend.ts` uses Clerk bearer token, validated HTTPS `ORCHESTRATOR_URL`, no-store; no token → 401, no auth config → 503 | New profile storage must use authenticated identity and server ownership, not client-supplied subject. Hosted AWS contract still needs verification. |
| Same-origin proxy | `src/app/api/service/[...path]/route.ts` allowlist exposes GET/POST/PUT/DELETE, `/v1` config/devices/admin and `/v2` tasks/projects | No profile/onboarding/preferences/billing/members/account-usage route currently allowed. A new UI cannot claim persistence by calling an invented endpoint. |
| Personal settings `/#settings` | `src/components/desktop-settings.tsx`; `src/components/workspace.tsx`; `src/lib/settings-navigation.mjs`; settings hash handled by `src/components/workspace/use-workspace-state.ts` | Embedded sections today: General, Account & connections, Models, Appearance, Revit, Workspace capabilities. Coordinate URL/Back/section selection with shell owner. Profile domain/use-case editor is new work. |
| General preferences | `src/components/workspace.tsx` writes `datumm-send-shortcut`, `datumm-canvas-input`, `datumm-persistent-properties` to localStorage; follow-up mode and mm units are disabled fixed controls | Label browser-local persistence honestly. D4's shared composer supersedes the competing canvas input, so coordinate its removal/migration with composer owner. Do not make disabled unit/follow-up controls appear functional. |
| Appearance | `src/components/theme-settings.tsx`, `src/lib/appearance.ts`, `src/components/workspace/use-workspace-state.ts`; localStorage appearance/density/scale, contrast/motion read at workspace startup | Existing browser preferences are not account-synced. Any migration to account storage needs precedence/migration rules; preserve a readable theme before auth hydration. New theme rollout belongs to token owner. |
| Account menu | `src/components/workspace/sidebar.tsx`: Clerk name/avatar, archived chats, connections, delete all chats, sign out. `src/components/desktop-settings.tsx`: Clerk `UserButton` | Delete all chats is not delete account. Verify enabled Clerk profile/security/session controls in test accounts before promising them. Do not duplicate identity-managed email/password/session flows. |
| Desktop admission | `src/components/account-admission.tsx`, `src/lib/desktop-contract.ts`, workspace state | Desktop sign-in/account admission and fixture/local-test identity are separate. This web packet must not change their semantics or mark fixture progress as a hosted account's onboarding. |
| Models | `GET /api/service/config` → `/v1/config`, `RuntimeConfig` in `src/components/workspace/use-workspace-state.ts`; actual models/default model/effort from service | Display only the service catalog and supported controls. Current initial selection is per workspace lifecycle; no verified account model-default persistence exists. Global defaults belong to admin. |
| Connector install | `public/downloads/release.json`, `src/components/plugin-setup-guide.tsx`, `src/components/workspace.tsx` | Reuse release metadata and checksum link. Source currently describes Windows x64/Revit 2026, unsigned `0.5.0-alpha.40`; metadata says live 2026.5 unqualified. Re-verify supported launch matrix rather than extending it by inference. |
| Connector discovery | `GET /api/service/devices` → `/v1/devices`; `Device` fields `id`, `name`, `online`, `fullControl`, optional scoped grants in workspace state | Empty device list, known offline device and connector online are distinct. Current refresh loads config/devices/history together; onboarding needs an independently recoverable device check so a history/config failure is not misreported as no connection. |
| Context/session readiness | `GET /api/service/devices/:id/context` → `/v1/devices/:id/context`, response typed `{sessionId,observedAt,context}`; workspace currently polls selected context when current-model use is enabled | Do not label an online connector as an open active Revit document. Verify schema/freshness/session readiness and document access before any native starter. No need to grant write access merely to complete setup. |
| Authorization/reconnect | UI in `src/components/workspace.tsx` and setup guide instructs Revit → Connection Settings → Sign in with browser → authorize computer; proxy allows `device-authorizations/:id[/approve]` | Source does not contain the corresponding authorization page/consumer. Verify actual deployed browser/deep-link flow, account binding, cancellation and expiry before designing it. Preserve approved pending return routes; do not consume an authorization token as ordinary onboarding progress. |
| Legacy pairing | Workspace state retains `POST /api/service/pairing` → `/v1/pairing`, returning `{code}`; current visible guide says no pairing code needed | Existing allowlist/helper is not evidence to reintroduce a code step. No competing pairing mechanism in D8. |
| Disconnect/control | `DELETE /api/service/devices/:id`; POST/DELETE `devices/:id/control`, existing scoped Full Control description in `src/components/workspace.tsx` | Reuse disconnect/reconnect semantics in settings. Do not enable Full Control, create a grant or approve a proposal in onboarding. Broader grant UI changes require the native-authority owner. |
| Task usage | `src/components/agent-memory.tsx` `ContextUsageData` and `ContextUsage`; `src/components/agent-activity.tsx` selects matching `rootTaskId`; task `data.usage` through task/history responses | Keep context-window estimate separate from cumulative provider tokens/cost, measurement state, coverage and `updatedAt`. Missing data means unavailable, not zero. No account-period aggregation contract found. |
| Budgets/cost | `src/components/task-outcome.tsx`, `src/components/agent-activity.tsx` use `RunManifest` reservations/reported costs; `src/components/admin/data-sections.tsx` admin overview `usdToday` | Reservation, partially reported provider cost, admin spend and billed customer charge are different. Never derive an invoice or a plan allowance from these fields. |
| Admin | `src/app/admin/layout.tsx` verified primary-email allowlist gate, documented backend Clerk-subject admin enforcement; `src/lib/admin-access.mjs`; `src/components/admin/use-admin.tsx` | Keep separate `/admin` authority. Hiding a link is not authorization. Confirm backend enforcement with unauthorized-account API checks. Never derive role from onboarding discipline. |
| Admin resources | `src/components/admin/config-sections.tsx`, `src/components/admin/data-sections.tsx`, `src/lib/admin-config.mjs`; GET/PUT `admin/config` with `expectedRevision`; GET `admin/overview`, `admin/audit`; source add/delete/reindex under `admin/knowledge/sources` | Preserve revision-conflict recovery and missing/forbidden states. Global run budgets/concurrency/search/skills are not personal preferences or subscription entitlements. |
| Admin integration/release | `/admin/mcp`, `/admin/plugin` via the above files and `src/app/admin/plugin/page.tsx` | MCP configuration explicitly says stored only, not active tools. Plugin page is deployment metadata/download, not an upload/publish mechanism. Do not imply activation or release management APIs exist. |

## Proposed account persistence contract — backend addition, not approved API

Before implementation, choose whether DATUMM's authenticated profile service or controlled Clerk metadata owns professional profile/preferences. Avoid dual writes to both with conflicting values. Clerk remains the authority for identity; professional domain means discipline, not an internet/email domain. No additional employer, phone or credential fields are required.

The service contract must support reading the current account profile; saving a partial step; reading saved progress; and atomically completing the current onboarding version. A proposed envelope for review is:

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

This proposes shape, not a route or required multi-domain UI. `professionalDomainIds` cardinality remains undecided. Use stable option IDs and a versioned catalog, keeping labels separate. No unrestricted entitlement/role fields may be accepted from the client. Connector readiness stays live service data: a saved `connected` choice must never assert present readiness.

Required semantics for the eventual contract:

- Server resolves account from the verified session; ownership checked on every read/write. Do not allow arbitrary account IDs or write access to admin/provider/billing fields.
- Prefill editable display name from identity when no DATUMM value exists. Decide whether this is DATUMM-only display name or also updates Clerk; do not silently rename the identity profile.
- Validate trimmed names, stable domain/use-case IDs, length bounds, unknown IDs and optional Other text on the server. Exact limits/minimum selections await product agreement. Preserve unfamiliar names, Unicode and assistive input; do not require a Western first/last split.
- Save successful steps durably before advancing. Include `expectedRevision` or equivalent compare-and-swap; handle conflicts explicitly. Double Continue and retry after a lost response must not duplicate completion records or overwrite newer profile edits.
- The proposed terminal completion occurs after acknowledged profile/use-case saves plus an explicit connector choice (Skip or Continue after verified connection). A failed connector check never blocks Skip. Product must agree how to handle an unavailable profile service before first-run gating ships.
- Reload resumes the first incomplete step; Back preserves edits/selections. Returning users with a completed current version reach their saved task/workspace. Define migration for existing accounts and future onboarding versions; do not force all returning users into a new wizard by accident.
- Account-scoped local cache may preserve unsaved drafts if required, keyed by subject and onboarding version, cleared/isolated on account change. It cannot be the authority for completion or entitlements. Current global localStorage preference keys must not be mistaken for account persistence.
- Handle 401 as session recovery; 403 as access denied; missing/unsupported route as unavailable; validation failure inline; revision conflict as reload/reconcile; offline/5xx as retry with edits intact. A failed save must not display Saved or complete setup.
- A valid pending internal task/settings/connector return route survives OAuth and setup; validate it against supported same-origin destinations. On finish resolve the intended route without auto-running a prompt, approving a device, or accepting native changes.

## Screen/state specification

Proposed step labels after identity: **About you · Your work · Connect Revit (optional)**. Avoid an extra ceremonial welcome screen or blocking feature tour. Keep step counts honest and introduce Ask/Plan/Build in context at the workspace.

| Screen | Ready/empty/loading states | Failure, recovery and success |
| --- | --- | --- |
| Google sign-in | Concise DATUMM value statement; Continue with Google; Clerk session-loading status before branching. Alternative identity methods only if configured and approved. | OAuth cancelled/failed/unavailable: specific retry/help and preserved safe destination; no account-created claim from browser redirect alone. Successful verified identity fetches account setup. |
| About you | Editable prefilled name; clearly labelled professional discipline; explain suggestion tailoring. Existing saved draft loads without flashing a blank form. | Inline validation tied to field; failed save preserves input, Retry; revision conflict retains draft while loading authoritative value for reconciliation. Back never submits silently. |
| Your work | Grouped native checkbox multi-select, selected count, stable IDs; optional search only when volume warrants it; no-results offers clear search. Use proposed taxonomy in onboarding.md until reviewed. | Unknown/retired choice can be changed without clearing remaining choices. Future interests visibly distinguished from launch-ready tasks; no selected interest grants capability. Required min/max and Other text remain decisions. |
| Connect Revit | Download + checksum/current release details, already-installed instructions, Check connection and visible Skip for now. Show no devices, offline device, checking, connector-online-without-document and verified-ready states distinctly. | Download click does not claim installation; browser cannot generally verify installer success. Check failure offers retry/help and Skip. Wrong-account authorization, expired request, offline bridge, multiple devices and missing document get specific actions. No native operation or grant on Continue. |
| Workspace first use | Show where saved chats/projects appear, why they help, one real starter action, modest relevant icon/preview and contextual help. Keep create-project optional unless the agreed task needs one. | Starter fills editable shared composer; user chooses Send. Service unsupported/unavailable gives useful explanation and recovery, never a dead-end demo. Connection reminder appears only where relevant; dismissal persists per account/version. |
| Profile/preferences | Reuse saved profile/choices for later editing; identify browser-local vs account-synced settings; identity/security opens verified Clerk controls. | Dirty, saving, saved, failed, unavailable and conflict states; preserve edits on failure. Decide exit-with-unsaved-changes behavior; restore workspace draft/task/selection on return. |
| Usage | Existing task usage may be shown as task usage with source, timestamp and coverage. Unknown/partial/stale readings remain labelled. | Failed refresh preserves last observation as stale with Retry; mismatched task usage is not rendered. No billing total, period quota or upgrade CTA from missing commercial data. |
| Admin | Existing gated routes/loaders and missing/forbidden states; separate global configuration from personal account. | 404 missing backend, 403 backend authorization, 409 config revision conflict, failed save and retry remain distinct; never show an unsaved config as active. |

Accessibility and layout requirements for later implementation:

- Use real form labels, fieldset/legend for domain and checkbox groups, descriptive inline errors with `aria-describedby`/`aria-invalid`, and an error summary focused after blocked submission. Selection cannot depend on color alone.
- Move focus to the new step heading after a user transition; do not move focus on background save/connection refresh. Mark current step with `aria-current="step"`. Completed-step links must have clear behavior and preserve edits.
- Standard Tab/Shift+Tab, Space for checkboxes, Enter submit where appropriate; no custom shortcut should hijack text entry. Keep visible focus and restore the trigger on help/settings dialog dismissal. If sign-in remains modal, retain accessible title/description and an explicit recovery path; verify Clerk's focus behavior.
- Use polite status for saving/checking/connected, alert for actionable failures, and avoid repeated polling announcements. Mark the affected region busy without trapping the whole application. Copy must distinguish access, installation and model-write approval.
- At 320 CSS px and 200% zoom, stack fields/options/actions, keep Skip and Back reachable, allow document-height scrolling and avoid nested scroll traps. Preserve long names, localization and text scaling. Validate WCAG 2.2 AA contrast/focus/target requirements using final shared tokens; respect reduced motion and retain text progress.

## Launch scope for settings, usage, billing and management

| Area | Proposed launch boundary | Prerequisite for expansion |
| --- | --- | --- |
| Profile | Individual name, discipline and selected interests editable after setup; reuse Clerk identity/security capabilities after verification | Approved authoritative persistence and name ownership; account lifecycle policy. |
| Preferences | Existing functional appearance/send behavior; preserve explicit device-local scope. Keep model choices tied to current real service catalog | Account-sync/default-model schema and migration if requested; no global admin config writes from personal settings. |
| Revit connections | Install/help/check/select/disconnect, readiness and account binding; keep native consent outside onboarding | Verified deployed authorization route, support matrix, session/context schema and stale thresholds. |
| Usage | Preserve meaningful per-task context/tokens/provider-reported cost with coverage and freshness | Authoritative per-account aggregation/period timezone, metric definitions, reconciliation, permissions, limits/entitlements and export contract before account dashboard. Do not sum history client-side as authoritative totals. |
| Billing | No fabricated plan card, subscription state, price, trial, quota, invoices or working checkout. If an agreed navigation entry must appear, explain unavailable status without an inert purchase action | User-approved provider/prices/charging unit, server entitlements, signed webhooks/source of truth, sandbox checkout/portal, invoices/tax/cancellation/proration/failure states and rollout. A later separate commercial packet owns these. |
| Members | Omit members/invites/roles/org switcher under D10 | Separate future team product and server authorization model; no current implementation work. |
| Admin | Preserve current gated overview/config/knowledge/skills/MCP/release metadata/audit. This packet documents dependencies, not an admin redesign commitment | Verify actual deployed endpoints and global authority. No personal use-case choice enables an admin permission, runtime skill or MCP tool. |

## Proposed delivery order and edit ownership

1. Confirm taxonomy, field validation, first useful task, completion/migration policy and profile authority. Verify Google provider, pending authorization route and live connector/service schemas using designated accounts. These are blockers for integration, not permission to implement now.
2. Agree shared tokens, shell route/Back behavior and account-load handoff. Specify authenticated profile read/write contract and server tests with the backend owner. Backend changes require their own approved scope.
3. After implementation approval, one onboarding/account owner may create `src/components/onboarding/*` and an agreed profile client module; exact names are proposals. Integrator exclusively edits shared `src/components/workspace-entry.tsx`, `src/components/workspace.tsx`, `src/components/workspace/use-workspace-state.ts`, `src/components/workspace/sidebar.tsx`, `src/components/desktop-settings.tsx` and `src/app/api/service/[...path]/route.ts` after contract agreement. Do not have concurrent workers mutate these shared files.
4. Reuse connector metadata/help/discovery rather than forking connection authority. Coordinate `src/components/plugin-setup-guide.tsx`, `src/lib/plugin-setup.mjs` and connection actions with native-authority owner; release JSON updates remain release-owner work.
5. Verify the complete account flow, account switching, profile settings and preserved existing auth/admin/share/native boundaries. Capture sanitized before/after evidence at agreed desktop/narrow viewports. Billing/team work stays separate.

## Acceptance examples and proportionate verification

These are later acceptance requirements, not tests run in this planning task.

| Journey | Pass condition and evidence |
| --- | --- |
| New Google user, Skip | Verified sign-in → saved name/domain → multiple saved choices → Skip → workspace. Zero connector grants/native operations; supported Ask/Plan task remains usable. Account service confirms completion and selections. |
| Connect path | Release download/checksum uses current metadata. Download alone stays disconnected. After browser authorization and server-observed readiness, Continue reaches workspace; no proposal approved. Test connected-no-document, multiple devices and wrong-account/expired authorization. |
| Resume/retry | Reload on each step restores acknowledged data and next incomplete step. Back preserves edits. Double submit, lost response, offline save and revision conflict cannot corrupt or duplicate completion. Returning completed user bypasses setup. |
| Existing accounts/version | Agreed migration preserves saved chats/task destination and avoids unexpected repeated setup. Public share links remain independently accessible according to current share rules. |
| Session/account isolation | Sign out or expiry mid-step preserves only the allowed account-scoped draft; account B cannot see account A's profile/draft/progress. Unauthorized profile writes and direct admin API calls fail server-side. Fixture desktop identity never becomes hosted setup. |
| Capability honesty | Selecting takeoffs/model updates does not enable unavailable starter actions. Missing model/catalog/usage/profile routes show unavailable recovery. Skip leaves native connection requirement discoverable at point of use. |
| Profile update | Settings saves domain/use-case changes to the same authoritative record, leaves global admin configuration unchanged, handles unsaved/failed/conflicting edits, and returns to the preserved workspace. |
| Usage/commercial | Missing readings show Unavailable; partial readings show coverage; last refresh is visible; reserved cost never becomes billed spend. No invented invoice, entitlement, usage quota or membership UI. |
| Accessible/responsive | Keyboard-only and screen-reader completion including OAuth return, errors, checkbox selection, Back/Skip, help dialog and settings; 320px/200% zoom, contrast, focus visibility and reduced motion verified on rendered UI. |

Extend meaningful contract coverage around `tests/auth-gate.test.mjs`, `tests/plugin-setup.test.mjs`, `tests/service-proxy.test.mjs`, `tests/admin-access.test.mjs`, `tests/admin-proxy.test.mjs` and `tests/share.test.mjs` only where behavior changes. The existing auth-gate test has a source-shape assertion tied to immediate Workspace rendering; replace that fragile assertion with actual first-run/returning-user behavior when implementing. Add state/persistence tests for resume, stale revision, idempotent completion and account isolation. Run repository-required checks and designated-account browser journeys on the actual candidate; no native write is needed to verify onboarding.

## Pending product/integration decisions

- Review the professional-domain/use-case taxonomy in onboarding.md; one or multiple domains, required selection minimum/maximum, Other behavior and retired choices. Confirm available launch workflows separately from future interests.
- Confirm launch audience and first-value task; decide starter suggestions using verified Ask/Plan/model capabilities. Numeric time-to-value/completion goals and optional analytics/retention policy are not defined.
- Decide DATUMM display name vs Clerk name ownership; account profile storage owner, API/version/revision contract, validation bounds, completed-state migration for existing users and unavailable-profile-service fallback.
- Confirm whether any setup steps besides the approved connector Skip are optional; D8 order is settled. Do not infer mandatory first project creation or a blocking tutorial.
- Verify Google provider/configuration, production auth readiness, allowed return routes and actual connector authorization handler. Confirm Revit support matrix, installation help, device/session freshness and active-document visibility.
- Decide browser-local vs account-synced personal preferences and default-model scope; identity/security/account deletion and data-retention policy need explicit review before new lifecycle controls.
- Decide whether initial release includes any account-period usage or commercial journey; provider, pricing, quotas and customer-billing source of truth remain unknown. D10 already settles individual-only scope; no further team-role decision is needed now.

Handoff: this packet is the only owned file changed. No app code, dependencies, browser state, live account, billing transaction, native operation or commit was changed. Unverified: full affectUI behavior, deployed Google/profile/authorization APIs, connector support and commercial metering.
