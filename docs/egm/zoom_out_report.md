# Initial Zoom Out review

Date: 12 November 2026. Target: `design_draft.md`, initial 458-line draft. Both fresh reviewers used GPT-6.1 Sol with high reasoning. Both completed their persona, Zoom Out standard, full target, permitted local reference/source/gap context and relevant source inspection. No browser actions, builds, tests or writes by reviewers.

| Reviewer | Status | Result |
| --- | --- | --- |
| Zoom Out | Completed | No findings. Existing state/service seams are reused; Assets/search have bounded presentation responsibilities. |
| Inventive Catalyst | Completed | IC5-1, Major advisory: the existing output provider keys a wrapper containing the whole shell, contradicting continuous shell/composer lifetime on first task admission. |

IC5-1 resolution: **PROPOSE FIX — applied to the plan**. Separate output invalidation from shell lifetime. M3 now explicitly changes the provider, carries scope epochs through registrations/feedback/focus callbacks, prevents stale-scope exposure before descendants render, and tests first admission plus A→B→A isolation. Preserve the account boundary and exact drawing identity reset. This is a textual implementation requirement; production code has not changed in this planning phase.

This is the initial review stage, not a two-round convergence claim.
