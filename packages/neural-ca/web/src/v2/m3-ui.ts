// M3 chrome: Chimera's second-organism picker and its legend (living cells on
// each rule, per dish), and Textures' picker and card (what each texture was
// trained on, how, and what was measured). Every number on the card comes
// from public/textures/textures.json (packages/neural-ca/textures/build.py).

import { h } from "@bp/studio";
import type { OrganismDef } from "./model/organisms.js";
import type { TextureDef, TextureManifest } from "./model/textures.js";
import { assetUrl } from "./proof/gate.js";

export interface M3Ui {
  /** Chimera: show the partner picker (null: hide it). */
  setPartner(id: string | null): void;
  /** Chimera: a label under each dish — its organism and its living cells on each rule (null: hide them). */
  setLegend(dishes: { name: string; counts: number[] }[] | null, names: string[]): void;
  /** Move the labels to the dishes' screen positions (CSS px, the label's top centre). */
  placeLegend(anchors: readonly [number, number][]): void;
  /** Textures: show the texture picker (null: hide it and the card). */
  setTexture(id: string | null): void;
  openCard(id: string): void;
  closeCard(): void;
}

const fmtS = (s: number): string => (s >= 120 ? `${(s / 60).toFixed(0)} min` : `${s.toFixed(0)} s`);

export function buildM3Ui(
  stage: HTMLElement,
  sceneRow: HTMLElement,
  organisms: readonly OrganismDef[],
  textures: TextureManifest,
  act: { partner: (id: string) => void; texture: (id: string) => void },
): M3Ui {
  // ---- Chimera's second organism -----------------------------------------
  const partner = h("select", { class: "bp-scene-picker gr-partner-picker", "aria-label": "Second organism (the donor)" });
  for (const d of organisms) partner.append(h("option", { value: d.id }, `with ${d.name}`));
  partner.addEventListener("change", () => act.partner(partner.value));
  partner.hidden = true;

  // ---- Textures' picker and card --------------------------------------------
  const pick = h("select", { class: "bp-scene-picker gr-texture-picker", "aria-label": "Texture" });
  for (const t of textures.textures) pick.append(h("option", { value: t.id }, t.name));
  pick.addEventListener("change", () => act.texture(pick.value));
  pick.hidden = true;
  const about = h("button", { type: "button", class: "bp-btn bp-btn-quiet gr-about", "aria-label": "About this texture" }, "About");
  about.hidden = true;
  about.addEventListener("click", () => (card.hidden ? ui.openCard(pick.value) : ui.closeCard()));
  sceneRow.append(partner, pick, about);

  const card = h("section", { class: "gr-card bp-surface", "aria-label": "Texture", "data-bp-chrome": "", "data-bp2": "studio-chrome" });
  card.hidden = true;
  stage.append(card);

  const legend = h("div", { class: "gr-labels gr-legend", role: "status", "aria-live": "off" });
  legend.hidden = true;
  stage.append(legend);
  let tags: HTMLElement[] = [];

  const fill = (t: TextureDef): void => {
    card.textContent = "";
    const close = h("button", { type: "button", class: "bp-btn bp-btn-quiet gr-card-close", "aria-label": "Close" }, "Close");
    close.addEventListener("click", () => ui.closeCard());
    const tr = t.training;
    const m = t.measured;
    const steps = Object.keys(m.style_by_step)
      .map(Number)
      .sort((a, b) => a - b);
    const first = steps[0]!;
    const last = steps[steps.length - 1]!;
    const after = Object.keys(m.regrow.after)
      .map(Number)
      .sort((a, b) => a - b);
    const settle = after.find((s) => m.regrow.after[String(s)]! <= m.regrow.before * 1.25);
    card.append(
      h("header", {}, h("h2", {}, t.name), close),
      h(
        "div",
        { class: "gr-card-top" },
        h("img", { class: "gr-card-target gr-card-texture", src: assetUrl(t.target), alt: `The texture it was trained to make: ${t.name.toLowerCase()}`, width: "64", height: "64" }),
        h("p", { class: "gr-card-blurb" }, t.blurb),
      ),
      h("h3", {}, "How it was trained"),
      h(
        "p",
        {},
        `${tr.iterations.toLocaleString()} iterations in ${fmtS(tr.wall_s)} on a CPU with PyTorch, before this page was built — not in your browser (the loss runs VGG16, too heavy to train here). ` +
          `The loss compares the Gram matrices of VGG16 features of the cells' colours with the target's (the paper's style loss), so the cells learn the texture's statistics, not a picture. ` +
          `Batches of ${tr.batch} from a pool of ${tr.pool.toLocaleString()} states on a ${tr.grid} × ${tr.grid} wrap-around grid, rollouts of ${tr.rollout[0]}–${tr.rollout[1]} steps; training seed ${tr.seed}.`,
      ),
      h("p", { class: "gr-note" }, `Target: ${t.how}. Drawn by a script in this repository.`),
      h("h3", {}, "Measured"),
      h(
        "ul",
        { class: "gr-card-facts" },
        h(
          "li",
          {},
          `Grown from an empty plane: style loss ${m.style_by_step[String(first)]!.toFixed(0)} at step ${first}, ${m.style_by_step[String(last)]!.toFixed(0)} at step ${last.toLocaleString()} ` +
            `(lower is closer to the target; the training batch ended at ${tr.final_style_loss.toFixed(0)}).`,
        ),
        h(
          "li",
          {},
          `Erased: a disc of radius ${m.regrow.radius} cut out at step ${m.regrow.erase_at}; the loss over it is ${m.regrow.before.toFixed(0)} before, ` +
            after.map((s) => `${m.regrow.after[String(s)]!.toFixed(0)} after ${s}`).join(", ") +
            (settle !== undefined ? ` — back within 25% after ${settle} steps.` : " — not back within 25% in the steps measured."),
        ),
        h("li", {}, `Stays bounded: the largest state value after ${(4096).toLocaleString()} steps is ${m.max_abs_state_4096.toFixed(2)}.`),
      ),
      h("p", { class: "gr-note" }, "Measured on the reference (PyTorch, float32). This page runs the same weights on its own float32 kernel with its own random coin, so the plane matches the reference statistically, not cell for cell."),
    );
  };

  const ui: M3Ui = {
    setPartner(id) {
      partner.hidden = id === null;
      if (id !== null) partner.value = id;
    },
    setLegend(dishes, names) {
      legend.hidden = dishes === null;
      if (!dishes) {
        legend.textContent = "";
        tags = [];
        return;
      }
      if (tags.length !== dishes.length) {
        legend.textContent = "";
        tags = dishes.map(() => legend.appendChild(h("p", { class: "gr-label gr-legend-tag" })));
      }
      dishes.forEach((d, i) => {
        const total = d.counts.reduce((a, b) => a + b, 0);
        const other = d.counts.map((c, r) => (r === i ? 0 : c)).reduce((a, b) => a + b, 0);
        const others = names.filter((_, r) => r !== i).join(" / ");
        const tag = tags[i]!;
        tag.textContent = "";
        tag.append(
          h("span", { class: `gr-legend-dot gr-legend-${i}`, "aria-hidden": "true" }),
          h("strong", {}, d.name),
          total > 0 ? ` ${total.toLocaleString()} living cells · ${other.toLocaleString()} on the ${others.toLowerCase()} rule` : " · nothing alive",
        );
      });
    },
    placeLegend(anchors) {
      tags.forEach((t, i) => {
        const a = anchors[i];
        if (a) t.style.transform = `translate(${a[0].toFixed(1)}px, ${a[1].toFixed(1)}px) translateX(-50%)`;
      });
    },
    setTexture(id) {
      pick.hidden = id === null;
      about.hidden = id === null;
      if (id === null) {
        ui.closeCard();
        return;
      }
      pick.value = id;
      if (!card.hidden) ui.openCard(id);
    },
    openCard(id) {
      const t = textures.textures.find((x) => x.id === id);
      if (!t) return;
      fill(t);
      card.hidden = false;
    },
    closeCard() {
      card.hidden = true;
    },
  };
  return ui;
}
