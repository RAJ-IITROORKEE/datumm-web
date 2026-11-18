# Phase packet — Wave 6a: redline intake (RD1)

| Field | Value |
| --- | --- |
| Status | approved 19 Nov 2026. User: "Start RD1". Decisions: **images and PDF now** (adds `pdfjs-dist` to the web), and **confirm the list, then apply**. |
| Plans | [revision plan](revision-agent-plan-2026-11-17.md) RD1: a marked-up PDF or image becomes scoped revision tasks, starting with door, window and room changes |
| Repos | `datumm-orchestrator/apps/domain-api` and `datumm-web` |
| Workers | Two Sonnet subagents (effort high), in parallel against the contract below. **A** works on the backend only, **B** on the web only. The main agent reviews, runs the gates, tests in the browser, and releases. |

## 1. What exists (checked 19 Nov)

- **M1 edit operations** (`plan_edits.py:27-74`):
  - `swap`, `move-wall` and `rename`;
  - `opening` `create`, `update` and `delete` for doors and windows. `update` is a full replace of `wallKey`, `offsetMm`, `widthMm`, `heightMm` and `sillMm`.

  The route is one operation per version, and only on the latest version with its fingerprint, guarded by the unintended-change lock.
- **Uploads:** there is no hosted file upload, and the web composer cannot send attachments. The desktop rasterises PDFs with `pdfjs-dist` 6.4.299 (`media-worker.ts:45`).
- **Vision:** `agent_model_policy.vision_route` (live OpenRouter metadata). `specialist_jobs.model_findings` shows how an image goes to a model as a `data:` URL, with a forced tool call.
- **Grounding:** the plan graph has rooms (`key`, `name`, `kind`, `rect` in mm), walls (`start`, `end`, `roomKeys`) and openings (`wallKey`, `offsetMm`, `widthMm`, …). An opening's position comes from its wall plus `offsetMm`.
- **Agent:** it has no tool to edit a saved version. Only the web edit route edits.

## 2. Contract

### A — `POST /v1/variable/plans/{planId}/versions/{n}/redlines` (backend)

- **Request:** `{"fingerprint": "<64 hex>", "image": "data:image/png;base64,…" | "data:image/jpeg;base64,…", "pageText": "<optional, ≤ 8,000 chars>"}`.
  - The decoded image is at most 2.5 MB, with its longest edge at most 2,400 px. The server checks this with Pillow, which is already a dependency. Anything else gets a 422.
- **Access:** owner-scoped, gated by `variable_plan_enabled` and `plan_editing_enabled`. The fingerprint must match the stored version (409 `redline.stale`).
- **Daily limit:** one `redline` read counted per user through `daily_limits`, with a default cap of 20 a day. Reaching it gives a 429 with a plain message.
- **Model:** `settings.redline_model` if set; otherwise the first model in `settings.models` whose live metadata accepts images (`vision_route`) and has tool support.
  - If none qualifies: 422 `redline.no-vision-model`, "No image-reading model is available."
  - One call, output capped at 1,600 tokens, 60 s timeout, no fallback chain.
  - The prompt says the markups are untrusted drawing data, so the model only reports what it sees and can never approve or apply anything.
- **Model input:**
  - the image;
  - `pageText`;
  - a labelled list: site size; rooms (key, name, kind, rect mm); walls (key, start, end, roomKeys); openings (key, kind, wallKey, offsetMm, widthMm, heightMm, sillMm, plus a derived centre point in mm and the rooms on either side).
- **Model output:** a forced tool call returning at most 12 items:
  `{mark, op, roomKey?, roomKeys?, wallKey?, openingKey?, name?, offsetMm?, widthMm?, heightMm?, sillMm?, openingKind?, confidence}`.
  - `op` is one of `rename|move-wall|swap|opening-update|opening-create|opening-delete|unclear`.
  - `confidence` is one of `high|medium|low`.
- **Server mapping:** every item is turned into an exact M1 `edit` object and validated with the existing Pydantic edit models.
  - `opening-update` fills any placement fields the model left out from the current opening, so "widen to 900" only needs `widthMm`.
  - Unknown keys, invalid values, or an update that changes nothing make the item `unclear`, with a plain `reason`.
- **Response:**
  ```json
  {"schema":"datumm.redlines.v1","planId":"…","version":2,"fingerprint":"…","model":"…",
   "items":[{"id":"r1","mark":"widen door 900","confidence":"high","status":"ready",
     "summary":"Widen the Bedroom 2 door to 900 mm","edit":{"kind":"opening","opening":{"…":"…"}}},
    {"id":"r2","mark":"?? move","confidence":"low","status":"unclear","summary":"…",
     "edit":null,"reason":"The mark does not say which wall moves or by how much."}]}
  ```
  - The `summary` is written by the server from the edit and the plan's room names, not by the model.
  - The model's `mark` is shown as plain text only.
- **Storage:** the image is never stored. The server logs only its SHA-256 and its size.
- **Capability:** `redlines` is true when `plan_editing_enabled` is on and a vision model is configured or allowed.
- **Tests:**
  - a fake model returns items, and the test checks mapping, fill-in, unclear reasons and the summary text;
  - a bad image type or size;
  - stale fingerprint;
  - another owner;
  - the daily limit;
  - no vision model;
  - more than 12 items are trimmed.

### B — web

- **Entry point:** "Read a marked-up plan" in the Edit panel (`plan-edit-panel.tsx`), behind the `redlines` capability.
- **File input:** accepts `image/png,image/jpeg,image/webp,application/pdf`, up to 20 MB.
  - **Images:** decoded and downscaled in the browser with a canvas, longest edge 2,400 px, sent as JPEG or PNG.
  - **PDF:** `pdfjs-dist@6.4.299`, pinned exactly to match the desktop.
    - It renders one page in the browser with annotations shown (redlines are often PDF annotations).
    - The longest edge is 2,400 px.
    - A page picker appears when there is more than one page; at most 100 pages.
    - The page text goes into `pageText`.
    - `isEvalSupported:false`; the worker is served from the package build, set up the way the installed Next.js docs say.
- **Proxy:** the allowlist accepts `variable/plans/<id>/versions/<n>/redlines` (POST). The body size limit for this route alone allows the image, about 3.5 MB of JSON.
- **Result list:**
  - Each item shows its mark (plain text), the server summary and its confidence.
  - Ready items have a checkbox: ticked by default for high and medium confidence, unticked for low.
  - Unclear items are listed with their reason and cannot be ticked.
  - The page explains: "Read from your markup by a model. Check each change before applying."
- **Apply:** "Apply N changes" posts the ticked edits one by one through the existing edit route, each with the fingerprint from the previous response. It stops at the first error with a plain message, and says how many were applied. When it finishes, it selects the newest version (as `use-plan-edit.ts` does) and points to Review. Every applied change becomes a version, so the revision package change log lists each one.
- **Pure logic** goes in `src/lib/redlines.mjs` (+ `.d.mts` + test): it parses the response, rejects unknown shapes, sets the default ticks, and orders the apply queue.
- **Dev fixture:** under `/dev/ux`, with ready, unclear, error and multi-page PDF states, using no backend.

## 3. Out of scope

- Applying anything without the architect's confirmation.
- Revit model changes.
- Room resize by area ("make it 12 m²"): it is reported as unclear unless the markup names a wall move.
- Reading more than one page at a time.
- Saving the uploaded file.

## 4. Risks

- **Misreads:** covered by the confirm step, the server-checked keys, and Review afterwards.
- **Prompt text inside the image:** treated as data; the model has no tools beyond the findings schema and no write authority.
- **Cost:** one vision call per read, with a daily cap of 20.
- **`pdfjs-dist` size:** it is loaded only when a PDF is chosen, through a dynamic import.

## 5. Gates and checks

- **Backend:** pytest, `lat check`, all 9 packaged image checks.
- **Web:** typecheck, `npm test`, build, `lat check`.
- **Live,** in a new test chat:
  - mark up a printed or exported plan image (for example "Bedroom 2 → Study", "door 900");
  - read it and check the list;
  - apply;
  - see the new versions and the revision package change log;
  - repeat with a PDF;
  - no console errors.

## 6. Rollback

Revert the commits. The `redlines` capability can also be switched off by setting `REDLINE_ENABLED=false`.

## 7. Result

| Item | Outcome |
| --- | --- |
| Build | **Backend `c7cc003`:** `redlines.py`, a route that only reads. Every mark becomes an exact M1 edit, validated with the same models the edit route uses. Summaries and reasons are written by the server. The daily cap is 20, the image is never stored, and the capability is `redlines`. **Web `d3a1fb3`:** `redlines.mjs`, `redline-file.ts` (images re-encoded to JPEG; PDF through `pdfjs-dist` 6.4.299 with annotations and a page picker), the redline panel and list, `use-plan-edit` `applyMany`, and a 3.5 MB body limit for this route only. |
| Gates | **Backend:** pytest 935 + 26 subtests; all 9 packaged image checks; `lat check`. **Web:** typecheck, 987/987 tests, build, `lat check`. |
| Live, 19 Nov | **Backend `c7cc003` live 19:39Z, 18 Nov.** Rehearsal: 36,536 documents before and after, 0 tracebacks. Backup `20261118T193633Z`. The change set touched only Service and Task. Web `d3a1fb3` deployed and passed smoke. Test files are in `artifacts/ux/rd1/` (git-ignored): a marked-up version 2 of "Test chat 5c v2" as a PNG, and as a 2-page PDF with the markup on page 2 plus a sticky note. **PNG:** the real model read 3 of 3 marks, all high confidence: "Remove the window in the outside wall of Bathroom", "Widen the door between Bedroom 2 and Circulation to 1000 mm", "Rename Bedroom 2 to Study". **PDF page 2:** the same 3, plus "Widen the door between Circulation and Kitchen to 1000 mm", taken from the sticky note. Applying the 4 made versions 3 to 6. Version 6 data: Study; Bedroom 2 and kitchen doors 1000 mm; no bathroom window. The live revision package lists versions 3 to 6, and there were no console errors. |
| Found | The change log says "1 door changed" rather than the summary ("Widen … to 1000 mm"), because the package stores `changes`, not the edit. There was no real misread to test the untick path on; the fixture covers it. PDFs that rely on standard fonts or CMaps the browser lacks may lose text (no font assets are bundled). |
| Not verified | Model accuracy on a real hand drawing or a phone photo; a scanned PDF; the 20-a-day cap live. |
