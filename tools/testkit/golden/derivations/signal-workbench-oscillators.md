# Derivation — signal-workbench oscillator harmonics + Gibbs (golden B)

> **Canonical reference:** classic Fourier series + Stilson-Smith BLIT 1996
> (`docs/sim-specs/signal-processing/signal-workbench/spec-ref.md` § 4.3,
> § 2 anchors 6–8).

Algorithm: `signal-workbench-oscillator-harmonics`. Category:
`signal-processing`.

## 1. Statement

Exact sine-series amplitudes: saw `(−1)^{k+1}·2/(πk)`; square `4/(πk)` odd
`k`; triangle `(8/π²k²)(−1)^{(k−1)/2}` odd `k` — committed for the first 16
harmonics. The truncated series IS bandlimited by construction, so the
additive lens's spectrum golden is exact (the BLIT/PolyBLEP oscillators are
runtime conveniences; the gate rides the additive path). The Gibbs constant
`Si(π)/π − ½ = 0.0894898…` (fraction of the FULL jump per side, independent
of truncation order) is committed with a measured K=400 truncated-square
overshoot cross-check at O(1/K) agreement (2e-3).

## 2. Stability posture

The committed frame is coherent (`f0 = 31` bins, 16 harmonics, all partials
under Nyquist at `N = 4096`), so the measured-DFT identity is exact — no
partial folds. The naive (non-bandlimited) saw is the § 3.6 negative
control and is deliberately NOT in this table: its aliased lines are the
thing the bandlimited golden must lack.

## 3. Independent-reference anchors

1. **Fourier-series closed forms** (Oppenheim & Schafer 3e ch. 2 /
   standard tables) — exact rationals in π.
2. **Si(π) via scipy.special.sici** (DLMF § 6.2) cross-checked by the
   measured truncated-series overshoot in `--verify`.
3. **Measured-DFT identity**: the coherent additive frame's own FFT
   recovers every committed amplitude at ≤ 1e-12; empirical teeth in
   `packages/signal-workbench/tests/test_aliasing_negative.py` (bandlimited
   vs naive) and `packages/signal-workbench/tests/test_window_goldens.py`.
