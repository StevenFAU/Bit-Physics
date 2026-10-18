# 02 — Slime Mould (physarum transport networks)

> Part of [Rebuild v2](README.md). Replaces `packages/physarum/web`. Wave A.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.

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
