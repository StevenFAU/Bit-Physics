# signal-workbench

Phase-6 verified DSP instrument — the repo's first audible and first
instrumentation sim. f64 NumPy/SciPy reference for a WebGPU + WebAudio signal
generator + analyzer where every displayed time/frequency quantity is gated
against the closed-form transform of the signal's own generator.

Spec: `docs/sim-specs/signal-processing/signal-workbench/spec-ref.md`.

## Gated closed forms

- **Rayleigh/Parseval energy** — machine-exact FFT-correctness gate (§ 4.1).
- **Window figures of merit + exact shifted-Dirichlet DTFT skirts** — goldens
  re-derived numerically from committed coefficients (Harris 1978 Table I has
  documented errata; Nuttall 1981 Table II + Heinzel GH_FFT anchor) (§ 4.2).
- **Chowning FM Bessel sidebands** `J_n(I)` at `f_c ± n f_m`, exact per-bin
  line spectrum with Nyquist/zero folding (§ 4.4) — the v1 hero scene.
- **Additive Fourier harmonics + Gibbs overshoot** (§ 4.3); naive-oscillator
  aliasing kept as a negative control, never a default.
- **RBJ biquad `H(e^{jω})`, phase, group delay** from exact f64 coefficients
  (§ 4.5).
- **Constellations / RC-RRC (singularities pinned) / EVM / seeded BER** (§ 4.6).
- **THD/SINAD/SFDR/ENOB** under coherent sampling (`k_0`, `N` coprime) (§ 4.7).

## Run

```bash
uv run --no-sync pytest packages/signal-workbench/tests/
uv run --no-sync python -m signal_workbench --out captures/signal-workbench
```

The web demo lives in `web/` (Vite + WebGPU + WebAudio; see spec § 5).
