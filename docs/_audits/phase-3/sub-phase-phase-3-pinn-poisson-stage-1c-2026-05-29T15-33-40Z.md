---
date: 2026-05-29T15-33-40Z
author: phase-3 pinn-poisson stage-1c (Claude Code)
subject: Phase 3 task-7 pinn-poisson — STAGE 1c verification wiring + Tier-3 + perf-ledger (gate-12) + gate-13 replay + mutation-convention confirm + landing prep
verdict: CONFIRMED
head_sha: 7de4dcbd6a54e3611e842e31916dc60fcdccdaab
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: "0 HARD_FAIL / 14 SOFT_WARN"
integrity_digest_at_head: 5c7172a2be7872e3fc3f8de049400048d0407e6b68aa3f6273bcc3ebbc7175c1
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
failing_tests_output_hash: sha256:49c865ad734c70c3c5e1515564bf7a08d84eec698babc23113df2f72b3e38406
d_class_status: D-MUTATION confirmed-defer-task-9 (no classical-references mutmut target) / gate-13 replay match=True / gate-12 training_wall_clock-separate
evidence_paths:
  - tools/diagnostics/tier3/pinn_poisson/residual_diagnostics.py
  - tools/diagnostics/tier3/pinn_poisson/convergence_diagnostics.py
  - packages/pinn-poisson/tests/test_diagnostics.py
  - docs/perf-ledger.md
  - tools/testkit/failing-tests-evidence/pinn-poisson-2026-05-29T13-13-00Z.txt
  - docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1b-pinn-2026-05-29T15-18-56Z.md
evidence_hashes:
  tools/diagnostics/tier3/pinn_poisson/residual_diagnostics.py: sha256:0fa35ee4eb7900787fea31962a91a268a3a382a8a14e1811e6f346ad51a56af0
  tools/diagnostics/tier3/pinn_poisson/convergence_diagnostics.py: sha256:475d272aaf31b0c255ac121b5a60527eb44dced691c220a14e6cb2055bedf502
  packages/pinn-poisson/tests/test_diagnostics.py: sha256:b1f1324e043190860e14f12e9cb148b6c39497af76ed50911e600dbdd1c7f5be
  docs/perf-ledger.md: sha256:ac54a2250d7a41537fca75645254034b4d2625c0ba0d2b61a93269318fa2ae21
  tools/testkit/failing-tests-evidence/pinn-poisson-2026-05-29T13-13-00Z.txt: sha256:49c865ad734c70c3c5e1515564bf7a08d84eec698babc23113df2f72b3e38406
  docs/_audits/phase-3/sub-phase-phase-3-pinn-poisson-stage-1b-pinn-2026-05-29T15-18-56Z.md: sha256:a1c5bdeb5641182aa5ea1cdb0cdad7a62734bbc90795c09d99c549bd6a2108e0
---

# Phase 3 — sub-phase pinn-poisson — Stage 1c audit

> Verification wiring (the three prongs already GREEN at 1b-PINN), Tier-3
> diagnostics (J), the gate-12 perf-ledger row (training_wall_clock separate),
> the gate-13 worktree replay, and the mutation-convention confirmation. Verdict
> **CONFIRMED** — Stage 2 (landing) is safe to dispatch.

## § 1 — Verification gates GREEN (FACT)

All three verification prongs are GREEN in the package suite (20 passed at 1b-PINN):
PINN-vs-analytic (golden `analytical_l2`, Anchors 1/2/3), PINN-vs-FD
(classical-reference `fd_l2`), and convergence-with-collocation-density. The
classical FD reference's MMS convergence orders [2.0023,2.0005,2.0001] → O(h²).

## § 2 — Tier-3 diagnostics (J — FACT)

`tools/diagnostics/tier3/pinn_poisson/` (standalone, lenia/rigid-body precedent —
its package name shadows the installed sim package, so validated ad-hoc not
pytest-wired): `check_residual_bounds` (spec-ref §6 envelopes), `check_fd_
convergence_order` (≈2), `check_collocation_convergence`. Ad-hoc validation: all
`ok=True`. gate-5 Tier-1 health on the canonical inference capture: `ok=True`
(0 NaN/Inf) via `packages/pinn-poisson/tests/test_diagnostics.py`.

## § 3 — Perf-ledger (gate-12 — FACT)

`docs/perf-ledger.md` row: `pinn-poisson | python (PyTorch+Warp-CPU) | poisson-
sine-source-64sq-seed42-step1 | 127.9 | …`. **training_wall_clock 127.9s recorded
SEPARATELY** (S2-RD2C1 lesson — NOT silently omitted; iteration-heavy Adam→L-BFGS,
EXPECTED long, NOT a regression). The inference + torch→wp bridge step is ~0.0022s.

## § 4 — gate-13 worktree replay (Convention E — FACT)

`replay_failing_tests --commit 239e8a0 --evidence …pinn-poisson-2026-05-29T13-13-00Z.txt
--pytest-target packages/pinn-poisson` → **match True** (normalized sha256
`465e312d…` both sides; EXIT 0).

**Evidence-format correction (banked lesson):** the Stage-1a evidence was captured
with `pytest -v` from the repo root + a custom header + default tracebacks;
`replay_failing_tests` runs `uv run --directory packages/pinn-poisson --extra dev
pytest -v --tb=short` (stdout only, repo-root + worktree paths canonicalized to
`<REPO>`). The evidence was re-captured at Stage 1c from a worktree at the RED
commit `239e8a0` in that exact format → match True. Substance unchanged (9 failed /
9 passed; identical NotImplementedError RED witness). Prior audits cite the evidence
at their own head_shas (resolve unaffected).

## § 5 — Mutation convention (D-MUTATION — FACT)

Confirmed against the live `tools/testkit/mutation/mutmut-config.toml`: its targets
are `{capture, code_verification_mms, golden, determinism, equivalence, property,
cat4_draft_time}` — there is **NO `classical-references` (or poisson-2d-fd) target**.
So the live convention does **not** expect a mutation baseline for the new FD
reference → **D-MUTATION (defer to task-9, rule-of-three) is consistent with the
convention; no STOP**. The FD reference's correctness rests on the analytic
anchoring + the convergence-order ≈2 check (the rigor substitute).

## § 6 — Schema-corpus + LFS (FACT)

The schema-corpus seed `tests/fixtures/legacy-captures/phase-3-pinn-poisson.{h5,json}`
(h5 LFS, oid `c935fb58…`) was committed at Stage 1b-PINN and pushed to GitHub LFS +
mirrored to R2 (§Q same-shell bootstrap; both OIDs, exit 0). The checkpoint
`pinn-poisson-mms-seed42.safetensors` (LFS oid `9c6c179e…`) likewise.

## § 7 — Integrity + §S.5 (FACT)

`integrity --all --mode strict` → `0 HARD_FAIL / 14 SOFT_WARN`; digest `5c7172a2…`
(unchanged — the 1c additions add no findings). **§S.5:** the Stage-1b-PINN push
(`15db82f`) CI sweep — `test-pinn-poisson` is the iteration-heavy trainer (slow on
the 2-core ubuntu runner; long-by-design per the charter, NOT a regression); all
other workflows green. The Stage-1c push sweep is post-push (recorded at landing).
**Forward-routing note (surfaced, not a STOP):** the `test-pinn-poisson` CI job is
heavy (~tens of minutes — trains ~4 full PINNs); a CI-cost reduction (e.g. a
reduced-iteration smoke config or marker-gated full run) is a candidate maturation
item for task-9 / operator review.

## § 8 — Verdict

**CONFIRMED.** Verification prongs GREEN; Tier-3 + gate-5 health; gate-12 perf row
(training_wall_clock separate); gate-13 replay match=True; D-MUTATION
convention-confirmed; integrity 0 HF / 14 SW. **Stage 2 (landing) safe to
dispatch.** NO tag.
