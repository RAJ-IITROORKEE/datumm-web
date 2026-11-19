# src/lib

Pure logic and adapters. Most modules are `.mjs` with a matching `.d.mts` type file so Node's test runner can import them without a build; a few are `.ts`.

## Areas

| Area | Modules |
| --- | --- |
| AG-UI chat wire | `agui/adapter.mjs`, `agui/answer-draft.mjs` (draft suffix, extend and replace decisions, and what a message shows), `agui/recorded-replay.mjs`, `agui-chat-transport.ts`, `chat-start.ts`, `hosted-command.mjs`, `task-command.ts`, `task-projection.ts` |
| Turn and answer rules | `conversation-turns.mjs`, `conversation-result.mjs`, `turn-nesting.mjs`, `process-activity.mjs`, `answer-outputs.mjs`, `answer-presentation.mjs`, `chat-composition.mjs`, `agent-todos.mjs`, `question-stepper.mjs`, `stop-requested.mjs`, `settled-poll.mjs`, `prompt-drafts.mjs` |
| Plan and drawing | `plan-geometry.mjs`, `plan-3d-geometry.mjs`, `redlines.mjs` (redline intake: build the read request, parse `datumm.redlines.v1` strictly, default ticks, apply queue; `redline-file.ts` is its browser-only image and PDF reader), `plan-checks.mjs` (parse and word `datumm.findings.v1`, per-alternative checks and the recommendation; never throws, returns null on unknown shapes), `layout-critique.mjs` (the layout critic's advice for the Checks tab: shown only when its binding matches the drawing on screen), `revision-package.mjs` (validates `datumm.revision-package.v1`, writes the per-version change log, summarises checks, and reads acceptance), `plan-viewport.mjs`, `plan-pdf.ts`, `drawing-presentation.mjs`, `drawing-export-identity.mjs`, `preview-raster.mjs`, `review-report.mjs`, `workspace-assets.mjs`, `workspace-layout.mjs`, `work-area-contract.ts`, `work-modes.mjs` (Design / Review modes, the old-section to drawer mapping, and the in-memory "Review opened" gate), `model-health.mjs` (Revit checks: parse `datumm.model-health.v1` strictly, with its `warnings` (a missing block reads as unavailable), group Problems, Notes and Revit warnings, `warningDelta` (new and resolved between two checks), parse `datumm.plan-model-compare.v1`, build the read-only select/zoom request, read floor-plan views, the measured light drawing (`get_plan_snapshot`, the default) and the bounded PNG render), `device-choice.mjs` (which Revit device the workspace uses after a device list refresh: keep an online choice, else the first online device) |
| Account, settings, admin | `auth-gate.mjs`, `onboarding-profile.mjs`, `project-brief.mjs`, `settings-navigation.mjs`, `web-configuration.ts`, `appearance.ts`, `admin-access.mjs`, `admin-config.mjs`, `admin-tools.mjs` (tool catalog rows and per-mode switches), `skill-md.mjs` (SKILL.md parse and format), `skill-versions.mjs` (per-skill versions and restore), `skill-preview.mjs` (test-a-prompt request and response), `permissions.mjs` (approval mode and tool-approval card rules), `device-authorization.mjs`, `plugin-setup.mjs`, `share.mjs` |
| Navigation state | `sidebar-history.mjs`, `chat-seen.mjs` |
| Composer model and context display | `model-display.mjs` (picker labels, optional `modelInfo`), `context-meter.mjs` (ring maths from `data.usage`), `run-steps.mjs` (TR1 `tasks/{id}/steps` parse, duration, token and cost wording, and the tree rows and WAI-ARIA key handling), `daily-usage.mjs` (U2 `me/usage/today` parse and the "N left today" / limit wording) |
| Backend access | `backend.ts`, `request-body.ts` |
| Theme tokens | `themes/affectui.json` is the active theme; the other palette files remain for the appearance migration and carry their own licenses |

## Rules

- Every module has a test in `tests/<name>.test.mjs`. New logic ships with its test.
- A module is pure: no React, no DOM, no network unless it is an adapter named for that job. UI calls lib; lib never imports from `src/components`.
- Ship a `.d.mts` beside each `.mjs` and keep it in sync with the exports.
- Validate at trust boundaries (request bodies, backend payloads, stored drafts) with Zod or explicit guards. Reject unknown input rather than silently dropping it.
- Identity is never inferred: task, turn, execution, plan version and fingerprint are carried and compared exactly.
- Mark contract tests with `// @lat:` and keep `lat.md/` links valid when renaming or deleting a module.
- Comments explain why. Name functions for the rule they enforce.
