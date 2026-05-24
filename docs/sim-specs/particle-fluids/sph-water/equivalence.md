# sph-water — Cross-stack equivalence

## Tolerance row

Category `sph` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-4` |
| `absolute` | `0.0` |

Per-sim override added at sub-phase-sph-water-stack-d Stage 1c:
`[overrides.sph-water] category = "sph"` — resolves `sim.category="particle-fluids"`
(physics-family) to tolerance-category `sph` (numerical-method). **At-budget** per
`[budgets.sph.cross_stack]` (`relative = 1e-4`); NOT a widening (spec § 2.6).

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| NumPy-reference (CPU) ↔ Stack-D Taichi (CPU) | **Verified — gate 14 GREEN** (Stage 1c) | Phase 2 cross-stack |
| Stack-C (Vulkan) self-replicates | Not yet exercised (unimplemented) | Phase 2+ |

> The spec-designated Stack-C (Vulkan) primary is unimplemented; the **frozen
> diff partner is the Phase-1 NumPy-reference capture** (`stack.name="numpy-reference"`;
> scipy.cKDTree + numba). The relevant equivalence relation is reference-CPU ↔
> Taichi-CPU — a different arithmetic backend + neighbor-accumulation primitive.
> (The Phase-1 stub's "Stack D ↔ Stack C / Not planned" framing is superseded.)

---

# Cross-Stack Equivalence — IC-15 candidate methodology (Stage 1c)

> The SECOND per-sim cross-stack port (after `reaction-diffusion-2d-stack-d`).
> Mirrors that pair's IC-15 candidate methodology, with the **S6 calibration**
> (§ 6) specific to sph-water's actually-implemented trajectory.

## 1. The cross-stack pair

- **LEFT (reference):** `captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.{json,h5}`
  — Phase-1 NumPy reference (`numpy-reference`; sealed). `.json` sha256
  `84dbc448…ff5865`; `.h5` LFS content OID `7590149221…83d2f`.
- **RIGHT (port):** `captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.{json,h5}`
  — Stack-D Taichi-DSL CPU port (`taichi-stack-d`). `.json` sha256 `4027f89c…ecf7`;
  `.h5` LFS content OID `8435f166…1678b`.
- Both share `sim.{category="particle-fluids", name="sph-water",
  variant="dfsph-bender-koschier-2015"}`, `dims=[100000, 3]`, `dtype=f64`,
  11 frames (steps 0, 100, …, 1000), fields `{position, velocity, density}`.

## 2. Harness invocation pattern

```python
from pathlib import Path
from equivalence.harness import compare_captures
verdict = compare_captures(
    Path("captures/sph-water-ref/dam-break-100K-particles-seed42-step1000.json"),    # LEFT
    Path("captures/sph-water-stack-d/dam-break-100K-particles-seed42-step1000.json"), # RIGHT
)
# verdict.within_tolerance: bool
# verdict.per_field_diff: {"step:<n>:<field>": {"max_abs_err", "max_rel_err"}}
# verdict.tolerance_table_used: {"category", "relative", "absolute", "path"}
```

`compare_captures` pulls `sim.{category,name}` from the LEFT manifest, requires the
RIGHT manifest to agree, then resolves tolerance and diffs every captured frame ×
every state field. Acceptance: `abs_err > atol + rtol·scale` (scale =
`max(|right field|)`) flips `within_tolerance` to `False`.

## 3. Tolerance resolution wiring (two-taxonomy distinction)

`sim.category` is a **physics-family** taxonomy (`particle-fluids`); the tolerance
table is keyed by **numerical-method** taxonomy (`sph`). There is no
`[defaults.particle-fluids]`, so resolution requires the per-sim override
`[overrides.sph-water] category = "sph"` → maps to `[defaults.sph]`
(`relative = 1e-4, absolute = 0.0`). **Without the override, `compare_captures`
raises `KeyError` on `particle-fluids`** (empirically confirmed at Stage-0 Task 0.4;
the D6-MANDATORY routing). The override is **at-budget** (`[budgets.sph.cross_stack]
= 1e-4`) — resolution wiring, not a widening. Cross-stack content-equivalence at
`1e-4` is the spec § 2.6 relaxation of the IC-13 same-stack zero-tolerance contract.

## 4. Step-horizon documentation discipline

The diff is reported at every captured frame (11 frames, step-100 intervals, full
canonical step-1000 horizon — D4) per field. **No step approaches `1e-4`.** The
density `max_rel_err` is flat at ~`1.4e-15` across the full horizon (range
`1.31e-15`–`1.59e-15`) — the small per-frame variation is FP-accumulation-order
noise, **NOT amplification**. Because every particle shares the same gravity-only
`v_z`, the cloud free-falls **rigidly** (relative positions invariant → SPH density
static), so there is no chaotic-regime growth across the horizon (contrast the R-P2
concern, dissolved per § 6).

## 5. Per-field diff witness (gate-14 GREEN, full canonical horizon)

`within_tolerance = True`; resolved tolerance `{category: sph, relative: 1e-4,
absolute: 0.0}`. Step-horizon roll-up (max over all 11 frames):

| Field | max_abs_err | max_rel_err | vs target (rel ≤ 1e-4) |
|---|---|---|---|
| `position` | `0.0` | `0.0` | bit-identical |
| `velocity` | `0.0` | `0.0` | bit-identical |
| `density` | `2.557954e-13` | `1.585292e-15` | ~11 orders of margin |

Per-frame density `max_rel_err`: step 0 `1.59e-15`; steps 100–1000 in
`[1.31e-15, 1.44e-15]`. Position + velocity are `0.0` at **every** frame.

## 6. R-S1 / R-S2 / R-P2 disposition (S6 calibration — sph-water-specific)

The Phase-1 reference **trajectory** is explicit (semi-implicit) Euler free-fall
under gravity, with the SPH continuity computed as a **discarded per-step
side-effect** (`packages/sph-water/sph_water/sim.py` `_canonical_step`); there is
**no iterative DFSPH pressure solve in the capture-producing path** (the iterative
`divergence_free_solve` exists only for the gate-4b golden). Consequences:

- **R-S1 (cross-stack amplification) — does not arise.** The
  algebraic-identity-across-stacks property *holds* for sph-water as implemented:
  position + velocity are bit-identical (the explicit-Euler update is FP-order-
  independent + the IC is the identical NumPy `default_rng(42)`).
- **R-S2 (atomic-scatter ordering) — irrelevant here.** The trajectory uses no
  iterative pressure scatter; the Stack-D port's `ti.atomic_add` is only the
  serialised spatial-hash counter (`cpu_max_num_threads=1`), not an epsilon source.
- **R-P2 (chaotic-regime divergence) — dissolves.** No iterative solver → no
  amplification across step-1000. The only cross-stack delta is the FP-accumulation
  order of the SPH density sum (Taichi 27-cell spatial-hash vs numba sorted-pair):
  `~1.4e-15` relative, static across the horizon.

This is the same FP-round-off-scale outcome RD-2D Stack-D recorded — both at the
**algebraically-identical-trajectory regime**.

## 7. Methodology precedent for subsequent cross-stack pairs (IC-15 candidate)

This is the **second** cross-stack pair. The IC-15 candidate methodology
(per-particle/per-cell **position-exact comparison** + category-default tolerance +
per-frame diff witness + per-sim `tolerance.toml` override) now validates across
**two physics families** (continuous-ca + particle-fluids). **S6 calibration
(banked for D5 Stage 2 routing):** both validations are at the
algebraically-identical-trajectory regime where the cross-stack diff stays at
FP-round-off scale. The methodology has **NOT** been stress-tested where cross-stack
equivalence is structurally non-trivial — iterative solvers, atomic-scatter,
chaotic amplification, or lattice-velocity quantization. **D8 comparison-projection
axis:** not needed for this pair (position-exact at 1e-4 passes with ~11 orders of
margin). A third pair at a non-trivial regime may surface it.

**Banked methodology-precedent (S6):** plan-drafting probes for cross-stack ports
MUST read the Phase-1 `sim.py` *implementation* (not just the spec sheet /
`algebraic.md`) to understand what behaviour the cross-stack port actually
validates — the sph-water charter's R-S1/R-S2 framing assumed an iterative DFSPH
trajectory the Phase-1 reference does not use.

## References

- `docs/architecture.md` § 2.5 (IC-13 content-equivalence), § 2.6 (cross-stack
  tolerance table).
- `tools/testkit/equivalence/harness.py` (`compare_captures`).
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (first
  cross-stack pair; IC-15 candidate template).
- Stage 1c witness: `docs/_audits/phase-2/sub-phase-sph-water-stack-d/stage-1c-evidence/`.
