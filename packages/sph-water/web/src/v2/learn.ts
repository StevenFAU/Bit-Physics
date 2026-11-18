// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph; the equations), the water's own numbers
// measured live, the performance readout and the model's limits — with the
// two-tier honesty line front and centre: the gate binds the verified core;
// the water you watch runs beyond it.

import type { PassTiming } from "@bp/gpu";
import { h, readout, sparkline } from "@bp/studio";
import type { WaterDiagnostics } from "./model/water.js";
import { REPO_BLOB } from "./proof/gate.js";
import type { SceneDef } from "./scenes.js";

const BK15 = "https://doi.org/10.1145/2786784.2786796";
const TRUONG18 = "https://doi.org/10.1145/3203201";

export interface LearnPane {
  setScene(scene: SceneDef, particles: number, slowMotion: number): void;
  setLive(d: WaterDiagnostics): void;
  setStats(rows: [string, string][]): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const MATH = `<math display="block" class="wh-math" aria-label="alpha i equals rho i over the squared norm of the sum of m j grad W i j plus the sum of the squared norms; kappa i equals rho star i minus rho zero, times alpha i over delta t squared; v i decreases by delta t times the sum over j of m j times kappa i over rho i plus kappa j over rho j times grad W i j">
  <mtable columnalign="left">
    <mtr><mtd><msub><mi>α</mi><mi>i</mi></msub><mo>=</mo><mfrac><msub><mi>ρ</mi><mi>i</mi></msub><mrow><msup><mrow><mo>|</mo><msub><mo>∑</mo><mi>j</mi></msub><msub><mi>m</mi><mi>j</mi></msub><mo>∇</mo><msub><mi>W</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>|</mo></mrow><mn>2</mn></msup><mo>+</mo><msub><mo>∑</mo><mi>j</mi></msub><msup><mrow><mo>|</mo><msub><mi>m</mi><mi>j</mi></msub><mo>∇</mo><msub><mi>W</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub><mo>|</mo></mrow><mn>2</mn></msup></mrow></mfrac></mtd></mtr>
    <mtr><mtd><msub><mi>κ</mi><mi>i</mi></msub><mo>=</mo><mfrac><mrow><mo>(</mo><msubsup><mi>ρ</mi><mi>i</mi><mo>*</mo></msubsup><mo>−</mo><msub><mi>ρ</mi><mn>0</mn></msub><mo>)</mo><msub><mi>α</mi><mi>i</mi></msub></mrow><mrow><mi>Δ</mi><msup><mi>t</mi><mn>2</mn></msup></mrow></mfrac></mtd></mtr>
    <mtr><mtd><msub><mi mathvariant="bold">v</mi><mi>i</mi></msub><mo>←</mo><msub><mi mathvariant="bold">v</mi><mi>i</mi></msub><mo>−</mo><mi>Δ</mi><mi>t</mi><msub><mo>∑</mo><mi>j</mi></msub><msub><mi>m</mi><mi>j</mi></msub><mrow><mo>(</mo><mfrac><msub><mi>κ</mi><mi>i</mi></msub><msub><mi>ρ</mi><mi>i</mi></msub></mfrac><mo>+</mo><mfrac><msub><mi>κ</mi><mi>j</mi></msub><msub><mi>ρ</mi><mi>j</mi></msub></mfrac><mo>)</mo></mrow><mo>∇</mo><msub><mi>W</mi><mrow><mi>i</mi><mi>j</mi></mrow></msub></mtd></mtr>
  </mtable>
</math>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const link = (href: string, label: string): HTMLAnchorElement => h("a", { href, target: "_blank", rel: "noopener" }, label);
  const src = (label: string, path: string): HTMLAnchorElement => link(`${REPO_BLOB}${path}`, label);

  const seeing = h("p", { class: "wh-lede" }, "");
  const onScreen = h("p", { class: "wh-note", role: "status" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing, onScreen);

  // the water's numbers, live
  const comp = sparkline("Mean compression, (ρ − ρ₀)/ρ₀", "%", 90, 3);
  const speed = sparkline("Fastest particle", "m/s", 90, 2);
  pane.append(
    h("h2", {}, "The water, measured"),
    h(
      "p",
      {},
      "About once a second the page reads every particle back and measures how far the solver lets the water compress — away from the surface and the glass, where a particle has a full set of neighbours — and how fast the fastest particle moves.",
    ),
    comp.el,
    speed.el,
  );

  // how it works, three depths
  pane.append(
    h("h2", {}, "How it works"),
    h("p", {}, "The water is a few hundred thousand particles, each carrying a little of its mass, pushed apart just enough that the water never compresses."),
    h(
      "p",
      {},
      "Each particle's density is a weighted sum over the neighbours within two smoothing lengths (smoothed particle hydrodynamics, SPH). Every step, divergence-free SPH (",
      link(BK15, "Bender & Koschier 2015"),
      ") solves twice for a stiffness per particle: once so the predicted density returns to that of water, once so the velocity field stops compressing. " +
        "Gravity pulls; the two solves push back exactly as much as they must; a little viscosity (XSPH) smooths the motion. The glass is a wall the particles cannot cross.",
    ),
    h("div", { html: MATH }),
    h(
      "details",
      { class: "wh-detail" },
      h("summary", {}, "How the surface is drawn"),
      h(
        "p",
        {},
        "There is no mesh. Every particle is drawn as a small sphere into a depth image; a narrow-range filter (",
        link(TRUONG18, "Truong & Yuksel 2018"),
        ") smooths the spheres into one surface without merging separate drops; its normals bend the room behind (refraction), and how much water each pixel looks through decides how much light is absorbed (Beer–Lambert). " +
          "The surface reflects the room by Fresnel's law and catches the window as a sharp highlight. The bright patch on the table is painted where light focused by a water column would land — rendering only, not computed from this water's surface.",
      ),
      h("p", {}, src("The solver", "packages/sph-water/src/dfsph_solver.wgsl"), " · ", src("its neighbour lists", "packages/sph-water/web/src/v2/model/lists.wgsl"), " · ", src("the surface", "web/render/src/liquid-surface.ts")),
    ),
  );

  // the honest line
  pane.append(
    h("h2", {}, "What the proof covers"),
    h(
      "p",
      {},
      "The release gate checks the verified core — the SPH kernel, density and neighbour search, ported from the committed Python reference — against a committed 100,000-particle capture, on your GPU (Prove). " +
        "The water you are watching uses those same pieces, but its pressure solve, the glass and the viscosity go beyond that reference: their evidence is the live measurements here and in Prove, not the gate.",
    ),
  );

  const stats = readout("The simulation");
  const perf = readout("Performance");
  const passes = readout("GPU passes");
  const perfNote = h("p", { class: "wh-note" }, "");
  pane.append(h("h2", {}, "Numbers"), stats.el, h("h2", {}, "Performance"), perf.el, passes.el, perfNote);

  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "ul",
      { class: "wh-limits" },
      h("li", {}, h("strong", {}, "Faithful: "), "the SPH kernel, density and counting-sort neighbour search — the gated, capture-verified code — and the shipped DFSPH passes, byte for byte."),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "the glass is a wall the particles are projected back from, not a layer of boundary particles, so water touching it is a little under-dense; the solver runs a fixed number of iterations instead of iterating to a tolerance; no surface tension yet, so the smallest droplets do not round up.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Slow motion: "),
        "the glass is about 60 cm across in the simulation and runs slower than real time — at a few hundred thousand particles, each step covers well under a millisecond of model time.",
      ),
      h("li", {}, h("strong", {}, "Rendering only: "), "the caustic on the table and the room."),
    ),
  );

  return {
    setScene(scene, particles, slowMotion) {
      seeing.textContent =
        scene.id === "still"
          ? "Still water in a glass. Nothing moves, yet the pressure inside grows with depth — the solver is pushing back against gravity everywhere at once."
          : "A glass of water on a kitchen table. Blobs of water drop in; the splash, the waves and the settling are computed live on your GPU.";
      onScreen.textContent = `${particles.toLocaleString()} particles · about ${slowMotion.toFixed(0)}× slower than real time`;
      comp.clear();
      speed.clear();
    },
    setLive(d) {
      comp.push(d.meanCompression * 100);
      speed.push(d.maxSpeed);
    },
    setStats(rows) {
      stats.set(rows);
    },
    setPerf(rows, ps, source) {
      perf.set(rows);
      passes.set(ps.map((p) => [p.name, `${p.avg.toFixed(2)} ms`]));
      perfNote.textContent = source === "timestamp" ? "GPU times from timestamp queries." : "This GPU has no timestamp queries: the frame figure is submit-to-done latency.";
    },
  };
}
