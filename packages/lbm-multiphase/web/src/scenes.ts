// lbm-multiphase — preset scenes (spec § 5.5). Presets are UNGATED: their
// ICs may use JS transcendentals freely; the gate scenes in capture.ts use
// only committed data. Density anchors are the measured f64 coexistence
// values (cosmetic ramp constants here; the normative copies live in the
// committed golden tables / gate manifest).

import { LAYER } from "./renderer.js";
import type { ForcingKind, LbmParams, PsiKind } from "./solver.js";

export const T_C_CS = 0.09432870314880763; // pinned; tests re-derive (sim.py)

// measured f64 coexistence anchors (render ramp + IC densities)
export const A9 = { rhoV: 0.45572502, rhoL: 2.2494405 }; // Tier A, G = -9
export const B08 = { rhoV: 0.02156436, rhoL: 0.3071596 }; // Tier B, T/Tc = 0.8
export const B075 = { rhoV: 0.013, rhoL: 0.33 }; // Tier B, T/Tc = 0.75 (approx)

export interface SceneSpec {
  key: string;
  blurb: string;
  nx: number;
  ny: number;
  params: Omit<LbmParams, "nx" | "ny">;
  /** density ramp anchors for the renderer */
  rhoV: number;
  rhoL: number;
  substeps: number;
  layers: number;
  speedGain: number;
  curlGain: number;
  tracers: boolean;
  /** returns rho field (nx*ny, i*ny+j) and optional solid/wettability flags */
  build: (nx: number, ny: number) => { rho: Float32Array; solid?: Uint32Array };
  gravityCtl?: boolean; // expose the gravity slider
}

const tierA = (g = -9.0, tau = 1.0): Omit<LbmParams, "nx" | "ny"> => ({
  psiKind: "exp-lut" as PsiKind,
  forcing: "guo" as ForcingKind,
  g,
  tau,
  sigma: 0,
  csTemp: 0,
  gravity: [0, 0],
  rhoRef: 1,
});

const tierB = (
  ttc = 0.8,
  tau = 0.8,
  gravity: [number, number] = [0, 0],
  rhoRef = B08.rhoV,
): Omit<LbmParams, "nx" | "ny"> => ({
  psiKind: "cs" as PsiKind,
  forcing: "li-sigma" as ForcingKind,
  g: -3.0,
  tau,
  sigma: 0.105,
  csTemp: ttc * T_C_CS,
  gravity,
  rhoRef,
});

function mulberry(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function field(nx: number, ny: number, fill: number): Float32Array {
  const rho = new Float32Array(nx * ny);
  rho.fill(fill);
  return rho;
}

function addDroplet(
  rho: Float32Array,
  nx: number,
  ny: number,
  cx: number,
  cy: number,
  r: number,
  rhoIn: number,
  width = 2.5,
): void {
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const d = Math.hypot(i - cx, j - cy);
      const t = 0.5 * (1 - Math.tanh((d - r) / width));
      const idx = i * ny + j;
      rho[idx] = rho[idx] + (rhoIn - rho[idx]) * t;
    }
  }
}

function wallRect(
  solid: Uint32Array,
  nx: number,
  ny: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  rhoW: number,
): void {
  const packed = 1 | (Math.round(Math.min(Math.max(rhoW, 0), 4) * (65535 / 4)) << 16);
  for (let i = Math.max(0, x0); i < Math.min(nx, x1); i++) {
    for (let j = Math.max(0, y0); j < Math.min(ny, y1); j++) solid[i * ny + j] = packed;
  }
}

export const SCENES: SceneSpec[] = [
  {
    key: "spinodal",
    blurb:
      "Quench one uniform fluid below its critical point and watch it decide to become two — spinodal decomposition, the whole field phase-separating at once.",
    nx: 256,
    ny: 256,
    params: tierB(0.75, 0.8),
    rhoV: B075.rhoV,
    rhoL: B075.rhoL,
    substeps: 10,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso | LAYER.walls,
    speedGain: 8,
    curlGain: 60,
    tracers: false,
    build: (nx, ny) => {
      const rnd = mulberry(42);
      const rho = new Float32Array(nx * ny);
      for (let c = 0; c < nx * ny; c++) rho[c] = 0.13044 * (1 + 0.04 * (rnd() - 0.5));
      return { rho };
    },
  },
  {
    key: "droplet-rain",
    blurb:
      "Vapor seeded with droplets under gravity: coalescence cascades onto a wetting floor. The Young–Laplace gate lives on this physics.",
    nx: 256,
    ny: 256,
    params: tierB(0.8, 0.8, [0, 4e-5], B08.rhoV),
    rhoV: B08.rhoV,
    rhoL: B08.rhoL,
    substeps: 10,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso | LAYER.walls,
    speedGain: 8,
    curlGain: 60,
    tracers: false,
    gravityCtl: true,
    build: (nx, ny) => {
      const rho = field(nx, ny, B08.rhoV);
      const rnd = mulberry(7);
      for (let k = 0; k < 13; k++) {
        // keep seeds clear of the periodic top edge so no droplet straddles
        // the wrap (edge-pinned slugs read wrong on posters and in-app)
        addDroplet(
          rho,
          nx,
          ny,
          12 + rnd() * (nx - 24),
          26 + rnd() * (ny * 0.48),
          7 + rnd() * 11,
          B08.rhoL,
        );
      }
      const solid = new Uint32Array(nx * ny);
      // Wetting arg is an ABSOLUTE virtual wall density in EOS units, not a
      // multiplier: the shipped 1.1 sat near the Carnahan-Starling pole and
      // detonated the liquid-vapor-wall contact line within ~500 steps under
      // gravity (the dam-break NaN-on-load bug). droplet-rain's floor value
      // is the proven-stable wetting for gravity + contact-line scenes.
      const wetRho = 1.4 * (B08.rhoL / 2.25);
      wallRect(solid, nx, ny, 0, nx, ny - 3, ny, wetRho);
      wallRect(solid, nx, ny, 0, 3, 0, ny, wetRho);
      wallRect(solid, nx, ny, nx - 3, nx, 0, ny, wetRho);
      return { rho, solid };
    },
  },
  {
    key: "contact-lab",
    blurb:
      "Three painted wall patches, three contact angles: the same droplet beads up or spreads out depending only on the wall's virtual density.",
    nx: 256,
    ny: 128,
    params: tierA(),
    rhoV: A9.rhoV,
    rhoL: A9.rhoL,
    substeps: 10,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso | LAYER.walls,
    speedGain: 12,
    curlGain: 80,
    tracers: false,
    build: (nx, ny) => {
      const rho = field(nx, ny, A9.rhoV);
      const solid = new Uint32Array(nx * ny);
      // three wettability patches on a 3-row floor (y = ny-3..ny)
      wallRect(solid, nx, ny, 0, 86, ny - 3, ny, 1.05);
      wallRect(solid, nx, ny, 86, 170, ny - 3, ny, 1.4);
      wallRect(solid, nx, ny, 170, nx, ny - 3, ny, 1.8);
      for (const cx of [43, 128, 213]) addDroplet(rho, nx, ny, cx, ny - 3, 20, A9.rhoL);
      return { rho, solid };
    },
  },
  {
    key: "capillary-race",
    blurb:
      "Two channels dip into the same pool; only their wall chemistry differs. The hydrophilic one pulls liquid up against gravity — capillarity from one force term.",
    nx: 256,
    ny: 192,
    params: { ...tierA(), gravity: [0, 4e-5], rhoRef: A9.rhoV },
    rhoV: A9.rhoV,
    rhoL: A9.rhoL,
    substeps: 10,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso | LAYER.walls,
    speedGain: 12,
    curlGain: 80,
    tracers: false,
    gravityCtl: true,
    build: (nx, ny) => {
      const rho = field(nx, ny, A9.rhoV);
      // liquid pool at the bottom
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const t = 0.5 * (1 + Math.tanh((j - (ny - 46)) / 2.5));
          const idx = i * ny + j;
          rho[idx] = rho[idx] + (A9.rhoL - rho[idx]) * t;
        }
      }
      const solid = new Uint32Array(nx * ny);
      const chan = (x: number, rhoW: number): void => {
        wallRect(solid, nx, ny, x, x + 4, 18, ny - 30, rhoW);
        wallRect(solid, nx, ny, x + 16, x + 20, 18, ny - 30, rhoW);
      };
      chan(70, 1.9); // hydrophilic — rises
      chan(166, 1.05); // near-neutral — stays put
      wallRect(solid, nx, ny, 0, nx, ny - 2, ny, 1.2);
      return { rho, solid };
    },
  },
  {
    key: "rising-bubble",
    blurb:
      "A vapor bubble buoyantly rising through liquid — the classic benchmark GEOMETRY (Hysing case 1 is its quantitative cousin; this preset is a demo, and says so).",
    nx: 128,
    ny: 256,
    params: tierB(0.8, 0.8, [0, 5e-5], 0.16),
    rhoV: B08.rhoV,
    rhoL: B08.rhoL,
    substeps: 12,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso | LAYER.walls,
    speedGain: 8,
    curlGain: 60,
    tracers: false,
    gravityCtl: true,
    build: (nx, ny) => {
      const rho = field(nx, ny, B08.rhoL);
      addDroplet(rho, nx, ny, nx / 2, ny - 60, 22, B08.rhoV);
      // vapor headspace on top so the column can displace
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const t = 0.5 * (1 - Math.tanh((j - 24) / 2.5));
          const idx = i * ny + j;
          rho[idx] = rho[idx] + (B08.rhoV - rho[idx]) * t;
        }
      }
      const solid = new Uint32Array(nx * ny);
      // Wetting arg is an ABSOLUTE virtual wall density in EOS units, not a
      // multiplier: the shipped 1.1 sat near the Carnahan-Starling pole and
      // detonated the liquid-vapor-wall contact line within ~500 steps under
      // gravity (the dam-break NaN-on-load bug). droplet-rain's floor value
      // is the proven-stable wetting for gravity + contact-line scenes.
      const wetRho = 1.4 * (B08.rhoL / 2.25);
      wallRect(solid, nx, ny, 0, nx, ny - 3, ny, wetRho);
      wallRect(solid, nx, ny, 0, 3, 0, ny, wetRho);
      wallRect(solid, nx, ny, nx - 3, nx, 0, ny, wetRho);
      return { rho, solid };
    },
  },
  {
    key: "oscillating-droplet",
    blurb:
      "An ellipse relaxing to a circle rings at Lamb's frequency — surface tension as a restoring force, gated against the 1932 formula in the f64 reference.",
    nx: 192,
    ny: 192,
    params: tierA(-9.0, 0.7),
    rhoV: A9.rhoV,
    rhoL: A9.rhoL,
    substeps: 14,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso,
    speedGain: 14,
    curlGain: 90,
    tracers: false,
    build: (nx, ny) => {
      const rho = field(nx, ny, A9.rhoV);
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const d =
            Math.hypot((i - nx / 2) / 40, (j - ny / 2) / 32) * 32;
          const t = 0.5 * (1 - Math.tanh((d - 32) / 2.5));
          const idx = i * ny + j;
          rho[idx] = rho[idx] + (A9.rhoL - rho[idx]) * t;
        }
      }
      return { rho };
    },
  },
  {
    key: "dam-break",
    blurb:
      "A liquid column collapses under gravity. Honest label: this is liquid–vapor multiphase (the vapor is simulated), NOT a free-surface VoF model like the famous GPU splash demos.",
    nx: 256,
    ny: 160,
    params: tierB(0.8, 0.8, [0, 4e-5], B08.rhoV),
    rhoV: B08.rhoV,
    rhoL: B08.rhoL,
    substeps: 10,
    layers: LAYER.phase | LAYER.refraction | LAYER.iso | LAYER.walls,
    speedGain: 8,
    curlGain: 60,
    tracers: true,
    gravityCtl: true,
    build: (nx, ny) => {
      const rho = field(nx, ny, B08.rhoV);
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          // Wide tanh edges + a few cells of clearance off the side wall:
          // gentler interfaces survive the collapse; the column still slumps
          // against the wall within the first second of the run.
          const inXL = 0.5 * (1 + Math.tanh((i - 7) / 4));
          const inXR = 0.5 * (1 - Math.tanh((i - 78) / 4));
          const inY = 0.5 * (1 + Math.tanh((j - 44) / 4));
          const idx = i * ny + j;
          rho[idx] = rho[idx] + (B08.rhoL - rho[idx]) * inXL * inXR * inY;
        }
      }
      const solid = new Uint32Array(nx * ny);
      // Wetting arg is an ABSOLUTE virtual wall density in EOS units, not a
      // multiplier: the shipped 1.1 sat near the Carnahan-Starling pole and
      // detonated the liquid-vapor-wall contact line within ~500 steps under
      // gravity (the dam-break NaN-on-load bug). droplet-rain's floor value
      // is the proven-stable wetting for gravity + contact-line scenes.
      const wetRho = 1.4 * (B08.rhoL / 2.25);
      wallRect(solid, nx, ny, 0, nx, ny - 3, ny, wetRho);
      wallRect(solid, nx, ny, 0, 3, 0, ny, wetRho);
      wallRect(solid, nx, ny, nx - 3, nx, 0, ny, wetRho);
      return { rho, solid };
    },
  },
  {
    key: "wind-tunnel",
    blurb:
      "Family continuity: the same kernel with the interaction switched off (G = 0) is a classic single-phase LBM — a von Kármán street behind a cylinder.",
    nx: 384,
    ny: 160,
    params: {
      psiKind: "exp-lut",
      forcing: "guo",
      g: 0,
      tau: 0.56,
      sigma: 0,
      csTemp: 0,
      gravity: [1.2e-5, 0],
      rhoRef: 0,
    },
    rhoV: 0.9,
    rhoL: 1.1,
    substeps: 14,
    layers: LAYER.curl | LAYER.walls,
    speedGain: 10,
    curlGain: 260,
    tracers: true,
    build: (nx, ny) => {
      const rho = field(nx, ny, 1.0);
      const solid = new Uint32Array(nx * ny);
      const cx = 96;
      const cy = ny / 2 + 2; // slight offset seeds the asymmetry
      const r = 16;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r) solid[i * ny + j] = 1 | (16384 << 16);
        }
      }
      return { rho, solid };
    },
  },
];

export function sceneByKey(key: string): SceneSpec {
  return SCENES.find((s) => s.key === key) ?? SCENES[1];
}
