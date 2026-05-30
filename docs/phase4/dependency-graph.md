# Phase 4 dependency graph

> Per plan § 4.2.G. Foundation WUs (Stages 1-8) ship the public API "sockets";
> frontier-sim Stages 9-35 consume them. Every Phase-4.0 deliverable has a named
> consumer; every Phase-4.1-4.6 sim has a named socket.

```
Phase 4.0 (Foundation) — LANDED
├── WU-P (Portfolio Conventions)          consumed by all WUs + all Phase-4 sims
├── WU-A (Autodiff)         → 4.1 (six diff sims); 4.6 (train-through-sim)
├── WU-B (Sparse Volumes)   → 4.2 (sparse sims); 4.21/4.22 (some 4.4 frontier)
├── WU-C (Gaussian Splatting) → 4.3 (four neural-rendered sims); 4.22 (Gaussian Fluids)
├── WU-D (Newton Physics)   → 4.5 (three rigid-body sims) [runtime CUDA-gated]
├── WU-E (Learning Harness) → 4.6 (two learned-dynamics sims)
├── WU-F (Variant Equivalence) → 4.1-4.6 (all variants; tolerance budgets)
└── WU-G (Phase Ledger)     → 4.1-4.6 (each stage reads + updates its ledger row)
```

## Per-variant-class socket map (plan § 4.5)

- **4.1 Differentiable** → WU-A (InverseProblem family, gradient harness),
  WU-F (compare_captures), WU-G (spec-diff stubs), WU-P, capture `gradient_fields`.
- **4.2 Sparse** → WU-B (SparseVolume, `bit_physics::nanovdb`, tier-2 sparse),
  WU-F, WU-G (spec-sparse stubs), WU-P, capture `active_mask`. (4.9 quadtree is
  sim-local — no § 4.2.B socket.)
- **4.3 Neural-rendered** → WU-C (GaussianSplatModel, TrainingLoop, render,
  PhysicsCoupling, render-similarity), WU-F, WU-G (spec-neural stubs), WU-P.
- **4.4 Frontier** → heterogeneous: 4.20 DiffLogic→WU-A; 4.21 Moment-LBM→WU-B;
  4.22 Gaussian Fluids→WU-B+WU-C; 4.15-4.19 classical→WU-F+WU-G+WU-P only.
- **4.5 Newton-integration** → WU-D (NewtonBackend, NewtonState, USD template +
  capture-to-USD), WU-F, WU-G (rigid-body skeleton), WU-P. CUDA-gated runtime.
- **4.6 Learned-dynamics** → WU-E (CaptureDataset, default_trainer,
  warp_to_torch/torch_to_warp, PhysicsNeMoAdapter), WU-A (train-through-sim),
  WU-F, WU-G (learned-dynamics skeleton), WU-P.
