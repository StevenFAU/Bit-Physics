// How close a grown organism is to its target (Teach, M2). The same measures
// the training spike and the Menagerie used, so the numbers compare:
//   * IoU: alpha > 0.5 (clamped) against the target's alpha > 0.5;
//   * RGB error: mean RGB distance (clamped) over the target's inside;
//   * "recognisable": IoU ≥ 0.85 grown from one cell at both 96 and 300 steps
//     (the spike's criterion, checked by eye against its snapshots).

export const RECOGNISABLE_IOU = 0.85;
export const CN = 16;

export interface Fit {
  iou: number;
  rgbErr: number;
  /** Cells with alpha > 0.5 outside the target, over the target's area. */
  overgrowth: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Mean fit over `samples` states (cell-major, 16 channels each, G × G) against a G × G RGBA target. */
export function fit(cells: Float32Array, target: Float32Array, G: number, samples: number): Fit {
  const n = G * G;
  let area = 0;
  for (let c = 0; c < n; c += 1) if (target[c * 4 + 3]! > 0.5) area += 1;
  let iou = 0;
  let rgb = 0;
  let over = 0;
  for (let b = 0; b < samples; b += 1) {
    let inter = 0;
    let uni = 0;
    let out = 0;
    let rg = 0;
    for (let c = 0; c < n; c += 1) {
      const o = (b * n + c) * CN;
      const a = clamp01(cells[o + 3]!) > 0.5;
      const t = target[c * 4 + 3]! > 0.5;
      if (a && t) inter += 1;
      if (a || t) uni += 1;
      if (a && !t) out += 1;
      if (t) {
        let d2 = 0;
        for (let k = 0; k < 3; k += 1) {
          const d = clamp01(cells[o + k]!) - target[c * 4 + k]!;
          d2 += d * d;
        }
        rg += Math.sqrt(d2);
      }
    }
    iou += uni > 0 ? inter / uni : 0;
    rgb += rg / Math.max(1, area);
    over += out / Math.max(1, area);
  }
  return { iou: iou / samples, rgbErr: rgb / samples, overgrowth: over / samples };
}

/** IoU of one state (cell-major, 16 channels) with a target, from alpha alone. */
export function iouOf(cells: Float32Array, target: Float32Array, G: number): number {
  return fit(cells, target, G, 1).iou;
}

/** Relative L2 error ‖a − b‖ / ‖b‖, in float64 (the gradient check). */
export function relL2(a: ArrayLike<number>, b: ArrayLike<number>, lo = 0, hi = b.length): number {
  let num = 0;
  let den = 0;
  for (let i = lo; i < hi; i += 1) {
    const d = a[i]! - b[i]!;
    num += d * d;
    den += b[i]! * b[i]!;
  }
  return Math.sqrt(num) / Math.max(Math.sqrt(den), 1e-300);
}
