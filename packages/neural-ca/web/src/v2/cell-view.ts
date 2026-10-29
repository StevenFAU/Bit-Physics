// Inside the Cell (M1, spec § Scenes: "This is the whole rule"): the
// inspected cell's step, worked on the CPU from its neighbourhood and the
// organism's weights (model/cell-math.ts) — what it senses (48 numbers),
// what the network makes of it (128 units), what changes (16 numbers), the
// coin and the alive check — and a line that checks that arithmetic against
// the GPU's own next step for the same cell.

import { h } from "@bp/studio";
import type { CellReport } from "./app.js";
import { ALIVE, CN, HID } from "./model/cell-math.js";


export interface CellPanel {
  el: HTMLElement;
  set(r: CellReport | null, rate: number, paused: boolean): void;
}

function canvas(w: number, h0: number, label: string): HTMLCanvasElement {
  const c = h("canvas", { width: String(w * 2), height: String(h0 * 2), role: "img", "aria-label": label });
  // width only: the height follows the canvas's own aspect, so a narrow panel shrinks it
  c.style.width = `${w}px`;
  return c;
}

const TEAL = "143, 211, 200";
const CORAL = "240, 140, 110";

/** Signed values as bars about a middle line, one column per value. */
function bars(c: HTMLCanvasElement, rows: Float32Array[], scale: number): void {
  const ctx = c.getContext("2d");
  if (!ctx) return;
  const W = c.width;
  const H = c.height;
  ctx.clearRect(0, 0, W, H);
  const rh = H / rows.length;
  rows.forEach((row, r) => {
    const cw = W / row.length;
    const mid = r * rh + rh / 2;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, mid - 0.5, W, 1);
    for (let i = 0; i < row.length; i += 1) {
      const v = Math.tanh(row[i]! * scale);
      const hh = Math.abs(v) * (rh / 2 - 2);
      ctx.fillStyle = `rgba(${v >= 0 ? TEAL : CORAL}, 0.9)`;
      ctx.fillRect(i * cw + 1.5, v >= 0 ? mid - hh : mid, cw - 3, Math.max(hh, 0.6));
    }
  });
}

export function buildCellPanel(stage: HTMLElement, act: { step: () => void; play: () => void }): CellPanel {
  const title = h("h2", {}, "Inside a cell");
  const status = h("span", { class: "gr-badge" }, "");
  const when = h("span", { class: "gr-cell-when" }, "");
  const nb = canvas(54, 54, "The colours of the cell and its eight neighbours");
  const perc = canvas(208, 66, "48 perception values");
  const senseNote = h("span", { class: "gr-cell-sub" }, "48 numbers");
  const units = canvas(208, 52, "128 hidden units");
  const thinkNote = h("span", { class: "gr-cell-sub" }, "");
  const change = canvas(208, 30, "16 changes");
  const changeNote = h("span", { class: "gr-cell-sub" }, "");
  const liveNote = h("span", { class: "gr-cell-sub" }, "");
  const liveText = h("p", { class: "gr-cell-cap" }, "");
  const check = h("p", { class: "gr-cell-check", role: "status" }, "");
  const stepBtn = h("button", { type: "button", class: "bp-btn" }, "Step once");
  stepBtn.addEventListener("click", () => act.step());
  const playBtn = h("button", { type: "button", class: "bp-btn bp-btn-quiet" }, "Play");
  playBtn.addEventListener("click", () => act.play());
  const legend = (): HTMLElement => h("p", { class: "gr-cell-legend", "aria-hidden": "true" }, h("span", {}, "r g b α"), h("span", {}, "12 hidden"));

  const el = h(
    "section",
    { class: "gr-cell-panel bp-surface", "aria-label": "Inside the cell", "data-bp-chrome": "", "data-bp2": "studio-chrome" },
    h("header", {}, title, status, when),
    h(
      "ol",
      { class: "gr-cell-steps" },
      h(
        "li",
        {},
        h("h3", {}, "Sense ", senseNote),
        h("div", { class: "gr-cell-sense" }, nb, h("div", {}, perc, legend())),
        h("p", { class: "gr-cell-cap" }, "Rows: its own 16 values, then their slopes left–right and up–down across the 3 × 3 cells around it."),
      ),
      h("li", {}, h("h3", {}, "Think ", thinkNote), units, h("p", { class: "gr-cell-cap" }, "128 units, each a weighted sum of the 48 numbers, kept only if positive.")),
      h("li", {}, h("h3", {}, "Change ", changeNote), change, legend()),
      h("li", {}, h("h3", {}, "Live ", liveNote), liveText),
    ),
    check,
    h("div", { class: "gr-cell-actions" }, stepBtn, playBtn),
  );
  stage.append(el);

  return {
    el,
    set(r, rate, paused) {
      playBtn.textContent = paused ? "Play" : "Pause";
      if (!r) {
        title.textContent = "Inside a cell";
        status.textContent = "";
        when.textContent = "";
        check.textContent = "Reading the cell…";
        return;
      }
      const s = r.step;
      title.textContent = `Cell ${s.x}, ${s.y}`;
      status.textContent = s.state[3]! > ALIVE ? "living" : "empty";
      status.className = `gr-badge ${s.state[3]! > ALIVE ? "gr-badge-heals" : "gr-badge-persists"}`;
      when.textContent = `${r.organism} · step ${s.step.toLocaleString()}`;

      // sense: the 3 × 3 colours, then [value, slope x, slope y] × 16
      const ctx = nb.getContext("2d");
      if (ctx && r.block) {
        const b = r.block;
        const W = nb.width / 3;
        ctx.clearRect(0, 0, nb.width, nb.height);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const x = s.x + dx;
            const y = s.y + dy;
            let rgb = [0.05, 0.11, 0.11];
            if (x >= 0 && y >= 0 && x < b.grid && y < b.grid) {
              const o = ((y - b.y0) * b.size + (x - b.x0)) * CN;
              const a = Math.min(1, Math.max(0, b.data[o + 3]!));
              rgb = [0, 1, 2].map((k) => Math.min(1, Math.max(0, b.data[o + k]!)) + (1 - a) * [0.05, 0.11, 0.11][k]!);
            }
            ctx.fillStyle = `rgb(${rgb.map((v) => Math.round(v * 255)).join(",")})`;
            ctx.fillRect((dx + 1) * W + 1, (dy + 1) * W + 1, W - 2, W - 2);
          }
        }
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(W + 1, W + 1, W - 2, W - 2);
      }
      const p = s.perception;
      const rows = [0, 1, 2].map((k) => Float32Array.from({ length: CN }, (_, c) => p[3 * c + k]!));
      bars(perc, rows, 2.5);

      // think: 128 units as a 16 × 8 grid, brightness = activation
      const t = s.think;
      const uc = units.getContext("2d");
      if (uc) {
        uc.clearRect(0, 0, units.width, units.height);
        const max = Math.max(...t.h, 1e-6);
        const cols = 16;
        const cw = units.width / cols;
        const chh = units.height / (HID / cols);
        for (let o = 0; o < HID; o += 1) {
          const x = (o % cols) * cw;
          const y = Math.floor(o / cols) * chh;
          const v = t.h[o]! / max;
          uc.fillStyle = v > 0 ? `rgba(${TEAL}, ${(0.18 + 0.82 * v).toFixed(3)})` : "rgba(255,255,255,0.06)";
          uc.fillRect(x + 1, y + 1, cw - 2, chh - 2);
        }
      }
      thinkNote.textContent = `${t.active} of ${HID} active`;

      // change: dx, applied only on the coin
      bars(change, [t.dx], 25);
      changeNote.textContent = s.fires ? `coin ${s.coin.toFixed(2)} ≤ ${rate}: applied` : `coin ${s.coin.toFixed(2)} > ${rate}: skipped this step`;

      // live: the alive check, before and after
      const lives = s.lives;
      liveNote.textContent = lives ? "it lives" : s.state[3]! > ALIVE || s.maxAlphaBefore > ALIVE ? "it dies" : "nothing here";
      liveText.textContent =
        `Highest opacity in the 3 × 3 cells around it: ${Math.max(0, s.maxAlphaBefore).toFixed(2)} before, ${Math.max(0, s.maxAlphaAfter).toFixed(2)} after. ` +
        `A cell lives only if both are above ${ALIVE}; otherwise all 16 values become 0.`;

      if (r.check) {
        const ok = r.check.maxAbs < 1e-4;
        check.textContent =
          `Checked against your GPU at step ${r.check.tick.toLocaleString()}: the GPU's 16 new values and this page's arithmetic differ by at most ${r.check.maxAbs === 0 ? "0 (identical)" : r.check.maxAbs.toExponential(1)}` +
          (ok ? "." : " — more than rounding; something differs.");
        check.classList.toggle("is-bad", !ok);
      } else {
        check.textContent = paused ? "Press Step once: the GPU steps the dish, and its new values for this cell are compared with this prediction." : "Pause, then Step once to check this arithmetic against the GPU.";
        check.classList.remove("is-bad");
      }
    },
  };
}
