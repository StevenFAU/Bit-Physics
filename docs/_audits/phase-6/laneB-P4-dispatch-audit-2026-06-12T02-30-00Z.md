---
date: 2026-06-12
author: lane-b-polish-agent
phase: 6
lane: B
artifact: dispatch-audit
artifact_id: laneB-P4-dispatch-audit
dispatch: "P-4 (Lane B — charisma pair migration: boids-3d + physarum)"
verdict: LANDED
verdict-state: HARD-STOP-BEFORE-P-5
head_sha_at_start: 1158a14b676ffea407667e73778530cbd1fe18ea
parent_audits:
  - "[[laneB-P3-dispatch-audit-2026-06-12T00-35-00Z]]"
evidence_paths:
  - packages/boids-3d/web/src/main.ts
  - packages/boids-3d/web/src/render.wgsl
  - packages/boids-3d/web/index.html
  - packages/physarum/web/src/main.ts
  - packages/physarum/web/index.html
---

# Lane B / P-4 dispatch audit — charisma pair on the P-3 chrome

> Append-only record for dispatch P-4 (build dispatch). Both sims executed
> the P-3 migration recipe (P-3 audit § 1) end to end: theme + shell,
> Play/Study, cursor interaction, named measured regimes — plus the one
> ratified WGSL touch (boids point-size). All P-3 §0.5 binding rules applied.

## § 1 — Work landed (commit chain, this dispatch)

1. `9730a4c` — boids-3d theme + panel-shell v2 (structure only).
2. `f3fb5d4` — boids-3d `render.wgsl` point-size fix (THE ratified WGSL
   touch; § 2).
3. `3c64825` — boids-3d Play/Study + measured flock diagnostics.
4. `424bc03` — boids-3d cursor-as-camera (D-P1.2(a) call-out).
5. `40442b2` — boids-3d named flock regimes (D-P1.2(a) call-out).
6. `e8364c1` — physarum theme + panel-shell v2 (structure only).
7. `8e8e1fa` — physarum Play/Study + measured trail diagnostics.
8. `3cdc328` — physarum cursor-as-force (D-P1.2(a) call-out; § 6).
9. `96b2ae7` — physarum named sensing regimes (D-P1.2(a) call-out).
10. This audit + Convention #12 SHA back-fill (after push).

## § 2 — WGSL touched: YES — exactly one file, one commit, display-only

`git diff --stat 1158a14..96b2ae7 -- '*.wgsl'` →
`packages/boids-3d/web/src/render.wgsl | 23 ++++++++++++++++++++--- (+20/−3)`
— the whole dispatch's WGSL diff is this one display shader in commit
`f3fb5d4` (explicit call-out in its message per D-P1.2(c)).

Change: WebGPU point-list rasterizes at a fixed 1 px, which made the
1000-agent flock nearly invisible at 720 px (root cause of the P-2 poster's
long-exposure stacking). Each agent now draws as a two-triangle screen-space
sprite (6 vertices/agent, half-size 0.007 clip ≈ 5 px); main.ts switched the
pipeline topology to triangle-list and draw(NA)→draw(NA·6).

Display-only proof (measured, two independent lines):
- Same reads, no writes: the shader's storage bindings stay read-only
  (`packages/boids-3d/web/src/render.wgsl:14` and `:15` —
  `var<storage, read>`); the world transform and speed palette are
  unchanged; no compute pass touched.
- Byte-level gate invariance: the boids `short_horizon_step100_pos_max_abs`
  is `0.003185892651170974` in the post-fix validate
  (`/tmp/laneB-P4-validate-b12`) and in every later one — bit-identical
  physics before/after the render change, run-twice byte-identical
  throughout.

## § 3 — Study-mode ruling per sim (P-4 § 0.5.3, measured at HEAD)

Both sims: **pause stepping, keep presenting** (render-without-step).

- boids-3d: the render pass reads pos/vel read-only
  (`packages/boids-3d/web/src/render.wgsl:14`–`:15`) and the render encoder
  dispatches no compute; stepping lives in `stepLive()` alone. Measured in
  the headless harness: in Study, `live step` held 101→101 across 2.5 s
  (~150 presented frames) while the canvas kept presenting (camera orbit
  live, screenshots differ). The frozen flock stays orbitable.
- physarum: deposit/decay mutate state ONLY in the agents/apply/diffuse
  compute passes inside the step; the render pass is a fullscreen triangle
  reading the trail read-only (`packages/physarum/web/src/render.wgsl:5`).
  Study suspends the 3-pass step; the static trail keeps presenting.

Each sim's in-app honesty note states the mode ("stepping is paused; the
view keeps presenting") and what is measured when.

## § 4 — Capture-path-untouched proof, all (a)-class commits

Both sims got the same pinning split: a live param uniform for the RAF loop,
the canonical param uniform reserved for the capture re-run.

- boids-3d: `stepCanonical`/`stepLive` defined at
  `packages/boids-3d/web/src/main.ts:162`–`:163`; `stepCanonical()` is
  called ONLY inside captureCanonical's loop
  (`packages/boids-3d/web/src/main.ts:215`), `stepLive()` ONLY in the RAF
  frame (`packages/boids-3d/web/src/main.ts:399`). captureCanonical (lines
  195–236) has ZERO references to
  liveParamBuf/stepLive/dragPointer/lastPointerMs/applyRegime/activeRegime/angle.
  It re-runs from the seed-42 IC (`loadIC()`) with canonical params — preset
  and pointer state cannot reach it.
- physarum: `stepCanonical`/`stepLive` at
  `packages/physarum/web/src/main.ts:171`–`:172`; capture loop calls
  `stepCanonical()` at `packages/physarum/web/src/main.ts:199`, the RAF
  frame calls `stepLive()` at `packages/physarum/web/src/main.ts:410`.
  captureCanonical (lines 194–234) has ZERO references to
  liveParamBuf/stepLive/injectCursorDeposit/forceCell/applyRegime/activeRegime,
  and `reset()` wipes trail + deposit buffers before its canonical 5000-step
  re-run. Cursor injection is additionally gated to live stepping
  (`injectCursorDeposit()` is called only in the !suspended live branch, and
  frame() early-returns while isCapturing()).

Evidence transcript: `/tmp/laneB-P4-capture-pin-grep.txt` (re-runnable greps).

## § 5 — Validation evidence (D-P1.3: all 7 sims per push)

| Push | Commits | Result | Artifacts |
|---|---|---|---|
| `f3fb5d4` | boids 1.1–1.2 | PASS 7/7, 0 deferred | /tmp/laneB-P4-validate-b12 |
| `424bc03` | boids 1.3–1.4 | PASS 7/7 | /tmp/laneB-P4-validate-b34 |
| `40442b2` | boids 1.5 | PASS 7/7 | /tmp/laneB-P4-validate-b5 |
| `96b2ae7` | physarum 2.1–2.5 | PASS 7/7 | /tmp/laneB-P4-validate-p15 |

Gate values held throughout: boids run-twice byte-identical, step-100
short-horizon 0.00319 < 0.01, v_max clamp ≤ 3.0; physarum run-twice
byte-identical, total_mass 22499.9962 vs canonical 22500.0 (rel ≈ 1.7e-7,
threshold 1e-3). The other five sims stayed green and untouched at every
push. No tolerance touched anywhere.

## § 6 — Cursor-as-force (physarum) — the first "be a force in the field"

Mechanism: the pointer writes a falloff blob into the u32 fixed-point
deposit buffer — which the committed kernel's `apply` pass consumes and
clears every step (`packages/physarum/src/physarum.wgsl:86` clears it after
adding to the trail) — immediately before the live step. The injection rides
the kernel's OWN deposit channel: no new kernel, no WGSL change; the
committed physics adds it to the trail and the agents sense and steer toward
it. Pointer→grid mapping verified against the render's `x·H + y` indexing
and uv flip.

Measured (headless, screenshots in the session evidence set
`/tmp/laneB-P4-phys-force-held.png` / `-after.png`): the deposit dot is
visible the SAME frame under the held pointer; 2.5 s after release the
agents have visibly recruited onto the dragged path (bright reinforced
filament where the cursor passed). Input-consequence is immediate.

## § 7 — Named regimes: honest names, measured distinctness

All regimes run the committed kernels; only uniforms vary. Candidates were
measured BEFORE shipping; two boids candidates were REJECTED and two
physarum names tightened when measurement contradicted them.

boids-3d (weights/perception only; v_max 3, dt 0.05 canonical; 500-step
order parameters from the in-app measured diagnostics):

| Preset | w_sep/w_align/w_cohere, perc | mean speed | polarization | rms spread | look |
|---|---|---|---|---|---|
| canonical | 1.5/1.0/1.0, 5 | 1.750 | 0.076 | 53.6 | loose flock |
| tight swarm | 0.5/1.0/2.5, 5 | 0.208 | 0.206 | 7.8 | dense slow ball |
| midge cloud | 2.0/0.2/2.0, 8 | 0.678 | 0.037 | 16.9 | agitated cohesive cloud |
| flocklets | 1.5/1.0/1.0, 2 | 1.759 | 0.026 | 54.6 | many small groups |

REJECTED by measurement: "schooling" (w_align 3.0 — global polarization
0.015 refuted the name; local schools cancel) and "scatter" (w_sep 3.0 —
dispersed out of the fixed render frame; nothing to see). The kernel has no
world bounds (`packages/boids-3d/src/boids.wgsl` — pure Reynolds), so
regimes must stay frame-observable.

physarum (sensing geometry only — Δφ/L_sense; deposit/decay/L_move canonical
so the d·N·(1−α)/α = 22500 mass equilibrium is regime-invariant; axes per
Jones 2010 § 5, DOI 10.1162/artl.2010.16.2.16202, canonical set § 3 Table 1
as pinned in `docs/sim-specs/agent-based/physarum/algebraic.md` § 2; ~660
live steps):

| Preset | Δφ / L_sense | total mass | peak trail | look |
|---|---|---|---|---|
| canonical | 45° / 9 | 22500.0 | 22.8 | branching network |
| fragments | 45° / 3 | 22500.0 | 16.7 | short fine fragments |
| long strands | 45° / 24 | 22500.0 | 20.7 | sparse large corridors |
| trunk lines | 22.5° / 9 | 22500.0 | 32.4 | few straight reinforced trunks |

Name SHIFTs: "fine mesh"→"fragments", "tight weave"→"trunk lines" — the
first names overclaimed connectedness/weave vs the measured visuals.
Per-preset Study screenshots: `/tmp/laneB-P4-boids-*.png`,
`/tmp/laneB-P4-phys-*.png` (session evidence).

## § 8 — CI observations (S.5 sweeps) + SHIFTs

- **cpp-strict runner flake (cross-lane, operator attention; continues the
  P-3 § 7/§ 9 observation):** over the P-3+P-4 window, cpp-strict was red at
  `72572ad`, `86be839`, `a862b72`, `424bc03` and green at `747f0ed`,
  `744497f`, `1158a14`, `f3fb5d4` — red/green is uncorrelated with content
  (the ONLY commit touching WGSL, `f3fb5d4`, ran green; pure-docs and
  pure-TS pushes ran red). Consistent with the R-CPPB2 cross-build digest
  mode pre-declared in the workflow header, i.e. a runner pool with mixed
  Mesa/LLVM builds. Recommendation to the operator: apply the banked
  remediation (pin Mesa via container, or relax the exact-digest ctests to
  2-run determinism) — the flake otherwise erodes the S.5 green-per-push
  signal. All OTHER workflows were green at every pushed SHA.
- SHIFT (measurement-driven preset revisions): see § 7 — recorded here as
  the P-3 "measure before shipping" rule working as intended.
- SHIFT (minor, interpretation): physarum's cursor force is a live-loop
  STATE write (deposit injection), not a uniform write — sanctioned by the
  dispatch's own wording ("deposit perturbation via live-loop writes only")
  and § 4's gating proof; the honesty note declares it.
- Posters: boids' P-2 long-exposure poster remains valid but is now
  obsolete in spirit — the flock is directly visible post-fix. Regenerating
  it (plain shot, no exposure stacking) is recommended as a P-5 side task
  (operator-ratified asset change; not done in this dispatch).
- Lane boundary held: beyond the one ratified render.wgsl commit, no compute
  kernel, step loop, seeded init, capture/gate path, tolerance or verify
  code modified.

## § 9 — Evidence + Convention #12 back-fill (after push)

- Stage commit SHAs recorded in § 1 (pushed before audit-write).
- p4_audit_commit_sha: *(back-filled below per Convention #12 — never `--amend`)*

p4_audit_commit_sha: d4e0b63  # Convention #12 back-fill (§ 9)
