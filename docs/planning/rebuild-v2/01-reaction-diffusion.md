# 01 — Turing Patterns (Gray–Scott reaction–diffusion)

> Part of [Rebuild v2](README.md). Replaces `packages/reaction-diffusion-2d/web`. Wave 0 —
> the foundation pilot. Status: planning, v0.1, 2026-10-17. Unmeasured targets.
>
> **Released (2026-10-29):** the v2 page replaced v1 at `/sims/reaction-diffusion-2d/`. v1 is
> kept at `/sims/reaction-diffusion-2d/v1/` for one release, and the old `/v2/` address forwards
> to the root with its query. `pipeline.py validate` gates both pages with the same
> `capture_roundtrip` gate (max abs error 2.64e-5 on each, byte-identical captures), and the
> landing card, poster and loop show the v2 page. The splash reel's Turing clip is now The Map,
> in the dark nocturne palette (the other palettes are paper-light and would strobe the dark
> reel); Spirals was tried and cut (too busy to fit the 2 MB clip budget cleanly).
>
> **Implementation status (2026-10-17):** M0–M2 built as the `v2/` page of
> `packages/reaction-diffusion-2d/web` (served at `/sims/reaction-diffusion-2d/v2/`, v1 unchanged).
> The `capture_roundtrip` gate passes from the v2 page with the v1 page's exact bytes. Scenes
> shipped: The Map (a band-following sweep, below), Mitosis, Coral, Solitons, Spirals, Gradient
> Garden, and the gated dish itself.
>
> **M3 (2026-10-17):**
> - **Extra models.** Turing Stripes (Brusselator), Spacing Spots (Gierer–Meinhardt) and Excitable
>   Waves (FitzHugh–Nagumo) run behind the live kernel, selected by an override constant.
>   - Each has an f64 CPU mirror that reproduces its committed golden bit for bit, and a GPU
>     check against that golden in the Prove drawer.
>   - The goldens are in `packages/reaction-diffusion-2d/web/public/goldens/`; the tolerances are
>     measured and declared in `tolerance.toml`, `[golden_tolerance.continuous-ca.reaction-diffusion-2d]`.
> - **Analytic Turing check.** The live FFT measures each ring's growth rate from two snapshots,
>   and its peak must match the dispersion relation's fastest-growing ring within ±1%.
>   - Measured worst: 0.25% over 24 seeds on RADV.
>   - Derivation: `tools/testkit/golden/derivations/brusselator-turing.md`, with a Cat-3 golden table.
> - **On a Shape.** The sphere and torus use `OrbitCamera` (in `@bp/render`), a slow turntable
>   that is off under reduced motion, and seed/erase painting on the surface. Undo and share
>   links work there too.
> - **Card.** The v2 page's poster and loop are on the landing card, which now links to `v2/`.
>
> Not yet: the IMEX live solver, and arbitrary meshes.
>
> **Corrections from M3:**
> - **Sphere grid.** The sphere is a geodesic icosahedral grid with the cotangent (Voronoi)
>   Laplacian, not the cube-sphere.
>   - With two-point fluxes the equiangular cube-sphere is inconsistent: its grid lines aren't
>     orthogonal.
>   - Measured: 25–37% error on spherical harmonics, not shrinking with refinement.
>   - The torus keeps its orthogonal θ × φ grid.
>   - Surface sims take stability-limited Euler substeps.
> - **Brusselator parameters.** The Brusselator runs at A = 4.5, B = 6.75.
>   - B = 9 gave mostly spots.
>   - With B = 6.75 the uniform state is exact in f32 (v* = 1.5).
> - **Turing check protocol.** The check needs 2⁻⁷ noise.
>   - At 2⁻¹³ each step's change is about one f32 ulp of u*, and the measured peak scattered by
>     up to 9%.
>
> **Corrections from building it:** the committed gated kernel uses a **5-point** Laplacian, not a
> 9-point one; the live solver mirrors it term for term (and reproduces the gated bytes on the
> canonical dish). The Map follows the pattern band around the saddle-node line
> k = (√F − 2F)/2 rather than sweeping a plain (F, k) rectangle, which spent ~40% of the screen
> on flat regions; the breadcrumb draws the band on the full plane. A regime survey moved
> Solitons to (0.038, 0.0665) and Spirals to (0.012, 0.047) — at the values in the table below
> the "solitons" replicate and the "spirals" dish turns solid.

## Verdict on the prototype

- **Keep:** the f64 reference, goldens and `capture_roundtrip` gate; the (k, F) plane
  picker idea; the honest "∫(U+V) is not conserved — the feed term forces it" note.
- **Drop:** four presets as the only way into a parameter space with dozens of distinct
  behaviours; a 720 px letterboxed square; a grey-violet palette that makes every pattern
  look like the same blurred blob; sliders labelled `F` and `k` as the main interface.
- **Lesson:** the interesting thing about Gray–Scott is the *map* — Pearson's and Munafo's
  catalogues show that two numbers produce spots, stripes, mazes, solitons, mitosis,
  spirals and chaos. The prototype hid the map behind a small inset.

## The experience

**Pitch:** *Fly across the map of pattern space, land anywhere, and grow it on anything.*

**First ten seconds:** the page opens on a full-bleed **parameter-sweep field**: one
simulation whose F varies left→right and k bottom→top, so the whole catalogue is growing
at once — coral at one corner, mazes in the middle, dying spots at the edge. A soft grid
labels a few regions ("mitosis", "worms", "solitons", "chaos"). It is beautiful on its own.

**Signature moment:** click a region and the camera dives in; the sweep cross-fades into a
uniform-parameter dish at that (F, k) seeded from what was there, and the pattern keeps
growing. A breadcrumb shows where you are on the map; dragging the breadcrumb's dot moves
you continuously through pattern space and the dish morphs live.

**Second signature:** *Grow it on a shape* — the same chemistry on a sphere, a torus, a
bunny or a teacup, rendered as a glossy, embossed surface (a coral-coated teapot is the
poster).

### Scenes

| Scene | What happens | Prompt |
|---|---|---|
| **The Map** (default) | (F, k) gradient sweep, 1024² (T3) | "Every point is a different chemistry. Pick one." |
| **Mitosis** | spots that divide until the dish is full, then a reset wave | "Watch one spot become two." |
| **Coral** | branching growth from a seed | "Draw a seed; it will branch." |
| **Solitons** | U-skate / gliders on a quiet background (Munafo's uskate world) | "These spots move. Make them collide." |
| **Spirals** | the spiral-wave region (F ≈ 0.010, k ≈ 0.045) | "Break a wave front and it curls." |
| **On a Shape** | RD on a mesh with selectable models | "Pick an object to coat." |
| **Gradient Garden** | spatially varying F painted by the user | "Paint chemistry, not pixels." |

### Tools

- **Seed** (paint V), **Erase** (paint U = 1), **Chemistry brush** (paint local F/k
  offsets — visible as a subtle tint), **Probe** (shows local U, V, and which regime the
  local F/k is in), **Pan/zoom**.
- **Tune** popover: *Feed rate (F)*, *Kill rate (k)*, *Speed*, *Diffusion ratio* (advanced).

### Learn

- Callouts on The Map name the regions, sourced from Pearson's classes (α, β, γ, … μ).
- "How it works": two chemicals, U feeds in, V eats U and decays; diffusion at different
  rates; equations with each term linked to its slider.
- Instruments: pattern statistics (spot count via connected components on a downsampled
  field, dominant wavelength from a 2D FFT power spectrum — reuse `common/common-web/src/fft-wgsl.ts`),
  coverage, mass of V over time.

## The model

- Gray–Scott on a periodic square grid, 5-point Laplacian (as committed — an earlier draft of
  this spec said 9-point), explicit Euler at the gated Δt (unchanged — this is the gated kernel). Live mode may use a semi-implicit
  (IMEX, Fourier-space diffusion) step for 4–8× larger stable steps; it is labelled
  *live solver*, and the gate stays on the reference kernel.
- **Parameter field:** F and k are textures, not uniforms (enables The Map, the chemistry
  brush and Gradient Garden at no extra cost).
- **Other models (Learn → Model):** FitzHugh–Nagumo (excitable spirals), Brusselator
  (Turing stripes) and Gierer–Meinhardt (spots) behind the same kernel interface, each with
  a short scene. Each new model gets a CPU mirror and a committed golden before it ships.
- **On a Shape:** RD on a triangle mesh with a cotangent Laplacian, or (simpler, robust) on
  a 3D-texture-free *geometry image* / cube-sphere parameterisation for the sphere and
  torus. Ship sphere + torus first (analytic, distortion-controlled); arbitrary meshes are
  a stretch with mesh Laplacian goldens.
- Sizes: The Map 1024² (T3) / 512² (T2) / 384² (T1); dishes 512²–1024².

## The look

- Art direction: **ink and enamel**. A warm-paper or deep-ink background per scene; the V
  field rendered as a height map with soft directional light, specular sheen and slight
  subsurface tint, so patterns read as raised glossy material rather than a colormap.
- Palettes: *Ink* (black on bone), *Enamel* (cobalt on porcelain), *Coral* (rust on sand),
  plus scientific colormaps in Learn.
- The Map uses a single elegant palette; region labels in condensed caps, 40% opacity.
- On a Shape: PBR material driven by V (albedo blend + normal from height), studio
  environment light, slow turntable (off under reduced motion).

## The proof

- Keep the existing `capture_roundtrip` gate and goldens unchanged; the gated scene stays a
  small canonical dish run by the reference kernel, independent of the live solver.
- New: an **analytic Turing-instability check** — for a model with a homogeneous steady
  state, the dispersion relation predicts the fastest-growing wavenumber; the live FFT's
  dominant wavenumber after linear growth must match within a declared tolerance.
- New models (FHN, Brusselator, GM) each add a golden before release.
- Honesty: The Map's region names are descriptive labels after Pearson/Munafo, not
  classifications computed from the field.

## Performance targets

| Tier | Grid | Steps/frame | Target |
|---|---|---|---|
| T3 | 1024² | 16 | 60 fps |
| T2 | 512² | 12 | 60 fps |
| T1 | 384² | 8 | 30–60 fps |

## Risks and open questions

- On a Shape on arbitrary meshes needs a careful Laplacian (obtuse triangles); start with
  analytic parameterisations.
- IMEX live solver vs the gated explicit kernel can diverge visibly at the same (F, k);
  the Prove drawer must state which solver produced what the visitor sees.
- The Map at 1024² needs ~16 steps/frame to grow at a satisfying speed; measure.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Foundation F0 running the existing kernel full-bleed with The Map scene |
| M1 | Dive-in transition, breadcrumb morph, tools, history (F1) |
| M2 | Learn callouts + FFT instruments, Prove drawer with the existing gate passing in CI (F2) |
| M3 | On a Shape (sphere, torus), extra models with goldens, posters/loops |

## References

- Pearson 1993, *Complex patterns in a simple system*, Science 261 — [doi:10.1126/science.261.5118.189](https://doi.org/10.1126/science.261.5118.189)
- Munafo, *xmorphia* parameter catalogue — [mrob.com/pub/comp/xmorphia](https://mrob.com/pub/comp/xmorphia/)
- Sims, *Reaction-Diffusion Tutorial* — [karlsims.com/rd.html](https://www.karlsims.com/rd.html)
- Walker et al. 2023, *VisualPDE* (prior art for browser RD; differentiate on the map, surfaces and proof) — [arXiv:2308.01245](https://arxiv.org/abs/2308.01245)
- Turk 1991, *Generating textures on arbitrary surfaces using reaction-diffusion*, SIGGRAPH
