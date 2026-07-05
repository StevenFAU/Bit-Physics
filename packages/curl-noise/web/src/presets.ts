// curl-noise — template registry (web spec § 2; sibling of
// strange-attractors attractors.ts, extended with badges + gated flags).
//
// gated: true  => the state qualifies for the green badge (analytic
// div-free constructions only; psi-space interactions preserve it).
// gated: false => deliberately outside the certificate (the anti-demo) or
// beyond-canonical constructions — badge grays while active.

export type Construction = "crossprod" | "curl3d" | "curl2d" | "abc";

export interface TemplateDef {
  key: string;
  label: string;
  caption: string;
  badges: string[];
  gated: boolean;
  construction: Construction;
  octaves: number;
  ell0: number;
  gain: number;
  lacunarity: number;
  amplitude: number;
  /** display timestep (the GATE capture always runs canonical dt) */
  dt: number;
  timePan: number;
  colorMode: number; // 0 speed, 1 angle-hue, 2 age, 3 iso-residual
  obstacle?: { center: [number, number, number]; radius: number; ramp: number; namp: number };
  boundary2d?: 0 | 1 | 2; // curl2d: 0 none / 1 Bridson mult / 2 Curl-Flow additive
  seedType?: number;
  reproject?: boolean;
  abc?: [number, number, number];
  attractor?: boolean; // template 13 anti-demo
  gustDemo?: boolean;
  note?: string;
}

export const CANONICAL_KEY = "sphere";

export const TEMPLATES: TemplateDef[] = [
  {
    key: "open",
    label: "Open turbulence",
    caption: "Base FBM cross-product field — grid-free, provably divergence-free.",
    badges: ["∇f₁×∇f₂", "div-free"],
    gated: true,
    construction: "crossprod",
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0016, timePan: 0, colorMode: 0, reproject: true,
  },
  {
    key: "sphere",
    label: "Flow past sphere",
    caption:
      "CANONICAL / GATED scene: cross-product field with an SDF-substitution sphere — exercises the divergence, iso-value and boundary gates.",
    badges: ["CANONICAL", "∇f₁×∇f₂", "v·n=0 exact"],
    gated: true,
    construction: "crossprod",
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0016, timePan: 0, colorMode: 0, reproject: true,
    obstacle: { center: [0.5, 0.5, 0.5], radius: 0.18, ramp: 0.15, namp: 1.0 },
  },
  {
    key: "cylinder",
    label: "Flow past cylinder (2D)",
    caption: "2D stream function with Bridson's multiplicative quintic ramp (Eqs. 3-4).",
    badges: ["2D ψ", "Bridson ramp"],
    gated: true,
    construction: "curl2d",
    octaves: 3, ell0: 0.35, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0022, timePan: 0, colorMode: 1, boundary2d: 1,
    obstacle: { center: [0.5, 0.5, 0.5], radius: 0.16, ramp: 0.13, namp: 1.0 },
  },
  {
    key: "abc",
    label: "ABC flow",
    caption:
      "Closed-form Beltrami reference field (∇×v = v) — chaotic streamline regions coexist with regular ones; polynomial trig on the gated path.",
    badges: ["closed form", "Beltrami", "poly-trig"],
    gated: true,
    construction: "abc",
    octaves: 1, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.004, timePan: 0, colorMode: 1, abc: [1.0, 0.8165, 0.5774],
  },
  {
    key: "vortex",
    label: "Vortex seeds",
    caption: "Noise field + superposed analytic vortex potential (div-free by linearity).",
    badges: ["ψ-superposition"],
    gated: true,
    construction: "curl3d",
    octaves: 3, ell0: 0.45, gain: 0.5, lacunarity: 2.0, amplitude: 0.55,
    dt: 0.002, timePan: 0, colorMode: 0, gustDemo: false,
  },
  {
    key: "layered",
    label: "Layered turbulence",
    caption: "Classic 3-channel ∇×ψ with live octave / lacunarity / gain sweep — the unconstrained (can-be-chaotic) construction.",
    badges: ["∇×ψ", "FBM"],
    gated: true,
    construction: "curl3d",
    octaves: 4, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 0.45,
    dt: 0.002, timePan: 0, colorMode: 0,
  },
  {
    key: "animated",
    label: "Time-animated field",
    caption:
      "Per-octave domain pan (executed 4D-time decision — spatially div-free at every instant); iso meter pauses while the field moves.",
    badges: ["time-pan"],
    gated: true,
    construction: "crossprod",
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0016, timePan: 0.12, colorMode: 0, reproject: false,
  },
  {
    key: "windtunnel",
    label: "Wind tunnel",
    caption: "Uniform flow (curl of ½U×r) + curl perturbation past the sphere.",
    badges: ["gust ψ-term"],
    gated: true,
    construction: "crossprod",
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 0.7,
    dt: 0.0016, timePan: 0, colorMode: 0, gustDemo: true, seedType: 2,
    obstacle: { center: [0.5, 0.5, 0.5], radius: 0.16, ramp: 0.14, namp: 1.0 },
  },
  {
    key: "ribbons",
    label: "Iso-contour ribbons",
    caption:
      "Verification made visible: color = distance-to-manifold; toggle Newton reprojection and watch the residual heat vanish.",
    badges: ["iso-residual view"],
    gated: true,
    construction: "crossprod",
    octaves: 3, ell0: 0.55, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0016, timePan: 0, colorMode: 3, reproject: true,
  },
  {
    key: "boundarycmp",
    label: "Boundary comparison (2D)",
    caption:
      "Same cylinder under Bridson multiplicative vs Curl-Flow additive ramp — free-slip differences live (Ding-Batty's C¹ fix is 2D-only and documented, not ported).",
    badges: ["2D", "ramp A/B"],
    gated: true,
    construction: "curl2d",
    octaves: 3, ell0: 0.35, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0022, timePan: 0, colorMode: 1, boundary2d: 2,
    obstacle: { center: [0.5, 0.5, 0.5], radius: 0.16, ramp: 0.13, namp: 1.0 },
  },
  {
    key: "smokering",
    label: "Smoke ring / plume",
    caption: "Vortex-blob potential launch (Bridson Eq. 8 family) + noise octaves, disk-seeded dye.",
    badges: ["ψ-superposition"],
    gated: true,
    construction: "curl3d",
    octaves: 3, ell0: 0.45, gain: 0.5, lacunarity: 2.0, amplitude: 0.35,
    dt: 0.002, timePan: 0, colorMode: 2, seedType: 3,
  },
  {
    key: "rigidbody",
    label: "Draggable obstacle",
    caption: "Drag the sphere — the SDF moves with it and v·n stays exactly zero on the surface (quasi-static SDF substitution).",
    badges: ["moving SDF", "v·n=0 exact"],
    gated: true,
    construction: "crossprod",
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 1.0,
    dt: 0.0016, timePan: 0, colorMode: 0, reproject: false,
    obstacle: { center: [0.5, 0.5, 0.5], radius: 0.15, ramp: 0.13, namp: 1.0 },
  },
  {
    key: "antidemo",
    label: "Break the certificate",
    caption:
      "ANTI-DEMO: a naive velocity-space mouse attractor — a pure sink, the exact object the certificate excludes. The divergence readout lights up, tracers cluster, the badge grays. The moat, taught by violating it.",
    badges: ["UNGATED", "anti-demo"],
    gated: false,
    construction: "crossprod",
    octaves: 3, ell0: 0.5, gain: 0.5, lacunarity: 2.0, amplitude: 0.8,
    dt: 0.0016, timePan: 0, colorMode: 0, attractor: true, reproject: false,
  },
];

export function getTemplate(key: string): TemplateDef {
  const t = TEMPLATES.find((x) => x.key === key);
  if (!t) throw new Error(`unknown template ${key}`);
  return t;
}
