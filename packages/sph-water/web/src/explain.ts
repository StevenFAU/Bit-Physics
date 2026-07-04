// EXPLAIN layer (spec § 4.2) — equation → committed code legibility. Every
// snippet is extracted at build time by gen-verification.mjs (HARD-FAIL on
// anchor drift), so the equations shown are the equations that run.

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const CSS = `
.sw-details { font: 11px/1.5 var(--mono, monospace); color: var(--txt, #cdd7dc); margin: 4px 0; }
.sw-details summary { cursor: pointer; color: var(--accent, #4dd8c0); }
.sw-eq { margin: 8px 0 2px; color: var(--warm, #d8b04d); }
.sw-code { display: block; white-space: pre; overflow-x: auto; background: rgba(255,255,255,0.04);
  padding: 6px; margin: 4px 0; font-size: 10px; }
.sw-links a { color: var(--accent, #4dd8c0); margin-right: 10px; font-size: 10px; }
.sw-note { color: var(--dim, #8ba0ad); font-size: 10.5px; margin: 4px 0; }
.sw-trap { border-left: 2px solid var(--bad, #e05c5c); padding-left: 8px; }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function blobLink(parent: HTMLElement, label: string, relPath: string, line?: number): void {
  const a = el("a", "", label);
  a.href = `${V.repo_blob_base}${relPath}${line ? `#L${line}` : ""}`;
  a.target = "_blank";
  a.rel = "noreferrer";
  parent.appendChild(a);
}

export function installExplainPanel(panel: PanelShell): void {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const group = panel.addGroup("equations → code");
  const details = el("details", "sw-details");
  details.appendChild(el("summary", "", "SPH, DFSPH, and the committed WGSL that runs it"));
  group.appendChild(details);

  const body = el("div", "");
  details.appendChild(body);

  // --- kernel + THE convention trap ------------------------------------------
  body.appendChild(el("div", "sw-eq", "W(q,h) = σ₃/h³ · f(q),  σ₃ = 1/π,  q = |r|/h,  support q < 2"));
  body.appendChild(
    el(
      "div",
      "sw-note sw-trap",
      "The #1 SPH porting bug, made explicit: this repo (after Monaghan 1992/2005) uses the SUPPORT-2h convention — σ₃ = 1/(πh³), W(0) = 1/π at h=1, neighbors within 2h, grid cells sized 2h. SPlisHSPlasH and most graphics code write the same spline with SUPPORT-h — σ₃ = 8/(πh³). Port code across conventions without re-deriving and every density is silently wrong by a factor pattern that LOOKS plausible. The golden table pins this repo's convention; the gate would catch the mistake.",
    ),
  );
  const kcode = el("code", "sw-code");
  kcode.textContent = V.code_anchors.kernel_f.lines + "\n" + V.code_anchors.kernel_W.lines;
  body.appendChild(kcode);
  let links = el("div", "sw-links");
  blobLink(links, `wgsl L${V.code_anchors.kernel_f.start}–${V.code_anchors.kernel_W.end}`, V.links.kernel_core, V.code_anchors.kernel_f.start);
  blobLink(links, `numpy :${V.py_anchors.f_line}`, V.links.reference, V.py_anchors.f_line);
  blobLink(links, "golden table", V.links.golden_kernel);
  body.appendChild(links);

  // --- density + continuity ------------------------------------------------------
  body.appendChild(el("div", "sw-eq", "ρᵢ = Σⱼ mⱼ W(rᵢⱼ)   ·   dρᵢ/dt = Σⱼ mⱼ (vᵢ−vⱼ)·∇W(rᵢⱼ)"));
  body.appendChild(
    el(
      "div",
      "sw-note",
      "Density summation (self term included) and the SPH continuity equation — Bender & Koschier 2015, eq. (5). Both are gated: the two-particle fixture is matched to 1e-15 by the in-page f64 mirror, and the full-scale density field is matched pointwise against the committed 100K capture.",
    ),
  );
  links = el("div", "sw-links");
  blobLink(links, `wgsl density L${V.code_anchors.density_grid.start}`, V.links.kernel_core, V.code_anchors.density_grid.start);
  blobLink(links, `wgsl continuity L${V.code_anchors.continuity_grid.start}`, V.links.kernel_core, V.code_anchors.continuity_grid.start);
  blobLink(links, `numpy :${V.py_anchors.density_evolution_line}`, V.links.reference, V.py_anchors.density_evolution_line);
  body.appendChild(links);

  // --- the canonical scene ---------------------------------------------------------
  body.appendChild(el("div", "sw-eq", "canonical: v.z += g·dt;  p += dt·v   (explicit Euler, gravity only)"));
  body.appendChild(
    el(
      "div",
      "sw-note",
      `Honesty about the committed capture: its descriptor says "dam-break", but the scene it actually runs is a seeded uniform cloud in RIGID FREE-FALL — the reference computes dρ/dt each step and discards it; nothing interacts. That is exactly why the gate can be pointwise at 100K: the trajectory is non-chaotic and the committed per-particle f64 density fields are reproducible. The capture also ran at h=${V.canonical.params_as_run.h} (CANONICAL_H), not the manifest's diagnostic default 0.05 — verified numerically before this demo was built.`,
    ),
  );
  links = el("div", "sw-links");
  blobLink(links, `wgsl integrator L${V.code_anchors.integrate_canonical.start}`, V.links.kernel_core, V.code_anchors.integrate_canonical.start);
  blobLink(links, `sim.py :${V.py_anchors.canonical_step_line}`, V.links.sim, V.py_anchors.canonical_step_line);
  body.appendChild(links);

  // --- DFSPH ------------------------------------------------------------------------
  body.appendChild(
    el("div", "sw-eq", "αᵢ = ρᵢ / (|Σⱼ mⱼ∇Wᵢⱼ|² + Σⱼ|mⱼ∇Wᵢⱼ|²)   ·   κᵢ = (ρ*ᵢ−ρ₀)·αᵢ/dt²   ·   κᵛᵢ = (dρᵢ/dt)·αᵢ/dt"),
  );
  body.appendChild(
    el(
      "div",
      "sw-note",
      "The live solver is DFSPH (Bender & Koschier 2015/2017): one precomputed stiffness factor αᵢ serves two Jacobi-style pressure solves — constant-density (ρ* → ρ₀) and divergence-free (dρ/dt → 0). Why DFSPH: on the 125K breaking dam it needs 4.5+2.8 iterations where IISPH needs 50.5, and it is 6.9×/13.4×/23.9× faster than IISPH/PBF/PCISPH at dt=4ms. BEYOND-REFERENCE: the committed Phase-1 reference contains the kernel, density, continuity, and a simplified corrector — not the dual solver, walls, or viscosity. The primitives inside this solver are the gated code paths; the solver itself is labeled, not gated.",
    ),
  );
  links = el("div", "sw-links");
  blobLink(links, `wgsl α L${V.code_anchors.df_alpha.start}`, V.links.kernel_live, V.code_anchors.df_alpha.start);
  blobLink(links, `wgsl density-solve L${V.code_anchors.df_predict_density.start}`, V.links.kernel_live, V.code_anchors.df_predict_density.start);
  blobLink(links, `wgsl divergence-solve L${V.code_anchors.df_predict_divergence.start}`, V.links.kernel_live, V.code_anchors.df_predict_divergence.start);
  blobLink(links, `reference corrector :${V.py_anchors.corrector_line}`, V.links.reference, V.py_anchors.corrector_line);
  body.appendChild(links);

  // --- teachable failure: warm start ---------------------------------------------------
  body.appendChild(el("div", "sw-eq", "teachable failure: the warm-start toggle"));
  body.appendChild(
    el(
      "div",
      "sw-note",
      "Bender & Koschier present warm-starting the pressure solve as a ~3× win. Carensac, Pronost & Bouakaz (2022) measured what it actually does at real-time iteration counts: a cyclic compression–decompression instability. The toggle in `simulation` applies the previous frame's accumulated stiffness before iterating — flip it on a resting tank and watch the density error start to cycle in the Study readout. A proof panel that can visibly fail is the whole point.",
    ),
  );
  links = el("div", "sw-links");
  blobLink(links, `wgsl warm-start L${V.code_anchors.df_warm_start.start}`, V.links.kernel_live, V.code_anchors.df_warm_start.start);
  body.appendChild(links);

  // --- neighbor search + determinism -----------------------------------------------------
  body.appendChild(el("div", "sw-eq", "counting sort: histogram → scan → scatter → id-sort → reorder;  cells = 2h"));
  body.appendChild(
    el(
      "div",
      "sw-note",
      "Hoetzlein's counting-sort broadphase (GTC 2014, 15→4 kernels/frame) with a two-level Blelloch scan (GPU Gems 3 ch. 39) and one deliberate extra stage: a per-cell ascending-id insertion sort. The atomic scatter is the only order-nondeterministic stage in the whole pipeline; sorting each cell by id erases it, which is what makes same-device run-twice byte-identical and the float gathers deterministic. The i32 fixed-point density path then makes grid ≡ brute BYTE-comparable (integer addition is order-independent) — the SHA proof in PROVE. No Morton/Z-order: Carensac 2022 measured no GPU gain. Cross-device bit-exactness is NOT claimed — per-vendor FP contraction differs; that boundary is stated, not hidden.",
    ),
  );
  links = el("div", "sw-links");
  blobLink(links, `wgsl cell-sort L${V.code_anchors.cell_sort.start}`, V.links.kernel_core, V.code_anchors.cell_sort.start);
  blobLink(links, `wgsl brute oracle L${V.code_anchors.density_brute_fp.start}`, V.links.kernel_core, V.code_anchors.density_brute_fp.start);
  blobLink(links, "spec", V.links.spec);
  blobLink(links, "gate source", V.links.gate_source);
  body.appendChild(links);

  // --- citations --------------------------------------------------------------------------
  const cit = el("details", "sw-details");
  cit.appendChild(el("summary", "", "citation ledger (primary sources, re-verified 2026-07-04)"));
  const cbody = el("div", "");
  for (const c of V.citations) {
    const r = el("div", "sw-note", `${c.key}: ${c.ref}`);
    cbody.appendChild(r);
  }
  cit.appendChild(cbody);
  group.appendChild(cit);
}
