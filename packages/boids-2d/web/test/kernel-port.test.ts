// The v2 GPU kernel is the v4 lab's, byte for byte: every frozen WGSL constant
// in src/v2/model/kernel.ts equals the one in the v4 page (index.html, the
// shipped v1 lab), and the v2 counting-sort wrapper differs from v4's simSort
// only in where a cell's range and its agents come from.

import { describe, expect, it } from "vitest";
import v4Page from "../index.html?raw";
import * as K from "../src/v2/model/kernel.js";

/** The text of `const NAME = \`…\`;` in the v4 page (raw, interpolations unexpanded). */
function template(name: string): string {
  const start = v4Page.indexOf(`const ${name} = \``);
  if (start < 0) throw new Error(`${name} not found in the v4 page`);
  const body = v4Page.indexOf("`", start) + 1;
  return v4Page.slice(body, v4Page.indexOf("`;", body));
}

/** Expand ${NAME} the way the v4 page's template literals do. */
function expand(text: string): string {
  return text.replace(/\$\{(WGSL_[A-Z_]+)\}/g, (_, n: string) => expand(template(n)));
}

const FROZEN = ["WGSL_BOID", "WGSL_PARAMS", "WGSL_HELPERS", "WGSL_RULE_STATE", "WGSL_RULE_ACCUM", "WGSL_RULE_INTEGRATE", "WGSL_COMPUTE", "WGSL_REDUCE"] as const;

describe("the v2 kernel is the v4 kernel", () => {
  for (const name of FROZEN) {
    it(`${name} is byte-identical to the v4 page`, () => {
      expect(K[name]).toBe(expand(template(name)));
    });
  }

  it("the v2 sort wrapper is v4's simSort with only the cell range and the index lookup changed", () => {
    const v4Sort = expand(template("WGSL_SORT"));
    const simSort = v4Sort.slice(v4Sort.indexOf("// ---- (6) sim:"));
    expect(simSort.length).toBeGreaterThan(1000);
    const ported = simSort
      .replace("// ---- (6) sim:", "// ---- sim:")
      .replace(
        "let end = atomicLoad(&cellCount[c]);   // post-scatter the cursor equals the cell's end offset exactly (D-3)",
        "let end = cellStart[c + 1u];",
      )
      .replace("let j = sortedIdx[s];", "let j = order[s];");
    expect(ported).not.toBe(simSort);
    expect(K.WGSL_SORT_V2.endsWith(ported)).toBe(true);
  });

  it("cellOf is v4's", () => {
    const v4Sort = template("WGSL_SORT");
    const cellOf = v4Sort.slice(v4Sort.indexOf("fn cellOf("), v4Sort.indexOf("// ---- (1)"));
    expect(cellOf.length).toBeGreaterThan(100);
    expect(K.WGSL_SORT_V2).toContain(cellOf);
  });
});
