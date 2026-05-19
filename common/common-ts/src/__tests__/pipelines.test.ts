// Sanity tests for the pipeline surface that don't need a real GPU.
// WebGPU-device tests live behind `it.skip(...)` in this file; flip to
// `it(...)` for local smoke checks.

import { describe, expect, it } from "vitest";

import { ComputePipeline } from "../pipelines.js";

describe("ComputePipeline", () => {
  it("exposes a static create + instance dispatch surface", () => {
    expect(typeof ComputePipeline.create).toBe("function");
    expect(typeof ComputePipeline.prototype.dispatch).toBe("function");
    expect(typeof ComputePipeline.prototype.reload).toBe("function");
    expect(typeof ComputePipeline.prototype.onReload).toBe("function");
  });

  it.skip("compiles a trivial WGSL kernel on a real GPU (local only)", () => {
    // Marked skip-in-CI per spec section 7.8. Local runs with a real
    // adapter (Linux Mesa, Windows DirectX, macOS Metal) exercise this.
  });
});
