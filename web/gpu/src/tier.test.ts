import { describe, expect, it } from "vitest";
import { guessTier, lowerTier } from "./tier.js";

const ctx = (vendor: string, architecture = "", software = false) => ({
  info: { vendor, architecture, device: "", description: "", software },
});
const desk = { coarsePointer: false, screenMin: 1080 };

describe("capability tiers", () => {
  it("guesses from the adapter and the screen", () => {
    expect(guessTier(ctx("amd", "rdna-2"), desk)).toBe("T3");
    expect(guessTier(ctx("intel", "gen-12lp"), desk)).toBe("T2");
    expect(guessTier(ctx("apple", "metal-3"), desk)).toBe("T2");
    expect(guessTier(ctx("mesa", "llvmpipe", true), desk)).toBe("T1");
    expect(guessTier(ctx("qualcomm", "adreno"), { coarsePointer: true, screenMin: 412 })).toBe("T1");
  });

  it("steps down and stops at T1", () => {
    expect(lowerTier("T3")).toBe("T2");
    expect(lowerTier("T1")).toBe("T1");
  });
});
