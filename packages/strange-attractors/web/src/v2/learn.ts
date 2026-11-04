// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph; the equations and how the ball is
// integrated), the live instrument (the ball's spread against time, on a log
// scale, with the moment predictability is lost), why simulations of chaos
// are still trustworthy, the performance readout and the model's limits.

import type { PassTiming } from "@bp/gpu";
import { h, plotPanel, readout } from "@bp/studio";
import type { LorenzParams } from "./model/lorenz.js";
import { sci } from "./format.js";
import { REPO_BLOB } from "./proof/gate.js";
import type { SceneDef } from "./scenes.js";

const LORENZ_1963 = "https://doi.org/10.1175/1520-0469(1963)020%3C0130:DNF%3E2.0.CO;2";
const TUCKER_2002 = "https://doi.org/10.1007/s002080010018";
const BENETTIN_1980 = "https://doi.org/10.1007/BF02128236";

export interface LearnPane {
  setScene(scene: SceneDef): void;
  setParams(p: LorenzParams): void;
  /** A new ball: forget the spread history. */
  resetSpread(eps: number, threshold: number): void;
  pushSpread(t: number, spread: number): void;
  setHorizon(t: number | null): void;
  setStats(rows: [string, string][]): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const MATH = `<math display="block" class="cx-math" aria-label="The Lorenz equations: dx/dt = sigma (y minus x); dy/dt = x (rho minus z) minus y; dz/dt = x y minus beta z">
  <mtable columnalign="left">
    <mtr><mtd><mfrac><mrow><mi>d</mi><mi>x</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mi>σ</mi><mo>(</mo><mi>y</mi><mo>−</mo><mi>x</mi><mo>)</mo></mtd></mtr>
    <mtr><mtd><mfrac><mrow><mi>d</mi><mi>y</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mi>x</mi><mo>(</mo><mi>ρ</mi><mo>−</mo><mi>z</mi><mo>)</mo><mo>−</mo><mi>y</mi></mtd></mtr>
    <mtr><mtd><mfrac><mrow><mi>d</mi><mi>z</mi></mrow><mrow><mi>d</mi><mi>t</mi></mrow></mfrac><mo>=</mo><mi>x</mi><mi>y</mi><mo>−</mo><mi>β</mi><mi>z</mi></mtd></mtr>
  </mtable>
</math>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const link = (href: string, label: string): HTMLAnchorElement => h("a", { href, target: "_blank", rel: "noopener" }, label);
  const src = (label: string, path: string): HTMLAnchorElement => link(`${REPO_BLOB}${path}`, label);

  const seeing = h("p", { class: "cx-lede" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing);

  // the instrument
  const horizon = h("p", { class: "cx-horizon", role: "status" }, "");
  const plot = plotPanel({
    title: "How far apart the ball has spread",
    xLabel: "model time t",
    yLabel: "RMS distance from the ball's centre",
    yScale: "log",
    height: 150,
    formatX: (v) => v.toFixed(0),
    formatY: (v) => v.toExponential(0),
  });
  pane.append(h("h2", {}, "The ball, measured"), horizon, plot.el);
  pane.append(
    h(
      "p",
      { class: "cx-note" },
      "On a log scale, steady exponential growth is a straight line. Its slope is the largest Lyapunov exponent, λ₁ ≈ 0.906 for these parameters: " +
        "every 2.5 time units the ball is ten times wider. It stops growing when it covers the attractor.",
    ),
  );

  // how it works, three depths
  const pv: Record<string, HTMLElement> = {};
  const pval = (k: string): HTMLElement => (pv[k] = h("span", { class: "bp-mono" }, "—"));
  pane.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Three coupled equations, stepped forward in tiny increments: the point never repeats and never leaves the butterfly-shaped attractor, " +
        "yet two points that start a millionth apart end up on opposite wings.",
    ),
    h(
      "p",
      {},
      "Edward Lorenz found it in 1963, in a three-mode cut-down of a model of convection (",
      link(LORENZ_1963, "Lorenz 1963"),
      "). The flow stretches every small blob of starting points along one direction and squeezes it along another, then folds it back onto the two wings. " +
        "Stretching makes nearby trajectories separate exponentially; folding keeps them on the attractor. Repeat, and any measurement error — however small — " +
        "grows until it is as large as the attractor itself. More precision buys only a fixed amount of extra future per digit.",
    ),
    h("div", { html: MATH }),
    h("p", {}, "σ = ", pval("sigma"), ", ρ = ", pval("rho"), ", β = ", pval("beta"), " (Lorenz's values: 10, 28, 8/3)."),
    h(
      "details",
      { class: "cx-detail" },
      h("summary", {}, "How a million starts are integrated"),
      h(
        "p",
        {},
        "Every point is stepped with classical fourth-order Runge–Kutta at Δt = 0.01, one GPU thread per point. " +
          "The picture of the attractor is a second population of points already on it, each splatted into a float image every frame and averaged over about half a second — a long exposure.",
      ),
      h(
        "p",
        {},
        "A ball 10⁻⁶ wide cannot be stored as positions in single precision: near |x| ≈ 20, neighbouring f32 numbers are about 2 × 10⁻⁶ apart, so a million starts would collapse onto a handful. " +
          "Instead the ball's centre is integrated in double precision on the CPU, and the GPU integrates each member's offset from it. " +
          "The Lorenz field is quadratic, so the offset's equation, f(s + e) − f(s) = J(s)·e + Q(e), can be written with no large terms cancelling, " +
          "and Runge–Kutta on the offsets, using the centre's own stage points, is exactly Runge–Kutta on the full positions. " +
          "An offset keeps single precision's relative accuracy however small it is: a ball 10⁻¹² wide is as sharp as one 10⁻² wide.",
      ),
      h("p", {}, src("The kernels", "packages/strange-attractors/web/src/v2/model/ensemble.wgsl"), " · ", src("the f64 reference", "packages/strange-attractors/web/src/v2/model/lorenz.ts")),
    ),
  );

  // why trust it
  pane.append(
    h("h2", {}, "Why a simulation of chaos can be trusted"),
    h(
      "p",
      {},
      "No computed trajectory follows the true one for long: rounding errors grow like any other small difference. " +
        "What survives is the shape. Shadowing results show that, for systems like this one, a computed trajectory stays close to some true trajectory of the system " +
        "from a slightly different start for a long time; and in 2002 Warwick Tucker proved with a computer-assisted argument that the Lorenz attractor really exists (",
      link(TUCKER_2002, "Tucker 2002"),
      "). So the release gate checks what can be checked: the short horizon against a double-precision reference, and that the trajectory stays on the attractor.",
    ),
  );

  // stats + performance
  const stats = readout("The simulation");
  const perf = readout("Performance");
  const passes = readout("GPU passes");
  const perfNote = h("p", { class: "cx-note" }, "");
  pane.append(h("h2", {}, "Numbers"), stats.el, h("h2", {}, "Performance"), perf.el, passes.el, perfNote);

  // limits
  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "ul",
      { class: "cx-limits" },
      h("li", {}, h("strong", {}, "Faithful: "), "the Lorenz 1963 equations and RK4 at the gated step; the ball's members are each a full Lorenz trajectory."),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "the long-exposure picture is a screen-space average (it shortens while you turn the view), and the fixed points are drawn as small spheres.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Measured: "),
        "spread is reduced on the GPU from every member each few frames; the ‘predictability lost’ time is when the spread first reaches half the attractor's own RMS size. ",
        "λ₁ by Benettin's method (",
        link(BENETTIN_1980, "Benettin et al. 1980"),
        ") comes with the next milestone.",
      ),
    ),
  );

  let series: { x: number[]; y: number[] } = { x: [], y: [] };
  let threshold = 1;
  let lastDraw = 0;
  let horizonT: number | null = null;
  const draw = (): void => {
    const thr = series.x.length ? [{ x: [series.x[0]!, series.x[series.x.length - 1]!], y: [threshold, threshold], color: "rgba(160,170,190,0.6)", label: "half the attractor" }] : [];
    plot.set([{ x: series.x, y: series.y, label: "spread" }, ...thr], horizonT !== null ? [{ x: horizonT, label: `lost at t ${horizonT.toFixed(1)}` }] : []);
  };
  return {
    setScene(scene) {
      seeing.textContent =
        scene.id === "butterfly"
          ? "The Lorenz attractor as a long exposure — half a million points already on it, brighter where the flow is fast. " +
            "Then a ball of a million starting points, a millionth wide, is released onto it. It moves as one bright point, stretches into a thread, folds, " +
            "and spreads over both wings: after that, where it started tells you nothing. Click anywhere on the attractor to release another."
          : "";
    },
    setParams(p) {
      pv["sigma"]!.textContent = p.sigma.toFixed(2);
      pv["rho"]!.textContent = p.rho.toFixed(2);
      pv["beta"]!.textContent = p.beta.toFixed(3);
    },
    resetSpread(eps, thr) {
      series = { x: [], y: [] };
      threshold = thr;
      horizonT = null;
      horizon.textContent = `A new ball, ${sci(eps)} wide. Its spread is measured from all its members every few frames.`;
      draw();
    },
    pushSpread(t, spread) {
      if (!(spread > 0)) return;
      series.x.push(t);
      series.y.push(spread);
      if (series.x.length > 1200) {
        series.x = series.x.filter((_, i) => i % 2 === 0);
        series.y = series.y.filter((_, i) => i % 2 === 0);
      }
      const now = performance.now();
      if (now - lastDraw > 250) {
        lastDraw = now;
        draw();
      }
    },
    setHorizon(t) {
      horizonT = t;
      if (t !== null) horizon.textContent = `Predictability lost at t = ${t.toFixed(1)}: the ball has spread over half the attractor.`;
      draw();
    },
    setStats(rows) {
      stats.set(rows);
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
