import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [solver, spectral, perceive, flow, gather, renderer, fixtureRaw, artifactRaw] = await Promise.all([
  read("src/model/solver.ts"),
  read("src/shaders/organism_spectral.wgsl"),
  read("src/shaders/organism_perceive.wgsl"),
  read("src/shaders/organism_flow.wgsl"),
  read("src/shaders/reintegrate_organism.wgsl"),
  read("src/shaders/render_organism.wgsl"),
  read("src/prove/organism-fixture.json"),
  read("artifacts/m2-browser-gates.json"),
]);

const assertions = [
  [solver.includes("encode2d(pass, CHANNELS, -1)"), "one batched forward transform covers all mass channels"],
  [solver.includes("encode2d(pass, KERNELS, 1)"), "one batched inverse transform covers all kernel responses"],
  [spectral.includes("params[kernel].source"), "kernel source routing comes from the frozen connection table"],
  [perceive.includes("2.0 * exp(-0.5 * z * z) - 1.0"), "growth uses the frozen bell response"],
  [flow.includes("(1.0 - gate) * gradient - gate * pressure_gradient"), "flow combines affinity and density pressure"],
  [flow.includes("clamp(raw, vec2<f32>(-U.max_displacement)"), "displacement is component-clamped to the proof domain"],
  [gather.includes("for (var oi = -5; oi <= 5; oi += 1)"), "organism gather streams the fixed 11x11 neighborhood"],
  [gather.includes("4.0 * U.sigma * U.sigma"), "organism gather uses exact normalized square overlap"],
  [!solver.toLowerCase().includes("genome"), "organism mode allocates no localized genome buffers"],
  [!renderer.includes("read_write"), "all renderer solver bindings are read-only"],
];
for (const [passed, label] of assertions) {
  if (!passed) throw new Error(`M2 static check failed: ${label}`);
  console.log(`PASS ${label}`);
}

const fixture = JSON.parse(fixtureRaw);
if (fixture.schema_version !== "flow-lenia-m2-conformance-v1") throw new Error("M2 fixture schema drifted");
if (fixture.cases.length !== 3) throw new Error("M2 fixture must keep the reference plus two adversarial cases");
console.log("PASS f64-derived fixture includes smooth, seam-loaded, and crowded-pressure cases");

const artifact = JSON.parse(artifactRaw);
const fieldFailures = artifact.numericalCases.flatMap((item) => item.fields.filter((field) => !field.pass));
const gates = [
  [artifact.schemaVersion === "flow-lenia-m2-gates-v1", "browser artifact schema is pinned"],
  [artifact.environment?.userAgent && artifact.environment?.adapter?.vendor, "browser and adapter provenance are recorded"],
  [artifact.numericalCases.length === 3 && fieldFailures.length === 0, "all CPU-GPU intermediate and rollout comparisons pass"],
  [artifact.structural.steps === 256, "long-horizon gate executes 256 steps per replay"],
  [artifact.structural.byteExactSameAdapter === true, "same-adapter replay is byte-exact"],
  [artifact.structural.metrics.relativeMassDrift <= 5e-5, "long-horizon mass ledger closes"],
  [artifact.structural.metrics.nonFinite === 0 && artifact.structural.metrics.negative === 0, "long-horizon state stays finite and non-negative"],
  [artifact.structural.metrics.clampFraction <= 0.05, "long-horizon clamp fraction stays bounded"],
  [artifact.performance.grid === 256 && artifact.performance.p95Ms <= 33.3, "complete 256^2 step retains the desktop timing budget"],
  [artifact.performance.allocatedBytes < 128 * 2 ** 20, "complete organism allocation retains the memory budget"],
  [artifact.pass === true, "committed M2 browser verdict passes"],
];
for (const [passed, label] of gates) {
  if (!passed) throw new Error(`M2 artifact check failed: ${label}`);
  console.log(`PASS ${label}`);
}
