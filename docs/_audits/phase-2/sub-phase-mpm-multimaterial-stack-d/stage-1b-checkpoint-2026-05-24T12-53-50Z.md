---
date: 2026-05-24T12-53-50Z
author: mpm-multimaterial-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-d-stage-1b
subject: "Stage 1b implementation CLOSE for the mpm-multimaterial -> Stack-D port (FOURTH spec-Phase-2 cross-stack port). VERDICT SHIFTED-with-N1-N2. Gates 4-13 GREEN (14 passed, 1 skipped at the diagnostic tier); gate-14 PENDING-1c (test_cross_stack_equivalence SKIP). Ported the Phase-1 numba MLS-MPM/APIC neo-Hookean single-material reference to Taichi-DSL (ti.types.ndarray; arch=cpu; cpu_max_num_threads=1 posture (i); f64 ti.f64(0.0) accumulator seeds throughout). Gate-4 GOLDEN-only (quadratic B-spline abs 1e-15); FIRST sim consuming both IC-5 + IC-6 at Tier-2. ONE canonical capture drop-impact-128cube-seed42-step500 (.h5 LFS OID d8d38c8d...7edc, 1,125,718,712 B; .json committed-blob a2b07318...9e39). gate-10 run_twice content-equivalent (posture (i) bit-exact). gate-13 worktree replay at b72bccb reproduces 6 ModuleNotFoundError (.reference x2 / .sim x3 / .invariants x1). N1: perf 360.773s = 2.28x the numba baseline 158.052s -- EXCEEDS the 2x band (FLAGGED per spec 2.15; posture-(i) serialisation + ~3000 kernel launches; first Stack-D port over 2x). N2: R-M2 j_det=1.000000 + n(j_det<=0)=0 across all 11 frames -> the canonical drop-impact is RIGID FREE-FALL (no deformation within 500 steps; F=I -> zero stress -> uniform velocity); informal gate-14 preview vs numba ref = particle_pos BIT-EXACT (0.0) / particle_vel ~6.2e-28 / grid_mom ~1.5e-32 (far below 1e-4; below the prior pairs' ~1e-15) -> the atomic-scatter surface (#3) is PRESENT but not meaningfully exercised at this regime (recalibrates the Stage-0 single-step ~8.5e-10 expectation; D5 (b) refinement nuance). Cumulative 146. NOT BLOCKED; the 2.28x is a flag-at-landing-review per spec 2.15, NOT a Hard-Rule-2 stop (posture (i) serialisation is required for deterministic atomic-scatter)."
verdict-state: SHIFTED
head_sha: 777f06f28bc37530c0aeb50e28f30995abb66cf8
head_sha_at_checkpoint: 777f06f28bc37530c0aeb50e28f30995abb66cf8
parent_audits:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-1a-checkpoint-2026-05-24T12-36-43Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-checkpoint-2026-05-24T12-16-58Z.md
  - docs/phases/sub-phase-mpm-multimaterial-stack-d.md
evidence_paths:
  - captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.h5
  - captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.json
  - tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-implemented-2026-05-24T12-53-50Z.txt
  - docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-d.md
  - tools/testkit/probes/reports/mpm-multimaterial-stack-d-probe.md
  - docs/perf-ledger.md
evidence_hashes:
  captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.h5: sha256:d8d38c8d228e319c72d2a4accb7c45e1e0764aa789cc7a8cd30c353603ad7edc
  captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.json: sha256:a2b073183b128b58eabf3b1bdb924b84ef256079a87ef6bf196f73b8c8c79e39
  tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-implemented-2026-05-24T12-53-50Z.txt: sha256:26706f5ac59707a0a04895c8a5575abf5accbd0e353eba227c18899a07c6c77b
---

# Stage 1b implementation checkpoint — sub-phase-mpm-multimaterial-stack-d

> FOURTH spec-Phase-2 per-sim cross-stack port. Gates 4-13 GREEN; gate-14
> PENDING-1c. Stage 1c dispatchable. Verdict SHIFTED-with-N1-N2.

## § 1. Scope summary

Stage 1b is the gates-4-through-13 GREEN stage. FIRST per-sim cross-stack port with
an MLS-MPM/APIC + neo-Hookean material model AND an atomic-scatter Stack-D surface
(P2G `ti.atomic_add`, serialised at `cpu_max_num_threads=1`). The Phase-1 numba
reference (`packages/mpm-multimaterial/`, sealed per D7) was ported kernel-for-kernel
to Taichi-DSL `@ti.kernel` over `ti.types.ndarray` (NumPy in/out; the RD-2D/sph-water/
LBM pattern), with the arithmetic mirrored verbatim for cross-stack parity. Single
material (`material_id` all-0; probe S-M5). Gate-4 golden-only (no MMS; S-M6).

## § 2. 14-row gate-status table

| Gate | Status | Witness |
|---|---|---|
| 1 spec sheet | GREEN | `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-ref-stack-d.md` (13-section) |
| 2 probe report | GREEN | `tools/testkit/probes/reports/mpm-multimaterial-stack-d-probe.md` |
| 3 failing tests | GREEN (Stage 1a) | `b72bccb`; evidence `2e8d7ea9…` |
| 4 code-verification (golden) | GREEN | `test_quadratic_bspline_golden.py` (2 tests; abs 1e-15); GOLDEN-only |
| 5 Tier-1 + reference-sanity | GREEN | `test_diagnostics::test_tier1_health…` + `test_reference_sanity.py` (4 tests) |
| 6 Tier-2 (IC-5 + IC-6) | GREEN | `test_diagnostics.py` (count + momentum-drift + grid-mom L1); FIRST both-IC sim |
| 7 Cat 1 citations | GREEN | spec § 2 (Hu 2018 + 88-line + Steffen-Kirby-Berzins) |
| 8 Cat 2 public API | GREEN | exports match probe § 5 |
| 9 canonical capture | GREEN | `captures/mpm-multimaterial-stack-d/drop-impact-128cube-seed42-step500.{h5,json}` (§ 4) |
| 10 determinism (IC-13/14) | GREEN | `test_determinism::test_run_twice_epsilon_diff` content-equivalent + R-D2 drift witness |
| 11 PBT (2 invariants) | GREEN | `test_pbt_invariants.py` (mass-conservation + partition-of-unity; 50 examples each) |
| 12 perf-ledger | GREEN (FLAGGED) | row appended; 360.773s = 2.28× baseline (N1; § 9) |
| 13 failing-tests replay | GREEN | worktree replay at `b72bccb` → 6 ModuleNotFoundError (§ 6 replay) |
| 14 cross-stack equivalence | **PENDING-1c** | `test_cross_stack_equivalence.py` SKIP; informal preview § 10 |

pytest at the diagnostic tier: **14 passed, 1 skipped** (1.73s).

## § 3. 13-step per-step results

| Step | Result |
|---|---|
| 1 skeleton reconciled (reference/__init__ + shape_functions + deps) | PASS |
| 2 reference `mls_mpm_taichi.py` (7 kernels: p2g, p2g_with_stress, g2p, grid_update, deformation_update, compute_stresses, advect) | PASS |
| 3 reference `shape_functions.py` (pure-Python N + PoU) | PASS |
| 4 sim wrapper (sim_runner_seeded + sim_runner_diagnostic; determinism docstring; R-M2 j_det logging) | PASS |
| 5 invariants (mass_conservation_p2g_g2p + partition_of_unity_b_spline) | PASS |
| 6 spec sheet `spec-ref-stack-d.md` | PASS |
| 7 probe report | PASS |
| 8 test bodies → GREEN (14 passed, 1 skipped); GREEN evidence captured (pre-emptive ruff per Stage-1a N1) | PASS |
| 9 canonical capture (1M × 128³ × 500; 360.773s; ~1.05 GiB LFS) | PASS (N1 perf flag) |
| 10 perf-ledger row appended (FLAGGED 2.28×) | PASS |
| 11 workspace registration reconciled (18 members) | PASS |
| 12 gate-13 worktree replay at b72bccb | PASS |
| 13 commit `03a36e5` | PASS |

## § 4. Canonical Stack-D capture sha256s (committed-blob authoritative)

- `.h5` LFS content OID: `d8d38c8d228e319c72d2a4accb7c45e1e0764aa789cc7a8cd30c353603ad7edc` (1,125,718,712 B; identical SIZE to the Phase-1 reference — same 11-frame schema). Stored as a 135-byte LFS pointer in HEAD.
- `.json` committed-blob: `a2b073183b128b58eabf3b1bdb924b84ef256079a87ef6bf196f73b8c8c79e39` (commit-first-then-sha256: the in-memory pre-hook value was `330027bb…`; the end-of-files hook added the trailing newline, so the committed-blob `a2b07318…` is authoritative — IC-15 § 3 banked precedent re-witnessed).

## § 5. GREEN evidence sha256

`tools/testkit/failing-tests-evidence/mpm-multimaterial-stack-d-implemented-2026-05-24T12-53-50Z.txt`: committed-blob `26706f5ac59707a0a04895c8a5575abf5accbd0e353eba227c18899a07c6c77b` (stable; pytest output ends in a single newline so the eof hook was a no-op).

## § 6. Gate-13 replay outcome

`git worktree add --detach <wt> b72bccb` + `uv sync` + `pytest packages/mpm-multimaterial-stack-d/tests/` → **6 collection-time ModuleNotFoundError**, exact Stage-1a breakdown: `mpm_multimaterial_stack_d.reference` ×2 (golden, reference-sanity), `.sim` ×3 (diagnostics, determinism, cross-stack), `.invariants` ×1 (pbt). Structural reproduction confirmed; worktree removed.

## § 7. Determinism-strategy declaration

Path: `packages/mpm-multimaterial-stack-d/mpm_multimaterial_stack_d/sim.py` top docstring (6 clauses) + `reference/mls_mpm_taichi.py` module docstring. Summary: P2G `ti.atomic_add` serialised at `cpu_max_num_threads=1` (posture (i)); `ti.f64(0.0)` accumulator seeds throughout; fixed lex 27-cell stencil + `base=floor(p/dx+0.5)−1`; NumPy `default_rng(seed)` blob sampler (substantively seeded, S-M4; seed interpolated into the descriptor — clean contract); `bit-exact-same-hw` at arch=cpu (over-achieves the spec `epsilon-same-stack`); `determinism.atomic_ops=True`.

## § 8. Stage 0 banked-requirement outcomes

- **f64 accumulator-seed pattern (Stage-0 + LBM banked):** `ti.f64(0.0)` seeds in P2G/G2P/APIC-C/stress/deformation. Gate-4 golden GREEN at abs 1e-15 (shape functions stack-agnostic); gate-10 content-equivalent → f64 precision satisfied.
- **cpu_max_num_threads=1 posture (i) (Stage-0 Task 0.3):** gate-10 `run_twice_and_diff` content-equivalent → run-to-run bit-exact at the implementation scale, confirming the Stage-0 derisk.
- **R-M2 j_det observations:** `[R-M2]` stdout log over all 11 captured frames: `j_det min=max=1.000000`, `n(j_det<=0)=0` at every frame → NO volumetric inversion, NO non-smooth-branch activation. The canonical drop-impact is rigid free-fall (the 0.15-radius blob from z=0.65 does not reach the floor [z≈0.031] or deform within 500 steps × 1e-4 dt = 0.05 s). § 9 N2.

## § 9. New SHIFTs surfaced at Stage 1b

- **N1 (perf flag):** Stack-D Taichi-cpu wall-clock **360.773 s = 2.28× the numba baseline 158.052 s** — the FIRST Stack-D port to EXCEED the 2× regression band. FLAGGED per spec § 2.15 for landing-audit review (NOT a Hard-Rule-2 stop). Cause: posture-(i) `cpu_max_num_threads=1` serialisation (REQUIRED for deterministic atomic-scatter — Stage-0 Task 0.3 showed threads=8 is NOT run-to-run bit-exact) + per-step kernel-launch overhead (~3000 `@ti.kernel` launches over 1M particles). The serialised posture trades parallel speed for bit-exact determinism — a defensible correctness-over-speed choice (prior pairs: RD-2D 0.61×, sph-water 0.195×, LBM 1.31×/1.61×).
- **N2 (regime recalibration; D5-affecting, S6-style):** R-M2 shows the canonical trajectory is **rigid free-fall** (F=I → zero neo-Hookean stress → uniform velocity → near-trivial APIC affine). The informal gate-14 cross-stack diff vs the numba reference is therefore **bit-exact particle_pos (0.0) / particle_vel ~6.2e-28 / grid_mom ~1.5e-32** — far below 1e-4 and below the prior pairs' ~1e-15. The **P2G atomic-scatter surface (IC-15 deferred aspect #3) is PRESENT in the kernel but NOT meaningfully EXERCISED by the canonical regime** (which lacks the velocity-gradient-driven non-uniform momentum that drives scatter-order divergence). This recalibrates the Stage-0 single-step ~8.5e-10 expectation (which used random velocities): the full-trajectory reality is ~0. **D5 (b) refinement nuance:** the atomic-scatter aspect is exercised structurally (the kernel uses serialised `ti.atomic_add`) but the canonical regime keeps the cross-stack diff trivial — analogous to LBM's #4 ("data-backed but at the same algebraically-trivial regime"). The methodology stays PARTIAL (D5 (b)); aspect #3 is NOT meaningfully stress-tested by this pair either.

**Cumulative at Stage-1b close: 146** (144 entering + N1 + N2).

## § 10. Stage 1c dispatch readiness + informal gate-14 preview

**READY.** Stage 1c: add `[overrides.mpm-multimaterial] category="mpm"` (D6); extend `equivalence.md` additively; run gate-14 `compare_captures(captures/mpm-ref/…json, captures/mpm-multimaterial-stack-d/…json)` at `relative=1e-4`; emit per-field per-frame witness + step-horizon roll-up; un-skip `test_cross_stack_equivalence.py`.

**Informal gate-14 preview (manual h5py diff over all 11 frames; NOT the harness — no override yet):**

| Field | max_abs_err (ref vs Stack-D) |
|---|---|
| `particle_pos` | `0.000000e+00` (BIT-EXACT) |
| `particle_vel` | `6.247778e-28` |
| `grid_mom` | `1.502225e-32` |

All ~28-32 orders below the 1e-4 tolerance. Expected Stage-1c gate-14: **GREEN with the largest margin of any pair to date** (the rigid-free-fall regime makes the atomic-scatter accumulation order irrelevant — uniform velocity → order-independent sums). R-M2 step-horizon roll-up: flat at ~0 across all frames (no amplification; no inversion). D8 NOT activated (posture (i) + trivial diff). D5 → (b) PARTIAL HOLDS + REFINEMENT (atomic-scatter present-but-not-exercised subsection).

---

*End of Stage 1b checkpoint. SHA back-fill follows (Convention #12 + N1 enumeration).*
