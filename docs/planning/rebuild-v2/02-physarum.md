# 02 — Slime Mould (physarum transport networks)

> Part of [Rebuild v2](README.md). Replaces `packages/physarum/web`. Wave A.
> Status: planning, v0.1, 2026-10-17. Unmeasured targets.
>
> **Implementation status (2026-10-24): M2 built** on the same `v2/` page. Measured on the RX 6800 XT
> (Chromium + Dawn/Vulkan). `pipeline.py validate` passes on both pages, run twice
> (byte-identical; mass 22499.9962).
>
> - **Connect the Cities.** A stylised Kantō plain after Tero et al. 2010 (`src/v2/cities.ts`):
>   - 30 real cities at approximate positions, and a coarse coastline polygon whose sea is wall;
>   - a colony grows out of Tokyo;
>   - Food adds and removes cities, and "Remove all food" leaves an empty map for your own.
>
>   This is not Tero's 36-city layout, and the card says so.
> - **The Maze** (after Nakagaki, Yamada & Tóth 2000; `src/v2/maze.ts`).
>   - The layout is a seeded 4-row maze with extra openings, kept only if its shortest route is
>     unique and another route is at most 1.6× longer.
>   - Food sits at the entrance and at the exit.
>   - The Wall tool builds or clears walls (undoable strokes).
>   - The scene plays at 4×.
>   - Its prompt asks rather than promises (see the findings below).
> - **Model additions, behind flags the gated scene leaves off:**
>   - *Walls* (bit 3). Seeds avoid them; agents cannot step into a wall but can walk out of one
>     drawn over them. The render shows walls as matte dark relief.
>   - *Hunger* (bit 6, maze only). An agent counts its steps since it was last on or beside food,
>     stored in its heading's length, so no extra buffer is needed and the re-sort carries it.
>     Past 5× the shortest route's length, in its own steps, it goes back to a random food source
>     and deposits there. The population and the mass balance are unchanged. The limit is
>     re-measured through the walls after every edit, as part of applying it, so replay matches.
> - **Network extraction** (`src/v2/model/graph.ts`), the score's foundation:
>   1. Cells above 0.5× the dish's measured mean trail count as tube.
>   2. Zhang–Suen thinning.
>   3. A graph built on m-adjacency, so diagonal staircases are not read as junctions.
>   4. Links shorter than 12 cells are contracted into their junctions (thinning's small triangles
>      would otherwise count as fault-tolerant loops), and dead ends that are not food are pruned.
>   5. Lengths are measured along each line resampled every 3 cells.
>
>   On synthetic networks (a Y, a triangle, a spur), the measured lengths are within 3% of the true
>   ones. The extracted graph is drawn over the dish so the score can be checked.
> - **The planner** (`src/v2/model/netopt.ts`):
>   - the exact Euclidean MST (Prim);
>   - a Steiner heuristic: MST, then Fermat-point insertion, then Weiszfeld relaxation. It finds the
>     known optima for a triangle (√3) and a unit square (1 + √3), is never above the MST and never
>     below √3/2 of it. On the Kantō cities it is 0.968× the MST. It is labelled a heuristic,
>     never optimal.
> - **The score card** shows Tero's three measures, each normalised by the MST on the same cities:
>   length (TL), mean shortest distance between cities (MD), and the share of single links whose
>   failure cuts a city off. Beside them it shows the published values, checked against the
>   paper: Physarum TL 1.75 ± 0.30, MD 0.85 ± 0.04, cut 14 ± 4% illuminated and 20 ± 13%
>   unconstrained; the rail ≈ 1.8, 0.85 and 4%.
>   - A "beats the planner" sentence appears only when this run measured it.
>   - Scoring runs every ~2 s in a worker: 70–150 ms of CPU at T3, extracted on a 2× block grid.
>   - Overlays: the measured network (white), the MST (green, dashed), the Steiner tree (pink,
>     dotted) and the maze's shortest path through the walls (green, dashed).
> - **Measured — Connect the Cities.**
>   - **T3, 5 seeds:** all 30 cities joined at 3,000, 6,000 and 12,000 steps. TL_MST 1.62–2.06
>     (means 1.95, 1.92, 1.81); MD_MST 0.78–1.12 (means 0.81, 0.82, 0.89); cut share 2–13%. The
>     mould beats the MST on distance and resilience at 1.6–2.1× its length, as Physarum does.
>   - **T2:** 26–30 cities joined; TL_MST 1.27–1.77; MD_MST 0.85–0.88 when all cities are joined;
>     cut share 9–26%.
>   - **T1:** 20–27 cities joined, the same with finer personalities. The T1 arena is ~200 cells
>     across, too small for 30 cities at the declared density (a limit, not a tuning gap).
>   - Mass exact with walls and growth: rel 1e-7.
> - **Measured — The Maze.**
>   - **T3, 6 seeds:** at 16,000, 20,000 and 24,000 steps the food is joined in 18/18 checks, 17 of
>     them on the shortest route. The route is 0.99–1.26× the geodesic shortest path; the tube left
>     elsewhere is 1.3–2.8× the route.
>   - **T2:** joined in 4–5 of 6 seeds, always along the shortest route when joined (13/13).
>   - **T1:** joined in 2–3 of 6.
>   - A wall across the route lengthens the shortest path (3,346 → 3,567 cells), and undo restores
>     it.
> - **Checks.**
>   - `v2-acceptance.mjs` 67/67. New for M2: scenes, scores in the measured bands, the overlay,
>     the Wall tool and its undo, mass with walls and hunger, the score card's fit and axe at 1440
>     and 390 px.
>   - `check-studio` clean; 127 unit tests (20 new); integrity 0 HARD_FAIL.
> - **Performance (60 fps at 2M agents).** Cities' solver costs ~27% more per frame than the M0
>   path (walls, growth, food). The maze at 4× runs 478 steps/s at ~9.7 ms of GPU per frame.
>
> **M2 findings (corrections to this spec):**
>
> - **No food scent in Connect the Cities.** Thirty summed scents make one pull toward the middle
>   of the map. With it, the network collapsed onto the central cluster: about 12 of 30 cities
>   still on the network after 6,000 steps (counted by eye, before scoring existed). Without it,
>   all 30 (scored).
> - **Jones's agents do not retract from dead ends.** Loops of agents sustain themselves, so a
>   filled maze kept every corridor. Two fixes were tried and failed:
>   - shrinking the population uniformly (random retirement down to 5%, in the spirit of Jones &
>     Adamatzky's "shrinking blob") thinned every tube alike;
>   - retiring hungry agents starved the middle of the route itself.
>
>   Returning hungry agents to food works. The limit matters: at 3× the route, the route broke in
>   half the seeds by 16,000 steps; at 5× it held in all six.
> - **Maze corridors must be narrow against the network's mesh.** In a 5-row maze with 30% walls,
>   the cells acted as open rooms and the network meshed inside them. The maze is now 4 rows with
>   walls at 55% of the pitch.
> - **Extraction threshold 0.5× the mean, not 1×.** At 1× the faint middle of a long maze route
>   dropped out (joined in 10 of 16 checks against 16 of 16). Between 1× and 0.5×, Cities' TL
>   rises 0–13% (fainter tubes count), MD moves by at most 0.02 and the cut share by at most
>   2 points.
> - **The maze's prompt is a question.** "It will find the shortest path" holds at T3 (17 of 18
>   checks) but not on smaller tiers, so it now reads "Will it find the shortest path? Block it
>   and see." Each run's card says whether it did.
>
> **Implementation status (2026-10-24): M1 built** on the same `v2/` page. Measured on the RX 6800 XT
> (Chromium + Dawn/Vulkan); `pipeline.py validate` still passes on both pages, run twice
> (byte-identical, total mass 22499.9962, rel 1.7e-7).
>
> - **Scenes.** *First Light* is the default: a colony grows from the centre of a dark dish
>   with twelve crumbs. *Lace* is the finest-foam personality on the whole dish. In *Light
>   Avoidance*, a light drifts on a slow loop until the visitor drags it.
> - **Tools.** Food (click to drop or take away a crumb) and Light (drag; size; switch off). Every
>   edit is a logged event at its step. Undo restores the checkpoint taken before the edit and
>   replays the later events. After a food edit, an undo and 300 steps, the trail is byte-identical
>   to a run that never had the edit (with growth, stochastic turning and food all on).
> - **Model additions (live scenes only, behind flags the gated scene leaves off):**
>   - *Food* deposits into the trail like 40 agents per crumb cell, in the same whole
>     1/65,536ths. Food also gives off a long-range scent s·e^(−r/λ), with s = 4× the mean
>     trail and λ = 0.3 of the dish's short side. Agents sense the scent but it never enters
>     the trail. The scent's own effect was not measured separately.
>   - *Light* is a repellent agents sense, 60× the mean trail deep. After 900 steps the lit
>     pool holds 0.40% of the dish's mean trail.
>   - *Growth*: outside the released disc, agents start dormant and wake once the trail under
>     them reaches 0.1 of one agent's deposit. They never wake on food or its halo. The halo is
>     λ·ln(food / (α·0.1)) + 3 cells, with λ = √(D/α) and D = 1/3: past it, a crumb's own trail
>     cannot reach the threshold.
>   - *Stochastic turning*: Jones's random side when both side sensors beat the centre, plus a
>     5% chance of a random turn per step. The dice are a hash of each agent's position and
>     heading, so runs repeat exactly and the tile re-sort cannot change them.
> - **The mass balance stays exact through all of it.** Food amounts are integers, and a
>   growing colony's awake count is logged on the GPU every step and folded into the f64
>   prediction: M ← (M + d·N_awake + F)(1−α). At 2M agents, after 1,200 steps of growth with
>   food, rel 1.1e-7; with a crumb added, 3.0e-8.
> - **Directors act at exact steps,** not at frame boundaries, so an untouched scene still
>   replays byte for byte:
>   - First Light gets a new crumb every 2,400 steps (up to 24);
>   - Light Avoidance moves its light every 16 steps;
>   - Lace re-scatters every 4,800 steps.
> - **The personality pad** (Tune) is a 5 × 5 lattice of tested points with four named corners:
>   *Veins* (explorer, fine), *Lace* (forager, fine), *Rivers* (explorer, bold) and *Cells*
>   (forager, bold).
>   - The axes: Explorer↔Forager moves the turn angle 22.5° → 67.5° and the step 2 → 0.5;
>     Fine↔Bold moves the reach 12 → 24 and the fade 0.15 → 0.05.
>   - Calibration (`v2-calibrate.mjs` → `src/v2/generated/pad-calibration.json`) ran each point
>     from three seeds at the T1, T2 and T3 agent counts (16:9 dishes of 744 × 424, 1368 × 768
>     and 2728 × 1536) and measured the trail's morphology at 1,000 and 3,000 steps
>     (`src/v2/model/morphology.ts`).
>   - A point is offered at a tier only if, at both steps, every seed's tube length per area is
>     within ±10% of the mean and every gap count within ±max(30%, 2√n).
>   - Offered: **T3 22/25, T2 16/25, T1 9/25**. The puck snaps to offered points; a scene whose
>     personality is not offered on a tier starts at the nearest one that is.
> - **Checks.** `v2-acceptance.mjs` passes 47/47, adding for M1: scenes, pad versus calibration,
>   pad links, growth, food, undo, light, the director, and the open Tune popover under axe.
>   `check-studio` passes at 390 / 820 / 1440 px and 200% zoom. Workspace typecheck and 107 unit
>   tests (13 new) pass.
> - **Performance at full clock (1280 × 720, 2M agents, 60 fps).** The solver takes 0.98 ms per
>   frame on *The network* (the M0 path), 0.94 on Lace (stochastic turning is free) and 1.23 on
>   First Light (+26%: environment sensing, the wake test, food and the awake log). GPU per frame
>   is 1.4–1.5 ms at p50.
>
> **M1 findings (corrections to this spec):**
>
> - **The deposit cannot be a personality axis.** Without food, the deposit only scales the
>   trail, and an agent comparing three samples cannot tell the difference. The fade changes the
>   shape, so Bold uses the fade.
> - **Jones's stochastic turning stops the rods.** In a T2 survey at reach 18 with a 2% or 10%
>   chance of a random turn, the network stayed in one or two connected pieces from 1,000 to
>   12,000 steps. The deterministic rule broke into rods by ~6,000. Networks still coarsen, slowly (Lace at T3: ~390 gaps at 1,000
>   steps, ~165 at 3,000).
> - **A colony grows only from dormant agents.** With the rest of the dish dormant and a wake
>   threshold of 0.1 deposit, a branching front fills a T3 dish in about ten seconds: 8,726
>   agents awake at the start, 663,610 after 600 steps and 1,579,052 after 1,200. At thresholds
>   of 0.25 and up, the released disc collapses into a rod before it wakes anyone.
> - **Food must be strong to shape the network.** At 40 agents' deposit per crumb cell, the
>   network contracts onto straight tubes between crumbs, with three-way junctions, within
>   ~5,000 steps (Tero-like, unscored until M2). At 2×, crumbs barely register.
> - **The Explorer column is not reproducible on small dishes.** Explorers make a few long
>   meandering runners with almost no closed loops, so at T1 and T2 seeds disagree. The T1 dish
>   holds only ~10–40 features.
> - **The first stability rule was wrong, and was replaced after the first run.** It judged gap
>   counts by ±30% alone, which rejects points on counting noise (a T1 dish holds ~15 gaps:
>   ±26% at one standard deviation). That rule offered T3 19, T2 16, T1 7; the JSON keeps its
>   verdict per point as `stableFirstRule`.
> - **Lace keeps the declared density.** The spec called for "high density", but M0 showed
>   density sets the scale, not the morphology. Lace is the finest-foam personality instead.
> - **Shell fix.** Opening the Tune popover produced a second `banner` landmark (axe: *landmark-no-duplicate-banner*).
>   `check-studio` never opens Tune, so it did not catch this. The popover headers now carry
>   `role="none"`.
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
> Not yet (after M2): morphology regression tests, multi-species channels (Territories), posters
> and loops (M3); the Cosmic Web (M4).

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
