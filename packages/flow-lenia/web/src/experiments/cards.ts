import type { BrushEventInput } from "../model/events.js";
import { makeSeededOrganismMass } from "../model/seed.js";

export interface ExperimentModelControls {
  pressure: boolean;
  sigma: number;
}

interface TimelineEvent {
  step: number;
  kind: BrushEventInput["kind"];
  row: number;
  column: number;
  radius256: number;
  strength: number;
  channel: number;
  directionX?: number;
  directionY?: number;
}

export interface ExperimentCard {
  id: "affinity-swimmer" | "spinner-collision" | "dividing-droplets" | "pressure-ablation" | "sigma-phase" | "expansion-trap";
  title: string;
  short: string;
  description: string;
  observation: string;
  seedOffset: number;
  view: "density" | "channels" | "affinity" | "flow" | "pressure" | "flux";
  model: ExperimentModelControls;
  comparison?: { label: string; model: ExperimentModelControls };
  camera: { center: readonly [number, number]; zoom: number };
  timeline: readonly TimelineEvent[];
  provenance: { source: string; license: string; transformation: string };
}

const authored = {
  source: "Bit-Physics Flow Lenia M3 authored preset",
  license: "repository license",
  transformation: "constructed from the frozen ecosystem-v1 kernels; no third-party preset data or media",
} as const;

export const EXPERIMENT_CARDS: readonly ExperimentCard[] = [
  {
    id: "affinity-swimmer",
    title: "Affinity swimmer",
    short: "Follow a solitary body",
    description: "A compact three-channel body turns bell responses into an affinity landscape and follows its gradient.",
    observation: "Switch between affinity, pressure, and flow; inspect the leading rim and compare gradient direction with displacement.",
    seedOffset: 0,
    view: "density",
    model: { pressure: true, sigma: 0.65 },
    camera: { center: [0.5, 0.5], zoom: 1.35 },
    timeline: [],
    provenance: authored,
  },
  {
    id: "spinner-collision",
    title: "Spinner collision",
    short: "Perturb two mirrored bodies",
    description: "Two mirrored copies approach under equal and opposite, mass-closed displacement impulses.",
    observation: "Pause near contact, use the pipette to separate material, then watch whether the channel structures recover or merge.",
    seedOffset: 101,
    view: "flow",
    model: { pressure: true, sigma: 0.65 },
    camera: { center: [0.5, 0.5], zoom: 1.05 },
    timeline: [
      { step: 36, kind: "stir", row: 0.50, column: 0.34, radius256: 34, strength: 1.25, channel: 3, directionY: 1 },
      { step: 36, kind: "stir", row: 0.50, column: 0.66, radius256: 34, strength: 1.25, channel: 3, directionY: -1 },
    ],
    provenance: authored,
  },
  {
    id: "dividing-droplets",
    title: "Dividing droplets",
    short: "Fragment without biological claims",
    description: "Three offset lobes exchange mass and may split, reconnect, or dissolve under the same fixed global rule.",
    observation: "Use contours to see which fragments share an affinity basin. Fragmentation here is morphology, not biological reproduction.",
    seedOffset: 211,
    view: "affinity",
    model: { pressure: true, sigma: 0.65 },
    camera: { center: [0.5, 0.5], zoom: 1.15 },
    timeline: [{ step: 54, kind: "pipette", row: 0.50, column: 0.50, radius256: 22, strength: 1.1, channel: 3 }],
    provenance: authored,
  },
  {
    id: "pressure-ablation",
    title: "Pressure ablation",
    short: "Reference ↔ pressure off",
    description: "A synchronized split starts from identical crowded mass. Left keeps density pressure; right removes only the alpha pressure gate.",
    observation: "Compare peak density and clamp color. This is an explicit model ablation, not an artistic filter.",
    seedOffset: 307,
    view: "pressure",
    model: { pressure: true, sigma: 0.65 },
    comparison: { label: "pressure off", model: { pressure: false, sigma: 0.65 } },
    camera: { center: [0.5, 0.40], zoom: 1.55 },
    timeline: [],
    provenance: authored,
  },
  {
    id: "sigma-phase",
    title: "Sigma phase",
    short: "Narrow ↔ broad transport",
    description: "A synchronized split changes only the finite-square half-width: narrow distributions at left, broad distributions at right.",
    observation: "Use flux and trails to compare particle-like transport with smoother field-like reintegration.",
    seedOffset: 401,
    view: "flux",
    model: { pressure: true, sigma: 0.38 },
    comparison: { label: "σ 1.05", model: { pressure: true, sigma: 1.05 } },
    camera: { center: [0.5, 0.40], zoom: 1.4 },
    timeline: [],
    provenance: authored,
  },
  {
    id: "expansion-trap",
    title: "Expansion trap",
    short: "Area is not evolution",
    description: "A diffuse annular field rapidly occupies space while retaining no localized genome or lineage state.",
    observation: "Watch occupied fraction rise without interpreting it as adaptation or open-ended evolution.",
    seedOffset: 509,
    view: "channels",
    model: { pressure: true, sigma: 0.65 },
    camera: { center: [0.5, 0.5], zoom: 0.9 },
    timeline: [],
    provenance: authored,
  },
] as const;

function addTransformed(
  output: Float32Array,
  source: Float32Array,
  n: number,
  center: readonly [number, number],
  scale: number,
  rotation: number,
  amplitude: number,
  channelShift = 0,
): void {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  for (let row = 0; row < n; row += 1) {
    const dr = row - center[0] * n;
    for (let column = 0; column < n; column += 1) {
      const dc = column - center[1] * n;
      const sourceRow = Math.round(n / 2 + (cosine * dr + sine * dc) / scale);
      const sourceColumn = Math.round(n / 2 + (-sine * dr + cosine * dc) / scale);
      const wrappedRow = ((sourceRow % n) + n) % n;
      const wrappedColumn = ((sourceColumn % n) + n) % n;
      const sourceCell = (wrappedRow * n + wrappedColumn) * 4;
      const destinationCell = (row * n + column) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const sourceChannel = (channel + channelShift) % 3;
        output[destinationCell + channel] += amplitude * (source[sourceCell + sourceChannel] as number);
      }
    }
  }
}

export function makeExperimentMass(n: number, card: ExperimentCard, seed: number): Float32Array {
  const effectiveSeed = (seed + card.seedOffset) >>> 0;
  const source = makeSeededOrganismMass(n, effectiveSeed);
  if (card.id === "affinity-swimmer" || card.id === "sigma-phase") return source;
  const output = new Float32Array(n * n * 4);
  if (card.id === "spinner-collision") {
    addTransformed(output, source, n, [0.50, 0.34], 0.72, Math.PI / 2, 0.66, 0);
    addTransformed(output, source, n, [0.50, 0.66], 0.72, -Math.PI / 2, 0.66, 1);
  } else if (card.id === "dividing-droplets") {
    addTransformed(output, source, n, [0.43, 0.43], 0.62, 0.4, 0.58, 0);
    addTransformed(output, source, n, [0.57, 0.45], 0.58, -0.7, 0.54, 1);
    addTransformed(output, source, n, [0.51, 0.59], 0.52, 1.8, 0.48, 2);
  } else if (card.id === "pressure-ablation") {
    addTransformed(output, source, n, [0.5, 0.5], 0.57, 0, 1.45, 0);
  } else {
    for (let row = 0; row < n; row += 1) {
      const dr = row - n / 2;
      for (let column = 0; column < n; column += 1) {
        const dc = column - n / 2;
        const radius = Math.hypot(dr, dc) / (n / 256);
        const ring = 0.34 * Math.exp(-0.5 * ((radius - 55) / 16) ** 2);
        const ripple = 0.76 + 0.24 * Math.cos(Math.atan2(dr, dc) * 6 + effectiveSeed * 0.001);
        const cell = (row * n + column) * 4;
        output[cell] = ring * ripple;
        output[cell + 1] = ring * (1.0 - 0.25 * ripple);
        output[cell + 2] = ring * (0.55 + 0.25 * ripple);
      }
    }
  }
  return output;
}

export function scheduleCardTimeline(card: ExperimentCard, n: number): BrushEventInput[] {
  const scale = n / 256;
  return card.timeline.map((event) => ({
    kind: event.kind,
    x: event.row * n,
    y: event.column * n,
    radius: Math.max(2, event.radius256 * scale),
    strength: event.strength * scale,
    channel: event.channel,
    directionX: event.directionX ?? 0,
    directionY: event.directionY ?? 0,
    atStep: event.step,
  }));
}

export function experimentById(id: string): ExperimentCard {
  return EXPERIMENT_CARDS.find((card) => card.id === id) ?? EXPERIMENT_CARDS[0] as ExperimentCard;
}
