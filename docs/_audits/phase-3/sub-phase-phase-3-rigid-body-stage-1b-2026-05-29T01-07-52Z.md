---
date: 2026-05-29T01-07-52Z
author: phase-3 rigid-body-pedagogical stage-1b (Claude Code)
subject: Phase 3 task-4 rigid-body-pedagogical — STAGE 1b implementation + 13-gate + D-DET MEASURE
verdict: CONFIRMED
head_sha: d1faf0027cfdf5c0b4407c363f39b5ff264ee337
prior_stage_audit: sub-phase-phase-3-rigid-body-stage-1a-2026-05-29T00-38-00Z.md
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
gate_3_failing_tests_hash: sha256:88d9f9853e74395aee6e4b6e63fc402141c3308d83d172b8ad1804307ec98e34
d_det_measured: bit-exact same-stack-same-hw (assert_deterministic_run 3 runs byte-equal; digest 468cb14f...)
evidence_paths:
  - docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md
  - packages/articulated-pedagogical/articulated_pedagogical/aba.py
  - packages/articulated-pedagogical/articulated_pedagogical/_warp_kernels.py
  - tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json
  - tools/testkit/determinism/registry.toml
  - tools/testkit/equivalence/tolerance.toml
  - .github/workflows/python-strict.yml
  - tools/testkit/failing-tests-evidence/rigid-body-pedagogical-2026-05-29T00-29-56Z.txt
evidence_hashes:
  docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md: sha256:2e14a7284011e43ffc0ab6ca81b75ad8624cadc6116fed12a8f820c18b7c6178
  packages/articulated-pedagogical/articulated_pedagogical/aba.py: sha256:9cf1f55811c8cfb08230726929195ed002a09de7ca2c7aea0593336b81e344d9
  packages/articulated-pedagogical/articulated_pedagogical/_warp_kernels.py: sha256:8f8e781d0c45e1e189dfbc7322395d2506ee35d40a8c8dcec737632038c70c54
  tools/testkit/golden/tables/rigid-body-pendulum-trajectory.json: sha256:2430c7ce3fe88f6b8b998ad88e46e0f261e130444e90b255371578a1f8c1f178
  tools/testkit/determinism/registry.toml: sha256:888c6a2430ece209f30dbaf4348f52b0a10018a1b2e261d7b57707ca1f9f163d
  tools/testkit/equivalence/tolerance.toml: sha256:8b390355f47202fa53a0600ce39f06d0aab93f13c88525b1f55554e8846f1757
  .github/workflows/python-strict.yml: sha256:010fb4f00d74c35411b3b9253ab04a39548a3b2bd9b6a686d796bae2ae0b2c60
  tools/testkit/failing-tests-evidence/rigid-body-pedagogical-2026-05-29T00-29-56Z.txt: sha256:88d9f9853e74395aee6e4b6e63fc402141c3308d83d172b8ad1804307ec98e34
---

# Phase 3 — sub-phase rigid-body-pedagogical (task-4) — Stage 1b audit

> Implementation + thirteen-gate + D-DET MEASURE for the first Stack-E SIM of
> Phase 3. Warp ABA forward dynamics (RED→GREEN), golden tables F + derivations
> G, Tier-3 H, PBT, shared-file J, D-TOL tolerance row. Verdict **CONFIRMED**.

## Commit chain (this stage)

| SHA | Commit |
|-----|--------|
| `d8a7912` | Warp ABA forward dynamics — RED→GREEN (11 tests) |
| `34bbd60` | sim runner + CLI + golden tables F/G + capture/golden tests |
| `66d3f98` | Tier-3 diagnostics H + PBT module + gate-5 |
| `099b573` | D-TOL tolerance row + shared-file (J) updates |

## Thirteen-gate acceptance (spec §3.5 v2.4)

| Gate | Status | Evidence |
|------|--------|----------|
| 1 spec sheet + §6 posture | **PASS** | `spec-ref.md` §6 (3 analytic anchors + bit-exact determinism + PBT) |
| 2 pre-impl probe | **PASS** | `tools/testkit/probes/reports/rigid-body-pedagogical.md` (Stage 1a) |
| 3 failing suite + sha256 | **PASS** | `4a8270c` footer `sha256:88d9f985…`; `replay_failing_tests` → `match True` |
| 4 golden-value (Cat 3), ≥3 anchors | **PASS** | pendulum table 3 analytic anchors (A1/A2/A3 scipy refs); double-pendulum closed-form + 6-DOF energy-conservation independent refs; `test_golden_tables.py` 3/3 |
| 5 Tier-1 diagnostics | **PASS** | `test_diagnostics.py` Tier-1 health on the seeded capture |
| 6 Tier-2 diagnostics | **PASS** | generic testkit Tier-2 inherited (closed-form applicable) |
| 7 citation chain (Cat 1) | **PASS** | textbook citation only, no vendored code → trivially passes |
| 8 public API (Cat 2) | **PASS** | `articulated_pedagogical` public surface resolves (18 names) |
| 9 replayable capture | **PASS (committed Stage 1c)** | `sim_runner_seeded` emits `pendulum-trajectory-seed42-step1000`; round-trip `test_capture.py` |
| 10 determinism decl ↔ capture | **PASS** | registry `[rigid-body.articulated-pedagogical]` bit-exact ↔ manifest `determinism.claimed=bit-exact-same-hw` |
| 11 PBT of declared invariants | **PASS** | `energy_drift_bounded` + `angular_momentum_about_pivot_conserved` (hypothesis, `test_pbt_invariants.py`) |
| 12 perf-ledger row | **Stage 1c** | lands at Stage 1c (do NOT omit — S2-RD2C1 lesson) |
| 13 landing replay | **Stage 2** | gate-3 hash re-witnessed; `replay_failing_tests` already `match True` |
| mutation | **N/A** | sim, not testkit surface (§6.0 item 12) |
| 14 cross-stack | **N/A** | single-stack Stack-E terminal sim, no cross-stack pair |

**18/18 acceptance tests GREEN**; ruff + `mypy --strict` clean (the two
Warp-touching files scoped `# mypy: ignore-errors`, F-RB-3).

## D-DET MEASURE (charter §6)

`common_warp.assert_deterministic_run(run, runs=3, tolerance=0.0)` over a 6-DOF
trajectory → **3 runs byte-identical** (sha256 `468cb14f…`); `test_two_runs_bit_equal`
+ `test_capture_payload_bit_identical_across_runs` corroborate. The registry
declaration **`[rigid-body.articulated-pedagogical]` class=bit-exact,
scope=same-stack-same-hw HOLDS** — not re-characterized (no STOP-J). Mechanism:
single-thread `wp.launch(dim=1)` on the Warp CPU backend + `dtype=wp.float64`
throughout (the mpm-multimaterial-stack-e precedent). [FACT]

## §R two-field integrity

- `integrity_invariant` = 0 HARD_FAIL / 14 SOFT_WARN (held). [FACT]
- `integrity_digest_at_head` = `f5b7eea1…` (measured live; **drifted** from Stage
  0/1a `6096fa35…` — the 3 new golden tables added cat3 AUDIT_LOG lines, §R.1
  informational drift; the count invariant is unchanged). [FACT]

## Physics validation (independent oracles)

- **n=1 (single pendulum):** ABA `q̈ == −(g/L) sin(q)` to 1e-10; A1/A2/A3 analytic
  anchors (scipy `ellipk`/`ellipj`) within `pendulum_period_rel=1e-3` /
  `trajectory_abs=1e-2`. [FACT]
- **n=2 (double pendulum):** ABA Cartesian trajectory matches the independent
  closed-form double-pendulum EOM (RK4 dt/100) within `trajectory_abs`. [FACT]
- **n=6:** energy conserved (secular drift `3.3e-5/s` < `1e-3`); RK4 step-convergence. [FACT]

## SHIFTs carried (for Stage-2 `closed-with-shifted-N`)

1. **D-PBT physical re-declaration** — `momentum_conservation (linear+angular)` →
   `angular_momentum_about_pivot_conserved` (pinned-chain physics; HARD RULE 2
   re-declare-not-widen, mirrors lenia). Documented in spec-ref §6 + the PBT module.
2. **F-RB-1** — failing-tests-evidence excluded from trailing-whitespace hook (`5f018fe`).
3. **F-RB-3** — Warp's partial typing breaks `mypy --strict` on `@wp.kernel`
   files; `# mypy: ignore-errors` scoped to `_warp_kernels.py` + `aba.py`.
4. **§5.8 corrigendum** (A-1) + **plan §6.4:1605 Goldstein wrong-cite** — routed
   Stage 0; enumerated at Stage 2.
5. **D-USD DEFER** — §2.5 USD export → Phase-4 WU-D.

## Verdict

**CONFIRMED.** Gates 1–11 GREEN; gate-12 (perf-ledger) + gate-9 capture commit +
gate-13 re-witness land at Stage 1c/2. D-DET measured bit-exact. **Stage 1c
(capture + fixture + LFS + perf-ledger + §S.5 CI sweep) unblocked.**
