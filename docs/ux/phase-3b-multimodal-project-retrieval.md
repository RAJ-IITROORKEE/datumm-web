# Phase 3B · PDF, OCR and visual project search

Approved for local implementation on 21 November 2026. This phase builds on web commit `83e1ec4` and API commit `0160b9a`.

## Goal and current state

Phase 3A stores scoped immutable files and retrieves UTF-8 excerpts. `apps/domain-api/project_evidence.py` currently ranks filenames and text lines. `src/components/workspace/project-source-preview.tsx` already displays a bounded PDF preview. Phase 3B retrieves embedded PDF text, recognizes English labels on scanned floor plans, and finds design images by visual resemblance to another uploaded image.

## Design and contract

- Continue using `/sources <keywords>` in project Ask. PDF and scanned-plan citations carry a one-based page locator. An image scan uses page 1.
- Use `/sources similar <sourceId or filename>` for image-by-example search. Project Files copies the exact source ID command for a design image. Search compares current design-image versions in the same project and cites each matching immutable revision.
- Reuse the project Files list, transcript citation cards, and the existing version preview. Keep keyboard access, status feedback, and the full filename and version visible at narrow widths. [Files reference](https://www.affectui.com/screens/files) · [Agent Thread reference](https://www.affectui.com/screens/agent-thread)

## Implementation and limits

The API keeps authorization, hash checking, and saved citation resolution in the existing project source flow. Poppler and Tesseract run locally with bounded input, output, page count, and runtime. Pillow supplies visual descriptors from the uploaded pixels. No cloud model or search service receives file data. The extraction is for locating evidence, so users can inspect the cited original. Visual matching covers resemblance in composition and color.

Search reads embedded text from the first 12 PDF pages, with English OCR for up to three textless floor-plan pages or one PNG or JPEG sheet. It saves a bounded text sample per page. An upload can succeed if extraction is unavailable. An older file or a partial extraction can be retried on a later lookup. Strong crops or reframing can make an image-by-example match less reliable. [Poppler PDF text](https://manpages.debian.org/bookworm/poppler-utils/pdftotext.1.en.html) · [Tesseract installation](https://tesseract-ocr.github.io/tessdoc/Installation.html)

The source lookup needs no new endpoint or AG-UI event. The local web uses its existing citation payload and preview. Page citations add to the prior text and file locators.

## Verification and rollback

Use synthetic embedded-text PDFs, image-only PDF plans, raster floor plans, and design images. Upload matching filenames and visuals to separate projects, then check that both result types exclude the other project. Replace a cited source and reload the saved chat. Verify the original hash, revision and page still open. Run API and web suites, web typecheck and build, and both `lat check` gates.

The phase is local. Reverting it retains the original file revisions from Phase 3A. The previous renderer continues to display the original text and file citations.

## Result

Local qualification passed on 21 November 2026. Backend commit `4547efa` passed 1,051 tests and 26 subtests. Web passed 1,084 tests, typecheck, the production build and 22 local production runtime checks. Both knowledge-link checks passed.

The HTTP release smoke used a local API and disposable MongoDB. It exercised two projects with identical filenames, including a legacy PDF indexed on first use, a PDF with searchable page 2, scanned PDF and PNG plans, and visually similar images. It verified that project boundaries held and saved citations still returned the original hash and bytes after replacement.

Playwright in Edge opened the saved answers in a local component fixture at 1143 and 390 pixels. Reload preserved PDF and OCR page citations and image revision links. Opening the same citation against the other project's path returned 404. The browser fixture used the real answer and preview components and the local API with a disposable test token.

Linux container execution and hosted sign-in remain to be qualified for rollout. The existing Graphify freshness check still fails on stale semantic entries.
