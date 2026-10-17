# 06 — Flow Sculpture (curl noise)

> Part of [Rebuild v2](README.md). Replaces `packages/curl-noise/web`. Wave B.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

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

- Bridson, Houriham & Nordenstam 2007, *Curl-noise for procedural fluid flow*, ACM TOG 26(3)
- Perlin & Neyret 2001, *Flow noise*, SIGGRAPH technical sketch
- DeWolf 2005, *Divergence-free noise* (the ∇f₁ × ∇f₂ construction)
- Existing reference spec and the integer-hash / helicity corrections — [docs/sim-specs](../../sim-specs/README.md)
