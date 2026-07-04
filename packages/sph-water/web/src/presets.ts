// Scene presets — the template gallery (spec § 4.1). Each preset is a
// named, seeded, deterministic scene: particle seeding is lattice-based
// (no RNG in the live path), interaction driver state is frame-indexed,
// and per-preset solver parameters are pinned here so a preset is a
// reproducible experiment, not a slider soup.
//
// The live solver is beyond-reference (spec § 3.2) — these scenes are the
// playground tier. "The gate scene" is the exception: it replays the
// committed canonical capture (rigid free-fall) with the live
// error-vs-committed readout — a preset that IS a verification run.

import type { GridConfig, LiveConfig } from "./solver.js";

export interface FluidRegion {
  kind: "box" | "sphere";
  min?: [number, number, number];
  max?: [number, number, number];
  center?: [number, number, number];
  radius?: number;
}

export interface ScenePreset {
  id: string;
  label: string;
  title: string; // hover copy: what it shows + why it's here
  regions: FluidRegion[];
  gravity: [number, number, number];
  xsphAlpha: number;
  obstacle?: [number, number, number, number];
  emitter?: { pos: [number, number, number]; radius: number; vel: [number, number, number] };
  stirrer?: { center: [number, number, number]; radius: number; strength: number };
  piston?: { min: number; max: number; period: number };
  gateScene?: boolean;
}

export const BOX_MIN: [number, number, number] = [0, 0, 0];
export const BOX_MAX: [number, number, number] = [1, 1, 1];

export const PRESETS: ScenePreset[] = [
  {
    id: "dam-break",
    label: "dam break",
    title:
      "The classic column collapse — the benchmark scene of the DFSPH paper (Bender & Koschier 2015). A water column released against gravity.",
    regions: [{ kind: "box", min: [0.02, 0.02, 0.02], max: [0.38, 0.98, 0.75] }],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.06,
  },
  {
    id: "double-dam",
    label: "double dam",
    title: "Two columns released at opposite walls collide in the middle — symmetric splash.",
    regions: [
      { kind: "box", min: [0.02, 0.02, 0.02], max: [0.3, 0.98, 0.65] },
      { kind: "box", min: [0.7, 0.02, 0.02], max: [0.98, 0.98, 0.65] },
    ],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.06,
  },
  {
    id: "faucet",
    label: "faucet",
    title: "A deterministic emitter pours a stream into a shallow pool — watch the pile-up and the pressure solve keep it incompressible.",
    regions: [{ kind: "box", min: [0.02, 0.02, 0.02], max: [0.98, 0.98, 0.12] }],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.05,
    emitter: { pos: [0.5, 0.5, 0.92], radius: 0.05, vel: [0, 0, -1.6] },
  },
  {
    id: "sloshing",
    label: "sloshing tank",
    title: "A half-filled tank; tilt gravity (drag the gravity dial or tilt your device) and the free surface sloshes.",
    regions: [{ kind: "box", min: [0.02, 0.02, 0.02], max: [0.98, 0.98, 0.35] }],
    gravity: [2.5, 0, -9.3],
    xsphAlpha: 0.08,
  },
  {
    id: "hydrostatic",
    label: "hydrostatic",
    title:
      "Still water — the honesty scene. Watch the Tier-2 density error settle and the kernel-normalization check on a resting state; a solver that can't hold still water can't be trusted with a splash.",
    regions: [{ kind: "box", min: [0.02, 0.02, 0.02], max: [0.98, 0.98, 0.4] }],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.1,
  },
  {
    id: "zero-g",
    label: "zero-g blob",
    title: "A fluid sphere with gravity off — surface effects and the divergence-free solve keep the blob coherent.",
    regions: [{ kind: "sphere", center: [0.5, 0.5, 0.55], radius: 0.22 }],
    gravity: [0, 0, 0],
    xsphAlpha: 0.12,
  },
  {
    id: "whirlpool",
    label: "whirlpool",
    title: "An orbiting stirrer impulse drives a vortex in a shallow pool — frame-indexed, deterministic.",
    regions: [{ kind: "box", min: [0.02, 0.02, 0.02], max: [0.98, 0.98, 0.3] }],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.04,
    stirrer: { center: [0.5, 0.5, 0.15], radius: 0.26, strength: 1.4 },
  },
  {
    id: "ball-drop",
    label: "ball drop",
    title: "A water column falls onto a fixed sphere obstacle (SDF collision) — crown splash.",
    regions: [{ kind: "box", min: [0.3, 0.3, 0.55], max: [0.7, 0.7, 0.95] }],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.06,
    obstacle: [0.5, 0.5, 0.28, 0.14],
  },
  {
    id: "piston",
    label: "piston",
    title: "A moving wall squeezes the domain (the WebGPU-Ocean signature interaction) — watch the incompressibility solve push back.",
    regions: [{ kind: "box", min: [0.02, 0.02, 0.02], max: [0.98, 0.98, 0.35] }],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0.06,
    piston: { min: 0.55, max: 1.0, period: 480 },
  },
  {
    id: "gate-scene",
    label: "the gate scene",
    title:
      "The canonical free-fall replay — the exact scene the CI gate runs: the committed 100K IC under the reference integrator, with the live error-vs-committed readout. A preset that IS a verification run.",
    regions: [],
    gravity: [0, 0, -9.81],
    xsphAlpha: 0,
    gateScene: true,
  },
];

// Lattice-fill the preset regions with ~nTarget particles. Returns the
// positions plus the derived discretization (spacing, h, mass) — the
// standard graphics sizing h = 1.2 * spacing under the repo's support-2h
// kernel (=> support 2.4 * spacing, ~58 neighbors at rest).
export function seedScene(
  preset: ScenePreset,
  nTarget: number,
  rho0: number,
): { positions: Float32Array; spacing: number; h: number; mass: number } {
  let volume = 0;
  for (const r of preset.regions) {
    if (r.kind === "box" && r.min && r.max) {
      volume +=
        (r.max[0] - r.min[0]) * (r.max[1] - r.min[1]) * (r.max[2] - r.min[2]);
    } else if (r.kind === "sphere" && r.radius) {
      volume += (4 / 3) * Math.PI * r.radius ** 3;
    }
  }
  if (volume === 0) volume = 0.05; // emitter-only scenes: size h off the pool
  const spacing = Math.cbrt(volume / Math.max(nTarget, 1));
  const h = 1.2 * spacing;
  // 1.07: measured interior-density calibration — a raw rho0*s^3 lattice
  // sums to ~0.93*rho0 under the support-2h kernel at h=1.2s, and the
  // resulting collapse-then-pressure "pop" on every reseed is visible.
  const mass = rho0 * spacing ** 3 * 1.07;
  const pts: number[] = [];
  for (const r of preset.regions) {
    if (r.kind === "box" && r.min && r.max) {
      for (let x = r.min[0] + spacing / 2; x < r.max[0]; x += spacing)
        for (let y = r.min[1] + spacing / 2; y < r.max[1]; y += spacing)
          for (let z = r.min[2] + spacing / 2; z < r.max[2]; z += spacing)
            pts.push(x, y, z);
    } else if (r.kind === "sphere" && r.center && r.radius) {
      const c = r.center;
      const R = r.radius;
      for (let x = c[0] - R; x <= c[0] + R; x += spacing)
        for (let y = c[1] - R; y <= c[1] + R; y += spacing)
          for (let z = c[2] - R; z <= c[2] + R; z += spacing) {
            const dx = x - c[0];
            const dy = y - c[1];
            const dz = z - c[2];
            if (dx * dx + dy * dy + dz * dz <= R * R) pts.push(x, y, z);
          }
    }
  }
  return { positions: new Float32Array(pts), spacing, h, mass };
}

// Deterministic emitter pattern: a small disc of lattice points, spawned
// every `every` frames (frame-indexed — no RNG, no wall clock).
export function emitterBatch(
  e: NonNullable<ScenePreset["emitter"]>,
  spacing: number,
  frame: number,
): Float32Array | null {
  const every = Math.max(1, Math.round((0.9 * spacing) / (Math.abs(e.vel[2]) / 60)));
  if (frame % every !== 0) return null;
  const pts: number[] = [];
  for (let x = -e.radius; x <= e.radius; x += spacing)
    for (let y = -e.radius; y <= e.radius; y += spacing)
      if (x * x + y * y <= e.radius * e.radius)
        pts.push(e.pos[0] + x, e.pos[1] + y, e.pos[2]);
  return pts.length ? new Float32Array(pts) : null;
}

export function liveConfigFor(
  preset: ScenePreset,
  seeded: { h: number; mass: number },
  opts: { rho0: number; warmStart: boolean; densityIters: number; divergenceIters: number },
): LiveConfig {
  // CFL-scaled timestep (SPH tutorial lambda ~ 0.4 against a ~5 m/s design
  // peak for unit-box gravity scenes) — a fixed dt at high N (smaller h) was
  // measured to detonate the pressure solve via tunneling.
  const dt = Math.min(0.0035, Math.max(0.0012, (0.4 * seeded.h) / 5.0));
  // Velocity ceiling (measured, dam-break settle sweep 2026-07-04): ~2x the
  // CFL-safe speed. The wider 0.9*2h/dt tunneling-only bound let the
  // pressure solve run far past its stable regime and the fluid aerated
  // into permanent foam; 0.315*2h/dt (~7.9 m/s) settles the dam to rest.
  const vmax = (0.315 * 2 * seeded.h) / dt;
  const cell = 2 * seeded.h;
  const grid: GridConfig = {
    origin: [BOX_MIN[0] - cell, BOX_MIN[1] - cell, BOX_MIN[2] - cell],
    dims: [
      Math.ceil((BOX_MAX[0] - BOX_MIN[0] + 2 * cell) / cell),
      Math.ceil((BOX_MAX[1] - BOX_MIN[1] + 2 * cell) / cell),
      Math.ceil((BOX_MAX[2] - BOX_MIN[2] + 2 * cell) / cell),
    ],
    cell,
  };
  return {
    n: 0,
    h: seeded.h,
    grid,
    dt,
    mass: seeded.mass,
    rho0: opts.rho0,
    gravity: [...preset.gravity],
    boxMin: [...BOX_MIN],
    boxMax: [...BOX_MAX],
    xsphAlpha: preset.xsphAlpha,
    restitution: 0.02,
    friction: 0.002,
    kappaClamp: 1e6,
    surfaceNcount: 20,
    vmax,
    warmStart: opts.warmStart,
    densityIters: opts.densityIters,
    divergenceIters: opts.divergenceIters,
  };
}
