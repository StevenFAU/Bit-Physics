# 03 — Swarm (2D collective motion)

> Part of [Rebuild v2](README.md). Replaces `packages/boids-2d/web` (the embedded v4 lab).
> Wave A. Status: planning, v0.1, 2026-10-17; M0 and M1 built 2026-10-24, M2 built 2026-10-29 (below).
>
> **Implementation status (2026-10-29): M0, M1 and M2 built** as the `v2/` page of `packages/boids-2d/web`
> (served at `/sims/boids-2d/v2/`, gated through `pipeline.py` `PAGES`; v1 unchanged).
>
> **M2 — Current and Food Chain.** Measured on the RX 6800 XT (snap Chromium, RADV, T3) unless a
> line says otherwise. The gated v4 kernel and the gate path are untouched; `Flock` gains an
> optional extension hook (`FlockExt`: prepare / step / after / checkpoint), absent in every M0–M1
> scene, so their paths are as they were.
>
> - **Current: the water is a solved fluid, not a pattern** (`src/v2/model/fluid.ts`). 2D
>   Navier–Stokes in vorticity–stream-function form on a periodic power-of-two grid (256 × 128 at
>   T3/T2, 128 × 64 at T1): semi-Lagrangian RK2 advection of ω, an exact FFT Poisson solve
>   (Stockham radix 2, f64-computed twiddles; ψ̂ = ω̂/λ with λ the 5-point Laplacian's own
>   eigenvalue; ω̂ + iψ̂ comes back from one inverse transform), implicit viscosity ν 2e-4 and
>   floor friction μ 4e-4 per mode, and the mean flow U₀ (the k = 0 mode a torus stream function
>   cannot hold) kept separately. A steady Kolmogorov push f_x = F sin(2πy/H), F = U(μ + νk²), keeps
>   a current at a fish's top speed running east through the middle and west along the edges.
>   - **Incompressible by construction (derived, and measured).** At nodes, the central-difference
>     divergence of a central-difference curl cancels identically; between nodes the fish and the
>     motes feel the exact curl of bilinear ψ, divergence-free inside each cell (u = c + dx,
>     v = −(b + dy)) with continuous normal flow across every edge. `test/m2.test.ts` checks both
>     in f64. Live: max |∇·u| 2.8e-9 against max |∇u| 0.031 (ratio 9e-8, f32 rounding); Poisson
>     residual max |∇²ψ + ω| / max |ω| 2e-5–5e-4 (f32 tables and the second difference). The
>     motes card: 65,536 motes stirred for 2,400 steps keep an index of dispersion of 1.027
>     (0.974 at the start; random points scatter ±0.06), declared ≤ 1.25; the same motes moved
>     along ∇ψ instead of its curl (same speeds, compressible) pile up to 1,155.
>   - **Two-way coupling (v4's drag model, on the new solver).** Each step a fish's velocity moves
>     6% of the way to the water's; the opposite impulse goes to its 4 nodes as i32 sums of 2⁻²⁰,
>     and the fish takes exactly what the integers say (mass ratio fb = 0.6 · nodes / fish = 0.075
>     at T3). Measured balance with the fish's swimming off: fish +0.0750587, water −0.0750587,
>     imbalance 2.1e-10 of the exchange (declared ≤ 1e-6). From one seed, coupled vs drag 0:
>     fish–water heading alignment 0.97 vs −0.02 (declared gain ≥ 0.5); the water ends with 18%
>     more energy coupled (1.25e-5 vs 1.06e-5 per node) — the school stirs it.
>   - **Not claimed:** a fish is a point that drags its 4 nodes, with no wake or thrust (a real
>     swimmer is nearly force-free); semi-Lagrangian advection smooths ω more than ν alone; the
>     split step is first order in time. Learn says so.
>   - **Scene:** the Open Water flock (gated kernel) at half its density, 262,144 / 131,072 /
>     65,536 fish by tier, 65,536 motes drawn as streaks, a faint sheen where the water runs and a
>     spin tint; it opens at 2.2× zoom. Tools: Current (a Gaussian push towards the brush's speed,
>     capped at twice a fish's top speed, through the same integer sums), Shark, Look. A panel
>     shows the fastest water, |∇·u| / |∇u| and the mean drift, all measured.
> - **Food Chain** (`src/v2/model/ecology.ts`): plankton (logistic growth r 0.015, diffusion,
>   grazing P(1 − e^(−a n)), faint seeding) on the fish's own sort grid; forager fish (Open
>   Water's weights in a new kernel with i32 neighbour sums) that graze, climb the plankton
>   gradient when hungry, flee sharks within 0.35, split at energy 1 and starve at 0; up to 128
>   sharks that charge the nearest crowd (argmax n/(d² + 0.02) — a fish-weighted centre sat in
>   the hole the school opens round the shark, and every shark starved), catch the nearest fish
>   in their jaws by an integer `atomicMin` key, handle it 10 steps, split at 2 and starve at 0.
>   Births fill empty slots deterministically: two exclusive `PrefixScan`s rank newborns and
>   empty slots, the k-th newborn takes the k-th slot. Immigration: 4 fish every 120 steps, a
>   shark every 900 steps while fewer than 2 live — no resets.
>   - **Tuned from a measurement, not by hand-waving:** immortal non-breeding sharks catch one
>     fish per ~46 steps whatever the fish density between 6k and 16k (a saturated response), so
>     shark upkeep 0.0042 against 0.25 per fish puts break-even at one catch per 60 steps, and
>     fish efficiency 0.11 keeps their surplus below what 128 sharks can eat. Faster-breeding fish
>     pinned the sharks at their slot ceiling in a steady state; costlier sharks died out.
>   - **Measured (seed 1, 32,768 fish slots, 49,423 steps ≈ 14 simulated minutes):** fish
>     914–7,210, sharks 6–128, mean plankton 0.61–0.94 of its ceiling; three predator–prey cycles,
>     shark booms at steps 6,447, 23,576 and 42,843 (period ≈ 18,200 steps, 5 min at 1×); no
>     extinction. Sharks reach their 128 slots at each peak — the ceiling binds for a few thousand
>     steps per cycle, which Learn states.
>   - **Replays byte for byte:** two runs of 600 steps (2,096 births, 151 fish eaten) give one
>     SHA-256 over fish, sharks and plankton; another seed differs. Fish slots T3 32,768, T2
>     16,384, T1 8,192; sharks 128 / 96 / 64.
>   - **Scene:** plankton glows green where it grows (grazed trails go dark), sharks are soft
>     shadows with a rim that warms when fed. Tools: Feed (hold to bloom), Release (300 fish),
>     Look. A live census panel (fish, sharks, plankton over time, with a plain reading of the
>     cycle) and census sparklines in Learn.
> - **Shared with the page:** Tune shows each scene's own knobs (the water's drag, fish weight,
>   push, ν, μ; the ecology's plankton growth, fish efficiency, shark upkeep and speed); they ride
>   the share link (`wp`, `ep`) and survive a restart. Prove has four new cards (motes, momentum
>   exchange, riding, replay) and says which kernel is on screen. Shared additions: the `wave` and
>   `fish` icons only.
> - **Bug found on the way:** the renderer's `Shark` struct was 32 bytes against the ecology's 48,
>   so every shark after the first was drawn from the wrong bytes; `test/m2.test.ts` now pins
>   the three WGSL copies of the struct to one layout.
> - **Review fixes (PR #51):** `spawn` now decides parents and empty slots from the scanned flags
>   (adjacent exclusive sums), not from the fish buffers it rewrites — a newborn written into an
>   empty slot could otherwise make that slot's own invocation a parent, a scheduling-dependent
>   race (fish energy is also capped at 1.5); two sharks that bite the same fish settle it in the
>   serial pass (the nearer, then the lower slot, eats; the other goes hungry), where before both
>   were fed; save points carry the M2 knobs (fluid parameters and push; ecology rates) so a restore
>   brings back the experiment as well as its state; and a linked push now builds the first water
>   (its starting vorticity) instead of being patched in after the load. The long run above is
>   measured after these fixes; the 600-step replay hash did not change (neither race occurred in it).
> - **Benches** (`?bench=1`, 1280×720): Current 262,144 fish at 58.3–59.3 fps, frame p50 / p90
>   16.7 / 16.7 ms, 60 steps/s, render scale 100% (sim pass 3.9 ms with the water, render
>   2.3 ms); Food Chain 32,768 slots at 58.6 fps, 16.7 / 16.7 ms, 60 steps/s (sim 2.6 ms, render
>   1.8 ms). The machine was loaded during these runs (very likely another session's training run,
>   which held most of the CPU): Open Water read 56–58 fps with the governor sometimes at 85% on
>   both `main` and this branch (six interleaved runs each, in both orders) — no difference between
>   them.
> - **Release gate:** `pipeline.py validate` passes for boids-2d on both pages: run twice
>   byte-identical, φ calm 0.3553 and noisy 0.0609, as in M0 and M1.
> - **Checks:** `v2-acceptance.mjs` passes 88/88 (M2 adds Current's live divergence, the push,
>   the brush, the three water cards, save / restore and a seed across loads with the water;
>   Food Chain's census, Feed, Release, replay, save / restore, a seed across loads, ten simulated
>   minutes — fish 901–7,216, sharks 6–128, booms at steps 6,275 and 23,705 — the M2 knobs on
>   the link, and a restore bringing back the knobs with the state). `check-studio` passes on `v2/`, `v2/?s=current` and `v2/?s=food-chain` at
>   390 / 820 / 1440 px and 200% zoom with zero axe violations. The workspace has 198 unit tests
>   (15 new in `test/m2.test.ts`: the Stockham passes against a direct DFT, ψ = ω/λ against the
>   grid Laplacian, the bilinear curl's zero divergence and edge continuity, the Kolmogorov start,
>   the dispersion index, the shark layout, the ecology's rates).
> - **Firefox at ~20 fps (the observation from M1): found and fixed. The cause was the frame
>   gate, not the shell's blur and not GPU load.**
>   - **The cause.** The live loop skips an animation frame while too many earlier frames are
>     unfinished, and learns that a frame is finished from `queue.onSubmittedWorkDone`. Firefox
>     158 (wgpu) resolves that promise, and every `mapAsync`, only when it next checks for
>     finished GPU work: at the next `queue.submit`, or on a ~100 ms timer. A loop that stops
>     submitting while it waits therefore waits for the timer. Measured in headed Firefox, the
>     callbacks arrived 94 ms after the submit (p50), so two frames in flight gave 20 frames/s
>     at 60,000 fish and at a million.
>   - **The fix** (`src/v2/app.ts`, `tick`). A skipped frame now makes an empty
>     `queue.submit([])`, which makes Firefox check at once: callbacks arrive in 7 ms. The loop
>     also keeps three frames in flight instead of two. Firefox reports each frame done about one
>     display frame later than Chrome, so with two in flight its GPU idled between frames and
>     clocked down: the M0 clock trap, with the step reading 14–17 ms against 8 ms, and ~70 fps
>     at a million fish. Chrome's own back-pressure binds before a third frame, so it queues no
>     deeper there. The physics, the gate path and the capture are untouched.
>   - **Measured.** RX 6800 XT, 165 Hz display, a 1440 × 900 window. The figures are frames
>     submitted per second, before → after, quiet machine, interleaved runs:
>
>     | | 60,000 fish (T1) | 1,000,000 fish (T3) |
>     |---|---|---|
>     | Firefox 158 headed | 20 → 164–165 | 20 → 134–139 |
>     | Firefox 158 headed, software WebRender | 4–5 → 115–119 | 4.7–5 → 112–113 |
>     | Firefox 158 headless | 60 → 60 | 20 → 20 |
>     | Chromium 156 headed | 165 → 165 | 139–143 → 145–150 |
>     | Chromium 156 headless | 60 → 60 | 60 → 60 |
>
>     At 20 fps the governor had also stepped Firefox down to a 55% render scale; it now stays
>     at 100%.
>   - **What is left.** Software WebRender holds animation frames at ~118/s on its own (its
>     compositing cost at this window size); a timer that submits empty batches changes nothing
>     there. Headless Firefox composites on the CPU and holds animation frames until its readback
>     of the canvas lands, and that readback waits on the same lazy check. A page-side 4 ms timer
>     of empty submits lifts the million-fish case from 20 to 60, but headless Firefox is not a
>     visitor's browser, so no timer ships.
>   - **The earlier readings.** The blur reading was taken in headless Firefox while another
>     session's training run held most of the CPU; on a quiet machine the blur costs nothing.
>     Nor is a million fish ~45 ms of GPU per frame in Firefox: with the fix, the frame's timed
>     passes average about 4 ms there, as in Chrome.
>     The claim that Turing Patterns and Slime Mould draw at 165 in Firefox came from their fps
>     readouts. Those count animation-frame callbacks before their in-flight gate, so they show
>     the display rate. Counted at `queue.submit`, they draw 10 and 11 frames/s in headed Firefox,
>     because they gate the same way with one frame in flight. Grow does as well. They are not
>     changed here (`web/README.md` has the pattern). Swarm's readout counts frames after the gate.
> - **Not in M2:** motion trails from a float accumulation buffer; a precomputed backdrop for the
>   phase map; Eyes Only, Species Matrix, Watch one, posters and loops (M3).
>
> **M1 — The Order Dial, The Mill, three levels of detail.** Measured on the RX 6800 XT (snap
> Chromium, RADV, T3) unless a line says otherwise.
>
> - **Two new brains; the gated kernel untouched.** `src/v2/model/brains.ts` adds the Vicsek model
>   and Couzin's zones beside the frozen v4 kernel, which still runs Open Water and the release
>   gate (the v1 and v2 captures are still byte-identical). The brains keep its design: neighbour
>   sums are i32 fixed point (Vicsek 2⁻²⁰, Couzin 2⁻¹⁶), so brute force ≡ counting sort and run
>   twice hold — identical SHA-256 for 4,096 Vicsek and 2,048 Couzin fish over 60 steps with noise
>   on. Their noise is a hash of (seed, step, fish id), and the id travels with the memory re-sort,
>   so a re-sort changes no path even with noise on (65,536 fish, η 0.3, 15 re-sorts: 0 differ).
>   The v4 kernel still keys its noise by memory slot, as before.
> - **A bug the distribution check found.** The fish-id buffers flipped with the boid buffers on
>   every solver step, so on odd steps every fish read a stale id and all drew the same noise —
>   the effective noise was halved (GPU ⟨φ⟩ 0.50 against the CPU's 0.18 at η 0.4). Ids now track
>   their own current buffer and flip only when the ocean is re-sorted. M0's re-sort proof held
>   only because its cadences (8 and 16 steps) are even; its results are unchanged.
> - **The Order Dial** (Vicsek et al. 1995). Each fish turns to the mean heading of every fish
>   within r, itself included, then by a uniform angle in [−ηπ, ηπ], and swims v₀ = 0.2 r. η = 1
>   is a fully random 2π turn, so Vicsek's own η is 2π times the dial's: his η_c ≈ 2.9 at ρ 0.4
>   reads 0.46 here. The ocean holds the tier's fish (T3 1,000,000) at Open Water's density, so
>   the crowding ρ (fish per r²) sets r, and v₀ scales with r. It starts as one aligned school
>   (φ 0.874 after 3 s) and runs at 60 fps and 60 steps/s; at 8× it makes ≈ 480 steps/s.
>   - The dial is a new shared control (`Dial` in `@bp/studio`, an ARIA slider). Beside it are the
>     live φ trace, the susceptibility χ = N·Var(φ) (Baglietto, Albano & Candia 2012), and the phase
>     map. Every (η, ρ) the visitor holds is measured from the live solver, never asserted: the
>     meter waits 400 steps, then averages φ over at least 600 steps (a rolling 2,400). A point is
>     settled when the window's two halves agree within 0.02 in φ; one still changing is drawn as
>     a ring. Example: η 0.2, ρ 1 measured ⟨φ⟩ 0.754, χ 12.4, settled over 608 steps.
>   - **The sweep** turns the dial by itself: η 0.05 → 0.80 in steps of 0.05, from an ordered start,
>     each value held until settled (≥ 800 steps, at most 2,400). At 1,000,000 fish and ρ 1 it takes
>     45 s and measures φ 0.980, 0.931, 0.858, 0.752, 0.598, 0.398 (η 0.30), 0.139 (η 0.35, not
>     settled), 0.035 (η 0.40), then below 0.005. χ peaks at η 0.35 (≈ 1,560), so η_c ≈ 0.35 — 2.2 in
>     Vicsek's units (three runs: 0.349, 0.350, 0.349). That is below Vicsek's 0.46 at ρ 0.4. His systems
>     had at most 10⁴ particles and v₀ 0.03; with 10⁶ fish and v₀ 0.2 the transition is sharper,
>     and angular noise in a large system makes it discontinuous. Learn says so.
> - **φ(η) against an f64 CPU reference** (`model/vicsek-cpu.ts`: the same rule and the same noise
>   hash in f64, run in Web Workers). The setup is 1,024 fish at ρ 1 and η 0.1, 0.25, 0.4 and 0.55;
>   8 GPU seeds against 8 different CPU seeds; 1,500 steps with the first 500 dropped.
>   Measured ⟨φ⟩ (GPU / CPU): 0.936 / 0.939, 0.649 / 0.681, 0.168 / 0.178, 0.060 / 0.059. The largest
>   two-sample z of the seed means is 1.72, so the band is **declared z ≤ 4** at every η (about a
>   0.5% chance of a false alarm across the four). A reference shifted by Δη 0.05 scores z 23.9 and
>   fails, so the check has teeth. It is a Prove card and takes 5.8 s.
> - **The Mill** (Couzin et al. 2002's torus, named with Tunstrøm et al. 2013's cutoffs).
>   - **Model:** r_r = 1, Δr_o = 1, an attraction zone spanning the school (3.5 mean radii), a 270°
>     field of view, a 4° turn and 0.3 r_r per step (Couzin's s = 3, θ = 40°/s, τ = 0.1 s), and
>     σ 0.05.
>   - **CPU prototype first:** with r_a = 14 r_r, schools of 300 or more fish disperse (Couzin used
>     100). With the attraction zone spanning the school, 1,000 fish mill from a ring and from a
>     random disc alike (O_r 0.79 and 0.77).
>   - **Cost and counts:** every fish sees the whole school in front of it, so the cost grows as N²
>     and the counts are T3 8,192, T2 4,096 and T1 2,048.
>   - **Measured:** after 1,500 steps O_p is 0.013 and O_r 0.697 (mean radius 35 r_r), inside
>     Tunstrøm's milling region, and the panel says "Milling". Lunging at the centre with the shark
>     drives O_r down to 0.559 within 600 steps.
>   - **Collective memory:** a ring widened to Δr_o 6 and α 300° was still milling after 1,500
>     steps (O_r 0.744), as Couzin found. This is reported, not claimed in the page.
>   - **The regime label** uses Tunstrøm's own cutoffs, replacing the v4 lab's hand-tuned
>     `regimeName()`: polarized O_p > 0.65 and O_r < 0.35; milling O_p < 0.35 and O_r > 0.65;
>     swarm both below 0.35; anything else transitional.
>   - **O_r's centre** is the circular mean of the positions (a new torus-aware integer
>     reduction), so a school that crosses the wrapped edge keeps its centre. The frozen v4
>     reduction still serves Open Water and its proofs.
>   - **Tune** shows Couzin's Δr_o, α, θ and σ, and they ride the share link.
> - **Three levels of detail** (`render/ocean.wgsl`, `render/field.wgsl`):
>   - **Glyph** (≥ 8 px), with the tail flick.
>   - **Motion streak** at mid zoom.
>   - **Density and heading field** below 0.9 px: a GPU splat of every fish's colour into a 2-px
>     screen grid (fixed-point atomics), spread back with a bilinear tent.
>
>   They cross-fade by the fish's length on screen, with the same light per fish in every level,
>   so zooming never pops. At 1,000,000 fish the page holds 60 fps at 1×, 6× and 20× (frame p50
>   and p90 16.7 ms), and the splat costs 0.14 ms.
> - **Benches** (`?bench=1`, 1280×720): Open Water 1,000,000 fish, Order Dial 1,000,000 and
>   Mill 8,192 all run at 60.0 fps with frame p50 / p99 16.7 / 16.8 ms. GPU p50 reads 6.8, 6.2 and
>   10.3 ms; with two frames queued those timestamps overlap and over-count.
>   Forced lower tiers on the same GPU (`?tier=`): every one holds 60 fps. Order Dial T2 (250,000
>   fish) and T1 (60,000) stay ordered at η 0.15 (φ 0.854 and 0.857). The Mill at T2 (4,096 fish)
>   and T1 (2,048) mills after 1,500 steps (O_r 0.749 and 0.803). These are not measurements on
>   T2 or T1 hardware.
> - **Release gate:** `pipeline.py validate` passes for boids-2d on both pages: run twice
>   byte-identical, φ calm 0.3553 and noisy 0.0609, the same as M0.
> - **Checks:** `v2-acceptance.mjs` passes 63/63 (including Tune's reset moving the dial, and leaving the scene mid-sweep ending the sweep). `check-studio` passes on `v2/`, `v2/?s=order-dial`
>   and `v2/?s=mill` at 390 / 820 / 1440 px and 200% zoom, with zero axe violations; floating
>   panels opt in to its overlap check with `data-bp-chrome` (additive). The workspace has 127
>   unit tests (32 for Swarm, in `test/m1.test.ts`).
> - **Not in M1:** motion trails from a float accumulation buffer (the streak level carries motion
>   at mid zoom); the alarm-propagation predator (M2+); a precomputed backdrop for the phase map
>   (by design, it shows only measured points).
>
> **M0** (2026-10-24):
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
