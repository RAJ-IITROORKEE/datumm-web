# affectUI reference contract

Captured 12 November 2026 in the Codex in-app browser at 1185 × 877 CSS pixels. Source: [Assistant Home](https://www.affectui.com/screens/assistant-home), Inset layout, Sample data; preview Light/Dark radios were explicitly selected. These are public computed appearance measurements, not Pro implementation source.

## Exact Home refinement, 13 November

The author's latest [full Assistant Home reference](https://www.affectui.com/screens/assistant-home/full) was inspected at 1323×930. These local values supersede any earlier single-surface interpretation of the composer. Public evidence is saved in ignored `artifacts/ux/exact-home-icons-layout.json` and `exact-home-light-input.json`.

| Element | Observed geometry and roles | Production adaptation |
| --- | --- | --- |
| Sidebar | 272px; header tile18px, label14/500, caret13px, collapse28px with PanelLeft16px; Search at y50/h30 | DATUMM workspace menu, genuine navigation and identity |
| Primary rows | Three contiguous30px rows at y92/122/152;16px round-stroke icons,1.9px stroke | New chat / SquarePen, Projects / Folder, Connections / LayoutGrid |
| Account | One34px full-row menu trigger;24px avatar,13px medium name, caret | Actual signed-in identity; Settings inside menu |
| Composer | 672×143px max, radius16;106px write layer plus37px lower tray | Same continuously mounted production form |
| Write layer | Dark#1c1c1e / light#fff;14px top/10px lower inset;40px input,13/20 text, white/black ink and0.36-alpha placeholder | Add → current-mode menu → spacer → actual model → voice → Send |
| Tray | Dark#161618 / light#f5f5f5; left inset6px/right8px;12px links | Project context; measured Revit context; connection opener |
| Toolbar | 28px controls; compact model typography400; model-to-voice gap4px, voice-to-Send6px; Send radius8 | Ask/Plan/Build retain exact guards; desktop-only voice remains honestly unavailable on web |

Installed MIT Lucide equivalents reproduce the observed simple icon outlines; app-specific branding and capabilities remain DATUMM's. The reference's52px demo footer is excluded from product geometry. Real service error notices and empty histories remain visible rather than being replaced by the reference's sample data. Desktop and390px actual-route comparisons pass for this slice; broader connected/native qualification remains open.

## Frozen core roles

| Role | Source CSS variable | Dark | Light |
| --- | --- | --- | --- |
| Shell page | `--page` | `#0e0e10` | `#f8f8f8` |
| Work area | `--panel` | `#141416` | `#ffffff` |
| Secondary tray | `--tray` | `#1d1d20` | `#f4f4f4` |
| Heading ink | `--ink` | `rgba(255, 255, 255, 0.9)` | `rgba(0, 0, 0, 0.88)` |
| Body text | `--text` | `rgba(255, 255, 255, 0.62)` | `rgba(0, 0, 0, 0.61)` |
| Muted text | `--muted` | `rgba(255, 255, 255, 0.45)` | `rgba(0, 0, 0, 0.45)` |
| Faint/disabled text | `--faint` | `rgba(255, 255, 255, 0.28)` | `rgba(0, 0, 0, 0.27)` |
| Separator | `--line` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.06)` |
| Soft separator | `--line-soft` | `rgba(255, 255, 255, 0.05)` | `rgba(0, 0, 0, 0.04)` |
| Strong separator | `--line-strong` | `rgba(255, 255, 255, 0.14)` | `rgba(0, 0, 0, 0.1)` |
| Hover | `--hover` | `rgba(255, 255, 255, 0.05)` | `rgba(0, 0, 0, 0.03)` |
| Selected row | `--select` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.055)` |
| Chip | `--chip` | `rgba(255, 255, 255, 0.06)` | `rgba(0, 0, 0, 0.04)` |
| Accent | `--accent` | `#4fb0fe` | `#0070d6` |
| Primary fill | `--primary` | `#ededed` | `#171717` |
| Primary ink | `--primary-fg` | `#121213` | `#fff` |
| Focus | `--ui-as-focus` | `rgba(77, 141, 255, 0.8)` | `rgba(0, 96, 226, 0.7)` |
| Frame gap | `--frame-gap` | `8px` | `8px` |
| Sidebar default | `--side-w` | `272px` | `272px` |
| Panel radius | `--radius-panel` | `calc(10px + 2px)` | `calc(10px + 2px)` |
| Card radius | `--radius-card` | `14px` | `14px` |

Do not copy inherited marketing/catalog-only variables such as Pro badges. The component main surface was independently computed as dark `rgb(20,20,22)` / light `rgb(255,255,255)`. Preserve alpha colors rather than replacing them with the prior DATUMM palette.

## Frozen typography and controls

| Target | Dark | Light |
| --- | --- | --- |
| heading | backgroundColor: rgba(0, 0, 0, 0); color: rgba(255, 255, 255, 0.9); fontSize: 28px; fontWeight: 500; lineHeight: 34px; letterSpacing: -0.7px; borderRadius: 0px; boxShadow: none | backgroundColor: rgba(0, 0, 0, 0); color: rgba(0, 0, 0, 0.88); fontSize: 28px; fontWeight: 500; lineHeight: 34px; letterSpacing: -0.7px; borderRadius: 0px; boxShadow: none |
| composer | backgroundColor: rgb(22, 22, 24); color: rgba(255, 255, 255, 0.62); fontSize: 13px; fontWeight: 400; lineHeight: 20px; letterSpacing: normal; borderRadius: 16px; boxShadow: rgba(255, 255, 255, 0.1) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.4) 0px 1px 2px 0px | backgroundColor: rgb(245, 245, 245); color: rgba(0, 0, 0, 0.61); fontSize: 13px; fontWeight: 400; lineHeight: 20px; letterSpacing: normal; borderRadius: 16px; boxShadow: rgba(0, 0, 0, 0.06) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.1) 0px 1px 1px -1px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px |
| input | backgroundColor: rgba(0, 0, 0, 0); color: rgb(255, 255, 255); fontSize: 13px; fontWeight: 400; lineHeight: 20px; letterSpacing: normal; borderRadius: 0px; boxShadow: none | backgroundColor: rgba(0, 0, 0, 0); color: rgb(0, 0, 0); fontSize: 13px; fontWeight: 400; lineHeight: 20px; letterSpacing: normal; borderRadius: 0px; boxShadow: none |
| send | backgroundColor: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.3); fontSize: 13px; fontWeight: 400; lineHeight: 20px; letterSpacing: normal; borderRadius: 8px; boxShadow: none | backgroundColor: rgba(0, 0, 0, 0.06); color: rgba(0, 0, 0, 0.27); fontSize: 13px; fontWeight: 400; lineHeight: 20px; letterSpacing: normal; borderRadius: 8px; boxShadow: none |

The send measurement is the disabled empty-composer state, not an enabled primary button. Inter is the reference family; DATUMM already self-hosts Inter Variable. Use the pinned free sources for each free control’s enabled/hover/focus states, and record Pro states through browser observation.

## Reference capture and comparison protocol

- Canonical screens: Assistant Home and [Agent Chat](https://www.affectui.com/screens/agent-chat). Option A adapts the latter’s section hierarchy into the larger drawing/output work area. The measured 368px reference inspector is not the selected canvas width.
- Capture identifiers: ignored `artifacts/ux/affectui-theme-measurements.json`, `affectui-home-frozen-reference.jpg`, `affectui-home-light-reference.jpg`, earlier `affectui-agent-chat-brief.jpg` and `affectui-agent-chat-activity.jpg`. All values in this document are sanitized appearance data.
- At implementation M0 measure Home content max-width, sidebar row/search/profile heights, panel/tab header dimensions, menu open/focus states and narrow container rules from these same preview states. Record the exact DOM role/label, CSS property, value, viewport and capture identifier. No implementer may guess a missing value or overwrite the baseline to match their own output.
- Repeat screenshot comparisons at 1440,1280,1024,768,390,320px. Use the same reference theme/state/viewport and loaded font. Global color/type roles must match the frozen values; geometry targets for corresponding controls allow at most 1 CSS px rounding variation. Text content can differ for actual BIM workflows.
- If the live reference changes, retain this baseline and record the new observation as a separate dated version. Do not silently move the target during a work package.
- Necessary accessibility/capability differences require explicit entries with target state, reason, measured contrast/focus evidence and approval status. Do not claim exact parity when an exception remains open.
- Missing source, unobservable state, or a required contract prevents closing that surface; it does not authorize a substitute color, fake action or guessed API.

## Surface/reference coverage to complete in M0

| Actual DATUMM surface | Exact reference | Treatment |
| --- | --- | --- |
| Home/sidebar | https://www.affectui.com/screens/assistant-home | Pro reconstruction; core appearance captured, remaining responsive/interaction measurements required. |
| Unified Design/Activity/Assets/Exports area | https://www.affectui.com/screens/agent-chat | Pro panel hierarchy; user-selected Option A; preserve actual drawing/output authority. |
| Composer/model controls | https://www.affectui.com/components/chat-composer ; https://www.affectui.com/components/model-picker | Pro reconstruction with actual Ask/Plan/Build and runtime catalog. |
| Account setup | https://www.affectui.com/screens/onboarding ; https://www.affectui.com/components/stepper-form | Google/profile/use-cases/optional connector flow, actual account persistence. |
| Personal settings | https://www.affectui.com/screens/settings-profile ; https://www.affectui.com/screens/settings-preferences ; https://www.affectui.com/screens/settings-models ; https://www.affectui.com/screens/settings-security | Pro hierarchy and global tokens; keep working account/preferences/capabilities. |
| Billing/usage/pricing | https://www.affectui.com/screens/settings-subscription ; https://www.affectui.com/screens/agent-usage ; https://www.affectui.com/blocks/pricing-plans | Planned individual tiers and actual task usage; no invented checkout/quotas. |
| Admin/integrations | https://www.affectui.com/screens/settings-general ; https://www.affectui.com/screens/integrations ; https://www.affectui.com/screens/agent-activity | Apply reference hierarchy to existing gated admin functions. |
| Outputs/annotations | https://www.affectui.com/screens/files ; https://www.affectui.com/components/data-table ; https://www.affectui.com/components/comment-thread | Read-only source-bound review; free comment source only if its actual semantics fit local exact-plan annotations. |
| Review/approval | https://www.affectui.com/components/approval-card ; https://www.affectui.com/components/review-center ; https://www.affectui.com/components/change-summary | Preserve current exact proposal/verification UI; direct free ChangeSummary where compatible. |

This table is a coverage plan. It does not claim that every listed reference/state has already been inspected. No new collaboration/thread service is authorized by a comment reference.

## M0 core capture — 13 November 2026

New observations supplement the 12 November baseline. Reference full-screen demo includes a 52px external demo-state footer; do not reproduce that footer in the product. Compare the application frame rather than the catalog's scaled preview. Source records are ignored `artifacts/ux/m0-home-desktop.json`, `m0-home-responsive.json`, `m0-composer-states.json`, `m0-search.json` and `m0-home-{390,320}.jpg`.

| Role/state | Observed contract |
| --- | --- |
| Centered Home desktop | 672px content/composer maximum; at 1440px Home x=516 after 272px sidebar. Main inset 8px top/right/bottom, radius12, 1px line. Home padding64px vertically. |
| Narrow Home | At390: main378px atx6, content352px atx19. At320: main308px, content282px atx19. Home padding56px top/40px bottom; no page overflow. Heading23px/29px, weight500, two lines. Sidebar is a closed off-canvas264px drawer. |
| Sidebar desktop | 272px; padding10px 8px 8px 10px. Search/main rows30px high, 8px radius. Search margin-top12px, gap8px. Icon face28px; chat action face24px/radius6. |
| Sidebar text/account | Main rows13px/18.571px, normal400/selected500. Workspace label14px/500. Account row34px, gap7px, 13px/500. |
| Composer desktop | 672px by143px; radius16; input644px by40px when empty. Existing frozen color/shadow roles apply. Narrow reference keeps13px input; DATUMM's approved16px narrow-input accessibility adaptation is recorded separately. |
| Enabled Send | 28×28px/radius8. Dark fill `rgba(255,255,255,.92)`, ink `#161618`; light fill `rgba(0,0,0,.88)`, ink `#fcfcfc`. Do not confuse transient color-transition frames with settled values. |
| Suggestions | 32px high, radius16, 12px text, gap7px; padding0px 12px 0px 11px. Suggestions populate supported DATUMM flows rather than copying demo services. |
| Search lifecycle | Opens labelled Search dialog and focuses Command combobox; Escape closes and returns Search opener. Overlay black45%, top padding96px; command option36px, text13px/20px. Inner panel measurement belongs to M4. |

The generic browser viewport capability did not change this tab's actual width; successful responsive captures used the built-in tab CDP emulation and verified `innerWidth`. Temporary overrides are cleared after capture. Earlier immediate-resize samples were discarded; only settled per-call measurements in the current responsive JSON establish geometry. No REA CLI execution or full-catalog qualification is claimed.

## M0 additional surface captures — 13 November 2026

These are public, Clean/Dark previews. Catalog component previews scale their visual rectangles: CSS computed dimensions below establish the unscaled contract. Raw JSON/snapshots remain ignored in `artifacts/ux/m0-*.json`. No gated source was acquired.

| Reference/state | Measured appearance and behavior | Capture |
| --- | --- | --- |
| Assistant Home search open | 600px card, radius12, dark `#1c1c1e`, hairline white10% plus black40% small lift. Overlay black45%, inset96px top/16px sides. Search row48px; list max360px; option36px/radius6/padding0 8px; font13/20. Escape returned opener. | `m0-search-panel` |
| Agent Chat sections and answer | Right reference panel368px/radius12/`#141416`; section tray32px/padding3/gap2/radius10, tabs26px/radius7/13px/500. Arrow key moved Assets→Activity. Answer14px/22.4px/ink. Option A adapts width to the larger work area. | `m0-agent-chat` |
| Onboarding | Form600px with248px checklist. DATUMM retains its approved individual Google/profile/use-cases/optional-connector sequence. Reference teams/bookings are omitted. | `m0-onboarding`, `m0-onboarding-form` |
| Settings profile/preferences/models/security/subscription/general | H1 24px/32px/500; section H2 14px/20px/500; model groups13px/20px. Subscription plan labels15px/22px. Actual account/admin state stays authoritative. | `m0-settings-*` |
| Agent usage | Compact heading13px/20px; supporting subhead12px/16px. Reference has674px main content inside its multi-pane shell; actual metering provenance remains visible. | `m0-agent-usage` |
| Pricing Plans | Section1040px maximum, padding48px 16px 56px. Heading/price24px/32px/500; heading tracking−.24px. Subtitle/plan names13px/20px; name500. Three cards gap12px, radius12, padding20px, dark `#1c1c1e`, source hairline/lift. CTA32px/radius8; detail toggle24px/radius6/12px/16px/500. One toggle collapses all three detail regions. DATUMM uses monthly individual Free/Pro/Max and no unsupported annual switch. | `m0-pricing-core`, `m0-pricing-plans` |
| Files | Page padding46px 32px 56px; H1 24px/32px/500; intro13px/20px. Section label11px/16px/500. Toolbar28px; tabs28px/radius6. Folder card56px grid or48px list, radius10, gap12, padding0 14px 0 12px; metadata12px/16px. Grid/List changed the same folder presentation. | `m0-files`, `m0-files-list` |
| Data table | Table13px/20px, header12px/16px/500, header row36px. DATUMM's parser bounds, readonly schema and full CSV remain unchanged. | `m0-data-table` |
| Composer and model picker | Composer model list260px/padding4/radius10; options32px/padding6px 8px/gap10/radius6/13px/20px. Rich picker trigger28px/padding0 6px/gap6/radius6/13px/20px/500; popup320px/radius10. Only actual runtime models/effort appear in DATUMM. | `m0-model-visible`, `m0-model-picker` |
| Approval Card | Pending420px maximum/radius16/padding16, header gap12, icon32px/radius9, title14px/20px/550, description13px/18px. Resolved compact row padding12px 14px. Reset exposed pending state. Reference's always-allow control is omitted; exact DATUMM approval remains required. | `m0-approval-card`, `m0-approval-pending` |
| Review Center | Frame radius12; header13px/20px, title500, padding10px 12px 10px 16px, progress12px/16px. Public demo includes volatile simulated review activity; no simulated queue/confidence/timing is adopted. | `m0-review-center` |
| Comment Thread | 420px/radius10/dark `#1c1c1e`; header padding10px 10px 10px 16px, title13px/20px/500, count12px/16px; icon28px/radius6; body gap16/padding16px 16px 12px. Adapt only visual hierarchy to local exact-plan notes; no synchronized discussion or agent-completed edits are implied. | `m0-comment-thread` |

## Double-sidebar reference, 13 November 2026

Author selected https://www.affectui.com/screens/agent-chat-rail and its public full preview. Observed outer52px icon navigation with workspace tile above and Settings/account below; adjacent272px inner project/chat column starts8px from the top, dark background#111113, padding10px8px8px10px. Project switcher offers All projects and individual projects; choosing Summer collection filters Pinned/Projects/Chats to that project while leaving the open conversation and artifacts unchanged. Search is a compact header icon. Under900px the rail and inner list open as one drawer; Escape closes it and restores Open sidebar focus. The reference has sidebar and artifacts resizers; DATUMM retains the requested right work-area resizer and does not restore the navigation resize strip explicitly removed by the author. Unsupported notification/task resources are not invented; rail actions map to real DATUMM destinations. Public preview inspection only; no Pro source copied.

## Final narrow-admin usability adaptation

The final320/390px check measured28px form/menu targets. At widths up to700px, DATUMM now provides44px minimum text/select/action targets and square44px menu buttons, including the portalled Stay/Leave dialog. Existing16px narrow input text, affectUI tokens, typography hierarchy and desktop density are retained. Switch tracks are excluded from the generic button sizing. This is a deliberate narrow-screen usability adaptation, not a claim that the reference's compact desktop controls measure44px. Browser checks confirmed no page overflow, drawer Escape focus return and light/dark rendering. Explicit CSS-sized screenshot clips were used to avoid scaling artifacts from the default emulated capture.

