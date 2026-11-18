// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths, the flock's observables measured live on the GPU — labelled model
// behaviour, never gated — compared qualitatively with field studies of real
// starlings, the performance readout and the model's limits.

import type { PassTiming } from "@bp/gpu";
import { h, readout, sparkline } from "@bp/studio";
import type { FlockStats, MurmurationPreset } from "./model/flock.js";
import { REPO_BLOB } from "./proof/gate.js";
import type { SceneDef } from "./scenes.js";
import { FLOCK_NAMES } from "./scenes.js";

const BALLERINI_PNAS = "https://pmc.ncbi.nlm.nih.gov/articles/PMC2234121/";
const BALLERINI_AB = "https://arxiv.org/abs/0802.1667";
const CAVAGNA_2010 = "https://pmc.ncbi.nlm.nih.gov/articles/PMC2900681/";
const HILDENBRANDT = "https://arxiv.org/abs/0908.2677";
const HEMELRIJK_2015 = "https://pmc.ncbi.nlm.nih.gov/articles/PMC4436282/";

/** Model units to metres: v1's birds cruise at 4–9 units/s; starlings fly at 10–18 m/s. */
export const METRES_PER_UNIT = 2;

export interface LearnPane {
  setScene(scene: SceneDef, birds: number): void;
  setFlock(preset: MurmurationPreset): void;
  setLook(scale: number): void;
  pushStats(s: FlockStats, preset: MurmurationPreset): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const link = (href: string, label: string): HTMLAnchorElement => h("a", { href, target: "_blank", rel: "noopener" }, label);
  const src = (label: string, path: string): HTMLAnchorElement => link(`${REPO_BLOB}${path}`, label);
  const m = (u: number): string => `${(u * METRES_PER_UNIT).toFixed(1)} m`;

  const seeing = h("p", { class: "mm-lede" }, "");
  const flockNote = h("p", { class: "mm-note", role: "status" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing, flockNote);

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
      "). The model is not tuned to reproduce these numbers, and its milling flock is far less ordered than a real one.",
    ),
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
      "): a bird's neighbours stay its neighbours whether the flock is dense or spread out, which is why a flock can stretch and fold without tearing. " +
        "Separately, each bird avoids only its single nearest neighbour (",
      link(HEMELRIJK_2015, "Hemelrijk & Hildenbrandt 2015"),
      "), cannot see straight behind itself, turns no faster than a set rate and banks into its turns, losing a little height. A soft pull keeps the flock over the roost at a preferred height (",
      link(HILDENBRANDT, "Hildenbrandt, Carere & Hemelrijk 2010"),
      ").",
    ),
    h(
      "details",
      { class: "mm-detail" },
      h("summary", {}, "How the flock is drawn"),
      h(
        "p",
        {},
        "Far away, a bird is smaller than a pixel. So the flock is drawn as a medium: each bird adds the area it hides — its wings seen from below, edge-on when it banks away — to an optical depth τ at each pixel, and the sky shows through as e^(−τ). " +
          "Where many birds overlap the sky goes nearly black; where they thin out you see lace. A bird's coverage is spread over at least a few pixels and normalised over exactly the pixels it touches, so the flock's total darkness cannot flicker as birds cross pixel boundaries. The sky, trees and reeds are all generated in the page; there is no image or artwork.",
      ),
      h(
        "p",
        {},
        "Finding seven nearest neighbours among a hundred thousand birds every step uses a grid: birds are sorted into cells as wide as a bird's reach, so each bird only looks in the 27 cells around it. No cell has a capacity, and Prove checks the result against looking at every bird.",
      ),
      h(
        "p",
        {},
        src("The flock kernel", "packages/boids-3d/web/src/starling.wgsl"),
        " · ",
        src("the grid", "packages/boids-3d/web/src/grid.wgsl"),
        " · ",
        src("the optical depth", "packages/boids-3d/web/src/v2/render/tau.wgsl"),
        " · ",
        src("the dusk", "packages/boids-3d/web/src/v2/render/dusk.wgsl"),
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
        "the topological rule (seven social neighbours, one to avoid), the rear blind cone, the bounded and banked turning and the roost, as the July model specifies them; the neighbour search is exact.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "there is no aerodynamics — no lift, drag or wake — only a turning rate, a bank and a small height loss in turns. Wingbeats and differences between birds are left out. ",
        "The flock is sparser than a real murmuration (birds a few metres apart rather than about one), ",
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

  let lastPreset = "";
  return {
    setScene(_scene, birds) {
      seeing.textContent =
        `${birds.toLocaleString("en-US")} starlings over a reed bed at dusk, seen from the ground, drawn as one dark medium: nearly black where many birds overlap, lace at the edges. ` +
        "Each follows only its seven nearest visible neighbours. In this model the flock mills over the roost — birds stream around its centre in many directions at once — rather than flying as one ordered body: the polarization below stays near zero.";
    },
    setFlock(preset) {
      lastPreset = preset.label;
      const f = FLOCK_NAMES[preset.label];
      flockNote.textContent = `Flock: ${f?.name ?? preset.label} — ${f?.hint ?? preset.title}`;
    },
    setLook(scale) {
      lookNote.textContent = `so each bird is drawn ${scale.toFixed(1)}× a starling's size to give the flock a real one's darkness (Tune: Drawn size).`;
    },
    pushStats(s, preset) {
      if (preset.label !== lastPreset) return;
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
