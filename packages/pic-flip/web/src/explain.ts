// EXPLAIN layer (web spec § 4.2): the hybrid pipeline, the APIC affine
// transfer, the PIC/FLIP/APIC difference, and the honesty tie-ins — each
// equation next to the COMMITTED WGSL it runs and the NumPy reference it
// ports. Snippet anchors are extracted at build time by
// gen-verification.mjs (self-healing: an unmatched anchor fails the build).
import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

function el(tag: string, cls: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function blobLink(parent: HTMLElement, label: string, rel: string, lineNo?: number): void {
  const a = document.createElement("a");
  a.href = V.repo_blob_base + rel + (lineNo ? `#L${lineNo}` : "");
  a.textContent = label;
  a.target = "_blank";
  a.style.marginRight = "0.6em";
  parent.appendChild(a);
}

export function installExplainPanel(panel: PanelShell): void {
  const g = panel.addGroup("explain — equations → committed code");

  // 1. the hybrid pipeline
  g.appendChild(
    el(
      "div",
      "bps-note",
      "One step (identical order to the reference apic_step_3d): P2G → grid decode + gravity → cell labels {air, fluid, solid} → masked projection → solid restore + air extrapolation → G2P (mode) → CFL-substepped RK2 advection → push-apart.",
    ),
  );
  const links1 = el("div", "bps-note");
  blobLink(links1, `wgsl p2g :${V.code_anchors.p2g.start}`, V.links.kernel_core, V.code_anchors.p2g.start);
  blobLink(links1, `numpy p2g_3d :${V.py_anchors.p2g_3d_line}`, V.links.reference_apic, V.py_anchors.p2g_3d_line);
  blobLink(links1, `numpy step :${V.py_anchors.apic_step_3d_line}`, V.links.reference_apic, V.py_anchors.apic_step_3d_line);
  g.appendChild(links1);

  // 2. the APIC affine transfer
  g.appendChild(
    el(
      "div",
      "bps-eq",
      "Cₚ = Bₚ Dp⁻¹,  Dp = ¼ dx² I  ⇒  Cₚ = (4/dx²) Σᵢ wᵢₚ vᵢ (xᵢ−xₚ)ᵀ   (Jiang 2015; course notes eq. 174 — golden-pinned)",
    ),
  );
  const code2 = el("code", "bps-note");
  code2.style.whiteSpace = "pre-wrap";
  code2.style.fontFamily = "monospace";
  code2.textContent = V.code_anchors.bspline_weights.lines;
  g.appendChild(code2);
  const links2 = el("div", "bps-note");
  blobLink(links2, `wgsl g2p :${V.code_anchors.g2p.start}`, V.links.kernel_core, V.code_anchors.g2p.start);
  blobLink(links2, `numpy g2p_3d :${V.py_anchors.g2p_3d_line}`, V.links.reference_apic, V.py_anchors.g2p_3d_line);
  blobLink(links2, "weights golden", V.links.golden_weights);
  blobLink(links2, "derivation", V.links.derivation_transfers);
  g.appendChild(links2);

  // 3. PIC / FLIP / APIC
  g.appendChild(
    el(
      "div",
      "bps-note",
      "PIC carries the full interpolated velocity (smooths — its angular-momentum loss IS its dissipation); FLIP carries only the grid Δ (energetic but noisy); APIC carries velocity + the affine matrix Cₚ — the lumped-mass transfer whose conservation is a THEOREM (Props 5.4/5.5), and the reason the fixed-point-atomic GPU scatter is cheap (FLIP's exact conservation needs a full mass matrix).",
    ),
  );

  // 4. the masked projection + the operator-pair discovery
  g.appendChild(
    el(
      "div",
      "bps-eq",
      "∇·u at fluid nodes: divᵢ = (uᵢ−uᵢ₋₁)/dx (BACKWARD);  pressure gradient: (pᵢ₊₁−pᵢ)/dx (FORWARD) — the adjoint pair composes to the compact 7-point Laplacian. The smoke central/central pair fails free-surface hydrostatics at O(1): a settled column keeps g·dt/2 per step and sinks (algebraic.md § 4 — the load-bearing spec-ref v0.3 correction).",
    ),
  );
  const links4 = el("div", "bps-note");
  blobLink(links4, `wgsl rhs :${V.code_anchors.compute_rhs.start}`, V.links.kernel_core, V.code_anchors.compute_rhs.start);
  blobLink(links4, `wgsl jacobi :${V.code_anchors.jacobi_iter.start}`, V.links.kernel_core, V.code_anchors.jacobi_iter.start);
  blobLink(links4, `wgsl gradient :${V.code_anchors.grad_update.start}`, V.links.kernel_core, V.code_anchors.grad_update.start);
  blobLink(links4, `numpy jacobi :${V.py_anchors.jacobi_line}`, V.links.reference_poisson, V.py_anchors.jacobi_line);
  blobLink(links4, `numpy project :${V.py_anchors.project_line}`, V.links.reference_poisson, V.py_anchors.project_line);
  blobLink(links4, "algebraic.md", V.links.algebraic);
  g.appendChild(links4);
  g.appendChild(
    el(
      "div",
      "bps-note",
      `Solver-depth honesty: Jacobi/Gauss-Seidel move information ~1 cell per sweep (GPU Gems 3 ch. 30). The backend MEASURED the ladder on the canonical column: 20 sweeps retain 100% of g·dt (the pinned documented failure you can run in PROVE), 2000 retain 0.55%, the canonical cap ${V.canonical.n_jacobi} sits in the <0.1% band. The LIVE path runs RBGS+SOR ω=1.9 with warm start — labeled live-only, never gated (warm start makes frames history-dependent).`,
    ),
  );

  // 5. regularizers — declared, not smuggled
  g.appendChild(
    el(
      "div",
      "bps-note",
      "Müller's 'necessary' pair, ON by default and DECLARED in capture provenance: push-apart (pair separation to 2rₚ) and one-sided density-drift compensation div(u′)=k·max(ρ/ρ₀−1,0)/dt. Backend-measured normalizations, both deviations from a naive Müller reading: k=0.05 (k=1 explodes against a CONVERGED solve — his k=1 survives only his 20-40-iteration unconverged solver) and ρ₀ = frame-0 MAX over fluid nodes (a mean fires at rest). Toggle drift OFF ('watch it sink') and the volume trace drops secularly — the failure mode, plotted.",
    ),
  );
  const links5 = el("div", "bps-note");
  blobLink(links5, `wgsl drift :${V.code_anchors.compute_rhs.start}`, V.links.kernel_core, V.code_anchors.compute_rhs.start);
  blobLink(links5, `wgsl push-apart :${V.code_anchors.pp_jacobi.start}`, V.links.kernel_core, V.code_anchors.pp_jacobi.start);
  blobLink(links5, `numpy drift :${V.py_anchors.drift_rhs_line}`, V.links.reference_regularizers, V.py_anchors.drift_rhs_line);
  blobLink(links5, `numpy push-apart :${V.py_anchors.push_apart_3d_line}`, V.links.reference_regularizers, V.py_anchors.push_apart_3d_line);
  blobLink(links5, `numpy ρ₀ :${V.py_anchors.rest_density_line}`, V.links.reference_regularizers, V.py_anchors.rest_density_line);
  g.appendChild(links5);

  // 6. honesty tie-ins
  g.appendChild(
    el(
      "div",
      "bps-note",
      "Honesty caveats (in the demo, not a footnote): (a) angular-momentum conservation is exact at the TRANSFER level, dt=0 — end-to-end conservation needs a compatible integrator (Jiang 2017 JCP; this build uses symplectic Euler, the readout is labeled); (b) the 2015 proof is COLLOCATED — this collocated build claims it directly; a MAC v2 would need Ding, Shinar & Schroeder 2020; (c) APIC dissipates even at dt=0 where FLIP does not (Ding 2020) — 'stable middle ground', not 'best at everything'; (d) the collocated checkerboard null-space is shared with the smoke demo and shown, not hidden; (e) the GPU push-apart is a Jacobi-symmetrized port of the reference's serial Gauss-Seidel sweep (DECLARED deviation, exactly inert at rest).",
    ),
  );

  // 7. positioning + citations
  g.appendChild(
    el(
      "div",
      "bps-note",
      "Positioning (field-surveyed FACT, 2026-07-04): the famous WebGPU water demos (WebGPU-Ocean, WaterBall, Splash, flow) are EOS-based MLS-MPM — none solves a pressure Poisson system; the browser PIC/FLIP lineage has no APIC and no correctness claim. No browser APIC existed anywhere before this demo.",
    ),
  );
  const cites = el("div", "bps-note");
  for (const c of V.citations as { key: string; ref: string; doi?: string; url?: string; arxiv?: string }[]) {
    const a = document.createElement("a");
    a.href = c.doi ? `https://doi.org/${c.doi}` : c.arxiv ? `https://arxiv.org/abs/${c.arxiv}` : (c.url ?? "#");
    a.textContent = `[${c.key}]`;
    a.title = c.ref;
    a.target = "_blank";
    a.style.marginRight = "0.5em";
    cites.appendChild(a);
  }
  g.appendChild(cites);
}
