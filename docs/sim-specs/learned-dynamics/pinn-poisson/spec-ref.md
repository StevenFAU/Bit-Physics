# PINN-Poisson — Reference Spec

> 13-section template per `docs/architecture.md` § 8.2. Phase 3 task-7
> deliverable A per `docs/phases/phase-3-plan.md` § 6.7. FIRST
> learned-dynamics-CATEGORY sim.
>
> **§0.3 SHIFTs (plan § 6.7; documented, no plan edit):** layout
> `packages/pinn-poisson/` (flat, not `learned-dynamics/pinn-poisson/python/`); CI
> `python-strict.yml` (`test-pinn-poisson`, not `build-py.yml`); vendor manifest
> `MANIFEST.toml` (not `manifest.yaml`); Strauss anchor cite **§ 6.2 "Rectangles
> and Cubes"** (not § 6.1, which is "Laplace's Equation").

## 1. Scope

A **Physics-Informed Neural Network (PINN)** solving the **2D Poisson equation**
`Δu = f` on the unit square `Ω = [0,1]²` with Dirichlet boundary data `u = g` on
`∂Ω`, on **Stack E (Warp substrate) + PyTorch** (single-stack). Soft-constraint
Raissi-2019 formulation. Verified **two-pronged**: vs **analytic** Poisson
solutions (golden values, ≥3 independent-reference anchors incl. one inhomogeneous
`f≠0` MMS case) AND vs a **classical finite-difference (FD) reference** (a reusable
testkit surface), plus **solution-verification convergence with collocation
density**.

**CPU-only scope (scope honesty).** This environment has **no CUDA driver**, so the
"Stack E" sim runs **entirely on CPU** (Warp-CPU + PyTorch-CPU). The GPU-Warp path
is **unexercised** here. "Stack E: PASS" therefore means the CPU substrate +
torch↔wp interop + capture bridge are verified — it is **not** a claim that GPU
Warp is verified (same scope-honesty discipline as neural-ca's
"WGSL-shader-verified-but-browser-deploy-unexercised" note).

## 2. Upstream and reference anchor

- **Method:** Raissi, Perdikaris & Karniadakis (2019), "Physics-informed neural
  networks…", *J. Comput. Phys.* **378:686–707** (DOI 10.1016/j.jcp.2018.10.045).
  Reimplemented from the paper (cite-don't-import, spec § H.2).
- **Read-only cross-check oracle:** `references/PhysicsNeMo-PINN/` —
  `physicsnemo-sym` v2.4.0 (`acaeb6dc…`, Apache-2.0), `examples/helmholtz/helmholtz.py`
  (soft-constraint MLP PINN; Helmholtz at `k=0` is Poisson). NOT pip-installed /
  NOT runtime-linked. See corrigendum A-6 (`docs/spec-amendments-proposed.md`): the
  PINN tutorials live in `physicsnemo-sym`, not the core `physicsnemo` repo.
- Spec § 5.12 (learned-dynamics reference posture); § 2.6 learned-dynamics row =
  `distributional` (cross-stack) — N/A here (single-stack), but it underwrites the
  training-non-determinism posture (§ 8).

## 3. Algorithm

A fully-connected `tanh` MLP `N_θ: (x, y) ↦ u` is trained by minimizing a composite
soft-constraint loss over sampled points:

```
L(θ) = L_interior(θ) + λ · L_boundary(θ)
L_interior = mean over interior collocation pts of ( Δu_θ − f )²
L_boundary = mean over ∂Ω pts of ( u_θ − g )²
```

where `Δu_θ = u_xx + u_yy` is formed by **second-order `torch.autograd.grad`**
(the network output differentiated twice w.r.t. its inputs). Optimizer: Adam,
seeded (`config.seed`, default 42). The trained network is then **frozen** and
evaluated on the eval grid; the frozen-network field is the verified artifact.

## 4. Algebraic form

Problem: `u_xx + u_yy = f` on `(0,1)²`, `u = g` on `∂Ω`. Three independent-reference
analytic anchors (all verified symbolically — derivation H,
`tools/testkit/golden/derivations/poisson-2d-analytical.md`):

| Anchor | `u(x,y)` | `f = Δu` | BC `g` | Reference |
|---|---|---|---|---|
| 1 | `½ ln((x+½)² + (y+½)²)` | `0` (harmonic) | trace of `u` | Evans PDE 2e § 2.2 (§ 2.2.1 fundamental solution, n=2; singularity placed at `(−½,−½)` OUTSIDE Ω so `u` is smooth on Ω) |
| 2 | `sinh(πx) sin(πy)` | `0` (harmonic) | nonzero only on `x=1` | Strauss PDE 2e § 6.2 "Rectangles and Cubes" |
| 3 | `sin(πx) sin(πy)` | `−2π² sin(πx) sin(πy)` | `0` | hand-derived MMS — the **load-bearing inhomogeneous (`f≠0`)** case |

Anchor 3 is the **canonical trained instance** (capture descriptor
`poisson-sine-source-64sq-seed42-step1`).

## 5. Implementation

`packages/pinn-poisson/pinn_poisson/`: `problems.py` (the three analytic anchors,
backend-generic over numpy/torch — verified to agree); `model.py` (the MLP +
`PINNConfig`); `residual.py` (autograd PDE residual + boundary loss); `train.py`
(seeded Adam loop → `TrainResult`); `infer.py` (frozen-grid eval + checkpoint I/O +
the **torch→wp→`Capture` bridge**); `fd_reference.py` (adapter onto the testkit FD
solver); `__main__.py` (`train` / `infer` CLI per § 3.2.6). `# mypy: ignore-errors`
is scoped to the Warp-touching `infer.py` only (F-RB-3); the rest is `strict`.

## 6. Verification posture (two-pronged + convergence; ≥ 2 PBT invariants per spec § 2.14)

**Prong 1 — vs analytic (golden, `analytical_l2 = 1e-3`).** The frozen-network field
matches each analytic anchor within relative discrete-L2 `1e-3`. This is the
load-bearing acceptance gate. ≥3 independent-reference anchors per golden table
(Cat-3 HARD_FAILs otherwise, spec § 2.4).

**Prong 2 — vs classical FD (`fd_l2 = 1e-2`).** The frozen-network field matches the
pure-NumPy 5-point-Laplacian FD solution of the same BVP within relative
discrete-L2 `1e-2`. **The FD solver is a high-precision NUMERICAL baseline anchored
to the analytic set — it is NOT an independent reference** (it inherits its own
`O(h²)` discretization error). `fd_l2` is intentionally **wider** than
`analytical_l2` for exactly this reason.

**FD-reference rigor (mutation substitute).** The FD reference's mutation target is
DEFERRED to task-9 (D-MUTATION, rule-of-three — first classical-reference). Its
correctness rests instead on: (a) point-match vs all three analytic anchors, AND
(b) a **convergence-order check** — refining `h ∈ {1/16,1/32,1/64,1/128}` against
the MMS analytic solution, the observed discrete-L2 order is **≈ 2** (`O(h²)`,
5-point Laplacian truncation). A real solver bug breaks the *order*, not just a
tolerance — so this MMS-grade order check is the rigor substitute for the deferred
mutation testing (Phase-0 `mms/` infrastructure is the structural precedent).

**Prong 3 — convergence with collocation density.** Spec § 5.12: the PINN's error
vs the analytic solution decreases as the interior collocation-point count grows
(envelope-scoped to the trained domain).

**Declared PBT invariants (gate-11, ≥2; impl `tools/testkit/property/sims/pinn-poisson/`):**

1. **`boundary_residual_bounded`** — for boundary points sampled within `∂Ω`,
   `|u_θ(x,y) − g(x,y)|` is bounded by a small envelope (the trained boundary-loss
   scale). Envelope-scoped: re-declare the regime on falsification, do NOT widen
   (PINNs do not extrapolate; neural-ca `field_values_bounded` precedent).
2. **`pde_residual_bounded`** — for interior points sampled within `Ω`,
   `|Δu_θ(x,y) − f(x,y)|` is bounded by a small envelope (the trained interior-loss
   scale). Envelope-scoped identically.

Both sample **within the trained domain** (the envelope is the training regime, not
an extrapolation claim). The bounds are MEASURED + locked at Stage 1b-PINN.

## 7. Golden values / Manufactured solutions

Analytic golden tables `tools/testkit/golden/tables/pinn-poisson-canonical-{N}.json`
(authored Stage 1b-FD) carry the three anchors' `u` values at canonical points (e.g.
`u₃(½,½)=1`, `u₃(¼,¼)=½`). Derivation: `poisson-2d-analytical.md` (Stage 1b-FD).
The MMS (Anchor 3) is the manufactured solution `u=sin(πx)sin(πy) → f=−2π²·u`.

## 8. Determinism

Two registry rows `[learned-dynamics.pinn-poisson.{training,inference}]`
(`tools/testkit/determinism/registry.toml`):

- **training** — `non-deterministic` (trained WEIGHTS are seed-dependent — the
  learned-dynamics distributional character), `distributional_bound = "EFECT"`, scope
  `n/a`. **MEASURED (Stage 1b-PINN):** same-seed CPU training is **bit-identical**
  (two seed-42 runs → byte-equal field; the NCA finding transfers), captured by
  `seed_pinned`. The EFECT band is DERIVED from the across-seed training-loss
  distribution (5 seeds: mean 2.37e-6, CV 0.290, **3σ upper 4.44e-6**, locked 5e-6) —
  BOUNDED → derivable, **no STOP-EFECT**.
- **inference** — `bit-exact`, scope `same-stack-same-hw`. **MEASURED bit-identical**
  (frozen model evaluated twice → byte-equal; the torch→wp→Capture bridge preserves
  f64 exactly).

**CRITICAL SEPARATION:** the EFECT bound characterizes TRAINING reproducibility — it
is **NOT** the acceptance gate. The load-bearing gates are the analytic + FD
verification on the frozen network; a STOP-EFECT does NOT block them.

## 9. Equivalence

**N/A — single-stack.** No gate-14, no render-similarity, no cross-stack budget
(`pinn-poisson` is absent from Phases 1/2; there is no cross-stack pair). The two
verification prongs (analytic + FD) replace the cross-stack equivalence axis.

## 10. Diagnostics

Tier-1: PDE-residual + boundary-residual fields. Tier-3 (`tools/diagnostics/tier3/
pinn-poisson/`, Stage 1c): residual heatmaps + the collocation-convergence curve +
the FD convergence-order ladder.

## 11. Build and run

```
python -m pinn_poisson train --seed 42 --anchor anchor3-mms-sine-source --out checkpoints/pinn-poisson
python -m pinn_poisson infer --checkpoint <ckpt> --grid 64 --out captures/pinn-poisson
```

CI: `python-strict.yml` job `test-pinn-poisson` (ruff + `mypy --strict` + pytest;
Stage 1c, when the suite is GREEN). `pytest` runs directly (§ 2.14, no `just`
indirection).

## 12. References

- Raissi, Perdikaris & Karniadakis (2019), *J. Comput. Phys.* 378:686–707.
- Evans, *Partial Differential Equations* 2e, § 2.2 "Laplace's Equation".
- Strauss, *Partial Differential Equations: An Introduction* 2e, § 6.2
  "Rectangles and Cubes".
- `references/PhysicsNeMo-PINN/` (physicsnemo-sym v2.4.0, Apache-2.0, read-only).

## 13. Productization status

```yaml
productization:
  web: false     # 5.1 — Stack E + PyTorch (CPU); no web surface
  binary: false  # 5.2 — no CMake/C++ build
  pypi: true     # 5.3 — Stack E + PyTorch package (packages/pinn-poisson/pyproject.toml)
  render: true   # 5.4 — Poisson solution field renders as a scalar heatmap
  preprint: true # 5.5 — RECOMMENDED canonical: PhysicsNeMo-PINN vendored + MMS-grade O(h²)
```

> Five-boolean block added at the Phase-5 reconciliation pass (converted from a
> prose note; see `docs/_audits/phase-5/reconciliation-*`). This sim is the
> operator-ratified 5.5 preprint canonical (cleanest §6: ≥3 analytic anchors +
> classical-FD + MMS-grade convergence-order; physicsnemo-sym v2.4.0 vendored).
> Terminality context retained: No USD export (Phase-3-Stack-E-WIDE policy; the
> `common_warp.usd` surface is unbuilt); task-7 is terminal on produce. NO USD ≠
> NO preprint: USD opt-out is orthogonal to the five Phase-5 streams.
> Bootstrap-verification (spec § 3.8): golden-table re-check surrogate (no
> committed canonical `.h5` capture — pinn-poisson verifies via
> `pinn-poisson-canonical.json` + analytic/FD checks on the frozen network), NOT
> a `compare_captures` round-trip.
