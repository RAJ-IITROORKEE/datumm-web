# Backend contract evidence

12 November 2026. Source audit for the approved integration slice. Sibling repositories were read only; no backend, cloud, server, connector or native process was changed or started. This evidence supplements [integration contracts](integration-contracts.md).

## Runtime identity and evidence order

The parent integration task inspected current Vercel configuration and public health responses read only on **12 November 2026**: production uses an AWS CloudFront origin; the hosted OpenCode canary preview branch uses a different CloudFront origin. Production `/health` returned `datumm-orchestrator`, version `0.5.0-alpha.16-r1`, task/event version 2, source commit `2aace05d66e4789eab403fa03be7571a53980ed4`, single-uvicorn-worker topology; `/healthz` returned 404. Preview `/healthz` returned `datumm-hosted-opencode`, version `2.1.4`, `nativeAvailable:false`, isolated-canary namespace. Production therefore exposes the existing orchestrator contract behind AWS CloudFront; the OpenCode preview is separate. No environment secrets are recorded here.

The migration checkout's `docs/verification/aws-migration-2026-11-11.md` says production still used Azure and AWS was an isolated canary at that checkpoint. That production-location statement is superseded by the current Vercel configuration inspection. Its isolated-canary description is consistent with source, but current production behavior must be checked independently. Do not infer either an Azure or OpenCode contract solely from the repository name or hosting provider.

| Checkout | Revision inspected | State before inspection |
| --- | --- | --- |
| `../Datumm-opencode` | `971acc2b7039c16e27cf454007e3735e88c44e02` | Clean; branch `claude/search-cap-per-source` |
| `../Datumm-opencode-aws-migration` | `e6ae5401522b4ca5dbe5c0401571e0c06f704095` | Branch `codex/aws-production-migration`; existing modified `apps/domain-api/main.py`, `lat.md/distribution.md`, `lat.md/hosted-opencode.md` and untracked admission test/migration evidence preserved |

Paths in the sections below are relative to those sibling roots, except paths explicitly labelled **web**. The production source commit is present in the original checkout's Git objects and was inspected with `git show`, without changing that checkout. Its task API, task contracts and analysis reports match the original working tree byte-for-byte. `unified_reports.py` has the same schema plus a frozen view-only revision fallback from matching context/view pages. Its `main.py` also includes a desktop-auth router absent from the current working tree. Source commit identity is stronger evidence than a checkout name; authenticated measured/verified report and native behavior still need runtime qualification.

| Public identity probe defined in source | Meaning |
| --- | --- |
| `apps/domain-api/main.py`: `GET /health` | Legacy orchestrator service/version, source commit, task/event contract version 2, legacy execution version 1, execution topology. `/v1/config` requires Clerk and exposes models/defaults, configured/local/owner/agent flags; this implementation does **not** expose `supportedExports`, runtime or native capability flags. |
| `apps/domain-api/hosted/entry.py`: `GET /healthz` | Hosted OpenCode version 2.1.4, `nativeAvailable:false`, `historyNamespace:'isolated-canary'`. Its admitted requests delegate to the local sidecar. |
| `apps/domain-api/local/entry.py`: `/v1/config` | Explicit runtime, durable/identity/native flags and `supportedExports`. Those local fields cannot be assumed on the legacy orchestrator. |

The hosted gateway allowlist permits exports `json`, `md`, `docx`, `svg`, `plan`; it does **not** expose report JSON, BOQ CSV or XLSX through that public gateway. It rejects Build, device IDs, native read context and source attachments. Shared modules containing report generation do not override that route boundary. Clerk subjects must also be on its explicit small canary allowlist.

## Authentication and browser connection

**Web** `src/lib/backend.ts` obtains the server-side Clerk session token and sends a bearer token to the configured HTTPS service origin; redirects are rejected. The domain's `auth.py::principal` checks RS256 signature, issuer, `exp/iat/sub/iss` and exact `azp` membership in configured authorized parties; ownership is the Clerk subject. The opt-in local-development token branch is separate. `settings.py` names provider, Clerk, Mongo, dashboard and feature configuration; defaults are not deployed configuration evidence.

The actual connector browser route emitted by both legacy sources is `/connect?request=<requestId>`, from `main.py::start_authorization` and `settings.dashboard_url`. The web proxy already admits the following authenticated read/approve calls:

| Operation | Exact source contract |
| --- | --- |
| Connector starts `POST /v1/device-authorizations` | `{name:string[1..80], challenge:64 lowercase hexadecimal SHA-256 characters}` → `{requestId,verificationUri,expiresIn:300,interval:3}`. This is connector initiation, not a browser sign-in endpoint. |
| Browser `GET /v1/device-authorizations/{requestId}` | Requires Clerk; returns `{name,approved:boolean}`; expired/missing request → 404. The browser may display the actual connector name for explicit review. |
| Browser `POST /v1/device-authorizations/{requestId}/approve` | Requires Clerk; atomically sets previously empty owner; success `{approved:true}`; expired/already authorized → 409. A page visit is not approval. |
| Connector `POST /v1/device-authorizations/{requestId}/token` | `{verifier:string[43..128]}`; challenge is SHA-256 hex of verifier. Pending → 202, invalid/expired → 400; successful one-time redemption → `{deviceId,token}`. The browser should never request or display this connector token. |

This authorizes device registration only. Native exact-proposal approval remains separate. There is no reject endpoint in this connector contract; allow expiry/close without approval rather than inventing one. The authenticated details endpoint is not owner-filtered before approval and returns only connector name/approved state; do not interpret `approved:true` as proof of the current browser account's ownership.

Desktop account sign-in is a **different** extension: `docs/architecture/desktop-auth.md`, `apps/desktop/src/main/auth.ts` and `auth-fixture.ts` define `/desktop/challenges`, `/desktop/authorize?id=...`, `/desktop/confirm`, `/desktop/poll`, `/desktop/cancel`, `/desktop/refresh`, `/desktop/revoke`. It uses pinned origin/key, base64url challenge hashing, subject-bound signed assertion and rotating renewal secret. At the production commit, `apps/domain-api/desktop_auth.py` implements all seven routes and `main.py` includes the router, although this file is absent from the inspected working tree. The broker requires its own trusted proxy secret; `GET /desktop/authorize` returns challenge-bound `{csrf,device}`; confirmation additionally requires Clerk and exact configured Origin. The current web repo has no corresponding desktop route/proxy, and its generic backend helper only accepts `/v1` or `/v2` routes. A browser page needs the dedicated broker proxy/configuration, not a guessed generic route. Do not reuse connector authorization tokens/identity. No `/auth/browser` endpoint was found in these source paths.

## Task, export and event contracts

`apps/domain-api/task_api.py` defines authenticated `/v2/tasks`, `/{taskId}`, `/{taskId}/commands`, `/{taskId}/events`, `/{taskId}/export/{format}`. `task_contracts.py::CommandRequest` requires `schemaVersion:2`, idempotency key, expected task version, expected plan version and a discriminated command. Existing `chat_followup` is a conversation command, not an artifact-revision API. `approve_exact_proposal`/`refresh_exact_proposal` carry proposal ID, approval hash, document ID and revision; report interactions grant no native permission.

Task events use cursor `after>=0`; each public event has event/sequence/task identities and optional step/job/operation identities. The stream emits a full `{stage:'snapshot',run:...}` after terminal/waiting state and drained cursor. A closed connection is not itself task completion. Task/event/command versions are not report/model revisions.

Both legacy task APIs authorize the root task, scan saved execution segments newest first and call `main.py::export`. Unsupported format → 404; unsupported drawing style → 422. A segment 404 permits trying an older segment; other errors propagate. Allowed legacy formats include `report-json`, `csv`, `elements-csv`, `xlsx`, `md`, `pdf`, `docx` alongside drawings/images/raw JSON. `elements-csv` with no native elements → 404. Main export responses use private/no-store and attachment filenames. Keep existing proxy/export behavior; a missing `supportedExports` field is not a universal capability denial or guarantee.

**Web** `/api/service/runs/{taskId}/export/report-json` already maps to `/v2/tasks/{taskId}/export/report-json`. Despite the alias name, this expects a root task ID. The returned dataset's `runId` is the chosen **execution segment ID**, so it legitimately differs from the requested root task ID. The report's artifact `downloadPath` contains that execution ID but the web alias treats IDs as root tasks; use the existing root-task export entry, not arbitrary returned download paths.

## Report JSON schema 1 and actual BOQ fields

`apps/domain-api/unified_reports.py::report_dataset` is the authoritative source for these fields, with quantity/evidence assembly in `analysis_reports.py`, `model_evidence.py` and native-write outcome in `outcome.py`. `main.py::export` also attaches `analysisChecks` and checks saved native/concept image availability.

| Fields | Meaning and limits |
| --- | --- |
| `schemaVersion:1`, `runId` | Dataset schema and execution identity. No stable report artifact ID or immutable report revision ID. |
| `documentId`, `revision`, `planVersion`, `plan.{planId,version,sourceKind,rooms}` | Model document/revision and selected plan identity/version, possibly null. `revision` is **model revision**, not BOQ revision. |
| `sourceKind` | `proposed`, `measured`, `verified`, `unavailable`. Verified operation read-back does not establish whole-model coverage. |
| `source`, `scope`, `levelId`, `categories`, `status`, `summary` | Service-supplied source/scope and explanatory text. Unknown remains unknown. |
| `coverage`, `coverageManifest`, `elementCoverage`, `returnedGroups`, `totalGroups`, `staleEvidencePageCount`, `limitations` | Retained coverage, per-query completeness and limitations. Complete grouped quantities and complete instance schedules are distinct. |
| `boqRows`, `groups`, `elements`, `quantityTotals` | Typed retained rows and known totals. Do not infer missing values as zero or rates/prices/currency. |
| `outcome`, `buildComparison`, `findings`, `adviceEvidence`, `adviceBinding`, `staleAdviceExcluded`, `research` | Outcome/read-back and source-bound advisory evidence; not new approval authority. |
| `artifacts[]` | `{format,available,downloadPath,runId,documentId,revision,planVersion,sourceKind,binding,datasetSchemaVersion:1}`. Format availability is per artifact; binding may describe preview/native view/illustration. Not saved BOQ history. |

`boqRows` columns: `recordType`, `category`, `levelId`, `typeName`, `typeId`, `elementId`, `name`, `count`, `centerlineLengthMm`, `centerlineLengthKnownCount`, `nativeAreaM2`, `nativeAreaKnownCount`, `nativeVolumeM3`, `nativeVolumeKnownCount`, `unit`, `value`. Measured group rows use `recordType:'quantity'`; proposed room rows use `{recordType:'room',name,count:1,unit:'m2',value}`. No stable BOQ row ID is supplied. Missing numeric evidence is null/absent, not zero.

Element fields: `id`, `category`, `name`, `typeId`, `levelId`, `roomNumber`, `centerlineLengthMm`, `areaM2`, `heightMm`, `sillMm`, `hostId`, `fromRoomId`, `toRoomId`, `createdPhaseId`, `demolishedPhaseId`. Real element IDs can be displayed; an element ID alone is not a supported focus/select operation.

`analysis_reports.py::analysis_dataset` merges contiguous matching pages, excludes stale document/revision pages, keeps instance query coverage separate and records incomplete/duplicate/conflicting evidence limitations. This is a frozen recorded read; exports do not query today's Revit model. `unified_reports.py` excludes older native quantities that do not match verified read-back identity.

The current export is reconstructed from saved execution data, including accepted comparison/plan context, at request time. No source evidence establishes a BOQ revision list, expected-artifact-version update, atomic current pointer, row update endpoint, immutable export hash or reloadable non-native revision history. D9 remains a backend dependency; do not synthesize it from model revisions or browser state.

## Current implementation seam and validation

**Web** `src/lib/review-report.mjs` validates schema 1 and produces read-only BOQ/element tables with explicit model/source identity and coverage. It rejects payloads over 2 MiB, more than 10,000 total retained rows, oversized cells, unsupported schemas and mistyped quantities rather than silently truncating data. Unknown origins stay null. Report-format artifact metadata must match the dataset's run/document/model revision/plan version/source kind. Native views and illustrations retain their intentionally different source bindings. Returned URL/path values never become browser links.

Its `reportTableCsv` exports validated retained rows with run/document/model revision/plan/source/scope/coverage columns; this local table CSV differs from the backend's richer combined report CSV. Typed negative numbers remain numeric; textual formula prefixes are neutralized; commas, quotes, multiline text and Unicode are preserved. Label local exports as retained review rows and keep authoritative service downloads distinct.

The four tests in **web** `tests/review-report.test.mjs` passed locally, covering actual-field synthetic measured/proposed payloads, model identity, missing evidence, malformed/foreign bindings, size/row rejection and typed/formula-safe CSV. The parent also downloaded an existing saved concept report through the authenticated production UI and successfully parsed it with this adapter: schema 1, proposed source/coverage, zero BOQ/element rows, unknown document/model revision, 13 artifact entries and one limitation. Its private payload stays ignored and is not reproduced here. No new agent run or native action was performed. This qualifies a real proposed/empty dataset, not measured quantities or revision history.

Sibling `scripts/check-local-report.py` and `check-report-companion.cjs` contain report/companion checks; `check-hosted-gateway.py` checks hosted account isolation/runtime. They were inspected, not executed; companion/native acceptance remains outside this audit. No deployed measured/verified report, desktop authentication, Revit or report-revision acceptance is claimed.
