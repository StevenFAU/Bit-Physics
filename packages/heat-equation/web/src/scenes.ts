// heat-equation — interaction templates (spec-ref § 5.4): ship templates,
// not a blank canvas. Every template evolves the SAME gated state buffer;
// the analytic overlays are CPU-f64 premultiplied (render.wgsl reads only
// poly-trig sinsin terms). Templates are the INTERACT layer; none of them
// mutate the gate scene (capture.ts runs its own dedicated solvers).

import { CANONICAL_AMPLITUDES, CANONICAL_MODES, CANONICAL_OFFSET, makeCanonicalIc } from "./heat64.mjs";
import { LAYER } from "./renderer.js";

export interface SceneSpec {
  key: string;
  label: string;
  title: string;
  n: number;
  alpha: number;
  /** dt as a fraction of the von Neumann bound (FTCS); spectral may exceed 1. */
  dtFrac: number;
  solver: "ftcs" | "spectral";
  bcKind: 0 | 1;
  wallValue: number;
  substeps: number;
  ic: (n: number) => Float64Array;
  /** optional per-cell diffusivity (enables the material path). */
  material?: (n: number) => Float32Array;
  /** optional steady source field. */
  source?: (n: number) => Float32Array;
  /** moving source: returns brush position in grid units at sim time t. */
  movingSource?: (t: number, n: number) => { x: number; y: number; sigma: number; power: number };
  renderFlags: number;
  palette: string;
  arrows: boolean;
  /** analytic Fourier overlay active (error heatmap + spectrum ellipses). */
  fourierOverlay: boolean;
  glow?: { offsetK: number; scaleK: number; gain: number };
  brushKind: 1 | 2 | 3;
  brushPower: number;
  note: string;
}

function gaussianIc(n: number, sigma0: number, amp: number): Float64Array {
  const t = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = i / n - 0.5;
      const dy = j / n - 0.5;
      t[i * n + j] = amp * Math.exp(-(dx * dx + dy * dy) / (2 * sigma0 * sigma0));
    }
  }
  return t;
}

function zeros(n: number): Float64Array {
  return new Float64Array(n * n);
}

function plateIc(n: number): Float64Array {
  const t = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === 0 || j === 0 || i === n - 1 || j === n - 1) t[i * n + j] = 1;
    }
  }
  return t;
}

/** Circuit-board material mask: copper traces/pads (fast) on FR4 (slow). */
function circuitMaterial(n: number): Float32Array {
  const a = new Float32Array(n * n).fill(0.002); // FR4
  const trace = (x0: number, y0: number, x1: number, y1: number, w: number): void => {
    // axis-aligned copper rectangle, half-width w/2 around the segment box
    const ix0 = Math.max(0, Math.floor((Math.min(x0, x1) - w / 2) * n));
    const ix1 = Math.min(n - 1, Math.ceil((Math.max(x0, x1) + w / 2) * n));
    const iy0 = Math.max(0, Math.floor((Math.min(y0, y1) - w / 2) * n));
    const iy1 = Math.min(n - 1, Math.ceil((Math.max(y0, y1) + w / 2) * n));
    for (let i = ix0; i <= ix1; i++) {
      for (let j = iy0; j <= iy1; j++) {
        a[i * n + j] = 0.05;
      }
    }
  };
  // bus lines + branches (hand-laid, deterministic)
  trace(0.1, 0.2, 0.9, 0.2, 0.012);
  trace(0.1, 0.5, 0.9, 0.5, 0.012);
  trace(0.1, 0.8, 0.9, 0.8, 0.012);
  trace(0.25, 0.2, 0.25, 0.8, 0.012);
  trace(0.55, 0.2, 0.55, 0.5, 0.012);
  trace(0.75, 0.5, 0.75, 0.8, 0.012);
  // pads (chips sit here)
  const pad = (cx: number, cy: number, r: number): void => {
    const ir = Math.floor(r * n);
    const ci = Math.floor(cx * n);
    const cj = Math.floor(cy * n);
    for (let i = -ir; i <= ir; i++) {
      for (let j = -ir; j <= ir; j++) {
        const ii = ci + i;
        const jj = cj + j;
        if (ii >= 0 && jj >= 0 && ii < n && jj < n) a[ii * n + jj] = 0.05;
      }
    }
  };
  pad(0.25, 0.35, 0.05);
  pad(0.55, 0.35, 0.04);
  pad(0.75, 0.65, 0.05);
  pad(0.4, 0.65, 0.03);
  return a;
}

/** Chip hotspot sources on the circuit pads. */
function circuitSource(n: number): Float32Array {
  const s = new Float32Array(n * n);
  const chip = (cx: number, cy: number, r: number, power: number): void => {
    const sigma = r * n * 0.6;
    const ci = cx * n;
    const cj = cy * n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const d2 = (i - ci) ** 2 + (j - cj) ** 2;
        s[i * n + j] += (power / (2 * Math.PI * sigma * sigma)) * Math.exp(-d2 / (2 * sigma * sigma));
      }
    }
  };
  chip(0.25, 0.35, 0.04, 2000);
  chip(0.55, 0.35, 0.03, 1200);
  chip(0.75, 0.65, 0.04, 2600);
  return s;
}

export const SCENES: SceneSpec[] = [
  {
    key: "circuit",
    label: "circuit board",
    title: "Chip hotspots on copper traces over FR4 — harmonic-mean face flux (conservative)",
    n: 256,
    alpha: 0.05,
    dtFrac: 0.8,
    solver: "ftcs",
    bcKind: 0,
    wallValue: 0,
    substeps: 8,
    ic: zeros,
    material: circuitMaterial,
    source: circuitSource,
    renderFlags: LAYER.iso | LAYER.material | LAYER.glow,
    palette: "inferno",
    arrows: true,
    fourierOverlay: false,
    glow: { offsetK: 300, scaleK: 1400, gain: 0.8 },
    brushKind: 1,
    brushPower: 60,
    note: "energy accounting + thermal-resistance hand-check template (§ 6.4)",
  },
  {
    key: "fourier",
    label: "Fourier lab",
    title: "Three pinned modes decay; discrete vs continuous amplification live (the gate scene, bigger)",
    n: 256,
    alpha: 0.02,
    dtFrac: 0.8,
    solver: "ftcs",
    bcKind: 0,
    wallValue: 0,
    substeps: 8,
    ic: makeCanonicalIc,
    renderFlags: LAYER.iso | LAYER.spectrum,
    palette: "viridis",
    arrows: false,
    fourierOverlay: true,
    brushKind: 1,
    brushPower: 40,
    note: "error heatmap = |T - analytic| live; painting disables the overlay honestly",
  },
  {
    key: "gaussian",
    label: "Gaussian spot",
    title: "Heat-kernel spreading: sigma^2(t) = sigma0^2 + 2*alpha*t (§ 4.3)",
    n: 256,
    alpha: 0.02,
    dtFrac: 0.8,
    solver: "spectral",
    bcKind: 0,
    wallValue: 0,
    substeps: 4,
    ic: (n) => gaussianIc(n, 0.06, 1.5),
    renderFlags: LAYER.iso | LAYER.relief,
    palette: "magma",
    arrows: true,
    fourierOverlay: false,
    brushKind: 1,
    brushPower: 40,
    note: "spectral solver: machine-exact per mode, no CFL — the honest turbo path",
  },
  {
    key: "plate",
    label: "metal plate",
    title: "Sudden hot walls drive a diffusive front — erfc/product-form golden (§ 4.5)",
    n: 256,
    alpha: 1.0,
    dtFrac: 0.8,
    solver: "ftcs",
    bcKind: 1,
    wallValue: 1,
    substeps: 8,
    ic: plateIc,
    renderFlags: LAYER.iso,
    palette: "cividis",
    arrows: true,
    fourierOverlay: false,
    brushKind: 1,
    brushPower: 30,
    note: "Dirichlet walls; the product-form table D pins the analytic block solution",
  },
  {
    key: "laser",
    label: "laser engraving",
    title: "Moving hot spot writes glowing tracks — Rosenthal thin-plate K0 golden (§ 4.6)",
    n: 256,
    alpha: 0.005,
    dtFrac: 0.8,
    solver: "ftcs",
    bcKind: 0,
    wallValue: 0,
    substeps: 12,
    ic: zeros,
    movingSource: (t, n) => {
      // Lissajous scan path (stays away from edges)
      const x = 0.5 + 0.34 * Math.sin(2.1 * t + 0.4);
      const y = 0.5 + 0.34 * Math.sin(3.3 * t);
      return { x: x * n, y: y * n, sigma: 0.006 * n, power: 900 };
    },
    renderFlags: LAYER.glow,
    palette: "black-hot",
    arrows: false,
    fourierOverlay: false,
    // spot peak T ~ 0.5 -> ~1900 K: incandescent orange out of the committed
    // Planck-locus LUT (the 800 K floor is the visible-glow threshold)
    glow: { offsetK: 300, scaleK: 3200, gain: 1.4 },
    brushKind: 1,
    brushPower: 120,
    note: "quasi-steady teardrop isotherms; golden-of-the-equation, NOT a melt-pool model",
  },
  {
    key: "thermal",
    label: "thermal camera",
    title: "Paint heat, view through FLIR-style palettes (White/Black Hot, Ironbow)",
    n: 256,
    alpha: 0.01,
    dtFrac: 0.8,
    solver: "ftcs",
    bcKind: 0,
    wallValue: 0,
    substeps: 6,
    ic: (n) => gaussianIc(n, 0.1, 0.4),
    renderFlags: 0,
    palette: "ironbow",
    arrows: false,
    fourierOverlay: false,
    brushKind: 1,
    brushPower: 80,
    note: "IR palettes are display conventions; emissivity honesty note in EXPLAIN",
  },
];

export function sceneByKey(key: string): SceneSpec {
  const s = SCENES.find((x) => x.key === key);
  if (!s) throw new Error(`unknown scene ${key}`);
  return s;
}

export { CANONICAL_AMPLITUDES, CANONICAL_MODES, CANONICAL_OFFSET };
