# Hosted authentication recovery

## Evidence, 13 November 2026

The local web app signs in through Clerk, but authenticated requests to the existing AWS orchestrator returned 401 with “Session expired or unauthorized.” The health endpoint returned 200. The local and production web apps use the same Clerk publishable key.

A read-only inspection of the active `datumm-orchestrator` ECS service in `ap-south-1`, using the named `datumm` AWS profile, found task definition revision 1. Its configured Clerk issuer matches the documented development Clerk instance. Its exact authorized-party list includes `http://localhost:3001` and excludes `http://localhost:3000`.

The service authentication code obtains the signing key from the configured issuer's JWKS, verifies the RS256 signature, issuer and required expiry, issued-at, subject and issuer claims, and then requires the token's `azp` to match an authorized party exactly. It disables audience verification. All exceptions in that chain become the same generic 401. A read-only sample of recent 401 CloudWatch events did not disclose the specific validation failure.

## Interpretation and remaining verification

The service rejects a token with `azp` equal to `http://localhost:3000`; the token claim itself was not inspected. Development now defaults to the already authorized `http://localhost:3001`. On that origin, the signed-in workspace loaded configuration, projects and history; a real Ask showed streamed progress, completed in roughly 34 seconds, and its answer and recent-chat entry survived reload. This verifies the local recovery, while the generic 401 response alone cannot isolate every original validation step. An unrelated Luna service worker had previously registered on port 3001 and intercepted the page; the browser check used a tab-scoped bypass. Persistent cleanup was not performed. This does not verify reconnect or native execution.

No AWS configuration was changed during this inspection. Preserve authentication and existing native-operation approval boundaries.

## Plan workflow result

A separate Plan test accepted a 6x8 m brief and follow-up assumptions, then streamed planning progress. Its bounded search exhausted two supported attempts without a validated layout and requested revised dimensions or requirements. This verifies authenticated planning and clarification behavior, not successful geometry generation. No native changes or approvals occurred. Browser evidence: ignored artifacts/ux/auth-plan-result.jpg. The current Codex tab is retained with the tab-scoped service-worker bypass; fresh sessions may still encounter the unrelated cached app.

