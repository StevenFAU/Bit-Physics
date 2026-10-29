// Learn (00-foundation.md § 6): what you are seeing, how it works at three
// depths (a sentence; a paragraph with a diagram; the rule step by step with
// the committed kernel lines that implement it), live instruments, the
// performance readout, and the model's limits — with the measured numbers.

import type { PassTiming } from "@bp/gpu";
import { h, readout, sparkline } from "@bp/studio";
import V from "../generated/verification.json";
import type { HiddenBasis } from "./model/pca.js";
import type { LiveStats } from "./model/live.js";
import type { MenagerieManifest, OrganismDef } from "./model/organisms.js";
import type { TextureDef } from "./model/textures.js";
import { heals } from "./model/organisms.js";
import type { SceneDef } from "./scenes.js";

const blob = (path: string, anchor?: string): string => `${V.repo_blob_base}${path}${anchor ? `#${anchor}` : ""}`;
const DISTILL = "https://distill.pub/2020/growing-ca/";

export interface LearnPane {
  /** `org`: the organism on a one-dish scene (null: the Menagerie). */
  setScene(scene: SceneDef, canonical: boolean, org: OrganismDef | null, extra?: SceneExtra): void;
  /** `rules`: Chimera's living cells per rule, per dish. */
  setStats(s: LiveStats, grid: number, tick: number, rules?: number[][] | null): void;
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

const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** What the M3 scenes show besides the organism. */
export interface SceneExtra {
  partner?: OrganismDef;
  texture?: TextureDef;
  grid?: number;
}

export function buildLearn(pane: HTMLElement, m: MenagerieManifest): LearnPane {
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
        `Nobody draws the organism: a network of ${params.toLocaleString()} numbers, trained to make one seed cell grow into this shape and keep it, does it cell by cell.`,
    ),
    h("div", { html: DIAGRAM }),
    h(
      "p",
      {},
      "Each cell holds 16 numbers: red, green, blue, opacity and 12 hidden ones the network uses as signals. " +
        "This is the Growing Neural Cellular Automaton of ",
      h("a", { href: DISTILL, target: "_blank", rel: "noopener" }, "Mordvintsev et al. (2020)"),
      ". The committed checkpoint (the disk) was trained with a pool of grown states, so it learned to persist. " +
        "The Menagerie's other organisms were also trained with damage — a random disc cut out of some of the grown states they practised on — so they learned to regrow (the paper's Regenerating experiment). " +
        "Every organism runs the same compiled kernel; only the weights differ.",
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
  const limits = h("ul", { class: "gr-limits" });
  pane.append(h("h2", {}, "What this model is, and is not"), limits);
  const P = m.regrow_protocol;
  const limitsFor = (org: OrganismDef | null): HTMLElement[] => {
    const faithful = h("li", {}, "Faithful: the committed kernel, unchanged, with each organism's weights — every frame is real network steps on your GPU.");
    const look = h("li", {}, "The look is presentation: soft edges, shadow, gloss, frost and the hidden-channel tint are drawn from the state; the proof reads the numbers, never the pixels.");
    if (!org) {
      const healers = m.organisms.filter(heals);
      return [
        faithful,
        h(
          "li",
          {},
          `Same code, different weights: ${m.organisms.length} organisms, each ${params.toLocaleString()} numbers in the committed checkpoint's layout. ` +
            `${healers.length} of them were trained with damage and measurably heal; the disk was not, and does not. Open an organism's card for how it was trained and what was measured.`,
        ),
        h("li", {}, "Each dish is its own world: a graft from one dish into another lands under that dish's rule. Here cells do not carry their rule with them; in the Chimera scene they do."),
        look,
      ];
    }
    if (org.gated) {
      return [
        faithful,
        h(
          "li",
          {},
          "It persists; it does not heal. Measured on this checkpoint, 1,600 steps after a cut: a bite from the edge comes back to 84% overlap with an uncut twin, " +
            "half the disk to 77%, but a stroke through the middle leaves a remnant that keeps shrinking (28%). The Menagerie's other organisms were trained with damage, and regrow.",
        ),
        h("li", {}, "It knows its dish. Seeds anywhere end as one disk at the centre — the rule senses the dish's edges. On a dish twice as wide, one seed grows a rounded square filling it (measured), so the dish stays 64 × 64."),
        h("li", {}, "It breathes. Left alone the disk swells and shrinks: sampled every 1,000 steps over 12,000 in the reference it held between 1,081 and 2,334 living cells, and it never died out."),
        look,
      ];
    }
    const r = org.measured.regrow;
    const t = org.training;
    const g = org.measured.growth_iou;
    const longRun = Object.keys(g)
      .map(Number)
      .sort((a, b) => b - a)[0]!;
    return [
      faithful,
      h(
        "li",
        {},
        `${heals(org) ? "It heals — mostly." : "It does not reliably heal."} Measured on the numeric reference of this kernel: cut at step ${P.cut_at_step} (${P.cuts.join(", ")}; ${P.seeds.length} random masks), ` +
          `it is back to ${pct(r.mean_iou_200)} overlap with its target ${P.measured_after[0]} steps later on average (worst ${pct(r.min_iou_200)}), and ${pct(r.mean_iou_800)} after ${P.measured_after[1]} (worst ${pct(r.min_iou_800)}). An uncut twin holds ${pct(r.mean_twin_200)}.`,
      ),
      h(
        "li",
        {},
        `Trained for this page, not taken from the paper: ${t.iterations?.toLocaleString()} steps in ${t.train_seconds?.toFixed(0)} s on ${t.adapter}, by this repository's training spike (WebGPU in a headless browser). ` +
          "Its target is drawn by a script, not an emoji.",
      ),
      h(
        "li",
        {},
        `It holds its shape: grown from one cell, ${pct(g["300"] ?? 0)} overlap with its target at step 300 and ${pct(g[String(longRun)] ?? 0)} at step ${longRun.toLocaleString()} (${org.measured.alive_at_long_run.toLocaleString()} living cells). ` +
          "It was trained only from one seed in the middle of this 64 × 64 dish: several seeds, or a seed near the edge, are outside what it practised.",
      ),
      look,
    ];
  };

  return {
    setScene(scene: SceneDef, canonical: boolean, org: OrganismDef | null, extra: SceneExtra = {}) {
      const name = org?.name.toLowerCase() ?? "";
      if (scene.kind === "chimera") {
        const other = extra.partner?.name.toLowerCase() ?? "";
        seeing.textContent =
          `${scene.title}: two dishes, a ${name} and a ${other}, and every cell carries the rule it follows. A graft keeps its rule in the other dish, ` +
          "and tissue that grows into empty agar brings its rule along: a dead cell takes the rule of its most opaque neighbour. The outline marks cells running the other dish's rule.";
        limits.textContent = "";
        limits.append(
          h("li", {}, "Neither organism practised this. Each was trained alone, from one seed in the middle of its dish; what grows where two rules meet was not designed — it is what these weights do."),
          h("li", {}, "Checked: with only one rule, Chimera's step is the gated kernel's, bit for bit on this GPU (Prove › Chimera with one rule). The rule lookup is the only change."),
          h("li", {}, "Rule ids live with the state: undo, save points and grafts carry them. Share links reproduce the scene's start and its opening graft, not your edits."),
        );
        alive.clear();
        mass.clear();
        return;
      }
      if (scene.kind === "texture") {
        const t = extra.texture;
        const grid = extra.grid ?? 0;
        const steps = t
          ? Object.keys(t.measured.style_by_step)
              .map(Number)
              .sort((a, b) => a - b)
          : [];
        seeing.textContent =
          `${scene.title}: a ${grid} × ${grid} plane of cells that wraps around at its edges, every cell running the same network of ${(48 * 96 + 96 + 96 * 12).toLocaleString()} weights. ` +
          `It was trained to make its neighbourhood look like a texture — ${t?.name.toLowerCase() ?? ""} — not to draw a picture, so there is no centre and no edge, and the pattern settles differently every time. Erase some: the cells around the hole grow it back. ` +
          "This is the texture model of Niklasson et al. (2021), Self-Organising Textures.";
        limits.textContent = "";
        if (t) {
          limits.append(
            h(
              "li",
              {},
              `Trained before this page was built, not in your browser: ${t.training.iterations.toLocaleString()} iterations on a CPU with PyTorch, against the Gram matrices of VGG16 features of the target (the paper's style loss) — far too heavy for a page. Teach trains shapes only.`,
            ),
            h(
              "li",
              {},
              `Its own kernel, not the gated one: 12 channels, a fourth filter (the Laplacian), wrap-around edges, no alive mask. Measured on the reference (PyTorch float32), the style loss went from ${t.measured.style_by_step[String(steps[0])]!.toFixed(0)} at step ${steps[0]} to ${t.measured.style_by_step[String(steps[steps.length - 1])]!.toFixed(0)} at step ${steps[steps.length - 1]!.toLocaleString()}. The page runs the same weights with its own random coin, so it matches the reference statistically, not cell for cell.`,
            ),
            h("li", {}, "The targets are drawn by a script in this repository (reaction–diffusion spots and stripes, a Voronoi giraffe, a basket weave) — no photographs."),
          );
        }
        alive.clear();
        mass.clear();
        return;
      }
      if (scene.kind === "menagerie") {
        seeing.textContent =
          `${scene.title}: ${m.organisms.length} dishes, one organism each, all on one clock. Every dish runs the same compiled kernel with its own ${params.toLocaleString()} weights — ` +
          "the disk is the committed checkpoint the release gate re-runs; the others were trained for this page, with damage. Cut them and see which heal.";
      } else if (scene.kind === "cell") {
        seeing.textContent =
          `${scene.title}: one cell of the ${name}, its neighbourhood, and its whole step worked out in the open — the numbers it senses, what the network makes of them, the change it adds, the coin and the alive check. ` +
          "The page does the same arithmetic as the GPU, and checks it against the GPU's next step.";
      } else if (scene.kind === "teach") {
        seeing.textContent =
          `${scene.title}: you draw a target, and this GPU trains a network of ${params.toLocaleString()} weights to grow it from one cell — the forward pass, backpropagation through time and Adam, all in WebGPU on this page. ` +
          "While it trains, the dishes show the batch it learns from. Then the result grows in the dish through the same compiled kernel as every other organism.";
        limits.textContent = "";
        limits.append(
          h("li", {}, "Checked: Prove compares this GPU's gradients with float64 autograd on fixed cases (Backprop on this GPU)."),
          h("li", {}, "It learns one thing: to grow your drawing from one seed in the middle of this 64 × 64 dish, from a pool of its own grown states, with cuts during training so that it heals (the Distill recipe). Several seeds, or a seed near the edge, are outside what it practised."),
          h("li", {}, "One training iteration takes longer than a 60 fps frame, so training runs in slices between frames. The panel shows the page's frame rate and the training speed as measured, on this GPU."),
          h("li", {}, "Saved models stay in this browser on this device (IndexedDB); a download is the way to keep one."),
          h("li", {}, "The look is presentation: soft edges, shadow and gloss are drawn from the state; the checks read the numbers, never the pixels."),
        );
        alive.clear();
        mass.clear();
        return;
      } else if (scene.kind === "canonical") {
        seeing.textContent = org?.gated
          ? `${scene.title}: one living cell, planted in the middle of a 64 × 64 dish, grows into a two-tone disk and holds it. ` +
            (canonical ? "Untouched, this is exactly the run the release gate checks." : "You have changed it, so it is no longer the gated run.")
          : `${scene.title}: one living cell, planted in the middle of a 64 × 64 dish, grows into a ${name}. Its rule was trained with damage, so a cut grows back. ` +
            "The release gate checks the committed disk (choose it in the organism menu, or Prove › Show the gated run).";
      } else {
        seeing.textContent = org?.gated
          ? `${scene.title}: a few seed cells scattered by the seed. They grow, run into each other, and end as one disk in the middle of the dish.`
          : `${scene.title}: a few seed cells scattered by the seed, each growing under the ${name} rule — which only ever practised growing one ${name} from the middle of the dish.`;
      }
      limits.textContent = "";
      limits.append(...limitsFor(scene.kind === "menagerie" ? null : org));
      alive.clear();
      mass.clear();
    },
    setStats(s: LiveStats, grid: number, tick: number, rules?: number[][] | null) {
      if (rules) {
        stats.set([
          ["Step", tick.toLocaleString()],
          ...rules.map((c, i): [string, string] => [`Dish ${i + 1}: living cells per rule`, c.map((n) => n.toLocaleString()).join(" · ") || "—"]),
        ]);
        return;
      }
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
