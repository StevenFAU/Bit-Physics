---
artifact_id: phase-4-batch-3-articulated-pedagogical-diff-probe
sub_phase: phase-4-batch-3 (frontier-algorithm + differentiable carry; sim 1 of 3)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: 1e09362
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: 4266d65ed66b993876a2e5944f9e8dbc3dc89cca58bd0f389134e6661252fc35
evidence_paths:
  - docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md
  - packages/articulated-pedagogical/articulated_pedagogical/aba.py
  - packages/articulated-pedagogical/articulated_pedagogical/_warp_kernels.py
  - packages/articulated-pedagogical/articulated_pedagogical/analytic.py
  - common/common-warp/src/common_warp/autodiff/inverse_problem.py
  - common/common-warp/src/common_warp/autodiff/finite_diff.py
---

# Pre-implementation probe — articulated-pedagogical-diff (phase-4 batch-3, sim 1 / 3)

> Live-repo Stage-0 probe per the batch-3 charter
> (`docs/_audits/phase-4/batch-3-charter-2026-05-31T22-13-27Z.md` §3.1 + §4.1 + §5).
> Every cite checked at assertion (Convention #8). The `wp.Tape`-differentiability of the landed
> Featherstone ABA recursion is **D-WARP-ADJOINT, a BLOCK gate** (charter §3.1 / §5 Stage 0) —
> probed FIRST (§1). FACT = ran/read/measured at HEAD `1e09362`; INFERENCE = reasoned.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `1e09362` (clean; batch-3 charter committed) | `git rev-parse HEAD` (FACT) |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → **ALL PASSED (exit 0)** | this session (FACT) |
| Integrity | `uv run --directory tools/integrity python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0, digest `4266d65e…1252fc35` (== charter at-head; the COUNTS are the invariant, the digest drifts as golden tables land) | this session (FACT) |
| Cross-phase replay | base `v0.3.0-phase-3` (highest landed tag, §D.4); gates re-run at the FIXED tag (HEAD-invariant), ok=True at batch-1 sim-3 + batch-2 Stage 0, unchanged (only doc commits since) | progress carry (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0 (`lfs-s3 ready`, R2 endpoint live) | this session (FACT) |
| Warp | `1.13.0` (cpu x86_64; cache `~/.cache/warp/1.13.0`; "Could not find … CUDA driver" → CPU path) | `import warp` (FACT) |
| Parent sim (build-on) | `packages/articulated-pedagogical/` (Featherstone ABA, Warp `@wp.kernel` CPU; analytic single-pendulum anchors) | read (FACT) |

## 1. ⚠ D-WARP-ADJOINT (BLOCK gate) — DIFFERENTIABLE & MACHINE-EXACT (single pendulum); n≥2 adjoint gap MEASURED → single-pendulum scope

**The tape-sever a naive port would hit:** the parent's public wrapper at
`packages/articulated-pedagogical/articulated_pedagogical/aba.py:116` returns
`qdd.numpy().astype(np.float64)` — the `.numpy()` host round-trip **severs the `wp.Tape`** (the
tape records on-device `wp.array` ops; a NumPy copy is not a taped node). So the diff variant keeps
everything **on-device inside a single `wp.Tape`** (no `.numpy()` in the taped region). The landed
**kernel** `_warp_kernels.aba_kernel` is itself a clean `@wp.kernel` over Warp arrays — it does NOT
need re-writing for n=1; only the Python wrapper is re-implemented tape-safe (this makes
forward-equivalence to the parent bit-exact by construction).

**Probe (scratch, NOT committed): the landed `aba_kernel` launched inside a `wp.Tape` with
`requires_grad` arrays**, backward through a `pick(qdd[0])` loss; `q.grad` / `tau.grad` read. Warp
CPU f64, `make_simple_pendulum(L=1, m=1, g=9.81)` (I_pivot = mL² = 1):

| Check (FACT — measured) | q=0.3 | q=0.7 | q=1.2 |
|---|---|---|---|
| forward `qdd` vs analytic `−(g/L)sin q` | relerr 0.0 | 0.0 | 0.0 |
| autodiff `∂q̈/∂q` vs analytic **`−(g/L)cos q`** (A1) | **relerr 1.9e-16** | **0.0** | **0.0** |
| autodiff `∂q̈/∂τ` vs analytic **`1/(mL²)=1`** (A3) | **relerr 0.0** | **0.0** | **0.0** |

**n≥2 finding (the genuine adjoint gap, MEASURED):** for `make_double_pendulum()` at
`q=(0.5,0.3), qd=(0.1,−0.2)`, autodiff `∂q̈₀/∂q₀ = −11.765` vs central-FD `−9.830` →
**relerr 0.197 (WRONG)**. Root cause: the ABA inward pass accumulates parent articulated inertia
**in place** — `packages/articulated-pedagogical/articulated_pedagogical/_warp_kernels.py:129`
`ia[i-1] = ia[i-1] + ia_art` / `pa[i-1] = pa[i-1] + pa_art`, and the next (lower-index) iteration
**reads `ia[i]` after it was
written** by the prior iteration. Warp's reverse pass replays the kernel body against the arrays'
**final** values, so a read-after-write on the same array element across loop iterations corrupts the
adjoint for coupled links. For n=1 the `if i > 0` inward block never executes and every scratch
element is written exactly once → the adjoint is machine-exact (the table above).

**Verdict: BLOCK gate CLEARED for the single-pendulum scope.** `wp.Tape` differentiation of the
landed ABA recursion is **machine-exact for n=1** (the regime of ALL closed-form gradient anchors
A1/A3). The differentiable variant is therefore **scoped to the single pendulum** (the
honest "fewer is correct" call — the rigorous moat is single-pendulum by construction; FORWARD
equivalence to the parent still holds at any n). The **n≥2 coupled adjoint gap is documented +
deferred** — a tape-correct multi-link ABA needs per-pass/per-link kernels with no read-after-write
aliasing (a heavy restructure with FD-only verification, no closed-form golden); NOT built this
batch. This is a Stage-0 **on-evidence SHIFT** (HARD RULE 2 — scope to the sound regime, do not fake
a multi-link golden), not a full BLOCK.

Constraints carried into Stage 1a:
1. **On-device, no `.numpy()` in the taped region.** Forward keeps `q/qd/tau` and all scratch as
   `requires_grad=True` Warp arrays across the whole tape. Reuse the parent `aba_kernel` (n=1
   tape-exact) → forward-equivalence to the parent is bit-exact by construction.
2. **Per-step fresh arrays in the rollout.** The inverse-problem rollout allocates fresh
   `requires_grad` state arrays per integrator step (the smoke-diff per-timestep pattern) so no
   cross-step in-place aliasing reintroduces the n≥2 gap.
3. **Scope = n=1.** Gradient goldens, the inverse problem, and the `gradient_matches_FD` PBT are
   single-pendulum-scoped (where the adjoint is provably exact). Forward-equivalence is checked at
   n=1 AND n=2 (forward qdd is exact at any n).
4. **D-MYPY (F-RB-3):** `# mypy: ignore-errors` scoped to Warp-touching files.

## 2. API surfaces consumed (WU-A autodiff substrate — grep-verified at HEAD)

`common_warp.autodiff.{InverseProblem, InitialStateRecoveryProblem, ControlProblem, ParamSpec,
finite_difference_gradient, GradientCheckReport, make_optimizer}` + `new_tape`
(`common/common-warp/src/common_warp/autodiff/inverse_problem.py:73,268,272`;
`common/common-warp/src/common_warp/autodiff/finite_diff.py:26,156`), the `gradient_fields` capture key (schema 1.1.0,
`tools/testkit/schemas/capture-v1.json`), `common_warp.capture.write_frames_capture`, the parent
`articulated_pedagogical.{aba._warp_kernels.aba_kernel, model, analytic}`. The Warp `InverseProblem`
contract: `forward(params, state)` launches kernels reading the `ParamSpec.flat` `requires_grad`
array, returns a `requires_grad` predicted array; `_loss_and_grad` records forward+loss on a
`wp.Tape`, `tape.backward(loss=…)`, reads `flat.grad`, `tape.zero()` AFTER backward.

**Sim's own deliverable:** the tape-safe on-device ABA forward (single-step `qdd` + the semi-implicit
Euler rollout), an `InitialStateRecoveryProblem` subclass (recover `(q0, qd0)` from the observed
final `(q, qd)`), the gradient golden table + derivation, `invariants.py`, the inverse-recovery test,
the inverse-solution capture with `gradient_fields`.

## 3. GRADIENT GOLDEN ANCHOR PLAN (gate-4; ≥3 INDEPENDENT anchors) — single pendulum

**Golden table G1 — `∂q̈/∂q` (state-sensitivity) + `∂q̈/∂τ` (torque-sensitivity).**

- **A1 (analytic STATE-sensitivity):** single pendulum `q̈ = −(g/L) sin q` (point mass at L, I_com=0)
  ⇒ **`∂q̈/∂q = −(g/L) cos q`**, closed-form; autodiff == analytic. **MEASURED machine-exact
  (relerr ≤ 1.9e-16) in §1.** SOURCE: rigid-body EOM / **Featherstone (2008), *Rigid Body Dynamics
  Algorithms*, Ch. 7 §7.3** (the simple-pendulum gravity-only limit, independent of the recursion);
  parent `packages/articulated-pedagogical/articulated_pedagogical/analytic.py:1` docstring
  `theta'' = -(g/L) sin(theta)`.
- **A2 (numerical baseline — exempt per close-R2):** central FD via
  `common_warp.autodiff.finite_difference_gradient` (ε=1e-4/1e-6, O(ε²)), cross-checked against the
  `wp.Tape` adjoint (Warp autodiff is the **engine**; FD + analytic are the **references**). SOURCE:
  independent numerical method (parameter perturbation). MEASURE at 1b.
- **A3 (analytic TORQUE-sensitivity — SOURCE-DISTINCT from A1):** `∂q̈/∂τ = H⁻¹`; for the single
  link the joint-space inertia about the pivot is `H = I_com + m·cdist² = mL²`, so
  **`∂q̈/∂τ = 1/(mL²)`**, closed-form. **MEASURED EXACT (relerr 0.0) in §1.** Distinct **physical
  term** (torque-sensitivity not state-sensitivity), distinct **parameter** (`τ` not `q`), distinct
  **method** (inertia-inversion not gravity-linearization). SOURCE: Featherstone ABA single-link
  inertia / parallel-axis (`H = I_com + m d²`).
- **Forward-equivalence (WU-F differentiable axis):** `diff.forward` qdd == parent
  `aba_forward_dynamics` — **bit-exact by construction** (same kernel), checked at n=1 AND n=2
  (MEASURE at 1b; the forward is exact at any n, only the n≥2 adjoint is out of scope).

## 4. D-class resolutions (charter §3.1 / §7)

| D-class | Resolution |
|---|---|
| **⚠ D-WARP-ADJOINT** (BLOCK gate) | **CLEARED for single-pendulum scope** (§1). n=1 autodiff == analytic to 1.9e-16 (∂/∂q) / 0.0 (∂/∂τ). n≥2 coupled adjoint gap MEASURED (relerr 0.197) → in-place inward-pass aliasing; **single-pendulum scope** (on-evidence SHIFT); multi-link tape-correct ABA DEFERRED (surfaced). |
| **D-CONTACT** | RESOLVED — gravity-only, frictionless (`packages/articulated-pedagogical/articulated_pedagogical/aba.py:55`) ⇒ smooth gradient, no contact-differentiation (the Stages 31-33 problem). |
| **D-DET** (§2.2) | Measure-then-declare at 1b. Forward = fixed-size 3-vector/3×3 loop, no atomic scatter → expected `none`; the tape adjoint reductions use `wp.atomic_add` (sum) → `gradient` row `sum-only`. Warp CPU serial single-thread → expected bit-exact `same-stack-same-hw`; no EFECT. Rows `[rigid-body.articulated-pedagogical-diff.{forward,gradient}]`. |
| **D-INVERSE-SCOPE** (identifiability) | Recover the **initial state `(q0, qd0)`** from the observed final `(q(T), qd(T))` — 2 unknowns, 2 observations → identifiable in the smooth short-horizon regime (the pendulum map is locally invertible away from the separatrix). `InitialStateRecoveryProblem`. MEASURE conditioning at 1b; document. |
| **D-EQUIV-AXIS** | WU-F `differentiable`; forward bit-exact vs parent (gate-14 N/A single-stack). |
| **D-MYPY** (F-RB-3) | `# mypy: ignore-errors` scoped to Warp-touching files (`_kernels.py`, `sim.py`); pure-NumPy helpers stay `--strict`. |
| **D-USD** | DEFER (Stack-E policy, charter §10; carry as closed-with-shifted — no `common_warp` USD surface built). |
| **D-TAG** | NO (phase-close-only, I7). |

## 5. Verdict

**Stage 0 CONFIRMED. D-WARP-ADJOINT BLOCK gate CLEARED (differentiable, machine-exact for the
single pendulum).** A1 ∂q̈/∂q == `−(g/L)cos q` to 1.9e-16; A3 ∂q̈/∂τ == `1/(mL²)` to 0.0; A2
central-FD baseline to MEASURE at 1b. On-evidence SHIFT: the differentiable variant is
**single-pendulum-scoped** (the rigorous moat's natural regime); the n≥2 coupled adjoint gap is
MEASURED (relerr 0.197), documented, and DEFERRED (surfaced for the batch close). Proceed to Stage 1a
(scaffold + RED). NO tag (I7).
