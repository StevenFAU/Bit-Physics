// presets.ts — materials and scene templates, materialized from the data
// spine (src/generated/verification.json .materials / .presets — presets are
// DATA, not code: adding a template is one JSON entry in gen-verification.mjs,
// and the current scene state round-trips through the URL query string).

import { FLOATS_PER_PARTICLE, packParticle, type MaterialDef } from "./solver.js";
import { mulberry32 } from "./mirror.js";

export interface MaterialSpec {
  name: string;
  model: number; // 0 jelly, 1 snow, 2 sand, 3 water
  E?: number;
  nu?: number;
  rho: number;
  thetaC?: number;
  thetaS?: number;
  xi?: number;
  frictionDeg?: number;
  kStiff?: number;
  gammaExp?: number;
  color: [number, number, number, number]; // rgb + gloss
}

export interface BlockSpec {
  shape: "box" | "sphere";
  material: string;
  min?: [number, number, number];
  size?: [number, number, number];
  center?: [number, number, number];
  radius?: number;
  vel?: [number, number, number];
}

export interface PresetSpecData {
  id: string;
  label: string;
  title: string;
  gridN: number;
  floorZ: number;
  frameAdvance: number; // simulated seconds per rendered frame
  camera: { yaw: number; pitch: number; dist: number };
  blocks: BlockSpec[];
  budget: number; // default particle budget (adaptive-N may lower it)
}

/** Lame parameters from (E, nu). */
export function lame(E: number, nu: number): { mu: number; lam: number } {
  return {
    mu: E / (2 * (1 + nu)),
    lam: (E * nu) / ((1 + nu) * (1 - 2 * nu)),
  };
}

/** Klar 2016 Drucker-Prager cone coefficient from the friction angle. */
export function dpAlpha(frictionDeg: number): number {
  const s = Math.sin((frictionDeg * Math.PI) / 180);
  return Math.sqrt(2 / 3) * ((2 * s) / (3 - s));
}

export const RHO_REF = 1000; // water density = the mass-unit normalizer

export function toMaterialDef(m: MaterialSpec, eScale = 1): MaterialDef {
  const { mu, lam } =
    m.E !== undefined && m.nu !== undefined
      ? lame(m.E * eScale, m.nu)
      : { mu: 0, lam: 0 };
  return {
    model: m.model,
    mu0: mu,
    lam0: lam,
    xi: m.xi ?? 0,
    thetaC: m.thetaC ?? 0,
    thetaS: m.thetaS ?? 0,
    alpha: m.frictionDeg !== undefined ? dpAlpha(m.frictionDeg) : 0,
    kStiff: (m.kStiff ?? 0) * eScale,
    gammaExp: m.gammaExp ?? 1,
  };
}

/** Conservative pressure-wave speed estimate for the auto-dt CFL bound. */
export function waveSpeed(m: MaterialSpec, eScale = 1): number {
  if (m.model === 3) {
    const K = (m.kStiff ?? 0) * eScale * (m.gammaExp ?? 1);
    return Math.sqrt(Math.max(K, 1) / m.rho);
  }
  const { mu, lam } = lame((m.E ?? 1000) * eScale, m.nu ?? 0.3);
  // Snow hardening multiplies both Lame parameters by up to exp(xi*theta_c)+;
  // budget a typical hardened factor of 3 into the bound.
  const harden = m.model === 1 ? 3 : 1;
  return Math.sqrt(((lam + 2 * mu) * harden) / m.rho);
}

export interface SeededScene {
  data: Float32Array;
  count: number;
  /** Per-particle physical mass unit: RHO_REF * vol0 (normalized mass 1). */
  massUnit: number;
  vol0: number;
  materialsUsed: Set<number>;
}

/**
 * Deterministically seed a preset's blocks on a jittered lattice
 * (mulberry32, fixed seed per preset — frame-indexed / reproducible;
 * no Math.random anywhere in the sim path).
 */
export function seedScene(
  preset: PresetSpecData,
  materials: MaterialSpec[],
  budget: number,
): SeededScene {
  const dx = 1 / preset.gridN;
  const matIndex = new Map(materials.map((m, i) => [m.name, i]));

  // Natural spacing = dx/2 (8 particles per cell); widen to honor the budget.
  const volumes = preset.blocks.map((b) =>
    b.shape === "sphere"
      ? (4 / 3) * Math.PI * (b.radius ?? 0.1) ** 3
      : (b.size ?? [0.1, 0.1, 0.1]).reduce((a, c) => a * c, 1),
  );
  const totalVol = volumes.reduce((a, c) => a + c, 0);
  const naturalSpacing = dx / 2;
  const naturalCount = totalVol / naturalSpacing ** 3;
  const spacing =
    naturalCount > budget
      ? naturalSpacing * Math.cbrt(naturalCount / budget)
      : naturalSpacing;
  const vol0 = spacing ** 3;
  const massUnit = RHO_REF * vol0;

  const est = Math.ceil((totalVol / vol0) * 1.3) + 1024;
  const data = new Float32Array(est * FLOATS_PER_PARTICLE);
  let count = 0;
  const lo = 2 * dx;
  const hi = (preset.gridN - 2) * dx;
  const materialsUsed = new Set<number>();

  preset.blocks.forEach((b, bi) => {
    const rng = mulberry32(0x9e3779b9 ^ (bi * 2654435761));
    const mi = matIndex.get(b.material) ?? 0;
    const spec = materials[mi];
    const massNorm = spec.rho / RHO_REF;
    materialsUsed.add(mi);
    const vel = b.vel ?? [0, 0, 0];
    const place = (x: number, y: number, z: number): void => {
      if (count * FLOATS_PER_PARTICLE >= data.length) return;
      const jx = (rng() - 0.5) * spacing;
      const jy = (rng() - 0.5) * spacing;
      const jz = (rng() - 0.5) * spacing;
      const px = Math.min(Math.max(x + jx, lo), hi);
      const py = Math.min(Math.max(y + jy, lo), hi);
      const pz = Math.min(Math.max(z + jz, lo), hi);
      packParticle(
        data,
        count,
        [px, py, pz],
        [vel[0], vel[1], vel[2]],
        massNorm,
        vol0,
        mi,
      );
      count += 1;
    };
    if (b.shape === "sphere") {
      const c = b.center ?? [0.5, 0.5, 0.5];
      const r = b.radius ?? 0.1;
      const n = Math.ceil((2 * r) / spacing);
      for (let ix = 0; ix <= n; ix += 1) {
        for (let iy = 0; iy <= n; iy += 1) {
          for (let iz = 0; iz <= n; iz += 1) {
            const x = c[0] - r + ix * spacing;
            const y = c[1] - r + iy * spacing;
            const z = c[2] - r + iz * spacing;
            const d2 = (x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2;
            if (d2 < r * r) place(x, y, z);
          }
        }
      }
    } else {
      const min = b.min ?? [0.1, 0.1, 0.1];
      const size = b.size ?? [0.2, 0.2, 0.2];
      const nx = Math.max(1, Math.round(size[0] / spacing));
      const ny = Math.max(1, Math.round(size[1] / spacing));
      const nz = Math.max(1, Math.round(size[2] / spacing));
      for (let ix = 0; ix < nx; ix += 1) {
        for (let iy = 0; iy < ny; iy += 1) {
          for (let iz = 0; iz < nz; iz += 1) {
            place(
              min[0] + (ix + 0.5) * spacing,
              min[1] + (iy + 0.5) * spacing,
              min[2] + (iz + 0.5) * spacing,
            );
          }
        }
      }
    }
  });

  return { data: data.subarray(0, count * FLOATS_PER_PARTICLE), count, massUnit, vol0, materialsUsed };
}
