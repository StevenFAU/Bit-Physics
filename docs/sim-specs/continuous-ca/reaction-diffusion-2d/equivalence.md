# Reaction-Diffusion-2D — Cross-Stack Equivalence

> **Status:** authored at `sub-phase-reaction-diffusion-2d-stack-d` Stage 1c (gate 14).
> **Pair:** Stack-B (TypeScript / WGSL / WebGPU; Phase-0 Block-8 frozen reference) ↔ Stack-D (Python / Taichi-DSL / CPU; this sub-phase's port).
> **Verdict:** `within_tolerance == True` at `relative = 1e-4, absolute = 0.0`.
> **Scope (D5 partial scope-in):** this is the **FIRST true matching-sim cross-stack invocation in the portfolio**. This file is the methodology-template (IC-15 candidate) inherited by the 7 subsequent cross-stack port sub-phases. Full methodology consolidation defers to the second cross-stack pair (charter § 11.2).

This document covers, for the Stack-B↔Stack-D reaction-diffusion-2d pair: (1) the harness invocation pattern, (2) tolerance resolution wiring, (3) step-horizon documentation discipline, (4) the per-field diff witness, and (5) the R-P2 empirical disposition. It is the cross-stack companion to the Stack-B `spec-ref.md` and the Stack-D `spec-ref-stack-d.md` (both § 9 declare the `relative = 1e-4` posture).

---

## 1. The cross-stack pair

Both stacks emit a canonical capture at the locked descriptor
`gray-scott-lambda-128sq-seed42-step2000` — Gray-Scott λ-region
(`F=0.0367, k=0.0649, D_u=0.16, D_v=0.08`), 128² grid, `seed=42`, 2000
steps, capture interval 200 → **11 frames** (steps 0, 200, …, 2000),
state fields **U** and **V** (`float64`).

| Stack | Capture | Build |
|---|---|---|
| Stack-B (WGSL/WebGPU, Phase-0 frozen) | `captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` | `numpy-reference` / `phase-0` |
| Stack-D (Taichi-DSL/CPU, this port) | `captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.{h5,json}` | `taichi-cpu` / `stack-d` |

The two captures' raw-file `sha256`s differ (expected): cross-stack
equivalence is **content-equivalent at 1e-4**, not raw-byte-equal. The
WGSL backend (8×8 workgroups) and the Taichi-DSL/CPU backend (serial
`ti.ndrange`) use different FP-accumulation orders in the 5-point
Laplacian and reaction terms; IEEE-754 double addition is associative in
reals but not in floating point, so the per-cell sums differ at
round-off scale.

---

## 2. Harness invocation pattern

The harness is `tools/testkit/equivalence/harness.py::compare_captures`:

```python
from pathlib import Path
from equivalence.harness import compare_captures

verdict = compare_captures(
    Path("captures/reaction-diffusion-2d-ref/gray-scott-lambda-128sq-seed42-step2000.json"),
    Path("captures/reaction-diffusion-2d-stack-d/gray-scott-lambda-128sq-seed42-step2000.json"),
    # tolerance_table_path defaults to tools/testkit/equivalence/tolerance.toml
)
```

Signature: `compare_captures(left: Path, right: Path, tolerance_table_path: Path | None = None) -> EquivalenceVerdict`.
It reads the two `.json` manifests (and their `.h5` payloads via
`capture.load_capture`), resolves the tolerance for the LEFT manifest's
`sim`, and diffs field-by-field at every shared step.

`EquivalenceVerdict` fields:

| Field | Type | Meaning |
|---|---|---|
| `within_tolerance` | `bool` | gate-14 acceptance is `True` |
| `per_field_diff` | `dict[str, dict[str, float]]` | key `step:<n>:<field>` → `{max_abs_err, max_rel_err}` |
| `tolerance_table_used` | `dict` | resolved `{category, relative, absolute, path}` |

The acceptance criterion is `abs_err > absolute + relative * scale`
(per field, where `scale = max(|right field|)`); any field exceeding it
flips `within_tolerance` to `False`. **Gate-14 acceptance is
`within_tolerance == True`, NOT raw-byte-equality** (which is
structurally impossible across WGSL and Taichi-DSL).

The LEFT manifest's `sim.{category,name}` must equal the RIGHT's; a
mismatch returns a synthetic `sim:category-mismatch` entry. A step-set
mismatch returns `step:set-mismatch`. Both manifests here carry
`sim = {category: "continuous-ca", name: "reaction-diffusion-2d", variant: "gray-scott"}`.

---

## 3. Tolerance resolution wiring (two-taxonomy distinction)

This is the load-bearing methodology point established by this first
cross-stack pair.

There are **two distinct taxonomies**, and they are intentionally kept
distinct:

- **`sim.category` — physics-family taxonomy.** Recorded in the capture
  manifest. For reaction-diffusion-2d this is `continuous-ca` ("this is
  a continuous cellular automaton"). It describes *what kind of system*
  the sim is.
- **tolerance-category — numerical-method-family taxonomy.** The keys of
  `[defaults.*]` in `tolerance.toml` (`reaction-diffusion`,
  `closed_form`, `sph`, `mpm`, `smoke`, `lbm`). It describes *what
  FP-sensitivity regime* the sim's numerical method falls into, which is
  what actually correlates with cross-stack FP behavior.

These two taxonomies do **not** coincide. No sim's `sim.category` equals
any `tolerance.toml` default key portfolio-wide. The architecture keys
tolerance defaults on the numerical-method taxonomy on purpose: two sims
in the same physics family can use different numerical methods with
different FP-sensitivity regimes.

**Resolution mechanism:** a cross-stack-equivalence-tested sim declares a
per-sim `[overrides.<sim-name>]` entry in `tolerance.toml` whose
`category` field names the tolerance-category it inherits. The harness's
`_resolve_tolerance` consults `overrides[sim.name]` first, then falls
back to `defaults[sim.category]`. Because `defaults` has no
`continuous-ca` key, the override is **required** for the harness to
resolve a tolerance at all (absent it, `compare_captures` raises
`KeyError`).

For this pair (`tools/testkit/equivalence/tolerance.toml`):

```toml
[overrides.reaction-diffusion-2d]
category = "reaction-diffusion"   # -> [defaults.reaction-diffusion]: relative=1e-4, absolute=0.0
```

This override is **at-budget resolution wiring**, not a tolerance
widening:

- It inherits `relative = 1e-4, absolute = 0.0` from
  `[defaults.reaction-diffusion]` (it sets no `relative`/`absolute` of
  its own).
- `1e-4` equals the cap in `tolerance-budget.toml`
  `[budgets.reaction-diffusion.cross_stack]`, so the integrity Cat-X
  check passes; no `tolerance-budget.toml` amendment is required.
- The spec § 2.6 separate-operator-approval widening mechanism is **not**
  invoked.

An override may instead carry an explicit wider `relative`/`absolute`
(a routed tolerance widening); that path requires separate operator
approval per spec § 2.6 + a `tolerance-budget.toml` amendment commit if
it exceeds the budget cap. **RD-2D Stack-D establishes the
at-budget-resolution-wiring precedent**, distinct from the
routed-widening path.

---

## 4. Step-horizon documentation discipline

The cross-stack diff is reported **per field (U, V) at each of the 11
captured frames** (200-step resolution). The step-horizon analysis
identifies the step at which the cross-stack diff approaches or exceeds
the tolerance — this is documented **regardless of pass/fail**, because
it is banked data for subsequent cross-stack pairs' tolerance routing.

For this pair the diff never approaches `1e-4` at any horizon (§ 6); the
"step at which the diff approaches/exceeds 1e-4" is **never within the
2000-step horizon** — the peak is ~5×10⁹ below tolerance.

---

## 5. Per-field diff witness

(FACT — `compare_captures` against HEAD `tolerance.toml`; Stage 1c
evidence `stage-1c-evidence/gate-14-cross-stack-harness-2026-05-23T20-53-53Z.txt`.
Resolved tolerance: `category=reaction-diffusion, relative=1e-4, absolute=0.0`.)

| step | U max_abs_err | U max_rel_err | V max_abs_err | V max_rel_err |
|---|---|---|---|---|
| 0    | 0.000000e+00 | 0.000000e+00 | 0.000000e+00 | 0.000000e+00 |
| 200  | 6.661338e-16 | 1.297690e-15 | 5.273559e-16 | 5.423365e-15 |
| 400  | 8.881784e-16 | 1.786274e-15 | 6.938894e-16 | 5.638413e-15 |
| 600  | 1.776357e-15 | 3.159543e-15 | 1.360023e-15 | 1.103427e-14 |
| 800  | 2.331468e-15 | 4.488092e-15 | 1.887379e-15 | 1.515314e-14 |
| 1000 | 2.664535e-15 | 5.279403e-15 | 2.109424e-15 | 1.693436e-14 |
| 1200 | 6.106227e-15 | 1.187523e-14 | 5.107026e-15 | 3.585036e-14 |
| 1400 | 1.465494e-14 | 2.998018e-14 | 1.182388e-14 | 8.994185e-14 |
| 1600 | **1.898481e-14** | 3.051906e-14 | 1.221245e-14 | **1.246518e-13** |
| 1800 | 1.143530e-14 | 2.270126e-14 | 8.937295e-15 | 7.105501e-14 |
| 2000 | 1.132427e-14 | 2.098539e-14 | 8.798517e-15 | 7.176378e-14 |

- **Step 0: bit-identical** (abs = 0, rel = 0) for both U and V. This
  confirms the NumPy-seeded initial condition is *identical* across the
  two stacks (P27 cause #1 — "different IC perturbation across stacks" —
  is ruled out for this pair).
- **Peak `max_abs_err` = 1.898481e-14** at step 1600 (U).
- **Peak `max_rel_err` = 1.246518e-13** at step 1600 (V).
- The diff grows roughly monotonically from 0 (step 0) to a peak near
  step 1600, then recedes slightly (steps 1800, 2000). It stays at
  **FP-round-off scale (~10⁻¹⁴)** through the full step-2000 horizon.
- **Margin against tolerance:** peak `max_abs_err` (~1.9×10⁻¹⁴) is ~5×10⁹
  below the `1e-4` relative tolerance.

---

## 6. R-P2 empirical disposition

The charter's R-P2 risk (charter § 9) hypothesized that the Gray-Scott
λ-region chaotic regime could amplify small cross-stack FP differences
across the 2000-step horizon toward the `1e-4` tolerance limit.

**For this cross-stack pair the R-P2 hypothesis is empirically
falsified.** The cross-stack diff remains at FP-round-off scale (peak
~1.9×10⁻¹⁴) through step 2000 and does not amplify toward tolerance.
The Stage-1b algebraic argument is confirmed empirically: a
NumPy-bit-identical initial condition (step 0 diff = 0) plus an
algebraically-identical forward-Euler + 5-point-Laplacian + reaction
update means only the FP-accumulation primitives differ
(WGSL workgroup-order vs Taichi serial-`ndrange`), and that difference
stays at round-off scale rather than compounding into chaotic divergence
at this horizon.

**This disposition is NOT inherited automatically by future cross-stack
pairs.** Each pair runs its own step-horizon analysis and documents its
own R-P2 outcome. A pair whose stacks do *not* share a bit-identical IC,
or whose numerical method is more FP-sensitive, may legitimately approach
or exceed tolerance at long horizons; that pair routes per spec § 2.6
(tolerance amendment) or via a step-horizon override.

---

## 7. Methodology precedent for subsequent cross-stack pairs (IC-15 candidate)

The pattern established here is uniform and inherited by the remaining
Stack-D / Stack-E cross-stack port sub-phases:

1. **Per-sim override.** Each cross-stack-tested sim adds a
   `[overrides.<sim-name>] category = "<tolerance-category>"` entry to
   `tolerance.toml` as part of its Stage 1c (resolution wiring). Map the
   physics-family `sim.category` to its numerical-method tolerance-category:
   - `sph-water` (`particle-fluids`) → `sph`
   - `eulerian-smoke` (`volumetric-grid`) → `smoke`
   - `lattice-boltzmann-d3q19` (`lattice`) → `lbm`
2. **At-budget vs routed-widening.** Default to at-budget resolution
   wiring (inherit the default tolerance). Only carry an explicit wider
   bound if gate-14 mechanically fails at the default AND the operator
   routes a widening per spec § 2.6.
3. **Step-horizon witness.** Always emit the per-field per-frame diff
   table (§ 5) and the step-horizon analysis (§ 4), pass or fail.
4. **Per-pair R-P2.** Document each pair's own chaotic-regime disposition
   (§ 6); do not assume this pair's favorable outcome.

The IC-15 spec-template may formalize this after the second cross-stack
pair lands (charter § 11.2 D5 full-consolidation defer).

---

## Stack-C (Vulkan / C++) bit-exactness witness

> **Pair:** Phase-1 NumPy f64 reference (`numpy-reference` / `phase-0`) ↔ Stack-C
> (Vulkan compute / C++ / lavapipe f64; `cpp` / `stage-1b`). 8th and final spec
> § 11.3 port; FIRST Stack-C (Vulkan/C++) port. **Verdict:** `within_tolerance == True`
> at `relative = 1e-4, absolute = 0.0`, with `max_abs_err == 0.0` (BIT-EXACT).

Added by `sub-phase-reaction-diffusion-2d-stack-c` Stage 1c. The Stack-B↔Stack-D
sections (§§ 1–7) are untouched; this section is additive.

### C.1 The pair + verdict

`compare_captures(LEFT = reaction-diffusion-2d-ref, RIGHT =
reaction-diffusion-2d-stack-c, tolerance.toml)` →
`within_tolerance == True`, peak `max_abs_err == 0.0`, peak `max_rel_err == 0.0`
across all 22 field entries (11 captured frames × {U, V} at steps 0, 200, …,
2000). The Stack-C Vulkan/C++ f64 trajectory is **byte-identical** to the sealed
NumPy f64 reference through the full canonical horizon (128² × 2000 steps).
Resolved tolerance: `reaction-diffusion` / `1e-4` via the **reused**
`[overrides.reaction-diffusion-2d]` (D17 verify-only no-op — the 4th port to skip
the override edit after MPM-E + smoke-E + LBM-E).

### C.2 Posture + the §6.8 backend pair

f64 (`require_float64`) + NoContraction (`precise` → SPIR-V `NoContraction`;
Q-CPP1), on Mesa lavapipe (LLVM 20.1.2; element-wise no-atomics → Q-CPP3
thread-invariant). This is the **first empirical data point for the Vulkan/C++
f64 ↔ NumPy f64 backend pair** (methodology § 6.8): established independently —
it does NOT inherit the Warp-CPU-f64 ↔ NumPy bit-faithfulness. When NumPy's
operation order + numerical primitives are preserved and FMA contraction is
disabled, lavapipe's IEEE-754 RTE f64 reproduces NumPy's f64 results bit-for-bit.
FloatControls is asserted only for f32 (RTE + signed-zero/inf/nan; Q-CPP2/D16);
the f64 path relies on lavapipe's inherent IEEE-754 f64 + NoContraction (the
step-1 measurement at the plan-drafting-refresh probe was already `0.0`).

### C.3 Within-sim cross-backend contrast

For the SAME RD-2D canonical, Stack-D (Taichi-DSL / CPU) is shape (b) — peak
`max_abs_err ≈ 1.9 × 10⁻¹⁴` (§ 5), within tolerance but NOT bit-exact — while
Stack-C (Vulkan/C++ f64) is `0.0`. The (bit-exact vs round-off) split is a
property of the **backend-pair arithmetic faithfulness**, not of the trajectory:
RD-2D is bounded/dissipative pattern-forming (no positive-Lyapunov amplification;
the § 6 R-P2 escape-hatch is empirically disengaged for this sim on both pairs).
This mirrors the LBM Stack-D (~6e-15) vs Stack-E Warp (0.0) within-sim contrast.

### C.4 Faithfulness boundary — IC sourcing (S1b-RD2C1)

The cross-stack test isolates the **stepping kernel** (the unit under test). The
Phase-1 IC is a seeded NumPy PCG64 draw — a NumPy-RNG artifact, not part of the
ported dynamics — and the Vulkan/C++ backend does not reproduce NumPy's PCG64.
The port therefore consumes the reference's step-0 (U, V) via `load_reference_ic`
and evolves it: frame 0 matches by construction, and frames 1…2000 are the
genuine cross-stack dynamics witness. (Stack-D shares NumPy's RNG and regenerates
the IC trivially; the Vulkan/C++ backend has no such luxury.)

### C.5 File-checksum vs dataset-equivalence (S1b-RD2C2)

The Stack-C `.h5` FILE checksum (`00081dc42b…`) differs from the reference
(`bcae544ae5…`) even though the **state datasets** U, V are byte-identical — HDF5
container metadata + the `mass_U`/`mass_V` diagnostics differ (the port accumulates
naively; the reference's `np.sum` is pairwise, a ~1e-13 difference). `compare_captures`
compares DATASETS, not raw file bytes (consistent with § 2: "gate-14 acceptance is
`within_tolerance == True`, NOT raw-byte-equality"), so the bit-exact state verdict
holds and the diagnostics delta is far within `1e-4`.

### C.6 gate-4 (MMS) + distinct provenance

gate-4 (Cat 3 code verification) is MMS single-arm for RD-2D (no closed-form
golden table): the manufactured-source kernel variant over the 4-grid ladder
N ∈ {16, 32, 64, 128} at `t_final = 0.05` yields an observed L2 spatial order of
**2.0008** (within ±0.5 of the formal 2.0 for the 5-point Laplacian; manufactured
solution at `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/`).
Distinct provenance: NumPy reference `.h5` oid `bcae544ae5…` (`numpy-reference`/`phase-0`)
vs Stack-C `.h5` oid `00081dc42b…` (`cpp`/`stage-1b`) — independent producers, identical state.

---

## References

- `docs/architecture.md` § 2.5 (content-equivalent contract; IC-13), § 2.6
  (cross-stack tolerance table + tolerance budget), § 3.6 (Layer 5
  per-replication requirements).
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref.md` § 9
  (Stack-B equivalence posture).
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/spec-ref-stack-d.md`
  § 9 (Stack-D equivalence posture).
- `tools/testkit/equivalence/harness.py` (`compare_captures`,
  `EquivalenceVerdict`, `_resolve_tolerance`).
- `tools/testkit/equivalence/tolerance.toml`
  (`[defaults.reaction-diffusion]`, `[overrides.reaction-diffusion-2d]`).
- `tools/testkit/equivalence/tolerance-budget.toml`
  (`[budgets.reaction-diffusion.cross_stack]`).
