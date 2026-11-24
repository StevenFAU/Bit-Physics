# 07 — Murmuration (3D starlings)

> Part of [Rebuild v2](README.md). Replaces `packages/boids-3d/web` (Murmuration Lab).
> Wave B. Status: planning, v0.1, 2026-10-17; M0 built 2026-11-18, M1 2026-11-24 (below). Elsewhere, targets are unmeasured.
>
> **Implementation status (2026-11-24): M1 built** on the `v2/` page: a flock that murmurates, the
> falcon and its alarm wave, near-field birds, The Attack. Measured on the RX 6800 XT (snap Chromium,
> RADV, headless, 1280×720, `gpu_busy_percent` 0 before each run) unless a line says otherwise.
>
> - **The live model is a fork** (`src/v2/model/murmur.wgsl`; v1's `src/starling.wgsl`, `grid.wgsl`
>   and `stats.wgsl` are untouched, and v1's page and the gate's bytes with them). Kept: seven
>   nearest visible neighbours, one to avoid, the rear blind cone, bounded and banked turning, cruise
>   speed. Changed, from M0's finding that v1's flock mills: the roost turns birds back only once
>   they fly past its edge (Hildenbrandt et al. 2010), and cohesion grows with a bird's centrality
>   (how one-sided its neighbours are), so the border stays sharp. Measured at 100,000 birds over
>   30 s: polarization median 0.90 (0.13–0.92 sampled once a second; 13 of 30 samples ≥ 0.9), nearest neighbour 0.92 m median (0.89–0.95), rms axes 37 × 23 × 10 m median (the smallest 5–17 m as it turns), proportions 1 : 2.2 : 3.6. In straight flight it reaches 0.94–0.96 (field flocks: 0.96 ± 0.03, Cavagna et
>   al. 2010); it dips while the flock turns back at the roost's edge, because a 50 m flock re-aligns
>   over seconds. A softer roost turn (radius 65, weight 0.8) was measured against radius 50, weight
>   1.2: median 0.90 against 0.88, 26 of 40 s at ≥ 0.9 against 13 — adopted. Learn labels all of it
>   model behaviour.
> - **The alarm** spreads only through the seven followed neighbours, after a reaction time of 4 steps
>   (33 ms; a bird that sees the falcon reacts in 3), then the bird is refractory for 1.5 s (Attanasi et
>   al. 2014: by contact, never broadcast). Timers are integer steps, so a wave is exact on replay.
>   Each bird keeps its onset step and whether it saw the falcon itself. The wave's speed, measured
>   from one readback (`src/v2/model/wave.ts`: for each bird alarmed by contact, distance ÷ delay
>   from the earlier sighting that needs the slowest travel; the median): The Attack reached 75,418 of 100,000 birds in 2.16 s, 5,643 of them alarmed by the falcon itself; median 19.6 m/s bird to bird. The
>   estimator runs on the main thread after every wave, so its work is bounded (at most 1,500 contact
>   birds against 3,000 sightings, ~14 ms at The Attack's counts, where the full search took seconds —
>   PR #74 review); thinning can only miss a bird's true source, and on the same byte-identical attack
>   the full search read 18.7 m/s, 4.8% slower. In an
>   earlier tuning, 8-step reactions (67 ms) measured 9.5 m/s, below the 20–40 m/s Attanasi et al.
>   measured; the default is 4 steps. With the falcon hunting continuously in Dusk it alarms tens of
>   thousands of birds directly along its path, and the estimator scatters (6.2 and 19.3 m/s in two 30 s
>   pursuits) — it reads a single stoop best. Tune's "Reaction time" sets the delay.
> - **100,000 birds**, by bounding the alarm to the selected neighbours. The step's result then
>   depends only on the k-nearest set, so the search can stop early: an exact shell search over
>   @bp/gpu's `CountingSort` (cells of 1.25 units, 4× smaller than the 5-unit reach), birds processed
>   in cell order, candidates read from a gathered, cell-ordered array; it stops when the seventh
>   visible neighbour is nearer than any unscanned cell. Birds per tier, measured
>   then declared: T3 100,000, T2 32,768, T1 10,000 — the spec's targets. `?bench=1` after the flock has
>   flown 9 s: T3 60 fps and 120 steps/s, GPU 8.0 / 8.5 ms p50 / p90 (sim 6.4 ms for two steps, dusk
>   0.58, near cull 0.03, optical depth 0.99, near meshes 0.07, composite and reeds 0.14, exposure
>   0.07); T2 60 fps, GPU 5.2 / 5.8 ms; T1 60 fps, GPU 4.4 / 5.2 ms (lighter tiers run the GPU at lower
>   clocks, so their times do not scale down with the count); 131,072, the buffers' capacity, 60 fps,
>   GPU 9.2 / 9.7 ms. M0's v1 kernel ran 100,000 at 2.4 fps. SwiftShader (Playwright's Chromium with
>   lavapipe's ICD, T1, 10,000 birds): ready 124 ms, live 1.7 s, 4.5 fps — 216 ms a frame, the sim 139
>   ms for two steps, the near pass 15 (its multisampled clear and resolve), composite 20 — the flock
>   slowed to 9 steps/s.
> - **Grid ≡ brute force** on the new kernel (`step` and `step_brute` share everything but the
>   search): 8 of 8 steps byte-identical on 2,048 seeded birds and on 2,048 packed beyond a corner of
>   the grid, and 24 of 24 with the falcon flying through (1,168 took fright). The sort and gather
>   check as an exact permutation on the live 100,000 (each id once, in its own cell, beside its own
>   position). The gate path is unchanged: `pipeline.py validate --sim boids-3d` passes on both pages, run twice, every capture sha256 `6c6651a2…` (v2 ready in 11–26 ms).
> - **The falcon** (`src/v2/model/falcon.ts`): a kinematic agent — 9 units/s level, 15 in the stoop,
>   1.9 rad/s turn — advanced on the CPU per model step and handed to that step's uniforms. F flies it:
>   point to steer, or A/D, W/S, Shift; left alone for 2 s it hunts by itself (climb to a perch above
>   and behind the flock, stoop through its predicted centre, again). Birds within 12 m see it; within
>   6 m they dodge it.
> - **The Attack**: the flock flies 1,200 steps off screen from seed 7, the page reads where it is (a
>   readback of its own deterministic state) and scripts the stoop from there; a restart replays it
>   byte for byte (600 steps after the warm-up: identical sha256 in the acceptance run).
> - **Near birds** (`render/near-birds.ts`): a compute cull gives every bird a weight from its
>   projected wingspan — 0 below 12 px, 1 above 20 px (about 40 m and 24 m away at the home zoom) — and
>   lists them; the τ splat takes (1 − w) of a bird's coverage, the mesh is drawn with alpha w: a
>   procedural low-poly starling with a wingbeat that wanders into glides and its bank, dark, lit only
>   by a rim of the sky behind it, 4× multisampled. The falcon is the same mesh, falcon-shaped, never
>   under 14 px. The list holds every bird: with a 16k list, which birds won a slot followed atomic
>   order and changed each frame — measured as flicker (cross-fade 2.0 × 10⁻⁴ against a hard switch's
>   1.5 × 10⁻⁴), gone with the full list.
> - **The hand-off, measured over a slow dolly** (the flock still; the eye at 62 units with a 14° view,
>   so birds cross 12–20 px; 0.2 m a frame for 120 frames; Σ over pixels of 1 − e^(−τ)·(1 − α) read every
>   frame): jitter about the trend, rms: the cross-fade 4.2 × 10⁻⁴, a hard switch at 16 px 4.3 × 10⁻⁴, every bird a mesh 5.4 × 10⁻⁴, the medium alone 3.5 × 10⁻⁴ (29,316 birds as meshes mid-dolly; under the earlier roost tuning, 3.4, 3.5, 4.6 and 2.1 × 10⁻⁴). Meshes alias at their edges (WebGPU's most samples is 4), so pure meshes
>   jitter more than the medium; the cross-fade stays below both the hard switch and pure meshes —
>   no popping of its own. Coverage at the start agrees within 2.7% (every bird a mesh: 0.8%) of the medium alone: no
>   bird is counted twice. The far-field check from M0 still holds: Σ τ over a 0.04 m-a-frame dolly at the home view jitters 4.1 × 10⁻⁷ rms, against the analytic-normalisation control's 8.5 × 10⁻⁵ (208×).
> - **Acceptance and layout:** `v2-acceptance.mjs` 46/46 (with a held pointer stooping the falcon, and no falcon key left latched after leaving the tool — PR #74 review); `web/tools/check-studio.mjs` 0 problems and 0 axe violations at 390, 820, 1440 and 200% zoom.
>   No shared code changed in M1.
>
> **Implementation status (2026-11-18): M0 built** as the `v2/` page of `packages/boids-3d/web`
> (served at `/sims/boids-3d/v2/`, gated through `pipeline.py` `PAGES`; v1 unchanged). Dusk: v1's
> starling flock over a reed bed, watched from the ground, drawn as an optical-depth medium against an
> analytic dusk; the Look, Gust and Startle tools; Tune (flock character, sun, drawn size), Learn and
> Prove. Measured on the RX 6800 XT (snap Chromium, RADV, headless, 1280×720) unless a line says otherwise.
>
> - **The gate, ported verbatim** (`src/v2/proof/gate.ts`): v1's `src/legacy-capture.ts` on its own
>   buffers — the committed `packages/boids-3d/src/boids.wgsl`, the 32-byte parameter block, the
>   seed-42 `boids-ic-seed42.bin` (resolved from the bundle, `src/sim-root.ts`; v1's page-relative
>   path would 404 from `v2/`), 1,000 steps in their own submits, v1's manifest. `pipeline.py validate
>   --sim boids-3d` passes on both pages, run twice: every capture (v1 and v2, both runs) and two
>   captures of main's v1 page (built from `git archive origin/main`) are the same file, sha256
>   `6c6651a2…`. Step 100 within 3.19 × 10⁻³ of the f64 reference (32% of `T_BOIDS_SHORT` 10⁻²),
>   fastest boid 3.0. The page is ready once the gate kernel compiles (the driver saw 11–27 ms) and
>   compiles the flock and renderer after (live at ~200 ms).
> - **The model is v1's** (`src/v2/model/flock.ts` imports `src/grid.wgsl`, `src/starling.wgsl` and
>   `src/stats.wgsl` unchanged, and v1's presets). Unit tests pin the seeded flock and the uniforms
>   byte for byte to v1's `reset()` and `writeParams()`. One fix, not a model change: v1 wrote every
>   step's uniforms into one buffer and submitted two steps at once, so both read the second write;
>   v2 gives each step its own slot on a dynamic-offset ring. 96 steps give the same bytes in submits
>   of 32, 1 and 7, and the same seed gives the same bytes across page loads.
> - **Grid ≡ brute force, in the page** (Prove): the live kernel with its 27-cell loop rewritten, by
>   text, as a loop over every bird. Selection is lexicographic in (distance², id), so the two give the
>   same bytes: 8 of 8 steps identical on 2,048 seeded birds and on 2,048 packed beyond a corner of
>   the grid (clamped cells), 7.00 neighbours each. The scatter checks as an exact permutation on the
>   live 32,768 (each id once, in its own cell; in one run the fullest of 1,305 occupied cells held 92).
> - **The look.** Each bird is a flat 3D Gaussian (wingspan, length, thickness as ±2σ, banked), so it
>   projects to a 2D Gaussian; its coverage, 2π√det of that, shrinks edge-on. The footprint adds a
>   0.75 px pixel filter and is normalised over the very pixels written, into a u32 fixed-point τ
>   buffer (`atomicAdd`: exact and order-free; F3's rgba16float `Points` would stop adding faint
>   splats). The sky shows through as e^(−τ). Dusk, cirrus, tree lines, land, a lake strip and the
>   reed bed are procedural (`render/dusk.wgsl`, `render/reeds.wgsl`); no bloom, no artwork. The flock's
>   core reaches τ 2.7–3.1 (transmittance 0.07–0.045), with 18–21% of the frame under some optical
>   depth (two acceptance runs).
> - **The flicker risk, measured.** With the flock held still, the eye dollies 0.04 m a frame for 120
>   frames and Σ τ over the screen is read every frame. The total rises 4.8% (nearer birds), smoothly:
>   frame-to-frame jitter about the trend 2.7–2.8 × 10⁻⁷ rms, worst residual 3.1–3.3 × 10⁻⁶ (two runs).
>   The control, analytic normalisation with a 0.3 px filter (a plain small sprite), jitters 2.1 × 10⁻⁵,
>   74–76× more. The acceptance run holds the shipped splat to 10⁻⁴.
> - **v1's flock is not a murmuration yet** — a finding. Across all six presets at 32,768 birds it mills
>   as a loose cloud over the roost: polarization 0.007–0.06 (field flocks: 0.96 ± 0.03, Cavagna et al.
>   2010), rms axes about 59 × 56 × 14 m, nearest neighbour 2.4 m (field: about a wingspan, Ballerini
>   et al. 2008). Read at 2 m per model unit (v1's birds cruise at 4–9 units/s). So the medium is
>   lace-dark in its core rather than black, and birds are drawn 4× a starling's size (Tune, Learn's
>   limits). Learn labels the observables model behaviour and says the flock mills. Order, the
>   falcon and its alarm wave are M1's model work.
> - **Birds per tier, measured then declared:** T3 32,768, T2 16,384, T1 4,096 (v1's software safe
>   mode). v1's kernel reads every candidate in the 27 cells around a bird, because its alarm rule
>   takes the most alarmed of all visible neighbours, not only the seven. A step costs about 4.4–5 ms
>   at 32,768; with the flock spread over the roost, 65,536 ran at 5.9 fps (38 steps/s, GPU 59 ms
>   p50) and 100,000 at 2.4 fps (18 steps/s, GPU 409 ms). The spec's 100k needs kernel work
>   (cell-ordered state, or an alarm rule bounded to the selected neighbours) and waits for M1.
> - **Frame rate** (`?bench=1`, after the flock has spread). T3: 60 fps and 120 steps/s in three runs,
>   GPU 7.0–10.2 ms p50 / 13.9–16.8 ms p90; in the quietest, sim 8.8 ms a frame (two steps), dusk
>   0.18, optical depth 0.16, composite and reeds 0.04, exposure 0.02 — the whole picture under half a
>   millisecond. T2 and T1 held 60 fps; their GPU times are not comparable (with little work
>   the GPU clocks down: the dusk pass, whose cost is only resolution, took 0.6 ms at T1). Runs taken
>   while other sessions' browsers used the same GPU dropped T3 to 40 and 4 fps with the page's own GPU
>   time unchanged; the 60 fps runs had the GPU to themselves. SwiftShader (Playwright's Chromium
>   with lavapipe's ICD, T1, 4,096 birds): ready 80 ms, live 1.7 s, 9.1 fps — a frame of about 110 ms
>   (sim 41 ms for two steps, reeds and composite 21, dusk 18, exposure 5) — with the flock slowed to
>   19 steps/s, as T1's cap of two steps a frame intends (uncapped, it drew 3.9 fps).
> - **Acceptance and layout:** `v2-acceptance.mjs` 33/33; `web/tools/check-studio.mjs` 0
>   problems and 0 axe violations at 390, 820, 1440 and 200% zoom; `__bpDebug().space` is `"3d"`.
> - **Shared code:** `View3D.update` takes any camera with a view, projection, eye and clip planes
>   (a `Pick` of `OrbitCamera`), so Murmuration's camera stands on the ground (`render/ground-camera.ts`:
>   a drag turns your head, the wheel zooms the field of view, an idle gaze follows the flock, never
>   under reduced motion). Nothing else in `web/` changed. The τ splat, the dusk and the ground camera
>   are sim-local, candidates for `@bp/render` when a second sim needs them.

## Verdict on the prototype

The July rebuild spec ([feature-expansion-spec.md](../../../packages/boids-3d/web/feature-expansion-spec.md))
got the science right — topological neighbours (k ≈ 7), a separate one-neighbour avoidance,
bank-coupled flight, roost attraction, propagating threat response — and the shipped lab
implements much of it at 32k birds and 60 fps. What fails is the **picture**:

- Birds render as dim blue specks on a dark field with a muddy red smear; there is no
  contrast, so the flock's density — the thing people recognise — is invisible.
- No sense of scale or place: no horizon, no ground, no sky.
- Tools and cinematography live in a dropdown panel; the falcon is a mode, not a character.
- **Keep:** the model and its spec, the counting-sort grid with brute oracle, GPU
  observables without readback, the legacy Reynolds canonical as a regression path, the
  lavapipe observable-gate posture.

## The experience

**Pitch:** *A dusk sky, a hundred thousand starlings, and a falcon you fly.*

**First ten seconds:** standing in a reed bed at sunset. The sky is a bright gradient from
amber to violet; a dark cloud of birds pulses and folds above the horizon, thickening to
near-black where it turns, thinning to lace at the edges. Wind in the reeds. No UI but a
quiet title.

**Signature moment — The Falcon:** press F and you are the falcon, a small dark shape you
steer with the pointer (or WASD). Diving at the flock tears a dark wave through it; the
flock splits around you and heals behind. The escape wave propagating away from the attack
point is the money shot.

**The story (default scene director, ~3 minutes, loops):** small groups arrive and merge →
the murmuration displays and grows → a falcon attack (auto, if the visitor hasn't
attacked) → the sun sets further, the sky deepens → the flock descends in a funnel into the
reeds and the sky is empty → birds rise again. Never settles; every phase is natural.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **Dusk** (default) | 100k birds, the story director | "Watch, or press F to hunt." |
| **The Attack** | falcon-focused, replays an attack from a saved state | "Where does the wave start? Where does it go?" |
| **Ride Along** | camera inside the flock, following one bird | "Seven neighbours. That's all it sees." |
| **Rules Lab** | split screen: topological vs metric neighbours | "Same birds, different rule. Which looks real?" |
| **Couzin States** | swarm → torus → parallel as zones change | "Turn the dial: a ball, a ring, a river." |
| **Roost** | the descent into the reeds, slowed | "How do 100k birds land at once?" |

### Tools

*Falcon* (fly it), *Gust* (paint wind), *Watch one* (follow a bird; shows its 7 neighbours
as faint lines), *Camera* (ground / orbit / ride), *Time of day* (sun angle).

## The model

- Keep `starling-topological-v1` from the July spec: kSocial = 7, kAvoid = 1, blind rear
  cone, max turn rate, bank-coupled turning, cruise-speed relaxation, altitude preference
  over a roost, reaction delay, threat state with propagation and refractory time.
- Falcon: a kinematic agent with speed and turn limits (player-controlled or scripted);
  birds within detection range enter the alarmed state; alarm propagates by neighbour
  contact, not by global broadcast (Attanasi et al. 2014).
- Roost descent: a time-varying roost attractor plus a landing state (birds that reach the
  reed band below a height are parked and fade; they re-enter on rise).
- Neighbour search: counting-sort grid, exact k-nearest within a cap (from the July spec),
  brute oracle for small N.

## The look

The flock is rendered **as a medium**, not as dots:

- **Far field:** each bird contributes projected coverage to a float *optical depth*
  buffer (an anti-aliased splat sized to its projected wingspan, minimum sub-pixel
  coverage preserved). The sky is composited through transmittance `exp(−τ)`, so dense
  regions go near-black and edges become lace — exactly how murmurations look, with no
  aliasing or popping.
- **Near field** (< ~40 m): instanced low-poly birds with procedural wingbeat and bank,
  dark silhouette shading with a faint rim light from the sky.
- **Sky:** analytic dusk sky (sun below the horizon, Rayleigh/Mie-style gradient), a
  high cirrus noise layer lit from below, haze towards the horizon.
- **Ground:** silhouetted reeds/trees/pier in the foreground (procedural or a small SVG
  set), slight parallax; optional water reflection of the sky.
- Motion blur on near birds only; no bloom. Colour palette is the sky's — chrome stays
  neutral and minimal (Dusk shows only a title and the transport).
- Audio (opt-in): wind bed; a soft whoosh when the flock passes near the camera.

## The proof

- Keep the existing gates (legacy Reynolds canonical; the shipped lab's observable gate on
  lavapipe) and port the gated kernels exactly.
- Keep the in-page grid ≡ brute neighbour identity for small N.
- Observables (shown in Learn, not gated): polarization, milling, flock thickness/aspect,
  nearest-neighbour distance, alarm propagation speed (measured from the attack point),
  compared qualitatively with the cited field results and labelled *model behaviour*.

## Performance targets

| Tier | Birds | Target |
|---|---|---|
| T3 | 100,000 | 60 fps (sim + optical-depth render) |
| T2 | 32,000 | 60 fps |
| T1 | 10,000 | 30–60 fps |

## Risks and open questions

- Optical-depth splatting must keep total coverage stable as birds move between pixel
  footprints, or the flock flickers; test with a slow camera dolly.
- The story director must never fight the visitor: any input pauses scripted events for
  a minute.
- Foreground silhouettes need a licence-clean source (procedural preferred).

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Existing model in the shell with the sky, ground and optical-depth flock; gates ported |
| M1 | Falcon as a playable agent with alarm propagation; near-field instanced birds |
| M2 | Story director (arrival → display → attack → roost); Ride Along; Watch one |
| M3 | Rules Lab, Couzin States, audio, posters/loops |

## References

- Ballerini et al. 2008, *Interaction ruling animal collective behavior depends on topological rather than metric distance*, PNAS — [PMC2234121](https://pmc.ncbi.nlm.nih.gov/articles/PMC2234121/)
- Hildenbrandt, Carere & Hemelrijk 2010, *Self-organized aerial displays of thousands of starlings* — [arXiv:0908.2677](https://arxiv.org/abs/0908.2677)
- Attanasi et al. 2014, *Information transfer and behavioural inertia in starling flocks*, Nat. Phys. — [PMC4173114](https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/)
- Papadopoulou et al. 2026, *Mechanisms driving collective escape patterns in starling flocks* (preprint) — [bioRxiv 2024.10.27.620514](https://www.biorxiv.org/content/10.1101/2024.10.27.620514.full.pdf)
- Couzin et al. 2002, *Collective memory and spatial sorting in animal groups*, J. Theor. Biol. 218
