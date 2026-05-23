---
date: 2026-05-23T23-20-09Z
author: sph-water-stack-d-plan-drafting-agent
phase: 2
artifact: plan-drafting-probe
artifact_id: sub-phase-sph-water-stack-d
subject: "Plan-drafting anchor-probe for the SECOND per-sim cross-stack port under spec-Phase-2 (sph-water → Stack-D Taichi). HEAD-verified Phase-1 sph-water baseline (DFSPH NumPy + scipy.cKDTree + numba; NO WGSL; NO MMS — golden-table gate-4/5), Taichi-integration + capture-determinism-contract + audit-chain-correctness + RD-2D Stack-D infrastructure, IC-11/12/13/14/16 surfaces, IC-15 candidate methodology, HEAD tolerance.toml [defaults.sph]=1e-4 (no [overrides.sph-water]), Stack-B/NumPy-ref canonical capture sha256s. THREE dispatch-anchor falsifications surfaced (Stack-B-WGSL framing; spec §11.3 item id; R12-R20 characterization). D1-D8 surface preview. 4 new plan-drafting shifts."
verdict-state: PROBE-COMPLETE
head_sha: ce49cd4fc22ca26f52e40dceef05d49946e35353
head_sha_at_probe: ce49cd4fc22ca26f52e40dceef05d49946e35353
parent_audits:
  - docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md
  - docs/_audits/phase-2/sub-phase-taichi-integration/landing-2026-05-23T14-45-11Z.md
  - docs/_audits/phase-2/sub-phase-capture-determinism-contract/landing-2026-05-23T17-08-14Z.md
  - docs/_audits/phase-2/sub-phase-reaction-diffusion-2d-stack-d/landing-2026-05-23T21-22-23Z.md
  - docs/_audits/phase-2/sub-phase-audit-chain-correctness/landing-2026-05-23T23-04-19Z.md
---

# Plan-Drafting Anchor-Probe — sph-water → Stack-D

> **Reading note (Convention #8 + RD-2D Stack-D N4 / audit-chain-correctness S1+S2
> coordinator-discipline precedent).** Every value below is HEAD-verified
> (`sha256sum` / `git show` / `grep` at `ce49cd4`), NOT transcribed from the
> dispatch or from prior reports. Where this probe contradicts the dispatch, the
> HEAD-verified value is load-bearing and the dispatch value is flagged
> FALSIFIED. Three dispatch anchors are falsified (§ 9); this is the
> coordinator-side Convention #8 discipline the dispatch itself mandated.

## 0. HEAD anchor verification (Task 0.0 equivalents)

(FACT — `git rev-parse HEAD`; `sha256sum`.)

| Anchor | Dispatch-stated | HEAD-verified | Status |
|---|---|---|---|
| HEAD SHA | `ce49cd4` (audit-chain-correctness back-fill) | `ce49cd4fc22ca26f52e40dceef05d49946e35353` | **MATCH** (FACT) |
| audit-chain-correctness landing `head_sha` | "landed … at HEAD ce49cd4" | landing `head_sha` = `6b4b90a46fb1b22064a0d3490e0b24c6a9afa48e`; SHA back-fill = `ce49cd4` (= HEAD) | both true; landing audit lands at `6b4b90a`, back-fill commit is HEAD |
| RD-2D Stack-D landing SHA | "7747d68 / SHA back-fill 2eb2a2d" | landing `head_sha` = `7747d68fba9a30a3a4473e0419d9361ed465e769`; append-only diff baseline cited `2eb2a2d` | **MATCH** (FACT) |
| Conventions doc sha256 | `69aa39fc…4602bf45` | `69aa39fceb3fcb0f0b6080068bdbb33a98736c73650de4ebc883de5f4602bf45` | **MATCH** (FACT) — no drift since audit-chain-correctness close |
| architecture.md sha256 | `e82b7b8e…9292d267` | `e82b7b8e4cc88441a1cdbedda1da2876ab9ccc74c64742585f66e4639292d267` | **MATCH** (FACT) |
| Cumulative shift count entering | 125 | audit-chain-correctness landing § 9: "120 + 5 = **125** entering the next sub-phase" | **MATCH** (FACT) |
| tolerance-budget.toml `[phase].phase` | (n/a) | `"sub-phase-audit-chain-correctness"`, `opened_at = "2026-05-23T22:17:07Z"` | this sub-phase Stage 0 carries it over |

Conventions sha256 ladder (audit-chain-correctness § 8): `167fe349…` (RD-2D close)
→ `2638dd28…` (Mode-2 RESOLVED) → `69aa39fc…` (Mode-3 ADDED; HEAD). Architecture
ladder: `42f5d599…` → `e82b7b8e…` (HEAD). Both terminate at HEAD values. §B.6 has
3 modes at HEAD (Mode 1 / Mode 2 RESOLVED / Mode 3 ADDED). § C.1 cross-stack port
naming convention operative (RD-2D D1 ratified).

## 1. Phase-1 sph-water baseline inventory

(FACT — `docs/_audits/phase-1/sub-phase-particle-fluids-sph-water/landing-2026-05-22T01-42-51Z.md`;
`packages/sph-water/**`; `docs/sim-specs/particle-fluids/sph-water/{spec-ref,determinism,equivalence}.md`.)

- **Algorithm:** DFSPH (Bender & Koschier 2015), variant
  `dfsph-bender-koschier-2015`. Per [`algebraic.md`](../../../sim-specs/particle-fluids/sph-water/algebraic.md):
  SPH neighbor query → DFSPH divergence-free solver → DFSPH constant-density
  solver → integrate position + velocity. **Iterative pressure solve** (both a
  divergence-free corrector and a density corrector, each with a `max_iter` cap
  + `<=` tolerance check).
- **Implemented reference stack:** **Python NumPy + scipy.spatial.cKDTree
  (neighbor query, R17 routing) + numba `@njit(fastmath=False, cache=True)`
  (per-pair inner math, R18 routing).** Capture manifest `stack.name =
  "numpy-reference"`, `build_id = "sub-phase-particle-fluids-sph-water"`,
  `version = "0.0.1"`. **There is NO WGSL / WebGPU / Vulkan implementation of
  sph-water at HEAD** (verified: `grep -ril "wgsl|webgpu|@compute|shader"
  packages/sph-water` returns only doc/comment text in `sim.py` + `pyproject.toml`;
  no shader files; package is pure Python: `sph_water/{__init__,invariants,sim}.py`
  + `reference/{__init__,dfsph}.py`).
- **Package layout (Stack-B reference, the cross-stack diff partner):**
  ```
  packages/sph-water/
    pyproject.toml, README.md
    sph_water/__init__.py, invariants.py, sim.py
    sph_water/reference/__init__.py, dfsph.py
    tests/ {conftest, __init__, test_cubic_spline_kernel_golden,
            test_dfsph_density_golden, test_determinism, test_diagnostics,
            test_pbt_invariants, test_spatial_hash_equivalence}.py
  ```
- **Determinism mechanism (sim.py module docstring, lines ~80–125):** neighbor
  accumulation walks "each particle's neighbor list **in sorted order with a
  single per-particle accumulator** (Python `float` `+=`); NO `numpy.add.at` over
  unsorted pair indices and NO parallel reductions. FP non-associativity is fully
  sequenced." DFSPH inner-iteration determinism via fixed `max_iter` cap + `<=`
  tolerance. RNG only at IC via `numpy.random.default_rng(seed)`. No BLAS/FMA in
  kernel. **Resulting claim: `bit-exact-same-stack-same-hw`** (stronger than the
  spec's `epsilon-same-stack-same-hw` Stack-C declaration); gate-11 witnesses
  bit-exact (epsilon-bound trivially 0).
- **Capture format (gate-10 canonical):**
  `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{h5,json}`
  (**100K-instance** per R20 routing — the spec Appendix-D `1M` descriptor is
  contracted forward to Stack-C Phase-2+ per spec-ref § 5, NOT amended). `.h5` =
  58.8 MB, `dims = [100000, 3]`, `dtype = f64`, `seed = 42`, `tier = "test"`,
  params `{dt: 0.001, g_z: -9.81, h: 0.05, n_particles: 100000, rho_0: 1000.0}`,
  `run = {capture_interval: 100, step_count: 1000}` → **11 frames** (steps 0,
  100, …, 1000). `determinism = {claimed: "bit-exact-same-hw", atomic_ops: false,
  subgroup_ops: false}`.
- **MMS pipeline status: NONE.** spec-ref § 7: "**No MMS — SPH is a particle
  method without a manufactured-solution gate;** convergence is governed by
  particle count + smoothing length." Code verification is **golden-table-based**
  (gate-5): (a) `tools/testkit/golden/tables/cubic-spline-kernel.json` (Phase 0;
  9 fixture points; `abs = 1e-12`); (b)
  `tools/testkit/golden/tables/particle-fluids/dfsph-density-evolution.json`
  (Phase 1 Stage 2; **3 discrete anchors** post-Cat-3-Decision-A; `abs = 1e-15`;
  ρ₀ = 0.5470951168783902, dρ/dt₀ = -0.2984155182973038). **This is the single
  largest gate-level delta from the RD-2D Stack-D template (which used MMS at
  gate-4).**
- **PBT invariants (gate-12; spec-ref § 6.6; ≥ 2 per spec § 2.14):**
  `density_nonneg` + `kernel_normalization_unit_volume`. (Exactly 2.)
- **Tier-2 particle diagnostics (IC-5; spec-ref § 10):** `check_no_overlap`
  (epsilon = half particle spacing), `check_neighbor_list_integrity`,
  `check_momentum_conservation` (**advisory** — DFSPH not strictly
  momentum-conserving due to numerical viscosity), `check_count_invariance`.
- **Test surface:** 22 tests GREEN (Phase-1 landing § 3.3 + § 6.1).
- **Perf baseline (gate-13 perf-ledger row):** **1291.854 s (~21.5 min)** on
  `i7-12700KF-linux-6.17` for the 100K-instance canonical capture. **~1390× the
  RD-2D Stack-B baseline of 0.931 s.** This makes canonical-descriptor
  scope-analysis (Phase-1 banked observation § 9.3(1)) load-bearing at Stage 0,
  not a formality.
- **Phase-1 R-class arc (R12–R20) — ACTUAL content** (Phase-1 landing § 3.1):
  R12 storage > 64 MB ceiling (raised to 1 GB); R16 O(N²) tensor OOM at N=1M
  (21.8 TiB; intermediate cell-list); R17 Python-loop bottleneck (→ scipy.cKDTree
  + pair-array fast path); R18 aggregate runtime > 10⁴ s (→ numba @njit); R19
  1-hour threshold (REVOKED); R20 3-hour threshold breached at N=1M (→ **100K
  instance**; full 1M contracted forward to Stack-C). **R12–R20 are
  scaling/scope remediations — NOT "atomic-scatter ordering cross-stack
  divergence."** See § 9 dispatch-anchor falsification.

## 2. Infrastructure inventory (Taichi-integration + capture-determinism-contract + audit-chain-correctness + RD-2D Stack-D)

(FACT — respective landing audits + HEAD source.)

| IC | Surface | HEAD state | Consumed by this sub-phase at |
|---|---|---|---|
| IC-2 | `common_py.capture.{Writer, load_capture}` capture I/O | first-class workspace member (Taichi-integration) | gate-9 capture write; gate-14 load |
| IC-4 | `common_py.determinism.Config` | available | sim-runner seed/deterministic plumbing |
| IC-5 | Tier-2 particle substack | available (Phase-1) | gate-6 Tier-2 |
| IC-11 | `common_py.determinism.set_taichi_deterministic(config, *, arch="cpu")` | present at `common/common-py/src/common_py/determinism.py:71` | sim-runner entry (before any `@ti.kernel`) |
| IC-12 | `docs/common/taichi.md` Taichi convention doc | available (R-T1..R-T5) | kernel authoring rules |
| IC-13 | content-equivalence contract (spec § 2.5) | available; `bit-exact-same-hw` = zero-tolerance same-stack special case | gate-10 determinism contract |
| IC-14 | determinism-harness `run_twice_and_diff` (Python) | available | gate-10 test |
| IC-15 | **candidate** per-sim cross-stack-port methodology (equivalence.md + at-budget override + per-frame diff witness) | RD-2D Stack-D § 9–10; **formalization DEFERRED to second cross-stack pair = THIS sub-phase** | gate-14 / Stage 1c; **D5 formalization decision** |
| IC-16 | `verify_evidence` LFS-content-OID resolution | **RESOLVED** at audit-chain-correctness Stage 1a; gate-5 auto-resolves LFS content OIDs; **§B.6 Mode-2 Option-3 annotations RETIRED** | gate-5 evidence verification (Stage 2) — **first production consumer** |

- **`compare_captures` signature (HEAD `tools/testkit/equivalence/harness.py`):**
  `compare_captures(left: Path, right: Path, tolerance_table_path: Path | None = None) -> EquivalenceVerdict`.
  `EquivalenceVerdict{within_tolerance: bool, per_field_diff: dict[str, dict[str,
  float]], tolerance_table_used: dict}`. `per_field_diff` keys `step:<n>:<field>`
  → `{max_abs_err, max_rel_err}`. Acceptance per field: `abs_err > atol + rtol *
  scale` (scale = `max(|right field|)`) flips `within_tolerance` to `False`.
- **Category-resolution (`_resolve_tolerance`, lines 62–83):** consults
  `overrides[sim.name]` first, else `defaults[sim.category]`; **raises `KeyError`
  if `sim.category` is absent from `defaults` and no override exists.** LEFT vs
  RIGHT `sim.{category,name}` must match (else synthetic `sim:category-mismatch`
  HARD_FAIL). dtype mismatch raises `TypeError`.
- **RD-2D Stack-D port (the implementation template) at
  `packages/reaction-diffusion-2d-stack-d/`:** `pyproject.toml`, `README.md`,
  `<pkg>/{__init__, invariants, sim}.py`, `<pkg>/reference/{__init__,
  gray_scott_taichi}.py`, `tests/{__init__, conftest, test_code_verification,
  test_cross_stack_equivalence, test_determinism, test_diagnostics,
  test_pbt_invariants, test_reference_sanity}.py`. sph-water Stack-D mirrors this
  shape with `test_code_verification.py` → **golden-table tests**
  (`test_cubic_spline_kernel_golden.py` + `test_dfsph_density_golden.py`).

## 3. IC-15 candidate methodology inventory

(FACT — `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` [RD-2D
Stage 1c authored, sha256 `1df9035e…` at RD-2D close]; RD-2D landing § 9–10;
audit-chain-correctness § 11.)

The RD-2D `equivalence.md` is the IC-15 **candidate** template (5 load-bearing
sections inherited by subsequent pairs):

1. **Harness invocation pattern** — `compare_captures(left.json, right.json)`.
2. **Tolerance resolution wiring (two-taxonomy distinction)** — `sim.category`
   (physics-family) ≠ tolerance-category (numerical-method). Per-sim
   `[overrides.<sim-name>] category = "<tolerance-category>"` is **required** for
   resolution (no `[defaults.particle-fluids]` exists). RD-2D § 7 explicitly
   pre-maps: **`sph-water (particle-fluids) → sph`**.
3. **Step-horizon documentation discipline** — per-field per-frame diff table,
   pass or fail.
4. **Per-field diff witness** — `step:<n>:<field>` → `{max_abs_err, max_rel_err}`.
5. **Per-pair R-P2 disposition** — each pair documents its own chaotic-regime
   outcome; RD-2D's empirical falsification (peak `max_abs_err` 1.9e-14, ~10
   orders below 1e-4) is **NOT auto-inherited**.

RD-2D § 7 + landing § 10 + audit-chain-correctness § 11: "The IC-15 spec-template
may formalize this **after the second cross-stack pair lands**." **THIS sub-phase
IS the second cross-stack pair** → the formalization opportunity is **operative
at this sub-phase's close** (D5).

**sph-water DELTA:** RD-2D **created** its `equivalence.md` de novo. sph-water's
`docs/sim-specs/particle-fluids/sph-water/equivalence.md` **already exists** as a
Phase-1 stub (20 lines: a "Tolerance row" table [`sph` rel 1e-4 / abs 0; "No
per-sim override at Phase 1"] + a "Cross-stack scope" table ["Stack D (Taichi
port) ↔ Stack C — Not planned at Phase 1, Phase 2 cross-stack"]). Stage 1c must
**extend the existing file additively** (Convention A), not create — and update
the stale "Stack C / Not planned" framing (the actual gate-14 partner is the
Phase-1 NumPy reference, since Stack-C is unimplemented).

## 4. HEAD-verified tolerance.toml + tolerance-budget.toml

(FACT — `tools/testkit/equivalence/tolerance.toml` + `tolerance-budget.toml` at HEAD.)

- **`[defaults.sph]` = `relative = 1e-4`, `absolute = 0.0`.** (This is the
  cross-stack tolerance the gate-14 diff targets; do NOT inherit from memory —
  HEAD value.)
- **`[budgets.sph.cross_stack]` = `relative = 1e-4`, `absolute = 0.0`** — equals
  the default; an at-budget `[overrides.sph-water]` requires no budget amendment
  (Convention A / Cat-X satisfied).
- **`[overrides.reaction-diffusion-2d]`** present (RD-2D Stage 1c; `category =
  "reaction-diffusion"`; resolves `continuous-ca → reaction-diffusion`).
- **NO `[overrides.sph-water]` exists at HEAD.** This sub-phase's Stage 1c adds it
  as the **SECOND per-sim override** (`category = "sph"`; resolves `particle-fluids
  → sph`; at-budget). Because `[defaults.particle-fluids]` does not exist,
  `compare_captures` on the sph-water captures **raises `KeyError` until the
  override lands** (D6 is MANDATORY, not optional — mirrors RD-2D's Stage-1c
  "taxonomy resolution gap" shift).
- tolerance-budget.toml `[phase].phase = "sub-phase-audit-chain-correctness"` —
  Stage 0 carries over to `"sub-phase-sph-water-stack-d"`; NO budget widening.

## 5. HEAD-verified canonical capture sha256s

(FACT — `sha256sum` working-tree; `git cat-file -p HEAD:<path> | sha256sum` for
the `.json`; `git lfs ls-files` for the `.h5`.)

| File | sha256 | Notes |
|---|---|---|
| `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json` | `84dbc44892e6ab941ac9469f25ed18827b7a6db6e2611df0a63f95a392ff5865` | committed blob == working-tree == Phase-1 landing record. **NO phantom-sha drift** (committed blob already carries the trailing newline; computed via `git cat-file`, not in-memory pre-commit). |
| `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.h5` | `7590149221180f82170b41a20d14c0e197a6b3f570cfcf9307543947c5683d2f` | **LFS content OID** (`.gitattributes` line 38: `captures/**/*.h5 filter=lfs`; `git lfs ls-files` short OID `7590149221` matches). IC-16 resolves this at gate-5 → **no §B.6 annotation needed** (Mode 2 RESOLVED). |

These are the gate-14 LEFT (reference) inputs against which the Stack-D port's
canonical capture (RIGHT) is diffed.

## 6. Cross-stack non-bit-exact framing (the substantive complication)

(FACT — `determinism.md`; `sim.py` module docstring; `test_determinism.py`.)

The dispatch's framing ("DFSPH atomic-scatter ordering produces genuinely
different aggregate states across stacks even with bit-identical IC; the
algebraic-identity-across-stacks property does NOT transfer") is **directionally
correct but mis-attributed** to Phase-1 R12–R20. The accurate HEAD picture:

- **spec § 2.5 / determinism.md declare `epsilon-same-stack-same-hw` for a
  hypothetical Stack-C C++/Vulkan implementation**, because that implementation
  *would* use **atomic scatter-add in the neighbor accumulator** (both the density
  and velocity correctors), plus driver/vendor FMA fusion + Morton-sort bucket
  iteration. These are *declared epsilon-class nondeterminism sources*, not
  empirically-observed cross-stack divergences (no Stack-C exists yet).
- **The Phase-1 NumPy reference deliberately AVOIDS these** (sorted-sequential
  per-particle accumulation; no `numpy.add.at`; no parallel reductions) and
  over-achieves `bit-exact-same-stack-same-hw`.
- **For the Stack-D Taichi port, cross-stack non-bit-exactness is genuine but
  its magnitude is an IMPLEMENTATION CHOICE plus an algorithmic-sensitivity
  property:**
  - *Implementation choice (R-S2):* if the Taichi port uses `ti.atomic_add` for
    neighbor accumulation (idiomatic Taichi SPH), accumulation order differs from
    the NumPy reference's sorted-sequential order → larger per-step FP delta, and
    same-stack determinism may degrade to epsilon unless `cpu_max_num_threads=1` +
    fixed iteration order pin it. If the port mirrors sorted-sequential
    accumulation, the cross-stack delta is FP-accumulation-only.
  - *Algorithmic sensitivity (R-S1):* DFSPH's **iterative pressure solve**
    (max_iter-capped divergence-free + density correctors) can amplify small
    per-step FP differences across 1000 steps far more readily than RD-2D's
    single-pass explicit 5-point stencil. RD-2D's ~10-orders-of-margin outcome is
    therefore **explicitly NOT a safe prior** for sph-water.
- **Net:** gate-14 at the `sph` category default `relative = 1e-4` may pass
  cleanly, may approach tolerance and need step-horizon analysis, or may exceed
  tolerance and need operator routing (tolerance widening per spec § 2.6, or
  step-horizon override, or implementation debug). All three outcomes are
  in-scope; the empirical result is the load-bearing anchor and is NOT
  pre-committed.

## 7. Anchor-sketch verification (Convention M) — phase-2-plan § 2.6 + § 1.3.1

(FACT — `docs/phases/phase-2-cross-stack-replication.md`. The § 2.6 monolithic
stage-data block is SUPERSEDED as a dispatch vehicle [D1 ratified at
Taichi-integration close]; consumed here as REFERENCE only.)

| Anchor sketch (phase-2-plan) | HEAD verification |
|---|---|
| spec § 11.3 item **2.2** "SPH to Stack D (Taichi reference port)" (arch line 1993) | **VERIFIES** (FACT). The dispatch's "§ 11.3 item 2.1.<X>" is FALSIFIED (§ 9). |
| § 1.3.1 work item **2.2.D**: sph-water, source **C (per §11.2 item 1.4)** → D (Taichi), Stage 3, consumes common-py (line 304) | **VERIFIES** as the spec enumeration. Source = Stack-C (Vulkan), the *nominal* primary — see next row. |
| Source stack = "C (C++/Vulkan, the Phase 1 primary)" (§ 2.6 STAGE_HEADLINE) | **PARTIAL.** Stack-C is the *spec-designated* primary but is **unimplemented** (Phase-2+ contract per spec-ref § 5). The **actual gate-14 diff partner is the Phase-1 NumPy reference capture.** |
| IMPL_DIR `particle-fluid/sph-water/ref-stack-d/sph_water_stack_d/` | **DRIFTED.** RD-2D D6 ratified the portfolio shape `packages/<sim>-stack-d/`. → `packages/sph-water-stack-d/`. |
| SPEC_SHEET `docs/sim-specs/particle-fluid/sph-water/spec-ref-stack-d.md` | **DRIFTED** (singular `particle-fluid`). HEAD dir is plural: → `docs/sim-specs/particle-fluids/sph-water/spec-ref-stack-d.md`. |
| `captures/sph-water-stack-d/**` | VERIFIES as convention (RD-2D used `captures/reaction-diffusion-2d-stack-d/`). |
| `equivalence.md` "(create)" | **DRIFTED.** It already exists (Phase-1 stub); Stage 1c **extends** it. |
| descriptor `dam-break-1M-particles-seed42-step1000` "(or whichever Phase 1's source uses — probe)" | **DRIFTED → resolved by probe: 100K.** Phase-1 ref capture is `dam-break-100K-particles-seed42-step1000`. The capture-registry rows (arch lines 2475–2477: `ref`/`stack-d` both `1M`) reflect the spec's forward contract, not the shipped 100K. |
| EQUIVALENCE_POSTURE "epsilon same-stack (atomics → non-bit-exact), epsilon cross-stack 1e-4 relative" | **PARTIAL.** 1e-4 cross-stack VERIFIES (`[defaults.sph]`). "epsilon same-stack (atomics)" applies to Stack-C; the NumPy reference is bit-exact; the Taichi port's same-stack posture is an implementation choice (R-S2). |
| VERIFICATION_REGIME item 3 "total momentum constant within machine epsilon" | **DRIFTED.** spec-ref § 10 declares `check_momentum_conservation` **advisory** (DFSPH not strictly momentum-conserving). |
| convergence files `CHANGELOG.md, docs/project-state.md, tolerance.toml` | **DRIFTED.** HEAD convergence set is `CHANGELOG.md` + `docs/dependencies.md` + `docs/perf-ledger.md` (RD-2D § 2.9); no `project-state.md`. |
| KEY_RISKS "hash-grid temptation — do NOT add to common-py per Rule I3; inline in port" | VERIFIES; feeds R-S3 (neighbor-search inlined in the Stack-D port). |
| §2.6 "common-warp"/mutation-at-Stage-0 references | SUPERSEDED — Stack-D infra is **Taichi** (Taichi-integration), common module is **common-py**. |

## 8. D-class decision surface preview

(NOT pre-committed; surfaced for operator routing at charter close. Leans are
probe-recommended; HEAD/empirics are load-bearing.)

- **D1 — Sub-phase naming.** Lean `sub-phase-sph-water-stack-d` (Convention § C.1
  + RD-2D D1 precedent). Charter + audit-dir already use the lean. Alternatives:
  `sub-phase-sph-water-port-stack-d`. Mechanical to rename.
- **D2 — Stage 1 decomposition.** Lean 1a/1b/1c (RD-2D precedent). Stage 1b scope
  estimate is **larger than RD-2D** (DFSPH iterative solver + SPH neighbor search;
  see § 1) but still a single-sim port; decomposition holds. If Stage 0 scope
  analysis surfaces blocking wall-clock (§ 9 R-S3), revisit.
- **D3 — Cross-stack tolerance value.** **HEAD-verified `relative = 1e-4,
  absolute = 0.0`** (`[defaults.sph]`). NOT pre-committed beyond the HEAD value;
  empirics at Stage 1c decide whether at-budget holds.
- **D4 — Step-horizon.** Lean full canonical step-1000 (11 frames). If R-S1/R-S2
  surface amplification, operator routes step-horizon override at Stage 1c — NOT
  pre-committed.
- **D5 — IC-15 spec-template formalization (MOST CONSEQUENTIAL).** This sub-phase
  is the second cross-stack pair; the deferred formalization is operative.
  Dispositions: (a) formalize at Stage 2; (b) continue deferring to third pair;
  (c) partial formalization (codify the uncontested aspects; defer the R-P2
  disposition axis). **Probe lean: empirics-driven** — if gate-14 passes cleanly
  at category default across this second (and structurally different) physics
  family, (a) is well-supported; if sph-water needs widening / step-horizon
  override / a comparison-projection axis (D8), (c) is right. Surface lean +
  alternatives at charter § 11.2.
- **D6 — Per-sim tolerance.toml override.** **MANDATORY** (`KeyError` without it).
  Lean `[overrides.sph-water] category = "sph"` (at-budget; SECOND override).
- **D7 — LBM/MPM `sim_runner_diagnostic` defect.** STAYS BANKED (audit-chain-
  correctness § 11; not sph-water). No adjacency surfaced. Confirm at charter close.
- **D8 (NEW candidate) — DFSPH cross-stack comparison-projection axis.** If
  Stage 1c surfaces that position-exact per-particle comparison is the wrong
  relation for an atomic-scatter DFSPH port (e.g., per-particle *density* or
  aggregate-field comparison is more meaningful than per-particle *position*),
  the IC-15 methodology may need a "comparison-projection" axis beyond the
  current "tolerance-value" axis. **Probe cannot pre-decide** (no Stack-D capture
  exists); surfaced as a charter risk (R-S4-adjacent) + a potential D-class
  amendment if empirics demand it. Note: `compare_captures` currently diffs **all
  state fields** field-by-field (positions, velocities, densities), so the
  projection question is whether *all* fields must pass 1e-4 or whether some are
  advisory — an empirical Stage-1c finding.

## 9. Dispatch-anchor falsifications (coordinator-side Convention #8)

The dispatch mandated treating every cited value as "believe; verify at HEAD."
Three load-bearing dispatch anchors are FALSIFIED at HEAD:

| # | Dispatch assertion | HEAD reality | Impact |
|---|---|---|---|
| **F1** | "ports sph-water from its primary stack (**Stack-B WGSL** per Phase-1 deliverable)" | sph-water has **NO WGSL**. Spec primary is **Stack-C (Vulkan)** (unimplemented). The Phase-1 deliverable + gate-14 diff partner is the **Python NumPy + cKDTree + numba reference** (`stack.name="numpy-reference"`). | The cross-stack pair is **NumPy-reference ↔ Stack-D-Taichi**, not WGSL↔Taichi. Charter § 1.1 framed accordingly. |
| **F2** | "spec § 11.3 item **2.1.<X>**" | spec § 11.3 item is **2.2** ("SPH to Stack D (Taichi reference port)"); phase-2-plan work item **2.2.D**. (2.1 is RD-2D.) | Charter spec-anchor cites item 2.2 / 2.2.D. |
| **F3** | "Phase-1 R12–R20 … established that DFSPH atomic-scatter ordering produces genuinely different aggregate states across stacks" | R12–R20 are **scaling/scope remediations** (storage ceiling, OOM, Python-loop, runtime, wall-clock thresholds, 100K-vs-1M). The atomic-scatter concern is a **spec § 2.5 epsilon-class declaration for a hypothetical Stack-C**, not an R12–R20 finding, and the NumPy reference does not exhibit it. | R-S1/R-S2 re-framed (§ 6): genuine forward risk, accurately attributed. |

These are exactly the dispatch-anchor-propagation lapses banked at RD-2D Stack-D
N4 + audit-chain-correctness S1+S2; surfacing them here IS the mandated
coordinator-side discipline. None is blocking (Hard Rule 2 not triggered — the
sub-phase is structurally sound; only the framing values were mis-stated).

## 10. New plan-drafting shifts

(Cumulative entering: **125**.)

| ID | Shift |
|---|---|
| **S1 (plan-drafting)** | **Cross-stack source-stack is the Phase-1 NumPy reference, not a distinct GPU "Stack-B/C".** This is the FIRST cross-stack pair where the frozen reference partner is itself a CPU reference implementation (RD-2D's partner was a real Stack-B WGSL capture). The IC-15 methodology's "cross-stack" relation here is reference-CPU ↔ Taichi-CPU; the spec's nominal Stack-C remains a forward contract. Banked as a framing precedent for eulerian-smoke / LBM (also nominally Stack-C-sourced). |
| **S2 (plan-drafting)** | **Gate-4 is golden-table, not MMS.** First cross-stack port whose code-verification gate is golden-table-based (cubic-spline-kernel + DFSPH density-evolution). The RD-2D MMS gate-4 pattern does NOT port; the Stack-D port re-verifies the two golden tables. Establishes the golden-table gate-4 variant of the cross-stack-port template (inherited by any future particle-method port). |
| **S3 (plan-drafting)** | **`equivalence.md` pre-exists as a Phase-1 stub.** Stage 1c extends additively (Convention A) rather than creating de novo. First cross-stack port to inherit a pre-existing equivalence stub; the methodology-authoring pattern must preserve the existing tolerance-row + cross-stack-scope tables while populating the IC-15 sections. |
| **S4 (plan-drafting)** | **Canonical-descriptor scope-analysis is load-bearing, not a formality.** The NumPy reference's 1291.854 s baseline (~1390× RD-2D) makes the Phase-1 banked § 9.3(1) Stage-0 feasibility task a genuine gate: a Taichi-cpu DFSPH port at 100K × 1000 steps with iterative solves may approach the 3-hour structural alarm or the perf-ledger 2× band. Surfaced as R-S3 (scope) + a Stage-0 mandatory task. |

**Cumulative shift count at plan-drafting close: 125 + 4 = 129** entering Stage 0
(pending charter-close confirmation; see plan-drafting landing audit).

## 11. Blocking-dependency scan (Hard Rule 2)

No blocking conditions. Specifically checked:
- DFSPH atomic-scatter does NOT preclude cross-stack equivalence — the NumPy
  reference is bit-exact same-stack, and a Taichi port can mirror sorted-sequential
  accumulation; gate-14 outcome is empirical, not foreclosed.
- Taichi-DSL SPH neighbor-iteration handling is a **Stage-0 empirical question**
  (R-S3), not a known blocker; the KEY_RISK "inline hash-grid in the port" (not
  common-py) is a known-good pattern.
- `[defaults.sph]` exists at the expected `1e-4`; the only gap (`KeyError` without
  `[overrides.sph-water]`) is the designed D6 Stage-1c deliverable, caught early by
  R-S5.

**Probe verdict: PROBE-COMPLETE.** Charter is dispatchable subject to D1–D8 routing.
