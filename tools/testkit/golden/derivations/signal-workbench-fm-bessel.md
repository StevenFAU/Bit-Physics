# Derivation — signal-workbench FM Bessel sidebands (golden C)

> **Canonical reference:** Chowning 1973 + DLMF § 10.23
> (`docs/sim-specs/signal-processing/signal-workbench/spec-ref.md` § 4.4,
> § 2 anchors 5, 25).

Algorithm: `signal-workbench-fm-bessel-sidebands`. Category:
`signal-processing`.

## 1. Statement

Chowning FM `e(t) = A sin(ω_c t + I sin ω_m t)` expands exactly as
`A Σ_n J_n(I) sin((ω_c + nω_m)t)` — sidebands `J_n(I)` at `f_c ± n f_m`,
odd lower sidebands negative via `J_{−n} = (−1)^n J_n`. On the coherent bin
grid (`kc`, `km` integers) every line is on-bin, so the rectangular-window
DFT is machine-exact against the **folded** line set: a line whose bin
exceeds Nyquist or goes negative folds with the sine's odd symmetry
(`sin` at bin `k_mod ∈ (N/2, N)` ≡ `−sin` at `N − k_mod`). The table
commits signed `J_n(I)` for `n ∈ [−8, 8]` at the canonical gate scene
(`N=4096, kc=512, km=37, I=3.2`), the diagnostic scene, and the two `J_0`
carrier nulls (`I = 2.404825…, 5.520078…`), plus the DLMF 10.23.3 energy
identity residual and the measured-DFT-vs-golden ceiling (1e-12 of peak).

## 2. Stability posture

Pure closed-form scene — no stepping. The integrity risk is the
discrete-spectrum discipline (spec-ref § 3.2): the golden is the folded
on-bin line set of the sampled frame, never the continuous two-sided line
spectrum; `--verify` runs the generated frame's own FFT against the folded
golden at every committed index, which fails immediately if folding, sign
structure, or normalization (`−jN/2` per sine line) drifts.

## 3. Independent-reference anchors

1. **Chowning 1973** (JAES 21(7):526–534) — sideband structure and sign
   convention, stated verbatim in the paper.
2. **scipy.special.jv** — f64 numeric values; cross-checked by the DLMF
   10.23.3 identity `J_0² + 2Σ J_n² = 1` at ≤ 1e-12 for every committed
   index, and the `J_0` zeros against the DLMF Bessel-zero tables.
3. **Measured-DFT identity** in `--verify` (the same check the web gate
   re-runs live); empirical teeth in
   `packages/signal-workbench/tests/test_fm_bessel_golden.py`.
