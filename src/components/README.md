# src/components

All UI. `workspace.tsx` composes the studio from `workspace/`; state lives in one hook (`workspace/use-workspace-state.ts`) and each panel receives it as props.

## Folders

| Folder | Holds |
| --- | --- |
| `ui/` | shadcn-style primitives: Button, Card, Dialog, DropdownMenu, Input, Sheet, Switch, Tooltip and others (Radix, `cva`, `tailwind-merge`) |
| `vendor/affectui/` | 22 pinned affectUI MIT sources with `PROVENANCE.md` and digests. Change only through the recorded patch process |
| `workspace/` | Sidebar, conversation, composer, turn process, plan dock, and the right work area (`inspector.tsx` hosts Design and the full-width Review screen; `mode-switch.tsx` is the Design | Review switch with the Details button, `review-screen.tsx` and `review-decision.tsx` are Review, and `details-drawer.tsx` is the 420px right sheet with Activity, Files, Exports and Technical; `run-steps.tsx` is the Activity tab's Run steps tree, behind capability `runSteps`) |
| `ai-elements/` | Conversation, message and tool building blocks for the chat |
| `review/` | Plan review card, exact-proposal approval panels, and the printable Revision package page (`revision-package-page.tsx` loads and gates, `revision-package-view.tsx` renders and prints) |
| `onboarding/` | Account onboarding gate and profile editor |
| `billing/` | Pricing plans |
| `connections/` | Connector device authorization |
| `admin/` | `/admin` shell, forms and data sections |
| `dev/` | Development-only fixtures and replay previews (`run-steps-preview.tsx` is the Run steps tree under `/dev/ux`; `revision-package-preview.tsx` is the Revision package page with synthetic data) |

Top-level files are larger features: plan viewer (`plan-canvas.tsx`, `plan-drawing.tsx`, `plan-three.tsx`), the canvas dock and its `?` shortcuts dialog (`canvas-dock.tsx`, `canvas-shortcut-help.tsx`; keys come from `src/lib/canvas-shortcuts.mjs` and act only while the drawing area has focus), plan checks (`checks-report.tsx`, which also shows the separate "Design review" advice; its tabs live in `workspace/design-side-panel.tsx`, and `review/plan-review-card.tsx` shows each alternative's status), questions (`agent-questions.tsx`, `tool-approval-card.tsx`, `opencode-questions.tsx`), Permissions settings (`permissions-settings.tsx`), the read-only Data & privacy settings page (`data-settings.tsx`: retention, share links, deleting, Revit approval), activity (`agent-activity.tsx`), build review (`native-build-review.tsx`, `build-comparison.tsx`), settings (`desktop-settings.tsx`, `theme-settings.tsx`) the model picker, the composer context meter (`workspace/context-meter.tsx`) and the daily "N left today" status (`workspace/use-daily-usage.ts`, shown in `workspace/composer.tsx` when `dailyLimits` is on). The sidebar is split into `workspace/sidebar.tsx`, `sidebar-chats.tsx`, `sidebar-account.tsx` and `sidebar-rail.tsx`; the last two chat and rail files export plain functions that return elements so the sidebar stays one element tree.

## Rules

- Reuse `ui/` and `vendor/affectui/` before writing a component. New primitives go in `ui/`.
- Colors, fonts and radii come from the design tokens in [DESIGN.md](../../DESIGN.md); no hard-coded values.
- Files are kebab-case; one exported component or tightly related group per file. Styles sit beside the component as `<name>.module.css`.
- A component renders; rules live in `src/lib` as pure functions with tests. If you reach for logic here, move it there.
- Client components only where needed. Pass data in as props; do not fetch inside leaf components.
- Every interactive component handles its empty, loading, failed and stale states, keyboard use and focus return.
- Agent-composed content renders only through the bounded composition registry (`workspace/chat-composition.tsx`); never render model-supplied markup or code.
- Oversized files (`workspace.tsx`, `workspace/conversation.tsx`, `workspace/use-workspace-state.ts`) are split only inside an approved phase.
