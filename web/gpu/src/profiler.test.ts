import { describe, expect, it } from "vitest";
import { GpuProfiler } from "./profiler.js";

/** Feed a frame's resolved timestamps (ns pairs) as the staging readback would. */
function frame(p: GpuProfiler, passes: [string, number][]): void {
  const t = new BigUint64Array(passes.length * 2);
  passes.forEach(([, ms], i) => {
    t[i * 2] = 1_000_000n;
    t[i * 2 + 1] = 1_000_000n + BigInt(Math.round(ms * 1e6));
  });
  (p as unknown as { ingest(names: string[], t: BigUint64Array): void }).ingest(
    passes.map(([n]) => n),
    t,
  );
}

describe("GpuProfiler timings", () => {
  // enabled=false never touches the device; ingest is the readback path
  const make = () => new GpuProfiler({} as GPUDevice, false);

  it("reports only the passes of the latest frame after a renderer swap", () => {
    const p = make();
    frame(p, [["sim", 1], ["flat", 2], ["tonemap", 0.5]]);
    frame(p, [["sim", 1], ["surface", 3], ["tonemap", 0.5]]);
    const names = p.timings().map((t) => t.name);
    expect(names).toEqual(["sim", "surface", "tonemap"]);
    const render = p.timings().filter((t) => t.name !== "sim").reduce((a, t) => a + t.ms, 0);
    expect(render).toBeCloseTo(3.5, 9);
  });

  it("keeps a pass's average when it runs again", () => {
    const p = make();
    frame(p, [["flat", 2]]);
    frame(p, [["surface", 3]]);
    frame(p, [["flat", 4]]);
    const flat = p.timings().find((t) => t.name === "flat")!;
    expect(flat.ms).toBeCloseTo(4, 9);
    expect(flat.avg).toBeCloseTo(2.2, 9);
  });

  it("lists a pass once even if a frame ran it twice", () => {
    const p = make();
    frame(p, [["sim", 1], ["sim", 1]]);
    expect(p.timings().map((t) => t.name)).toEqual(["sim"]);
  });
});

describe("GpuProfiler frame tags", () => {
  /** A device whose staging buffers map to one pass of `ms` milliseconds. */
  function fakeDevice(ms: number): GPUDevice {
    const buffer = () => ({
      mapAsync: () => Promise.resolve(),
      getMappedRange: () => new BigUint64Array([1_000_000n, 1_000_000n + BigInt(Math.round(ms * 1e6))]).buffer,
      unmap: () => {},
      destroy: () => {},
    });
    return { createQuerySet: () => ({ destroy: () => {} }), createBuffer: buffer } as unknown as GPUDevice;
  }
  const enc = { resolveQuerySet: () => {}, copyBufferToBuffer: () => {} } as unknown as GPUCommandEncoder;
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("returns the tag a frame began with when its timings land", async () => {
    // Node has no WebGPU globals: the profiler only reads these flag constants
    const g = globalThis as Record<string, unknown>;
    g["GPUBufferUsage"] ??= { MAP_READ: 1, COPY_SRC: 4, COPY_DST: 8, QUERY_RESOLVE: 0x200 };
    g["GPUMapMode"] ??= { READ: 1 };
    const p = new GpuProfiler(fakeDevice(2), true);
    expect(p.frameTag).toBe(0);
    p.begin(3);
    p.pass("sim");
    p.end(enc);
    p.submitted();
    await flush();
    expect(p.frameTag).toBe(3);
    expect(p.timings()[0]!.ms).toBeCloseTo(2, 9);
    p.begin();
    p.pass("sim");
    p.end(enc);
    p.submitted();
    await flush();
    expect(p.frameTag).toBe(0);
  });
});
