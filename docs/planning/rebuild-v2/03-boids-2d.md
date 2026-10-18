# 03 — Swarm (2D collective motion)

> Part of [Rebuild v2](README.md). Replaces `packages/boids-2d/web` (the embedded v4 lab).
> Wave A. Status: planning, v0.1, 2026-10-17. Unmeasured targets.

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
