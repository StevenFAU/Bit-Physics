// schrodinger-smoke — template scenes (web spec § 2).
//
// Every IC is built and SETTLED in pure-JS f64 (isf64.mjs — the same
// algorithm as the backend reference), then cast once to f32 for the GPU:
// the only IC divergence vs the f64 backend is that single cast. Ring scenes
// use the paper's § 3.1 slab phase imprint (theta = pi*(1 + d/r), psi2 =
// eps = 0.01 zero-guard, 8 settling projections); knots use the
// Tao-Ren-Tong-Xiong polynomial construction (backend spec § 5).

import {
  knotPsi,
  makePsi,
  packF32,
  psiFromTheta,
  ringTheta,
  settle,
} from "./isf64.mjs";

export interface SceneSpec {
  key: string;
  label: string;
  title: string;
  hbar: number;
  dt: number;
  gated: boolean; // only the canonical ring is the gate scene
  /** dye seed region — where tracers (re)spawn; incompressible flow keeps a
   * uniform cloud uniform, so the iconic look seeds dye at the vortices.
   * type: 1 ball, 2 slab-x, 3 disk-facing-x; absent = uniform box. */
  seed?: { type: 1 | 2 | 3; center: [number, number, number]; radius: number; thick: number; maxAge: number };
  /** ungated live features switched on by the template */
  constraint?: {
    kind: 1 | 2;
    center: [number, number, number];
    radius: number;
    /** velocity u; kvec = u/hbar is derived live so the hbar slider stays honest */
    u: [number, number, number];
  };
  buoyancy?: number;
  build: (n: number, hbar: number) => Float32Array;
}

interface RingDef {
  center: [number, number, number];
  radius: number;
  thickness: number;
  normal: [number, number, number];
}

function rings(n: number, defs: RingDef[]): Float32Array {
  const theta = new Float64Array(n * n * n);
  for (const d of defs) ringTheta(theta, n, d.center, d.radius, d.thickness, d.normal);
  const psi = psiFromTheta(n, theta);
  settle(psi, 8);
  return packF32(psi);
}

function knot(n: number, poly: [number, number, number, number][], scale: number): Float32Array {
  const psi = knotPsi(n, poly, scale);
  settle(psi, 8);
  return packF32(psi);
}

/** mulberry32 — deterministic seeded PRNG for the turbulence template. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SCENES: SceneSpec[] = [
  {
    key: "ring",
    seed: { type: 3, center: [0.33, 0.5, 0.5], radius: 0.27, thick: 0.03, maxAge: 12 },
    label: "ring",
    title: "Translating vortex ring — THE GATED CANONICAL SCENE (non-chaotic)",
    hbar: 0.05,
    dt: 1 / 24,
    gated: true,
    build: (n) =>
      rings(n, [
        { center: [0.35, 0.5, 0.5], radius: 0.22, thickness: 0.08, normal: [1, 0, 0] },
      ]),
  },
  {
    key: "leapfrog",
    seed: { type: 3, center: [0.27, 0.5, 0.5], radius: 0.27, thick: 0.03, maxAge: 14 },
    label: "leapfrog",
    title: "Leapfrogging rings — two coaxial rings threading each other (paper Fig. 4)",
    hbar: 0.03,
    dt: 1 / 24,
    gated: false,
    build: (n) =>
      rings(n, [
        { center: [0.3, 0.5, 0.5], radius: 0.2, thickness: 0.07, normal: [1, 0, 0] },
        { center: [0.42, 0.5, 0.5], radius: 0.2, thickness: 0.07, normal: [1, 0, 0] },
      ]),
  },
  {
    key: "collide",
    seed: { type: 1, center: [0.5, 0.5, 0.5], radius: 0.3, thick: 0, maxAge: 14 },
    label: "collide",
    title: "Head-on colliding rings — expand and reconnect",
    hbar: 0.03,
    dt: 1 / 24,
    gated: false,
    build: (n) =>
      rings(n, [
        { center: [0.3, 0.5, 0.5], radius: 0.18, thickness: 0.07, normal: [1, 0, 0] },
        { center: [0.7, 0.5, 0.5], radius: 0.18, thickness: 0.07, normal: [-1, 0, 0] },
      ]),
  },
  {
    key: "oblique",
    seed: { type: 1, center: [0.4, 0.5, 0.5], radius: 0.32, thick: 0, maxAge: 14 },
    label: "oblique",
    title:
      "Oblique ring collision — paper Fig. 14 parameters (hbar 0.05, r 0.6 m, ±45°, 2 m apart; rescaled to the unit box)",
    hbar: 0.05,
    dt: 1 / 24,
    gated: false,
    build: (n) => {
      const s = Math.SQRT1_2;
      return rings(n, [
        // paper Fig. 14 in a ~2.5 m box -> unit-box scale: r = 0.24, centers 0.8 apart
        { center: [0.3, 0.35, 0.5], radius: 0.24, thickness: 0.08, normal: [s, s, 0] },
        { center: [0.3, 0.65, 0.5], radius: 0.24, thickness: 0.08, normal: [s, -s, 0] },
      ]);
    },
  },
  {
    key: "hopf",
    seed: { type: 1, center: [0.5, 0.5, 0.5], radius: 0.3, thick: 0, maxAge: 14 },
    label: "hopf link",
    title: "Hopf link untying — psi1 = z1*z2 zeros (TRTX polynomial construction)",
    hbar: 0.04,
    dt: 1 / 24,
    gated: false,
    build: (n) => knot(n, [[1, 0, 1, 1]], 3.0),
  },
  {
    key: "trefoil",
    seed: { type: 1, center: [0.5, 0.5, 0.5], radius: 0.32, thick: 0, maxAge: 14 },
    label: "trefoil",
    title: "Trefoil knot reconnection — psi1 = z1^2 - z2^3 (Milnor pair; the hero shot)",
    hbar: 0.04,
    dt: 1 / 24,
    gated: false,
    build: (n) =>
      knot(
        n,
        [
          [1, 0, 2, 0],
          [-1, 0, 0, 3],
        ],
        3.2,
      ),
  },
  {
    key: "jet",
    seed: { type: 2, center: [0.13, 0.5, 0.5], radius: 0, thick: 0.05, maxAge: 6 },
    label: "jet",
    title: "Jet nozzle — Alg-4 velocity constraint in the periodic box (no DCT); UNGATED",
    hbar: 0.05,
    dt: 1 / 24,
    gated: false,
    constraint: { kind: 1, center: [0.15, 0.5, 0.5], radius: 0.09, u: [0.6, 0, 0] },
    build: (n) => {
      const psi = makePsi(n);
      psi.re1.fill(1);
      psi.re2.fill(0.01);
      settle(psi, 2);
      return packF32(psi);
    },
  },
  {
    key: "buoyant",
    seed: { type: 1, center: [0.5, 0.12, 0.5], radius: 0.1, thick: 0, maxAge: 6 },
    label: "buoyant",
    title: "Buoyant jet — paper Fig. 10 (jet + linear potential on psi2 only); UNGATED",
    hbar: 0.05,
    dt: 1 / 24,
    gated: false,
    constraint: { kind: 1, center: [0.5, 0.12, 0.5], radius: 0.08, u: [0, 0.45, 0] },
    buoyancy: 0.35,
    build: (n) => {
      const psi = makePsi(n);
      psi.re1.fill(1);
      psi.re2.fill(0.01);
      settle(psi, 2);
      return packF32(psi);
    },
  },
  {
    key: "street",
    seed: { type: 2, center: [0.08, 0.5, 0.5], radius: 0, thick: 0.06, maxAge: 8 },
    label: "vortex street",
    title:
      "Von Kármán vortex street — cylinder obstacle (eta=0 constraint) in a background flow; live Strouhal/Re_s meters; UNGATED",
    hbar: 0.02,
    dt: 1 / 48,
    gated: false,
    constraint: { kind: 2, center: [0.3, 0.5, 0.5], radius: 0.08, u: [0, 0, 0] },
    build: (n) => {
      // winding-2 background plane wave: u_x = hbar * 4pi (topologically
      // protected mean flow the projection cannot remove)
      const psi = makePsi(n);
      for (let x = 0; x < n; x++) {
        const ang = (2 * Math.PI * 2 * x) / n;
        const c = Math.cos(ang);
        const s = Math.sin(ang);
        for (let i = x * n * n; i < (x + 1) * n * n; i++) {
          psi.re1[i] = c;
          psi.im1[i] = s;
          psi.re2[i] = 0.01;
        }
      }
      settle(psi, 2);
      return packF32(psi);
    },
  },
  {
    key: "turbulence",
    label: "turbulence",
    title: "Random turbulence — PCG-seeded band-limited phase noise, decaying tangle",
    hbar: 0.03,
    dt: 1 / 24,
    gated: false,
    build: (n) => {
      const rnd = mulberry32(42);
      const theta = new Float64Array(n * n * n);
      // sum of a few random long-wavelength plane-wave phases (deterministic)
      const modes: [number, number, number, number][] = [];
      for (let m = 0; m < 6; m++) {
        modes.push([
          Math.floor(rnd() * 3) - 1,
          Math.floor(rnd() * 3) - 1,
          Math.floor(rnd() * 3) - 1,
          rnd() * 2 * Math.PI,
        ]);
      }
      for (let x = 0; x < n; x++) {
        for (let y = 0; y < n; y++) {
          for (let z = 0; z < n; z++) {
            let t = 0;
            for (const [kx, ky, kz, ph] of modes) {
              t += 2.2 * Math.sin((2 * Math.PI * (kx * x + ky * y + kz * z)) / n + ph);
            }
            theta[(x * n + y) * n + z] = t;
          }
        }
      }
      const psi = psiFromTheta(n, theta);
      settle(psi, 8);
      return packF32(psi);
    },
  },
];

export function sceneByKey(key: string): SceneSpec {
  const s = SCENES.find((x) => x.key === key);
  if (!s) throw new Error(`unknown scene ${key}`);
  return s;
}
