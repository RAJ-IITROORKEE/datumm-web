# Saved Project Brief & decisions

15 November 2026. The authorized hosted-web Project Brief implementation is deployed and its recorded browser checks passed. Terra 6.1 High workers implemented and reviewed the source; the parent operated the Codex browser. Broader product release remains separate.

## Scope and contract

Extend Project context with an editable project reference, separate from the existing read-only task interpretation. Each entry has a label, value, proposed/confirmed state and a user note or server-validated source chat. Users explicitly save, revise or archive entries. Retain the most recent 20 snapshots; disclose that limit. Saving never accepts a design or authorizes a native operation.

Use the existing owner-scoped hosted project record with an independent brief revision. GET/PUT `/v2/projects/{projectId}/brief` returns project identity, revision, entries, recent history and update time. PUT supplies the expected revision; an atomic update rejects concurrent edits with 409. No browser-local substitute for durable storage. Task sources must belong to the same owner and project; titles come from the service. Maximum 40 entries, bounded text and strict schema validation.

The saved brief is an explicit project reference. Existing plans, confirmed questions and native grants retain their own authority. This phase does not silently inject new instructions into running tasks. Keep source and proposed/confirmed labels visible and preserve history when the user supersedes a decision.

## Implementation and acceptance

Backend worker owns an isolated descendant of deployed `243b6bebc9fb29b476574bdec509821b59cfcc65`; the dirty original desktop checkout remains untouched. UI worker owns the editor and related helpers/tests. Parent owns proxy/workspace wiring, review and browser acceptance. Release worker owns frozen package/build helpers; reviewed image-only rollout follows passing source/container checks.

Required checks: owner/project isolation, source validation, invalid/bounded input, atomic revision conflicts and history; UI stale response/draft/error recovery; actual save/edit/history across two chats and reloads; another project stays separate; narrow/keyboard interaction. Record actual outcomes and source/image identities here before updating the handoff.

## Source and service qualification

Backend source `923dcf03cc77c8cc3e503b563ae300bbc348c433` directly follows the deployed count repair. The change is limited to `task_api.py`, two new API tests and the context documentation. All 127 API tests and nine subtests passed, with two existing OpenAPI warnings; `lat check` passed. Graph regeneration again refused to overwrite 43 missing saved semantic nodes, so graph freshness remains unqualified.

Build `4f61e8aa-65ad-4d5e-b183-9b9c6985b3d3` passed the prior packaged planner/count/compaction/room/native checks and new real Mongo/HTTP isolation, concurrent first-save conflict, source validation, revision/history and archive checks. The independently verified source archive has 172 entries and SHA-256 `06af400e8474379e8f3f3e1fa231e03a666341f67783027b056224f9bdcf4daf`. The image is `sha256:d58dc4311c9cfe16699b555d4f5cfde47447b845ecadac3701bd7cb38e2fd103`.

A fresh 31,819,679-byte database backup and zero-active-run check preceded the reviewed image-only service update. All 20 stack parameters were accounted for; only the image value and its service task reference changed. The parent executed that update. CloudFormation completed, ECS reported one running and zero pending with one completed deployment, and independent verification matched the running source/image. Anonymous config, task and brief requests returned 401. Backup restoration was not exercised.

Frontend independent review caught and resolved per-project draft loss, duplicate saving and chat/body capacity limits. Drafts are kept in account-scoped memory across project navigation; saved state lives in the hosted database. Use in chat appends to the current unsent draft only after checking its exact combined length. The save guard checks UTF-8 request bytes. Oversized content is preserved with guidance and is never truncated. Twenty-two focused checks passed before the final full verification.

Task attribution is a server-validated chat reference, not an exact turn/message citation. A retained historical source stays readable after a task moves or is deleted. The initial source lookup and brief save are not a multi-document transaction; simultaneous moves remain a qualification limit. The desktop local service does not acquire the new endpoint through this hosted change; this packet qualifies the web service only.

## Actual browser acceptance

The synthetic `Brief verification` project contains chat A `153b9f6c-2ff2-5660-bcb5-feaf07b602e3` and chat B `f5f8afda-e4fa-53fe-9813-cb268358e9af`. Both Ask messages completed without Revit context. A transient sign-in failure during initial project creation cleared after a workspace reload; no credential bypass was used.

- Chat B saved a confirmed 10 × 8 m south-entry footprint with a selected-chat source and note at revision 1. Chat A displayed that same saved brief and source. Editing it to 11 × 8 m created revision 2, retained revision 1 in history, and restored correctly after reload.
- Housing studies displayed an independent empty revision 0 and received no save. An unsaved note in the verification project survived switching to Housing studies and returning; the test note was reverted.
- Two actual browser tabs edited revision 2. The first save produced revision 3. The second showed a conflict with its unsaved note intact and Save/Use disabled. Explicit Discard draft and load latest restored revision 3; it did not overwrite the winning save.
- Use in chat appended revision 3 to an existing unsent prompt, closed the panel and focused the composer. A separate manual Send yielded a concise answer correctly stating the 11 × 8 m footprint and south entrance. Saving a brief alone did not submit a prompt or modify a plan.
- A 390 × 844 CSS viewport contained the 358 px dialog without page horizontal overflow, used 16 px editable fields, and Tab moved from Label to Value. Archive/save produced revision 4 with Use disabled for the archived-only brief; Restore/save produced revision 5. Physical-touch gestures and a real second-account session were not exercised. Account/epoch isolation and exact size limits have controlled regression coverage.
- A final reload in chat B restored active revision 5, the 11 × 8 m south-entry value and the winning source note. The verified panel is left open with an empty composer; the temporary parallel/reference tabs were closed and the viewport override cleared.

Final technical gates passed 512 frontend tests, the optimized production build, standalone TypeScript and 13 production runtime checks. The initial build attempt caught an intermediate callback type mismatch while the capacity fix was in progress; the final frozen build passed. The temporary production server was stopped; development on port 3001 remains available. Full migration, merge, billing, immutable BOQ history, automatic agent ingestion and native operations are not qualified by this feature.

Evidence is under `artifacts/ux/project-brief-persistence/`: saved/reloaded/history/conflict/mobile screenshots, visible DOM records, test/build/type/runtime logs and independently reviewed source/package/image/deployment receipts. Source and service checks are distinct from actual browser acceptance.
