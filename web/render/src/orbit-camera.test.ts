import { describe, expect, it } from "vitest";
import { OrbitCamera, dot3, sub3 } from "./orbit-camera.js";

const cam = (): OrbitCamera => {
  const c = new OrbitCamera();
  c.setViewport(1200, 800);
  c.setHome({ yaw: 0.4, pitch: 0.3, distance: 4, target: [0, 0, 0] });
  return c;
};

const settle = (c: OrbitCamera, seconds = 3): void => {
  for (let t = 0; t < seconds; t += 1 / 60) c.update(1 / 60, 0);
};

describe("OrbitCamera", () => {
  it("projects the target to the centre of the screen and back along the centre ray", () => {
    const c = cam();
    const [x, y, w] = c.project(c.target);
    expect(x).toBeCloseTo(600, 4);
    expect(y).toBeCloseTo(400, 4);
    expect(w).toBeGreaterThan(0);
    const r = c.ray(600, 400);
    const toTarget = sub3(c.target, r.origin);
    const d = Math.hypot(...toTarget);
    expect(dot3(r.dir, toTarget) / d).toBeCloseTo(1, 9);
    expect(d).toBeCloseTo(4, 9);
  });

  it("a screen point's ray passes through the world point that projects there", () => {
    const c = cam();
    const p: [number, number, number] = [0.3, -0.2, 0.5];
    const [sx, sy] = c.project(p);
    const r = c.ray(sx, sy);
    const v = sub3(p, r.origin);
    const t = dot3(v, r.dir);
    const miss = Math.hypot(v[0] - r.dir[0] * t, v[1] - r.dir[1] * t, v[2] - r.dir[2] * t);
    expect(miss).toBeLessThan(1e-5);
  });

  it("a drag orbits, damped towards the goal; the wheel dollies within limits", () => {
    const c = cam();
    c.panBy(-100, 0);
    expect(c.yaw).toBeCloseTo(0.4, 9); // nothing moves until update()
    settle(c);
    expect(c.yaw).toBeCloseTo(0.4 + 100 * c.orbitSpeed, 4);
    c.zoomAt(1e6, 0, 0);
    settle(c);
    expect(c.distance).toBeCloseTo(c.minDistance, 4);
    c.zoomAt(1e-6, 0, 0);
    settle(c);
    expect(c.distance).toBeCloseTo(c.maxDistance, 4);
  });

  it("pitch is clamped, and a ground keeps the eye above the floor", () => {
    const c = cam();
    c.panBy(0, 1e5);
    settle(c);
    expect(c.pitch).toBeCloseTo(c.maxPitch, 4);
    c.ground = -0.5;
    c.panBy(0, -1e6);
    settle(c);
    expect(c.eye()[1]).toBeGreaterThanOrEqual(-0.5);
  });

  it("double-click (fit) returns home; saved views recall", () => {
    const c = cam();
    c.reducedMotion = true;
    c.panBy(200, -50);
    c.saveView("side");
    c.fit(1, true);
    expect(c.yaw).toBeCloseTo(0.4, 9);
    expect(c.distance).toBeCloseTo(4, 9);
    expect(c.recallView("side")).toBe(true);
    expect(c.yaw).toBeCloseTo(0.4 - 200 * c.orbitSpeed, 9);
    expect(c.recallView("missing")).toBe(false);
  });

  it("the turntable turns only when idle, and never under reduced motion", () => {
    const c = cam();
    c.autoRotate = 0.5;
    c.autoRotateDelay = 0;
    c.update(1, 10_000);
    settle(c, 0);
    expect(c.state().yaw).toBeGreaterThan(0.4);
    const r = cam();
    r.autoRotate = 0.5;
    r.autoRotateDelay = 0;
    r.reducedMotion = true;
    r.update(1, 10_000);
    expect(r.yaw).toBeCloseTo(0.4, 12);
    expect(r.state().yaw).toBeCloseTo(0.4, 12);
  });

  it("a fling keeps orbiting and decays; reduced motion has no inertia", () => {
    const c = cam();
    c.fling(500, 0);
    settle(c, 4);
    const moved = c.yaw - 0.4;
    expect(moved).toBeLessThan(0);
    settle(c, 4);
    expect(c.yaw - 0.4).toBeCloseTo(moved, 2);
    const r = cam();
    r.reducedMotion = true;
    r.fling(500, 0);
    settle(r);
    expect(r.yaw).toBeCloseTo(0.4, 12);
  });
});
