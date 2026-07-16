// fdtd-optics — preset scene gallery (spec-ref § 5.5: ≥12 curated scenes,
// each a `?preset=` shareable URL, each wired to a golden where one exists).
//
// A scene = grid + boundaries + materials painter + emitters (point/beam
// sources, JS-f64 signatures) or a TF/SF plane wave + render defaults.

import { LAYER } from "./renderer.js";
import type { PmlSpec, TfsfBox } from "./solver.js";

export interface Emitter {
  i: number;
  j: number;
  kind: "cw" | "ricker";
  amp: number;
  /** rad/step (CW) */
  omega: number;
  phase: number;
  t0?: number;
  tau?: number;
}

export interface SceneSpec {
  key: string;
  label: string;
  blurb: string;
  /** golden hook shown in the PROVE readout (null = qualitative scene). */
  golden: string | null;
  nx: number;
  ny: number;
  pml: PmlSpec;
  periodicY: boolean;
  tfsf: TfsfBox | null;
  /** TF/SF signature (when tfsf != null). */
  planeWave?: { kind: "cw" | "ricker"; amp: number; omega: number; t0?: number; tau?: number };
  emitters: Emitter[];
  paint?: (mat: Float32Array, mat2: Float32Array, nx: number, ny: number) => void;
  /** display/DFT frequency (rad/step) for the phasor layers. */
  displayOmega: number;
  substeps: number;
  layers: number;
  exposure: number;
  fieldGain: number;
  ampGain: number;
  isoK: number;
  tracers: boolean;
  /** per-element phase step (deg) — live slider for array scenes. */
  phaseStepDeg?: number;
  /** wavelength slider bounds (cells). */
  lambdaMin?: number;
  lambdaMax?: number;
}

const SC = 0.5;
export const omegaOf = (lambdaCells: number): number => (2 * Math.PI * SC) / lambdaCells;

const idx = (i: number, j: number, ny: number): number => i * ny + j;
const setEps = (mat: Float32Array, i: number, j: number, ny: number, eps: number): void => {
  mat[idx(i, j, ny) * 4] = eps;
};
const setPec = (mat2: Float32Array, i: number, j: number, ny: number): void => {
  mat2[idx(i, j, ny) * 2 + 1] = 1;
};
const setDrude = (
  mat: Float32Array,
  i: number,
  j: number,
  ny: number,
  wp: number,
  gamma: number,
): void => {
  const k = idx(i, j, ny) * 4;
  mat[k + 2] = wp;
  mat[k + 3] = gamma;
};
const setKerr = (mat2: Float32Array, i: number, j: number, ny: number, chi3: number): void => {
  mat2[idx(i, j, ny) * 2] = chi3;
};

const PML12: PmlSpec = { n: 12, x0: true, x1: true, y0: true, y1: true };

function beam(
  i0: number,
  jCenter: number,
  count: number,
  spacing: number,
  omega: number,
  steerDeg: number,
  amp: number,
): Emitter[] {
  // phased vertical line array with a gaussian taper -> a steered beam.
  // Steering: dphi = -k d sin(theta) per element (theta from +x axis).
  const k = omega / SC; // wavenumber (rad/cell), c = 1
  const dphi = -k * spacing * Math.sin((steerDeg * Math.PI) / 180);
  const out: Emitter[] = [];
  for (let e = 0; e < count; e++) {
    const off = e - (count - 1) / 2;
    const taper = Math.exp(-((off / (count * 0.38)) ** 2));
    out.push({
      i: i0,
      j: Math.round(jCenter + off * spacing),
      kind: "cw",
      amp: amp * taper,
      omega,
      phase: dphi * e,
    });
  }
  return out;
}

const OM_DEF = omegaOf(24); // default CW wavelength: 24 cells

export const SCENES: SceneSpec[] = [
  {
    key: "double-slit",
    label: "Double slit",
    blurb:
      "A plane wave meets a conducting barrier with two openings; the interference fan is Maxwell, not an overlay.",
    golden: "fringe spacing ~ λL/d (Young)",
    nx: 384,
    ny: 384,
    pml: PML12,
    periodicY: false,
    tfsf: { ia: 40, ib: 344, ja: 40, jb: 344, na: 900 },
    planeWave: { kind: "cw", amp: 1, omega: OM_DEF },
    emitters: [],
    paint: (mat, mat2, _nx, ny) => {
      const bx = 150;
      const gap = 10;
      const sep = 46;
      for (let i = bx; i < bx + 4; i++) {
        for (let j = 14; j < ny - 14; j++) {
          const c = ny / 2;
          const inSlit =
            (j > c - sep / 2 - gap / 2 && j < c - sep / 2 + gap / 2) ||
            (j > c + sep / 2 - gap / 2 && j < c + sep / 2 + gap / 2);
          if (!inSlit) setPec(mat2, i, j, ny);
        }
      }
      void mat;
    },
    displayOmega: OM_DEF,
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 0.65,
    fieldGain: 1.6,
    ampGain: 2.2,
    isoK: 14,
    tracers: false,
    lambdaMin: 14,
    lambdaMax: 44,
  },
  {
    key: "snell",
    label: "Refraction (Snell)",
    blurb:
      "A steered beam crosses into glass (n = 1.5): wavefronts kink and compress, and a partial reflection peels off — Fresnel live.",
    golden: "sin θ₁ = n sin θ₂; R₀ = 0.04",
    nx: 420,
    ny: 420,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: beam(40, 120, 24, 3, OM_DEF, 28, 0.85),
    paint: (mat, _mat2, nx, ny) => {
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) if (i > nx * 0.52) setEps(mat, i, j, ny, 2.25);
      }
    },
    displayOmega: OM_DEF,
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.schlieren | LAYER.sources,
    exposure: 0.65,
    fieldGain: 2.2,
    ampGain: 3,
    isoK: 12,
    tracers: true,
    lambdaMin: 16,
    lambdaMax: 40,
  },
  {
    key: "mie",
    label: "Cylinder scattering (Mie)",
    blurb:
      "A pulse sheds concentric scattered wavefronts off a dielectric rod — the exact scene the deploy gate checks against the Bohren–Huffman series.",
    golden: "Q_sca vs committed cylinder-Mie table (x = 3, 5)",
    nx: 384,
    ny: 384,
    pml: PML12,
    periodicY: false,
    tfsf: { ia: 60, ib: 324, ja: 60, jb: 324, na: 1000 },
    planeWave: { kind: "cw", amp: 1, omega: omegaOf(33.5) },
    emitters: [],
    paint: (mat, _mat2, nx, ny) => {
      const c = nx / 2;
      const r = 16;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const dx = i - c;
          const dy = j - c;
          if (dx * dx + dy * dy <= r * r) setEps(mat, i, j, ny, 2.25);
        }
      }
    },
    displayOmega: omegaOf(33.5),
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 0.65,
    fieldGain: 1.0,
    ampGain: 2.5,
    isoK: 16,
    tracers: false,
    lambdaMin: 20,
    lambdaMax: 60,
  },
  {
    key: "lens",
    label: "Dielectric lens",
    blurb:
      "Wavefronts curve through a plano-convex lens and collapse into a bright focal spot — real caustics from Maxwell, bloom just lets them blaze.",
    golden: "focus ≈ R/(n−1) (lensmaker, thick-lens caveat)",
    nx: 448,
    ny: 448,
    pml: PML12,
    periodicY: false,
    tfsf: { ia: 30, ib: 418, ja: 30, jb: 418, na: 1100 },
    planeWave: { kind: "cw", amp: 1, omega: OM_DEF },
    emitters: [],
    paint: (mat, _mat2, nx, ny) => {
      // biconvex lens: intersection of two circles (R = 170, centers offset
      // +/-130 around x = 165) — thickness ~80, aperture ~219, f ~ R/2(n-1)
      const n = 1.5;
      const rr = 170;
      const off = 130;
      const cxL = 165;
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const dy = j - ny / 2;
          const d1 = (i - (cxL - off)) ** 2 + dy * dy;
          const d2 = (i - (cxL + off)) ** 2 + dy * dy;
          if (d1 <= rr * rr && d2 <= rr * rr) setEps(mat, i, j, ny, n * n);
        }
      }
    },
    displayOmega: OM_DEF,
    substeps: 12,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 1.1,
    fieldGain: 0.8,
    ampGain: 1.2,
    isoK: 14,
    tracers: true,
    lambdaMin: 16,
    lambdaMax: 40,
  },
  {
    key: "phased-array",
    label: "Phased-array steering",
    blurb:
      "Sixteen coherent emitters with a live phase-gradient slider: drag it and watch the beam swing. The steering angle is an exact analytic golden.",
    golden: "θ₀ = arcsin(Δφ λ / 2π d)",
    nx: 448,
    ny: 448,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: Array.from({ length: 16 }, (_, e) => ({
      i: 60,
      j: Math.round(448 / 2 + (e - 7.5) * 6),
      kind: "cw" as const,
      amp: 0.55,
      omega: OM_DEF,
      phase: 0,
    })),
    displayOmega: OM_DEF,
    substeps: 12,
    layers: LAYER.energy | LAYER.sources,
    exposure: 0.65,
    fieldGain: 1.5,
    ampGain: 2.4,
    isoK: 12,
    tracers: true,
    phaseStepDeg: 60,
    lambdaMin: 16,
    lambdaMax: 40,
  },
  {
    key: "two-source",
    label: "Two-source interference",
    blurb:
      "The hydrogen atom of wave optics: two coherent dipoles, hyperbolic nodal lines. Drag either source and the pattern follows.",
    golden: "nodal hyperbolae: |r₁−r₂| = (m+½)λ",
    nx: 384,
    ny: 384,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: [
      { i: 150, j: 152, kind: "cw", amp: 0.8, omega: OM_DEF, phase: 0 },
      { i: 150, j: 232, kind: "cw", amp: 0.8, omega: OM_DEF, phase: 0 },
    ],
    displayOmega: OM_DEF,
    substeps: 10,
    layers: LAYER.energy | LAYER.sources,
    exposure: 0.65,
    fieldGain: 1.3,
    ampGain: 2.4,
    isoK: 14,
    tracers: false,
    lambdaMin: 14,
    lambdaMax: 44,
  },
  {
    key: "waveguide",
    label: "Slab waveguide",
    blurb:
      "A high-index slab traps light by total internal reflection; the guided mode hugs the core with evanescent skirts in the cladding.",
    golden: "n_eff between n_clad and n_core (slab dispersion)",
    nx: 448,
    ny: 320,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: [{ i: 40, j: 160, kind: "cw", amp: 0.9, omega: omegaOf(30), phase: 0 }],
    paint: (mat, _mat2, nx, ny) => {
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          if (Math.abs(j - ny / 2) <= 7) setEps(mat, i, j, ny, 6.0);
        }
      }
    },
    displayOmega: omegaOf(30),
    substeps: 12,
    layers: LAYER.energy | LAYER.underlay | LAYER.envelope | LAYER.sources,
    exposure: 0.65,
    fieldGain: 2.2,
    ampGain: 3,
    isoK: 12,
    tracers: true,
    lambdaMin: 20,
    lambdaMax: 44,
  },
  {
    key: "tir",
    label: "Total internal reflection",
    blurb:
      "A beam inside glass strikes the surface beyond the critical angle (41.8°): total reflection plus an evanescent skin that carries no power away.",
    golden: "θ_c = arcsin(1/1.5) = 41.8°",
    nx: 420,
    ny: 420,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: beam(60, 100, 24, 3, OM_DEF, 52, 0.85),
    paint: (mat, _mat2, nx, ny) => {
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) if (i < nx * 0.62) setEps(mat, i, j, ny, 2.25);
      }
    },
    displayOmega: OM_DEF,
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.schlieren | LAYER.sources,
    exposure: 0.65,
    fieldGain: 2.2,
    ampGain: 3,
    isoK: 12,
    tracers: true,
    lambdaMin: 16,
    lambdaMax: 40,
  },
  {
    key: "brewster",
    label: "Brewster angle",
    blurb:
      "TMz maps to p-polarization: steer the beam to 56.3° and the reflected wave all but vanishes — the polarizing angle, live.",
    golden: "θ_B = arctan(1.5) = 56.31°, R_p → 0",
    nx: 448,
    ny: 448,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: beam(40, 110, 28, 3, OM_DEF, 56.3, 0.85),
    paint: (mat, _mat2, nx, ny) => {
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) if (i > nx * 0.55) setEps(mat, i, j, ny, 2.25);
      }
    },
    displayOmega: OM_DEF,
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 0.65,
    fieldGain: 2.4,
    ampGain: 3,
    isoK: 12,
    tracers: false,
    lambdaMin: 16,
    lambdaMax: 40,
  },
  {
    key: "grating",
    label: "Diffraction grating",
    blurb:
      "A periodic conductor fans one wave into discrete diffraction orders at exactly the grating-equation angles.",
    golden: "sin θ_m = mλ/d (order angles + count)",
    nx: 448,
    ny: 448,
    pml: PML12,
    periodicY: false,
    tfsf: { ia: 40, ib: 408, ja: 40, jb: 408, na: 1100 },
    planeWave: { kind: "cw", amp: 1, omega: omegaOf(20) },
    emitters: [],
    paint: (_mat, mat2, _nx, ny) => {
      const d = 40; // period (cells); lambda = 20 -> sin θ₁ = 0.5 -> 30°
      for (let i = 200; i < 204; i++) {
        for (let j = 14; j < ny - 14; j++) {
          if (j % d < d * 0.55) setPec(mat2, i, j, ny);
        }
      }
    },
    displayOmega: omegaOf(20),
    substeps: 12,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 0.65,
    fieldGain: 0.9,
    ampGain: 2.6,
    isoK: 14,
    tracers: true,
    lambdaMin: 14,
    lambdaMax: 36,
  },
  {
    key: "drude",
    label: "Plasmonic metal (Drude)",
    blurb:
      "A real dispersive metal via the ADE Drude model: below ω_p it mirrors, near resonance nanoparticles concentrate light into hot spots.",
    golden: "SPP asymptote ω_sp = ω_p/√2 (§ 8.4)",
    nx: 384,
    ny: 384,
    pml: PML12,
    periodicY: false,
    tfsf: { ia: 40, ib: 344, ja: 40, jb: 344, na: 950 },
    planeWave: { kind: "cw", amp: 1, omega: omegaOf(28) },
    emitters: [],
    paint: (mat, _mat2, nx, ny) => {
      // wp chosen ~2.2x the drive frequency -> strongly metallic response
      const wp = 2.2 * omegaOf(28);
      const g = 0.002;
      for (let i = 230; i < 250; i++) {
        for (let j = 20; j < ny - 20; j++) setDrude(mat, i, j, ny, wp, g);
      }
      // two nanoparticles in front of the slab (dimer gap -> hot spot)
      for (const cyl of [
        { ci: 180, cj: 170, r: 9 },
        { ci: 180, cj: 214, r: 9 },
      ]) {
        for (let i = cyl.ci - cyl.r; i <= cyl.ci + cyl.r; i++) {
          for (let j = cyl.cj - cyl.r; j <= cyl.cj + cyl.r; j++) {
            const dx = i - cyl.ci;
            const dy = j - cyl.cj;
            if (dx * dx + dy * dy <= cyl.r * cyl.r) setDrude(mat, i, j, ny, wp, g);
          }
        }
      }
      void nx;
    },
    displayOmega: omegaOf(28),
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 1.0,
    fieldGain: 1.8,
    ampGain: 1.1,
    isoK: 12,
    tracers: false,
    lambdaMin: 18,
    lambdaMax: 44,
  },
  {
    key: "kerr",
    label: "Kerr self-focusing",
    blurb:
      "An intense beam raises the refractive index where it is brightest (χ³), bending itself toward focus — nonlinear optics with Meep's Padé update.",
    golden: "n₂ = 3χ³/(4n₀²ε₀c), Boyd intensity convention",
    nx: 448,
    ny: 320,
    pml: PML12,
    periodicY: false,
    tfsf: null,
    emitters: beam(36, 160, 26, 3, omegaOf(26), 0, 1.4),
    paint: (_mat, mat2, nx, ny) => {
      // chi3 sized for Delta-eps = chi3*E^2 ~ 0.2 at the beam peak: strong
      // visible self-focusing without the total-reflection regime
      for (let i = 120; i < nx - 20; i++) {
        for (let j = 14; j < ny - 14; j++) setKerr(mat2, i, j, ny, 0.1);
      }
    },
    displayOmega: omegaOf(26),
    substeps: 10,
    layers: LAYER.energy | LAYER.underlay | LAYER.envelope | LAYER.sources,
    exposure: 0.65,
    fieldGain: 1.4,
    ampGain: 2.4,
    isoK: 12,
    tracers: false,
    lambdaMin: 18,
    lambdaMax: 40,
  },
  {
    key: "resonator",
    label: "Mirror cavity",
    blurb:
      "A pulse bounces inside a conducting box; only the standing modes survive — a cavity resonator ringing at its eigenfrequencies.",
    golden: "mode ladder f_mn ∝ √(m²+n²) (rect cavity)",
    nx: 384,
    ny: 384,
    pml: { n: 0, x0: false, x1: false, y0: false, y1: false },
    periodicY: false,
    tfsf: null,
    emitters: [{ i: 150, j: 160, kind: "ricker", amp: 2.5, omega: 0, phase: 0, t0: 90, tau: 22 }],
    paint: (_mat, mat2, nx, ny) => {
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          const inWall =
            (i === 40 || i === nx - 40 || j === 40 || j === ny - 40) &&
            i >= 40 &&
            i <= nx - 40 &&
            j >= 40 &&
            j <= ny - 40;
          if (inWall) setPec(mat2, i, j, ny);
        }
      }
    },
    displayOmega: omegaOf(48),
    substeps: 8,
    layers: LAYER.energy | LAYER.underlay | LAYER.sources,
    exposure: 0.65,
    fieldGain: 5.0,
    ampGain: 2.2,
    isoK: 10,
    tracers: false,
    lambdaMin: 20,
    lambdaMax: 60,
  },
];

export function sceneByKey(key: string): SceneSpec {
  const s = SCENES.find((x) => x.key === key);
  return s ?? SCENES[0];
}
