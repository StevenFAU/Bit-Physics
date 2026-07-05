// Scene templates (web spec § 4.1) — every card is a params-preset;
// several ARE verification runs. All seeding is deterministic (seeded
// mulberry32 jitter, frame-indexed drivers, no Math.random in the live
// path — the capture/gate paths reuse the committed IC instead).

export interface Region {
  min: [number, number, number];
  max: [number, number, number];
}

export interface ScenePreset {
  id: string;
  label: string;
  title: string; // hover copy: caption + citation
  gridN: number;
  regions: Region[];
  mode?: "pic" | "flip" | "apic";
  driftOn: boolean;
  pushOn: boolean;
  emitter?: { pos: [number, number, number]; radius: number; vel: [number, number, number] };
  tiltAnim?: { amplitudeDeg: number; periodFrames: number };
  obstacleAnim?: { start: [number, number, number]; radius: number; dropTo: number };
  special?: "disk2d" | "gate";
}

export const PRESETS: ScenePreset[] = [
  {
    id: "dam-break",
    label: "dam break",
    title:
      "The classic PIC/FLIP validation scene (Zhu & Bridson 2005): a corner water column collapses under gravity through the masked free-surface projection. The gated canonical runs this exact physics at the committed tier.",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [0.4, 0.4, 0.75] }],
    driftOn: true,
    pushOn: true,
  },
  {
    id: "double-dam",
    label: "double dam",
    title:
      "Two opposing columns collide mid-tank — the splash crown is where FLIP noise and PIC smearing separate visibly; switch modes and compare.",
    gridN: 40,
    regions: [
      { min: [0.0, 0.1, 0.0], max: [0.28, 0.9, 0.65] },
      { min: [0.72, 0.1, 0.0], max: [1.0, 0.9, 0.65] },
    ],
    driftOn: true,
    pushOn: true,
  },
  {
    id: "rotating-disk",
    label: "rotating disk",
    title:
      "The angular-momentum showcase (Jiang et al. 2017 JCP § 6.1): a rigidly rotating disk run through the pure transfer cycle in the in-page f64 mirror — APIC's total L stays flat (Props 5.4/5.5), PIC's decays. Regularizers OFF (inert here anyway).",
    gridN: 32,
    regions: [],
    driftOn: false,
    pushOn: false,
    special: "disk2d",
  },
  {
    id: "still-pool",
    label: "still pool",
    title:
      "The null test (backend invariant 6): a settled pool with regularizers ON must stay still — push-apart and drift compensation are exactly inert at rest. Watch max |v| stay at the measured floor.",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [1.0, 1.0, 0.32] }],
    driftOn: true,
    pushOn: true,
  },
  {
    id: "hydrostatic",
    label: "hydrostatic",
    title:
      "The solver-depth honesty probe (GPU Gems 3 ch. 30): p = rho g h only at a CONVERGED iteration count — 20 sweeps retain 100% of g dt and the column sinks (the backend's pinned documented-failure). The HUD shows n_iter vs tank depth in cells.",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [1.0, 1.0, 0.6] }],
    driftOn: true,
    pushOn: true,
  },
  {
    id: "waterfall",
    label: "waterfall",
    title:
      "Frame-indexed deterministic emitter pours a stream into the tank (the dli/fluid pour mechanic) — no RNG in the live path.",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [1.0, 1.0, 0.15] }],
    driftOn: true,
    pushOn: true,
    emitter: { pos: [0.5, 0.5, 0.9], radius: 0.06, vel: [0, 0, -1.5] },
  },
  {
    id: "sloshing",
    label: "sloshing",
    title:
      "Tilt-driven sloshing tank: gravity rocks deterministically with frame index (the proven mobile interaction — device-orientation drives the same vector on phones).",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [1.0, 1.0, 0.4] }],
    driftOn: true,
    pushOn: true,
    tiltAnim: { amplitudeDeg: 20, periodFrames: 480 },
  },
  {
    id: "ball-drop",
    label: "ball drop",
    title:
      "A solid sphere drops into the pool — the moving-obstacle velocity BC (solid-face restore, u·n = v_obstacle) throws water like Ten Minute Physics' draggable ball. Drag it yourself afterwards.",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [1.0, 1.0, 0.35] }],
    driftOn: true,
    pushOn: true,
    obstacleAnim: { start: [0.5, 0.5, 0.85], radius: 0.09, dropTo: 0.42 },
  },
  {
    id: "watch-it-sink",
    label: "watch it sink",
    title:
      "The teachable failure Müller's regularizer pair exists to fix: drift compensation OFF, and every velocity-only-projection PIC/FLIP loses volume secularly — the volume trace sinks while you watch. Peers hide this; we plot it.",
    gridN: 40,
    regions: [{ min: [0.0, 0.0, 0.0], max: [0.4, 0.4, 0.75] }],
    driftOn: false,
    pushOn: true,
  },
  {
    id: "gate-scene",
    label: "gate scene",
    title:
      "The gated canonical itself: the committed 12-cube web-gate dam break (Jacobi 600, the measured-converged cap) replayed from the committed f32 IC and checked against the committed f64 observable references — on YOUR GPU.",
    gridN: 12,
    regions: [],
    driftOn: true,
    pushOn: true,
    special: "gate",
  },
];

// Deterministic 32-bit PRNG (the mpm-multimaterial seeding pattern).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeededScene {
  positions: Float32Array; // xyz triples
  n: number;
}

/**
 * Lattice-fill the preset regions: 2 particles per cell axis (spacing
 * dx/2, 8 per cell — the reference seeding) with seeded jitter of
 * 0.2 * spacing (seeded_dam_break_3d convention). Region coordinates are
 * fractions of the INTERIOR box [n_wall*dx, (n-1-n_wall)*dx] so ICs
 * always respect the stencil-safe clamp box.
 */
export function seedScene(
  preset: ScenePreset,
  seed: number,
  nWall: number,
  maxN: number,
): SeededScene {
  const nGrid = preset.gridN;
  const dx = 1 / nGrid;
  const lo = nWall * dx;
  const hi = (nGrid - 1 - nWall) * dx;
  const span = hi - lo;
  const spacing = 0.5 * dx;
  const rng = mulberry32(0x9e3779b9 ^ seed);
  const out: number[] = [];
  for (const r of preset.regions) {
    const min = r.min.map((v) => lo + v * span);
    const max = r.max.map((v) => lo + v * span);
    for (let x = min[0] + 0.5 * spacing; x < max[0]; x += spacing) {
      for (let y = min[1] + 0.5 * spacing; y < max[1]; y += spacing) {
        for (let z = min[2] + 0.5 * spacing; z < max[2]; z += spacing) {
          const jx = (rng() * 2 - 1) * 0.2 * spacing;
          const jy = (rng() * 2 - 1) * 0.2 * spacing;
          const jz = (rng() * 2 - 1) * 0.2 * spacing;
          out.push(
            Math.min(Math.max(x + jx, lo), hi),
            Math.min(Math.max(y + jy, lo), hi),
            Math.min(Math.max(z + jz, lo), hi),
          );
          if (out.length / 3 >= maxN) {
            return { positions: new Float32Array(out), n: out.length / 3 };
          }
        }
      }
    }
  }
  return { positions: new Float32Array(out), n: out.length / 3 };
}

/**
 * Deterministic emitter batch (the sph-water frame-indexed pattern):
 * every `every` frames spawn a small disc of lattice points. Returns
 * null on off-frames.
 */
export function emitterBatch(
  e: NonNullable<ScenePreset["emitter"]>,
  spacing: number,
  frame: number,
): Float32Array | null {
  const speed = Math.abs(e.vel[2]) / 60;
  const every = Math.max(1, Math.round((0.9 * spacing) / Math.max(speed, 1e-6)));
  if (frame % every !== 0) return null;
  const pts: number[] = [];
  for (let x = -e.radius; x <= e.radius; x += spacing) {
    for (let y = -e.radius; y <= e.radius; y += spacing) {
      if (x * x + y * y <= e.radius * e.radius) {
        pts.push(e.pos[0] + x, e.pos[1] + y, e.pos[2]);
      }
    }
  }
  return pts.length > 0 ? new Float32Array(pts) : null;
}
