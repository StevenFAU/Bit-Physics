---
date: 2026-05-29T13-16-56Z
author: phase-3 pinn-poisson stage-1a (Claude Code)
subject: Phase 3 task-7 pinn-poisson — STAGE 1a scaffold + RED + failing-tests-hash + spec-ref + tolerance + determinism rows
verdict: CONFIRMED
head_sha: 3e1093e
anchor_sha: 239e8a0251db97152220fe32e43a8f96a24171eb
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
failing_tests_output_hash: sha256:70df19233921697f2e41221ff7013e8f3b3a53457214291bbdace9e1baf1bb06
d_class_status: D-LAYOUT packages/pinn-poisson/ (flat) / D-TOL golden_tolerance.learned-dynamics.pinn-poisson (schema pre-baked) / D-DET two rows DEFAULT (measure at 1b-PINN) / D-CI test-pinn-poisson deferred to 1c (RED suite must not run in CI)
evidence_paths:
  - docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md
  - packages/pinn-poisson/pyproject.toml
  - packages/pinn-poisson/pinn_poisson/problems.py
  - tools/testkit/failing-tests-evidence/pinn-poisson-2026-05-29T13-13-00Z.txt
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-0-2026-05-29T12-54-44Z.md
evidence_hashes:
  docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md: sha256:4ef984d145cfa426451039882b1feb3619a88f78be0f4d8699c315e101cbf230
  packages/pinn-poisson/pyproject.toml: sha256:63cf458220b5b0c352186dee4f891a96d83d16b9957e30e5939668d4e8d09737
  packages/pinn-poisson/pinn_poisson/problems.py: sha256:76ae8b1b1e9b3a4241e3301008818f837e79fe949b5b7a35281ce284d3d59264
  tools/testkit/failing-tests-evidence/pinn-poisson-2026-05-29T13-13-00Z.txt: sha256:70df19233921697f2e41221ff7013e8f3b3a53457214291bbdace9e1baf1bb06
  tools/testkit/equivalence/tolerance.toml: sha256:c02cb736106fe3f0bbf9c5dc7a7b881741142249425e04ba693262247bf894d1
  tools/testkit/determinism/registry.toml: sha256:e5e309fd1fffff5ffa4690b7a3155a704c364aeb20252fbdb0a11b20626bfca1
  docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-0-2026-05-29T12-54-44Z.md: sha256:a26eefab646b0aae0630bcd0d1e1620a8ecc27b910b08d9bd508c959f0e754c3
---

# Phase 3 — sub-phase pinn-poisson — Stage 1a audit

> Scaffold `packages/pinn-poisson/` (28th workspace member) + the failing TDD
> acceptance suite (gate-3) + spec-ref §1–13 + the tolerance row + the two
> determinism rows. Verdict **CONFIRMED** — Stage 1b-FD (classical FD reference +
> analytic goldens) is now safe to dispatch.

## § 1 — Scaffold (FACT)

Flat package `packages/pinn-poisson/` (D-LAYOUT §0.3 — lenia/articulated-pedagogical
precedent), registered as the 28th workspace member.

- `problems.py` — REAL analytic core: three independent-reference anchors
  (Anchor 1 Evans §2.2 harmonic; Anchor 2 Strauss §6.2 harmonic; Anchor 3 MMS
  `f=-2π²sin(πx)sin(πy)`), **backend-generic** over numpy/torch. All three
  Laplacians + boundary conditions **verified symbolically with sympy** this Stage
  (Anchor 1 `Δu=0`; Anchor 2 `Δu=0`, zero on three edges; Anchor 3 `f=-2π²u`, zero
  Dirichlet BC; `u₃(½,½)=1`, `u₃(¼,¼)=½`).
- `model.py` / `residual.py` / `train.py` / `infer.py` / `fd_reference.py` —
  Stage-1a shells (NotImplementedError) for the Stage-1b deliverables.
  `# mypy: ignore-errors` scoped to the Warp-touching `infer.py` only (F-RB-3).
- `__main__.py` — `train` / `infer` CLI (§3.2.6).
- ruff + ruff-format clean; `mypy --strict` clean (8 source files).

## § 2 — RED acceptance suite (gate-3 — FACT)

`uv run --no-sync python -m pytest packages/pinn-poisson/tests/ -v` →
**9 failed, 9 passed**:

| Acceptance gate (RED) | Why it fails |
|---|---|
| training-convergence (×2) | `train_pinn` NotImplementedError (1b-PINN) |
| inference-vs-analytic [Anchors 1/2/3] | `train_pinn`/`evaluate_on_grid` NotImplementedError |
| inference-vs-FD | `train_pinn`/`fd_solve` NotImplementedError |
| convergence-with-collocation-density | `train_pinn` NotImplementedError |
| FD vs analytic anchors + FD convergence-order≈2 | `fd_solve`/`fd_convergence_orders` NotImplementedError (1b-FD) |

The 9 PASSING tests are the analytic-core sanity (numpy↔torch agreement, source ==
finite-diff Laplacian, harmonic zero-source, Anchor-3 zero Dirichlet BC) — the
verification ground truth, not acceptance gates.

**gate-3 verbatim-output sha256:**
`70df19233921697f2e41221ff7013e8f3b3a53457214291bbdace9e1baf1bb06`
(`tools/testkit/failing-tests-evidence/pinn-poisson-2026-05-29T13-13-00Z.txt`;
F-RB-1 hook exclusion). Re-witnessed at Stage 2 (gate-13, worktree).

## § 3 — Tolerance + determinism (FACT)

- **tolerance.toml** `[golden_tolerance.learned-dynamics.pinn-poisson]`
  `analytical_l2=1e-3`, `fd_l2=1e-2`. FIRST `learned-dynamics.*` row. Schema
  pre-bakes these exact keys (D-TOL §S.3) → NO schema branch / NO budget cap / NO
  §2.6 amendment. Validated against `tolerance-schema.json`. §S.2 discharged (read
  schema + lenia/ising/rigid-body/cloth/neural-ca entries first).
- **registry.toml** TWO rows `[learned-dynamics.pinn-poisson.{training,inference}]`:
  training `non-deterministic` (DEFAULT) + `distributional_bound="EFECT"` (CPU-only
  → `atomic_ops="none"`); inference `bit-exact` `same-stack-same-hw`. MEASURE-then-
  declare at 1b-PINN. EFECT is **NOT** the acceptance gate.

## § 4 — spec-ref (FACT)

`docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md` — 13-section template
(§8.2). §1 CPU-only scope-honesty note; §6 two-pronged posture + FD-is-numerical-
baseline-not-independent note + the MMS convergence-order rigor substitute for the
deferred FD mutation target + the TWO PBT invariants FULLY DECLARED
(`boundary_residual_bounded` + `pde_residual_bounded`, envelope-scoped); §9 N/A
single-stack (no gate-14); §13 USD-defer. §0.3 SHIFTs documented.

## § 5 — Integrity (§R two-field — FACT)

`uv run python -m integrity --all --mode strict` → `0 HARD_FAIL / 14 SOFT_WARN`;
full-report sha256 **`b7460150…`** (measured live; unchanged from Stage 0 — the
finding set is unchanged, no golden tables added yet). registry.toml + tolerance.toml
parse + validate; equivalence + determinism harness tests green.

## § 6 — Verdict

**CONFIRMED.** Scaffold + RED + gate-3 hash + spec-ref + tolerance + determinism
rows landed; mypy/ruff clean; integrity 0 HF / 14 SW. **Stage 1b-FD safe to
dispatch.** NO tag.
