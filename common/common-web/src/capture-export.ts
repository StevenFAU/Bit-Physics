// Browser-side capture-export hook (web-build-track scoping note § 3 item 4).
//
// The Stack-B web sims compute their state on the GPU; to round-trip that
// output against the in-repo canonical `.h5` (the 5.1 bootstrap gate), the
// browser must re-emit the canonical capture descriptor. Rather than port the
// Node `h5wasm` CaptureWriter into the browser, this hook exposes the raw
// field arrays on a window global so a headless driver (Playwright Chromium,
// per the reconciliation R1 recipe) can extract them and write the `.h5`+`.json`
// via the proven Node `@bit-physics/common-ts` `CaptureWriter`. It also offers
// a direct JSON download for manual use.
//
// The descriptor mirrors the Python `CaptureManifest` (spec § 2.5) so the
// extracted capture is content-equivalent to the canonical writer's output.

export type FieldDtype = "f32" | "f64";

export interface CaptureFieldDescriptor {
  /** Row-major flattened values. */
  data: number[];
  shape: number[];
  dtype: FieldDtype;
}

export interface CaptureStepDescriptor {
  step: number;
  state: Record<string, CaptureFieldDescriptor>;
  diagnostics: Record<string, number>;
}

export interface CaptureManifestLike {
  schema_version: string;
  sim: { name: string; category: string; variant: string };
  stack: { name: string; version: string; build_id: string };
  config: {
    tier: string;
    dims: number[];
    dtype: FieldDtype;
    seed: number;
    params: Record<string, unknown>;
  };
  run: {
    step_count: number;
    capture_interval: number;
    wall_clock_seconds: number;
    start_utc: string;
  };
  payload: { format: "hdf5"; path: string; checksum: string };
  determinism: {
    claimed: "bit-exact-same-hw" | "epsilon" | "non-deterministic";
    atomic_ops: boolean;
    subgroup_ops: boolean;
  };
}

export interface CaptureBundle {
  manifest: CaptureManifestLike;
  steps: CaptureStepDescriptor[];
}

declare global {
  // eslint-disable-next-line no-var
  var __bitPhysicsCapture: CaptureBundle | undefined;
  // eslint-disable-next-line no-var
  var __bitPhysicsCaptureReady: boolean | undefined;
}

/** Convert a typed array to a plain number[] descriptor field. */
export function field(
  data: Float32Array | Float64Array,
  shape: number[],
  dtype: FieldDtype,
): CaptureFieldDescriptor {
  return { data: Array.from(data), shape, dtype };
}

/**
 * Publish a finished capture for the headless extractor and trigger an
 * optional JSON download.
 *
 * Sets `window.__bitPhysicsCapture` (the Playwright driver reads it) and
 * flips `window.__bitPhysicsCaptureReady = true` so the driver can poll for
 * completion deterministically.
 */
export function exposeCapture(
  bundle: CaptureBundle,
  options: { download?: boolean; downloadName?: string } = {},
): void {
  globalThis.__bitPhysicsCapture = bundle;
  globalThis.__bitPhysicsCaptureReady = true;
  if (options.download) {
    const name =
      options.downloadName ?? `${bundle.manifest.sim.name}-capture.json`;
    const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Reset the ready flag before a fresh capture run. */
export function resetCapture(): void {
  globalThis.__bitPhysicsCapture = undefined;
  globalThis.__bitPhysicsCaptureReady = false;
}

// --- Capture / live-loop mutual exclusion (the harness-race fix) -------------
//
// Every Stack-B web app runs a live `requestAnimationFrame(frame)` loop that
// steps the sim on the SAME module-level ping-pong index + GPU buffers that
// `captureCanonical()` uses. `captureCanonical()` yields at each `await`
// readback; if the live `frame()` loop steps during that yield it overwrites
// the capture's shared state, so two captures differ run-to-run by a
// wall-clock-dependent amount (MEASURED for boids @ step 400 and neural-ca @
// step 100; latent in rd2d/ising/physarum). This is a within-backend data
// race, NOT a shader bug or a cross-backend artifact (see the Phase-0
// browser-divergence charter).
//
// The fix isolates the two: the capture button wraps `onCapture` in
// `runCaptureExclusive`, which holds `_capturing` for the capture's whole
// duration, and every live `frame()` loop checks `isCapturing()` and yields
// (no stepping, no render) until the capture completes. After the fix each
// new_canonical sim is run-twice byte-identical again.
let _capturing = false;

/** True while a capture is in progress; live RAF loops must not step. */
export function isCapturing(): boolean {
  return _capturing;
}

/**
 * Run the sim's capture routine with the live-loop lock held, so the live
 * `requestAnimationFrame` loop cannot interleave a step into the shared GPU
 * state mid-capture. The flag is set synchronously (before the first await) so
 * any RAF callback scheduled after the capture click already sees it.
 */
export async function runCaptureExclusive(
  fn: () => void | Promise<void>,
): Promise<void> {
  _capturing = true;
  try {
    await fn();
  } finally {
    _capturing = false;
  }
}
