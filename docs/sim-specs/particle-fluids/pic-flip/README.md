# pic-flip — spec set

Phase-6 Lane-C sim #1 (full posture). Hybrid particle-grid
free-surface fluid: **APIC** primary (Jiang et al. 2015), PIC + FLIP
comparison modes, marker-particle free surface, NEW masked
free-surface Poisson, Muller's two declared regularizers.

- `spec-ref.md` — reference spec (v0.3: v0.2 review pass + backend
  execution notes)
- `algebraic.md` — FACT-tagged derivations (transfers, Dp, angular
  momentum, the masked-projection operator pair + the central-pair
  hydrostatic failure, regularizer normalization, the 1/9 coefficient)
- `determinism.md` — bit-exact-same-hw declaration (7 clauses)
- `equivalence.md` — cross-mode / golden / future-WGSL equivalence

Backend package: `packages/pic-flip/`. Web frontend spec (Stack B):
`packages/pic-flip/web/verification-demo-spec.md`.
