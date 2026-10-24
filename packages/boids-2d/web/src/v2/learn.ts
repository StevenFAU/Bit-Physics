// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph with a diagram; the rule step by step with
// the kernel it runs), the live instruments (polarization φ and milling m
// from the exact integer reduction), the performance readout, and the
// model's limits.

import type { PassTiming } from "@bp/gpu";
import { h, readout, sparkline } from "@bp/studio";
import type { OrderParams } from "./model/flock.js";
import type { RuleParams } from "./model/params.js";
import type { SceneDef } from "./scenes.js";

export const REPO_BLOB = "https://github.com/StevenFAU/Bit-Physics/blob/main/";
const REYNOLDS = "https://red3d.com/cwr/papers/1987/boids.html";
const VICSEK = "https://doi.org/10.1103/PhysRevLett.75.1226";
const TUNSTROM = "https://doi.org/10.1371/journal.pcbi.1002915";

export interface LearnPane {
  setScene(scene: SceneDef, proofRun: boolean): void;
  setRule(r: RuleParams): void;
  pushOrder(o: OrderParams): void;
  setStats(rows: [string, string][]): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const DIAGRAM = `<svg viewBox="0 0 320 150" role="img" aria-label="Diagram: a fish at the centre of three nested circles. Inside the smallest it moves away from neighbours (separation), inside the middle one it matches their heading (alignment), inside the largest it steers towards their centre (cohesion)." class="sw-diagram">
  <defs><marker id="sw-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5" stroke-dasharray="3 3">
    <circle cx="90" cy="75" r="22"/><circle cx="90" cy="75" r="46"/><circle cx="90" cy="75" r="66"/>
  </g>
  <path d="M84 75L100 69L100 81Z" fill="currentColor"/>
  <g fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M100 75L124 75" marker-end="url(#sw-arrow)"/>
  </g>
  <g fill="currentColor" opacity="0.8">
    <path d="M104 60l8-3-2 6z"/><path d="M60 92l8-2-3 6z"/><path d="M118 108l8-1-4 6z"/><path d="M140 44l8-3-2 6z"/>
  </g>
  <g font-family="IBM Plex Sans, system-ui, sans-serif" font-size="12" fill="currentColor">
    <text x="172" y="58">separation · 0.3 r</text>
    <text x="172" y="80">alignment · 0.72 r</text>
    <text x="172" y="102">cohesion · r</text>
  </g>
</svg>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const seeing = h("p", { class: "sw-lede" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing);

  const ruleCells: Record<string, HTMLElement> = {};
  const rv = (k: string): HTMLElement => (ruleCells[k] = h("span", { class: "bp-mono" }, "—"));
  const src = (label: string, path: string): HTMLAnchorElement => h("a", { href: `${REPO_BLOB}${path}`, target: "_blank", rel: "noopener" }, label);
  pane.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Every fish follows three local rules — keep a little distance, swim the way your neighbours swim, stay close to them — " +
        "and flees anything big that comes too near. No fish knows the shape of its school.",
    ),
    h("div", { html: DIAGRAM }),
    h(
      "p",
      {},
      "This is Craig Reynolds's 1987 boids model (",
      h("a", { href: REYNOLDS, target: "_blank", rel: "noopener" }, "Reynolds 1987"),
      ") with the angular noise of Vicsek's 1995 model of self-driven particles (",
      h("a", { href: VICSEK, target: "_blank", rel: "noopener" }, "Vicsek et al. 1995"),
      "). With little noise the fish polarise into schools; with enough, order breaks into a disordered swarm. " +
        "The shark adds a fear term: inside its ring every fish is pushed straight away from it, more the closer it is. " +
        "The schools tear open around it and heal behind it — the fountain effect seen in real fish.",
    ),
    h(
      "details",
      { class: "sw-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Look around: every fish within reach ", rv("r"), " (on the torus — the ocean wraps at its edges). Neighbours are found with a counting sort into cells of side ≥ r, so none is ever missed."),
        h(
          "li",
          {},
          "Add up, as whole numbers of 2⁻²⁰: the offsets to fish within 0.72 r and r (alignment and cohesion), and a push away from fish within 0.3 r, weighted (1 − d/0.3r)/d. " +
            "Integer sums do not depend on the order the neighbours are visited in, so the run is the same bit for bit however the GPU schedules it.",
        ),
        h(
          "li",
          {},
          "Steer: towards each target heading at top speed ",
          rv("v"),
          ", each change capped at 0.14 of top speed and weighted — separation ",
          rv("ws"),
          ", alignment ",
          rv("wa"),
          ", cohesion ",
          rv("wc"),
          ".",
        ),
        h("li", {}, "Flee the shark: inside its ring, a push straight away from it that fades to zero at the edge."),
        h("li", {}, "Clamp the speed between 0.42 and 1 times the top speed, then turn the heading by a random angle up to ±", rv("eta"), "·180° (a hash of the seed, the step and the fish — the same every replay)."),
        h("li", {}, "Move, and wrap around the edges."),
      ),
      h(
        "p",
        {},
        "The GPU kernel is the v4 lab's, byte for byte: ",
        src("v2 kernel", "packages/boids-2d/web/src/v2/model/kernel.ts"),
        " · ",
        src("v4 lab", "packages/boids-2d/web/index.html"),
        " · ",
        src("spec", "docs/planning/rebuild-v2/03-boids-2d.md"),
      ),
    ),
  );

  const phi = sparkline("Polarization φ", "", 120, 3);
  const mill = sparkline("Milling m", "", 120, 3);
  const orderNote = h(
    "p",
    { class: "sw-note" },
    "φ = |Σ v̂| / N is 1 when every fish swims the same way and near 0 when headings are random. " +
      "m = |Σ r̂ × v̂| / N measures rotation about the centre of mass (Tunstrøm et al. 2013's O_r). ",
    h("a", { href: TUNSTROM, target: "_blank", rel: "noopener" }, "Tunstrøm et al. 2013"),
    ". Both are exact integer sums over every fish, computed on the GPU.",
  );
  const stats = readout("The ocean");
  pane.append(h("h2", {}, "Instruments"), phi.el, mill.el, orderNote, stats.el);

  const perf = readout("Performance");
  const passes = readout("GPU time per pass");
  const perfNote = h("p", { class: "sw-note" }, "");
  pane.append(h("h2", {}, "Performance"), perf.el, h("h3", {}, "GPU time per pass"), passes.el, perfNote);

  pane.append(
    h("h2", {}, "Model limits"),
    h(
      "ul",
      { class: "sw-limits" },
      h("li", {}, h("strong", {}, "Faithful: "), "the v4 lab's gated kernel, step for step; metric neighbours, found exactly; every frame is real solver steps."),
      h(
        "li",
        {},
        h("strong", {}, "Simplified: "),
        "fish are points with a heading — no body, no vision cone (the field of view is 360°), no fatigue; the shark is a pointer-driven fear term, not a hunting agent, and it does not reach across the ocean's wrapped edge.",
      ),
      h(
        "li",
        {},
        h("strong", {}, "Changed for speed: "),
        "every 16 steps the live ocean moves its fish into grid order in memory, so neighbours are read from nearby memory. With no noise that changes no fish's path (Prove checks it fish by fish); " +
          "the noise draw is keyed by memory slot, so with noise the run differs from one that never re-sorts — still the same every time.",
      ),
      h("li", {}, h("strong", {}, "Same device, same bytes: "), "a run replays bit for bit on the same GPU and browser. Across GPUs only the statistics (φ, m) are comparable — the flock is chaotic."),
      h("li", {}, h("strong", {}, "Measured: "), "φ and m from exact integer sums; the in-page proofs in Prove."),
    ),
  );

  return {
    setScene(scene, proofRun) {
      const what: Record<string, string> = {
        "open-water":
          "Fish released at random headings over a wrapped ocean. Within seconds they gather into schools that wheel, merge and split. " +
          "Each bright mark is one fish; where they crowd, their light adds up. Move the pointer into the water: you are the shark.",
        proof: "The 4,096-fish run the in-page GPU proofs replay: seed 42, the scene's rule, no shark.",
      };
      seeing.textContent = `${what[scene.id] ?? scene.prompt}${proofRun ? " This is the proofs' run." : ""}`;
      phi.clear();
      mill.clear();
    },
    setRule(r) {
      ruleCells["r"]!.textContent = r.rCoh.toFixed(3);
      ruleCells["v"]!.textContent = r.maxSpeed.toFixed(4);
      ruleCells["ws"]!.textContent = r.wSep.toFixed(2);
      ruleCells["wa"]!.textContent = r.wAli.toFixed(2);
      ruleCells["wc"]!.textContent = r.wCoh.toFixed(2);
      ruleCells["eta"]!.textContent = r.noise.toFixed(2);
    },
    pushOrder(o) {
      phi.push(o.phi);
      mill.push(o.mill);
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
