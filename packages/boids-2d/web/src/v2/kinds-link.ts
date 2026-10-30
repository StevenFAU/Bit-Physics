// Species Matrix on the share link: the preset and the number of kinds
// ("cycle~3"), or an edited matrix "custom~3~g…~a…~s…" — the steer and swim
// gains row-major (count × count) and each kind's speed, to one decimal.

import type { SpeciesParams, SpeciesPreset } from "./model/brains-m3.js";
import { MAX_SPECIES, SPECIES_PRESETS, speciesPreset } from "./model/brains-m3.js";

/** Species Matrix on the link: "cycle~3", or an edited matrix "custom~3~g…~a…~s…" (row-major, count × count). */
export function encodeKinds(p: SpeciesParams, preset: SpeciesPreset | "custom"): string {
  const base = `${preset}~${p.count}`;
  if (preset !== "custom") return base;
  const n = p.count;
  const take = (a: number[]): string => {
    const out: string[] = [];
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) out.push(String(Math.round(a[i * 6 + j]! * 10) / 10));
    return out.join(",");
  };
  return `${base}~g${take(p.gc)}~a${take(p.ga)}~s${p.spd.slice(0, n).map((v) => String(Math.round(v * 10) / 10)).join(",")}`;
}

export function decodeKinds(s: string): { p: SpeciesParams; preset: SpeciesPreset | "custom" } | null {
  if (!s) return null;
  const [name, cnt, ...rest] = s.split("~");
  const count = Number(cnt);
  if (!Number.isInteger(count) || count < 2 || count > MAX_SPECIES) return null;
  const known = SPECIES_PRESETS.some((x) => x.id === name);
  const p = speciesPreset(known ? (name as SpeciesPreset) : "cycle", count);
  if (name !== "custom") return known ? { p, preset: name as SpeciesPreset } : null;
  for (const part of rest) {
    const vals = part.slice(1).split(",").map(Number);
    if (vals.some((v) => !Number.isFinite(v))) return null;
    if (part[0] === "s") vals.slice(0, count).forEach((v, k) => (p.spd[k] = Math.min(2.5, Math.max(0.5, v))));
    else {
      const arr = part[0] === "g" ? p.gc : p.ga;
      vals.slice(0, count * count).forEach((v, k) => (arr[Math.floor(k / count) * 6 + (k % count)] = Math.min(2, Math.max(-2, v))));
    }
  }
  return { p, preset: "custom" };
}
