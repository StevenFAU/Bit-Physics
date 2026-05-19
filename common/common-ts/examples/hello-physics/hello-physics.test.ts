// hello-physics smoke-sim acceptance tests.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import h5wasmNode from "h5wasm/node";

import { runHelloPhysics } from "./run.js";
import { DEFAULT_PARAMS, gaussianAtTime } from "./heat-equation.js";

let workdir = "";
beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "hello-physics-"));
});
afterEach(() => {
  if (workdir !== "") rmSync(workdir, { recursive: true, force: true });
});

describe("hello-physics", () => {
  it("is bit-deterministic across two runs at the same seed", async () => {
    const a = await runHelloPhysics({ outDir: resolve(workdir, "a") });
    const b = await runHelloPhysics({ outDir: resolve(workdir, "b") });
    const payloadA = readFileSync(resolve(dirname(a.manifestPath), "hello-physics.h5"));
    const payloadB = readFileSync(resolve(dirname(b.manifestPath), "hello-physics.h5"));
    expect(payloadA.equals(payloadB)).toBe(true);
  });

  it("matches the analytical Gaussian closed form within FTCS truncation error", async () => {
    const steps = 20;
    const result = await runHelloPhysics({ steps, outDir: resolve(workdir, "ref") });
    const payloadPath = resolve(dirname(result.manifestPath), "hello-physics.h5");

    interface H5File {
      get(p: string): { value?: ArrayLike<number> } | null;
      close(): void;
    }
    interface H5Access {
      ready: Promise<unknown>;
      File: new (path: string, mode: "r") => H5File;
    }
    const h5 = h5wasmNode as unknown as H5Access;
    await h5.ready;
    const file = new h5.File(payloadPath, "r");
    try {
      const stepIdx = steps;
      const dset = file.get(`steps/${stepIdx.toString()}/state/U`);
      const got = Array.from(dset?.value ?? []);
      const t = DEFAULT_PARAMS.dt * stepIdx;
      const expected = gaussianAtTime(t, DEFAULT_PARAMS);
      expect(got.length).toBe(expected.length);
      // FTCS truncation error is O(dx^2) + O(dt); for sigma0=0.05 and
      // 20 steps of dt=1e-4 the relative L_inf error sits well under 5%.
      let maxAbs = 0;
      for (let i = 0; i < expected.length; i += 1) {
        const e = expected[i] ?? 0;
        const g = got[i] ?? 0;
        const diff = Math.abs(e - g);
        if (diff > maxAbs) maxAbs = diff;
      }
      expect(maxAbs).toBeLessThan(0.05);
    } finally {
      file.close();
    }
  });
});
