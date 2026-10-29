// The Teach target (M2; spec § Signature moment 2): what the visitor draws.
// A 40 × 40 box in the middle of the 64 × 64 dish (12 cells of agar on every
// side, the Menagerie's targets' geometry), painted at 4 × 4 supersampling
// so a stroke's edge is antialiased — a box low-pass, the same as the
// Menagerie's targets. The brush is never thinner than 1.5 cells: thin lines
// are hard to learn. Output is premultiplied RGBA on a transparent field, the
// convention the trainer's loss and the dish renderer read.

export const SIZE = 40;
export const PAD = 12;
export const GRID = SIZE + 2 * PAD;
const SS = 4;
const N = SIZE * SS;
/** Thinnest brush (cells radius). */
export const MIN_BRUSH = 1.5;

export interface Swatch {
  id: string;
  name: string;
  rgb: [number, number, number];
}

export const SWATCHES: readonly Swatch[] = [
  { id: "leaf", name: "Leaf green", rgb: [0.36, 0.74, 0.24] },
  { id: "sun", name: "Sun yellow", rgb: [1.0, 0.8, 0.18] },
  { id: "coral", name: "Coral", rgb: [0.96, 0.45, 0.32] },
  { id: "sky", name: "Sky blue", rgb: [0.3, 0.62, 0.95] },
  { id: "violet", name: "Violet", rgb: [0.6, 0.42, 0.9] },
  { id: "rose", name: "Rose", rgb: [0.95, 0.5, 0.72] },
  { id: "bone", name: "Bone", rgb: [0.93, 0.9, 0.82] },
  { id: "ink", name: "Ink", rgb: [0.12, 0.1, 0.12] },
];

export interface TargetCheck {
  /** Cells more than half covered. */
  cells: number;
  /** Separate shapes (4-connected groups of those cells). */
  parts: number;
  /** Covered cells with an uncovered 4-neighbour, over all covered cells (1 = all edge: thin lines). */
  edgeShare: number;
  /** Sentences for the visitor, worst first; empty when it looks learnable. */
  warnings: string[];
}

export class TargetPad {
  /** Coverage and straight colour at 4 × 4 supersampling. */
  private readonly a = new Float32Array(N * N);
  private readonly rgb = new Float32Array(N * N * 3);
  version = 0;

  clear(): void {
    this.a.fill(0);
    this.rgb.fill(0);
    this.version += 1;
  }

  get empty(): boolean {
    return !this.a.some((v) => v > 0);
  }

  /**
   * Paint (or erase) a stroke segment from (x0, y0) to (x1, y1), in dish cells
   * (the box is [PAD, PAD + SIZE) on both axes), radius r cells.
   */
  stroke(x0: number, y0: number, x1: number, y1: number, r: number, color: [number, number, number] | null): void {
    const rad = Math.max(MIN_BRUSH, r) * SS;
    const ax = (x0 - PAD) * SS;
    const ay = (y0 - PAD) * SS;
    const bx = (x1 - PAD) * SS;
    const by = (y1 - PAD) * SS;
    const vx = bx - ax;
    const vy = by - ay;
    const l2 = vx * vx + vy * vy;
    const lo = (v: number): number => Math.max(0, Math.floor(v - rad - 1));
    const hi = (v: number): number => Math.min(N - 1, Math.ceil(v + rad + 1));
    let touched = false;
    for (let y = lo(Math.min(ay, by)); y <= hi(Math.max(ay, by)); y += 1) {
      for (let x = lo(Math.min(ax, bx)); x <= hi(Math.max(ax, bx)); x += 1) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = l2 > 1e-9 ? Math.min(1, Math.max(0, ((px - ax) * vx + (py - ay) * vy) / l2)) : 0;
        if (Math.hypot(px - (ax + vx * t), py - (ay + vy * t)) > rad) continue;
        const i = y * N + x;
        if (color) {
          this.a[i] = 1;
          this.rgb.set(color, i * 3);
        } else {
          this.a[i] = 0;
        }
        touched = true;
      }
    }
    if (touched) this.version += 1;
  }

  /**
   * Replace the drawing with an image's pixels (straight RGBA bytes, w × h,
   * covering the dish's 64 × 64 when `full`, else the 40 × 40 box). Nearest
   * sampling onto the supersampled pad; alpha below 8/255 is empty agar.
   */
  setImage(data: Uint8ClampedArray, w: number, h: number, full: boolean, premultiplied = false): void {
    const span = full ? GRID : SIZE;
    const off = full ? PAD : 0;
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const gx = (x + 0.5) / SS + off;
        const gy = (y + 0.5) / SS + off;
        const sx = Math.min(w - 1, Math.floor((gx / span) * w));
        const sy = Math.min(h - 1, Math.floor((gy / span) * h));
        const o = (sy * w + sx) * 4;
        const al = data[o + 3]! / 255;
        const i = y * N + x;
        if (al < 8 / 255) {
          this.a[i] = 0;
          continue;
        }
        this.a[i] = al;
        for (let k = 0; k < 3; k += 1) this.rgb[i * 3 + k] = Math.min(1, (data[o + k]! / 255) / (premultiplied ? al : 1));
      }
    }
    this.version += 1;
  }

  /** The target: GRID × GRID premultiplied RGBA (the box averaged from the supersampled pad). */
  rgba(): Float32Array<ArrayBuffer> {
    const out = new Float32Array(GRID * GRID * 4);
    const w = 1 / (SS * SS);
    for (let cy = 0; cy < SIZE; cy += 1) {
      for (let cx = 0; cx < SIZE; cx += 1) {
        let a = 0;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let sy = 0; sy < SS; sy += 1) {
          for (let sx = 0; sx < SS; sx += 1) {
            const i = (cy * SS + sy) * N + cx * SS + sx;
            const al = this.a[i]!;
            a += al;
            r += this.rgb[i * 3]! * al;
            g += this.rgb[i * 3 + 1]! * al;
            b += this.rgb[i * 3 + 2]! * al;
          }
        }
        const o = ((cy + PAD) * GRID + cx + PAD) * 4;
        out[o] = r * w;
        out[o + 1] = g * w;
        out[o + 2] = b * w;
        out[o + 3] = a * w;
      }
    }
    return out;
  }

  /** The target as dish cells (16 channels: RGBA, hidden channels zero) — how the drawing shows on the dish. */
  cells(): Float32Array<ArrayBuffer> {
    const t = this.rgba();
    const s = new Float32Array(GRID * GRID * 16);
    for (let c = 0; c < GRID * GRID; c += 1) s.set(t.subarray(c * 4, c * 4 + 4), c * 16);
    return s;
  }
}

/** Is this target learnable? Coverage, separate parts and thinness of a GRID × GRID RGBA target. */
export function checkTarget(rgba: Float32Array, G = GRID): TargetCheck {
  const on = new Uint8Array(G * G);
  let cells = 0;
  for (let i = 0; i < G * G; i += 1) {
    if (rgba[i * 4 + 3]! > 0.5) {
      on[i] = 1;
      cells += 1;
    }
  }
  // 4-connected parts
  const seen = new Uint8Array(G * G);
  let parts = 0;
  let big = 0;
  const stack: number[] = [];
  for (let i = 0; i < G * G; i += 1) {
    if (!on[i] || seen[i]) continue;
    parts += 1;
    let size = 0;
    stack.push(i);
    seen[i] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      size += 1;
      const x = k % G;
      const y = (k - x) / G;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const j = ny * G + nx;
        if (on[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    if (size >= 4) big += 1;
  }
  let edge = 0;
  for (let i = 0; i < G * G; i += 1) {
    if (!on[i]) continue;
    const x = i % G;
    const y = (i - x) / G;
    const out = (nx: number, ny: number): boolean => nx < 0 || ny < 0 || nx >= G || ny >= G || !on[ny * G + nx];
    if (out(x + 1, y) || out(x - 1, y) || out(x, y + 1) || out(x, y - 1)) edge += 1;
  }
  const edgeShare = cells > 0 ? edge / cells : 1;
  const warnings: string[] = [];
  if (cells === 0) warnings.push("Nothing to learn yet — paint a shape inside the square.");
  else if (cells < 60) warnings.push(`Only ${cells} cells are covered. Bigger shapes learn better: aim for a few hundred.`);
  if (big > 1) warnings.push(`The drawing is ${big} separate parts. Growth starts from one cell, so it may learn only one of them — join them up.`);
  if (cells >= 60 && edgeShare > 0.6) warnings.push("Most of the drawing is thin lines. Thicker strokes learn much better.");
  return { cells, parts: big, edgeShare, warnings };
}
