---
date: 2026-06-13
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-audit
artifact_id: laneB-P6-dispatch-audit
dispatch: "P-6 (Lane B — boids camera-fit under ratified WGSL touch + about/methodology page)"
verdict: LANDED
verdict-state: HARD-STOP-BEFORE-NEXT-DISPATCH
head_sha_at_start: 3ca0f97
parent_audits:
  - "[[laneB-P5-dispatch-audit-2026-06-12T03-45-08Z]]"
evidence_paths:
  - packages/boids-3d/web/src/render.wgsl
  - packages/boids-3d/web/src/main.ts
  - tools/productization/web-deploy/web/pages/assets/make-posters.mjs
  - tools/productization/web-deploy/web/pages/assets/boids-3d.png
  - tools/productization/web-deploy/web/pages/about.html
  - tools/productization/web-deploy/web/pages/index.html
---

# Lane B / P-6 dispatch audit — boids camera-fit (ratified WGSL) + about/methodology page

> Append-only record for dispatch P-6 (build dispatch). Stage 1: the
> operator-ratified D-P1.2(c) display-only camera-fit (THE one WGSL touch),
> host-side readback-driven auto-framing, the 3-min in-frame verification,
> and boids poster regen #3. Stage 2: the about/methodology page + landing
> nav. All P-3/P-4/P-5 binding rules applied.

## § 1 — Work landed (commit chain, this dispatch)

1. `b2d8da5` — boids `render.wgsl` camera-fit slots (THE ratified WGSL
   touch; § 2) + identity host plumbing.
2. `41d114b` — boids host-side auto-framing (readback-driven smooth follow;
   ZERO WGSL; § 3–§ 4).
3. `02bf849` — boids poster regen #3 (frames 420; § 6).
4. `6d7f80f` — about/methodology page + landing nav chip (§ 7).
5. This audit + Convention #12 SHA back-fill (after push).

## § 2 — WGSL touched: YES — exactly one file, one commit, display-only (ratified § 0)

`git diff --stat f9fbc9c..b2d8da5 -- '*.wgsl'` →
`packages/boids-3d/web/src/render.wgsl | 16 +++++++++++++---` — the whole
dispatch's WGSL diff is this one display shader in commit `b2d8da5`
(explicit call-out in its message per D-P1.2(c)). Every other commit:
`git diff --stat b2d8da5..6d7f80f -- '*.wgsl'` is EMPTY.

Change: RU gains the two ratified slots — `fit_center: vec3<f32>` +
`fit_scale: f32` (render uniform 16→32 bytes); the world transform becomes
`(p - fit_center) * 0.06 * fit_scale`, consumed at render time only.

Display-only proven two ways (measured, the ratification's required form):

1. **Diff scope:** the commit touches `render.wgsl` plus two render-uniform
   lines in `main.ts` (buffer size + identity write). The shader's storage
   bindings stay `var<storage, read>`; no compute pass, step loop, seeded
   init, capture or gate path in the diff.
2. **Capture byte-stability + byte-equal identity framing:**
   - Browser-emitted capture digest `sha256
     6c6651a2c2e4d026ba3881334054745030bd16a09cd72b3b05c2f3e4001bf34e` is
     IDENTICAL pre-change and post-change, and run-twice identical on both
     sides (/tmp/laneB-P6-validate-pre, -postA, -postB).
   - Identity-framing frames are byte-equal pre/post: deterministic
     RAF-pump harness (the committed make-posters.mjs wrapper pattern;
     /tmp/laneB-P6-framecheck.mjs) photographed the canonical regime at RAF
     frames 1 and 300 — PNG sha256 `e068197e…8305` (f1) and `d8469eba…e260`
     (f300) AND the decoded-RGBA sha256 match exactly pre/post; screenshot
     channel itself proven run-twice byte-identical first.
   - Gate value `short_horizon_step100_pos_max_abs = 0.003185892651170974`
     bit-identical to the P-4/P-5 baseline in every validate of this
     dispatch.

## § 3 — Auto-framing (Stage 1b, `41d114b`, host-only)

A 4 Hz position readback (the SAME `readBuf` path capture + Study
diagnostics use) measures the flock bbox; `frame()` damps the displayed
fit toward it (FIT_DAMP 0.04 ≈ 0.4 s at 60 fps — smooth follow, no snaps).
Rotation-safe: the orbit spins around y, so the horizontal bound uses the
worst-case xz radius about the bbox centre; scale clamped [0.05, 2.0],
margin 0.8 (keeps depth-mapped z inside (0,1) — no depth clipping).
Honesty note declares it verbatim: "camera framing is presentation-side (a
position readback drives display-only scale/center render uniforms) —
simulation state unaffected".

## § 4 — Capture-pinning proof (one-grep, re-runnable)

Transcript /tmp/laneB-P6-capture-pin-grep.txt, from
`packages/boids-3d/web/src/main.ts` at `41d114b`:

- The fit reaches the GPU at EXACTLY ONE site — the
  `queue.writeBuffer(renderUniform, …)` inside `frame()` — and `frame()`
  early-returns while `isCapturing()`; the readback loop also skips under
  `isCapturing()`. So every frame the capture path could influence renders
  with no fit write at all, and the capture itself renders nothing.
- ZERO references to `fit`/`renderUniform` inside the `captureCanonical`
  span (grep exit 1 over the function body).
- Capture byte-stability through the auto-framing commit: digest
  `6c6651a2…001bf34e` unchanged (§ 2), run-twice identical.

## § 5 — Live-page failure verified fixed (Stage 1.3, ≥3 min per regime)

Harness /tmp/laneB-P6-inframe.mjs: REAL-TIME run (no frame pump), canvas
sampled every 10 s, bright-pixel count (threshold r+g+b>54, the committed
poster threshold) + bright-content bbox:

| Regime | Duration | Samples | min bright px | Edge contact | Verdict |
|---|---|---|---|---|---|
| canonical | 190 s | 19 | 24 058 | none | IN-FRAME THROUGHOUT |
| flocklets | 190 s | 19 | 26 945 | none | IN-FRAME THROUGHOUT |

Transcripts: /tmp/laneB-P6-inframe-canonical.txt, -flocklets.txt. Before
the fit, the flock left the fixed frame by ~520 RAF frames (P-5 audit § 6);
the frame-300 canonical screenshot grew from 6.7 KB of content pre-fit to
62 KB post-fit (same harness, same threshold).

Measurement SHIFT recorded: the FIRST flocklets run reported edge-touches
at every sample — measured to be settings-panel pixels overlapping the
canvas element's crop (a preset click adds two status lines, pushing the
fixed panel's bottom edge over the canvas corner), NOT flock pixels. The
harness now hides the panel exactly as the committed make-posters.mjs
does; the canonical run had no preset click, hence no overlap and a valid
first run.

## § 6 — Poster regen #3 (Stage 1.4, `02bf849`)

Via the committed `make-posters.mjs`, same filename/path (landing page
untouched). Params (recorded per dispatch): seed 42 (app default),
**frames 420**, px 512, zoom-to-content zoomTight 0.62, boost
**brightness(1.35) saturate(1.5)**. frames 420 is reachable because the
camera-fit removed the P-5 "drifts out of the fixed frame past ~240"
ceiling — the murmuration wisps are fully developed there. Exposure
softened 1.8→1.35: fit-framed sprites are denser and 1.8 washed the speed
palette to white (candidates at 240/420/600/800 and both exposures were
generated and compared; the discarded candidates were deleted, never
committed). Composition verified stable across two independent generator
runs (the auto-fit converges by readback timing, not frame count alone;
the zoom-to-content crop normalizes the residual variance — noted in the
committed config comment).

## § 7 — About/methodology page (Stage 2, `6d7f80f`)

`tools/productization/web-deploy/web/pages/about.html` — house style
verbatim (token set copied from the landing, self-hosted Plex fonts via
the shared ./assets/), ZERO JS, one page. Landing gains a top-right nav
chip. Headless render check: both pages load with no console errors
beyond the pre-existing favicon-404 exemption (P-5 precedent).

Claim → in-repo file link table (measure-live: every target verified
present at HEAD before the page was written):

| Page claim | Linked file(s) |
|---|---|
| deterministic seeded runs + run-twice gate | packages/boids-3d/web/public/boids-ic-seed42.bin · tools/productization/web-deploy/verify.py |
| pinned canonical captures | tests/fixtures/legacy-captures/ (boids-3d-ref.h5/.json) |
| tolerances measured-then-declared, never widened | tools/testkit/equivalence/tolerance.toml · tolerance-budget.toml · .github/workflows/tolerance-budget-check.yml |
| four-state verdicts | docs/architecture.md ("Four-state verdicts", line 1458 at HEAD) |
| append-only audit chain + SHA back-fill | docs/_audits/ · docs/_audits/phase-5/phase-5-close-2026-06-10T12-38-41Z.md |
| boids "schooling" REFUTED exhibit | docs/_audits/phase-6/laneB-P4-dispatch-audit-2026-06-12T02-30-00Z.md (§ 7) |
| neural-ca honestly-absent presets exhibit | docs/_audits/phase-6/laneB-P5-dispatch-audit-2026-06-12T03-45-08Z.md (§ 5.1) |
| ising E/N at −√2 criticality exhibit | laneB-P5 audit § 5.3 · docs/sim-specs/lattice-spin/ising-classical/spec-ref.md · tools/testkit/golden/tables/ising-classical-critical-temperature.json |
| capture-pinning split | packages/boids-3d/web/src/main.ts · laneB-P5 audit § 4 |
| honesty-note contract | common/common-web/src/panel-shell.ts |
| display-only camera-fit, proven byte-stable | packages/boids-3d/web/src/render.wgsl (header) · docs/_audits/phase-6/ (this ledger) |
| validate pipeline re-runs the gates | tools/productization/web-deploy/pipeline.py · verify.py |
| release binaries + SHA256SUMS | GitHub release v0.5.0-phase-5 |
| house style | docs/design/house-style.md |

## § 8 — Validation evidence (D-P1.3: all 7 sims per push)

Local `pipeline.py validate` under CHROME_BIN (snap Chromium, real
browser-WebGPU adapter), full 7-sim matrix before EVERY push:

| Push | Stage | Result | Artifacts |
|---|---|---|---|
| `b2d8da5` | 1a (WGSL fit slots) | PASS 7/7, 0 deferred | /tmp/laneB-P6-validate-s1 (+ -pre/-postA single-sim baselines) |
| `41d114b` | 1b (auto-framing) | PASS 7/7 | /tmp/laneB-P6-validate-s2 (+ -postB single-sim) |
| `02bf849` | 1c (poster) | PASS 7/7 | /tmp/laneB-P6-validate-s3 |
| `6d7f80f` | 2 (about page) | PASS 7/7 | /tmp/laneB-P6-validate-s4 |

Gate values held throughout — boids `short_horizon_step100_pos_max_abs`
bit-identical at `0.003185892651170974` in every run; run-twice
byte-identical everywhere; no tolerance touched anywhere.

## § 9 — CI observations (S.5 sweeps) + SHIFTs

- **cpp-strict runner flake (cross-lane, operator attention; continues
  P-3 § 7 / P-4 § 8 / P-5 § 8):** red at `b2d8da5` (WGSL+TS diff, zero
  C++/CMake) and `02bf849` (PNG + generator-config diff), green at
  `41d114b` (pure TS) — the same content-uncorrelated
  red-on-runner-drift signature (R-CPPB2 cross-build digest mode). All
  other workflows green at every completed pushed SHA (36/37 + 37/37 +
  36/37); `6d7f80f` checks in flight at audit-write time, swept before
  the SHA back-fill push.
- **SHIFT (validate-vs-rebase ordering):** stage-1a/1b pushes rebased
  onto Lane A commits that landed between validate and push
  (`ce70309`/`f9fbc9c`/`e1f9317`) — all three verified docs-only
  (`git show --stat`), so each validated tree is content-identical to its
  pushed tree on every web/validate surface.
- **SHIFT (measurement methodology, § 5):** flocklets edge-touch false
  positive from panel-over-canvas crop overlap; harness fixed to hide the
  panel (the committed poster generator's own hide), regime re-measured
  clean for the full 190 s.
- **SHIFT (poster exposure param):** boost 1.8→1.35 alongside the
  dispatched frames change — measured cause recorded (§ 6); within the
  "strongest honest composition" wording; photographic only.
- **Deploy-assembly gap (operator flag for the P-5+P-6 deploy):** the
  web-deploy.yml `Assemble site` step copies ONLY
  `pages/index.html` + sim bundles — `pages/assets/` (posters, fonts) and
  the new `pages/about.html` are NOT copied; the live site still runs the
  pre-v2 landing so nothing is broken today, but the next deploy needs the
  assemble step extended (e.g. copy `index.html`, `about.html`, `assets/`
  — excluding `make-posters.mjs` if desired) or the P-2 landing v2 +
  P-5/P-6 posters + about page will 404. Left untouched here: the deploy
  workflow is operator-dispatched territory, not Lane B presentation.
- **Auto-framing determinism note:** the displayed fit converges by
  wall-clock readback timing, so live-view pixels are not frame-count
  reproducible (the capture path is unaffected — § 4; the under-pump
  identity proof in § 2 predates the framing commit and used identity
  writes only). Declared in the honesty note as presentation-side.
- Lane boundary held: no compute kernel, step loop, seeded init,
  capture/gate path, tolerance or verify code modified anywhere; WGSL
  touched in exactly the one ratified commit (§ 2).

## § 10 — Evidence + Convention #12 back-fill (after push)

- Stage commit SHAs recorded in § 1 (pushed before audit-write).
- `uv run --no-sync python -m integrity --all` at the audit tree:
  **0 HARD_FAIL, 26 SOFT_WARN** — every SOFT_WARN pre-existing in
  phase-1/2/5 and Lane A c1-u* notes (the two new since P-5 are Lane A
  c1-u4-landing / c1-u5-probe front-matter warnings; none against this
  audit or the P-6 commits).
- p6_audit_commit_sha: *(back-filled below per Convention #12 — never `--amend`)*

p6_audit_commit_sha: d6928fb  # Convention #12 back-fill (§ 10)

Back-fill record: final S.5 sweep at back-fill time — `6d7f80f` 34/37
complete all green, 3 in flight (cpp-strict among the completed greens);
`d6928fb` (docs-only) 36 queued/in-flight, 1 green. No completed non-green
check on either SHA.
