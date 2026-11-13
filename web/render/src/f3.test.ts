// Unit tests for the 3D layer's CPU-side math (F3). The GPU paths run in the
// browser under each 3D sim's acceptance script (Chaos first).
import { describe, expect, it } from "vitest";
import { MAX_CASTERS, STUDIO_DARK, DAYLIGHT, packEnvironment } from "./environment.js";
import { icosphere, packLods, pickLod } from "./mesh.js";
import { OrbitCamera, mul4 } from "./orbit-camera.js";
import { splatFootprint } from "./points.js";
import { ringSlot, ringSlotAtAge } from "./ribbons.js";
import {
  frustumPlanes,
  identity4,
  invert4,
  projectedRadiusPx,
  similarity,
  sphereInFrustum,
  transform4,
} from "./view3d.js";

const cam = (): OrbitCamera => {
  const c = new OrbitCamera();
  c.setViewport(1280, 720);
  c.setHome({ yaw: 0.7, pitch: 0.25, distance: 3, target: [0, 0, 0] });
  return c;
};

describe("view3d", () => {
  it("inverts a view-projection matrix", () => {
    const c = cam();
    const m = c.viewProjection();
    const inv = invert4(m)!;
    const id = mul4(m, inv);
    const ref = identity4();
    for (let i = 0; i < 16; i += 1) expect(id[i]!).toBeCloseTo(ref[i]!, 4);
  });

  it("a similarity maps Lorenz z-up coordinates into the y-up world, scaled and centred", () => {
    // x -> x, y -> -z, z -> y (a proper rotation), scale 1/25, z = 23.5 to the origin
    const s = 1 / 25;
    const m = similarity(s, [1, 0, 0], [0, 0, -1], [0, 1, 0], [0, -23.5 * s, 0]);
    const p = transform4(m, [0, 0, 23.5]);
    for (const v of p.slice(0, 3)) expect(v).toBeCloseTo(0, 6);
    const q = transform4(m, [10, 5, 23.5 + 25]);
    expect(q[0]).toBeCloseTo(0.4, 6);
    expect(q[1]).toBeCloseTo(1, 6);
    expect(q[2]).toBeCloseTo(-0.2, 6);
    // proper: det of the rotation part is +s³
    const det =
      m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);
    expect(det).toBeCloseTo(s ** 3, 9);
  });

  it("frustum planes keep what projects inside the view and reject what does not", () => {
    const c = cam();
    const m = c.viewProjection();
    const planes = frustumPlanes(m);
    expect(planes).toHaveLength(6);
    for (const p of planes) expect(Math.hypot(p[0], p[1], p[2])).toBeCloseTo(1, 9);
    // the target is inside, a point far behind the eye is not
    expect(sphereInFrustum(planes, [0, 0, 0], 0.01)).toBe(true);
    const e = c.eye();
    const behind: [number, number, number] = [e[0] * 3, e[1] * 3, e[2] * 3];
    expect(sphereInFrustum(planes, behind, 0.01)).toBe(false);
    // random points: inside the planes <=> projects into NDC with w > 0 and z in [0, 1]
    let checked = 0;
    for (let i = 0; i < 2000; i += 1) {
      const p: [number, number, number] = [
        Math.sin(i * 12.9898) * 4,
        Math.sin(i * 78.233) * 4,
        Math.sin(i * 39.425) * 4,
      ];
      const [x, y, z, w] = transform4(m, p);
      const inClip = w > 0 && Math.abs(x / w) <= 1 && Math.abs(y / w) <= 1 && z / w >= 0 && z / w <= 1;
      const margin = Math.min(...planes.map((pl) => pl[0] * p[0] + pl[1] * p[1] + pl[2] * p[2] + pl[3]));
      if (Math.abs(margin) < 1e-6) continue;
      expect(margin >= 0).toBe(inClip);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1900);
  });

  it("a sphere straddling a plane is kept; one just outside is culled", () => {
    const c = cam();
    const planes = frustumPlanes(c.viewProjection());
    // walk right along the camera's screen x until the centre leaves the view
    const r = c.ray(1280 + 200, 360);
    const p: [number, number, number] = [r.origin[0] + r.dir[0] * 3, r.origin[1] + r.dir[1] * 3, r.origin[2] + r.dir[2] * 3];
    const dist = -(planes[1]![0] * p[0] + planes[1]![1] * p[1] + planes[1]![2] * p[2] + planes[1]![3]);
    expect(dist).toBeGreaterThan(0);
    expect(sphereInFrustum(planes, p, dist * 0.9)).toBe(false);
    expect(sphereInFrustum(planes, p, dist * 1.1)).toBe(true);
  });

  it("projected radius matches the projected screen size near the view centre", () => {
    const c = cam();
    const m = c.viewProjection();
    const r = 0.05;
    const [, , , w] = transform4(m, [0, 0, 0]);
    const est = projectedRadiusPx(r, w, c.projection()[5]!, 720);
    // measure: project a point offset along the camera's up vector
    const [, y0] = c.project([0, 0, 0]);
    const up = c.ray(640, 360 - 10);
    const toward: [number, number, number] = [up.dir[0] - c.ray(640, 360).dir[0], up.dir[1] - c.ray(640, 360).dir[1], up.dir[2] - c.ray(640, 360).dir[2]];
    const l = Math.hypot(...toward);
    const [, y1] = c.project([(toward[0] / l) * r, (toward[1] / l) * r, (toward[2] / l) * r]);
    expect(Math.abs(y1 - y0)).toBeCloseTo(est, 0);
    expect(projectedRadiusPx(r, 0, 1, 720)).toBe(Infinity);
  });
});

describe("mesh", () => {
  it("icospheres have 20·4^k faces on the unit sphere with outward unit normals", () => {
    for (const k of [0, 1, 2, 3]) {
      const m = icosphere(k);
      expect(m.indices.length / 3).toBe(20 * 4 ** k);
      expect(m.vertices.length / 6).toBe(10 * 4 ** k + 2);
      for (let i = 0; i < m.vertices.length; i += 6) {
        expect(Math.hypot(m.vertices[i]!, m.vertices[i + 1]!, m.vertices[i + 2]!)).toBeCloseTo(1, 6);
      }
      // counter-clockwise from outside: each face normal points away from the centre
      for (let f = 0; f < m.indices.length; f += 3) {
        const v = [0, 1, 2].map((j) => m.indices[f + j]! * 6);
        const a = [0, 1, 2].map((c) => m.vertices[v[0]! + c]!);
        const b = [0, 1, 2].map((c) => m.vertices[v[1]! + c]!);
        const cc = [0, 1, 2].map((c) => m.vertices[v[2]! + c]!);
        const e1 = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
        const e2 = [cc[0]! - a[0]!, cc[1]! - a[1]!, cc[2]! - a[2]!];
        const n = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
        expect(n[0]! * a[0]! + n[1]! * a[1]! + n[2]! * a[2]!).toBeGreaterThan(0);
      }
    }
  });

  it("packs a LOD chain with index ranges and base vertices", () => {
    const lods = [icosphere(2), icosphere(1), icosphere(0)];
    const p = packLods(lods);
    expect(p.ranges.map((r) => r.indexCount)).toEqual(lods.map((m) => m.indices.length));
    expect(p.ranges[1]!.firstIndex).toBe(lods[0]!.indices.length);
    expect(p.ranges[2]!.baseVertex).toBe((lods[0]!.vertices.length + lods[1]!.vertices.length) / 6);
    expect(p.vertices.length).toBe(lods.reduce((n, m) => n + m.vertices.length, 0));
  });

  it("picks the finest level a projected radius reaches", () => {
    expect(pickLod(40, [24, 8])).toBe(0);
    expect(pickLod(24, [24, 8])).toBe(0);
    expect(pickLod(10, [24, 8])).toBe(1);
    expect(pickLod(2, [24, 8])).toBe(2);
    expect(pickLod(2, [])).toBe(0);
  });
});

describe("points", () => {
  it("the splat footprint is the integral of (1 − ρ²)² over the capsule", () => {
    for (const [r, len] of [
      [1, 0],
      [2.5, 0],
      [1.5, 12],
      [4, 3],
    ] as const) {
      // numerical integral on a fine grid
      const h = 0.01;
      let sum = 0;
      for (let x = -r; x <= len + r; x += h) {
        for (let y = -r; y <= r; y += h) {
          const t = Math.min(Math.max(x, 0), len);
          const d = Math.hypot(x - t, y) / r;
          if (d < 1) sum += (1 - d * d) ** 2 * h * h;
        }
      }
      expect(sum / splatFootprint(r, len)).toBeCloseTo(1, 2);
    }
  });
});

describe("ribbons", () => {
  it("ring slots wrap and ages count back from the head", () => {
    expect([0, 1, 2, 3, 4].map((i) => ringSlot(i, 4))).toEqual([0, 1, 2, 3, 0]);
    expect(ringSlotAtAge(1, 0, 4)).toBe(1);
    expect(ringSlotAtAge(1, 1, 4)).toBe(0);
    expect(ringSlotAtAge(1, 2, 4)).toBe(3);
    expect(ringSlotAtAge(1, 5, 4)).toBe(0);
  });
});

describe("environment", () => {
  it("packs the look into the uniform layout the shader reads", () => {
    const d = packEnvironment(DAYLIGHT, 99);
    expect(d.length).toBe(32);
    expect(Math.hypot(d[12]!, d[13]!, d[14]!)).toBeCloseTo(1, 6);
    expect(d[21]).toBe(1); // ground on
    expect(d[28]).toBe(1); // sky mode
    expect(d[29]).toBe(MAX_CASTERS); // casters clamp
    const s = packEnvironment(STUDIO_DARK, 0);
    expect(s[21]).toBe(0);
    expect(s[28]).toBe(0);
  });
});
