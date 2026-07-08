# Derivation — signal-workbench window figures of merit (golden A)

> **Canonical reference:** Nuttall 1981 Table II + Heinzel GH_FFT
> (`docs/sim-specs/signal-processing/signal-workbench/spec-ref.md` § 4.2,
> § 2 anchors 1–3, 24). Harris 1978 anchors **definitions only** — its
> Table I has documented errata (Hann −32 → true −31.47 dB; min-3-term
> Blackman-Harris −67 → −70.83 dB), so no committed value is hand-copied.

Algorithm: `signal-workbench-window-figures-of-merit`. Category:
`signal-processing`.

## 1. Statement

Every shipped window is sum-of-cosine `w[n] = Σ_k (−1)^k a_k cos(2πkn/M)`.
The table commits, per window at the pinned `N = 4096` (periodic form):
coherent gain `Σw/N`, ENBW `N·Σw²/(Σw)²` in bins, scalloping loss (half-bin
response, dB), worst-case process loss (scallop + 10·log₁₀ ENBW), the peak
side lobe (dense-rFFT, pad 64, parabolic-refined so the value is
pad-converged to ~1e-6 dB), and the analytic fall-off order in dB/oct
(endpoint-smoothness property, documented not measured). Two trap points
ride along: the COLA endpoint-convention trio for Hann (periodic → `R=M/2`;
symmetric-with-zero-endpoints → `R=(M−1)/2`; both ripple ≤ 1e-13) and the
Hamming `25/46` trap (the exact rational's later lobe rises to −41.69 dB,
WORSE than the pinned `α = 0.54`'s −42.68 dB).

## 2. Stability posture

Not a time-stepping golden; the posture is convention pinning: periodic
(DFT-even) windows, the pinned `N`, and the scallop column being scalloping
loss, NOT WCPL (they coincide only for the rectangle). The Nuttall4b
(continuous-first-derivative) vs Nuttall4c (min-sidelobe = scipy/MATLAB
`nuttall`) coefficient sets are both committed and named — validating 4b
against scipy fails by construction and must never be "fixed" by swapping
coefficients.

## 3. Independent-reference anchors

1. **Nuttall 1981 Table II** (DOI 10.1109/TASSP.1981.1163506) — corrected
   side-lobe values: Hann −31.47, min-3-term BH −70.83, Nuttall4b −93.32
   (three equal lobes, −18 dB/oct), Nuttall4c −98.17.
2. **Coefficient identities** checked in-generator: `CG = a_0`,
   `ENBW = (a_0² + ½Σ_{k≥1} a_k²)/a_0²` (JOS SASP) vs the dense-FFT
   numerics at 1e-9.
3. **Dual computation**: `--verify` recomputes every figure with an
   independent zero-pad factor (128 vs 64); empirical teeth in
   `packages/signal-workbench/tests/test_window_goldens.py`.
