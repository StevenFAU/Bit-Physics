# lattice-boltzmann-d3q19

> Phase 1 Stage 2 TDD bootstrap. Per charter § 7.9. Implementation
> deferred to Phase 2+.

**Category:** lattice (spec § 5.7). Stack C (Vulkan).
**Variant:** `bgk-d3q19-qian-1992`.

**Summary.** Single-relaxation-time (BGK) lattice Boltzmann method
on the D3Q19 lattice for incompressible Navier-Stokes. Per R8
amendment, **no Krüger 2017 companion code is vendored** (algebraic
reference only); the D3Q19 lattice constants and equilibrium
distribution are derived from first principles in
[`tools/testkit/golden/derivations/d3q19.md`](../../../../tools/testkit/golden/derivations/d3q19.md).

See [`spec-ref.md`](./spec-ref.md), [`algebraic.md`](./algebraic.md).
