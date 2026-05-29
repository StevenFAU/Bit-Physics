---
artifact_id: task-7-pinn-poisson-plan-drafting
sub_phase: sub-phase-phase-3-pinn-poisson
task: task-7
stage: plan-drafting
date: 2026-05-29
verdict: CONFIRMED-SHIFTED
head_sha: 5cddb6c8ca88646068af9add2afce3335f63d436
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_paths:
  - docs/phases/sub-phase-phase-3-pinn-poisson.md
  - tools/testkit/probes/reports/pinn-poisson.md
  - docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-plan-drafting-2026-05-29T12-24-25Z.md
  - docs/_audits/phase-3/progress.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/conventions/sub-phase-conventions.md
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
  - tools/testkit/code_verification/mms/solvers/heat_1d_ftcs.py
  - docs/spec-amendments-proposed.md
---

# Plan-drafting landing audit — task-7 PINN-Poisson (sub-phase 3.6)

Links the charter (`docs/phases/sub-phase-phase-3-pinn-poisson.md`) + probe
(`tools/testkit/probes/reports/pinn-poisson.md`) to execution. PLAN-DRAFTING ONLY —
no Stage 0/1/2 work performed. Spec FROZEN §9.6; plan no-edit §0.3.

## Anchor probe
- HEAD `5cddb6c` (clean); preflight phase 3 **exit 0**; integrity **0 HARD_FAIL /
  14 SOFT_WARN** (digest `b7460150…`, measured live per §R — not copied).
- Prior sub-phase task-6 neural-ca `closed-with-shifted-6` (`96d5205`) + gate-14
  divergence diagnosis (`5cddb6c`). progress.md tasks 1–6 read.

## ⚠ Load-bearing findings
1. **Warp↔PyTorch interop WORKS — no BLOCK.** Probed live (Warp 1.13.0 / PyTorch
   2.12.0): `wp.from_torch`/`wp.to_torch` bit-identical round-trip, CPU zero-copy
   (shared ptr), f64 preserved. Env is **CPU-only (no CUDA driver)** — re-shapes D-DET.
2. **Anchor set:** plan §6.7 Anchors 1 (`log|z|`) + 2 (`sinh·sin`) are BOTH **harmonic
   (f=0)** → ADD **Anchor 3** inhomogeneous MMS `u=sin(πx)sin(πy) → f=−2π²sin(πx)sin(πy)`
   (REQUIRED — verifies the Poisson source term). ≥3 anchors/table (Cat-3 HARD_FAIL).
3. **Citations (Convention #8, web-verified):** Evans §2.2 "Laplace's Equation" + §2.2.1
   fundamental solution — **CORRECT**. Strauss separation-of-variables = **§6.2 "Rectangles
   and Cubes"**, NOT §6.1 — **plan cite WRONG → SHIFT**. Raissi 2019 = *J. Comput. Phys.*
   **378, 686–707** — confirmed.
4. **PhysicsNeMo repo split:** §2.18 pinned `NVIDIA/physicsnemo` (core) `766e485a` (v2.1.0),
   but the PINN tutorials live in **`NVIDIA/physicsnemo-sym`** (v2.4.0, Apache-2.0). `<latest
   1.x>` pin text stale. → D-VENDOR-SHA/ROLE; vendor physicsnemo-sym read-only; **A-6** at Stage 0.
5. **D-TOL relief:** `tolerance-schema.json` `golden_tolerance` branch already exists AND
   names `pinn-poisson: analytical_l2, fd_l2` — no schema/budget/§2.6 amendment needed.

## D-class routing (leans)
| D-class | Status | Lean |
|---|---|---|
| D-WARP-TORCH-INTEROP ⚠ | report-only | WORKS (CPU); re-probe at Stage 0; BLOCK only on genuine break |
| D-ANCHOR-SET ⚠ | operator | add Anchor 3 (f≠0); Strauss §6.2 SHIFT; FD = anchored numerical baseline |
| D-DET ⚠ | operator | two rows, measure-then-declare; CPU env (NCA bit-identical may transfer); EFECT≠gate |
| D-VENDOR-SHA/ROLE ⚠ | operator | physicsnemo-sym v2.4.0 read-only; file A-6; §2.18 correction deferred |
| D-MUTATION ⚠ | operator | defer FD-ref mutation target to task-9 (rule-of-three); document |
| D-USD | resolved | DEFER (task-4 Phase-3-Stack-E-WIDE policy); closed-with-shifted |
| D-TOL | resolved | `[golden_tolerance.learned-dynamics.pinn-poisson]`; schema pre-baked |
| D-LAYOUT | resolved | `packages/pinn-poisson/` (§0.3 SHIFT from `learned-dynamics/.../python/`) |
| D-CI | resolved | `python-strict.yml` (build-py.yml absent — SHIFT) |
| D-MANIFEST-FMT | resolved | `MANIFEST.toml` (SHIFT from manifest.yaml) |
| D-NAMING / D-CAPTURE-DESC | resolved | `pinn-poisson`; descriptor `poisson-sine-source-64sq-seed42-step1` (add D.2.3 at landing) |
| D-TAG | resolved | NO |

## Scope / stage / gate summary
- Single-stack (Stack E Warp + PyTorch); **NO gate-14, NO render-similarity, NO cross-stack budget**.
- Two-pronged verification: golden vs analytic (≥3 anchors incl. f≠0) + classical-FD reference
  (reusable, §2.8) + convergence-with-collocation. Determinism: training non-det/EFECT, inference det.
- Stage cadence 0 → 1a → 1b (FD / PINN split) → 1c → 2; 13 gates, no gate-14, no sim mutation target.
- Deliverables A–N mapped (charter §3); §6.7 stale anchors SHIFTed (layout/CI/manifest/Strauss cite).

## SHIFTs (plan §6.7; no plan edit per §0.3)
layout `packages/pinn-poisson/`; CI `python-strict.yml`; manifest `MANIFEST.toml`; Strauss §6.1→§6.2.

## Commit cadence (this plan-drafting session)
probe report → charter → this landing audit + progress.md entry → Convention #12 SHA back-fill.
Pushed to `main` per the established Phase-3 plan-drafting norm (no tag).

## Verdict
**CONFIRMED-SHIFTED.** Stage 0 dispatch READY once the operator ratifies D-ANCHOR-SET,
D-DET, D-VENDOR-SHA/ROLE, D-MUTATION (D-WARP-TORCH-INTEROP is report-only). task-7 TERMINAL.
