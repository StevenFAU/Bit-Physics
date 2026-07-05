# Derivation — ISF vortex-ring quantized circulation (golden F)

> **Canonical reference:** Chern et al. (2016), ACM TOG 35(4), DOI
> 10.1145/2897824.2925868, Theorem 1 / § 4.4; Onsager–Feynman circulation
> quantum (arXiv:2003.03590 Eq. 44); Tao, Ren, Tong, Xiong (2021), Phys.
> Fluids 33, 077112, DOI 10.1063/5.0058109.

Algorithm: `isf-vortex-ring-circulation-quantum`. Category:
`volumetric-grid`.

**Status label (load-bearing):** measured-convergent, **approximate** —
continuum-exact, O(h) on the grid; the paper's own language is
"approximately 2πħ_h". NEVER relabel as machine-exact (spec § 6.5).

## 1. Statement

Vorticity in ISF is the exact pullback of the S² area form under the Hopf
map `s = ψ̄iψ` (paper Theorem 1); vortex filaments are point-preimages and
their circulation is quantized: `∮u·dl = 2πħ·n`, `n` = winding number. In
ħ-normalized ISF units this is the Onsager–Feynman quantum `Γ = 2πκħ/m`
with `m = 1`.

## 2. Measurement

The canonical translating-ring IC (paper § 3.1 slab imprint
`θ = π(1 + d/r)`, `ψ₂ = ε = 0.01` zero-guard, normalize + 8 settling
projections) at ħ = 0.05, winding 1. The probe is a closed axis-aligned
rectangular lattice loop threading the ring exactly once
(`ring_probe_loop` in
`packages/schrodinger-smoke/schrodinger_smoke/reference/isf.py`);
circulation = ħ · Σ edge phases along the loop. Because a closed-loop sum
of gauge shifts telescopes to zero, the measurement is projection-invariant
— the residual vs 2πħ comes from the ε second component and the O(h) core
discretization.

## 3. What the table pins

Measured circulation at N ∈ {32, 48, 64} (all ≈ 0.31413 vs target
2π·0.05 ≈ 0.314159; rel err ≈ 1e-4) with a declared rel-err ceiling of
2e-3. `--verify` re-runs the settled IC and the loop sum live.

## 4. Independent-reference anchors

1. **Paper Theorem 1 / § 4.4** — quantization via the Hopf-pullback
   structure.
2. **Onsager–Feynman quantum** — arXiv:2003.03590 Eq. 44 (`Γ = 2πκħ/m`,
   κ ∈ ℤ); the refuted non-dimensional `Γ = 2π` form (missing ħ/m) is
   recorded in spec § 2's do-NOT-cite list.
3. **Knotted-ISF construction paper** (DOI 10.1063/5.0058109) — confirms
   the same quantum on polynomial knot ICs.
