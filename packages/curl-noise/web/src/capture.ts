// curl-noise — web-gate canonical capture (new_canonical, spec-ref § 13.2).
//
// Gate scene: the committed canonical IC (public/gate-ic.json — 4096
// tracers, seeded_tracers(42) from the f64 backend) advected 64 RK4 steps
// at dt = 2e-4 with 1-iteration Newton reprojection, NO wrap, all
// interaction potentials zeroed, t = 0. Checkpoints every 8 steps expose
// f32 positions; the browser also exposes its f32-computed initial iso
// values f0 — verify.py recomputes f(x) in f64 at the f32 positions and
// gates ||f64 f(x) - f0_f32|| / iso_scale against [defaults.curl-noise]
// (chaos-immune: never a pointwise trajectory match, spec-ref § 9).
//
// Determinism witness: the whole run executes TWICE; the position byte
// streams must hash identically (pure per-tracer gather, no atomics).

import type {
  CaptureBundle,
  CaptureStepDescriptor,
} from "../../../../common/common-web/src/capture-export.js";
import { field } from "../../../../common/common-web/src/capture-export.js";

export interface GateIc {
  descriptor: string;
  seed: number;
  params: {
    construction: string;
    octaves: number;
    lacunarity: number;
    gain: number;
    ell0: number;
    amplitude: number;
    obstacle_center: [number, number, number];
    obstacle_radius: number;
    obstacle_ramp_width: number;
    obstacle_noise_amp: number;
    dt: number;
    steps: number;
    capture_interval: number;
    tracers: number;
    integrator: string;
    reproject_iters: number;
  };
  positions: number[];
  f0_f64: number[];
}

export async function loadGateIc(): Promise<GateIc> {
  const res = await fetch("./gate-ic.json");
  if (!res.ok) throw new Error(`gate-ic.json fetch failed: ${res.status}`);
  return (await res.json()) as GateIc;
}

export async function sha256hex(data: Float32Array): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface GateRunner {
  /** Run the gate scene once on dedicated buffers; returns checkpoints. */
  run(ic: GateIc): Promise<{
    steps: CaptureStepDescriptor[];
    trajectorySha: string;
    f0: Float32Array;
    residualMax: number;
  }>;
}

export function makeBundle(
  ic: GateIc,
  steps: CaptureStepDescriptor[],
  seed: number,
  wallSeconds: number,
  adapterInfo: string,
): CaptureBundle {
  return {
    manifest: {
      schema_version: "1.0.0",
      sim: { name: "curl-noise", category: "closed-form", variant: "crossprod-sphere-webgpu" },
      stack: {
        name: "webgpu-f32",
        version: "0.0.1",
        build_id: `phase-6-curl-noise-web ${adapterInfo}`,
      },
      config: {
        tier: "test",
        dims: [3],
        dtype: "f32",
        seed,
        params: { ...ic.params },
      },
      run: {
        step_count: ic.params.steps,
        capture_interval: ic.params.capture_interval,
        wall_clock_seconds: wallSeconds,
        start_utc: "2026-07-05T00:00:00Z",
      },
      payload: {
        format: "hdf5",
        path: `${ic.descriptor}.h5`,
        checksum: "sha256:" + "0".repeat(64),
      },
      determinism: { claimed: "bit-exact-same-hw", atomic_ops: false, subgroup_ops: false },
    },
    steps,
  };
}

export { field };
