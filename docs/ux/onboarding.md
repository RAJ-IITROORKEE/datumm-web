# First-run onboarding

12 November 2026. D8 approved: **Google sign-in → name and professional domain → select multiple use cases → optional Revit connector → main workspace**. Application implementation has not started.

D10: individual accounts first. Do not add organization creation, invitations or team-role selection to onboarding in this release.

## Agreed requirements

- Offer Google sign-in first.
- Collect name, professional domain and multiple intended use cases, with a broad selection of relevant choices.
- Offer the Revit connector download/connection during onboarding.
- Clearly provide **Skip for now** on the connector step; a connection is not required to reach the workspace.
- Finish in the main DATUMM workspace.

## Recommended screen behavior

The following detail is proposed, beyond the approved sequence:

| Step | Content and behavior | Recovery |
| --- | --- | --- |
| Sign in | “Continue with Google”; use existing Clerk identity integration, subject to provider configuration verification | OAuth cancelled, failed or unavailable stays on sign-in with a clear retry; preserve intended return route. |
| About you | Editable name, prefilled when supplied by identity; professional domain selector | Preserve edits on Back/reload; inline field validation. Decide whether multiple domains are useful. |
| How will you use DATUMM? | Grouped multi-select use cases, searchable if the list grows; show selected count | Keep selections on Back; offer Other rather than forcing a poor fit. Required minimum and maximum remain undecided. |
| Connect Revit (optional) | Explain what connection enables; connector download, existing-install connection guidance, and prominent Skip for now | Downloaded, installed, connected and active document are distinct states. Retry/help on failure; Skip remains available. |
| Workspace | Show tailored starter suggestions and a discreet connection reminder where relevant | Skipped connection does not block Ask/Plan. Native actions explain the connection requirement at the point of use. |

Use a short step indicator, one primary action, clear Back navigation and concise explanatory copy. Save completed profile steps to the authenticated user's account through verified APIs; resume incomplete onboarding and avoid repeatedly onboarding returning users. Settings should allow later profile/use-case changes. Exact persistence schema and completion conditions need integration design.

## Proposed domain options — awaiting review

Architecture; BIM coordination/management; structural engineering; MEP engineering; interior design; construction/site engineering; quantity surveying/cost management; computational design/automation; student/educator; other.

These describe professional disciplines, not email or website domains. They tailor suggestions; they must not silently grant roles or restrict product features. Company name, phone, employer and credentials are not requested fields.

## Proposed use-case library — awaiting review

| Group | Multi-select options |
| --- | --- |
| Learn and ask | Ask Revit questions; understand an existing model; learn workflows |
| Plan and design | Building briefs; floor-plan options; space planning; room layout; design comparisons |
| Review | 2D/3D review; measurements; pinned annotations; model quality checks; coordination review |
| Document | Room/area schedules; door/window schedules; drawing documentation; reports; exports |
| Quantify | Element quantities; material takeoffs; BOQ review; compare quantity revisions |
| Automate | Repetitive Revit tasks; parameter updates; model changes through the agent |
| Explore | Research/reference gathering; custom workflow; other |

This is a proposed taxonomy, not a promise that every workflow already works. During implementation, distinguish available use cases from future interests. Do not show a starter action that cannot complete. Avoid presenting unchecked code-compliance or structural conclusions as verified engineering.

## Reference and implementation packet

Inspect [affectUI onboarding](https://www.affectui.com/screens/onboarding), [stepper form](https://www.affectui.com/components/stepper-form), [setup guide](https://www.affectui.com/components/setup-guide), and [assistant home](https://www.affectui.com/screens/assistant-home). These links were found in the catalog; their complete interactive behavior is not audited yet. Match the agreed affectUI visual foundation and adapt the content for DATUMM.

Later packet ownership: onboarding screens/profile preference persistence; coordinate with the shell and authentication owners. Reuse existing connector download/pairing flows after verification. Do not replace authentication or create a competing connector mechanism just to reproduce the reference.

Acceptance journeys: new Google user completes profile and skips connection; user connects successfully; download succeeds but Revit remains disconnected; cancellation/retry; reload midway; returning user bypasses completed onboarding; keyboard-only progression; unknown domain/use case; small viewport; settings update. Test with designated accounts and do not create real native operations as an onboarding check.

Next decision: confirm/refine the proposed domain/use-case taxonomy. OAuth provider configuration, profile storage and connector support matrix remain unverified.
