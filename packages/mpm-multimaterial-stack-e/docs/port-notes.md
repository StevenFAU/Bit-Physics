# mpm-multimaterial-stack-e — port notes

Stack-E (NVIDIA Warp 1.13.0) port of the Phase-1 MLS-MPM/APIC neo-Hookean
single-material reference. Algebraic surface re-derived verbatim from
`packages/mpm-multimaterial/mpm_multimaterial/reference/mls_mpm.py` (no Phase-1
import; isolation per the prior five Stack-D ports).

## Warp-DSL discipline (Stage-0 findings + banked precedents)

- **f64 throughout (D15 / R-MPME-F64).** Every `wp.array` is
  `dtype=wp.float64`; every in-kernel numerical literal is seeded
  `wp.float64(...)` (banked #7 extended to pure-literal `@wp.kernel` constants,
  conventions § L.4).
- **Warp CPU serial launch = determinism (D5 / banked #8).** `wp.launch` on the
  CPU device runs serially over the launch dimension; the P2G `wp.atomic_add`
  accumulation order is fixed → bit-exact. No `cpu_max_num_threads=1` equivalent
  needed (Stage-0 Task 0.6: 6/6 bit-identical, digest `a8f6e654…07ff1fe1`).
- **O-W7 `wp.float64()` taint workaround (Stage-0 S0-ME1).** Applying
  `wp.float64(v)` to a kernel-local variable taints `v`'s inferred type to
  float64. The integer base node is derived via `wp.int32(<float_base>)` (the
  float base is not reused as an int), and the quadratic-B-spline weights + node
  offsets are packed into `wp.vec3d` indexed by the pure-int loop variable —
  never `wp.float64(di)` on a variable also used as an int index. (Documented in
  the Stage-0 evidence artifact; the conventions-doc O-W7 amendment is a
  Stage 1b/2 locus, not Stage 1a.)
- **O-W6.** The kernel module (`reference/mls_mpm_warp.py`) omits
  `from __future__ import annotations` defensively (Warp 1.13.0 tolerates it, but
  the convention mirrors `common-warp`).

## Structure

- `reference/mls_mpm_warp.py` — the seven `@wp.kernel`s (P2G ±stress, grid
  update, G2P/APIC, deformation update, neo-Hookean stress, advect) + NumPy
  in/out wrappers (per-call marshalling; in-place mutation contract matching the
  Phase-1 API) + the re-derived CANONICAL_* constants.
- `reference/shape_functions.py` — pure-Python quadratic B-spline (gate-4
  golden + the partition-of-unity invariant); stack-agnostic.
- `sim.py` — `sim_runner_seeded` (canonical 128cube; Stage 1b) +
  `sim_runner_diagnostic` (16cube; the gate-witness scale); consumes the
  common-warp socket; builds `common_warp.Capture` payloads (f64-preserving).
- `invariants.py` — the two spec § 6.6 PBT invariants.

## Gate-14 cross-stack faithfulness (informational; Stage 1c executes)

At the diagnostic scale the port reproduces the Phase-1 trajectory to printed
precision (`max|vel| = 2.049050`, `min pos_z = 0.491517` at step 50 — matching
the plan-drafting Task 1.6 Phase-1 values), and step-1 P2G mass conservation is
exact to 1 ULP (`abs_err 2.22e-16`). The canonical drop-impact is rigid
free-fall (the blob does not deform within the horizon → `F=I` → zero stress),
so the gate-14 cross-stack diff is expected at FP-round-off (BOUNDED; D3).
