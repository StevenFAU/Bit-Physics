---
artifact_id: task-7-pinn-poisson-probe
sub_phase: sub-phase-phase-3-pinn-poisson
task: task-7
stage: plan-drafting (pre-implementation probe)
date: 2026-05-29
head_sha: 5cddb6c8ca88646068af9add2afce3335f63d436
prior_phase_tag: v0.2.0-phase-2
integrity_invariant: 0 HARD_FAIL / 14 SOFT_WARN
integrity_digest_at_head: b7460150b61213bb8909659ffc7b103d846ad782f5062d272f2ce572e6abb15e
evidence_paths:
  - docs/phases/sub-phase-phase-3-pinn-poisson.md
  - docs/phases/phase-3-plan.md
  - docs/architecture.md
  - tools/testkit/equivalence/tolerance-schema.json
  - tools/testkit/determinism/registry.toml
---

# Pre-implementation probe — task-7 PINN-Poisson (sub-phase 3.6)

> Live-repo probe per phase-3-plan §6.7 ANCHOR-PROBE STEP + spec §5.3. Authored
> at plan-drafting time; the charter (`docs/phases/sub-phase-phase-3-pinn-poisson.md`)
> consumes this. Every cite checked at assertion (Convention #8). The
> Warp↔PyTorch interop is a BLOCK gate (§6.7) — probed FIRST.

## 0. Environment

| Surface | Value | Source |
|---|---|---|
| HEAD | `5cddb6c` (clean tree) | `git rev-parse HEAD` |
| Prior sub-phase | task-6 neural-ca `closed-with-shifted-6` `96d5205`; gate-14 divergence diagnosis `5cddb6c` (H1-dominant/RNG) | `git log` |
| Preflight | `uv run python tools/dispatch/preflight-phase.py 3` → **exit 0** (hardened `1793b83`) | this session |
| Integrity | `--all --mode strict` → **0 HARD_FAIL / 14 SOFT_WARN**, rc 0 | this session |
| Warp | `1.13.0` (rigid-body pin `>=1.13,<2.0`) | `import warp` |
| PyTorch | `2.12.0+cu130` | `import torch` |
| **CUDA** | **NOT available** (`torch.cuda.is_available()=False`; `wp.get_cuda_devices()=[]`; "Could not find or load the NVIDIA CUDA driver") | this session |

**Load-bearing environment fact:** there is **no GPU/CUDA driver** in this env.
All Warp + PyTorch execution is **CPU-only**. This re-shapes D-DET (see §3): the
dispatch's worry about CUDA-atomic training non-determinism is moot here — training
runs on CPU, where NCA *measured* same-seed training to be bit-identical. Do NOT
assume that transfers; MEASURE freshly (the NCA finding was for a different net /
optimizer). But the env makes the bit-identical outcome plausible, not the worst case.

## 1. ⚠ WARP↔PYTORCH INTEROP (BLOCK gate) — WORKS

Scratch probe (`wp.init()` + a tiny round-trip on the installed Warp 1.13.0 / PyTorch 2.12.0):

| Check | Result |
|---|---|
| `wp.from_torch(torch.float64 tensor)` | OK → `warp...float64` array, shape preserved, device `cpu` |
| `wp.to_torch(warp_array)` round-trip | OK → `torch.equal(orig, back) == True` (bit-identical) |
| Zero-copy (CPU) | CONFIRMED — `torch.data_ptr() == warp_array.ptr` (same memory) |
| f64 dtype mapping | `torch.float64 → warp...float64` (no silent downcast) |

**Verdict: interop WORKS. NO BLOCK.** The verified pattern: `wp.from_torch(t)` /
`wp.to_torch(a)`, zero-copy on the CPU backend, f64 preserved. The GPU zero-copy
path is untestable here (no CUDA driver) but is not on the critical path —
training/inference and the capture bridge all run CPU. The PINN→common-warp Capture
bridge crosses this boundary (torch tensor → wp array → `Capture` payload); the FD
reference does not (pure NumPy per the mms precedent — see §4).

## 2. common-warp / common-py surfaces consumed

**common/common-warp/** (Stack E substrate; rigid-body `:199-209` consumer-site pattern):
- runtime: `init`, `get_device`, `set_device`
- determinism: `set_seed`, `set_warp_deterministic`, `deterministic_context`, `assert_deterministic_run`
- capture I/O (BATCH, not incremental): `Capture`, `write_capture`, `read_capture`, `state_key`, `diagnostics_key`

This is the rigid-body consumer pattern (task-9 soft consumer inventories this site).
PINN-specific surfaces (autodiff PDE residual, collocation sampling, MLP) are the
**sim's own deliverable**, not missing shared infra (rule-of-three; task-9 territory).

**common/common-py/** — non-PyTorch utilities only. §2.10 (plan `:220`) FORBIDS routing
PyTorch through common-py (tasks 6+7 `import torch` directly; task-9 evaluates promotion).

## 3. Determinism registry + tolerance schema (the two surfaces task-7 appends to)

- `tools/testkit/determinism/registry.toml` — plan §3.2.5 (`:461-505`) **pre-bakes a
  `pinn`-shaped two-row example** in spirit: `[<category>.<sim>.training]` (non-det /
  EFECT) + `[<category>.<sim>.inference]` (bit-exact). NCA shipped exactly this shape
  (`[continuous-ca.neural-ca.{training,inference}]`).
- `tools/testkit/equivalence/tolerance-schema.json` — the **`golden_tolerance` top-level
  branch already exists** (lenia-tolerance-schema-fix, §S) and its description
  **explicitly names** `pinn-poisson: analytical_l2, fd_l2` under category `learned-dynamics`.
  The schema permits bespoke numeric/boolean/string per-sim keys under the (category, sim)
  two-level nesting. → **No schema extension, no budget cap, no §2.6 amendment needed**
  (cleaner than rigid-body's new-category situation; see charter D-TOL).

## 4. Classical-reference surface (NEW; §2.8) + mms structural precedent

`tools/testkit/code_verification/`:
- `mms/` exists: `solutions/<problem>/{solution.py, derivation.md, __init__.py}` +
  `solvers/<solver>.py` (e.g. `heat_1d_ftcs.py`, pure NumPy) + `tests/`.
- `classical-references/` does **NOT** exist → task-7 creates it (§2.8 plan `:212-214`).
  Design (mirrors mms): `classical-references/poisson-2d-fd/{solver.py, tests/}` +
  `classical-references/README.md` documenting the pattern for future learned-dynamics sims.
- The FD solver is pure NumPy (5-point Laplacian + sparse solve) — matches the mms
  `heat_1d_ftcs.py` precedent, no Warp dependency.

## 5. PhysicsNeMo vendor — repo split discovered (D-VENDOR-SHA/ROLE)

- Plan §2.18 (`:293-300`) pinned **`NVIDIA/physicsnemo`** (core) at `766e485a` (v2.1.0,
  Apache-2.0). Spec D.3 (`:2553`) row: `pip install nvidia-physicsnemo==<latest 1.x>`.
- **Finding:** the core `NVIDIA/physicsnemo` repo `examples/` has **no PINN / Poisson
  tutorial** (`minimal`, `cfd`, `structural_mechanics`, `weather`, `generative`, …).
  The classic **PINN / elliptic-PDE tutorials live in `NVIDIA/physicsnemo-sym`**
  (`examples/`: `helmholtz`, `darcy`, `airfoil_pinn`, `ldc`, `wave_equation`,
  `surface_pde`, …). physicsnemo-sym latest stable = **v2.4.0** (2026-03-10, Apache-2.0).
- **Finding:** spec D.3 pin text `==<latest 1.x>` is stale — v1.x ended at v1.3.0;
  physicsnemo is now v2.1.0, physicsnemo-sym v2.4.0. Spec §2702 (`PhysicsNeMo 1.x → 2.0
  BLOCKED`) is a **runtime-link** version-bump rule; task-7 vendors **read-only** (oracle,
  reimplement-from-Raissi, do NOT runtime-link), so it does not bind a vendored source.
- → charter D-VENDOR-SHA/ROLE: vendor the closest 2D-elliptic-Dirichlet PINN example from
  **physicsnemo-sym v2.4.0** read-only; Stage 0 web-re-verifies + picks the example +
  files corrigendum **A-6** (spec D.3 + §2.18 note). Surface to operator.

## 6. Analytic-anchor citations (web-verified; Convention #8)

| Anchor | u(x,y) | Δu | Source cite (plan §6.7) | Verified |
|---|---|---|---|---|
| 1 | `log\|z\| = log r` (annulus) | **0** (harmonic) | Evans PDE 2e §2.2 | ✅ §2.2 = "Laplace's Equation"; §2.2.1 fundamental solution `Φ=−1/2π·log\|x\|` (n=2). **Cite CORRECT.** |
| 2 | `sinh(πx) sin(πy)` (unit square) | **0** (harmonic) | Strauss PDE 2e **§6.1** | ❌ §6.1 = "Laplace's Equation" (general theory). Separation-of-variables rectangle solution is **§6.2 "Rectangles and Cubes"**. **Plan cite WRONG → charter SHIFT to §6.2.** |
| 3 | `sin(πx) sin(πy)` (unit square) | **−2π² sin(πx) sin(πy) = f ≠ 0** | hand-derivation (MMS) | ✅ verified: `u_xx=−π²u`, `u_yy=−π²u`, `Δu=−2π²u`; zero Dirichlet BC on `[0,1]²` (`sin 0 = sin π = 0`). |

**D-ANCHOR-SET finding (load-bearing):** Anchors 1 AND 2 are **both harmonic (f=0)** —
they exercise the Laplacian + Dirichlet-BC handling but NOT the Poisson **source term**.
A PINN "solving Poisson" must be verified on `Δu = f, f ≠ 0`. **Anchor 3 is the genuine
inhomogeneous MMS case and is REQUIRED** in the anchor set. Cat-3 HARD_FAILs without ≥3
independent-reference anchors per golden table (spec §2.4 `:373`); the FD solver is a
high-precision **numerical** baseline anchored to the analytic set, NOT itself independent
(document in spec-ref §6).

- Raissi/Perdikaris/Karniadakis (2019), *J. Comput. Phys.* **378, 686–707**
  (DOI 10.1016/j.jcp.2018.10.045) — verified.

## 7. Other probe facts

- Layout: `packages/{articulated-pedagogical,lenia,neural-ca}/` all flat → D-LAYOUT
  `packages/pinn-poisson/` (§0.3 precedence; §6.7 "learned-dynamics/.../python/" stale).
- CI: `.github/workflows/build-py.yml` does **NOT** exist; `python-strict.yml` does →
  D-CI SHIFT (§6.7 deliverable L names build-py.yml).
- `docs/glossary.md` has no PINN/PhysicsNeMo/collocation entries → deliverable-L additions net-new.
- Appendix D.2.3 has **no `pinn-poisson` capture-descriptor row** → propose + add at landing
  (additive, allowed by D.2.3's "any phase landing audit may extend").
- §Q LFS: task-7 ships `phase-3-pinn-poisson.h5` + a canonical capture + a trained
  checkpoint → LFS-touching → Stage-0 `source tools/lfs/setup-lfs-s3-local.sh` first action.
