// URL state (00-foundation.md § 2.6): short, readable, versioned keys.
// Restoring a URL reproduces the scene's starting state exactly; only values
// that differ from their defaults are written, so links stay short.

export type UrlField =
  | { kind: "num"; def: number; min?: number; max?: number; digits?: number }
  | { kind: "int"; def: number; min?: number; max?: number }
  | { kind: "enum"; def: string; values: readonly string[] }
  | { kind: "str"; def: string; pattern?: RegExp }
  | { kind: "nums"; def: readonly number[]; n: number; digits?: number };

export type UrlSchema = Record<string, UrlField>;

export type UrlValue<F extends UrlField> = F extends { kind: "num" | "int" }
  ? number
  : F extends { kind: "nums" }
    ? number[]
    : string;

export type UrlValues<S extends UrlSchema> = { [K in keyof S]: UrlValue<S[K]> };

const fmt = (v: number, digits?: number): string => {
  if (digits === undefined) return String(v);
  // trim trailing zeros: 0.036700 → 0.0367
  return String(Number(v.toFixed(digits)));
};

export class UrlState<S extends UrlSchema> {
  private timer = 0;

  constructor(
    readonly schema: S,
    readonly version = 2,
  ) {}

  defaults(): UrlValues<S> {
    const out: Record<string, unknown> = {};
    for (const [k, f] of Object.entries(this.schema)) out[k] = f.kind === "nums" ? f.def.slice() : f.def;
    return out as UrlValues<S>;
  }

  /** Parse and validate; unknown or invalid keys fall back to defaults. */
  parse(search: string): { values: UrlValues<S>; present: Set<keyof S> } {
    const q = new URLSearchParams(search);
    const values = this.defaults() as Record<string, unknown>;
    const present = new Set<keyof S>();
    const v = q.get("v");
    if (v !== null && Number(v) !== this.version) return { values: values as UrlValues<S>, present };
    for (const [k, f] of Object.entries(this.schema)) {
      const raw = q.get(k);
      if (raw === null) continue;
      const parsed = this.parseOne(f, raw);
      if (parsed === undefined) continue;
      values[k] = parsed;
      present.add(k);
    }
    return { values: values as UrlValues<S>, present };
  }

  private parseOne(f: UrlField, raw: string): unknown {
    switch (f.kind) {
      case "num":
      case "int": {
        const n = Number(raw);
        if (!Number.isFinite(n)) return undefined;
        if (f.kind === "int" && !Number.isInteger(n)) return undefined;
        if (f.min !== undefined && n < f.min) return undefined;
        if (f.max !== undefined && n > f.max) return undefined;
        return n;
      }
      case "enum":
        return f.values.includes(raw) ? raw : undefined;
      case "str":
        return f.pattern && !f.pattern.test(raw) ? undefined : raw;
      case "nums": {
        const parts = raw.split(/[,x]/).map(Number);
        if (parts.length !== f.n || parts.some((x) => !Number.isFinite(x))) return undefined;
        return parts;
      }
    }
  }

  /** Query string (with leading "?") carrying only non-default values. */
  serialize(values: Partial<UrlValues<S>>, keep: URLSearchParams = new URLSearchParams()): string {
    const q = new URLSearchParams();
    // carry through foreign params (e.g. debug flags) untouched
    for (const [k, v] of keep) if (!(k in this.schema) && k !== "v") q.set(k, v);
    q.set("v", String(this.version));
    for (const [k, f] of Object.entries(this.schema)) {
      const val = (values as Record<string, unknown>)[k];
      if (val === undefined) continue;
      if (f.kind === "nums") {
        const arr = val as number[];
        if (arr.every((x, i) => x === f.def[i])) continue;
        q.set(k, arr.map((x) => fmt(x, f.digits)).join(","));
      } else if (f.kind === "num" || f.kind === "int") {
        const n = val as number;
        if (n === f.def) continue;
        q.set(k, f.kind === "num" ? fmt(n, f.digits) : String(n));
      } else {
        if (val === f.def) continue;
        q.set(k, String(val));
      }
    }
    const s = q.toString();
    return s.length > 0 ? `?${s}` : "";
  }

  /** Replace the current URL (debounced; never adds history entries). */
  write(values: Partial<UrlValues<S>>, delayMs = 250): void {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      const search = this.serialize(values, new URLSearchParams(location.search));
      const url = `${location.pathname}${search}${location.hash}`;
      if (url !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(null, "", url);
    }, delayMs);
  }

  /** Absolute share link for `values`. */
  link(values: Partial<UrlValues<S>>): string {
    return `${location.origin}${location.pathname}${this.serialize(values)}`;
  }
}
