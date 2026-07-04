// explain.ts — the EXPLAIN layer (spec § 4.2): equation → committed code,
// with self-healing anchors extracted at build time by gen-verification.mjs
// (an anchor that stops matching HARD-FAILS the build, so these line ranges
// cannot silently rot).

import V from "./generated/verification.json";

const DIM = "#8aa0b8";
const REPO_URL = "https://github.com/StevenFAU/Bit-Physics/blob/main";

interface Anchor {
  file: string;
  start: number;
  end: number;
  text: string;
}

function section(parent: HTMLElement, title: string): HTMLElement {
  const det = document.createElement("details");
  det.style.cssText = "margin-top:6px;";
  const sum = document.createElement("summary");
  sum.textContent = title;
  sum.style.cssText = "cursor:pointer;font-size:11px;color:#c8d4e0;";
  det.appendChild(sum);
  parent.appendChild(det);
  return det;
}

function para(parent: HTMLElement, text: string): void {
  const p = document.createElement("p");
  p.textContent = text;
  p.style.cssText = `color:${DIM};font-size:11px;line-height:1.5;margin:6px 0;`;
  parent.appendChild(p);
}

function code(parent: HTMLElement, anchor: Anchor, label: string): void {
  const wrap = document.createElement("div");
  wrap.style.cssText = "margin:4px 0;";
  const link = document.createElement("a");
  link.href = `${REPO_URL}/${anchor.file}#L${anchor.start}-L${anchor.end}`;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = `${label} — ${anchor.file}:${anchor.start}–${anchor.end}`;
  link.style.cssText = "font-size:10px;color:#4dd8c0;text-decoration:none;";
  const pre = document.createElement("pre");
  pre.textContent = anchor.text;
  pre.style.cssText =
    "font-size:9.5px;line-height:1.35;color:#aab8c8;background:rgba(255,255,255,0.04);" +
    "padding:6px;border-radius:4px;overflow-x:auto;max-height:180px;margin:3px 0 0;";
  wrap.append(link, pre);
  parent.appendChild(wrap);
}

export function installExplainPanel(container: HTMLElement): void {
  const A = V.anchors as unknown as { wgsl: Record<string, Anchor>; python: Record<string, Anchor> };

  const s1 = section(container, "the MPM pipeline (P2G → grid → G2P)");
  para(
    s1,
    "Each substep scatters particle mass + momentum to a background grid " +
      "(P2G), updates grid velocities (gravity + boundaries), then gathers " +
      "back (G2P) — MLS-MPM fuses the stress force into the same scatter as " +
      "the APIC affine term (Hu 2018): eff = mass·C + (−4Δt/Δx²)·V₀·τ. " +
      "Multi-material coupling costs NOTHING extra: every material shares " +
      "this one grid solve and differs only in its stress function.",
  );
  code(s1, A.wgsl.p2g, "WGSL P2G (fixed-point atomic scatter)");
  code(s1, A.python.p2g_with_stress, "NumPy reference it ports");
  code(s1, A.wgsl.g2p, "WGSL G2P (+ F update, return maps, advection)");
  code(s1, A.python.g2p, "NumPy reference G2P");

  const s2 = section(container, "the quadratic B-spline (the golden line)");
  para(
    s2,
    "base = floor(x/Δx + 0.5) − 1; the three weights are the most-verified " +
      "lines in this package — matched live against the committed golden " +
      "table (4 independent derivations, abs tol 1e-15) in the PROVE panel. " +
      "C1 continuity is why MPM avoids cell-crossing instability (Jiang 2016 " +
      "course).",
  );
  code(s2, A.wgsl.bspline_weights, "WGSL weights");
  code(s2, A.python.shape_n, "Python reference N(x)");

  const s3 = section(container, "materials: one solve, four stress functions");
  para(
    s3,
    "Jelly is the VERIFIED core: neo-Hookean log-J, ported verbatim " +
      "including the log_j = −30 inversion guard. Snow, sand and water are " +
      "reference-less additions (honesty: the committed reference is " +
      "single-material) — which is exactly why each ships its own live " +
      "invariant in PROVE.",
  );
  code(s3, A.wgsl.neo_hookean, "jelly — neo-Hookean (verbatim port)");
  code(s3, A.python.neo_hookean, "the reference guard it reproduces");
  code(s3, A.wgsl.snow_stress, "snow — Stomakhin 2013 fixed-corotated + hardening");
  code(s3, A.wgsl.snow_return_map, "snow — SVD singular-value clamp (the invariant)");
  code(s3, A.wgsl.sand_stress, "sand — Klár 2016 StVK-on-Hencky");
  code(s3, A.wgsl.sand_return_map, "sand — Drucker-Prager 3-case return map");
  code(s3, A.wgsl.water_stress, "water — Tampubolon 2017 / Tait EOS (J-only)");

  const s4 = section(container, "the determinism story (honestly)");
  para(
    s4,
    "WebGPU has NO floating-point atomics, so the P2G scatter accumulates " +
      "fixed-point i32 quanta (M = 4e6 — measured down from the 1e7 survey " +
      "default after the worst-case per-cell bound hit 87% of i32). " +
      "Integer addition is associative → the scatter is order-independent → " +
      "run-twice is byte-identical on the same device. Where f32 atomics DO " +
      "exist they are non-deterministic (Defour & Collange 2015: 1000/1000 " +
      "distinct results). Honest boundary: fixed-point is bit-identical to a " +
      "fixed-point oracle, NOT to the f64 lex-order CPU reference — so the " +
      "gate matches the committed capture pointwise at the established " +
      "rel=1e-4 budget instead of claiming cross-precision bit-equality, and " +
      "cross-DEVICE bit-exactness is not claimed at all.",
  );
  code(s4, A.wgsl.encode_fixed, "the entire encoding");
  para(
    s4,
    "Mass cannot leak silently either: quanta are integers, JS sums them " +
      "exactly, and the worst-case rounding bound (0.5 quanta × 27 stencil " +
      "nodes × N particles) is checked live in PROVE.",
  );

  const s5 = section(container, "boundaries & the sticky floor");
  code(s5, A.wgsl.grid_update, "WGSL grid update (gravity, floor, walls)");
  code(s5, A.python.grid_update, "NumPy reference");
  code(s5, A.python.advect, "advection + stencil-safety clamp");

  const s6 = section(container, "citations");
  const ul = document.createElement("ul");
  ul.style.cssText = `color:${DIM};font-size:10px;line-height:1.5;padding-left:14px;margin:6px 0;`;
  for (const c of V.citations) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `https://doi.org/${c.doi}`;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = c.text;
    a.style.color = DIM;
    li.appendChild(a);
    ul.appendChild(li);
  }
  s6.appendChild(ul);
}
