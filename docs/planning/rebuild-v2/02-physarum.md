# 02 — Slime Mould (physarum transport networks)

> Part of [Rebuild v2](README.md). Replaces `packages/physarum/web`. Wave A.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.
>
> **Implementation status (2026-10-23): M0 built** as the `v2/` page of `packages/physarum/web`
> (served at `/sims/physarum/v2/`, gated through `pipeline.py` `PAGES`; v1 unchanged).
>
> - **Gate.** The v1 capture path is ported verbatim on its own buffers (`src/v2/proof/gate.ts`).
>   `pipeline.py validate` passes on both pages, run twice: byte-identical, total mass 22499.9962
>   against 22500 (relative 1.7e-7, budget 1e-3).
> - **Live solver.** The gated kernel restructured for millions of agents (`src/v2/model/`):
>   - agents packed as vec4;
>   - a row-major trail;
>   - apply + diffuse fused, with two alternating deposit buffers;
>   - compare-based stencil wraps.
>
>   The arithmetic stays term for term. On the canonical run it reproduces the gated kernel's
>   trail byte for byte over 5,000 steps, including 78 re-sorts (an in-page Prove card).
>   Long-running scenes add two flags the gated scene leaves off:
>   - positions wrap back into the dish (the gated kernel lets them grow, losing f32 precision
>     over hours);
>   - headings are renormalised after a turn. WGSL `sin`/`cos` are only 2⁻¹¹ accurate on some
>     drivers, so |h| could drift ~1e-3 per turn there.
> - **Density-coupled grid.** The tier sets the agent count (T3 2M, T2 500k, T1 150k). The grid
>   is N / 0.4768 cells (the spec's 2M-on-2048² density) shaped to the viewport. At 1280×720 on
>   the RX 6800 XT: 2,000,000 agents on 2728 × 1536.
> - **Look.** The trail, normalised by its exact equilibrium mean d·ρ·(1−α)/α, becomes emissive
>   HDR light on a near-black agar:
>   - a log ramp in an *ember* or *deep sea* palette;
>   - agent sparks as additive points;
>   - a box-filtered mip for zoomed-out views.
>
>   It is tone-mapped with AgX under measured exposure (clamped to 0.25–1.5× so an empty dish
>   stays black) and bloomed by the new shared bloom in `@bp/render`.
> - **Sorting.** Agents are reordered by 8 × 8-cell tile every 32 steps with the new shared
>   `CountingSort` in `@bp/gpu`. The step pass drops from 1.29 to 0.80 ms per frame (−38%) for a
>   0.34 ms reorder. The gain is flat between every 8 and every 128 steps. A reorder is a pure
>   permutation, so it never changes a byte of the trail.
> - **Measured performance** (RX 6800 XT, Chromium + Dawn/Vulkan, `?bench=1`): 60 fps, frame
>   p50/p90 16.7/16.7 ms and 120 steps/s at 1280×720, 1920×1080 and 2560×1440.
>   - GPU per frame: 1.6 ms (p50, the GPU at full clock) to 3.9 ms (when the driver downclocks
>     under this light load).
>   - Passes at full clock, 1280×720: steps 0.81 ms (2 steps), prep 0.12, glow 0.35, bloom 0.07,
>     exposure + composite 0.05.
>   - At 8× speed: 778 steps/s at 51 fps.
> - **Shell.** Look and Probe tools; Tune (the five Jones numbers in plain words, plus the
>   palette); save / restore / A-B compare; share links; Learn (three depths with kernel links,
>   a live mass instrument, performance, limits). Prove has four cards:
>   - mass balance;
>   - run twice;
>   - live ≡ gated;
>   - mass balance at full scale (relative ~1e-7 at 2M agents).
>
>   `web/tools/check-studio.mjs` passes at 390 / 820 / 1440 px and 200% zoom with zero axe
>   violations. `packages/physarum/web/v2-acceptance.mjs` passes 24/24.
> - **Live mass check.** The full-scale card compares the trail with the closed form's
>   finite-time prediction, M ← (M + d·N)(1 − α) per step in f64 through every parameter
>   change, restore and re-scatter — not with the equilibrium after a fixed settling window,
>   which a slow fade (α = 0.02 is still 0.19% short after 300 steps) would fail.
>
> **M0 findings (corrections to this spec):**
>
> - **Jones's Table 1 values do not hold a network at this density.** They knit one for a few
>   seconds, then break into separate straight rods within ~30 s: this model has no crowding rule
>   and no random turns, so agents in a strand fall into step and march straight. A survey over
>   turn angle, reach, step and fade (eight sets) found the sensor reach decides it:
>   - reach 18 with Table 1's other values forms a true polygon network that coarsens slowly;
>   - reach 9 always makes rods.
>
>   The default scene *The network* therefore uses reach 18. *Jones's Table 1* shows the gated
>   values at full scale, labelled as such. Prove names any parameter that differs from the gated
>   ones. The personality pad (M1) should be calibrated against this.
> - **A colony released at the centre never spreads.** Agents are captured by the strongest
>   trail, so a dense disc or ring collapses into a stable hot ring and only four lattice-aligned
>   jets escape. First Light (M1) needs its food crumbs to pull a colony outward; M0 ships no
>   colony scene.
> - **Density sets the scale, not the morphology.** A survey from 0.06 to 0.95 agents per cell
>   gave the same sequence (network, then rods) at a finer or coarser scale. The spec's 0.477
>   puts about one cell per screen pixel at T3 and is kept.
> - **The network prunes itself in about a minute** (polygons by ~2,000 steps, mostly rods by
>   ~7,000). Per "nothing settles into nothing", the untouched network scene re-scatters from the
>   next seed after 7,200 steps, with a short fade. Any edit, save point or pause holds the dish.
> - **Headless frame rate.** Two early benchmarks read 16–18 fps with ~1 ms of GPU work; the
>   same runs later held 60 fps, and the Turing Patterns v2 page read the same 18 fps at the same
>   time. Treat a low fps with low GPU time as contention on a shared GPU, not as the page's cost.
>
> Not yet: the personality pad, the M1–M3 scenes and tools (food, light, walls), network
> extraction and scoring, morphology regression tests, multi-species channels, posters and loops.

## Verdict on the prototype

The owner's verdict: *never an intuitive layout, and it would not do anything consistent.*
The review and the code agree on why:

- **It booted at 500 agents** on a 256² grid — five wisps — while the card promised a
  million. (Patched to 200k in the 2026-10 fix batch; the deeper problems remain.)
- **The controls are the model's internals.** `Δφ`, `L_sense`, `L_move`, `deposit d`,
  `decay α` interact non-linearly; moving one rarely produces a predictable change, so the
  visitor can't steer towards anything.
- **Three menus of presets** (templates, science scenarios, swarm sizes) that silently
  override each other — a scenario forces the canonical grid, a swarm change clears food.
- **No goal.** Food scenarios existed but were buried; nothing told you what a "good"
  network is or whether yours got there.
- **Keep:** the u32 fixed-point atomic deposit (order-independent, run-twice byte
  identical), the mass-balance invariant and the canonical capture; the insight that the
  grid must scale *with* the swarm to keep density constant; the MST/Steiner overlay idea.

The Sandbox prototype (`~/Projects/Sandbox/physarum.html`, 250k–2M agents, a fire palette,
attractant/repellent/food tools, four named regimes) is a much better starting point for
the look and the tools than the shipped version.

## The experience

**Pitch:** *Feed a slime mould and watch it build the road network — the same way, every time.*

**First ten seconds:** a dark field with a dozen glowing food crumbs. A colony is released
in the centre and immediately starts exploring in fine, luminous filaments; within ten
seconds tubes thicken towards the nearest crumbs and thin elsewhere. It looks alive.

**Signature moment:** *Connect the Cities.* Food is placed at city positions (a stylised
map — Tokyo region after Tero et al., or the visitor's own clicks). The mould explores,
then prunes to a network. A score card compares it against the minimum spanning tree and
the Steiner tree: total length, fault tolerance (how many links can fail before a city is
cut off), and transport distance. Rewind, change one parameter, re-run, compare A/B.

### Why it will be consistent

1. **Personalities, not parameters.** The visitor picks a *species personality* from a 2D
   pad: *Explorer ↔ Forager* (sensor angle and step) × *Fine ↔ Bold* (sensor distance,
   deposit). Every point on the pad maps to a tested parameter set; named corners
   (*Lace*, *Veins*, *Rivers*, *Cells*) are the four regimes that reliably appear.
2. **Density is held constant.** Agent count and grid size move together (agents per
   cell fixed per personality), so the same personality looks the same on a phone and a
   desktop — only finer.
3. **Seeded scenes.** Every scene starts from a fixed seed; "Restart" reproduces it.
4. **One preset system.** Scenes set everything; personalities modify a scene; nothing
   silently overrides something else.
5. **Each scene is tested** at T1/T2/T3 with a screenshot baseline and a morphology metric
   (§ proof), so "it did something different this time" becomes a failing test.

### Scenes

| Scene | Setup | Goal / prompt |
|---|---|---|
| **First Light** (default) | 12 crumbs, colony in centre | "It's hungry. Add food and watch it reroute." |
| **Connect the Cities** | 20–36 food nodes on a map; MST/Steiner/score card | "Can a brainless mould beat a planner?" |
| **The Maze** | walls as repellent; food at entrance and exit (after Nakagaki 2000) | "It will find the shortest path. Block it." |
| **Territories** | 3 colonies, each avoids the others' trails | "Who claims the dish?" |
| **Light Avoidance** | a movable light (repellent) | "Shine the light; it retreats and rebuilds." |
| **Lace** | high-density free exploration, the art scene | "Nothing to solve. Just watch." |
| **Cosmic Web** (stretch) | 3D colony fitted to a galaxy catalogue sample (MCPM) | "The same rules trace the universe's filaments." |

### Tools

*Food* (persistent attractant crumb), *Light* (repellent, drag to move), *Wall* (draw
obstacles), *Release* (drop a new colony), *Erase* (clear trails in a brush), *Probe*
(trail strength, local flow direction, agents passing per second).

## The model

- Jones (2010) agent model: each agent senses the trail field at three points
  (left/centre/right at sensor angle θs and distance ds), turns by θr towards the strongest,
  steps by s, and deposits. The field diffuses (3×3 mean) and decays each step.
- **Species channels:** up to 4 colonies, each depositing into its own channel; each senses
  `own − λ·others` (λ is the *rivalry* setting) — the multi-species extension common in
  physarum generative art (verify attribution before naming an artist in copy).
- **Food and light:** food nodes add a constant deposit to a separate attractant channel
  agents also sense; light raises local decay and adds a repellent term.
- **Fixed-point deposit:** keep the u32 ×65536 atomic deposit (order-independent sums).
- **Scale:** T3 2M agents on 2048², T2 500k on 1024², T1 150k on 640² — at a declared
  agents-per-cell for each personality (measure M0).
- Agents sorted by cell every N steps (counting sort, shared with Swarm) for cache coherence.
- **Network extraction (for scoring):** threshold + skeletonise the trail field on GPU,
  build a graph between food nodes (CPU, low rate), compute length, fault tolerance and
  mean shortest-path stretch; compare to MST and a Steiner-tree heuristic on the same nodes.
- **Cosmic Web (stretch):** 3D MCPM-style agents (probabilistic turning, 3D sensing) on a
  256³ field, rendered with the shared volume renderer.

## The look

- Art direction: **bioluminescence**. Near-black background with a faint agar texture;
  trails rendered in HDR with a warm *ember* palette (Sandbox look) or cold *deep sea*
  palette, tone-mapped with measured exposure so dense trunks don't clip.
- Two-layer render: a soft glow from the trail field plus a fine layer of individual agent
  sparks (a sample of agents as points), which is what makes it read as alive.
- Territories: each colony a distinct hue with additive mixing at borders.
- Food crumbs as small warm discs; light as a soft cone with a visible halo; walls as matte
  dark relief.

## The proof

- Keep the existing `new_canonical` gate: the canonical 500-agent / 256² seed-42 capture,
  u32 fixed-point deposit, run-twice byte identity, mass-balance invariant.
- New closed-system invariant per species channel: total deposited mass follows
  `deposit·N·(1−α)/α` at equilibrium (the existing invariant, per channel).
- New **morphology checks** (not gates — regression tests): per scene and tier, after T
  steps, network length per area and node degree histogram fall within a recorded band.
- Network scores are labelled *computed from your run*; the "beats the planner" claim is
  only shown when measured on that run.

## Performance targets

| Tier | Agents | Grid | Target |
|---|---|---|---|
| T3 | 2M | 2048² | 60 fps, 2 steps/frame |
| T2 | 500k | 1024² | 60 fps |
| T1 | 150k | 640² | 30–60 fps |

## Risks and open questions

- Personality pad calibration is empirical work: sweep the 2D pad at each tier offline and
  keep only points whose morphology metric is stable across seeds.
- Skeletonisation on noisy trails can produce spurious links; score only on the
  thresholded, pruned graph and show the graph overlay so the score is inspectable.
- Cosmic Web needs a licence-clean galaxy sample (SDSS data is public; record the subset).

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Jones kernel at 2M agents full-bleed with HDR glow; density-coupled grid; canonical gate ported |
| M1 | Personality pad calibrated at 3 tiers; First Light, Lace, Light Avoidance scenes |
| M2 | Connect the Cities with graph extraction, MST/Steiner overlays and score card; The Maze |
| M3 | Territories (multi-species), morphology regression tests, posters/loops |
| M4 (stretch) | Cosmic Web in 3D |

## References

- Jones 2010, *Characteristics of pattern formation and evolution in approximations of Physarum transport networks*, Artificial Life 16(2) — [doi:10.1162/artl.2010.16.2.16202](https://doi.org/10.1162/artl.2010.16.2.16202)
- Tero et al. 2010, *Rules for biologically inspired adaptive network design*, Science 327 — [doi:10.1126/science.1177894](https://doi.org/10.1126/science.1177894)
- Nakagaki, Yamada & Tóth 2000, *Maze-solving by an amoeboid organism*, Nature 407
- Elek et al. 2022, *Monte Carlo Physarum Machine* — [arXiv:2204.01256](https://arxiv.org/abs/2204.01256)
- Sage Jenson, *Physarum* — [sagejenson.com/physarum](https://www.sagejenson.com/physarum)
