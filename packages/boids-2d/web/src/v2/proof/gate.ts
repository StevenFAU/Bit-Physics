// Swarm — the release gate, ported unchanged from the v1 page
// (packages/boids-2d/web/src/main.ts).
//
// HOW boids-2d IS GATED (verify.py _gate_boids_2d, kind new_canonical):
// the page builds a small deterministic capture on the CPU in f64 — two
// 256-agent Reynolds runs on the 1.35 × 1.0 torus (noise 0 and 0.55, 120
// steps, sampled every 20) and a 32² pressure-projection probe — and the
// headless driver records it twice. The gate requires the two captures to be
// byte-identical (run-twice) and the observables to be finite, the order
// parameters in [0, 1], the speed clamp held (max ≤ 0.012), noise to lower
// order (φ_ordered > φ_noisy + 0.03), and the projection to lower the
// divergence. There is no committed canonical: it is a live-reference gate.
//
// FROZEN: everything from GATE_N to fluidProjectionProbe is v1's text, byte
// for byte (test/gate-port.test.ts compares it with src/main.ts), and
// buildCanonicalCapture() returns exactly the bundle v1's captureCanonical()
// publishes — same manifest, same build id, same numbers (v2-acceptance.mjs
// compares the two pages' captures byte for byte). The GPU kernel's own
// proofs (brute ≡ sort, run-twice hashes) live in the Prove drawer.

import type { CaptureBundle, CaptureStepDescriptor } from "@bp/verify";
import { field } from "@bp/verify";

// ---- FROZEN (v1 src/main.ts, verbatim) ---------------------------------------
const GATE_N = 256;
const GATE_STEPS = 120;
const GATE_INTERVAL = 20;
const MAX_SPEED = 0.012;
const MIN_SPEED = MAX_SPEED * 0.42;
const WORLD = { halfW: 1.35, halfH: 1.0 };

interface SimSample {
  step: number;
  phi: number;
  rotation: number;
  meanSpeed: number;
  maxSpeed: number;
}

interface SimResult {
  samples: SimSample[];
  finalPhi: number;
  finalRotation: number;
  maxSpeedObserved: number;
}

interface FluidProbe {
  initialDivergence: number;
  finalDivergence: number;
  energyBefore: number;
  energyAfter: number;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noiseAngle(agent: number, step: number, seed: number): number {
  let h = (agent >>> 0) ^ Math.imul(step >>> 0, 0x9e3779b9) ^ Math.imul(seed >>> 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 4294967296) * 2 - 1;
}

function wrapDelta(d: number, halfExtent: number): number {
  const span = halfExtent * 2;
  if (d > halfExtent) return d - span;
  if (d < -halfExtent) return d + span;
  return d;
}

function clampSpeed(vx: number, vy: number): [number, number] {
  const s = Math.hypot(vx, vy);
  if (s > MAX_SPEED) return [(vx / s) * MAX_SPEED, (vy / s) * MAX_SPEED];
  if (s > 1e-8 && s < MIN_SPEED) return [(vx / s) * MIN_SPEED, (vy / s) * MIN_SPEED];
  if (s <= 1e-8) return [MIN_SPEED, 0];
  return [vx, vy];
}

function order(px: Float64Array, py: Float64Array, vx: Float64Array, vy: Float64Array): SimSample {
  let ux = 0;
  let uy = 0;
  let cx = 0;
  let cy = 0;
  let speedSum = 0;
  let maxSpeed = 0;
  const n = px.length;
  for (let i = 0; i < n; i += 1) {
    const s = Math.hypot(vx[i]!, vy[i]!) || 1e-12;
    ux += vx[i]! / s;
    uy += vy[i]! / s;
    cx += px[i]!;
    cy += py[i]!;
    speedSum += s;
    maxSpeed = Math.max(maxSpeed, s);
  }
  cx /= n;
  cy /= n;
  let cross = 0;
  for (let i = 0; i < n; i += 1) {
    const rx0 = px[i]! - cx;
    const ry0 = py[i]! - cy;
    const rl = Math.hypot(rx0, ry0) || 1e-12;
    const vl = Math.hypot(vx[i]!, vy[i]!) || 1e-12;
    const rx = rx0 / rl;
    const ry = ry0 / rl;
    cross += rx * (vy[i]! / vl) - ry * (vx[i]! / vl);
  }
  return {
    step: 0,
    phi: Math.hypot(ux, uy) / n,
    rotation: Math.abs(cross) / n,
    meanSpeed: speedSum / n,
    maxSpeed,
  };
}

function simulateGate(seed: number, noise: number, align: number): SimResult {
  const rnd = mulberry32(seed >>> 0);
  const px = new Float64Array(GATE_N);
  const py = new Float64Array(GATE_N);
  const vx = new Float64Array(GATE_N);
  const vy = new Float64Array(GATE_N);
  const nextVx = new Float64Array(GATE_N);
  const nextVy = new Float64Array(GATE_N);
  const samples: SimSample[] = [];
  const rCoh = 0.15;
  const rAli = rCoh * 0.72;
  const rSep = rCoh * 0.30;
  const rCoh2 = rCoh * rCoh;
  const rAli2 = rAli * rAli;
  const rSep2 = rSep * rSep;
  const maxForce = MAX_SPEED * 0.14;
  const dt = 1;

  for (let i = 0; i < GATE_N; i += 1) {
    const angle = rnd() * Math.PI * 2;
    const speed = MAX_SPEED * (0.45 + 0.55 * rnd());
    px[i] = (rnd() * 2 - 1) * WORLD.halfW;
    py[i] = (rnd() * 2 - 1) * WORLD.halfH;
    vx[i] = Math.cos(angle) * speed;
    vy[i] = Math.sin(angle) * speed;
  }

  const pushSample = (step: number): void => {
    const s = order(px, py, vx, vy);
    samples.push({ ...s, step });
  };
  pushSample(0);

  for (let step = 1; step <= GATE_STEPS; step += 1) {
    for (let i = 0; i < GATE_N; i += 1) {
      let sx = 0;
      let sy = 0;
      let ax = 0;
      let ay = 0;
      let cx = 0;
      let cy = 0;
      let na = 0;
      let nc = 0;
      for (let j = 0; j < GATE_N; j += 1) {
        if (i === j) continue;
        const dx = wrapDelta(px[j]! - px[i]!, WORLD.halfW);
        const dy = wrapDelta(py[j]! - py[i]!, WORLD.halfH);
        const d2 = dx * dx + dy * dy;
        if (d2 < 1e-12) continue;
        if (d2 < rSep2) {
          const d = Math.sqrt(d2);
          const f = (1 - d / rSep) / d;
          sx -= dx * f;
          sy -= dy * f;
        }
        if (d2 < rAli2) {
          ax += vx[j]!;
          ay += vy[j]!;
          na += 1;
        }
        if (d2 < rCoh2) {
          cx += dx;
          cy += dy;
          nc += 1;
        }
      }

      let fx = 0;
      let fy = 0;
      const sl = Math.hypot(sx, sy);
      if (sl > 1e-8) {
        const tx = (sx / sl) * MAX_SPEED - vx[i]!;
        const ty = (sy / sl) * MAX_SPEED - vy[i]!;
        const tl = Math.hypot(tx, ty);
        const k = tl > maxForce ? maxForce / tl : 1;
        fx += tx * k * 1.45;
        fy += ty * k * 1.45;
      }
      if (na > 0) {
        const al = Math.hypot(ax, ay) || 1e-12;
        const tx = (ax / al) * MAX_SPEED - vx[i]!;
        const ty = (ay / al) * MAX_SPEED - vy[i]!;
        const tl = Math.hypot(tx, ty);
        const k = tl > maxForce ? maxForce / tl : 1;
        fx += tx * k * align;
        fy += ty * k * align;
      }
      if (nc > 0) {
        const cl = Math.hypot(cx, cy) || 1e-12;
        const tx = (cx / cl) * MAX_SPEED - vx[i]!;
        const ty = (cy / cl) * MAX_SPEED - vy[i]!;
        const tl = Math.hypot(tx, ty);
        const k = tl > maxForce ? maxForce / tl : 1;
        fx += tx * k * 0.95;
        fy += ty * k * 0.95;
      }

      let wx = vx[i]! + fx * dt;
      let wy = vy[i]! + fy * dt;
      [wx, wy] = clampSpeed(wx, wy);
      if (noise > 0) {
        const a = noiseAngle(i, step, seed) * noise * Math.PI;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const rx = wx * c - wy * s;
        const ry = wx * s + wy * c;
        wx = rx;
        wy = ry;
      }
      nextVx[i] = wx;
      nextVy[i] = wy;
    }
    for (let i = 0; i < GATE_N; i += 1) {
      vx[i] = nextVx[i]!;
      vy[i] = nextVy[i]!;
      px[i] = px[i]! + vx[i]! * dt;
      py[i] = py[i]! + vy[i]! * dt;
      if (px[i]! > WORLD.halfW) px[i] = px[i]! - WORLD.halfW * 2;
      else if (px[i]! < -WORLD.halfW) px[i] = px[i]! + WORLD.halfW * 2;
      if (py[i]! > WORLD.halfH) py[i] = py[i]! - WORLD.halfH * 2;
      else if (py[i]! < -WORLD.halfH) py[i] = py[i]! + WORLD.halfH * 2;
    }
    if (step % GATE_INTERVAL === 0) pushSample(step);
  }

  const final = samples[samples.length - 1]!;
  return {
    samples,
    finalPhi: final.phi,
    finalRotation: final.rotation,
    maxSpeedObserved: Math.max(...samples.map((s) => s.maxSpeed)),
  };
}

function fluidProjectionProbe(): FluidProbe {
  const n = 32;
  const cells = n * n;
  const hx = 1 / n;
  const u = new Float64Array(cells);
  const v = new Float64Array(cells);
  const p = new Float64Array(cells);
  const pNext = new Float64Array(cells);
  const div = new Float64Array(cells);
  const idx = (i: number, j: number): number => ((j + n) % n) * n + ((i + n) % n);

  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const x = (i + 0.5) / n - 0.5;
      const y = (j + 0.5) / n - 0.5;
      const r2 = x * x + y * y;
      const swirl = Math.exp(-r2 / 0.05);
      u[idx(i, j)] = -y * swirl * 0.1 + Math.sin(2 * Math.PI * x) * 0.02;
      v[idx(i, j)] = x * swirl * 0.1 + Math.cos(2 * Math.PI * y) * 0.02;
    }
  }

  const divergenceNorm = (): number => {
    let m = 0;
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const d =
          (u[idx(i + 1, j)]! - u[idx(i - 1, j)]!) / (2 * hx) +
          (v[idx(i, j + 1)]! - v[idx(i, j - 1)]!) / (2 * hx);
        m = Math.max(m, Math.abs(d));
      }
    }
    return m;
  };
  const energy = (): number => {
    let e = 0;
    for (let k = 0; k < cells; k += 1) e += 0.5 * (u[k]! * u[k]! + v[k]! * v[k]!);
    return e / cells;
  };

  const initialDivergence = divergenceNorm();
  const energyBefore = energy();
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      div[idx(i, j)] =
        (u[idx(i + 1, j)]! - u[idx(i - 1, j)]!) / (2 * hx) +
        (v[idx(i, j + 1)]! - v[idx(i, j - 1)]!) / (2 * hx);
    }
  }
  for (let sweep = 0; sweep < 80; sweep += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        pNext[idx(i, j)] =
          0.25 *
          (p[idx(i + 1, j)]! + p[idx(i - 1, j)]! + p[idx(i, j + 1)]! + p[idx(i, j - 1)]! - div[idx(i, j)]! * hx * hx);
      }
    }
    p.set(pNext);
  }
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      u[idx(i, j)] = u[idx(i, j)]! - (p[idx(i + 1, j)]! - p[idx(i - 1, j)]!) / (2 * hx);
      v[idx(i, j)] = v[idx(i, j)]! - (p[idx(i, j + 1)]! - p[idx(i, j - 1)]!) / (2 * hx);
    }
  }
  return {
    initialDivergence,
    finalDivergence: divergenceNorm(),
    energyBefore,
    energyAfter: energy(),
  };
}
// ---- end of the frozen block -------------------------------------------------

/** v1's capture seed (its panel's default; the headless gate never changes it). */
export const CAPTURE_SEED = 42;
export { GATE_INTERVAL, GATE_N, GATE_STEPS, MAX_SPEED, WORLD, fluidProjectionProbe, simulateGate };
export type { FluidProbe, SimResult, SimSample };

export interface GateRun {
  bundle: CaptureBundle;
  ordered: SimResult;
  noisy: SimResult;
  fluid: FluidProbe;
}

/** v1 captureCanonical(), minus its panel calls: the bundle it hands to exposeCapture. */
export function buildCanonicalCapture(captureSeed = CAPTURE_SEED): GateRun {
  const ordered = simulateGate(captureSeed, 0.0, 2.0);
  const noisy = simulateGate(captureSeed, 0.55, 2.0);
  const fluid = fluidProjectionProbe();
  const steps: CaptureStepDescriptor[] = ordered.samples.map((sample, i) => {
    const noisySample = noisy.samples[i]!;
    return {
      step: sample.step,
      state: {
        order: field(
          new Float64Array([
            sample.phi,
            sample.rotation,
            noisySample.phi,
            noisySample.rotation,
            sample.meanSpeed,
            sample.maxSpeed,
          ]),
          [6],
          "f64",
        ),
        fluid_probe: field(
          new Float64Array([
            fluid.initialDivergence,
            fluid.finalDivergence,
            fluid.energyBefore,
            fluid.energyAfter,
          ]),
          [4],
          "f64",
        ),
      },
      diagnostics: {
        ordered_phi: sample.phi,
        noisy_phi: noisySample.phi,
        ordered_rotation: sample.rotation,
        max_speed: sample.maxSpeed,
        fluid_initial_divergence: fluid.initialDivergence,
        fluid_final_divergence: fluid.finalDivergence,
      },
    };
  });

  const bundle: CaptureBundle = {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "boids-2d", category: "agent-based", variant: "reynolds-vicsek-fluid-observable-gate" },
      stack: { name: "webgpu", version: "0.0.1", build_id: "boids-2d-v1" },
      config: {
        tier: "test",
        dims: [GATE_N, 2],
        dtype: "f64",
        seed: captureSeed,
        params: {
          ordered_noise: 0,
          noisy_noise: 0.55,
          steps: GATE_STEPS,
          interval: GATE_INTERVAL,
          max_speed: MAX_SPEED,
          gate: "observable-new-canonical; heavy GPU proof lives in the in-page v4 Verify panel",
        },
      },
      run: {
        step_count: GATE_STEPS,
        capture_interval: GATE_INTERVAL,
        wall_clock_seconds: 0,
        start_utc: "2026-07-05T00:00:00Z",
      },
      payload: { format: "hdf5", path: "boids-2d-observable-gate.h5", checksum: `sha256:${"0".repeat(64)}` },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps,
  };
  return { bundle, ordered, noisy, fluid };
}

export interface GateCheck {
  /** Two captures, byte-identical (SHA-256 of the JSON each run publishes). */
  identical: boolean;
  hashes: [string, string];
  checkpoints: number[];
  finite: boolean;
  bounded: boolean;
  vmax: number;
  speedOk: boolean;
  orderedPhi: number;
  noisyPhi: number;
  noiseResponse: boolean;
  divergence: [number, number];
  fluidImproves: boolean;
  pass: boolean;
  seconds: number;
}

/** The thresholds verify.py _gate_boids_2d applies (tools/productization/web-deploy/verify.py). */
export const GATE_RULES = {
  checkpoints: [0, 20, 40, 60, 80, 100, 120],
  vmax: 0.012 * (1 + 1e-3),
  noiseMargin: 0.03,
} as const;

async function sha256Text(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The release gate, re-run on this page: build the capture twice, compare the
 * bytes, and apply verify.py's predicates to run 1 (a mirror for the Prove
 * drawer; CI applies the Python original to the browser's capture).
 */
export async function runGateTwice(): Promise<GateCheck> {
  const t0 = performance.now();
  const a = buildCanonicalCapture();
  const b = buildCanonicalCapture();
  const [h1, h2] = await Promise.all([sha256Text(JSON.stringify(a.bundle)), sha256Text(JSON.stringify(b.bundle))]);
  const steps = a.bundle.steps;
  const order = steps.map((s) => s.state["order"]!.data);
  const fluid = steps[steps.length - 1]!.state["fluid_probe"]!.data;
  const all = [...order.flat(), ...fluid];
  const finite = all.every((v) => Number.isFinite(v));
  const inUnit = (v: number): boolean => v >= 0 && v <= 1;
  const bounded = order.every((o) => inUnit(o[0]!) && inUnit(o[1]!) && inUnit(o[2]!));
  const vmax = Math.max(...order.map((o) => o[5]!));
  const orderedPhi = order[order.length - 1]![0]!;
  const noisyPhi = order[order.length - 1]![2]!;
  const checkpoints = steps.map((s) => s.step);
  const speedOk = vmax <= GATE_RULES.vmax;
  const noiseResponse = orderedPhi > noisyPhi + GATE_RULES.noiseMargin;
  const fluidImproves = fluid[1]! < fluid[0]!;
  const identical = h1 === h2;
  const setOk = checkpoints.length === GATE_RULES.checkpoints.length && checkpoints.every((s, i) => s === GATE_RULES.checkpoints[i]);
  return {
    identical,
    hashes: [h1, h2],
    checkpoints,
    finite,
    bounded,
    vmax,
    speedOk,
    orderedPhi,
    noisyPhi,
    noiseResponse,
    divergence: [fluid[0]!, fluid[1]!],
    fluidImproves,
    pass: identical && setOk && finite && bounded && speedOk && noiseResponse && fluidImproves,
    seconds: (performance.now() - t0) / 1000,
  };
}
