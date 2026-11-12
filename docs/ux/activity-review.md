# Activity migration review

12 November 2026 · baseline `d7a8da9` · branch `codex/ui-ux-foundation-2026-11-12`.

Independent source review of the D2 / W-D / I4 activity slice found no remaining actionable correctness issue in the reviewed candidate after the two corrections below. This is a local source/component checkpoint, not release or connected-service acceptance.

## Corrections verified

- **Task disclosure identity:** real conversation turns now use task + turn React keys; the transient streaming process also uses task + turn identity. Opening activity in one task cannot carry its disclosure state into another task with the same conversation index. Same-turn event updates retain the user's choice.
- **Lifecycle authority:** compact activity ignores stale waiting flags for completed, failed, stopped, interrupted, paused, partial, stale and blocked task states. Existing unfinished tool records remain unconfirmed rather than becoming successful when their task settles.

## Scope and checks

Reviewed compact turn activity, full tool evidence, the shared Activity panel, scoped CSS, both parent mounts, the development fixture and focused tests. Verified source preserves actual participant/session identity, finite recorded or explicitly approximate duration, missing output versus `0` / `false` / `null`, model-step detail redaction in display and search, exact selected-task event/manifest/usage binding, filter/disclosure reset, and deliberate diagnostic mounting. The existing local trace reader mounts only after its disclosure opens; this change adds no task command or native approval/execution action. Development fixture routing remains restricted to development.

The shared activity batching/turn/latest-task functions retain their baseline implementation. `process-activity.mjs`, `turn-nesting.mjs`, task projection and workspace state/command code are unchanged against the baseline.

Ran **33 targeted tests; all passed**:

```text
node --test tests/activity-integration.test.mjs tests/activity-panel.test.mjs tests/agent-activity.test.mjs tests/turn-process.test.mjs tests/turn-nesting.test.mjs
```

The new integration tests execute the actual ConversationPanel parent output to check React mount identity and per-turn evidence bindings. Component harnesses check state handlers and rendered values; they do not substitute for DOM, keyboard, screen-reader or responsive browser testing. `git diff --check` passed.

## Limits

The parent integrator owns browser qualification and final full-suite, TypeScript, production build and runtime verification. Those outcomes are recorded separately in the migration packet and HANDOFF when completed. This review did not run a browser, start a real task, invoke desktop APIs, approve or modify Revit, or verify connected-service behavior. Assistive-technology announcements and large real histories remain unqualified by this source review.
