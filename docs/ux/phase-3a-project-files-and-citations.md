# Phase 3A · Project files and versioned citations

This first Grounded agent MVP slice gives a project its own file library and lets an architect reopen the exact source cited in a saved chat. The rollout follows the owner's 21 November request after local isolation checks.

## Scope and contract

The project Files view accepts UTF-8 specifications, PDF specifications and floor-plan sheets, and PNG or JPEG floor-plan sheets and design images. Use the existing project owner and live-project checks, the authenticated web service proxy and the current Mongo volume. Original bytes are capped at 2.5 MiB per upload. The Vercel Functions payload limit applies to the encoded request. [Vercel Functions limits](https://vercel.com/docs/functions/limitations#request-body-size)

An upload creates a source identity. A replacement provides that source identity and the expected current version. The immutable revision records a content hash. List and preview resolve under the active owner and project. Exact citation opening checks both the version and hash. Revoking the source or archiving its project closes future access. Keep ordinary chat attachments and public shares on their existing paths.

An explicit project-file question can retrieve bounded local text excerpts and source references from its task's current project. PDF sheets open to the supported page and raster previews use the saved image revision. The first slice links files and supports local text evidence. OCR, region search and semantic or visual comparison follow in the retrieval slice.

The project Files view reuses the existing project panel and controls. It presents versions beside the file and uses the current report-style preview flow. [Files reference](https://www.affectui.com/screens/files) · [Agent Thread reference](https://www.affectui.com/screens/agent-thread)

## Verification and rollout

Use synthetic specs, floor-plan PDFs and images. Give two projects the same filenames and verify that list, preview, revision upload, and agent citations stay scope-bound. Include different owners, stale replacement, malformed upload, mismatched hashes, revoked access, and an archived project. Reopen a first-version citation after uploading version 2. Check the AWS image against disposable Mongo before rolling out, then confirm the runtime by source commit and health. Verify the GitHub-linked Vercel deployment and production alias after the backend rollout.

Restore the previous qualified AWS image or promote the previous Vercel deployment independently if needed. Uploaded sources are additive. Older clients do not need a data migration.

## Status

Local qualification passed with 1,045 backend tests, 1,083 web tests, a production build and 22 local runtime checks. Same-name files across projects stayed isolated, and saved citations continued to resolve the same historical revision after replacement. Use `/sources <keywords>` in Ask on a project chat. The backend rollout gates on the disposable Mongo and HTTP checks in CodeBuild.
