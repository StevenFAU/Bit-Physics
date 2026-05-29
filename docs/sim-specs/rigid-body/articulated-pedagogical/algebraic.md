# articulated-pedagogical — Algebraic derivation (ABA)

> Deliverable B (charter §3). The Featherstone Articulated-Body Algorithm (ABA,
> reduced/generalized-coordinate forward dynamics) for a planar revolute serial
> chain, with the spatial-algebra conventions made explicit. Companion:
> `spec-ref.md`. Citations are to R. Featherstone, *Rigid Body Dynamics
> Algorithms* (Springer 2008) — page/section per Convention #8 (operator-ratified
> D-ALGO: Ch. 7 §7.2–§7.3, pp. 123–131).

## 1. Conventions (made explicit per charter §3 deliverable B)

- **Coordinate reduction.** Reduced/generalized coordinates: the state is the
  joint vector `q ∈ ℝⁿ` (one scalar per revolute joint), NOT a maximal 6-DOF
  pose per body. This is the basis of ABA's O(n) recursion (Featherstone Ch. 7).
- **Spatial vectors (Plücker coordinates).** Motion and force are 6-D spatial
  vectors in Plücker coordinates (Featherstone Ch. 2). A spatial **motion**
  vector `v = (ω; v_O)` stacks angular velocity `ω` and the linear velocity of
  the body point currently at the origin `O`; a spatial **force** vector
  `f = (n_O; f)` stacks moment about `O` and linear force. The planar (`x-y`)
  specialization keeps the `z` angular component and the `x,y` linear
  components: spatial vectors are 3-D, `v = (ω_z; v_x; v_y)`.
- **Frames.** Each link `i` carries a body-fixed frame at its joint; the
  recursion expresses quantities in either the link frame or the parent frame
  via the Plücker coordinate transform `ⁱX_{i-1}` (Featherstone Ch. 2). The
  base ("link −1") is the inertial world frame, `z` up out of the plane,
  gravity `(0, −g)` in `-y`.
- **Joint model.** Each joint is **revolute** about `z` with scalar coordinate
  `q[i]`. The joint **motion subspace** is the constant spatial axis
  `S = (1; 0; 0)` in planar coordinates (pure `z`-rotation): `v_J = S q̇[i]`
  (Featherstone Ch. 4 joint model; the revolute `S` is a single column).
- **Spatial inertia.** Link `i` (point mass `m_i` at distance `c_i` along the
  link, scalar COM inertia `I_i`) has a 3×3 planar spatial inertia `I_i^S`
  built from `m_i`, the COM offset, and `I_i` (Featherstone Ch. 2 rigid-body
  inertia).

## 2. Single-link reduction (validation anchor)

For `n = 1` with a point mass `m` at distance `L` (`c_1 = L`, `I_1 = 0`), the
joint-space inertia about the pivot is `H = m L²` and the gravitational
generalized force is `τ_g = −m g L sin(q)`. ABA returns

```
q'' = τ_g / H = −(g/L) sin(q).
```

This is the ideal simple pendulum (q from the downward vertical, CCW positive) —
exactly the system the §6 analytic anchors (A1/A2/A3) describe in closed form.
This reduction is the first golden cross-check of the recursion.

## 3. The three ABA passes (Featherstone Ch. 7 §7.3, Table 7.1)

Notation: parent of link `i` is `λ(i) = i−1` (serial chain). `ⁱX_{λ(i)}` is the
Plücker transform from parent to link `i`; `S` the revolute motion subspace.

**Pass 1 — outward (base→tip): velocities and velocity-product bias.**
```
v_i  = ⁱX_{λ(i)} v_{λ(i)} + S q̇[i]
c_i  = v_i ×  (S q̇[i])               # velocity-product (Coriolis/centrifugal) term
```
with `v_0` seeded from the (fixed) base. `×` is the spatial motion
cross-product operator (Featherstone Ch. 2).

**Pass 2 — inward (tip→base): articulated-body inertia and bias force.**
```
I_i^A = I_i^S                                   # initialize at the tip
p_i^A = v_i ×* (I_i^S v_i) − f_i^ext            # bias force; ×* the force cross
# then propagate to the parent (Featherstone §7.3):
U_i   = I_i^A S
D_i   = Sᵀ U_i
u_i   = τ[i] − Sᵀ p_i^A
I_{λ(i)}^A += ⁱX_{λ(i)}ᵀ ( I_i^A − U_i D_i⁻¹ U_iᵀ ) ⁱX_{λ(i)}
p_{λ(i)}^A += ⁱX_{λ(i)}ᵀ ( p_i^A + I_i^A c_i + U_i D_i⁻¹ u_i )
```
`f_i^ext` carries gravity as a body force (equivalently, apply a base spatial
acceleration `a_0 = (0; 0; g)` so gravity enters the acceleration pass —
Featherstone's gravity-as-fictitious-base-acceleration trick, Ch. 7).

**Pass 3 — outward (base→tip): accelerations.**
```
a'_i  = ⁱX_{λ(i)} a_{λ(i)} + c_i
q''[i] = D_i⁻¹ ( u_i − U_iᵀ a'_i )
a_i   = a'_i + S q''[i]
```
The base acceleration `a_0` is set to `(0; 0; g)` so the recursion folds gravity
in (no separate gravity-force assembly). The returned `q''` is the generalized
acceleration vector consumed by the integrator.

## 4. Planar specialization (implementation note)

In the `x-y` plane every spatial vector is 3-D `(ω_z; v_x; v_y)`, `ⁱX_{λ(i)}` is
a 3×3 planar Plücker transform (a rotation by `q[i]` composed with the
joint-offset translation along the link), `S = (1; 0; 0)`, and `D_i` is a scalar
(so `D_i⁻¹` is a reciprocal, not a matrix inverse). This keeps the Warp kernel a
fixed-size 3-vector / 3×3-matrix recursion over `n` links, single-threaded on
the CPU backend for bit-exact determinism (`dtype=wp.float64` throughout).

## 5. Independent test oracle (CRBA + RNEA / closed form)

The production ABA is cross-checked against an **independent** dense formulation
in the acceptance tests: the closed-form simple-pendulum EOM (`n=1`), the
standard closed-form double-pendulum EOM (`n=2`, absolute-angle form, compared
in convention-free Cartesian coordinates), and energy conservation (`n=6`). The
dense composite-rigid-body inertia `H(q)` + recursive-Newton-Euler bias is the
conceptual reference (Featherstone Ch. 5–6) — algorithmically distinct from
ABA's O(n) recursion, so agreement is a genuine equivalence check.

## 6. References

See `spec-ref.md` §12. Primary: Featherstone (2008) Ch. 2 (spatial algebra),
Ch. 4 (joint model), Ch. 7 §7.2–§7.3 (ABA, pp. 123–131, Table 7.1).
