// `createContext()` rejects cleanly when WebGPU is unavailable. The
// happy path (real GPU adapter) is local-only.

import { describe, expect, it } from "vitest";

import { createContext } from "../context.js";

describe("createContext", () => {
  it.each([
    ["navigator is absent", undefined],
    ["navigator.gpu is undefined", { gpu: undefined }],
    ["navigator.gpu is null", { gpu: null }],
  ])("throws a clear error when %s", async (_label, navigator) => {
    // In Node `navigator` is a read-only getter; redefine the property
    // via defineProperty for the duration of the test.
    const before = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    try {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        writable: true,
        value: navigator,
      });
      await expect(createContext()).rejects.toThrow(/navigator\.gpu is unavailable/);
    } finally {
      if (before !== undefined) {
        Object.defineProperty(globalThis, "navigator", before);
      } else {
        // No prior descriptor: drop the override entirely.
        delete (globalThis as { navigator?: unknown }).navigator;
      }
    }
  });

  it.skip("returns a DeviceContext on a real GPU (local only)", () => {
    // Local-only per spec section 7.8.
  });
});
