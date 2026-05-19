# Glossary

> Mirrors Appendix C of [`architecture.md`](architecture.md) verbatim, kept
> as a standalone file for ergonomic lookup.

- **Anchor.** A specific file path + line number citation used in a spec or audit. Anchors drift; specs require re-anchoring before edit (Convention M).
- **Audit report.** Append-only record under `_audits/` documenting verification of a claim or completion of a phase.
- **Capture.** A frame of simulation state serialized in the testkit's canonical format (manifest + HDF5 payload).
- **Cat N.** A category of integrity check; Cat 1 (citations), Cat 2 (contracts), Cat 3 (numerical), Cat 4 (draft-time spec verification), Cat 5 (provenance).
- **Code verification.** Roy 2005 level 1: does the code correctly solve the equations it claims?
- **Solution verification.** Roy 2005 level 2: is the numerical solution converged with respect to discretization?
- **Model validation.** Roy 2005 level 3: do the equations match the phenomenon?
- **Calculation validation.** Roy 2005 level 4: does the sim match a reference experiment?
- **DiffLogic CA.** Differentiable Logic Cellular Automata (Miotti et al. 2025) — discrete-state NCA via DLGNs.
- **FACT / INFERENCE.** Tags on concrete claims in spec/retro/audit prose. FACT is grep-verifiable; INFERENCE cites FACTs.
- **GCI.** Grid Convergence Index — Richardson extrapolation-based bound on numerical uncertainty.
- **Golden value.** Pre-computed expected output of an algorithm at canonical test points; lives in `tools/testkit/golden/tables/`.
- **Hard Rule 2.** "Pause and surface" — when spec disagrees with synced state, the synced state is authoritative.
- **HARD_FAIL / SOFT_WARN / AUDIT_LOG.** Failure modes for integrity checks; HARD_FAIL blocks CI, SOFT_WARN logs warning, AUDIT_LOG writes to audit only.
- **Layer 0 through 7.** The portfolio's architecture layers (testkit, integrity, diagnostics, common, references, replication, frontier, productization).
- **MMS.** Method of Manufactured Solutions — code verification by deriving a source term that makes a chosen analytical function the exact solution of an augmented PDE.
- **NanoVDB.** GPU-friendly portable VDB sparse-volume data structure (Museth 2021).
- **Newton.** NVIDIA's open-source physics engine, GA March 2026, built on Warp + OpenUSD.
- **Order-of-accuracy (OOA) test.** Comparison of formal vs. observed order of accuracy as the discretization is refined.
- **PFM.** Particle Flow Map — the dominant 2025 frontier in fluid simulation.
- **Probe.** A pre-implementation verification of facts (paths, line numbers, signatures) that a spec will assert; committed before spec drafting locks.
- **Roy 2005.** Christopher J. Roy's *Review of code and solution verification procedures for computational simulation*; the canonical V&V framework.
- **Tier 1 / 2 / 3.** Diagnostic toolchain layers (universal / data-structure-specific / per-sim).
- **Verdict.** CONFIRMED / SHIFTED / REFUTED / DEFERRED — the four-state audit outcome.
- **Warp.** NVIDIA's Python framework for GPU-accelerated differentiable simulation.
