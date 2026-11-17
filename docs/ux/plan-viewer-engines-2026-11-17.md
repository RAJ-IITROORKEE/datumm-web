# Plan viewer engines: keep, extend or adopt (17 Nov 2026)

Read-only research. Nothing was installed, cloned or run. Licence, version, size, peer
dependencies and last push were read from the npm registry (`npm view`) and the GitHub API on
17 Nov 2026; those are marked ✔. Claims taken only from a README are marked (README). npm
"unpacked size" is the published package size, not the gzip bundle cost; no bundle was measured.

Scope: the 2D plan and 3D model for generated plans and Revit models, with selection, edits
(M1), "Show" highlights (V2), before/after diff (M1, EV1), redlines (RD1), SVG/PDF/PNG export,
and later IFC and DXF/DWG. Phases are those in
[revision-agent-plan-2026-11-17.md](revision-agent-plan-2026-11-17.md).

## 1. The current renderer and its limits

### What we have

**Web, 3D** — plain Three.js 0.186.1 (`package.json`), imperative, no React renderer.

- `src/components/plan-three.tsx:15-29` `wallGeometry`: each wall is a 2D elevation shape
  extruded by its thickness; openings become notches or holes. Good, cheap, no CSG.
- `plan-three.tsx:32-48` `createPlanScene`: floor slab, one mesh per wall, glass panes for
  windows, one flat box per room. The comment at `:31` says it is schematic and never RVT meshes.
- `plan-three.tsx:109-131` `paintPlanScene`: selection and highlight recolour materials
  (`:112`, `:116-117`), four display styles, section cut by clipping plane and wall rebuild
  (`:111`, `:120-124`), canvas-sprite room labels (`:125-128`, created at `:156-162`).
- `plan-three.tsx:163-175`: raycast picking on pointer-up; comment pins projected into DOM
  buttons (`:176-185`, `:207`); orthographic camera, OrbitControls, fit/iso/top/front
  (`:144-155`); render on demand (`:190`); context-loss fallback (`:186`); 3D raster capture for
  export (`:191`).
- Loaded with `next/dynamic` and `ssr:false` (`src/components/plan-canvas.tsx:15`).

**Web, 2D** — React SVG drawn from the plan graph.

- `src/components/plan-drawing.tsx:34-95` `PlanDrawing`: room polygons, walls as stroked
  centrelines (arcs supported through `src/lib/plan-geometry.mjs:96-116`), door swings and window
  lines (`:59-73`), dimension chains (`:39-50`, `:78-79`), scale bar, north arrow, sheet title.
  Styles travel inside the SVG (`:11-29`), so an exported copy keeps them.
- Hit targets are DOM attributes: `data-room-key`, `data-wall-key`, `data-opening-key`
  (`plan-drawing.tsx:57-67`); picking walks `closest()` (`plan-canvas.tsx:203-205`), rooms by
  `pointInRoom` (`plan-canvas.tsx:205`).
- Pan/zoom/pinch is our own viewport maths (`plan-canvas.tsx:250-252`,
  `src/lib/plan-viewport.mjs`). Comments live in `plan-canvas-annotations.ts`.
- "Show" highlights are an extra SVG overlay (`plan-canvas.tsx:256`).

**Export.** Client: the SVG is serialised, decoded as an image, drawn to a 2400 px canvas and
saved as PNG, or as a JPEG wrapped in a one-page PDF (`plan-drawing.tsx:98-120`,
`src/lib/plan-pdf.ts:2-20`). Server: Resvg renders SVG to PNG, Sharp converts to JPEG
(`src/lib/preview-raster.mjs:11-22`), used by `src/app/api/service/[...path]/route.ts`.

**Backend.** The TypeScript planner renders SVG strings with four separate drawers chosen by
schema version (`datumm-orchestrator/apps/planner/revit-mcp/src/plan-graph.ts:206-208`):
`plan-drawing.ts:6` (`drawPlan`), `convex-plan.ts:25`, `curved-plan.ts:27`,
`multi-room-plan.ts:95`. The domain API calls it through `variable_engine.render`, which rejects
SVG over 200 000 characters (`apps/domain-api/variable_engine.py:111-123`), and
`plan_artifacts.py:15-18` stores the SVG with a SHA-256 per renderer version.

### Limits

| # | Limit | Evidence | Hurts |
|---|---|---|---|
| L1 | 3D ignores curved walls: each wall is a straight extrusion from `start` to `end`. | `plan-three.tsx:38-42` (no use of `wall.curve`) | Curved plans, V2 |
| L2 | 3D rooms are rectangles from `rect`; polygon `boundary` is ignored. | `plan-three.tsx:46`; 2D uses `roomPoints` (`plan-geometry.mjs:4-8`) | Polygon rooms, V2 |
| L3 | 2D "Show" overlay draws rooms as rectangles and walls as straight lines. | `plan-canvas.tsx:256` | V2 on curved/polygon plans |
| L4 | 3D picks rooms only; walls and openings carry keys but are not selectable. | `plan-three.tsx:169` | M1, V2 |
| L5 | Highlight is a colour blend only; no outline, no ghosting of the rest, no diff colours. | `plan-three.tsx:112` | V2, M1 diff, EV1 |
| L6 | Any graph change rebuilds the whole scene (effect keyed on `fingerprint`). | `plan-three.tsx:193` | M1 live edit previews |
| L7 | No wall joins or mitering: walls overlap at corners in 3D. | `plan-three.tsx:37-45` | Visual quality |
| L8 | No edit handles in either view; only select, pan, measure and comment tools. | `plan-canvas.tsx:203-205`, `plan-three.tsx:105` | M1 |
| L9 | PDF is a raster JPEG of at most 2400 px, not vector. | `plan-pdf.ts:3`, `plan-drawing.tsx:99` | EV1 revision package |
| L10 | No DXF/DWG or IFC in or out; Revit appears only as the schematic graph. | `plan-three.tsx:31` | M2, later IFC/DWG |
| L11 | Two 2D renderers can drift: the planner's SVG (four drawers) and the web's React drawing. | `plan-graph.ts:206-208`, `plan-drawing.tsx:34` | Export equals screen; EV1 |
| L12 | 3D is one 225-line imperative component with dense one-line code; hard to extend. | `plan-three.tsx:132-225` | Every 3D phase |

What is solid and worth keeping: graph-first model in millimetres, SVG with `data-*` keys, styles
inside the SVG, Resvg server export, render-on-demand 3D with context-loss recovery, accessible
DOM pins and labels.

## 2. Comparison

Fit for us: **Adopt** (take as a dependency), **Copy** (copy ideas or MIT/Apache code with
attribution), **Later**, **No** (licence or fit). Stars and last push from the GitHub API ✔.

| Engine | Licence | 2D | 3D | Select / edit | IFC / DWG | React / Next fit | Maintenance | Fit for us |
|---|---|---|---|---|---|---|---|---|
| **Current renderer** (ours) | own | SVG plan, dims, swings ✔ | Three.js schematic ✔ | Select rooms (3D), rooms/walls/openings (2D); no edit ✔ | None | Native | Ours | **Keep 2D, extend 3D** |
| [pascalorg/editor](https://github.com/pascalorg/editor) (`@pascal-app/*` 1.1.4) | MIT ✔ | SVG floor-plan editor (`packages/editor/src/components/editor-2d/`, 39 files) ✔ | R3F + WebGPU (README) | Full editor; walls, curved walls (`packages/core/src/systems/wall/wall-curve.ts`), mitering, openings ✔ | IFC import via `ifc-converter` (README) | React 19; peers `three ^0.187`, R3F 9, drei 10; editor needs `next >=15` ✔. We pin three 0.186.1 | 25.6k stars, pushed 16 Nov 2026 ✔ | **Copy** wall mitering, curve, 2D editing layers. Too big to embed (editor 14.6 MB unpacked, own scene schema and state) |
| [ThatOpen engine_components](https://github.com/ThatOpen/engine_components) (`@thatopen/components` 3.6.0, `-front`, `fragments`) | MIT ✔ | Drawings/plans from model (folder `core/src/drawings`) ✔ | Three.js BIM viewer | Highlighter, Hoverer, Outliner, Clipper, measurement ✔ (folder names) | IFC via web-ifc ✔; no DWG | Vanilla TS; wraps in a client component; peers three ≥0.182 ✔ | 746 stars, pushed 8 Nov 2026 ✔ | **Later, adopt for M2 / IFC** |
| [web-ifc](https://github.com/ThatOpen/engine_web-ifc) 0.0.79 | MPL-2.0 ✔ (file-level copyleft; fine unmodified) | — | Geometry from IFC (WASM) | — | IFC read/write | Worker + WASM | 1.1k stars, pushed 17 Nov 2026 ✔ | **Later**, with That Open |
| [web-ifc-three](https://github.com/ThatOpen/web-ifc-three) | MIT ✔ | — | IFC loader | Basic | IFC | Peers three ^0.149 ✔ | Last push Apr 2024 ✔ | **No** (superseded by That Open) |
| [xeokit-sdk](https://github.com/xeokit/xeokit-sdk) 2.6.114 | AGPL-3.0 ✔ + commercial (README) | Storey plan views (README) | Strong BIM viewer | Strong | IFC/XKT | Vanilla | 966 stars, pushed 2 Nov 2026 ✔ | **No** unless we buy a licence |
| [Speckle viewer](https://github.com/specklesystems/speckle-server) `@speckle/viewer` 2.31.14 | Apache-2.0 ✔ (package) | — | Three.js | Selection, filtering, sections (README) | Revit/IFC via Speckle connectors and server | Vanilla | Package published Jun 2026; repo pushed 12 Nov 2026 ✔ | **Later**, only if Revit models go through Speckle |
| Autodesk APS Viewer | Proprietary, paid cloud translation | Sheets | Native RVT/DWG | Strong | RVT, DWG, IFC | Script tag | Vendor | **No** for core; option for native RVT viewing in M2 |
| [react-three-fiber](https://github.com/pmndrs/react-three-fiber) 9.8.2 + [drei](https://github.com/pmndrs/drei) 10.7.9 | MIT ✔ | — | Declarative Three.js | Events per mesh, `<Outlines>`, `<Edges>`, gizmos (drei) | — | Peers React ≥19 <19.4 ✔ (we have 19.3.0) | 33.8k / 10.2k stars, pushed 21 Oct 2026 ✔ | **Optional**: adopt only if PlanThree is rewritten (L12) |
| [three-bvh-csg](https://github.com/gkjohnson/three-bvh-csg) 0.0.18 + three-mesh-bvh 0.9.18 | MIT ✔ | — | CSG; fast raycast | — | — | Peers three ≥0.179 ✔ | 965 / 3.6k stars, pushed Sep/Nov 2026 ✔ | **Later**: curved walls with openings; faster picking on Revit-size models |
| [chili3d](https://github.com/xiangechen/chili3d) | AGPL-3.0 ✔ | — | OCCT CAD | Strong | STEP etc. | Own UI | 5.0k stars ✔ | **No** (licence, mechanical CAD) |
| [Astral3D](https://github.com/mlt131220/Astral3D) | Apache-2.0 ✔ | CAD preview (README) | Three.js editor | Yes | BIM light, CAD (README) | Vue 3 ✔ (description) | 2.5k stars, pushed 16 Nov 2026 ✔ | **No** (Vue app, Chinese-first docs); ideas only |
| [mlightcad/cad-viewer](https://github.com/mlightcad/cad-viewer) 1.7.8 | MIT ✔; DWG via GPL `libredwg-converter` opt-in or a paid parser (README) | DXF/DWG viewer and editor, SVG/PDF plugins | Three.js 2D | Yes | DXF (MIT parser); DWG GPL or proprietary (README) | `cad-viewer` needs Vue ✔; `cad-simple-viewer` is framework-free ✔ (13.6 MB unpacked) | 1.3k stars, pushed 17 Nov 2026 ✔ | **Later** for viewing DXF references; never with the GPL converter |
| [hypar-io/Elements](https://github.com/hypar-io/Elements) | MIT ✔ | — | glTF out | — | IFC (README) | C#/.NET, server only | 423 stars, pushed 14 Nov 2026 ✔ | **No** (wrong runtime) |
| [egmalt/house-planner](https://github.com/egmalt/house-planner) | MIT ✔ | True-scale 2D (description) | 3D (description) | Yes (description) | Not checked | Not checked | 400 stars, pushed 1 Oct 2026 ✔ | Ideas only; not inspected |
| [mehanix/arcada](https://github.com/mehanix/arcada) | Apache-2.0 ✔ | Pixi.js floor plan editor | — | Yes | — | React + Pixi (description) | 433 stars, pushed 14 Oct 2026 ✔ | Ideas only (canvas, not SVG) |
| [OpenCADStudio](https://github.com/HakanSeven12/OpenCADStudio) | GPL-3.0 ✔ | Rust desktop CAD | Yes | Yes | DWG/DXF | Desktop | 4.1k stars ✔ | **No** |
| [open-pdf-studio](https://github.com/OpenAEC-Foundation/open-pdf-studio) | LGPL-3.0 ✔ | PDF view/annotate | — | Annotations | — | Rust desktop (description) | 1.3k stars ✔ | Ideas for RD1 only |
| [opentakeoff](https://github.com/Kentucky-ai/opentakeoff) | AGPL-3.0 ✔ | PDF takeoff | — | Measure | — | — | 856 stars ✔ | **No** (licence); ideas for RD1 PDF intake |
| [draftwright](https://github.com/pzfreo/draftwright) 0.6.0 | AGPL-3.0 ✔ + commercial on request (README) | STEP → dimensioned mechanical drawings as SVG/PDF/DXF (README) | None | None | STEP in; DXF out (README) | Rust CLI, Python wheel, WASM (README) | 29 stars, created 7 Oct 2026, one contributor, pushed 17 Nov 2026 ✔ | **No**: mechanical parts, not floor plans; AGPL. Copy ideas only: a review file listing what it could not dimension, automatic dimension layout |
| [mutinybim](https://github.com/permitzip/mutinybim), [debim](https://github.com/PRIDA-TAKON/debim), [ibuilder/massing](https://github.com/ibuilder/massing) | Apache-2.0 / MIT / MIT ✔ | — | Various | — | massing is IFC-native (description) | — | 96 / 22 / 135 stars ✔ | Watch only |
| [aec-model-bridge](https://github.com/Sam-AEC/aec-model-bridge), [BIMserver](https://github.com/opensourceBIM/BIMserver) | GPL-3.0 / AGPL-3.0 ✔ | — | — | — | Revit / IFC | — | ✔ | **No** in product |
| [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | LGPL-3.0 ✔ | Plan SVG from IFC (README) | Geometry | — | IFC read/write | Python on the orchestrator | 3.0k stars, pushed 16 Nov 2026 ✔ | **Later, adopt on the backend** for IFC export (LGPL as an unmodified library is acceptable; confirm with counsel) |
| [Konva](https://github.com/konvajs/konva) 10.9.1 + react-konva 19.3.2 | MIT ✔ | Canvas scene graph, transformer handles | — | Strong | — | react-konva peers React ^19.3.0 ✔ | 15.0k / 6.4k stars ✔ | **No** for now: canvas would split screen from SVG export |
| [Fabric.js](https://github.com/fabricjs/fabric.js) 7.4.0 | MIT ✔ | Canvas, SVG import/export | — | Strong | — | Vanilla | 31.6k stars ✔ | **No** (same reason) |
| [Paper.js](https://github.com/paperjs/paper.js) 0.17.0 | MIT ✔ | Vector, booleans | — | Hit tests | — | Vanilla, global scope | 15.2k stars ✔ | **No** |
| [tldraw](https://github.com/tldraw/tldraw) 5.6.1 | tldraw licence ✔: no production use without a licence key | Infinite canvas | — | Strong | — | React ✔ | 51.5k stars ✔ | **No** unless we buy a licence |
| [Excalidraw](https://github.com/excalidraw/excalidraw) 0.18.1 | MIT ✔ | Hand-drawn whiteboard | — | Strong | — | React ✔ (45.7 MB unpacked) | 135.8k stars ✔ | **No** (style and size wrong for drawings) |
| [flatten-js](https://github.com/alexbol99/flatten-js) `@flatten-js/core` 1.6.15 | MIT ✔ | Geometry: arcs, polygons with arcs, booleans, distance | — | — | — | Pure JS | 656 stars, pushed 25 Oct 2026 ✔ | **Adopt** for M1/V2 geometry (arc-aware) |
| [maker.js](https://github.com/microsoft/maker.js) 0.19.2 | Apache-2.0 ✔ | 2D models, SVG/DXF/PDF export | — | — | DXF out | Pure JS | 2.1k stars ✔ | Fallback for DXF |
| [Clipper2](https://github.com/AngusJohnson/Clipper2) | BSL-1.0 ✔ | Polygon offset/boolean | — | — | — | JS ports are stale (`clipper2-js` 2024, Angular peers ✔) | Repo archived ✔ | **No** (archived; no good JS port) |
| [dxf-parser](https://github.com/gdsestimating/dxf-parser) 1.1.2 | MIT ✔ | DXF read | — | — | DXF | Pure JS | Last publish Jun 2022 ✔ | Later, read only |
| `@tarikjabiri/dxf` 2.10.1 | MIT ✔ | DXF write | — | — | DXF out | Pure JS, 0.4 MB | Published 14 Nov 2026 ✔ | **Later** for DXF export |
| [dxf-viewer](https://github.com/vagran/dxf-viewer) 1.0.51 | MPL-2.0 ✔ | DXF view (Three.js) | — | — | DXF | Vanilla | Pushed 11 Nov 2026 ✔ | Later, alternative to mlightcad |
| [LibreDWG](https://github.com/LibreDWG/libredwg), `@mlightcad/libredwg-web` | GPL-3.0 ✔ | — | — | — | DWG | — | ✔ | **No** in product |
| ODA Drawings SDK | Commercial membership | — | — | — | DWG read/write | Server or WASM | Vendor | Only if DWG becomes a must |
| `svg2pdf.js` 2.9.0 + `jspdf` 4.2.1 | MIT ✔ | Vector PDF from our SVG | — | — | — | Client or Node | Published Oct 2026 / Mar 2026 ✔ | **Adopt** for vector PDF (L9) |

## 3. Recommendation

### 2D: keep and extend our SVG renderer

The SVG plan already does what libraries would give us and keeps one property they would lose:
the screen and the export are the same SVG. Canvas editors (Konva, Fabric, tldraw) would split
them and add a licence or bundle cost. Extend `PlanDrawing` with:

- **Edit handles (M1)**: an SVG layer of handles for the selected room or wall (move, resize
  edges, drag an opening along its wall), emitting a typed edit, not mutating the graph. Copy
  the interaction patterns from Pascal's MIT `editor-2d` layers (alignment guides, measurement,
  group move) and its wall-mitering and wall-curve maths, with attribution.
- **Geometry**: `@flatten-js/core` for arc-aware point-in-polygon, offset, booleans and room/wall
  diffs. It handles our curved walls; Clipper2 is archived and has no maintained JS port.
- **Shared overlay geometry (V2)**: draw highlights with the same `roomPoints` and `wallPath` as
  the plan, which fixes L3. No dependency.
- **Diff overlay (M1, EV1)**: compare two graphs by element key (added / removed / changed) and
  draw a coloured layer; pure logic in `src/lib/plan-diff.mjs` with a test.
- **Redlines (RD1)**: extend `plan-canvas-annotations.ts` with freehand, cloud, arrow and text
  in model millimetres, stored as data and drawn in SVG. No tldraw.
- **Export**: vector PDF through `svg2pdf.js` + `jspdf` (L9). DXF later with `@tarikjabiri/dxf`.
- **One renderer (L11)**: in a later phase, render the web `PlanDrawing` on the server with
  `renderToStaticMarkup` and Resvg so export, preview and screen share one drawing; retire the
  planner's four drawers for display only after a parity test.

### 3D: extend our Three.js now; adopt That Open for Revit/IFC later

- **Now (V2, M1)**: fix L1 (extrude curved walls as a plan footprint, or the arc shape, with
  openings cut by `three-bvh-csg` only where needed), L2 (rooms from `roomPoints` through
  `THREE.ShapeGeometry`), L4 (pick walls and openings), L5 (outline the selection with
  `EdgesGeometry` in accent, ghost the rest, diff colours). These stay inside the current
  component; split it into a scene builder in `src/lib` and a thin component first (L12).
- **R3F + drei**: optional. Adopt only if the split shows the imperative code is still the
  bottleneck. Compatible with React 19.3 ✔.
- **Pascal**: do not embed. It is the closest product to ours and MIT, but it brings its own
  scene schema, state store, WebGPU path and three 0.187. Copy maths, not the package.
- **M2 and IFC**: when hosted Revit editing needs the real model, export IFC (or fragments)
  from the Revit plug-in and view it with `@thatopen/components` + `@thatopen/fragments` +
  `web-ifc`. It brings Highlighter, Outliner, Clipper and plans. Speckle viewer only if Revit
  data goes through Speckle. xeokit and APS only with a paid licence.
- **IFC export (EV1, later)**: IfcOpenShell on the orchestrator.

### Phases

| Step | Size | Phase | Work | New dependency |
|---|---|---|---|---|
| A | S | V2 | Overlay from shared geometry (L3); 3D polygon rooms (L2); select walls/openings in 3D (L4); outline + ghost highlight (L5) | None |
| B | M | V2 | Split `plan-three.tsx` into `src/lib/plan-scene` + component (L12); curved walls in 3D (L1); wall joins (L7) | `three-bvh-csg`, `three-mesh-bvh` only if arc openings need CSG |
| C | L | M1 | 2D handles, typed edits, live preview; graph diff overlay in 2D and 3D; incremental 3D updates (L6) | `@flatten-js/core` |
| D | S | EV1 | Vector PDF of the sheet and before/after pages | `svg2pdf.js`, `jspdf` |
| E | M | RD1 | Redline tools in the SVG annotation layer; PDF/image underlay | None |
| F | M | EV1 / later | One server-side renderer (L11); DXF export | `@tarikjabiri/dxf` |
| G | L | M2 | Revit model view through IFC or fragments | `@thatopen/components`, `@thatopen/components-front`, `@thatopen/fragments`, `web-ifc` |
| H | M | Later | IFC export on the orchestrator; DXF reference viewing | `ifcopenshell` (Python), `@mlightcad/cad-simple-viewer` without the GPL converter |

### Risks

- **Licence**: MPL-2.0 (`web-ifc`, `dxf-viewer`) and LGPL-3.0 (IfcOpenShell) are acceptable as
  unmodified libraries; changes to those files must be published. Never add the mlightcad GPL
  converter, LibreDWG, xeokit, chili3d, draftwright or tldraw without a commercial licence.
- **Size**: That Open and web-ifc ship WASM (npm unpacked 30 MB fragments, 24 MB web-ifc ✔);
  load them only on the Revit view with `next/dynamic`. Not measured as bundles.
- **Version pins**: Pascal needs three 0.187; That Open needs three ≥0.182; R3F needs React
  <19.4. Upgrading React past 19.3 would block R3F 9.8.2.
- **Drift**: until step F, the planner's SVG and the web drawing can disagree; the export uses
  the web drawing, the stored artifact uses the planner's.
- **Curved geometry**: arc offsets, joins and openings on arcs are the hardest part of A–C;
  budget tests from the existing curved fixtures.
- **Not checked**: house-planner and Astral3D source, That Open's 2D plan quality, Speckle
  viewer's dependency licences, and real bundle sizes.

## 4. Decisions for the user

1. **2D renderer** — keep and extend our SVG `PlanDrawing` (recommended), or move 2D editing to
   a canvas library (Konva). Canvas splits screen from export.
2. **3D renderer for generated plans** — extend the current Three.js component after splitting
   it (recommended), or rewrite it on react-three-fiber + drei (two new dependencies).
3. **Revit/IFC viewing for M2** — That Open (MIT/MPL, recommended), Speckle (needs a Speckle
   server), APS (paid, native RVT) or xeokit (needs a commercial licence).
4. **Approve dependencies per step**, recommended now: `@flatten-js/core` (M1),
   `svg2pdf.js` + `jspdf` (EV1). Later and separately: `three-bvh-csg` + `three-mesh-bvh`,
   `@tarikjabiri/dxf`, `@thatopen/*` + `web-ifc`, `ifcopenshell`.
5. **Pascal Editor** — copy its MIT maths and 2D editing patterns with attribution
   (recommended), or embed its packages (heavy, own schema, three 0.187).
6. **DWG** — skip for now and offer DXF (recommended); buy a DWG parser (ODA or mlightcad's
   proprietary one) only if customers require DWG.
7. **draftwright** — no adoption (AGPL, mechanical STEP drawings). Optionally borrow its
   "what could not be stated" review report idea for our checks.
