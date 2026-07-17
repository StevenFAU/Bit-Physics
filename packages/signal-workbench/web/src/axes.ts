// signal-workbench — axes overlay (RENDER layer, display-only, never gated).
// A 2D canvas pinned over the WebGPU view draws the scales the traces are
// silently using: bin k ↔ k·fs/N Hz at the fixed 48 kHz frame mapping —
// the SAME mapping audio.ts uses to derive playback Hz, so what you read
// on the axis is what you hear. Pure geometry mirrored from renderer.ts
// NDC constants; reads nothing from any gated buffer.

import type { ViewMode } from "./renderer.js";

/** AudioBridge's fixed context rate (audio.ts) — the one true Hz mapping. */
export const FS = 48000;

// NDC rectangles mirrored from renderer.ts frame() draw calls. If those
// change, these must follow (probe checks label positions, not just presence).
const SPEC = { x0: -0.96, x1: 0.96, y0: -0.62, y1: 0.92 };
const ERR = { y0: -0.98, y1: -0.66, floor: -160, ceil: 0 };
const SCOPE = { x0: -0.96, x1: 0.96, y0: -0.9, y1: 0.9, yRange: 1.4 };

const TICK = "rgba(159, 178, 200, 0.62)";
const GRID = "rgba(159, 178, 200, 0.10)";
const FONT = "10px ui-monospace, SFMono-Regular, Menlo, monospace";

export interface AxesSpec {
  view: HTMLCanvasElement;
  n: number;
  dbFloor: number;
  dbCeil: number;
}

export function installAxes(spec: AxesSpec): { sync: (mode: ViewMode) => void } {
  const cv = document.createElement("canvas");
  cv.className = "sw-axes";
  // No z-index: all the overlapping elements (stage, EXPLAIN/PROVE panels,
  // settings panel) are positioned with z-index:auto, so DOM order decides
  // the paint order. Inserting right after the stage keeps the labels above
  // the WebGPU canvas but under everything installed later.
  cv.style.cssText = "position:fixed;pointer-events:none;";
  const stage = spec.view.closest(".bps-stage");
  if (stage?.parentElement) stage.parentElement.insertBefore(cv, stage.nextSibling);
  else document.body.appendChild(cv);
  const c = cv.getContext("2d");

  let lastMode: ViewMode | null = null;
  let dirty = true;
  window.addEventListener("resize", () => {
    dirty = true;
  });
  new ResizeObserver(() => {
    dirty = true;
  }).observe(spec.view);

  const nyquist = FS / 2;

  const draw = (mode: ViewMode, w: number, h: number): void => {
    if (!c) return;
    c.clearRect(0, 0, w, h);
    c.font = FONT;
    const px = (ndc: number): number => ((ndc + 1) / 2) * w;
    const py = (ndc: number): number => ((1 - ndc) / 2) * h;
    const line = (x0: number, y0: number, x1: number, y1: number, color: string): void => {
      c.strokeStyle = color;
      c.beginPath();
      c.moveTo(x0 + 0.5, y0 + 0.5);
      c.lineTo(x1 + 0.5, y1 + 0.5);
      c.stroke();
    };

    /** Frequency ticks: minor every 2 kHz, labeled major every 4 kHz. */
    const freqAxis = (ax0: number, ax1: number, gridTop: number, gridBot: number, labelY: number): void => {
      for (let f = 0; f <= nyquist; f += 2000) {
        const x = Math.round(px(ax0 + (f / nyquist) * (ax1 - ax0)));
        const major = f % 4000 === 0;
        if (major) line(x, py(gridTop), x, py(gridBot), GRID);
        line(x, py(gridBot), x, py(gridBot) + (major ? 5 : 3), TICK);
        if (major) {
          c.fillStyle = TICK;
          c.textAlign = f === 0 ? "left" : f === nyquist ? "right" : "center";
          c.fillText(f === nyquist ? `${f / 1000} kHz` : String(f / 1000), x, labelY);
        }
      }
    };

    /** dB ticks every 20, labeled every 40, over an NDC y-region. */
    const dbAxis = (ry0: number, ry1: number, floor: number, ceil: number, labelX: number, gx0: number, gx1: number): void => {
      for (let db = Math.ceil(floor / 20) * 20; db <= ceil; db += 20) {
        const t = (db - floor) / (ceil - floor);
        const y = Math.round(py(ry0 + t * (ry1 - ry0)));
        const major = db % 40 === 0;
        if (major) line(px(gx0), y, px(gx1), y, GRID);
        if (major) {
          c.fillStyle = TICK;
          c.textAlign = "left";
          c.fillText(db === 0 ? "0 dB" : String(db), labelX, y - 3);
        }
      }
    };

    if (mode === "spectrum") {
      freqAxis(SPEC.x0, SPEC.x1, SPEC.y1, SPEC.y0, py(SPEC.y0) + 13);
      dbAxis(SPEC.y0, SPEC.y1, spec.dbFloor, spec.dbCeil, px(SPEC.x0) + 3, SPEC.x0, SPEC.x1);
      // error strip: its own dB scale (renderer pins -160..0 for this trace)
      c.fillStyle = TICK;
      c.textAlign = "right";
      c.fillText("measured − exact (dB, 0 → −160)", px(0.96) - 2, py(ERR.y1) + 11);
      line(px(SPEC.x0), py(ERR.y1) - 2, px(0.96), py(ERR.y1) - 2, GRID);
    } else if (mode === "scope") {
      const totalMs = ((spec.n - 1) / FS) * 1000; // count-1 spans x0..x1
      for (let ms = 0; ms <= totalMs; ms += 10) {
        const x = Math.round(px(SCOPE.x0 + (ms / totalMs) * (SCOPE.x1 - SCOPE.x0)));
        const major = ms % 20 === 0;
        if (major) line(x, py(SCOPE.y1), x, py(SCOPE.y0), GRID);
        line(x, py(SCOPE.y0), x, py(SCOPE.y0) + (major ? 5 : 3), TICK);
        if (major) {
          c.fillStyle = TICK;
          c.textAlign = ms === 0 ? "left" : "center";
          c.fillText(ms >= 80 ? `${ms} ms` : String(ms), x, py(SCOPE.y0) + 15);
        }
      }
      for (const v of [-1, 0, 1]) {
        const t = v / (2 * SCOPE.yRange) + 0.5;
        const y = Math.round(py(SCOPE.y0 + t * (SCOPE.y1 - SCOPE.y0)));
        line(px(SCOPE.x0), y, px(SCOPE.x1), y, GRID);
        c.fillStyle = TICK;
        c.textAlign = "left";
        c.fillText(v > 0 ? `+${v}` : String(v), px(SCOPE.x0) + 3, y - 3);
      }
    } else if (mode === "spectrogram") {
      freqAxis(-1, 1, 1, -1, h - 6);
      c.fillStyle = TICK;
      c.textAlign = "left";
      c.fillText("newest ↑", 6, 14);
      c.fillText("time scrolls ↓", 6, 26);
    } else if (mode === "persistence") {
      freqAxis(-1, 1, 1, -1, h - 6);
      dbAxis(-1, 1, spec.dbFloor, spec.dbCeil, 6, -1, 1);
    }
    // xy: the beam is the display — no scales to draw
  };

  const sync = (mode: ViewMode): void => {
    if (!dirty && mode === lastMode) return;
    const r = spec.view.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.left = `${r.left}px`;
    cv.style.top = `${r.top}px`;
    cv.style.width = `${r.width}px`;
    cv.style.height = `${r.height}px`;
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    c?.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(mode, r.width, r.height);
    lastMode = mode;
    dirty = false;
  };

  return { sync };
}

/** Nearest equal-tempered pitch name for a frequency, e.g. "A4 +2¢". */
export function pitchName(hz: number): string {
  if (!(hz >= 20) || hz > 20000) return "";
  const NOTES = ["A", "A♯", "B", "C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯"];
  const n = Math.round(12 * Math.log2(hz / 440));
  const exact = 440 * 2 ** (n / 12);
  const cents = Math.round(1200 * Math.log2(hz / exact));
  const name = `${NOTES[((n % 12) + 12) % 12]}${4 + Math.floor((n + 9) / 12)}`;
  return Math.abs(cents) < 3 ? name : `${name} ${cents > 0 ? "+" : "−"}${Math.abs(cents)}¢`;
}
