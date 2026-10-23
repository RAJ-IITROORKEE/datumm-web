# DATUMM Web

DATUMM's Studio interface for the browser, backed by the existing hosted DATUMM task service. Web and desktop use the same Clerk account instance. Revit connectivity requires the separate Windows add-in and connector.

## Run

Copy `.env.example` to an ignored `.env.local`, configure the existing Clerk instance and HTTPS orchestrator origin, then run `npm ci`, `npm run dev`. Validate with `npm test`, `npm run typecheck`, `npm run build`, and `lat check`.

After starting the production build with `npm start`, run `npm run check:runtime` for anonymous browser/API boundary checks. A different running origin can be passed after `--`. These checks do not prove authenticated backend or live Revit acceptance.

## Deploy

Use the repository root as a Next.js Vercel project, Node.js 22 or newer, build command `npm run build`, and default output directory. Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and server-only `ORCHESTRATOR_URL` in Vercel.

Append the exact new web origin to the existing Azure `CLERK_AUTHORIZED_PARTIES` allowlist and permit it in the same Clerk instance. Keep existing authorized origins, desktop authorization origin and desktop verification pin. A future custom subdomain must be added to those allowlists before switching it on. Browser sessions on different unrelated domains may require sign-in again; identity remains the same account.

## Runtime scope

This release uses the existing hosted LangGraph harness through strict v2 task commands, saved events and versioned plans. It does not deploy the desktop OpenCode process to Vercel. Cloud OpenCode parity requires a separately operated authenticated worker and persistence port.

Local project folders, attachments, speech transcription, desktop MCP packs and queued background prompts remain desktop capabilities. The web interface exposes hosted model selection, planning, exact design acceptance, drawing/export review, connector management and exact native proposal approval.

Only reviewed frontend source, browser DTOs, the DATUMM mark, public plugin release metadata, font and dependency notices are included. No backend implementation, desktop binaries, private model content or environment values are included.
