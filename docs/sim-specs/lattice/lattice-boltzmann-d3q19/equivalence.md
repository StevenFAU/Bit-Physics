# lattice-boltzmann-d3q19 — Cross-stack equivalence

## Tolerance row

Category `lbm` per `tools/testkit/equivalence/tolerance.toml`:

| Axis | Value |
|---|---|
| `relative` | `1.0e-5` |
| `absolute` | `0.0` |

Per-sim override added at sub-phase-lattice-boltzmann-d3q19-stack-d Stage 1c:
`[overrides.lattice-boltzmann-d3q19] category = "lbm"` — resolves
`sim.category="lattice"` (physics-family) to tolerance-category `lbm`
(numerical-method). **At-budget** per `[budgets.lbm.cross_stack]` (`relative = 1e-5`);
NOT a widening (spec § 2.6). **10x tighter** than the prior two ports' `1e-4`
(`reaction-diffusion` + `sph`).

## Cross-stack scope

| Pair | Status | Phase |
|---|---|---|
| NumPy-reference (CPU) ↔ Stack-D Taichi (CPU) | **Verified — gate 14 GREEN x2** (Stage 1c) | Phase 2 cross-stack |
| NumPy-reference (CPU) ↔ Stack-E Warp (CPU) | **Verified — gate 14 GREEN x2, cross-stack BIT-EXACT** (Stage 1c; § E) | Phase 2 cross-stack |
| Stack-C (Vulkan) self-replicates | Not yet exercised (unimplemented) | Phase 2+ |
| Optimized GPU vs. canonical reference | epsilon (subgroup ops) | Phase 2+ |

> The spec-designated Stack-C (Vulkan) primary is unimplemented; the **frozen diff
> partner is the Phase-1 NumPy-reference capture** (`stack.name="numpy-reference"`).
> The relevant equivalence relation is reference-CPU ↔ Taichi-CPU — a different
> arithmetic backend exercising the D3Q19 collision-step FP-accumulation. (The
> Phase-1 stub's "Stack C self-replicates / Not yet exercised" framing is superseded.)

---

# Cross-Stack Equivalence — IC-15 candidate methodology (Stage 1c)

> The THIRD per-sim cross-stack port (after `reaction-diffusion-2d-stack-d` +
> `sph-water-stack-d`). The FIRST with **two canonical captures** (Poiseuille +
> Couette → two independent gate-14 verdicts; D4), **dual-arm gate-4** (golden 4a +
> MMS 4b), and the **tighter `1e-5`** cross-stack budget. The S6 calibration (§ 6)
> is specific to the D3Q19 BGK collision-step FP-accumulation surface (D9).

## 1. The cross-stack pairs (TWO; D4 dual-capture)

Both pairs share `sim.{category="lattice", name="lattice-boltzmann-d3q19",
variant="bgk-d3q19-qian-1992"}`, `dtype=f64`, fields `{rho, u}`, N_z=3 z-periodic
slab. LEFT = Phase-1 NumPy reference (`numpy-reference`; sealed); RIGHT = Stack-D
Taichi-DSL CPU port (`taichi-stack-d`).

| Pair | LEFT (`captures/lbm-ref/`) | RIGHT (`captures/lattice-boltzmann-d3q19-stack-d/`) | frames |
|---|---|---|---|
| Poiseuille (primary) | `poiseuille-64x32-seed42-step1000` (.json `8347922d…`; .h5 OID `0e0843aa…`) | (.json `a395e30c…`; .h5 OID `d7ace41e…`) | 1001 |
| Couette (secondary) | `couette-32x16-seed42-step500` (.json `d9fbcafb…`; .h5 OID `7a948434…`) | (.json `aa6451ac…`; .h5 OID `4d171c51…`) | 501 |

Both captured at full cadence (capture_interval=1, full canonical horizon — D4).

## 2. Harness invocation pattern (invoked TWICE)

```python
from pathlib import Path
from equivalence.harness import compare_captures
for desc in ("poiseuille-64x32-seed42-step1000", "couette-32x16-seed42-step500"):
    verdict = compare_captures(
        Path(f"captures/lbm-ref/{desc}.json"),                          # LEFT
        Path(f"captures/lattice-boltzmann-d3q19-stack-d/{desc}.json"),  # RIGHT
    )
# verdict.within_tolerance: bool
# verdict.per_field_diff: {"step:<n>:<field>": {"max_abs_err", "max_rel_err"}}
# verdict.tolerance_table_used: {"category", "relative", "absolute", "path"}
```

`compare_captures` pulls `sim.{category,name}` from the LEFT manifest, requires the
RIGHT to agree, resolves tolerance, and diffs every captured frame × every state
field. Acceptance: `abs_err > atol + rtol·scale` (scale = `max(|right field|)` over
the whole field) flips `within_tolerance` to `False`.

## 3. Tolerance resolution wiring (two-taxonomy distinction)

`sim.category` is a **physics-family** taxonomy (`lattice`); the tolerance table is
keyed by **numerical-method** taxonomy (`lbm`). There is no `[defaults.lattice]`, so
resolution requires the per-sim override `[overrides.lattice-boltzmann-d3q19]
category = "lbm"` → maps to `[defaults.lbm]` (`relative = 1e-5, absolute = 0.0`).
**Without the override, `compare_captures` raises `KeyError` on `lattice`**
(empirically confirmed at Stage-0 Task 0.5; the D6-MANDATORY routing). The override
is **at-budget** (`[budgets.lbm.cross_stack] = 1e-5`) — resolution wiring, not a
widening. The `lbm` budget is **10x tighter** than the prior two ports' `1e-4`
(`reaction-diffusion` + `sph`), so this pair has less gate-14 headroom by design.

## 4. Step-horizon documentation discipline

The diff is reported at every captured frame (Poiseuille 1001 frames, Couette 501
frames — full canonical horizons, D4) per field `{rho, u}`. **No step approaches
`1e-5`** for either capture: 0 frames reach even `1e-6` (0.1×budget). The per-frame
`max_abs_err` is flat at FP-round-off scale (`~1e-15`) across the full horizon —
the small per-frame variation is collision-step FP-accumulation-order noise, **NOT
amplification**. The regime is laminar single-pass dissipative (stable steady
states), so there is no chaotic growth across the horizon (R-P2 stays un-stress-
tested; § 6).

## 5. Per-field diff witness (gate-14 GREEN x2, full canonical horizons)

Both `within_tolerance = True`; resolved tolerance `{category: lbm, relative: 1e-5,
absolute: 0.0}`. Step-horizon roll-up (max over all frames):

**Poiseuille (primary; 1001 frames):**

| Field | max_abs_err | max_rel_err | worst-abs step | vs target (rel ≤ 1e-5) |
|---|---|---|---|---|
| `rho` | `5.773160e-15` | `5.773160e-15` | 877 | ~10 orders of margin |
| `u` | `6.163473e-15` | `2.000000e+00`† | 988 | ~10 orders (abs); † see note |

**Couette (secondary; 501 frames):**

| Field | max_abs_err | max_rel_err | worst-abs step | vs target (rel ≤ 1e-5) |
|---|---|---|---|---|
| `rho` | `3.330669e-15` | `3.330669e-15` | 107 | ~10 orders of margin |
| `u` | `1.273287e-15` | `2.000000e+00`† | 149 | ~10 orders (abs); † see note |

† The `u` `max_rel_err ≈ 2.0` is the **near-zero transverse-velocity per-element
artifact**: Poiseuille + Couette are unidirectional flows, so `u_y, u_z ≈ 0` (down
to `~1e-15`); a tiny signed FP difference over a near-zero denominator inflates the
per-element relative ratio. `compare_captures` does **NOT** verdict on per-element
relative — it uses `abs_err > atol + rtol·field_scale` with `field_scale = max(|u|)`
(the streamwise centerline / plate velocity, `~0.01`–`0.05` lattice), giving a
threshold `~1e-7` that the `~6e-15` abs error clears by ~8 orders. Hence
`within_tolerance = True` for both pairs.

## 6. D9 disposition + S6 calibration (LBM-specific)

- **D9 — collision-step FP-accumulation is THE cross-stack-non-trivial surface.**
  The per-cell 19-term moment reductions + equilibrium polynomial + Guo-2002 forcing
  are where Taichi-CPU and NumPy arithmetic can diverge. Stage 0 derisked this: with
  explicit `ti.f64(0.0)` accumulator seeds the reduction matches NumPy at `~7e-15`
  (vs the `~3.4e-6` f32-default trap when `default_fp` is unset). The full-trajectory
  gate-14 diff confirms it stays at FP-round-off scale (`~1e-15`) across both horizons.
- **Integer-velocity streaming is bit-exact across stacks** (pure periodic index
  gather, no FP; Stage-0 `np.array_equal` vs `np.roll` = `0.0`) — NOT a cross-stack
  divergence surface.
- **Dual-arm gate-4 (FIRST cross-stack port):** code verification carries BOTH a
  golden-table arm (4a, equilibrium reproduced bit-identically, max_abs `0.0`) AND an
  MMS arm (4b, observed OOA `2.39`, within ±0.5 of formal `p=2`). Banked methodology
  precedent for ports with a multi-method gate-4 surface.
- **Dual-canonical-capture (FIRST cross-stack port):** two seeded runners
  (`sim_runner_seeded` + `sim_runner_seeded_couette`) → two canonical captures → two
  independent gate-14 verdicts. Banked precedent for sims with multi-scenario
  canonicals (the methodology applies per-capture; verdicts are independent).
- **S6 calibration (banked for D5 Stage 2 routing):** this third pair validates the
  IC-15 partial-formalization methodology at a **third physics family** (`lattice`,
  after `continuous-ca` + `particle-fluids`). It exercises previously-deferred aspect
  **#4 (lattice-velocity quantization, reframed as collision-step FP-accumulation per
  D9)** — but the validated regime remains **algebraically-identical-trajectory at
  FP-round-off scale**, as with the prior two pairs. Remaining deferred aspects
  (**#1 R-P2 chaotic / #3 atomic-scatter / #5 iterative-solver amplification**) STAY
  un-stress-tested. **D8 comparison-projection axis:** not needed for either pair
  (position-exact-equivalent `rho`/`u` at 1e-5 with ~10 orders of margin).

## 7. Methodology precedent for subsequent cross-stack pairs (IC-15 candidate)

This is the **third** cross-stack pair. The IC-15 candidate methodology (per-cell
position-exact comparison + category-default tolerance + per-frame diff witness +
per-sim `tolerance.toml` override) now validates across **three physics families**
(continuous-ca + particle-fluids + lattice), all at the
algebraically-identical-trajectory regime where the cross-stack diff stays at
FP-round-off scale. New refinements this pair surfaces (banked for the Stage 2 D5
**(b) PARTIAL HOLDS + REFINEMENT** amendment of
`docs/conventions/cross-stack-equivalence-methodology.md`):

1. **Collision-step FP-accumulation handling** (f64 accumulator-seed pattern; D9).
2. **Dual-arm gate-4 verification surface** (golden + MMS on one port).
3. **`1e-5` vs `1e-4` tolerance-category routing** (per-category budget; tighter
   numerical-method category).
4. **Dual-canonical-capture / two-seeded-runner pattern** (independent per-capture
   verdicts).

The methodology is **NOT promoted partial → full** (third pair at the same regime;
the structurally-non-trivial aspects #1/#3/#5 remain un-stress-tested) — the Stage 2
amendment is **additive** (option (b)).

## References

- `docs/architecture.md` § 2.5 (IC-13 content-equivalence), § 2.6 (cross-stack
  tolerance table).
- `tools/testkit/equivalence/harness.py` (`compare_captures`).
- `docs/sim-specs/continuous-ca/reaction-diffusion-2d/equivalence.md` (first
  cross-stack pair) + `docs/sim-specs/particle-fluids/sph-water/equivalence.md`
  (second pair) — IC-15 candidate templates.
- `docs/conventions/cross-stack-equivalence-methodology.md` (IC-15 partial
  formalization; consumed as-is at Stage 1c; amended additively at Stage 2 per D5(b)).
- Stage 1c witness: `docs/_audits/phase-2/sub-phase-lattice-boltzmann-d3q19-stack-d/stage-1c-evidence/`.

---

# § E. Stack-E (NVIDIA Warp, CPU) — cross-stack BIT-EXACT witness

> **The SECOND `lattice-boltzmann-d3q19` cross-stack pair, and the EIGHTH
> spec-Phase-2 pair.** Where the Stack-D Taichi port matched the sealed Phase-1
> NumPy reference at FP-round-off scale (`~6e-15`; gate-14 GREEN within tolerance;
> §§ 1–7 above), the Stack-E Warp port goes one step further: gate-14 is
> **cross-stack BIT-EXACT** — the Warp port matches the reference **byte-for-byte**
> across the full horizon of BOTH canonicals, `within_tolerance=True`,
> `max_abs_err=0.0`. This section is the bit-exactness witness; it does NOT
> supersede the Stack-D witness (a different backend, an equally-correct verdict —
> both GREEN). The two pairs together are the within-sim cross-backend evidence
> that a cross-stack difference is a property of the *backend pair's arithmetic*,
> not of the (shared, laminar) trajectory.

## § E.1. The cross-stack pair

`sim.{category="lattice", name="lattice-boltzmann-d3q19", variant="bgk-d3q19-qian-1992"}`,
`dtype=f64`, fields `{rho, u}`, N_z=3 z-periodic slab. LEFT = Phase-1 NumPy
reference (`numpy-reference`; SEALED). RIGHT = Stack-E NVIDIA-Warp CPU port
(`warp-stack-e`). TWO canonical descriptors (D4 dual-capture); tolerance resolves
to `lbm`/`relative=1e-5` via the REUSED `[overrides.lattice-boltzmann-d3q19]`
(D6 verify-only; the LEFT/RIGHT manifests agree on `sim.{name,category,variant}`,
so the override added by Stack-D Stage 1c resolves the Stack-E pair unchanged —
no new tolerance row).

## § E.2. Gate-14 verdict — within_tolerance=True (cross-stack BIT-EXACT)

`compare_captures(numpy_ref, warp_stack_e)` at `relative=1e-5, absolute=0.0`. BOTH
verdicts `within_tolerance=True`; the cross-stack difference is **exactly zero** at
every captured frame (well beyond the `1e-5` budget — ~10 orders tighter than the
Stack-D pair's `~6e-15`):

| Descriptor | within_tolerance | resolved tolerance | worst max_abs_err | per-frame divergence |
|---|---|---|---|---|
| `poiseuille-64x32-seed42-step1000` (1001 frames) | **True** | `lbm`/`1e-5` | `0.0` | `0.0` at every frame (0,1,…,1000) |
| `couette-32x16-seed42-step500` (501 frames) | **True** | `lbm`/`1e-5` | `0.0` at every frame (0,1,…,500) |

## § E.3. Bit-exactness through the laminar horizon

Both canonicals develop genuine (laminar, bounded) flow — Poiseuille's body-forced
channel reaches `max|u| ≈ 8.65e-3` (Ma ≈ 0.015) by step 1000; Couette's moving
top-plate drives `max|u| = 0.05` exactly — yet the Warp port reaches those developed
states **byte-for-byte** (`a.tobytes() == b.tobytes()`, `max|diff| = 0.0`):

| Descriptor | frame | field | ref absmax | stack-e absmax | max\|diff\| | bytes_equal |
|---|---|---|---|---|---|---|
| Poiseuille | 1000 | rho | 1.0000000e+00 | 1.0000000e+00 | 0.0 | True |
| Poiseuille | 1000 | u | 8.6508320e-03 | 8.6508320e-03 | 0.0 | True |
| Couette | 500 | rho | 1.0000000e+00 | 1.0000000e+00 | 0.0 | True |
| Couette | 500 | u | 5.0000000e-02 | 5.0000000e-02 | 0.0 | True |

The bit-exactness holds across the FULL horizon (all 1001 + 501 captured frames,
both state fields), INCLUDING the Guo body forcing (Poiseuille) and the moving-wall
momentum injection (Couette). Unlike the Stack-D pair (where the per-frame
`max_abs_err` floats at `~1e-15` FP-round-off across the horizon), the Stack-E
per-frame difference is identically `0.0`.

## § E.4. This is not a defect (distinct-provenance evidence)

The two captures are genuinely independent runs, not a copy or a wiring artifact:

| Axis | LEFT (NumPy reference) | RIGHT (Warp Stack-E) |
|---|---|---|
| `.h5` LFS oid (Poiseuille / Couette) | `0e0843aa…` / `7a948434…` | `c44cd395…` / `71cd6e14…` |
| `stack.{name, build_id}` | `numpy-reference` / `sub-phase-lattice-boltzmann-d3q19` | `warp-stack-e` / `sub-phase-lattice-boltzmann-d3q19-stack-e` |
| `run.start_utc` | 2026-05-22 | 2026-05-25 |
| `run.wall_clock_seconds` (Poiseuille / Couette) | 3.784s / 0.604s | 4.944s / 0.627s |

Distinct `.h5` payloads, distinct provenance, distinct wall-clocks — the f64 field
arrays nonetheless agree byte-for-byte (the `.h5` payloads are byte-size-identical to
the reference captures: 202,350,128 B + 27,405,152 B).

## § E.5. Why bit-exact (logical consistency with step-1 port faithfulness)

The Stage-1b step-1 cross-stack baseline was already **BIT-EXACT** (`max_abs_err=0.0`
on both canonicals, including the developed-flow state and every isolated component;
the Stage-0 R-A1 measurement already showed the collision surface reproduces the
reference byte-for-byte). The Warp port replicates the NumPy operation order
**exactly**: the per-cell 19-term moment reductions iterate the lex `C` ordering with
`wp.float64(0.0)` accumulator seeds (matching NumPy's sequential `f.sum(axis=0)` /
`einsum`), the equilibrium uses the reference's **reciprocal operand form**
(`cu*inv_cs2 + cu*cu*inv_two_cs4 - u_sq*inv_two_cs2` with the f64 `c_s²`-constants
precomputed via the identical expressions), and the integer-offset streaming is a
pure positive-modulus index gather (no FP). With a step-1 cross-stack seed-difference
of **exactly zero** and a laminar (dissipative, bounded) trajectory, the trajectories
stay byte-identical for the entire horizon.

This is the within-sim cross-backend contrast to the Stack-D Taichi result: Stack-D
used the **division operand form** (`cu/cs2 + (cu*cu)/(2*cs2*cs2) - u_sq/(2*cs2)`),
which introduces a Taichi-FP-specific `~6e-15` round-off vs NumPy (GREEN within the
`1e-5` budget, but not byte-equal); Stack-E, executing the same algorithm with the
reference's reciprocal operand order + f64-seeded reductions, introduces no round-off.
**The cross-stack difference is a property of the backend pair's arithmetic
(division-vs-reciprocal operand order + seed discipline), not of the shared D3Q19
trajectory** — the same conclusion the chaotic-regime smoke pair reached from the
opposite direction.

## § E.6. Within-stack correctness — gates 4-13 all GREEN

The Stack-E port's physical correctness is verified by the stack-agnostic gates
(15 passed at Stage 1b; the 2 gate-14 cross-stack assertions un-skipped at Stage 1c
→ 17 passed). Dual-arm gate-4 (D17): 4a equilibrium golden (19 `f_i^eq` + moments at
`abs=1e-15`) + 4b NS-2D MMS (observed OOA within ±0.5 of formal `p=2`). gate-10
within-stack determinism is bit-exact (`tolerance=0.0`): the O-2 four-checkpoint Warp
CPU determinism chain landed all four — Stage-0 R-A1 collision digest, Stage-1b
gate-10 production reproduction (`393ef934…`, 2/2) + canonical-scale 2-run (Couette
byte-identical), and the Stage-1c formal gate-14 (this section). The cross-stack
bit-exactness is a strictly stronger statement than within-stack determinism: not
just that the port is internally reproducible, but that it reproduces a *different
backend* byte-for-byte.
