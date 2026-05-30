# Autodiff — differentiable-sim infrastructure (Phase 4.0 WU-A)

Differentiable-simulation infrastructure for Phase 4.1's six differentiable
sims. Two backends with an **identical public surface**:

- `common_py.autodiff` — Taichi `ti.ad.Tape` backend (Stack D).
- `common_warp.autodiff` — Warp `wp.Tape` backend (Stack E).

First-of-pattern for `ti.ad.Tape` and `wp.Tape` in this repo (Phase 3's PINN
used PyTorch autograd, not these). The testkit-side companion is
`code_verification.gradient` (see `docs/testkit/gradient-verification.md`).

## Public API

The surface below is the same for both `common_py.autodiff` and
`common_warp.autodiff`. A sim subclasses `InverseProblem` (or one of the three
semantic subclasses), implements `forward` + `params_spec`, and drives the
optimization through `fit` / `check_gradient`.

```python
import common_py.autodiff
import common_warp.autodiff

common_py.autodiff.InverseProblem
common_py.autodiff.ParameterIDProblem
common_py.autodiff.InitialStateRecoveryProblem
common_py.autodiff.ControlProblem
common_py.autodiff.ParamSpec
common_py.autodiff.History
common_py.autodiff.GradientCheckReport
common_py.autodiff.finite_difference_gradient

common_warp.autodiff.InverseProblem
common_warp.autodiff.ParameterIDProblem
common_warp.autodiff.InitialStateRecoveryProblem
common_warp.autodiff.ControlProblem
common_warp.autodiff.ParamSpec
common_warp.autodiff.History
common_warp.autodiff.GradientCheckReport
common_warp.autodiff.finite_difference_gradient
```

### `InverseProblem` (ABC)

The base class for differentiable-sim inverse problems. Constructor keywords:
`optimizer` (`"adam" | "sgd" | "lbfgs"`, default `"adam"`), `lr` (default
`1e-2`), `max_iter` (default `1000`), `tol` (default `1e-6`).

Subclass contract:

- `forward(params, state)` — run the sim with `params` (the `ParamSpec.flat`
  field/array) and `state`; return the predicted final state as a
  gradient-tracked field/array. Required override.
- `params_spec()` — return the `ParamSpec` for this problem. Required override.
- `loss(predicted, target)` — default L2; override for custom objectives.

Methods:

- `fit(*, params_init, target, callbacks=None) -> History` — optimization loop.
  Packs `params_init` via `ParamSpec.pack`, runs the backend tape each
  iteration, applies the optimizer, and records a `History`.
- `check_gradient(*, params, n_samples=10, eps=1e-4, rel_tol=1e-5) -> GradientCheckReport`
  — cross-check the autodiff gradient against a central finite difference.
  Requires a configured target (`set_target(...)` or a prior `fit`).
- `set_target(target)` — store the optimization target.

Escape hatch: the `tape` property exposes the underlying tape factory
(`ti.ad.Tape` for the Taichi backend; a fresh `wp.Tape` for the Warp backend)
so sims that prefer the imperative DiffTaichi/Warp idiom can bypass `fit`.

### `ParameterIDProblem`, `InitialStateRecoveryProblem`, `ControlProblem`

Semantic `InverseProblem` subclasses for parameter identification, initial-state
recovery, and control respectively. Concrete sims subclass one of these and
implement `forward` + `params_spec`.

### `ParamSpec`

Bridge between structured per-sim parameters and the flat optimization tensor
the optimizer operates on (the JAX-Pytree / PyTorch-Parameter pattern adapted
for Taichi/Warp). Fields: `flat` (backend-native flat tensor — a 1-D `ti.field`
with `needs_grad=True`, or a `wp.array` with `requires_grad=True`), `pack`
(`structured -> flat`), `unpack` (`flat -> structured`), `structure` (a
human-readable schema dict of names → `{index, shape}` used by callbacks and
`History`).

### `History`

Optimization history: `losses` (list of float), `params_trajectory` (list of
`ParamSpec.unpack(flat)` per iteration), `iter_count`, `converged`,
`final_loss`. Distinct from the 3DGS `TrainingHistory` (WU-C) — different
consumers, deliberately separate classes.

### `GradientCheckReport`

Result of `check_gradient`: `per_param_relative_error` (dict),
`per_param_absolute_error` (dict), `max_relative_error`, `passed`, `tolerance`.

### `finite_difference_gradient(objective, x, *, eps=1e-4)`

Central-difference gradient of a scalar `objective` over a flat NumPy vector —
the primitive `check_gradient` uses to validate the backend autodiff.

## Optimizers

`adam` (bias-corrected moments), `sgd`, and a compact limited-memory `lbfgs`
(two-loop recursion, unit step). All operate on the flat NumPy parameter vector;
the backend tape supplies the gradient. Sims needing a line search use the
`.tape` escape hatch.

## Determinism

The gradients are produced by the backend reverse-mode tape over a forward built
from deterministic kernels. The optimizer state update is pure NumPy. On CPU at
f64 the Warp backend is bit-deterministic run-to-run; the Taichi backend follows
the Stack-D determinism posture documented in `docs/common/taichi.md`.

## Capture-format coupling

WU-A bumped the capture schema `1.0.0 → 1.1.0`, adding the optional
`gradient_fields` manifest key (see `docs/testkit/capture-format.md`). Sims that
emit per-parameter gradients record them there; the bump is additive and
non-breaking (legacy 1.0.0 captures validate unchanged).
