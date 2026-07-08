# Derivation — signal-workbench RBJ biquad response (golden D)

> **Canonical reference:** W3C Audio EQ Cookbook (Bristow-Johnson)
> (`docs/sim-specs/signal-processing/signal-workbench/spec-ref.md` § 4.5,
> § 2 anchors 9–11).

Algorithm: `signal-workbench-rbj-biquad-response`. Category:
`signal-processing`.

## 1. Statement

For each of the eight shipped variants (LPF/HPF/BPF/notch/APF/peaking/
low-shelf/high-shelf) the table commits the exact f64 coefficients from the
cookbook intermediates (`ω_0 = 2πf_0/Fs`, `A = 10^{dBgain/40}`,
`α = sin ω_0/(2Q)`) and the sampled closed-form `|H(e^{jω})|`, phase, and
group delay `τ_g = −d arg H/dω` (evaluated analytically via the
per-polynomial `Re[P'/P]` form) at seven pinned frequencies, plus the max
pole radius. `H(e^{jω})` is form-independent, so the golden is unchanged
whether the runtime filters in DF1 (the f64 reference) or transposed DF2
(the f32 runtime rule).

## 2. Stability posture

Jury criterion on the RBJ denominator: every variant is stable in exact
arithmetic on the OPEN interval `f_0 ∈ (0, Fs/2)`, `Q > 0`; the endpoints
put poles ON the unit circle. Every committed case asserts
`max_pole_radius < 1` in-generator. The f32 trap is priced by rule, not by
table: coefficients are ALWAYS computed f64 on the CPU (the committed `b`,
`a` arrays), and the gate scenes avoid `f_0/Fs ≲ 1e-3` at high Q.

## 3. Independent-reference anchors

1. **W3C Audio EQ Cookbook** — coefficient formulas (the author is the
   formula's originator).
2. **scipy.signal.freqz + scipy.signal.group_delay** — independent response
   evaluation vs the analytic forms at ≤ 1e-9 in `--verify`.
3. **Measured impulse-response DFT** over 65536 samples vs `H(e^{jω_k})` at
   ≤ 1e-9 of peak (the web gate's measurement leg); empirical teeth in
   `packages/signal-workbench/tests/test_biquad_response_golden.py`.
