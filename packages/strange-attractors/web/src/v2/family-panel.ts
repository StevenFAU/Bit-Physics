// The Family's gallery panel (M3): the nine systems, each a swatch of its own
// palette; the one on show says what it is.

import { h } from "@bp/studio";
import type { FamilySystem } from "./model/family.js";
import { FAMILY } from "./model/family.js";

export interface FamilyPanel {
  el: HTMLElement;
  set(key: string): void;
}

const gradient = (s: FamilySystem): string => `linear-gradient(90deg, ${s.palette.map((c, i) => `rgb(${c.map((v) => Math.round(v * 255)).join(",")}) ${Math.round((i / (s.palette.length - 1)) * 100)}%`).join(", ")})`;

export function buildFamilyPanel(hd: { pick: (key: string) => void }): FamilyPanel {
  const blurb = h("p", { class: "cx-panel-note cx-family-blurb" }, "");
  const facts = h("p", { class: "cx-panel-status" }, "");
  const buttons = FAMILY.map((s) => {
    const b = h(
      "button",
      { type: "button", class: "cx-family-btn", "aria-pressed": "false", "data-system": s.key },
      h("span", { class: "cx-family-swatch", "aria-hidden": "true", style: `background:${gradient(s)}` }),
      h("span", { class: "cx-family-name" }, s.label),
    );
    b.addEventListener("click", () => hd.pick(s.key));
    return b;
  });
  const el = h(
    "section",
    { class: "cx-panel bp-surface", "aria-label": "The Family", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    h("h2", { class: "cx-panel-title" }, "Nine strange attractors"),
    h("div", { class: "cx-family-grid", role: "group", "aria-label": "Systems" }, ...buttons),
    facts,
    blurb,
  );
  return {
    el,
    set(key) {
      const s = FAMILY.find((f) => f.key === key);
      if (!s) return;
      buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(FAMILY[i]!.key === key)));
      const ps = s.params.map((v, i) => `${s.names[i]} ${Number(v.toFixed(6))}`).join(", ");
      facts.textContent = `${s.label}: ${ps || "no parameters"} · Δt ${s.dt}`;
      blurb.textContent = s.blurb;
    },
  };
}
