// The score card (02-physarum.md § Connect the Cities, The Maze): the
// mould's network measured on this run, beside the planner's on the same
// food and the published numbers for real Physarum. Labelled "computed from
// your run"; a "beats the planner" line appears only when this run measured it.

import { h, toggle } from "@bp/studio";
import type { Analysis } from "./model/analysis.js";
import type { OverlayLayers } from "./render/overlay.js";
import { OVERLAY_STYLE } from "./render/overlay.js";

const TERO = "https://doi.org/10.1126/science.1177894";
const NAKAGAKI = "https://doi.org/10.1038/35035159";

export interface ScoreCard {
  el: HTMLElement;
  /** Show the card for a scene's kind of score (null hides it). */
  setKind(kind: "cities" | "maze" | null): void;
  set(a: Analysis | null, pending: boolean): void;
  onLayers: (l: OverlayLayers) => void;
  onScore: () => void;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;
const x2 = (v: number): string => (Number.isFinite(v) ? `${v.toFixed(2)}×` : "—");

function swatch(s: { color: string; dash: number[] }): HTMLElement {
  const dash = s.dash.length ? `stroke-dasharray="${s.dash.join(" ")}"` : "";
  return h("span", {
    class: "ph-swatch",
    "aria-hidden": "true",
    html: `<svg width="26" height="8" viewBox="0 0 26 8"><path d="M1 4H25" stroke="${s.color}" stroke-width="2.2" stroke-linecap="round" ${dash}/></svg>`,
  });
}

export function buildScoreCard(): ScoreCard {
  const layers: OverlayLayers = { network: true, mst: true, steiner: false, shortest: true };
  const title = h("h2", { id: "ph-score-title" }, "Score card");
  const sub = h("p", { class: "ph-score-sub" }, "computed from your run");
  const body = h("div", { class: "ph-score-body" });
  const verdict = h("p", { class: "ph-score-verdict", role: "status" }, "");
  const scoreBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Score now");
  const fold = h("button", { type: "button", class: "ph-score-fold", "aria-expanded": "true", "aria-controls": "ph-score-main" }, "Score");
  const legend = h("div", { class: "ph-score-legend" });
  const main = h("div", { id: "ph-score-main" }, h("div", { class: "ph-score-head" }, title, sub), body, verdict, legend, h("div", { class: "ph-score-row" }, scoreBtn));
  const el = h("section", { class: "ph-score bp-surface", "aria-labelledby": "ph-score-title", hidden: true }, fold, main);
  let kind: "cities" | "maze" | null = null;
  const card: ScoreCard = {
    el,
    setKind(k) {
      kind = k;
      el.hidden = k === null;
      buildLegend();
      card.set(null, true);
    },
    set(a, pending) {
      body.textContent = "";
      verdict.textContent = "";
      if (!a || !a.score) {
        body.append(h("p", { class: "ph-note" }, pending ? "Scoring when the network has formed…" : "No score yet."));
        return;
      }
      sub.textContent = `computed from your run · step ${a.tick.toLocaleString()}`;
      const s = a.score;
      if (s.kind === "cities") {
        const n = a.net;
        const all = n.reached === n.food;
        const table = h(
          "table",
          { class: "ph-score-table" },
          h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Measure"), h("th", { scope: "col" }, "Mould"), h("th", { scope: "col" }, "MST"), h("th", { scope: "col" }, h("a", { href: TERO, target: "_blank", rel: "noopener" }, "Tero 2010")))),
          h(
            "tbody",
            {},
            h("tr", {}, h("th", { scope: "row" }, "Length"), h("td", {}, x2(s.tl)), h("td", {}, "1×"), h("td", {}, "1.75 ± 0.30× · rail ≈1.8×")),
            h("tr", {}, h("th", { scope: "row" }, "Mean distance"), h("td", {}, all ? x2(s.md) : "—"), h("td", {}, "1×"), h("td", {}, "0.85 ± 0.04× · rail 0.85×")),
            h("tr", {}, h("th", { scope: "row" }, "One cut cuts a city off"), h("td", {}, n.links ? pct(s.cut) : "—"), h("td", {}, "100%"), h("td", {}, "14–20% · rail 4%")),
          ),
        );
        body.append(
          h("p", { class: "ph-score-line" }, `${n.reached} of ${n.food} cities joined · ${n.links} links · Steiner tree ${x2(s.steinerRatio)} the MST`),
          table,
        );
        if (all && Number.isFinite(s.md)) {
          const parts: string[] = [];
          if (s.md < 1) parts.push(`its routes between cities are ${pct(1 - s.md)} shorter on average`);
          if (s.cut < 1) parts.push(`only ${pct(s.cut)} of its links cut a city off if they fail (every link of the MST does)`);
          verdict.textContent =
            parts.length > 0
              ? `On this run the mould beats the minimum spanning tree where Physarum does: ${parts.join(", and ")} — for ${x2(s.tl)} the length.`
              : `On this run the mould's network is ${x2(s.tl)} the MST's length and no better connected.`;
        } else {
          verdict.textContent = `${n.food - n.reached} ${n.food - n.reached === 1 ? "city is" : "cities are"} not joined to the network yet.`;
        }
      } else {
        const joined = Number.isFinite(s.along);
        body.append(
          h(
            "dl",
            { class: "ph-score-dl" },
            h("dt", {}, "Food joined"),
            h("dd", {}, joined ? "yes" : "not yet"),
            h("dt", {}, "Its route"),
            h("dd", {}, joined ? `${x2(s.along / s.shortest)} the shortest path` : "—"),
            h("dt", {}, "On the shortest route"),
            h("dd", {}, joined ? (s.onShortest ? "yes" : "no") : "—"),
            h("dt", {}, "Tube left elsewhere"),
            h("dd", {}, joined ? `${x2(s.extra)} the route's length` : "—"),
          ),
        );
        verdict.textContent = !joined
          ? "The two food sources are not joined by one tube yet."
          : s.onShortest
            ? `On this run the mould joined the food along the shortest route through the maze, as Physarum did for Nakagaki et al. (2000).`
            : "On this run the mould joined the food by a longer route than the shortest.";
        if (joined && s.extra > 1.3) verdict.textContent += " Dead ends are still emptying.";
      }
    },
    onLayers: () => {},
    onScore: () => {},
  };
  function buildLegend(): void {
    legend.textContent = "";
    const items: [keyof OverlayLayers, string][] =
      kind === "maze"
        ? [
            ["network", "Mould's network (as measured)"],
            ["shortest", "Shortest path through the walls"],
          ]
        : [
            ["network", "Mould's network (as measured)"],
            ["mst", "Minimum spanning tree"],
            ["steiner", "Steiner tree (heuristic)"],
          ];
    for (const [k, label] of items) {
      const t = toggle(label, layers[k], (on) => {
        layers[k] = on;
        card.onLayers({ ...layers });
      });
      legend.append(h("div", { class: "ph-legend-item" }, swatch(OVERLAY_STYLE[k]), t.el));
    }
    const cite =
      kind === "maze"
        ? h("p", { class: "ph-note" }, "Physarum in a maze: ", h("a", { href: NAKAGAKI, target: "_blank", rel: "noopener" }, "Nakagaki, Yamada & Tóth 2000"), ".")
        : h(
            "p",
            { class: "ph-note" },
            "Tero et al. grew Physarum over 36 Tokyo-area cities; this is a stylised 30-city Kantō, so compare loosely.",
          );
    legend.append(cite);
  }
  scoreBtn.addEventListener("click", () => card.onScore());
  fold.addEventListener("click", () => {
    const open = fold.getAttribute("aria-expanded") !== "true";
    fold.setAttribute("aria-expanded", open ? "true" : "false");
    main.hidden = !open;
    el.classList.toggle("is-folded", !open);
  });
  // phones start folded: the card would cover most of the dish
  if (matchMedia("(max-width: 639px)").matches) {
    fold.setAttribute("aria-expanded", "false");
    main.hidden = true;
    el.classList.add("is-folded");
  }
  return card;
}
