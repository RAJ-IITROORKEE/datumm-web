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

Design rules, tokens and the screen map for DATUMM Web. The YAML block above holds the machine-read tokens (do not edit it by hand; the Impeccable skill reads it). Status and next steps live in [docs/ux/HANDOFF.md](docs/ux/HANDOFF.md), not here. Product truth is in [PRODUCT.md](PRODUCT.md); agent rules are in [AGENTS.md](AGENTS.md).

## 1. Direction

- **Foundation:** affectUI's theme, Inter typography, Assistant Home and Agent Chat hierarchy, built on shadcn-style primitives. Public MIT sources are used through documented adapters; Pro previews are rebuilt independently, never from gated source.
- **Protocol:** AG-UI is the wire for every agent-to-UI interaction. The middle chat migrates first; each later surface needs its own approved plan.
- **Identity:** DATUMM keeps its architectural content and exact Revit approval boundaries. The interface is quiet: compact operational progress, expandable detail, short answers, well-designed questions.
- **Reference index:** the component reference map in [PLAN.md](PLAN.md#component-reference-map) lists the exact affectUI links and how far each was inspected.

## 2. Tokens

Source of truth: `src/lib/themes/affectui.json` (values mirrored in the YAML block).

- **Color:** page surrounds the app, panel contains work, tray supports controls. Ink, text, muted and faint are separate measured roles. Status color always carries a label or icon. Appearance has Dark, Light and System; High contrast and reduced motion are separate preferences. Legacy palettes migrate once, with a bounded backup.
- **Type:** self-hosted Inter Variable only. Interface 13/20, answers 14/22.4, section titles 14/20/500, metadata 12/16, Home 28/34/500 (23/29 narrow), settings and pricing headings 24/32/500. Editable fields on narrow screens use 16px. Mono uses system fallbacks.
- **Shape:** controls 6px, navigation 8px, cards 10px, panels 12px, composer 16px. Technical drawing paper and ink stay light in either theme and in exports.
- **Depth:** tonal surfaces and hairlines define hierarchy; only the composer, menus and search carry a measured shadow.
- **Layout:** Home max width 672px. Settings 205px navigation / 696px content. Onboarding 248px checklist / 600px form. Pricing 1040px max, three columns. Stored defaults are 248px navigation and 380px chat; viewport clamps never overwrite preferences. Split view needs 1180px; below 900px the screen switches between Chat and Work area with a bounded navigation drawer. Each pane, table and dialog contains its own overflow.

## 3. Component policy

1. Reuse `src/components/ui` (shadcn-style: Radix, `class-variance-authority`, `tailwind-merge`) and the 22 pinned sources in `src/components/vendor/affectui/` before writing anything new.
2. Vendored files keep their digests; change them only through the patch process in `vendor/affectui/PROVENANCE.md`.
3. Use semantic roles and the tokens above; never hard-code colors or fonts.
4. Every component states its empty, loading or streaming, ready, cancelled, failed, disconnected, stale and unavailable or permission-denied behavior where it applies.
5. Keyboard access, visible focus, returned focus when dialogs close, text status (not color alone) and reduced motion are required, not polish.
6. No component removes an essential control to imitate a screenshot.

## 4. Agent chat patterns

These are the AG-UI-driven parts of the middle chat.

| Pattern | Rule | Source |
| --- | --- | --- |
| Composer | One composer, 672×143px: 106px write layer, 37px context tray. Explicit Ask / Plan / Build menu on the left; model, effort, voice and Send on the right. Draft and IME state survive loading. Suggestions appear only as the empty placeholder (italic, with a hint; Tab accepts it into an empty box). While an Ask or Plan turn runs, Enter adds to a queue of three above the composer and Alt+Enter or "Send now" stops the turn and sends next. A failed provider turn offers "Retry with <model>". Attachment chips stay hidden until the backend reports `attachments`. | `workspace/composer.tsx`, `queue-panel.tsx`, `attachment-chips.tsx` |
| Process | One collapsed accordion per turn: "Working…" then "Worked for N s · n steps". Named actions first, lifecycle and failures separate. Only agents that actually ran appear. Never private reasoning. | `workspace/turn-process.tsx`, `lib/turn-nesting.mjs` |
| Tools | Status badge, bounded and escaped input and output, truthful timing. Unknown, stopped and unconfirmed labels stay as they are. | `ai-elements/tool.tsx` |
| Questions | Docked above the composer, one at a time with progress, option chips, an "Other" input, Back and Next, then review and one submit. | `agent-questions.tsx`, `lib/question-stepper.mjs` |
| Plan checklist | Turn-scoped checklist from recorded steps or native to-dos. The count covers required steps. Optional rows carry their recorded status. | `workspace/plan-dock.tsx`, `lib/agent-todos.mjs` |
| Answers | Streamdown inside the affectUI hierarchy; concise by default; tables get CSV, full-screen focus and narrow scrolling. | `workspace/conversation-answer.tsx` |
| Composition | Agent-chosen layout from a bounded registry: text, stack and grid, disclosures, tables, numeric bars, explicit connections. Validated declarative data, bound to the final answer by hash; any failure falls back to the full literal answer. | `workspace/chat-composition.tsx` |
| Review | Exact proposal, document, revision and expiry facts. Plan acceptance, native approval, execution and verification stay four separate steps. | `components/review/` |

## 5. Interface map

Routes, purpose, main features and the data each reads or writes. Client calls go through the same-origin proxy `/api/service/[...path]`, which allow-lists paths and forwards to the hosted task service (`/v2/tasks…`, `/v1/…`).

### Workspace — `/`

Entry order: signed-out sign-in gate → onboarding gate → workspace (`workspace-entry.tsx`). Signed-out visitors never reach an anonymous workspace.

- **Left navigation** (`workspace/sidebar.tsx`): new chat, search dialog, pinned and recent chats, project groups, row menu (rename, move, pin, archive, delete), profile menu (settings, activity, scheduled tasks). 224px default, resizable 220 to 360px (drag or arrow keys), 52px collapsed. Chats are grouped Today, Yesterday, Previous 7 days and Older by creation date. Rows show a Working badge, a themed Needs attention dot with a text label for assistive technology, and a separate unread dot as applicable.
- **Chat** (`workspace/conversation.tsx`, `composer.tsx`): the patterns in section 4. The project overview (`workspace/project-overview.tsx`) lists a project's chats with All, Running and Needs your input filters.
- **Right work area** (`workspace/inspector.tsx`): four tabs. *Design* shows the 2D and 3D drawing with properties and focus mode; *Activity* shows the checklist, process, scheduler, specialists and usage; *Assets* lists saved previews; *Exports* lists revision-bound downloads. One drawing stays mounted across tabs.
- **Data:** `POST /api/agui` (send, resume, observe), `/api/service/tasks/{id}/…` (commands, events, questions/answer, cancel, queue, design-review, reports, title, project, share, history), `projects/{id}/brief`, `runs/{id}/…` (exports), `devices`, `config`, `tools`.

### Onboarding — gate before the workspace

Three steps (`onboarding/account-onboarding.tsx`): profile (name, domain) → use cases → optional Revit connector with Skip. The step is saved so a reload resumes. Data: `GET` and `PUT /api/account/profile`.

### Settings — inside the workspace

Eight sections (`lib/settings-navigation.mjs`, `desktop-settings.tsx`):

| Group | Section | Notes |
| --- | --- | --- |
| Personal | Profile & account | Name, domain, interests, sign-in details; `/api/account/profile` |
| Personal | Preferences | Send behavior, units, drafts |
| Personal | Appearance | Theme, density, reading size, contrast, motion; stored in the browser (`lib/appearance.ts`) |
| Workspace | Models | Models reported by the connected workspace; from service `config` |
| Workspace | Revit connection | Connected computers and context; `devices` |
| Workspace | Usage | Resources used by the current task |
| Workspace | Billing | Embeds the pricing plans; paid plans stay unavailable |
| Workspace | Capabilities | What works on the web and in Revit |

### Pricing — `/pricing`

Static page of `billing/pricing-plans.tsx`. Free is current; Pro $20/month and Max $99/month are planned with payments disabled. No invented quotas, providers or team entitlements. No API.

### Connector authorization — `/connect?request=…`

Authenticated review of the Revit connector's browser authorization request. Only an explicit Allow approves the computer; this never approves a native model change. Data: `GET` and `POST …/device-authorizations/{code}[/approve]` (`connections/device-authorization.tsx`).

### Shared chat — `/share/[token]`

Public, read-only, no sign-in (`proxy.ts` skips Clerk for `/share`). Fetched server-side from `GET /v2/shared/{token}`; the plan SVG renders only through an `<img>` data URI, with no remote images.

### Admin console — `/admin/*`

Dark-only. `admin/layout.tsx` returns 404 unless the verified primary email is in `ADMIN_EMAILS`; the backend re-checks by Clerk subject. Shell: collapsible sidebar, mobile sheet, breadcrumb, dirty-state leave guard (`admin/admin-shell.tsx`).

| Page | Purpose | Data (`/api/service/admin/…`) |
| --- | --- | --- |
| Overview | Workspace status | `overview` |
| Agent | Runtime agent configuration | `config` (shared document, revision-checked save) |
| Web search | Search provider settings | `config` |
| Knowledge | Sources and indexing; polls while indexing | `knowledge/sources`, `…/{id}/reindex` |
| Skills | Skill configuration | `config` |
| MCP servers | Stored only, not yet connected to the agent | `config` |
| Plugin | Connector release | `public/downloads/release.json` |
| Audit log | Admin change history | `audit` |

### Development fixtures — never in production

`/dev/ux`, `/dev/chat-composition` and `/api/dev/agui-replay` return 404 outside development. They replay saved or controlled output; they do not qualify live behavior.

## 6. Behavior requirements

- Streaming completion changes available actions even when the text stays identical; reloaded answers match their completed streaming version.
- Selecting a room attaches the correct project, plan version and element identity; stale context is visible.
- An old schedule never silently adopts a new model's identity. Revit-derived BOQ data is distinguished from conceptual estimates; units and source version travel with every export.
- Markdown, composition and navigation never confer Revit approval or run model-generated code.
- Narrow screens: 44px primary targets, 16px inputs, questions that scroll internally so the composer stays visible.
- Test public shares independently; keep the image restrictions and artifact authorization.

## 7. Do's and Don'ts

Use semantic roles, visible focus, contained scrolling, real metadata and exact identity-bound actions. Compare rendered dark, light and narrow states. Keep reference evidence, fixtures and real service or native acceptance separate. Do not invent agents, clocks, quotas, ownership, immutable history or verified outcomes. Do not darken construction sheets or swap in a generic design direction.
