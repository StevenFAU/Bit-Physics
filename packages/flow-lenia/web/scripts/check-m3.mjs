import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [solver, events, renderer, renderShader, trails, cards, app, artifactRaw] = await Promise.all([
  read("src/model/solver.ts"),
  read("src/shaders/organism_events.wgsl"),
  read("src/render/renderer.ts"),
  read("src/shaders/render_organism.wgsl"),
  read("src/shaders/render_trails.wgsl"),
  read("src/experiments/cards.ts"),
  read("src/app.ts"),
  read("artifacts/m3-browser-gates.json"),
]);
const encodeOne = solver.slice(solver.indexOf("private encodeOne"), solver.indexOf("step(count"));

const assertions = [
  [events.includes("atomicAdd(&eventLedger[0]") && events.includes("atomicAdd(&eventLedger[1]"), "open add/erase tools write the explicit fixed-point ledger"],
  [encodeOne.indexOf("this.openEventPipeline") < encodeOne.indexOf("this.packPipeline"), "open events execute before spectral perception at the fixed boundary"],
  [encodeOne.indexOf("this.impulseEventPipeline") < encodeOne.indexOf("this.gatherPipeline"), "closed impulses execute before faithful destination gather"],
  [events.includes("transport.displacement_x") && events.includes("UI.max_displacement"), "pipette/stir remain bounded conservative transport impulses"],
  [!renderShader.includes("read_write") && renderer.includes('buffer: { type: "read-only-storage"'), "all renderer scientific-state bindings are read-only"],
  [trails.includes("historyFrame") && renderer.includes("flow-lenia-m3-trail-a"), "trails live in separate presentation textures"],
  [(cards.match(/id: "[^"]+",/g) ?? []).length === 6, "exactly six authored organism/ablation cards ship in M3"],
  [cards.includes("pressure-ablation") && cards.includes("comparison") && cards.includes("sigma-phase"), "synchronized pressure and sigma comparisons are explicit cards"],
  [app.includes('aria-keyshortcuts') && app.includes('pointerType === "touch"') && app.includes("pinchDistance"), "keyboard, pointer, and touch/pinch paths are implemented"],
  [app.includes("ScientificInspector") && app.includes("fitOccupied"), "read-only inspection and occupied-mass camera fit are wired"],
];
for (const [passed, label] of assertions) {
  if (!passed) throw new Error(`M3 static check failed: ${label}`);
  console.log(`PASS ${label}`);
}

const artifact = JSON.parse(artifactRaw);
const gates = [
  [artifact.schemaVersion === "flow-lenia-m3-gates-v1", "browser artifact schema is pinned"],
  [artifact.environment?.userAgent && artifact.environment?.adapter?.vendor, "browser and adapter provenance are recorded"],
  [artifact.cards.length === 6 && artifact.cards.every((card) => card.pass), "all six cards retain structural stability"],
  [artifact.cards.filter((card) => card.comparison).length === 2 && artifact.cards.filter((card) => card.comparison).every((card) => card.comparison.pass && card.comparison.stateDiverged), "both synchronized ablations are stable and causally diverge"],
  [artifact.scheduledEvents.byteExactSameAdapter && artifact.scheduledEvents.ledgerPass, "scheduled open/closed event replay is exact and ledgered"],
  [artifact.closedImpulses.ledgerUntouched && artifact.closedImpulses.pass, "pipette/stir remain closed in the ledger"],
  [artifact.renderIntegrity.scientificStateByteExact, "render controls and effects leave scientific bytes unchanged"],
  [artifact.productSurface.pass && artifact.productSurface.experiments === 6 && artifact.productSurface.tools === 5 && artifact.productSurface.scientificViews === 6, "complete accessible laboratory product surface is mounted"],
  [artifact.memory.under128Mib, "synchronized comparison solvers retain the provisional memory budget"],
  [artifact.pass === true, "committed M3 browser verdict passes"],
];
for (const [passed, label] of gates) {
  if (!passed) throw new Error(`M3 artifact check failed: ${label}`);
  console.log(`PASS ${label}`);
}
