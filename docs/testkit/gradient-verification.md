# Gradient verification (`code_verification.gradient`)

Testkit-side companion to the autodiff infrastructure (`docs/common/autodiff.md`,
Phase 4.0 WU-A). Validates that a differentiable sim's autodiff gradients agree
with finite differences across a canonical set of test points — the Layer-0
code-verification posture for the Phase 4.1 differentiable sims.

## Public API

```python
import code_verification.gradient

code_verification.gradient.verify_sim_gradients
code_verification.gradient.GradientVerificationReport
```

### `verify_sim_gradients(sim_module, inverse_problem_class, test_points_file, *, rel_tol=1e-5)`

- `sim_module` — importable module path of the sim.
- `inverse_problem_class` — the `InverseProblem` subclass name within that module.
- `test_points_file` — JSON document: a list of `{"params": {...}, "target": [...]}`
  objects. Each point instantiates a fresh problem, sets its target, and
  cross-checks the autodiff gradient against a central finite difference at
  `params`.
- `rel_tol` — per-parameter relative-error tolerance passed to `check_gradient`.

Returns a `GradientVerificationReport`.

The harness is backend-agnostic: it never imports `common_py` / `common_warp`
directly — the sim module's class does — and relies only on the published
`InverseProblem` surface (`set_target` + `check_gradient`).

### `GradientVerificationReport`

`sim`, `test_points_passed`, `test_points_total`, `per_test_point` (the backend
`GradientCheckReport` objects), `all_passed`.

## Example test-points file

```json
[
  {"params": {"a": 1.0, "b": 0.0}, "target": [-3.75, -2.68, -1.61, -0.54, 0.54, 1.61, 2.68, 3.75]}
]
```

## Relationship to the other code-verification pipelines

Sits alongside `code_verification.mms` (method of manufactured solutions) under
the Layer-0 code-verification surface. MMS verifies discretization order against
a manufactured solution; gradient verification verifies that the differentiable
path's gradients are correct, which is the precondition for any inverse-problem
or training-through-sim workload in Phase 4.1.
