// signal-workbench — EXPLAIN layer (spec-ref § 5.6): the generating equation
// and its closed-form transform next to the committed source lines (anchors
// extracted at build time by gen-verification.mjs — fail-hard, never
// retyped), plus the discrete-spectrum discipline and the AnalyserNode
// negative lesson.

import V from "./generated/verification.json";

export function installExplainPanel(): void {
  const root = document.createElement("details");
  root.className = "sw-explain";
  const summary = document.createElement("summary");
  summary.textContent = "EXPLAIN — the mathematics under the display";
  root.appendChild(summary);
  const body = document.createElement("div");
  body.innerHTML = `
<p><b>The instrument's contract:</b> every signal is generated from analytic
primitives, so the workbench knows the <i>exact closed-form transform</i> and
overlays it on the measured display. FM: e(t) = A·sin(ω_c t + I·sin ω_m t)
= A·Σ J_n(I)·sin((ω_c + nω_m)t) — the orange stems are J_n(I), not a fit
(Chowning 1973; DLMF 10.23.3 energy identity, recomputed live in PROVE).</p>
<p><b>The discrete-spectrum discipline:</b> the measured DFT of
a windowed, sampled, finite signal is F*W — the analytic spectrum convolved
with the window's own DTFT, sampled on the bin grid. The leakage template's
overlay is that exact shifted-Dirichlet skirt: the "spread" is a predicted
feature, not a bug. Comparing against the idealized continuous line spectrum
instead is the #1 integrity trap — a committed negative control locks it.</p>
<p><b>Why not AnalyserNode?</b> The Web Audio analyser applies a fixed,
non-defeatable Blackman window and returns magnitude-only dB (no phase, no
complex bins); its time smoothing CAN be zeroed, but the window and the
missing phase cannot. The workbench runs its <i>own</i> FFT — the shared
poly-trig Stockham WGSL source at
<code>${V.wgsl_anchors.poly_trig_file}:${V.wgsl_anchors.poly_trig_line}</code>
(WGSL builtin sin/cos guarantee only 2⁻¹¹ absolute; the schrodinger-smoke
63× lavapipe measurement made poly-trig twiddles a house rule), with the 1D
coord_of at <code>src/workbench_core.wgsl:${V.wgsl_anchors.coord_of_line}</code>
and the butterfly injected at
<code>src/workbench_core.wgsl:${V.wgsl_anchors.common_fft_marker_line}</code>.</p>
<p><b>Renderings vs gates:</b> the persistence phosphor, waterfall, and XY
erf-beam are declared renderings of gated data — they never feed the gated
arrays (PROVE has the toggle control). Audio playback is a rendering too:
the worklet synthesizes the same generator definition, ungated.</p>
<p><b>Negative lessons shipped, not hidden:</b> the naive-saw aliasing
template and the off-bin metrology error are deliberately wrong displays,
labeled as such.</p>`;
  root.appendChild(body);
  document.body.appendChild(root);
}
