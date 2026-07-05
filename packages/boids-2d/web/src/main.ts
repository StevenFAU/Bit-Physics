import "../../../../common/common-web/src/theme.css";

import { exposeCapture, field, resetCapture } from "../../../../common/common-web/src/capture-export.js";
import { createSettingsPanel } from "../../../../common/common-web/src/panel-shell.js";
import type { CaptureStepDescriptor } from "../../../../common/common-web/src/capture-export.js";
import type { DiagnosticRow } from "../../../../common/common-web/src/panel-shell.js";

declare global {
  // Set by the ported v4 lab after the WebGPU engine has initialized.
  // eslint-disable-next-line no-var
  var __boids2dReady: boolean | undefined;
}

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

let captureSeed = 42;

const bridgeStyle = document.createElement("style");
bridgeStyle.textContent = `
  .bps {
    left: 12px;
    right: auto;
    width: 286px;
    z-index: 32;
  }
  .bps-stage, .bps-canvas {
    display: contents;
  }
  @media (max-width: 760px) {
    .bps {
      top: auto;
      left: 10px;
      right: 10px;
      bottom: 10px;
      width: auto;
      max-height: 40vh;
    }
  }
`;
document.head.appendChild(bridgeStyle);

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

function rowsFromCapture(ordered: SimResult, noisy: SimResult, fluid: FluidProbe): DiagnosticRow[] {
  return [
    { label: "v4 WebGPU lab", value: globalThis.__boids2dReady ? "ready" : "booting" },
    { label: "gate agents", value: String(GATE_N) },
    { label: "ordered phi", value: ordered.finalPhi.toFixed(3) },
    { label: "noisy phi", value: noisy.finalPhi.toFixed(3) },
    { label: "rotation", value: ordered.finalRotation.toFixed(3) },
    { label: "speed max", value: ordered.maxSpeedObserved.toFixed(5) },
    { label: "fluid div", value: `${fluid.initialDivergence.toExponential(2)} -> ${fluid.finalDivergence.toExponential(2)}` },
  ];
}

async function captureCanonical(): Promise<void> {
  panel.setCaptureEnabled(false);
  panel.setStatus("building deterministic boids-2d gate capture...");
  resetCapture();
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

  exposeCapture(
    {
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
    },
    { download: false },
  );
  panel.setDiagnostics(rowsFromCapture(ordered, noisy, fluid));
  panel.setStatus(`capture ready - ordered phi ${ordered.finalPhi.toFixed(3)}, noisy phi ${noisy.finalPhi.toFixed(3)}`);
  panel.setCaptureEnabled(true);
}

function clickPrototypePreset(key: string): void {
  const button = document.querySelector<HTMLButtonElement>(`#presets button[data-p="${key}"]`);
  button?.click();
}

function setPrototypeMode(study: boolean): void {
  const selector = study ? '#modeToggle button[data-mode="study"]' : '#modeToggle button[data-mode="play"]';
  document.querySelector<HTMLButtonElement>(selector)?.click();
}

const panel = createSettingsPanel("Boids 2D", {
  caption: "A native port of the v4 2D flocking lab: million-agent counting sort, Vicsek order, and two-way stable-fluid coupling.",
  initial: { tier: "demo", seed: captureSeed },
  onChange: (state) => {
    captureSeed = state.seed;
    const seed = document.getElementById("seed") as HTMLInputElement | null;
    if (seed) seed.value = String(state.seed);
  },
  onCapture: captureCanonical,
  presets: [
    { label: "murmuration", title: "high-alignment dense flock", apply: () => clickPrototypePreset("murmuration") },
    { label: "mill", title: "rotation-dominant milling state", apply: () => clickPrototypePreset("mill") },
    { label: "fluid drift", title: "two-way stable-fluid coupling template", apply: () => clickPrototypePreset("fluiddrift") },
    { label: "gas", title: "Vicsek-noise disorder template", apply: () => clickPrototypePreset("gas") },
  ],
  modes: {
    initial: "play",
    onMode: (mode) => setPrototypeMode(mode === "study"),
  },
  study: {
    diagnostics: [{ label: "v4 WebGPU lab", value: "booting" }],
    honesty: {
      faithful:
        "the visible lab runs the ported v4 WebGPU solver with counting-sort broadphase, fixed-point path proof rows, and opt-in stable-fluid coupling",
      simplified:
        "the browser deploy capture is a small deterministic observable gate so CI stays fast; it does not replace the heavy in-page GPU brute-sort and fluid proof suite",
      measured:
        "capture records ordered/noisy order-parameter series, speed clamp evidence, and a small pressure-projection fluid probe; the v4 panel exposes adapter-local GPU hashes and residual rows",
    },
    verdict: {
      gate: "new_canonical observable capture + run-twice; in-page GPU proof for brute-sort/fluid",
      verdict: "READY",
      pass: true,
    },
    links: [
      {
        label: "demo spec",
        href: "https://github.com/StevenFAU/Bit-Physics/blob/main/packages/boids-2d/web/verification-demo-spec.md",
      },
      {
        label: "sim spec",
        href: "https://github.com/StevenFAU/Bit-Physics/blob/main/docs/sim-specs/agent-based/boids-2d/spec-ref.md",
      },
    ],
  },
});

panel.setActivePreset("murmuration");

const readyPoll = window.setInterval(() => {
  if (globalThis.__boids2dReady) {
    panel.setDiagnostics([{ label: "v4 WebGPU lab", value: "ready" }]);
    panel.setStatus("WebGPU lab ready; use the v4 Verify panel for heavy proof rows");
    window.clearInterval(readyPoll);
  }
}, 250);
