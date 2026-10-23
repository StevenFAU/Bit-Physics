import { describe, expect, it } from "vitest";
import { Camera2D } from "./camera2d.js";

const cam = (vw: number, vh: number, dw: number, dh: number, periodic = false): Camera2D => {
  const c = new Camera2D();
  c.reducedMotion = true;
  c.setViewport(vw, vh);
  c.setDomain(dw, dh, periodic);
  c.fit(1);
  return c;
};

describe("Camera2D", () => {
  it("cover fit leaves no letterbox at any aspect", () => {
    for (const [vw, vh] of [[390, 844], [820, 1180], [1440, 900], [2560, 1080]] as const) {
      const c = cam(vw, vh, 1024, 640);
      const [x0, y0, x1, y1] = c.viewRect();
      expect(x0).toBeGreaterThanOrEqual(-1e-6);
      expect(y0).toBeGreaterThanOrEqual(-1e-6);
      expect(x1).toBeLessThanOrEqual(1024 + 1e-6);
      expect(y1).toBeLessThanOrEqual(640 + 1e-6);
    }
  });

  it("screen ↔ domain round-trips and zoomAt keeps the cursor point fixed", () => {
    const c = cam(1440, 900, 1296, 808);
    const p = c.screenToDomain(300, 200);
    const s = c.domainToScreen(p[0], p[1]);
    expect(s[0]).toBeCloseTo(300, 9);
    expect(s[1]).toBeCloseTo(200, 9);
    c.zoomAt(3, 300, 200);
    const q = c.screenToDomain(300, 200);
    expect(q[0]).toBeCloseTo(p[0], 6);
    expect(q[1]).toBeCloseTo(p[1], 6);
  });

  it("bounds a non-periodic domain and wraps a periodic one", () => {
    const c = cam(800, 600, 512, 512);
    c.panBy(-100000, 0);
    expect(c.viewRect()[2]).toBeLessThanOrEqual(512 * 1.07);
    const p = cam(800, 600, 512, 512, true);
    p.panBy(-100000, 0);
    expect(p.cx).toBeGreaterThanOrEqual(0);
    expect(p.cx).toBeLessThan(512);
  });
});
