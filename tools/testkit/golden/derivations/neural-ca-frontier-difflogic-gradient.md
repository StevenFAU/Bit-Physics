# Gradient golden derivation — neural-ca-frontier-difflogic

Golden table: `tools/testkit/golden/tables/neural-ca-frontier-difflogic-gradient.json`.
Algorithm: `neural-ca-frontier-difflogic-gradient`. Category: `continuous-ca`.

The table verifies the frozen-gate DiffLogic CA against **three genuinely independent
anchors** (spec § 2.4). No vendored code — closed forms, an exhaustive enumeration against
the published rule, and an independent numerical method.

The update rule is a hand-constructed, FROZEN circuit (ratified D-3 scope, batch-3 § 3.4)
of the 16 two-input boolean gates realised as multilinear extensions — the relaxed-gate
hard limit of Miotti, Niklasson, Randazzo, Mordvintsev, "Differentiable Logic Cellular
Automata" (arXiv:2506.04912, ALIFE 2025; anchor live-verified at the C-1 charter § 2
row 6; CITE-DON'T-IMPORT). No training ⇒ no EFECT.

## A1 — multilinear gate closed form (`value`)

Each gate is the unique bilinear interpolation of its truth table:

    g(a,b) = t00(1-a)(1-b) + t01(1-a)b + t10·a(1-b) + t11·ab.

Hand-derived consequences, all stored as exact goldens: binary corners reproduce the
truth table EXACTLY (small-integer f64 arithmetic — the hard limit; verified for all 16
gates × 4 corners in `test_a1_all_sixteen_gates_exact_at_corners`, no tolerance);
`g(0.5,0.5) = mean(truth table)`; gate 3 (¬a) is `1−a` independent of `b`. Table points
sample AND(=8), XOR(=6), ¬a(=3) at corners and midpoints.

## A2 — exhaustive Game-of-Life equality (`matches`)

The 36-wire circuit (8-neighbor popcount adder tree → count bits → n==2 / n==3 equality →
`alive' = OR(n3, AND(center, n2))`) is evaluated at **all 512** (center × 8-neighbor)
binary configurations and compared with Conway's rule (Gardner, *Sci. Am.* 223(4), 1970)
— an exact golden covering the ENTIRE input space; the stored value is the match count
512. Trajectory fixtures (blinker period-2; glider (1,1)-translation per 4 steps on the
16² torus) corroborate in `tests/test_gol_circuit.py`.

## A3 — central finite-difference baseline (`grad_alpha`)

The WU-A soft-excitation loss `L(alpha) = ||s_T(base + alpha·delta) − target||²` is a
fixed polynomial (composition of multilinear gates over 2 steps); its derivative has no
hand-tractable closed form at grid scale, so the anchor is the central finite difference
of the SAME loss (`common_py.autodiff.finite_diff.finite_difference_gradient`, eps=1e-6)
— an independent numerical method (no tape). Measured autodiff-vs-FD agreement at
table-build: ~1.3e-11 / 1.7e-11 / 7.4e-11 relative on the three points — far inside the
table tolerance (relative 1e-5).
