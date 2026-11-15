# 06 — Flow Sculpture (curl noise)

> Part of [Rebuild v2](README.md). Replaces `packages/curl-noise/web`. Wave B.
> Status: planning, v0.1, 2026-10-17; M0 built 2026-11-14 (below). Elsewhere, targets are unmeasured.
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
>   shows it live. A change to f₂ (Swirl size, Detail, Evolution) re-seeds the sheets; moving the
>   sphere does not (it only enters f₁). While the field evolves, each particle is nudged back onto
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
>   | T3 | 32,768 × 96 | 60 | 7.9 / 8.0 ms | 6.9 ms | 0.45 ms |
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
> - **Checks.** `v2-acceptance.mjs` 33/33 (the capture bytes on both pages, ready before compile,
>   the tier's sizes, 120 steps/s, the Studio's field and sheets, the in-page gate, live ≡ gated, the
>   four identities and the helicity control, every Silk particle on its sheet in f64, the sphere
>   through the GPU cull, drag to move / drag to orbit / undo, undo by replay ≡ never editing,
>   Evolution on the link, save / restore, the same seed across loads, a shared link, the volume
>   mode's even density, reduced motion, no console errors). `web/tools/check-studio.mjs` clean at
>   390, 820 and 1440 px and 200% zoom, no axe violations. `npm test` 272/272
>   (`test/flow-model.test.ts`: the live field uniform for the gate's field is byte-identical to the
>   gate's, among others).
> - **Not yet:** Paint the Stream and Dust's renderer (M1), shapes, Weather and Smoke from Noise
>   (M2), Loop Maker, Break the Certificate, posters and loops (M3), the landing card, the release
>   swap.

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
