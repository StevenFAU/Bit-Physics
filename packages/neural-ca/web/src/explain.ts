// EXPLAIN layer (verification-demo-spec § 3.2): equation → code legibility.
//
// Renders the four steps of the Growing-NCA update rule (perception → update
// MLP → stochastic fire → alive mask) next to the ACTUAL committed WGSL that
// implements them. Every quoted snippet and line anchor comes from the
// generated data spine (src/generated/verification.json), extracted at build
// time by exact-substring match against
// packages/neural-ca/typescript/src/nca_inference.wgsl — if the kernel drifts,
// gen-verification.mjs HARD-FAILs the build instead of letting these links
// mis-anchor. Hand-rolled markup on the nc- theme classes; no math dependency
// (spec § 6). Content sourced from
// docs/sim-specs/continuous-ca/neural-ca/spec-ref.md § 3–4.

import V from "./generated/verification.json";
import type { PanelShell } from "../../../../common/common-web/src/panel-shell.js";

const DISTILL_DOI = "https://doi.org/10.23915/distill.00023";

const blobUrl = (path: string, anchor?: string): string =>
  `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;

interface AnchorRange {
  start: number;
  end: number;
  lines: string[];
}

function extLink(label: string, href: string, title?: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "nc-eq-link";
  a.textContent = label;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  if (title) a.title = title;
  return a;
}

function eqBlock(eq: string, meaning: string, code: string, lineLabel: string, href: string): HTMLDivElement {
  const div = document.createElement("div");
  div.className = "nc-eq";
  const math = document.createElement("div");
  math.className = "nc-eq-math";
  math.textContent = eq;
  const note = document.createElement("small");
  note.textContent = meaning;
  math.appendChild(note);
  const codeEl = document.createElement("code");
  codeEl.className = "nc-code";
  codeEl.textContent = code;
  codeEl.title = `nca_inference.wgsl ${lineLabel} — quoted verbatim at build time`;
  div.append(math, codeEl, extLink(`nca_inference.wgsl:${lineLabel}`, href, "the committed kernel that runs on this GPU"));
  return div;
}

const rangeOf = (r: AnchorRange): [string, string] => [`L${r.start}–L${r.end}`, blobUrl(V.links.kernel, `L${r.start}-L${r.end}`)];

export function installExplainPanel(panel: PanelShell): void {
  const g = panel.addGroup("the rule → the code");
  const details = document.createElement("details");
  details.className = "nc-details";
  const summary = document.createElement("summary");
  summary.textContent = "a trained neural network, run as a CA rule — and the committed WGSL that runs it";
  details.appendChild(summary);
  const body = document.createElement("div");
  details.appendChild(body);
  g.appendChild(details);

  // the update rule as one line
  const intro = document.createElement("div");
  intro.className = "nc-eq";
  const m1 = document.createElement("div");
  m1.className = "nc-eq-math";
  m1.textContent = "x′ = x + W₂·relu(W₁·perceive(x)) ⊙ fire,   x_next = x′ ⊙ (alive(x) ∧ alive(x′))";
  const m1n = document.createElement("small");
  m1n.textContent = `${V.model.channels}-channel cells (RGBA + ${V.model.hidden} hidden), ${V.model.mlp}, fire ${V.model.fire_rate}, alive α>${V.model.alive_threshold}`;
  m1.appendChild(m1n);
  intro.appendChild(m1);
  body.appendChild(intro);

  const a = V.code_anchors;
  const [pL, pH] = rangeOf(a.perception);
  body.appendChild(
    eqBlock(
      "1 · perceive — fixed depthwise conv",
      "identity + Sobel-x + Sobel-y per channel → a 48-vector (the only fixed kernels)",
      a.perception.lines.join("\n"),
      pL,
      pH,
    ),
  );
  const [mL, mH] = rangeOf(a.mlp);
  body.appendChild(
    eqBlock(
      "2 · update MLP — the learned part",
      "Conv1×1(128) → ReLU → Conv1×1(16), final layer zero-init so the residual starts as do-nothing",
      a.mlp.lines.join("\n"),
      mL,
      mH,
    ),
  );
  const [fL, fH] = rangeOf(a.pcg_fire);
  body.appendChild(
    eqBlock(
      "3 · stochastic fire — a DETERMINISTIC hash",
      "each cell applies dx with prob 0.5 — but the “coin” is a stateless PCG hash of (x,y,step,seed), matched to the NumPy oracle",
      a.pcg_fire.lines.join("\n"),
      fL,
      fH,
    ),
  );
  const [avL, avH] = rangeOf(a.alive);
  body.appendChild(
    eqBlock(
      "4 · alive mask — maxpool₃ₓ₃(α) > 0.1",
      "a cell is alive iff a neighbour’s alpha clears 0.1, pre AND post update; dead-both zeroes it",
      a.alive.lines.join("\n"),
      avL,
      avH,
    ),
  );

  // teachable honesty tie-ins
  const notes = document.createElement("div");
  notes.className = "nc-hash";
  const addNote = (label: string, text: string): void => {
    const b = document.createElement("b");
    b.textContent = `${label}: `;
    notes.append(b, document.createTextNode(text), document.createElement("br"));
  };
  addNote(
    "why a “random” update is bit-reproducible",
    `the fire mask LOOKS random but is a pure hash of (x,y,step,seed) (${rangeOf(a.pcg_fire)[0]}), so the same seed replays byte-identically — this is what makes the bit-exact gate possible for a stochastic learned rule.`,
  );
  addNote(
    "two determinism scopes",
    `within WGSL on one GPU it is ${V.determinism.within_wgsl}; across GPU backends it is bit-divergent-but-visually-convergent (measured live below); across stacks (PyTorch↔WGSL) it is ${V.determinism.cross_stack}.`,
  );
  addNote(
    "matched RNG lifted the cross-stack agreement",
    `giving PyTorch the SAME stateless-PCG fire mask (not torch.rand) took D↔B render-similarity from PSNR ${V.cross_stack.history_psnr} to ${V.cross_stack.psnr} (SSIM ${V.cross_stack.ssim}, LPIPS ${V.cross_stack.lpips_alex}); the residual ~144 dB is just GPU-vs-CPU f32 conv-reduction order — the gate stays statistical, not bit-exact, across stacks.`,
  );
  addNote(
    "the invisible channels",
    `only ${4} of ${V.model.channels} channels are visible (RGBA); the other ${V.model.hidden} are unbounded real values that drift — the CA’s “chemical” signals. The display’s hidden-channel mode arctan-squashes them (echoing Distill’s near-zero-precision choice) to make them visible.`,
  );
  body.appendChild(notes);

  const foot = document.createElement("div");
  foot.className = "nc-eq";
  foot.append(
    extLink("spec sheet", blobUrl(V.links.spec), "spec-ref.md — algorithm, algebraic form, determinism rows"),
    document.createTextNode("  ·  "),
    extLink("determinism registry", blobUrl(V.links.determinism_registry)),
    document.createTextNode("  ·  "),
    extLink("Growing Neural CA (Distill 2020)", DISTILL_DOI, "Mordvintsev, Randazzo, Niklasson, Levin — DOI 10.23915/distill.00023"),
  );
  body.appendChild(foot);
}
