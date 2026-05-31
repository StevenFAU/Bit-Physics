---
artifact_id: phase-4-batch-1-rd2d-diff-probe
sub_phase: phase-4-batch-1 (CPU-side differentiable frontier; sim 1 of 4)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: 9fcce339b4cc59e1a1409807c26d17316e231c93
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 45eed4cacb64b711c461f6e3b76958a646e6b0517302c3921bce2f18ef3018d2
evidence_paths:
  - docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md
  - packages/reaction-diffusion-2d-stack-d/reaction_diffusion_2d_stack_d/reference/gray_scott_taichi.py
  - common/common-py/src/common_py/autodiff/inverse_problem.py
  - common/common-py/src/common_py/autodiff/finite_diff.py
  - common/common-py/src/common_py/autodiff/tape.py
  - tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py
  - tools/testkit/schemas/capture-v1.json
---

# Pre-implementation probe — reaction-diffusion-2d-diff (phase-4 batch-1, sim 1)

> Live-repo Stage-0 probe per the batch-1 charter
> (`docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` §5 + §3.1 + §4.1).
> Every cite checked at assertion (Convention #8 / Convention-8). The
> tape-differentiability of the forward is a **BLOCK gate** (charter §5 Stage 0) —
> probed FIRST (§1). FACT = ran/read at HEAD `9fcce33`; INFERENCE = reasoned.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `9fcce33` (clean tree; preflight-repoint commit) | `git rev-parse HEAD` |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → **exit 0** (repointed two stale paths this session) | this session (FACT) |
| Integrity | `uv run --directory tools/integrity python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0, digest `45eed4ca…3018d2` (unchanged from charter §R) | this session (FACT) |
| Cross-phase replay | `replay_prior_phase --prior-phase phase-3 … --gates integrity,equivalence,determinism,perf-ledger,property,tolerance-budget` → **ok=True** (6/6 PASS) | this session (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0, `lfs-s3 ready` (R2 bucket `bit-physics-lfs`) — no STOP-LFS-PUSH | this session (FACT) |
| Taichi | `1.7.4` (llvm 15.0.4) — reference pin `taichi>=1.7,<2.0` | `import taichi` (FACT) |
| Forward reference sibling | `packages/reaction-diffusion-2d-stack-d/` (Gray-Scott, Stack D / Taichi) | `ls` (FACT) |

## 1. ⚠ TAPE-DIFFERENTIABILITY (BLOCK gate) — OK, NO BLOCK

Scratch probe (`/tmp/rd2d_tape_probe.py`, not committed): a time-indexed
`ti.field(ti.f64, shape=(STEPS+1, N, N), needs_grad=True)` explicit-Euler diffusion
forward (the DiffTaichi single-write-per-element pattern), differentiated through
`ti.ad.Tape(loss=…)` (`common/common-py/src/common_py/autodiff/tape.py:17`),
`∂Loss/∂D` on an 8×8 periodic grid, 6 steps, single discrete Fourier eigenmode IC:

| Check | Result (FACT — measured) |
|---|---|
| `ti.ad.Tape` backprop through 6 chained `step()` launches + `compute_loss()` | OK (compiles + runs) |
| autodiff grad vs **closed-form discrete-eigenmode analytic (A1)** | `rel_err = 6.49e-16` (machine precision — A1 is **EXACT** for the discrete operator, not merely O(h²)) |
| autodiff grad vs **central FD** (`ε=1e-6`) | `rel_err = 4.46e-11` |
| forward Loss vs analytic | `rel_err = 9.28e-16` |

**Verdict: tape-differentiability WORKS. NO BLOCK.** Two Taichi-AD constraints
discovered (carry into Stage 1a):
1. **Kernel-structure rule:** a kernel differentiated by `ti.ad.Tape` may NOT mix a
   top-level statement with a top-level `for`-loop ("Mixed usage of for-loops and
   statements without looping"). Precompute constants (e.g. `inv_dx2`) **inside** the
   loop body, not at kernel scope. (FACT — reproduced + fixed in the probe.)
2. **Single-write-per-element:** time-stepping uses a time-indexed field
   `u[t+1,…] = f(u[t,…])` so each element is written once (DiffTaichi pattern). The
   reference's ping-pong `ndarray` kernels (`gray_scott_taichi.py:133`) are NOT
   tape-safe as-is → the diff variant **re-implements** the forward with `ti.field`
   + `needs_grad=True`. (INFERENCE from Taichi-AD docs + the kernel-structure FACT.)

## 2. API surfaces consumed (common-py autodiff substrate — WU-A, grep-verified)

All at HEAD `9fcce33`:
- `InverseProblem` ABC + `ParameterIDProblem` subclass —
  `common/common-py/src/common_py/autodiff/inverse_problem.py:78` (`__init__(*, optimizer="adam", lr=1e-2, max_iter=1000, tol=1e-6)`),
  abstract `forward(params, state)` `:106`, `params_spec() -> ParamSpec` `:111`,
  default L2 `loss(predicted, target)` `:114`; `fit(*, params_init, target, callbacks=None) -> History` `:154`;
  `check_gradient(*, params, n_samples=10, eps=1e-4, rel_tol=1e-5) -> GradientCheckReport` `:199`.
- `GradientCheckReport` dataclass (`per_param_relative_error`, `per_param_absolute_error`,
  `max_relative_error`, `passed`, `tolerance`) — `inverse_problem.py:60`.
- `ParamSpec` (`flat`, `pack`, `unpack`, `structure`) — `common/common-py/src/common_py/autodiff/param_spec.py:22`.
- `finite_difference_gradient(objective, x, *, eps=1e-4) -> FloatArray` (central, O(ε²)) —
  `common/common-py/src/common_py/autodiff/finite_diff.py:26`; `make_optimizer(name, lr, _shape)` `:156`.
- `new_tape(*, loss) -> ti.ad.Tape` — `common/common-py/src/common_py/autodiff/tape.py:17`.
- Capture `gradient_fields` key (schema 1.1.0, optional) — `tools/testkit/schemas/capture-v1.json:100`.

**Sim's own deliverable** (not missing shared infra): the Gray-Scott tape-differentiable
forward, the `ParameterIDProblem` subclass, the gradient golden table + derivation,
`invariants.py`, the inverse-recovery integration test.

## 3. GRADIENT GOLDEN ANCHOR PLAN (gate-4; ≥3 INDEPENDENT anchors)

**Golden table G1 — `∂Loss/∂D_u` at canonical points**, where `Loss = ‖u(T) − target‖²`.

- **A1 (analytic, diffusion term — spectral method):** a single discrete Fourier
  eigenmode `φ(i,j)=cos(2π(mₓi+m_yj)/N)` is an exact eigenvector of the periodic
  5-point Laplacian with eigenvalue `λ = (2/dx²)[(cos(2πmₓ/N)−1)+(cos(2πm_y/N)−1)] < 0`.
  In the **pure-diffusion reduced case** (reaction off) the explicit-Euler forward is
  `u(T) = (1+dt·D·λ)^STEPS · φ`, giving the **closed-form exact** gradient
  `∂Loss/∂D = 2·STEPS·(1+dt·D·λ)^(2·STEPS−1)·(dt·λ)·Σφ²` (target=0). **Source:**
  separation-of-variables eigenmode decay of the diffusion equation — Strauss, *PDE: An
  Introduction* 2e **§4.1 (Separation of Variables)** + **Ch. 5 (Fourier Series)** (the
  continuum mode-decay `exp(−Dk²t)` is the diffusion-semigroup eigenvalue; the discrete
  analog is exact via circulant-Laplacian linear algebra). Also Evans, *PDE* 2e §2.3
  (Heat Equation, fundamental solution) as a secondary reference. **MEASURED EXACT to
  6.5e-16 in §1.** *Citation granularity is chapter/section — no sub-equation number is
  asserted unread (Phase-3 caught a Strauss section error; the load-bearing math is the
  self-contained discrete derivation, the text is motivation.)*
- **A2 (numerical baseline — exempt per close-R2):** central FD via
  `finite_difference_gradient` / the substrate's `check_gradient`. autodiff-vs-FD
  rel-err `4.5e-11` measured in §1.
- **A3 (analytic, reaction term — ODE-limit method, SOURCE-DISTINCT from A1):** the
  **well-mixed (spatially-uniform) limit** kills the Laplacian and Gray-Scott reduces to
  the ODE `u' = −u v² + F(1−u)`. One explicit-Euler step from uniform `(u₀,v₀)` gives
  `u₁ = u₀ + dt(−u₀v₀² + F(1−u₀))`, so `∂Loss/∂F = 2(u₁−target)·dt·(1−u₀)`, closed-form.
  Independent of A1 in **physical term** (reaction not diffusion), **parameter** (F not
  D), and **method** (ODE limit not Fourier). **Source:** hand-derivation (Gray-Scott
  reaction kinetics; Pearson, *Science* 261:189, 1993).

### D-ANCHOR — Stage-0 SHIFT-on-evidence (documented; not widened)

The charter §4.1 **proposed A3 = the in-repo MMS solution**. Stage-0 residual
verification (charter mandate) finds **A3-as-MMS-gradient-anchor is ill-posed**: the
manufactured solution `u*(x,y,t)` (`tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/solution.py:14`)
is **prescribed independent of D** — the forcing `S_u` is constructed to make the SAME
`u*` a solution for whatever D is chosen, so `∂u*/∂D ≡ 0` and the manufactured solution
carries **no parameter-sensitivity** to anchor a gradient. This mirrors the dispatch's
own **lenia A3 amendment** (Flow-Lenia demoted from gradient-anchor to context). **A3 is
re-declared to the reaction-term ODE-limit analytic gradient** (above) — a genuinely
independent third anchor. **The MMS keeps its charter-assigned roles** (forward-convergence
gate-4 `test_code_verification` O(h²) + the `reaction_diffusion_2d_mms` mutation target,
§5). This is a HARD-RULE-2 re-declaration on evidence, NOT a tolerance widening.

## 4. MMS forward-convergence + mutation target (closes 4.1 §1.D gap)

- In-repo manufactured solution exists:
  `tools/testkit/code_verification/mms/solutions/reaction_diffusion_2d/{solution.py,derivation.md}`.
  `u* = (sin(πx/L)cos(πy/L)cos t + 2)/4`, `v* = (cos(πx/L)sin(πy/L)sin t + 2)/4`,
  both in `[¼,¾]`; **formal spatial order 2** (5-point Laplacian). (FACT — read.)
- The diff variant's forward reproduces this via the §2.1 forward-equivalence check and
  ships a `test_code_verification.py` MMS convergence ladder (mirrors the reference's).
- **§8.7 mutation:** register `reaction_diffusion_2d_mms` (the 4.1 §1.D un-built gap) +
  `reaction_diffusion_2d_diff` invariants in `tools/testkit/mutation/mutmut-config.toml`.
  MEASURE; **advisory** unless cleared on oracle-grounded tests (snapshots forbidden).

## 5. D-class resolutions (charter §3.1 / §7)

| D-class | Resolution |
|---|---|
| **D-PARAM** | PRIMARY inverse = recover `D_u` from observed final field (`ParameterIDProblem`, cleanest analytic-gradient case). SECONDARY inverse test = recover `(F,k)` reaction rates. |
| **D-DET** | §2.2 measure-then-declare. Tape gradient is a deterministic function of fixed inputs → **expected** `bit-exact` / `same-stack-same-hw`; **MEASURE** at Stage 1b (`run_twice_and_diff` on forward + gradient). No EFECT (no training-loss distribution). |
| **D-MUTATION** | Register `reaction_diffusion_2d_mms` + `reaction_diffusion_2d_diff` invariants (§4). RESOLVED. |
| **D-ANCHOR** | A3 SHIFTED MMS→reaction-ODE-limit (§3). RESOLVED-on-evidence. |
| **D-TOL** (⚠ Stage-1b §S.2) | LEAN: gradient golden tolerance lands under `[golden_tolerance.continuous-ca.reaction-diffusion-2d-diff]` (§S.3 shape-3, single-stack golden-table; pinn-poisson precedent `analytical_l2/fd_l2`). PROBE the schema + an existing golden table at Stage 1b before appending; STOP-SCHEMA-FIT on misfit. Bespoke keys lean: `gradient_analytic_rel`, `gradient_fd_rel`. |
| **D-GATE14** | N/A (single-stack diff; charter §1.2). WU-F differentiable-axis variant-equivalence applies instead (`equivalence.variant`, rel ≤ 1e-3 / cap 1e-2) — diff.forward == `reaction-diffusion-2d-stack-d`. |
| **D-CI** | `python-strict.yml` per-sim job (Taichi/Python). |
| **D-LAYOUT** | `packages/reaction-diffusion-2d-diff/` (flat, §0.3); docs stay category-nested. |
| **D-TAG** | NO (phase-close-only; I7). |

## 6. LFS / capture

LFS-touching: ships `tests/fixtures/legacy-captures/phase-4-reaction-diffusion-2d-diff.h5`
+ an inverse-solution capture with the **`gradient_fields`** key populated (schema 1.1.0;
first real consumer). Stage-1c push = §Q same-shell `source … && git lfs push --object-id
--stdin origin` + §Q.6 R2-verify. Bootstrap confirmed hot at Stage 0 (§0).

## 7. FACT / INFERENCE summary

FACT (ran/read at `9fcce33`): §0 environment, §1 tape probe numbers, §2 grep-verified API
lines, §4 MMS form, the A1/A2 measured rel-errs, the D-ANCHOR ill-posedness of MMS-as-grad.
INFERENCE: the single-write re-implementation requirement (§1.2), the D-TOL landing slot
(LEAN, schema-probe pending), the expected determinism posture (MEASURE pending).
