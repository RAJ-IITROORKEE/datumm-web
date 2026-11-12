# Reference observation ledger

12 November 2026. Codex built-in browser; public previews only. REA evidence discipline: separate visible facts, documented behavior and proposed adaptation. The REA server is not configured or required for this browser inspection. No paid component source was obtained.

## affectUI inventory and behavior

The public navigation listed 91 components, 39 screens, 14 blocks, 26 illustrations and 8 motion entries. This records discovery coverage, not 178 completed interaction audits. The selected reference map is in PLAN.md.

| Reference | Observed | Still to verify |
| --- | --- | --- |
| [Flat shell](https://www.affectui.com/screens/app-shell-flat) | Flat surfaces/hairlines, left navigation/account, main content, right tabbed workspace, sidebar/workspace resize separators | Drag limits, keyboard resizing, persistence, tab close recovery. Docs describe a drawer below 900px; not tested. |
| [Composer](https://www.affectui.com/components/chat-composer) | Opened Auto model list and Add menu; Escape dismissed. Add exposed files/folders, folder work, goal, plan, drawing and document actions. Empty Send disabled. | Enter/Shift+Enter and focus return are documented, not comprehensively tested. Adapt only usable DATUMM capabilities. |
| [Model picker](https://www.affectui.com/components/model-picker) | Opened settings dialog: models, speed/quality/cost labels, extended thinking, effort and web search controls | Capability changes, persistence and dismissal paths. Demo values are not DATUMM service data. |
| [AI answer](https://www.affectui.com/components/ai-answer) | Initial reading/source cards and Stop; docs describe streaming, citation/action/follow-up behavior | Completed answer, feedback/copy/retry and source interaction. |
| [Thinking state](https://www.affectui.com/components/thinking-state) | Expanded initial state, timer and source chips; docs describe incremental timeline and collapse-on-completion | Live transitions; use actual progress events, not a simulated thought transcript. |
| [Chat progress](https://www.affectui.com/screens/agent-chat-progress) | Tool rows with arguments/results, composer, progress, earlier steps, outputs and source inventory | Expand/collapse, output download and scroll behavior. |
| [Run inspector](https://www.affectui.com/blocks/run-inspector) | Duration/cost/tokens/model/tool/errors and nested agent/tool spans | Real data contract and tree keyboard behavior. Avoid displaying fictional backend metrics. |
| [Preferences](https://www.affectui.com/screens/settings-preferences) | Personal and Workspace groups; profile/preferences/notifications/privacy, general/members/models/security/billing, return to app | Individual forms, dirty state, save/error and role gating. |

## Initial visual foundation

The user explicitly chose affectUI's initial colors and typography. Sources: [design system](https://www.affectui.com/design-system), [colors](https://www.affectui.com/design-system/colors), [typography](https://www.affectui.com/design-system/typography). Dark and light color documentation were inspected. Public theme values below are observed documentation values; they are not a complete computed-style extraction.

| Role | Dark | Light |
| --- | --- | --- |
| Ink | rgba(255,255,255,.9) | rgba(0,0,0,.88) |
| Muted | rgba(255,255,255,.46) | rgba(0,0,0,.45) |
| Placeholder | rgba(255,255,255,.3) | rgba(0,0,0,.3) |
| Surface | #1c1c1e | #ffffff |
| Subtle | rgba(255,255,255,.04) | rgba(0,0,0,.03) |
| Overlay | #1f1f22 | #ffffff |
| Border | rgba(255,255,255,.14) | rgba(0,0,0,.08) |
| Strong border | rgba(255,255,255,.2) | rgba(0,0,0,.13) |
| Primary | rgba(255,255,255,.9) | rgba(0,0,0,.88) |
| On primary | #161618 | #ffffff |
| Focus | rgba(77,141,255,.8) | rgba(0,96,226,.7) |
| Danger | #ff8a7a | #c4320a |
| Warning | #ffb35c | #b25e00 |
| Success | #7dcf9f | #1e8a4f |
| Info | #4fb0fe | #0070d6 |

The index names Inter and SF Mono, font tokens `--aui-font` / `--aui-font-mono`, and radii 7px normal, 5px small, 10px large. Verify the exact fallback stack, weights, sizes, line heights, spacing, shell background, icons and motion before a final DESIGN.md. Do not assume SF Mono redistribution rights. Test contrast in actual combinations; bring necessary visual deviations to the user rather than silently changing the requested foundation.

## Remaining reference families

Catalog discovery also found agent tree/queue/monitor/recap/trail/fleet/graph, context map/window, memory, permissions, cost waterfall, decision inbox, checkpoint, orchestration and mission-control references. These are optional research leads, not approved features. Use only the relevant exact links in PLAN.md when a feature is selected; inspect before assigning implementation.

Screenshot views were inspected during the session but not saved as repository image artifacts. Do not cite nonexistent screenshot filenames. Later implementation packets should capture sanitized before/after images and attach their actual paths.

## Pricing reference — implementation follow-up

The user confirmed Free as current tier, Pro $20/month and Max $99/month. Inspected [Pricing Plans](https://www.affectui.com/blocks/pricing-plans) in the built-in browser: Clean dark preview, three compact cards, plan title/price/billing line, short limit rows, emphasized middle plan, and expandable details. Switched Yearly to Monthly and confirmed monthly labels/prices changed; toggled Hide details and observed collapsed plan details. No gated source was accessed. DATUMM adapts the structure for individual architectural work; annual pricing, trial length, exact quotas, demo integrations and demo plan benefits are not copied.
