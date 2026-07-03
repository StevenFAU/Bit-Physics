// Attractor registry (feature-expansion-spec § 4): the single typed table
// the panel selector, per-system parameter sliders, EXPLAIN panel,
// instruments and URL hash all read. Backend truth lives in
// strange_attractors/system.py + the committed captures; the values here
// mirror those canonical rows (the generated data spine carries the
// committed manifests verbatim and main.ts fail-fasts on drift for every
// system, Lorenz precedent).

export interface ParamSpec {
  /** Registry key; also the p0..p5 slot order for the display kernel. */
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  canonical: number;
}

export interface SectionSpec {
  /** Coordinate axis the Poincaré plane cuts (0=x, 1=y, 2=z). */
  axis: 0 | 1 | 2;
  /** Plane offset as a function of the live parameter values. */
  value: (params: Record<string, number>) => number;
  label: string;
}

export interface SweepSpec {
  /** Which parameter the bifurcation diagram sweeps. */
  paramKey: string;
  lo: number;
  hi: number;
}

export interface AttractorDef {
  /** Registry key — matches strange_attractors.system.SYSTEMS. */
  key: string;
  label: string;
  /** 0 = the committed Lorenz kernel; ≥1 = attractors_rk4.wgsl field_id. */
  fieldId: number;
  params: readonly ParamSpec[];
  dt: number;
  ic: readonly [number, number, number];
  caption: string;
  section: SectionSpec;
  sweep: SweepSpec | null;
  /** Conservative systems get the volume-preserving honesty note. */
  conservative: boolean;
}

export const ATTRACTORS: readonly AttractorDef[] = [
  {
    key: "lorenz",
    label: "Lorenz",
    fieldId: 0,
    params: [
      { key: "sigma", label: "σ", min: 1, max: 30, step: 0.1, canonical: 10 },
      { key: "rho", label: "ρ", min: 0, max: 350, step: 0.05, canonical: 28 },
      { key: "beta", label: "β", min: 0.5, max: 5, step: 0.005, canonical: 8 / 3 },
    ],
    dt: 0.01,
    ic: [1, 1, 1],
    caption:
      "Three coupled equations, RK4-integrated into the butterfly that started chaos theory — deterministic, never repeating, forever on the attractor.",
    section: { axis: 2, value: (p) => (p.rho ?? 28) - 1, label: "z = ρ−1" },
    sweep: { paramKey: "rho", lo: 1, hi: 250 },
    conservative: false,
  },
  {
    key: "rossler",
    label: "Rössler",
    fieldId: 1,
    params: [
      { key: "a", label: "a", min: 0.05, max: 0.5, step: 0.005, canonical: 0.2 },
      { key: "b", label: "b", min: 0.05, max: 2, step: 0.005, canonical: 0.2 },
      { key: "c", label: "c", min: 1, max: 45, step: 0.05, canonical: 5.7 },
    ],
    dt: 0.02,
    ic: [1, 1, 1],
    caption:
      "Rössler 1976 — the minimal single-scroll: a flat spiral that folds through one z-spike per orbit. One nonlinear term is enough.",
    section: { axis: 1, value: () => 0, label: "y = 0" },
    sweep: { paramKey: "c", lo: 1.5, hi: 45 },
    conservative: false,
  },
  {
    key: "aizawa",
    label: "Aizawa",
    fieldId: 2,
    params: [
      { key: "a", label: "a", min: 0.3, max: 2, step: 0.005, canonical: 0.95 },
      { key: "b", label: "b", min: 0.1, max: 2, step: 0.005, canonical: 0.7 },
      { key: "c", label: "c", min: 0.1, max: 2, step: 0.005, canonical: 0.6 },
      { key: "d", label: "d", min: 1, max: 6, step: 0.01, canonical: 3.5 },
      { key: "e", label: "e", min: 0, max: 1, step: 0.005, canonical: 0.25 },
      { key: "f", label: "f", min: 0, max: 0.5, step: 0.005, canonical: 0.1 },
    ],
    dt: 0.01,
    ic: [0.1, 0, 0],
    caption:
      "Aizawa 1982 — a spherical shell with a polar spike: the orbit hugs a sphere, then threads its axis.",
    section: { axis: 2, value: () => 0, label: "z = 0" },
    sweep: { paramKey: "a", lo: 0.3, hi: 2 },
    conservative: false,
  },
  {
    key: "sprott_a",
    label: "Sprott-A",
    fieldId: 3,
    params: [],
    dt: 0.01,
    ic: [0, 5, 0],
    caption:
      "Sprott 1994 case A (the Nosé–Hoover oscillator) — conservative chaos with NO fixed points and zero average volume contraction: a chaotic sea, not an attractor basin.",
    section: { axis: 2, value: () => 0, label: "z = 0" },
    sweep: null,
    conservative: true,
  },
];

export function getAttractor(key: string): AttractorDef {
  const d = ATTRACTORS.find((a) => a.key === key);
  if (!d) throw new Error(`unknown attractor: ${key}`);
  return d;
}
