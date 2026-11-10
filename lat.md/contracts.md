---
lat:
  require-code-mention: true
---
# Hosted contract tests

The runnable checks protect the strict hosted v2 request boundary against accidentally sending desktop-only metadata or losing user source data.

## Strict envelope

Empty desktop metadata is omitted from hosted requests while idempotency, versions and the complete command are retained.

## Reject unsupported sources

Project identifiers and nonempty or malformed attachment collections fail before dispatch so the UI cannot silently omit user evidence.

## Blocked new chat

Running work and native-context or Build requests blocked by a pending review preserve the prompt and return the saved chat identity without cancelling or approving it.

Independent Ask and Plan requests may pass a pending review. The backend remains authoritative for inferred Revit context and concurrent execution.

## Native preview encoding

The installed native raster libraries render the traced font and encode actual PNG and JPEG outputs, exposing missing native companions before deployment.

## Browser request boundaries

A running production build presents Studio without native window controls, rejects missing or foreign request origins, rejects unsupported source data and keeps anonymous service access closed.

## Ask and Plan proxy routes

The actual proxy forwards questions, cancellation, queue edits and design review to v2, rejects native task routes, and preserves existing Azure run routing and request bodies.

## Browser sidebar history

Hosted chats with project identifiers remain visible without desktop project groups. The actual sidebar predicates preserve pinned separation, desktop grouping and the server's newest-first order.

## Sign-in gate

Signed-out visitors see a non-dismissible Clerk sign-in dialog instead of the workspace; loading and unconfigured-auth states are decided by one pure helper.
