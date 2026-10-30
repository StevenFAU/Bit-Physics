# Field Studies — shared web packages

The platform the rebuilt sims stand on ([docs/planning/rebuild-v2/00-foundation.md](../docs/planning/rebuild-v2/00-foundation.md)).
Plain TypeScript source packages — no build step of their own; each sim's Vite build
compiles what it imports. The Wave 0 pilot is Turing Patterns
(`packages/reaction-diffusion-2d/web`); Wave A adds Slime Mould (`packages/physarum/web`),
Grow (`packages/neural-ca/web`, page `v2/`) and Swarm (`packages/boids-2d/web`, page `v2/`).
Turing Patterns and Slime Mould have replaced their v1 pages at the sim root (v1 kept at
`v1/`); see "The release swap" below.

| Package | What it holds |
|---|---|
| `@bp/gpu` (`gpu/`) | `acquireGpu` (adapter info, optional features, software-rasteriser detection), capability tiers T1–T3 (`pickTier`, per-adapter memory), the WGSL `#import` loader (`defineWgsl` / `wgsl`), buffer helpers and a no-stall `ReadbackSlot`, `GpuProfiler` (timestamp queries, else submit→done latency; `begin(tag)` returns a frame's tag, e.g. its solver steps, as `frameTag` when its timings land). `CountingSort` (bucket N items by a u32 key: clear → histogram → scan → scatter, leaving `cellStart` and `order`; order within a key is unspecified, so consumers must be invariant to it) on top of `PrefixScan` (multi-level exclusive scan, up to 1024³ values), with a CPU reference and checker for tests. WGSL modules: `bp/fullscreen`, `bp/hash`. |
| `@bp/render` (`render/`) | `HdrPipeline`: rgba16float scene target → optional bloom (dual-filter mip chain, 13-tap downsample with a Karis-averaged first level, tent upsample; energy-preserving mix, off unless `bloom.intensity > 0`) → GPU-measured exposure (64-bin log2 histogram, eased towards a percentile) → Khronos PBR Neutral or an AgX-style tone map → sRGB → 64×64 blue-noise dither. `Camera2D` (cover fit, pan/zoom/pinch, inertia, fly-to, bounds or wrap). `OrbitCamera` (orbit/dolly/truck, damping, ground clamp, saved views, reset, turntable off under reduced motion; the same gesture surface as Camera2D, so `CanvasInput` drives either). Colormap LUTs (viridis/magma/inferno/cividis + ice–fire/teal–rust, OKLab-interpolated). `FieldView2D`: scalar buffer → filtered field texture → lit material / colormap + isolines / raw texels, A/B wipe, overlay tint, context continuation outside bounded domains. WGSL: `bp/tonemap`, `bp/color`. |
| `@bp/runtime` (`runtime/`) | `SimClock` (fixed ticks, speed, cap), `EventLog`, `History` (save point / restore / A-B / undo over sim checkpoints), `UrlState` (versioned short keys, only non-defaults written), `QualityGovernor` (p90 over 2 s → render scale → effects → size at next restart; suspended during Prove), counter-based `hash3` mirroring WGSL `bp/hash`. |
| `@bp/studio` (`studio/`) | `createStudio` — top bar, scene heading, tool rail + options strip, Tune popover, transport, Learn/Prove drawer (right ≥ 640 px, bottom sheet below), share menu, toast, shortcut sheet, loading veil, no-WebGPU card — plus `Slider`, `Segmented`, `Toggle`, `ColorScale`, `Sparkline`, `PlotPanel`, `CalloutLayer`, `ProofCard`, `CanvasInput` (pointer/pinch/wheel/keyboard routing), `PerfOverlay`, `Dial` (a 270° rotary ARIA slider for a sim's signature parameter, e.g. Swarm's calm ↔ panic), the icon set and `studio.css`. |
| `@bp/verify` (`verify/`) | The capture contract (re-exports `exposeCapture`, `runCaptureExclusive`, … from `common/common-web/src/capture-export.ts`, one implementation for v1 and v2), `markReady`, the `capture_roundtrip` criterion as `agreement()`, `sha256hex`. |

## The contract a v2 page keeps

The headless gate (`tools/productization/web-deploy/web/headless/driver.mjs`) needs, in
the 1280×720 boot state: `window.__bitPhysicsReady === true`; an element with
`[data-bp-panel]` (the studio's drawer carries it); and `[data-bp="capture"]`, a live,
enabled `<button>` (put it in `studio.drawer.footer` — rendered but off-canvas while the
drawer is closed, never `display:none`) whose click runs the frozen capture path and
calls `exposeCapture`. Discovery greps the page's entry for `exposeCapture` and a shell
marker (`createStudio` or the v1 `createSettingsPanel`).

A v2 page is a second Vite input in the sim's own package (`v2/index.html` →
`dist/v2/`), so the per-sim build and `dist/` contract are unchanged; register it in
`pipeline.py` `PAGES` and `validate` drives it through the sim's same established gate.
Public assets live at the dist root. Resolve them from the bundle, not the page (a sim-local
`src/sim-root.ts`, as in Turing Patterns, Slime Mould and Grow), so the page works at either depth.

A frame loop that skips frames while earlier ones are unfinished (frames in flight, released
by `queue.onSubmittedWorkDone`) must not just return when it skips. Firefox (wgpu) resolves
`onSubmittedWorkDone` and `mapAsync` only when it next checks for finished GPU work: at the
next `queue.submit`, or on a ~100 ms timer. A loop that stops submitting while it waits gets
about 10 frames/s per frame in flight. Make an empty `queue.submit([])` on a skipped frame,
and count the fps readout after the gate, so it counts frames drawn rather than callbacks.
Swarm (`packages/boids-2d/web/src/v2/app.ts`, `tick`) does both and keeps three in flight;
see [03-boids-2d.md](../docs/planning/rebuild-v2/03-boids-2d.md).

### The release swap

When a v2 page passes its gate and its spec's acceptance, it replaces v1 at `/sims/<sim>/`
and v1 is kept at `/sims/<sim>/v1/` for one release
([README](../docs/planning/rebuild-v2/README.md), release rule). In the sim's package:
`index.html` becomes the v2 page and `v1/index.html` the old one (the Vite inputs follow);
`public/v2/index.html` is a static page that forwards the old `/v2/` address, query and hash
to the root. In `pipeline.py` the sim gets a `ROOT_ENTRY` (`src/v2/main.ts`) and its `PAGES`
entry becomes `v1/` → `src/main.ts`, so `validate` still gates both pages. The v1 page calls
`rebaseSharedChrome()` from `src/sim-root.ts` so common-web's `../../` site links work from
`v1/`. The landing card, poster, loop and splash entries move to the root page in the same PR,
and the CI studio check runs the root page.

## Commands

```bash
npm ci                     # the whole workspace: 22 sims + these packages, one lockfile
npm test                   # Vitest: shared packages + packages/<sim>/web/test
npm run typecheck:tests    # tsc over the unit tests
npx tsc --noEmit -p web/studio   # one shared package (gpu, render, runtime, studio, verify)
```

Layout + accessibility in a real WebGPU browser (390 / 820 / 1440 px and 200% zoom,
full-bleed, chrome overflow and overlap, axe-core in the boot, Learn and Prove states; a
page may carry a query such as `v2/?s=mill`, a swapped sim's page is `""` (its dist root),
and a sim's own floating panels join the overflow / overlap checks by carrying
`data-bp-chrome`):

```bash
CHROME_BIN=/snap/bin/chromium PLAYWRIGHT_MODULE=$PWD/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js node web/tools/check-studio.mjs packages/boids-2d/web/dist v2/
```

The Turing Patterns acceptance run (dive, history, undo-by-replay, share links, the
live-solver ≡ gated-kernel check, every scene) is `packages/reaction-diffusion-2d/web/v2-acceptance.mjs`;
Slime Mould's (agent count and density, counting sort ≡ CPU reference, live ≡ gated bytes,
mass at full scale, in-page gate, history, seeds across page loads; the M1 scenes, the
personality pad against its calibration, growth, food, undo by replay, the light, the
director, the open Tune popover under axe; M2's Connect the Cities and The Maze scored in
their measured bands, the Wall tool and its undo, the score card's fit and axe; bench) is
`packages/physarum/web/v2-acceptance.mjs`; Grow's (the dish at step 1000 ≡ the committed canonical frame,
live solver ≡ gate path as a sliced job, in-page gate and its fail probe, undo by replay, history,
seeds across page loads, the director, bench) is `packages/neural-ca/web/v2-acceptance.mjs`;
Swarm's (fish count and density, the release-gate capture byte-identical on v1 and v2, the v2
kernel ≡ the v4 lab's trajectory hash, brute ≡ sort, the memory reorder exact, the shark, history,
seeds across page loads; M1: the Order Dial by keyboard, measured map points and a full η sweep,
the Mill's measured Tunstrøm regime, the new brains' brute ≡ sort / run-twice / re-sort-with-noise,
φ(η) against the f64 CPU reference, the three levels of detail; M2: Current's live divergence,
the brush, motes / momentum exchange / riding cards, save and seeds with the water, Food Chain's
census, Feed and Release, replay, ten simulated minutes without extinction; bench per scene) is
`packages/boids-2d/web/v2-acceptance.mjs`.
`?bench=1` on a v2 page prints a `BP_BENCH {…}` line after a 10 s measured run;
`?debug=perf` shows the frame graph; `?chrome=off` hides all chrome; `?tier=T1|T2|T3`
overrides the tier.
