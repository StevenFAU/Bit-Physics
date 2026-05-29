---
date: 2026-05-29T01-19-26Z
author: phase-3 rigid-body-pedagogical landing (Claude Code)
subject: Phase 3 task-4 rigid-body-pedagogical (sub-phase-phase-3-rigid-body) — LANDING AUDIT (first Stack-E SIM of Phase 3)
verdict: CONFIRMED (closed-with-shifted-6)
head_sha: 2f58f666c9eda948925995fa543eaac952304881
prior_sub_phase_landed_at: 2da281a
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: f5b7eea154e7c369ec74c4ff83d33c3c2f73e297e04240a1a5681fa257070bb3
replay_prior_phase: phase-2 → v0.2.0-phase-2 ok=True 8/8
gate_3_failing_tests_hash: sha256:88d9f9853e74395aee6e4b6e63fc402141c3308d83d172b8ad1804307ec98e34
d_det_measured: bit-exact same-stack-same-hw (assert_deterministic_run 3 runs byte-equal)
d_tag: NO
evidence_paths:
  - docs/phases/sub-phase-phase-3-rigid-body.md
  - docs/spec-amendments-proposed.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-0-2026-05-29T00-08-18Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1a-2026-05-29T00-38-00Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1b-2026-05-29T01-07-52Z.md
  - docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1c-2026-05-29T01-16-04Z.md
  - tools/testkit/determinism/registry.toml
  - tools/testkit/equivalence/tolerance.toml
evidence_hashes:
  docs/phases/sub-phase-phase-3-rigid-body.md: sha256:14c9a664e77f3a1937080c004d90768e70053427c602b3bb9082bf7dbc81418d
  docs/spec-amendments-proposed.md: sha256:c0e7b05ff25347698b7fd7edf67d294da6bcd33132a8b7bed67494c727d3a20e
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-0-2026-05-29T00-08-18Z.md: sha256:5e89777b4e0df8bb371ea8b12dc2cb9621d5e105cf6628309818a395d3b9e826
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1a-2026-05-29T00-38-00Z.md: sha256:db623ac746c7278536069d3879c3445a72a5da5d8f874eaf70b6d5b239c63198
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1b-2026-05-29T01-07-52Z.md: sha256:fa16641c177ec9b5757b1028fd4a817d6851488b9595b1eeeb4868e9a4b5b585
  docs/_audits/phase-3/sub-phase-phase-3-rigid-body-stage-1c-2026-05-29T01-16-04Z.md: sha256:fe0ab408fe7fcfa60e7c70491bf3d0cb30da1f6b4421615a2699a65cc67bb80c
  tools/testkit/determinism/registry.toml: sha256:888c6a2430ece209f30dbaf4348f52b0a10018a1b2e261d7b57707ca1f9f163d
  tools/testkit/equivalence/tolerance.toml: sha256:8b390355f47202fa53a0600ce39f06d0aab93f13c88525b1f55554e8846f1757
---

# Phase 3 — task-4 rigid-body-pedagogical — LANDING AUDIT

> **First Stack-E (NVIDIA Warp) SIM of Phase 3.** Reference articulated
> rigid-body pendulum: Featherstone Articulated-Body Algorithm (ABA, reduced/
> generalized-coordinate forward dynamics) for a planar revolute serial chain;
> semi-implicit (symplectic) Euler default + RK4 option. Combined session
> Stage 0 → 1a → 1b → 1c → 2, trunk-based to `main`. Verdict **CONFIRMED,
> closed-with-shifted-6**. **NO tag** (D-TAG NO — one operator tag at Phase-3 close).

## Stage cadence + commit chain

| Stage | Audit | Key commits |
|-------|-------|-------------|
| 0 | `…stage-0…` (head `7785511`) | `e5b0e7d` charter v2 + §5.8 corrigendum; `7785511` audit |
| 1a | `…stage-1a…` (head `170418b`) | `e82d6dd` scaffold; `5f018fe` ci-hook fix; `4a8270c` RED |
| 1b | `…stage-1b…` (head `d1faf00`) | `d8a7912` ABA RED→GREEN; `34bbd60` sim+goldens; `66d3f98` tier3+PBT; `099b573` tolerance+J |
| 1c | `…stage-1c…` (head `941b1b8`) | `78412af` capture+fixture+perf-ledger |
| 2 | this | landing audit + progress + back-fill |

All stages CONFIRMED; each pushed to `origin/main`. ~21 commits.

## Landing verification (§R / replay / append-only / verify_evidence / §S.5)

- **§R integrity** — `integrity_invariant` **0 HARD_FAIL / 14 SOFT_WARN** (held
  across the whole sub-phase); `integrity_digest_at_head` `f5b7eea1…` (measured
  live; drifted from the Stage-0 `6096fa35…` solely from the 3 new golden tables'
  cat3 AUDIT_LOG lines — §R.1 informational; the count invariant never moved). [FACT]
- **Cross-phase replay** — `replay_prior_phase --prior-phase phase-2` →
  `prior_phase=v0.2.0-phase-2 ok=True` 8/8 gates. No LFS-cache recovery needed. [FACT]
- **Append-only** — CI `audit-append-only` GREEN at every push (no prior audit
  mutated). [FACT]
- **verify_evidence** — this sub-phase's four stage audits verify **0-fail**
  (Stage 0 14/0, 1a 16/0, 1b 16/0, 1c 12/0 — incl. the LFS `.h5` OID resolution). [FACT]
- **gate-13 replay** — `replay_failing_tests --commit 4a8270c` → `match True`
  (normalized sha byte-reproducible); gate-3 hash `88d9f985…` re-witnessed. [FACT]
- **§S.5 full-workflow CI** — at HEAD `83867f1` (and the code-bearing `78412af`)
  **all 9 workflows success** (`structure`, `ts-strict`, `integrity`,
  `equivalence`, `audit-append-only`, `tolerance-budget-check`, `cpp-strict`,
  `python-strict` incl. `test-rigid-body-pedagogical` + R2/LFS capture pull,
  `determinism`). STOP-CI-RED not fired. [FACT]

## 13-gate (final)

Gates 1–13 GREEN (see Stage-1b/1c audits); **mutation N/A** (sim, not testkit
surface); **gate-14 cross-stack N/A** (single-stack Stack-E terminal sim).
18/18 acceptance tests pass; ruff + `mypy --strict` clean.

## Physics validation (independent oracles)

- n=1 ABA `q̈ = −(g/L)sin q` exact (1e-10); analytic A1/A2/A3 (scipy
  `ellipk`/`ellipj`) within tolerance.
- n=2 ABA Cartesian trajectory == independent closed-form double-pendulum EOM.
- n=6 energy conserved (secular drift `3.3e-5/s` ≪ `1e-3`).
- D-DET bit-exact MEASURED (3 runs byte-equal; registry `[rigid-body.articulated-pedagogical]`
  class=bit-exact HELD — not re-characterized).

## closed-with-shifted-6 — enumerated SHIFTs (§2.15)

1. **D-PBT physical re-declaration (HARD RULE 2, resolve-on-evidence).** The
   ratified `momentum_conservation (linear + angular)` is physically inapplicable
   to a base-**pinned** chain (the pin exerts a reaction force). Re-declared (NOT
   widened) to `angular_momentum_about_pivot_conserved` (gravity=0; the pin has
   zero moment about itself) + `energy_drift_bounded`. Mirrors the lenia
   `mass_approximately_conserved → monotone_bounds` precedent.
2. **§5.8 spec corrigendum A-1 (DEFERRED to operator).** Spec §5.8
   "maximal-coordinate articulated-body … Featherstone 2008" is internally
   inconsistent (the cited reference's ABA is reduced-coordinate). Proposed in
   `docs/spec-amendments-proposed.md` A-1; spec FROZEN in Phase 3 (§9.6) →
   operator applies at a phase boundary. `docs/architecture.md` NOT edited.
3. **Plan §6.4:1605 Goldstein §4.3 wrong-cite (no plan edit, §0.3).** Goldstein
   3rd ed. §4.3 = "Formal Properties of the Transformation Matrix", unrelated to
   the pendulum. Corrected 3-anchor set (Marion&Thornton §3.2; DLMF §19.2+§22.19(i)
   / L&L §11; DLMF §22.19(i) Jacobi cn) lives in spec-ref §6 + golden derivation G.
   `docs/phases/phase-3-plan.md` NOT edited.
4. **D-USD DEFER (deferred §2.5 item).** Spec §2.5 "every Stack E sim ships USD
   export" is NOT satisfied (no common-warp USD surface at Phase-3 HEAD; no
   Stack-E precedent). Deferred to **Phase-4 WU-D** (`common_warp.usd`); §2.5 gap
   documented in spec-ref §-export. Phase-3-Stack-E-WIDE policy.
5. **F-RB-1 (CI-config fix, `5f018fe`).** `failing-tests-evidence/` excluded from
   the trailing-whitespace pre-commit hook — its verbatim pytest captures
   underwrite gate-3/13; `--tb=short` emits trailing whitespace on blank context
   lines that stripping would diverge from a fresh replay. Inherited by every
   later sim with `--tb=short`-bearing RED failures.
6. **F-RB-3 (scoped mypy waiver).** NVIDIA Warp's partial type info breaks
   `mypy --strict` on `@wp.kernel` signatures + `wp.*` calls; `# mypy:
   ignore-errors` scoped to the two Warp-touching files (`_warp_kernels.py`,
   `aba.py`). The Phase-2 Stack-E ports never hit this (no per-sim mypy CI job);
   this is the FIRST per-sim Stack-E `mypy --strict` CI job in Phase 3.

## First-Stack-E-SIM friction inherited by later Stack-E Phase-3 sims (charter §1.1)

The §1.1 predicted-friction table is discharged: common-warp socket-only
consumption confirmed (Runtime + Capture + Determinism; own f64 `wp.array`);
batch `Capture`+`write_capture` API used (D-CAPTURE-API); Warp CPU serial-launch
+ f64 determinism mechanism confirmed bit-exact; new `.h5` LFS fixture +
`python-strict` per-sim job + R2 selective pull all wired. F-RB-1 / F-RB-3 are
the NEW friction items every later Stack-E Phase-3 sim (task-7 PINN-Poisson,
task-8 3DGS-MPM, task-9 common-warp) inherits.

## Forward-routing

- **spec-amendments-proposed.md A-1** — operator applies §5.8 maximal→ABA at a
  Phase boundary (spec frozen in Phase 3).
- **USD export for Stack-E sims** — Phase-4 WU-D (common-warp `common_warp.usd`).
- **common-warp extraction candidates** (rule-of-three) — the sim's spatial-ABA
  / integrator / CLI surfaces are the FIRST consumer; task-9 inventories.

## Verdict

**CONFIRMED — closed-with-shifted-6.** First Stack-E SIM of Phase 3 landed:
Featherstone ABA forward dynamics, bit-exact determinism, 18/18 tests, all gates,
§S.5 all-green, §Q.5 R2 mirror. **NO tag** (D-TAG NO). Phase-3 task-4 complete.
