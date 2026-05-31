---
artifact_id: phase-4-batch-1-smoke-diff-probe
sub_phase: phase-4-batch-1 (CPU-side differentiable frontier; sim 4 of 4)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: 77b959a
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 47f7299161c56d35f4e0f9751bd83f11b732087a02e9ee38f6a0386df9458d47
evidence_paths:
  - docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md
  - packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/reference/stable_fluids_warp.py
  - common/common-warp/src/common_warp/autodiff/inverse_problem.py
  - common/common-warp/src/common_warp/autodiff/finite_diff.py
  - tools/testkit/schemas/capture-v1.json
---

# Pre-implementation probe — eulerian-smoke-diff (phase-4 batch-1, sim 4 / FINAL)

> Live-repo Stage-0 probe per the batch-1 charter
> (`docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` §5 + §3.4 + §4.4).
> Every cite checked at assertion (Convention #8). The `wp.Tape`-differentiability of the
> semi-Lagrangian smoke step is **D-WARP-ADJOINT, a BLOCK gate** (charter §5 Stage 0) —
> probed FIRST (§1). FACT = ran/read at HEAD `77b959a`; INFERENCE = reasoned.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `77b959a` (clean; sim-3 mpm-diff LANDED + pushed + CI-GREEN at `4a05ca3`) | `git rev-parse HEAD` (FACT) |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → **ALL PASSED (exit 0)** | this session (FACT) |
| Integrity | `uv run --directory tools/integrity python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0, digest `47f72991…9458d47` (drifts per §R as golden tables land; the COUNTS are the invariant) | this session (FACT) |
| Cross-phase replay | base `v0.3.0-phase-3` (highest landed tag, §D.4); gates re-run at the FIXED tag (HEAD-invariant), ok=True at sim-3 Stage 0 this batch, unchanged | progress log (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0 (`lfs-s3 ready`, R2 endpoint live) | this session (FACT) |
| Warp | `1.13.0` (cpu x86_64; cache `~/.cache/warp/1.13.0`) | `import warp` (FACT) |
| Forward reference sibling | `packages/eulerian-smoke-stack-e/` (Stam-Fedkiw stable-fluids; Warp `@wp.kernel` CPU; SL backtrace + 5/7-point Laplacian + Jacobi projection) | read (FACT) |

## 1. ⚠ D-WARP-ADJOINT (BLOCK gate) — CONFIRMED DIFFERENTIABLE, NO BLOCK

**The gap that a naive port WOULD hit (and why the diff variant must re-implement, not
wrap):** the landed reference's public primitives in
`packages/eulerian-smoke-stack-e/eulerian_smoke_stack_e/reference/stable_fluids_warp.py`
are **NumPy-marshalling wrappers** — every wrapper does `wp.from_numpy(field)` → `wp.launch`
→ `out.numpy()` (e.g. `semi_lagrangian_advect_2d` lines 385-407, `_laplacian_5point_periodic`
lines 450-461). The `.numpy()` round-trip at each boundary **severs the `wp.Tape`** (the tape
records on-device `wp.array` ops; a host NumPy copy is not a taped node). So the diff variant
**re-implements the step as on-device `requires_grad` kernels recorded inside a single
`wp.Tape()`** — it does NOT (and cannot) wrap the reference primitives. This is the Warp analog
of sim-3's "the reference's `ti.types.ndarray` kernels are NOT tape-markable → re-implement with
`needs_grad` fields."

**Probe (`/tmp/smoke_tape_probe.py`, scratch, NOT committed):** a minimal re-implementation of
the smoke step's two load-bearing differentiable primitives as on-device `requires_grad`
`@wp.kernel`s — the **bilinear semi-Lagrangian backtrace gather** (constant velocity →
fixed backtrace positions → the advect map is LINEAR in the field) and the **explicit-diffusion
Laplacian** (`u' = u + dt·ν·∇²u`) — recorded on a `wp.Tape`, backward, `flat.grad` read. Grid
8×8, f64, Warp CPU:

| Check | Result (FACT — measured) |
|---|---|
| `wp.Tape` backprop through SL backtrace + bilinear interpolated **gather** (data-dependent integer index + differentiable interp weights `fx,fy`) | OK — `loss=7.70e+01`, `grad` all-finite, `‖grad‖=1.07e+01` |
| autodiff `∂Loss/∂u₀` vs **central FD** (ε=1e-6) — A2 mechanism | **max-rel-err = 3.1e-9** (the FD truncation floor) |
| autodiff `∂Loss/∂u₀` vs the **EXACT analytic linear operator** `2 Mᵀ(M u₀ − t)` (M = the SL-advect matrix, built column-by-column) — A1 mechanism | **max-rel-err = 1.1e-16** (machine-exact — the SL-advect IS an exact linear operator and its `wp.Tape` adjoint is `Mᵀ` exactly) |
| autodiff `∂Loss/∂ν` through one explicit-diffusion step vs analytic `2(out−t)·(dt·∇²u)` — A3 mechanism | **rel = 0.0 EXACT** |

**Verdict: the semi-Lagrangian backtrace + bilinear gather + explicit diffusion is
`wp.Tape`-differentiable on Warp CPU. NO BLOCK.** Constraints to carry into Stage 1a:

1. **Re-implement on-device, not wrap.** All forward kernels read/write
   `wp.array(dtype=wp.float64, requires_grad=True)` kept on device across the whole tape; NO
   `.numpy()` inside the taped region (it severs the tape). The reference's `np.roll`/`np.mod`
   op-order is mirrored kernel-internally (the `_pmod` positive-modulus + `wp.int32(xb) % n`
   index form, lines 77-114) so forward-equivalence holds.
2. **The gather adjoint is piecewise-exact.** The integer base-node index `wp.int32(xb)` is
   non-differentiable (zero-gradient floor/cast — correct: it selects the cell), but the
   bilinear weights `fx,fy` carry the gradient, so the adjoint is the exact `Mᵀ` *within a
   cell* (probe: 1.1e-16). The diff variant scopes the gradient golden to **constant velocity**
   (fixed backtrace → globally-linear M → no cell-boundary kink) — the A1/A2 anchor regime.
3. **Determinism-sensitive surface = the loss/adjoint `wp.atomic_add` reductions.** The forward
   advect/diffuse are pure per-cell gathers (NO atomic scatter → `forward` row atomic_ops =
   `none`); the L2 loss reduction and the tape adjoint of the gather use `wp.atomic_add` (sum
   reduction → `gradient` row atomic_ops = `sum-only`). Warp CPU `wp.launch` is single-thread
   serial → bit-exact run-to-run ([[stack-e-warp-f64-bit-faithful-to-numpy]]); MEASURE at 1b.
4. **D-MYPY (F-RB-3):** `# mypy: ignore-errors` scoped to the Warp-touching `_kernels.py` /
   `sim.py` (Warp ships partial type stubs — same as `common_warp.autodiff`, line 1).

## 2. API surfaces consumed (WU-A autodiff substrate — grep-verified at HEAD)

The **Warp** backend (sim 4 is the FIRST Stack-E consumer of WU-A; sims 1–3 were Taichi):
`common_warp.autodiff.{InverseProblem, InitialStateRecoveryProblem, ControlProblem, ParamSpec,
finite_difference_gradient, GradientCheckReport, make_optimizer}` + `new_tape`
(`common/common-warp/src/common_warp/autodiff/inverse_problem.py:73,268,272`,
`common/common-warp/src/common_warp/autodiff/param_spec.py:22`,
`common/common-warp/src/common_warp/autodiff/finite_diff.py:26,156`), the `gradient_fields` key (schema
1.1.0, `tools/testkit/schemas/capture-v1.json:100`), `common_warp.capture.write_frames_capture`
(`common/common-warp/src/common_warp/capture/frames.py:29`), the WU-F `differentiable` axis
(`tools/testkit/equivalence/variant/tolerance.py`).

The Warp `InverseProblem` contract (read at HEAD): `forward(params, state)` launches kernels
that read the `ParamSpec.flat` `requires_grad` array and return a `requires_grad` predicted
array; `_loss_and_grad` records `forward` + `loss` on a `wp.Tape`, calls `tape.backward(loss=…)`,
reads `flat.grad`, then `tape.zero()` **after** backward (line 158 — zeroing before is a no-op on
a fresh tape and lets gradients accumulate).

**Sim's own deliverable:** the tape-differentiable smoke step (SL advect + explicit diffusion as
`requires_grad` kernels), an `InitialStateRecoveryProblem` subclass (recover the initial smoke
field `u₀` from an observed advected frame), the gradient golden table + derivation, `invariants.py`,
the inverse-recovery integration test, the inverse-solution capture with `gradient_fields`.

## 3. GRADIENT GOLDEN ANCHOR PLAN (gate-4; ≥3 INDEPENDENT anchors)

**Golden table G1 — `∂Loss/∂u₀` (initial-field gradient, advection) + `∂Loss/∂ν` (diffusion).**

- **A1 (analytic, ADVECTION term — linear-operator gradient):** pure advection of a field by a
  **constant** velocity; the semi-Lagrangian bilinear-interpolation map is the exact sparse linear
  operator `M` (`advect(u₀) = M u₀`), so for `Loss = ‖M u₀ − target‖²` the gradient is the
  **closed-form exact** `∂Loss/∂u₀ = 2 Mᵀ(M u₀ − target)`. **MEASURED machine-exact (rel 1.1e-16)
  in §1.** SOURCE: analytic linear-advection; semi-Lagrangian backtrace — **Stam, J. (1999),
  "Stable Fluids," SIGGRAPH '99, 121-128** (DOI 10.1145/311535.311548). *Stage-0 confirmation: the
  reference's advection IS the standard semi-Lagrangian backtrace (`_sl_advect_2d_k`, lines 83-114
  — `xb = i − u·dt/dx`, bilinear gather) — VERIFIED against the cited Stam method (backtrace the
  departure point, interpolate the old field). The golden stores the autodiff gradient at named
  cells; the independent reference is the analytic `2 Mᵀ(M u₀ − t)` value.*
- **A2 (numerical baseline — exempt per close-R2):** central FD via
  `common_warp.autodiff.finite_difference_gradient` (ε=1e-4/1e-6, O(ε²)), cross-checked against
  the `wp.Tape` adjoint (Warp autodiff is the **engine**; FD + analytic are the **references**).
  **MEASURED rel 3.1e-9 in §1.** SOURCE: independent numerical method (parameter perturbation).
- **A3 (analytic, DIFFUSION term — SOURCE-DISTINCT from A1):** one explicit-diffusion step
  `u' = u + dt·ν·∇²u`; `Loss = ‖u' − target‖²` is exactly linear in `ν`, so
  `∂Loss/∂ν = 2(u' − target)·(dt·∇²u)`, closed-form. **MEASURED EXACT (rel 0.0) in §1.**
  Independent of A1 in **physical term** (diffusion, not advection), **parameter** (the diffusion
  coefficient `ν`, not the field `u₀`), and **method** (heat-operator linearization, not the
  advection adjoint). SOURCE: heat-equation / discrete-diffusion analytic, hand-derived (the
  continuous heat kernel `∂_t u = ν∇²u` motivates it; the EXACT golden value is the discrete
  explicit operator's derivative).
- **MMS:** N/A in the MMS-pipeline sense; the analytic advection + diffusion limits play the
  manufactured-anchor role (charter §4.4).
- **Forward-equivalence (WU-F differentiable axis):** `diff.forward` == `eulerian-smoke-stack-e`
  reference advection/diffusion primitives within `relative ≤ 1e-3` (cap 1e-2). The diff kernels
  mirror the reference's `_sl_advect_2d_k` / `_lap5_k` op-order → expected near-bit-exact (MEASURE
  at 1b).

### D-ANCHOR — Stage-0 note (A3 framing shift, like sims 1–3)

The charter §4.4 framed A3 as "Gaussian IC under pure diffusion spreads analytically (heat
kernel); `∂Loss/∂amplitude`, `∂Loss/∂(diffusion coeff)` closed-form." The **continuous** heat
kernel is the *motivation*, but the EXACT golden TABLE value must be the derivative of the
**discrete explicit-diffusion operator** the sim actually runs (the continuous Gaussian-spread is
only first-order-accurate to the discrete step, so it is not a machine-exact golden). So A3 is the
**discrete-diffusion `∂Loss/∂ν` analytic** `2(u'−t)·(dt·∇²u)` (MEASURED EXACT 0.0), keeping the
heat-equation as the cited physical source. This mirrors sim-1's MMS→ODE-limit, sim-2's
`∂K`→conv-Jacobian, and sim-3's DiffTaichi→neo-Hookean shifts: keep ≥3 genuinely independent
NUMERIC anchors, document the shift, never force an unsound anchor (HARD-RULE-2 re-declaration on
evidence, NOT a tolerance widening).

## 4. D-class resolutions (charter §3.4 / §7)

| D-class | Resolution |
|---|---|
| **⚠ D-WARP-ADJOINT** (BLOCK gate) | **CONFIRMED differentiable, NO BLOCK** (§1). SL backtrace + bilinear gather + explicit diffusion are `wp.Tape`-differentiable on Warp CPU (autodiff == exact analytic linear operator to 1.1e-16; == analytic `∂Loss/∂ν` to 0.0). Re-implement on-device (do NOT wrap the reference's NumPy-marshalling primitives). |
| **D-MYPY** (F-RB-3) | `# mypy: ignore-errors` scoped to the Warp-touching files (`_kernels.py`, `sim.py`); the pure-NumPy analytic-helper surface (`forward.py`) stays mypy-`--strict`. |
| **D-DET** (§2.2) | Measure-then-declare at 1b. Forward = pure per-cell gather (no atomic) → expected `none`; gradient = adjoint scatter + L2 reduction via `wp.atomic_add` → `sum-only`. Warp CPU serial single-thread → expected bit-exact `same-stack-same-hw`; no EFECT. Rows `[volumetric-grid.eulerian-smoke-diff.{forward,gradient}]`. |
| **D-INVERSE-SCOPE** (identifiability; sims 2/3 discipline) | The canonical inverse recovers the **initial smoke field `u₀`** (`InitialStateRecoveryProblem`, charter §3.4). Identifiability caveat: `advect∘diffuse` is linear but diffusion is a smoothing (low-pass) operator → recovering `u₀` from a *diffused* target is ill-posed for high frequencies (backward heat). So the canonical recovery is scoped to the **identifiable regime: pure advection** (`M` is a near-permutation bilinear-interp operator → well-conditioned, full-rank → `u₀` identifiable), short horizon, small grid. Diffusion is exercised separately by the A3 golden + a PBT. MEASURE conditioning at 1b; document. |
| **D-EQUIV-AXIS** | WU-F `differentiable`, rel ≤ 1e-3 / cap 1e-2 (charter §7; gate-14 N/A single-stack). |
| **D-CI** | `python-strict.yml` per-sim job `test-eulerian-smoke-diff` (Warp; no committed-LFS-capture read in the per-sim job → no selective LFS pull, mirroring `test-mpm-multimaterial-diff`). |
| **D-USD** | DEFER (Stack-E policy, charter §10; carry as closed-with-shifted — no `common_warp` USD surface built). |
| **D-TAG** | NO (phase-close-only, I7). |

## 5. Verdict

**Stage 0 CONFIRMED. D-WARP-ADJOINT BLOCK gate CLEARED (differentiable).** All three gradient
anchors MEASURED sound (A1 1.1e-16, A2 3.1e-9, A3 0.0). Anchor plan = A1 advection-operator
analytic / A2 central-FD baseline / A3 discrete-diffusion `∂Loss/∂ν` analytic, with the A3 framing
shifted on-evidence (continuous heat-kernel → discrete-operator derivative). Proceed to Stage 1a
(scaffold + RED). NO tag (I7).
