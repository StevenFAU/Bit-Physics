# 00 — Foundation: the Field Studies platform

> Part of [Rebuild v2](README.md). Status: planning, v0.1, 2026-10-17. Unmeasured targets.
>
> **Implementation status (2026-10-17, Wave 0):** F0–F2 built with the Turing Patterns pilot —
> the root npm workspace, `web/{gpu,render,runtime,studio,verify}` (see `web/README.md`), and
> `pipeline.py` `PAGES` for gated v2 pages. Not yet built: the rewind ring and `Timeline`,
> HDR-display (`extended`) output, shader hot-reload, visual-regression baselines,
> ESLint/Prettier workspace-wide, and the iGPU reference machine for budgets. IBM Plex Sans
> is not vendored yet (UI text falls back to system-ui); Mono and Sans Condensed are.
>
> **Wave A (2026-10-23, with Slime Mould M0):** bloom (§ 3.1, dual-filter, mixed in by
> `HdrPipeline`, off unless a sim asks for it) and the GPU counting sort with its prefix scan
> (`CountingSort`, `PrefixScan` in `@bp/gpu`; Swarm's broadphase reuses it).
>
> **Swarm M0 (2026-10-24):** `GpuProfiler.begin(tag)` returns each frame's tag (its solver
> steps) as `frameTag`, and a `shark` icon joins the set. Measured: with one frame in flight the
> RX 6800 XT idles at 500 MHz between frames; Swarm keeps two in flight and governs on the frame
> interval (see 03-boids-2d.md).
>
> **Firefox frame gate (2026-10-29, found in Swarm, fixed in all four):** Firefox (wgpu) resolves
> `onSubmittedWorkDone` and `mapAsync` only at the next `queue.submit` or on a ~100 ms timer. A
> frame loop that skips frames while N are in flight, and submits nothing while it waits, draws about
> 10·N frames/s there. Each Field Studies page now makes an empty `queue.submit([])` on a skipped
> frame, takes its time step and fps readout after the gate (frames drawn, not animation-frame
> callbacks), and keeps three frames in flight: Swarm (PR #53), Turing Patterns, Slime Mould and
> Grow. Firefox reports each frame done about one display frame late, so one in flight draws half
> the display rate there and two leave the GPU waiting under load (Slime Mould at 8×: 120–128 fps
> against 161–164; Grow's training: 40 iterations/s against 53); Chromium is the same at two and
> three. Measured in headed Firefox 158 on a 165 Hz display, frames submitted per second: Turing
> Patterns, Slime Mould and Grow 10–11 → 165, with their sims back at full speed (they had taken
> their time step before the gate and ran at ~6%). Left: Grow's Menagerie draws ~105 there, because
> Firefox runs the NCA step ~10× slower than Chromium (04-neural-ca.md).

The twelve rebuilt sims share one platform: a UI shell, a render core, a simulation runtime,
a proof layer and a monorepo setup. The prototypes each solved these on their own, which is
why quality is uneven and fixes don't propagate. This document specifies the shared parts;
the sim documents only describe what is particular to each sim.

Canyon Lab (`packages/terrain-erosion/web/`) is the seed: its full-bleed layout, scene
heading, tool rail, transport bar, save points and A/B compare are the patterns to
generalise. The `.bps` panel (`common/common-web/src/panel-shell.ts`) stays for the ten sims
not being rebuilt and retires when they migrate.

## 1. Principles

1. **The simulation is the interface.** Full-bleed canvas; chrome floats over it, is
   translucent and quiet, and gets out of the way. The sim owns colour; chrome is neutral.
2. **Every sim has its own art direction.** A palette, lighting and mood chosen for that
   phenomenon (ember for fire, ink for Turing patterns, dusk for starlings) — not one house
   teal applied to everything.
3. **Verbs, not variables.** Tools are actions on the canvas (*feed*, *cut*, *pour*,
   *launch*). Parameters appear as named regimes first, sliders second, symbols third.
4. **Three layers, one page.** *Play* (the toy), *Learn* (what you are seeing, annotated on
   the canvas), *Prove* (the gate re-run on your GPU). Learn and Prove never cover Play's
   canvas by default.
5. **Nothing settles into nothing.** A scene that would go inert gets a director: a
   re-seed, a new event, a slow loop.
6. **Measured, then declared.** Same rule as the physics: performance tiers, exposure and
   quality settings are chosen from measurements on the device, not assumed.

## 2. The shell

### 2.1 Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◂ Bit Physics / Field Studies          SIM NAME     [Learn] [Prove] │  top bar (48 px)
│                                                                      │
│  02 / AGENT-BASED                                                    │  scene heading
│  Feed the Mould                                                      │  (editorial, left)
│  Drop food and watch it connect the dots.     [scene ▾]              │
│                                                                      │
│ ┌──┐                                                                 │
│ │✋│  tool rail (left, vertical; bottom row on phones)                │
│ │🍞│                                                                 │
│ │✂ │                     full-bleed simulation                       │
│ └──┘                                                                 │
│                                                                      │
│  ▶ ▮▮  step  1×   ◀━━━━━━━━━━━●━━  save · restore · A/B     60 fps ● │  transport (bottom)
└──────────────────────────────────────────────────────────────────────┘
          Learn / Prove open as a right-hand drawer (bottom sheet on phones)
```

- **Top bar:** back link, collection label, sim name, Learn and Prove toggles, share.
- **Scene heading:** eyebrow (`02 / AGENT-BASED`), scene title, one-line prompt, scene
  picker. Fades to 30% opacity after 6 s of no pointer movement; never blocks input.
- **Tool rail:** 3–7 tools with icon + label (labels hide on narrow screens, kept as
  accessible names). Active tool shows a contextual options strip (brush size, strength).
- **Transport:** play/pause, step, speed, restart scene, a timeline scrubber where the sim
  supports rewind (§4.3), save point / restore / A/B compare, a quiet status dot that turns
  amber when the quality governor stepped down.
- **Drawer:** Learn and Prove content. Right drawer ≥ 900 px wide viewports, bottom sheet
  below. Opening it never resizes the canvas (no reflow, no re-layout of the sim).
- **Parameters:** a compact "Tune" popover from the tool rail holding the 3–6 sliders that
  matter, named in plain words with the symbol as a secondary label
  (`Sensor reach · L_s`). Everything else lives in Learn's "Model" section.

### 2.2 Responsive rules

| Width | Tool rail | Drawer | Scene heading | Transport |
|---|---|---|---|---|
| ≥ 1100 px | left, vertical | right, 380 px | full | full |
| 640–1099 | left, vertical, icons only | right, 320 px overlay | title + prompt | compact |
| < 640 | bottom row above transport | bottom sheet, 3 snap points | title only, tap to expand | play / scrub / more |

The canvas always fills the viewport. Sims with a square domain render the domain inside a
full-bleed scene (a lit petri dish, a tank, a plate on a bench) or fit the domain to the
viewport height and extend a context field (a darkened, blurred continuation) to the edges.
Plain black bars are not allowed.

### 2.3 Components

`@bp/studio` ships: `TopBar`, `SceneHeading`, `ToolRail` + `ToolOptions`, `Transport`,
`Timeline`, `Drawer`, `TunePopover`, `Slider` (with fine-adjust drag and typed entry),
`Segmented`, `Toggle`, `ColorScale` (legend with units), `Sparkline`, `PlotPanel` (axis,
ticks, units, hover readout), `Callout` (canvas-anchored annotation for Learn), `ProofCard`,
`Toast`, `ShortcutSheet`, `LoadingVeil` (shader-compile progress with real steps),
`NoWebGPU` (the fallback card already shipped in `common/common-web/src/webgpu-fallback.ts`,
moved here). Plain TypeScript + DOM; no framework dependency.

### 2.4 Visual language for chrome

- Type: IBM Plex Sans for UI in sentence case; Plex Mono only for numbers and readouts;
  Plex Sans Condensed for eyebrows. Scene title 32–40 px (24 px on phones).
- Surfaces: `rgba(12,16,20,.72)` with 12 px blur, 1 px hairline, 8 px radius. Light theme
  is not required; contrast ≥ 4.5:1 for text on surfaces against the brightest frame the
  sim produces under the chrome (checked in the visual tests, §7.3).
- Motion: 160–240 ms ease-out, no bouncing; all of it disabled under reduced motion.
- Icons: one stroke icon set (Lucide-style, MIT) inlined as SVG.

### 2.5 Input

- Pointer events only (unified mouse, pen, touch). Two-finger pinch/rotate on touch; wheel
  and trackpad pinch on desktop. Canvas gestures never scroll the page.
- Tools paint in simulation space with a live hover preview (ring, ghost, trajectory).
- Edits are events with an ID and a simulation-step stamp (§4.2), so they can be undone,
  replayed and shared.
- Keyboard: Space play/pause, `.` step, `R` restart, `1–9` tools, `[ ]` brush size, `S`
  save point, `Z` undo, `?` shortcut sheet. Every control reachable by Tab with a visible
  focus ring.
- Device tilt (where a sim declares it, e.g. *Water in Hand*): DeviceOrientation behind an
  explicit "Use tilt" button (iOS requires a permission prompt from a user gesture).

### 2.6 Share and export

- URL state: scene id, changed parameters, seed, camera, tool — short, readable keys,
  versioned (`v=2`). Restoring a URL reproduces the scene's starting state exactly.
- Snapshot: PNG at up to 2× canvas resolution with an optional caption strip.
- Clip: 6–15 s WebM via `canvas.captureStream()` + `MediaRecorder`, chrome-free.
- Capture (developer): the existing `exposeCapture` + `[data-bp="capture"]` contract moves
  into the Prove drawer's footer. It must remain clickable in the boot state at 1280×720
  for the headless driver (the drawer's footer is rendered but visually collapsed there).

## 3. Render core (`@bp/render`)

### 3.1 HDR pipeline — the white-blob fix

Every sim renders scene colour into an `rgba16float` target, then one composite pass does
exposure → tone map → output transform → blue-noise dither into the swapchain.

- **Exposure** is measured, not guessed: a GPU luminance histogram (64 bins, log2) of the
  scene target each frame, exposure eased towards a target percentile (default: 95th
  percentile maps to 0.8 of white). Sims may pin exposure for a scene (e.g. for a fixed
  colour scale in a measurement view).
- **Tone map:** Khronos PBR Neutral for scenes with meaningful colour (fields, colormaps);
  AgX for emissive/photographic scenes (fire, glow, sky). Both as WGSL functions.
- **HDR displays:** where `toneMapping: { mode: "extended" }` is available (Chrome 129+),
  configure the canvas `rgba16float` + extended and let highlights exceed 1.0; otherwise
  SDR. Feature-detected; never required.
- **Dither:** a 64×64 blue-noise texture, ±0.5 LSB, kills banding in smoke and glow.
- **Bloom:** dual-filter (Kawase-style downsample/upsample) on the HDR target, threshold-free
  energy-preserving mix, intensity ≤ 0.08 by default. Only for emissive content.

Additive renderers (tracers, trails, glows) accumulate in float with per-sample weight
normalised by expected overlap; nothing writes additive light into an 8-bit target.

### 3.2 Colour

- Perceptual colormaps as 256-entry LUT textures: viridis, magma, inferno, cividis,
  plus diverging *ice–fire* and *teal–rust* (both CVD-checked). Every colormapped view
  shows a `ColorScale` with units.
- Sim art palettes are authored as small token sets (`--sim-bg`, `--sim-key`, `--sim-accent`)
  so chrome accents can echo the sim without fighting it.
- Linear-space blending everywhere; sRGB only at output.

### 3.3 Cameras

- `Camera2D`: pan/zoom with inertia, pinch, double-click to fit, bounded to domain + margin.
- `OrbitCamera`: orbit/dolly/pan, damped, ground-collision, saved views, double-click reset.
- `FollowCamera` and `DirectorCamera` (scripted cinematic moves for attract mode and
  posters); disabled under reduced motion.
- Shared jitter for optional TAA (only sims that need it: Murmuration, Water in Hand).

### 3.4 Shared renderers

| Renderer | Used by | Notes |
|---|---|---|
| `FieldView2D` | Turing Patterns, Slime Mould, Grow, Swarm (density) | bicubic sampling, height-from-field relief with lighting, isolines, colormap/LUT, raw-texel toggle |
| `Points` / `Sprites` | Chaos, Flow Sculpture, Swarm | GPU-driven instancing, size attenuation, velocity stretch, float accumulation |
| `Ribbons` | Flow Sculpture, Chaos, Swarm trails | per-particle history ring buffer, screen-space width, fade |
| `Instances` | Murmuration, Swarm (fish) | procedural mesh per instance, LOD, frustum cull in compute |
| `LiquidSurface` | Water in Hand, Wave Tank, Materials | screen-space fluid: depth, narrow-range filter, thickness, normals, refraction against an environment, absorption, foam layer |
| `VolumeMarch` | Plume, Vortex Rings | ray-march a 3D texture with single scattering and a light-march shadow volume, blue-noise jitter + temporal accumulation |
| `Environment` | 3D sims | procedural sky (Hosek-Wilkie-style analytic), studio HDR gradients, ground plane with contact shadows |

### 3.5 Pixel budget

Render resolution = CSS size × min(devicePixelRatio, 2) × governor scale (0.5–1.0). The
governor (§4.5) lowers render scale before it lowers simulation size. Text and chrome stay
at native resolution.

## 4. Simulation runtime (`@bp/runtime`)

### 4.1 Clock

Fixed simulation step decoupled from display: an accumulator runs `k` steps per frame
(capped), interpolates render state where useful, and exposes `speed` (0.25×–8×). One
command encoder per frame records all compute and render passes; one `queue.submit`.

### 4.2 Determinism and events

- Seeds are explicit (`seed` in URL state); every random draw in a shader is a counter-based
  hash of (seed, step, index) — never `Math.random()` in the live path.
- User edits are events `{id, step, tool, params, geometry}` applied at step boundaries.
  An event log + seed + scene id replays a session (used by share links for authored demos
  and by the visual tests).
- Determinism claims stay per-device: same device, same browser ⇒ same bytes where the
  sim's gate says so. Cross-device sameness is never implied.

### 4.3 History

- **Save point / restore / A/B:** GPU buffer copies into a checkpoint slot (no readback).
- **Rewind:** a ring of N checkpoints at a declared cadence (e.g. one per second of sim
  time, N = 30) where memory allows; scrubbing restores the nearest checkpoint and replays
  events forward. Each sim declares whether it supports rewind and its memory cost.
- **Undo** = restore the checkpoint before the last event and replay the rest.

### 4.4 Capability tiers

At boot: request adapter (`high-performance`), read limits and features (`timestamp-query`,
`subgroups`, `shader-f16`, `float32-filterable`), then pick a tier:

| Tier | Typical device | Target |
|---|---|---|
| `T3` | discrete GPU, desktop | 60 fps at full scene size |
| `T2` | integrated GPU / Apple M-series base | 60 fps at reduced size or render scale |
| `T1` | phone / tablet | 30–60 fps, smallest scene size |

Optional features have fallbacks: subgroup reductions fall back to workgroup shared-memory
reductions; f16 storage falls back to f32. A 2-second calibration on first visit confirms
the tier (frame-time percentiles from timestamp queries, else rAF timing) and is cached in
`localStorage` per adapter description.

### 4.5 Quality governor

Watches GPU frame time (timestamp queries when present). If p90 exceeds budget for 2 s,
step down: render scale → effect quality (bloom, TAA, foam) → simulation size (only at a
scene restart, never silently mid-run, since size changes the physics). Step-downs show as
the amber dot with a tooltip saying what changed. Never steps down during a Prove run.

### 4.6 Profiling

Per-pass GPU timings (timestamp queries) shown in Learn's "Performance" section and written
into captures' perf metadata. Dev builds show a frame graph overlay (`?debug=perf`).

## 5. Proof layer (`@bp/verify`)

- **Gate kernels are frozen; renderers are free.** When a sim keeps its model, the gated
  WGSL kernel and its capture path are ported byte-for-byte (or re-derived and re-gated
  under the measured-then-declared rule). WGSL trig/exp accuracy rules from the current
  sims apply: gated shaders use polynomial trig or committed f64 tables, never builtin
  `sin`/`cos`/`exp` on gated values.
- **Capture contract:** keep `exposeCapture`, `[data-bp="capture"]`, `__bitPhysicsReady`
  and the `createSettingsPanel` discovery literal (or update `pipeline.py` discovery to a
  v2 marker in the same change). Registry entries in `sims.json` are unchanged.
- **Prove drawer:** a `ProofCard` per check — what is being tested in one plain sentence,
  the measured number, the declared budget, a bar showing the ratio, pass/fail, adapter id,
  and a link to the spec section and the ledger row. A "Run all on this GPU" button.
  Precise labels only: *analytic check passed*, *reference agreement passed*, *budget
  within tolerance*, *illustrative scenario (not gated)*.
- **Live honesty:** when the visitor's edits take the sim outside the gated regime
  (e.g. a brush that injects energy), the Prove drawer says so and offers "restore gated
  scene".

## 6. Learn layer

- **Callouts:** annotations anchored to simulation-space features ("this branch is being
  pruned", "vortex ring", "shock") that track the feature and fade; authored per scene with
  simple triggers (time, threshold on an observable).
- **How it works:** three short levels — one sentence; a paragraph with a diagram; the
  equations (MathML, no math library) with each symbol linked to the control it maps to.
- **Instruments:** the sim's live observables as sparklines and plots with units.
- **Model limits:** the existing honesty note (faithful / simplified / measured), kept.

## 7. Engineering

### 7.1 Workspace

Move the web frontends to an npm workspace (root `package.json` with `workspaces`) and one
lockfile. Shared packages under `web/`: `@bp/studio`, `@bp/render`, `@bp/runtime`,
`@bp/verify`, `@bp/gpu` (device, pipelines, buffers, WGSL module loader). Each sim stays a
package at `packages/<sim>/web` so the deploy pipeline's per-sim build and `dist` contract
is unchanged. Expected effect: one install instead of 22 (the current matrix spends most of
its 8–15 minutes in `npm ci`), shared dependency versions by construction.

### 7.2 Code organisation

- WGSL as `.wgsl` files with a tiny `#import` preprocessor (shared noise, hash, colormaps,
  tone map, fixed-point helpers). Shader hot-reload in dev.
- Sims structured as `model/` (state, kernels, CPU mirror), `render/`, `scenes/`,
  `ui/`, `proof/`. A sim's `main.ts` wires the shell, runtime and these modules.
- TypeScript strict, ESLint, Prettier; `@webgpu/types` pinned workspace-wide.

### 7.3 Tests

| Kind | Tool | Runs where |
|---|---|---|
| CPU mirrors, math, URL state | Vitest | CI |
| Gate (capture → verify) | existing `pipeline.py validate` | CI on lavapipe |
| Visual regression (scene at fixed step, seed) | Playwright screenshots, perceptual diff | local RADV + CI lavapipe with per-backend baselines |
| Chrome layout at 390/820/1440 widths, 200% zoom | Playwright | CI |
| Accessibility (names, roles, contrast, focus order) | axe-core via Playwright | CI |
| Performance budgets | `?bench=1` scripted run, timestamp-query report | local reference machines (RX 6800 XT + an iGPU) |

The registry check (`check_registry.py`) stays the add-a-sim gate.

### 7.4 Budgets

- JS bundle per sim ≤ 250 kB gzip excluding sim-specific data; shared chunk cached across sims.
- First interactive frame ≤ 2.5 s on T3 after assets arrive; a `LoadingVeil` shows real
  compile steps if longer.
- Landing loop video ≤ 1.5 MB, poster ≤ 200 kB (existing rules).

## 8. Migration and release

1. Land the foundation packages with the Turing Patterns pilot behind `/sims/reaction-diffusion-2d/v2/`.
2. When a v2 sim passes its gate and acceptance, swap it to `/sims/<sim>/` and move v1 to
   `/sims/<sim>/v1/` (kept one release).
3. Update the landing card, poster, loop and splash entries through the registry in the same PR.
4. After all twelve land, migrate the ten remaining sims onto the shell (a smaller job:
   shell + render core, keep their solvers) and retire `panel-shell.ts`.

## 9. Foundation milestones

| Milestone | Contents | Done when |
|---|---|---|
| F0 | Workspace, `@bp/gpu`, WGSL loader, HDR composite, Camera2D, shell skeleton | A test sim renders a field full-bleed with tone map and passes axe + layout tests at 3 widths |
| F1 | Tools/events, history (save/restore/A-B/undo), URL state, governor, timestamp profiling | Pilot can save, restore, undo, share a link that reproduces the scene |
| F2 | Learn callouts, Prove drawer, capture contract in drawer, clip export | Pilot's gate passes in CI from the v2 page; Prove re-runs it in-page |
| F3 | 3D: OrbitCamera, Environment, Points/Ribbons/Instances | Chaos and Flow Sculpture can start |
| F4 | LiquidSurface | Water in Hand can start |
| F5 | VolumeMarch | Plume can start |

## 10. Risks

- **Over-building the platform before a sim ships.** Mitigation: F0–F2 are built *with* the
  pilot, not ahead of it; F3–F5 land with the first sim that needs them.
- **Shared code regressions across many sims.** Mitigation: visual regression baselines per
  sim and the per-sim gates in CI on every PR touching `web/`.
- **lavapipe is too slow for heavy scenes.** Gates already run on reduced tiers; keep each
  sim's gate scene small and separate from its hero scene.
- **Safari/Firefox WebGPU differences.** Test matrix includes Safari 26 (macOS) and Firefox
  on Windows at each wave; features beyond core WebGPU are optional by rule (§4.4).

## References

- WebGPU implementation status — [gpuweb wiki](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status)
- HDR canvas tone mapping — [Chrome: New in WebGPU 129](https://developer.chrome.com/blog/new-in-webgpu-129)
- Subgroups — [Chrome: New in WebGPU 134](https://developer.chrome.com/blog/new-in-webgpu-134)
- Screen-space fluid rendering in WebGPU — [matsuoka-601/WebGPU-Ocean](https://github.com/matsuoka-601/WebGPU-Ocean) (MIT), [Codrops write-up](https://tympanus.net/codrops/2025/02/26/webgpu-fluid-simulations-high-performance-real-time-rendering/)
- Real-time 3D fluid rendering — [GPU Gems 3, ch. 30](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids)
- Canyon Lab specification — [terrain-erosion-canyon-lab-spec.md](../terrain-erosion-canyon-lab-spec.md)
