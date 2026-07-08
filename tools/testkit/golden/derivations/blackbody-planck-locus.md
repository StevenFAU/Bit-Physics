# Derivation — blackbody Planck-locus glow LUT (golden F)

> **Canonical references:** Planck's law with the exact 2019 SI constants;
> CIE 1931 2° colour-matching functions (CVRL `ciexyz31.csv`, committed at
> `tools/testkit/golden/reference_implementations/cie1931_2deg_5nm.csv`,
> sha256 `853b6adb…8ad1c641` (LF-normalized from the CRLF upstream)); IEC 61966-2-1 (sRGB). Cross-check anchor:
> Tanner Helland (2012) empirical fit — **demoted to cross-check**; Helland
> himself: "not accurate enough for serious scientific use." Spec:
> `docs/sim-specs/volumetric-grid/heat-equation/spec-ref.md` § 5.5, § 7 F.

Algorithm: `blackbody-planck-locus-lut`. Category: `volumetric-grid`
(consumer: the heat-equation render layer's glow mode).

## 1. The chain (each link a standard, no fitted constants)

1. **Planck spectral radiance** `B(λ,T) ∝ λ⁻⁵ / (exp(c₂/λT) - 1)` with
   `c₂ = hc/k_B` computed from the exact SI-2019 values
   (h = 6.62607015e-34, c = 299792458, k_B = 1.380649e-23 ⇒
   c₂ = 1.4387768775…e-2 m·K). The c₁ prefactor cancels in the
   chromaticity normalization. `expm1` guards the small-argument tail.
2. **CIE XYZ** by 5 nm rectangle quadrature of `B·(x̄,ȳ,z̄)` over
   360–830 nm (the committed CVRL table; Δλ cancels).
3. **Linear sRGB** via the IEC 61966-2-1 D65 matrix; out-of-gamut negatives
   (deep-red low-T locus) clipped to 0; channels normalized so
   max(channel) = 1 — the LUT carries **chromaticity**, brightness belongs
   to the render layer's exposure/bloom, not the physics table.

Stops: 800 K → 12000 K in 100 K steps (113 stops). The web LUT
(`packages/heat-equation/web/src/generated/blackbody-lut.json`) is written
by the same generator with IDENTICAL stop values; `--verify` (and the web
build spine) fail if the two files' stop arrays diverge — *even the glow
color has a golden table*.

## 2. Cross-checks (asserted at generation time)

1. **CMF integrity:** ȳ peak = 1.000000 at 555 nm; ∫x̄ ≈ ∫ȳ ≈ ∫z̄ within
   0.2% (CIE normalization property; measured 0.03%).
2. **Illuminant A:** the Planckian radiator at T = 2855.542 K (the
   modern-c₂ restatement of the historic 2848 K / c₂ = 1.435e-2
   definition) must land at (x, y) = (0.44758, 0.40745) within 2e-3
   (5 nm quadrature envelope) — the strongest single-point standards
   anchor available.
3. **Locus monotonicity:** x strictly decreasing with T across all stops.
4. **Endpoint physics:** 800 K is red-dominant (r = 1, b ≈ 0); 12000 K is
   blue-dominant (b = 1).
5. **Helland 2012 fit** (gamma-space, peak-normalized, 1500–12000 K):
   worst per-channel deviation recorded in the table's `cross_checks`
   block — the committed measurement of exactly how much accuracy the
   demoted fit gives up.

## 3. Honesty note (emissivity)

The LUT maps **temperature → Planckian chromaticity**. Real surfaces have
emissivity < 1 and spectral emissivity structure; an emissivity uncertainty
of 0.1 maps to ~40 °C at 1000 °C (spec § 10) — the glow layer is a
physically-derived visualization, not a pyrometer.
