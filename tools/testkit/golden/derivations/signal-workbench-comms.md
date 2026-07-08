# Derivation — signal-workbench comms goldens (golden E)

> **Canonical reference:** Proakis & Salehi 5e + MATLAB `rcosdesign` formula
> + 802.11a EVM (`docs/sim-specs/signal-processing/signal-workbench/spec-ref.md`
> § 4.6, § 2 anchors 12–15).

Algorithm: `signal-workbench-comms-constellation-rrc-evm-ber`. Category:
`signal-processing`.

## 1. Statement

- **Constellations** (BPSK/QPSK/16-QAM/64-QAM): square-grid coordinates
  scaled by `√(3/(2(M−1)))` to unit average energy, Gray-coded per axis;
  the generator asserts average energy = 1 (1e-12) and ZERO
  nearest-neighbor pairs differing by more than one bit.
- **RC/RRC** (T = 1 units): committed taps at β ∈ {0.25, 0.35, 0.5} with
  the exact removable-singularity values `h(0) = 1 + β(4/π − 1)` and
  `h(±1/(4β)) = (β/√2)[(1+2/π)sin(π/4β) + (1−2/π)cos(π/4β)]` — naive
  evaluation is 0/0. Matched-filter identity RRC⊛RRC = RC checked at span
  24 (span-truncation limited: measured 8.3e-3 at span 6 → 2.6e-4 at span
  24; ceiling 5e-4).
- **EVM**: RMS-average-constellation normalization (802.11a/3GPP — pinned;
  Keysight 89600's default is peak-referenced, ×√(9/5) for 16-QAM); a
  constant complex offset `e` gives `EVM_rms = |e|` exactly.
- **Seeded BER**: BPSK over AWGN with PCG64 seed 12345, 200000 bits —
  exact deterministic error counts per Eb/N0 committed next to the
  closed-form `P_b = Q(√(2E_b/N_0))` curve.

## 2. Stability posture

No stepping. Honesty caveats: the seeded error counts are exact under
NumPy's Generator stream-compatibility policy (same-version exact;
cross-version drift would be a documented upstream break, not a physics
failure) — the closed-form Q-curve values carry no such caveat. The web's
v1.2 BER waterfall must reimplement the same PRNG+Box-Muller stream or gate
only on the Q-curve distance, per the spec's cross-runtime honesty note.

## 3. Independent-reference anchors

1. **Proakis & Salehi 5e** — constellation geometry, Gray coding, matched
   filtering, `P_b` closed form.
2. **MATLAB `rcosdesign` documentation formula** — the RRC closed form and
   singular values; the RRC⊛RRC = RC identity checked by direct convolution
   in `--verify`.
3. **802.11a § 17.3.9.6.3 relative constellation error** — the RMS EVM
   normalization; the injected-offset identity `EVM = |e|` is exact by
   construction. Empirical teeth in
   `packages/signal-workbench/tests/test_comms_evm_golden.py`.
