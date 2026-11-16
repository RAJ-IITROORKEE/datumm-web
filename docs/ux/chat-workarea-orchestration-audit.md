# Chat and workarea orchestration audit

15 November 2026. Read-only contract audit against isolated deployed candidate `1ef3861b2e5186151df387a1e2e5a20e99f8d0c1`. This identifies existing contracts; it does not qualify a new deployment or native operation.

- Public task events carry bounded summaries and observable activity, tool and execution metadata. Projection binds a turn only when its owned execution has one unambiguous command; historical ambiguity remains unknown. Task plans are checklists, not proof that a worker ran. Do not expose private reasoning.
- Questions use versioned answer commands. Task usage separates the latest estimated context from cumulative provider usage; missing or legacy records remain unavailable. Preserve task, execution and turn scope during streaming, reload and chat switches.
- Superseded by the latest user correction: follow-up suggestion chips and their draft-insertion flow are removed. Contextual guidance is only a native empty-input placeholder. Existing first-use starter actions retain their separate draft preservation. New model-generated suggestions would need a typed, persisted, turn-bound contract.
- `accept_plan` validates the exact current plan and assumptions without a device. Explicit Build mode and preparation require further checks, including connection and native placement. Native approval binds the exact proposal, hash, document and revision; free text grants no native write authority.
- The frontend now keeps drawing acceptance standalone, including when its local mode is Build. Starting Build and reviewing placement remain explicit actions. No backend change is needed for this separation.
- Saved report history is owner-scoped and revision-bound; native element exports require actual element data. Unsupported assets and exports must remain unavailable rather than inferred from a drawing.

The focused workarea regression verifies acceptance without a device and without an automatic Build command or placement request. Existing cases cover stale task, drawing and selection identities. Candidate `lat check` passed; semantic `lat search` began building an index but did not return before interruption. Graph query completed. No candidate source or deployment was changed.

## Next investigation: final checklist evidence

The actual saved concept revision shows one of two steps confirmed. In the inspected deployed candidate, `apps/domain-api/agent_task_plan.py` maps finish_answer to response_ready and requires matching evidence plus dependencies to complete the step. The terminal concept/revision branch in `agent_workflow.py` records design_ready, generates its readiness answer, checkpoints the plan and returns without that response_ready observation. The explicit finish_answer branch does add it. This explains a possible missing receipt rather than a dropped frontend completion; the saved record's exact action/evidence still needs independent verification.

Next: inspect that record, add a terminal concept/revision reporting regression, and only emit completion if the scoped readiness report truly satisfies the step. Keep failures, missing evidence and unrelated pending steps unchanged. Backend deployment and generate/revise qualification must follow separately if source changes. The frontend already preserves explicit completed states and displays missing terminal evidence as unconfirmed.
