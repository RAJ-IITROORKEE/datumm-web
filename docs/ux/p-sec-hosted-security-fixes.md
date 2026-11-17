# Phase packet — P-SEC: hosted security fixes from the desktop line

| Field | Value |
| --- | --- |
| Status | approved 17 Nov (user: "Yes, P-SEC next"); built, reviewing |
| Depends on | none (C1–A4b already on `main`) |
| Approved by / date | owner, 17 Nov 2026 |
| Base commit | backend `datumm-orchestrator` `main` = `115980f`; desktop source `datumm-opencode` `origin/main` = `9a24261`, shared base `2aace05` |

## 1. Goal and non-goals

The live backend gets the hosted security fixes the desktop line made after `2aace05`: an expired proposal can never be
approved, new share links expire, the Clerk check can require an audience and never trusts localhost outside local
mode, device sign-in gets a user code and a start rate limit (both default off), spreadsheet exports neutralise formula
cells, and history requests are strictly typed. Source of the list: `desktop-harness-comparison-2026-11-17.md` row
"Hosted security fixes after 12 Nov".

Out of scope: desktop-only `apps/domain-api/local/` changes (approve timeouts, restart recovery, worker bounds,
package-review deletion), native drafting features (`agent_draft_preview.py`, `agent_draft_verify.py` grid/arc work),
the non-security move of `task_report_context` into `main.py` (desktop `5e77d58`, lazy-import boundary), any web code,
`stack.json` or template change. `workflow.py` approval semantics are untouched.

## 2. Fixes found in `2aace05..origin/main` (shared hosted modules) and their status

Desktop `path:line` is in `origin/main`; ours is `datumm-orchestrator/apps/domain-api` after the port.

| # | Fix | Desktop commit, location | Ours | Status |
| --- | --- | --- | --- | --- |
| 1 | Proposal expiry re-checked before approve, fail closed (`assert_unexpired`); admission reads expiry the same way | `19bb1a6` (NB-05/SEC-D-08), `5e77d58`; `main.py:740`, `main.py:1113` | `main.py:813`, `main.py:825`, `main.py:1192` | ported |
| 2 | Share-link expiry: `SHARE_TTL_DAYS = 30` on new links, instant compare, malformed = expired, legacy rows valid | `e7f069c` (SEC-D-0x), `5e77d58`; `share_api.py:13`, `:65` | `share_api.py:13`, `:65`, `:79` | ported |
| 3 | Clerk `aud` checked when `CLERK_JWT_AUDIENCE` set; `authorized_parties` property, localhost only in local mode | `e7f069c`; `auth.py:11`, `settings.py:5,12,34` | `auth.py:11-15`, `settings.py:5,12-13,39`, `desktop_auth.py:147` | ported |
| 4 | Local-token compare on bytes (non-ASCII bearer is 401, not 500) | `e7f069c`; `auth.py:24` | `auth.py:27` | ported |
| 5 | Strict `HistoryRequest` (`expectedTaskVersion` int ≥ 1) and unique operation ids on POST/DELETE history routes | `e7f069c`; `task_api.py:32`, `:183`, `:293` | `task_api.py:39`, `:293`, `:403` | ported |
| 6 | Device authorization: base-20 user code, approver view (requester IP, time), lockout after 5 wrong codes, 10/min start limit per trusted IP | `df00d01`, `4d3a02e` (SEC-D-02); `main.py:361-418` | `main.py:399-466` | ported, default off (see 5) |
| 7 | Formula escaping in exports: legacy CSV branch uses `_safe_text` | `be873d1` (SEC-D-01); `main.py:1357` | `main.py:1419` | ported; unified CSV/XLSX already escaped here (test passed first) |
| 8 | Hosted write-path characterization test and authority table | `a3373d9` (PR-A-02) | `test_hosted_write_paths.py`, `docs/architecture/native-build.md` "Hosted approval authority" | ported (test only) |
| 9 | `task_report_context` moved from `unified_reports.py` to `main.py` | `5e77d58` (L1-B) | — | deferred: refactor, not security |

## 3. Design

Backend only; no screen changes. Semantics ported hunk by hunk with a byte-level patch so `main.py` (mixed) and
`share_api.py`, `README.md` (CRLF) keep their endings. New lines are ≤ 120 chars.

## 4. Change list (owner: backend)

- `apps/domain-api/main.py`: imports (`os`, `time`, `Request`); device-authorization block; `assert_unexpired`,
  `_expired_without_native_work`; one line in `resume`; legacy CSV `_safe_text`.
- `apps/domain-api/auth.py`, `settings.py`, `desktop_auth.py`, `share_api.py`, `task_api.py`: as in section 2.
- Tests added: `test_approval_expiry.py`, `test_device_authorization.py`, `test_domain_low_batch.py`,
  `test_hosted_write_paths.py`, `test_report_formula_escape.py`; one test added to `test_pending_admission.py`.
- Docs: `apps/domain-api/README.md` code map, `lat.md/hosted-opencode.md` "Hosted security hardening",
  `docs/architecture/native-build.md` "Hosted approval authority".

## 5. Contract and config changes

- `POST /v1/runs/{id}/resume`: 409 `PROPOSAL_EXPIRED` for missing, malformed or past `expiresAt`, before any relay.
  Stricter only; Revit native approval is not weakened.
- `POST /v1/device-authorizations` adds `userCode`; `GET .../{id}` adds `requesterIp`, `requesterIpTrusted`,
  `createdAt`; `POST .../approve` accepts optional `{user_code}`. Additive; the web connect page
  (`src/lib/device-authorization.mjs`) sends no body and reads only `name`/`approved`, so it keeps working.
- `POST/DELETE /v2/tasks/{id}/history/{action}`: body must be `{expectedTaskVersion: int ≥ 1}`, else 422 (was 409).
  The web always sends it.
- New env settings, all defaulting to today's live behaviour, none set in the stack:
  `CLERK_JWT_AUDIENCE` (empty = no `aud` check), `DATUMM_DEVICE_USER_CODE_REQUIRED` (unset = code optional; turn on
  only once the add-in shows the code and the connect page asks for it), `DATUMM_TRUST_FORWARDED_FOR` (unset = no
  start limit, socket peer recorded as untrusted).
- `CLERK_AUTHORIZED_PARTIES` default changes from localhost to empty. The live task sets it from the stack parameter
  `ClerkAuthorizedParties` (`infra/orchestrator/stack.json:689`), so live is unchanged except that entries are now
  whitespace-trimmed. Local runs must set it or `DATUMM_LOCAL_MODE=true`.
- No stack/template change was needed.

## 6. Risks

- A run whose proposal has no `expiresAt` can no longer be approved (fail closed); such rows are legacy only.
- Share links made after deploy die after 30 days. Known limit (same on desktop): `POST share` returns the existing
  active row even when expired, so the owner must revoke and share again to get a working link.
- A task at `taskVersion` 0 (created, never submitted) can no longer be pinned/archived (422).
- Start rate limit is per process (`ponytail:` comment); real ceiling is 10/min × task count.

## 7. Tests

Each ported test was run on `115980f` code first: 17 failed + 8 errors (expiry, device code, low batch, malformed
admission); `test_hosted_write_paths.py` and `test_report_formula_escape.py` passed first (characterization of code
we already had). After the port all pass. No browser scenarios: no UI change.

## 8. Acceptance criteria

- `cd apps/domain-api && uv run --frozen pytest -q -p no:cacheprovider`: 723 passed + 26 subtests (baseline 673 + 26).
- `npx lat check` (Node 24.18.0): all checks passed.
- No existing test changed.

## 9. Rollback

Revert the P-SEC commit. Data left behind: `shares.expiresAt` on links created meanwhile (ignored by old code, so
they become non-expiring again); `authorizations` rows carry extra fields and expire in 5 minutes anyway.

## 10. Result

| Item | Outcome |
| --- | --- |
| Commit | orchestrator `main` (D24: main only, no branch) |
| Independent review (Opus, 17 Nov) | no high findings; port matches desktop `2aace05..9a24261` hunk for hunk |
| Fixed after review | M1 re-share after expiry mints a new link and returns `expiresAt`; M2 refresh treats a missing or malformed proposal expiry as expired (same rule as approve), so it is never a dead end; L2 `expectedTaskVersion` accepts 0 so unaccepted orphan tasks stay deletable; L3 the device claim re-checks the lockout; L5 CSV `source` and `documentId` cells escaped |
| Kept as is | L1: the early expiry refusal leaves the run awaiting approval (not failed), so "Refresh expired review" works; the detail stays `PROPOSAL_EXPIRED` (tests and add-in path rely on it) |
| Gates run | pytest 723 passed + 26 subtests; `lat check` passed; 17 Nov 2026, after the fixes |
| Browser evidence | none (backend only); live checks recorded in the go-live plan |
| Not run or not verified | `npm run graph:update`/`check:graph`; real Clerk token with `aud` |
| Deployment cautions | keep `DATUMM_DEVICE_USER_CODE_REQUIRED` off until the connect page has a code field (web pairing posts no body); turn `DATUMM_TRUST_FORWARDED_FOR` on only after checking the CloudFront hop order |
| Next step | release; later, add the user-code field to the connect page and the add-in |
