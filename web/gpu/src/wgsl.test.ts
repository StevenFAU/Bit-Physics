import { describe, expect, it } from "vitest";
import { defineWgsl, wgsl } from "./wgsl.js";

describe("WGSL #import", () => {
  defineWgsl("t/a", "fn a() {}");
  defineWgsl("t/b", "#import t/a\nfn b() { a(); }");

  it("expands imports recursively, dependencies first, each once", () => {
    const out = wgsl("#import t/b\n#import t/a\nfn main() { b(); }");
    expect(out.indexOf("fn a()")).toBeLessThan(out.indexOf("fn b()"));
    expect(out.match(/fn a\(\)/g)).toHaveLength(1);
    expect(out).toContain("already included");
  });

  it("accepts quoted names and local modules", () => {
    expect(wgsl('#import "x"\n', { x: "fn x() {}" })).toContain("fn x()");
  });

  it("fails loudly on unknown modules and cycles", () => {
    expect(() => wgsl("#import t/nope")).toThrow(/unknown module/);
    expect(() => wgsl("#import c1", { c1: "#import c2", c2: "#import c1" })).toThrow(/cycle/);
  });

  it("refuses to redefine a module with different code", () => {
    expect(() => defineWgsl("t/a", "fn a2() {}")).toThrow(/twice/);
  });
});
