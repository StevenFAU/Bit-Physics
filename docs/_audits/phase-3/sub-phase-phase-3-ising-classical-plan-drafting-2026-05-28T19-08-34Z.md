---
date: 2026-05-28
author: phase-3 ising-classical plan-drafting (Claude Code)
subject: plan-drafting landing audit — sub-phase-phase-3-ising-classical (task-3a)
verdict: CONFIRMED
head_sha: fa06646
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
evidence_hashes:
  docs/phases/sub-phase-phase-3-ising-classical.md: at-head
  docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md: at-head
  docs/_audits/phase-3/progress.md: at-head
  docs/phases/phase-3-plan.md: at-head
  docs/architecture.md: at-head
  docs/phases/sub-phase-phase-3-lenia.md: at-head
evidence_paths:
  - docs/phases/sub-phase-phase-3-ising-classical.md
  - docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md
  - docs/_audits/phase-3/progress.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - docs/phases/sub-phase-phase-3-lenia.md
d_class_surfaced:
  - D-WEBGPU-DET (lean: bit-exact same-stack-same-hw via PCG per-cell + checkerboard; MEASURE at Stage 1b via runTwiceAndDiff; D-DET-RUNTIME caveat for CI-runner no-GPU per spec §7.8)
  - D-WIDE-TOL (lean: declare critical_temp_rel=1e-3 + magnetization_rel=5e-2 under [overrides.ising-classical] category="lattice-spin"; L-LTSF-3 in-scope; no [budgets.lattice-spin.*] amendment unless validator demands)
  - D-PBT (RESOLVED-IN-CHARTER YES — magnetization_bounded + energy_per_spin_bounded per §6.3a A verbatim; mass-conservation NOT applicable)
  - D-ANCHOR (lean: 3 primary DOIs Crossref-verified + 3 textbook citations + 1 hand-derivation; STOP-D-ANCHOR LOW-RISK; decision-by Stage 1b grep-cite)
  - D-DET-REGISTRY (lean: first [lattice-spin.ising-classical] row at Stage 1b; Stack B, bit-exact, same-stack-same-hw, atomic_ops=none, subgroup_ops=none, seed_pinned=true)
  - D-HARNESS-LAYOUT (lean A preferred — mirror RD-2D Stack-B pattern, no *.test.ts under packages/, pytest-against-captured-fixtures; lean B backup — extend vitest config; STOP-HARNESS if neither reconcilable with §6.3a C without unilateral plan edit)
  - D-CI (lean: extend ts-strict.yml with test-ising-classical job; §0.3 SHIFT-from-discovered — build-ts.yml absent at HEAD per probe §2.6)
  - D-LAYOUT (lean: packages/ising-classical/ per existing-convention precedence; §0.3 SHIFT-from-discovered vs §6.3a literal lattice-spin/ising-classical/typescript/; mirrors lenia D-LAYOUT)
  - D-TOL-SCHEMA (lean: additive keys under [overrides.ising-classical] per §S; STOP-S if validator rejects; new top-level branch needs explicit operator routing at Stage 1b BEFORE validator-fix commit)
  - D-MUT-SCOPE (RESOLVED-IN-CHARTER NO — sim, not testkit-adjacent; §6.0 item 12 + §6.3a VERIFICATION POSTURE + lenia precedent)
  - D-TAG (lean YES v0.2.5-sub-phase-phase-3-ising-classical per §D.2 (b) durable sim architecture; operator-pushed, I7; operator-pending caveat for phase-close-only policy)
exemplar: packages/reaction-diffusion-2d/ (Stack B; Phase 0 Gray-Scott WGSL + h5wasm capture)
---

# Plan-drafting landing audit — sub-phase-phase-3-ising-classical (task-3a)

> Append-only per § R-1. Charter at `docs/phases/sub-phase-phase-3-
> ising-classical.md`; probe at `docs/_audits/phase-3/sub-phase-phase-
> 3-ising-classical-probe-2026-05-28T19-08-34Z.md`. This audit closes
> the plan-drafting verdict.

## § 1 — Verdict

**CONFIRMED.** Probe + charter sound; Stage 0 may dispatch. Probe-time
anchor measurements:

- Integrity invariant at HEAD `e12685d`: **0 HARD_FAIL / 14 SOFT_WARN**
  (live-measured per §R; SHA256 of full report =
  `688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff`).
- §S.5 main-green at HEAD: **9/9 push-triggered required workflows =
  success** (`gh run list --commit e12685d --limit 30`).
- DOI resolution: **3/3 Crossref-verified** (Onsager
  `10.1103/PhysRev.65.117`, Yang `10.1103/PhysRev.85.808`, Kramers-
  Wannier `10.1103/PhysRev.60.252`).
- §Q LFS bootstrap: functional at session start (`source tools/lfs/
  setup-lfs-s3-local.sh` reports `lfs-s3 ready: …` + agent binary
  present at `/home/otacon/.local/bin/lfs-s3`).
- verify_evidence sweep: **27/28 audits 0-fail**; 1/28 pre-existing
  1-fail in `lenia-mypy-strict-fix-2026-05-28T18-39-42Z.md` (the
  workflow `python-strict.yml` `evidence_hashes` line was not re-
  measured after commit `228cccd` dropped `-W error`). **NOT a
  regression caused by this session**; STOP-H is regression-only;
  surfaced in probe §6.3 + charter §6 R-6 + banked for the candidate
  audit-citation-hygiene cluster sub-phase.

## § 2 — Evidence

| Surface | Evidence path |
|---|---|
| Charter | `docs/phases/sub-phase-phase-3-ising-classical.md` |
| Probe report | `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-2026-05-28T19-08-34Z.md` |
| Inherited authority — §6.3a task-3a prompt | `docs/phases/phase-3-plan.md:1388-1543` |
| Inherited authority — v8 amendment | `docs/phases/phase-3-plan.md:59` |
| Inherited authority — § 5.10 Lattice spin systems | `docs/architecture.md:1195` |
| Inherited authority — § 11.4 sub-item 3.7 | `docs/architecture.md:2012` |
| RD-2D Stack-B exemplar | `packages/reaction-diffusion-2d/src/index.ts` + `packages/reaction-diffusion-2d/src/gray_scott.wgsl` |
| common-ts API surfaces | `common/common-ts/src/index.ts:1-22` + `common/common-ts/src/capture.ts:18-43` + `common/common-ts/src/determinism/index.ts:1-10` |
| common-ts vitest config | `common/common-ts/vitest.config.ts:1-14` (`include: src/**/*.test.ts + examples/**/*.test.ts` at `:11`) |
| Stack-B CI workflow at HEAD | `.github/workflows/ts-strict.yml` (NO `build-ts.yml` at HEAD) |
| Tolerance schema at HEAD | `tools/testkit/equivalence/tolerance.toml` (no `lattice-spin` defaults; no `ising-classical` override) |
| Tolerance budget at HEAD | `tools/testkit/equivalence/tolerance-budget.toml` (no `lattice-spin` budget) |
| Determinism registry at HEAD | `tools/testkit/determinism/registry.toml` (only `[neural-rendered.common-3dgs]` + `[continuous-ca.lenia]`) |
| Lenia precedent — charter | `docs/phases/sub-phase-phase-3-lenia.md` |
| Lenia precedent — landing audit | `docs/_audits/phase-3/sub-phase-phase-3-lenia-landing-2026-05-28T16-00-43Z.md` |
| §Q convention | `docs/conventions/sub-phase-conventions.md` §Q (per [[phase-3-r2-credentials-durability-fix-landed]]) |
| §R convention | `docs/conventions/sub-phase-conventions.md` §R measure-don't-copy |
| §S convention | `docs/conventions/sub-phase-conventions.md` §S tolerance-schema-probe-first |
| §S.5 convention (NEW WORDING) | `docs/conventions/sub-phase-conventions.md` §S.5 all-workflow SHA-scoped poll |
| DOI verification — Onsager | https://api.crossref.org/works/10.1103/PhysRev.65.117 → "Crystal Statistics. I." Lars Onsager, Phys. Rev. 65 117–149 (1944) |
| DOI verification — Yang | https://api.crossref.org/works/10.1103/PhysRev.85.808 → "The Spontaneous Magnetization of a Two-Dimensional Ising Model" C. N. Yang, Phys. Rev. 85 808–816 (1952) |
| DOI verification — Kramers-Wannier | https://api.crossref.org/works/10.1103/PhysRev.60.252 → "Statistics of the Two-Dimensional Ferromagnet. Part I" Kramers + Wannier, Phys. Rev. 60 252–262 (1941) |

## § 3 — D-class table (verdict + lean + decision-by)

| D-class | Lean | Decision-by |
|---|---|---|
| D-WEBGPU-DET | bit-exact same-stack-same-hw via PCG per-cell + checkerboard sublattice; no atomics; no subgroup ops. D-DET-RUNTIME caveat for CI-runner no-GPU. | Stage 1b MEASURE via `runTwiceAndDiff` |
| D-WIDE-TOL | critical_temp_rel=1e-3 + magnetization_rel=5e-2 under `[overrides.ising-classical]` category=`lattice-spin`; physics-justified; L-LTSF-3 in-scope. | Stage 1b |
| D-PBT | YES — magnetization_bounded + energy_per_spin_bounded per §6.3a A verbatim. | RESOLVED-IN-CHARTER |
| D-ANCHOR | 3 DOI-primary + 3 textbook + 1 hand-derivation; STOP-D-ANCHOR LOW-RISK. | Stage 1b grep-cite |
| D-DET-REGISTRY | First `[lattice-spin.ising-classical]` row at Stage 1b. | Stage 1b |
| D-HARNESS-LAYOUT | Lean A: RD-2D mirror (no `*.test.ts` under packages/, pytest-against-captured-fixtures). Lean B: extend vitest config to discover `packages/**/*.test.ts`. STOP-HARNESS if neither reconcilable with §6.3a C without unilateral plan edit. | Stage 1a probe + operator charter review |
| D-CI | Extend `ts-strict.yml` with `test-ising-classical` job; §0.3 SHIFT-from-discovered (build-ts.yml absent). | Stage 1b |
| D-LAYOUT | `packages/ising-classical/` per existing-convention precedence; §0.3 SHIFT-from-discovered vs §6.3a literal. | Stage 1a / 1b |
| D-TOL-SCHEMA | Additive keys under `[overrides.ising-classical]` per §S; STOP-S if validator rejects; new branch needs operator routing at Stage 1b BEFORE validator-fix commit. | Stage 1b |
| D-MUT-SCOPE | NO — sim not testkit-adjacent; §6.0 item 12 + §6.3a VERIFICATION POSTURE + lenia precedent. | RESOLVED-IN-CHARTER |
| D-TAG | YES `v0.2.5-sub-phase-phase-3-ising-classical` per §D.2 (b); operator-pushed (I7); operator-pending caveat for phase-close-only. | Stage 2 (operator) |

## § 4 — STOP conditions surfaced (none fired at plan-drafting)

| STOP | Fired? | Note |
|---|---|---|
| STOP-D (integrity invariant) | NO | 0 HARD_FAIL / 14 SOFT_WARN; digest `688bc195…d22cb52` matches prior bank |
| STOP-H (verify_evidence regression) | NO | 1-fail pre-existing on lenia-mypy-strict-fix, NOT regression-caused |
| STOP-MAIN-RED (§S.5 NEW WORDING) | NO | 9/9 required workflows success at HEAD `e12685d` |
| STOP-DOI | NO | 3/3 Crossref-verified |
| STOP-REPLAY (cross-phase) | n/a | Stage 0 duty; not exercised at plan-drafting |
| STOP-D-ANCHOR | NO | LOW-RISK at probe time; Stage 1b grep-cites |
| STOP-DET | n/a | Stage 1b MEASURE |
| STOP-LFS | n/a | Stage 1b push |
| STOP-PBT | n/a | Stage 1c |
| STOP-CAT-X | n/a | Stage 1b tolerance + budget land |
| STOP-HARNESS | NO | Surfaced; operator routes at charter review |
| STOP-S | NO | Surfaced; operator routes if validator rejects at Stage 1b |
| STOP-I7 | n/a | Stage 2 allowlist extension |
| STOP-PROSE-MATH | NO | Probe §6.7 surfaces D-CI + D-LAYOUT drift; carry-watch at Stage 1a/1b |
| STOP-S5-CI-RED | NO at plan-drafting; FIRES if any required workflow red at any stage close |
| STOP-PRECEDENT | NO | RD-2D Stack-B exemplar accommodates Ising (same scalar-field-on-lattice + h5wasm capture); D-HARNESS-LAYOUT routes the test-suite location |

## § 5 — Commit shape (this dispatch)

Per dispatch ~2-3 commits:

1. `docs(phase-3): ising-classical probe report` — adds the probe at
   `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-probe-
   2026-05-28T19-08-34Z.md`.
2. `docs(phase-3): ising-classical charter + plan-drafting audit +
   progress entry` — adds the charter at
   `docs/phases/sub-phase-phase-3-ising-classical.md`, this audit at
   `docs/_audits/phase-3/sub-phase-phase-3-ising-classical-plan-
   drafting-2026-05-28T19-08-34Z.md`, and the progress.md plan-
   drafting entry.
3. `chore(phase-3): SHA back-fill ising-classical plan-drafting +
   probe audits (Convention #12)` — back-fills `head_sha` in the
   audit front-matter to the audit-landing chain-tip per
   Convention #12 separate-commit cadence.

Agent pushes the chain to `origin/main`; agent does **NOT** push the
proposed `v0.2.5-sub-phase-phase-3-ising-classical` tag (I7).

## § 6 — §S.5 post-push poll (to fire after push)

Within ~2 minutes of pushing the chain to `origin/main`, run
`gh run list --commit "$(git rev-parse HEAD)" --limit 30` and confirm
0 failing required workflows across **all** push-triggered workflows
(`audit-append-only`, `structure`, `ts-strict`, `integrity`,
`equivalence`, `tolerance-budget-check`, `python-strict`,
`determinism`, `cpp-strict`). STOP-S5-CI-RED otherwise; enumerate
failing-job names and surface to operator.

## § 7 — Banks

| Bank | Status |
|---|---|
| L-3DGS-1 | NOT IN SCOPE — Ising is not neural-rendered |
| SIBLING-FIXTURE-LFS | CARRIED FORWARD |
| integrity-meta-test-ci-wiring | CARRIED FORWARD |
| R-11 (lenia first-SIM frictions) | TRANSLATED-TO-STACK-B per probe §6.6 |
| L-LTSF-3 (tolerance-budget cap-amendment shape) | IN-SCOPE via D-WIDE-TOL |
| L-LMSF-1 (Taichi + mypy-strict override) | NOT IN SCOPE — Stack B |
| L-LMSF-3 (locale.getdefaultlocale CLI -W) | NOT IN SCOPE — vitest not pytest |
| L-LMSF-4 (Phase-1 stack-d unscoped) | NOT IN SCOPE |
| L-R2CD-1 (audit-citation-hygiene cluster) | CARRIED FORWARD via probe §6.3 finding on lenia-mypy-strict-fix evidence_hashes |
| L-R2CD-FOLLOWUP (R2 first-try push after §Q) | OPEN — Stage 1b verifies |
| First-Stack-B-SIM-in-Phase-3 precedent | OPENED-HERE |

## § 8 — Provenance

- **Author:** Phase-3 ising-classical plan-drafting (Claude Code,
  Opus 4.7).
- **Drafted:** 2026-05-28T19-08-34Z.
- **HEAD SHA at audit:** `e12685dbbfdc5ae20d5e9137a3fd269670a59139`
  (back-filled to chain-tip per Convention #12 in a separate commit).
- **Prior sub-phase tag (pushed):** `v0.2.4-sub-phase-phase-3-lenia`.
- **Prior phase tag (pushed):** `v0.2.0-phase-2`.
- **Probe report:** `docs/_audits/phase-3/sub-phase-phase-3-ising-
  classical-probe-2026-05-28T19-08-34Z.md`.
- **Charter:** `docs/phases/sub-phase-phase-3-ising-classical.md`.
