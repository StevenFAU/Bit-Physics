---
date: 2026-05-29T13-26-02Z
author: phase-3 pinn-poisson stage-1b-fd (Claude Code)
subject: Phase 3 task-7 pinn-poisson — STAGE 1b-FD classical FD reference + analytic golden table + derivation + convergence-order rigor
verdict: CONFIRMED
head_sha: b37b7db
anchor_sha: 7480ba134c3bfd4ab6eb35d711a0d8662cfc7032
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-MUTATION FD-reference target DEFERRED to task-9 (rule-of-three; convergence-order ≈2 is the rigor substitute) / D-ANCHOR-SET 3 anchors landed (Evans §2.2, Strauss §6.2, MMS f≠0)
evidence_paths:
  - tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py
  - tools/testkit/code_verification/classical-references/README.md
  - tools/testkit/golden/tables/pinn-poisson-canonical.json
  - tools/testkit/golden/derivations/poisson-2d-analytical.md
  - packages/pinn-poisson/pinn_poisson/fd_reference.py
  - docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1a-2026-05-29T13-16-56Z.md
evidence_hashes:
  tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py: sha256:193f79c8237a00bf7c46917d0769db178149031c68bc8747d07064e70c0af609
  tools/testkit/code_verification/classical-references/README.md: sha256:4dd0cdbde9fa557063be1001272cb25cfe3bcb3b3cab8ad9b15076858e2492bd
  tools/testkit/golden/tables/pinn-poisson-canonical.json: sha256:4549ef311fe57d3dd30df9055854d55cad300a1dc30858c8cf845c4fa11622d5
  tools/testkit/golden/derivations/poisson-2d-analytical.md: sha256:7f2994d0eff6e41145ebb7b2ae97d99a9e021f210b904453b6d9a80d876c39cd
  packages/pinn-poisson/pinn_poisson/fd_reference.py: sha256:971025d6dc928968b4ccddb0259c14d4f55a144b1e566c1699761a51d812ef73
  docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1a-2026-05-29T13-16-56Z.md: sha256:acde0b5196e07294f48559b3269adf62e9218032188c0ac8ee6170885f7c179f
---

# Phase 3 — sub-phase pinn-poisson — Stage 1b-FD audit

> The classical finite-difference reference (reusable testkit surface) + the
> analytic golden table + derivation H. Verdict **CONFIRMED** — the FD verification
> prong is GREEN; Stage 1b-PINN (PINN training) is now safe to dispatch.

## § 1 — Classical FD reference (FACT)

NEW reusable surface `tools/testkit/code_verification/classical-references/`:

- `poisson-2d-fd/solver.py` — pure NumPy/SciPy 5-point-Laplacian solver
  (`L = kron(I,T)+kron(T,I)`, `spsolve`), stack-agnostic (no Warp/PyTorch/package
  imports; takes plain `source(x,y)`/`boundary(x,y)`). `solve_poisson_2d`,
  `discrete_relative_l2`, `observed_convergence_orders`.
- `README.md` — the reusable-classical-reference pattern (anchored-not-independent;
  ships-a-convergence-check; rule-of-three mutation policy).

## § 2 — Convergence-order rigor (HARD RULE 2 — FACT)

MEASURED `observed_convergence_orders` vs the MMS analytic solution (Anchor 3)
across `n ∈ {16,32,64,128}` (`h = 1/(n-1)`):

| n | h | rel-L2 vs analytic |
|---|---|---|
| 16 | 0.0667 | 3.663e-03 |
| 32 | 0.0323 | 8.563e-04 |
| 64 | 0.0159 | 2.072e-04 |
| 128 | 0.0079 | 5.099e-05 |

**Observed orders: [2.0023, 2.0005, 2.0001] → `O(h²)` CONFIRMED.** HARD RULE 2
"order ≈ 2" holds — no real solver bug; not a tolerance to widen. This MMS-grade
order check is the rigor substitute for the FD-reference mutation target
(D-MUTATION DEFERRED to task-9, rule-of-three; first classical reference).

Point-match @128: Anchor 1 (Evans) 1.7e-6, Anchor 2 (Strauss) 3.0e-5, Anchor 3
(MMS) 5.1e-5 — all < 1e-3 (FD is a high-precision numerical baseline anchored to
the analytic set, NOT independent).

## § 3 — Analytic golden table + derivation (FACT)

- `golden/tables/pinn-poisson-canonical.json` — algorithm
  `poisson-2d-analytic-dirichlet`, category `learned-dynamics`; 12 test points,
  **3 independent-reference anchors** (Evans §2.2 harmonic, Strauss §6.2 harmonic,
  MMS `f≠0`). **golden-v1 schema VALID.** Values generated from the sympy-verified
  closed forms. cat3: AUDIT_LOG (no Python evaluator registered — lenia/ising
  precedent; numeric verification is via the package pytest suite), NOT a SOFT_WARN
  → the 14-count is unchanged.
- `golden/derivations/poisson-2d-analytical.md` — derivation H; every Laplacian/BC
  claim sympy-verified at assertion. Documents the FD-is-anchored-numerical-
  baseline-not-independent caveat + the Strauss §6.1→§6.2 SHIFT.

## § 4 — FD adapter + test-convention fix (FACT)

- `packages/pinn-poisson/pinn_poisson/fd_reference.py` path-loads the hyphenated-dir
  solver (importlib; tier-3 precedent) and adapts `PoissonProblem` → numpy
  callables. The two FD-reference acceptance gates (point-match all 3 anchors +
  order ≈ 2) are now GREEN.
- **Test-convention fix (not a STOP):** the comparison meshgrid in three tests was
  aligned to `indexing="ij"` to match the solver's internal convention. A latent
  bug surfaced when the asymmetric Anchor 2 gave rel-L2 1.17 under numpy's default
  `"xy"` indexing (the symmetric Anchor 3 had hidden it). The analytic value is
  sympy-correct and the solver is order-2 correct — this was a test-harness
  convention mismatch, NOT a falsified anchor or solver bug (HARD RULE 2 not
  triggered).

## § 5 — Suite + integrity (FACT)

`pytest packages/pinn-poisson/tests/` → **11 passed / 7 failed** (9 analytic-core +
2 FD-reference GREEN; the 7 RED are the PINN training/inference, Stage 1b-PINN).
ruff + `mypy --strict` clean. Integrity `0 HARD_FAIL / 14 SOFT_WARN`; full-report
sha256 **`5c7172a2…`** (drifted from Stage-1a `b7460150` — the golden table added an
AUDIT_LOG line; §R measure-don't-copy, drifts as golden tables are added).

## § 6 — Verdict

**CONFIRMED.** FD reference + golden table + derivation landed; convergence order
≈2 CONFIRMED; FD prong GREEN; integrity 0 HF / 14 SW. **Stage 1b-PINN safe to
dispatch.** NO tag.
