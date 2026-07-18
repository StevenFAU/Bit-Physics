import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [fft, gather, wrapper, inventory, artifactRaw] = await Promise.all([
  read("src/shaders/batch_fft.wgsl"),
  read("src/shaders/reintegrate.wgsl"),
  read("src/fft-batch.ts"),
  read("src/inventory.ts"),
  read("artifacts/m0-browser-benchmark.json"),
]);

const assertions = [
  [wrapper.includes("FFT_COMMON_WGSL"), "FFT wrapper imports the shared numerical core"],
  [fft.includes("plane * U.n * U.n"), "FFT address surface includes an explicit plane dimension"],
  [gather.includes("for (var oy = -5; oy <= 5; oy += 1)"), "gather has the fixed 11x11 dd=5 candidate loop"],
  [gather.includes("4.0 * U.sigma * U.sigma"), "finite-square overlap uses the normalized 4 sigma^2 area"],
  [gather.includes("fn gather_mass"), "mass-only gather specialization exists"],
  [gather.includes("fn gather_full"), "full-state gather specialization exists"],
  [inventory.includes("storageBindings: 8"), "full-state binding inventory freezes the portable storage floor"],
];

for (const [passed, label] of assertions) {
  if (!passed) throw new Error(`M0 static check failed: ${label}`);
  console.log(`PASS ${label}`);
}

const n = 256;
const projectedBytes = 604 * n * n;
const largestBufferBytes = 72 * n * n;
if (projectedBytes !== 39_583_744) throw new Error("projected memory arithmetic drifted");
if (largestBufferBytes !== 4_718_592) throw new Error("largest-buffer arithmetic drifted");
console.log(`PASS projected 256^2 complete state ${(projectedBytes / 2 ** 20).toFixed(2)} MiB`);
console.log(`PASS largest 256^2 storage binding ${(largestBufferBytes / 2 ** 20).toFixed(2)} MiB`);

const artifact = JSON.parse(artifactRaw);
const verification = artifact.verification128;
const desktop = artifact.benchmarks.find((row) => row.n === 256 && row.mode === "step-full");
const artifactAssertions = [
  [artifact.schemaVersion === "flow-lenia-m0-v1", "benchmark artifact schema is pinned"],
  [artifact.benchmarks.length === 10, "artifact covers five workloads at both grid tiers"],
  [artifact.architectureFailures.length === 0, "reference adapter has no architecture failure"],
  [verification.fftMaxAbs <= 5e-4, "browser FFT round-trip anchor passes"],
  [verification.gatherMassRelativeResidual <= 5e-5, "mass-only gather ledger passes"],
  [verification.fullMassRelativeResidual <= 5e-5, "full-state gather ledger passes"],
  [verification.uniformGenomeMaxAbs <= 5e-5, "uniform genome anchor passes"],
  [verification.uniformIdentityExact === true, "uniform identity anchor is exact"],
  [desktop?.p95Ms <= 33.3, "256^2 dominant-path p95 retains the desktop budget"],
  [artifact.measuredDefault === 256, "measured desktop default is frozen at 256^2"],
];
for (const [passed, label] of artifactAssertions) {
  if (!passed) throw new Error(`M0 artifact check failed: ${label}`);
  console.log(`PASS ${label}`);
}
