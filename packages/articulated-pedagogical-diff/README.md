# articulated-pedagogical-diff

Phase-4 batch-3 sim 1/3 (frontier-algorithm batch — the **differentiable carry**).

The differentiable sibling of the Phase-3 task-4 reference articulated pendulum
(`packages/articulated-pedagogical/`, Featherstone Articulated-Body Algorithm, Stack E / NVIDIA
Warp). The landed parent `aba_kernel` is launched **on-device inside a `wp.Tape`** (no `.numpy()`
host round-trip, which would sever the tape), giving **machine-exact gradients for the single
pendulum**.

## Scope — single pendulum

The Stage-0 WARP-NATIVE-TAPE probe (`tools/testkit/probes/reports/articulated-pedagogical-diff.md`)
MEASURED:

- `n=1` (single pendulum): `∂q̈/∂q` matches the closed form `−(g/L)cos q` to relerr **1.9e-16**,
  and `∂q̈/∂τ` matches `1/(mL²)` exactly. The differentiable variant is scoped here.
- `n≥2` (coupled chain): the autodiff adjoint diverges from central-FD (the ABA inward pass's
  in-place `ia[i-1]` accumulation is a read-after-write aliasing Warp's reverse pass cannot replay
  correctly). A tape-correct multi-link ABA (per-pass/per-link kernels with no aliasing) is
  **deferred**. The FORWARD is exact at any `n` (used by the parent-vs-frontier forward-equivalence).

## Deliverables

- **Gradient golden table** (≥3 independent anchors): A1 `∂q̈/∂q` analytic, A2 central-FD baseline,
  A3 `∂q̈/∂τ = 1/(mL²)` analytic.
- **Inverse problem**: recover the initial state `(q0, qd0)` from the observed final `(q_T, qd_T)`
  of a short semi-implicit-Euler rollout (`InitialStateRecoveryProblem`; identifiable in the smooth
  short-horizon regime).
- **`gradient_fields` capture** (schema 1.1.0).

## CLI

```
python -m articulated_pedagogical_diff --mode gradient --q 0.4   # autodiff vs analytic gradients
python -m articulated_pedagogical_diff --mode recover            # initial-state recovery
```

Single-stack (gate-14 N/A; WU-F differentiable-axis forward-equivalence to the landed parent). NO
tag (I7). `bit-exact same-stack-same-hw` (Warp CPU serial `wp.launch`, f64).
