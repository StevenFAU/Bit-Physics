// EXPLAIN layer (verification-demo-spec § 3.2): equation → code legibility.
//
// Renders the two Gray-Scott PDEs and their discretization next to the ACTUAL
// committed WGSL that implements them. Every quoted snippet and line anchor
// comes from the generated data spine (src/generated/verification.json),
// extracted at build time by exact-substring match against
// packages/reaction-diffusion-2d/src/gray_scott.wgsl — if the kernel ever
// drifts, gen-verification.mjs HARD-FAILs the build instead of letting these
// links mis-anchor. Content sourced from
// docs/sim-specs/continuous-ca/reaction-diffusion-2d/algebraic.md. Hand-rolled
// markup on theme classes; no math dependency (spec § 6).

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

const PEARSON_DOI = "https://doi.org/10.1126/science.261.5118.189";

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
  a.className = "rd-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

function eqBlock(eq: string, meaning: string, code: string, lineLabel: string, href: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "rd-eq";
  const math = document.createElement("div");
  math.className = "rd-eq-math";
  math.textContent = eq;
  const note = document.createElement("small");
  note.textContent = meaning;
  math.appendChild(note);
  const codeEl = document.createElement("code");
  codeEl.className = "rd-code";
  codeEl.textContent = code;
  codeEl.title = `gray_scott.wgsl ${lineLabel} — quoted verbatim at build time`;
  div.append(math, codeEl, extLink(`gray_scott.wgsl:${lineLabel}`, href, "the committed kernel that runs on this GPU"));
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
  details.className = "rd-details";
  const summary = document.createElement("summary");
  summary.textContent = "the two PDEs, and the committed WGSL that runs them";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  // the system itself — Pearson's λ regime is the canonical capture
  const intro = document.createElement("div");
  intro.className = "rd-eq";
  const introMath = document.createElement("div");
  introMath.className = "rd-eq-math";
  introMath.textContent = "∂U/∂t = Du ∇²U − UV² + F(1−U)";
  const introMath2 = document.createElement("div");
  introMath2.className = "rd-eq-math";
  introMath2.textContent = "∂V/∂t = Dv ∇²V + UV² − (F+k)V";
  const introNote = document.createElement("small");
  introNote.textContent = `autocatalysis U + 2V → 3V; feed F replenishes U, kill k removes V (Pearson 1993)`;
  introMath2.appendChild(introNote);
  intro.append(introMath, introMath2);
  body.appendChild(intro);

  const a = V.code_anchors;
  const [lapL, lapH] = rangeOf(a.laplacian);
  body.appendChild(
    eqBlock(
      "Du ∇²U, Dv ∇²V — diffusion",
      "5-point Laplacian, ∆x = " + String(V.canonical.params.dx),
      a.laplacian.lines.join("\n"),
      lapL,
      lapH,
    ),
  );
  const [reL, reH] = lineOf(a.reaction);
  body.appendChild(
    eqBlock("−UV² / +UV² — the reaction", "one autocatalytic term, consumed by U, gained by V", a.reaction.text, reL, reH),
  );
  const [feL, feH] = lineOf(a.feed);
  body.appendChild(eqBlock("F(1−U) — the feed", "replenishes U toward 1 everywhere", a.feed.text, feL, feH));
  const [kiL, kiH] = lineOf(a.kill);
  body.appendChild(eqBlock("−(F+k)V — the kill", "drains V; F vs k selects the pattern", a.kill.text, kiL, kiH));
  const [euL, euH] = rangeOf(a.euler);
  body.appendChild(
    eqBlock(
      `forward Euler, ∆t = ${V.canonical.params.dt}`,
      "explicit time step — conditionally stable (note below)",
      a.euler.lines.join("\n"),
      euL,
      euH,
    ),
  );
  const [wrL, wrH] = rangeOf(a.wrap);
  body.appendChild(
    eqBlock(
      "periodic boundary",
      "numpy.roll in the reference ↔ i32 wrap in WGSL — exact periodic BCs on both",
      a.wrap.lines.join("\n"),
      wrL,
      wrH,
    ),
  );

  // teachable honesty tie-ins (algebraic.md §§ Stability/Conservation/Bounds)
  const notes = document.createElement("div");
  notes.className = "rd-hash";
  const addNote = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    notes.append(b, document.createTextNode(text), document.createElement("br"));
  };
  const p = V.canonical.params;
  const diffusionBound = (p.dx * p.dx) / (4 * Math.max(p.Du, p.Dv));
  addNote(
    "stability",
    `forward Euler is conditionally stable — diffusion alone bounds ∆t ≤ ∆x²/(4·max(Du,Dv)) = ${diffusionBound}; ` +
      `the canonical ∆t = ${p.dt} sits comfortably inside. The dt explorer below lets you cross the bound and watch the scheme fail honestly.`,
  );
  addNote(
    "mass is NOT conserved",
    "∫(U+V) is forced by the feed term — the mass U / mass V diagnostics drift by design; the PBT invariant checks bounded drift, not conservation.",
  );
  addNote(
    "bounds",
    "U,V stay in [0,1] for physical initial data — the reaction terms point inward at the boundaries, and the discrete scheme inherits this at the canonical ∆t.",
  );
  addNote(
    "the seed-42 IC",
    `${V.ic_asset.provenance} (${V.ic_asset.bytes.toLocaleString()} bytes, sha ${V.ic_asset.sha256.slice(0, 12)}…) — ` +
      "we ship the exact committed bytes rather than pretending a JS RNG is “the same”.",
  );
  body.appendChild(notes);

  const foot = document.createElement("div");
  foot.className = "rd-eq";
  foot.append(
    extLink("read the derivation", blobUrl(V.links.algebraic), "algebraic.md — PDE, discretization, stability, conservation"),
    document.createTextNode("  ·  "),
    extLink("spec sheet", blobUrl(V.links.spec)),
    document.createTextNode("  ·  "),
    extLink("Pearson 1993", PEARSON_DOI, "Complex patterns in a simple system — Science 261:189"),
  );
  body.appendChild(foot);
}
