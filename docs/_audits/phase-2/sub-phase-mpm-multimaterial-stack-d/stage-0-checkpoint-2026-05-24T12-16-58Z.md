---
date: 2026-05-24T12-16-58Z
author: mpm-multimaterial-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-mpm-multimaterial-stack-d-stage-0
subject: "Stage 0 pre-flight CLOSE for the mpm-multimaterial -> Stack-D port (FOURTH spec-Phase-2 cross-stack port). VERDICT CONFIRMED; all six Stage-0 tasks PASS. Task 0.0 cross-phase replay vs v0.1.0-phase-1 GREEN (8/8 gates, ok=True); replay-output sha256 9399fc33…909f34 byte-identical to the bit-identity invariant (23rd invocation). Task 0.1 tolerance-budget carryover committed 8c9e601 ([phase].phase=sub-phase-mpm-multimaterial-stack-d, opened_at=2026-05-24T12:16:58Z; no [budgets.*] widening; [budgets.mpm.cross_stack]=1e-4 at-budget per D3; tolerance.toml prior overrides untouched). Task 0.2 reference reverify @ captures/mpm-ref/: .h5 LFS content OID 73e00d09…b5ebae MATCH (pointer-stub + ls-files + smudged-content all agree; size 1,125,718,712 B ~1.05 GiB); .json blob ea3531e0…28d1a2f MATCH; IC-16 lfs_pointer_oid() SIZE-INDEPENDENT — reads the 135-byte pointer stub, NOT the 1.05 GiB content (largest LFS consumer to date; clean, no unexpected behavior). Task 0.3 (LOAD-BEARING P2G scatter-posture probe) RESULTS: posture (i) serialised cpu_max_num_threads=1 run-to-run BIT-EXACT (True); posture (ii) parallel cpu_max_num_threads=8 run-to-run NOT bit-exact (False) -> genuine parallel atomic-scatter surface PRESENT empirically (confirms spec determinism.md epsilon rationale); cross-stack posture-(i)-Taichi vs NumPy-numba single-thread max_abs_diff mass=8.47e-10/mom=3.47e-10 -> within the ~1e-13..1e-9 comfortable-margin band, ~5 orders below 1e-4, but NOTABLY LARGER than the prior 3 pairs' ~1e-15 (the genuinely-new atomic-scatter FP-accumulation surface; deferred IC-15 aspect #3 partially exercised even serialised). Stage-1b lean: posture (i) cpu_max_num_threads=1. D5 calibration -> (b) PARTIAL HOLDS + REFINEMENT. Task 0.4 (R-S5) compare_captures KeyError on sim.category 'hybrid-pg' fires -> D6-MANDATORY [overrides.mpm-multimaterial] category=mpm confirmed required; planned override resolves at-budget to relative=1e-4,absolute=0.0. Task 0.5 MLS-MPM/APIC Taichi-cpu derisk ALL PASS: 3x3 ti.Matrix F+C f64 + det/log branch OK; full step chain (stress->P2G->grid->G2P/APIC->deform->advect) run-twice BIT-EXACT at threads=1 + all-finite; seeded blob IC deterministic; ti.f64(0.0) accumulator seeds clean (LBM banked f64-seed precedent applies). Task 0.6 blocking-dependency scan: all conditions NEGATIVE (Taichi 1.7.4 in [>=1.7,<2.0]; Phase-1 ref + determinism + golden(4 anchors) + harness present; overrides.mpm-multimaterial absent as expected). 0 new Stage-0 shifts; cumulative 143. NOT BLOCKED. Hard-Rule-2: posture-(ii) parallel surface present is SURFACED for operator awareness (expected per spec; posture (i) is the achievable + chosen mitigation) — NOT a blocker, NOT unexpected behavior."
verdict-state: CONFIRMED
head_sha: 03a329653ae927fd01c36b9ff551a05f8f14ec50
head_sha_at_checkpoint: 03a329653ae927fd01c36b9ff551a05f8f14ec50
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-mpm-multimaterial/landing-2026-05-23T02-53-11Z.md
  - docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/landing-2026-05-24T04-15-37Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-probe-2026-05-24T11-45-06Z.md
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/plan-drafting-landing-2026-05-24T11-52-00Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-evidence/replay-2026-05-24T12-16-58Z.txt
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-evidence/scatter-posture-probe-2026-05-24T12-16-58Z.txt
  - docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-evidence/kernel-derisk-2026-05-24T12-16-58Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-evidence/replay-2026-05-24T12-16-58Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-evidence/scatter-posture-probe-2026-05-24T12-16-58Z.txt: sha256:b411567e4309cf523ef53da07b6cca78da2b4d7cc7abb75b0db743a85ec931ea
  docs/_audits/phase-2/sub-phase-mpm-multimaterial-stack-d/stage-0-evidence/kernel-derisk-2026-05-24T12-16-58Z.txt: sha256:b66a0d1e8c2a679a3107c0d57ec9e12e33a1e4b6d5ddc4f7c2b6f9e2c6b57a49
  tools/testkit/equivalence/tolerance-budget.toml: sha256:6c265f1286aa46ba77c793c9a5c7476b31eb83876cda7744967ba0f1eead2446
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
---

# Stage 0 pre-flight checkpoint — sub-phase-mpm-multimaterial-stack-d

> FOURTH spec-Phase-2 per-sim cross-stack port. Pre-flight CONFIRMED; Stage 1a
> dispatchable. Convention M re-anchor: conventions `69aa39fc…`, architecture
> `e82b7b8e…`, methodology `3c2149f6…` — all MATCH at HEAD. Every dispatch-cited
> value verified at HEAD (Convention #8); no anchor drift.

## § 1. Per-task results

| Task | Result | Detail |
|---|---|---|
| 0.0 Cross-phase replay (8 gates vs `v0.1.0-phase-1`) | **PASS** | 8/8 GREEN, `ok=True`; replay-output sha256 `9399fc33…909f34` byte-identical to bit-identity invariant (**23rd invocation**) |
| 0.1 Tolerance-budget carryover | **PASS** | committed `8c9e601`; `[phase].phase=sub-phase-mpm-multimaterial-stack-d`, `opened_at=2026-05-24T12:16:58Z`; no `[budgets.*]` widening; `[budgets.mpm.cross_stack]=1e-4` at-budget (D3); prior `[overrides.*]` untouched |
| 0.2 Phase-1 capture reverify | **PASS** | `captures/mpm-ref/drop-impact-128cube-seed42-step500.h5` LFS OID `73e00d09…b5ebae` MATCH; `.json` blob `ea3531e0…28d1a2f` MATCH; **IC-16 size-independent at ~1.05 GiB** (reads 135-byte pointer stub, not content) |
| 0.3 P2G scatter-posture probe (LOAD-BEARING) | **PASS** | posture (i) threads=1 run-to-run **bit-exact**; posture (ii) threads=8 run-to-run **NOT bit-exact** (parallel surface present); cross-stack posture-(i) vs NumPy `max_abs_diff` mass=`8.47e-10`/mom=`3.47e-10` |
| 0.4 R-S5 taxonomy KeyError | **PASS** | `compare_captures` KeyError on `sim.category="hybrid-pg"` fires → D6-MANDATORY `[overrides.mpm-multimaterial] category="mpm"`; planned override resolves to `relative=1e-4, absolute=0.0` (at-budget) |
| 0.5 MLS-MPM/APIC Taichi derisk | **PASS** | 3×3 `ti.Matrix` F+C f64 + det/log OK; full step chain run-twice **bit-exact** at threads=1, all-finite; seeded blob IC deterministic; `ti.f64(0.0)` seeds clean |
| 0.6 Blocking-dependency scan | **PASS** | all NEGATIVE (Taichi 1.7.4; Phase-1 ref + determinism + 4-anchor golden + harness present; override absent as expected) |

## § 2. Task 0.3 — P2G scatter-posture (LOAD-BEARING for D5 routing)

Throwaway Taichi-DSL P2G (~1000 particles, 10³ grid, `ti.atomic_add`, f64 seeds, quadratic-B-spline 3-node weights mirroring the reference) vs a NumPy single-thread sequential-`+=` reference.

| Determination | Result |
|---|---|
| Posture (i) serialised (`cpu_max_num_threads=1`) run-to-run bit-exact | **YES** (max_abs_diff 0.0) — achievable + same-stack deterministic |
| Posture (ii) parallel (`cpu_max_num_threads=8`) run-to-run bit-exact | **NO** — genuine parallel atomic-scatter ordering surface PRESENT |
| Cross-stack posture-(i)-Taichi vs NumPy-numba `max_abs_diff` | mass `8.468e-10`, mom `3.467e-10` |
| Mass conservation (partition-of-unity) | total = 1.0 exactly (numpy, ti1, ti8) |

**Calibration (FACT):** Posture (i) is achievable and is the **Stage-1b implementation lean** (`cpu_max_num_threads=1`, per IC-13 determinism + the LBM precedent of serialised atomic_add). The cross-stack diff (~8.5e-10) sits at the comfortable edge of the dispatch's "~1e-13…~1e-9 → D5 (b)" band — **~5 orders below the 1e-4 tolerance**, but **notably larger than the prior three pairs' ~1e-15**. This is the genuinely-new **atomic-scatter FP-accumulation surface** (scatter accumulation order into grid nodes differs from the numba reference's sequential `+=` even when serialised — distinct from LBM's per-cell *reduction* surface). **Deferred IC-15 aspect #3 is partially exercised even at posture (i).** → **D5 (b) PARTIAL HOLDS + REFINEMENT** is the calibrated lean.

**Posture (ii) parallel surface PRESENT (surfaced for operator awareness, NOT a blocker):** the threads>1 atomic_add ordering is non-reproducible run-to-run. This empirically confirms the spec `determinism.md` `epsilon-same-stack` rationale and is the FIRST cross-stack pair where this is demonstrated. It is **EXPECTED** (the spec + probe both anticipated it); posture (i) serialisation is the chosen mitigation, so it does not block. **It is NOT "unexpected scatter-posture behavior"** (posture (i) IS achievable; cross-stack diff IS within band) → verdict stays **CONFIRMED**, not SURFACE-WAITING.

**Full-scale extrapolation caveat (Stage 1c R-M2):** this is a single-step small-scale probe. At full scale (1M particles, 128³, 500 steps), more particles-per-node + 500-step drop-impact trajectory amplification (R-M2; the `j_det≤0` non-smooth branch) could grow the cross-stack diff beyond ~1e-9. Starting from ~1e-9 single-step with 1e-4 tolerance gives ~5 orders of headroom; the Stage-1c step-horizon roll-up is the load-bearing confirmation. Expected gate-14 shape: **GREEN at 1e-4 with smaller margin than the prior pairs' ~10 orders (likely a few-to-several orders)**.

## § 3. Convention M anchor re-verification (Convention #8)

| Anchor | Dispatch-cited | HEAD-verified | Match? |
|---|---|---|---|
| conventions doc | `69aa39fc…4602bf45` | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | FACT |
| architecture | `e82b7b8e…9292d267` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | FACT |
| methodology | `3c2149f6…` | `3c2149f625c1f666613d2eda95c6c22a1bb7910d72ec076a58af560ec16189cc` | FACT |
| `[budgets.mpm.cross_stack]` | `1e-4` (D3) | `relative=1e-4, absolute=0.0` | FACT |
| `[defaults.mpm]` via override | `1e-4` | `{category:mpm, relative:1e-4, absolute:0.0}` | FACT |
| sim.category | `hybrid-pg` (probe) | `hybrid-pg` (capture manifest) | FACT |
| canonical capture | ONE; `73e00d09…`/`ea3531e0…` | MATCH | FACT |

No anchor drift. No conventions/architecture/methodology amendment this stage.

## § 4. Shifts + cumulative

**0 new Stage-0 shifts.** The Task-0.3 findings (posture (ii) parallel surface present; cross-stack diff ~1e-9 larger than prior pairs) are **empirical confirmations of probe-anticipated S-M6** (atomic-scatter on the Stack-D side), not new SHIFTs. **Cumulative at Stage-0 close: 143.**

## § 5. Verdict + blocking dependencies

**Verdict: CONFIRMED.** All six tasks PASS. No blocking dependencies (all conditions NEGATIVE). Hard Rule 2 NOT triggered as a blocker — the posture-(ii) parallel surface is surfaced for operator awareness (§ 2) but is expected and mitigated by posture (i). Stage 1a dispatchable.

## § 6. Stage-1b carry-forward notes

- **Determinism posture:** `cpu_max_num_threads=1` (posture (i)); `ti.f64(0.0)` accumulator seeds in all P2G/G2P/stress reductions (LBM banked f64-seed precedent); declare the chosen scatter posture + its gate-14 consequence in the `sim.py` determinism docstring.
- **Same-stack contract (gate-10):** posture (i) is run-to-run bit-exact at the derisk scale → `run_twice_and_diff` content-equivalence expected GREEN at the diagnostic tier.
- **D5 routing input:** (b) PARTIAL HOLDS + REFINEMENT (atomic-scatter-on-Stack-D-side subsection) unless Stage-1c full-scale gate-14 surprises (R-M2 amplification toward 1e-4 → potential (d)/D8).

---

*End of Stage 0 checkpoint. SHA back-fill follows (Convention #12 + N1 enumeration).*
