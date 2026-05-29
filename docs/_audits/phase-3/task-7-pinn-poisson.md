---
date: 2026-05-29T19-45-09Z
author: phase-3 pinn-poisson stage-2 landing (Claude Code)
subject: Phase 3 task-7 pinn-poisson — STAGE 2 LANDING (FIRST learned-dynamics-CATEGORY sim) — 13 gates, D-DET measured, A-6, closed-with-shifted-8, D.2.3 descriptor proposal, NO tag
verdict: CONFIRMED — closed-with-shifted-8
head_sha: 2ea3e33fff1b8288d654f5c03b27af5d5eb480fb
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
failing_tests_output_hash: sha256:49c865ad734c70c3c5e1515564bf7a08d84eec698babc23113df2f72b3e38406
d_class_status: ALL RESOLVED (D-WARP-TORCH-INTEROP WORKS / D-ANCHOR-SET 3-anchors / D-DET measured / D-VENDOR-* A-6 / D-MUTATION defer-task-9 / D-USD defer / D-TOL / D-LAYOUT / D-CI / D-MANIFEST-FMT / D-NAMING / D-CAPTURE-DESC / D-TAG NO)
evidence_paths:
  - docs/phases/sub-phase-phase-3-pinn-poisson.md
  - docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md
  - docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1c-2026-05-29T15-33-40Z.md
  - docs/spec-amendments-proposed.md
evidence_hashes:
  docs/phases/sub-phase-phase-3-pinn-poisson.md: sha256:9705cf3c9c110f371609d70ce6f2dec24f4542e0e9c637bd63a01b0ce3d494aa
  docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md: sha256:acb6268f511a312b6447cef8312fc5eb41ca600c7bbf8611e9691d32f136586d
  docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1c-2026-05-29T15-33-40Z.md: sha256:284489ad254ae8ffc4b0ef0b17fe7bfe95df8cb1aaf2d92ac2f9dd95e1781ce9
  docs/spec-amendments-proposed.md: sha256:e124830bf2559345281578dce030efaf14e7086a2c843be991bb7b19e54d0c6f
---

# Phase 3 — task-7 pinn-poisson — Stage 2 LANDING report

> **FIRST learned-dynamics-CATEGORY sim of the project.** A soft-constraint
> Raissi-2019 PINN solving the 2D Poisson equation `Δu = f` on `[0,1]²`, Stack E
> (Warp substrate) + PyTorch, CPU-only. Verified two-pronged (analytic anchors +
> classical FD reference) + convergence-with-collocation. Verdict
> **CONFIRMED — closed-with-shifted-8**. NO tag (D-TAG NO). task-7 is TERMINAL on
> produce (task-9 is a soft/informational common-warp consumer).

## § 1 — Thirteen-gate acceptance (FACT)

| Gate | Result / evidence |
|---|---|
| 1 spec sheet + §6 posture | `docs/sim-specs/learned-dynamics/pinn-poisson/spec-ref.md` (two-pronged; CPU-scope-honesty; FD-numerical-baseline note) |
| 2 pre-impl probe | `tools/testkit/probes/reports/pinn-poisson.md` |
| 3 failing acceptance suite + sha256 | RED 9 failed/9 passed; `failing-tests-evidence/pinn-poisson-2026-05-29T13-13-00Z.txt` sha256 `49c865ad…` (replay-format) |
| 4 golden (Cat-3, ≥3 anchors) | `pinn-poisson-canonical.json` — Anchors 1 (Evans §2.2), 2 (Strauss §6.2), 3 (MMS f≠0); golden-v1 valid |
| 5 Tier-1 diagnostics | `test_diagnostics.py` health ok=True (0 NaN/Inf) on the canonical capture |
| 6 category Tier-2/Tier-3 | `tools/diagnostics/tier3/pinn_poisson/` (residual + convergence-order + collocation), ad-hoc ok=True |
| 7 citation chain (Cat 1) | Raissi 2019 + physicsnemo-sym v2.4.0 Apache-2.0 read-only vendor |
| 8 public API (Cat 2) | `pinn_poisson` train/infer CLI + checkpoint API; `references/` excluded |
| 9 replayable capture | `tests/fixtures/legacy-captures/phase-3-pinn-poisson.{h5,json}` (torch→wp bridge; LFS) |
| 10 determinism decl ↔ capture | two registry rows ↔ capture `claimed=bit-exact-same-hw` |
| 11 PBT (§2.14, ≥2) | `pde_residual_bounded` + `boundary_residual_bounded` (envelope-scoped) PASS |
| 12 perf-ledger wall-clock | `docs/perf-ledger.md` row; training_wall_clock 127.9s **separate** |
| 13 landing replays failing tests | `replay_failing_tests` @ `239e8a0` → **match True** (`465e312d…`) |
| mutation | **deferred** (D-MUTATION → task-9; live mutmut-config has no classical-references target) |
| 14 | **N/A** (single-stack; no cross-stack / render-similarity) |

All 13 applicable gates PASS. The package suite is **20 passed** (9 analytic-core +
2 FD + 3 inference-vs-analytic [A1/A2/A3] + 1 inference-vs-FD + 2 PBT + 2
training-convergence + 1 convergence-with-collocation).

## § 2 — D-DET measured outcome (FACT)

- **Same-seed CPU training BIT-IDENTICAL** (two seed-42 runs → byte-equal field,
  max_abs_diff 0.0; the committed checkpoint reproduces a fresh seed-42 train) — the
  NCA finding transfers. Registry training row kept `non-deterministic` (weights are
  seed-dependent — the learned-dynamics distributional character; mirrors neural-ca),
  `seed_pinned=true`.
- **EFECT derivable, NO STOP-EFECT:** across 5 seeds the final-loss distribution is
  mean 2.37e-6, CV 0.290, **3σ upper 4.44e-6** (locked 5e-6 in tolerance.toml).
- **Inference bit-exact** (`same-stack-same-hw`), MEASURED bit-identical.
- **The EFECT band is NOT the acceptance gate** — the analytic (`analytical_l2=1e-3`)
  + classical-FD (`fd_l2=1e-2`) checks on the frozen network are. MEASURED: A1 3.2e-4,
  A2 ~3e-4, A3 2.27e-4 (vs analytic); A3-vs-FD 3.4e-4.

## § 3 — closed-with-shifted-8 (§2.15)

1. **USD-defer** (D-USD) — §2.5 Stack-E USD-export mandate vs unbuilt `common_warp.usd`;
   DEFERRED per the task-4 ratified Phase-3-Stack-E-WIDE policy (Phase-4 WU-D). spec-ref §13.
2. **§0.3 layout** — `packages/pinn-poisson/` flat (not `learned-dynamics/.../python/`).
3. **§0.3 CI** — `python-strict.yml` `test-pinn-poisson` (not the non-existent `build-py.yml`).
4. **§0.3 manifest-fmt** — `references/PhysicsNeMo-PINN/MANIFEST.toml` (not `manifest.yaml`).
5. **Strauss anchor cite §6.1 → §6.2** ("Rectangles and Cubes"; §6.1 is general theory).
6. **PINN config lock (units 50 → 60, n_interior 2000 → 3000, L-BFGS 1500 → 2000)** —
   the charter-implied default left A2 (Strauss sinh) at 1.02e-3 > `analytical_l2`;
   the config was CONVERGED harder to 3.2e-4 (NOT the tolerance widened — spec §2.6).
7. **meshgrid indexing test-convention fix (1b-FD)** — the comparison grid aligned to
   `indexing="ij"` to match the FD solver; a latent `xy`-vs-`ij` bug surfaced by the
   asymmetric Anchor 2 (not a falsified anchor/solver — analytic sympy-correct, solver order-2).
8. **gate-13 evidence-format re-capture (1c)** — the Stage-1a `-v`-with-header capture was
   re-captured in the `replay_failing_tests` format (`uv run --directory … pytest -v
   --tb=short`, repo-root paths) → replay match True. Substance unchanged (9 failed/9 passed).

## § 4 — Corrigendum + SHIFTs surfaced (FACT)

- **A-6** (`docs/spec-amendments-proposed.md`, appended after A-5): spec Appendix D.3
  PhysicsNeMo row — (1) PINN tutorials live in `physicsnemo-sym` not the core repo;
  (2) `<latest 1.x>` pin stale (core 1.x ended v1.3.0). Related plan §2.18 defect
  (core-repo pin + `manifest.yaml` name) **deferred to the operator** (A-4 pattern; no
  agent plan edit per §0.3).
- **Charter v2** flipped the five operator-ratified D-classes OPERATOR-PENDING → RESOLVED.

## § 5 — Appendix D.2.3 descriptor proposal (operator, additive)

Propose adding to spec Appendix D.2.3 (capture-descriptor table):

`| pinn-poisson | ref | poisson-sine-source-64sq-seed42-step1 | Phase 3 task-7 |`

The inhomogeneous-MMS field on a 64×64 grid; a steady BVP has no time axis, so
`step1` denotes the single captured evaluation. Additive at landing per D.2.3
("any phase landing audit may extend this table for sims it shipped"); operator confirms.

## § 6 — Landing verification (FACT)

- **§R integrity:** `0 HARD_FAIL / 14 SOFT_WARN`; full-report sha256 `5c7172a2…`
  (measured live; drifted legitimately from the phase baseline as golden tables were
  added — §R measure-don't-copy).
- **Cross-phase replay** `--prior-phase phase-2` → `ok=True` 8/8.
- **append-only:** the only `docs/_audits/` modifications on this branch are this
  session's sanctioned Convention-#12 self-back-fills (never `--amend`; no prior-session
  audit touched).
- **verify_evidence:** this sub-phase's 5 stage audits 5/0; full phase-3 sweep 60 pass /
  7 fail — the 7 are the unchanged pre-existing baseline (no-regression).
- **§S.5 CI:** the Stage-1b-PINN push (`15db82f`) full sweep is GREEN incl. the
  iteration-heavy `test-pinn-poisson` trainer (cross-hardware A2 confirmed passing); the
  Stage-1c (`2ea3e33`) + this landing push sweeps are confirmed green post-push.

## § 7 — Banked lessons / forward routing

- **L-PINN-1 (gate-13 evidence format):** `failing-tests-evidence` MUST be captured with
  the exact `replay_failing_tests` command (`uv run --directory <pkg> --extra dev pytest
  -v --tb=short`, stdout only, repo-root cwd, NO custom header) — `-v`-from-elsewhere +
  headers break the normalized-sha replay. (This sub-phase re-captured at 1c.)
- **L-PINN-2 (CI cost):** the `test-pinn-poisson` job trains ~4 full PINNs (~tens of
  minutes on the 2-core ubuntu runner); python-strict.yml has no path filters, so every
  push to main pays it. A CI-cost reduction (reduced-iteration smoke config or
  marker-gated full run) is a candidate maturation item for **task-9 / operator**.
- **L-PINN-3 (config-locks-on-evidence):** A2 (sinh, large dynamic range) is the binding
  accuracy constraint; converge the config (capacity/iterations), never widen `analytical_l2`.
- **D-MUTATION → task-9:** the reusable `poisson-2d-fd` classical reference's mutation
  target is deferred (rule-of-three; convergence-order ≈2 is the rigor substitute).

## § 8 — Verdict

**CONFIRMED — closed-with-shifted-8.** All 13 applicable gates PASS; D-DET measured
(bit-identical same-seed + EFECT 3σ 4.44e-6, no STOP-EFECT; inference bit-exact); FD
convergence order ≈2; analytic + FD verification GREEN; integrity 0 HF / 14 SW;
replay ok=True; verify_evidence no-regression; CI green. **task-7 is TERMINAL on
produce** (task-9 soft consumer). **NO tag** (D-TAG NO). Phase-3 sim arc advances.
