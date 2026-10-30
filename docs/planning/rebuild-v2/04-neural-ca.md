# 04 — Grow (neural cellular automata)

> Part of [Rebuild v2](README.md). Replaces `packages/neural-ca/web`. Wave A.
> Status: planning, v0.1, 2026-10-17. **M0 done 2026-10-23** (live NCA, the dish look, gate
> ported; training spike below). **M1 done 2026-10-28** (Menagerie, Cut / Seed / Graft / Freeze,
> Inside the Cell). **M2 done 2026-10-29** (Teach, the gradient check, the local library).
> Teach measured on T3 and, forced, the T2 recipe on T3 hardware; no integrated GPU measured.
> **M3 done 2026-10-29** (Chimera, Textures, staged posters and loops): the sim is complete to this
> spec; the release swap (v2 to the sim's root URL) is a separate step.
>
> **M3, Chimera, Textures, posters and loops (2026-10-29): done.** On the `v2/` page only; the v1
> page, the gated kernel, the capture path and the committed checkpoint (sha256 `c98a4678…`) are
> untouched. Measured on the RX 6800 XT (RADV, headless snap Chromium) unless marked:
> - **Chimera.** Two 64 × 64 dishes (host, donor) whose cells carry their rule.
>   `src/v2/model/chimera.wgsl` is the gated update reading its weights at rule × 8,320 and choosing
>   each cell's rule from the step's input first (a cell with opacity above 0.1 keeps its own; any
>   other takes its most opaque neighbour's, so tissue growing into agar brings its rule); the mask
>   pass is the gated kernel's own pipeline. Grafts carry their cells' rules, *Rewrite* paints a rule
>   onto living cells, *Seed* plants on a chosen rule. Untouched, the scene grafts a radius-9 disc of
>   the donor into the host at step 240 by itself (not an edit; links reproduce it). An outline marks
>   tissue on the other dish's rule; a label under each dish counts its living cells per rule.
> - **One rule is the gated kernel.** Chimera's dish with every cell on the committed checkpoint's
>   rule, stepped through the gated run, equals the gate's own frames bit for bit (21 frames; Prove ›
>   *Chimera with one rule*, and the acceptance script).
> - **What grows when two rules meet** (live kernel, every ordered pair of the seven healers, 1,000
>   steps after the opening graft): each rule alone holds 456–736 living cells, but in 31 of the 42
>   pairs the host's dish passes 3,000 of its 4,096 — two rules that each stop at their own shape do
>   not stop each other. The donor's rule then holds a median 32% of the living cells (none in one
>   pair, ladybug host with gecko donor; 99% in another). The ladybug is the strongest donor (mean
>   share 0.65) and the hardest host to take over (0.09); the gecko the weakest donor (0.11) and the
>   easiest host (0.83). Gecko host with butterfly donor: the butterfly's rule holds 86–92% of the
>   gecko's dish from step 600 to step 4,000. Same scene, same bytes and rules (checked at step 600).
> - **Textures.** Self-Organising Textures (Niklasson et al. 2021), trained offline as this spec
>   says, in `packages/neural-ca/textures/`: `targets.py` draws four periodic 64 × 64 targets
>   (Gray–Scott spots and a maze, a periodic Voronoi giraffe, a basket weave; no images vendored);
>   `train.py` trains the paper's model (12 channels; identity, Sobel and Laplacian perception;
>   48 → 96 → 12; wrap-around; no alive mask; the seed is the zero plane) against VGG16 Gram
>   matrices, on a CPU with PyTorch; `build.py` measures each run with the trainer's own model and
>   writes `public/textures/` — four 23,424-byte weights files, the targets, and `textures.json`
>   with each run's provenance (target recipe, seed, 3,000 iterations, 100–101 min each with four
>   running at once, the loss curve, the environment) and the measurements. Style loss went from
>   18,093 / 1,481 / 894 / 4,688 at iteration 0 to 394 / 167 / 96 / 301 at 3,000 (spots / maze /
>   giraffe / weave). Spots, maze and giraffe match their targets by eye; the weave learned the
>   threads and their crossings but not the grid, and its blurb says so. All four stay bounded
>   (largest |state| 0.83–0.96 at step 4,096). After a radius-16 disc is erased, the window's style
>   loss is back at or below its level before within 256 steps (0.76–0.90 of it), except the
>   weave's (1.25). Reproducibility: two 101-iteration reruns gave byte-identical weights and the
>   real run's logged losses; a whole 3,000-iteration rerun was not made. The page runs them on
>   `src/v2/model/texture.wgsl` (its own kernel, with the gated kernel's hashed coin) on a
>   256 × 256 plane on T3 (192 on T2, 128 on T1), drawn edge to edge as a wrap-around plane, with
>   Erase, Graft, Freeze and undo as on the dish. The plane matches the reference statistically,
>   not cell for cell: each texture's colour mean and spread at step 1,024 lie within 0.005 of
>   PyTorch's (declared 0.02). Prove › *The Textures' networks* checks each download's SHA-256.
> - **Posters and loops**, staged as `neural-ca-v2.png` / `.webm` from the v2 page (`STAGED` in
>   `make-posters.mjs` / `make-loops.mjs`, `?chrome=off&o=butterfly`), committed plain; the landing
>   card is not switched. The loop is the butterfly growing from one cell at quarter speed, a little
>   closer (512 × 512, 150 shots, 21 KB); the poster is the grown butterfly (181 KB). The v2 page now
>   gives its canvas its box's shape before ready: the loop generator sizes the canvas by width, and
>   at ready (before the renderer) it still had the default 300 × 150, so the first loop came out
>   512 × 256.
> - **Boot.** Unchanged: ready once the gate path is up; Chimera's and Textures' pipelines compile
>   after Teach's, once the dish is live (or when a scene first needs them). A page whose
>   `textures.json` does not arrive drops the Textures scene and runs the rest. Locally (RADV) ready
>   comes 66–120 ms after navigation and the Dish is live 26–43 ms later; the M3 pipelines compile
>   in 7–13 ms, after Teach's (about 30 ms after the Dish is live). A link straight into Chimera or
>   Textures compiles them before its scene (live 123–187 ms after navigation). CI's time-to-ready is added once the PR's validate job has run.
> - **Gate.** `pipeline.py validate --sim neural-ca` passes on both pages: bit-exact, max_abs 0.0
>   over 21 frames, two driver runs each; local time-to-ready 36–44 ms (v1) and 26–45 ms (v2).
> - **Checks.** `v2-acceptance.mjs` 113/113: M0–M2's, plus 21 for M3 (Chimera: boot, one rule ≡ the
>   gated kernel, the opening graft at 240, same bytes and rules twice, a graft carries its rules,
>   Rewrite, undo to the never-edited bytes and rules, the partner picker and its link, the
>   per-rule labels, all 42 pairs measured, no console errors; Textures: boot at 256² as a plane
>   with Erase/Graft/Freeze, steps advance, each download's SHA-256, each texture's colour mean and
>   spread within 0.02 of the reference's (measured worst 0.005 / 0.002, weave), Erase zeroes the
>   cells, the erased region's contrast back within 10% of the rest's after 256 steps (measured
>   1.2%, spots), undo to the never-erased bytes, the picker and its link, the card, no console
>   errors) and frame-time benches for both scenes. `web/tools/check-studio.mjs` clean for every
>   scene (Chimera, Textures with spots and with giraffe, the Dish, the Menagerie, Inside the Cell,
>   Teach) at 390, 820 and 1440 px and 200% zoom, no axe violations. `npm test` 187/187; neural-ca
>   pytest 19/19; `check_registry.py` OK; integrity 0 HARD_FAIL.
> - **Acceptance items.** Met: the M3 row (Textures, Chimera, posters and loops); *Scenes* — Chimera
>   asks "What grows when two rules meet?" and Textures tiles a 256² plane that regrows after
>   erasing; *The model* — the Niklasson texture NCA, trained offline, shipped pretrained, Teach
>   trains shapes only; the foundation's asset budgets (poster 181 kB ≤ 200 kB, loop 21 kB ≤
>   1.5 MB). *Performance targets*, T3: 60.0 fps with Textures at 256² (GPU 0.40 ms median per
>   frame; 59.3 fps at 8× speed, 237 steps/s) and Chimera's two dishes at 59.5–59.6 fps; median and
>   90th-percentile frames 16.7 ms in every run, with occasional single missed frames (52–60 fps
>   over repeated runs) while another session shared the GPU. T2 (192²) and T1 (128²) measured
>   only by forcing the tier on this GPU (52–60 fps, the same missed-frame noise); no integrated
>   GPU measured. Not met or not checked: the Dish is 64² (the gated grid), not the spec's 72²;
>   *first in-browser GPU NCA training* is still not claimed (verify before claiming); the weave
>   does not keep its grid; a whole training rerun was not made. Out of scope here: the release
>   swap and the landing card.
>
> **M2, Teach (2026-10-29): done.** On the `v2/` page only; the v1 page, the gated kernel, the
> capture path and the committed checkpoint are untouched. Measured on the RX 6800 XT (RADV,
> headless snap Chromium) unless marked:
> - **The trainer, ported.** `src/v2/teach/` holds the spike's WGSL (minus its timing-only dense
>   mode) and its trainer restructured for a page: an iteration is units (start, T forward
>   steps, the loss, T backward steps, the optimiser) that a sliced job records into the frame's
>   own encoder within a per-frame GPU budget; per-iteration uniforms go through an upload ring
>   copied in-encoder, so iterations can share a frame; checkpoints are packed into ≤ 128 MiB
>   buffers, **by step parity** (one dispatch may not read and write the same buffer even at
>   different offsets — the first packing failed validation). Training pipelines compile after the
>   dish is live: 28 ms here, 1.8 s on SwiftShader.
> - **Teach.** Draw on the dish (Paint / Erase in a 40 × 40 box, eight colours, a Menagerie
>   target or any image as a start, warnings for small, split or thin drawings), press Teach:
>   the dishes become the training batch (still, refreshed after every iteration), with a loss
>   curve, a grown-from-one-cell check every 50 iterations (overlap at 96 and 300 steps, and a
>   thumbnail), the measured speed, the page's frame rate and an ETA. *Grow it* converts the
>   weights to the committed layout and grows them in the dish through the gated kernel; the card
>   adds a regrowth score measured on the live kernel with the Menagerie's protocol.
> - **Recipe** (T3): batch 8, pool 256, rollouts 64–96, damage on 3 samples from the first
>   iteration (the Menagerie's), lr 2e-3 → 2e-4 at 2,000. Starting damage at iteration 600 was
>   slower (1,600 iterations to recognisable against 1,350).
> - **Time to a recognisable organism** (the spike's criterion: overlap ≥ 0.85 grown from one cell
>   at 96 and 300 steps), the Menagerie's gecko target: **1,250–1,350 iterations over run seeds
>   1–3 = 36.1–38.2 s of training** at the default Smooth pace, **25.7 s** at the Faster pace;
>   wall time from pressing Teach is the same to 0.02 s. The spec's "≤ 1 min" holds. The spike's
>   17–26 s used the whole GPU and no damage.
> - **Frame rate while training, measured.** Smooth (12 ms of training per frame): page 60.0 fps
>   (min 59.0), 34–37 iterations/s, 326 MiB of GPU memory. Faster (30 ms): 53 iterations/s — the
>   spike's full-GPU rate — at 33 fps. The spec's "15–30 fps while training" is the Faster
>   option; Smooth is the default.
> - **Clock-down trap.** With one frame in flight the GPU idles between frames and the RX 6800 XT's
>   power manager held it at 20–900 MHz: 7.8 iterations/s at 43 fps on an otherwise idle machine
>   (earlier runs had measured 27–28 it/s while something else kept the clocks up). Training now
>   keeps two frames in flight (the rest of the page keeps one): 1.7–2.2 GHz. Swarm M0 found the
>   same.
> - **Slicing does not change the result.** Runs at 10, 12, 13, 24 and 30 ms per frame, with one
>   or two frames in flight, gave identical evaluations at every shared iteration; the acceptance
>   script checks equal weights SHA at 120 iterations at both paces.
> - **T2** (`?tier=T2` on this GPU, batch 4, 64-step rollouts, damage on 1, 10 ms per frame):
>   recognisable after 1,150 and 1,450 iterations (seeds 1–2) = 41.5 and 59.0 s at 60 fps, 25–28
>   it/s. Not measured on an integrated GPU —
>   there is none here; the page shows the visitor's own speed and ETA, and suggests the Menagerie
>   past 8 min. **T1 does not train** (Teach says so; saved models still grow).
> - **Healing takes longer than recognising.** Four runs stopped at 1,188–1,668 iterations scored
>   0.48–0.69 mean IoU 200 steps after the three cuts (the right-half cut worst, 0.36–0.51); the
>   Menagerie's organisms trained 8,000 iterations to reach 0.85–0.99. The card reports the
>   measured number, and *Keep training* resumes the same run.
> - **Gradient check (Prove › Backprop on this GPU).** `neural_ca/gradcheck.py` writes float64
>   PyTorch autograd gradients with the trainer's fire masks for three fixed cases (disk T24 B2
>   and gecko T64 B4 from the seed, random weights T16 B2 from a hashed blob), committed in
>   `public/teach/gradcheck.{json,bin}` and regenerated by a pytest. Run through the same sliced
>   job: worst relative L2 **1.14e-7 on RADV** (13 page frames) and **1.11e-7 on SwiftShader** (200
>   frames, 23 s), living-cell counts equal to float64's on every case; float32 autograd on a CPU
>   reaches 1.81e-7. Declared in `tolerance.toml` `[golden_tolerance.continuous-ca.neural-ca-gradcheck]`:
>   `grad_rel_l2_max = 1e-6`. Cases are chosen where float32 itself stays near float64: the disk
>   at 96 steps is chaotic in float32 (1.9e-5). lavapipe not measured; the release gate does not
>   run this check.
> - **Local library.** IndexedDB in this browser: save (with the card and the target), grow, delete,
>   download a 33,280-byte weights file in the committed layout, import one back. The copy says
>   the models live only in this browser. Share links never carry a taught model.
> - **Boot.** Unchanged: ready once the gate path is up; Teach's pipelines compile after the dish
>   is live. SwiftShader time-to-ready 49.7 s (was 50 s). Locally (RADV) the gate's
>   time-to-ready is 17–34 ms on both pages.
> - **Gate.** `pipeline.py validate --sim neural-ca` passes on both pages: bit-exact, max_abs 0.0
>   over 21 frames, two driver runs each.
> - **Checks.** `v2-acceptance.mjs` 89/89 (M0 and M1's, plus 22 for M2: the gradient check within
>   budget, boot order, draw → train → recognisable within 90 s at ≥ 50 fps → grow it on the gated
>   kernel (overlap 0.75–0.88 at step 300 over three runs) → regrowth score → save, reload, grow, import, delete; equal
>   weights at both paces; T1 does not train). `web/tools/check-studio.mjs` clean for Teach, the
>   Dish, the Menagerie and Inside the Cell at 390, 820 and 1440 px and 200% zoom, no axe
>   violations (on phones the Teach panel folds to its header and sits above the tool options).
>   `npm test` 183/183; neural-ca pytest 19/19; integrity 0 HARD_FAIL.
> - **Still unverified:** "first in-browser NCA training" — no copy claims it.
>
> **M1, the Menagerie, the tools and Inside the Cell (2026-10-28): done.** On the `v2/` page only;
> the v1 page, the gated kernel, the capture path and the committed checkpoint are untouched.
> Measured on the RX 6800 XT (RADV, headless snap Chromium):
> - **Seven trained organisms.** Gecko, starfish, butterfly, ladybug, mushroom, clownfish and turtle,
>   each 8,320 numbers in the committed checkpoint's layout, so the page runs them through the gated
>   kernel unchanged. Trained offline by the M0 spike, extended with the Distill *Regenerating*
>   recipe (each iteration resets the worst sample to the seed and cuts a random disc out of the three
>   best). 64 × 64 dish (the page's, not 72²), 40 × 40 targets drawn by
>   `packages/neural-ca/menagerie/targets.py`, batch 8, pool 1,024, rollouts 64–96, 8,000 iterations:
>   142–182 s each. Provenance (target, trainer, adapter, seed, iterations, loss curve) and the
>   measurements below are in `packages/neural-ca/web/public/menagerie/menagerie.json`; the weights are
>   committed plain, 33 kB each. Damage training is deterministic: a second gecko run in a fresh
>   browser gave the same weights SHA and identical losses at all 8,000 iterations.
> - **They heal.** On the package's NumPy reference of the gated kernel: grown from one cell, 0.975–0.996
>   overlap (IoU) with the target at step 300, held to step 4,000. Cut at step 400 (right half, bottom
>   half, a disc through the middle; three masks), the mean overlap 200 steps later is 0.85 (turtle) to
>   0.99 (butterfly); worst single cut 0.63 (ladybug) to 0.98 (butterfly); 0.82–0.99 after 800 steps.
>   The committed disk, measured the same way, does not heal (mean 0.70; a right-half cut dies out).
>   On the live kernel (mask seed 42) all seven heal (mean 0.84–0.99), within 0.024 IoU of the
>   reference on every one of 24 cuts.
> - **The Dish** opens on the day's healer (the spec's "rotating daily"; a link carries the organism
>   it showed). `?o=disk`, the organism menu or Prove › *Show the gated run* is the gated run.
> - **Menagerie.** Eight dishes on one clock, one organism each, every weights file SHA-checked against
>   the manifest (also a Prove card). Edits name their dish, so undo by replay and save points cover all
>   eight. Drawn as one dish view per scissored tile, laid out in the space the chrome leaves free.
>   The disk inside it is still the gated run: at step 1,000 it equals the committed canonical frame
>   bit for bit. Each organism has a card: its target, how it was trained, what was measured.
> - **Freeze** is a pass after each step that copies the step's input back over frozen cells; with
>   nothing frozen it is not encoded. 112 of 112 frozen cells kept their 16 values through 120 steps
>   while the gecko grew around them; undo replays to the never-frozen bytes.
> - **Graft** lifts a disc (move or copy) and sets it down at a step boundary, also across the
>   Menagerie's dishes: the piece arrives byte for byte (113 of 113 cells), and lands under the new
>   dish's rule. Cells do not carry their rule: Chimera (M3) still needs per-cell rule ids.
> - **Inside the Cell** works one cell's step on the CPU (48 perception values, 128 units, 16 changes,
>   the coin, the two alive checks) and checks it against the GPU's next step: max |Δ| 3.8e-6 over 18
>   cells of three organisms (often 0). A frozen cell keeps its values on both sides (0 difference). Against the NumPy reference (unit test): < 1e-5, no disagreement
>   about which cells die.
> - **Gate.** `pipeline.py validate --sim neural-ca` passes on both pages: bit-exact, max_abs 0.0 over
>   21 frames, two driver runs each; all four captures are identical.
> - **Frame.** 60 fps at 1280 × 720 on both scenes. The Dish: GPU 0.58 ms per frame (p50), 0.50 ms
>   per step. The Menagerie: GPU 0.62 / 2.7 ms per frame (p50 / p90); a step of all eight dishes is
>   3.8 ms, so 30 steps/s leaves most of the frame.
> - **Boot.** The page signals ready as soon as the gate path works (the committed weights fetched,
>   the gate's own two pipelines compiled, the capture button wired) and compiles the renderer, the
>   live solver and the rest afterwards, behind the loading veil. Deferred steps that write to the GPU
>   queue wait for a running capture, and a capture waits for one in flight. On a software GPU
>   (Playwright's Chromium on SwiftShader, locally) v2's time-to-ready fell from 100 s to 50 s, the
>   same as v1's 50 s: the gate's two compiles are the whole wait. A capture clicked at ready finished
>   in 63 s while the live dish compiled alongside, byte-identical to one taken later; the dish was
>   live at 113 s. On the RX 6800 XT: ready at 83 ms, live at 336 ms.
> - **Checks.** `v2-acceptance.mjs` 67/67 (M0's checks pinned to `?o=disk`, plus M1's);
>   `web/tools/check-studio.mjs` clean for the Dish, the Menagerie and Inside the Cell at 390, 820 and
>   1440 px and 200% zoom, no axe violations; `npm test` 164/164; integrity 0 HARD_FAIL.
> - **Still unverified:** "first in-browser NCA training". No copy claims it; the cards say only that
>   these organisms were trained with WebGPU in a headless browser by this repository's spike.
>
> **M0, the page (2026-10-23): done.** Grow v2 is the `v2/` page of `packages/neural-ca/web`
> (source in `packages/neural-ca/web/src/v2/`), gated through `pipeline.py` `PAGES`; v1 is untouched.
> Measured on the RX 6800 XT (RADV, headless snap Chromium):
> - **Gate.** `pipeline.py validate --sim neural-ca` passes on both pages: bit-exact, max_abs 0.0
>   over 21 frames, two driver runs each. The v2 capture file is byte-identical to v1's. The
>   capture path is v1's, copied verbatim onto its own buffers (two submits per step).
> - **CI correction.** CI does not run this gate bit-exact. `web-deploy.yml` turns on the declared
>   observable fallback for neural-ca because lavapipe lands 1.79e-7 away at step 50 (bound
>   1.8e-6). The v2 captures pass that fallback too (run-twice identical, step-50 max_abs 0.0).
>   Bit-exactness is a RADV result, and the Prove copy says so.
> - **The live dish is the gated kernel.** The live solver compiles the same WGSL bytes and only
>   changes how steps are submitted: one Params slot per step (dynamic offsets), so a frame's steps
>   share one pass and one submit. Stepped through the canonical run, it matches the gate path on all
>   21 frames bit for bit, and the dish at step 1000 equals the committed canonical frame.
> - **Frame.** 60 fps at 1280 × 720 with 0.36 ms GPU per frame (p50). One step is 0.25–0.49 ms
>   by timestamp (the GPU clocks down under this light load). The dish runs at 30 steps/s at 1×.
> - **Checks.** `v2-acceptance.mjs` 29/29; `web/tools/check-studio.mjs` passes at 390, 820 and
>   1440 px and 200% zoom, with no axe violations.
> - **Scheduling seam for Teach.** `src/v2/runtime/scheduler.ts` runs background GPU work as
>   sliced jobs inside a per-frame budget, at the job's unit boundaries, with a measured cost per
>   unit. M0's consumer is Prove's live-vs-gated run: 1000 steps over 53 page frames while the
>   dish kept rendering at 60 fps. M2's training job plugs in the same way.
>
> **What M0 found about the committed checkpoint** (numpy reference unless marked live):
> - **It does not heal.** It is the Persistent checkpoint, not a damage-trained one. 1,600 steps
>   after a cut, overlap with an uncut twin was 84% for a bite from the edge and 77% for half the
>   disk. A stroke through the middle left a remnant that kept shrinking (28%, 501 living cells).
>   *Signature moment 1* ("Cut it. It heals.") needs a regeneration-trained model (M1). The Dish's
>   prompt says the rule keeps its shape and does not heal.
> - **It is tied to its 64 × 64 dish.** On 128 × 128, one seed grows a rounded square that fills
>   ~78% of the grid. On 64 × 64, seeds anywhere end as one disk at the centre: 8 random layouts of
>   1–4 seeds were 0.4–2.1 cells off-centre by step 1,200 (live, seed 11: 2.2). The live grid stays 64 × 64, not the
>   72 × 72 written under *The model* (that grid is the spike's training grid).
> - **It overshoots, then breathes.** Living cells: 3,546 at step 100 (a rounded square), ~2,000
>   from step 300 (the disk). Sampled every 1,000 steps to 12,000, it held between 1,081 and
>   2,334 living cells and never died out. *Many seeds* shows the centring.
> - **"First in-browser training" stays unverified.** M0's copy makes no such claim. Verify it
>   before M2 copy uses it.
>
> **Training spike (2026-10-23, M0): go, with limits.** On the RX 6800 XT a browser trains the
> Growing NCA (forward pass, backprop through time and Adam, all in WGSL) to a recognisable
> organism in **17–26 s**, well inside the ≤ 3 min T3 target. Its gradients match float64
> autograd at the float32 floor on two backends. The limits:
> - T2 is estimated, not measured. There is no integrated GPU here.
> - One training iteration is longer than a 60 fps frame, so the Teach view has to schedule
>   training around rendering.
>
> Code: `packages/neural-ca/train-spike/` (throwaway; outside the npm workspace; the gated kernel,
> the capture path and the committed checkpoint, sha256 `c98a4678…`, are untouched). Raw numbers:
> `packages/neural-ca/train-spike/results/summary.json`.
>
> - **Method.**
>   - Hand-written WGSL forward and backward for the model below: 16 channels, perception
>     48 → 128 → 16, fire rate 0.5 from `bp_hash3`, alive = 3×3 max-pool of alpha > 0.1.
>   - Backward through time keeps every step's state, recomputes the hidden layer, and
>     reduces the weight gradients split-K with no float atomics.
>   - Optimiser: per-tensor gradient normalisation, then Adam (lr 2e-3).
>   - Pool training with the worst sample reset to the seed: the Distill "persistent" setup,
>     no damage.
>   - Grid 72², with 40×40 procedural targets: a thin-limbed gecko standing in for the Distill
>     lizard, a starfish, and the package's two-tone disk.
>   - Headless snap Chromium 156 on RADV (NAVI21), default WebGPU limits, GPU time from
>     timestamp queries.
>   - "Recognisable" means the first evaluation (every 50 iterations; 8 organisms grown from a
>     seed) with silhouette IoU ≥ 0.85 at both 96 and 300 steps. Checked by eye against the
>     snapshots in `packages/neural-ca/train-spike/results/`.
> - **Speed, T3 shape** (batch 8, rollouts 64–96, pool 1024).
>   - 51 iterations/s; 19.3 ms GPU per iteration (p90 22.4): forward 6.3, backward 12.9,
>     Adam 0.07. Wall time equals GPU time, so the CPU-side encoding is hidden.
>   - If the whole dish is alive (the dense worst case, timing only), an iteration costs 29 ms,
>     or 35 ms at a fixed 96 steps.
> - **Time to a recognisable organism, T3 shape.**
>   - Gecko, 3 seeds: 850 / 1000 / 1300 iterations = 16.7 / 19.5 / 25.7 s.
>   - Starfish: 600 iterations (12.0 s). Disk: 500 (11.0 s).
>   - Sharp, with eyes and spots (RGB error ≤ 0.06 inside the shape): 1750–2000 iterations
>     (34–39 s) where reached within 2000. Seed 1 reaches RGB error 0.039 by 3000 (57 s).
>   - Grown organisms hold their shape at 300 steps, past the 96-step training horizon.
>   - Pool 256 instead of 1024: 900 iterations (18.0 s), so no loss in this run.
> - **Memory, accounted** (RADV VRAM delta from sysfs in brackets).
>   - Batch 8 / 96 steps: 656 MiB with pool 1024 (815 MiB); 413 MiB with pool 256 (560 MiB).
>   - State checkpoints are 246 MiB (97 × 2.65 MB). The spec's "≈ 210 MB at 80 steps" holds.
>   - The 1024-sample pool, at 324 MiB, is the largest optional cost.
>   - No buffer binding exceeds the default 128 MiB. Workgroup storage peaks at 14.5 KiB of 16
>     KiB, and the weights sit in a 32.5 KiB uniform buffer. `acquireGpu`'s default limits suffice.
> - **Gradient check.**
>   - 7 fixed cases: 1–96 steps, the committed checkpoint and random weights, from a seed and
>     from grown states.
>   - Raw parameter gradients compared with PyTorch float64 autograd drawing the same hashed
>     fire masks.
>   - Worst relative L2 error: 4.89e-5 on RADV and 4.89e-5 on SwiftShader (Chromium 148).
>     PyTorch's own float32 run reaches the same 4.89e-5 on that case: one 64-step case where
>     float32 and float64 part ways. The other cases are 8e-8 to 3.4e-6.
>   - GPU against PyTorch float32: ≤ 5.6e-6 everywhere. Alive-mask flips against float64: 0.
>   - Proposed M2 Prove budget: relative L2 ≤ 1e-4 against committed float64 gradients for
>     these cases (2× the measured worst). Declare it after a CI-backend run.
> - **Determinism.** "Same device ⇒ same weights" holds.
>   - Four 400-iteration runs (two in each of two browser sessions) ended with bit-identical
>     weights.
>   - Two 2000-iteration runs in separate sessions gave bit-identical losses at every iteration.
> - **T2 (integrated GPU), not measured.**
>   - The spec's T2 shape (batch 4, 64-step rollouts, pool 256) needs about twice the
>     iterations: 1750–2050 for the gecko, over 3 seeds.
>   - It runs at 11.3 ms per iteration on the RX 6800 XT (20–24 s) and uses 204 MiB (255 MiB
>     VRAM).
>   - On the RX 6800 XT the forward pass is latency-bound: 0.078 ms per step with a real organism
>     and 0.081 ms with the whole dish alive. An integrated GPU would be throughput-bound, so time scales with
>     work.
>   - Basis for the estimate: the dense run sustains 3.5 TFLOP/s of useful work, about 17% of
>     this card's FP32 peak, counting 61 kFLOP per fired cell-step. Assume the same 17% on an
>     integrated GPU.
>   - Estimated time to recognisable at full GPU duty: about 1–1.2 min on a 4 TFLOPS iGPU
>     (Radeon 780M class), 1.6–2.3 min at 2–2.6 TFLOPS (Iris Xe 96 EU, Apple M1), and 10–12 min
>     at 0.4 TFLOPS (UHD 620 class), which misses the ≤ 8 min target.
>   - SwiftShader takes 2.1 s per T2 iteration while the organism is still small, so T1 stays
>     shared-models-only.
>
> **What this changes in the spec:**
> - **T3 Teach.** Target "≤ 1 min to recognisable" in place of ≤ 3 min. The measured 17–26 s
>   leaves room for the frame-budget split below. The ~1–3 min in *Signature moment 2* becomes
>   ~20–60 s on a desktop GPU.
> - **Pool.** Default to 256 on T3: it trained as well, in one run, and saves 243 MiB. Storing
>   the pool as f16 with core `pack2x16float` would halve it again (unmeasured).
> - **Frame budget (new).** A T3 iteration is one ~19 ms submission, longer than a 60 fps frame.
>   - Slice training at step boundaries, about 6–8 ms of training per frame.
>   - Render the Teach view (the 2×4 sample grid and loss curve) at 15–30 fps while training,
>     then go back to 60 fps when it lives in the dish.
>   - Not measured.
> - **T2.** Keep "batch 4 / 64 steps, ≤ 8 min" until it is measured on an integrated GPU, before
>   M2 copy promises a time.
>   - Gate Teach on a measured rate: time the first ~20 iterations, show an ETA, and offer
>     shared models if the ETA runs past 8 min.
>   - Budget the frame split from that measured rate. At 40% GPU duty the Iris Xe estimate
>     grows to about 5–6 min.
> - **FLOP estimate.**
>   - Forward plus backward with the recompute is 61 kFLOP per fired cell-step, not ~25k per
>     cell.
>   - Only fired cells near the organism do MLP work. The forward runs where alpha > 0.1 within
>     5×5; the backward runs where the cell is alive and fired.
>   - The per-iteration total in that bullet is therefore an upper bound.
> - **Optimisation headroom if T2 needs it** (none of it is needed on T3):
>   - About 2× on the MLP kernels from compacting fired cells. The fire mask idles half of
>     every wave.
>   - Skipping dead tiles in the gather and mask passes, which run over the whole dish. Gather
>     costs 6.1 ms per 96 steps.
>
> **Corrections from building it:**
> - **Skip radius.** Skipping dead cells exactly needs alpha > 0.1 within **5×5**, not 3×3. A
>   cell that is not alive still updates, and its alpha feeds a neighbour's post-update alive
>   mask.
> - **Alive masks.** The masks must be stored per step (u32 per cell, 15 MiB at T3). They can't
>   be recovered from the stored states.
> - **Allocation.** VRAM is 1.24–1.42× the accounted bytes. The likely cause is the 97 small
>   per-step buffers rounding up in the driver's allocator, so M2 should pack the checkpoints
>   into a few ≤ 128 MiB buffers.
> - **T2 rollouts.** With fixed 64-step rollouts the organism grows a noisy rim at 96 steps that
>   settles by 300. A 48–64 range may fix it (unmeasured).

## Verdict on the prototype

- **Keep:** the committed checkpoint (weights == disk sha), the persistent regime, and the
  flagship proof — backend-conditional bit-exactness measured live over a full 21-frame
  sweep, adapter id recorded. Damage/regrow interaction and the hidden-channel view.
- **Drop:** a 40-pixel organism shown as a grey dot on a **white** field at load (the splash
  reel cut it for strobing); one organism only; presets named after internals (`fire sweep`,
  `backend Δ`); the organism rendered as raw texels.
- **Lesson:** the magic of growing NCA is *a learned rule that regrows a shape after you
  tear it*. The second magic — that a few thousand parameters learn this in minutes — has
  never been shown live in a browser as far as this research found.

## The experience

**Pitch:** *Draw a creature and teach a living texture to grow it — in your browser.*

**First ten seconds:** a dark, softly lit dish. A single seed cell glows; over a few seconds
a creature (lizard, butterfly, starfish — rotating daily) unfurls from it, large, with smooth
edges and a faint inner iridescence from its hidden channels. A hint: "Cut it."

**Signature moment 1 — Regrow:** drag across the organism to tear it; it bleeds, then heals
back to its shape. Tear it in half and (for the regeneration-trained models) each half
tries to regrow — sometimes two creatures.

**Signature moment 2 — Teach:** draw a 40×40 target (or pick an emoji, or drop an image).
Press *Teach*. The dish switches to a training view: a grid of 8 sample dishes growing with
the current rule, a loss curve falling, and the creature sharpening from noise into the
drawing over ~1–3 minutes on a desktop GPU (target; see risks). Then it lives in the main
dish and can be cut, saved and shared.

### Scenes

| Scene | What | Prompt |
|---|---|---|
| **The Dish** (default) | pretrained regenerating organism | "Cut it. It heals." |
| **Menagerie** | 6–8 pretrained organisms side by side | "Each one is the same code with different weights." |
| **Chimera** | graft cells from one organism into another | "What grows when two rules meet?" |
| **Teach** | in-browser training from your drawing | "Draw something simple. Watch it learn to grow." |
| **Textures** | texture NCA (Niklasson et al.) tiling a large plane, regrows after erasing | "No edges, no centre — only pattern." |
| **Inside the Cell** | cell grid view: one cell's 16 channels, perception filters, update | "This is the whole rule." |

### Tools

*Cut* (erase a stroke), *Seed* (plant a seed cell), *Graft* (pick cells, drop elsewhere),
*Freeze* (stop updates in a region — shows that growth is local), *Probe* (one cell's state).

## The model

- Growing NCA (Mordvintsev et al. 2020): 16 channels (RGBA + 12 hidden); perception =
  identity + Sobel x/y per channel (48 values); dense 48→128 (ReLU) → 128→16 (zero-init);
  stochastic update (rate 0.5) with a **seeded hash mask**; alive masking by 3×3 max-pool of
  alpha > 0.1. ~8.3k parameters.
- Grid 72×72 for a 40×40 target (canonical), live display upscales; Textures uses 256²
  (T3) with periodic boundaries.
- **In-browser training (Teach):**
  - Forward and backward passes as WGSL compute; backprop through time over 64–96 steps
    with **state checkpointing** (store the 16-channel state per step, recompute the hidden
    layer in backward) to fit memory.
  - Sample pool of 256–1024 states, batch 4–8, damage on the worst samples, per-variable
    gradient normalisation, Adam.
  - Back-of-envelope (to be measured): batch 8 × 72² cells × 80 steps × ~25k FLOPs/cell
    (fwd + bwd) ≈ 8×10¹⁰ FLOPs per iteration — tens of milliseconds on a desktop GPU, so
    ~1,000–2,000 iterations in 1–3 minutes. State checkpoints ≈ 210 MB at batch 8, 80 steps
    (halve batch or steps on T2; T1 does not train, it runs shared models).
  - Determinism: seeded update masks and pool sampling; same device ⇒ same weights.
- **Textures:** Niklasson et al. 2021 texture NCA (VGG-style style loss is too heavy to
  train in-browser; ship pretrained textures, train only the shape mode).
- **Export:** weights as a small binary (~33 kB f32) — download, local library
  (IndexedDB), and re-import. Share links carry a model id for gallery models only.

## The look

- Art direction: **specimen under glass**. Dark teal-black dish with a soft vignette and
  a rim highlight; organisms rendered from RGBA with premultiplied alpha, bicubic
  reconstruction and a subtle contact shadow so they sit *on* the dish, plus an optional
  thin "membrane" edge from the alpha gradient.
- Hidden channels as a gentle iridescent tint (PCA of the 12 hidden channels → 3 colours,
  at 15% strength) — togglable to full strength in Inside the Cell.
- Teach view: 2×4 grid of small dishes (pool samples), loss curve in a `PlotPanel`, the
  target as a ghost outline behind the main dish.

## The proof

- Keep the existing gate: the committed checkpoint's live re-run, bit-exact per backend
  over the 21-frame sweep, run-twice; port the kernel exactly (it is the gated surface).
- **Gradient check (new):** on a fixed tiny batch, WebGPU gradients vs the Python package's
  reference gradients (`packages/neural-ca`), relative error within a declared budget —
  shown in Prove as "your GPU's backprop matches the reference".
- **Trained-model card:** final loss, iterations, wall time, adapter, and a regeneration
  score (IoU with the target 200 steps after a standard cut), all measured on the run.
- Claims: "trained on your GPU" only when it was; the novelty claim (*first in-browser GPU
  NCA training*) is **verify before claiming** — this research found inference-only
  browser demos and server-side training UIs, not GPU training in the browser.

## Performance targets

| Tier | Live view | Teach |
|---|---|---|
| T3 | 60 fps, 72² + Textures 256² | ≤ 3 min to a recognisable shape (target) |
| T2 | 60 fps | batch 4 / 64 steps, ≤ 8 min (target) |
| T1 | 60 fps | not offered; shared models only |

## Risks and open questions

- **Training speed is the make-or-break.** Spike in M0: implement forward + backward for
  a single step, measure ms per iteration at batch 8 on the RX 6800 XT and an iGPU before
  committing to the Teach design.
- Exploding gradients through long rollouts: per-variable normalisation and gradient
  clipping as in the paper; shorten rollouts if needed.
- User drawings can be unlearnable (thin lines, disconnected parts) — the draw tool
  thickens strokes and the target is low-pass filtered; Teach warns on low alpha coverage.

## Milestones

| Milestone | Done when |
|---|---|
| M0 | Live NCA in the shell, organism large on the dish look; gate ported; **training spike measured** |
| M1 | Menagerie (pretrained gallery), Cut/Seed/Graft/Freeze tools, Inside the Cell |
| M2 | Teach end-to-end with gradient check in Prove; local model library |
| M3 | Textures; Chimera; posters/loops |

## References

- Mordvintsev et al. 2020, *Growing Neural Cellular Automata*, Distill — [distill.pub/2020/growing-ca](https://distill.pub/2020/growing-ca/)
- Niklasson et al. 2021, *Self-Organising Textures*, Distill — [distill.pub/selforg/2021/textures](https://distill.pub/selforg/2021/textures/)
- Pajouheshgar et al. 2023, *Mesh Neural Cellular Automata* — [arXiv:2311.02820](https://arxiv.org/abs/2311.02820)
- *Neural Cellular Automata: From Cells to Pixels* (2025) — high-resolution decoding of coarse NCA grids — [arXiv:2506.22899](https://arxiv.org/abs/2506.22899)
- Prior art for training UIs: [Growing-NCA-WebUI](https://github.com/semvdn/Growing-NCA-WebUI) (server-side TensorFlow training, browser front end)
