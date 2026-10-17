# 05 — Chaos (Lorenz and the strange-attractor family)

> Part of [Rebuild v2](README.md). Replaces `packages/strange-attractors/web`. Wave B.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

## Verdict on the prototype

- **Keep:** nine systems behind one registry (Lorenz, Rössler, Thomas, Aizawa, Halvorsen and
  the rest of the chartered family), RK4 with a live f64 reference gate, the ρ landmarks
  (pitchfork 1, homoclinic 13.93, crisis 24.06, Hopf 24.74, window 99.65), the
  "butterfly ghost" (+10⁻⁶ twin), HDR additive ribbons with GPU exposure.
- **Drop:** a single trajectory as the whole show; landmark chips nobody understands
  without the spec; a letterboxed canvas; display controls (vignette, trail) at the same
  level as the physics.
- **Lesson:** a Lorenz butterfly is a screensaver unless the visitor *feels* chaos: one
  point becoming a smear, precision buying only a fixed amount of future.

## The experience

**Pitch:** *Release a million butterflies from one point and watch certainty dissolve.*

**First ten seconds:** the Lorenz attractor drawn as a luminous long-exposure density, slowly
orbiting. Then a bright dot appears: a million initial conditions packed into a ball
10⁻⁶ wide. For a few seconds it moves as one point. Then it stretches into a thread, folds,
and within about twenty seconds of model time it has spread over the whole attractor.
A clock in the corner reads *predictability lost at t = 18.3*.

**Signature moment — Buy More Digits:** a control *precision: 6 digits*. Each extra digit
(ε ÷ 10) delays the loss of predictability by a fixed ~2.5 time units (ln 10 / λ₁ for
Lorenz), and the plot of horizon vs digits draws a straight line as you click. The visitor
discovers the Lyapunov exponent by experiment.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **The Butterfly** (default) | Lorenz density + ensemble release | "A million starts, one point. Watch." |
| **Buy More Digits** | horizon vs precision plot | "How much future does one more digit buy?" |
| **Road to Chaos** | live bifurcation diagram (Rössler period doubling; Lorenz vs ρ) drawn by thousands of parallel trajectories | "Click anywhere on the diagram to go there." |
| **Lorenz's Map** | successive z-maxima map (Lorenz 1963's cusp) | "The chaos fits on a single curve." |
| **Slice** | Poincaré section plane you drag through the attractor | "Cut the attractor and see its layers." |
| **Listen** | x → pitch, z → brightness, lobe switches as clicks | "Hear when it switches wings." |
| **The Family** | gallery of the nine systems, each with its own palette | "Same idea, different shapes." |

### Tools

*Release* (click on/near the attractor to drop an ensemble ball there; scroll sets ε),
*Ghost* (twin trajectory at a chosen offset), *Slice plane*, *Camera* (orbit; follow a
particle).

### Learn

- Callouts: "stretching", "folding", "wing switch", "the cloud has forgotten where it came
  from".
- Instruments: λ₁ (running estimate with confidence band), Lyapunov spectrum and
  Kaplan–Yorke dimension, ensemble spread vs time (log scale), horizon vs ε.
- A short note on why simulations of chaos are still trustworthy: shadowing, and Tucker's
  computer-assisted proof that the Lorenz attractor exists.

## The model

- ODEs per system from the existing registry; RK4 with fixed Δt per system (the gated
  integrator). Ensemble: 1M (T3) / 250k (T2) / 64k (T1) particles, one thread each.
- **Lyapunov spectrum:** Benettin's algorithm with three tangent vectors per tracked
  trajectory (a few hundred trajectories), RK4-integrated variational equations,
  Gram–Schmidt every k steps; λᵢ averaged on GPU with a subgroup/shared-memory reduction.
- **Bifurcation diagram:** 2,048 parameter columns × 32 trajectories, transient discarded,
  then local maxima of a coordinate accumulated into a 2048×1024 histogram texture.
- **Density render:** each particle splats into a float accumulation buffer each frame;
  the long-exposure image is an exponential moving average (τ adjustable).
- **Horizon:** ensemble spread (RMS distance to centroid) crosses a fraction of the
  attractor diameter → record t; repeat for ε = 10⁻³ … 10⁻¹² (f32 limits: below ~10⁻⁷
  relative, use an f64-emulated (double-float) ensemble for the finest digits, labelled).
- **Listen:** WebAudio oscillator driven from a CPU-side f64 trajectory (cheap), not GPU
  readback.

## The look

- Art direction: **long-exposure astrophotography**. Density in HDR with AgX tone mapping
  and measured exposure; a per-system palette (Lorenz: magnesium white to cobalt; Rössler:
  amber; Thomas: verdigris); a faint starfield-free dark background with subtle gradient.
- Ensemble particles as tiny bright points with velocity stretch; colour by initial
  position within the ball so the stretch-and-fold is visible as colour bands.
- Single trajectories as thin ribbons with depth fade; slow director orbit (off under
  reduced motion).

## The proof

- Keep the `new_canonical` gate (live f64 reference re-run over the gated horizon); port
  the gated RK4 kernel exactly.
- **Lyapunov check (new):** λ₁ for classic Lorenz (σ=10, ρ=28, β=8/3) within a declared band
  of the literature value ≈ 0.906; λ₂ ≈ 0; spectrum sum = −(σ+1+β) (trace of the Jacobian,
  exact) — the sum check is analytic and tight.
- **Invariant measure (new):** the GPU ensemble's long-run histogram vs a CPU f64 long run,
  distance within budget — distribution-level, so immune to pointwise divergence.
- Copy states plainly that individual trajectories diverge from any reference by design;
  the gate checks the short horizon and the distributions, which is what can be checked.

## Performance targets

| Tier | Ensemble | Bifurcation | Target |
|---|---|---|---|
| T3 | 1M, 8 RK4 steps/frame | 2048 × 32 | 60 fps |
| T2 | 250k | 1024 × 16 | 60 fps |
| T1 | 64k | 512 × 8 | 60 fps |

## Risks and open questions

- f32 RK4 ensemble at ε near f32 resolution collapses to identical trajectories — use the
  double-float path or cap the slider at what f32 resolves, and say so.
- Bifurcation diagram transients: per-column warm-up must be long enough near bifurcation
  points; show the diagram filling in progressively rather than waiting.
- Audio must start only on a user gesture and default to off.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Lorenz density + ensemble release in the shell (F3 camera); gate ported |
| M1 | Buy More Digits with horizon plot; Lyapunov instruments + checks in Prove |
| M2 | Road to Chaos, Lorenz's Map, Slice |
| M3 | Listen, The Family, posters/loops |

## References

- Lorenz 1963, *Deterministic nonperiodic flow*, J. Atmos. Sci. 20
- Benettin et al. 1980, *Lyapunov characteristic exponents for smooth dynamical systems*, Meccanica 15
- Tucker 2002, *A rigorous ODE solver and Smale's 14th problem*, Found. Comput. Math. 2
- Sprott, *Chaos and Time-Series Analysis* (2003) — reference Lyapunov values for the classic systems
- Fireflies: GPU ensembles of ODE trajectories (prior art for swarms of trajectories) — [arXiv:1505.00344](https://arxiv.org/abs/1505.00344)
- Existing feature-expansion spec — [feature-expansion-spec.md](../../../packages/strange-attractors/web/feature-expansion-spec.md)
