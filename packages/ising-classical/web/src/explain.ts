// EXPLAIN layer (verification-demo-spec § 3.2): equation → code legibility.
//
// Renders the Ising Hamiltonian, the Metropolis acceptance rule and the
// checkerboard update next to the ACTUAL committed WGSL that implements them.
// Every quoted snippet and line anchor comes from the generated data spine
// (src/generated/verification.json), extracted at build time by
// exact-substring match against packages/ising-classical/src/metropolis.wgsl —
// if the kernel ever drifts, gen-verification.mjs HARD-FAILs the build instead
// of letting these links mis-anchor. Closed-form content sourced from
// docs/sim-specs/lattice-spin/ising-classical/spec-ref.md § 4 and the two
// committed golden tables. Hand-rolled markup on theme classes; no math
// dependency (spec § 6).

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

const ONSAGER_DOI = "https://doi.org/10.1103/PhysRev.65.117";
const YANG_DOI = "https://doi.org/10.1103/PhysRev.85.808";
const METROPOLIS_DOI = "https://doi.org/10.1063/1.1699114";

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
  codeEl.title = `metropolis.wgsl ${lineLabel} — quoted verbatim at build time`;
  div.append(math, codeEl, extLink(`metropolis.wgsl:${lineLabel}`, href, "the committed kernel that runs on this GPU"));
  return div;
}

const lineOf = (a: Anchor): [string, string] => [`L${a.line}`, blobUrl(V.links.kernel, `L${a.line}`)];
const rangeOf = (r: AnchorRange): [string, string] => [
  `L${r.start}–L${r.end}`,
  blobUrl(V.links.kernel, `L${r.start}-L${r.end}`),
];

export function installExplainPanel(panel: PanelShell): void {
  installEquations(panel);
  installClosedForm(panel);
}

// --- 1. the Hamiltonian, the rule, and the committed WGSL -------------------

function installEquations(panel: PanelShell): void {
  const g = panel.addGroup("equations → code");
  const details = document.createElement("details");
  details.className = "ig-details";
  const summary = document.createElement("summary");
  summary.textContent = "the Hamiltonian, the Metropolis rule, and the committed WGSL that runs them";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  const intro = document.createElement("div");
  intro.className = "ig-eq";
  const introMath = document.createElement("div");
  introMath.className = "ig-eq-math";
  introMath.textContent = "H(s) = −J Σ⟨ij⟩ sᵢsⱼ − h Σᵢ sᵢ,  sᵢ ∈ {−1, +1}";
  const introNote = document.createElement("small");
  introNote.textContent = `spins on a ${V.canonical.grid[0]}² periodic lattice; J couples nearest neighbours, h is the external field (canonical J ${V.canonical.params.J}, h ${V.canonical.params.h})`;
  introMath.appendChild(introNote);
  intro.appendChild(introMath);
  body.appendChild(intro);

  const a = V.code_anchors;
  const [nsL, nsH] = rangeOf(a.neighbour_sum);
  body.appendChild(
    eqBlock(
      "Σ_nbr s — the local field",
      "the four nearest neighbours, periodic wrap on both axes",
      a.neighbour_sum.lines.join("\n"),
      nsL,
      nsH,
    ),
  );
  const [deL, deH] = lineOf(a.delta_e);
  body.appendChild(
    eqBlock("ΔE = 2sᵢ(J·Σ + h) — the flip cost", "the energy change if this one spin flips", a.delta_e.text, deL, deH),
  );
  const [acL, acH] = rangeOf(a.accept);
  body.appendChild(
    eqBlock(
      "accept with min(1, e^(−ΔE/T))",
      "Metropolis 1953 — downhill always, uphill with Boltzmann probability",
      a.accept.lines.join("\n"),
      acL,
      acH,
    ),
  );
  const [cbL, cbH] = lineOf(a.checkerboard);
  body.appendChild(
    eqBlock(
      "checkerboard parity — detailed balance, in parallel",
      "same-colour sites are never neighbours; two colour dispatches per sweep",
      a.checkerboard.text,
      cbL,
      cbH,
    ),
  );
  const [pcgL, pcgH] = rangeOf(a.pcg);
  body.appendChild(
    eqBlock(
      "PCG per-cell RNG — why the gate is statistical",
      "hashes (cell, seed, sweep, colour) into an independent draw; no atomics, no global state",
      a.pcg.lines.join("\n"),
      pcgL,
      pcgH,
    ),
  );

  // expert-credibility notes (spec § 3.2): finite size, critical slowing
  // down, RNG honesty, IC provenance — naming these is the trust signal
  const notes = document.createElement("div");
  notes.className = "ig-hash";
  const addNote = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    notes.append(b, document.createTextNode(text), document.createElement("br"));
  };
  addNote(
    "different microstates, by design",
    V.determinism.field_note,
  );
  addNote(
    "finite size",
    `at L = ${V.canonical.grid[0]} the transition is shifted and rounded by ~1/L — the measured-vs-Yang figure below is framed as ` +
      `"consistent with the finite-L system", never "measures T_c"; the golden tolerance critical_temp_rel = ${V.analytic.critical_temp_rel} encodes exactly this`,
  );
  addNote(
    "critical slowing down",
    "single-flip Metropolis decorrelates slowly near T_c (dynamic exponent z ≈ 2.17) — it is why the activity layer seethes there, " +
      "and why cluster algorithms exist; this demo deliberately keeps the committed single-flip kernel",
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
    extLink("Metropolis 1953", METROPOLIS_DOI, "Equation of state calculations by fast computing machines — J. Chem. Phys. 21:1087"),
  );
  body.appendChild(foot);
}

// --- 2. the closed-form anchors: 1940s exact results as test oracles --------

function installClosedForm(panel: PanelShell): void {
  const g = panel.addGroup("exact results — the anchors");
  const details = document.createElement("details");
  details.className = "ig-details";
  const summary = document.createElement("summary");
  summary.textContent = "three closed forms from 1941–1952 pin this sim's golden tables";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  const item = (eq: string, meaning: string): void => {
    const div = document.createElement("div");
    div.className = "ig-eq";
    const math = document.createElement("div");
    math.className = "ig-eq-math";
    math.textContent = eq;
    const note = document.createElement("small");
    note.textContent = meaning;
    math.appendChild(note);
    div.appendChild(math);
    body.appendChild(div);
  };
  item(
    `T_c = ${V.analytic.Tc_formula} = ${V.analytic.Tc.toFixed(7)}…`,
    "Onsager 1944 — the exact critical temperature; the T slider's tick mark",
  );
  item(
    V.analytic.kramers_wannier,
    "Kramers-Wannier 1941 — the same T_c from self-duality, three years before the full solution",
  );
  item(
    V.analytic.yang_formula,
    `Yang 1952 — the exact spontaneous magnetization; the sim is checked against it within magnetization_rel = ${V.analytic.magnetization_rel}`,
  );

  const note = document.createElement("div");
  note.className = "ig-note-line";
  note.textContent =
    "these are not illustrations — they are the committed golden tables the test suite runs, and the curve the PROVE figure below measures against.";
  body.appendChild(note);

  const links = document.createElement("div");
  links.className = "bps-links";
  for (const [label, href, title] of [
    ["T_c golden table", blobUrl(V.links.golden_tc), "three independent anchors: Onsager 1944, Kramers-Wannier duality, Landau & Binder"],
    ["m(T) golden table", blobUrl(V.links.golden_m), "Yang 1952, Baxter 1982 § 7.10, Newman & Barkema Fig. 3.1"],
    ["hand derivation", blobUrl(V.links.derivation), "tools/testkit/golden/derivations/ising-onsager.md"],
    ["Onsager 1944", ONSAGER_DOI, "Crystal statistics I — Phys. Rev. 65:117"],
    ["Yang 1952", YANG_DOI, "The spontaneous magnetization of a two-dimensional Ising model — Phys. Rev. 85:808"],
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
