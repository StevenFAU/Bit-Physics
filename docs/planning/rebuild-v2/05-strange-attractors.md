# 05 — Chaos (Lorenz and the strange-attractor family)

> Part of [Rebuild v2](README.md). Replaces `packages/strange-attractors/web`. Wave B.
> Status: planning, v0.1, 2026-10-17; M0 built 2026-11-04, M1 built 2026-11-13, M2 built 2026-11-18 (below). Elsewhere, targets are unmeasured.
>
> **Implementation status (2026-11-18): M2 built** — Road to Chaos, Lorenz's Map and Slice, each
> with a Prove card. Measured on the RX 6800 XT (snap Chromium 156, RADV) at T3. T1's sizes ran in
> check-studio's phone-width view; T2's are declared in code and not measured here. The gate
> kernel, its capture path and both pages' captures are unchanged: `pipeline.py validate --sim
> strange-attractors` passes on both pages, run twice, and the captures still hash `dd645f26…`.
>
> - **Road to Chaos** (`src/v2/model/bifurcation.wgsl`, scene `?s=road`): 2,048 columns of ρ × 32
>   trajectories (T2 1,024 × 16, T1 512 × 8), each column at its own ρ, all stepped by RK4 at
>   Δt 0.01. After 60 time units to settle, every maximum of z (the vertex of a parabola through
>   the three samples around it) is counted into one of 1,024 bins of z / ρ over [0.9, 1.75),
>   with a total per column, so each column is drawn as its own distribution on a log scale.
>   240 steps a frame at T3 (160 at T2, 80 at T1); the pass costs 0.61 ms a frame. After 492 time
>   units: 86.0 million peaks, every column filled; a chaotic column (ρ 28, ρ 60) occupies 725 and
>   706 of the 1,024 bins, a window's (ρ 150, ρ 230) 8 and 6. The diagram shows the chaotic band,
>   the windows near ρ 100 and 145–166, and the periodic orbit above ρ ≈ 214. Ranges ρ 20–250,
>   99–101.5 (the period doublings into the window near 100) and 140–240 ride the link (`rr`); a
>   click on the diagram sets ρ there (an undoable edit on the link), and a "Go to ρ" slider does
>   the same from the keyboard. **Not built:** the plan's Rössler period doubling. Rössler has no v2
>   model yet; it comes with The Family (M3).
> - **Lorenz's Map** (`?s=map`): the attractor's 524,288 points run `density_observe` (in
>   `src/v2/model/ensemble.wgsl`: the same `rk4` as the live density kernel, plus peak detection),
>   and each pair of successive z peaks lands in a 256 × 256 histogram over a box from a short f64
>   run (z ∈ [29.56, 47.86) at ρ 28, a 15% margin). 4.56 million pairs in 3 s, on 761 of the 65,536
>   cells: Lorenz's cusp. A cobweb of one f64 trajectory hops along it. A unit test checks the
>   copy's claim that the map is steeper than the diagonal on both branches.
> - **Slice** (`?s=slice`): the same points' upward crossings of z = h, interpolated within the
>   step, in a 256 × 256 x–y histogram; the plane is drawn in 3D, lit by its own crossings. The
>   Slice tool drags the cut up and down (it turns nothing and releases nothing); "Cut at height"
>   does the same from the keyboard; the cut stays within 0.15ρ … 1.75ρ. The histogram's box is the
>   attractor's whole x–y footprint, symmetric under (x, y) → (−x, −y), with an 8% margin. It holds
>   the cut at every height, including a periodic window's mirror orbit, and the axes stay put as
>   the cut moves. At z = ρ − 1: 3.36 million crossings in 2 s on 287 cells, two thin
>   lines. **Changed from the plan:** its prompt was "see its
>   layers", but the layers cannot be drawn. Each turn round a wing squeezes them by
>   e^(λ₃ × 0.75) ≈ 2 × 10⁻⁵, far below a bin. The prompt now reads "see how thin it is", and the
>   panel and Learn say why the layers don't show.
> - **Prove: three cards, labelled "reference agreement passed (not gated)".** Each compares the
>   GPU picture (f32) with the same picture made in f64, as distributions (total variation, TV),
>   next to two f64 pictures from different starts (the floor). Code: `src/v2/proof/m2-proofs.ts`.
>   - *Road*: six columns × 32 trajectories, 200 time units of peaks, from the same starts in f64.
>     Chaotic columns use 64 bins: ρ 28 0.0263 (floor 0.0291), ρ 60 0.0320 (0.0312), ρ 120 0.0161
>     (0.0110). Windows use the diagram's 1,024 bins, where a small change of ρ shows: ρ 100.5
>     0.0020 (0.0009), ρ 150 0.0010 (0.0038), ρ 230 0.0004 (0.0011). An f64 window column at a
>     slightly wrong ρ is 0.31 / 0.29 / 0.19 away (100.55, 150.1, 230.2). The chaotic columns are a
>     sanity check only: ρ 60.5 or 61 against 60 is just 0.056 / 0.049.
>   - *Map*: 262,144 GPU points for 20 time units (6.7 million pairs) against one f64 run of
>     40,000 time units (53,267 pairs), 32 × 32 bins: 0.0131, floor 0.0160. ρ 28.1 / 28.25 against
>     28: 0.19 / 0.44.
>   - *Section*: 7.0 million GPU crossings against 106,513 f64 ones (80,000 time units), on the
>     footprint box: 0.0072, floor 0.0074. ρ 28.1 / 28.25 / 28.5: 0.026 / 0.056 / 0.112.
>   - Budgets, measured then declared in `tolerance.toml` (same section as M1) and
>     `src/v2/proof/budgets.ts`, held equal by a unit test: chaos ≤ 0.06, windows ≤ 0.01,
>     map ≤ 0.045, section ≤ 0.016. Measured at 53%, 20%, 29% and 45% of them. These are Prove
>     cards only. The capture gate is still the only release gate.
> - **Fixed while measuring:** some GPUs flush denormals to zero, which broke a counter stored as
>   bitcast bits (`hist.z` is now an f32 count). A motion that settles on a fixed point (ρ 15, say)
>   has damped peaks but no attractor, so the map and section now report "no peaks" instead of
>   boxing a transient. The map's box margin went from 3% to 15% after the first measurement
>   clipped the cusp.
> - **Review of PR #68:** links and Tune now reach ρ 250, the diagram's own range (a link at ρ 230
>   used to reopen at 28). The diagram restarts whenever σ or β differ from those its trajectories
>   started with, so an undo or a restore can't mix two systems. The section box was first built from
>   the z = ρ − 1 crossings alone, which lost the cut at other heights: 0.9% at z = 40, 3.8% at 43,
>   7.5% at 45. A box from each height's own crossings fails too, because a short run sees almost
>   none near the extremes. Hence the footprint box. The section card was re-measured on it
>   (first 0.0070, floor 0.0073); its budget is unchanged.
> - **Frame rate** (headless, 1280 × 720, T3, on an idle GPU): Road to Chaos 60 fps (GPU 3.7 ms a
>   frame), Lorenz's Map 60 (3.1 ms), Slice 60 (2.9 ms). Four acceptance runs made while other
>   sessions' browsers (one on SwiftShader at ~870% CPU) and an MPM spike shared this machine
>   missed 60 in one scene or another: Slice 2, Road 43 / 8 / 6, Map 38. Replaying Road's and Slice's
>   steps alone held 60 fps throughout, with two or three other GPU processes at 30–86% busy.
> - **Checks.** `v2-acceptance.mjs` 92/92 on the idle GPU (M0's 36, M1's 20, M2's 36).
>   `web/tools/check-studio.mjs` is clean for `v2/`, `v2/?s=digits`, `v2/?s=road`, `v2/?s=map`
>   and `v2/?s=slice` at 390, 820 and 1440 px and 200% zoom, with no axe violations. At 200% zoom
>   Road to Chaos's panel first ran 3 px into the bottom rail; the figures now shrink with the
>   window's height there. `npm test` 291/291; `check_registry.py` OK; integrity 0 HARD_FAIL.
> - **Not yet:** Listen, The Family (with Rössler's road to chaos), posters and loops (M3); the
>   landing card and the release swap.
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
> - **Undo and restore keep the record straight** (review of PR #66): a checkpoint carries the ball's
>   precision and horizon, so undoing a purchase brings back the three-digit ball and files later
>   horizons under the right digits; a restore that brings back other σ, ρ, β restarts the live λ
>   estimate; undo's replay reads the spread as it goes, so a horizon crossed during it is found.
> - **Frame rate.** Headed, 1440 × 900, at 1×/4×/8× in both scenes, the sim at full speed
>   (240 / 960 / 1,920 steps/s), on a quiet machine: Firefox 158 164–165 frames/s, Chromium 156
>   161–165 (the 165 Hz display), GPU 2.0–3.6 ms per frame. Under load (another session's PyTorch job
>   on ~3 cores, load average 6) both fell to 117–143, with the browsers' own animation-frame
>   callbacks below the display rate too.
> - **Checks.** `v2-acceptance.mjs` 56/56 (M0's 36 and M1's 20). `web/tools/check-studio.mjs` clean
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
