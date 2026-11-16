# Implementation Readiness review

Date: 12 November 2026. Target: `design_draft.md`, initial DetailedRange 304–460; FeatureRange 1–303 and three local reference/source/gap ledgers are technical context. All reviewers are fresh GPT-6.1 Sol High instances. Standard: Implementation Readiness, including exact write boundaries and zero independent design choices.

## Round 1 — not clean

| Reviewer | Status | Findings |
| --- | --- | --- |
| Implementation Readiness | Completed | IR9R1-1, IR9R1-2, IR9R1-3: three Majors. |
| Codebase Details | Completed | CB9R1-1, CB9R1-2: two Majors; first duplicates IR9R1-1. |
| Style | Completed | SY9R1-1: one Nit. |

All confirmed full persona/standard/target/context reads. Readiness/Codebase inspected current production interfaces, Node/TypeScript/VM test infrastructure, repository rules and installed Next guides. No edits, tests/builds, browser/network, environment/secret inspection, prior-report/history access or delegation by reviewers.

### Findings

- **IR9R1-1 / CB9R1-1 — Major, M2 lines 357–361:** `/connect` independently uses the publishable key alone, but is absent from the shared-readiness file manifest. With a public key and missing secret it could mount Clerk hooks without the revised provider. Include its server page and safe boolean mapping; test a valid authorization request with partial configuration. Preserve invalid-request precedence and deliberate authorization.
- **IR9R1-2 — Major, fixed interfaces/M3/M5 lines 313–315, 321, 367–395, 443:** section/preview/projection interfaces, identity/deduplication and activation callbacks are semantic requirements rather than fixed signatures. Freeze owner/export locations and discriminated destinations, preserve existing owners/epochs, provide buildable M3 placeholders and explicitly authorize M5 integrator mounts in workspace/Inspector.
- **IR9R1-3 — Major, M1/M6 lines 320, 343–351, 401–407:** free-source pinning is explicit but wrapper composition and prop mappings are not. Existing Button/asChild/variants, native input/select and compound Radix APIs differ from upstream exports. Specify per-role composition, minimal source patches, exact callers and assertions; preserve real tool statuses/duration/payload and existing action authority.
- **CB9R1-2 — Major, Assets lines 321, 389–395:** `reviewAlternative` loads then POSTs authoritative plan selection. It is not a readonly preview opener. Restrict ordinary preview to the exact loaded drawing; show unloaded candidates as preview-unavailable and offer separately labelled Review/select alternative, or design a separate loader. Add a no-selection-POST regression for ordinary navigation.
- **SY9R1-1 — Nit, M8 line 425:** “output/report modules already assigned in M5” is not an exact file subset. Enumerate the intended four renderer/module paths.

Resolution: **PROPOSE FIX for all**, within the selected architecture. Detailed contract supplements are being authored; no production implementation is being changed. Applied changes and fresh review verdicts follow below.

## Round 1 repairs applied

M2 now fixes the safe configuration shape and all seven current server callers, including `/connect`, with partial-configuration/valid-request precedence checks. Backend/profile/admin changes are limited to the shared unavailable guard; authority and metadata remain intact. M8 enumerates the four renderer/module files.

[Work-area contracts](docs/ux/work-area-contracts.md) defines exact M3/M5 types, scopes, callback/preview ownership, projection identities/deduplication and readonly versus explicit alternative actions. M3 owns the type seam/buildable placeholders; M5 integrator mounts are in the exact manifest. [Adapter contracts](docs/ux/affectui-adapter-contracts.md) fixes per-role compositions, patches/callers and semantic rules; M1 adopts 22 pinned files, omitting unnecessary NumberInput/ProgressTracker copies. M6 semantic vendor/output writes are explicitly authorized and serialized. These are authored plan changes, not independent review verdicts or production edits.

Fresh round 2 target bounds: FeatureRange 1–303, DetailedRange 304–470, including both normative supplements and the hash-verified ignored raw source snapshot as reading context.

## Round 2 — not clean

All three reviewers **completed** full persona/standard/combined target/context reads. Readiness and Codebase verified source callers and all 24 raw hashes/license. Style found one Nit; Readiness found two Majors; Codebase found two Majors. No Blockers, failed reviewers or excluded execution.

- **IR9R2-1 — Major:** M3 removes public `reviewAlternative` but its PlanDetails caller is assigned to M5. **PROPOSE FIX — applied:** M3 explicitly authorizes minimal PlanDetails/test rewiring; `PlanDetailsSelectionProps` supplies provider scope and the shell-guarded callback. M5 retains the visual split. No temporary bypass is exported.
- **IR9R2-2 — Major:** M5's required PlanDetails/report props leave two fixture callers outside its write manifest. **PROPOSE FIX — applied:** allow exact props-only review-preview/ux-preview edits in M5 and specify synthetic scope, surface, openId, no-op callback and retained fake fetcher. Production-404 still applies.
- **CB9R2-1 — Major:** upstream Button's JS width animation checks only OS reduction; CSS cannot honor the application preference alone. **PROPOSE FIX — applied:** explicit M1 OS+dataset guard, active Animation cancellation on changes/unmount, narrow observer/listener lifecycle and independent preference tests. Bootstrap restores the existing reduction setting on every route.
- **CB9R2-2 — Major:** upstream ToolCallCard parses/reserializes JSON-looking strings, losing duplicate keys or integer precision. **PROPOSE FIX — applied:** `toText` preserves every string verbatim for render and copy; add large-integer/duplicate-key/whitespace cases. Actual structured values retain JSON formatting.
- **SY9R2-1 — Nit:** supplement says M1 still has a 24-copy list after narrowing it. **PROPOSE FIX — applied:** agree with the current 22-file manifest; two sources stay reference-only.

Round 2 is not clean before these fixes. Fresh review is required; the authored repairs alone are not a pass.

## Round 3 — not clean

All three fresh reviewers **completed** required reads/source checks. Style reported no findings. Readiness reported IR9R3-1/IR9R3-2, two Majors. Codebase reported CB9R3-1, duplicating the first. No Blockers or Nits.

- **IR9R3-1 / CB9R3-1 — Major:** M1's strict v2 parser conflicts with the unmodified hook's legacy storage reader, especially when writes fail. **PROPOSE FIX — applied:** authorize only the hook's appearance import/reader in M1; freeze `readAppearance` return/failure/migration behavior and use it for bootstrap-equivalent hydration, ThemeSettings and system changes. Readable legacy mode survives failed writes; save cannot overwrite an unbacked legacy record. Add actual hook/bootstrap/system-event failure cases.
- **IR9R3-2 — Major:** original SegmentedControl explicitly requests smooth JS scrolling under reduction; CSS does not cancel that request. **PROPOSE FIX — applied:** normative M1 patch uses instant reveal under app or OS reduction, cancels in-flight scrolling on preference changes, restores active option/pill immediately and cleans listeners/timers. Focused independent preference tests and patch provenance are required.

The transport-answer binding is also made explicit: admitted selected ID, no old snapshot rebinding, guarded obsolete streams and partial provenance until authoritative completion. These clarifications preserve the existing scope/authority requirement.

Round 3 is not clean before repairs. Rounds 4/5 will determine convergence; no authored repair has been counted as a clean review.

## Round 4 — clean

Reparsed target: FeatureRange 1–303; DetailedRange 304–472; normative supplements 156/164 lines. Readiness, Codebase Details and Style each **completed** required persona/standard/full combined target/context reads and reported **no Blocker, Major or Nit findings**. Source reviewers verified staged callers/allowlists/patches and all 24 raw hashes/license. No excluded operation ran. This is the first consecutive clean round; the final fresh round must also be clean before convergence.

## Round 5 — clean; converged

Completed 13 November 2026. Reparsed bounds unchanged: 304–472, with full 156/164-line normative supplements. All three fresh Readiness/Codebase/Style reviewers **completed** required reads and returned **no Blocker, Major or Nit findings**. Source checks confirmed the documented hazards, prescribed patches, staged caller propagation, 22-file adoption boundary and all 24 raw hashes/MIT attribution. No reviewer failed or was counted as reviewed without a report.

Rounds 4 and 5 are consecutive clean rounds: **Implementation Readiness converged after five rounds**. All round 1–3 findings have plan fixes and no recurrence in the final two rounds; none was downgraded or waived as accepted risk. This verdict permits execution of the documented gated plan. It does not complete M0 measurements, actual UI implementation, reference parity or account/service/native qualification.

After review, only completion status/date/report links are finalized in the main draft; no architecture, interface, patch or acceptance requirement is changed. Production source remains untouched by this planning phase. The [consolidated report](consolidated_review_report.md) records the overall outcome and remaining dependencies.

Frozen round-4/5 input SHA-256: main draft `85289fc9b04f8ba296a5a54c861798f2a796245345de7370d05365e2d363c7e6`; work-area supplement `9653f55410f3c806acc875f2df4bbd0e8945c61d718f694cd8a0979c56c2364f`; adapter supplement `a427be0b5651e11c8a3808ea017c66bb3ad82c693c6dc492c0c0947f729e811f`. The main file's final administrative status/date/link update changes its file hash; its reviewed implementation content and both supplement hashes remain unchanged.
