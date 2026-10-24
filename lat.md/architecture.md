# Hosted workspace

DATUMM web reuses the Studio presentation and the existing hosted task service, while account identity and native model authority remain explicit.

## Task lifecycle

Clerk authenticates browser users; the server proxy forwards their token to the configured HTTPS orchestrator. Existing v2 tasks persist conversation, plan versions, events and outcomes through the hosted LangGraph harness.

The hosted request envelope excludes desktop-only project and attachment fields. Unsupported source data is rejected rather than silently discarded. This frontend does not host an OpenCode worker or expose local runtime credentials.

The service proxy forwards Ask and Plan clarification replies, cancellation, queue controls and design review to v2. A separate preview can select the isolated hosted OpenCode gateway through server-only ORCHESTRATOR_URL; production routing stays configured independently.

New chat submissions check saved active tasks before creation and offer to open the blocking chat while retaining the unsent draft. This advisory check never approves or cancels work; backend admission still handles races and durable rejections.

Preview exports trace their font and native Resvg/Sharp companions. Raster libraries load only for preview requests so task and account requests can start independently of image conversion.

Vercel deployments explicitly exclude local npm caches, build outputs, environment files and artifacts through `.vercelignore`; server credentials are configured in the linked project environment.

## Review and authority

Studio layout does not install a desktop bridge. Authenticated task commands accept plans and approve exact proposals; the separately installed Revit connector validates the native operation and its original identity.

The connector download points to the public alpha.29 unsigned candidate with its checksum and exact source commit. The compatible annual API range and unqualified live2026.5 gate remain explicit in release metadata.

Studio chrome is independent of native authority. Global 3D layout rules live in the global stylesheet so CSS Modules retain their required local scope.

Settings navigation uses the same Button component and navigation class as the desktop, preserving inline icons, label spacing and compact controls across both surfaces.

Browser sign-out and account switching reset mounted workspace state. Native window controls and desktop runtime settings are unavailable in the browser. See [[contracts#Hosted contract tests]] for the serialization boundary.
