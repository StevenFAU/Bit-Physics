import { describe, expect, it } from "vitest";
import { chimeraKernelSource, liveKernelSource, textureKernelSource } from "../src/v2/model/live-kernel.js";

// The committed gated kernel, as the page imports it (proof/gate.ts KERNEL_WGSL).
const raw = import.meta.glob<string>("../../typescript/src/nca_inference.wgsl", { eager: true, query: "?raw", import: "default" });
const gated = Object.values(raw)[0]!;

const scenes = import.meta.glob<string>("../src/v2/model/{chimera,texture}.wgsl", { eager: true, query: "?raw", import: "default" });

const kernels = [
  { name: "liveKernelSource", source: gated, build: liveKernelSource, channels: 16, bound: "CN", offset: "" },
  { name: "chimeraKernelSource", source: scenes["../src/v2/model/chimera.wgsl"]!, build: chimeraKernelSource, channels: 16, bound: "CN", offset: "wb + " },
  { name: "textureKernelSource", source: scenes["../src/v2/model/texture.wgsl"]!, build: textureKernelSource, channels: 12, bound: "CH", offset: "" },
];

describe.each(kernels)("$name", ({ source, build, channels, bound, offset }) => {
  const live = build(source);

  it("writes out the two inner loops of the committed kernel and leaves no other loop body changed", () => {
    expect(live).not.toContain("j < PERC");
    expect(live).not.toContain("dx[c] = dx[c]");
    // the loops it keeps: perception (c), the hidden units (o), dx init and the writes (c), mask's alive (dy, dx)
    const loops = (s: string): number => s.split("for (var ").length - 1;
    expect(loops(source) - loops(live)).toBe(2);
  });

  it("sums w1 · perception in order, j = 0 … 47, one term per line", () => {
    const terms = [...live.matchAll(/acc = acc \+ weights\[row \+ (\d+)u\] \* perc\[(\d+)\];/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(terms).toEqual(Array.from({ length: 48 }, (_, j) => [j, j]));
  });

  it("accumulates every output channel in order, inside the h != 0 branch", () => {
    const at = live.indexOf("if (h != 0.0) {");
    const block = live.slice(at, live.indexOf("    }\n", at));
    // Check the bank offset before normalizing it for the index-order assertion.
    expect(block.match(/weights\[wb \+ P\.w2_off/g) ?? []).toHaveLength(offset ? channels : 0);
    const normalized = block.replaceAll("weights[" + offset, "weights[");
    const terms = [...normalized.matchAll(/dx\[(\d+)\] = dx\[(\d+)\] \+ weights\[P\.w2_off \+ (\d+)u \* HID \+ o\] \* h;/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
    expect(terms).toEqual(Array.from({ length: channels }, (_, c) => [c, c, c]));
  });

  it("keeps every other byte of the source kernel", () => {
    // Undo both rewrites: the result must be the original committed source.
    const back = live
      .replace(/(    acc = acc \+ weights\[row \+ \d+u\] \* perc\[\d+\];\n)+/, "    for (var j : u32 = 0u; j < PERC; j = j + 1u) {\n      acc = acc + weights[row + j] * perc[j];\n    }\n")
      .replace(/(      dx\[\d+\] = dx\[\d+\] \+ weights\[(?:wb \+ )?P\.w2_off \+ \d+u \* HID \+ o\] \* h;\n)+/, `      for (var c : u32 = 0u; c < ${bound}; c = c + 1u) {\n        dx[c] = dx[c] + weights[${offset}P.w2_off + c * HID + o] * h;\n      }\n`);
    expect(back).toBe(source);
  });

  it("refuses a kernel whose loops no longer match", () => {
    expect(() => build(source.replace("j < PERC", "j < 48u"))).toThrow(/no longer matches/);
    expect(() => build(source.replace("dx[c] = dx[c] +", "dx[c] +="))).toThrow(/no longer matches/);
  });

  it("refuses duplicate matches for either loop", () => {
    for (const loop of [
      /    for \(var j : u32 = 0u; j < PERC;[^]*?    }\n/,
      /      for \(var c : u32 = 0u; c < (?:CN|CH);[^]*?      }\n/,
    ]) {
      const match = source.match(loop)![0];
      expect(() => build(source + match)).toThrow(/no longer matches/);
    }
  });
});
