# Phase packet — <phase id>: <name>

Copy this file to `docs/ux/<phase-id>-<short-name>.md` before the phase starts. Fill sections 1–9 and get approval before changing application code. Fill section 10 at the checkpoint. Keep it short: link to source and evidence instead of pasting them.

| Field | Value |
| --- | --- |
| Status | proposed / approved / building / reviewing / done / blocked |
| Depends on | phase ids that must be done first |
| Approved by / date | |
| Base commit | |

## 1. Goal and non-goals

One paragraph on the outcome a user or admin sees. List what is explicitly out of scope.

## 2. Current state (verified)

What exists today, each item marked *implemented and tested*, *implemented, under-tested*, *local or controlled only*, *planned* or *deferred*, with `path:line`. Do not copy status from older documents without checking source.

## 3. Design

Screens or flows affected (link the section of [DESIGN.md](../../DESIGN.md)), reused components (`ui/`, `vendor/affectui/`), and references (affectUI links, Panda-agent, AG-UI docs) with what each contributes.

## 4. Change list

Files to add, edit or remove, one line each. Name the single owner of each shared file.

## 5. Contract changes

AG-UI events, request or response schemas, proxy allow-list entries, backend endpoints, storage. Mark each as frontend-only, needs backend work (size S/M/L), or touches v2 or checkpoint compatibility.

## 6. Dependencies and risks

New dependencies (need approval), ordering constraints, and the top risks with how each is contained.

## 7. Tests and browser scenarios

Unit and contract tests to add. Browser scenarios as numbered steps with the expected result, at desktop and 390px widths, light and dark. Say which are local fixtures and which need the hosted service.

## 8. Acceptance criteria

Checkable statements. Include the standing gates: `npm run typecheck`, `npm test`, `npm run build`, `lat check`.

## 9. Rollback

How to undo the phase (revert commit, flag, route) and what data or checkpoint state could be left behind.

## 10. Result (fill at checkpoint)

| Item | Outcome |
| --- | --- |
| Commit | |
| Gates run (command, Node version, counts, date) | |
| Browser evidence (tool, URL, scenario, result) | |
| Not run or not verified | |
| Limits found | |
| Next step | |

After filling this: overwrite [HANDOFF.md](HANDOFF.md), update the phase's row in [PLAN.md](../../PLAN.md), commit.
