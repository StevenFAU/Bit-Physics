import { describe, expect, it } from "vitest";
import { UrlState } from "./url-state.js";

const schema = {
  s: { kind: "enum", def: "map", values: ["map", "dish"] },
  seed: { kind: "int", def: 1, min: 0 },
  F: { kind: "num", def: -1, digits: 5 },
  g: { kind: "nums", def: [0, 0], n: 2 },
  t: { kind: "str", def: "", pattern: /^[a-z]*$/ },
} as const;

describe("UrlState", () => {
  const url = new UrlState(schema, 2);

  it("writes only non-default values, versioned", () => {
    expect(url.serialize({ s: "map", seed: 1, F: -1, g: [0, 0], t: "" })).toBe("?v=2");
    const q = url.serialize({ s: "dish", seed: 7, F: 0.036700001, g: [512, 320], t: "seed" });
    expect(q).toBe("?v=2&s=dish&seed=7&F=0.0367&g=512%2C320&t=seed");
  });

  it("round-trips", () => {
    const values = { s: "dish", seed: 9, F: 0.0545, g: [1296, 808], t: "probe" };
    const { values: back, present } = url.parse(url.serialize(values));
    expect(back).toEqual(values);
    expect([...present].sort()).toEqual(["F", "g", "s", "seed", "t"]);
  });

  it("rejects invalid values and other versions", () => {
    expect(url.parse("?v=2&s=nope&seed=-3&F=abc&g=1,2,3&t=Bad!").values).toEqual(url.defaults());
    expect(url.parse("?v=1&s=dish").values.s).toBe("map");
  });

  it("keeps foreign query parameters", () => {
    const q = url.serialize({ s: "dish" }, new URLSearchParams("debug=perf&s=map"));
    expect(q).toBe("?debug=perf&v=2&s=dish");
  });
});
