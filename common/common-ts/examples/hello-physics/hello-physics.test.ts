// hello-physics smoke-sim acceptance tests.
//
// The determinism test (V1) is the load-bearing instance of the new
// content-equivalent contract (spec § 2.5; sub-phase-capture-determinism-
// contract): two runs at the same seed on the same hardware MUST produce
// content-equivalent captures, where "content-equivalent" means every
// state array and every diagnostic entry in the parsed Capture matches
// element-wise. Wall-clock-influenced storage-format metadata (HDF5
// object-header timestamps) is explicitly excluded from the comparison
// via the harness in ``common/common-ts/src/determinism/``.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import h5wasmNode from "h5wasm/node";

import {
  runTwiceAndDiff,
  type DeterminismVerdict,
  type SimRunner,
} from "../../src/determinism/index.js";
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
  it("is content-equivalent across two runs at the same seed", async () => {
    // Wrap runHelloPhysics into the SimRunner contract. The harness passes
    // the same seed on both invocations (the determinism claim is over
    // same-seed reproducibility); the wrapper forwards it through
    // ``params`` so the sim's internal RNG is re-seeded each call.
    const runner: SimRunner = async ({ seed, outDir }) => {
      const r = await runHelloPhysics({ params: { seed }, outDir });
      return r.manifestPath;
    };

    const verdict: DeterminismVerdict = await runTwiceAndDiff(runner, {
      seed: DEFAULT_PARAMS.seed,
      tmpDir: workdir,
    });
    expect(verdict.contentEquivalent).toBe(true);
    expect(verdict.detail).toBe("captures match exactly");
  });

  it("FAILS the content-equivalence gate on a broken-determinism runner (R-D2 spot-check)", async () => {
    // R-D2 mitigation per charter § 9: each refactored test must preserve
    // the failure-mode-on-bug witness. A SimRunner whose output drifts
    // across calls (here: varying step count between invocations) MUST
    // produce ``verdict.contentEquivalent === false``. The contract surface
    // must be at least as strong as the byte-equality surface it replaces.
    let counter = 0;
    const brokenRunner: SimRunner = async ({ outDir }) => {
      counter += 1;
      const r = await runHelloPhysics({ steps: 19 + counter, outDir });
      return r.manifestPath;
    };

    const verdict = await runTwiceAndDiff(brokenRunner, {
      seed: DEFAULT_PARAMS.seed,
      tmpDir: workdir,
    });
    expect(verdict.contentEquivalent).toBe(false);
    // The detail string is either a step-count mismatch (mismatched
    // step lengths) or a state-array mismatch (max_abs_err > 0); both
    // are valid failure shapes.
    expect(verdict.detail).not.toBe("captures match exactly");
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
