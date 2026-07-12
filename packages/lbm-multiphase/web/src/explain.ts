// lbm-multiphase — EXPLAIN layer (spec § 5.3): the pseudopotential story,
// the forcing-scheme inversion, and the five honesty boundaries, verbatim.

export function installExplainPanel(): void {
  const root = document.createElement("details");
  root.className = "lm-explain";
  root.innerHTML = `
    <summary>EXPLAIN — how one force term becomes two fluids</summary>
    <p><b>The whole trick is one line.</b> Every lattice site pulls on its
    neighbors a little harder where the fluid is denser:
    <code>F = −G ψ(ρ) Σ wᵢ ψ(ρ(x+cᵢ)) cᵢ</code>. That force bends the
    equation of state into <code>p = ρc<sub>s</sub>² + (Gc<sub>s</sub>²/2)ψ²</code>
    — and below a critical coupling the pressure curve turns non-monotone, so
    a uniform fluid is unstable and <i>decides</i> to become liquid droplets
    in vapor. No interface tracking, no surface-tension model: capillarity,
    coalescence, nucleation and wetting all emerge from that one term.</p>
    <p><b>Two tiers, one kernel.</b> Tier A (ψ = e<sup>−1/ρ</sup> + Guo
    forcing) is the metrology tier: it is the only pseudopotential
    configuration whose liquid/vapor densities provably satisfy Maxwell's
    equal-area rule, independent of viscosity — measured here τ-invariant to
    ~2×10⁻¹⁵. Tier B (Carnahan–Starling + σ-tuned forcing, ε = 1.68) is the
    showcase tier: wider stability, bigger density ratio, gated against the
    ε-weighted mechanical-stability integral instead — because the
    pseudopotential model is <i>thermodynamically inconsistent at the
    discrete level</i>, and we gate what it actually does, not what we wish
    it did. (At T/T꜀ = 0.7 the measured vapor density rejects raw Maxwell by
    −3.1% and matches the ε-integral to +0.4%.)</p>
    <p><b>The forcing-scheme inversion</b> (Li–Luo–Li 2012, verified in the
    f64 reference): Guo's "exact" forcing has the <i>worst</i> stability
    envelope, because the extra terms other schemes inject act as effective
    repulsion. Consistency and robustness genuinely fight — that is why the
    tier split exists. Try the SC velocity-shift toggle in the backend
    reference: its coexistence drifts with τ (ours moves ~5×10⁻²; Guo's
    moves ~10⁻¹⁵).</p>
    <p><b>Liquid–vapor is not free-surface.</b> The famous GPU splash demos
    (FluidX3D-class) are free-surface VoF: the gas phase is <i>ignored</i>.
    Here the vapor is simulated — droplets can nucleate and evaporate — at
    the price of a bounded density ratio (~5 Tier A / ~14 Tier B at the
    canonical points).</p>
    <ol class="lm-honesty">
      <li><b>Not the first browser LBM</b> — single-phase browser LBMs exist
      (Schroeder 2013 CPU-JS; huj31415 2025 WebGPU; others). The claim is the
      conjunction: <i>multiphase</i> + <i>published analytic gates</i> +
      real-time WebGPU. No prior browser LBM has either of the first two.</li>
      <li><b>The model is thermodynamically inconsistent</b> at the discrete
      level; only Tier A is gated against exact Maxwell, Tier B against its
      own mechanical-stability integral. Disclosed, not hidden.</li>
      <li><b>Density ratio is bounded and viscosity has a floor.</b> The f32
      envelope here is narrower than published f64 envelopes; the NaN box you
      can trigger with the boil tool is the honest failure mode.</li>
      <li><b>Spurious currents exist</b> at curved interfaces (5th-order
      force anisotropy). The parasite view displays them against the gated
      ceiling (~3×10⁻³ measured; 0.028/0.0053 published BGK/MRT anchors).</li>
      <li><b>f32 is conditionally sufficient</b>: DDF-shifting everywhere,
      committed f64 ψ-LUT, no WGSL transcendentals on gated paths, symmetric
      aggregates gated rather than symmetry-fragile pointwise signals.</li>
    </ol>
    <p class="lm-fine">Backend: <code>packages/lbm-multiphase/</code> (f64
    NumPy reference, golden tables, run-twice-witnessed canonical). Spec:
    <code>docs/sim-specs/lattice/lbm-multiphase/spec-ref.md</code>. v1 ships
    BGK collisions; the published Li-2013 weighted-MRT Tier-B variant and the
    Hysing rising-bubble curve gate are disclosed v1.x follow-ups.</p>
  `;
  document.body.appendChild(root);
}
