// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph; the equations), the guarantee measured
// live (divergence at the f32 floor, a density that stays flat), the honest
// line — this looks like fluid without being fluid — the performance
// readout and the model's limits.

import type { PassTiming } from "@bp/gpu";
import { h, plotPanel, readout, sparkline } from "@bp/studio";
import type { FieldParams } from "./model/flow.js";
import { isCanonical } from "./model/flow.js";
import { REPO_BLOB } from "./proof/gate.js";
import type { SceneDef } from "./scenes.js";

const BRIDSON_2007 = "https://dblp.uni-trier.de/rec/journals/tog/BridsonHN07.html";

export interface LearnPane {
  setScene(scene: SceneDef, strands: number): void;
  setField(p: FieldParams, dt: number): void;
  /** Max |∇·v| / max |∇×v| at the probes, on the field on screen. */
  pushDivergence(rel: number): void;
  /** Tracer counts in equal-volume shells (flat = no bunching, no thinning); null hides it (Silk's sheets). */
  setDensity(counts: number[] | null): void;
  /** Silk: how far particles have left their surfaces (f64 at f32 positions), or null while the field moves. */
  setResidual(r: { worst: number; median: number; count: number } | null): void;
  setStats(rows: [string, string][]): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const MATH = `<math display="block" class="fs-math" aria-label="v equals grad f1 cross grad f2; the divergence of v is grad f2 dot curl grad f1 minus grad f1 dot curl grad f2, which is zero">
  <mtable columnalign="left">
    <mtr><mtd><mi mathvariant="bold">v</mi><mo>=</mo><mo>∇</mo><msub><mi>f</mi><mn>1</mn></msub><mo>×</mo><mo>∇</mo><msub><mi>f</mi><mn>2</mn></msub></mtd></mtr>
    <mtr><mtd><mo>∇</mo><mo>·</mo><mi mathvariant="bold">v</mi><mo>=</mo><mo>∇</mo><msub><mi>f</mi><mn>2</mn></msub><mo>·</mo><mo>(</mo><mo>∇</mo><mo>×</mo><mo>∇</mo><msub><mi>f</mi><mn>1</mn></msub><mo>)</mo><mo>−</mo><mo>∇</mo><msub><mi>f</mi><mn>1</mn></msub><mo>·</mo><mo>(</mo><mo>∇</mo><mo>×</mo><mo>∇</mo><msub><mi>f</mi><mn>2</mn></msub><mo>)</mo><mo>=</mo><mn>0</mn></mtd></mtr>
    <mtr><mtd><msub><mi>f</mi><mn>1</mn></msub><mo>=</mo><mi>d</mi><mo>(</mo><mi mathvariant="bold">x</mi><mo>)</mo><mo>+</mo><mi>A</mi><mspace width="0.2em"/><mi>r</mi><mo>(</mo><mi>d</mi><mo>/</mo><msub><mi>d</mi><mn>0</mn></msub><mo>)</mo><mspace width="0.2em"/><msub><mi>n</mi><mn>1</mn></msub><mo>(</mo><mi mathvariant="bold">x</mi><mo>)</mo></mtd></mtr>
  </mtable>
</math>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const link = (href: string, label: string): HTMLAnchorElement => h("a", { href, target: "_blank", rel: "noopener" }, label);
  const src = (label: string, path: string): HTMLAnchorElement => link(`${REPO_BLOB}${path}`, label);

  const seeing = h("p", { class: "fs-lede" }, "");
  const onScreen = h("p", { class: "fs-note", role: "status" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing, onScreen);

  // the guarantee, measured
  const div = sparkline("Largest divergence, relative to the swirl", "", 90, 2);
  const density = plotPanel({
    title: "Where the particles are",
    xLabel: "shell, from the sphere outwards (equal volumes)",
    yLabel: "particles",
    height: 120,
    formatX: (v) => v.toFixed(0),
    formatY: (v) => v.toFixed(0),
  });
  const residual = h("p", { class: "fs-residual", role: "status" }, "—");
  const densityBlock = h(
    "div",
    { hidden: true },
    h(
      "p",
      {},
      "And because nothing is compressed, particles that start evenly spread stay evenly spread: counted in shells of equal volume around the ball's centre, the bars stay level — no bunching where the flow speeds up, no thinning where it slows.",
    ),
    density.el,
  );
  pane.append(
    h("h2", {}, "The guarantee, measured"),
    h(
      "p",
      {},
      "Every second, the page reads the flow's divergence at a thousand points off its exact derivative. It sits at the floor of single-precision rounding, about a ten-millionth of the size of the swirl, and stays there.",
    ),
    div.el,
    h(
      "p",
      {},
      "Silk's particles start on two sheets — two surfaces where f₂ takes one value — and the flow can only slide along them, so each sheet holds together as one cloth. " +
        "The page checks it the way the release gate does: for a few hundred particles it recomputes f₁ and f₂ in double precision at their single-precision positions and compares them with the values they started with.",
    ),
    residual,
    densityBlock,
  );

  // how it works, three depths
  pane.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "The motion comes from smooth random noise, turned into a flow that can never pile up or thin out — and that slides around the sphere instead of through it.",
    ),
    h(
      "p",
      {},
      "Take two smooth noise fields, f₁ and f₂, and let the velocity at every point be the cross product of their gradients. Each particle then moves along the curve where a surface of constant f₁ meets a surface of constant f₂: " +
        "it can only slide along both. A flow built this way is exactly incompressible, for any noise at all. " +
        "Near the sphere, f₁ is replaced by the distance to the sphere, blended back into noise over a short ramp (",
      link(BRIDSON_2007, "Bridson, Hourihan & Nordenstam 2007"),
      "): the sphere's surface becomes one of the surfaces the flow slides along, so the flow is tangent to it exactly.",
    ),
    h("div", { html: MATH }),
    h(
      "details",
      { class: "fs-detail" },
      h("summary", {}, "Why it stays exact on a GPU"),
      h(
        "p",
        {},
        "The gradients, and the second derivatives the divergence check reads, are computed analytically from the noise formula — no finite differences, no grid. " +
          "The noise's lattice hash is exact integer arithmetic (the usual floating-point version picks different lattice gradients in single and double precision), and the gated code uses no built-in sine, cosine or exponential, which some GPUs compute to only three or four digits. " +
          "Particles take fourth-order Runge–Kutta steps, then one Newton step back onto their two surfaces.",
      ),
      h(
        "p",
        {},
        "Silk draws each particle's last ~30 positions as a ribbon lit like a thread by its direction (Kajiya–Kay shading). Ribbons thin where the flow speeds up: a tube of incompressible flow has to narrow to carry the same volume faster.",
      ),
      h("p", {}, src("The field", "packages/curl-noise/web/src/field.wgsl"), " · ", src("the live kernel", "packages/curl-noise/web/src/v2/model/live.wgsl"), " · ", src("the f64 mirror", "packages/curl-noise/web/src/curlnoise64.mjs")),
    ),
  );

  // the honest line
  pane.append(
    h("h2", {}, "Fluid-like, not fluid"),
    h(
      "p",
      {},
      "This looks like fluid without being fluid. Nothing here solves the equations of a real fluid: there is no pressure, no momentum, no viscosity, and the sphere does not push the flow — the flow is told to go around it. " +
        "Curl noise is a tool for making beautiful motion with a guarantee: what is guaranteed is incompressibility and the boundary, nothing more. For real smoke, see Plume.",
    ),
  );

  // stats + performance
  const stats = readout("The simulation");
  const perf = readout("Performance");
  const passes = readout("GPU passes");
  const perfNote = h("p", { class: "fs-note" }, "");
  pane.append(h("h2", {}, "Numbers"), stats.el, h("h2", {}, "Performance"), perf.el, passes.el, perfNote);

  // limits
  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "ul",
      { class: "fs-limits" },
      h("li", {}, h("strong", {}, "Faithful: "), "the gated field and its RK4 step and reprojection, the same code the release gate runs."),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "particles live in a ball around the sphere and restart at a random point of it when they age out or leave; moving the sphere moves the field with it at once (no wake, no inertia). ",
        "When the field evolves, its noise drifts with time: still exactly divergence-free at every instant, but particles then leave their starting surfaces, so the reprojection is off.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Measured: "),
        "the divergence, confinement and tangency figures are single-precision values at fixed probe points on your GPU, labelled illustrative; CI gates them in double precision.",
      ),
    ),
  );

  return {
    setScene(scene, strands) {
      seeing.textContent =
        scene.id === "studio"
          ? `${strands.toLocaleString()} particles stream through a field of smooth noise around a sphere, each trailing a ribbon of its recent path. ` +
            `Near the sphere the ribbons part and close around it; further out they curl through the noise. Nothing ever bunches up or thins out. Drag the sphere and the whole flow re-routes.`
          : "";
    },
    setField(p) {
      onScreen.textContent = isCanonical(p)
        ? "On screen: the gated field, exactly as the release gate runs it."
        : p.evolution > 0
          ? "On screen: an evolving field — the noise drifts with time."
          : "On screen: your edit of the gated field.";
    },
    pushDivergence(rel) {
      div.push(rel);
    },
    setResidual(r) {
      residual.textContent =
        r === null
          ? "The field is evolving: the sheets move, and each particle is nudged back onto its sheet as it goes (the check needs a field that holds still)."
          : `Off its surfaces, worst of ${r.count}: ${r.worst.toExponential(1)} (median ${r.median.toExponential(1)}) — the surfaces' values range over about ±0.6.`;
    },
    setDensity(counts) {
      densityBlock.hidden = counts === null;
      if (counts === null) return;
      const x = counts.map((_, i) => i + 1);
      const mean = counts.reduce((a, b) => a + b, 0) / Math.max(counts.length, 1);
      density.set([
        { x, y: counts, style: "dots", label: "counted" },
        { x: [1, counts.length], y: [mean, mean], color: "rgba(160,170,190,0.6)", label: "even" },
      ]);
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
