// EXPLAIN layer (verification-demo-spec § 3.2): equation → code legibility.
//
// Renders the three Lorenz ODEs and the RK4 step next to the ACTUAL committed
// WGSL that implements them. The quoted snippets and line anchors come from
// the generated data spine (src/generated/verification.json), extracted at
// build time by exact-substring match against lorenz_rk4.wgsl — if the kernel
// ever drifts, gen-verification.mjs HARD-FAILs the build instead of letting
// these links mis-anchor. Hand-rolled markup on theme classes; no math
// dependency (spec § 6).

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

function extLink(label: string, href: string, title?: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "lz-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

interface OdeRow {
  eq: string;
  meaning: string;
  anchor: { line: number; text: string };
}

export function installExplainPanel(panel: PanelShell): void {
  const g = panel.addGroup("equations → code");
  const details = document.createElement("details");
  details.className = "lz-details";
  const summary = document.createElement("summary");
  summary.textContent = "the three ODEs, and the committed WGSL that runs them";
  details.appendChild(summary);

  const rows: OdeRow[] = [
    { eq: "ẋ = σ(y − x)", meaning: "convective coupling", anchor: V.code_anchors.sigma_term },
    { eq: "ẏ = x(ρ − z) − y", meaning: "driving temperature gradient", anchor: V.code_anchors.rho_term },
    { eq: "ż = xy − βz", meaning: "nonlinear feedback − dissipation", anchor: V.code_anchors.beta_term },
  ];
  for (const r of rows) {
    const eqDiv = document.createElement("div");
    eqDiv.className = "lz-eq";
    const math = document.createElement("div");
    math.className = "lz-eq-math";
    math.textContent = r.eq;
    const note = document.createElement("small");
    note.textContent = r.meaning;
    math.appendChild(note);
    const code = document.createElement("code");
    code.className = "lz-code";
    code.textContent = r.anchor.text;
    code.title = `lorenz_rk4.wgsl line ${r.anchor.line} — quoted verbatim at build time`;
    eqDiv.append(
      math,
      code,
      extLink(
        `lorenz_rk4.wgsl:L${r.anchor.line}`,
        blobUrl(V.links.kernel, `L${r.anchor.line}`),
        "the committed compute kernel — the same file the wgpu-native gate runs",
      ),
    );
    details.appendChild(eqDiv);
  }

  // the RK4 step — the whole integrator, quoted
  const rk = document.createElement("div");
  rk.className = "lz-eq";
  const rkMath = document.createElement("div");
  rkMath.className = "lz-eq-math";
  rkMath.textContent = `one RK4 step (dt = ${V.canonical.params.dt})`;
  const rkNote = document.createElement("small");
  rkNote.textContent = "4 field evaluations, weighted 1·2·2·1";
  rkMath.appendChild(rkNote);
  const rkCode = document.createElement("code");
  rkCode.className = "lz-code";
  rkCode.textContent = V.code_anchors.rk4.lines.join("\n");
  rkCode.title = `lorenz_rk4.wgsl lines ${V.code_anchors.rk4.start}–${V.code_anchors.rk4.end}`;
  rk.append(
    rkMath,
    rkCode,
    extLink(
      `lorenz_rk4.wgsl:L${V.code_anchors.rk4.start}–L${V.code_anchors.rk4.end}`,
      blobUrl(V.links.kernel, `L${V.code_anchors.rk4.start}-L${V.code_anchors.rk4.end}`),
    ),
  );
  details.appendChild(rk);

  const foot = document.createElement("div");
  foot.className = "lz-eq";
  foot.append(
    extLink("read the derivation", blobUrl(V.links.algebraic), "algebraic.md — fixed points, Jacobian eigenvalues, sources"),
    document.createTextNode("  ·  "),
    extLink("spec sheet", blobUrl(V.links.spec)),
  );
  details.appendChild(foot);

  g.appendChild(details);
}
