# lattice-boltzmann-d3q19-stack-d

Spec-Phase-2 **Stack-D** port of the Phase-1 `lattice-boltzmann-d3q19` reference
sim: a D3Q19 BGK lattice-Boltzmann solver (Qian-d'Humieres-Lallemand 1992
equilibrium + Guo-2002 body forcing) implemented in **Taichi-DSL** on the CPU
backend (`arch='cpu'`, `cpu_max_num_threads=1`).

The cross-stack equivalence partner is the Phase-1-frozen NumPy reference
(`stack.name='numpy-reference'`); content-equivalence is verified at
`relative = 1e-5, absolute = 0.0` (the `lbm` tolerance category, spec 2.6) at
gate 14 (Stage 1c) for **both** canonical captures (Poiseuille + Couette).

This package is built TDD-first: Stage 1a commits the failing-tests surface
(this directory's `tests/`), Stage 1b implements the `reference` / `sim` /
`invariants` submodules to GREEN (gates 4-13), and Stage 1c adds the cross-stack
equivalence verdict (gate 14).
