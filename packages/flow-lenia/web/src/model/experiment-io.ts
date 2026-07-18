import type { ArenaCard } from "../experiments/arena-cards.js";
import type { ArenaPackedSnapshot, LineageEventRecord, MixingRule } from "./ecosystem-solver.js";
import type { ArenaDynamics } from "./arena.js";

export const ARENA_EXPERIMENT_SCHEMA = "flow-lenia-arena-experiment-v1" as const;

interface EncodedArray {
  dtype: "f32" | "u32";
  length: number;
  layout: string;
  data: string;
}

export interface ArenaExperimentDocument {
  schema_version: typeof ARENA_EXPERIMENT_SCHEMA;
  model_variant: "flow-lenia-ecosystem-v1";
  generated_utc: string;
  scientific_sha256: string;
  config: {
    grid: number;
    seed: number;
    fixed_step: number;
    mixing_rule: MixingRule;
    channels: 3;
    kernels: 9;
    open_system_ledger: { added: 0; removed: 0; converted: 0 };
  };
  experiment: {
    id: string;
    title: string;
    provenance: ArenaCard["provenance"];
  };
  ecosystem: {
    initial_mass: number;
    lineage_ring: LineageEventRecord[];
    next_mutation_index: number;
    extinction_events: number;
  };
  environment: { schema_version: "flow-lenia-arena-environment-v1"; dynamics: ArenaDynamics };
  state: {
    mass: EncodedArray;
    genome_h: EncodedArray;
    genome_q: EncodedArray;
    identity: EncodedArray;
    environment: EncodedArray;
    regions: EncodedArray;
  };
}

function bytesOf(view: ArrayBufferView): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function toBase64(view: ArrayBufferView): string {
  const bytes = bytesOf(view);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunk)));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function encode(view: Float32Array | Uint32Array, dtype: EncodedArray["dtype"], layout: string): EncodedArray {
  return { dtype, length: view.length, layout, data: toBase64(view) };
}

function decode(record: EncodedArray, dtype: EncodedArray["dtype"], expectedLength: number): Float32Array | Uint32Array {
  if (!record || record.dtype !== dtype || record.length !== expectedLength || typeof record.data !== "string") throw new Error(`invalid ${dtype} experiment field`);
  const bytes = fromBase64(record.data);
  if (bytes.byteLength !== expectedLength * 4) throw new Error(`invalid ${dtype} experiment byte length`);
  return dtype === "f32" ? new Float32Array(bytes.buffer) : new Uint32Array(bytes.buffer);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function scientificMetadata(document: Omit<ArenaExperimentDocument, "generated_utc" | "scientific_sha256" | "state">, state: ArenaExperimentDocument["state"]): unknown {
  const descriptors = Object.fromEntries(Object.entries(state).map(([key, record]) => [key, { dtype: record.dtype, length: record.length, layout: record.layout }]));
  return { ...document, state: descriptors };
}

async function hashState(state: ArenaExperimentDocument["state"], metadata: unknown): Promise<string> {
  const order = [state.mass, state.genome_h, state.genome_q, state.identity, state.environment, state.regions];
  const decoded = order.map((record) => fromBase64(record.data));
  const metadataBytes = new TextEncoder().encode(canonicalJson(metadata));
  const total = metadataBytes.byteLength + decoded.reduce((sum, bytes) => sum + bytes.byteLength, 0);
  const all = new Uint8Array(total);
  all.set(metadataBytes, 0);
  let offset = metadataBytes.byteLength;
  for (const bytes of decoded) { all.set(bytes, offset); offset += bytes.byteLength; }
  const digest = await crypto.subtle.digest("SHA-256", all);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function buildArenaExperiment(snapshot: ArenaPackedSnapshot, card: ArenaCard): Promise<ArenaExperimentDocument> {
  const state: ArenaExperimentDocument["state"] = {
    mass: encode(snapshot.mass, "f32", "cell-major vec4f; xyz=C0,C1,C2"),
    genome_h: encode(snapshot.h, "f32", "cell-major 3xvec4f; first nine lanes are H"),
    genome_q: encode(snapshot.q, "f32", "cell-major 3xvec4f; first nine lanes are Q"),
    identity: encode(snapshot.identity, "u32", "cell-major vec4u; fingerprint lo/hi,lineage,flags"),
    environment: encode(snapshot.environment, "f32", "cell-major vec4f; authored,wall,gate,opacity"),
    regions: encode(snapshot.regions, "u32", "cell-major authored region ID"),
  };
  const header: Omit<ArenaExperimentDocument, "generated_utc" | "scientific_sha256" | "state"> = {
    schema_version: ARENA_EXPERIMENT_SCHEMA,
    model_variant: "flow-lenia-ecosystem-v1",
    config: { grid: snapshot.n, seed: snapshot.seed, fixed_step: snapshot.step, mixing_rule: snapshot.mixingRule, channels: 3, kernels: 9, open_system_ledger: { added: 0, removed: 0, converted: 0 } },
    experiment: { id: card.id, title: card.title, provenance: card.provenance },
    ecosystem: { initial_mass: snapshot.initialMass, lineage_ring: snapshot.lineageRing, next_mutation_index: snapshot.nextMutationIndex, extinction_events: snapshot.extinctionEvents },
    environment: { schema_version: "flow-lenia-arena-environment-v1", dynamics: snapshot.dynamics },
  };
  return {
    ...header,
    generated_utc: new Date().toISOString(),
    scientific_sha256: await hashState(state, scientificMetadata(header, state)),
    state,
  };
}

export async function parseArenaExperiment(text: string): Promise<{ document: ArenaExperimentDocument; snapshot: ArenaPackedSnapshot }> {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Arena import is not valid JSON"); }
  const document = value as ArenaExperimentDocument;
  if (document?.schema_version !== ARENA_EXPERIMENT_SCHEMA || document.model_variant !== "flow-lenia-ecosystem-v1") throw new Error("unsupported Arena experiment schema or model variant");
  const n = document.config?.grid;
  if (!Number.isInteger(n) || (n !== 128 && n !== 256)) throw new Error("Arena import grid must be 128 or 256");
  if (document.config.channels !== 3 || document.config.kernels !== 9) throw new Error("Arena import channel/kernel count is incompatible");
  if (!(["average", "whole", "gene-wise", "best", "negotiation"] as string[]).includes(document.config.mixing_rule)) throw new Error("Arena import mixing rule is invalid");
  const { generated_utc: _generated, scientific_sha256: _hash, state: _state, ...header } = document;
  if (await hashState(document.state, scientificMetadata(header, document.state)) !== document.scientific_sha256) throw new Error("Arena import scientific SHA-256 mismatch");
  const n2 = n * n;
  const snapshot: ArenaPackedSnapshot = {
    schemaVersion: "flow-lenia-arena-snapshot-v1",
    n,
    seed: document.config.seed >>> 0,
    step: document.config.fixed_step,
    mixingRule: document.config.mixing_rule,
    initialMass: document.ecosystem.initial_mass,
    mass: decode(document.state.mass, "f32", n2 * 4) as Float32Array,
    h: decode(document.state.genome_h, "f32", n2 * 12) as Float32Array,
    q: decode(document.state.genome_q, "f32", n2 * 12) as Float32Array,
    identity: decode(document.state.identity, "u32", n2 * 4) as Uint32Array,
    environment: decode(document.state.environment, "f32", n2 * 4) as Float32Array,
    regions: decode(document.state.regions, "u32", n2) as Uint32Array,
    dynamics: document.environment.dynamics,
    lineageRing: document.ecosystem.lineage_ring,
    nextMutationIndex: document.ecosystem.next_mutation_index,
    extinctionEvents: document.ecosystem.extinction_events,
  };
  return { document, snapshot };
}

export function downloadArenaExperiment(experiment: ArenaExperimentDocument): void {
  const blob = new Blob([JSON.stringify(experiment)], { type: "application/json" });
  const link = globalThis.document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `flow-lenia-arena-${experiment.experiment.id}-seed${experiment.config.seed}-step${experiment.config.fixed_step}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}
