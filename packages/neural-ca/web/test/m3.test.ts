import { describe, expect, it } from "vitest";
import { MAX_RULES, stackRules } from "../src/v2/model/chimera.js";
import type { MenagerieManifest } from "../src/v2/model/organisms.js";
import { OrganismLibrary } from "../src/v2/model/organisms.js";
import { rgbStats } from "../src/v2/model/textures.js";
import type { Checkpoint } from "../src/v2/proof/gate.js";
import manifest from "../public/menagerie/menagerie.json";

const ck = (fill: number, n = 8320, offs = [0, 128, 6272]): Checkpoint => ({
  weights: new Float32Array(n).fill(fill),
  b1Off: offs[0]!,
  w1Off: offs[1]!,
  w2Off: offs[2]!,
  sha256: "",
});

describe("Chimera's rules", () => {
  it("stacks the rules back to back in the committed layout (rule r starts at r × 8,320)", () => {
    const s = stackRules([ck(1), ck(2), ck(3)]);
    expect(s.weights.length).toBe(3 * 8320);
    expect([s.weights[0], s.weights[8320], s.weights[2 * 8320], s.weights[3 * 8320 - 1]]).toEqual([1, 2, 3, 3]);
    expect([s.b1Off, s.w1Off, s.w2Off]).toEqual([0, 128, 6272]);
  });
  it("refuses rules in another layout, none, or more than the overlay counts", () => {
    expect(() => stackRules([ck(1), ck(2, 8000)])).toThrow();
    expect(() => stackRules([ck(1), ck(2, 8320, [0, 129, 6272])])).toThrow();
    expect(() => stackRules([])).toThrow();
    expect(() => stackRules(Array.from({ length: MAX_RULES + 1 }, (_, i) => ck(i)))).toThrow();
  });
  it("pairs every healer with the next healer, never itself", () => {
    const m = manifest as unknown as MenagerieManifest;
    const disk = m.organisms.find((o) => o.gated)!;
    const lib = new OrganismLibrary(m, { ...ck(0), sha256: disk.sha256 });
    const ids = lib.healers.map((d) => d.id);
    expect(ids.length).toBeGreaterThan(2);
    ids.forEach((id, i) => expect(lib.partnerFor(id)).toBe(ids[(i + 1) % ids.length]));
    expect(lib.partnerFor(disk.id)).not.toBe(disk.id);
  });
});

describe("Textures' colour statistics", () => {
  it("are the displayed colour's (channels 0–2 + 0.5, clamped), per channel", () => {
    // two cells: (−0.5, 0, 0.7) → (0, 0.5, 1); (0.5, −1, 0.1) → (1, 0, 0.6)
    const st = new Float32Array(32);
    st.set([-0.5, 0, 0.7], 0);
    st.set([0.5, -1, 0.1], 16);
    const { mean, std } = rgbStats(st, 2);
    expect(mean.map((v) => +v.toFixed(5))).toEqual([0.5, 0.25, 0.8]);
    expect(std.map((v) => +v.toFixed(5))).toEqual([0.5, 0.25, 0.2]);
  });
});
