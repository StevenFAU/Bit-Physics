// Species Matrix on the share link: the preset and the number of kinds
// ("cycle~3"), or an edited matrix "custom~3~g…~a…~s…~f…" — the steer and
// swim gains row-major (count × count), each kind's speed and its share of
// the ocean. Either form carries "~p<r>,<top speed>,<separation>,<panic>"
// when Tune moved those off Open Water's values. Which preset a brain is (or
// "custom") is read from the brain itself, never remembered separately.

import type { SpeciesParams, SpeciesPreset } from "./model/brains-m3.js";
import { MAX_SPECIES, SPECIES_BASE, SPECIES_PRESETS, speciesPreset } from "./model/brains-m3.js";

const fmt = (v: number, digits: number): string => String(Number(v.toFixed(digits)));
const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/** The preset these species are — the same gains, speeds and shares for their number of kinds — or "custom". */
export function presetOf(p: SpeciesParams): SpeciesPreset | "custom" {
  const n = p.count;
  for (const { id } of SPECIES_PRESETS) {
    const q = speciesPreset(id, n);
    let ok = true;
    for (let i = 0; i < n && ok; i += 1) {
      for (let j = 0; j < n && ok; j += 1) ok = same(p.gc[i * 6 + j]!, q.gc[i * 6 + j]!) && same(p.ga[i * 6 + j]!, q.ga[i * 6 + j]!);
      ok = ok && same(p.spd[i]!, q.spd[i]!) && same(p.frac[i]!, q.frac[i]!);
    }
    if (ok) return id;
  }
  return "custom";
}

/** Species Matrix on the link (see the header). */
export function encodeKinds(p: SpeciesParams): string {
  const preset = presetOf(p);
  const n = p.count;
  let out = `${preset}~${n}`;
  if (preset === "custom") {
    const take = (a: number[]): string => {
      const v: string[] = [];
      for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) v.push(fmt(a[i * 6 + j]!, 1));
      return v.join(",");
    };
    out += `~g${take(p.gc)}~a${take(p.ga)}~s${p.spd.slice(0, n).map((v) => fmt(v, 1)).join(",")}`;
    if (p.frac.slice(0, n).some((f) => !same(f, 1 / n))) out += `~f${p.frac.slice(0, n).map((f) => fmt(f, 4)).join(",")}`;
  }
  const b = SPECIES_BASE;
  if (!same(p.rCoh, b.rCoh) || !same(p.speed, b.speed) || !same(p.wSep, b.wSep) || !same(p.eta, b.eta)) {
    out += `~p${fmt(p.rCoh, 4)},${fmt(p.speed, 5)},${fmt(p.wSep, 3)},${fmt(p.eta, 3)}`;
  }
  return out;
}

export function decodeKinds(s: string): { p: SpeciesParams; preset: SpeciesPreset | "custom" } | null {
  if (!s) return null;
  const [name, cnt, ...rest] = s.split("~");
  const count = Number(cnt);
  if (!Number.isInteger(count) || count < 2 || count > MAX_SPECIES) return null;
  const known = SPECIES_PRESETS.some((x) => x.id === name);
  if (!known && name !== "custom") return null;
  const p = speciesPreset(known ? (name as SpeciesPreset) : "cycle", count);
  for (const part of rest) {
    const vals = part.slice(1).split(",").map(Number);
    if (vals.some((v) => !Number.isFinite(v))) return null;
    const tag = part[0];
    if (tag === "p") {
      const [r, sp, ws, eta] = vals;
      if (r !== undefined) p.rCoh = Math.min(0.18, Math.max(0.05, r));
      if (sp !== undefined) p.speed = Math.min(0.013, Math.max(0.003, sp));
      if (ws !== undefined) p.wSep = Math.min(3, Math.max(0, ws));
      if (eta !== undefined) p.eta = Math.min(0.6, Math.max(0, eta));
      continue;
    }
    // the matrix itself only on an edited one
    if (name !== "custom") continue;
    if (tag === "s") vals.slice(0, count).forEach((v, k) => (p.spd[k] = Math.min(2.5, Math.max(0.5, v))));
    else if (tag === "f") {
      const f = vals.slice(0, count).map((v) => Math.max(0, v));
      const sum = f.reduce((a, b) => a + b, 0);
      if (f.length === count && sum > 0) f.forEach((v, k) => (p.frac[k] = v / sum));
    } else if (tag === "g" || tag === "a") {
      const arr = tag === "g" ? p.gc : p.ga;
      vals.slice(0, count * count).forEach((v, k) => (arr[Math.floor(k / count) * 6 + (k % count)] = Math.min(2, Math.max(-2, v))));
    }
  }
  return { p, preset: presetOf(p) };
}
