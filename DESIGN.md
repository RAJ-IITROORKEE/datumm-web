---
name: DATUMM
description: Restrained architectural workspace derived from the user-selected affectUI foundation.
colors:
  background-dark: "#1c1c1e"
  card-dark: "#1f1f22"
  secondary-dark: "#252527"
  foreground-dark: "#e8e8e9"
  muted-foreground-dark: "#a1a1a6"
  separator-dark: "#3c3c3e"
  control-border-dark: "#6f6f70"
  accent-dark: "#4fb0fe"
  warning-dark: "#ffb35c"
  error-dark: "#ff8a7a"
  success-dark: "#7dcf9f"
  background-light: "#ffffff"
  secondary-light: "#f7f7f7"
  foreground-light: "#1f1f1f"
  muted-foreground-light: "#717171"
  separator-light: "#ebebeb"
  control-border-light: "#8f8f8f"
  accent-light: "#0070d6"
  warning-light: "#ae5c00"
  error-light: "#c4320a"
  success-light: "#1c824a"
typography:
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
  chat-body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.7
  workspace-title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.2px"
  label:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  mono:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
  pricing-heading:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 3vw, 32px)"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.035em"
  pricing-heading-embedded:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  pricing-description:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    lineHeight: 1.7
  pricing-plan-title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  pricing-price:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  pricing-price-embedded:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  pricing-price-stacked:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.04em"
  pricing-metadata:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
rounded:
  sm: "5px"
  md: "7px"
  lg: "10px"
  form: "8px"
  navigation: "6px"
  review: "9px"
spacing:
  compact-gap: "6px"
  control-gap: "8px"
  field-inset: "12px"
  panel-inset: "20px"
  reading-inset: "24px"
components:
  button-primary:
    backgroundColor: "{colors.foreground-dark}"
    textColor: "{colors.background-dark}"
    rounded: "{rounded.form}"
    padding: "9px 15px"
  button-secondary:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.form}"
    padding: "9px 15px"
  input:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.form}"
    padding: "0 12px"
    height: "43px"
  navigation:
    textColor: "{colors.muted-foreground-dark}"
    rounded: "{rounded.navigation}"
    padding: "9px 10px"
  choice-chip:
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
  review-card:
    backgroundColor: "{colors.card-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.review}"
    padding: "18px"
  mode-segment:
    textColor: "{colors.muted-foreground-dark}"
    rounded: "{rounded.sm}"
    padding: "5px 8px"
  pricing-card:
    backgroundColor: "{colors.card-dark}"
    textColor: "{colors.foreground-dark}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: DATUMM

## Overview

**Creative North Star: "affectUI's restrained working surfaces"**

The user selected affectUI's flat shell, initial colors and typography. DATUMM builds on that reference with neutral surfaces, hairline separators, compact rounded controls and stronger readable text. Brand expression stays quiet so architectural work and agent responses remain legible.

This is a code-first record of the built system on 12 November 2026, not a new identity proposal. The workspace is an Operate surface; its composition and authority boundaries live in [the surface contract](docs/ux/surface-contract.md), [PRODUCT.md](PRODUCT.md) and [PLAN.md](PLAN.md). Earlier planning-only status in those historical packets is superseded by the approved implementation recorded in the surface contract.

**Key Characteristics:**

- Neutral tonal layers with restrained semantic color.
- Inter typography, compact controls and visible keyboard focus.
- User appearance choices remain authoritative.

Source of truth: `src/lib/themes/affectui.json`, `src/lib/appearance.ts`, `src/app/foundation.css`, `src/app/layout.tsx`, `src/components/studio-workspace.css`, the onboarding/output CSS modules, and `src/components/billing/pricing-plans.tsx` with its CSS module and `src/app/pricing/page.tsx`. [Reference observations](docs/ux/reference-observations.md) distinguish inspected previews from tested interactions. This document extracts code; it does not claim every route or state has been browser-verified.

## Colors

The frontmatter records the effective default affectUI palette after the runtime contrast adjustment, with separate raw separator values. It is a compact reference, not a second runtime theme engine.

### Primary

Primary actions use inverse foreground/background; the runtime `--primary` aliases `--foreground`. The blue accent belongs to focus, interaction and activity via `--trace-accent`, rather than filling every action.

### Neutral

Background is the work surface, card is the raised tonal surface and secondary marks hover/selection. In light affectUI, card shares background. Chrome follows card. `--separator` retains the source palette's quiet line; `--border` is adjusted against background, card and secondary for control visibility.

### Semantic states

Warning/attention uses `--trace-thought`, failures use `--trace-error`, and completion uses `--trace-success`. Preserve the associated label, icon or state text.

**The Readable Color Rule.** Runtime appearance resolution adjusts foreground, muted text and semantic text toward the mode's ink until they reach a contrast ratio of at least 4.5 against the three main surfaces; control borders target 3. Hairline separators serve structure and do not replace control boundaries.

The default is affectUI dark. Saved palettes, light/dark/system mode and supported custom colors remain available through `datumm-appearance`. Do not reset existing choices to match a screenshot. High contrast promotes foreground and muted text to mode ink and strengthens separators. These algorithms are not evidence that every legacy hard-coded element passes accessibility review.

## Typography

**Body Font:** Inter Variable with Inter, UI sans and system fallbacks. `@fontsource-variable/inter` (5.2.8) is imported in the root layout and self-hosted by the build; package font licensing remains with the dependency.

**Mono Font:** SFMono-Regular, Consolas, Liberation Mono, monospace. SFMono is only a system fallback name; DATUMM does not redistribute Apple font files.

The foundation body is 14px. Scoped workspace chat uses the frontmatter's smaller chat-body role; reports outside that scope retain the foundation's 14px Markdown. Workspace headings use the title role. Onboarding uses larger headings with tighter tracking, while labels and metadata stay compact. There is no separate display typeface or universal modular type scale.

Markdown paragraphs wrap; table values use tabular numerals. Output paragraphs have a 74ch maximum reading measure. Table and diagram overflow belongs inside the output rather than widening the whole workspace.

Pricing intentionally extends the compact workspace hierarchy. Its centered public heading uses pricing-heading; at viewport widths up to 800px the heading is fixed at 32px. The public introduction uses pricing-description, reduced to 14px at that viewport breakpoint; embedded settings uses 13px introduction text and the smaller pricing-heading-embedded. Plan titles use pricing-plan-title, reduced to 16px when embedded. Price amounts use pricing-price with tabular numerals; embedded amounts use pricing-price-embedded. Public amounts use pricing-price-stacked when the component container is at most 680px wide; embedded amounts remain 34px through their more specific selector. Badges, usage rows and price notes use pricing-metadata; descriptions, details, monthly units and action labels use 12px. These are built pricing roles, not a replacement global type scale.

## Layout

The built desktop workspace maintains project navigation, stable chat and a larger right work area. Focus drawing expands that existing work area. The current grid uses persisted width variables and minimums; do not interpret one capture's panel widths as fixed design tokens.

At 1180px and below, Chat/Drawing switches replace simultaneous chat and work-area presentation. At 850px and below navigation uses an overlay beside a compact rail; at 500px and below the rail gives way to the narrow-screen header. These are CSS breakpoints, not measured guarantees for all content.

Settings takes the available viewport and supplies its own navigation. Its internal navigation changes to a horizontal strip at 650px and below. Onboarding becomes a single column with horizontal progress at the same breakpoint, with an intermediate adjustment at 900px. Output panels reduce padding at 700px, and the composer wraps its controls at narrow sizes.

Public pricing centers its content within a 1040px maximum width. Its three plan columns align at the top so expanded details remain with their card. Cards stack at a component-container width of 680px or less, or a viewport width of 800px or less. The public introduction is centered; embedded pricing is left-aligned. Card padding is 24px publicly and 18px embedded, changing to 22px and 20px respectively under the container rule. The viewport stacking rule also gives cards 22px padding; the embedded selector retains precedence where both rules apply.

Spacing is contextual: small control gaps, modest form insets and larger reading insets. The frontmatter names reused values without claiming a universal spacing scale. Transcript, output and settings content own their scrolling; preserve minimum-width and minimum-height containment when extending these surfaces.

## Elevation & Depth

The shell is flat, using tonal surfaces and one-pixel separators. The composer has no resting shadow. Overlays and focused interaction can use restrained shadows: the inspector uses a lateral shadow; the composer focus uses a low-opacity accent ring. Existing docks and menus have their own elevation. Do not describe the whole application as shadow-free.

Reduced motion follows both the operating-system preference and DATUMM's saved reduced-motion setting. Keep progress readable when animations and transitions are removed.

## Shapes

Small, medium and large foundation radii define compact rounding; forms and navigation retain their actual local radii. Not every component uses the same corner value. Selected rows use tonal fill; circles are reserved for avatars, progress markers and state dots. Drawing surfaces meet their workspace edges without a decorative enclosing card.

## Components

- **Buttons:** inverse neutral primary actions; bordered or transparent secondary actions. Onboarding actions use modest rounding and 39px minimum height. Hover darkens the tonal layer or reduces primary opacity. Disabled actions dim; keyboard focus remains explicit.
- **Fields:** neutral background, visible control border and inherited typography. Onboarding inputs/selects use the frontmatter's input dimensions; settings fields remain responsive to their container.
- **Navigation:** muted text at rest, secondary surface and foreground on hover/current selection. Preserve semantic current/expanded state and narrow-screen recovery.
- **Choice chips:** wrapping, bordered controls with a stronger selected border and tonal selected fill. Use a visible selection control or accessible pressed/checked state.
- **Cards and reviews:** compact tonal containers with a purposeful border or attention edge. Review status and exact native approval remain distinct from decorative color.
- **Composer:** one shared Ask/Plan/Build control group with a visible selected mode, wrapping tools and context. Keep the existing textarea and draft; do not create a competing prompt on the drawing.
- **Output panel:** titled header, wrapping toolbar, source/revision information and independently scrolling content. Preserve source identity through review and export; opening an output must not imply native execution.
- **Report review:** read-only BOQ/element tabs, source document and model revision, explicit coverage/limitations, and a bounded horizontally scrolling table. Hide wholly unspecified columns from the visual preview while retaining the typed CSV schema. Refresh reads saved task evidence; current quantities require a new agent read of Revit.
- **Computer authorization:** a dedicated, restrained sign-in/review page with the computer name, account and explicit Allow/Cancel actions. Expired and unavailable requests have recovery guidance. Loading/sign-in never grants access; computer authorization and native model approval remain distinct.
- **Pricing plans:** neutral cards use the existing large radius, with Pro distinguished by a stronger mixed foreground border and secondary surface. Labels state Available now/Current plan for Free and Planned for paid tiers. Free is current; the approved Pro (USD 20/month) and Max (USD 99/month) prices are planned. Paid actions remain disabled Coming soon, with planned benefits separated from current workspace capabilities inside expandable Plan details. Checkout, paid entitlements, numeric quotas and team accounts are not implemented by this presentation. Native Revit changes retain the same connected-model and explicit-approval requirements on every plan.

The companion `.impeccable/design.json` contains scoped previews of existing primitives, focus/elevation/motion extensions and synthesized swatch ramps for the design panel. Those ramps are visualization aids, not application palette tokens. Preview snippets show visual states; they do not implement DATUMM behavior.

## Do's and Don'ts

### Do:

- **Do** use runtime semantic tokens and preserve saved appearance preferences.
- **Do** use the self-hosted Inter stack and visible keyboard focus.
- **Do** preserve readable wrapping, contained scrolling and labeled state changes.
- **Do** keep source, revision and native approval meaning intact while refining presentation.

### Don't:

- **Don't** copy demo model names, pricing or unavailable service controls from the reference.
- **Don't** substitute synthetic panel swatch ramps for runtime palette values.
- **Don't** infer Revit approval or verified execution from a visual selection, preview or status color.
- **Don't** freeze unverified panel geometry from a screenshot into shared tokens.
