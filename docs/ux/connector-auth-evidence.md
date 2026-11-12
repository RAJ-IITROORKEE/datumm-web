# Revit browser authorization evidence

Inspected 12 November 2026. This is static source evidence; no live authorization,
connector launch, Revit call, credential read, deployment or server mutation was
performed. REA guidance directs ordinary complete-source analysis to normal
repository tools; no external analysis runtime was needed.

## Source identity and boundaries

- `../_wt-plugin-aws-url`: branch `claude/aws-default-url`, HEAD
  `407118645bddb4ef995593cd3bf1d7ac609e8951`, clean when inspected. Its
  `.git` resolves into `../revit-datumm-plugin/.git/worktrees/`. No AGENTS.md
  was present at this worktree root. `apps/connector/README.md` describes this
  as the optional hosted connector, separate from the desktop UI.
- `../revit-datumm-plugin`: branch `main`, HEAD
  `f00f3b121e27f3324b27676bf84743703e7a4d89`. This named repository was
  inventoried first; the AWS worktree supplies the relevant connector source.
- `../Datumm-codex-deploy-c6`: legacy source snapshot. Its `.git` points at
  missing `../Datumm-codex/.git/worktrees/Datumm-codex-deploy-c6`, so Git
  cannot resolve its current branch or commit. Its AGENTS.md, handoff.md,
  plan.md and affected package READMEs were read. It is historical source
  evidence, not proof of the running AWS contract.
- Web repository initially had no `src/app/connect` directory. Its existing
  `src/app/api/service/[...path]/route.ts` already allowed authorization
  review and approval, forwarding them to `/v1/` via authenticated `backend()`.

## Actual entry path

In AWS-plugin source `revit-plugin/src/Datumm.Revit/ConnectionWindow.cs:98`,
the default server is `https://d2hwgmaqtyfvmj.cloudfront.net`. A changed server,
missing credential, explicit reauthorization or account switch launches the
connector with `--authorize`; see the same file's `Connect(bool authorize)`.

The connector does **not** construct the web authorization URL. In
`apps/connector/src/index.mjs:24–45` it starts authorization and opens the
returned `verificationUri`. It accepts HTTPS or loopback HTTP. The legacy
orchestrator constructs that URI in `apps/orchestrator/main.py:219` as:

```text
{settings.dashboard_url without trailing slash}/connect?request={requestId}
```

The only query parameter is `request`. The server generates it with
`secrets.token_urlsafe(32)` (43 URL-safe characters). This is a request identifier,
not a pairing code, verifier or device token. No browser URL contains the
connector's verifier. The actual deployed `dashboard_url` remains unverified.

## Source-defined API contract

All paths below are backend paths in the legacy snapshot's
`apps/orchestrator/main.py:211–247`. Browser calls use the existing same-origin
`/api/service/device-authorizations/{requestId}` proxy; the browser never calls
the connector start or token endpoints.

| Operation | Authentication/input | Success | Other source-defined outcomes |
| --- | --- | --- | --- |
| `POST /v1/device-authorizations` | Connector starts it without account auth. JSON `name`: string length 1–80; `challenge`: lowercase SHA-256 hex, 64 characters. | `{requestId, verificationUri, expiresIn:300, interval:3}` | Pydantic validation failure for invalid input. |
| `GET /v1/device-authorizations/{requestId}` | Authenticated browser account. No body. | `{name:string, approved:boolean}` | `404` with `detail: "Device request expired."` for missing/expired/consumed request. |
| `POST /v1/device-authorizations/{requestId}/approve` | Authenticated browser account. No body. Atomic update only while owner is null and expiry is future. | `{approved:true}` | `409` with `detail: "Device request expired or already authorized."` for missing, expired, consumed or already-approved request. |
| `POST /v1/device-authorizations/{requestId}/token` | Connector only. JSON `verifier`: string length 43–128, matching stored challenge hash. | One-use `{deviceId, token}`; deletes request and creates the owner-bound device. | Empty `202` while pending; `400` with `detail: "Device authorization expired or invalid."` if wrong verifier, expired, absent or consumed. |

`apps/orchestrator/auth.py` requires Bearer auth for browser review/approval;
missing auth yields `401 "Sign in to DATUMM."`, and bad/expired JWT yields
`401 "Session expired or unauthorized."`. Clerk issuer/signature/expiry/subject
and authorized party are checked. A local-mode test owner exists in historical
backend code; this frontend does not expose or use a bypass.

Authorization expires five minutes after creation, not five minutes after page
load. GET exposes neither creation time nor an authoritative remaining lifetime.
Do not show a countdown from page load. `storage.py:initialize` also creates an
expiry TTL index, while endpoint queries independently enforce expiry.

The connector creates 48 random bytes as a base64url verifier, sends its SHA-256
hex challenge, then polls every three seconds for up to five minutes. Credentials
are stored only after a successful one-use claim. The historical API test at
`apps/orchestrator/tests/test_api.py:274` covers unauthenticated approval,
pending claim, wrong verifier, successful claim and one-use rejection; those
tests were inspected, not rerun against the sibling source or live service.

## Web implementation and authority

`/connect?request=...` now reviews this source-defined request. It requires
configured Clerk sign-in, preserves the validated relative return URL through
sign-in/sign-up, and remains outside the workspace onboarding gate. First-time
users can authorize their computer and complete normal onboarding when they
subsequently open the workspace; onboarding never consumes or replaces the
authorization request. Duplicate, malformed or unbounded request values are
rejected locally before any service call. The browser accepts one URL-safe
identifier of 32–128 characters; the observed generator emits 43.

The signed-in review loads only `{name, approved}`. Only the explicit **Allow
this computer** click sends the approval POST. Loading, signing in, opening the
workspace and seeing an already-approved request grant no additional authority.
Success means **computer authorized**, not **Revit connected** or **model changed**.
The connector must still claim its credential and establish its connection.
Already-approved GET state does not identify the approving account, so its
copy does not claim that the current browser account approved the device.

The page distinguishes missing/expired request, approval conflict, expired
session, unknown/network/service failure and missing sign-in configuration.
On a lost approval response it offers a read-only recheck rather than blindly
repeating a POST. A consumed request can read as 404; the page directs the user
back to Revit and a fresh request without claiming to know the underlying cause.
Model changes retain separate exact proposal approval or an explicit scoped
grant. No token claim, Full Control grant, native proposal or Revit write was
added to this page.

Local verification: seven focused Node tests passed for request/return-path
validation, configured/authenticated gate, review/approval method isolation,
response validation, expiry/conflict/session/network states and cancellation.
TypeScript and `git diff --check` passed. Production build and browser review
are coordinated by the parent task; no successful live sign-in or device
authorization is claimed by these checks.

## Remaining unknowns

- Whether the running AWS service matches this legacy endpoint schema and what
  dashboard URL it returns. Verify using the actual connected environment.
- End-to-end Clerk redirect and account persistence in the real environment,
  device approval, token claim, connected-device status and expiry recovery.
- Installed plugin version, saved server selection, launcher configuration and
  credential state; no local user configuration or secrets were inspected.
- Static source establishes the flow, not operational success. No real device
  was authorized during implementation or verification.
