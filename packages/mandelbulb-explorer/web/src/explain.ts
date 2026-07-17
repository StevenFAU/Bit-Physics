// EXPLAIN layer (verification-demo-spec § 3.2): equation → code legibility.
//
// Renders the triplex power, the iterated map, the running-derivative DE and
// the escape convention next to the ACTUAL committed WGSL that the gate runs.
// Every quoted snippet and line anchor comes from the generated data spine
// (src/generated/verification.json), extracted at build time by
// exact-substring match against packages/mandelbulb-explorer/src/
// mandelbulb_de.wgsl — if the kernel ever drifts, gen-verification.mjs
// HARD-FAILs the build instead of letting these links mis-anchor. Anchor
// values come from the committed golden table (expected.DE only — spec § 2).
// Hand-rolled markup on theme classes; no math dependency (spec § 6).

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

interface Anchor {
  line: number;
  text: string;
}

interface AnchorRange {
  start: number;
  end: number;
  lines: string[];
}

function extLink(label: string, href: string, title?: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "mb-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

function eqBlock(eq: string, meaning: string, code: string, lineLabel: string, href: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "mb-eq";
  const math = document.createElement("div");
  math.className = "mb-eq-math";
  math.textContent = eq;
  const note = document.createElement("small");
  note.textContent = meaning;
  math.appendChild(note);
  const codeEl = document.createElement("code");
  codeEl.className = "mb-code";
  codeEl.textContent = code;
  codeEl.title = `mandelbulb_de.wgsl ${lineLabel} — quoted verbatim at build time`;
  div.append(math, codeEl, extLink(`mandelbulb_de.wgsl:${lineLabel}`, href, "the committed gate kernel that runs on this GPU"));
  return div;
}

const lineOf = (a: Anchor): [string, string] => [`L${a.line}`, blobUrl(V.links.kernel, `L${a.line}`)];
const rangeOf = (r: AnchorRange): [string, string] => [
  `L${r.start}–L${r.end}`,
  blobUrl(V.links.kernel, `L${r.start}-L${r.end}`),
];

export function installExplainPanel(panel: PanelShell): void {
  const g = panel.addGroup("equations → code");
  const details = document.createElement("details");
  details.className = "mb-details";
  const summary = document.createElement("summary");
  summary.textContent = "the distance estimator, and the committed WGSL that runs it";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  // the map itself
  const intro = document.createElement("div");
  intro.className = "mb-eq";
  const introMath = document.createElement("div");
  introMath.className = "mb-eq-math";
  introMath.textContent = "z ← zᵖ + c,  z₀ = c,  p = 8";
  const introNote = document.createElement("small");
  introNote.textContent = "White & Nylander 2009 — the Mandelbrot iteration lifted to ℝ³ via spherical (“triplex”) powers";
  introMath.appendChild(introNote);
  intro.appendChild(introMath);
  body.appendChild(intro);

  const a = V.code_anchors;
  const [pzL, pzH] = rangeOf(a.pow_z);
  body.appendChild(
    eqBlock(
      "zᵖ = rᵖ·(sin pθ cos pφ, sin pθ sin pφ, cos pθ)",
      "the triplex power: radius to the p, angles times p (θ = acos(z/r), φ = atan2(y,x))",
      a.pow_z.lines.join("\n"),
      pzL,
      pzH,
    ),
  );
  const [mpL, mpH] = lineOf(a.map);
  body.appendChild(eqBlock("z ← zᵖ + c", "the iterated map — same skeleton as the 2-D Mandelbrot set", a.map.text, mpL, mpH));
  const [dvL, dvH] = lineOf(a.derivative);
  body.appendChild(
    eqBlock(
      "dz ← p·r^(p−1)·dz + 1",
      "running scalar derivative (chain rule; the +1 differentiates the +c) — heuristic for the Mandelbulb, see the rigor note",
      a.derivative.text,
      dvL,
      dvH,
    ),
  );
  const [deL, deH] = lineOf(a.de);
  body.appendChild(
    eqBlock("DE = ½ · r · ln r / dz", "the Hart/Hubbard–Douady-style estimator the sphere trace consumes", a.de.text, deL, deH),
  );
  const [ecL, ecH] = rangeOf(a.escape_check);
  body.appendChild(
    eqBlock(
      "escape test BEFORE the derivative update",
      "load-bearing convention: |c| > 2 returns with dz = 1 — it makes the far-field anchor exact",
      a.escape_check.lines.join("\n"),
      ecL,
      ecH,
    ),
  );

  // --- the three closed-form anchors (surd-exact forms, golden-table values) --
  const gA = panel.addGroup("three closed-form anchors");
  for (const an of V.anchors) {
    const card = document.createElement("div");
    card.className = "mb-anchor";
    const head = document.createElement("div");
    head.className = "mb-anchor-head";
    head.textContent = `DE(${an.c.join(", ")})`;
    const form = document.createElement("div");
    form.className = "mb-anchor-form";
    form.textContent = `= ${an.closed_form}`;
    const val = document.createElement("div");
    val.className = "mb-anchor-sub";
    val.textContent = `f64: ${an.de} — committed golden value (tolerance abs ${V.golden_tolerance.absolute}, rel ${V.golden_tolerance.relative}); ${an.note}`;
    card.append(head, form, val);
    gA.appendChild(card);
  }
  const aLinks = document.createElement("div");
  aLinks.className = "bps-links";
  aLinks.append(
    extLink("golden table", blobUrl(V.links.golden_table), "expected.DE committed verbatim; SymPy-verified"),
    extLink("hand derivation", blobUrl(V.links.golden_derivation)),
    extLink("algebraic.md", blobUrl(V.links.algebraic)),
  );
  gA.appendChild(aLinks);

  // --- what exactly is verified (the DE-rigor teaching moment, spec § 3.2) ---
  const gR = panel.addGroup("what exactly is verified");
  const rig = document.createElement("div");
  rig.className = "mb-hash";
  const addNote = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    rig.append(b, document.createTextNode(text), document.createElement("br"));
  };
  addNote(
    "the estimator is a heuristic",
    "the triplex power is not conformal, so the 2-D Hubbard–Douady proof does not carry over — the scalar running-derivative DE " +
      "“was never proved for exotic stuff like the Mandelbulb triplex algebra” (Hvidtfeldt). It works; it is not a theorem.",
  );
  addNote(
    "what the repo verifies",
    "that the COMMITTED kernel evaluates the DECLARED estimator exactly: golden anchors to 1e-12 in f64, the f32 floor measured " +
      "against the f64 canonical, run-twice bit-identity. A claim about the implementation, stated precisely because the formula's " +
      "bound-status is open.",
  );
  addNote(
    "display vs gate",
    `the display raymarch (render.wgsl) mirrors the DE with live power/Julia/coloring at up to 40 iterations; the gate kernel ` +
      `(mandelbulb_de.wgsl) is pinned to p=8, N_max ${V.canonical.params.n_max}, on the 16×16 seed-42 probe grid. What you explore ` +
      "is the display; what is verified is the committed kernel — the indicator over the canvas tracks which object you are looking at.",
  );
  gR.appendChild(rig);
  const rLinks = document.createElement("div");
  rLinks.className = "bps-links";
  rLinks.append(
    extLink("Quílez — mandelbulb DE", V.external.quilez_mandelbulb),
    extLink("RTG II ch. 33", V.external.rtgems2_ch33, "da Silva, Novello, Lopes & Velho 2021 — the running-derivative listing"),
    extLink("Hvidtfeldt part V", V.external.hvidtfeldt_v, "the scalar-vs-Jacobian caveat"),
    extLink("Hart–Sandin–Kauffman 1989", V.external.hart_1989, "DE ray marching of 3-D fractals"),
    extLink("display shader", blobUrl(V.links.display_shader)),
  );
  gR.appendChild(rLinks);
}
