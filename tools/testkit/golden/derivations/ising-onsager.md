# Ising-classical — Onsager / Kramers-Wannier / Yang hand-derivation

> Golden-anchor derivation for `tools/testkit/golden/tables/ising-classical-critical-temperature.json`
> and `tools/testkit/golden/tables/ising-classical-magnetization.json`.
> All values are closed-form / textbook-grade (no vendored code). Phase 3
> task-3a, spec `docs/sim-specs/lattice-spin/ising-classical/spec-ref.md`.

## 1. Model

The 2D Ising model on an `n x n` square lattice with periodic boundary
conditions, nearest-neighbour coupling `J > 0`, zero external field:

```
H(s) = -J  sum_<ij>  s_i s_j ,        s_i in {-1, +1}
```

with inverse temperature `beta = 1 / (k_B T)` and `k_B = 1`, `J = 1`
throughout (so temperatures are in units of `J / k_B`).

## 2. Kramers-Wannier duality → critical temperature

Kramers & Wannier (1941, Phys. Rev. 60, 252) showed the square-lattice
partition function maps onto itself under a high-/low-temperature
duality that exchanges `beta` with a dual `beta*` satisfying

```
sinh(2 beta J) · sinh(2 beta* J) = 1 .
```

If the transition is unique it must sit at the **self-dual** point
`beta = beta* = beta_c`, i.e.

```
sinh(2 beta_c J) = 1 .
```

Solving for `beta_c` (with `J = 1`):

```
2 beta_c = asinh(1) = ln(1 + sqrt(2))
beta_c  = (1/2) ln(1 + sqrt(2))
T_c     = 1 / beta_c = 2 / ln(1 + sqrt(2)) .
```

Numerically:

```
ln(1 + sqrt(2)) = ln(2.41421356237...) = 0.881373587019...
T_c = 2 / 0.881373587019... = 2.269185314213022 .
```

This is the Onsager (1944, Phys. Rev. 65, 117, section V) exact critical
temperature. The Landau & Binder (2014) textbook five-figure value
`T_c/J = 2.26919` agrees within `4.7e-6` (relative `2e-6`), inside the
golden-table relative tolerance `1e-3` (`critical_temp_rel`).

## 3. Yang spontaneous magnetization

Yang (1952, Phys. Rev. 85, 808, Eq. 96) gives the exact spontaneous
magnetization per spin in the ordered phase `T < T_c`:

```
m(T) = ( 1 - sinh^{-4}(2 beta J) )^{1/8} ,     T < T_c
m(T) = 0 ,                                      T >= T_c
```

At `T = T_c`, `sinh(2 beta_c J) = 1`, so the bracket is `1 - 1 = 0` and
`m = 0` — continuous onset (second-order transition). Above `T_c`,
`sinh(2 beta J) < 1`, the bracket is negative, and `m = 0` by
definition.

Evaluated closed-form anchors (`J = 1`, `beta = 1/T`):

| T    | sinh(2/T)        | m(T) = (1 - sinh^-4)^(1/8) |
|------|------------------|----------------------------|
| 0.5  | 27.2899171971... | 0.9999997746272086         |
| 1.0  | 3.6268604078...  | 0.9992757519570612         |
| 1.5  | 1.7848298468...  | 0.9864996026214945         |
| 2.0  | 1.1752011936...  | 0.9113193778774960         |
| 2.2  | 1.0396078763...  | 0.7847551313839213         |
| 2.25 | 1.0106522076...  | 0.6718540266832790         |

These are the values embedded in
`tools/testkit/golden/tables/ising-classical-magnetization.json`. The
golden-table relative tolerance `5e-2` (`magnetization_rel`) is the
**Monte-Carlo statistical window** at `~10^4` sweeps — the closed-form
function reproduces the table exactly; the tolerance governs the
MC-measured cross-check.

## 4. MC cross-check protocol (ordered-phase measurement)

The spontaneous magnetization is the **ordered-phase** order parameter.
A Metropolis run started from a *random* initial condition at `T < T_c`
forms competing `+`/`-` domains whose net `|m|` is far below `m(T)`
(no global symmetry breaking in finite time). To cross-check the
dynamics against Yang one must start from an **aligned** initial
condition (all spins `+1`, the ordered-phase tag) and measure `|m|`
after warm-up. Measured (64x64, 200 warm-up + 200 sample sweeps):

| T   | aligned-MC \|m\| | Yang m(T) | rel. err |
|-----|------------------|-----------|----------|
| 1.0 | 0.9993           | 0.99928   | 0.0000   |
| 1.5 | 0.9867           | 0.98650   | 0.0002   |
| 2.0 | 0.9110           | 0.91132   | 0.0003   |

All within `magnetization_rel = 5e-2`. This is the protocol exercised
by the reference-sanity MC-vs-Yang test. (Surfaced as a §0.3 physics
note: random-IC domain averaging is NOT the spontaneous magnetization.)

## 5. Energy-per-spin bound

For the `2N`-bond square lattice (`J = 1`, `h = 0`), the per-spin energy
`E/N = -(1/N) sum_<ij> s_i s_j` is bounded by the fully-aligned extremum
`-2` and the fully-frustrated `+2`, i.e. `E/N in [-2, 2]` for any
configuration — the basis of the `energy_per_spin_bounded` PBT
invariant. (Onsager's exact internal energy at `T_c` is `-sqrt(2) ~
-1.414`, comfortably inside the bound.)

## 6. References

- Onsager, L. (1944). Phys. Rev. 65, 117. DOI 10.1103/PhysRev.65.117.
- Kramers, H. A. & Wannier, G. H. (1941). Phys. Rev. 60, 252. DOI 10.1103/PhysRev.60.252.
- Yang, C. N. (1952). Phys. Rev. 85, 808. DOI 10.1103/PhysRev.85.808.
- Baxter, R. J. (1982). Exactly Solved Models in Statistical Mechanics, section 7.10.
- Newman, M. E. J. & Barkema, G. T. (1999). Monte Carlo Methods in Statistical Physics, Fig. 3.1.
- Landau, D. P. & Binder, K. (2014). A Guide to Monte Carlo Simulations in Statistical Physics, 4th ed.
