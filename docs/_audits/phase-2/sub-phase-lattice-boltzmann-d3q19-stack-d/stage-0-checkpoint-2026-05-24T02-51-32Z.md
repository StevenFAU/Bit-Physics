---
date: 2026-05-24T02-51-32Z
author: lattice-boltzmann-d3q19-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-lattice-boltzmann-d3q19-stack-d-stage-0
subject: "Stage 0 pre-flight CLOSE for the lattice-boltzmann-d3q19 -> Stack-D port (THIRD spec-Phase-2 cross-stack port). VERDICT CONFIRMED; all six charter-§4.1 tasks PASS. Task 0.0 cross-phase replay vs v0.1.0-phase-1 GREEN (8/8 gates, ok=True); replay-output sha256 9399fc33…909f34 byte-identical to the bit-identity invariant (22nd invocation). Task 0.1 tolerance-budget carryover committed 98049bd ([phase].phase=sub-phase-lattice-boltzmann-d3q19-stack-d, opened_at=2026-05-24T02:51:32Z; no [budgets.*] widening; [budgets.lbm.cross_stack]=1e-5 at-budget per D3; tolerance.toml [overrides.reaction-diffusion-2d]+[overrides.sph-water] untouched). Task 0.2 reference reverify BOTH captures @ captures/lbm-ref/: poiseuille .h5 OID 0e0843aa… + couette .h5 OID 7a948434… MATCH; poiseuille .json 8347922d… + couette .json d9fbcafb… MATCH; IC-16 FIRST PRODUCTION CONSUMER on TWO LFS captures simultaneously (both smudged + ls-files-present). Task 0.3 (LOAD-BEARING Taichi-DSL LBM kernel validation) ALL PASS: feq reproduces d3q19-equilibrium golden bit-identically (max_abs=0.0 vs golden AND vs NumPy ref); integer-offset streaming bit-exact vs np.roll (max_abs=0.0); per-cell 19-term moment reduction deterministic at fixed ti.static(range(19)) order, 7.1e-15 vs NumPy (<< 1e-5); BGK+Guo+stream run-twice bit-exact (content_equivalent). Task 0.4 golden+MMS Stack-D-consumability PASS (d3q19-equilibrium.json 959e0248… loadable+Taichi-feq-fed; incompressible_ns_2d MMS solution.py 30e490a7… + derivation.md 30dfc294… UNMODIFIED + evaluate/source_term feed a Taichi Guo bgk step, finite). Task 0.5 (R-S5) compare_captures KeyError on category 'lattice' fires -> D6-MANDATORY [overrides.lattice-boltzmann-d3q19] category=lbm confirmed required; planned override resolves at-budget to relative=1e-5,absolute=0.0. Task 0.6 (R-L4 trivial) Phase-1 baselines poiseuille 3.784s/couette 0.604s = RD-2D-scale; no escape-hatch pre-routing; combined reference storage ~220MB < 2GB hook ceiling. Blocking-dependency scan: all conditions NEGATIVE. KEY STAGE-1B FINDING: set_taichi_deterministic does NOT set default_fp=ti.f64 -> bare 0.0 kernel locals default to f32 (leaked 3.4e-6 in the 19-term reduction); explicit ti.f64(0.0) accumulator seeds restore 7e-15 — LBM is the first sim with genuine in-kernel f64 reductions. 0 new Stage-0 shifts; cumulative 136. NOT BLOCKED. No Hard-Rule-2 trigger."
verdict-state: CONFIRMED
head_sha: ec438fd2213e6efd85adc655ea189774a1880fcc
head_sha_at_checkpoint: ec438fd2213e6efd85adc655ea189774a1880fcc
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-lattice-boltzmann-d3q19/landing-2026-05-23T00-41-15Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/landing-2026-05-24T02-00-04Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-probe-2026-05-24T02-30-12Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/plan-drafting-landing-2026-05-24T02-39-20Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/replay-2026-05-24T02-51-32Z.txt
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/capture-reverify-2026-05-24T02-51-32Z.txt
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/failing-tests-evidence-sha256-2026-05-24T02-51-32Z.txt
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/taichi-lbm-smoke-2026-05-24T02-51-32Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/replay-2026-05-24T02-51-32Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/capture-reverify-2026-05-24T02-51-32Z.txt: sha256:2ed4303d939102b39ddbb74e3c6c6051b0de6dee5304cd2fca215c9197b9d493
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/failing-tests-evidence-sha256-2026-05-24T02-51-32Z.txt: sha256:5620766e88105a76e29b14bbf51fbc6cf34780c57b270f348fb3b9ec52849318
  docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-0-evidence/taichi-lbm-smoke-2026-05-24T02-51-32Z.txt: sha256:a10ad94bb94d3e9741d035e0b5aa7abf3117484580a8a72a270cc9dd6dd937cd
  tools/testkit/equivalence/tolerance-budget.toml: sha256:8a5d89ce702963f759bbdfadc1d6e9e0e1561f03dd0d484bbc4c101872c4cf06
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
---

# Stage 0 Checkpoint — Sub-Phase lattice-boltzmann-d3q19 → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8); no
> value inherited from the dispatch without verification. FACT / INFERENCE /
> SHIFTED tagging throughout. D1–D9 operator-ratified; not re-litigated.

## 1. Verdict

**CONFIRMED.** All six charter-§4.1 Stage-0 tasks PASS. No blocking dependency. No
Hard-Rule-2 trigger. Stage 1a is dispatchable. **0 new Stage-0 shifts; cumulative
136** (FACT — plan-drafting landing § 9: 131 inherited + 5 plan-drafting S-P1..S-P5;
unchanged this stage).

The load-bearing Task 0.3 Taichi-DSL LBM kernel validation passed cleanly: the
per-cell 19-term moment reduction, the equilibrium polynomial, the Guo forcing, and
integer-offset streaming are all expressible deterministically in Taichi-DSL. One
Stage-1b kernel-authoring requirement banked (§ 5, f64 accumulator seeds). R-L4
wall-clock is trivial (RD-2D-scale); no escape-hatch pre-routing.

## 2. Per-task results (charter § 4.1 numbering)

| Task | Scope | Result |
|---|---|---|
| 0.0 | Cross-phase replay (8 gates vs `v0.1.0-phase-1`) | **PASS** — 8/8 GREEN, `ok=True`; replay-output sha256 `9399fc33…909f34` byte-identical to the bit-identity invariant (**22nd invocation**) |
| 0.1 | Tolerance-budget carryover | **PASS** — committed `98049bd`; `[phase].phase="sub-phase-lattice-boltzmann-d3q19-stack-d"`, `opened_at=2026-05-24T02:51:32Z`; no `[budgets.*]` widening; `[budgets.lbm.cross_stack]=1e-5` verified at-budget (D3); `tolerance.toml [overrides.reaction-diffusion-2d]`+`[overrides.sph-water]` untouched |
| 0.2 | Reference reverify (BOTH captures) + IC-16 | **PASS** — poiseuille `.h5` OID `0e0843aa…` + couette `.h5` OID `7a948434…` MATCH (both smudged, `ls-files`-present); poiseuille `.json` `8347922d…` + couette `.json` `d9fbcafb…` MATCH; **IC-16 first production consumer on TWO LFS captures simultaneously**; 24 failing-tests-evidence committed-blob sha256 recorded |
| 0.3 | **Taichi-DSL LBM kernel validation (LOAD-BEARING)** | **PASS** — see § 3 |
| 0.4 | Golden + MMS Stack-D-consumability | **PASS** — `d3q19-equilibrium.json` `959e0248…` loadable + Taichi-feq-fed (golden reproduced); `incompressible_ns_2d/solution.py` `30e490a7…` + `derivation.md` `30dfc294…` **UNMODIFIED**; `evaluate`+`source_term` feed a Taichi Guo `bgk` step (finite output) |
| 0.5 | R-S5 `compare_captures` taxonomy check | **PASS** — `KeyError` on category `'lattice'` fires as expected → **D6-MANDATORY confirmed**; planned `[overrides.lattice-boltzmann-d3q19] category="lbm"` resolves at-budget to `relative=1e-5, absolute=0.0` (end-to-end `within_tolerance=True`) |
| 0.6 | Wall-clock note (**R-L4 trivial**) + blocking-dependency scan | **PASS** — poiseuille 3.784 s / couette 0.604 s (RD-2D-scale); no escape-hatch pre-routing (§ 4); blocking conditions all NEGATIVE (§ 6) |

> **Dispatch/charter task-numbering note (coordinator-side, non-blocking).** The
> dispatch narrative scrambles the numbering (dispatch 0.3=wall-clock/escape-hatch,
> 0.4=R-S5, 0.5=Taichi-LBM-smoke) and cites `captures/lattice-boltzmann-d3q19-ref/`.
> Charter § 4.1 (source of truth) and HEAD agree on `captures/lbm-ref/` and on the
> numbering used in this table (0.3=Taichi-LBM-kernel, 0.4=golden+MMS, 0.5=R-S5,
> 0.6=wall-clock). The **union** of both was executed per Convention M (HEAD wins);
> no scope dropped; not a shift. See § 7.

## 3. Task 0.3 — Taichi-DSL LBM kernel validation (LOAD-BEARING detail)

(FACT — `taichi-lbm-smoke-2026-05-24T02-51-32Z.txt`; Taichi 1.7.4, `arch=cpu`,
`cpu_max_num_threads=1`, `offline_cache=True`, seed 42; host
`Linux 6.17.0-29-generic x86_64`. Smoke kernels use `ti.types.ndarray()` per the
repo's established Taichi-DSL pattern — NOT `ti.template()` — and omit
`from __future__ import annotations` which would stringize annotations PEP-563 and
break `@ti.kernel` resolution, IC-12 R-T2 inheritance.)

- **(c) Equilibrium golden reproduction:** Taichi `feq(ρ=1, u=(0.1,0,0))` reproduces
  all 19 `d3q19-equilibrium.json` values at `max_abs=0.0` (vs golden AND vs the
  NumPy reference `equilibrium.feq`) — exact, well inside the golden abs=1e-15 gate.
- **Integer-offset streaming bit-exact:** Taichi periodic-gather streaming
  (`f_out[i,x]=f[i,(x−c_i) mod N]`) `np.array_equal` vs the `bgk.stream` `np.roll`
  oracle → `max_abs=0.0`. Streaming carries NO FP arithmetic (pure index gather), so
  it is bit-exact across stacks (consistent with D9: streaming is NOT the
  cross-stack-non-trivial surface).
- **(d) Per-cell 19-term moment reduction deterministic:** `ti.static(range(19))`
  fixed-order accumulation of ρ and ρu per cell; `max_abs` vs NumPy
  `sum(axis=0)`/`einsum` = ρ 7.1e-15, momentum 8.9e-16 — far inside the 1e-5
  cross-stack budget. **Requires explicit `ti.f64(0.0)` accumulator seeds** (§ 5).
- **(a)+(b) Determinism:** full BGK+Guo+stream sim on a 4×4×3 periodic box × 8 steps,
  run twice @ seed 42 under `run_twice_and_diff` → `content_equivalent=True`
  ("captures match exactly"). The collision step exercises genuine per-cell 19-term
  moment reductions + equilibrium polynomial + Guo forcing — the first cross-stack
  pair to exercise this surface (D9), and it is run-twice bit-exact within Stack-D.

**Conclusion:** Taichi-DSL expresses every LBM primitive cleanly + deterministically
at single-thread. **No Hard-Rule-2 scope-expansion trigger** (no MRT multi-stage
moment-space transform needed; BGK single-τ + Guo forcing are idiomatic). The
existing IC-11/IC-12 Taichi infra suffices; no infra edit in scope.

## 4. Task 0.6 — R-L4 wall-clock (trivial) + storage

(FACT — plan-drafting probe § 1.4; charter § 4.1 Task 0.6.)

- Phase-1 NumPy-reference baselines: **poiseuille 3.784 s**, **couette 0.604 s** at
  full canonical horizons — **RD-2D-scale** (cf. RD-2D 0.568 s; sph-water 252.3 s).
- R-L4 escape-hatch pre-routing is **trivial / not needed**: both canonical runs are
  orders of magnitude below the 43-min escape-hatch and 3-h structural alarm. Taichi
  JIT overhead on small grids may make the Stack-D wall-clock somewhat larger than
  the NumPy floor but stays far below any alarm. Full canonical horizon (D4) holds;
  both captures (Poiseuille + Couette) at full horizon — no horizon pre-routing.
- **Storage:** the Phase-1 reference set (the gate-14 partners) is ~220 MB combined
  (poiseuille 202.35 MB + couette 27.41 MB) — under the 2 GB local hook ceiling. The
  Stack-D captures (Stage-1b deliverable) will be comparably sized. NOTE: the
  poiseuille `.h5` (202 MB) exceeds the 100 MB GitHub single-file recommendation, but
  it is an LFS-tracked Phase-1 artifact (pre-existing at HEAD; LFS exempts the
  single-file bound). Informational; no Stage-0 action.

## 5. Stage-1b precision requirement (banked; NOT a shift, NOT a blocker)

(FACT — `common/common-py/src/common_py/determinism.py` `ti.init` form + smoke
first-run-vs-f64-seed contrast.) `set_taichi_deterministic` pins
`arch / random_seed / cpu_max_num_threads=1 / offline_cache=True` but **NOT
`default_fp=ti.f64`**. Under Taichi's default f32, a bare-literal kernel local
(`r = 0.0`) infers f32; the per-cell 19-term reduction then leaked **3.4e-6** abs
error (≈ f32 epsilon × 19). Seeding the accumulators explicitly as `ti.f64(0.0)`
restores **7.1e-15**. This is the **same banked observation** as RD-2D / sph-water
Stage 0, but LBM is the **first sim with genuine in-kernel f64 reductions** (RD-2D /
sph-water keep reductions in NumPy/pure-Python). **Stage 1b MUST** either (i) f64-type
every reduction accumulator, or (ii) `ti.init(..., default_fp=ti.f64)` for the port.
This is **port-local config — NO IC-11 infra edit in scope** (the helper is consumed
verbatim per charter § 1.2). Recorded as a Stage-1b implementation note, not a
cumulative shift (consistent with the RD-2D f64-typed precedent).

## 6. Blocking-dependency scan (all NEGATIVE)

(FACT — `sha256sum` / `git cat-file` / `grep` at HEAD `98049bd`.)

1. **Conventions doc sha256** `69aa39fc…4602bf45` — **MATCH** → not blocked.
2. **architecture.md sha256** `e82b7b8e…9292d267` — **MATCH** → not blocked.
3. **methodology doc sha256** `326fd94f…0c6bc6` — **MATCH** (IC-15 partial; consumed
   as-is at 1c, amended additively at Stage 2 per D5(b)) → not blocked.
4. **Both Phase-1 LBM captures sha256** (`.h5` OIDs + `.json`) — all MATCH (Task 0.2)
   → not blocked; gate-14 partners intact.
5. **IC surfaces present/unshifted** — IC-11 `set_taichi_deterministic`✓; IC-12
   `docs/common/taichi.md` + `ti.types.ndarray` pattern✓; IC-13 spec § 2.5✓; IC-14
   `run_twice_and_diff` (`tools/testkit/determinism/harness.py:98`)✓; IC-15 partial
   methodology doc✓; IC-16 dual-LFS-OID resolution exercised PASS✓.
6. **Phase-1-sealed `packages/lattice-boltzmann-d3q19/`** — untouched (D7 STAY
   BANKED; reference read-only) → not blocked.

## 7. Drift / items surfaced for operator attention before Stage 1a

1. **Dispatch capture-path error (non-blocking).** Dispatch narrative cited
   `captures/lattice-boltzmann-d3q19-ref/`; HEAD + charter § 4.1 Task 0.2 use
   `captures/lbm-ref/`. Resolved by Convention M (HEAD wins); charter agrees.
2. **Dispatch tag-SHA mismatch (non-blocking).** Dispatch cited Phase-1 tag "SHA
   9998bc1"; `v0.1.0-phase-1` resolves to `990856502ac4e80dd1b05202ad6403ec7f49ee3c`
   at HEAD. The replay resolves the tag by highest-semver handle regardless; the
   bit-identity invariant matched.
3. **Dispatch/charter task-numbering scramble (non-blocking).** Reconciled by
   executing the union; this checkpoint follows charter § 4.1 numbering (§ 2 note).
4. **Stage-1b f64 accumulator requirement** (§ 5) — bank for the Stage-1b agent.

No conventions / architecture / methodology / Phase-1-capture / IC-surface drift (all
MATCH). No D1–D9 re-litigation (operator-ratified).

## 8. Cumulative shifts

Entering: **136** (FACT — plan-drafting landing § 9: 131 inherited from sph-water
Stack-D landing close + 5 plan-drafting S-P1..S-P5). Stage 0 added **0**.
**Cumulative at Stage-0 close: 136.**
