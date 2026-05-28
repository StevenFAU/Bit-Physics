---
date: 2026-05-28T22-15-00Z
author: phase-3 ising-classical stage-1b (Claude Code)
subject: Phase 3 ising-classical — STAGE 1b impl + golden + tier-3 + determinism MEASURE + PBT + .h5 seed + perf + tolerance + CI job + 13-gate
verdict: CONFIRMED
head_sha: d60fe3c8f15954e73670595dc38467c0c6a31ba4
prior_sub_phase_tag: v0.2.4-sub-phase-phase-3-lenia
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 688bc195d8b785753ae9500b4e1d48800ae961dd38ac4410f16fb7446de127ff
invariants_at_head: [I1, I2, I3, I4, I5, I6, I7]
d_class_status: D-WEBGPU-DET MEASURED-bit-exact / D-WIDE-TOL off-budget-confirmed / D-ANCHOR grounded-6-anchors / D-DET-REGISTRY first-lattice-spin-row / D-TOL-SCHEMA RESOLVED-ON-EVIDENCE (golden_tolerance branch; STOP-S not fired) / D-HARNESS-LAYOUT pytest-against-captures / D-CI python-strict.yml/test-ising-classical / D-LAYOUT packages/ising-classical/ / D-PBT two-invariants / D-MUT-SCOPE NO / D-TAG NO
implements_failing_tests_from: a4d96074c4c1eb59d183e41b7e1ec73ada8f6ac5
failing_tests_output_hash_witnessed: sha256:572c9e4e0b186c69e1dfb4dad29d10d0d0901cbfb7aec4f8c36e3e3818013683
evidence_paths:
  - docs/sim-specs/lattice-spin/ising-classical/spec-ref.md
  - tools/testkit/golden/tables/ising-classical-critical-temperature.json
  - tools/testkit/golden/tables/ising-classical-magnetization.json
  - tools/testkit/golden/derivations/ising-onsager.md
  - packages/ising-classical/ising_classical/reference/ising_numpy.py
  - packages/ising-classical/ising_classical/sim.py
  - packages/ising-classical/src/metropolis.wgsl
  - tools/diagnostics/tier3/ising_classical/energy_bound.py
  - tools/diagnostics/tier3/ising_classical/magnetization.py
  - tools/testkit/property/sims/ising_classical/invariants.py
  - tools/testkit/determinism/registry.toml
  - tools/testkit/equivalence/tolerance.toml
  - docs/perf-ledger.md
  - captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json
  - .github/workflows/python-strict.yml
  - tools/testkit/failing-tests-evidence/ising-classical-2026-05-28T21-40-00Z.txt
evidence_hashes:
  docs/sim-specs/lattice-spin/ising-classical/spec-ref.md: sha256:4213a134c70eb8354a403129cb19d4697f1331745540ffd964e4f10b98d5f6a6
  tools/testkit/golden/tables/ising-classical-critical-temperature.json: sha256:005d8ecfc498a78252fe5771f40987ea9b898cdfa10291994a1edc16042fc313
  tools/testkit/golden/tables/ising-classical-magnetization.json: sha256:9e1d33a836c1935b708aaa42a930eef92de16b67dfa686b3d9fcdc99fb6d1077
  tools/testkit/golden/derivations/ising-onsager.md: sha256:aa73ec4a3f668861cca53131d4a41efa4231743dba7823bd751f1e9e8d807852
  packages/ising-classical/ising_classical/reference/ising_numpy.py: sha256:f7728b27c1c8bad9de46f6a7e0f0cf53dbdc5ca149cd88ebb2dec3cfcb5c7686
  packages/ising-classical/ising_classical/sim.py: sha256:dc125fcc05620d566d12788932c9de630fa0d4ef9abab16488ceb953b6d0d62b
  packages/ising-classical/src/metropolis.wgsl: sha256:fc99e90af3571a67c4fb77434672c1dc61d76e54db79c313476c2d717d5aca74
  tools/diagnostics/tier3/ising_classical/energy_bound.py: sha256:f6246b2d12ddd298fec4248a9c3f2dd68fbd3dee8bc5c2a28920db71bab0d33e
  tools/diagnostics/tier3/ising_classical/magnetization.py: sha256:39c9f65a966a909419c49f3f99eee0de02bdda32cb859d07e082c87b6defbfd2
  tools/testkit/property/sims/ising_classical/invariants.py: sha256:2b920d4df63bb35c6abce30502df45df186803518cbec661937e8b6da65ddac0
  tools/testkit/determinism/registry.toml: sha256:ad3113e6261f0a314e4cfa21375783f5292c0d1d063193d7bc08b0d6584df346
  tools/testkit/equivalence/tolerance.toml: sha256:fb69b46f9c49d403ddcb7d1f0058d2aa01d46b42e8cab20a8d3153a2e2fd7233
  docs/perf-ledger.md: sha256:942670b619dfb90aebdcaf35ebc2a3171fae8959a4ebf69d78b2beb1a13c5fdd
  captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.json: sha256:863963efe4e2f001fe5bf4c582b9b7b0a6e5e15852276cf98ab372f9637f1e58
  .github/workflows/python-strict.yml: sha256:99a6c99ce6cb70089f5cb651bead68279390db924fdbe217947eef209ad24fd5
  tools/testkit/failing-tests-evidence/ising-classical-2026-05-28T21-40-00Z.txt: sha256:572c9e4e0b186c69e1dfb4dad29d10d0d0901cbfb7aec4f8c36e3e3818013683
---

# Phase 3 — sub-phase Ising-classical — Stage 1b audit

> Implementation + golden + Tier-3 + determinism MEASURE + PBT + .h5
> seed + perf + tolerance + `test-ising-classical` CI job + 13-gate.
> RED → GREEN witnessed (18/18 pytest); §S.5 10/10 workflows green at
> the chain tip incl. the new `test-ising-classical` job. Verdict
> **CONFIRMED**.

## § 1 — RED → GREEN (FACT)

`uv run --no-sync python -m pytest packages/ising-classical/tests/`:
**18 passed in 21.97s** (Stage-1a RED was 15 failed / 2 passed). Impl
chain: `93614b5` (reference + sim + canonical capture) → `c594a64`
(golden + tier-3 + PBT + registry + tolerance + WGSL + legacy-capture)
→ `d60fe3c` (perf + glossary + CHANGELOG + justfile + CI job). Impl
commit footer witnesses the Stage-1a failing-tests hash
`sha256:572c9e4e…3683`.

## § 2 — Golden anchors (D-ANCHOR; 6 anchors, all closed-form) (FACT)

`ising-classical-critical-temperature.json` (rel tol 1e-3):

| Anchor | Source | expected T_c | closed-form match |
|---|---|---|---|
| Onsager-exact | Phys. Rev. 65, 117 (DOI 10.1103/PhysRev.65.117) | 2.269185314213022 | exact (`critical_temperature()` = 2.269185314213022) |
| Kramers-Wannier duality | Phys. Rev. 60, 252 (DOI 10.1103/PhysRev.60.252) + hand-derivation | 2.269185314213022 | exact |
| Landau & Binder 2014 | textbook (cite-by-edition) | 2.26919 | within 1e-3 (|Δ| = 4.7e-6) |

`ising-classical-magnetization.json` (rel tol 5e-2): Yang 1952
(DOI 10.1103/PhysRev.85.808, T=2.0), Baxter 1982 §7.10 (T=1.0),
Newman & Barkema 1999 Fig. 3.1 (T=1.5) — 3 `independent_reference`
anchors; all 6 test points reproduced exactly by `onsager_magnetization`.
**STOP-D-ANCHOR NOT fired** (all closed-form / textbook). DOIs FACT
(Crossref-verified at probe; the three primary DOIs are reproduced in
the golden tables + `tools/testkit/golden/derivations/ising-onsager.md`).
Cat-3 logs "no Python evaluator registered → skipping numeric
verification" (AUDIT_LOG, same as lenia; the ≥3-`independent_reference`
contract HOLDS — no HARD_FAIL).

## § 3 — Determinism MEASURE (D-WEBGPU-DET) (FACT)

**Layer 1 (CI-visible oracle):** `run_twice_and_diff(sim_runner_seeded,
seed=42)` on the NumPy reference (128², T=2.27, 10000 sweeps) →
`content_equivalent=True`, `detail="captures match exactly"`
(`np.array_equal` spin captures, max_abs_diff = 0.0). **Bit-exact
same-stack-same-hw HOLDS — STOP-DET NOT fired.** Registry row
`[lattice-spin.ising-classical]` (first `lattice-spin.*` row) locked:
stack=B, class=bit-exact, scope=same-stack-same-hw, atomic_ops=none,
subgroup_ops=none, seed_pinned=true.

**Layer 2 (local-only, spec §7.8):** the WGSL parallel-Metropolis
kernel (`src/metropolis.wgsl`; PCG per-cell, checkerboard, no atomics /
subgroup ops) is the byte-deterministic GPU path; **NOT measured this
session (no GPU in agent env / CI — D-DET-RUNTIME)**, exactly as RD-2D
landed Phase 0. The deterministic posture is structural (PCG hash of
(cell, seed, step, colour) + checkerboard order, no shared accumulator).

## § 4 — Thirteen-gate verdict (spec §3.5 v2.4 / §5.4) (FACT)

| # | Gate | State |
|---|---|---|
| 1 | spec-sheet | PASS — `docs/sim-specs/lattice-spin/ising-classical/spec-ref.md` (13 sections) |
| 2 | probe-report | PASS — `tools/testkit/probes/reports/ising-classical.md` |
| 3 | failing-tests | PASS — Stage-1a evidence + sha256 footer |
| 4 | implementation | PASS — reference + sim + WGSL kernel |
| 5 | tests-pass-anchors | PASS — 18/18 pytest; 6 golden anchors assert |
| 6 | Tier-1/2/3 | PASS — tier1 health + tier2 bounds in pytest; tier3 `ising_classical/` standalone module (2nd tier3 subtree; smoke-verified all-up E/N=-2, checkerboard +2) |
| 7 | capture-I/O | PASS — canonical capture round-trips (`load_capture` + `diff_captures`); legacy-capture corpus 25/25 incl. ising |
| 8 | perf-bench | PASS — perf-ledger row (5.558 s numpy-reference) |
| 9 | Cat 1-5 + Cat-X | PASS — integrity 0 HARD_FAIL / 14 SOFT_WARN; no `[budgets.lattice-spin.*]` cap → off-budget (STOP-CAT-X not fired) |
| 10 | audit-report | PASS — this audit |
| 11 | PBT | PASS — `magnetization_bounded` + `energy_per_spin_bounded` (20 examples each) |
| 12 | first-landing-wall-clock-in-perf-ledger | PASS — row present at HEAD |
| 13 | failing-tests-replay-verifiable | PASS — committed evidence sha256 `572c9e4e…3683` == footer |

**13/13 PASS.**

## § 5 — Tolerance schema (D-TOL-SCHEMA) RESOLVED-ON-EVIDENCE (FACT)

The `[overrides.<sim>]` schema is `additionalProperties: false` (admits
only `category`/`relative`/`absolute`) — it **REJECTS** the sim-specific
named keys `critical_temp_rel` + `magnetization_rel`. Ising is
single-stack (NumPy reference is the in-stack oracle, no cross-stack
equivalence pair), so the row lands under the existing `golden_tolerance`
branch (established by lenia-tolerance-schema-fix; admits bespoke
per-(category, sim) numeric keys) as
`[golden_tolerance.lattice-spin.ising-classical]`. `load_tolerance_table`
validates the full table. **STOP-S NOT fired** — no NEW branch needed
(the `golden_tolerance` branch already exists and semantically fits).
**D-WIDE-TOL off-budget confirmed:** no `[budgets.lattice-spin.*]` cap
at HEAD (L-LTSF-3; lenia precedent).

## § 6 — Legacy-capture .h5 push (D-LFS / STOP-LFS) (FACT)

`captures/ising-classical-ref/metropolis-128sq-T2.27-seed42-step10000.h5`
+ `tests/fixtures/legacy-captures/phase-3-ising-classical.h5` share OID
`cf844e5d…9cbc` (byte-identical; dedup → 1 LFS object). Push:

1. `git push origin main` (lfs-s3 agent active) → **EOF** (R2 push
   failed — initial).
2. `git -c lfs.standalonetransferagent= push origin main` → **success**
   (commits + LFS object → GitHub LFS; GitHub pre-receive satisfied).
3. R2 mirror sync: `git lfs push --object-id --stdin origin` →
   **EOF** when the §Q creds were NOT in the shell env; **success**
   (`Uploading LFS objects: 100% (1/1), done`) once
   `source tools/lfs/setup-lfs-s3-local.sh` was run **in the same shell
   invocation** as the push.

Object now in **BOTH GitHub LFS and R2**. **STOP-LFS NOT fired.**
**FIRST-STACK-B FRICTION #4 (load-bearing, banked):** the §Q R2
bootstrap must be re-sourced **in the same shell command** as each LFS
push — a fresh shell (e.g. each CI step / agent tool-call) does NOT
inherit the creds env from a prior `source`. This is the root cause of
the recurring "R2 EOF" surfaced at lenia/common-3dgs Stage-1c (it was
read as an env-regression; it is actually a per-shell sourcing
requirement). L-R2CD-FOLLOWUP resolved: not a durability regression.

## § 7 — Physics SHIFT note (§0.3) (FACT)

Spontaneous magnetization is the **ordered-phase** order parameter:
`onsager_magnetization` reproduces Yang exactly, and an **aligned-IC**
MC run reproduces it to rel-err < 5e-4 at T∈{1.0,1.5,2.0} (within
`magnetization_rel=5e-2`). A **random-IC** MC run at T<T_c forms
competing domains whose net |m| is far below m(T) (no global symmetry
breaking in finite time) — so the MC-vs-Yang cross-check uses the
aligned-IC ordered-phase protocol (`test_aligned_mc_magnetization_matches_yang_within_tolerance`;
documented in `tools/testkit/golden/derivations/ising-onsager.md` §4).
NOT a hard STOP; recorded per Convention #8 (no fabrication / no
widening — the anti-pattern would have been to relax to a random-IC
window).

## § 8 — §S.5 post-push poll (FACT)

`gh run list --commit d60fe3c --limit 15` → **10/10 required workflows
`completed success`**: structure, audit-append-only, equivalence,
ts-strict, integrity, tolerance-budget-check, mutation-testing,
python-strict, cpp-strict, determinism. The `python-strict` workflow's
job-level confirmation: `test-ising-classical` = **success** (alongside
test-common-3dgs / test-render-similarity / test-lenia). **STOP-S5-CI-RED
NOT fired.** First-Stack-B-SIM pipeline VALIDATED end-to-end in CI
(including the selective R2/GitHub-LFS capture pull — a surface lenia
did not exercise).

## § 9 — Verdict

**CONFIRMED.** RED→GREEN (18/18); 13/13 gates PASS; determinism
bit-exact MEASURED (Layer-1); 6 golden anchors grounded; D-TOL-SCHEMA +
D-WIDE-TOL + D-WEBGPU-DET + D-DET-REGISTRY resolved; .h5 in GitHub + R2;
integrity 0 HARD_FAIL / 14 SOFT_WARN; §S.5 10/10 green. No HARD RULE 2
STOP fired. **Stage 1c (verdict landing, NO mutation) is safe to
dispatch.**
