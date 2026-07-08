// heat-equation — EXPLAIN layer (spec-ref § 5.6): the PDE, both
// discretizations, the stability bound, the two-spectra rule, and the
// load-bearing honesty panel. All numbers come from the build-time data
// spine (generated/verification.json) — never retyped.

import V from "./generated/verification.json";

export function installExplainPanel(): void {
  const root = document.createElement("details");
  root.className = "he-explain";
  const summary = document.createElement("summary");
  summary.textContent = "EXPLAIN — what is this heat equation demo?";
  root.appendChild(summary);

  const body = document.createElement("div");
  body.innerHTML = `
<p><b>The PDE.</b> Transient heat diffusion T<sub>t</sub> = α∇²T + S on a 2D
grid. Two gated solvers evolve the <i>same</i> field: the on-screen
<b>FTCS</b> explicit stencil (first-order in time, second-order in space,
conditionally stable — the von Neumann bound r<sub>x</sub>+r<sub>y</sub> ≤ ½
is enforced live and <i>shown</i>, never hidden), and the <b>spectral /
exponential-integrator</b> solver: FFT → per-mode multiply
exp(−α|k|²Δt) → IFFT — <b>machine-exact per mode and unconditionally
stable</b>, the heat analogue of Schrödinger-smoke's free-step golden.</p>
<p><b>Two spectra, deliberately.</b> The FTCS run is compared against its own
<i>discrete</i> amplification g<sub>h</sub> = 1 + αΔt·λ<sub>h</sub>
(the 5-point stencil symbol); the spectral run against the <i>continuous</i>
decay exp(−α|k|²t). Comparing FTCS to the continuous curve leaks the
truncation error into what should be an exact check — the classic porting
bug, pinned by a committed golden table both this build and the f64 backend
recompute (${V.goldens.laplacian_table}).</p>
<p><b>The glow color is physically derived.</b> Above the glow threshold,
color follows the Planck locus: Planck's law → CIE 1931 XYZ → sRGB, shipped
as a <i>committed golden LUT</i> (${V.goldens.blackbody_table}) — the build
fails if the shader's table drifts from the golden. Honesty note: real
surfaces have emissivity &lt; 1 (0.1 uncertainty ≈ 40 °C at 1000 °C), so
IR-style color is a visualization, not a pyrometer.</p>
<p><b>Precision rule (why no builtin exp/sin in the gated path).</b>
WGSL/Vulkan guarantee builtin sin/cos only to 2⁻¹¹ <i>absolute</i> error and
exp to 3+2|x| ULP; a sibling sim measured a 63× budget overshoot on a
software driver from exactly this. Here the per-mode decay factors are
precomputed in f64 and committed (${V.reference_bin.decay_file}); FFT
twiddles use range-reduced polynomial trig.</p>
<p class="he-honesty"><b>Honesty panel (permanent):</b> v1 is a <b>verified
conduction / scalar-diffusion instrument</b>, not a multiphysics thermal
package (no convection, no radiation transport, no phase change — the
industrial baseline couples all three). The laser template's Rosenthal
thin-plate K₀ overlay is a <i>golden of the idealized equation</i> —
quasi-steady, constant properties, adiabatic — explicitly NOT a validated
melt-pool model. Prior art is named, not vibes: Energy2D ships a
disclaimer ("we cannot guarantee its validity"); VisualPDE's only runtime
self-check is a NaN scan. <b>This sim ships the measurement</b>: the PROVE
panel re-runs the f64-anchored gate on YOUR GPU, live.</p>`;
  root.appendChild(body);
  document.body.appendChild(root);
}
