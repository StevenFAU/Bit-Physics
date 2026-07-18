import { KERNEL_SPECS } from "../model/config.js";
import type { EcosystemInitialState, MixingRule, MutationPatchInput } from "../model/ecosystem-solver.js";

export type EcosystemView = "lineage" | "phenotype" | "density" | "flow";

export interface EcosystemCard {
  id: "three-founders" | "negotiation-sea" | "identity-dilution";
  title: string;
  short: string;
  description: string;
  observation: string;
  seedOffset: number;
  mixing: MixingRule;
  view: EcosystemView;
  comparisonRules?: readonly MixingRule[];
  mutationTimeline: readonly {
    step: number;
    row: number;
    column: number;
    radius256: number;
    scale: number;
    parentLineage: number;
  }[];
  provenance: { origin: "Bit-Physics authored"; sourceData: "none"; license: "repository license" };
}

const provenance = { origin: "Bit-Physics authored", sourceData: "none", license: "repository license" } as const;

export const ECOSYSTEM_CARDS: readonly EcosystemCard[] = [
  {
    id: "three-founders",
    title: "Three founders",
    short: "Localized rules meet",
    description: "Three coherent parameter lineages cross one another under the selected inheritance rule.",
    observation: "Switch rules without changing the seed. Whole-genome selection preserves exact colored identities; averaging creates a mixed sentinel field.",
    seedOffset: 1701,
    mixing: "whole",
    view: "lineage",
    mutationTimeline: [],
    provenance,
  },
  {
    id: "negotiation-sea",
    title: "Negotiation sea",
    short: "Contextual inheritance + mutation",
    description: "Five founder patches occupy a dense field while deterministic mutation pulses create bounded child lineages.",
    observation: "Negotiation samples contextual Q·I scores. Mutation rings change H/Q only inside coherent lineage patches and never alter mass.",
    seedOffset: 2719,
    mixing: "negotiation",
    view: "lineage",
    mutationTimeline: [
      { step: 18, row: 0.30, column: 0.29, radius256: 18, scale: 0.055, parentLineage: 1 },
      { step: 44, row: 0.68, column: 0.69, radius256: 20, scale: 0.070, parentLineage: 4 },
      { step: 76, row: 0.52, column: 0.50, radius256: 22, scale: 0.048, parentLineage: 5 },
    ],
    provenance,
  },
  {
    id: "identity-dilution",
    title: "Identity dilution",
    short: "Average ↔ gene-wise ↔ negotiation",
    description: "Three synchronized panes start byte-identically and differ only in localized inheritance.",
    observation: "Average rapidly produces diffuse mixed identity; gene-wise recombines individual H/Q components; negotiation copies one contextual whole genome.",
    seedOffset: 3911,
    mixing: "average",
    view: "lineage",
    comparisonRules: ["average", "gene-wise", "negotiation"],
    mutationTimeline: [],
    provenance,
  },
] as const;

function mix32(value: number): number {
  let x = value >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

interface Founder {
  center: readonly [number, number];
  scale: number;
  amplitude: number;
  lineage: number;
}

function foundersFor(card: EcosystemCard): readonly Founder[] {
  if (card.id === "negotiation-sea") {
    return [
      { center: [0.28, 0.28], scale: 0.15, amplitude: 0.68, lineage: 1 },
      { center: [0.27, 0.72], scale: 0.15, amplitude: 0.66, lineage: 2 },
      { center: [0.72, 0.28], scale: 0.15, amplitude: 0.64, lineage: 3 },
      { center: [0.71, 0.71], scale: 0.15, amplitude: 0.69, lineage: 4 },
      { center: [0.50, 0.50], scale: 0.18, amplitude: 0.61, lineage: 5 },
    ];
  }
  return [
    { center: [0.30, 0.32], scale: 0.13, amplitude: 0.82, lineage: 1 },
    { center: [0.32, 0.69], scale: 0.13, amplitude: 0.78, lineage: 2 },
    { center: [0.69, 0.50], scale: 0.14, amplitude: 0.80, lineage: 3 },
  ];
}

function torusDelta(value: number, center: number): number {
  const raw = value - center;
  return raw - Math.round(raw);
}

export function makeEcosystemState(n: number, card: EcosystemCard, seed: number): EcosystemInitialState {
  const mass = new Float32Array(n * n * 4);
  const h = new Float32Array(n * n * 12);
  const q = new Float32Array(n * n * 12);
  const identity = new Uint32Array(n * n * 4);
  const founders = foundersFor(card);
  const effectiveSeed = (seed + card.seedOffset) >>> 0;
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const cell = row * n + column;
      const x = (row + 0.5) / n;
      const y = (column + 0.5) / n;
      let dominant = founders[0] as Founder;
      let dominantContribution = -1;
      let density = 0;
      for (const founder of founders) {
        const dx = torusDelta(x, founder.center[0]);
        const dy = torusDelta(y, founder.center[1]);
        const radius = Math.hypot(dx, dy) / founder.scale;
        const body = founder.amplitude * Math.exp(-2.15 * radius * radius);
        const ring = 0.19 * Math.exp(-28 * (radius - 0.68) ** 2);
        const contribution = body + ring;
        density += contribution;
        if (contribution > dominantContribution) { dominantContribution = contribution; dominant = founder; }
      }
      const wave = 0.92 + 0.08 * Math.cos(13 * x + 17 * y + (effectiveSeed & 1023) * 0.013);
      density *= wave;
      mass[cell * 4] = Math.fround(density * (0.36 + 0.11 * Math.sin(11 * y + dominant.lineage)));
      mass[cell * 4 + 1] = Math.fround(density * (0.34 + 0.10 * Math.cos(9 * x - dominant.lineage)));
      mass[cell * 4 + 2] = Math.fround(density * 0.30);
      if (density <= 1e-7) continue;
      for (let gene = 0; gene < 9; gene += 1) {
        const base = KERNEL_SPECS[gene]?.weight ?? 0;
        const phase = dominant.lineage * 1.731 + gene * 0.913 + (effectiveSeed & 255) * 0.001;
        h[cell * 12 + gene] = Math.fround(base + 0.13 * Math.sin(phase));
        q[cell * 12 + gene] = Math.fround(0.72 + 0.28 * Math.cos(phase * 0.73));
      }
      identity[cell * 4] = mix32(effectiveSeed ^ Math.imul(dominant.lineage, 0x9e3779b9));
      identity[cell * 4 + 1] = mix32(effectiveSeed ^ Math.imul(dominant.lineage, 0x85ebca6b));
      identity[cell * 4 + 2] = dominant.lineage;
      identity[cell * 4 + 3] = 0;
    }
  }
  return { mass, h, q, identity };
}

export function scheduledMutations(card: EcosystemCard, n: number): MutationPatchInput[] {
  const scale = n / 256;
  return card.mutationTimeline.map((event) => ({
    row: event.row * n,
    column: event.column * n,
    radius: Math.max(2, event.radius256 * scale),
    scale: event.scale,
    parentLineage: event.parentLineage,
    atStep: event.step,
  }));
}

export function ecosystemCardById(id: string): EcosystemCard {
  return ECOSYSTEM_CARDS.find((card) => card.id === id) ?? ECOSYSTEM_CARDS[0] as EcosystemCard;
}
