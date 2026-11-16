# Phase 1–2 implementation packet — 13 November 2026

The author approved development of the first two audit packages and automatic progression after each phase passes testing and browser validation. This supersedes the audit's planning-only boundary for these packages. Continue subsequent agreed UI phases after their own reviewable packet and validation gate; backend implementation/deployment, native authority, imports/conversion and uncontracted persistence remain outside this authorization.

## Contract gate and scope

Current Run records contain lifecycle status, optional structured failure/recovery, task-scoped question receipts, `agent_memory`, interpreted brief, task plan and artifacts. No universal goal-outcome field or project memory mutation API is established. A completed response is not proof of a generated concept. Use neutral response-settlement wording and actual artifact availability; do not classify arbitrary answer prose as an authoritative outcome. Preserve the reproduced concept failure as an external dependency, not a UI success.

Phase 1: meaningful recorded public process, compact checklist access, reversible Later/Show questions with preserved answers, contextual composer/empty work area, named settings destination and honest settled/no-artifact recovery. Existing full answers, source-bound tables, approval semantics and account/task isolation remain.

Phase 2: sourced Brief & decisions within Project context. Display current task/project identity, confirmed versus proposed source facts where the DTO establishes that distinction, source/version and unknown/stale limits. Existing task context is not a durable personal-memory feature. Use an explicit draft-only amendment entry into the shared composer; do not offer fake Save/edit persistence. Missing payloads have an honest empty state. Running/Needs-your-input task filters remain in the compact project overview rather than new top-level screens.

## Ownership

- Question worker: `agent-questions.tsx`, `opencode-questions.tsx`, `question-card.module.css`, and grouped-question tests. No shell/conversation edits; request integration from parent.
- Process worker: workspace `turn-process.tsx`, its module CSS, bounded process projection helper if needed and turn-process tests. No parent conversation/state edits.
- Integrator: workspace/conversation/composer/state/settings integration, phase-2 ProjectContext caller, shared props and any cross-package regression tests.
- Phase-2 worker after phase-1 gate: ProjectContext and a pure sourced-brief projection with its tests; request caller changes from integrator.
- Independent reviewer: read-only verification of identities, drafts/focus, lifecycle truth and supported data contracts.

## Validation gates

Phase 1 must pass meaningful question payload/pending/collapse/restore and process event/status tests, integration tests, sequential build/typecheck and production runtime checks, plus actual Codex browser checks of completed Ask, no-artifact Plan, long question Later/Show and destination/focus behavior. Do not require the unreleased backend semantic fix to pretend a failed concept succeeded. Record what was actually tested.

Only then implement phase 2. Test source binding, absent/partial/conflicting data, current task changes and draft-only amendment semantics. Browser-check actual Project context for a completed concept and a failed/waiting audit task, empty state, source detail, keyboard/narrow layout and return to composer. Run appropriate technical checks after changes. Update PLAN/PROJECT/HANDOFF/checkpoints after each gate with exact results and remaining backend limitations. No merge, push or release.

## Phase 1 gate — completed with an external dependency

13 November: 388/388 tests, optimized production build, sequential standalone TypeScript and all 13 production runtime checks passed. Independent source review found no new blockers. Codex browser verified plain Ask defaults to full chat, real table opens beside chat, recorded process labels, Capabilities destination, Later/Show answer retention and focus, 390px layout (16px answer inputs, 44px toggle, no page overflow), and existing concept/review preservation. Temporary question answers were cleared without submission; no native action was authorized.

The new real Plan test `e9b5880c-1c8b-5dc4-90d9-2067c65904de` requested explanation only and no questions; hosted planning still asked for footprint/orientation. The UI correctly retained Waiting for your input. Thus completed-without-drawing recovery is controlled-test coverage, not a live semantic-success claim; the existing successful Plan was observed as Response finished with its drawing. The missing backend semantic fix remains outside this UI packet and does not block Phase 2. Evidence/logs: ignored `artifacts/ux/phase1-*` files.

Phase 2 is now active automatically.

## Phase 2 gate — completed

398/398 tests, optimized production build, sequential TypeScript and all 13 production runtime checks passed. The final independent source review found no remaining blockers. Actual Codex browser checks covered matched Clinic studies context, a successful saved concept, the failed/waiting audit task with conflicting footprint/parcel records, no-task empty state, source/status/version disclosures, safe unsent draft append preserving text/focus, pending-question refusal, project All/Running/Needs your input filters and keyboard navigation. At 390px the context dialog fits without page overflow and its update/close controls are 44px high. Escape restores its opener. Temporary drafts were cleared without submission; responsive overrides were cleared. The verified context was left open at localhost:3001. Evidence: `artifacts/ux/phase2-brief.jpg`, `phase2-tests.log`, `phase2-build.log`.

This completes the authorized first two implementation packages. The sourced context is the agreed interim task-record view; D20 durable editable project memory remains a separate backend dependency. No backend/container deployment, native approval, commit, push or merge was performed.

## Next package prepared — drafting and sheets

The next approved direction is dark 2D/3D working views with a separate white Sheet/Print view. Independent preparation identified disjoint ownership: 2D navigation in PlanCanvas/CSS; 3D presentation in PlanThree/CSS; integrator-owned PlanDrawing/theme/export boundaries and annotation transforms. Preserve PlanGraph, exact plan ID/version/fingerprint, units/y-axis inversion, selections, local version-bound annotations, same mounted viewer and existing export provenance. Bounded gesture defaults can use pointer-centered zoom, pan, Fit/Home and keyboard/touch alternatives. Validate screen/world transforms and anchors, source/identity changes, white sheet exports and actual desktop/narrow browser interactions. This is a review viewer; native RVT processing and wall dragging remain excluded. The reproduced hosted concept-generation failure still blocks end-to-end primary-journey qualification.
