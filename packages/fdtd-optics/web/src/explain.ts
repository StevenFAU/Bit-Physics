// fdtd-optics — EXPLAIN layer (spec-ref § 5.3). The five § 1.1 honesty
// disclosures ship verbatim; the rigor-disclosure gate (§ 6.3) audits their
// presence, so the wording below is contractual — edit the spec first.

import V from "./generated/verification.json";

export function installExplainPanel(): void {
  const root = document.createElement("details");
  root.className = "fo-explain";
  const sum = document.createElement("summary");
  sum.textContent = "EXPLAIN — what is being computed (and what is honestly claimed)";
  root.appendChild(sum);

  const body = document.createElement("div");
  body.innerHTML = `
<p><b>The physics.</b> This sim integrates <b>Maxwell's two curl equations</b> in the
time domain on a <b>Yee grid</b> (Yee 1966): every E component lives on a cell edge,
every H component on the face it threads, staggered a half step in time, so both
updates are centered differences and the whole solver is an explicit leapfrog —
two stencil passes per step, no linear solve. The two Gauss laws are satisfied
automatically by the staggering (a discrete curl has zero discrete divergence),
so what you watch — diffraction, refraction, scattering, evanescent skins,
plasmonic hot spots — is the <i>emergent solution of Maxwell's equations</i>, never
an authored ray or shader effect.</p>

<p><b>Units and stability.</b> Normalized units c = ε₀ = μ₀ = 1 with impedance-normalized
E, so every quantity is O(0.1–10) and f32-friendly (spec § 9). The Courant number is
S_c = ${V.gate.sc} — comfortably below the 2D stability cliff 1/√2 ≈ 0.707. Cross it and the
field blows up to NaN in tens of steps; that is a real property of explicit FDTD,
and this app pauses and says so rather than hiding it.</p>

<p><b>Polarization.</b> The 2D grid solves the TMz set {Ez, Hx, Hy} (Schneider's
transverse-to-z convention). At an interface TMz maps to <b>p-polarization</b> —
which is why the Brewster preset can extinguish its reflection.</p>

<p><b>Boundaries.</b> Open edges use CPML (the Roden–Gedney convolutional PML with
the FDTD++ production grading, κ_max 13.5 / α_max 0.225 / m 3.5 — provenance
Taflove &amp; Hagness ch. 7); coefficients are precomputed in f64 in JavaScript and
uploaded, never exp()'d in WGSL. The deploy-gate scene deliberately uses plain
PEC walls so the gate has zero absorbing-boundary ambiguity.</p>

<p><b>Materials.</b> Painted per cell: dielectric ε_r, conductive loss σ, PEC,
a <b>Drude metal</b> stepped by the semi-implicit ADE (preserves the vacuum CFL
limit), and an instantaneous <b>Kerr χ³</b> via Meep's branch-free Padé D→E factor
(verified against <code>meep/src/step_generic.cpp</code>).</p>

<h4>The five load-bearing honesty disclosures (spec § 1.1 — verbatim)</h4>
<ol class="fo-honesty">
<li><b>NOT "the first FDTD in a browser" — and NOT even "the first client-side
WebGPU Maxwell FDTD."</b> Drysdale's WebGL-FDTD (2017), RobinKa/maxwell-simulation,
wifi-solver.com (2024, client-side WebGPU 2D FDTD, real units, unvalidated, closed),
roman01la/efs (2026-04, openEMS→WASM + WebGPU backend, 3D, real units,
native-vs-WebGPU cross-validated), and heaviside (2026-05, WebGPU TMz/TEz Yee
sandbox, PML, unvalidated) all predate us. The defensible claim is the
<i>conjunction</i>: published, reproducible analytic-validation gates
(Fresnel/Brewster/Mie/grating) + real-time interactive stepping + real units +
client-side WebGPU — which no prior browser EM sim satisfies. efs is the nearest
neighbor: its verification is code-vs-code equivalence against native openEMS and
its UX is batch RF solves; ours is analytic gates and live optics. Respect where due.</li>
<li><b>This is a verified visualizer, not a metrology tool.</b> f32 is sufficient
and correct for the core, but quantitative accuracy is <i>disclaimed for extreme
field concentration</i> (deep plasmonic hot spots, ultra-high-Q resonators) where
dynamic range exceeds ~10⁷–10⁸; gates are measured-tolerance / analytic-anchored,
never bit-exact to a reference.</li>
<li><b>PML is not universal — two distinct failure modes.</b> (a) Media that vary
<i>along the absorption direction</i> (gratings / photonic crystals) break the
coordinate-stretching argument: PML there has irreducible reflection even at
infinite resolution (Oskooi et al., Opt. Express 16:11376, 2008). (b)
<b>Backward-wave modes</b> (negative-index metamaterials, some plasmonic regimes)
turn the PML into gain — exponential amplification (Loh et al., PRE 79:065601(R),
2009). Both are cured by a graded adiabatic absorber. Disclosed, not hidden.</li>
<li><b>The 2D sim is single-polarization.</b> This build solves TMz (↔ p-pol);
the full vector/polarization physics that distinguishes EM from scalar waves is a
3D upgrade. TEz (↔ s-pol) is the first roadmap item.</li>
<li><b>Nonlinear χ³ carries a convention trap.</b> The Kerr scene is pinned to
<b>Boyd's intensity convention</b> n₂ = 3χ⁽³⁾/(4n₀²ε₀c) [SI], which is exactly
Meep's 3χ⁽³⁾/(4n₀²) with ε₀c → 1 in normalized units. The rival field-convention
family (Δn = n₂|E|², e.g. 3χ⁽³⁾/(8n₀)) differs by factors of n₀ε₀c — do not mix.</li>
</ol>

<p><b>What the deploy gate checks</b> (PROVE panel, re-runnable on your GPU):
the ${V.gate.descriptor} canonical — pointwise f32-vs-committed-Python-f64 within
the <code>[defaults.fdtd-optics]</code> relative budget of ${V.tolerance.relative} at every
checkpoint over all three fields, run-twice byte-identity, PLUS the analytic
instruments: Fresnel R = 0.04 within ±2% and cylinder-Mie Q_sca against the
committed Bohren–Huffman table. Numerical-dispersion caveat: waves on this grid
travel up to ~${V.goldens.dispersion_worst_pct}% slow at the default resolution
(the § 3.7 master relation, tabulated in the committed dispersion golden) —
that is a property of the discretization, quantified rather than hidden.</p>`;
  root.appendChild(body);
  document.body.appendChild(root);
}
