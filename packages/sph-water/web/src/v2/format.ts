// Number formatting for readouts (Plex Mono in the shell).

/** x in scientific notation with `digits` decimals, e.g. 1.2e-4. */
export function sci(x: number, digits = 1): string {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return "0";
  return x.toExponential(digits).replace("e+", "e");
}

/** A fraction as a percentage with enough digits to be non-zero. */
export function pct(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return String(x);
  const v = x * 100;
  if (v !== 0 && Math.abs(v) < 10 ** -digits) return `${sci(v, 1)} %`;
  return `${v.toFixed(digits)} %`;
}
