# Phase 3 — drafting and sheet separation

13 November 2026. The author approved proceeding after the first two packages passed. This packet implements D18 and product-audit package 3. Work remains on the existing migration branch; no backend deployment, model mutation or import pipeline.

## Interaction contract

- Dark 2D Working view is the default, with restrained high-contrast linework. A separate white Sheet view uses the same graph and dimensions. AffectUI chrome and Inter remain unchanged.
- 2D uses a bounded world transform: pointer-centered wheel zoom, pan tool/middle-button drag, Fit/Home and keyboard arrows/+/-/0. Touch supports pan and pinch with visible button alternatives. Keep focus/selection/comments and all registered overlays aligned. Do not add wall dragging or native editing.
- 3D remains a schematic graph-derived cutaway, with dark neutral environment, readable labels, existing orbit/pan/zoom and camera presets. It is not a native RVT model. Mount identity, selections and camera continuity survive 2D/3D tab and Focus transitions.
- 2D exports remain standalone white sheets independent of on-screen Working/Sheet mode. 3D exports remain current-view captures and retain that provenance. No fabricated PDF/native drawing claims.
- Local annotation storage remains exact plan ID/version/fingerprint-bound. Preserve draft/failure behavior, unit accuracy, y-axis inversion and source registration warnings.

## Ownership

2D worker owns PlanCanvas, its module CSS, a pure bounded viewport helper and related navigation/component tests. 3D worker owns PlanThree, its module CSS and its focused tests. Integrator owns PlanDrawing, export isolation, shared contracts/tests and browser validation. Independent reviewer checks transforms, identities, read-only behavior and export truth. No worker edits another worker's files.

PlanDrawing integration: optional `surface: 'drafting' | 'sheet'` defaults to `sheet` for standalone compatibility; parent supplies embedded palette CSS. Canvas worker passes `surface` only to the live full PlanDrawing. 3D worker uses a dark working environment; no new props are required. The Sheet control applies to 2D only. Export controls clearly distinguish the 2D white sheet from a 3D viewport capture.

## Exit gate

Meaningful transform/anchor round-trip, pointer invariance, clamping/Fit, touch/keyboard and identity tests; existing selection/annotation/drawing/export regression tests. Full suite, sequential build/TypeScript, production runtime boundary checks. Actual Codex browser checks with a saved drawing at desktop and 390px: Working/Sheet, pan/zoom/Fit, selection, measure/local annotations, tab/Focus continuity, readable 3D and captured white 2D exports. Inspect downloaded image/PDF where supported. Record actual evidence and remaining limitations in HANDOFF/PLAN/PROJECT/checkpoints. Hosted concept-generation semantics remain an external qualification gap.

## Completed validation — 13 November 2026

414/414 tests, optimized production build, sequential standalone TypeScript and all 13 production runtime checks passed. Independent Terra source review found no remaining concrete blockers after corrections for aspect-aware bounds, gesture click suppression, pointer capture handoff, hidden-frame resize continuity, responsive 3D Fit, label collisions and WebGL-loss capture availability.

Actual Codex browser checks on saved task `144a6a68-cfc0-5101-9803-a9e0d91a8eb2`:

- Working defaults to dark paper/light ink; Sheet is white/black with the same graph viewBox. Temporary Light appearance preview left both drafting canvases dark, then was cancelled to restore Dark.
- Pointer-centered wheel zoom retained the world point to less than 0.001 mm in the observed transform; middle-button movement translated exactly 70 × 40 px. Keyboard pan/zoom/Fit worked. 2D pan/zoom survived 3D tab return and Focus/Exit.
- Measurement snapped to the rendered outer-wall centerline span, 11,850 mm (the site boundary is 12,000 mm; these are distinct). A Kitchen annotation draft survived tab changes, restored its text/focus, and was discarded without saving a comment or sending a prompt.
- 3D TOP + zoom remained TOP/139% across tabs. Responsive Fit included the full model at 390px; selected-room labels won collision priority, and the room picker revealed the selected Bedroom. Touch-emulated controls measured 44px, help defaulted closed and closed with Escape, and page width stayed 390px.
- A dark, zoomed/panned 2D view downloaded a complete white 2400 × 1971 PNG and a one-page PDF; both were rendered and visually inspected. The 3D PNG captured its current dark viewport and visible labels, with matching capture provenance.
- Final clean reload restored the desktop Working view, enabled annotation controls and showed no browser console errors. Appearance and viewport/touch overrides were restored. No native approval, message submission, backend change, deployment, commit or merge.

Evidence in ignored `artifacts/ux/`: `phase3-tests.log`, `phase3-build.log`, `phase3-desktop-2d.jpg`, `phase3-mobile-2d.jpg`, `phase3-mobile-3d.jpg`, `phase3-white-sheet.png`, `phase3-white-sheet.pdf`, `phase3-pdf-preview.png`, `phase3-3d-capture.png`.

Limits: the in-app browser rejects touch-event injection, so pinch/cancel/no-move/pointer-handoff semantics have controlled component coverage, not a physical touch qualification. The inspected saved task has no registered image overlay; common-layer/source transforms retain controlled coverage but no new live registered-source claim. The viewer remains schematic and review-only; this phase does not qualify RVT import, drafting writes or the still-blocked hosted generate/revise journey.

Next package is deliverable/revision clarity: named concepts/reports, source/version, explicit revision entry and current-versus-retained artifact/export provenance. PlanCanvas's technical plan ID/fingerprint remain in its geometry inspector and should move into source disclosure in that package. Do not add backend revision history or persistence without an actual contract.
