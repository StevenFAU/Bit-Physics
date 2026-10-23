// The tick runner: the ONE place ticks are scheduled, used by the live loop
// and by undo replay alike, so both apply events and director stamps at the
// same tick boundaries in the same order — which is what makes replay
// byte-identical on the same device.
//
// Per tick t: (1) logged events due at t, in log order — chemistry changes
// mutate the sim's chemistry, stamps are collected; (2) the scene director's
// stamps for t; (3) if any stamps, the current segment is closed and a brush
// dispatch opens the next one; (4) the tick itself. Segments become submits
// (stamp buffers are written per submit).

import type { SimEvent } from "@bp/runtime";
import type { LiveSim, Stamp } from "./sim.js";
import { chemistryAt, cloneChem } from "./sim.js";
import type { SceneContext } from "../scenes/scenes.js";

export type StampRow = [number, number, number, number, number, number, number];

export interface ChemPayload {
  g: number;
  F: number;
  k: number;
}
export interface RatioPayload {
  g: number;
  r: number;
}
export interface DivePayload {
  g: number;
  x: number;
  y: number;
}
export interface StampsPayload {
  g: number;
  s: StampRow[];
}

export const DU = 0.16;

export function toRow(s: Stamp): StampRow {
  return [s.x, s.y, s.r, s.strength, s.mode, s.F, s.k];
}

export function fromRow(r: StampRow): Stamp {
  return { x: r[0], y: r[1], r: r[2], strength: r[3], mode: r[4] as Stamp["mode"], F: r[5], k: r[6] };
}

/** Reveal speed and edge for a dive (cells per tick, cells). */
export const DIVE = { speed: 2, edge: 48 };

/** Apply one logged event to the sim's CPU-side chemistry; returns its stamps. */
export function applyEvent(sim: LiveSim, e: SimEvent): Stamp[] {
  const p = e.payload as unknown as Record<string, unknown>;
  switch (e.kind) {
    case "stamps":
      return (p["s"] as StampRow[]).map(fromRow);
    case "chem": {
      const c = cloneChem(sim.chem);
      c.F0 = p["F"] as number;
      c.k0 = p["k"] as number;
      sim.chem = c;
      return [];
    }
    case "ratio": {
      if (sim.chem.model !== "gray-scott") return [];
      const c = cloneChem(sim.chem);
      c.Du = DU;
      c.Dv = DU / (p["r"] as number);
      sim.chem = c;
      return [];
    }
    case "dive": {
      const x = p["x"] as number;
      const y = p["y"] as number;
      const c = cloneChem(sim.chem);
      if (!c.sweep) return [];
      const [F, k] = chemistryAt(c, sim.w, sim.h, x, y, e.tick);
      c.F0 = F;
      c.k0 = k;
      c.sweep = { anchorU: (Math.floor(x) + 0.5) / sim.w, anchorV: (Math.floor(y) + 0.5) / sim.h };
      c.reveal = {
        x: Math.floor(x),
        y: Math.floor(y),
        t0: e.tick,
        speed: DIVE.speed,
        edge: DIVE.edge,
        done: Math.hypot(sim.w, sim.h) + DIVE.edge * 2,
      };
      sim.chem = c;
      return [];
    }
    default:
      return [];
  }
}

export type Director = ((t: number, c: SceneContext) => Stamp[] | null) | undefined;

export interface RunOptions {
  device: GPUDevice;
  sim: LiveSim;
  /**
   * Logged events due at tick t (tick ≤ t) that have not been applied yet,
   * in log order. Each event is handed out exactly once.
   */
  take: (t: number) => readonly SimEvent[];
  director: Director;
  ctx: SceneContext;
  /** timestampWrites for the first compute pass, if profiling. */
  timestamps?: GPUComputePassTimestampWrites;
}

/**
 * Record `n` ticks starting at `sim.tick`. Returns the still-open command
 * encoder (its compute pass ended, uniforms flushed) so the caller can append
 * render work to the final submit. Intermediate submits happen when a tick
 * carries stamps (the brush buffers are written per submit) or the uniform
 * slots run out.
 */
export function runTicks(n: number, o: RunOptions): GPUCommandEncoder {
  const { device, sim } = o;
  let enc = device.createCommandEncoder({ label: "rd-ticks" });
  let pass = enc.beginComputePass({ label: "rd-sim", timestampWrites: o.timestamps });
  let stamped = false;
  let ticksInPass = 0;
  const flush = (): void => {
    pass.end();
    sim.flushUniforms();
    device.queue.submit([enc.finish()]);
    enc = device.createCommandEncoder({ label: "rd-ticks" });
    pass = enc.beginComputePass({ label: "rd-sim" });
    stamped = false;
    ticksInPass = 0;
  };
  const end = sim.tick + n;
  while (sim.tick < end) {
    const t = sim.tick;
    const stamps: Stamp[] = [];
    for (const e of o.take(t)) stamps.push(...applyEvent(sim, e));
    const d = o.director?.(t, o.ctx);
    if (d) stamps.push(...d);
    if (stamps.length > 0) {
      if (stamped || ticksInPass > 0) flush();
      sim.encodeStamps(pass, stamps);
      stamped = true;
    }
    if (sim.slotsFree === 0) flush();
    sim.encodeTick(pass);
    ticksInPass += 1;
  }
  // events due at the boundary we stopped on (edits while paused) apply now,
  // ahead of the tick they are stamped with — the cursor never re-issues them
  const tail: Stamp[] = [];
  for (const e of o.take(sim.tick)) tail.push(...applyEvent(sim, e));
  if (tail.length > 0) {
    if (stamped || ticksInPass > 0) flush();
    sim.encodeStamps(pass, tail);
  }
  pass.end();
  sim.flushUniforms();
  return enc;
}
