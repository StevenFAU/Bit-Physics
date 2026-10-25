// The Territories card (02-physarum.md § Scenes, "Territories"): who holds
// the dish, measured on this run — each colony's share of the dish (by
// 32-cell tiles: a tile is the colony's with the most trail there for its own
// mean), its agents, and the borders — beside the colony controls: each
// colony's personality (or the shared one from Tune), the rivalry, and how
// many colonies.

import type { Tier } from "@bp/gpu";
import { h, segmented, slider } from "@bp/studio";
import type { TerritoryReading } from "./app.js";
import type { PadPoint } from "./pad.js";
import { CORNERS, PAD_CENTRE, padKey, stablePoints } from "./pad.js";
import { COLONIES } from "./render/look.js";

export interface TerritoryCard {
  el: HTMLElement;
  /** Show the card (territories) or hide it. */
  setShown(on: boolean): void;
  /** The colony controls as they stand (count, each colony's personality, the rivalry). */
  /** `shared`: the shared personality's short name (what "Shared" colonies follow). */
  sync(pads: (PadPoint | null)[], rivalry: number, tier: Tier, mixed: boolean, shared: string): void;
  set(t: TerritoryReading | null): void;
  onPad: (k: number, p: PadPoint | null) => void;
  onRivalry: (v: number, phase: "start" | "move" | "end") => void;
  onCount: (n: number) => void;
  onMixed: (mixed: boolean) => void;
}

const pct = (v: number): string => `${Math.round(v * 100)}%`;

/** Personalities a colony can take on a tier: the named corners and the middle that are offered there. */
function choices(tier: Tier, current: PadPoint | null, shared: string): { key: string; label: string; p: PadPoint | null }[] {
  const offered = stablePoints(tier);
  const out: { key: string; label: string; p: PadPoint | null }[] = [{ key: "", label: `Tune's (${shared})`, p: null }];
  const named = [...CORNERS.map((c) => ({ p: c.at, label: c.name })), { p: PAD_CENTRE, label: "Middle" }];
  for (const n of named) if (offered.has(padKey(n.p))) out.push({ key: padKey(n.p), label: n.label, p: n.p });
  if (current && !out.some((o) => o.key === padKey(current))) {
    out.push({ key: padKey(current), label: `Pad ${current.i + 1}, ${current.j + 1}`, p: current });
  }
  return out;
}

export function buildTerritoryCard(): TerritoryCard {
  const title = h("h2", { id: "ph-terr-title" }, "Territories");
  const sub = h("p", { class: "ph-score-sub" }, "measured on your run");
  const rows = h("div", { class: "ph-terr-rows" });
  const border = h("p", { class: "ph-terr-line" }, "");
  const verdict = h("p", { class: "ph-score-verdict", role: "status" }, "");
  const rivalry = slider({
    label: "Rivalry",
    min: 0,
    max: 2,
    step: 0.05,
    value: 1,
    hint: "How hard each colony shuns the others' trails (0: not at all).",
    onInput: (v) => {
      card.onRivalry(v, sliding ? "move" : "start");
      sliding = true;
    },
    onCommit: (v) => {
      if (!sliding) card.onRivalry(v, "start");
      card.onRivalry(v, "end");
      sliding = false;
    },
  });
  let sliding = false;
  const count = segmented(
    "Colonies",
    [
      { value: "2", label: "2", title: "Two colonies (starts again from the same seed)" },
      { value: "3", label: "3", title: "Three colonies (starts again from the same seed)" },
      { value: "4", label: "4", title: "Four colonies (starts again from the same seed)" },
    ],
    "3",
    (v) => card.onCount(Number(v)),
  );
  const start = segmented(
    "Start",
    [
      { value: "apart", label: "Apart", title: "Each colony released from its own spot on a sleeping dish: they race to recruit the sleepers (starts again)" },
      { value: "mixed", label: "Mixed", title: "Every agent dealt to a colony at random, all over the dish: the rivalry sorts them (starts again)" },
    ],
    "apart",
    (v) => card.onMixed(v === "mixed"),
  );
  const fold = h("button", { type: "button", class: "ph-score-fold", "aria-expanded": "true", "aria-controls": "ph-terr-main" }, "Territories");
  const main = h(
    "div",
    { id: "ph-terr-main" },
    h("div", { class: "ph-score-head" }, title, sub),
    rows,
    border,
    verdict,
    rivalry.el,
    h(
      "div",
      { class: "ph-terr-setup" },
      h("span", { class: "ph-tune-label" }, "Colonies"),
      count.el,
      h("span", { class: "ph-tune-label" }, "Start"),
      start.el,
    ),
  );
  const el = h("section", { class: "ph-score ph-terr bp-surface", "aria-labelledby": "ph-terr-title", hidden: true }, fold, main);
  let bars: { held: HTMLElement; heldText: HTMLElement; agents: HTMLElement; agentsText: HTMLElement }[] = [];
  let key = "";

  const card: TerritoryCard = {
    el,
    setShown(on) {
      el.hidden = !on;
      if (!on) key = "";
    },
    sync(pads, riv, tier, mixed, shared) {
      rivalry.set(riv);
      count.set(String(pads.length) as "2" | "3" | "4");
      start.set(mixed ? "mixed" : "apart");
      const k = `${tier}|${shared}|${pads.map((p) => (p ? padKey(p) : "-")).join(";")}`;
      if (k === key) return;
      key = k;
      rows.textContent = "";
      bars = pads.map((p, i) => {
        const c = COLONIES[i]!;
        const sel = h("select", { class: "ph-terr-select", "aria-label": `${c.name} colony's personality` }) as HTMLSelectElement;
        for (const o of choices(tier, p, shared)) sel.append(h("option", { value: o.key }, o.label));
        sel.value = p ? padKey(p) : "";
        sel.addEventListener("change", () => {
          const o = choices(tier, p, shared).find((x) => x.key === sel.value);
          card.onPad(i, o?.p ?? null);
        });
        const held = h("span", { class: "ph-terr-fill" });
        const agents = h("span", { class: "ph-terr-fill is-agents" });
        held.style.background = c.css;
        agents.style.background = c.css;
        const heldText = h("span", { class: "ph-terr-num" }, "—");
        const agentsText = h("span", { class: "ph-terr-num" }, "—");
        rows.append(
          h(
            "div",
            { class: "ph-terr-row" },
            h("div", { class: "ph-terr-name" }, h("span", { class: "ph-terr-dot", "aria-hidden": "true", style: `background:${c.css}` }), h("span", {}, c.name), sel),
            h("div", { class: "ph-terr-bar" }, h("span", { class: "ph-terr-what" }, "Dish"), h("span", { class: "ph-terr-track", "aria-hidden": "true" }, held), heldText),
            h("div", { class: "ph-terr-bar" }, h("span", { class: "ph-terr-what" }, "Agents"), h("span", { class: "ph-terr-track", "aria-hidden": "true" }, agents), agentsText),
          ),
        );
        return { held, heldText, agents, agentsText };
      });
      card.set(null);
    },
    set(t) {
      if (!t) {
        sub.textContent = "measured on your run";
        for (const b of bars) {
          b.held.style.width = "0";
          b.agents.style.width = "0";
          b.heldText.textContent = "—";
          b.agentsText.textContent = "—";
        }
        border.textContent = "";
        verdict.textContent = "Reading the dish…";
        return;
      }
      sub.textContent = `measured on your run · step ${t.tick.toLocaleString()}`;
      const cells = t.shares.cells;
      const totalAgents = t.agents.reduce((a, b) => a + b, 0);
      t.shares.held.forEach((v, i) => {
        const b = bars[i];
        if (!b) return;
        b.held.style.width = pct(v / cells);
        b.heldText.textContent = pct(v / cells);
        const a = t.agents[i] ?? 0;
        b.agents.style.width = totalAgents > 0 ? pct(a / totalAgents) : "0";
        b.agentsText.textContent = totalAgents > 0 ? pct(a / totalAgents) : "—";
      });
      const held = t.shares.held.reduce((a, b) => a + b, 0);
      border.textContent = `Borders (two colonies present): ${pct(t.shares.border / cells)} of the dish · unclaimed: ${pct(1 - held / cells)}`;
      const order = t.shares.held.map((v, i) => [v, i] as const).sort((a, b) => b[0] - a[0]);
      const [top, second] = [order[0], order[1]];
      if (!top || top[0] === 0) {
        verdict.textContent = "The colonies are still waking.";
      } else if (second && top[0] - second[0] < 0.02 * cells) {
        verdict.textContent = `Neck and neck: ${COLONIES[top[1]]!.name} ${pct(top[0] / cells)}, ${COLONIES[second[1]]!.name} ${pct(second[0] / cells)} of the dish.`;
      } else {
        verdict.textContent = `${COLONIES[top[1]]!.name} holds the most dish: ${pct(top[0] / cells)}.`;
      }
    },
    onPad: () => {},
    onRivalry: () => {},
    onCount: () => {},
    onMixed: () => {},
  };
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
