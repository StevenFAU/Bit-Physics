# 03 — Swarm (2D collective motion)

> Part of [Rebuild v2](README.md). Replaces `packages/boids-2d/web` (the embedded v4 lab).
> Wave A. Status: planning, v0.1, 2026-10-17. Unmeasured targets.
>
> **Implementation status (2026-10-24): M0 built** as the `v2/` page of `packages/boids-2d/web`
> (served at `/sims/boids-2d/v2/`, gated through `pipeline.py` `PAGES`; v1 unchanged).
>
> - **How boids-2d is gated (found, then kept).** `verify.py` `_gate_boids_2d` (new_canonical)
>   checks a small capture built on the CPU in f64: two 256-agent Reynolds runs (noise 0 and
>   0.55, 120 steps) and a 32² pressure-projection probe. Two runs must be byte-identical and the
>   observables bounded. There is no Python reference, golden or committed canonical; the GPU
>   kernel's exactness was proved only in the v4 lab's own Verify panel. The v2 page ports that
>   capture verbatim (`src/v2/proof/gate.ts`; `test/gate-port.test.ts` compares the text with
>   `src/main.ts`). `pipeline.py validate` passes on both pages, and all four captures (v1 and v2,
>   run twice each) are byte-identical: φ calm 0.3553, noisy 0.0609, max speed 0.012,
>   divergence 0.249 → 0.116.
> - **The GPU kernel.** The v4 lab's single-source WGSL is byte for byte in
>   `src/v2/model/kernel.ts`: the rule body, the brute-force wrapper and the integer φ/m reduction
>   (`test/kernel-port.test.ts` compares them with `index.html`). Only the counting-sort wrapper
>   is new: it walks the shared `CountingSort`'s `cellStart`/`order`. On the same GPU, the v2
>   kernel reproduces the v4 lab's trajectory SHA-256 (4,096 fish, 60 steps, seed 42) for brute
>   force and for sort, at η = 0 and η = 0.2. In-page, brute ≡ sort and run-twice are re-earned
>   as Prove cards, and the counting sort matches its CPU reference on the live million.
> - **Scale.** T3 1,000,000 fish (T2 250k, T1 60k). The ocean is sized at v4's density (562.5
>   fish per unit², v4's 4,000 agents on its 16:9 world) with the viewport's aspect. At 1280×720
>   that is 56.2 × 31.6 units and a 535 × 301 grid.
> - **Measured performance** (RX 6800 XT, snap Chromium headless, `?bench=1`, 1280×720):
>   1,000,000 fish at 60 fps and 60 steps/s. Frame p50/p90/p99 is 16.7/16.7/16.8 ms, render
>   scale 100%, no governor step-downs (three runs). The GPU-timestamp p50 read 5.7, 5.8 and
>   10.8 ms in those runs; with two frames queued those timestamps overlap, so they over-count.
>   - At full clock one step is about 4 ms: keys + sort 0.46 ms, the rule kernel 3.6 ms.
>   - **Memory reorder.** Every 16 steps the live ocean moves its fish into cell order (an id
>     rides along), which takes the rule kernel from 13.2 to 3.6 ms. Within a cell, fish are
>     ranked by id, so the layout is deterministic. With η = 0 a reorder changes no fish's path:
>     a Prove card checks 65,536 fish over 120 steps, fish by fish. The kernel keys its noise by
>     memory slot, so with η > 0 the run differs from an unsorted one, but it is still the same
>     on every replay (same seed, same bytes across page loads at 1M fish, η = 0.15).
>   - **GPU clock trap.** With one frame in flight the GPU idles between frames and the RX 6800
>     XT stays at its 500 MHz state. The same step then reads ~16 ms and the page runs at 30 fps.
>     Two frames in flight let it clock up. With two frames queued, per-pass timestamps overlap
>     and read high, so the governor watches the frame interval instead (22 ms budget, 3 s
>     warm-up). `GpuProfiler.begin(tag)` (additive) returns each frame's step count as
>     `frameTag`, so a catch-up frame never reads as a slow step.
> - **Open Water + the shark.** The shark is v4's pointer "herd" force — the fear term already
>   in the kernel (push away, linear falloff, 0.004 per step, ×1.8 while lunging) — so the kernel
>   is untouched. It chases the pointer with a short lag; its size sets the fear radius (default
>   14 r). Holding it over the densest school clears its half-radius from 2,669 fish to 0 in
>   2.5 s.
> - **Look.** Night ocean: domain-periodic caustics (Worley cell edges on a warped lattice) and
>   fish as oriented glyphs with a tail flick. Below ~7 px a fish becomes a soft dot whose light
>   is scaled to its true area. Silver, or heading on a constant-lightness OKLab hue circle. The
>   shark is a soft shadow with a faint rim and a ring at its fear radius. AgX, measured exposure
>   (99th percentile → 0.5), bloom 0.06.
> - **Shell.** Shark and Look tools; Tune (alignment, cohesion, separation, reach, top speed,
>   panic η, fish colour); save / restore / A-B compare (the save point's flock left of the
>   split); share links; Learn (three depths, φ and m sparklines from the exact reduction,
>   performance, limits). Prove has six cards: the release gate re-run in-page, brute ≡ sort,
>   run twice, counting sort ≡ reference, the φ series at full scale run twice, and the reorder
>   is exact. `web/tools/check-studio.mjs` passes at 390 / 820 / 1440 px and 200% zoom with
>   zero axe violations. `packages/boids-2d/web/v2-acceptance.mjs` passes 31/31.
> - **Not in M0.** The alarm-propagation predator model (a model change, M1+); the
>   distribution-level φ(η) check against a CPU reference (with the Order Dial, M1); the
>   three-LOD renderer and motion trails (M1). The fear term does not reach across the ocean's
>   wrapped edge (v4's kernel takes one point).

## Verdict on the prototype

The v4 lab is the richest prototype in the portfolio and the source of most ideas here.

- **Keep:** the million-agent counting-sort broadphase; i32 fixed-point neighbour sums
  (run-twice and brute ≡ sort trajectories byte-identical on one device); Vicsek polarization
  φ, milling m, correlation length ξ and susceptibility χφ as live instruments; the noise
  sweep across η and seeds; two-way coupling to a stable-fluid field; colour-by-observable
  (heading, order, speed, density, fluctuation, curl, species); species coupling matrices;
  hover-to-steer; the parameter link.
- **Drop:** a 3,969-line single HTML file with its own UI, its own panel and its own
  shortcut scheme that ignores the shell; the rainbow heading colours; the CPU fallback (a
  CPU flock of a few thousand agents is not the product; the no-WebGPU card replaces it).
- **Lesson:** the lab already *measures* collective motion beautifully; what it lacks is a
  reason to care in the first minute and a role for the visitor beyond poking.

## The experience

**Pitch:** *A million fish that school, mill and scatter — and you are the shark.*

**First ten seconds:** an ocean-dark field seen from above, faint caustics drifting. Shoals
of small luminous fish wheel in tight schools; one school folds into a rotating mill. The
cursor is a shadow; when it moves near, the school *flash-expands* and re-forms behind it
(the fountain effect). No instructions needed.

**Signature moment:** *The Order Dial.* One big dial labelled *calm ↔ panic* (noise η).
Turning it slowly melts a polarized school into a disordered swarm and back; the live
polarization trace and susceptibility peak make the phase transition visible, and every
(η, density) point the visitor visits is plotted on a growing phase-diagram map.

### Scenes

| Scene | Model | Prompt |
|---|---|---|
| **Open Water** (default) | metric boids + predator response, 250k–1M fish | "Hunt them. Watch the school split and heal." |
| **The Order Dial** | Vicsek, live φ/χφ, phase map | "Turn panic up until order breaks." |
| **The Mill** | Couzin zones in the milling regime (after Tunstrøm et al.) | "A school that swims in circles. Push it out." |
| **Food Chain** | plankton field (grows, diffuses) → fish (graze) → sharks (hunt), births/deaths | "Populations rise and crash. Keep them alive." |
| **Current** | two-way coupled stable fluid; fish drift and stir the water | "Paint a current. The school rides it — and pushes back." |
| **Eyes Only** | vision-based model (Bastien & Romanczuk): agents respond only to their visual projection | "No alignment rule at all. They still school." |
| **Species Matrix** | 2–6 species with a signed cohesion/alignment matrix (v4's coupling matrices) | "Who chases whom? Edit the matrix." |

### Tools

*Shark* (predator follows the pointer; size sets fear radius), *Bait* (attractor that
depletes as fish feed), *Current* (paint fluid momentum; Current scene), *Rock* (obstacle),
*Release* (drop a school), *Watch one* (follow a single fish; shows its neighbours and, in
Eyes Only, its 1D retina strip).

### Learn

- Callouts: "flash expansion", "mill", "information wave" — triggered by observables
  (φ drop, m rise, local density jump).
- Instruments (from v4): φ, m, ξ, χφ, cluster count / giant component, mean nearest-neighbour
  distance, kinetic energy, fluid residual ∇·u; Food Chain adds population sparklines.
- The phase map: points coloured by measured φ, with the visitor's path through it.

## The model

- **State:** position, velocity, species, energy (Food Chain), RNG counter; struct-of-arrays.
- **Neighbours:** uniform grid, counting sort (histogram → scan → scatter) every step;
  exact, no per-cell capacity. Morton-ordered cells for locality (stretch).
- **Brains** (one kernel interface): metric Reynolds boids; Vicsek (angular noise, unit
  speed); Couzin zones (repulsion, orientation, attraction with blind angle and max turn);
  vision-based (visual-field projection in N angular bins, derivative terms per Bastien &
  Romanczuk); species matrix (per-pair signed gains).
- **Predator response:** fear term with a radius and a propagated *alarm* state (agents
  that see an alarmed neighbour become alarmed for τ seconds) so escape waves propagate.
- **Fluid:** v4's two-way coupled stable-fluid grid (agents feel u; agents deposit
  momentum back), kept as an option.
- **Food Chain:** plankton field with logistic growth + diffusion; fish energy budget
  (graze, swim cost, reproduce above threshold, die at zero); sharks likewise. Births reuse
  dead slots (free-list via atomic counter) so counts are bounded.
- **Determinism:** keep i32 fixed-point accumulation of neighbour sums; noise from a
  counter hash of (seed, step, agent).
- **Scale:** T3 1M agents, T2 250k, T1 60k (Open Water); Food Chain capped lower (measure).

## The look

- Art direction: **night ocean from above** — deep blue-black water with slow caustics,
  fish as small oriented glyphs with a tail flick at close zoom, streaks at mid zoom, a
  density/heading field at full zoom-out (three LODs chosen per pixel footprint).
- Colour: heading on a *cyclic perceptual* map (no rainbow), or a single silver with
  species tints. Motion trails from a float accumulation buffer, short and subtle.
- Predator as a soft dark shadow with a faint ring; bait as warm particles.
- Alternative skin *Dusk sky* (birds from below) for the Vicsek scenes.

## The proof

- Keep the `new_canonical` gate (run-twice browser observable capture) and the in-page
  brute ≡ sort SHA identity row; port the gated kernel exactly.
- Distribution-level checks: at small N, the GPU φ(η) curve over K seeds must match the
  CPU reference curve within the declared band (chaos makes pointwise comparison
  meaningless; distributions are the claim — as v4 already states).
- Food Chain is labelled *illustrative ecology*; no claim beyond bounded populations.
- Vision-based scene: labelled as a reimplementation of a published model; reproduce one
  qualitative result from the paper (ordered motion emerges) as a regression test.

## Performance targets

| Tier | Agents (Open Water) | Target |
|---|---|---|
| T3 | 1,000,000 | 60 fps, 1 step/frame |
| T2 | 250,000 | 60 fps |
| T1 | 60,000 | 30–60 fps |

## Risks and open questions

- Vision-based model cost: N angular bins per agent over neighbours within a range; cap
  the range and bins (e.g. 64 bins) and measure.
- Food Chain stability: tune so populations oscillate without extinction for 10+ minutes;
  add a gentle immigration term rather than hidden resets.
- LOD transitions must not pop; cross-fade by pixel footprint.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | v4 kernels ported into the shell at 1M agents; gate passes; Open Water with shark tool |
| M1 | Order Dial with phase map; Mill; three-LOD renderer |
| M2 | Food Chain; Current (fluid coupling) |
| M3 | Eyes Only; Species Matrix editor; Watch-one camera; posters/loops |

## References

- Reynolds 1987, *Flocks, herds and schools* — [red3d.com](https://red3d.com/cwr/papers/1987/boids.html)
- Vicsek et al. 1995, *Novel type of phase transition in a system of self-driven particles*, PRL 75 — [doi:10.1103/PhysRevLett.75.1226](https://doi.org/10.1103/PhysRevLett.75.1226)
- Couzin et al. 2002, *Collective memory and spatial sorting in animal groups*, J. Theor. Biol. 218
- Tunstrøm et al. 2013, *Collective states, multistability and transitional behavior in schooling fish*, PLoS Comput. Biol. — [doi:10.1371/journal.pcbi.1002915](https://doi.org/10.1371/journal.pcbi.1002915)
- Bastien & Romanczuk 2020, *A model of collective behavior based purely on vision*, Sci. Adv. — [PMC7002123](https://pmc.ncbi.nlm.nih.gov/articles/PMC7002123)
- Existing 2D spec with the science corrections (Vicsek symbol, χ attribution, η convention) — [verification-demo-spec.md](../../../packages/boids-2d/web/verification-demo-spec.md)
