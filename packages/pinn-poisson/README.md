# pinn-poisson

Phase 3 task-7 — the **first learned-dynamics-category** sim. A Physics-Informed
Neural Network (PINN) solving the **2D Poisson equation** `Δu = f` on the unit
square `[0,1]²` with Dirichlet boundary data, on **Stack E (Warp substrate) +
PyTorch** (single-stack, CPU-only).

## Method

Soft-constraint PINN, reimplemented from **Raissi, Perdikaris & Karniadakis
(2019)**, *J. Comput. Phys.* **378:686–707** (cite-don't-import). A fully-connected
`tanh` MLP `(x, y) → u` is trained by minimizing a composite loss:

- **interior** — mean-squared PDE residual `(Δu_NN − f)²` on sampled collocation
  points, where `Δu_NN = u_xx + u_yy` is formed by second-order
  `torch.autograd.grad`;
- **boundary** — mean-squared Dirichlet mismatch `(u_NN − g)²` on `∂Ω`.

Cross-checked at derivation time against the read-only vendored
`references/PhysicsNeMo-PINN/examples/helmholtz/helmholtz.py` (Helmholtz at `k=0`
is Poisson).

## Verification (two-pronged + convergence)

1. **vs analytic** (`golden`, `analytical_l2`) — three independent-reference
   anchors: Anchor 1 harmonic fundamental-solution (Evans §2.2), Anchor 2 harmonic
   separation-of-variables (Strauss §6.2), **Anchor 3** the load-bearing
   inhomogeneous MMS `u = sin(πx)sin(πy) → f = −2π²sin(πx)sin(πy)`.
2. **vs classical FD** (`fd_l2`) — a reusable pure-NumPy 5-point-Laplacian
   reference (`tools/testkit/code_verification/classical-references/poisson-2d-fd/`),
   itself verified against the analytic anchors **and** a grid-refinement
   convergence-order check (observed order ≈ 2, `O(h²)`).
3. **convergence with collocation density** — PINN error decreases as the
   collocation-point count grows (envelope-scoped to the trained domain).

## CPU-only scope

This environment has no CUDA driver, so the "Stack E" sim runs entirely on CPU
(Warp-CPU + PyTorch-CPU). The GPU-Warp path is **unexercised** here — "Stack E:
PASS" means the CPU substrate is verified, not GPU Warp.

## CLI

```
python -m pinn_poisson train --seed 42 --anchor anchor3-mms-sine-source --out checkpoints/pinn-poisson
python -m pinn_poisson infer --checkpoint <ckpt> --grid 64 --out captures/pinn-poisson
```

Canonical capture descriptor: `poisson-sine-source-64sq-seed42-step1` (the
inhomogeneous-MMS field on a 64×64 grid; a steady BVP has no time axis, so `step1`
denotes the single captured evaluation).
