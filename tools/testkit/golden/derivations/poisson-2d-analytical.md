# Analytic Poisson solutions on the unit square — derivation (H)

> Golden-table derivation for `tools/testkit/golden/tables/pinn-poisson-canonical.json`
> (algorithm `poisson-2d-analytic-dirichlet`, category `learned-dynamics`). Phase 3
> task-7 deliverable H. Every Laplacian / boundary claim below was verified
> symbolically with SymPy at assertion (Convention #8).

The 2D Poisson equation on `Ω = [0,1]²` with Dirichlet data:

```
Δu = u_xx + u_yy = f   in Ω,        u = g   on ∂Ω.
```

Three **independent-reference** anchors (≥3 per Cat-3, spec § 2.4). Anchors 1 and 2
are **harmonic** (`f = 0`) and exercise the Laplacian + Dirichlet handling; Anchor 3
is the **load-bearing inhomogeneous (`f ≠ 0`)** case that exercises the Poisson
**source term**.

## Anchor 1 — harmonic, fundamental solution (Evans § 2.2)

```
u(x,y) = ½ ln( (x+½)² + (y+½)² )
```

This is the 2D Laplace fundamental solution `Φ(r) = -1/(2π) ln r` (Evans, *Partial
Differential Equations* 2e, **§ 2.2 "Laplace's Equation"**, § 2.2.1, n=2) — up to a
multiplicative constant, `ln r` with `r` the distance to a source point. The source
point is placed at `(-½, -½)`, **outside** `Ω`, so `u` is **smooth and harmonic**
(`Δu = 0`) everywhere on `Ω` (no singularity inside the domain).

- **Verified:** `Δu = 0` (SymPy `simplify(u_xx + u_yy) = 0`).
- `f = 0`. `g` = trace of `u` on `∂Ω` (nonzero on all four edges).
- Canonical value: `u(½,½) = ½ ln(1² + 1²) = ½ ln 2 ≈ 0.34657359…`.

## Anchor 2 — harmonic, separation of variables (Strauss § 6.2)

```
u(x,y) = sinh(πx) sin(πy)
```

The classic separation-of-variables solution of Laplace's equation on a rectangle
(Strauss, *Partial Differential Equations: An Introduction* 2e, **§ 6.2 "Rectangles
and Cubes"**). `u_xx = π² sinh(πx) sin(πy)`, `u_yy = -π² sinh(πx) sin(πy)`, so
`Δu = 0`.

- **Verified:** `Δu = 0`; `u = 0` on `x=0` (sinh 0 = 0), `y=0` and `y=1` (sin 0 =
  sin π = 0); nonzero only on the `x=1` edge (SymPy).
- `f = 0`. `g` nonzero only on `x=1`.
- Canonical value: `u(½,½) = sinh(π/2) sin(π/2) = sinh(π/2) ≈ 2.30129890…`.

> **SHIFT (charter §1.2, plan § 6.7):** the plan cites Strauss **§ 6.1** for this
> anchor; § 6.1 is "Laplace's Equation" (general theory), and the
> rectangle/separation construction is **§ 6.2 "Rectangles and Cubes"**. Documented
> as a SHIFT (no plan edit, §0.3).

## Anchor 3 — inhomogeneous MMS, the load-bearing source term (hand-derived)

```
u(x,y) = sin(πx) sin(πy)   ⟹   f = Δu = -2π² sin(πx) sin(πy)
```

Method of manufactured solutions: pick `u`, compute `f = Δu` analytically. `u_xx =
-π² sin(πx) sin(πy)`, `u_yy = -π² sin(πx) sin(πy)`, so `f = -2π² sin(πx) sin(πy) =
-2π² u`.

- **Verified:** `f = -2π² u` (SymPy `simplify(f - (-2π²·u)) = 0`); `u = 0` on all
  four edges (zero Dirichlet BC).
- This is the **canonical trained + captured instance** (capture descriptor
  `poisson-sine-source-64sq-seed42-step1`).
- Canonical values: `u(½,½) = 1`, `u(¼,¼) = ½`, `u(¼,¾) = ½`.

## Relationship to the FD reference and the PINN

- The **classical FD reference**
  (`tools/testkit/code_verification/classical-references/poisson-2d-fd/solver.py`)
  is a high-precision **numerical baseline anchored to these analytic solutions —
  NOT an independent reference** (it carries its own `O(h²)` discretization error).
  Its correctness is established by point-matching all three anchors **and** an
  observed-convergence-order check (≈ 2 vs Anchor 3 across `h ∈ {1/15,1/31,1/63,
  1/127}` from `n ∈ {16,32,64,128}`) — the rigor substitute for the deferred FD
  mutation target (D-MUTATION, task-9).
- The **PINN** is trained on these problems and its frozen-network field is verified
  vs the analytic anchor (`analytical_l2 = 1e-3`) and vs the FD solution
  (`fd_l2 = 1e-2`).

The golden table holds **analytic values only** (exact closed forms, tolerance
`1e-12`); FD-vs-analytic and PINN-vs-{analytic,FD} agreement is verified by the
`packages/pinn-poisson/tests/` acceptance suite (not by an exact golden table, since
FD/PINN values carry their own approximation error).
