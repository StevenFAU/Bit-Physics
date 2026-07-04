---
date: 2026-07-04
author: p6-fpedge-landing (main build session; user-dispatched from the web-port discovery chip)
phase: 6
artifact: discovery-and-remediation landing report
artifact_id: p6-fpedge-discovery-landing
subject: >
  P6-FPEDGE — the eulerian-smoke semi-Lagrangian periodic wrap guarded the
  np.mod FP edge on the integer index but not the interpolation fraction
  (fx = N, a ×N bilinear extrapolation), firing IN f64 on the committed 2D
  lid-shear canonical's own IC. Fix landed in the NumPy reference + the
  Stack-D Taichi and Stack-E Warp ports; all three 2D canonicals regenerated;
  gate-14 re-established (Stack-E bit-exact again, Stack-D 1.4e-16); the 2D
  "chaotic-regime escape-hatch" story is RE-ATTRIBUTED to this bug; the 3D
  canonical measured edge-CLEAN (0 events over the full 500-step replay,
  bit-exact) — its blow-up is the separate explicit-diffusion CFL violation.
verdict: LANDED
verdict-state: GREEN
head_sha: (this commit)
evidence_hashes:
  "captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.h5": "sha256:6ae7c981aea0b90a4a01a71cda1081b79a051bfe7cfafce87cda99cf96c6c41a"
  "captures/eulerian-smoke-stack-d/lid-driven-cavity-128sq-re100-seed42-step1000.h5": "sha256:6fe0c997eca4e88541b16877ed5f77e5c62673184797df27a2176694f854fad8"
  "captures/eulerian-smoke-stack-e/lid-driven-cavity-128sq-re100-seed42-step1000.h5": "sha256:d04cf0b4f362b449ad8c4b3137a4e31d385d8b2e6b8665bd3e5395db5d7ee017"
evidence-paths:
  - "packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py (the fixed reference)"
  - "packages/eulerian-smoke-stack-d/eulerian_smoke_stack_d/reference/stable_fluids_taichi.py"
  - "packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/reference/stable_fluids_warp.py"
  - "packages/eulerian-smoke-stack-d/tests/test_cross_stack_equivalence.py (re-anchored)"
  - "captures/eulerian-smoke-ref/lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}"
  - "captures/eulerian-smoke-stack-d/lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}"
  - "captures/eulerian-smoke-stack-e/lid-driven-cavity-128sq-re100-seed42-step1000.{h5,json}"
  - "docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md (P6-FPEDGE addendum)"
  - "docs/perf-ledger.md (three regeneration rows)"
  - "packages/eulerian-smoke/web/verification-demo-spec.md (§ 11 v0.3 — the discovery record)"
---

# P6-FPEDGE — FP-edge fraction bug: discovery, fix, re-attribution

> **Provenance.** Discovered by the Phase-6 web-port work
> (`packages/eulerian-smoke/web/verification-demo-spec.md` § 11 v0.3): the
> measurement-first protocol (measure f32-vs-f64 drift BEFORE porting) found the
> committed 2D canonical unreachable by any correct port, and root-caused why.
> This landing executes the remediation the discovery chip specified.

## § 1. The bug (FACT, measured)

`semi_lagrangian_advect_2d` / `semi_lagrangian_advect_3d` wrap backtraced
coordinates with `np.mod`, which returns **exactly N** for tiny negative inputs
(`np.mod(-1e-17, 128.0) == 128.0` — documented in the function's own
docstring). The Phase-1 guard re-applied an integer modulus to the derived
index `i0` but left the interpolation fraction `fx = x_back - i0` equal to
**N = 128.0** — turning the bilinear interpolation into a **×128
extrapolation**.

On the 2D canonical's own IC (`u = 0.5·(1 + tanh((y - 0.95)/0.02))`, where
`1 + tanh(-17.5) ≈ 1.22e-15 ≠ 0` puts backtraces at `-7.7e-17`), measured
in f64:

- **10 cells** fire `fx = 128.0` at the **first** advection;
- `max|u|` reaches **≈ 12270 by step 3**, decaying to ~95 by step 10;
- the committed capture bit-exactly fingerprints this contaminated trajectory
  (replay verified before the fix). Contaminated payload sha256, retained here
  and in the phase-1/2 append-only ledger as the historical record:
  `sha256:e13b0d052489ed365ccc929873138251c46875e4e568d1ffd8a997bf43123ceb`.

With the fraction guarded, the true trajectory is a **quiet diffusive
shear-layer decay**: `max|vel| ≤ 0.98` over all 1000 steps, and the reference
`v` field stays at exactly-zero scale (~1e-17) — the symmetric IC has no
perturbation for Kelvin-Helmholtz growth in f64.

## § 2. The fix (three implementations, one semantics)

Wrap the **coordinate** to `0.0` when the modulus rounds to N — the limit the
intended semantics compute; index and fraction are then consistent by
construction. Identical on every non-edge input.

- NumPy reference: `packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py:167`
  (2D) and `packages/eulerian-smoke/eulerian_smoke/reference/stable_fluids.py:389` (3D).
- Stack-E Warp: inside `_pmod`
  (`packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/reference/stable_fluids_warp.py:85`),
  covering both 2D and 3D call sites.
- Stack-D Taichi: after each inline floored-mod wrap
  (`packages/eulerian-smoke-stack-d/eulerian_smoke_stack_d/reference/stable_fluids_taichi.py:154`
  and `packages/eulerian-smoke-stack-d/eulerian_smoke_stack_d/reference/stable_fluids_taichi.py:200`).
- The Phase-6 WGSL browser port shipped fraction-guarded from day one
  (`packages/eulerian-smoke/src/stable_fluids_2d.wgsl`).

The `canonical_params_2d` dt-comment's "lid-shear-layer vortex CFL exceedance"
attribution for the dt=0.005 instability is corrected in place: measured with
the guard, dt=0.005 still blows up at step ~9 because it violates the
**explicit-diffusion** bound (`ν·dt/dx² ≈ 0.82 > 0.25`) — a real, different
mechanism.

## § 3. Regenerations + re-established gate-14 (MEASURED)

All three 2D canonicals regenerated by their own committed runners
(`sim_runner_seeded_2d`); manifests carry the new payload sha256s (front-matter
above). Post-fix `compare_captures` at the unchanged `smoke`/rel=1e-4 row:

| Pair (2D) | worst max_abs_err | within_tolerance | reading |
|---|---|---|---|
| reference ↔ stack-e (Warp) | **0.0** (all fields, all 11 frames) | **True** | the § E bit-exact witness form HOLDS on the clean trajectory |
| reference ↔ stack-d (Taichi) | **1.388e-16** | False | near machine epsilon; False survives ONLY as the v≈0 relative-criterion degeneracy (reference `v` scale ~1e-17 → threshold ~1e-20) |

The Stack-D gate-14 test is re-anchored to assert the post-fix reality
(faithful port ≤ 1e-12 + wiring intact + the degeneracy documented) —
`packages/eulerian-smoke-stack-d/tests/test_cross_stack_equivalence.py`. The
2D **chaotic-regime escape-hatch narrative is retired**; the escape-hatch
methodology itself is untouched (the 3D case below remains a genuine
member of that class).

Test suites, all GREEN post-fix: `eulerian-smoke` 10/10 (MMS gate-5 observed
p≈2 unchanged; PBT invariants; determinism), `eulerian-smoke-stack-d` 15+1skip,
`eulerian-smoke-stack-e` 16+1skip, `eulerian-smoke-neural` 9/9,
`eulerian-smoke-diff` 18/18 (second-order consumers unaffected — their scenes
are edge-dormant). Frontier packages import nothing from these modules.

## § 4. The 3D canonical: edge-CLEAN, blow-up re-confirmed as parameter-level (MEASURED)

An instrumented full-horizon replay of `taylor-green-128cube-seed42-step500`
(original fraction semantics + per-axis edge counting) measured:

- **0 edge events** across all 500 steps × 3 velocity advections + density;
- replay **bit-exact** vs the committed capture at steps 50/250/500.

So the 3D canonical is NOT contaminated by this bug and remains valid as a
determinism fingerprint; the fixed code reproduces it bit-exactly (the guard
never triggers on this trajectory). Its documented blow-up (`max|u| → ~5e19`)
is the **explicit-diffusion CFL violation** (`ν·dt/dx² ≈ 0.82`, 7-point bound
~1/6) — a parameter-level defect of the canonical configuration, previously
Option-2-routed, NOT resolved here. Re-parameterizing the 3D canonical (dt
into the stable region ⇒ new 738 MB capture + LFS dual-push + Stack-D/E
re-capture) is an **operator decision**, banked.

## § 5. Downstream consumers (swept)

- **Historical audits** (phase-1/phase-2 landing + LFS-migration reports)
  embedding the old sha `e13b0d05…`: append-only, retained; this audit
  supersedes their canonical-state claims.
- **`docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md`**: P6-FPEDGE
  addendum inserted; § 2–§ 5's 2D rows marked historical; § E extended with the
  post-regen bit-exact row.
- **`docs/perf-ledger.md`**: three regeneration rows appended (numpy 5.439s,
  taichi 9.382s, warp 8.777s — warp's +49% includes first-run kernel-cache
  compile; flagged per the >10% rule).
- **Phase-6 web demo** (`packages/eulerian-smoke/web/`): gate unaffected by
  construction (binds to the Taylor-Green scene, proven edge-dormant — the
  extractor sentinel + the fact the regenerated TG asset sha is byte-identical
  pre/post fix). Its data spine and post-mortem panel are refreshed in this
  same stack to report the fix as LANDED. A future `capture_roundtrip`
  re-point at the regenerated 2D canonical is now MEASURED viable on u/density
  (f32 tracks at 1.7e-7 / 1.7e-5) but requires an absolute-term tolerance
  amendment for the v≈0 degeneracy (~abs 1e-6) — operator-gated per
  architecture § 2.6, banked.
- **`tools/productization/web-deploy/verify.py`** `_gate_eulerian_smoke` note
  text updated from "fix filed" to "fix landed".

## § 6. Honest scope notes

- The 2026-05-24 Stack-D HARD-RULE-2 finding ("this 2D canonical is numerically
  UNSTABLE — Kelvin-Helmholtz") was adjudicated in good faith on the
  contaminated trajectory; the R-P2 Option-2 routing decision it produced was
  correct *given the evidence available*. This audit re-attributes the 2D
  mechanism; the 3D member of that finding stands (different mechanism).
- The chaotic-regime cross-stack methodology template authored on this pair
  (`docs/sim-specs/volumetric-grid/eulerian-smoke/equivalence.md`) loses its 2D
  exemplar but keeps its 3D one; future template consumers should cite the 3D
  case.
