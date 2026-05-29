---
date: 2026-05-29T15-18-56Z
author: phase-3 pinn-poisson stage-1b-pinn (Claude Code)
subject: Phase 3 task-7 pinn-poisson — STAGE 1b-PINN PINN training + checkpoint + capture + determinism (D-DET measured) + EFECT + PBT + RED->GREEN
verdict: CONFIRMED
head_sha: 4a7f209
anchor_sha: 8481e559547647e4e40e1054b2fd4d2c7c65a288
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
failing_tests_output_hash: sha256:70df19233921697f2e41221ff7013e8f3b3a53457214291bbdace9e1baf1bb06
d_class_status: D-DET MEASURED (training non-deterministic + same-seed-bit-identical + EFECT-3σ-4.44e-6 NO-STOP-EFECT; inference bit-exact bit-identical) / D-WARP-TORCH-INTEROP capture-bridge exercised
evidence_paths:
  - packages/pinn-poisson/pinn_poisson/train.py
  - packages/pinn-poisson/pinn_poisson/infer.py
  - tools/testkit/property/sims/pinn_poisson/invariants.py
  - tools/testkit/equivalence/tolerance.toml
  - tools/testkit/determinism/registry.toml
  - docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md
  - docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1b-fd-2026-05-29T13-26-02Z.md
evidence_hashes:
  packages/pinn-poisson/pinn_poisson/train.py: sha256:5d67c1ba15c936ba750d10223a6071717180a7b247099d70219f0971f754fc7d
  packages/pinn-poisson/pinn_poisson/infer.py: sha256:e02f0a292ceb2ef8eb892eb5687f25e290108780193a45e11de676345721dd31
  tools/testkit/property/sims/pinn_poisson/invariants.py: sha256:ccdea9ff8578755c67f7c99676630342ef27283934e53f2717671cf21ff653ef
  tools/testkit/equivalence/tolerance.toml: sha256:e8de5f3fe13cee4f71b06d59083588facb6679136e61ab39cd7fe93ef50f385d
  tools/testkit/determinism/registry.toml: sha256:14b23b971ac0df6381ec016b0a3ff936962dc73e4c3603f446dfe2ee9e7220f6
  docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md: sha256:acb6268f511a312b6447cef8312fc5eb41ca600c7bbf8611e9691d32f136586d
  docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1b-fd-2026-05-29T13-26-02Z.md: sha256:2341b6bd3bb8560294790c172072076c8838f8a63b618d87acd10e9763ed8b2f
---

# Phase 3 — sub-phase pinn-poisson — Stage 1b-PINN audit

> The Raissi-2019 soft-constraint PINN (Adam→L-BFGS), the trained checkpoint, the
> canonical inference capture (torch→wp bridge), the MEASURED determinism + EFECT,
> and the PBT invariants. The Stage-1a RED acceptance suite is now GREEN. Verdict
> **CONFIRMED** — Stage 1c (verification wiring + landing prep) is safe to dispatch.

## § 1 — PINN implementation + RED→GREEN (FACT)

Reimplemented from Raissi-2019 (cite-don't-import; cross-checked vs the vendored
physicsnemo-sym helmholtz example). MLP `(x,y)→u`, f64, Glorot-seeded; PDE residual
`Δu_NN−f` via double `torch.autograd.grad`; composite loss
`interior + 10·boundary`; **Adam(2000) → L-BFGS(2000, strong-Wolfe)**.

Config LOCKED at `hidden_units=60, hidden_layers=4, n_interior=3000` after the
default `units=50` config left A2 (Strauss sinh) at **1.02e-3 > 1e-3** (FAIL).
MEASURED rel-L2 vs analytic at `units=60`: A1 3.2e-4, A2 ~3e-4, **A3 2.27e-4**;
A3-vs-FD **3.4e-4** (≤ `fd_l2=1e-2`).

**Full suite: 20 passed (1:07:23 — CPU-contended; gate-12 train_wall_clock 127.9s
per training).** The Stage-1a RED acceptance suite (gate-3 sha256
`70df1923…`) is now GREEN — RED→GREEN witness. ruff + `mypy --strict` clean
(torch `no-any-return`/untyped-call handled via `cast` + scoped
`# type: ignore[no-untyped-call]`, neural-ca precedent; `# mypy: ignore-errors`
scoped to the Warp-touching `infer.py`, F-RB-3).

## § 2 — Checkpoint + capture (torch→wp bridge; gate-9 — FACT)

- `tools/testkit/golden/checkpoints/pinn-poisson-mms-seed42.safetensors` (LFS) — the
  frozen seed-42 Anchor-3 weights + arch metadata; reproduces a fresh seed-42 train
  byte-for-byte (`checkpoint_matches_fresh_train=True`).
- `tests/fixtures/legacy-captures/phase-3-pinn-poisson.{h5,json}` (h5 LFS) — the
  canonical inference capture via the **torch→wp→Capture bridge** (`wp.from_torch`,
  CPU zero-copy f64; D-WARP-TORCH-INTEROP exercised). Descriptor
  `poisson-sine-source-64sq-seed42-step1`; manifest capture-v1, stack `warp-stack-e`,
  determinism `bit-exact-same-hw`, real payload checksum. Read-back verified
  (`u_center 0.9994 ≈ analytic u(½,½)=1`).

## § 3 — D-DET measured (FACT — MEASURE-then-declare)

| Measurement | Result |
|---|---|
| same-seed CPU training (two seed-42 runs) | **BIT-IDENTICAL** (byte-equal field, max_abs_diff 0.0) — the NCA finding transfers |
| inference (frozen model evaluated twice) | **BIT-IDENTICAL** |
| EFECT — 5 pinned seeds {42,11,22,33,44} final losses | mean 2.37e-6, std 6.89e-7, CV 0.290, **3σ upper 4.44e-6** (locked 5e-6) |

- **registry training row** kept `non-deterministic` (trained weights are
  seed-dependent — the learned-dynamics distributional character; mirrors neural-ca)
  + `distributional_bound="EFECT"`; same-seed reproducibility captured by
  `seed_pinned`. Distribution BOUNDED → **EFECT derivable, NO STOP-EFECT**.
- **registry inference row** `bit-exact` `same-stack-same-hw` MEASURED bit-identical.
- **CRITICAL:** the EFECT band characterizes TRAINING reproducibility — it is NOT the
  acceptance gate (the analytic `analytical_l2` + classical-FD `fd_l2` checks on the
  frozen network are the load-bearing gates).

## § 4 — PBT invariants (gate-11, ≥2 — FACT)

`tools/testkit/property/sims/pinn_poisson/` + the package Hypothesis witness:
`pde_residual_bounded` (|Δu_NN−f| ≤ envelope) + `boundary_residual_bounded`
(|u_NN−g| ≤ envelope), both **envelope-scoped** to the trained regime. MEASURED
residuals: pde max **0.0126**, boundary max **0.00065** → envelopes 0.1 / 0.01
(~8× / ~15× headroom; the trained regime, NOT a widened tolerance — re-declare-on-
falsification per the neural-ca/lenia precedent). Both PASS.

## § 5 — Integrity (§R — FACT)

`integrity --all --mode strict` → `0 HARD_FAIL / 14 SOFT_WARN`; full-report sha256
`5c7172a2…` (unchanged from Stage 1b-FD — the new package code + LFS artifacts add
no findings; the golden table's AUDIT_LOG is already in the report). tolerance.toml
+ registry.toml validate.

## § 6 — Verdict

**CONFIRMED.** PINN GREEN (20/20); checkpoint + capture (torch→wp bridge); D-DET
measured (same-seed bit-identical + EFECT 3σ 4.44e-6, NO STOP-EFECT; inference
bit-exact); PBT ≥2 envelope-scoped PASS; integrity 0 HF / 14 SW. **Stage 1c safe to
dispatch.** NO tag. (Stage commits `e7dac56`→`8481e55`; LFS push at the §S.5 sweep.)
