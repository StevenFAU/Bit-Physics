// Number formatting for Chaos's readouts: powers of ten with superscripts.

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number): string => String(n).replace(/-/g, "⁻").replace(/\d/g, (c) => SUP[Number(c)]!);

/** "10⁻⁶" */
export function pow10(exp: number): string {
  return `10${sup(exp)}`;
}

/** "3.1 × 10⁻⁶" (or "1 × 10⁻⁶" for an exact power, "0" for zero). */
export function sci(v: number, digits = 1): string {
  if (!(v > 0)) return "0";
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  const exact = Math.abs(m - 1) < 1e-9;
  return `${exact ? "1" : m.toFixed(digits)} × ${pow10(e)}`;
}
