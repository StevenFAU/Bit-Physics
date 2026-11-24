// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths, the flock's observables and the last alarm wave measured live on the
// GPU — labelled model behaviour, never gated — compared qualitatively with
// field studies of real starlings, the performance readout and the limits.

import type { PassTiming } from "@bp/gpu";
import { h, plotPanel, readout, sparkline } from "@bp/studio";
import type { FlockStats, ModelParams } from "./model/flock.js";
import type { Wave } from "./model/wave.js";
import { REPO_BLOB } from "./proof/gate.js";
import type { SceneDef } from "./scenes.js";

const BALLERINI_PNAS = "https://pmc.ncbi.nlm.nih.gov/articles/PMC2234121/";
const BALLERINI_AB = "https://arxiv.org/abs/0802.1667";
const CAVAGNA_2010 = "https://pmc.ncbi.nlm.nih.gov/articles/PMC2900681/";
const HILDENBRANDT = "https://arxiv.org/abs/0908.2677";
const HEMELRIJK_2015 = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4436282/";
const ATTANASI_2014 = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4173114/";

/** Model units to metres: the birds cruise at 5.5 units/s; starlings fly at 10–18 m/s. */
export const METRES_PER_UNIT = 2;

export interface LearnPane {
  setScene(scene: SceneDef, birds: number): void;
  setModel(m: ModelParams): void;
  setLook(scale: number): void;
  pushStats(s: FlockStats): void;
  setWave(w: Wave): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const link = (href: string, label: string): HTMLAnchorElement => h("a", { href, target: "_blank", rel: "noopener" }, label);
  const src = (label: string, path: string): HTMLAnchorElement => link(`${REPO_BLOB}${path}`, label);
  const m = (u: number): string => `${(u * METRES_PER_UNIT).toFixed(1)} m`;

  const seeing = h("p", { class: "mm-lede" }, "");
  const modelNote = h("p", { class: "mm-note", role: "status" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing, modelNote);

  // the flock, measured (model behaviour)
  const pol = sparkline("Polarization (1 = all flying the same way)", "", 120, 3);
  const thick = sparkline("Thickness, smallest axis (rms)", "m", 120, 1);
  const stats = readout("The flock now");
  pane.append(
    h("h2", {}, "The flock, measured"),
    h(
      "p",
      {},
      "A few times a second the GPU sums up the whole flock and the page reads back 128 bytes. These numbers are model behaviour: what this simplified model does, not a measurement of real birds.",
    ),
    pol.el,
    thick.el,
    stats.el,
    h(
      "p",
      { class: "mm-note" },
      "For comparison, from field studies of real starling flocks, reconstructed in 3D from synchronised photographs: their flight is strongly ordered — polarization 0.96 ± 0.03 over 24 flocks (",
      link(CAVAGNA_2010, "Cavagna et al. 2010"),
      "); flocks are relatively thin, of many sizes but constant proportions, and birds keep a minimum distance from each other of about a wingspan (",
      link(BALLERINI_AB, "Ballerini et al. 2008"),
      ").",
    ),
  );

  // the alarm wave
  const waveLine = h("p", { class: "mm-wave", role: "status" }, "No attack yet. Fly the falcon (F), press Startle on the flock, or open The Attack.");
  const wavePlot = plotPanel({
    title: "How far, how soon",
    xLabel: "seconds after the nearest sighting before it",
    yLabel: "distance, m",
    height: 120,
    formatX: (v) => v.toFixed(2),
    formatY: (v) => v.toFixed(0),
  });
  pane.append(
    h("h2", {}, "The alarm wave, measured"),
    h(
      "p",
      {},
      "A bird that sees the falcon takes fright after a short reaction; a bird whose followed neighbour has taken fright does the same a little later. Nothing is broadcast: the alarm can only travel bird to bird through the seven each one follows, and a bird that has fled cannot be alarmed again for a second and a half, so the wave runs out instead of echoing (",
      link(ATTANASI_2014, "Attanasi et al. 2014"),
      " measured turns spreading through real flocks at 20–40 m/s).",
    ),
    h(
      "p",
      {},
      "Every bird keeps the moment it last took fright, and whether it saw the falcon itself. After a wave, the page reads the flock once; for each bird alarmed by a neighbour, it finds the sighting the alarm most likely came from — the one needing the slowest travel — and divides the distance by the delay. The wave's speed is the median.",
    ),
    waveLine,
    wavePlot.el,
  );

  // how it works, three depths
  pane.append(
    h("h2", {}, "How it works"),
    h("p", {}, "Every bird follows a few neighbours; nothing leads the flock, and nobody sees the whole of it."),
    h(
      "p",
      {},
      "Each bird turns towards the average heading and the centre of its seven nearest visible neighbours — not of everyone within some distance. " +
        "That count, about six or seven, is what was found by reconstructing real flocks in 3D (",
      link(BALLERINI_PNAS, "Ballerini et al. 2008"),
      "). Separately, each bird avoids only its single nearest neighbour (",
      link(HEMELRIJK_2015, "Hemelrijk & Hildenbrandt 2015"),
      "), cannot see straight behind itself, turns no faster than a set rate and banks into its turns, losing a little height. " +
        "Birds at the flock's edge, whose neighbours all lie to one side, pull in harder, which keeps the border sharp; and the roost turns birds back only once they fly past its edge, as in ",
      link(HILDENBRANDT, "Hildenbrandt, Carere & Hemelrijk 2010"),
      " — so the flock flies across it as one body and folds as it turns.",
    ),
    h(
      "details",
      { class: "mm-detail" },
      h("summary", {}, "How the flock is drawn"),
      h(
        "p",
        {},
        "Far away, a bird is smaller than a pixel. So the flock is drawn as a medium: each bird adds the area it hides — its wings seen from below, edge-on when it banks away — to an optical depth τ at each pixel, and the sky shows through as e^(−τ). " +
          "Where many birds overlap the sky goes nearly black; where they thin out you see lace. A bird's coverage is spread over at least a few pixels and normalised over exactly the pixels it touches, so the flock's total darkness cannot flicker as birds cross pixel boundaries.",
      ),
      h(
        "p",
        {},
        "Close up — once a bird spans more than about a dozen pixels — it is drawn as a small dark bird instead, flapping and banking, with a faint rim of sky light; in between, the two cross-fade, so no bird pops. The falcon is always drawn that way. The sky, trees and reeds are all generated in the page; there is no image or artwork.",
      ),
      h(
        "p",
        {},
        "Finding seven nearest neighbours among this many birds every step uses a grid: birds are sorted into cells smaller than a bird's reach and searched in widening shells, stopping as soon as the seventh is nearer than anything unsearched. No cell has a capacity, and Prove checks the result against looking at every bird.",
      ),
      h(
        "p",
        {},
        src("The flock kernel", "packages/boids-3d/web/src/v2/model/murmur.wgsl"),
        " · ",
        src("the falcon", "packages/boids-3d/web/src/v2/model/falcon.ts"),
        " · ",
        src("the optical depth", "packages/boids-3d/web/src/v2/render/tau.wgsl"),
        " · ",
        src("near birds", "packages/boids-3d/web/src/v2/render/near-birds.wgsl"),
      ),
    ),
  );

  const perf = readout("Performance");
  const passes = readout("GPU passes");
  const perfNote = h("p", { class: "mm-note" }, "");
  pane.append(h("h2", {}, "Performance"), perf.el, passes.el, perfNote);

  const lookNote = h("span", {}, "");
  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "ul",
      { class: "mm-limits" },
      h(
        "li",
        {},
        h("strong", {}, "Faithful: "),
        "the topological rule (seven followed neighbours, one to avoid), the rear blind cone, the bounded and banked turning, the alarm spreading only by contact with a reaction time and a refractory time; the neighbour search is exact.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "there is no aerodynamics — no lift, drag or wake — only a turning rate, a bank and a small height loss in turns. An alarmed bird knows which way to flee from the falcon even if it has not seen it; real birds copy their neighbours' turns. The falcon is a point that flies, not a hunter with a strategy. ",
        lookNote,
      ),
      h(
        "li",
        {},
        h("strong", {}, "Measured: "),
        "the numbers above are read from the live flock on your GPU. The release gate checks the frozen Reynolds reference case, not this model; the starling model's neighbour search is checked in Prove.",
      ),
    ),
  );

  return {
    setScene(scene, birds) {
      seeing.textContent =
        scene.id === "attack"
          ? `${birds.toLocaleString("en-US")} starlings, and a falcon stooping at them from above. Watch the dark band of fleeing birds run out from where it strikes, the flock split around the falcon, and close again behind it. Restart replays the same attack exactly.`
          : `${birds.toLocaleString("en-US")} starlings over a reed bed at dusk, seen from the ground, drawn as one dark medium: nearly black where many birds overlap or the flock is seen edge-on, lace at the edges. ` +
            "Each follows only its seven nearest visible neighbours, yet the flock flies as one body, turning and folding over the roost. Press F to fly the falcon.";
    },
    setModel(p) {
      modelNote.textContent = `Model: alignment ${p.align.toFixed(2)}, reaction to an alarmed neighbour ${Math.round((p.contagionDelay * 1000) / 120)} ms, followed neighbours within ${m(p.reach)}.`;
    },
    setLook(scale) {
      lookNote.textContent = `Each bird is drawn ${scale.toFixed(1)}× a starling's size (Tune: Drawn size).`;
    },
    pushStats(s) {
      pol.push(s.polarization);
      thick.push(s.thickness * METRES_PER_UNIT);
      const [a1, a2, a3] = s.axes.map((x) => Math.sqrt(Math.max(x, 0)));
      stats.set([
        ["Milling (turning about the centre)", s.milling.toFixed(3)],
        ["Nearest neighbour, mean", Number.isFinite(s.nnd) ? m(s.nnd) : "—"],
        ["Neighbours followed, mean", s.meanNeighbors.toFixed(2)],
        ["Shape, rms axes", `${m(a1!)} × ${m(a2!)} × ${m(a3!)}`],
        ["Proportions", `1 : ${(a2! / Math.max(a3!, 1e-6)).toFixed(1)} : ${(a1! / Math.max(a3!, 1e-6)).toFixed(1)}`],
        ["Speed, mean", `${(s.meanSpeed * METRES_PER_UNIT).toFixed(1)} m/s`],
        ["Alarm, mean level", s.alertFraction.toFixed(3)],
      ]);
    },
    setWave(w) {
      waveLine.textContent = Number.isFinite(w.speed)
        ? `Last wave: ${w.alarmed.toLocaleString("en-US")} birds in ${w.duration.toFixed(2)} s (${w.direct.toLocaleString("en-US")} saw the falcon itself); bird to bird, the alarm travelled at ${(w.speed * METRES_PER_UNIT).toFixed(0)} m/s (median).`
        : `Last wave: ${w.alarmed.toLocaleString("en-US")} birds in ${w.duration.toFixed(2)} s (too few points to fit a speed).`;
      const tmax = Math.max(...w.samples.map((p) => p[0]), 0.2);
      wavePlot.set([
        { x: w.samples.map((p) => p[0]), y: w.samples.map((p) => p[1] * METRES_PER_UNIT), style: "dots", label: "birds" },
        { x: [0, tmax], y: [0, tmax * w.speed * METRES_PER_UNIT], color: "rgba(232,163,106,0.9)", label: "median speed" },
      ]);
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
