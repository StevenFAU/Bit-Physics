# Glossary

> Mirrors Appendix C of [`architecture.md`](architecture.md) verbatim, kept
> as a standalone file for ergonomic lookup.

- **3DGS (3D Gaussian Splatting).** Kerbl et al. 2023 radiance-field method representing a scene as anisotropic 3D Gaussians (position, scale, rotation, opacity, spherical-harmonic colour), rendered by EWA splatting. The `common/common-3dgs/` module (spec § 11.4 item 3.8).
- **.ply 3DGS scene format.** Inria's PLY layout for a 3DGS scene: per-vertex `x y z`, normals, `f_dc_*`/`f_rest_*` (SH coefficients), `opacity` (logit-stored), `scale_*` (log-stored), `rot_*` (quaternion); binary-little-endian float32. Anchored at `references/3DGS-reference/scene/gaussian_model.py`.
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
- **LPIPS.** Learned Perceptual Image Patch Similarity (Zhang et al. 2018) — a deep-feature-distance image similarity metric using pretrained AlexNet / VGG / SqueezeNet backbones + a small linear "head" calibrated on the BAPPS judgement dataset. Used in `tools/testkit/render_similarity/` (`lpips==0.1.4`); 0 = identical, larger = more perceptually different.
- **MMS.** Method of Manufactured Solutions — code verification by deriving a source term that makes a chosen analytical function the exact solution of an augmented PDE.
- **MS-SSIM.** Multi-Scale Structural Similarity (Wang et al. 2003). Extends SSIM by computing the score across a pyramid of downsampled scales. Shipped as a SHELL at Phase 3 (`tools/testkit/render_similarity/metrics.py:ms_ssim`, raises `NotImplementedError`); implementation lands at Phase 4 WU-C.
- **NanoVDB.** GPU-friendly portable VDB sparse-volume data structure (Museth 2021).
- **Newton.** NVIDIA's open-source physics engine, GA March 2026, built on Warp + OpenUSD.
- **Order-of-accuracy (OOA) test.** Comparison of formal vs. observed order of accuracy as the discretization is refined.
- **Perceptual loss.** A class of image-similarity losses computed in a learned-feature space (rather than raw pixel space) — the design that motivates LPIPS. In Bit-Physics, "perceptual loss" refers specifically to the evaluation-time metric (LPIPS / MS-SSIM); the differentiable training-time variant is Phase 4 WU-C scope, not Phase 3.
- **PFM.** Particle Flow Map — the dominant 2025 frontier in fluid simulation.
- **PSNR.** Peak Signal-to-Noise Ratio (dB). Closed-form `20 * log10(MAX_I / sqrt(MSE))`; image-similarity metric where larger = more similar. Sentinel `+inf` for identical pairs (MSE = 0). The §2.12 quality floor is 28 dB. Implemented at `tools/testkit/render_similarity/metrics.py:psnr`.
- **Probe.** A pre-implementation verification of facts (paths, line numbers, signatures) that a spec will assert; committed before spec drafting locks.
- **Roy 2005.** Christopher J. Roy's *Review of code and solution verification procedures for computational simulation*; the canonical V&V framework.
- **Spherical harmonics (SH).** Orthonormal basis on the sphere used to encode a 3DGS Gaussian's view-dependent colour; degree `d` has `K = (d+1)²` coefficients per RGB channel (degree 3 → K=16). Evaluation anchored at `references/3DGS-reference/utils/sh_utils.py`.
- **SSIM.** Structural Similarity Index (Wang et al. 2004 "Image Quality Assessment: From Error Visibility to Structural Similarity", Eq. 13). Image-similarity metric in `[-1, 1]`; 1 = identical. Three-factor decomposition (luminance × contrast × structure). The §2.12 quality floor is 0.85. Implemented at `tools/testkit/render_similarity/metrics.py:ssim` via `skimage.metrics.structural_similarity`.
- **Tier 1 / 2 / 3.** Diagnostic toolchain layers (universal / data-structure-specific / per-sim).
- **Verdict.** CONFIRMED / SHIFTED / REFUTED / DEFERRED — the four-state audit outcome.
- **Warp.** NVIDIA's Python framework for GPU-accelerated differentiable simulation.
