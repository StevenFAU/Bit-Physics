# mpm-multimaterial-diff

Phase-4 batch-1 (sim 3/4) **differentiable** variant of `mpm-multimaterial` —
tape-differentiable 3D APIC neo-Hookean MLS-MPM (Stack D / Taichi `ti.ad.Tape`) on the
WU-A autodiff substrate (`common_py.autodiff`).

- **Inverse problem:** recover the shared initial velocity `v₀` of an elastic blob from its
  observed final particle positions — the DiffTaichi "throw-to-target" inverse
  (`MpmInitialVelocityID`, an `InitialStateRecoveryProblem`).
- **Gradient golden table** (`tools/testkit/golden/tables/mpm-multimaterial-diff-gradient.json`,
  ≥3 independent anchors): **A1** ballistic kinematic limit `∂x(T)/∂v₀ = dt·STEPS·I`; **A2**
  central finite-difference baseline; **A3** neo-Hookean small-strain constitutive
  `d(σ₀₀)/dε = 2μ+λ`.
- **Forward-equivalence (WU-F differentiable axis):** `diff.forward` matches the landed
  `mpm-multimaterial-stack-d` reference rollout (interior small-strain config).
- **Determinism:** MEASURED bit-exact same-stack-same-hw (single-thread CPU serialises the
  P2G `ti.atomic_add` scatter); see `tools/testkit/determinism/registry.toml`
  `[hybrid-pg.mpm-multimaterial-diff.*]`.

Spec: `docs/sim-specs/hybrid-pg/mpm-multimaterial/spec-diff.md`. Probe:
`tools/testkit/probes/reports/mpm-multimaterial-diff.md`. Charter:
`docs/_audits/phase-4/batch-1-charter-2026-05-31T10-51-55Z.md` §3.3 / §4.3.

DiffTaichi (Hu et al., ICLR 2020, arXiv:1910.00935) is the published differentiable-MPM
**method** citation (CITE-DON'T-IMPORT); the constitutive is reimplemented from the landed
reference (Stomakhin 2013 / Jiang 2016 MPM course).
