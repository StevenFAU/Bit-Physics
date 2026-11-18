# 07 — Murmuration (3D starlings)

> Part of [Rebuild v2](README.md). Replaces `packages/boids-3d/web` (Murmuration Lab).
> Wave B. Status: planning, v0.1, 2026-10-17; M0 built 2026-11-18 (below). Elsewhere, targets are unmeasured.
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
