---
date: 2026-05-29T00-38-00Z
author: phase-3 rigid-body-pedagogical stage-1a (Claude Code)
subject: Phase 3 task-4 rigid-body-pedagogical — STAGE 1a scaffold + RED (first Stack-E SIM of Phase 3)
verdict: CONFIRMED
head_sha: TO-BACKFILL
prior_stage_audit: sub-phase-phase-3-rigid-body-stage-0-2026-05-29T00-08-18Z.md
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 6096fa35cc2aa35c82be0ff99613e73f2f8ab027e4df446e02d8e9a190c7e1ac
gate_3_failing_tests_hash: sha256:88d9f9853e74395aee6e4b6e63fc402141c3308d83d172b8ad1804307ec98e34
evidence_paths:
  - docs/phases/sub-phase-phase-3-rigid-body.md
  - docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md
  - docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md
  - tools/testkit/probes/reports/rigid-body-pedagogical.md
  - tools/testkit/failing-tests-evidence/rigid-body-pedagogical-2026-05-29T00-29-56Z.txt
  - tools/testkit/determinism/registry.toml
  - .pre-commit-config.yaml
  - packages/articulated-pedagogical/pyproject.toml
evidence_hashes:
  docs/phases/sub-phase-phase-3-rigid-body.md: sha256:14c9a664e77f3a1937080c004d90768e70053427c602b3bb9082bf7dbc81418d
  docs/sim-specs/rigid-body/articulated-pedagogical/spec-ref.md: sha256:2e14a7284011e43ffc0ab6ca81b75ad8624cadc6116fed12a8f820c18b7c6178
  docs/sim-specs/rigid-body/articulated-pedagogical/algebraic.md: sha256:bb840d4a6453f244d0d1b8904dd792bb0a0b555cec034ce6d70d43a6c8344029
  tools/testkit/probes/reports/rigid-body-pedagogical.md: sha256:a680c7543049da40e143ceb62b6ef44865131c7af32229372190085c998aca98
  tools/testkit/failing-tests-evidence/rigid-body-pedagogical-2026-05-29T00-29-56Z.txt: sha256:88d9f9853e74395aee6e4b6e63fc402141c3308d83d172b8ad1804307ec98e34
  tools/testkit/determinism/registry.toml: sha256:888c6a2430ece209f30dbaf4348f52b0a10018a1b2e261d7b57707ca1f9f163d
  .pre-commit-config.yaml: sha256:deac2804f4205f8eaefd86afa08374e267772ea97a436cb4cbd1f4ffe9865f2e
  packages/articulated-pedagogical/pyproject.toml: sha256:490909384c3a8ac3881445860475774a84780f10efa06c163b5cdb0a89c9be74
---

# Phase 3 — sub-phase rigid-body-pedagogical (task-4) — Stage 1a audit

> Scaffold + RED for the **first Stack-E (Warp) SIM of Phase 3**. New 26th
> workspace member `packages/articulated-pedagogical/` (flat, D-LAYOUT);
> Featherstone-ABA spec-ref + algebraic skeletons; probe report (gate-2);
> determinism DEFAULT row; 11-test RED suite (gate-3). Verdict **CONFIRMED**.

## Commit chain (this stage)

| SHA | Commit |
|-----|--------|
| `e82d6dd` | feat — Stage 1a scaffold (Warp ABA shells + spec-ref + algebraic + probe + determinism DEFAULT row) |
| `5f018fe` | fix(ci) — exclude failing-tests-evidence ledger from trailing-whitespace hook |
| `4a8270c` | test — Stage 1a RED suite (11 failing) + verbatim failing-tests evidence + gate-3 footer |

## Gate-3 (failing acceptance suite)

11 tests across single-revolute / double-pendulum / 6-DOF / D-DET / PBT; all
FAIL with `NotImplementedError` from the Stage-1a shells. Evidence
`tools/testkit/failing-tests-evidence/rigid-body-pedagogical-2026-05-29T00-29-56Z.txt`;
raw sha256 `88d9f985…` recorded in the `4a8270c` footer. **Both gate-3 paths
verified:** (a) footer-hash witnessing (the established convention — lenia
stage-1b §gate-3) will be witnessed at the Stage-1b impl commit; (b)
`replay_failing_tests --commit 4a8270c --pytest-target packages/articulated-pedagogical`
→ `match True` (normalized sha byte-reproducible in a fresh worktree). [FACT]

## §R two-field integrity

- `integrity_invariant` = 0 HARD_FAIL / 14 SOFT_WARN (held — the new package +
  docs + registry row add no audit-log/soft-warn lines). [FACT]
- `integrity_digest_at_head` = `6096fa35…` (measured live; unchanged from Stage
  0 — the 3 golden tables that will perturb the digest land at Stage 1b per
  §R.1 informational drift). [FACT]

## Friction surfaced (first Stack-E Phase-3 sim — charter §1.1 mandate)

**F-RB-1 — trailing-whitespace hook corrupts `--tb=short` evidence (FIXED,
`5f018fe`).** The failing-tests-evidence README mandates a *verbatim* pytest
capture (its sha256 underwrites gate-3/13). pytest `--tb=short` emits trailing
whitespace on blank traceback context lines; the `trailing-whitespace`
pre-commit hook stripped it (excluded only `^references/`), diverging the
committed evidence from a fresh replay capture (`normalize_pytest_output` does
not strip trailing ws). Prior sims' failures happened to lack trailing-ws
context lines. Fix: exclude `tools/testkit/failing-tests-evidence/` from the
hook. **Every later sim whose RED failures carry `--tb=short` context lines
inherits this fix.**

**F-RB-2 — gate-13 replay is environment-sensitive with hypothesis PBT
(documented).** `replay_failing_tests` hardcodes `-v --tb=short` and reproduces
in a fresh worktree venv. Two confounders: (a) the plugins header line differs
between the workspace-wide `.venv` (`cov, timeout, hypothesis, anyio`) and a
fresh package venv (`cov, hypothesis`); (b) hypothesis annotates falsifying
examples (`# or any other generated value`) depending on `.hypothesis` DB state.
Resolution: the committed evidence is captured in a worktree-equivalent
environment (root path canonicalized to `<REPO>`) so `replay_failing_tests`
→ `match True`. The OPERATIVE gate-3/13 remains footer-hash witnessing (lenia
precedent — its non-verbose evidence cannot match the script's `-v`; both
hypothesis-bearing). [FACT]

## PBT invariant re-declaration (SHIFT-on-evidence, HARD RULE 2)

The dispatch's D-PBT names `momentum_conservation (linear + angular)`. For a
base-**pinned** articulated chain this is physically inapplicable: the pin
exerts a reaction force, so linear momentum (and angular-momentum-under-gravity)
is NOT conserved. The physically-correct realization is
`angular_momentum_about_pivot_conserved` under zero gravity (the pin reaction
has zero moment about the pin). This is a **re-declaration on physical evidence,
NOT a tolerance widening** — mirrors the lenia Stage-1b
`mass_approximately_conserved → monotone_bounds` precedent. `energy_drift_bounded`
is unchanged. Both invariants are encoded in the RED PBT suite; recorded for the
Stage-2 `closed-with-shifted-N` enumeration.

## Verdict

**CONFIRMED.** Scaffold + RED landed; integrity invariant held; gate-3 evidence
reproducible; D-PBT physically refined. **Stage 1b (Warp ABA implementation +
13-gate + D-DET MEASURE) unblocked.**
