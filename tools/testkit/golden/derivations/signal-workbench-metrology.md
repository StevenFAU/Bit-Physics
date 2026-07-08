# Derivation — signal-workbench metrology closed forms (golden F)

> **Canonical reference:** Analog Devices MT-003 + IEEE Std 1241-2010
> (`docs/sim-specs/signal-processing/signal-workbench/spec-ref.md` § 4.7,
> § 2 anchors 16–17).

Algorithm: `signal-workbench-metrology-thd-sinad-sfdr-enob`. Category:
`signal-processing`.

## 1. Statement

For the prescribed coherent tone (`N = 4096`, `k_0 = 331` with
`gcd(k_0, N) = 1` — IEEE 1241 mutual primality; harmonics
`V = [1, 0.01, 0.003, 0.001]` at `h·k_0` with exact Nyquist folding):

- `THD = √(ΣV_h²)/V_1 = 0.01048809…` (the rms-amplitude ratio — the v0.2
  dimensional fix; v0.1's `√(ΣP)/P` was wrong),
- `SINAD = 10log₁₀(P_1/P_dist) = 39.586…` dB (no noise term in the
  prescribed tone),
- `SFDR = 40 dB` exactly (worst spur = V_2 = 0.01),
- `ENOB = (SINAD − 1.76)/6.02`.

The measured pipeline (generate → FFT → spectrum metrology) must reproduce
each to ≤ 1e-10 relative. The 12-bit ideal-quantizer bench commits the
DETERMINISTIC measured SINAD (73.8986… dB at amplitude 0.999) next to the
`6.02N + 1.76 = 74.0` model and the gap (−0.101 dB): the measurement is the
golden; the formula is the approximation, shown not hidden.

## 2. Stability posture

Coherent sampling is load-bearing: with `k_0`, `N` coprime and rectangular
window, every harmonic is a single exact line and the metrology is
machine-exact. The off-bin/no-window THD reading is the § 3.6 negative
lesson (deliberately wrong, never a gate). Near-full-scale amplitude
(0.999) exercises quantizer code coverage — coprimality alone does not.

## 3. Independent-reference anchors

1. **MT-003** — THD/SINAD/SFDR/ENOB definitions and the SINAD↔ENOB
   relation.
2. **IEEE Std 1241-2010** (DOI 10.1109/IEEESTD.2011.5692956) — coherent
   sampling methodology (mutual primality; near-full-scale drive).
3. **Spreadsheet closed form** (spec-ref § 6.4 hand-check):
   `THD = √(1e-4 + 9e-6 + 1e-6)`, `SFDR = −20log₁₀(0.01) = 40 dB` — the
   measured FFT pipeline reproduces both at ~1e-12. Empirical teeth in
   `packages/signal-workbench/tests/test_metrology_golden.py`.
