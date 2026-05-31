# spec-frontier-particle.md — particle-lenia (Particle Lenia frontier variant)

> **Status:** LANDED (Phase-4 batch-3, sim 2/3). De-stubbed from the shared Phase-4.0
> `spec-frontier.md` pre-stage slot (D-SPEC-SPLIT: split into per-variant `spec-frontier-particle.md`
> / `spec-frontier-flow.md`, one sim per sheet).
> **Parent reference sim:** `docs/sim-specs/continuous-ca/lenia/spec-ref.md` (grid Lenia).
> **Variant type:** `frontier-particle-lenia`. **Primary stack:** D (Taichi).
> **Package:** `packages/particle-lenia/` (import `particle_lenia`).
> **Charter:** `docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md` § 3.2 / § 4.2.

## § 1 Scope

Energy-based **Particle Lenia** (Mordvintsev, Niklasson, Randazzo 2022 — Google Research
Self-Organising Systems, *"Particle Lenia and the energy-based formulation"*,
<https://google-research.github.io/self-organising-systems/particle-lenia/>). Particles carry a
Lenia field `U(x) = Σ_j K(|x − p_j|)`, a growth map `G(U)`, a repulsion field `R(x)`, and a
per-particle energy field `E(x) = R(x) − G(U(x))`. The **canonical LOCAL rule** integrates
`dp_i/dt = −∇E(p_i)` (forward Euler) — each particle greedily minimises its OWN local energy. A
genuine reformulation of grid Lenia (particle-based, not grid-based; plan §8.4 "qualitatively
different output" applies).

## § 2 Physics / governing equations

`K(r) = w_k·exp(−(r−μ_k)²/σ_k²)`; `G(u) = exp(−(u−μ_g)²/σ_g²)`; `R(x) = (c_rep/2)·Σ max(1−r,0)²`;
`E = R − G(U)`; LOCAL `dp_i/dt = −∇E(p_i)`. SOS-article 2D defaults `μ_k=4, σ_k=1, w_k=0.022;
μ_g=0.6, σ_g=0.15; c_rep=1; dt=0.1`. The Taichi engine (`particle_force`) computes the analytic
force with explicit f64 accumulators, single-thread serial (no atomics).

## § 3 Verification surfaces

1. **Gradient golden table (gate-4, ≥3 independent anchors):**
   `tools/testkit/golden/tables/particle-lenia-gradient.json` — see § 8.
   `tests/test_gradient_golden.py`; derivation
   `tools/testkit/golden/derivations/particle-lenia-gradient.md`.
2. **Parent-vs-frontier (REFRAMED invariant posture):** Particle Lenia is particle-based, NOT
   pointwise-comparable to grid Lenia → equivalence is the rigorous force/symmetry INVARIANT
   (plan §8.4), not a trajectory match. gate-14 N/A (single-stack).
3. **Determinism:** force + rollout bit-identical run-to-run (§ 4).

## § 4 Determinism

MEASURED bit-exact, same-stack-same-hw (Taichi CPU single-thread serial; explicit f64 accumulators;
no atomics; seed-pinned cluster IC). Registry `tools/testkit/determinism/registry.toml`
`[continuous-ca.particle-lenia]`. No EFECT. **Pointwise-vs-trajectory:** pointwise determinism holds
run-to-run; the GOLDEN is the force/symmetry invariant, not the trajectory (Particle Lenia rollouts
can be sensitive over long horizons).

## § 5 Capture

Rollout capture (per-step `(N, 2)` particle positions field `P`), schema 1.0.0, via
`common_py.capture.Writer`. Canonical `captures/particle-lenia-ref/`; schema-corpus fixture
`tests/fixtures/legacy-captures/phase-4-particle-lenia.h5` (LFS).

## § 6 PBT invariant declarations (≥2 per spec § 2.14)

1. **`force_matches_finite_difference`** (variant-axis): the engine force == `−∇E` (central FD) for
   random configs (the operator's "force = −∇E identity" rigorous core). Re-declared on
   falsification, never widened.
2. **`total_energy_translation_invariant`** (symmetry): `E_total(P + δ) == E_total(P)` for random
   configs + shifts (exact; `Σ_i ∇_{p_i} E_total = 0`). The LOCAL force sum is NOT zero (the local
   rule does not conserve momentum); the sound anchor is the GLOBAL-energy invariance.

**Energy MONOTONICITY is NOT a PBT** — the canonical LOCAL rule does not make `E_total` monotone
(the article contrasts local vs global descent); a Lyapunov golden would be unsound (operator anchor
correction). `packages/particle-lenia/particle_lenia/invariants.py`; `tests/test_pbt_invariants.py`.

## § 7 Citations (Cat 1)

- Mordvintsev, Niklasson, Randazzo (2022), *"Particle Lenia and the energy-based formulation"*,
  Google Research Self-Organising Systems
  (<https://google-research.github.io/self-organising-systems/particle-lenia/>) — the energy-based
  formulation + the LOCAL-rule dynamics.
- The parent grid Lenia reference (`packages/lenia/`) — the kernel/growth shape lineage.

## § 8 Independent-reference anchors (≥3 per spec § 2.4)

1. **A1 — analytic `−∇E` mirror:** the Taichi engine force vs an independent NumPy closed-form
   gradient (hand-derived chain rule through `K`, `G`, `R`). MEASURED engine-vs-mirror ~1e-22
   (machine-exact; bit-faithful cross-impl). SOS article.
2. **A2 — central finite differences** of `E` (numerical baseline). MEASURED ~2.4e-10.
3. **A3 — total-energy translation symmetry** `E_total(P+δ) == E_total(P)` (exact; `Σ∇E_total=0`).
   MEASURED ~1e-16. Distinct quantity (scalar-energy symmetry) + method (distance-invariance).

**OPERATOR ANCHOR CORRECTION (load-bearing):** the canonical model is LOCAL energy minimisation, so
the "energy non-increasing / Lyapunov" anchor is UNSOUND (`E_total` is not monotone). A1 is therefore
the force = `−∇E_local` identity (verified via the analytic mirror + FD), NOT energy monotonicity.
**D-DET:** measured bit-exact (§ 4). **D-EQUIV:** REFRAMED invariant posture (§ 3.2). **D-MUT:**
advisory `particle_lenia` target.

## § 9 Replayable capture

`tests/fixtures/legacy-captures/phase-4-particle-lenia.h5` (LFS; Stage 1c).

## § 10 Determinism ↔ capture

Capture sidecar `determinism.claimed = "bit-exact-same-hw"`, `atomic_ops = false` ↔ § 4 registry row.

## § 11 PBT

See § 6.

## § 12 Perf-ledger

Rollout wall-clock row in `docs/perf-ledger.md` (gate-12; Stage 1c; 0.101s).

## § 13 Gate-13

Failing-tests evidence replayed at landing (Convention E worktree; MATCHED at the 1a commit).

## Gate-14 / mutation

**gate-14 N/A** — single-stack (no cross-stack sibling); parent-vs-frontier REFRAMED to the
invariant posture. **Mutation target** (§ 8.7, advisory): `particle_lenia`.
