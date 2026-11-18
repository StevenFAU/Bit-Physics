// Murmuration v2 — the pure code (packages/boids-3d/web/src/v2): the live
// model's port of v1 (the seeded flock and the uniforms byte for byte against
// v1's engine), the brute-force twin's text transform, the observables'
// eigenvalues, the watcher's camera, and the gate's f64 Reynolds mirror
// against the committed 3-agent golden. GPU work is exercised in the browser
// by v2-acceptance.mjs and the release gate.
import { describe, expect, it } from "vitest";
import golden from "../../../../tools/testkit/golden/tables/agent-based/boids-3agent-step1.json";
import { MurmurationEngine, PRESETS } from "../src/engine.js";
import starlingWgsl from "../src/starling.wgsl?raw";
import { AGENT_BYTES, CELL_COUNT, NO_TOOL, bruteSource, decodeStats, packParams, presetById, seedFlock, symEig3 } from "../src/v2/model/flock.js";
import { GroundCamera } from "../src/v2/render/ground-camera.js";
import { PARAMS, flockStep64 } from "../src/v2/proof/gate.js";

/** Index of the first differing byte, or -1 (toEqual on large typed arrays is slow). */
function firstDiff(a: ArrayBuffer, b: ArrayBuffer): number {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  if (x.length !== y.length) return Math.min(x.length, y.length);
  for (let i = 0; i < x.length; i += 1) if (x[i] !== y[i]) return i;
  return -1;
}

/** Run one of v1's engine methods on a stand-in `this` that records writeBuffer. */
function v1Call(method: "reset" | "writeParams", self: Record<string, unknown>, ...args: unknown[]): ArrayBuffer[] {
  const writes: ArrayBuffer[] = [];
  const proto = MurmurationEngine.prototype as unknown as Record<string, unknown>;
  const fake = {
    ...self,
    toolCode: proto["toolCode"],
    queue: { writeBuffer: (_b: unknown, _o: number, data: ArrayBuffer | ArrayBufferView) => writes.push(data instanceof ArrayBuffer ? data.slice(0) : (data.buffer as ArrayBuffer).slice(0)) },
    agents: [{}, {}],
    params: {},
    stats: { centroid: [0, 0, 0] },
  };
  (MurmurationEngine.prototype as unknown as Record<string, (...a: unknown[]) => void>)[method]!.apply(fake, args);
  return writes;
}

describe("the live model is v1's", () => {
  it("seedFlock reproduces v1's reset() byte for byte, for every preset", () => {
    for (const preset of PRESETS) {
      for (const seed of [1, 42, 123456]) {
        const v1 = v1Call("reset", { agentCount: 3000, preset }, seed);
        const v2 = seedFlock(3000, preset, seed);
        expect(v2.byteLength).toBe(3000 * AGENT_BYTES);
        expect(firstDiff(v2, v1[0]!)).toBe(-1);
      }
    }
  });

  it("packParams reproduces v1's writeParams byte for byte (its own frame and time)", () => {
    const tool = { mode: "gust", position: [3, 4, 5], direction: [0.2, 0.9, 0.1], radius: 21, strength: 2.5, active: true };
    for (const preset of PRESETS) {
      const v1 = v1Call("writeParams", { agentCount: 32768, tool, preset, frameIndex: 777, simulationTime: 6.475 }, 1 / 120);
      const out = new ArrayBuffer(176);
      packParams(out, 0, 32768, preset, { code: 4, position: [3, 4, 5], direction: [0.2, 0.9, 0.1], radius: 21, strength: 2.5 }, 777, 6.475);
      expect(firstDiff(out, v1[0]!)).toBe(-1);
    }
    // and with no tool held, v1 writes tool code 0
    const v1 = v1Call("writeParams", { agentCount: 10, tool: { ...tool, active: false }, preset: PRESETS[0], frameIndex: 0, simulationTime: 0 }, 1 / 120);
    const out = new ArrayBuffer(176);
    packParams(out, 0, 10, PRESETS[0]!, { ...NO_TOOL, position: [3, 4, 5], direction: [0.2, 0.9, 0.1], radius: 21, strength: 2.5 }, 0, 0);
    expect(firstDiff(out, v1[0]!)).toBe(-1);
  });

  it("the grid is v1's: 24 × 12 × 24 cells", () => {
    expect(CELL_COUNT).toBe(6912);
    expect(presetById("nope").label).toBe("starling");
  });
});

describe("the brute-force twin", () => {
  const brute = bruteSource(starlingWgsl);
  it("replaces only the 27-cell candidate loop", () => {
    expect(brute).not.toContain("sorted_index[begin + slot]");
    expect(brute).not.toContain("for (var dz = -1");
    expect(brute).toContain("for (var j = 0u; j < p.counts.x; j += 1u) {");
    // everything before the loop and after it is unchanged
    const head = starlingWgsl.indexOf("  for (var dz = -1;");
    expect(brute.slice(0, head)).toBe(starlingWgsl.slice(0, head));
    const tail = "  var alignment = vec3<f32>(0.0);";
    expect(brute.slice(brute.indexOf(tail))).toBe(starlingWgsl.slice(starlingWgsl.indexOf(tail)));
    // the candidate body is carried over character for character
    const body = starlingWgsl.slice(starlingWgsl.indexOf("          if (j == i) { continue; }"), starlingWgsl.indexOf("          best_id[insert] = j;"));
    expect(brute).toContain(body);
    const opens = (brute.match(/\{/g) ?? []).length;
    const closes = (brute.match(/\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it("refuses a kernel whose loop changed shape", () => {
    expect(() => bruteSource(starlingWgsl.replace("for (var dz = -1;", "for (var dz = -2;"))).toThrow(/changed shape/);
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

  it("follows a target only when idle and never under reduced motion", () => {
    const c = new GroundCamera();
    c.setViewport(800, 600);
    c.setHome({ eye: [0, 1, 0], yaw: 0, pitch: 0.2, fov: 0.9 });
    c.followTarget = [50, 40, -100];
    for (let i = 0; i < 600; i += 1) c.update(1 / 60, 1e9 + i * 16);
    expect(c.yaw).toBeLessThan(-0.3);
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
