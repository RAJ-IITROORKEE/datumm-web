# scripts

Maintenance scripts. Plain Node, no dependency; run from the repo root.

| Script | Does |
| --- | --- |
| `sync-desktop.mjs` | One-way sync of the web shell into the desktop renderer (`../datumm-orchestrator/apps/web/src/shared/`). Config: `desktop-sync.json`. Tests: `tests/sync-desktop.test.mjs` |

## sync-desktop

```bash
node scripts/sync-desktop.mjs --dry-run   # print the allowlist, exclusions and packages; write nothing
node scripts/sync-desktop.mjs             # copy, rewrite imports, write .sync-manifest.json
node scripts/sync-desktop.mjs --check     # exit 1 if the target or the source drifted from the manifest
```

Flags: `--target <dir>` (default `../datumm-orchestrator/apps/web`), `--allow-dirty` (sync despite uncommitted changes in synced paths; the manifest source then ends in `-dirty`).

- **Allowlist:** the import closure of the `entries` in `desktop-sync.json`, found by following static, dynamic and side-effect imports, CSS `@import` and each `.mjs` file's `.d.mts` types. Fonts and other packages are not copied; the summary lists the packages the desktop must provide.
- **Never synced:** `deniedPaths` and `excludedFiles` in the config. A file that imports `server-only`, `next/headers`, `@clerk/nextjs/server`, `sharp`, `@resvg/resvg-js` or a Node built-in is excluded with its reason. If a kept file needs an excluded one the run fails; `allowedExceptions` admits single files by name, with a reason.
- **Rewrite:** `@/x` becomes `@shared/x`. A relative import that leaves `src/` (for example `public/downloads/release.json`) is copied to `src/shared/_root/<path>` and imported as `@shared/_root/<path>`. Text is normalised to LF.
- **Manifest:** `src/shared/.sync-manifest.json` is `{source, files: {path: sha256}}`. A re-sync removes only files the previous manifest listed.
- **Not for approval:** the shared shell never gains an approve path through this script; see the host contract in `src/lib/host/`.
