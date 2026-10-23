// @bp/verify — the proof layer's contract with the headless gate
// (00-foundation.md § 5).
//
// The capture hook itself stays in common/common-web/src/capture-export.ts
// (one implementation for v1 and v2 pages, same window globals); this module
// re-exports it and adds what every v2 Prove drawer needs: the readiness
// flag, the gate criterion, hashing.
//
// Contract the driver relies on (tools/productization/web-deploy/web/headless/driver.mjs):
//   * window.__bitPhysicsReady === true once the WebGPU path booted;
//   * an element carrying [data-bp-panel] exists (the Prove drawer);
//   * [data-bp="capture"] is an HTMLButtonElement whose click produces
//     window.__bitPhysicsCapture and sets window.__bitPhysicsCaptureReady.

export {
  exposeCapture,
  field,
  isCapturing,
  resetCapture,
  runCaptureExclusive,
} from "../../../common/common-web/src/capture-export.js";
export type {
  CaptureBundle,
  CaptureFieldDescriptor,
  CaptureManifestLike,
  CaptureStepDescriptor,
  FieldDtype,
} from "../../../common/common-web/src/capture-export.js";

declare global {
  // eslint-disable-next-line no-var
  var __bitPhysicsReady: boolean | undefined;
}

/** Mark the app booted for the headless harness. */
export function markReady(): void {
  globalThis.__bitPhysicsReady = true;
}

export interface Declared {
  relative: number;
  absolute: number;
}

export interface FieldAgreement {
  maxAbs: number;
  maxRel: number;
  /** absolute + relative · max|right| */
  threshold: number;
  pass: boolean;
  /** maxAbs / threshold — the bar on a proof card. */
  ratio: number;
  /** Why the run could not be scored (short or non-finite); the agreement then fails. */
  invalid?: string;
}

/**
 * The capture_roundtrip criterion, verbatim from
 * tools/testkit/equivalence harness.compare_captures: per field,
 * max_abs_err ≤ absolute + relative · max|right|, right = this device's run.
 * A run shorter than the reference, or a non-finite value on either side,
 * fails outright: NaN compares false, so it would otherwise score as zero error.
 */
export function agreement(
  reference: ArrayLike<number>,
  run: ArrayLike<number>,
  declared: Declared,
  runStride = 1,
  runOffset = 0,
): FieldAgreement {
  const invalid = (why: string): FieldAgreement => ({
    maxAbs: Infinity,
    maxRel: Infinity,
    threshold: declared.absolute,
    pass: false,
    ratio: Infinity,
    invalid: why,
  });
  const needed = reference.length === 0 ? 0 : (reference.length - 1) * runStride + runOffset + 1;
  if (run.length < needed) return invalid(`run has ${run.length} values, the reference needs ${needed}`);
  let maxAbs = 0;
  let maxRel = 0;
  let scale = 0;
  for (let c = 0; c < reference.length; c += 1) {
    const a = reference[c]!;
    const b = run[c * runStride + runOffset]!;
    if (!Number.isFinite(a)) return invalid(`reference value ${c} is ${a}`);
    if (!Number.isFinite(b)) return invalid(`run value ${c} is ${b}`);
    const diff = Math.abs(a - b);
    if (diff > maxAbs) maxAbs = diff;
    const denom = Math.max(Math.abs(a), Math.abs(b));
    if (denom > 0 && diff / denom > maxRel) maxRel = diff / denom;
    if (Math.abs(b) > scale) scale = Math.abs(b);
  }
  const threshold = declared.absolute + declared.relative * scale;
  return { maxAbs, maxRel, threshold, pass: maxAbs <= threshold, ratio: threshold > 0 ? maxAbs / threshold : 0 };
}

export async function sha256hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Precise labels only (00-foundation.md § 5). */
export type ProofLabel =
  | "analytic check passed"
  | "reference agreement passed"
  | "budget within tolerance"
  | "illustrative scenario (not gated)";
