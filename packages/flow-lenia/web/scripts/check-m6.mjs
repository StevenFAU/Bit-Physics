import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, ".."); const read = (path) => readFile(resolve(root, path), "utf8");
const [solver, arena, events, render, cards, io, app, artifactRaw, canonicalRaw] = await Promise.all([
  read("src/model/ecosystem-solver.ts"), read("src/shaders/arena_perceive.wgsl"), read("src/shaders/arena_events.wgsl"), read("src/shaders/render_arena.wgsl"), read("src/experiments/arena-cards.ts"), read("src/model/experiment-io.ts"), read("src/arena-app.ts"), read("artifacts/m6-browser-release-gates.json"), read("artifacts/m6-canonical-capture-index.json"),
]);
const assertions = [
  [solver.includes("options?.environment === true") && solver.includes("this.arenaEnabled ? makeBuffer"), "Arena resources remain opt-in and do not change M4 allocation"],
  [arena.includes("affinity.xyz += U.channelResponse.xyz * environmentValue"), "environment is additive affinity upstream of unchanged flow/transport"],
  [arena.includes("authored.x + authored.y + (1.0 - U.gateOpen) * authored.z"), "soft walls and timed gates are explicit conservative fields"],
  [events.includes("apply_environment_events") && events.includes("field.y = clamp"), "affinity, wall, and erase brushes execute on GPU at step boundaries"],
  [!render.includes("read_write") && render.includes("@binding(8) var<storage, read> regionIn"), "Arena renderer has eight read-only scientific bindings"],
  [(cards.match(/\n    id: "/g) ?? []).length === 3, "three authored Arena experiment cards ship"],
  [io.includes("flow-lenia-arena-experiment-v1") && io.includes("scientific_sha256") && io.includes("parseArenaExperiment"), "versioned experiment import verifies complete-state SHA-256"],
  [app.includes("data-arena-regions") && app.includes("data-lineage-graph") && app.includes("region_mass_1"), "region metrics and lineage graph are mounted"],
];
for (const [passed, label] of assertions) { if (!passed) throw new Error(`M6 static check failed: ${label}`); console.log(`PASS ${label}`); }
const artifact = JSON.parse(artifactRaw); const gates = [
  [artifact.schemaVersion === "flow-lenia-m6-release-gates-v1", "release artifact schema is pinned"],
  [artifact.environmentAnchors?.pass, "zero-field, affinity, gate, paint, and conservation anchors pass"],
  [artifact.arenas?.length === 3 && artifact.arenas.every((item) => item.pass && item.byteExactSameAdapter), "all Arena cards are stable and replay byte-exactly on one adapter"],
  [artifact.roundTrip?.restoredByteExact && artifact.roundTrip?.continuationByteExact && artifact.roundTrip?.tamperRejected && artifact.roundTrip?.pass, "versioned export/import rejects tampering, restores, and continues byte-exactly"],
  [artifact.architecture?.arenaStorageRenderBindings === 8 && artifact.architecture?.hotLoopReadbacks === 0 && artifact.architecture?.hotLoopGpuBufferAllocations === 0 && artifact.architecture?.under128Mib, "portable bindings, hot-loop, and memory budgets pass"],
  [artifact.performance?.p95Ms <= 33.3 && artifact.performance?.pass, "256² Arena timing stays within the desktop budget"],
  [artifact.renderIntegrity?.scientificStateByteExact, "all Arena render modes leave scientific buffers byte-exact"],
  [artifact.productSurface?.pass, "Arena cards, tools, views, metrics, graph, IO, keyboard, and responsive surface are mounted"],
  [artifact.captureContract?.pass && artifact.captureContract?.fields?.length === 6 && /^[0-9a-f]{64}$/.test(artifact.captureContract.shaderHash), "canonical Arena capture includes all six fields and shader provenance"],
  [artifact.adaptiveSmoke?.grid === 128 && artifact.adaptiveSmoke?.pass, "touch-sized adaptive browser smoke passes"],
  [artifact.pass === true, "committed M5–M6 release verdict passes"],
];
for (const [passed, label] of gates) { if (!passed) throw new Error(`M6 artifact check failed: ${label}`); console.log(`PASS ${label}`); }
const canonical = JSON.parse(canonicalRaw); if (canonical.schemaVersion !== "flow-lenia-m6-canonical-index-v1" || canonical.captures?.length !== 3 || !canonical.captures.every((item) => /^[0-9a-f]{64}$/.test(item.stateSha256)) || !canonical.pass) throw new Error("M6 canonical capture index is incomplete"); console.log("PASS organism, ecosystem, and Arena canonical references are hash-pinned");
