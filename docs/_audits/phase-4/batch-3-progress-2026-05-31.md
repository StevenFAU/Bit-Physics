---
date: 2026-05-31
author: phase-4 Run-2 Batch-3 PHASE-1 self-driven execution (progress log)
subject: "Phase-4 batch-3 frontier-algorithm + articulated-diff — per-sim progress (NOT the batch close)"
kind: progress-log
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
---

# Phase-4 Batch-3 — PHASE-1 progress log

> Self-driven sim-to-sim execution per the ratified charter
> (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md`). The single batch report is
> `batch-3-close-<UTC>.md` (written at batch close). This log tracks per-sim landing state for
> continuation. FACT = ran/measured.

## Membership (ratified)

3-sim core: **articulated-pedagogical-diff** (S14) → **particle-lenia** (S26) → **flow-lenia** (S27).
difflogic-ca HELD (do not build). 5 holds confirmed. Replay base `v0.3.0-phase-3`.

## Sim 1 — articulated-pedagogical-diff (S14) — **LANDED (local)**

| Stage | Commit | State |
|---|---|---|
| 0 (probe) | `4f25f45` | WARP-NATIVE-TAPE probe: n=1 machine-exact (∂q̈/∂q == −(g/L)cos q relerr ≤1.9e-16; ∂q̈/∂τ == 1/(mL²) exact); **n≥2 adjoint gap MEASURED (relerr 0.197)** → single-pendulum scope (on-evidence SHIFT). BLOCK gate CLEARED. |
| 1a (RED) | `8084d23` | scaffold + 20 failing tests (NotImplementedError stubs); clean-env evidence. |
| 1b (GREEN) | `194689d` | on-device tape-diff ABA (reused parent aba_kernel in wp.Tape); golden table (7 pts, 3 distinct anchors A1/A2/A3); determinism rows MEASURED bit-identical; tolerance row; canonical capture (LFS); inverse recovery loss 8.99e-17; suite 20/20. |
| 1c | `9d?` (Stage 1c commit) | perf row 5.306s; CI job; mutation target (advisory, deferred); schema-corpus fixture (corpus 32→33); **gate-13 replay MATCHED** at 8084d23. |
| 2 (landing) | (this commit) | spec-diff.md de-stubbed; ledger row 14 → **landed**; integrity 0HF/14SW; probe verify_evidence 6/0; suite 20/20. |

**Key results (FACT):** A1 ∂q̈/∂q == analytic relerr ≤1.9e-16; A3 ∂q̈/∂τ == 1/(mL²) exact (0.0);
A2 central-FD floor ~1e-7; forward-equivalence to the landed parent **bit-exact at n=1 AND n=2**;
determinism bit-identical (forward + gradient); PBT energy_drift re-scoped to horizon ≥ 1 period
(HARD RULE 2, threshold unchanged); render_similarity/variant untouched (no render coupling).

**Banked (surface at close, do NOT fix mid-batch):**
- **B-1 (multi-link adjoint):** the n≥2 tape-correct ABA is deferred — needs per-pass/per-link
  kernels with no read-after-write aliasing (heavy, FD-only verification). Single-pendulum scope is
  the honest "fewer is correct" call (the closed-form moat is single-pendulum).
- **B-2 (gate-13 evidence env):** failing-tests-evidence must be generated in the **clean
  per-package env** (the `uv sync --all-packages` shared root .venv leaks the `anyio` pytest plugin
  into the header → replay mismatch). Refines L-PINN-1. Generate from a worktree at the RED commit.
- **B-3 (mutation):** target registered, full measure deferred (per-mutant 5–32s suite cost
  prohibitive inline; advisory per §2.13; batch-1/2 posture).
- **B-4 (charter verify_evidence):** the batch-3 charter's `at-head` evidence_hashes (phase-4-plan,
  lenia/sim.py, aba.py) do NOT self-verify even at the charter head_sha ab934d7 — a pre-existing
  `at-head`-sentinel quirk, NOT a regression from this batch (those files untouched here).
- **B-5 (carry from dispatch):** C-1 papers-not-vendored + the batch-2 replay worktree uv-sync
  tooling fix — banked for the Phase-4 close.

## Sim 2 — particle-lenia (S26) — **LANDED (local)**

Energy-based Particle Lenia (Stack D / Taichi). Stages: 0 (web-fetch + physics probe) folded into
1a; 1a `cde3306d` (scaffold + 12-RED); 1b `…` (Taichi force engine + goldens + capture, 14/14);
1c (perf 0.101s + CI + mutation + corpus 33→34 + gate-13 MATCHED at cde3306d); 2 (this — spec
`spec-frontier-particle.md`, ledger row 26 → landed).

**OPERATOR ANCHOR CORRECTION applied (load-bearing):** the canonical model uses the **LOCAL** rule
(web-confirmed: the SOS article uses local energy minimisation, contrasts with global descent) →
`E_total` is NOT monotonic → A1 shifted from energy-Lyapunov to the **force = −∇E identity** (NumPy
analytic mirror), with **NO Lyapunov/monotonicity golden** (it would be unsound). A2 central FD, A3
total-energy translation symmetry. Cited the **Google Research Self-Organising Systems** article
(NOT Distill). **Key results (FACT):** A1 engine-vs-mirror ~1e-22; A2 engine-vs-FD ~2.4e-10; A3
residual ~1e-16; determinism bit-identical (force + rollout); the LOCAL force sum ≠ 0 (confirms the
local rule does not conserve momentum → A3 is the global-energy symmetry, not the force sum);
parent-vs-frontier REFRAMED to invariant posture (particle-based, not pointwise vs grid Lenia).

**Banked:** D-SPEC-SPLIT resolved — split the shared `spec-frontier.md` stub into per-variant
`spec-frontier-particle.md` / `spec-frontier-flow.md` (flow stub remains until sim 3). gate-13
evidence rule refined: generate FROM the worktree (the replay's env) → guaranteed match.

## Sim 3 — flow-lenia (S27) — pending
