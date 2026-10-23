# Hosted workspace

DATUMM web reuses the Studio presentation and the existing hosted task service, while account identity and native model authority remain explicit.

## Task lifecycle

Clerk authenticates browser users; the server proxy forwards their token to the configured HTTPS orchestrator. Existing v2 tasks persist conversation, plan versions, events and outcomes through the hosted LangGraph harness.

The hosted request envelope excludes desktop-only project and attachment fields. Unsupported source data is rejected rather than silently discarded. This frontend does not host an OpenCode worker or expose local runtime credentials.

Preview exports trace their font and native Resvg/Sharp companions. Raster libraries load only for preview requests so task and account requests can start independently of image conversion.

Vercel deployments explicitly exclude local npm caches, build outputs, environment files and artifacts through `.vercelignore`; server credentials are configured in the linked project environment.

## Review and authority

Studio layout does not install a desktop bridge. Authenticated task commands accept plans and approve exact proposals; the separately installed Revit connector validates the native operation and its original identity.

Studio chrome is independent of native authority. Global 3D layout rules live in the global stylesheet so CSS Modules retain their required local scope.

Browser sign-out and account switching reset mounted workspace state. Native window controls and desktop runtime settings are unavailable in the browser. See [[contracts#Hosted contract tests]] for the serialization boundary.
