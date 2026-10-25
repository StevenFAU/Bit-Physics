// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph with a diagram; the rule step by step with
// the committed kernel lines that implement it), live instruments, the
// performance readout, and the model's limits.

import type { PassTiming } from "@bp/gpu";
import { h, readout, sparkline } from "@bp/studio";
import V from "../generated/verification.json";
import type { JonesParams } from "./proof/gate.js";
import type { SceneDef } from "./scenes.js";

const blob = (path: string, anchor?: string): string => `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;
const JONES = "https://doi.org/10.1162/artl.2010.16.2.16202";
const TERO = "https://doi.org/10.1126/science.1177894";

export interface LearnPane {
  setScene(scene: SceneDef, gated: boolean): void;
  setParams(p: JonesParams, personality: string | null): void;
  setStats(rows: [string, string][], mass: { mass: number; predicted: number; equilibrium: number } | null): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const DIAGRAM = `<svg viewBox="0 0 320 150" role="img" aria-label="Diagram: an agent heading right reads the trail at three points ahead of it — left, centre and right, at the sensor angle and the sensor reach — turns towards the strongest, steps forward and drops trail." class="ph-diagram">
  <defs><marker id="ph-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.55" stroke-dasharray="3 3">
    <path d="M70 75L190 75"/><path d="M70 75L155 15"/><path d="M70 75L155 135"/>
  </g>
  <g fill="none" stroke="currentColor" stroke-width="1.6"><path d="M70 75L104 75" marker-end="url(#ph-arrow)"/></g>
  <circle cx="70" cy="75" r="7" fill="currentColor"/>
  <g fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="190" cy="75" r="9"/><circle cx="155" cy="15" r="9"/><circle cx="155" cy="135" r="9"/></g>
  <path d="M120 75A50 50 0 0 0 111 46" fill="none" stroke="currentColor" stroke-width="1.1"/>
  <g font-family="IBM Plex Sans, system-ui, sans-serif" font-size="12" fill="currentColor">
    <text x="204" y="79">centre</text><text x="169" y="19">left</text><text x="169" y="139">right</text>
    <text x="121" y="55">Δφ</text><text x="112" y="92">reach Lₛ</text><text x="40" y="100">agent</text>
  </g>
</svg>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const seeing = h("p", { class: "ph-lede" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing);

  // ---- how it works -------------------------------------------------------
  const A = V.code_anchors;
  const kernelLink = (label: string, r: { start: number; end: number }): HTMLAnchorElement =>
    h("a", { href: blob(V.links.kernel, `L${r.start}-L${r.end}`), target: "_blank", rel: "noopener" }, `${label} (L${r.start}–${r.end})`);
  const paramCells: Record<string, HTMLElement> = {};
  const pv = (k: string): HTMLElement => (paramCells[k] = h("span", { class: "bp-mono" }, "—"));
  pane.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Millions of blind agents each follow one rule — turn towards the strongest smell ahead, step, leave a little smell — " +
        "and the smell spreads and fades. Paths that many agents use grow strong and draw in more agents; the rest fade away.",
    ),
    h("div", { html: DIAGRAM }),
    h(
      "p",
      {},
      "This is Jeff Jones's 2010 model of the slime mould ",
      h("i", {}, "Physarum polycephalum"),
      ", which grows tube networks between food sources that are close to the efficient networks engineers design (",
      h("a", { href: TERO, target: "_blank", rel: "noopener" }, "Tero et al. 2010"),
      "). Nothing in the rule mentions a network: it emerges from the feedback between moving and marking.",
    ),
    h(
      "details",
      { class: "ph-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Sense: read the trail at three points at reach ", pv("ls"), " ahead — straight on, and turned by ", pv("dphi"), " either way. ", kernelLink("kernel", A.sense)),
        h("li", {}, "Turn: keep going if straight ahead is strongest; otherwise turn by the same angle towards the stronger side (ties go straight, then left). ", kernelLink("kernel", A.rotate)),
        h("li", {}, "Move ", pv("lm"), " cells. ", kernelLink("kernel", A.move)),
        h("li", {}, "Deposit ", pv("dep"), " units of trail in the cell it lands in — as a whole number of 1/65,536ths, added atomically, so the order agents land in cannot change the sum. ", kernelLink("kernel", A.deposit)),
        h("li", {}, "Spread and fade: every cell becomes the mean of its 3 × 3 neighbourhood, times (1 − ", pv("a"), "). ", kernelLink("kernel", A.diffuse)),
      ),
      h(
        "p",
        {},
        "Spreading moves trail around without changing the total, and fading removes the fraction α each step. With N agents adding d each step, " +
          "the total settles where they balance: M = d·N·(1 − α)/α. The release gate checks exactly this number.",
      ),
      h("p", {}, h("a", { href: JONES, target: "_blank", rel: "noopener" }, "Jones 2010, Artificial Life 16(2)"), " · ", h("a", { href: blob(V.links.algebraic), target: "_blank", rel: "noopener" }, "derivation")),
    ),
    h(
      "details",
      { class: "ph-rule" },
      h("summary", {}, "Personalities, food, light and growth"),
      h(
        "p",
        {},
        "The personality pad (in Tune) moves two things at once. Across, ",
        h("strong", {}, "explorer to forager"),
        ": the turn angle widens from 22.5° to 67.5° while the step shortens from 2 cells to 0.5 — explorers run long and straight, foragers turn tightly and stay. Up, ",
        h("strong", {}, "fine to bold"),
        ": the sensor reach grows from 12 to 24 cells while the fade slows from 0.15 to 0.05, so networks get broader and softer. ",
        "The deposit is not on the pad: without food it only scales the trail, and an agent comparing three smells cannot tell. Each personality was run from three seeds on every tier; only those that came out the same are offered.",
      ),
      h(
        "p",
        {},
        "Living scenes turn by Jones's own stochastic rule — when both side sensors beat the centre, a random side, and a 5% chance per step of a random turn. " +
          "The gate keeps the deterministic version (always left). The dice are a hash of each agent's own position and heading, so a run still repeats exactly.",
      ),
      h(
        "p",
        {},
        "Food crumbs deposit into the trail like 40 agents per cell, in the same whole 1/65,536ths, so the mass balance still holds exactly. They also give off a scent agents can sense far away " +
          "— the trail itself only reaches about two cells before it fades — which is how a colony finds food it cannot touch yet. A light is a strong smell the agents turn away from; it never touches the trail.",
      ),
      h(
        "p",
        {},
        "In First Light the colony grows: most agents start dormant, and an agent wakes when the colony's trail under it reaches a tenth of one agent's deposit. " +
          "A dormant agent neither moves nor deposits, and the GPU counts the awake ones every step, so the mass balance follows the colony as it grows.",
      ),
      h(
        "p",
        {},
        "Walls (Connect the Cities' sea, the maze) are cells an agent cannot step into; it turns back. In the maze, an agent that has gone five times the shortest route's length " +
          "without being on or beside food is taken back to a food source — a stand-in for the organism withdrawing from where it found nothing. Without it, Jones's agents keep " +
          "every corridor's tube alive: loops sustain themselves (measured). Every agent still deposits once a step, so the mass balance is unchanged.",
      ),
      h(
        "p",
        {},
        "In Territories each colony lays its own trail, kept in its own plane of the dish; the planes spread and fade side by side. An agent smells its own colony's trail minus the rivalry " +
          "times the others' — the multi-species extension of Jones's model common in physarum art. A sleeping agent wakes into the colony whose trail under it is strongest. " +
          "The GPU counts each colony's agents every step, so the mass balance holds colony by colony. A colony may carry its own personality (turn, reach, step and fade); the deposit is shared.",
      ),
      h(
        "p",
        {},
        "Scoring reads the trail back, keeps the cells above half the dish's mean, thins them to lines (Zhang & Suen 1984), and turns the lines into a graph of cities and junctions. " +
          "Length is measured along each line; the score is only as good as that extraction, so the graph is drawn over the dish (white) for you to check.",
      ),
    ),
  );

  // ---- instruments --------------------------------------------------------
  const massSpark = sparkline("Total trail", "", 90, 6);
  const massNote = h("p", { class: "ph-note" }, "");
  const stats = readout("The dish");
  pane.append(h("h2", {}, "Instruments"), massSpark.el, massNote, stats.el);

  // ---- performance --------------------------------------------------------
  const perf = readout("Performance");
  const passes = readout("GPU time per pass");
  const perfNote = h("p", { class: "ph-note" }, "");
  pane.append(h("h2", {}, "Performance"), perf.el, h("h3", {}, "GPU time per pass"), passes.el, perfNote);

  // ---- limits -------------------------------------------------------------
  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "ul",
      { class: "ph-limits" },
      h("li", {}, h("strong", {}, "Faithful: "), "the gated Jones kernel's arithmetic, step for step; the Jones 2010 Table 1 parameters; every frame is real solver steps."),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "turning ties are broken the same way every time (straight, then left) rather than at random; agents move continuously and may share a cell — there is no crowding rule.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Changed for long runs: "),
        "on the live dish, positions wrap back into the dish after each move and headings are renormalised after each turn, so hours-long runs keep their precision on every GPU. The gated dish keeps the gated kernel exactly.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Added for the scenes: "),
        "food's long-range scent (a fixed gradient standing in for the chemicals real food gives off), dormant agents that wake as a colony grows, light as a smell to avoid rather than a change to the trail, solid walls, and (in the maze) hungry agents returning to food. Real Physarum also shuns light, grows toward food and withdraws from where it finds none; here these are rules of thumb, not measured biology.",
      ),
      h("li", {}, h("strong", {}, "Measured: "), "the total trail, read back from the GPU and compared with the closed form, through food, growth and every edit, in Prove."),
    ),
  );

  return {
    setScene(scene, gated) {
      const what: Record<string, string> = {
        cities:
          "A stylised Kantō plain: thirty cities as food, the sea as walls, and a colony that starts at Tokyo — the experiment Tero et al. ran on a real slime mould in 2010. " +
          "The colony covers the land, then thins to tubes between the cities. The score card reads the network off the dish and measures it against the minimum spanning tree " +
          "on the same cities (the shortest network that joins them all) and against what the real mould scored.",
        maze:
          "A maze with food at the entrance and the exit, after Nakagaki, Yamada & Tóth (2000). The mould fills the corridors; agents that go too long without finding food go back " +
          "to food, so the tube that links the two food sources holds while the dead ends slowly thin (in this model they never quite empty, unlike the real plasmodium). The green line is the shortest path through the walls. Build a wall across the route (Wall) and watch it find another.",
        network:
          "Agents scattered at random over a periodic dish (it wraps at the edges). Within a few hundred steps the noise organises into a network of tubes, which then slowly prunes itself. Brightness is the trail's strength; the fine sparks are individual agents.",
        table1:
          "The same dish at Jones's Table 1 values — the gated ones. At this density the network forms and then breaks into straight rods: with no crowding rule and no random turns, agents in a strand fall into step and march straight.",
        "first-light":
          "A colony released at the centre of a dark dish with a dozen crumbs of food. The rest of the agents are dormant; the colony's trail wakes them, so it grows outward in branching fronts. " +
          "The crumbs' scent pulls the explorers; once the dish is covered, the network thins to the tubes that link the food. Drop a crumb (Food) and watch it reroute.",
        lace: "The Lace personality left alone on the whole dish: the finest foam the pad offers, hundreds of small closed cells that slowly merge as the network coarsens. Every so often it starts again from the next seed.",
        light:
          "A network under a movable light. The agents sense the light as a strong smell to avoid, so the lit pool empties, its trail fades within a second or two, and the network rebuilds round it. Drag it (Light) to herd the mould.",
        gated: "The release gate's own run, tiled across the screen: 500 agents on a 256 × 256 dish from the committed seed-42 start.",
        territories:
          "Three colonies released on a dormant dish. Each lays its own trail (its own colour) and smells its own trail minus the others' (the rivalry), so the colonies shun each other. " +
          "A sleeping agent joins whichever colony's trail reaches it first, so the colonies race outward, meet, and hold borders that keep shifting. " +
          "The card measures who holds the dish. Give each colony its own personality there to stage a contest — say, Lace against Cells.",
      };
      seeing.textContent = `${what[scene.id] ?? scene.prompt}${gated ? " This is the gated run." : ""}`;
    },
    setParams(p, personality) {
      void personality;
      const n = (v: number): number => Number(v.toPrecision(4));
      paramCells["ls"]!.textContent = `${n(p.L_sense)} cells`;
      paramCells["dphi"]!.textContent = `${n(p.delta_phi_deg)}°`;
      paramCells["lm"]!.textContent = `${n(p.L_move)}`;
      paramCells["dep"]!.textContent = `${n(p.deposit)}`;
      paramCells["a"]!.textContent = `${n(p.decay_alpha)}`;
    },
    setStats(rows, m) {
      stats.set(rows);
      if (m !== null) {
        massSpark.push(m.mass);
        const rel = m.predicted > 0 ? Math.abs(m.mass - m.predicted) / m.predicted : 0;
        const toGo = Math.abs(m.predicted - m.equilibrium) / m.equilibrium;
        massNote.textContent =
          `The closed form predicts ${m.predicted.toExponential(4)} now (measured within ${(rel * 100).toPrecision(2)}%)` +
          (toGo < 1e-6 ? `, settled at ${m.equilibrium.toExponential(4)}.` : `, settling towards ${m.equilibrium.toExponential(4)}.`);
      }
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
