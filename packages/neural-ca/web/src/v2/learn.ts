// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph with a diagram; the rule step by step with
// the committed kernel lines that implement it), live instruments, the
// performance readout, and the model's limits — with the measured numbers.

import type { PassTiming } from "@bp/gpu";
import { h, readout, sparkline } from "@bp/studio";
import V from "../generated/verification.json";
import type { HiddenBasis } from "./model/pca.js";
import type { LiveStats } from "./model/live.js";
import type { SceneDef } from "./scenes.js";

const blob = (path: string, anchor?: string): string => `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;
const DISTILL = "https://distill.pub/2020/growing-ca/";

export interface LearnPane {
  setScene(scene: SceneDef, canonical: boolean): void;
  setStats(s: LiveStats, grid: number, tick: number): void;
  setBasis(b: HiddenBasis | null): void;
  setPerf(rows: [string, string][], passes: PassTiming[], source: string): void;
}

const DIAGRAM = `<svg viewBox="0 0 340 120" role="img" aria-label="Diagram: each cell reads its own 16 numbers and the slopes of its neighbours' (48 values), a small network of 128 units turns them into 16 changes, and the cell adds them — but only on a coin flip, and only if a living cell is near." class="gr-diagram">
  <defs><marker id="gr-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>
  <g fill="none" stroke="currentColor" stroke-width="1.3">
    <rect x="6" y="38" width="44" height="44" rx="4"/>
    <path d="M20.7 38V82M35.3 38V82M6 52.7H50M6 67.3H50" opacity="0.45"/>
    <rect x="80" y="30" width="56" height="60" rx="6"/>
    <rect x="166" y="22" width="64" height="76" rx="6"/>
    <rect x="260" y="30" width="56" height="60" rx="6"/>
    <path d="M52 60H76" marker-end="url(#gr-arrow)"/>
    <path d="M138 60H162" marker-end="url(#gr-arrow)"/>
    <path d="M232 60H256" marker-end="url(#gr-arrow)"/>
  </g>
  <rect x="20.7" y="52.7" width="14.6" height="14.6" fill="currentColor" opacity="0.5"/>
  <g font-family="IBM Plex Sans, system-ui, sans-serif" font-size="11" fill="currentColor" text-anchor="middle">
    <text x="28" y="100">3 × 3</text>
    <text x="108" y="56">sense</text><text x="108" y="72">48</text>
    <text x="198" y="56">network</text><text x="198" y="72">128</text>
    <text x="288" y="56">change</text><text x="288" y="72">16</text>
    <text x="108" y="108">value + slopes</text>
    <text x="288" y="108">if coin · if alive</text>
  </g>
</svg>`;

export function buildLearn(pane: HTMLElement): LearnPane {
  pane.textContent = "";
  const seeing = h("p", { class: "gr-lede" }, "");
  pane.append(h("h2", {}, "What you are seeing"), seeing);

  const A = V.code_anchors;
  const kernelLink = (label: string, r: { start: number; end: number } | { line: number }): HTMLAnchorElement => {
    const anchor = "line" in r ? `L${r.line}` : `L${r.start}-L${r.end}`;
    const lines = "line" in r ? `L${r.line}` : `L${r.start}–${r.end}`;
    return h("a", { href: blob(V.links.kernel, anchor), target: "_blank", rel: "noopener" }, `${label} (${lines})`);
  };
  const params = 128 * 48 + 128 + 16 * 128;
  pane.append(
    h("h2", {}, "How it works"),
    h(
      "p",
      {},
      "Every cell of the dish runs the same tiny neural network on what it can sense of its neighbours, and adds what the network says to its own state. " +
        `Nobody draws the disk: a network of ${params.toLocaleString()} numbers, trained to make one seed cell grow into this shape and keep it, does it cell by cell.`,
    ),
    h("div", { html: DIAGRAM }),
    h(
      "p",
      {},
      "Each cell holds 16 numbers: red, green, blue, opacity and 12 hidden ones the network uses as signals. " +
        "This is the Growing Neural Cellular Automaton of ",
      h("a", { href: DISTILL, target: "_blank", rel: "noopener" }, "Mordvintsev et al. (2020)"),
      ". The checkpoint here was trained with a pool of grown states so it learned to persist, not to regrow after damage.",
    ),
    h(
      "details",
      { class: "gr-rule" },
      h("summary", {}, "The rule, step by step"),
      h(
        "ol",
        {},
        h("li", {}, "Sense: each of the 16 values, and its left–right and up–down slope from a Sobel filter over the 3 × 3 neighbours — 48 numbers. Outside the dish counts as zero. ", kernelLink("kernel", A.perception)),
        h("li", {}, "Think: a layer of 128 units with ReLU, then 16 outputs (the last layer starts at zero, so an untrained rule changes nothing). ", kernelLink("kernel", A.mlp)),
        h("li", {}, `Flip a coin: each cell updates with probability ${V.model.fire_rate}, drawn from a hash of its position, the step and a seed — so a run repeats exactly. `, kernelLink("kernel", A.pcg_fire)),
        h("li", {}, "Add the change. ", kernelLink("kernel", A.fire_apply)),
        h("li", {}, `Live or die: a cell survives only if some cell in its 3 × 3 neighbourhood has opacity above ${V.model.alive_threshold}, both before and after the update. `, kernelLink("kernel", A.alive), " ", kernelLink("apply", A.alive_apply)),
      ),
      h("p", { class: "gr-note" }, "That is the whole rule: two GPU passes per step, the same code the release gate runs."),
    ),
  );

  // ---- instruments ---------------------------------------------------------
  const alive = sparkline("Living cells", "", 160, 0);
  const mass = sparkline("Opacity, summed", "", 160, 1);
  const stats = readout("Organism");
  const tint = h("p", { class: "gr-note" }, "Hidden-channel tint: waiting for the organism to grow.");
  pane.append(h("h2", {}, "Instruments"), alive.el, mass.el, stats.el, tint);

  // ---- performance ---------------------------------------------------------
  const perf = readout("Performance");
  const passesEl = h("div", { class: "gr-note bp-mono" });
  pane.append(h("h2", {}, "Performance"), perf.el, passesEl);

  // ---- limits --------------------------------------------------------------
  pane.append(
    h("h2", {}, "What this model is, and is not"),
    h(
      "ul",
      { class: "gr-limits" },
      h("li", {}, "Faithful: the committed checkpoint and kernel, unchanged — every frame is real network steps on your GPU."),
      h(
        "li",
        {},
        "It persists; it does not heal. Measured on this checkpoint, 1,600 steps after a cut: a bite from the edge comes back to 84% overlap with an uncut twin, " +
          "half the disk to 77%, but a stroke through the middle leaves a remnant that keeps shrinking (28%). Networks trained with damage regrow; that is a later milestone.",
      ),
      h("li", {}, "It knows its dish. Seeds anywhere end as one disk at the centre — the rule senses the dish's edges. On a dish twice as wide, one seed grows a rounded square filling it (measured), so the dish stays 64 × 64."),
      h("li", {}, "It breathes. Left alone the disk swells and shrinks: sampled every 1,000 steps over 12,000 in the reference it held between 1,081 and 2,334 living cells, and it never died out."),
      h("li", {}, "The look is presentation: soft edges, shadow, gloss and the hidden-channel tint are drawn from the state; the proof reads the numbers, never the pixels."),
    ),
  );

  return {
    setScene(scene: SceneDef, canonical: boolean) {
      seeing.textContent =
        scene.kind === "canonical"
          ? `${scene.title}: one living cell, planted in the middle of a 64 × 64 dish, grows into a two-tone disk and holds it. ` +
            (canonical ? "Untouched, this is exactly the run the release gate checks." : "You have changed it, so it is no longer the gated run.")
          : `${scene.title}: a few seed cells scattered by the seed. They grow, run into each other, and end as one disk in the middle of the dish.`;
      alive.clear();
      mass.clear();
    },
    setStats(s: LiveStats, grid: number, tick: number) {
      alive.push(s.alive);
      mass.push(s.mass);
      const off = Number.isFinite(s.cx) ? Math.hypot(s.cx - grid / 2, s.cy - grid / 2) : NaN;
      stats.set([
        ["Step", tick.toLocaleString()],
        ["Living cells (opacity > 0.1)", `${s.alive.toLocaleString()} of ${(grid * grid).toLocaleString()}`],
        ["Centre, from the dish's centre", Number.isFinite(off) ? `${off.toFixed(1)} cells` : "—"],
      ]);
    },
    setBasis(b: HiddenBasis | null) {
      tint.textContent = b
        ? `Hidden-channel tint: the three main directions of the 12 hidden channels over ${b.cells.toLocaleString()} living cells carry ` +
          `${(b.explained[0] * 100).toFixed(0)}%, ${(b.explained[1] * 100).toFixed(0)}% and ${(b.explained[2] * 100).toFixed(0)}% of their variation; they colour the organism faintly (Hidden channels view: fully).`
        : "Hidden-channel tint: waiting for the organism to grow.";
    },
    setPerf(rows: [string, string][], passes: PassTiming[], source: string) {
      perf.set(rows);
      passesEl.textContent =
        passes.length > 0
          ? `GPU per pass (${source === "timestamp" ? "timestamp queries" : "submit latency"}): ${passes.map((p) => `${p.name} ${p.avg.toFixed(3)} ms`).join(" · ")}`
          : "";
    },
  };
}
