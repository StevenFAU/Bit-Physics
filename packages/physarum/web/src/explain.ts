// EXPLAIN layer (verification-demo-spec § 3.2): equation → code legibility.
//
// Renders the Jones 2010 five-component update (sense → rotate → move →
// deposit → apply → diffuse+decay) next to the ACTUAL committed WGSL that runs
// it, the exact mass-balance invariant with its two-sided framing, and the
// landmark science each template mirrors. Every quoted snippet and line anchor
// comes from the generated data spine (src/generated/verification.json),
// extracted at build time by exact-substring match against
// packages/physarum/src/physarum.wgsl — if the kernel drifts, gen-verification.mjs
// HARD-FAILs the build instead of letting these links mis-anchor. Hand-rolled
// markup on theme classes; no math dependency (spec § 6).

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

const JONES_DOI = "https://doi.org/10.1162/artl.2010.16.2.16202";
const JONES_ARXIV = "https://arxiv.org/abs/1511.05869";
const TERO_DOI = "https://doi.org/10.1126/science.1177894";
const NAKAGAKI_URL = "https://www.nature.com/articles/35035159";
const BURCHETT_DOI = "https://doi.org/10.3847/2041-8213/ab700c";
const ADAMATZKY_CHECK = "https://arxiv.org/abs/1712.03139";

interface AnchorRange {
  start: number;
  end: number;
  lines: string[];
}

function extLink(label: string, href: string, title?: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "ig-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

function eqBlock(eq: string, meaning: string, code: string, lineLabel: string, href: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "ig-eq";
  const math = document.createElement("div");
  math.className = "ig-eq-math";
  math.textContent = eq;
  const note = document.createElement("small");
  note.textContent = meaning;
  math.appendChild(note);
  const codeEl = document.createElement("code");
  codeEl.className = "ig-code";
  codeEl.textContent = code;
  codeEl.title = `physarum.wgsl ${lineLabel} — quoted verbatim at build time`;
  div.append(math, codeEl, extLink(`physarum.wgsl:${lineLabel}`, href, "the committed kernel that runs on this GPU"));
  return div;
}

const rangeOf = (r: AnchorRange): [string, string] => [
  `L${r.start}–L${r.end}`,
  blobUrl(V.links.kernel, `L${r.start}-L${r.end}`),
];

export function installExplainPanel(panel: PanelShell): void {
  installAlgorithm(panel);
  installInvariant(panel);
  installScience(panel);
}

// --- 1. the Jones update, and the committed WGSL that runs it ----------------

function installAlgorithm(panel: PanelShell): void {
  const g = panel.addGroup("algorithm → code");
  const details = document.createElement("details");
  details.className = "ig-details";
  const summary = document.createElement("summary");
  summary.textContent = "the five-component Jones 2010 update, and the committed WGSL that runs it";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  const intro = document.createElement("div");
  intro.className = "ig-eq";
  const introMath = document.createElement("div");
  introMath.className = "ig-eq-math";
  introMath.textContent = "sense → rotate → move → deposit → diffuse + decay";
  const introNote = document.createElement("small");
  introNote.textContent = `${V.canonical.n_agents} blind agents on a ${V.canonical.grid[0]}² periodic trail field; canonical Δφ ${V.canonical.params.delta_phi_deg}°, L_sense ${V.canonical.params.L_sense}, L_move ${V.canonical.params.L_move}, d ${V.canonical.params.deposit}, α ${V.canonical.params.decay_alpha}`;
  introMath.appendChild(introNote);
  intro.appendChild(introMath);
  body.appendChild(intro);

  const a = V.code_anchors;
  const [seL, seH] = rangeOf(a.sense);
  body.appendChild(
    eqBlock(
      "sense — 3 forward sensors at L_sense",
      "trail sampled front-left, front, front-right of the heading",
      a.sense.lines.join("\n"),
      seL,
      seH,
    ),
  );
  const [roL, roH] = rangeOf(a.rotate);
  body.appendChild(
    eqBlock(
      "rotate — toward the strongest, keep-centre tie-break",
      "steer by ±Δφ to the highest-trail sensor; RA is coupled to the sensor angle (see below)",
      a.rotate.lines.join("\n"),
      roL,
      roH,
    ),
  );
  const [moL, moH] = rangeOf(a.move);
  body.appendChild(
    eqBlock("move — advance by L_move", "step forward along the new heading", a.move.lines.join("\n"), moL, moH),
  );
  const [deL, deH] = rangeOf(a.deposit);
  body.appendChild(
    eqBlock(
      "deposit — integer fixed-point atomicAdd",
      "write d to the trail at the new cell; the ×65536 u32 add is order-independent",
      a.deposit.lines.join("\n"),
      deL,
      deH,
    ),
  );
  const [apL, apH] = rangeOf(a.apply);
  body.appendChild(
    eqBlock("apply — T += deposit", "the per-step +d·N mass injection", a.apply.lines.join("\n"), apL, apH),
  );
  const [diL, diH] = rangeOf(a.diffuse);
  body.appendChild(
    eqBlock(
      "diffuse + decay — 3×3 box blur × (1−α)",
      "sum-preserving blur, then multiply the whole field by (1−α)",
      a.diffuse.lines.join("\n"),
      diL,
      diH,
    ),
  );

  // expert-credibility notes: the determinism-sufficiency argument, the RA=SA
  // coupling honesty, the IC provenance — naming these is the trust signal
  const notes = document.createElement("div");
  notes.className = "ig-hash";
  const addNote = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    notes.append(b, document.createTextNode(text), document.createElement("br"));
  };
  addNote("why bit-reproducible", V.determinism.field_note);
  addNote(
    "RA = SA, honestly",
    "this kernel rotates by exactly the sensor angle Δφ (the sensor directions ARE the ±Δφ-rotated heading), so the " +
      "literature's separate rotation-angle-vs-sensor-angle branching rule is not a free axis here — the morphology " +
      "templates use the axes that are available (Δφ, L_sense, L_move, d, α).",
  );
  addNote(
    "the seed-42 IC",
    `${V.ic_asset.provenance} (${V.ic_asset.bytes.toLocaleString()} bytes, sha ${V.ic_asset.sha256.slice(0, 12)}…)`,
  );
  body.appendChild(notes);

  const foot = document.createElement("div");
  foot.className = "ig-eq";
  foot.append(
    extLink("spec sheet", blobUrl(V.links.spec)),
    document.createTextNode("  ·  "),
    extLink("algebraic derivation", blobUrl(V.links.algebraic)),
    document.createTextNode("  ·  "),
    extLink("Jones 2010", JONES_DOI, "Characteristics of Pattern Formation… — Artificial Life 16(2):127"),
    document.createTextNode("  ·  "),
    extLink("Jones (morphology rule)", JONES_ARXIV, "arXiv:1511.05869 — RA<SA reticulation / RA>SA branching"),
  );
  body.appendChild(foot);
}

// --- 2. the conserved quantity: an exact closed-form invariant --------------

function installInvariant(panel: PanelShell): void {
  const g = panel.addGroup("the conserved quantity");
  const details = document.createElement("details");
  details.className = "ig-details";
  const summary = document.createElement("summary");
  summary.textContent = "an exact closed-form mass equilibrium the PROVE layer checks live";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  const eq = document.createElement("div");
  eq.className = "ig-eq";
  const math = document.createElement("div");
  math.className = "ig-eq-math";
  math.textContent = `M = ${V.mass_equilibrium.formula} = ${V.mass_equilibrium.canonical_value.toLocaleString()}`;
  const note = document.createElement("small");
  note.textContent = `d ${V.mass_equilibrium.d} · N ${V.mass_equilibrium.N} · α ${V.mass_equilibrium.alpha}`;
  math.appendChild(note);
  eq.appendChild(math);
  body.appendChild(eq);

  const deriv = document.createElement("div");
  deriv.className = "ig-note-line";
  deriv.textContent = V.mass_equilibrium.derivation;
  body.appendChild(deriv);

  const twoSided = document.createElement("div");
  twoSided.className = "ig-hash";
  const addNote = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    twoSided.append(b, document.createTextNode(text), document.createElement("br"));
  };
  addNote(
    "morphology axes hold the value",
    `${V.mass_equilibrium.morphology_invariant_axes.join(", ")} change the pattern completely, but the equilibrium stays ${V.mass_equilibrium.canonical_value.toLocaleString()} — try the "strands" and "trunk" templates.`,
  );
  addNote(
    "deposition axes move the value",
    `${V.mass_equilibrium.value_changing_axes.join(", ")} change the equilibrium, but the same formula still predicts it — try "reticular" (α 0.04) and "fragments" (α 0.2).`,
  );
  addNote(
    "open systems still predict",
    `add external food at rate f and the field converges to ${V.mass_equilibrium.open_system_formula} — the science scenarios break the closed 22500 by design, to a computable higher line.`,
  );
  body.appendChild(twoSided);
}

// --- 3. the science each template mirrors -----------------------------------

function installScience(panel: PanelShell): void {
  const g = panel.addGroup("the science it mirrors");
  const details = document.createElement("details");
  details.className = "ig-details";
  const summary = document.createElement("summary");
  summary.textContent = "the landmark results the templates are grounded in";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  const item = (title: string, text: string): void => {
    const div = document.createElement("div");
    div.className = "ig-eq";
    const math = document.createElement("div");
    math.className = "ig-eq-math";
    math.textContent = title;
    const note = document.createElement("small");
    note.textContent = text;
    math.appendChild(note);
    div.appendChild(math);
    body.appendChild(div);
  };
  item(
    "Nakagaki 2000 — maze-solving",
    "the plasmodium fills a maze then retracts to leave one tube on the shortest path between two food sources (Nature 407:470).",
  );
  item(
    "Tero 2010 — the Tokyo rail",
    "36 food at Tokyo-area cities: the network reached MD_MST 0.85 transport efficiency at TL_MST ≈ 1.75 cost — comparable to the real rail, which beat it only on fault tolerance (Science 327:439).",
  );
  item(
    "Burchett/Elek 2020 — the cosmic web",
    "a 3D Monte-Carlo Physarum Machine reconstructed dark-matter filaments from 37,000 SDSS galaxies, validated three ways (ApJL 891:L35). The cosmic-web template is a labelled 2D homage.",
  );

  const note = document.createElement("div");
  note.className = "ig-note-line";
  note.textContent =
    "the science scenarios draw the exact minimum spanning tree of the food points beside the emergent network — the mathematical optimum shown, not asserted (physarum only approximates it).";
  body.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, href, title] of [
    ["Nakagaki 2000", NAKAGAKI_URL, "Maze-solving by an amoeboid organism — Nature 407:470"],
    ["Tero 2010", TERO_DOI, "Rules for Biologically Inspired Adaptive Network Design — Science 327:439"],
    ["Burchett 2020", BURCHETT_DOI, "Revealing the Dark Threads of the Cosmic Web — ApJL 891:L35"],
    ["reality-check", ADAMATZKY_CHECK, "arXiv:1712.03139 — When the path is never shortest: shortest-path biocomputation is approximate"],
  ] as const) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = href;
    a.title = title;
    a.target = "_blank";
    a.rel = "noopener";
    links.appendChild(a);
  }
  body.appendChild(links);
}
