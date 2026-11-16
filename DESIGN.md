---
name: DATUMM
description: Architectural workspace using the approved affectUI system.
colors:
  page-dark: "#0e0e10"
  panel-dark: "#141416"
  tray-dark: "#1d1d20"
  composer-dark: "#161618"
  ink-dark: "rgba(255, 255, 255, 0.9)"
  text-dark: "rgba(255, 255, 255, 0.62)"
  muted-dark: "rgba(255, 255, 255, 0.45)"
  faint-dark: "rgba(255, 255, 255, 0.28)"
  line-dark: "rgba(255, 255, 255, 0.08)"
  line-strong-dark: "rgba(255, 255, 255, 0.14)"
  accent-dark: "#4fb0fe"
  primary-dark: "#ededed"
  primary-fg-dark: "#121213"
  success-dark: "#5fc88a"
  warning-dark: "#ffb35c"
  danger-dark: "#ff8a7a"
  page-light: "#f8f8f8"
  panel-light: "#ffffff"
  tray-light: "#f4f4f4"
  composer-light: "#f5f5f5"
  ink-light: "rgba(0, 0, 0, 0.88)"
  text-light: "rgba(0, 0, 0, 0.61)"
  muted-light: "rgba(0, 0, 0, 0.45)"
  faint-light: "rgba(0, 0, 0, 0.27)"
  line-light: "rgba(0, 0, 0, 0.06)"
  line-strong-light: "rgba(0, 0, 0, 0.1)"
  accent-light: "#0070d6"
  primary-light: "#171717"
  primary-fg-light: "#fff"
  success-light: "#007d2ee0"
  warning-light: "#b25e00"
  danger-light: "#d72400da"
typography:
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: "20px"
    fontWeight: 400
  answer:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "22.4px"
    fontWeight: 400
  home-title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    lineHeight: "34px"
    fontWeight: 500
  home-title-narrow:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "23px"
    lineHeight: "29px"
    fontWeight: 500
  settings-title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    lineHeight: "32px"
    fontWeight: 500
  section-title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: "20px"
    fontWeight: 500
  label:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: "20px"
    fontWeight: 500
  metadata:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: "16px"
    fontWeight: 400
  pricing-price:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    lineHeight: "32px"
    fontWeight: 500
  mono:
    fontFamily: "SFMono-Regular, Consolas, Liberation Mono, monospace"
rounded:
  control: "6px"
  navigation: "8px"
  card: "10px"
  panel: "12px"
  composer: "16px"
spacing:
  frame: "8px"
  control-gap: "6px"
  card-inset: "20px"
components:
  button-primary:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-fg-dark}"
    rounded: "{rounded.control}"
  panel:
    backgroundColor: "{colors.panel-dark}"
    textColor: "{colors.text-dark}"
    rounded: "{rounded.panel}"
  composer:
    backgroundColor: "{colors.composer-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.composer}"
---

# Design System: DATUMM

## Overview

The user selected affectUI's complete theme, Inter typography, Assistant Home and Agent Chat hierarchy. M1–M8 migrate actual production owners on the dedicated branch. [Implementation checkpoints](docs/ux/implementation-checkpoints.md) distinguish source completion, browser fidelity and connected acceptance. This records implemented values, not release readiness. Use pinned public MIT components through documented adapters; independently reconstruct Pro compositions. Keep DATUMM identity, architectural content and exact Revit approval boundaries.

## Colors

The trusted map is `src/lib/themes/affectui.json`. Page surrounds the app, panel contains work, tray supports controls. Ink/text/muted/faint and hover/select/chip are distinct measured roles. Normal contrast preserves alpha values; explicit High contrast strengthens text/separators. Status retains its label or icon. Pricing/search/local comments retain the separately measured dark #1c1c1e and white light surface. The composer write layer uses these same local colors above its #161618 / #f5f5f5 tray. Input ink is white/black, placeholder alpha0.36; High contrast strengthens it.

Appearance version 2 offers Dark/Light/System. Legacy modes migrate with a bounded one-time backup and download; old palette/import choices are retired. Density, reading size, contrast and motion remain preferences. Bootstrap, runtime, portals and Clerk share the new system.

## Typography

Self-hosted Inter Variable is the only interface font. Interface 13/20, answers 14/22.4, Home 28/34/500 (23/29 narrow), settings/pricing headings 24/32/500, sections 14/20/500, metadata 12/16. Pricing amounts 24/32/500. Narrow editable fields use 16px. Mono uses system fallbacks; no Apple fonts are distributed.

## Layout

Option A: navigation, stable chat, larger right Design/Activity/Assets/Exports area. Stored defaults are 248px navigation and 380px chat; viewport clamps never overwrite preferences. Split needs 1180px and sufficient remaining space. Below900px, screens switch Chat/Work area with a viewport-bounded navigation drawer. The left structure follows affectUI Agent Chat: one full sidebar, or a52px collapsed icon column, without a separate outer rail. Both side panels use recognizable close/open buttons; right resizing remains at the edge. Home max width is 672px. Web uses the full viewport; native titlebar/window controls appear only in Desktop. The narrow web opener moves focus into navigation and dismissal restores it.

One composer and exact-identity drawing remain mounted across sections, outputs and Focus. New planId/version/fingerprint resets incompatible view state. Properties/assumptions/alternatives/comparison belong in Design; exact formats/style in Exports. Assets uses scoped loaded records and separate deliberate alternative selection.

Settings: 205px navigation / 696px content; narrow Browse sections disclosure. Onboarding: 248px checklist / 600px form; horizontal narrow progress. Pricing: 1040px max, three columns with 12px gap, responsive stack. Each pane/table/dialog contains its own overflow.

## Elevation & Depth

Tonal surfaces and hairlines define hierarchy. Composer radius16 keeps its measured small hairline/lift at rest and focus. Menus/search use bounded scrolling and measured shadows. OS and app reduced motion cancel decorative movement without hiding status.

## Shapes

Controls6px, navigation8px, cards10px, panels12px, composer16px; source-specific values stay local. Technical drawing paper/ink/materials remain explicitly light in either app theme and exports.

## Components

- 22 pinned MIT sources and all patches have provenance. Shared adapters preserve native events/refs, Slot and one Radix controller per layer.
- Sidebar rows 30px/account 34px; three primary rows, workspace menu and one account footer. Search 600px/radius12, query 48px, options 36px, list max360px; Escape restores opener.
- One 672×143px composer: 106px write layer and 37px context tray. Add and the explicit Ask/Plan/Build menu sit left; compact actual model/effort, voice and Send sit right. Controls are 28px; Send radius is 8px. Admission/loading gates Send; drafts and IME remain intact.
-  Recorded tool timing and unknown/stopped/unconfirmed labels stay truthful. Payload strings are exact. Copy-only answer actions await success and reject obsolete feedback. Change counts never imply application or verification.
-  Reviews retain exact proposal/document/revision/expiry/deletion facts. Acceptance, native approval, execution and measured verification stay distinct.
-  Drawing review/pan/zoom/orbit/measure/local notes; retained2D/3D view state. Display/Properties/Focus own Escape in order. Export style has the same owner as the primary preview.
-  BOQ previews are readonly/bounded; CSV retains validated full rows. Failed refresh retains ready data. Immutable report history awaits its backend contract.
- Individual Free is current; Pro $20/month and Max $99/month are planned. Paid controls stay disabled; no invented quotas/provider/team entitlement. One detail toggle controls all pricing cards.
-  Existing account/device/admin/share guards stay intact. Task sharing resets by scope+epoch. Preview/export navigation grants no native authority.

## Do's and Don'ts

Use semantic roles, visible focus, contained scrolling, actual metadata and exact identity-bound actions. Compare rendered dark/light/narrow states. Separate reference evidence, fixtures and real service/native acceptance. Do not invent agents, clocks, quotas, ownership, immutable history or verified outcomes; do not darken construction sheets or substitute a generic design direction.

## Workspace acceptance refinement — 15 November

The existing affectUI world is retained. Closed chat process rows prioritize actual named actions, with lifecycle and failures separate; expanded completed rows use quiet status icons with accessible text. Activity's concise turn header, checklist and compact usage precede a dense named-event list; full telemetry and filters remain disclosed. Exports prioritizes saved report/drawing workflows and clearly separates latest-evidence formats. On narrow screens primary actions use 44 px targets and inputs 16 px text; questions scroll internally on short screens to preserve the composer. Desktop navigation preference is separate from the mobile drawer. See [qualified behavior and evidence](docs/ux/workspace-acceptance-upgrade.md); this does not change palette/type tokens or native authority.
