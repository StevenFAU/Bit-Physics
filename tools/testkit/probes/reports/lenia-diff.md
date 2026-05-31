---
artifact_id: phase-4-batch-1-lenia-diff-probe
sub_phase: phase-4-batch-1 (CPU-side differentiable frontier; sim 2 of 4)
stage: 0 (pre-implementation probe + anchor verification + D-class resolution)
date: 2026-05-31
head_sha: 24348f4599e751fec3298cbde7f9a28e9eec7194
prior_phase_tag: v0.3.0-phase-3
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: a04690d45feb79c825eaa8a641c71835beb75aa20ff0885d3a721a617355c874
evidence_paths:
  - docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md
  - packages/lenia/lenia/growth.py
  - packages/lenia/lenia/kernel.py
  - packages/lenia/lenia/sim.py
  - packages/lenia/lenia/_taichi_kernels.py
  - common/common-py/src/common_py/autodiff/inverse_problem.py
  - common/common-py/src/common_py/autodiff/finite_diff.py
  - tools/testkit/schemas/capture-v1.json
---

# Pre-implementation probe — lenia-diff (phase-4 batch-1, sim 2)

> Live-repo Stage-0 probe per the batch-1 charter
> (`docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` §5 + §3.2 + §4.2).
> Every cite checked at assertion (Convention #8). The tape-differentiability of the
> forward is a **BLOCK gate** (charter §5 Stage 0) — probed FIRST (§1). FACT = ran/read
> at HEAD `24348f4`; INFERENCE = reasoned.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `24348f4` (clean tree; sim-1 landed) | `git rev-parse HEAD` (FACT) |
| Preflight | `python3 tools/dispatch/preflight-phase.py 4` → **exit 0** (ALL PASSED) | this session (FACT) |
| Integrity | `uv run --directory tools/integrity python -m integrity --all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0, digest `a04690d4…55c874` | this session (FACT) |
| Cross-phase replay | `replay_prior_phase --prior-phase phase-3 --audit docs/_audits/phase-3/close-R3-R5-task9-…md --gates integrity,equivalence,determinism,perf-ledger,property,tolerance-budget` → **ok=True** (6/6 PASS, `prior_phase=v0.3.0-phase-3`) | this session (FACT) |
| LFS bootstrap | `source tools/lfs/setup-lfs-s3-local.sh` → exit 0, `lfs-s3 ready` (R2 bucket `bit-physics-lfs`) — no STOP-LFS-PUSH | this session (FACT) |
| Taichi | `1.7.4` (llvm 15.0.4) — reference pin `taichi>=1.7,<2.0` | `import taichi` (FACT) |
| Forward reference sibling | `packages/lenia/` (Stack D / Taichi; Quad4 conv + Quad4 polynomial growth + clip-Euler) | `ls` + read (FACT) |

> **§R digest drift NOTE (expected):** the charter §R measured `45eed4ca…` at HEAD
> `6d16e87` (pre-sim-1). Sim-1 landed golden tables + registry rows → the digest is now
> `a04690d4…55c874` at HEAD `24348f4`. The **invariant is the 0 HF / 14 SW counts**, NOT
> the digest (which drifts as golden tables land — [[integrity-baseline-digest-method]]).

## 1. ⚠ TAPE-DIFFERENTIABILITY (BLOCK gate) — OK, NO BLOCK

Scratch probe (`/tmp/lenia_tape_probe.py`, not committed): a time-indexed
`ti.field(ti.f64, shape=(STEPS+1, N, N), needs_grad=True)` Quad4-Lenia forward
(real-space Quad4 convolution → Quad4 polynomial growth `G=2·max(0,1−(U−μ)²/(9σ²))⁴−1`
→ clip-Euler), differentiated through `ti.ad.Tape(loss=…)`, in the **smooth-interior
regime** (`σ=0.15`, `μ=0.30`, smooth IC near μ → `base.min()=0.9999`, clip inactive,
`A₁∈(0.39,0.41)`):

| Check | Result (FACT — measured) |
|---|---|
| `ti.ad.Tape` backprop through Quad4 conv + growth + clip-Euler (`∂Loss/∂μ`) | OK (compiles + runs) |
| autodiff `∂Loss/∂μ` vs **A1 closed-form Quad4-growth analytic** | `rel = 1.04e-14` (machine precision — A1 EXACT in the smooth regime) |
| autodiff `∂Loss/∂μ` vs **A2 central FD** (`ε=1e-6`) | `rel = 9.49e-10` |
| autodiff `∂Loss/∂A₀` vs **A3 convolution-Jacobian + growth-deriv chain analytic** | `max-rel = 1.23e-14` (machine precision) |

**Verdict: tape-differentiability WORKS. NO BLOCK.** Three Taichi-AD constraints
discovered (carry into Stage 1a):
1. **Convolution must use `ti.static` tap unrolling.** A nested *runtime* `for di/for dj`
   accumulation inside a differentiated kernel raises "Mixed usage of for-loops and
   statements without looping." `for di in ti.static(range(-R,R+1))` unrolls the fixed
   kernel taps to straight-line `acc += …` statements → tape-safe. (FACT — reproduced +
   fixed in the probe; the landed `packages/lenia` reference uses a *runtime* nested loop
   because it is NOT differentiated.)
2. **Single-write-per-element + time-indexed fields** (the DiffTaichi pattern): the
   convolution writes `U[t,…]`, the update writes `A[t+1,…]`, each once.
3. **IC + params loaded OUTSIDE the tape.** `A.fill()` / `from_numpy()` inside the
   `ti.ad.Tape` block re-triggers the kernel-structure error; load `A[0]` via a dedicated
   `load_a0` kernel and set `μ` *before* the tape, run only the step-kernels inside (the
   sim-1 `_loss_and_grad` pattern). (FACT — root-caused in the probe.)

## 2. API surfaces consumed (common-py autodiff substrate — WU-A, grep-verified)

All at HEAD `24348f4` (identical to the sim-1 surface):
- `InverseProblem` ABC + `ParameterIDProblem` / `InitialStateRecoveryProblem` subclasses —
  `common/common-py/src/common_py/autodiff/inverse_problem.py:71` (`__init__(*, optimizer,
  lr, max_iter, tol)`), abstract `forward(params, state)` `:106`, `params_spec()` `:111`,
  default L2 `loss` `:114`; `fit` `:154`; `check_gradient(*, params, eps, rel_tol)` `:199`;
  `_loss_and_grad` `:136`.
- `ParamSpec` (`flat`, `pack`, `unpack`, `structure`) —
  `common/common-py/src/common_py/autodiff/param_spec.py:22`.
- `finite_difference_gradient(objective, x, *, eps=1e-4)` (central, O(ε²)) —
  `common/common-py/src/common_py/autodiff/finite_diff.py:26`; `make_optimizer` `:156`.
- Capture `gradient_fields` key (schema 1.1.0, optional) — `tools/testkit/schemas/capture-v1.json:100`.

**Sim's own deliverable:** the tape-differentiable Quad4-Lenia forward (`ti.static`-unrolled
conv + growth + clip-Euler with `needs_grad` time-indexed fields), the `ParameterIDProblem`
(μ,σ recovery) + `InitialStateRecoveryProblem` (initial-field recovery) subclasses, the
gradient golden table + derivation, `invariants.py`, the inverse-recovery integration test.

## 3. GRADIENT GOLDEN ANCHOR PLAN (gate-4; ≥3 INDEPENDENT anchors)

**Golden table G1 — growth-parameter + initial-field gradients of the Quad4-Lenia step**,
where `Loss = ‖A(T) − target‖²`.

- **A1 (analytic, GROWTH term — Quad4 polynomial derivative):** in the smooth interior
  (`base = 1 − (U−μ)²/(9σ²) > 0`, clip inactive) the growth `G = 2·base⁴ − 1` has
  closed-form parameter derivatives `∂G/∂μ = 16·base³·(U−μ)/(9σ²)`,
  `∂G/∂σ = 16·base³·(U−μ)²/(9σ³)`, so for one step `∂Loss/∂μ = Σ 2(A₁−target)·dt·∂G/∂μ`
  (and similarly `∂σ`). **MEASURED EXACT to `1.04e-14` in §1.** **Source:** the Quad4
  polynomial growth form — Chan, B.W.-C. (2019), "Lenia — Biology of Artificial Life,"
  *Complex Systems* **28(3):251-286** (arXiv:1812.05433; web-re-verified title/venue this
  session); the exact closed form is grep-cited from the vendored Chakazul source
  `references/Chakazul-Lenia/Python/LeniaF.py:500` @ SHA `adfc542939266de7f4bb7ebb552e8499701ee107`
  (`packages/lenia/lenia/growth.py:8`). Citation granularity is paper/section — no
  sub-equation asserted unread; the load-bearing math is the self-contained Quad4 derivative.
- **A2 (numerical baseline — exempt per close-R2):** central FD via
  `finite_difference_gradient` / the substrate's `check_gradient`. autodiff-vs-FD rel-err
  `9.49e-10` measured in §1.
- **A3 (analytic, CONVOLUTION/KERNEL term — convolution-Jacobian chain, SOURCE-DISTINCT
  from A1):** differentiate `Loss` w.r.t. the **initial field** `A₀` through one
  conv+growth step. The convolution `U = K∗A₀` is linear with Jacobian `∂U_i/∂A₀_j =
  K_{i−j}` (the kernel weights), so `∂A₁_i/∂A₀_j = δ_ij + dt·G′(U_i)·K_{i−j}` with
  `G′(U) = −16·base³·(U−μ)/(9σ²)`, and `∂Loss/∂A₀ = resid + adjoint_K(resid·dt·G′)`,
  closed-form. Independent of A1 in **physical term** (spatial convolution / kernel coupling
  not pointwise growth), **parameter** (the field not a growth scalar), and **method**
  (linear-convolution adjoint not growth-param derivative). **MEASURED EXACT to `1.23e-14`
  in §1.** **Source:** convolution linearity + Quad4 growth derivative, hand-derived; the
  kernel `K(r)=(4r(1−r))⁴` is grep-cited from `references/Chakazul-Lenia/Python/LeniaF.py:493`
  (`packages/lenia/lenia/kernel.py:8`).

### D-ANCHOR — Stage-0 SHIFT-on-evidence (documented; not widened)

The charter §4.2 proposed **A3 = `∂K/∂(kernel params)`** OR **Flow-Lenia (Plantec 2023)**.
Both are **ill-posed as a gradient anchor here** (Stage-0 verification, charter mandate):

- **`∂K/∂(kernel params)` is ill-posed:** the landed Quad4 kernel `K(r)=(4r(1−r))⁴`
  (`packages/lenia/lenia/kernel.py:39`) is **parameter-free** — the only "parameter" is the
  *integer* window radius `R` (`LeniaConfig.R=13`), which is non-differentiable. There is no
  continuous kernel-shape parameter to differentiate.
- **Flow-Lenia (arXiv:2212.07906) is CONTEXT-ONLY:** it is a *mass-conservation* extension
  of Lenia, **not a differentiable method** (per the dispatch's own characterization). It
  does not anchor a gradient.

**A3 re-declared to the convolution-Jacobian initial-field gradient** (above) — which DOES
exercise the kernel (the convolution adjoint *is* the kernel Jacobian), is well-posed, and
is a genuinely independent third anchor (machine-precision verified). This mirrors **sim-1's
A3 shift** (MMS→reaction-ODE-limit) and the dispatch's own Flow-Lenia demotion. HARD-RULE-2
re-declaration on evidence, NOT a tolerance widening.

## 4. D-class resolutions (charter §3.2 / §7)

| D-class | Resolution |
|---|---|
| **D-SMOOTH** | RESOLVED. Gradient regime = **smooth interior** (`base>0`, clip inactive): wide `σ` (~0.15-class, NOT the orbium `σ=0.015` clip-tight preset), `μ ≈ field mean`, `dt=0.1`, small step-count. `base.min()=0.9999` measured in §1. Documented as the golden-table + PBT regime. |
| **D-GROWTH-FORM** | RESOLVED-**KEEP-QUAD4** (no Stage-1b Gaussian decision needed). Quad4 differentiates cleanly in the smooth interior (A1 machine-precision agreement) → the charter's optional Gaussian-growth fallback is NOT exercised. The forward stays byte-faithful to `packages/lenia` (WU-F forward-equivalence at any config; the regime-scope constrains only the *gradient* test, not the forward). |
| **D-ANCHOR** | A3 SHIFTED `∂K/∂kernel-params` → convolution-Jacobian field-gradient (§3). RESOLVED-on-evidence. |
| **D-PARAM / inverse** | PRIMARY inverse = recover `(μ,σ)` growth params from an observed target field (`ParameterIDProblem`). SECONDARY = recover the initial field (`InitialStateRecoveryProblem`, the A3 regime). |
| **D-DET** | §2.2 measure-then-declare. Tape gradient is a deterministic function of fixed inputs → **expected** `bit-exact` / `same-stack-same-hw`; **MEASURE** at Stage 1b (forward + gradient run-twice). No EFECT. |
| **D-MUTATION** | Register `lenia_diff` invariants target in `tools/testkit/mutation/mutmut-config.toml`. MEASURE; advisory (snapshots forbidden). (Lenia has no MMS, so no `*_mms` target — unlike sim-1.) |
| **D-TOL** (⚠ Stage-1b §S.2) | LEAN: gradient golden inline `tolerance` + WU-F `equivalence.variant` differentiable axis + `GradientCheckReport.tolerance` suffice; NO new `tolerance.toml`/`golden_tolerance` row (single-stack; no equivalence override). PROBE the schema at Stage 1b before appending; STOP-SCHEMA-FIT on misfit. |
| **D-GATE14** | N/A (single-stack diff; charter §1.2). WU-F differentiable-axis variant-equivalence applies instead (`equivalence.variant`, rel ≤ 1e-3 / cap 1e-2) — diff.forward == `lenia` reference `step()`. |
| **D-CI** | `python-strict.yml` per-sim job (Taichi/Python; tests in-process — no committed LFS capture read, like `test-lenia`). |
| **D-LAYOUT** | `packages/lenia-diff/` (flat, §0.3; import `lenia_diff`); docs stay category-nested `docs/sim-specs/continuous-ca/lenia/spec-diff.md` (stub EXISTS — de-stub at Stage 1a). |
| **D-TAG** | NO (phase-close-only; I7). |

## 5. LFS / capture

LFS-touching: ships `tests/fixtures/legacy-captures/phase-4-lenia-diff.h5` + an
inverse-solution capture with the **`gradient_fields`** key populated (schema 1.1.0).
Stage-1c push = §Q same-shell `source … && git lfs push --object-id --stdin origin` +
§Q.6 R2-verify. Bootstrap confirmed hot at Stage 0 (§0).

## 6. FACT / INFERENCE summary

FACT (ran/read at `24348f4`): §0 environment, §1 tape-probe numbers (BLOCK OK, three
machine-precision anchor agreements), §2 grep-verified API lines, §3 the parameter-free
Quad4 kernel (A3-as-∂K ill-posedness), the Chan-2019 venue web-re-verification. INFERENCE:
the expected determinism posture (MEASURE pending Stage 1b), the D-TOL landing slot (LEAN,
schema-probe pending), the WU-F forward-equivalence prediction (same math → bit-close).
