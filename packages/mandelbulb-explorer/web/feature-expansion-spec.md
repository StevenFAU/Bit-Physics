# Spec — Mandelbulb Expansion (single-object demo → fractal explorer)

> **Sim:** `mandelbulb-explorer` (`closed-form`)
> **Surface:** primarily the display demo `packages/mandelbulb-explorer/web/`; § 3.3 (new fractal families) additionally *may* touch the Python package, `docs/sim-specs/`, `tools/testkit/golden/`, `captures/`, and `packages/mandelbulb-explorer/src/` **iff** the operator chooses the gated route (§ 9.1).
> **Lane:** Phase-6 — **mixed.** §§ 3.1/3.2/3.4/3.5/3.6 are Lane B (presentation, display-only). § 3.3 (new fractal families) is **operator-gated**: display-only "explorer" additions by default (Lane B), or full-discipline sub-sims that **cross the Lane-B boundary** if ratified (§ 9.1).
> **Extends:** [`verification-demo-spec.md`](./verification-demo-spec.md) (the INTERACT/EXPLAIN/PROVE/RENDER instrument this builds on).
> **Spec anchors:** `docs/architecture.md` § 1.2 (four identities), § 10.1 (web demos), § 2.5 (determinism), § 2.6 (measured-then-declared tolerances); `docs/sim-specs/closed-form/mandelbulb-explorer/spec-ref.md`.
> **Research basis:** deep web-research pass (2026-07-08) across four pillars — DE math & literature, fractal art/landscapes, real-time optimization, coloring & interaction. Primary sources: Íñigo Quílez (iquilezles.org — palettes, orbit traps, soft shadows, SDF repetition, mandelbulb), Mikael Hvidtfeldt Christensen (blog.hvidtfeldts.net — "Distance Estimated 3D Fractals" I–VII), Bálint & Valasek (Eurographics 2018, enhanced sphere tracing), Daniel White / Paul Nylander (Skytopia), Tom Lowe (Mandelbox), Knighty (KIFS), Mandelbulb3D. Confidence tags below reference that pass; honesty flags mark folklore that *no primary source survived verification for*.
> **Status:** v0.1 — DRAFT for operator review. Nothing built yet. FACT/INFERENCE-tagged per IC-9.
> v0.1 (2026-07-08): initial draft. Citation audit against the working tree (all `file:line` claims verified against the tree read on 2026-07-08). Change log in § 10.

---

## 1. Purpose

Grow the mandelbulb demo from a **single power-8 object that spins** into a
**fractal explorer**: more ways to *see* it (a real coloring engine — cosine
palettes, geometric orbit traps, glow/tonemap), more ways to *move through* it
(gentle, controllable, inertial camera; bounded explorable worlds instead of an
object floating in void), more *fractals* to explore (Mandelbox, Menger/KIFS,
quaternion Juliabulb, Sierpinski, hybrids), and more ways to *experiment*
(julia-on-cursor, click-to-fly, seeded presets, shareable views). Optimization is
a first-class goal throughout: every visual addition must hold interactive
frame-rate, and the biggest wins go to techniques with the highest
visual-payoff-per-compute.

Every addition serves at least one of the project's four identities
(`docs/architecture.md` § 1.2); additions that serve none are out of scope. This
spec keeps the repo's **show-don't-assert** thesis intact: the *verified* object
stays the canonical power-8 Mandelbulb with its own committed reference, golden
anchors, capture and gate; everything new is either (a) pure presentation over
that same gated math, or (b) clearly-labelled explorer content whose verification
status is stated honestly (§ 3.3, § 9.1) — never dressed up as "verified" when it
is not.

## 2. Governance posture & lane map (read first)

**FACT (the two-shader split — the fact that makes this whole spec low-risk).**
There are two distinct DE shaders:

- **Gate kernel** `packages/mandelbulb-explorer/src/mandelbulb_de.wgsl` — the
  committed power-8 DE (p=8, escape_radius=2.0, n_max=16) that the deploy gate
  dispatches. **FROZEN.** Its golden anchors
  (`tools/testkit/golden/tables/closed-form/mandelbulb-de-samples.json`), its
  canonical seed-42 16×16 probe capture, and the PROVE panel all depend on it
  byte-for-byte.
- **Display shader** `packages/mandelbulb-explorer/web/src/render.wgsl` — the
  live ray-march with runtime uniforms (power, iterations, bailout, coloring,
  lighting, camera). This is the free playground.

**FACT (`tools/productization/web-deploy/verify.py:276`).** The mandelbulb gate
is `new_canonical`; its pass criterion is **run-twice byte-identity** on the
committed DE kernel over the seed-42 probe grid, computed from **buffer
readbacks, never pixels**. Therefore *no change to `render.wgsl`, `main.ts`, the
coloring, the camera, or any display feature in this spec can perturb the gate.*
The f32-vs-f64 residual is reported informationally against the closed-form
budget (honest miss — the f32 floor sits above the strict budget; see
`verification-demo-spec.md`), and that framing is likewise display-independent.

This splits the work cleanly:

| Bucket | Surface | Lane | Ratification |
|---|---|---|---|
| **§ 3.1** Camera & motion | `render.wgsl`, `main.ts` uniforms | Lane B | none |
| **§ 3.2** Coloring engine | `render.wgsl`, `main.ts`, `common/common-web/src/colormap.ts` | Lane B | none |
| **§ 3.3** New fractal families | new display DE fns in `render.wgsl` (+ optional backend if gated) | **operator-gated (§ 9.1)** | **display-only = none; full-discipline = HARD-STOP → ratify → gate, per family** |
| **§ 3.4** Explorable worlds | `render.wgsl` (domain ops, fog), `main.ts` | Lane B | none |
| **§ 3.5** Optimization | `render.wgsl` march loop, `main.ts` render scheduler | Lane B | none |
| **§ 3.6** Deep interaction | `main.ts`, `render.wgsl` uniforms | Lane B | none |

**INFERENCE (sequencing rule).** Build §§ 3.1/3.2/3.5 first as one self-contained
Lane-B "polish" cluster (they resolve three of the operator's five stated
complaints — the spin, the weak color, and frame-rate — at zero gate risk). Then
§§ 3.4/3.6 as a second Lane-B cluster. § 3.3 is opened separately once the
operator picks the verification posture (§ 9.1), so any boundary-crossing kernel
work is never slipped into a styling commit (charter § 3.1).

---

## 3. Feature specifications

### 3.1 Camera & motion (Lane B) — *fixes "spins too fast and constantly"*

**FACT (baseline).** Auto-orbit is a single hardcoded increment
`disp.angle += 0.004` per frame after `AUTO_ORBIT_IDLE_MS = 4000` ms of pointer
idle (`packages/mandelbulb-explorer/web/src/main.ts:480`,
`packages/mandelbulb-explorer/web/src/main.ts:490`). At 60 fps that is ≈14°/s,
constant, snapping to full speed instantly. Manual drag is an undamped direct
mapping `disp.angle += dx * DRAG_RAD_PER_PX`
(`packages/mandelbulb-explorer/web/src/main.ts:524`).

**HONESTY FLAG.** Camera/interaction UX was the one research pillar where *no
primary source survived verification* — these are engineering-judgement changes,
not received technique. Tuned defaults below are INFERENCE, to be dialled in
against the live demo.

- **3.1.a Gentle, controllable auto-orbit.** Default spin ≈0.0008 rad/frame
  (≈3°/s, ~4–5× slower). Expose an **orbit-speed slider** (0 = off …fast), so the
  operator's "too fast/constant" is a user setting, not baked. **Ease-in** the
  auto-orbit over ~1 s (smoothstep ramp) when it resumes, instead of the current
  hard snap.
  - *Why:* science-literate / calm-instrument identity; directly the top complaint.
  - *Acceptance:* at default the object reads as slowly drifting, not spinning;
    slider to 0 fully stills it; resume is a ramp, not a jump. Must stay
    **frame-indexed** (see § 6) so poster/loop determinism is unaffected.
- **3.1.b Inertial / damped manual orbit.** Give drag a velocity + friction model
  (angular momentum that coasts and settles) rather than the 1:1 mapping at
  `packages/mandelbulb-explorer/web/src/main.ts:524`. Same for zoom/pan
  smoothing.
  - *Acceptance:* flick-and-release coasts and decays smoothly; no jitter at rest.
- **3.1.c Auto-orbit courtesy.** Pause auto-orbit while the pointer is over the
  canvas (not just on active drag); resume on idle. Optional very-slow vertical
  "breathing" (elevation bob) as an alternative motion preset.
- **3.1.d Framing presets.** A small set of named camera framings (hero 3/4,
  top-down, orbit-equator, deep-crevice) selectable from the panel, each a
  target+angle+elev+dist tuple — reuses the existing camera-in-preset mechanism
  (`packages/mandelbulb-explorer/web/gen-verification.mjs:216`).

### 3.2 Coloring engine (Lane B) — *fixes "the color mapping is weak"*

**FACT (baseline).** Three color modes over LUT palettes only
(`packages/mandelbulb-explorer/web/src/render.wgsl:182`): mode 0 normal-shaded,
mode 1 orbit-trap as a **single scalar** `min length(z)`
(`packages/mandelbulb-explorer/web/src/render.wgsl:75`, remapped at :185), mode 2
smooth-escape. Palette is a LUT sample `cmap_sample()` fed from the shared
`common/common-web/src/colormap.ts` (matplotlib-family maps). This is the
weakest-per-effort surface and the largest visual win in the spec; the research
here is the strongest (all unanimous, all iq/Hvidtfeldt primary).

- **3.2.a Cosine palettes (procedural).** Add iq's cosine palette
  `color(t) = a + b·cos(2π(c·t + d))`, each of `a,b,c,d` a `vec3`
  (iquilezles.org/articles/palettes, 3-0). Compute in-shader (cheap, infinitely
  tunable) as an alternative palette source to the LUTs. Ship a curated bank of
  `(a,b,c,d)` presets **plus** a "custom" mode exposing the four vectors.
  - *Why:* replaces a fixed table with a continuous, animatable palette space;
    the single biggest lever on "weak color".
  - *Acceptance:* palette switches with no pipeline rebuild (uniform swap);
    cosine + LUT modes coexist; `c` (frequency) and `d` (phase) are live sliders.
- **3.2.b Vec4 geometric orbit traps.** Replace the scalar trap with the
  **Fragmentarium 4-vector** (Hvidtfeldt II, first-party, 3-0): during DE
  iteration track running-min distance to the three planes x=0, y=0, z=0 **and**
  the origin as a `vec4`, plus optional point/line/sphere traps
  (iquilezles.org/articles/ftrapsgeometric). Map the four channels to color
  (X/Y/Z/R weights) feeding the palette input `t`.
  - *Why:* the current `min|z|` scalar throws away almost all orbit structure;
    the vec4 is *the* documented richer coloring for 3D DE fractals.
  - *Acceptance:* trap-shape selector; the four channels are independently
    weightable; visibly richer banding than the current mode 1.
- **3.2.c Layered color inputs.** Let the palette input `t` be a weighted blend of
  {orbit-trap channels, smooth-escape, DE-gradient/AO, world-position (triplanar)}
  — a small mixer, not a hard mode switch. Preserves the "physics-honest color"
  contract (color derived from the orbit/field, not painted on).
- **3.2.d Glow / emission + bloom.** Extend the existing silhouette glow
  (`packages/mandelbulb-explorer/web/src/render.wgsl:171`) to an interior
  emission term driven by trap proximity, and add a cheap separable bloom pass on
  the HDR target before tonemap.
- **3.2.e HDR tonemap.** Route final color through a filmic/ACES-fit tonemap +
  the existing `exposure` uniform, replacing ad-hoc clamping.
  - *HONESTY FLAG:* tonemapping/bloom for fractals is standard folklore — no
    primary source survived verification in this pass; treat as craft, not citation.

### 3.3 New fractal families (operator-gated) — *fixes "could have more templates"*

**FACT (baseline).** All 8 presets
(`packages/mandelbulb-explorer/web/gen-verification.mjs:216`) are the *same*
power-8 Mandelbulb (power sweeps, Julia, morph). "More templates" in the
strongest sense means new **families**.

**Governance — the key decision (§ 9.1).** Unlike strange-attractors (which gave
every new attractor full verification discipline), the operator framed these as
"art/templates." Two postures:

- **(A) Display-only explorer (Lane B, recommended default).** Add each family as
  a new DE function in `render.wgsl` behind a `family_id` uniform. **No** backend
  reference/golden/gate. The UI labels them honestly as *explorer / artistic —
  not gate-verified*; the canonical power-8 Mandelbulb remains the sole "verified"
  object (its EXPLAIN/PROVE panels are unchanged). Fast, low-risk, honest.
- **(B) Full-discipline sub-sims (boundary-crossing, per family).** Each family
  earns the strange-attractors bar: NumPy reference, algebraic derivation,
  structural golden anchors (≥3 independent references), canonical capture, gate,
  perf-ledger row, then a ratified display kernel. Slower; each is an operator
  HARD-STOP → ratify → full validate. All four candidate families have
  well-documented closed-form DEs, so they are **gate-eligible** — this is a cost
  choice, not a feasibility one.

**INFERENCE (recommended).** Ship the family set under posture (A) first to prove
the visual/interaction value, and keep posture (B) as a documented, per-family
upgrade path (a "promote to verified" backlog). This mirrors the repo's
deferred-with-cause pattern without blocking the visuals on backend work.

#### 3.3.1 Candidate families & canonical forms (from the research pass)

| Family | Iteration / fold | DE | Source (confidence) |
|---|---|---|---|
| **Mandelbox** | `z = scale·sphereFold(boxFold(z)) + c`; boxFold `p = clamp(p,−L,L)·2 − p`; sphereFold `if r<R: p·=R²/r²` (inner minRadius scales linearly) | `length(z)/\|dr\|`, `dr = dr·\|scale\| + 1` (box fold has unit Jacobian → does not scale `dr`; sphere fold and scale do) — Buddhi's scalar DE | Tom Lowe; Hvidtfeldt VI (3-0) |
| **Menger / KIFS** | Knighty kaleidoscopic IFS: conditional plane folds + scale-about-point + rotation, iterated | scale-tracked running derivative (KIFS DE) | Knighty, fractalforums (3-0) |
| **Quaternion Juliabulb** | quaternion `z = z² + c` (or triplex Julia with fixed `c`, already present as Julia mode) | analytic running-derivative (Julia drops the `+1`) | iq distancefractals (verified in-repo) |
| **Sierpinski tetra** | tetrahedral IFS folds + ×2 about vertex | affine IFS DE | classic KIFS (secondary) |
| **Hybrid** | alternate / interpolate / DE-combine two family sets per iteration (e.g. Mandelbox∘Menger) | per-mode combined DE | Mandelbulb3D (3-0) |

**INFERENCE (math to reuse for anisotropic variants).** If a Mandelbox variant
uses a *different scale per axis* (non-conformal), the scalar running derivative
**fails**; dual-number / forward-mode AD tracks the full Jacobian and gives the DE
"for free" (Hvidtfeldt VII, 3-0). Keep the isotropic scalar DE for the default
Mandelbox (Buddhi's result holds); reach for AD only if we expose per-axis scale.

**HONESTY FLAG (power-8).** "Power 8 is the empirical optimum" was *refuted*
(1-2) — 8 is White's aesthetic sweet spot, not a measured optimum. Any EXPLAIN
copy about the power slider must say "aesthetic choice," not "optimal."

### 3.4 Explorable worlds (Lane B) — *fixes "the fractal landscape is infinite"*

**FACT (baseline).** The scene is genuinely unbounded — the DE returns 0 inside
the set and geometry just thins out at large |z| (far plane `t = dist·3 + 6`,
`packages/mandelbulb-explorer/web/src/render.wgsl:147` region). It reads as an
*object* in void, never a *world*.

- **3.4.a Domain repetition.** iq's `opRep`/`opRepLim` — tile the DE through space
  (`q = p − s·round(p/s)`), optionally limited to a finite lattice, to make a
  *structured* infinity you fly through rather than a lone object
  (iquilezles.org, "infinitely many primitives with a single evaluation", 3-0).
- **3.4.b Domain distortion / extra folds.** Warp space (twist/bend/extra folds)
  for terrain-like relief.
  - *FACT (iq caveat, 3-0):* distortion makes the field non-Euclidean → **reduce
    the march step size** or the DE over-steps and cracks appear. Couple a
    per-mode step-scale factor into the march (§ 3.5).
- **3.4.c Hybrid formulas as landscape.** The § 3.3 hybrid mode (Mandelbox inside
  Menger, etc.) is the documented route to architecture/terrain/alien-world forms
  (Mandelbulb3D, 3-0). This is the primary "world vs object" lever.
- **3.4.d Atmosphere & depth cueing.** Exponential distance fog, subtle aerial
  perspective (hue shift with depth), horizon/gradient background feeding the
  existing blit. Makes scale *read* as a world.
  - *HONESTY FLAG:* Mandelbulb3D's specific scene pipeline (SSAO + hard shadows +
    volumetric fog) was **refuted/unverified** in the research pass — only the
    hybrid-formula technique is confirmed. Fog-for-depth is standard craft; label
    it as such, don't cite a source we don't have.
- **3.4.e Bounded framing (optional).** A "world box" / ground-plane mode so a
  repeated/hybrid fractal sits in a finite, navigable scene with a floor and
  horizon — an explicit alternative to the object-in-void default.

### 3.5 Optimization for visual payoff (Lane B)

**FACT (baseline).** The march already has: adaptive stepping
`t += max(d, 0.3·eps·t)`, three quality tiers (96/140/220 steps,
`packages/mandelbulb-explorer/web/src/render.wgsl:147` region), iq soft shadows
`res = min(res, k·h/t)` (`packages/mandelbulb-explorer/web/src/render.wgsl:107`,
3-0), normal-sampling AO (`…:122`, 3-0), and tetrahedron-tap normals. Good
foundation — the wins are scheduling and step quality, not a rewrite.

- **3.5.a Progressive refinement (biggest real-world win).** Render at reduced
  resolution and/or a smaller step budget **while the camera moves**, then
  accumulate and sharpen when it settles (drive off the same idle signal as
  auto-orbit, `packages/mandelbulb-explorer/web/src/main.ts:490`). Keeps
  interaction at 60 fps and lets the *still* image reach high iteration counts.
  - *HONESTY FLAG:* no primary source survived verification for
    progressive-refinement/TAA in this pass — it is well-established craft, flagged
    as such. This is the single highest-leverage optimization for this sim and
    should anchor the polish cluster.
- **3.5.b Enhanced / over-relaxed sphere tracing.** Optionally replace the fixed
  adaptive step with over-relaxation (Keinert 2014, `ω∈[1,2)` speculative
  overstep with safe fallback) or enhanced tracing (Bálint & Valasek 2018,
  tangential-sphere linear extrapolation `r_{i+1} = r_i·(d_i−r_{i-1}+r_i) /
  (d_i+r_{i-1}−r_i)`).
  - *FACT (the paper's own caveat, 3-0):* **on the Mandelbulb specifically,
    enhanced and relaxed tracing are on par and only slightly beat basic** (the
    "up to 50% / 1.5×" figures are vs relaxed, on smooth SDFs). So this is a
    modest, conditional win here — spec it as an experiment, not the headline. Do
    *not* promise dramatic speedups on the bulb.
- **3.5.c Temporal accumulation for AO/shadows.** Reproject and average the
  expensive AO/shadow terms across frames while still; cheap quality lift.
- **3.5.d WGSL trig-precision guard (forward reference).** The triplex power uses
  `acos/atan2/sin/cos`. Vulkan spec guarantees builtin `sin/cos` only to ~2⁻¹¹,
  which bit lavapipe on a prior sim (schrödinger-smoke). The **gate kernel is
  frozen** so this does not affect the gate; but if a § 3.3 family is ever gated
  (posture B), its display kernel should use polynomial trig, per the standing
  gated-WGSL precision rule. Display-only families are unaffected.

### 3.6 Deep interaction & experiment (Lane B)

**HONESTY FLAG.** As with § 3.1, the interaction-UX pillar produced no surviving
primary source — these are folklore-solid explorer patterns, specced as craft.

- **3.6.a Julia-on-cursor.** Click a surface point → feed it as the Julia `c`
  (the demo already has Julia mode + `jc` uniforms,
  `packages/mandelbulb-explorer/web/src/render.wgsl:57`). Live "juliabulb from
  where you clicked" — the classic linked-explorer trick.
- **3.6.b Click-to-fly / dolly-to-surface.** Double-click ray-casts to the DE
  surface and smoothly flies the camera target there (eased, frame-indexed-safe
  when idle).
- **3.6.c Parameter animation.** Generalize the existing power `morph` to animate
  fold params, palette phase (`d`), and light azimuth on gentle loops; all
  frame-indexed.
- **3.6.d Seeded preset generator ("surprise me").** A deterministic PRNG from a
  visible seed → sample a curated parameter space (family, power/fold, palette,
  light, framing) into a fresh preset. Reproducible from the seed; shareable.
- **3.6.e Shareable views (URL hash).** Serialize the full DisplayState
  (`packages/mandelbulb-explorer/web/src/main.ts:148`) to the URL hash; restore on
  load. Portfolio deep links; no effect on capture.
- **3.6.f Cross-section / clip plane.** A movable clip plane to reveal interior
  structure (discard hits in front of the plane) — pedagogy + novelty.

## 4. Shared facilities (built once, reused)

- **Cosine-palette generator** (§ 3.2.a) — add to `common/common-web/src/colormap.ts`
  alongside the existing LUT maps: a `cosinePalette(a,b,c,d)` sampler + WGSL emit
  helper + a curated preset bank. First procedural palette in the repo; other
  demos inherit it.
- **Vec4 orbit-trap helper** (§ 3.2.b) — a reusable WGSL snippet
  (`trap = min(trap, vec4(abs(z), length(z)))` pattern) + JS-side channel-mixer
  UI, factored so future DE demos reuse it.
- **Progressive-refinement scheduler** (§ 3.5.a) — a small render-loop wrapper
  (moving→low-res, idle→accumulate) usable by any ray-march demo; keep it in the
  demo initially, promote to `common-web` if a second sim wants it.
- **Fractal-family registry** (§ 3.3) — a typed table (name → `family_id`,
  default params, palette, framing, verification-status label) that the family
  selector, presets, and (if gated) capture manifest all read. Mirrors the
  strange-attractors attractor registry.

## 5. Sequencing / clusters

| Cluster | Contents | Lane | Gate |
|---|---|---|---|
| **L-1 (polish)** | § 3.1 camera + § 3.2 coloring engine + § 3.5 optimization | Lane B | web validate |
| **L-2 (worlds & play)** | § 3.4 explorable worlds + § 3.6 interaction | Lane B | web validate |
| **L-3 (families, display-only)** | § 3.3 posture (A): Mandelbox, Menger/KIFS, Juliabulb, Sierpinski, hybrid | Lane B | web validate |
| **X-\* (families, gated — optional)** | § 3.3 posture (B): per-family full discipline | **ratified** | full gate + web validate, per family |

L-1..L-3 are independent Lane-B clusters landing as polish in any order; **L-1 is
the recommended first ship** (three complaints, lowest risk). X-* only exists if
§ 9.1 chooses posture (B), and each begins with an operator HARD-STOP.

## 6. Governance & constraints

- **HARD BOUNDARY (all Lane-B clusters).** No edits to
  `packages/mandelbulb-explorer/src/mandelbulb_de.wgsl` (gate kernel), the capture
  path (`packages/mandelbulb-explorer/web/src/main.ts` capture/`exposeCapture`,
  `packages/mandelbulb-explorer/web/extract-canonical-de.py`), the gate
  (`tools/productization/web-deploy/verify.py`), `tools/testkit/equivalence/tolerance.toml`,
  the golden table, or the seed-42 probe generation. Display buffers and
  presentation only.
- **Capture pinning preserved.** The demo's capture export stays pinned to the
  canonical power-8 seed-42 probe grid regardless of the selected family, palette,
  camera, or live sliders — exactly as today. Selecting a display-only family and
  exporting still emits the canonical Mandelbulb bundle.
- **Frame-indexed animation only** (poster/loop determinism) — every new animated
  quantity (auto-orbit, morph, palette phase, click-to-fly easing) is
  frame-indexed, never wall-clock, matching the existing contract.
- **PROVE/EXPLAIN untouched by presentation.** The live gate re-run
  (`packages/mandelbulb-explorer/web/src/verify-panel.ts`) and equation anchors
  (`packages/mandelbulb-explorer/web/src/explain.ts`) still describe the canonical
  power-8 object. New families labelled honestly as un-gated in the UI (posture A).
- **Standalone-serve constraint.** All new data rides the bundle (static import);
  no `../../` cross-refs, no runtime fetches required for correctness
  (`verification-demo-spec.md`; local memory `web-validate-standalone-serve`).
- **No new heavy dependencies.** Hand-rolled on the existing theme; passes are
  extra WebGPU render targets; `gen-verification.mjs` stays Node-builtins.
- **Panel DOM contract untouched.** `data-bp` driver-discovery attributes keep
  placement/visibility; new UI enters via new groups/rows only.
- **§ 3.3 posture (B) only:** new display DE kernels for gated families are
  boundary-crossing (new compute paths) → operator ratification, full validate,
  called out in report + audit; never in a styling commit.

## 7. Acceptance / definition of done

**Per Lane-B cluster (L-*):**
1. `python tools/productization/web-deploy/pipeline.py validate --sim mandelbulb-explorer`
   green in headless Chromium + WebGPU (CHROME_BIN + DISPLAY + `uv run --no-sync`,
   per local memory) — the `new_canonical` run-twice gate stays byte-identical
   (presentation did not perturb the capture path).
2. `ts-strict` clean (tsc + lint parity).
3. Exported canonical capture DE array **byte-identical** to pre-work.
4. Layout sane at 375 px mobile and the max canvas; poster + motion loop
   regenerated with recalibrated boost (no blown highlights), per the landing
   tile / poster-loop workflow.
5. New camera/coloring/world/interaction additions are frame-indexed and
   poster-deterministic; auto-orbit at default reads as calm, slider stills it.
6. New families (posture A) are visibly labelled *explorer / not gate-verified* in
   the UI; EXPLAIN/PROVE still describe the canonical power-8 object only.

**Per gated family (X-*), additionally — the full bar (only if § 9.1 → B):**
7. NumPy reference + algebraic derivation + ≥3 structural golden anchors +
   canonical capture with a real payload checksum + gate + perf-ledger row +
   determinism/equivalence docs.
8. Ratified display kernel; EXPLAIN anchors self-heal against it (build HARD-FAILs
   on unmatched anchors).

## 8. Out of scope

- Any change to the power-8 gate kernel, tolerances, golden anchors, seed-42
  capture, or the PROVE/EXPLAIN verification framing.
- **Deep-zoom precision** (double-single / f64 emulation, log-scale relative
  depth). The f32 floor is a known, honestly-reported limit
  (`verification-demo-spec.md`); pushing past it is a separate, heavier effort —
  flag as a future spec, not this one (§ 9.5).
- 4D/quaternion-Julia *slicing UI* beyond the basic Juliabulb family (§ 3.3);
  full 4D navigation is a separate effort.
- The other web demos (they *inherit* the cosine-palette + progressive-refinement
  facilities later; not rebuilt here).
- Publishing (gh-pages deploy is operator-dispatched `workflow_dispatch`, per
  local memory `web-deploy-publish-flow`).

## 9. Open decisions (operator)

1. **New-family verification posture (§ 3.3) — the main decision.** Recommend
   **(A) display-only explorer** first (fast, honest-labelled, canonical object
   stays the sole verified one), with **(B) full-discipline** as a documented
   per-family upgrade backlog. Confirm A, or elect B (which opens ratified X-*
   clusters and backend work per family).
2. **Cluster order.** Recommend **L-1 (camera + coloring + optimization)** first —
   it resolves three of the five stated complaints at zero gate risk. Confirm or
   reorder.
3. **First family set (if § 3.3 proceeds).** Recommend Mandelbox + hybrid first
   (highest "new world" payoff), then Menger/KIFS, Juliabulb, Sierpinski. Confirm.
4. **Worlds reach (§ 3.4).** Domain-repetition + fog is the low-risk core; the
   bounded "world box" with ground/horizon (§ 3.4.e) is a larger visual departure
   — include in L-2 or defer?
5. **Deep-zoom precision (§ 8).** Confirm it stays out of scope for this spec
   (recommended) or charter it as a follow-on.

## 10. Change log

- **v0.1 (2026-07-08) — initial DRAFT for operator review.** Authored from the
  2026-07-08 deep-research pass (four pillars, 21 verified findings) folded
  against a full map of the current sim. All `file:line` citations verified
  against the working tree read on 2026-07-08 (`main.ts` auto-orbit :480/:490/:524,
  `render.wgsl` de_orbit :55 / soft_shadow :107 / calc_ao :122 / coloring :182 /
  glow :171, gate mapping `verify.py:276`, shared `common-web/src/colormap.ts`
  confirmed present). Research honesty flags recorded inline: power-8 is aesthetic
  not empirical (refuted 1-2); enhanced sphere tracing is only a modest win on the
  Mandelbulb specifically (paper's own caveat); Mandelbulb3D's scene pipeline is
  unverified (only the hybrid-formula technique is confirmed); camera UX,
  progressive refinement, tonemapping/bloom, and interaction patterns are
  folklore-solid but had no surviving primary source. Nothing built.
