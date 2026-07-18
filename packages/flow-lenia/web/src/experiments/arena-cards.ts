import { ECOSYSTEM_CARDS, makeEcosystemState } from "./ecosystem-cards.js";
import type { EcosystemInitialState, MixingRule } from "../model/ecosystem-solver.js";
import { ARENA_SCHEMA_VERSION, QUIET_ATTRACTOR, QUIET_STORM } from "../model/arena.js";
import type { ArenaDynamics, ArenaEnvironmentState } from "../model/arena.js";

export type ArenaCardId = "corridor-divergence" | "maze-navigation" | "storm-recovery";

export interface ArenaCard {
  id: ArenaCardId;
  title: string;
  short: string;
  description: string;
  observation: string;
  mixing: MixingRule;
  view: "lineage" | "phenotype" | "density" | "flow" | "environment";
  seedOffset: number;
  duration: number;
  successMetric: string;
  provenance: {
    origin: "Bit-Physics authored";
    sourceData: "none";
    license: "repository license";
    researchBasis: string;
  };
}

const provenance = {
  origin: "Bit-Physics authored",
  sourceData: "none",
  license: "repository license",
  researchBasis: "Soft-affinity environments motivated by Plantec et al. 2025; parameters and fields authored independently for Bit-Physics.",
} as const;

export const ARENA_CARDS: readonly ArenaCard[] = [
  {
    id: "corridor-divergence",
    title: "Corridor divergence",
    short: "Founder islands + timed gate",
    description: "Founder regions evolve on opposite sides of a soft-affinity barrier before a timed passage reconnects them.",
    observation: "The amber seam is an affinity penalty, not collision geometry. At step 48 its central gate opens without changing mass.",
    mixing: "whole",
    view: "lineage",
    seedOffset: 5101,
    duration: 128,
    successMetric: "region abundance before/after gate · closed mass ledger",
    provenance,
  },
  {
    id: "maze-navigation",
    title: "Maze navigation",
    short: "Soft maze + orbiting source",
    description: "A slowly orbiting positive-affinity source pulls localized matter through an authored soft-wall maze.",
    observation: "Walls repel through affinity only, so sufficiently strong endogenous flow can cross them. The moving beacon never creates matter.",
    mixing: "best",
    view: "lineage",
    seedOffset: 6113,
    duration: 144,
    successMetric: "target-region abundance · wall exposure · conservation",
    provenance,
  },
  {
    id: "storm-recovery",
    title: "Storm recovery",
    short: "Standardized affinity pulse",
    description: "A three-lobed, mass-neutral affinity storm perturbs a negotiation ecosystem on a frozen schedule.",
    observation: "The recovery trace is a regional-distribution proxy, not a fitness or biological resilience claim.",
    mixing: "negotiation",
    view: "lineage",
    seedOffset: 7127,
    duration: 144,
    successMetric: "retained mass · distribution recovery time after step 64",
    provenance,
  },
] as const;

function torusDelta(value: number): number { return value - Math.round(value); }
function gaussian(row: number, column: number, center: readonly [number, number], radius: number): number {
  const dx = torusDelta(row - center[0]);
  const dy = torusDelta(column - center[1]);
  return Math.exp(-0.5 * (dx * dx + dy * dy) / (radius * radius));
}

function quietDynamics(): ArenaDynamics {
  return {
    channelResponse: [1, 0.86, 1.12],
    gateOpenStep: -1,
    gateCloseStep: -1,
    storm: { ...QUIET_STORM, center: [...QUIET_STORM.center] },
    attractor: { ...QUIET_ATTRACTOR, center: [...QUIET_ATTRACTOR.center] },
  };
}

export function makeArenaEnvironment(n: number, card: ArenaCard): ArenaEnvironmentState {
  const field = new Float32Array(n * n * 4);
  const regions = new Uint32Array(n * n);
  const dynamics = quietDynamics();
  for (let row = 0; row < n; row += 1) {
    for (let column = 0; column < n; column += 1) {
      const x = (row + 0.5) / n;
      const y = (column + 0.5) / n;
      const cell = row * n + column;
      const base = cell * 4;
      if (card.id === "corridor-divergence") {
        const seam = Math.exp(-0.5 * ((x - 0.5) / 0.026) ** 2);
        const gate = Math.exp(-0.5 * ((y - 0.5) / 0.085) ** 6);
        field[base] = Math.fround(0.11 * gaussian(x, y, [0.29, 0.5], 0.24) + 0.11 * gaussian(x, y, [0.71, 0.5], 0.24));
        field[base + 1] = Math.fround(-1.35 * seam * (1 - gate));
        field[base + 2] = Math.fround(-1.35 * seam * gate);
        field[base + 3] = Math.fround(Math.min(1, seam));
        regions[cell] = x < 0.46 ? 1 : x > 0.54 ? 2 : 3;
      } else if (card.id === "maze-navigation") {
        const border = x < 0.035 || x > 0.965 || y < 0.035 || y > 0.965;
        const verticalA = Math.abs(y - 0.30) < 0.022 && !(x > 0.18 && x < 0.34) && !(x > 0.72 && x < 0.86);
        const verticalB = Math.abs(y - 0.56) < 0.022 && !(x > 0.42 && x < 0.57) && !(x > 0.82 && x < 0.94);
        const horizontalA = Math.abs(x - 0.34) < 0.022 && !(y > 0.08 && y < 0.21) && !(y > 0.66 && y < 0.81);
        const horizontalB = Math.abs(x - 0.68) < 0.022 && !(y > 0.34 && y < 0.48) && !(y > 0.83 && y < 0.95);
        const wall = border || verticalA || verticalB || horizontalA || horizontalB;
        field[base + 1] = wall ? -1.05 : 0;
        field[base + 3] = wall ? 1 : 0;
        regions[cell] = gaussian(x, y, [0.22, 0.18], 0.18) > 0.42 ? 1 : gaussian(x, y, [0.78, 0.82], 0.18) > 0.42 ? 2 : 3;
      } else {
        field[base] = Math.fround(0.055 * Math.cos(2 * Math.PI * x) * Math.cos(2 * Math.PI * y));
        regions[cell] = x < 0.5 && y < 0.5 ? 1 : x >= 0.5 && y >= 0.5 ? 2 : 3;
      }
    }
  }
  if (card.id === "corridor-divergence") {
    dynamics.gateOpenStep = 48;
    dynamics.gateCloseStep = -1;
  } else if (card.id === "maze-navigation") {
    dynamics.attractor = { center: [0.74, 0.77], radius: 0.13, amplitude: 0.82, orbitRadius: 0.075, angularSpeed: 0.018, phase: 0.4 };
    dynamics.channelResponse = [1.0, 0.78, 1.18];
  } else {
    dynamics.storm = { startStep: 40, duration: 24, center: [0.5, 0.5], radius: 0.31, amplitude: 1.45 };
    dynamics.channelResponse = [1.0, 0.92, 1.08];
  }
  return { schemaVersion: ARENA_SCHEMA_VERSION, field, regions, dynamics };
}

export function makeArenaState(n: number, card: ArenaCard, seed: number): EcosystemInitialState {
  const source = card.id === "storm-recovery" ? ECOSYSTEM_CARDS[1] : ECOSYSTEM_CARDS[0];
  return makeEcosystemState(n, source as (typeof ECOSYSTEM_CARDS)[number], (seed + card.seedOffset) >>> 0);
}

export function arenaCardById(id: string): ArenaCard {
  return ARENA_CARDS.find((card) => card.id === id) ?? ARENA_CARDS[0] as ArenaCard;
}
