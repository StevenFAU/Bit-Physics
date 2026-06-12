---
date: 2026-06-12
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-audit
artifact_id: laneB-P5-dispatch-audit
dispatch: "P-5 (Lane B — remaining four on the chrome: neural-ca, rd-2d, ising, mandelbulb + boids cleanup)"
verdict: LANDED
verdict-state: HARD-STOP-BEFORE-NEXT-DISPATCH
head_sha_at_start: 96efb5e
parent_audits:
  - "[[laneB-P4-dispatch-audit-2026-06-12T02-30-00Z]]"
evidence_paths:
  - packages/neural-ca/web/src/main.ts
  - packages/neural-ca/web/index.html
  - packages/reaction-diffusion-2d/web/src/main.ts
  - packages/reaction-diffusion-2d/web/index.html
  - packages/ising-classical/web/src/main.ts
  - packages/ising-classical/web/index.html
  - packages/mandelbulb-explorer/web/src/main.ts
  - packages/mandelbulb-explorer/web/index.html
  - tools/productization/web-deploy/web/pages/assets/make-posters.mjs
  - tools/productization/web-deploy/web/pages/assets/boids-3d.png
---

# Lane B / P-5 dispatch audit — remaining four on the chrome + boids cleanup

> Append-only record for dispatch P-5 (build dispatch). The four remaining
> sims executed the P-3 migration recipe (P-3 audit § 1) under the P-4
> binding deltas (§ 0.5): theme + shell, Play/Study with measured
> diagnostics, cursor interaction where a clean channel existed, presets
> measured before naming. Plus the two ratified boids follow-ups. This
> completes the 7/7 chrome migration. ZERO WGSL touched (§ 2).

## § 1 — Work landed (commit chain, this dispatch)

1. `f982d16` — neural-ca: theme + panel-shell v2, Play/Study, measured
   alive-cell diagnostics; white-substrate canvas framed deliberately
   (presentation CSS); presets SKIPPED on measurement (§ 5.1).
2. `9f5bec3` — reaction-diffusion-2d: theme/shell, Play/Study +
   field-statistics diagnostics, cursor-as-seed (D-P1.2(a) call-out),
   capture-pinning split + four measured F/k regimes (D-P1.2(a) call-out;
   one rejection, § 5.2).
3. `8246f91` — ising-classical: theme/shell, Play/Study + E/M diagnostics,
   temperature regimes against the Onsager T_c (D-P1.2(a) call-out),
   cursor-as-spin-flip (D-P1.2(a) call-out; § 5.3).
4. `0d3d60b` — mandelbulb-explorer: theme/shell, Play/Study + DE-probe
   diagnostics, drag-orbit on the existing camera uniform (D-P1.2(a)
   call-out); shipped without presets (pre-authorized, § 5.4).
5. `9b98acf` — boids poster regenerated PLAIN (long-exposure stack retired);
   Stage 5.2 auto-framing skipped with rationale (§ 6).
6. This audit + Convention #12 SHA back-fill (after push).

## § 2 — WGSL touched: NO

`git diff --stat 96efb5e..9b98acf -- '*.wgsl'` is EMPTY — the whole
dispatch contains zero WGSL changes, as the dispatch pre-committed
("mandelbulb presets and everything else stay host-side"). No HARD-STOP was
needed: every surface that would have required WGSL was either shipped
host-side or skipped under a dispatch-provided escape hatch (§ 5.4, § 6).

## § 3 — Study-mode ruling per sim (P-4 § 0.5.5, measured at HEAD)

All four: **pause stepping, keep presenting** — except mandelbulb, which is
**frozen-frame** (it has no stepping to pause).

- neural-ca: mutation lives only in the update/mask compute dispatches
  inside `stepOnce()`; the render pass reads `cur` via a read-only-storage
  binding (`packages/neural-ca/web/src/main.ts:170`) and dispatches no
  compute. Measured in the headless harness: in Study, live step held
  290→290 across 2.5 s and the alive-cell statistics re-measured identical;
  the canvas kept presenting.
- reaction-diffusion-2d: mutation lives only in the compute dispatch inside
  `stepWith()`; the render binding is read-only
  (`packages/reaction-diffusion-2d/web/src/main.ts:113`). Measured: live
  step 2040→2040 across 2.5 s, field statistics identical.
- ising-classical: mutation lives only in the Metropolis dispatch inside
  `sweepWith()`; the render binding is read-only
  (`packages/ising-classical/web/src/main.ts:130`). Measured: live sweep
  772→772 across 2.5 s, E/N identical (-1.3818).
- mandelbulb-explorer: the display has NO evolving state — the ray-march
  re-renders from a camera uniform (uniform-only render bind group,
  `packages/mandelbulb-explorer/web/src/main.ts:70`); Study ends the RAF
  chain and a drag one-shot-renders the frozen view (strange-attractors
  pattern). Measured: Study frames byte-equal across 2.5 s; DE diagnostics
  identical on re-measure.

Every sim's in-app honesty note states its mode and what is measured when.
All four diagnostics paths carry the P-4 § 0.5.5 supersession token.

## § 4 — Capture-pinning proofs, all (a)-class surfaces (one-grep, re-runnable)

P-4 pattern verbatim (two param uniforms + stepCanonical/stepLive with
disjoint call sites) on both sims that gained live-divergent params:

- reaction-diffusion-2d: `stepCanonical()` called ONLY inside
  captureCanonical's loop (`packages/reaction-diffusion-2d/web/src/main.ts:300`);
  `stepLive()` ONLY in the RAF frame
  (`packages/reaction-diffusion-2d/web/src/main.ts:488`). The
  captureCanonical span contains ZERO references to
  liveParamBuf/stepLive/seedCell/injectCursorSeed/applyRegime/activeRegime
  (grep count 0), and it reloads the canonical seed-42 IC before its pinned
  re-run. Strongest evidence is numeric: the capture round-trip
  max_abs_err is `2.6414220577697378e-05` — bit-for-bit the SAME value as
  before the migration (pre-P-5 validate vs /tmp/laneB-P5-validate-s2) —
  the plumbing refactor is invisible to the capture path.
- ising-classical: `stepCanonical()` ONLY in captureCanonical's loop
  (`packages/ising-classical/web/src/main.ts:238`); `stepLive()` ONLY in
  the RAF frame (`packages/ising-classical/web/src/main.ts:405`); ZERO
  capture-span references to
  liveParamBuffer/stepLive/flipCell/injectCursorSpins/applyRegime/activeRegime.
- Cursor state writes (both (a)-class): gated to the `!suspended` live
  branch inside `frame()`, which early-returns while `isCapturing()`; both
  captures reload the canonical IC first, so pointer writes cannot reach a
  capture. The writes ride kernel-owned state through the SAME
  `queue.writeBuffer` path `loadIC` uses — rd-2d into the state
  double-buffer the kernel consumes
  (`packages/reaction-diffusion-2d/src/gray_scott.wgsl:25` read /
  `packages/reaction-diffusion-2d/src/gray_scott.wgsl:26` write), ising
  into the in-place spin buffer
  (`packages/ising-classical/src/metropolis.wgsl:32`). No new compute-side
  buffer or pass anywhere (P-4 § 0.5.4) — the rd-2d stage wording
  ("via the existing IC/state write path") sanctions the path class, and
  ising's "clean live write path" is the identical class.
- neural-ca and mandelbulb gained NO live-divergent params (no presets), so
  no pinning split was needed: neural-ca's live loop and capture both run
  canonical params; mandelbulb's drag drives a display uniform read by
  nothing in the capture path.

Grep transcript: /tmp/laneB-P5-capture-pin-grep.txt (re-runnable).

## § 5 — Presets: measure-before-naming loops, with rejections (P-4 § 0.5.1)

### 5.1 neural-ca — SKIPPED on measurement (dispatch-budgeted outcome)

The only live-uniform knobs the committed kernel exposes are fire_rate and
seed. Measured (scratch builds, never committed; sampled at live step
~270-290 via the Study diagnostics):

| fire_rate | alive cells (α>0.1) | alpha mass | verdict |
|---|---|---|---|
| 0.5 (canonical) | 2094 | 1765.5 | the watchable growth |
| 1.0 (synchronous) | 0 | 0.0 | pattern DIES — blank canvas, nothing to see |
| 0.25 (sparse) | 2426 | 1940.1 | same blob, fuzzier — not distinct |

No measured-distinct watchable regime exists without compute changes →
shipped without presets, as the dispatch pre-authorized.

### 5.2 reaction-diffusion-2d — four shipped, one REJECTED

All regimes run the committed kernel; only F/k uniforms vary (Du/Dv/dx/dt
canonical). Measured from the seed-square IC at ~5 780 live steps
(per-regime Study screenshots in the session evidence set /tmp/laneB-P5-rd2d-*.png):

| Preset | F / k | mass V | V coverage | measured look |
|---|---|---|---|---|
| canonical | 0.0367 / 0.0649 | 758.6 | 0.154 | dividing spots (λ-class) |
| solitons | 0.030 / 0.062 | 1263.1 | 0.282 | isolated self-maintaining spots |
| coral | 0.0545 / 0.062 | 2963.2 | 0.606 | branching coral labyrinth |
| maze | 0.029 / 0.057 | 2675.1 | 0.635 | ring fronts → long maze corridors (12k-step check) |

REJECTED by measurement: "worms" (F 0.078, k 0.061) — V mass decayed to
0.0 by step ~5 776: the dead uniform state, nothing to see. Replacement
candidate (maze) was itself re-measured at a 25 s horizon before naming,
and its title tightened to the measured behavior ("ring fronts that lock
into long maze corridors" — at first observation it reads as concentric
rings, settling into corridors by ~12k steps).

### 5.3 ising-classical — three shipped, names physically canonical

Only the T uniform varies (J/h canonical). Names are the canonical phases
relative to the EXACT Onsager 1944 critical temperature
`T_c = 2/ln(1+√2) ≈ 2.2691853` — cited in-repo:
`docs/sim-specs/lattice-spin/ising-classical/spec-ref.md` lines 72-76
("Critical temperature" block; three-anchor golden table
`tools/testkit/golden/tables/ising-classical-critical-temperature.json`),
NOT from memory. Measured at ~1 960 sweeps from the seed-42 IC:

| Preset | T | T/T_c | E per spin | \|M\| | measured look |
|---|---|---|---|---|---|
| sub-critical | 1.5 | 0.661 | -1.9106 | 0.401 | coarsened macro-domains |
| critical | 2.27 | 1.000 | -1.4280 | 0.562 | clusters at all scales |
| super-critical | 3.5 | 1.542 | -0.6606 | 0.020 | salt-and-pepper paramagnet |

Physics cross-check: the measured critical E/N (-1.428) sits at the exact
critical energy -√2 ≈ -1.414; the E ordering and the |M| collapse above
T_c match theory. The in-app diagnostics display T/T_c and the Onsager
closed form.

### 5.4 mandelbulb-explorer — shipped WITHOUT presets (pre-authorized)

The only host-side knob render.wgsl consumes is the camera azimuth — which
this dispatch turned into the drag-orbit itself. Named viewpoints of the
identical state are not distinct regimes (visual check recorded: rotated
views are detail-shuffled renderings of the same bulb —
/tmp/laneB-P5-mb-drag-before-drag.png vs -after-drag.png). Power-p /
escape-radius regimes are shader CONSTANTS → WGSL territory → not touched.

## § 6 — Boids follow-ups (Stage 5)

1. **Poster regen (LANDED, `9b98acf`):** plain shot via the committed
   `tools/productization/web-deploy/web/pages/assets/make-posters.mjs` —
   the P-2 long-exposure stack (16 shots × 4-frame gap) retired as obsolete
   post the P-4 point-size fix. New parameters (recorded per dispatch):
   seed 42 (app default), frames 240, px 512, zoom-to-content with
   zoomTight 0.62, photographic boost brightness(1.8) saturate(1.4). Same
   filename/path — landing page untouched. frames 240 was MEASURED as the
   moment the condensed flock stream is still inside the fixed render frame
   (probes at 120/160/200/240/360/520: by ~520 the unbounded kernel has
   drifted most of the flock out of frame; at ≤160 flocking structure has
   not yet condensed).
2. **Auto-framing (SKIPPED per the dispatch's own escape hatch):** the
   strange-attractors pattern rewrites a display-only buffer (its
   boot-copied liveTraj); boids has NO display-only buffer — the render
   reads the live physics ping-pong buffers directly, and rewriting those
   would alter the dynamics (compute surface, lane boundary). The render
   uniform consumed by the shader carries no scale/center slot, and the
   world transform is a shader constant
   (`packages/boids-3d/web/src/render.wgsl:26`, the `* 0.06`) — a clean
   host-driven fit needs a +2-slot display-only render.wgsl change, and
   this dispatch pre-committed ZERO WGSL. CSS-transform pseudo-framing was
   considered and rejected (raster zoom, breaks the stage framing).
   RECOMMENDED for the operator: ratify the display-only render.wgsl
   camera-fit (scale/center uniform slots) as a P-6 D-P1.2(c) item — it
   would also lift the poster-composition ceiling noted above.

## § 7 — Validation evidence (D-P1.3: all 7 sims per push)

Local `pipeline.py validate` under CHROME_BIN (snap Chromium, real
browser-WebGPU adapter), full 7-sim matrix before EVERY push:

| Push | Stage | Result | Artifacts |
|---|---|---|---|
| `f982d16` | 1 (neural-ca) | PASS 7/7, 0 deferred | /tmp/laneB-P5-validate-s1 |
| `9f5bec3` | 2 (rd-2d) | PASS 7/7 | /tmp/laneB-P5-validate-s2 |
| `8246f91` | 3 (ising) | PASS 7/7 | /tmp/laneB-P5-validate-s3, -s3b |
| `0d3d60b` | 4 (mandelbulb) | PASS 7/7 | /tmp/laneB-P5-validate-s4 |
| `9b98acf` | 5 (boids poster) | PASS 7/7 | /tmp/laneB-P5-validate-s5 |

Gate values held throughout — notably rd-2d's capture-roundtrip
max_abs_err unchanged to the last digit (§ 4), neural-ca capture_roundtrip
bit-exact, ising observable + run-twice, mandelbulb new_canonical at the
f32 floor. No tolerance touched anywhere.

Measured interaction checks (headless throwaway harness, session evidence
in /tmp/laneB-P5-*): four Study-freeze checks (§ 3); rd-2d cursor seed
visible same-frame + dragged path grows a chain of dividing spots; ising
+1 droplet visible same-frame in the all-down sub-critical phase and fully
eaten 1.2 s after release; mandelbulb drag rotates / orbit holds inside
the 4 s idle window (frames byte-equal) / orbit resumes after it (frames
differ).

## § 8 — CI observations (S.5 sweeps) + SHIFTs

- **cpp-strict runner flake (cross-lane, operator attention; continues
  P-3 § 7/§ 9 and P-4 § 8):** over the P-5 window, cpp-strict was red at
  `9f5bec3` (pure TS/HTML diff, zero C++/CMake/WGSL) and green at
  `f982d16`, `8246f91`, `0d3d60b` — same content-uncorrelated
  red-on-runner-drift signature (R-CPPB2 cross-build digest mode). All
  other workflows green at every completed pushed SHA; `9b98acf` checks
  were in flight at audit-write time and are swept before the SHA
  back-fill push.
- **SHIFT (commit granularity):** P-4 landed one commit per feature; P-5
  landed one integrated commit per sim with every (a)-class surface called
  out EXPLICITLY in the commit message (cursor-as-seed, regimes + pinning
  split, cursor-as-spin-flip, drag-orbit). Nothing rode silently in a
  styling commit — the D-P1.2(a) call-out + full-validate requirements were
  met per commit; only the slicing differs.
- **SHIFT (interpretation, rule 4):** rd-2d cursor-as-seed and ising
  cursor-as-spin-flip are live-loop STATE writes riding the kernel-owned
  state buffers via the existing IC `queue.writeBuffer` path — the
  dispatch's own Stage-2 wording ("via the existing IC/state write path")
  sanctions the class; the physarum deposit-channel precedent differs in
  that its channel is kernel-cleared each step, while here the write IS the
  state (like the IC itself). Declared in both honesty notes; capture
  isolation proven in § 4.
- **SHIFT (minor, naming):** rd-2d "worms" → rejected dead; replacement
  measured and title tightened before shipping (§ 5.2) — the P-4
  measure-before-naming rule working as intended, one loop per sim as
  budgeted.
- **Posters:** the six non-boids posters remain valid (no boot-behavior
  changes at the photographed frames; the chrome panel is hidden by the
  generator). The boids poster is now an honest plain shot; its
  composition ceiling is the missing camera fit (§ 6.2 recommendation).
- Lane boundary held: no compute kernel, step loop, seeded init,
  capture/gate path, tolerance or verify code modified anywhere in the
  dispatch; zero WGSL (§ 2).

## § 9 — Evidence + Convention #12 back-fill (after push)

- Stage commit SHAs recorded in § 1 (pushed before audit-write).
- `tools/integrity` run: `uv run python -m integrity --all` locally before
  the audit push (result recorded in the back-fill entry below).
- p5_audit_commit_sha: *(back-filled below per Convention #12 — never `--amend`)*
