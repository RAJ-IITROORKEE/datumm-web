# src/components

All UI. `workspace.tsx` composes the studio from `workspace/`; state lives in one hook (`workspace/use-workspace-state.ts`) and each panel receives it as props.

## Folders

| Folder | Holds |
| --- | --- |
| `ui/` | shadcn-style primitives: Button, Card, Dialog, DropdownMenu, Input, Sheet, Switch, Tooltip and others (Radix, `cva`, `tailwind-merge`) |
| `vendor/affectui/` | 22 pinned affectUI MIT sources with `PROVENANCE.md` and digests. Change only through the recorded patch process |
| `workspace/` | Sidebar, conversation, composer, turn process, plan dock, and the right work area (`inspector.tsx` with Design, Activity, Assets, Exports) |
| `ai-elements/` | Conversation, message and tool building blocks for the chat |
| `review/` | Plan review card and exact-proposal approval panels |
| `onboarding/` | Account onboarding gate and profile editor |
| `billing/` | Pricing plans |
| `connections/` | Connector device authorization |
| `admin/` | `/admin` shell, forms and data sections |
| `dev/` | Development-only fixtures and replay previews |

Top-level files are larger features: plan viewer (`plan-canvas.tsx`, `plan-drawing.tsx`, `plan-three.tsx`), questions (`agent-questions.tsx`, `tool-approval-card.tsx`, `opencode-questions.tsx`), Permissions settings (`permissions-settings.tsx`), activity (`agent-activity.tsx`), build review (`native-build-review.tsx`, `build-comparison.tsx`), settings (`desktop-settings.tsx`, `theme-settings.tsx`) the model picker, and the composer context meter (`workspace/context-meter.tsx`). The sidebar is split into `workspace/sidebar.tsx`, `sidebar-chats.tsx`, `sidebar-account.tsx` and `sidebar-rail.tsx`; the last two chat and rail files export plain functions that return elements so the sidebar stays one element tree.

## Rules

- Reuse `ui/` and `vendor/affectui/` before writing a component. New primitives go in `ui/`.
- Colors, fonts and radii come from the design tokens in [DESIGN.md](../../DESIGN.md); no hard-coded values.
- Files are kebab-case; one exported component or tightly related group per file. Styles sit beside the component as `<name>.module.css`.
- A component renders; rules live in `src/lib` as pure functions with tests. If you reach for logic here, move it there.
- Client components only where needed. Pass data in as props; do not fetch inside leaf components.
- Every interactive component handles its empty, loading, failed and stale states, keyboard use and focus return.
- Agent-composed content renders only through the bounded composition registry (`workspace/chat-composition.tsx`); never render model-supplied markup or code.
- Oversized files (`workspace.tsx`, `workspace/conversation.tsx`, `workspace/use-workspace-state.ts`) are split only inside an approved phase.
