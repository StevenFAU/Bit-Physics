// Content-equivalent capture diff (TypeScript counterpart of the Python
// `capture.diff_captures` bit-exact path). Compares two parsed `Capture`
// records element-wise; storage-format metadata is invisible to the
// comparison because both captures are projected through the
// `loadCapture` reader before diffing.
//
// Bit-exact mode only at this sub-phase. Tolerance modes (epsilon /
// distributional) are downstream cross-stack work; do NOT speculatively
// add them here.

import type { Capture } from "./captureReader.js";

export interface DiffResult {
  contentEquivalent: boolean;
  maxAbsErr: number;
  maxRelErr: number;
  mismatchedFields: string[];
}

function arrayEqual(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function maxAbsDelta(a: Float64Array, b: Float64Array): number {
  let max = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    const d = Math.abs(ai - bi);
    if (d > max) max = d;
  }
  return max;
}

function maxRelDelta(a: Float64Array, b: Float64Array): number {
  let max = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    const denom = Math.max(Math.abs(ai), Math.abs(bi));
    if (denom === 0) continue;
    const d = Math.abs(ai - bi) / denom;
    if (d > max) max = d;
  }
  return max;
}

/**
 * Compare two captures content-equivalently. Returns
 * `contentEquivalent = true` iff every step's every state array and every
 * diagnostic entry matches element-wise. The first mismatched field path
 * is the first entry of `mismatchedFields`; subsequent mismatches are
 * appended in iteration order (sorted-by-step, then sorted-by-field).
 *
 * Bit-exact mode only at this sub-phase.
 */
export function diffCaptures(left: Capture, right: Capture): DiffResult {
  const mismatchedFields: string[] = [];
  let maxAbsErr = 0;
  let maxRelErr = 0;

  if (left.steps.length !== right.steps.length) {
    mismatchedFields.push(
      `steps.length: left=${left.steps.length} right=${right.steps.length}`,
    );
    return {
      contentEquivalent: false,
      maxAbsErr,
      maxRelErr,
      mismatchedFields,
    };
  }

  for (let i = 0; i < left.steps.length; i += 1) {
    const ls = left.steps[i];
    const rs = right.steps[i];
    if (ls === undefined || rs === undefined) {
      mismatchedFields.push(`step[${i.toString()}]: missing on one side`);
      continue;
    }
    if (ls.step !== rs.step) {
      mismatchedFields.push(
        `step[${i.toString()}].step: left=${ls.step.toString()} right=${rs.step.toString()}`,
      );
      continue;
    }

    const stateKeys = new Set([...Object.keys(ls.state), ...Object.keys(rs.state)]);
    for (const fieldName of [...stateKeys].sort()) {
      const lv = ls.state[fieldName];
      const rv = rs.state[fieldName];
      const where = `steps/${ls.step.toString()}/state/${fieldName}`;
      if (lv === undefined || rv === undefined) {
        mismatchedFields.push(`${where}: missing on one side`);
        continue;
      }
      if (!arrayEqual(lv, rv)) {
        mismatchedFields.push(where);
        const ae = maxAbsDelta(lv, rv);
        const re = maxRelDelta(lv, rv);
        if (ae > maxAbsErr) maxAbsErr = ae;
        if (re > maxRelErr) maxRelErr = re;
      }
    }

    const diagKeys = new Set([
      ...Object.keys(ls.diagnostics),
      ...Object.keys(rs.diagnostics),
    ]);
    for (const checkName of [...diagKeys].sort()) {
      const lv = ls.diagnostics[checkName];
      const rv = rs.diagnostics[checkName];
      const where = `steps/${ls.step.toString()}/diagnostics/${checkName}`;
      if (lv === undefined || rv === undefined) {
        mismatchedFields.push(`${where}: missing on one side`);
        continue;
      }
      if (lv !== rv) {
        mismatchedFields.push(where);
        const ae = Math.abs(lv - rv);
        const denom = Math.max(Math.abs(lv), Math.abs(rv));
        const re = denom === 0 ? 0 : ae / denom;
        if (ae > maxAbsErr) maxAbsErr = ae;
        if (re > maxRelErr) maxRelErr = re;
      }
    }
  }

  return {
    contentEquivalent: mismatchedFields.length === 0,
    maxAbsErr,
    maxRelErr,
    mismatchedFields,
  };
}
