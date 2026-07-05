// schrodinger-smoke — EXPLAIN layer (web spec § 3): the wavefunction ->
// velocity pipeline, hbar's double role, and the load-bearing honesty panel.

import V from "./generated/verification.json";

export function installExplainPanel(): void {
  const root = document.createElement("details");
  root.className = "ss-explain";
  const summary = document.createElement("summary");
  summary.textContent = "EXPLAIN — what is Schrödinger's Smoke?";
  root.appendChild(summary);

  const body = document.createElement("div");
  body.innerHTML = `
<p><b>The fluid is a quantum wavefunction.</b> The state is a two-component
spinor Ψ = (ψ₁, ψ₂) with |Ψ| = 1 on a periodic grid. Each step: (1) the exact
FFT free-Schrödinger propagator, (2) pointwise renormalization, (3) an FFT
pressure projection applied as a pure phase shift. The velocity is read out of
the phase: η<sub>e</sub> = ħ·arg⟨Ψ<sub>a</sub>, Ψ<sub>b</sub>⟩ per grid edge —
the smoke you see is a passive tracer cloud advected in that field, never fed
back into Ψ.</p>
<p><b>ħ is the one physical knob.</b> It sets the vortex-core thickness and the
circulation quantum ∮u·dl = 2πħ·n. The flip side (the paper's own
"shortcomings" note): an edge phase lives on (−π, π], so an edge can only
represent |u| ≲ πħ/dx — thinner cores buy less speed headroom. The live
<i>headroom meter</i> in the HUD makes that trade visible instead of hiding it;
past the bound the projection's exactness also breaks (phase wrap).</p>
<p><b>Two spectra, deliberately.</b> The free step uses the continuous
Laplacian eigenvalues −|k|² (paper Eq. 18); the projection divides by the
discrete stencil eigenvalues −(4/dx²)Σsin²(πk/N) (Eq. 17). That is what makes
the post-projection divergence telescope to machine zero — mixing them is the
classic porting bug, pinned here by a committed golden table both this build
and the f64 backend recompute (${V.goldens.laplacian_table}).</p>
<p class="ss-honesty"><b>Honesty panel (permanent):</b> ISF is a
Schrödinger-equation model of incompressible flow. Its vortices are
<i>exactly quantized</i>, but it is <b>not</b> the exact Euler equation — it
adds a Landau-Lifshitz term (a vortex moves as if it were 1/e thinner than it
is), and converges to Euler only as ħ→0. Chern et al. 2016 (SIGGRAPH), DOI
10.1145/2897824.2925868; Chern 2017 Caltech thesis. The 2025 Clebsch-PFM paper
<i>excludes</i> ISF from its Euler-equivalence benchmarks on exactly this
ground. This demo never claims "solves Euler".</p>
<p><b>First in the browser (scoped claim).</b> Prior-art scan dated
2026-07-05 found no browser 3D ISF — known ports are native (authors'
MATLAB/Houdini; a CMU CUDA port at 5M tracers / 48 FPS on 128×64×64; Unity
compute; Julia) plus 2D Shadertoy toys. First <i>that we could find</i>, as of
that date.</p>`;
  root.appendChild(body);
  document.body.appendChild(root);
}
