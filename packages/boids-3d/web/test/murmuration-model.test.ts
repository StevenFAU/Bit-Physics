// Murmuration v2 — the pure code (packages/boids-3d/web/src/v2): the live
// model's uniforms and seeded flock, the brute-force twin sharing everything
// but the search, the falcon's limits and scripted determinism, the alarm
// wave's estimator on a synthetic flock, the observables' eigenvalues, the
// watcher's camera, and the gate's f64 Reynolds mirror against the committed
// 3-agent golden. GPU work is exercised in the browser by v2-acceptance.mjs
// and the release gate.
import { describe, expect, it } from "vitest";
import golden from "../../../../tools/testkit/golden/tables/agent-based/boids-3agent-step1.json";
import stepSrc from "../src/v2/model/murmur.wgsl?raw";
import { FALCON, Falcon, turnTowards } from "../src/v2/model/falcon.js";
import { AGENT_BYTES, MURMURATION, NO_TOOL, cellCount, decodeStats, gridFor, packParams, seedFlock, symEig3 } from "../src/v2/model/flock.js";
import { measureWave } from "../src/v2/model/wave.js";
import { GroundCamera } from "../src/v2/render/ground-camera.js";
import { PARAMS, flockStep64 } from "../src/v2/proof/gate.js";

describe("the live model", () => {
  it("packs each step's own uniforms", () => {
    const g = gridFor(1.25);
    const out = new ArrayBuffer(256);
    packParams(out, 0, 1000, g, MURMURATION, { step: 777, falcon: { position: [1, 2, 3], velocity: [4, 5, 6] }, tool: { ...NO_TOOL, code: 4 } }, 1 / 120);
    const u = new Uint32Array(out);
    const f = new Float32Array(out);
    expect([...u.slice(0, 4)]).toEqual([1000, cellCount(g), g.dims[0], g.dims[1]]);
    expect(u[4]).toBe(g.dims[2]);
    expect(u[5]).toBe(Math.ceil(MURMURATION.reach / 1.25) + 1);
    expect(u[6]).toBe(777);
    expect(u[7]).toBe(1 | (4 << 8));
    expect(f[13]).toBeCloseTo(MURMURATION.reach ** 2, 5);
    expect(f[25]).toBeCloseTo(777 / 120, 4);
    expect([...f.slice(32, 35)]).toEqual([1, 2, 3]);
    expect([...u.slice(40, 43)]).toEqual([MURMURATION.directDelay, MURMURATION.contagionDelay, MURMURATION.refractory]);
    // no falcon: the flag is clear
    packParams(out, 0, 1000, g, MURMURATION, { step: 1, falcon: null, tool: NO_TOOL });
    expect(u[7]).toBe(0);
  });

  it("seeds a dense, polarized flock, deterministically", () => {
    const a = seedFlock(4000, MURMURATION, 9);
    const b = seedFlock(4000, MURMURATION, 9);
    expect(a.byteLength).toBe(4000 * AGENT_BYTES);
    const x = new Uint8Array(a);
    const y = new Uint8Array(b);
    let same = x.length === y.length;
    for (let i = 0; same && i < x.length; i += 1) same = x[i] === y[i];
    expect(same).toBe(true);
    const f = new Float32Array(a);
    const u = new Uint32Array(a);
    let hx = 0, hy = 0, hz = 0;
    for (let i = 0; i < 4000; i += 1) {
      expect(u[i * 16 + 12]).toBe(i);
      expect(u[i * 16 + 14]).toBe(0xffffffff);
      expect(Math.hypot(f[i * 16 + 4]!, f[i * 16 + 5]!, f[i * 16 + 6]!)).toBeCloseTo(1, 5);
      hx += f[i * 16 + 4]!; hy += f[i * 16 + 5]!; hz += f[i * 16 + 6]!;
    }
    expect(Math.hypot(hx, hy, hz) / 4000).toBeGreaterThan(0.95);
  });

  it("the brute-force twin shares everything but the search", () => {
    const grid = stepSrc.slice(stepSrc.indexOf("fn step("));
    const brute = stepSrc.slice(stepSrc.indexOf("fn step_brute("));
    expect(grid).toContain("search_grid(i,");
    expect(brute).toContain("search_brute(i,");
    for (const body of [grid.slice(0, grid.indexOf("fn step_brute(")), brute]) {
      expect(body).toContain("reset_selection();");
      expect(body).toContain("finish(i);");
    }
    // both searches select through the same `consider`
    expect(stepSrc.match(/consider\(i, /g)?.length).toBe(2);
    // the gated rule: no builtin trig in the selection
    const consider = stepSrc.slice(stepSrc.indexOf("fn consider("), stepSrc.indexOf("fn search_grid("));
    expect(consider).not.toMatch(/\b(sin|cos|exp|atan)\(/);
  });
});

describe("the falcon", () => {
  it("turns no faster than its limit and keeps to its speeds", () => {
    const t = turnTowards([0, 0, -1], [1, 0, 0], 0.1);
    expect(Math.acos(-t[2])).toBeCloseTo(0.1, 6);
    expect(turnTowards([0, 0, -1], [0, 0, -1], 0.1)).toEqual([0, 0, -1]);
    const f = new Falcon();
    f.mode = "player";
    f.input = { aim: [100, 30, 60], yaw: 0, pitch: 0, stoop: true };
    let h = f.heading;
    for (let i = 0; i < 600; i += 1) {
      f.advance(1 / 120, i);
      const turned = Math.acos(Math.min(1, h[0] * f.heading[0] + h[1] * f.heading[1] + h[2] * f.heading[2]));
      expect(turned).toBeLessThanOrEqual(FALCON.turn / 120 + 1e-9);
      expect(f.speed).toBeLessThanOrEqual(FALCON.stoop);
      expect(f.speed).toBeGreaterThanOrEqual(FALCON.slowest);
      h = f.heading;
    }
  });

  it("flies a script the same way every time", () => {
    const run = (): number[] => {
      const f = new Falcon();
      f.mode = "script";
      f.position = [40, 20, 10];
      f.script = { start: 100, points: [[40, 20, 10], [0, 0, 0], [0, 0, 0], [-30, -5, -20], [-50, 15, -30]] };
      for (let s = 100; s < 1300; s += 1) f.advance(1 / 120, s);
      return [...f.position, ...f.heading, f.speed];
    };
    expect(run()).toEqual(run());
  });
});

describe("the alarm wave's estimator", () => {
  it("recovers a known speed from a synthetic wave with two sightings", () => {
    const n = 2000;
    const state = new ArrayBuffer(n * AGENT_BYTES);
    const f = new Float32Array(state);
    const u = new Uint32Array(state);
    const v = 10; // units/s
    const dt = 1 / 120;
    for (let i = 0; i < n; i += 1) {
      const b = i * 16;
      if (i < 2) {
        // two direct sightings, 6 units apart, the second 0.2 s later
        f.set([i * 6, 0, 0], b);
        u[b + 14] = (1000 + i * 24) | 0x80000000;
        continue;
      }
      const ang = (i * 2.399) % (2 * Math.PI);
      const r = 2 + (i % 40) * 0.5;
      f.set([Math.cos(ang) * r, Math.sin(ang) * r, 0], b);
      // reached from the first sighting at speed v
      u[b + 14] = 1000 + Math.round(r / v / dt);
    }
    const w = measureWave(state, 1500, dt)!;
    expect(w.alarmed).toBe(n);
    expect(w.direct).toBe(2);
    expect(Math.abs(w.speed - v) / v).toBeLessThan(0.05);
  });

  it("needs a wave to measure", () => {
    const state = new ArrayBuffer(100 * AGENT_BYTES);
    new Uint32Array(state).fill(0xffffffff);
    expect(measureWave(state, 100, 1 / 120)).toBeNull();
  });
});

describe("observables", () => {
  it("symEig3 matches known spectra", () => {
    expect(symEig3(3, 2, 1, 0, 0, 0)).toEqual([3, 2, 1]);
    // a repeated eigenvalue: the closed form's acos loses about half the digits there
    const [a, b, c] = symEig3(2, 2, 3, 1, 0, 0); // eigenvalues 3, 3, 1
    expect(a).toBeCloseTo(3, 6);
    expect(b).toBeCloseTo(3, 6);
    expect(c).toBeCloseTo(1, 10);
    const e = symEig3(4, 5, 6, 1, 0.5, 0.25);
    expect(e[0] + e[1] + e[2]).toBeCloseTo(15, 10);
    expect(e[0]).toBeGreaterThanOrEqual(e[1]);
    expect(e[1]).toBeGreaterThanOrEqual(e[2]);
  });

  it("decodeStats reads v1's rows and the shape rows", () => {
    const v = new Float32Array(32);
    v.set([1, 2, 3, 0.9], 0); // centroid, polarization
    v.set([5, 0.1, 7, 0.04], 4); // speed, alert, neighbours, roll²
    v.set([0, 0, 1, 100], 8); // heading, count
    v.set([0.5, 30, 4, 0], 12); // milling, radius, vertical
    v.set([100 * 400, 100 * 100, 100 * 25, 100], 16); // Σ centred xx yy zz, count
    v.set([0, 0, 0, 0], 20);
    v.set([150, 100, 2500, 0], 24); // Σ nnd, with one, Σ speed²
    const s = decodeStats(v)!;
    expect(s.polarization).toBeCloseTo(0.9);
    expect(s.axes).toEqual([400, 100, 25]);
    expect(s.thickness).toBe(5);
    expect(s.nnd).toBe(1.5);
    expect(s.isolated).toBe(0);
    expect(decodeStats(new Float32Array(32).fill(NaN))).toBeNull();
  });
});

describe("the watcher's camera", () => {
  it("turns the head without moving the eye; dolly walks along the ground", () => {
    const c = new GroundCamera();
    c.setViewport(1280, 720);
    c.setHome({ eye: [0, 1, 125], yaw: 0, pitch: 0.3, fov: 0.9 });
    const eye0 = c.eye();
    c.panBy(200, -50);
    for (let i = 0; i < 60; i += 1) c.update(1 / 60);
    expect(c.eye()).toEqual(eye0);
    expect(c.yaw).not.toBe(0);
    c.fit();
    c.reducedMotion = true;
    c.update(1);
    expect(c.yaw).toBe(0);
    c.dolly(10);
    expect(c.eye()[2]).toBeCloseTo(115, 10);
    expect(c.eye()[1]).toBe(1);
  });

  it("zooms the field of view within its limits; the centre ray is the gaze", () => {
    const c = new GroundCamera();
    c.reducedMotion = true;
    c.setViewport(800, 600);
    c.setHome({ eye: [0, 1, 0], yaw: 0.4, pitch: 0.2, fov: 0.9 });
    c.zoomAt(100, 0, 0);
    expect(c.fovY).toBeCloseTo(c.minFov, 10);
    const r = c.ray(400, 300);
    const f = c.forward();
    for (let i = 0; i < 3; i += 1) expect(r.dir[i]).toBeCloseTo(f[i]!, 10);
  });

  it("follows a target only when idle, never under reduced motion, never below its least pitch", () => {
    const c = new GroundCamera();
    c.setViewport(800, 600);
    c.setHome({ eye: [0, 1, 0], yaw: 0, pitch: 0.2, fov: 0.9 });
    c.followTarget = [50, 40, -100];
    for (let i = 0; i < 600; i += 1) c.update(1 / 60, 1e9 + i * 16);
    expect(c.yaw).toBeLessThan(-0.3);
    c.followTarget = [0, 2, -100];
    for (let i = 0; i < 1200; i += 1) c.update(1 / 60, 2e9 + i * 16);
    expect(c.pitch).toBeGreaterThanOrEqual(c.followMinPitch - 1e-6);
    const d = new GroundCamera();
    d.reducedMotion = true;
    d.setHome({ eye: [0, 1, 0], yaw: 0, pitch: 0.2, fov: 0.9 });
    d.followTarget = [50, 40, -100];
    for (let i = 0; i < 600; i += 1) d.update(1 / 60, 1e9 + i * 16);
    expect(d.yaw).toBe(0);
  });
});

describe("the gate's f64 mirror", () => {
  it("reproduces the committed 3-agent golden (boids_3d.reference.step_one)", () => {
    const tp = (golden as { test_points: { inputs: { agents: Record<string, { p: number[]; v: number[] }>; params: Record<string, number> }; expected: Record<string, { v_new: number[]; p_new: number[] }> }[] }).test_points[0]!;
    expect(tp.inputs.params["perception_radius"]).toBe(PARAMS.perception);
    expect(tp.inputs.params["dt"]).toBe(PARAMS.dt);
    const names = Object.keys(tp.inputs.agents).sort();
    const p = new Float64Array(names.flatMap((n) => tp.inputs.agents[n]!.p));
    const v = new Float64Array(names.flatMap((n) => tp.inputs.agents[n]!.v));
    flockStep64(p, v);
    names.forEach((n, i) => {
      for (let k = 0; k < 3; k += 1) {
        expect(v[i * 3 + k]).toBeCloseTo(tp.expected[n]!.v_new[k]!, 12);
        expect(p[i * 3 + k]).toBeCloseTo(tp.expected[n]!.p_new[k]!, 12);
      }
    });
  });
});
