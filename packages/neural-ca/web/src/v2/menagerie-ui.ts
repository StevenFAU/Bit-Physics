// The Menagerie's chrome (M1): a name label on each dish, an organism card
// with its provenance (how it was trained, on what, and what was measured),
// and the organism picker in the heading for the one-dish scenes. Every
// number comes from public/menagerie/menagerie.json (build.py); nothing is
// retyped here.

import { h } from "@bp/studio";
import type { MenagerieManifest, OrganismDef } from "./model/organisms.js";
import { heals } from "./model/organisms.js";
import { assetUrl } from "./proof/gate.js";

const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** One-line verdict on an organism's regrowth, from its measurements. */
export function regrowLine(d: OrganismDef, m: MenagerieManifest): string {
  const r = d.measured.regrow;
  const after = m.regrow_protocol.measured_after[0];
  return heals(d)
    ? `heals: ${pct(r.mean_iou_200)} back on its shape ${after} steps after a cut (worst ${pct(r.min_iou_200)})`
    : `does not heal: ${pct(r.mean_iou_200)} on its shape ${after} steps after a cut (worst ${pct(r.min_iou_200)})`;
}

function lossSpark(curve: [number, number][]): SVGSVGElement | null {
  if (curve.length < 2) return null;
  const W = 220;
  const H = 44;
  const xs = curve.map((c) => c[0]);
  const ys = curve.map((c) => Math.log10(Math.max(c[1], 1e-9)));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const pts = curve
    .map((_, i) => `${(((xs[i]! - x0) / Math.max(x1 - x0, 1)) * (W - 4) + 2).toFixed(1)},${(H - 2 - ((ys[i]! - y0) / Math.max(y1 - y0, 1e-9)) * (H - 4)).toFixed(1)}`)
    .join(" ");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("class", "gr-card-loss");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `Training loss on a log scale, falling from ${curve[0]![1].toExponential(1)} to ${curve[curve.length - 1]![1].toExponential(1)} over ${x1.toLocaleString()} iterations`,
  );
  const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  pl.setAttribute("points", pts);
  pl.setAttribute("fill", "none");
  pl.setAttribute("stroke", "currentColor");
  pl.setAttribute("stroke-width", "1.5");
  svg.append(pl);
  return svg;
}

export interface MenagerieUi {
  /** Show labels for these dishes (null: no labels — not the Menagerie). */
  setDishes(defs: readonly OrganismDef[] | null): void;
  /** Move the labels to the dishes' screen positions (CSS px, the label's top centre) at this dish size. */
  place(anchors: readonly [number, number][], dishPx: number): void;
  open(id: string): void;
  close(): void;
  /** The heading's organism picker. */
  setOrganism(id: string, visible: boolean): void;
}

export function buildMenagerieUi(
  stage: HTMLElement,
  sceneRow: HTMLElement,
  m: MenagerieManifest,
  act: { grow: (id: string) => void; pick: (id: string) => void },
): MenagerieUi {
  // ---- labels on the dishes ------------------------------------------------
  const layer = h("div", { class: "gr-labels" });
  stage.append(layer);
  let labels: HTMLButtonElement[] = [];

  // ---- the organism card ---------------------------------------------------
  const card = h("section", { class: "gr-card bp-surface", "aria-label": "Organism", "data-bp-chrome": "", "data-bp2": "studio-chrome" });
  card.hidden = true;
  stage.append(card);
  let openId: string | null = null;

  const fill = (d: OrganismDef): void => {
    card.textContent = "";
    const close = h("button", { type: "button", class: "bp-btn bp-btn-quiet gr-card-close", "aria-label": "Close" }, "Close");
    close.addEventListener("click", () => ui.close());
    const t = d.training;
    const g = d.measured.growth_iou;
    const longRun = Object.keys(g)
      .map(Number)
      .sort((a, b) => b - a)[0]!;
    const badge = d.gated ? "gated" : heals(d) ? "heals" : "persists";
    const trained = d.gated
      ? [h("p", {}, t.note ?? "")]
      : [
          h(
            "p",
            {},
            `${t.iterations?.toLocaleString()} training steps in ${t.train_seconds?.toFixed(0)} s on ${t.adapter}, with WebGPU in a headless browser ` +
              `(this repository's training spike: forward pass, backpropagation through time and Adam in WGSL). ` +
              `Batches of ${t.batch} from a pool of ${t.pool?.toLocaleString()}, rollouts of ${t.rollout?.[0]}–${t.rollout?.[1]} steps` +
              (t.damaged_per_batch ? `, and ${t.damaged_per_batch} of each batch cut by a random disc — the damage it learned to repair.` : "."),
          ),
          h("p", { class: "gr-note" }, `Final loss ${t.final_loss_mean_last_200?.toExponential(1)} (mean of the last 200 steps); training seed ${t.seed}.`),
        ];
    const spark = t.loss_curve ? lossSpark(t.loss_curve) : null;
    const grow = h("button", { type: "button", class: "bp-btn bp-btn-primary" }, "Grow it in the Dish");
    grow.addEventListener("click", () => act.grow(d.id));
    card.append(
      h("header", {}, h("h2", {}, d.name, " ", h("span", { class: `gr-badge gr-badge-${badge}` }, badge)), close),
      h(
        "div",
        { class: "gr-card-top" },
        h("img", { class: "gr-card-target", src: assetUrl(d.target), alt: `The target it was trained to grow: a ${d.name.toLowerCase()}`, width: "64", height: "64" }),
        h("p", { class: "gr-card-blurb" }, d.blurb),
      ),
      h("h3", {}, "How it was trained"),
      ...trained,
      ...(spark ? [spark] : []),
      h("h3", {}, "Measured"),
      h(
        "ul",
        { class: "gr-card-facts" },
        h("li", {}, `Grown from one cell: ${pct(g["300"] ?? 0)} overlap with its target at step 300, ${pct(g[String(longRun)] ?? 0)} at step ${longRun.toLocaleString()} (${d.measured.alive_at_long_run.toLocaleString()} living cells).`),
        h(
          "li",
          {},
          `Cut at step ${m.regrow_protocol.cut_at_step} (${m.regrow_protocol.cuts.join(", ")}; ${m.regrow_protocol.seeds.length} random masks), ` +
            `${m.regrow_protocol.measured_after[0]} steps later: ${pct(d.measured.regrow.mean_iou_200)} overlap on average (worst ${pct(d.measured.regrow.min_iou_200)}); an uncut twin: ${pct(d.measured.regrow.mean_twin_200)}.`,
        ),
      ),
      h("p", { class: "gr-note" }, "Overlap: cells with opacity over one half, against the target's (intersection over union), on the numeric reference of the same kernel."),
      h("div", { class: "gr-card-actions" }, grow),
    );
  };

  // ---- the heading's organism picker ----------------------------------------
  const pick = h("select", { class: "bp-scene-picker gr-organism-picker", "aria-label": "Organism" });
  for (const d of m.organisms) pick.append(h("option", { value: d.id }, d.gated ? `${d.name} (gated)` : d.name));
  pick.addEventListener("change", () => act.pick(pick.value));
  sceneRow.append(pick);

  const ui: MenagerieUi = {
    setDishes(defs) {
      layer.textContent = "";
      labels = [];
      if (!defs) {
        ui.close();
        return;
      }
      for (const d of defs) {
        const b = h(
          "button",
          { type: "button", class: "gr-label", "aria-label": `${d.name}: ${heals(d) ? "heals" : d.gated ? "the gated checkpoint" : "persists"} — about this organism` },
          h("span", { class: "gr-label-name" }, d.name),
          h("span", { class: `gr-badge gr-badge-${d.gated ? "gated" : heals(d) ? "heals" : "persists"}` }, d.gated ? "gated" : heals(d) ? "heals" : "persists"),
        );
        b.addEventListener("click", () => (openId === d.id ? ui.close() : ui.open(d.id)));
        layer.append(b);
        labels.push(b);
      }
    },
    place(anchors, dishPx) {
      labels.forEach((b, i) => {
        const a = anchors[i];
        if (!a) return;
        b.style.transform = `translate(${a[0].toFixed(1)}px, ${a[1].toFixed(1)}px) translateX(-50%)`;
        b.classList.toggle("is-small", dishPx < 170);
      });
    },
    open(id) {
      const d = m.organisms.find((o) => o.id === id);
      if (!d) return;
      openId = id;
      fill(d);
      card.hidden = false;
      labels.forEach((b, i) => b.setAttribute("aria-expanded", String(m.organisms[i]?.id === id)));
    },
    close() {
      openId = null;
      card.hidden = true;
      for (const b of labels) b.setAttribute("aria-expanded", "false");
    },
    setOrganism(id, visible) {
      pick.value = id;
      pick.hidden = !visible;
    },
  };
  return ui;
}
