# tests

Node's built-in test runner, no extra framework.

```bash
npm test               # node --test tests/*.test.mjs
npm start              # then, in another shell:
npm run check:runtime  # anonymous boundary checks against a running build
```

Node 22.18 or newer is required: one test imports a `.ts` file directly, which older Node cannot load.

## Layout

- `<name>.test.mjs` tests `src/lib/<name>.mjs` or one named behaviour. One file per module or behaviour, named for what it proves.
- `fixtures/` holds recorded task and composition data used by replay and conformance tests. Do not hand-edit recorded fixtures; regenerate or add a new one.
- `runtime-smoke.mjs` is the production boundary check: origin and auth gates, unsupported routes, and 404 for development fixtures with `--production`. It does not prove authenticated backend or live Revit behaviour.

## Rules

- Test behaviour that matters: identity and authority boundaries, recovery, failure states, and the contract between browser and service. Skip tests that only restate the code.
- Tests are deterministic and local. No network, clock or random dependence; inject them.
- A failing test is repaired or the blocker is recorded. Never delete or loosen a test to make a gate pass.
- Tests that cover a documented contract carry a `// @lat:` annotation so `lat check` can verify the link.
- Report results as run: count passed, failed and skipped, with the Node version.
