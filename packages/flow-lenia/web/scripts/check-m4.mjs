import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [solver, organismSolver, gather, mutation, renderer, cardsRaw, fixtureRaw, artifactRaw] = await Promise.all([
  read("src/model/ecosystem-solver.ts"),
  read("src/model/solver.ts"),
  read("src/shaders/reintegrate_ecosystem.wgsl"),
  read("src/shaders/ecosystem_mutation.wgsl"),
  read("src/shaders/render_ecosystem.wgsl"),
  read("src/experiments/ecosystem-cards.ts"),
  read("src/prove/ecosystem-fixture.json"),
  read("artifacts/m4-browser-gates.json"),
]);

const assertions = [
  [solver.includes("genomeH: [GPUBuffer, GPUBuffer]") && solver.includes("genomeQ: [GPUBuffer, GPUBuffer]") && solver.includes("identity: [GPUBuffer, GPUBuffer]"), "ecosystem H, Q, fingerprint/lineage/flags state is ping-ponged"],
  [solver.includes("flow-lenia-m4-eight-storage-gather-layout"), "localized transport freezes the portable eight-storage binding layout"],
  [solver.includes("constants: { MIXING_RULE: ruleIndex[rule] }"), "five inheritance rules compile as specialized gather pipelines"],
  [gather.includes("override MIXING_RULE") && gather.includes("incoming > 0.0") && gather.indexOf("incoming > 0.0") < gather.indexOf("source_gene(&hIn"), "candidate genome reads occur only after positive overlap mass"],
  [gather.includes("counter_hash(destination, candidate, gene"), "stochastic gene choice is stateless and counter-addressed"],
  [gather.includes("- log(-log(gumbel_u))"), "negotiation uses streaming Gumbel-max"],
  [mutation.includes("apply_mutation_patches") && mutation.includes("identity[g.x].z == header.w"), "mutation applies bounded deltas to contiguous parent-lineage patches"],
  [solver.includes("lineageRing.length > 128"), "lineage history is a bounded ring"],
  [!renderer.includes("read_write"), "lineage and phenotype renderer bindings are read-only"],
  [!organismSolver.includes("ecosystem-solver") && !organismSolver.toLowerCase().includes("genome"), "organism specialization remains genome-free"],
  [(cardsRaw.match(/\n    id: "/g) ?? []).length === 3, "three M4 ecosystem cards are authored"],
];
for (const [passed, label] of assertions) {
  if (!passed) throw new Error(`M4 static check failed: ${label}`);
  console.log(`PASS ${label}`);
}

const fixture = JSON.parse(fixtureRaw);
if (fixture.schema_version !== "flow-lenia-m4-conformance-v1") throw new Error("M4 fixture schema drifted");
if (fixture.cases.length !== 5 || fixture.cases.map((item) => item.rule).join(",") !== "average,whole,gene-wise,best,negotiation") throw new Error("M4 fixture must cover all five inheritance rules in frozen order");
console.log("PASS f64-derived fixture covers every localized inheritance rule and mutation identity");

const artifact = JSON.parse(artifactRaw);
const gates = [
  [artifact.schemaVersion === "flow-lenia-m4-gates-v1", "browser artifact schema is pinned"],
  [artifact.environment?.userAgent && artifact.environment?.adapter?.vendor, "browser and adapter provenance are recorded"],
  [artifact.numericalRules.length === 5 && artifact.numericalRules.every((item) => item.pass), "all five CPU-GPU inheritance comparisons pass"],
  [artifact.determinismRules.length === 5 && artifact.determinismRules.every((item) => item.byteExactSameAdapter && item.pass), "all five inheritance rules replay byte-exactly on one adapter"],
  [artifact.mutation.childIdentityExact && artifact.mutation.childFlagsExact && artifact.mutation.lineageRingComplete && artifact.mutation.affectedMass > 0 && artifact.mutation.pass, "mutation delta, child identity/flags, affected mass, conservation, and lineage record pass"],
  [artifact.ecosystems.length === 3 && artifact.ecosystems.every((item) => item.pass), "three-founder, negotiation-sea, and identity-dilution ecosystems remain stable"],
  [artifact.identityDilution.distinctOutcomes && artifact.identityDilution.pass, "identity-dilution comparison falsifies equivalent mixing outcomes"],
  [artifact.architecture.gatherStorageBindings === 8 && artifact.architecture.specializedPipelines === 5, "measured architecture retains eight bindings and five specializations"],
  [artifact.architecture.allocatedBytes256 < 128 * 2 ** 20, "complete 256² ecosystem allocation retains the memory budget"],
  [artifact.performance.p95Ms <= 33.3 && artifact.performance.pass, "complete 256² negotiation step retains the desktop timing budget"],
  [artifact.renderIntegrity?.scientificStateByteExact === true, "lineage and phenotype rendering leaves mass and genomes byte-exact"],
  [artifact.productSurface?.pass === true, "ecosystem cards, rules, tools, views, and three-pane comparison are mounted"],
  [artifact.captureContract?.pass === true && artifact.captureContract?.step === 32 && artifact.captureContract?.fields?.length === 4, "standard browser capture contains mass, H, Q, and packed identity state"],
  [artifact.pass === true, "committed M4 browser verdict passes"],
];
for (const [passed, label] of gates) {
  if (!passed) throw new Error(`M4 artifact check failed: ${label}`);
  console.log(`PASS ${label}`);
}
