---
date: 2026-05-23T23-40-26Z
author: sph-water-stack-d-sub-phase-agent
phase: 2
artifact: stage
artifact_id: sub-phase-sph-water-stack-d-stage-0
subject: "Stage 0 pre-flight CLOSE for the sph-water -> Stack-D port (SECOND spec-Phase-2 cross-stack port). VERDICT CONFIRMED; all six task groups PASS. Task 0.0 cross-phase replay vs v0.1.0-phase-1 GREEN (8/8 gates, ok=True); replay-output sha256 9399fc33…909f34 byte-identical to the bit-identity invariant (21st invocation). Task 0.1 tolerance-budget carryover committed d439fd8 (no [budgets.*] widening; [budgets.sph.cross_stack]=1e-4 at-budget; tolerance.toml [overrides.reaction-diffusion-2d] untouched). Task 0.2 NumPy-ref capture reverify: .json blob 84dbc448…ff5865 MATCH, .h5 LFS content OID 7590149221…83d2f MATCH; IC-16 verify_evidence FIRST PRODUCTION CONSUMER on LFS evidence PASS (2/2, OID resolved offline from pointer stub); 21 cross-package failing-tests-evidence committed-blob sha256 recorded. Task 0.3 (R-S3 load-bearing) wall-clock scope-analysis: empirically-fit O(N^1.047) spatial-hash regime; canonical 100K x 1000 central estimate ~28-32 min (k~=10) < ~43 min 2x band -> PROCEED, full canonical horizon (D4) holds; iteration-count sensitivity flagged (k>=~20 -> >43 min). Task 0.4 (R-S5) compare_captures taxonomy KeyError fires as expected -> D6-MANDATORY confirmed; planned [overrides.sph-water] category=sph resolves at-budget to 1e-4. Task 0.5 DFSPH-Taichi-cpu kernel-pattern derisk: run-twice bit-exact (max|Δ|=0.0), clean neighbor iteration (no R-S3 scope expansion), cubic-spline golden consumable at abs<1e-12 WITH default_fp=ti.f64 (Stage-1b precision note: set_taichi_deterministic does NOT set default_fp). Task 0.6 5 blocking conditions all NEGATIVE (conventions+architecture sha256 MATCH; 11 packages GREEN 121 tests; capture sha256 MATCH; IC-11/12/13/14/16 surfaces present/unshifted). 0 new Stage-0 shifts; cumulative 129. NOT BLOCKED. No Hard-Rule-2 trigger."
verdict-state: CONFIRMED
head_sha: 2f276816d0e8364b249129883d34fe802a32ec7d
head_sha_at_checkpoint: 2f276816d0e8364b249129883d34fe802a32ec7d
parent_audits:
  - docs/_audits/phase-1/landing-2026-05-20T14-18-00Z.md
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-probe-2026-05-23T23-20-09Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/plan-drafting-landing-2026-05-23T23-20-09Z.md
evidence_paths:
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/replay-2026-05-23T23-40-26Z.txt
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/ic16-lfs-verify-probe-2026-05-23T23-40-26Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/failing-tests-evidence-sha256-2026-05-23T23-40-26Z.txt
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/dfsph-taichi-smoke-scope-analysis-2026-05-23T23-40-26Z.txt
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/scope-analysis-summary-2026-05-23T23-40-26Z.md
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/rs5-taxonomy-resolution-2026-05-23T23-40-26Z.txt
  - docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/portfolio-pytest-precondition-2026-05-23T23-40-26Z.txt
  - tools/testkit/equivalence/tolerance-budget.toml
  - docs/conventions/sub-phase-conventions.md
  - docs/architecture.md
evidence_hashes:
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/replay-2026-05-23T23-40-26Z.txt: sha256:9399fc337160dd20a3aeefdad6bc8d93edb7918ea5e8d005253d3ce718909f34
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/ic16-lfs-verify-probe-2026-05-23T23-40-26Z.md: sha256:88939c250313c87fad98fcb2afc404cf6dd669027d520aaa94cba869ef8def46
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/failing-tests-evidence-sha256-2026-05-23T23-40-26Z.txt: sha256:2fb4bce5b09cf3b94d85d7da337aae860454187bf626c1923cb27ac4a10e6648
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/dfsph-taichi-smoke-scope-analysis-2026-05-23T23-40-26Z.txt: sha256:db774b68ce6b67901620a42a420025dd44d3c252487d528245a956bfbc597c32
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/scope-analysis-summary-2026-05-23T23-40-26Z.md: sha256:380bf3c02cd84349327b6e7407b21c4432b1ff2060dac5a6dae56bb70271334d
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/rs5-taxonomy-resolution-2026-05-23T23-40-26Z.txt: sha256:01a72215709348500d146f81873bbcdad55fb2d230935533f303cd73b271029d
  docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-0-evidence/portfolio-pytest-precondition-2026-05-23T23-40-26Z.txt: sha256:7f82fd7937f1d6bfacbdd67372959eb6c8382aec82c4b03622120c01cd61cf08
  tools/testkit/equivalence/tolerance-budget.toml: sha256:716f72895e291ef2274ea86b30c1518aaf8dfeae35560b8b89a4070d49759cec
  docs/conventions/sub-phase-conventions.md: sha256:69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45
  docs/architecture.md: sha256:e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267
---

# Stage 0 Checkpoint — Sub-Phase sph-water → Stack-D

> IC-9 abbreviated structure. All anchors HEAD-verified (Convention M / #8); no
> value inherited from the dispatch without verification. FACT / INFERENCE /
> SHIFTED tagging throughout. Three plan-drafting dispatch-anchor falsifications
> (F1/F2/F3) carried forward via the charter's accurate re-framing; not
> re-litigated here.

## 1. Verdict

**CONFIRMED.** All six Stage-0 task groups PASS. No blocking dependency. No
Hard-Rule-2 trigger. Stage 1a is dispatchable. **0 new Stage-0 shifts; cumulative
129** (FACT — 125 inherited + 4 plan-drafting; unchanged this stage).

The R-S3 wall-clock escape-hatch is **NOT triggered** at the central estimate
(< ~43 min); full canonical horizon (D4) holds, with an iteration-count
sensitivity flagged for Stage-1b vigilance (§ 4).

## 2. Per-task results

| Task | Scope | Result |
|---|---|---|
| 0.0 | Cross-phase replay (8 gates vs `v0.1.0-phase-1`) | **PASS** — 8/8 GREEN, `ok=True`; replay-output sha256 `9399fc33…909f34` byte-identical to the bit-identity invariant (**21st invocation**) |
| 0.1 | Tolerance-budget carryover | **PASS** — committed `d439fd8`; `[phase].phase="sub-phase-sph-water-stack-d"`, `opened_at=2026-05-23T23:40:26Z`; no `[budgets.*]` widening; `[budgets.sph.cross_stack]=1e-4` verified at-budget; `tolerance.toml [overrides.reaction-diffusion-2d]` untouched |
| 0.2 | NumPy-ref capture reverify + IC-16 | **PASS** — `.json` blob `84dbc448…ff5865` MATCH; `.h5` LFS content OID `7590149221…83d2f` MATCH (ls-files == pointer stub); **IC-16 `verify_evidence` first production consumer on LFS evidence: 2/2 PASS** (OID resolved offline from pointer stub); 21 cross-package failing-tests-evidence committed-blob sha256 recorded |
| 0.3 | Canonical-descriptor scope-analysis (**R-S3 load-bearing**) | **PROCEED** — O(N^1.047) spatial-hash regime fit empirically; central estimate ~28–32 min (k≈10) **< ~43 min** → escape-hatch not triggered; sensitivity flagged (§ 4) |
| 0.4 | R-S5 `compare_captures` taxonomy check | **PASS** — `KeyError` on `'particle-fluids'` fires as expected → **D6-MANDATORY confirmed**; planned `[overrides.sph-water] category="sph"` resolves at-budget to `relative=1e-4, absolute=0.0` |
| 0.5 | DFSPH-Taichi-cpu kernel-pattern derisk (R-S2/R-S3) | **PASS** — run-twice bit-exact (`max|Δ|=0.0`); clean neighbor iteration (no scope expansion); cubic-spline golden consumable `abs<1e-12` **with `default_fp=ti.f64`** (precision note § 5) |
| 0.6 | Blocking-dependency identification (5 conditions) | **PASS** — all 5 NEGATIVE (§ 6); NOT BLOCKED |

> **Dispatch/charter task-numbering note (coordinator-side, non-blocking).** The
> dispatch enumerates 0.4=R-S5 / 0.5=DFSPH-Taichi-smoke / 0.6=blocking-deps, while
> charter § 4.1 enumerates 0.4=Taichi-SPH-neighbor / 0.5=golden-consumability /
> 0.6=R-S5. The **union** of both was executed (golden-consumability folded into
> Task 0.5 per § 5); this checkpoint's table follows the dispatch numbering. No
> scope was dropped; not counted as a shift.

## 3. Task 0.3 — R-S3 wall-clock (load-bearing detail)

(FACT — `dfsph-taichi-smoke-scope-analysis-2026-05-23T23-40-26Z.txt` +
`scope-analysis-summary-2026-05-23T23-40-26Z.md`; host `i7-12700KF-linux-6.17`,
same as the NumPy-reference perf-ledger row.)

- **Scaling regime EMPIRICALLY FIT (not assumed):** per-step at N∈{1000,2197,4096,
  8000} → `T_step ∝ N^1.047` ⇒ **O(N)** inlined spatial-hash (NOT O(N log N) kd-tree,
  NOT O(N²) all-pairs). Inner-iter linearity `T_step(k) ≈ 0.09 ms + 3.18 ms·k`.
- **Extrapolation to canonical `dam-break-100K-particles-seed42-step1000`:**

  | DFSPH combined inner-iters k | TOTAL | band |
  |---|---|---|
  | 5  | 16.0 min | PROCEED |
  | 10 | 31.8 min | **PROCEED (< 43 min)** |
  | 20 | 63.6 min | SURFACE (43 min–3 h) |
  | 50 | 158.9 min | SURFACE (approaching 3 h) |

  NumPy ref = 1291.854 s (21.5 min); 2× band = 2583.7 s (43.1 min); 3-h alarm = 10800 s.
- **Routing:** central estimate (k≈10) ~28–32 min **< ~43 min → PROCEED**; full
  canonical horizon (D4) holds.
- **Sensitivity / honest caveats:** (1) the DFSPH combined per-step iteration count
  is the dominant uncertainty — the estimate crosses 43 min at k ≳ 18–20; (2) the
  smoke models a single corrector pass per iter, whereas full DFSPH runs two
  solvers (divergence-free + constant-density) with α-factors → real per-step work
  is HIGHER, so 28–32 min is floor-leaning. **Stage-1b recommendation:** instrument
  the actual combined per-step iteration count early; if ≥ ~18–20 (→ > 43 min),
  invoke the R-S3 escape-hatch then and request operator routing among {full
  canonical / shorter horizon / diagnostic-tier-only}. Storage is NOT the constraint
  (~59 MB ≪ 1 GB W1); wall-clock is.

## 4. Task 0.5 — DFSPH-Taichi-cpu derisk + golden consumability

(FACT — same smoke evidence.)

- **Determinism:** `np.array_equal(final positions)==True`, `max|Δ|=0.0` over 20
  steps × 10 inner iters @ seed 42, N=1000. `cpu_max_num_threads=1` serialises the
  `ti.atomic_add` grid insertion (insertion order == particle-id order) → bit-exact
  run-twice. R-S3(a) derisked.
- **Neighbor iteration clean:** 27-cell spatial-hash stencil + dynamic per-cell
  counts + per-pair gradient accumulation expressed in idiomatic Taichi-DSL; the
  existing Taichi-integration infra (IC-11/IC-12) suffices — **no neighbor-search
  utility scope-expansion** (phase-2-plan Rule I3: inline in port). No Hard-Rule-2.
- **Golden consumability (charter Task 0.5):** Taichi-side `W(0,1)=0.3183098861837907`
  and `W(0.5,1)=0.22878523069459955` reproduce the Phase-0 `cubic-spline-kernel.json`
  anchors with **|err|=0.0 (abs<1e-12)**.

## 5. Stage-1b precision note (R-S2-adjacent; NOT a shift, NOT a blocker)

(FACT — `common/common-py/src/common_py/determinism.py` `ti.init` form; smoke first
run vs f64 re-run.) `set_taichi_deterministic` initialises Taichi **without
`default_fp=ti.f64`** (form: `arch=ti.cpu, random_seed, cpu_max_num_threads=1,
offline_cache=True`). Under Taichi's default f32, bare-literal kernel locals infer
f32 → the cubic-spline `W` returned ~1e-8 error and **FAILED** the abs=1e-12 golden
gate; with `default_fp=ti.f64` it reproduces exactly. RD-2D Stack-D sidesteps this
via explicitly `ti.f64`-typed `ti.types.ndarray` kernel args. **Stage 1b MUST**
either (i) `ti.init(..., default_fp=ti.f64)` for the port, or (ii) f64-type every
kernel local. This is **port-local config — NO IC-11 infra edit in scope** (the
helper is consumed verbatim per charter § 1.2). f64 vs f32 wall-clock difference was
negligible (memory-bound), so the § 3 estimate is unaffected. Recorded as a Stage-1b
implementation note, not a cumulative shift (consistent with the charter R-S2 posture
and the RD-2D f64-typed precedent).

## 6. Task 0.6 — Blocking-dependency scan (5 conditions)

(FACT — `sha256sum` / `grep` / per-package `pytest` at HEAD.)

1. **Conventions doc sha256** `69aa39fc…4602bf45` — **MATCH** (no drift) → not blocked.
2. **architecture.md sha256** `e82b7b8e…9292d267` — **MATCH** (no drift) → not blocked.
3. **10 sim packages new failures at HEAD** — NONE. Per-package GREEN: boids-3d 10,
   eulerian-smoke 10, lbm-d3q19 10, mandelbulb 10, mpm 10, physarum 10, rd-2d 14,
   rd-2d-stack-d 16, rd-3d 8, sph-water 22, strange-attractors 11 = **121 pass / 0
   fail** (all-at-once collection error was a cross-package `conftest` basename
   collision, NOT a failure — per-package isolation collects + runs clean) → not blocked.
4. **Phase-1 sph-water capture sha256** — `.json`/`.h5` both MATCH (Task 0.2) → not blocked.
5. **IC-11/12/13/14/16 surfaces** — IC-11 `set_taichi_deterministic`✓; IC-12
   `docs/common/taichi.md`✓; IC-13 spec § 2.5✓; IC-14 `run_twice_and_diff`
   (`tools/testkit/determinism/harness.py:98`)✓; IC-16 `lfs_pointer_oid` + exercised
   PASS✓ → not blocked.

## 7. Drift / items surfaced for operator attention before Stage 1a

1. **Task 0.3 iteration-count sensitivity** (§ 3) — central estimate < 43 min but
   crosses the 2× band at k ≳ 18–20; Stage-1b should instrument early. No re-route
   needed now.
2. **Stage-1b f64 precision requirement** (§ 5) — port must pin `default_fp=ti.f64`
   (or f64-type locals) to pass the abs=1e-12 golden gate-4a.
3. **Dispatch/charter Task 0.4–0.6 numbering** (§ 2 note) — reconciled by executing
   the union; no scope impact.

No anchor-probe drift (conventions / architecture / Phase-1 capture / IC surfaces
all MATCH). No D1–D8 re-litigation (operator-ratified).

## 8. Cumulative shifts

Entering: **129** (FACT — 125 inherited + 4 plan-drafting). Stage 0 added **0**.
**Cumulative at Stage-0 close: 129.**
