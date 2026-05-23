// Run-twice determinism harness (TypeScript counterpart of
// `tools/testkit/determinism::run_twice_and_diff`). Invokes a caller-
// supplied SimRunner twice at the same seed in independent output
// directories, then diffs the resulting captures via `diffCaptures`
// over the parsed Capture projection.
//
// The contract: a determinism-claimed sim must produce content-
// equivalent captures across two invocations at the same seed on the
// same hardware (spec § 2.5; sub-phase-capture-determinism-contract).
// Wall-clock-influenced storage-format metadata (HDF5 object-header
// timestamps) is explicitly NOT part of the contract; the `Capture`
// projection excludes it.

import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { loadCapture } from "./captureReader.js";
import { diffCaptures } from "./diffCaptures.js";

/**
 * Caller-supplied sim driver. Produces a capture at `seed`, writes it
 * under `outDir`, and returns the path to the manifest JSON. Must respect
 * `seed` (re-seed every RNG-touching object on every call) for the
 * determinism claim to hold.
 */
export type SimRunner = (args: { seed: number; outDir: string }) => Promise<string>;

export interface DeterminismVerdict {
  /** True iff every state array and diagnostic entry matches content-wise. */
  contentEquivalent: boolean;
  /** Human-readable summary: "captures match exactly" or first-mismatch detail. */
  detail: string;
}

export interface RunTwiceOptions {
  seed?: number;
  /** Base directory under which two run-a / run-b subdirs are created. */
  tmpDir?: string;
}

function summarizeFirstMismatch(
  maxAbsErr: number,
  maxRelErr: number,
  mismatchedFields: string[],
): string {
  if (mismatchedFields.length === 0) {
    return `max_abs_err=${maxAbsErr.toString()}, max_rel_err=${maxRelErr.toString()}`;
  }
  const head = mismatchedFields[0] ?? "";
  const extra =
    mismatchedFields.length > 1 ? ` (+${(mismatchedFields.length - 1).toString()} more)` : "";
  return `max_abs_err=${maxAbsErr.toString()}, max_rel_err=${maxRelErr.toString()}; first mismatch at ${head}${extra}`;
}

/**
 * Run `runner` twice at `seed`, project each capture through `loadCapture`,
 * and compare via `diffCaptures`. Returns a content-equivalent verdict.
 *
 * The harness does NOT remove its output; callers may inspect the
 * artifacts under `tmpDir/run-a` and `tmpDir/run-b`.
 */
export async function runTwiceAndDiff(
  runner: SimRunner,
  options: RunTwiceOptions = {},
): Promise<DeterminismVerdict> {
  const seed = options.seed ?? 42;
  const base =
    options.tmpDir !== undefined
      ? resolve(options.tmpDir)
      : mkdtempSync(join(tmpdir(), "det-ts-"));
  mkdirSync(base, { recursive: true });
  const leftDir = join(base, "run-a");
  const rightDir = join(base, "run-b");
  mkdirSync(leftDir, { recursive: true });
  mkdirSync(rightDir, { recursive: true });

  const leftManifest = await runner({ seed, outDir: leftDir });
  const rightManifest = await runner({ seed, outDir: rightDir });

  const left = await loadCapture(leftManifest);
  const right = await loadCapture(rightManifest);
  const diff = diffCaptures(left, right);

  if (diff.contentEquivalent) {
    return { contentEquivalent: true, detail: "captures match exactly" };
  }
  return {
    contentEquivalent: false,
    detail: summarizeFirstMismatch(diff.maxAbsErr, diff.maxRelErr, diff.mismatchedFields),
  };
}
