# 05 — Chaos (Lorenz and the strange-attractor family)

> Part of [Rebuild v2](README.md). Replaces `packages/strange-attractors/web`. Wave B.
> Status: planning, v0.1, 2026-10-17; M0 built 2026-11-04, M1 built 2026-11-13 (below). Elsewhere, targets are unmeasured.
>
> **Implementation status (2026-11-13): M1 built** — Buy More Digits, the Lyapunov instruments
> and their Prove checks, and the invariant-measure check (not deferred). Measured on the RX 6800 XT
> (snap Chromium 156, RADV); every f64 number below is the same in Node and in the browser to the
> printed digits. The gate kernel, its capture path and both pages' captures are unchanged:
> `pipeline.py validate --sim strange-attractors` passes on both pages, run twice, and all four
> captures still hash `dd645f26…`.
>
> - **Buy More Digits** (`src/v2/digits-panel.ts`, scene `?s=digits`, 4× speed): every "Buy a
>   digit" releases a ball ten times narrower from the same point, and its horizon joins a plot of
>   horizon against digits with a least-squares line and the slope ln 10 / λ₁ from the live f64
>   estimate; "Measure 3–15" runs all thirteen off the frame loop. Measured from the scene's point:
>   3–15 digits → t = 8.52, 11.56, 13.16, 16.12, 19.07, 20.72, 23.01, 23.24, 29.52, 31.07, 34.72,
>   37.01, 37.25: 2.50 time units per digit, so λ₁ ≈ ln 10 / 2.50 = 0.923, against Benettin's 0.906
>   (ln 10 / λ₁ = 2.54). One path's points scatter about the line (each digit's growth happens at a
>   different stretch of the trajectory), which is why the line, not any one step, is the measure.
>   The scene stops at 15 digits: offsets keep f32's relative precision far below that, but the
>   spread's squares would approach f32's smallest normal numbers near 10⁻¹⁹, and 15 is about where
>   double precision itself ends.
> - **The horizon is now sampled every 0.1 time units of model time, on the GPU**, whatever the speed
>   or frame rate: a frame's ensemble dispatch is split at every 10th step since release and a
>   reduction writes that moment's spread into a ring read back in batches (`src/v2/model/ensemble.ts`).
>   Found while building the plot: the spread is not monotonic while the ball folds (it rose to 5.9,
>   fell to 4.0, then crossed the 7.37 threshold), so M0's once-every-few-frames sampling found a
>   later crossing at 4× (t 9.96 for the 10⁻³ ball, where 0.1-unit sampling finds 8.52). The live
>   horizon and the off-loop measurement now agree (8.516 and 8.516). Also fixed: a spread readback
>   still in flight when a new ball was released could set the new ball's horizon from the old one;
>   samples now carry their ball and stale ones are dropped.
> - **Lyapunov spectrum, f64** (`src/v2/model/lyapunov.ts`): Benettin's method, three tangent vectors
>   integrated by RK4 at the state's own stage points, modified Gram–Schmidt every 10 steps. Prove's
>   run (from (1, 1, 1), 4,000 time units after a 20-unit transient, 51 ms in the browser):
>   λ = (0.90816, −0.00041, −14.57431), Kaplan–Yorke dimension 2.0623. An 80,000-unit run gives
>   (0.90570, −0.00001, −14.57226) against Sprott's (0.9056, 0, −14.5723), D_KY 2.0621. Over 20
>   independent 4,000-unit blocks λ₁ has sd 0.0015 (worst 0.0039 from 0.9056) and λ₂ sd 0.0003
>   (worst 0.0005). The plan's GPU averaging over hundreds of trajectories was not needed: 1,000 time
>   units cost ~15 ms in JS.
> - **The spectrum sums to the trace.** Lorenz's Jacobian trace is −(σ + 1 + β) = −41/3 at every
>   point, so λ₁ + λ₂ + λ₃ = −41/3 exactly for the flow. Measured: 7.49 × 10⁻⁶ relative (46 runs:
>   7.42–7.52 × 10⁻⁶), and the leftover is RK4's own volume error: 1.30 × 10⁻⁴, 7.50 × 10⁻⁶,
>   4.50 × 10⁻⁷ at Δt 0.02, 0.01, 0.005 (Δt⁴).
> - **Invariant measure** (`src/v2/model/measure.ts`, the Prove card "The forgotten cloud…"): 262,144
>   members released 10⁻⁶ wide on the GPU, run to t = 40, binned on (x, z) 32 × 32 at eight moments
>   2.5 apart, against one f64 run of 10⁶ samples 0.1 apart: total variation 0.0113. Two independent
>   f64 runs of that length differ by 0.0103 (the comparison's floor); t 60 / 100 / 16 snapshots give
>   0.0089 / 0.0094 / 0.0088; an f64 run at ρ 28.25 or 28.5 is 0.024 / 0.041 from ρ 28.
> - **Budgets, measured then declared** in `tools/testkit/equivalence/tolerance.toml`
>   `[golden_tolerance.closed-form.strange-attractors-lyapunov]` and `src/v2/proof/budgets.ts` (a unit
>   test holds them equal): |λ₁ − 0.9056| ≤ 0.008, |λ₂| ≤ 0.0015, the sum's relative residual
>   ≤ 1.5 × 10⁻⁵, total variation ≤ 0.02. Measured at 32%, 27%, 50% and 57% of them. These are Prove
>   cards, labelled "not gated": the capture gate is still the only release gate.
> - **Learn:** λ₁ measured as you watch (its own f64 trajectory, half a time unit per frame, a
>   ±2 SE band from 25-unit blocks), the spectrum, the sum against −(σ + 1 + β), the Kaplan–Yorke
>   dimension; restarted when σ, ρ, β change.
> - **Captions take turns:** the ball's four captions share one spot; a new one now waits until the
>   last has faded (650 ms) instead of crossfading over it. The acceptance run samples every
>   caption's opacity and never sees two at once.
> - **Frame rate.** Headed, 1440 × 900, at 1×/4×/8× in both scenes, the sim at full speed
>   (240 / 960 / 1,920 steps/s): Firefox 158 117–142 frames/s, Chromium 156 118–143, GPU 4–6 ms per
>   frame. Measured under load (another session's PyTorch job on ~3 cores, load average 6), where the
>   browsers' own animation-frame callbacks also fell below the 165 Hz display; M0's quiet-machine
>   figure was Firefox 164–165.
> - **Checks.** `v2-acceptance.mjs` 53/53 (M0's 36 and M1's 17). `web/tools/check-studio.mjs` clean
>   for `v2/` and `v2/?s=digits` at 390, 820 and 1440 px and 200% zoom, no axe violations.
>   `npm test` 271/271; integrity 0 HARD_FAIL.
> - **Not yet:** Road to Chaos, Lorenz's Map, Slice (M2); Listen, The Family, posters and loops (M3);
>   the landing card and the release swap.
>
> **Implementation status (2026-11-04): M0 built** as the `v2/` page of
> `packages/strange-attractors/web` (served at `/sims/strange-attractors/v2/`, gated through
> `pipeline.py` `PAGES`; v1 unchanged). The Butterfly: the Lorenz attractor as a long exposure, an
> ensemble released automatically and by clicking, the Ghost pair, the F3 orbit camera, Learn and
> Prove. F3, the shared 3D layer, landed with it in `web/render` (see 00-foundation.md). Measured
> on the RX 6800 XT (snap Chromium 156, RADV) unless a line says otherwise.
>
> - **The gate, ported verbatim** (`src/v2/proof/gate.ts`): the committed `src/lorenz_rk4.wgsl`,
>   v1's 48-byte parameter block, its own buffers, the same sampling and manifest. `pipeline.py
>   validate --sim strange-attractors` passes on both pages, run twice; all four captures (v1 and v2,
>   twice each) and two v1 captures taken on main before the change hash the same (sha256
>   `dd645f26…`). The page signals ready once the gate kernel is compiled (under 100 ms) and compiles the
>   renderer and the live kernels after (live under 200 ms).
> - **The ensemble is integrated as offsets, not positions** — this replaces the risk below
>   ("f32 … collapses to identical trajectories — use the double-float path"). Near |x| ≈ 20, f32
>   numbers are ~2 × 10⁻⁶ apart, so a 10⁻⁶ ball stored as positions sits on two or three values per
>   axis. Instead the ball's centre is integrated in f64 on the CPU and the GPU steps each member's
>   offset e with the centre's four RK4 stage points. Lorenz is quadratic, so
>   f(s + e) − f(s) = J(s)·e + Q(e) is written with no large terms cancelling, and RK4 on the offsets
>   is RK4 on the full positions (to f64 rounding — `test/chaos-model.test.ts`). Each offset keeps
>   f32's relative precision however small it is. Measured (Prove, "A 10⁻⁹ ball is resolved"):
>   a 10⁻⁹ ball run to t = 10 (it grows 2.5 × 10⁴-fold), 63 members against the same offsets in f64:
>   worst relative error 7.2 × 10⁻⁶, median 3.2 × 10⁻⁶. Not gated; shown as measured. No double-float
>   path is needed for M1's finest digits.
> - **Predictability, measured.** The horizon is the first time the ball's RMS spread (reduced on the
>   GPU from every member) reaches half the attractor's own RMS size (14.7 at Lorenz's values). A
>   10⁻⁶ ball released at the scene's point loses it at t = 16.1 (the "18.3" above was a placeholder).
>   From that one point: 10⁻³, 10⁻⁶, 10⁻⁹, 10⁻¹² → t = 8.52, 16.12, 23.01, 31.07, so each digit buys
>   2.53, 2.30, 2.69 time units (ln 10 / λ₁ ≈ 2.54). That is M1's "Buy More Digits" line, measured
>   ahead of its plot.
> - **The live kernels** (`src/v2/model/ensemble.wgsl`; no builtin sin/cos/exp). The attractor's
>   picture is a second population already on it, plain f32 RK4 whose `field` and `rk4` are the gated
>   kernel's character for character: one particle from the gate's start, 10,000 steps in 1,000-step
>   batches, gives the gated trajectory's states byte for byte (Prove, and the acceptance run). Each
>   frame it is splatted into a long exposure (τ 0.2 s, 0.04 s while the view is dragged), coloured
>   cobalt to magnesium white by speed along the attractor. The ball's members are coloured by where
>   they started along the direction the ball stretches most (top singular vector of the flow map
>   over 1.5 time units, f64), so its folds show as bands.
> - **Sizes and frame rate.** T3 1,048,576 ball members + 524,288 attractor points (T2 262,144 +
>   131,072; T1 65,536 + 65,536). GPU per frame 2.4–3.4 ms at 1×, 4× and 8× (8× is 32 steps a frame
>   at 60 fps). Submitted frames per second: headed Firefox 158 164–165 at 1×, 4× and 8× (the 165 Hz
>   display), sim at full speed; headed Chromium 156 100 (its X11 window's 100 Hz display); headless
>   Chromium 60. Three frames in flight with the empty-submit gate (web/README.md).
> - **What differs from the plan above.** ε is a *Precision* slider (digits, 2–12) and `[` `]`, not
>   the wheel, which dollies the camera. Tools: Release, Ghost, Camera (Slice plane comes with M2's
>   scene). Callouts: "a million starts, one point", "stretching", "folding", "the cloud has
>   forgotten where it came from", on the ball's centroid. Tune holds σ, ρ, β (each change an
>   undoable edit, replayed on undo) above the picture's own controls. The three fixed points are
>   small spheres (F3 Instances).
> - **Checks.** `v2-acceptance.mjs` 36/36 (the capture bytes on both pages, ready before compile, the
>   tier's sizes, 240 steps/s, the horizon window and its order over four precisions, the three Prove
>   checks, click to release and not off the attractor, Ghost, orbit / dolly / reset, precision by
>   key and link, ρ as an undoable edit on the link, save / restore / compare, the same seed giving
>   the same ball bytes across loads, the fixed points through the GPU cull, Environment's sky and
>   ground, reduced motion, no console errors). `web/tools/check-studio.mjs` clean at 390, 820 and
>   1440 px and 200% zoom, no axe violations, also on a software GPU (Playwright's Chromium,
>   SwiftShader). `npm test` 262/262.
> - **Not yet (at M0; M1 since built, above):** λ₁ and the spectrum checks, the invariant-measure check, the other scenes,
>   posters and loops, the landing card, the release swap.

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
