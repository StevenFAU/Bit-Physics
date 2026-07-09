// phase-field-fracture — scene presets (INTERACT templates, spec-ref § 5.5).
// Every preset is literature-anchored; the anchor rides in `title` and the
// EXPLAIN copy. Geometry is built in JS f64 (buildMaterial) and cast once.

import { E_VOID } from "./pff64.mjs";
import { buildMaterial } from "./solver.js";

export interface SceneSpec {
  key: string;
  label: string;
  title: string;
  n: number;
  /** loading-rate multiplier on the canonical 1e-4 c_d (KE/IE gauge shows
   * what this does — the § 3.6 discipline made tangible). */
  rateMult: number;
  uEnd: number;
  material: (n: number) => Float32Array;
  blurb: string;
}

const half = (n: number): number => Math.floor(n / 2);

export const SCENES: SceneSpec[] = [
  {
    key: "sent",
    label: "SENT",
    title:
      "Single-edge-notch tension — THE benchmark (Miehe 2010; peak gated at ±10 % of the 0.7012 kN PhaseFieldX reproduction)",
    n: 192,
    rateMult: 1,
    uEnd: 0.42,
    material: (n) =>
      buildMaterial(n, [
        { kind: "slit", i0: 0, i1: half(n), j: half(n), eMult: E_VOID },
      ]),
    blurb:
      "The canonical quasi-static gate scene: pull the top edge, watch the " +
      "crack emerge from the notch tip at ~0.70 kN and burst across the " +
      "ligament at ~0.55 c_R. The KE/IE gauge stays pinned near zero until " +
      "the snap-back — which is legitimately dynamic.",
  },
  {
    key: "enpassant",
    label: "en-passant",
    title:
      "En-passant crack pair — offset notches hook into each other (Ghelichi & Kamrin 2015, Soft Matter)",
    n: 192,
    rateMult: 1,
    uEnd: 0.75,
    material: (n) =>
      buildMaterial(n, [
        {
          kind: "slit",
          i0: 0,
          i1: Math.floor(n * 0.4),
          j: Math.floor(n * 0.42),
          eMult: E_VOID,
        },
        {
          kind: "slit",
          i0: Math.floor(n * 0.6),
          i1: n,
          j: Math.floor(n * 0.58),
          eMult: E_VOID,
        },
      ]),
    blurb:
      "Two offset edge notches under tension: slight initial repulsion, " +
      "then mutual attraction — the cracks curve into each other's wakes " +
      "and release a lenticular fragment. Ubiquitous in mud, sea ice, and " +
      "rift systems.",
  },
  {
    key: "perforation",
    label: "perforation",
    title:
      "Tear along the dotted line — crack-hole interaction (Mang et al. 2021 punctured strips); mechanism-verified, stamp-geometry-unpublished",
    n: 192,
    rateMult: 1,
    uEnd: 0.5,
    material: (n) => {
      const holes: Array<{ kind: "hole"; ci: number; cj: number; r: number }> = [];
      const count = 7;
      for (let k = 0; k < count; k++) {
        holes.push({
          kind: "hole",
          ci: ((k + 0.5) * n) / count,
          cj: half(n),
          r: n / 48,
        });
      }
      return buildMaterial(n, [
        { kind: "slit", i0: 0, i1: Math.floor(n * 0.12), j: half(n), eMult: E_VOID },
        ...holes,
      ]);
    },
    blurb:
      "A dotted line of holes ahead of a starter notch: each hole arrests " +
      "the crack, pauses it, then pops re-nucleation on the far side. " +
      "Coarsen the pitch (paint your own holes) and the tear escapes the " +
      "line — the real-world stamp failure.",
  },
  {
    key: "obstacles",
    label: "obstacle lab",
    title:
      "Draw-your-own obstacles — paint holes / stiff / soft / tough regions into E(x), Gc(x) (crack-inclusion interaction literature)",
    n: 192,
    rateMult: 1,
    uEnd: 0.55,
    material: (n) =>
      buildMaterial(n, [
        { kind: "slit", i0: 0, i1: Math.floor(n * 0.25), j: half(n), eMult: E_VOID },
      ]),
    blurb:
      "A short starter notch and a blank field: paint obstacles with the " +
      "brush (holes arrest, stiff inclusions attract then deflect, soft " +
      "ones blunt, tough stripes wall the crack off), then pull and watch " +
      "the crack negotiate YOUR geometry. Zero solver cost — obstacles are " +
      "just material fields.",
  },
  {
    key: "compression",
    label: "compression",
    title:
      "Compression sanity — the Miehe strain-spectral split: no damage growth in compression (gate G-split live)",
    n: 128,
    rateMult: 4,
    uEnd: -0.4,
    material: (n) =>
      buildMaterial(n, [
        { kind: "slit", i0: 0, i1: half(n), j: half(n), eMult: E_VOID },
      ]),
    blurb:
      "The same notched specimen pushed instead of pulled: the tension/" +
      "compression split keeps the crack from growing under compression. " +
      "The damage field stays dark — a verification gate you can watch.",
  },
];

export function sceneByKey(key: string): SceneSpec {
  const s = SCENES.find((x) => x.key === key);
  if (!s) throw new Error(`unknown scene ${key}`);
  return s;
}
