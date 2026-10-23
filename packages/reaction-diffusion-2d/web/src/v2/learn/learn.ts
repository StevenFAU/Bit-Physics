// Learn (00-foundation.md § 6; 01-reaction-diffusion.md § Learn): what you
// are seeing, how it works at three depths (a sentence; a paragraph with a
// diagram; the equations, each symbol linked to the control it maps to, and
// the committed kernel lines that implement them), live instruments, the
// performance readout, and the model's limits.

import { colorScale, h, plotPanel, readout, sparkline, toggle } from "@bp/studio";
import type { PassTiming } from "@bp/gpu";
import { colormapCss, getColormapDef } from "@bp/render";
import V from "../../generated/verification.json";
import type { SceneDef, SceneId } from "../scenes/scenes.js";
import { SCENES, nearestRegime } from "../scenes/scenes.js";
import type { ModelDef } from "../model/models.js";
import { MODELS, MODEL_IDS } from "../model/models.js";
import type { PatternStats, SpectrumReading } from "./instruments.js";

const blob = (path: string, anchor?: string): string => `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;
const PEARSON = "https://doi.org/10.1126/science.261.5118.189";
const MUNAFO = "https://mrob.com/pub/comp/xmorphia/";

export interface LearnHandlers {
  /** A symbol in the equations was activated: open the control it maps to. */
  symbol: (s: "F" | "k" | "D") => void;
  dataView: (on: boolean) => void;
  raw: (on: boolean) => void;
  labels: (on: boolean) => void;
  /** Open a scene (the model list's buttons). */
  scene: (id: SceneId) => void;
}

export interface LearnPane {
  setScene(scene: SceneDef, gated: boolean, model: ModelDef): void;
  setChemistry(F: number, k: number, ratio: number): void;
  setStats(s: PatternStats, tick: number): void;
  setSpectrum(s: SpectrumReading): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

function mathSym(text: string, sym: "F" | "k" | "D", label: string, fn: (s: "F" | "k" | "D") => void): HTMLElement {
  // MathML <mi> wrapped in an accessible button-like link to the control
  const b = h("button", { type: "button", class: "bp-symlink", "aria-label": `${label} — open its control`, title: `${label} — open its control` });
  b.innerHTML = text;
  b.addEventListener("click", () => fn(sym));
  return b;
}

const MATH_U =
  '<math display="block" aria-label="d U by d t equals D u Laplacian U minus U V squared plus F times one minus U">' +
  "<mrow><mfrac><mrow><mo>∂</mo><mi>U</mi></mrow><mrow><mo>∂</mo><mi>t</mi></mrow></mfrac><mo>=</mo>" +
  '<msub><mi>D</mi><mi>u</mi></msub><msup><mo>∇</mo><mn>2</mn></msup><mi>U</mi><mo>−</mo><mi>U</mi><msup><mi>V</mi><mn>2</mn></msup>' +
  "<mo>+</mo><mi>F</mi><mo>(</mo><mn>1</mn><mo>−</mo><mi>U</mi><mo>)</mo></mrow></math>";
const MATH_V =
  '<math display="block" aria-label="d V by d t equals D v Laplacian V plus U V squared minus F plus k times V">' +
  "<mrow><mfrac><mrow><mo>∂</mo><mi>V</mi></mrow><mrow><mo>∂</mo><mi>t</mi></mrow></mfrac><mo>=</mo>" +
  '<msub><mi>D</mi><mi>v</mi></msub><msup><mo>∇</mo><mn>2</mn></msup><mi>V</mi><mo>+</mo><mi>U</mi><msup><mi>V</mi><mn>2</mn></msup>' +
  "<mo>−</mo><mo>(</mo><mi>F</mi><mo>+</mo><mi>k</mi><mo>)</mo><mi>V</mi></mrow></math>";

const DIAGRAM = `<svg viewBox="0 0 320 120" role="img" aria-label="Diagram: U is fed in at rate F; one U and two V make three V; V is removed at rate F plus k; U diffuses twice as fast as V." class="rd-diagram">
  <defs><marker id="rd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#rd-arrow)">
    <path d="M18 58h46"/><path d="M128 58h56"/><path d="M248 58h46"/>
  </g>
  <g font-family="IBM Plex Sans, system-ui, sans-serif" font-size="12" fill="currentColor">
    <text x="4" y="48">feed F</text>
    <circle cx="96" cy="58" r="24" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <text x="90" y="62" font-weight="600">U</text>
    <text x="134" y="48">U + 2V → 3V</text>
    <circle cx="216" cy="58" r="24" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <text x="210" y="62" font-weight="600">V</text>
    <text x="252" y="48">kill F + k</text>
    <text x="64" y="104" font-size="11">spreads fast (D_u)</text>
    <text x="184" y="104" font-size="11">spreads slow (D_v)</text>
  </g>
</svg>`;

export function buildLearn(pane: HTMLElement, on: LearnHandlers): LearnPane {
  pane.textContent = "";
  // --- what you're seeing --------------------------------------------------
  const sceneTitle = h("h3", {});
  const sceneStory = h("p", {});
  const chemLine = h("p", { class: "bp-dim bp-mono" });
  pane.append(h("h2", {}, "What you're seeing"), sceneTitle, sceneStory, chemLine);

  // --- the model ------------------------------------------------------------
  // Gray–Scott is the default (its full explanation follows); the other three
  // run behind the same kernel, each with its own scene.
  const modelName = h("h3", {});
  const modelBlurb = h("p", {});
  const modelEq = h("div", { class: "bp-eq rd-model-eq bp-mono" });
  const modelConsts = h("p", { class: "bp-dim bp-mono" });
  const modelCite = h("p", { class: "bp-dim" });
  const sceneFor = (m: ModelDef): SceneDef | undefined => SCENES.find((s) => s.listed && (s.model ?? "gray-scott") === m.id && !s.surface && s.kernel === "live");
  const others = h(
    "div",
    { class: "rd-model-list" },
    ...MODEL_IDS.map((id) => {
      const s = sceneFor(MODELS[id]);
      const b = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, MODELS[id].name);
      b.addEventListener("click", () => s && on.scene(s.id));
      return b;
    }),
  );
  const proofNote = h(
    "p",
    { class: "bp-dim" },
    "Each of these runs on the same 5-point Laplacian and Euler step as the gated kernel. Gray–Scott is gated by the " +
      "release capture; the other three each have a float64 golden that the Prove drawer re-runs on your GPU, and the " +
      "Brusselator's stripe spacing is checked against its dispersion relation there.",
  );
  pane.append(h("h2", {}, "The model"), modelName, modelBlurb, modelEq, modelConsts, modelCite, h("p", {}, "Other models:"), others, proofNote);

  // --- how it works ----------------------------------------------------------
  pane.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Two chemicals spread at different speeds. One is food for the other, and the balance between feeding and " +
        "dying decides which pattern appears.",
    ),
  );
  const l2 = h(
    "details",
    {},
    h("summary", {}, "A closer look"),
    h(
      "p",
      {},
      "Chemical U is fed in everywhere at the feed rate F. Where U meets V, one U and two V make three V — so V " +
        "grows wherever there is already some, by eating U. V is removed at rate F + k. U spreads twice as fast as " +
        "V, so a patch of V uses up the food around it faster than it can spread: growth is local, starvation is " +
        "long-range. That imbalance — Turing's 1952 idea — is what turns a smooth mixture into spots and stripes.",
    ),
    h("div", { html: DIAGRAM }),
  );
  const eqs = h("div", { class: "bp-eq" });
  eqs.innerHTML = MATH_U + MATH_V;
  const symbols = h(
    "p",
    { class: "rd-symbols" },
    "Controls: ",
    mathSym("<i>F</i> feed rate", "F", "Feed rate F", on.symbol),
    " · ",
    mathSym("<i>k</i> kill rate", "k", "Kill rate k", on.symbol),
    " · ",
    mathSym("<i>D<sub>u</sub></i>/<i>D<sub>v</sub></i> diffusion ratio", "D", "Diffusion ratio", on.symbol),
  );
  const a = V.code_anchors;
  const codeRow = (title: string, lines: string[], anchor: string): HTMLElement =>
    h(
      "div",
      { class: "rd-code-row" },
      h("p", { class: "bp-dim" }, title, " · ", h("a", { href: blob(V.links.kernel, anchor), target: "_blank", rel: "noopener" }, `gray_scott.wgsl ${anchor.replace("-", "–")}`)),
      h("pre", { class: "rd-code" }, lines.join("\n")),
    );
  const l3 = h(
    "details",
    {},
    h("summary", {}, "The equations, and the code that runs them"),
    eqs,
    symbols,
    h(
      "p",
      {},
      `On the grid: a 5-point Laplacian with Δx = ${V.canonical.params.dx}, and forward Euler with Δt = ${V.canonical.params.dt}. ` +
        "These lines are quoted at build time from the committed kernel the verification gate runs:",
    ),
    codeRow("diffusion", a.laplacian.lines, `L${a.laplacian.start}-L${a.laplacian.end}`),
    codeRow("reaction, feed and kill", [a.reaction.text, a.feed.text, a.kill.text], `L${a.reaction.line}-L${a.kill.line}`),
    codeRow("time step", a.euler.lines, `L${a.euler.start}-L${a.euler.end}`),
    h(
      "p",
      { class: "bp-dim" },
      "The explicit step is stable while Δt ≤ Δx² / (4 · max(D_u, D_v)) = 1.5625 here. Pearson (1993) mapped the patterns of ",
      h("a", { href: PEARSON, target: "_blank", rel: "noopener" }, "this system"),
      "; Munafo's ",
      h("a", { href: MUNAFO, target: "_blank", rel: "noopener" }, "xmorphia"),
      " catalogues them.",
    ),
  );
  pane.append(l2, l3);

  // --- instruments -----------------------------------------------------------
  pane.append(h("h2", {}, "Instruments"));
  const spectrum = plotPanel({
    title: "Power spectrum of V around the view centre",
    xLabel: "waves / window",
    yLabel: "power",
    yScale: "log",
    formatX: (v) => v.toFixed(0),
  });
  const lambda = h("p", { class: "bp-mono rd-lambda" }, "Dominant wavelength: measuring…");
  const pieces = sparkline("Separate spots or pieces", "", 120, 0);
  const coverage = sparkline("Coverage (V > 0.15)", "%", 120, 1);
  const mass = sparkline("Total V", "cells", 120, 0);
  pane.append(spectrum.el, lambda, pieces.el, coverage.el, mass.el);
  const scale = colorScale(colormapCss(getColormapDef("viridis")), "0", "0.5", "V concentration");
  scale.el.hidden = true;
  const dataToggle = toggle("Show as data (colormap + isolines)", false, (v) => {
    scale.el.hidden = !v;
    on.dataView(v);
  });
  const rawToggle = toggle("Raw cells — what the buffer holds", false, on.raw);
  const labelToggle = toggle("Map labels", true, on.labels);
  pane.append(h("div", { class: "rd-toggles" }, dataToggle.el, scale.el, rawToggle.el, labelToggle.el));

  // --- performance ---------------------------------------------------------
  const perf = readout("Performance");
  const passes = readout("GPU passes");
  const perfNote = h("p", { class: "bp-dim" });
  pane.append(
    h("h2", {}, "Performance"),
    perf.el,
    h("h3", {}, "GPU time per pass"),
    passes.el,
    perfNote,
  );

  // --- model limits ----------------------------------------------------------
  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "dl",
      { class: "rd-limits" },
      h("dt", {}, "Faithful"),
      h(
        "dd",
        {},
        "The Gray–Scott update rule of the committed kernel — same Laplacian, same reaction terms, same Euler step, " +
          "same Δt — in every scene.",
      ),
      h("dt", {}, "Simplified"),
      h(
        "dd",
        {},
        "Outside the gated dish, F and k are fields (a sweep, a painted chemistry) and the grid follows your screen's " +
          "shape; that live solver is not what the gate checks. Lighting, relief and gloss are drawn from the field, " +
          "never simulated. The Map's region names are labels placed by eye after Pearson and Munafo, not " +
          "classifications computed from the field.",
      ),
      h("dt", {}, "Measured"),
      h(
        "dd",
        {},
        "Statistics and the spectrum are read back from the live state a few times a second while this panel is open. " +
          "∫(U + V) is not conserved — the feed term forces it.",
      ),
    ),
  );

  let massHistory = 0;
  return {
    setScene(scene, gated, model) {
      modelName.textContent = model.name;
      modelBlurb.textContent = model.blurb;
      modelEq.innerHTML = "";
      modelEq.append(
        h("div", {}, `∂u/∂t = D_u ∇²u + ${model.equations.f}`),
        h("div", {}, `∂v/∂t = D_v ∇²v + ${model.equations.g}`),
      );
      const [p0, p1] = model.params;
      modelConsts.textContent =
        `${p0.symbol} = ${model.p[0]} · ${p1.symbol} = ${model.p[1]}` +
        (model.id === "gray-scott" ? "" : ` · D_u = ${model.Du} · D_v = ${model.Dv} · Δx = ${model.dx} · Δt = ${model.dt}`) +
        (model.id === "fitzhugh-nagumo" ? ` · a₀ = ${model.c}` : "");
      modelCite.innerHTML = "";
      modelCite.append(h("a", { href: model.cite.href, target: "_blank", rel: "noopener" }, model.cite.label));
      for (const b of others.querySelectorAll("button")) {
        (b as HTMLButtonElement).disabled = b.textContent === model.name && !scene.surface;
      }
      sceneTitle.textContent = scene.title;
      sceneStory.textContent = scene.story + (gated ? " Right now it is exactly the gated run." : "");
      pieces.clear();
      coverage.clear();
      mass.clear();
      massHistory = 0;
      lambda.textContent = scene.surface
        ? "The instruments read flat dishes. On a shape, the pattern itself is the readout."
        : "Dominant wavelength: measuring…";
    },
    setChemistry(F, k, ratio) {
      const { regime, distance } = nearestRegime(F, k);
      chemLine.textContent = `F ${F.toFixed(4)} · k ${k.toFixed(4)} · D_u/D_v ${ratio.toFixed(2)}${distance < 0.08 ? ` · near ${regime.name}` : ""}`;
    },
    setStats(s) {
      pieces.push(s.pieces);
      coverage.push(s.coverage * 100);
      mass.push(s.massV);
      massHistory += 1;
    },
    setSpectrum(s) {
      const x = Array.from({ length: s.power.length - 1 }, (_, i) => i + 1);
      const y = Array.from(s.power.slice(1));
      spectrum.set(
        [{ x, y }],
        s.peakIndex !== null && s.wavelength !== null ? [{ x: s.peakIndex, label: `λ ≈ ${s.wavelength.toFixed(1)} cells` }] : [],
      );
      lambda.textContent =
        s.wavelength !== null
          ? `Dominant wavelength: ${s.wavelength.toFixed(1)} cells (window ${s.n} × ${s.n}, Hann-tapered)`
          : "Dominant wavelength: no clear peak yet";
    },
    setPerf(rows, list, source) {
      perf.set(rows);
      passes.set(list.map((p) => [p.name, `${p.avg.toFixed(2)} ms`]));
      perfNote.textContent =
        source === "timestamp"
          ? "Per-pass timings from GPU timestamp queries (the browser may round them to 0.1 ms)."
          : "This GPU does not expose timestamp queries; frame time is measured from submit to completion.";
    },
  };
}
