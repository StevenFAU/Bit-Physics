import { describe, expect, it } from "vitest";
import { COMMITTED, NPARAM, fromTrainer, toTrainer } from "../src/v2/teach/layout.js";
import { fit, relL2 } from "../src/v2/teach/metrics.js";
import { schedule } from "../src/v2/teach/trainer.js";

describe("teach/layout", () => {
  it("round-trips the committed layout exactly", () => {
    const w = new Float32Array(NPARAM).map((_, i) => Math.sin(i * 0.37) * 0.1);
    expect(Array.from(fromTrainer(toTrainer(w)))).toEqual(Array.from(w));
  });

  it("places W1, b1 and W2 where the trainer reads them", () => {
    const w = new Float32Array(NPARAM);
    // hidden unit 5, channel 7, filter 2 (sobel-y) in the committed interleaved layout
    w[COMMITTED.w1Off + 5 * 48 + 7 * 3 + 2] = 1;
    w[COMMITTED.b1Off + 9] = 2;
    w[COMMITTED.w2Off + 3 * 128 + 11] = 3; // output channel 3, hidden unit 11
    const v = toTrainer(w);
    expect(v[5 * 48 + 2 * 16 + 7]).toBe(1);
    expect(v[6144 + 9]).toBe(2);
    expect(v[6272 + 11 * 16 + 3]).toBe(3);
    expect(v.reduce((a, b) => a + b, 0)).toBe(6);
  });
});

describe("teach/metrics", () => {
  it("scores a perfect copy as IoU 1, a miss as 0", () => {
    const G = 8;
    const target = new Float32Array(G * G * 4);
    const cells = new Float32Array(G * G * 16);
    for (let c = 0; c < 10; c += 1) {
      target.set([0.5, 0.2, 0.1, 1], c * 4);
      cells.set([0.5, 0.2, 0.1, 1], c * 16);
    }
    expect(fit(cells, target, G, 1)).toEqual({ iou: 1, rgbErr: 0, overgrowth: 0 });
    const away = new Float32Array(G * G * 16);
    away[40 * 16 + 3] = 1;
    const f = fit(away, target, G, 1);
    expect(f.iou).toBe(0);
    expect(f.overgrowth).toBeCloseTo(0.1);
  });

  it("measures relative L2", () => {
    expect(relL2([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(relL2([0, 0], [3, 4])).toBe(1);
  });
});

describe("teach/schedule", () => {
  it("is a pure function of the run seed and iteration", () => {
    const a = schedule(7, 123, 64, 96, 8, 256);
    expect(schedule(7, 123, 64, 96, 8, 256)).toEqual(a);
    expect(a.T).toBeGreaterThanOrEqual(64);
    expect(a.T).toBeLessThanOrEqual(96);
    expect(new Set(a.pool).size).toBe(8);
    expect(schedule(7, 124, 64, 96, 8, 256)).not.toEqual(a);
  });
});
