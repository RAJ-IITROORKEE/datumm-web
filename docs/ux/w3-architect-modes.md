# Phase packet — Wave 3: architect modes (UX1 = CV2), canvas dock, Data settings (UI3)

| Field | Value |
| --- | --- |
| Status | approved 17 Nov 2026 (user: "Okay continue" after Wave 2; master planner Wave 3; convergence plan UI-a to UI-h approved) |
| Plans | [convergence plan](desktop-ui-convergence-plan.md) §3 (screen map, layout per mode, density rules); [revision plan](revision-agent-plan-2026-11-17.md) §3; [starred repos](starred-repos-review-2026-11-17.md) (aec-model-bridge: Approve only after the review is opened) |
| Repo | `datumm-web` only (the desktop adopts it in CV3) |
| Workers | Main agent (Opus 5.5) plans, reviews, gates and releases. Sonnet subagents (effort high): **B1** shell, **B3** dock, **B4** Data page, in parallel; then **B2** copy pass after B1 |

## 1. What already exists (checked in source)

- Sidebar state filters: All / In progress / Needs input / Ready for review (`sidebar-chats.tsx:228-236`). Done.
- The work area has four sections: Design / Activity / Assets / Exports (`workspace.tsx`, `w.workAreaSection`).
  Properties and Checks share one drawer (`design-side-panel.tsx`, W2).
- Settings has Usage (`settings-navigation.mjs`); there is no Data page. `ui/sheet.tsx` exists.
- `workspace.tsx` is 1,460 lines and `use-workspace-state.ts` 135 KB; both are oversized (AGENTS.md §8). New UI
  goes into new small files, not into these.

## 2. Scope

### B1 — mode shell (Design / Review + Details drawer)

- A **Design | Review** segmented switch in the work-area header, built with affectUI/ui primitives.
  - **Design** is today's drawing area: 2D/3D, Properties and Checks. It is unchanged except that it loses the
    Activity/Assets/Exports tabs.
  - **Review** is one full-width screen for the current task:
    - **What changed**: before vs after, when a parent version exists (use the existing `variable/diff`
      route and plan versions); otherwise "First version".
    - **Checks** (reuse `ChecksReport`).
    - **Assumptions**.
    - **Decision**: the existing actions, such as Accept plan or the exact Revit approval card. Reuse the
      components; never re-implement approval.
    - The review card in chat links to Review.
    - Approval rule (AGENTS.md §6) is unchanged. Approve buttons keep their exact binding. Accept/Approve inside
      Review is enabled only once the Review screen has been opened for that version (aec-model-bridge pattern),
      tracked per task version in memory, never stored as authority.
- A **Details** button (an `i` icon) opens a right sheet (420px; Escape closes; focus returns to the button)
  with tabs: Activity | Files (Assets) | Exports | Technical. These reuse today's panels.
  - **Technical** lists ids, versions, fingerprints, revisions and trace links. Move them here, out of the main
    view, in B2.
- Map old state: `workAreaSection` `activity` / `assets` / `exports` open the drawer on that tab; everything else
  is Design. Existing deep links and actions keep working (`openDrawing`, `openOutput`, the asset/export
  openers).
- Density (convergence §3.4): no canvas `min-height` bigger than the space left; nothing under 12px; 32px targets
  on fine pointers and 44px on coarse. Responsive: at medium and narrow widths the switch joins the pane switch.
- New files: `src/components/workspace/mode-switch.tsx`, `review-screen.tsx`, `details-drawer.tsx`, plus CSS
  modules. Pure state mapping goes in `src/lib/work-modes.mjs` with tests. `workspace.tsx` gets only the wiring.

### B2 — plain-language copy pass (after B1)

- Main-view strings move to plain words; ids, fingerprints, revisions, run ids, model ids and "trace" wording
  move to Details → Technical.
- Use the `ux-writing` / `impeccable` skills. Do not change the exact approval wording that binds to a document,
  revision or proposal; it only moves into the approval card's own "Exact details" disclosure if it is not
  already there.
- Update tests that pin strings, changing only their expected text.

### B3 — canvas tool dock and shortcuts (`plan-canvas.tsx`, `plan-dock.tsx`)

- One floating dock at the bottom of the canvas, grouped: select / pan / measure / comment | undo, redo
  (if they exist) | 2D/3D switch | fit and zoom | display. This replaces scattered tool buttons, using the same
  actions. The pattern is behaviour only (Shaper reference); our theme and components.
- Single-key shortcuts that are active only when the canvas has focus: V select, H pan, M measure, C comment,
  F fit, 2 and 3 for the views. Shortcuts never fire while typing. A `?` overlay lists them, and Escape closes it.

### B4 — Data settings page (UI3)

- A new "Data" section under Personal, explaining what DATUMM keeps and for how long, read-only:
  - chats and runs: finished chats are kept 180 days, then removed (W0.4);
  - share links expire after 30 days (P-SEC);
  - plan versions, briefs and attachments;
  - backups.
- How to delete or export: link to the existing per-chat delete/export and share-revoke actions.
- No new destructive bulk actions in this phase.

## 3. Tests and acceptance

- Unit: `work-modes.mjs` mapping; the Review-gate logic (Approve is disabled until Review has been opened); the
  shortcut map that ignores typing targets; the Data section in settings navigation and search.
- Gates: typecheck, `npm test`, build, `lat check`.
- Browser (main agent, localhost, then live):
  - switch Design/Review;
  - Review shows what changed, checks and assumptions, and Accept is enabled after opening;
  - Details opens on each tab, closes on Escape and returns focus;
  - the dock and shortcuts work, and `?` shows the list;
  - widths of 1280, 1000 and 390 work without overflow;
  - Settings → Data reads correctly;
  - no console errors.
- No backend change, so no backend release.

## 4. Rollback

Revert the commits. Stored UI state stays compatible: the old section values still parse.

## 5. Result

| Item | Outcome |
| --- | --- |
| B1 shell | `work-modes.mjs`, `use-work-modes.ts`, `mode-switch`, `review-screen`, `review-decision` and `details-drawer`; `inspector` rewritten. Stored `workAreaSection` is unchanged: Activity, Assets and Exports open the drawer on Activity, Files or Exports, and Technical is local drawer state. The Review gate keys on plan version plus the proposal approval hash and lives in memory only. It disables Accept and Approve in both the chat card and Review until Review is opened; what they send is unchanged. |
| B2 copy | About 30 main-view strings rewritten or moved: approval ids and hashes into a collapsed "Exact details"; revision and model ids into Technical; "v1" became "Version 1"; "Assets" became "Files". Binding approval text is unchanged. The Review header no longer repeats the version. Drawer focus returns to the opener. The canvas dock now drives 3D zoom (`zoomRequest`), so the duplicate 3D zoom controls are removed. |
| B3 dock | `canvas-shortcuts.mjs` (V H M C F 2 3 ? Esc; ignores typing, modifiers, repeat and IME); `canvas-dock` with one toolbar; a `?` dialog. Old scattered controls removed so each action exists once. |
| B4 Data | Settings → Data & privacy, read-only: 180-day retention, 30-day share links, encrypted daily backups (confirmed: SSE-AES256 on the backup bucket), how to delete or export, and the Revit approval rule. No new destructive actions. |
| Gates (main agent, 17 Nov) | Typecheck clean; `npm test` 920/920; build exit 0; `lat check` passed. |
| Localhost browser, against live data, read-only | On the real Dental clinic chat: the Design/Review switch, Details and the dock render. Accept is locked with "Open Review to see what changed before you accept", and unlocks after Review is opened. Review shows what changed (first version), Checks "No problems found", the assumptions and the decision. The Details tabs work, with Technical holding the ids. Escape returns focus to Details after the fix. At 1000px: one pane with Chat, Design, Review and ⓘ. At 375px: no horizontal overflow. 3D shows only the dock controls and the plain caption. |
| Live | `adbe39c` deployed by Vercel and smoke passed. On datumm-web.vercel.app (Dental clinic chat, read-only), "Open Review to see what changed before you accept" shows; after opening Review, Accept is enabled in both places; Review shows what changed, the checks and the assumptions; the 9 API calls on this load all returned 2xx. |
| Not checked | The 390px dock scroll, coarse-pointer targets and the screen-reader announcements were checked only in code and tests, not by hand. No Accept or Approve was clicked against live data. `workspace.tsx` grew by about 30 lines. |
