# 06 — Flow Sculpture (curl noise)

> Part of [Rebuild v2](README.md). Replaces `packages/curl-noise/web`. Wave B.
> Status: planning, v0.1, 2026-10-17; M0 built 2026-11-14, M1 2026-11-18 (below). Elsewhere, targets are unmeasured.
>
> **Implementation status (2026-11-14): M0 built** as the `v2/` page of `packages/curl-noise/web`
> (served at `/sims/curl-noise/v2/`, gated through `pipeline.py` `PAGES`; v1 unchanged). The Studio:
> the gated sphere field in Silk on the F3 layer (View3D, Environment, Instances, Accumulator,
> OrbitCamera, HdrPipeline), the Move and Camera tools, Tune, Learn and Prove. Measured on the
> RX 6800 XT (snap Chromium 156, RADV) unless a line says otherwise.
>
> - **The gate, ported verbatim** (`src/v2/proof/gate.ts`): v1's tracer module source (`field.wgsl`
>   + the colormap uniform + `tracers.wgsl`), its `advect` and `anchor_f0` pipelines, the 144-byte
>   field and 224-byte tracer uniforms packed from the committed `gate-ic.json` params, its own
>   buffers, 64 steps each in its own submit, checkpoints every 8th, run twice, v1's bundle.
>   `pipeline.py validate --sim curl-noise` passes on both pages, run twice: all eight captures (v1
>   and v2, both runs) and two v1 captures taken on main before the change carry the same bytes —
>   positions sha256 `752e6e6e…`, steps hash `e4147153…`, the same manifest but for its wall clock.
>   Iso residual 1.18 × 10⁻⁵, 8.8% of the 1.33 × 10⁻⁴ budget, as on v1. The page signals ready once
>   the gate kernels compile (the driver saw 31–44 ms) and compiles the renderer and live kernels
>   after (live at ~200 ms).
> - **The live kernel runs the gated arithmetic** (`src/v2/model/live.wgsl`, concatenated after
>   `field.wgsl`; its RK4 step and reprojection are `tracers.wgsl`'s character for character). From
>   the gate's seeds with respawn off it gives the gate's positions byte for byte at all nine
>   checkpoints (Prove, and the acceptance run). One dispatch is one step, its uniforms on a
>   dynamic-offset ring, so the result does not depend on how steps group into frames: the same
>   seed gives the same bytes across page loads (480 steps, with respawns), and undo by replay gives
>   the same bytes as never editing (192 steps).
> - **Silk is sheets, not a filled volume** — a finding, not the plan. 262,144 ribbons × 32 filling
>   the ball run at 60 fps (GPU 5.5 ms p50) but read as exactly the fog the verdict above drops, at
>   any count tried (16k–262k). Instead Silk seeds its particles on two surfaces {f₂ = ±0.08}: a
>   particle can only slide along its sheet (v·∇f₂ = 0), so each sheet holds together as one
>   folding cloth that parts and closes around the sphere — confinement made visible. A strand's
>   colour is its sheet. Measured as the gate measures: ‖f(x) − anchors‖ recomputed in f64 at 1,024
>   live particles' f32 positions, worst 7.2 × 10⁻⁶ (the gate's budget is 1.33 × 10⁻⁴); Learn
>   shows it live. A particle starts on its sheet by Newton steps along ∇f₂ from a random point of
>   the ball (8 tries of 12 steps, accepted within 10⁻⁵); where a sheet barely enters the ball a
>   restart can miss, and a miss is never published — the particle waits a step, undrawn, anchored to
>   its true values (PR #67 review). Measured at swirls of 1.2 with one octave: 409 of 32,768 seeds
>   wait at seeding, none after 60 steps; every particle's anchors within 1.0 × 10⁻⁵ of its surfaces
>   in f64. A change to f₂ (Swirl size, Detail, Evolution) re-seeds the sheets; moving the sphere
>   does not (it only enters f₁). While the field evolves, each particle is nudged back onto
>   its moving sheet (display only, said in Learn).
> - **The hero field is not the gate's.** The Studio runs the gated sphere with smoother noise —
>   two octaves, swirls of 0.7 — because three octaves at 0.5 crumple the sheets into a sponge.
>   The foundation asks for exactly this split (gate scene small and separate from the hero
>   scene). Prove and Learn say so on screen; Tune's "The gated field" switches to the gate's own
>   parameters (the HUD then reads "the gated field").
> - **The identities, on the field on screen** (Prove; v1's `instruments.wgsl` verbatim, 1,024
>   volume and 256 surface probes; illustrative, CI gates them in f64): max |∇·v| from the Jacobian's
>   trace 3.8 × 10⁻⁶ = 3.0 × 10⁻⁸ of the largest |∇×v|; v·∇f₁ 3.2 × 10⁻⁷, v·∇f₂ 2.2 × 10⁻⁷, (f₁∇f₂)·v
>   7.0 × 10⁻⁸ at speeds up to 4.6; |v·n| on the sphere 1.1 × 10⁻⁷ (3.9 × 10⁻⁸ of the surface speed),
>   also after dragging it; kinetic helicity up to 112 — the honest nonzero control. The HUD shows
>   the divergence live, once a second.
> - **Sizes and frame rate**, headless Chromium at 1280×720 (60 Hz), `?bench=1`, Silk:
>
>   | Tier | Ribbons × points | fps | GPU p50 / p90 | Silk pass | Sim |
>   |---|---|---|---|---|---|
>   | T3 | 32,768 × 96 | 60 | 7.9 / 8.0 ms | 6.9 ms | 0.45–0.57 ms |
>   | T2 | 16,384 × 64 | 60 | 3.2 / 3.2 ms | 2.3 ms | 0.29 ms |
>   | T1 | 8,192 × 48 | 60 | 1.7 / 1.7 ms | 0.9 ms | 0.25 ms |
>
>   Silk is fill-bound (sheets stack many ribbons on few pixels): the same T3 page measured
>   2.4–4.3 ms of Silk on other views. Ribbon memory at T3 is 50 MB (the risk below estimated 128 MB
>   for 250k × 32). Headed browsers and Firefox not measured yet.
> - **On a software adapter** (Playwright's Chromium on SwiftShader, which software adapters start
>   at T1): the gate path is unaffected — ready at 2.5 s, the capture in 8–13 s, v1 and v2 give the
>   same bytes (sha256 `8db02026…`, run twice identical; not RADV's bytes, and no cross-device claim
>   is made). The live view is a slideshow there: Silk costs ~6 µs a segment on the CPU rasteriser,
>   ~2 s a frame at T1 (8,192 × 48), 0.37 s at 2,048 × 32, while the sim takes 21 ms. A cheaper
>   software look (Dust's points, M1) is the fix, not a smaller Silk.
> - **The volume mode** (`?sh=none`, the start of Dust) fills the ball evenly and keeps it even: a
>   particle that leaves re-enters where the flow comes in, drawn in proportion to the inflow
>   (the outflow and inflow through the ball's surface are exactly equal, ∮ v·n dA = 0), with a
>   random age. Counted in eight equal-volume shells, every shell is within 3.1% of its share of the
>   free volume (32,768 particles, 962 steps); with 8 rejection draws instead of 64 the boundary
>   starved (0.63 at the edge, 1.20 at the centre).
> - **What differs from the plan above.** Silk is its own ribbon pass (`src/v2/render/silk.wgsl`), not
>   F3 `Ribbons`: it needs strands that break where a particle restarts, a life envelope, width by
>   speed (a tube of flow narrows as it speeds up) and Kajiya–Kay thread shading — a candidate to
>   fold back into `Ribbons` once a second sim needs them. The obstacle is matte ceramic, not glass.
>   Tools: Move (drag the sphere; one drag is one undoable edit, on the link) and Camera. Tune holds
>   the four sliders plus "The scene's field" and "The gated field". Compare A/B is off (no second
>   picture yet).
> - **Checks.** `v2-acceptance.mjs` 35/35 (the capture bytes on both pages, ready before compile,
>   the tier's sizes, 120 steps/s, the Studio's field and sheets, the in-page gate, live ≡ gated, the
>   four identities and the helicity control, every Silk particle's anchors true in f64 and a missed
>   restart never published (also at swirls of 1.2, one octave), the sphere
>   through the GPU cull, drag to move / drag to orbit / undo, undo by replay ≡ never editing,
>   Evolution on the link, save / restore, the same seed across loads, a shared link, the volume
>   mode's even density, reduced motion, no console errors). `web/tools/check-studio.mjs` clean at
>   390, 820 and 1440 px and 200% zoom, no axe violations. `npm test` 272/272
>   (`test/flow-model.test.ts`: the live field uniform for the gate's field is byte-identical to the
>   gate's, among others).
> - **Not yet:** Paint the Stream and Dust's renderer (M1), shapes, Weather and Smoke from Noise
>   (M2), Loop Maker, Break the Certificate, posters and loops (M3), the landing card, the release
>   swap.
>
> **Implementation status (2026-11-18): M1 built** — Paint the Stream (2D, with the contour view)
> and Dust, on the same `v2/` page. The gate is untouched: `pipeline.py validate --sim curl-noise`
> passes on both pages, run twice, with every capture still byte-identical to v1 on main (positions
> sha256 `752e6e6e…`, iso residual 8.8% of budget).
>
> - **Dust is points on three sheets**, f₂ = −0.12, 0, +0.12 (F3 `Points` into a short long exposure,
>   `Accumulator` "ema", τ 0.14 s), not points filling the ball: filled, Dust reads as an even
>   opalescent fog at every count tried (262k–4M) and with colour cycling through f₂ — the honest
>   picture of an evenly filled incompressible volume, kept as a measurement mode (`?dsh=none`, the
>   even-density check). On sheets it reads as veils, a second look distinct from Silk's ribbons.
>   Dust takes 60 steps a second, each twice Silk's (the same flow speed for half the solver's cost;
>   its points need no 120 Hz ribbon rows). Every Dust point's anchors are its own surfaces in f64.
> - **Sizes and frame rate after M1** (RX 6800 XT, RADV, headless Chromium 156, 1280×720, 60 Hz,
>   `?bench=1&gov=off` — the render scale held at 100%; GPU per frame p50 / p90 from timestamps):
>
>   | Tier | Silk ribbons × points | GPU | Dust points | GPU | Paint map, particles | GPU |
>   |---|---|---|---|---|---|---|
>   | T3 | 32,768 × 96 | 7.2 / 8.0 ms | 1,048,576 | 4.7 / 14.1 ms | 1024², 131,072 | 1.1 / 1.2 ms |
>   | T2 | 16,384 × 64 | 2.1–3.2 / 3.3 ms | 262,144 | 4.3 / 4.5 ms | 512², 65,536 | 0.76 / 0.77 ms |
>   | T1 | 8,192 × 48 | 1.8 / 1.9 ms | 65,536 | 1.8 / 1.9 ms | 512², 32,768 | 0.59 / 0.60 ms |
>
>   Every cell held 60 fps. Dust's 2M and 4M also hold 60 fps (4M: 12.4 / 12.6 ms) — the spec's 4M
>   target — but a history checkpoint of 4M particles is 112 MB (six of them: 672 MB), and on sheets 1M
>   already looks the same; so T3 is declared at 1M.
> - **A software adapter gets its own profile**, keyed on the adapter, not the tier (phones are T1 with
>   real GPUs). Measured on SwiftShader (Playwright's Chromium; lavapipe as the only ICD falls back to
>   it), 1280×720: at T1 sizes Silk's ribbons cost ~6 µs a segment (0.3 fps at 8,192 × 48), Dust's
>   points ~7.6 µs each (0.8 fps at 65,536; 2.2 at 16,384) and the fixed passes (studio, bloom,
>   exposure, composite) ~100 ms a frame at full resolution. The profile — Dust at 4,096 points, half
>   the render scale, no bloom, at most two steps a frame (slow motion rather than a frozen view) —
>   runs **12.7 fps** there (GPU 61 / 70 ms; Silk at its software size 2.1 fps; Dust at 8,192 7.6 fps).
>   So the default look is Silk on hardware and Dust on a software adapter. SwiftShader's canvas is not
>   captured by Playwright screenshots (transparent) or `toBlob` (black); the HDR meter reads its scene
>   luminance (15.6 vs RADV's 11.6 with the same profile), so it does render.
> - **Paint the Stream** (`?s=paint`, or the scene picker). ψ lives on a periodic N × N grid (T3 1024²,
>   T2 and T1 512², software 256²) in cells² / s; v = (∂ψ/∂y, −∂ψ/∂x) from ψ's uniform cubic
>   B-spline — the same spline FieldView2D draws the map with, so the contour lines on screen are
>   exactly the particles' streamlines; equal steps of ψ between lines carry equal flow, so the flow
>   is fast where they crowd. The map is FieldView2D's material mode (hillshade from ψ's gradient,
>   valleys deep water, hills sand, isolines on), periodic, so the view never letterboxes (it never
>   zooms out past one copy). Particles (T3 131,072, T2 65,536, T1 32,768, software 4,096) take RK4
>   steps, then one Newton step back onto their contour, restart by age at a hashed point; drawn as
>   soft splats into a long exposure, their light normalised by particles per screen pixel and by
>   splat area so the contour lines stay readable under them at every viewport. Tools: Paint (Raise,
>   Lower, Smooth; brush size; the contour toggle, also `C`) and Pan. A stroke is one undoable edit;
>   a new landscape (Tune) is too, and rides the link's `seed`.
> - **Paint the Stream's guarantee, measured** (Prove, illustrative; Learn shows the last two live):
>   the divergence, ∂(∂ψ/∂y)/∂x − ∂(∂ψ/∂x)/∂y summed in two orders, is 4.5 × 10⁻⁸ of the sixteen terms
>   it sums — f32 rounding (against the velocity's own gradient it looked like 2 × 10⁻⁴: ψ is large,
>   its slope is not, so the honest yardstick is the terms); v·∇ψ is exactly 0; particles sit 2.5 × 10⁻⁶
>   of a contour spacing off their line (ψ recomputed in f64 at their f32 positions); and counted in 8 × 8
>   patches they spread ±2.3% against a random scatter's ±2.2% — "flow along contours can never pile
>   up". 2D undo by replay gives the same bytes as never painting (ψ and particles), and the same seed
>   the same bytes across page loads.
> - **Paint the Stream on a software adapter** (SwiftShader, its profile: a 256² map, 4,096 particles,
>   half the render scale): 17–21 fps; the splat pass (31 ms) dominates, ~7.5 µs a particle.
> - **Checks.** `v2-acceptance.mjs` 56/56 (M0's 35 plus Dust, the software profile and Paint the
>   Stream); `web/tools/check-studio.mjs` 0 problems and 0 axe violations at 390, 820 and 1440 px and
>   200% zoom for both `v2/` and `v2/?s=paint`; `npm test` 287/287 (`test/paint-model.test.ts` new).
> - **Measuring note.** Parallel sessions share this GPU; while another ran browser work it sat at
>   99% busy and this page measured 60 fps on one load and 2 on the next (and the governor stepped the
>   render scale down). The table above was taken in idle windows, each run's 60 fps confirmed.

## Verdict on the prototype

- **Keep:** the exact-incompressibility story and its instruments (divergence from the
  analytic Jacobian trace at the f32 floor; confinement v·∇fᵢ ≡ 0; Clebsch ψ·v ≡ 0; obstacle
  tangency v·n = 0), the integer-hash noise fix (float `mod289` broke f32↔f64 agreement),
  the chaos-immune iso-residual gate, *Break the Certificate* as a negative control, and the
  honest line "this looks like fluid without being fluid".
- **Drop:** fourteen scene chips, eleven sliders in Play, and the PROVE wall covering a
  quarter of the canvas in Play mode; trails that read as fog rather than structure.
- **Lesson:** curl noise is a *tool for making beautiful motion with a guarantee*. The
  product should be an instrument for sculpting flow, and the guarantee should be something
  the visitor can see.

## The experience

**Pitch:** *Sculpt luminous flow around shapes you place — incompressible by construction.*

**First ten seconds (3D):** silk-like ribbons stream around a glass sphere in a dark studio,
parting and closing without ever bunching or thinning — the flow folds into eddies behind
the sphere and drifts on. It looks like an art piece because it is one.

**Signature moment (2D) — Paint the Stream:** a flat canvas where the visitor paints a
*height map* (the stream function ψ). Particles immediately flow along its contour lines:
around hills, around valleys, faster where contours crowd. A toggle shows the contour
lines under the particles. One sentence lands the idea: "Flow along contours can never pile
up — that is what incompressible means."

### Scenes

| Scene | Dim | Prompt |
|---|---|---|
| **Studio** (default) | 3D | "Place shapes. The flow goes around them." |
| **Paint the Stream** | 2D | "Paint hills and valleys; the flow follows the contours." |
| **Weather** | 2D | layered noise + a painted jet stream | "Steer the jet; storms curl off it." |
| **Smoke from Noise** | 3D | emitter + rising potential (Bridson's plume trick) | "Fake smoke that never compresses." |
| **Loop Maker** | 3D | seamless looping time noise; export a perfect loop | "Make a loop. Download it." |
| **Break the Certificate** | 3D | add a divergent term; watch particles clump and the certificate fail | "What a compressible flow looks like." |

### Tools

*Place shape* (sphere, capsule, torus, box, text glyph — SDF primitives), *Move/scale*,
*Paint ψ* (2D: raise/lower/smooth), *Emitter*, *Wind* (large-scale potential direction),
*Camera*. Tune: *Swirl size*, *Detail*, *Speed*, *Evolution* — four sliders, no more.

### Learn

- Why curl: v = ∇×ψ has zero divergence for any ψ; around obstacles ψ is ramped to zero
  so v becomes tangent (Bridson 2007); time evolution by rotating gradient noise (flow
  noise) instead of scrolling, to avoid "boiling".
- Instruments: live max |∇·v| (analytic, f32 floor), particle-density uniformity (a
  histogram that stays flat), tangency at obstacles.

## The model

- Potential: sum of octaves of gradient noise per component (3D) or a scalar ψ (2D),
  integer-hash lattice (the shipped fix), analytic derivatives for v and the Jacobian.
- Variant: ∇f₁ × ∇f₂ (divergence-free noise from two scalar fields — the shipped default,
  with its exact confinement identity) and classic ∇×(ψ₁,ψ₂,ψ₃) as a selectable model.
- Obstacles: union of SDF primitives; ψ multiplied by a smooth ramp of the distance;
  derivatives by chain rule (analytic, no finite differences).
- 2D Paint: ψ on a 1024² texture edited by brushes, plus optional noise octaves; v from
  bicubic-interpolated ψ derivatives (exactly divergence-free for the interpolant).
- Particles: RK4 advection; respawn on age or exit with a seeded hash; Newton reprojection
  onto iso-surfaces kept as the gated option.
- Loop Maker: time as a point on a circle in a 4D noise domain → exact period.

## The look

- Art direction: **studio light on silk**. Dark warm-grey studio backdrop with a soft
  floor; obstacles as glass/ceramic (refractive or matte) with soft shadows; particles as
  ribbons (width by speed, colour by a curated palette — *Silk*, *Aurora*, *Ink in Milk*).
- Two render modes: *Silk* (ribbons, 32-sample history, up to 250k) and *Dust* (points
  with float accumulation, up to 4M).
- 2D Paint: ψ as a soft topographic map (hillshade + optional contour lines) under the
  particles.
- Export: 4K still, seamless loop (WebM), and a "poster" camera.

## The proof

- Keep the `new_canonical` gate (chaos-immune f64-recomputed iso-residual at the browser's
  positions, committed IC, live machine-exact goldens, run-twice) and port the gated
  kernels exactly; keep the `[defaults.curl-noise]` budget.
- Keep the exact identities as Prove cards (divergence, confinement, Clebsch, tangency).
- New for 2D Paint: divergence of the bicubic-derived field is zero analytically — check
  at random points at the f32 floor.
- *Break the Certificate* stays the negative control and is labelled as such.

## Performance targets

| Tier | Silk ribbons | Dust points | Target |
|---|---|---|---|
| T3 | 250k × 32 | 4M | 60 fps |
| T2 | 80k × 24 | 1M | 60 fps |
| T1 | 20k × 16 | 250k | 60 fps |

## Risks and open questions

- Ribbon history memory (250k × 32 × 16 B ≈ 128 MB) — measure; fall back to fewer samples.
- Glass obstacles need a refraction pass; a matte ceramic default keeps M0 simple.
- Paint the Stream must make "contours = streamlines" obvious within seconds; test with
  people who don't know the term.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Studio scene (sphere, Silk) in the shell with the gate ported |
| M1 | Paint the Stream (2D) with contour view; Dust mode |
| M2 | Shape tools (SDF primitives), Weather, Smoke from Noise |
| M3 | Loop Maker + export, Break the Certificate, posters/loops |

## References

- Bridson, Hourihan & Nordenstam 2007, *Curl-noise for procedural fluid flow*, ACM TOG 26(3), article 46 ([dblp](https://dblp.uni-trier.de/rec/journals/tog/BridsonHN07.html))
- Perlin & Neyret 2001, *Flow noise*, SIGGRAPH technical sketch
- DeWolf 2005, *Divergence-free noise* (the ∇f₁ × ∇f₂ construction)
- Existing reference spec and the integer-hash / helicity corrections — [docs/sim-specs](../../sim-specs/README.md)
