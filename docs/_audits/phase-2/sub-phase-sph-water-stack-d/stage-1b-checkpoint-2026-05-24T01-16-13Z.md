---
date: 2026-05-24T01-16-13Z
author: sph-water-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sph-water-stack-d-stage-1b
subject: "Stage 1b (implementation) CLOSE for the sph-water -> Stack-D port. VERDICT CONFIRMED. Gates 4-13 GREEN; gate 14 PENDING-1c. Stack-D Taichi-DSL DFSPH port at packages/sph-water-stack-d/ (reference/dfsph_taichi.py pure-Python golden surface + Taichi spatial-hash kernels; sim.py determinism docstring + runners; invariants.py 2 invariants); spec-ref-stack-d.md; probe report. Golden gate-4a/4b err 0.0 (pure-Python f64). Test suite 14 passed / 1 skipped (cross_stack -> 1c). Canonical capture dam-break-100K-particles-seed42-step1000 (.h5 OID 8435f166...; .json 4027f89c...; 252.346s = 0.195x numpy-ref baseline). f64 via IC-11 + f64-typed ndarrays (no default_fp edit). R-S3: combined iters/step = 1 (explicit-Euler rigid free-fall, NOT iterative DFSPH; Stage-0 k≈10 estimate dissolved); 252s << 43-min band; escape-hatch NOT invoked. Gate-13 worktree replay at 3a6eb82: 7 MNFE (4 reference/2 sim/1 invariants) structural reproduction VERIFIED. Informational gate-14 preview: position/velocity bit-identical, density max_rel_err 1.07e-15 (~10 orders < 1e-4). 1 new SHIFT (S6: reference trajectory is explicit-Euler free-fall not iterative DFSPH). Cumulative 130. feat commit 41f6685."
verdict-state: CONFIRMED
head_sha: 6cde9782332b21c5212a75b4085b17606f57da39
head_sha_at_checkpoint: 6cde9782332b21c5212a75b4085b17606f57da39
parent_audits:
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-checkpoint-2026-05-23T23-40-26Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1a-checkpoint-2026-05-24T00-06-11Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
evidence_paths:
  - tools/testkit/failing-tests-evidence/sph-water-stack-d-implemented-2026-05-24T01-16-13Z.txt
  - captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.json
  - captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.h5
  - packages/sph-water-stack-d/sph_water_stack_d/reference/dfsph_taichi.py
  - packages/sph-water-stack-d/sph_water_stack_d/sim.py
  - packages/sph-water-stack-d/sph_water_stack_d/invariants.py
  - docs/sim-specs/particle-fluids/sph-water/spec-ref-stack-d.md
  - tools/testkit/probes/reports/sph-water-stack-d-probe.md
evidence_hashes:
  tools/testkit/failing-tests-evidence/sph-water-stack-d-implemented-2026-05-24T01-16-13Z.txt: sha256:64fd058ebc6f2b3b19b4b4e40531df491aaef1c9a8bb83cb1ff04a8c34121951
  captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.json: sha256:4027f89c25300682fcdf987fa060fa62a3e4b21ffd375a8f1dc60043f091ecf7
  captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.h5: sha256:8435f16677a496d0191ac001e7fafb3c650d4430d9d1203a6a9a1eda54c1678b
  packages/sph-water-stack-d/sph_water_stack_d/reference/dfsph_taichi.py: sha256:fb0329b774210846a266bfff8530887564220320ac71dabba3203cec789e2949
  packages/sph-water-stack-d/sph_water_stack_d/sim.py: sha256:4c8eda61f20ab38a703ed5ad58558df5bdf2604dc995fd5dd3791c0d4555b842
  packages/sph-water-stack-d/sph_water_stack_d/invariants.py: sha256:96df3e52faf246e59b0b3699c70daed30c81a8a56e8e50798ee1d6f7aac47cb2
  docs/sim-specs/particle-fluids/sph-water/spec-ref-stack-d.md: sha256:931512e7434bcb60eeb8cfd8efb0a060a4583883f31ac477a0e6407da847c73d
  tools/testkit/probes/reports/sph-water-stack-d-probe.md: sha256:35e0cae7f2ec67a25cb8df2650bc7ab3ca070f397a89d3398b5cc83d73a047c9
---

# Stage 1b Checkpoint — Sub-Phase sph-water → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8).
> FACT / INFERENCE / SHIFTED tagging throughout.

## § 1. Scope summary

Stage 1b is the **gates-4-through-13 GREEN** stage for the SECOND per-sim
cross-stack port. Ships the Stack-D Taichi-DSL DFSPH implementation, canonical
capture, spec sheet, probe report, perf-ledger row, and determinism-strategy
docstring. Gate 14 (cross-stack equivalence) is PENDING-1c.

## § 2. Gate-status table (charter § 2)

| # | Gate | Status |
|---|---|---|
| 1 | Spec sheet (`spec-ref-stack-d.md`, 13-section) | **GREEN** |
| 2 | Probe report (`sph-water-stack-d-probe.md`) | **GREEN** |
| 3 | Failing-tests anchor (Stage 1a `3a6eb82`) | **GREEN** (gate-13 replay verified, § 6) |
| 4 | Code verification — **golden-table, NOT MMS** (4a cubic-spline abs<1e-12; 4b DFSPH density-evolution abs<1e-15) | **GREEN** (err 0.0; pure-Python f64) |
| 5 | Tier-1 diagnostics (NaN/Inf) | **GREEN** |
| 6 | Tier-2 particle (IC-5: count/no_overlap/neighbor_list/momentum-advisory) | **GREEN** |
| 7 | Cat-1 citations (`integrity --cat 1`) | **GREEN** (0 HARD_FAIL) |
| 8 | Cat-2 public API (`integrity --cat 2`) | **GREEN** (0 HARD_FAIL) |
| 9 | Canonical capture (`dam-break-100K-particles-seed42-step1000.{h5,json}`) | **GREEN** (load_capture round-trips; sha256 § 4; schema-corpus copy -> Stage 1c) |
| 10 | Determinism (IC-13/IC-14 `run_twice_and_diff(sim_runner_diagnostic)`) | **GREEN** (`content_equivalent == True`; bit-exact) |
| 11 | PBT (≥ 2 invariants: `density_nonneg`, `kernel_normalization_unit_volume`) | **GREEN** |
| 12 | Perf-ledger row (252.346 s) | **GREEN** |
| 13 | Failing-tests replay (worktree @ `3a6eb82`) | **GREEN** (structural reproduction, § 6) |
| 14 | Cross-stack equivalence | **PENDING-1c** (informational preview § 9 — ~10 orders margin) |

Test suite: **14 passed, 1 skipped** (`test_cross_stack_equivalence` -> Stage 1c).

## § 3. Per-step results (charter § 4.2.2)

| Step | Outcome |
|---|---|
| 1 (skeleton, reconciled) | `reference/__init__.py` added; pyproject deps verified (no edit needed) |
| 2 reference `dfsph_taichi.py` | pure-Python golden surface + Taichi spatial-hash kernels; sha256 `fb0329b7…` |
| 3 `sim.py` | determinism docstring + runners; sha256 `4c8eda61…` |
| 4 `invariants.py` | 2 invariants; sha256 `96df3e52…` |
| 5 spec sheet | `931512e7…` |
| 6 probe report | `35e0cae7…` |
| 7 tests GREEN | 14 passed / 1 skipped; GREEN evidence `64fd058e…` |
| 8 canonical capture | 252.346 s; `.h5` OID `8435f166…`; `.json` `4027f89c…` |
| 9 perf-ledger | row appended (additive) |
| 10 workspace verify | `uv sync --all-packages` clean; member count 16; `uv.lock` unchanged |
| 11 gate-13 replay | structural reproduction VERIFIED (§ 6) |
| 12 commit | `feat(sph-water-stack-d-stage1b)` `41f6685` |

## § 4. Canonical Stack-D capture sha256s (committed-blob)

- `.h5` LFS content OID: `sha256:8435f16677a496d0191ac001e7fafb3c650d4430d9d1203a6a9a1eda54c1678b`
  (== manifest `payload.checksum`; LFS-tracked per `.gitattributes`).
- `.json` committed-blob: `sha256:4027f89c25300682fcdf987fa060fa62a3e4b21ffd375a8f1dc60043f091ecf7`
  (commit-first-then-sha256: the working-tree `.json` `3819c904…` lacked a trailing
  newline; the end-of-files hook added one at commit, so the committed blob differs
  — the documented phantom-newline case, correctly resolved).

## § 5. GREEN evidence sha256

`tools/testkit/failing-tests-evidence/sph-water-stack-d-implemented-2026-05-24T01-16-13Z.txt`
`sha256:64fd058ebc6f2b3b19b4b4e40531df491aaef1c9a8bb83cb1ff04a8c34121951` (stable;
ends in newline so committed == working-tree).

## § 6. Gate-13 replay outcome

`git worktree add /tmp/bp-replay-3a6eb82-sph-water-stack-d 3a6eb82` →
`uv sync --all-packages` → `pytest`: **7 collection errors, all clean
`ModuleNotFoundError`**, breakdown **4 `sph_water_stack_d.reference` / 2 `…sim` /
1 `…invariants`** — matches the Stage-1a per-test breakdown EXACTLY. Structural
reproduction VERIFIED (RD-2D Stack-D Stage-1b N1: structural, not byte-identical).
Worktree pruned.

## § 7. Determinism-strategy declaration

At the top of `packages/sph-water-stack-d/sph_water_stack_d/sim.py` (7 clauses;
charter § 1.4.1 + conventions § F.1). Claim: **`bit-exact-same-hw` at `arch="cpu"`**
(witnessed by gate-10). No in-kernel per-particle reductions; the only
`ti.atomic_add` (spatial-hash insertion) is serialised by `cpu_max_num_threads=1`
→ NOT an epsilon-class source (`atomic_ops=False`). f64 via f64-typed ndarrays.

## § 8. Stage 0 banked requirements — outcomes

- **f64 precision:** SATISFIED via IC-11 `set_taichi_deterministic(arch="cpu")` +
  f64-typed `ti.types.ndarray` kernel args + direct f64-ndarray accumulation (the
  RD-2D Stack-D pattern). **No `default_fp` IC-11 edit.** The golden gates use the
  pure-Python surface (native f64) → err 0.0; the Taichi kernels accumulate
  directly into f64 ndarrays so the f32 `default_fp` never bites.
- **R-S3 iter-count instrumentation:** measured **combined iters/step = 1**;
  measured full-canonical wall-clock **252.346 s (~4.2 min)**; extrapolated band
  check **<< 43 min** → **escape-hatch NOT invoked; full canonical horizon (D4)
  held**. Max spatial-hash cell occupancy 30 ≪ 256 (no overflow). See § 9 S6.

## § 9. New SHIFTs surfaced at Stage 1b

**S6 (Stage 1b) — The Phase-1 reference *trajectory* is explicit-Euler rigid
free-fall, NOT an iterative DFSPH pressure solve (SHIFTED; material).** Reading
`packages/sph-water/sph_water/sim.py` at HEAD: `_canonical_step` /
`_diagnostic_step` apply `v_z += g_z·dt; p += dt·v` with `density_evolution`
computed as a **discarded** per-step side-effect; the iterative
`divergence_free_solve` (max_iter) exists ONLY for the gate-4b golden, NOT the
capture-producing path. Consequences:
1. **R-S3 dissolved:** combined iters/step = 1 (not k≈10–50); the Stage-0 ~28–32min
   estimate assumed an iterative solver the reference does not use. Actual 4.2 min.
2. **R-S1 dissolved:** no iterative solver / no chaotic amplification; all particles
   share `v_z` → the cloud free-falls rigidly → relative positions invariant → SPH
   density static across frames. Gate-14 preview (informational, read-only, NO
   `[overrides.sph-water]`): position + velocity `max_abs_err = 0.0` (bit-identical
   — identical NumPy `default_rng(42)` IC + identical explicit-Euler FP ops);
   density `max_rel_err = 1.07e-15` (FP-accumulation-order only) — ~10 orders below
   the 1e-4 target. Gate-14 at Stage 1c expected to pass with large margin
   (an RD-2D-R-P2-like outcome, supporting D5a IC-15 formalisation — but the
   verdict + witness are the Stage-1c deliverable, NOT pre-committed here).

Cumulative shift count: 129 → **130**.

(Two dispatch-vs-charter/HEAD reconciliations were applied WITHOUT new shifts,
per the Stage-1a precedent: (a) `test_determinism` uses `sim_runner_diagnostic`
[charter § 2 gate-10] not `sim_runner_seeded` [dispatch Step 7] — running the
canonical 100K sim twice in pytest would be ~8 min; charter is source of truth;
(b) the gate-9 schema-corpus copy is a Stage-1c deliverable per dispatch
out-of-scope, so gate-9 here = capture + round-trip + sha256.)

## § 10. Stage 1c dispatch readiness

READY. Stage 1c inherits:
1. The Stack-D canonical capture (`captures/sph-water-stack-d/…`) as the gate-14
   RIGHT operand; the NumPy-reference capture (`captures/sph-water-ref/…`) is LEFT.
2. **D6 MANDATORY:** add `[overrides.sph-water] category="sph"` to `tolerance.toml`
   (without it `compare_captures` raises `KeyError`; Stage-0 Task 0.4) — at-budget
   `relative=1e-4`.
3. Un-skip `test_cross_stack_equivalence.py` (the `@pytest.mark.skip` added this
   stage names Stage 1c as the owner).
4. Extend `equivalence.md` additively (the Phase-1 stub; Convention A) with the
   IC-15 methodology sections + per-field per-frame witness + step-horizon analysis.
5. Schema-corpus entry `tests/fixtures/legacy-captures/phase-2-sph-water-stack-d.{h5,json}`.
6. The § 9 preview (~10 orders margin) strongly indicates a clean gate-14 PASS
   (D5a-supporting), but the empirical verdict is the Stage-1c deliverable.
