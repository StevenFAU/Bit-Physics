// EXPLAIN layer (verification-demo-spec § 4.2): equation → code legibility.
//
// Renders the incompressible Navier-Stokes operator-split pipeline next to the
// ACTUAL committed WGSL that implements it, each anchored to the NumPy
// reference line it ports. Every quoted snippet and line anchor comes from the
// generated data spine (src/generated/verification.json), extracted at build
// time by exact-substring match against
// packages/eulerian-smoke/src/stable_fluids_2d.wgsl and the frozen
// stable_fluids.py — if either drifts, gen-verification.mjs HARD-FAILs the
// build instead of letting these links mis-anchor. Hand-rolled markup on theme
// classes; no math dependency.

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

interface AnchorRange {
  start: number;
  end: number;
  lines: string[];
}

function extLink(label: string, href: string, title?: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "es-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

function eqBlock(
  eq: string,
  meaning: string,
  wgslAnchor: AnchorRange,
  pyLine: number,
): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "es-eq";
  const math = document.createElement("div");
  math.className = "es-eq-math";
  math.textContent = eq;
  const note = document.createElement("small");
  note.textContent = meaning;
  math.appendChild(note);
  const codeEl = document.createElement("code");
  codeEl.className = "es-code";
  codeEl.textContent = wgslAnchor.lines.join("\n");
  codeEl.title = `stable_fluids_2d.wgsl L${wgslAnchor.start}–L${wgslAnchor.end} — quoted verbatim at build time`;
  div.append(math, codeEl);
  div.appendChild(
    extLink(
      `wgsl L${wgslAnchor.start}–${wgslAnchor.end}`,
      blobUrl(V.links.kernel, `L${wgslAnchor.start}-L${wgslAnchor.end}`),
      "the committed kernel that runs on this GPU",
    ),
  );
  div.appendChild(
    extLink(
      `numpy :${pyLine}`,
      blobUrl(V.links.reference, `L${pyLine}`),
      "the frozen f64 reference line this ports",
    ),
  );
  return div;
}

export function installExplainPanel(panel: PanelShell): void {
  const g = panel.addGroup("equations → code");
  const details = document.createElement("details");
  details.className = "es-details";
  const summary = document.createElement("summary");
  summary.textContent = "incompressible Navier-Stokes, and the committed WGSL that runs it";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  const A = V.code_anchors;
  const P = V.py_anchors;

  const intro = document.createElement("div");
  intro.className = "es-eq";
  const introMath = document.createElement("div");
  introMath.className = "es-eq-math";
  introMath.textContent = "∂u/∂t = −(u·∇)u + ν∇²u − (1/ρ)∇p,   ∇·u = 0";
  const introNote = document.createElement("small");
  introNote.textContent =
    "momentum + incompressibility. Stam's operator splitting solves them one operator at a time: advect → diffuse → project (Stable Fluids, SIGGRAPH '99).";
  introMath.appendChild(introNote);
  intro.appendChild(introMath);
  body.appendChild(intro);

  body.appendChild(
    eqBlock(
      "1 · advect:  φ(x) ← φ(x − u·Δt)",
      "semi-Lagrangian backtrace (Stam's method of characteristics — unconditionally stable), MacCormack-corrected to 2nd order for velocity (Selle et al. 2008; limiter deliberately OFF on the canonical — it would mute the certified 2nd-order MMS convergence)",
      A.maccormack,
      P.maccormack_line,
    ),
  );
  body.appendChild(
    eqBlock(
      "guard:  x ← x mod N;  if x ≥ N: x ← 0",
      "the FP-edge fraction guard THIS PORT ADDED: the reference guards the wrapped index but not the fraction, and mod(−tiny, N) == N turns bilinear interpolation into a ×N extrapolation — the post-mortem bug, fixed here at the coordinate",
      A.backtrace_guard,
      P.mod_edge_line,
    ),
  );
  body.appendChild(
    eqBlock(
      "2 · diffuse:  u ← u + ν·Δt·∇²u",
      "explicit 5-point Laplacian, single step — fine at smoke viscosities (the reference documents the diffusive CFL bound ν·Δt/Δx² ≈ 0.16 for the canonical)",
      A.diffusion,
      P.diffusion_line,
    ),
  );
  body.appendChild(
    eqBlock(
      "3 · project:  ∇²p = (ρ/Δt)·∇·u*,   u ← u* − (Δt/ρ)·∇p",
      "Helmholtz-Hodge: subtract the curl-free part. Jacobi, FIXED 20 iterations from zero (no early-stop branch — the determinism clause), the GPU substitution for Stam's Gauss-Seidel (Harris, GPU Gems 38)",
      A.jacobi,
      P.jacobi_line,
    ),
  );
  body.appendChild(
    eqBlock(
      "4 · smoke:  ρ_smoke(x) ← ρ_smoke(x − u·Δt)",
      "the density field rides the PROJECTED velocity with plain bilinear SL — deliberately NOT MacCormack; the reference's asymmetry is part of the canonical",
      A.advect_density,
      P.density_advect_line,
    ),
  );

  // the collocated caveat, both registers
  const caveat = document.createElement("div");
  caveat.className = "es-eq";
  const cm = document.createElement("div");
  cm.className = "es-eq-math";
  cm.textContent = "why max |∇·u| never reaches zero here";
  const cn = document.createElement("small");
  cn.textContent =
    "(a) textbook: the centered stencil (u[i+1]−u[i−1])/2Δx never reads u[i] — the (−1)^i checkerboard is invisible to it (a null-space; try the probe). (b) this repo: the composed ∇·∇p is the wide Laplacian, not the 5-point one Jacobi solves — an O(Δx²) residual survives even at convergence (the reference documents both; the MAC-staggered grid is the fix, deferred to the Stack-C port).";
  cm.appendChild(cn);
  caveat.appendChild(cm);
  caveat.appendChild(extLink("the reference's own caveat", blobUrl(V.links.reference, `L${P.collocated_caveat_line}`), "project_pressure / divergence docstrings"));
  caveat.appendChild(extLink("invariant floor", blobUrl(V.links.invariants, `L${P.div_tol_line}`), "_DIV_TOL — the PBT floor reflecting this residual"));
  body.appendChild(caveat);

  // canonical-name honesty
  const nameNote = document.createElement("div");
  nameNote.className = "es-note-line";
  nameNote.textContent =
    "naming honesty: the committed backend canonical is called \"lid-driven-cavity\" but is a periodic lid-shear-layer IC approximation — its own docstring says so (its FP-edge contamination was fixed + regenerated at P6-FPEDGE; see the post-mortem). This demo's canonical is the Taylor-Green scene.";
  body.appendChild(nameNote);

  const prov = document.createElement("div");
  prov.className = "es-note-line";
  prov.textContent =
    "provenance small print: vorticity confinement is Steinhoff's (helicopter CFD), brought to graphics by Fedkiw-Stam-Jensen 2001 — and exists only in the reference's 3D solver (ε=0 in its canonical); the 2D \"swirl\" slider here is a web-only aesthetic. \"Semi-Lagrangian\" is later vocabulary for Stam's method-of-characteristics step.";
  body.appendChild(prov);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, path] of [
    ["kernel (WGSL)", V.links.kernel],
    ["reference (NumPy)", V.links.reference],
    ["determinism charter", V.links.sim_py],
    ["invariants", V.links.invariants],
  ] as const) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = blobUrl(path);
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  body.appendChild(links);
}
