# Workspace follow-through audit

15 November 2026. Read-only audit of the workspace acceptance evidence, followed by the coordinator's actual browser checks below. The [535-test acceptance packet](workspace-acceptance-upgrade.md), [current handoff](HANDOFF.md) and [gap register](full-migration-gap-register.md) remain authoritative for their recorded scopes.

## Already qualified

- Actual grouped-question inputs survived Later → Show and reload; the 320 × 740 question form retained its composer and context tray. Pause → reload → Continue reached a saved design. The ambiguity in “one home” is an interpretation question, not proven pause-related count loss.
- The actual 320–1440 px matrix covered containment, primary touch sizes, desktop sidebar choice, Settings continuity, single-Escape drawer dismissal and focus return, divider keyboard/pointer bounds, and preview Escape/focus. These checks do not cover real touch hardware or all keyboard paths.
- An earlier actual hosted journey recorded offline delivery failure, preserved draft and explicit online retry in [implementation checkpoints](implementation-checkpoints.md). That is historical source evidence, not a fresh offline qualification of the 535-test candidate. The latest acceptance packet did not inject network or provider faults.

## Actual follow-through results

- **Appearance and motion:** Light and Reduced motion were saved and the workspace was visibly legible on desktop and at 390 px; the phone document width and scroll width both measured 390 px. Captures: `artifacts/ux/workflow-followthrough/light-desktop.png` and `light-phone.png`. Dark and Full motion were restored, with the existing `#4fb0fe` accent, comfortable density and standard reading size preserved. Existing adapter tests separately cover motion cancellation in controlled conditions.
- **Keyboard layers:** in the narrow drawer, Shift+Tab moved focus from Collapse navigation to the account control and Tab returned it. Escape closed the open project menu while retaining the drawer and focus on its options control; a second Escape closed the drawer and focused Open workspace navigation.
- **Offline draft:** tab-scoped browser network emulation was taken offline for a synthetic draft. Send reported that the task could not start and preserved the draft. The network was restored, and reload retained the prompt without automatically sending it; Plan mode was present on reload. The test draft was cleared. Captures: `artifacts/ux/workflow-followthrough/offline-draft.png` and `offline-draft-reloaded.png`. This is a failed-admission recovery check, not evidence of long-running stream reconnection or a successful retry.

**Draft privacy and scope:** source stores signed-in composer text locally for up to seven days with account/task scoping and bounded capacity. Uploads and certain recognizable credential/file-data patterns are excluded from persistence; detection is deliberately incomplete. [Prompt draft tests](../../tests/prompt-drafts.test.mjs) exercise memory-only examples, unavailable storage and account/revision boundaries. Synthetic patterns cannot prove detection of all secrets.

## Remaining external boundaries

Provider faults, real network races during streaming, physical touch hardware, calculated contrast, screen-reader or full WCAG conformance, runtime export behavior, native approval/write/read-back, multi-account authorization, backup restoration and graph freshness are not established by these checks. Paid billing, native BOQ/RVT import, broader desktop parity, research quality, admin expansion and release remain separate in the [gap register](full-migration-gap-register.md). No UI source, permission, connector, native action, service configuration or deployment change was needed for this follow-through.
